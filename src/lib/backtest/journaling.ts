// ==========================================
// BACKTEST → JOURNAL BRIDGE (Phase 2 + Phase 7)
// ==========================================
// Persists trades placed during a backtest session into the existing `trades`
// table, carrying the session's linked strategy_id and a backtest marker so the
// journal/analytics can distinguish + compare backtest vs live (TradeZella parity:
// "automatic journaling + strategy link").
//
// Phase 7 additions:
//  - weightedAvgExitPrice   — qty-weighted average over multiple exit fills
//  - buildExitsNote         — human-readable multi-leg exit summary
//  - buildNotes             — combines exits note + fee line
//  - buildJournalPayload    — single-position full payload builder
//  - buildJournalPayloads   — array wrapper
//  - mapExitReason          — maps flatten/reverse to 'manual' at DB boundary
//
// No schema change: reuses columns already present on `trades`
// (strategy_id, setup, tags, source/broker markers, notes).

import { supabase } from '@/lib/supabase';
import type { BacktestSession } from '@/types/backtestSession';
import type { FillRecord } from '@/lib/backtest/orderEngine';
import type { PaperPosition, ExitReason } from '@/hooks/useBacktestSession';

// ─── Types ──────────────────────────────────────────────────────

/** Minimal shape we consume from the ReplayChart trading engine's positions. */
export interface BacktestPositionLike {
  positionId?: string;
  id?: string;
  symbol?: string;
  side: string; // 'long' | 'short' | 'buy' | 'sell'
  entryPrice: number;
  exitPrice?: number;
  size: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  realizedPnL?: number;
  realizedPnl?: number;
  entryTime?: number;
  exitTime?: number;
  isClosed?: boolean;
  status?: string;
}

export interface SaveResult {
  saved: number;
  skipped: number;
  errors: number;
  /** Per-row failure detail, populated only when the bulk upsert fails and the
   *  per-row fallback identifies which specific rows failed (and why). */
  failedRows?: Array<{ externalId: string; symbol: string; message: string }>;
}

/**
 * Full journal row payload built from a PaperPosition.
 * Matches the `trades` table columns used by the backtest bridge.
 */
export interface JournalTradePayload {
  user_id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entry_price: number;
  stop_price: number | null;
  take_profit_price: number | null;
  exit_price: number | null;
  pnl: number | null;
  outcome: 'WIN' | 'LOSS' | 'BE' | 'OPEN';
  strategy_id: string | null;
  setup: string | null;
  tags: string[];
  notes: string;
  broker: string;
  external_id: string;
  session: null;
  created_at: string;
  updated_at: string;
}

// ─── Private helpers ─────────────────────────────────────────────

function toIso(t?: number): string | null {
  if (!t) return null;
  // Replay timestamps are unix seconds; convert to ms for Date.
  const ms = t < 1e12 ? t * 1000 : t;
  return new Date(ms).toISOString();
}

function normalizeSide(side: string): 'LONG' | 'SHORT' {
  return side === 'long' || side === 'buy' ? 'LONG' : 'SHORT';
}

function realizedPnl(p: BacktestPositionLike): number | null {
  const v = p.realizedPnL ?? p.realizedPnl;
  return typeof v === 'number' ? v : null;
}

// ─── Phase 7 helpers (exported for testing / external use) ───────

/**
 * Map internal exit reasons to the wire format stored in the DB.
 * 'flatten' and 'reverse' are implementation-level distinctions; from the
 * journal's perspective they are manual closes.
 */
export function mapExitReason(reason: ExitReason | undefined): 'manual' | 'sl' | 'tp' | null {
  if (!reason) return null;
  if (reason === 'flatten' || reason === 'reverse') return 'manual';
  return reason;
}

/**
 * Quantity-weighted average exit price across multiple exit fills.
 * Ignores entry fills (kind === 'entry').
 * Returns null when there are no exit fills.
 */
export function weightedAvgExitPrice(fills: FillRecord[]): number | null {
  const exits = fills.filter((f) => f.kind !== 'entry');
  if (exits.length === 0) return null;

  const totalQty = exits.reduce((acc, f) => acc + f.qty, 0);
  if (totalQty <= 0) return null;

  const weightedSum = exits.reduce((acc, f) => acc + f.price * f.qty, 0);
  return weightedSum / totalQty;
}

/**
 * Quantity-weighted average entry price across all entry fills.
 * Returns null when there are no entry fills (e.g. legacy positions without fills).
 */
export function weightedAvgEntryPrice(fills: FillRecord[]): number | null {
  const entries = fills.filter((f) => f.kind === 'entry');
  if (entries.length === 0) return null;

  const totalQty = entries.reduce((acc, f) => acc + f.qty, 0);
  if (totalQty <= 0) return null;

  const weightedSum = entries.reduce((acc, f) => acc + f.price * f.qty, 0);
  return weightedSum / totalQty;
}

/**
 * Build a human-readable entries line for the trade notes.
 * Only emitted when there are ≥2 entry fills (scale-in trades).
 *
 * Example output: "Entries: 1 @ 205.35, 2 @ 206.10"
 */
export function buildEntriesNote(fills: FillRecord[]): string {
  const entries = fills.filter((f) => f.kind === 'entry');
  if (entries.length < 2) return '';
  const parts = entries.map((f) => `${f.qty} @ ${f.price.toFixed(2)}`);
  return `Entries: ${parts.join(', ')}`;
}

/**
 * Build a human-readable exits line for the trade notes.
 *
 * Example output: "Exits: TP1 50% @ 123.45, TP2 50% @ 125.00"
 * Single exit: "Exit @ 123.45"
 */
export function buildExitsNote(fills: FillRecord[]): string {
  const exits = fills.filter((f) => f.kind !== 'entry');
  if (exits.length === 0) return '';
  if (exits.length === 1) {
    return `Exit @ ${exits[0].price.toFixed(2)}`;
  }

  // Label TP exits numerically; other exits by reason.
  let tpCounter = 0;
  const parts = exits.map((f) => {
    const totalQty = fills.filter((x) => x.kind !== 'entry').reduce((acc, x) => acc + x.qty, 0);
    const pct = totalQty > 0 ? ((f.qty / totalQty) * 100).toFixed(0) : '?';
    if (f.reason === 'tp') {
      tpCounter++;
      return `TP${tpCounter} ${pct}% @ ${f.price.toFixed(2)}`;
    }
    const label = f.reason ? f.reason.charAt(0).toUpperCase() + f.reason.slice(1) : 'Exit';
    return `${label} ${pct}% @ ${f.price.toFixed(2)}`;
  });
  return `Exits: ${parts.join(', ')}`;
}

/**
 * Combine entries note (multi-entry only) + exits note + fees line into the
 * final `notes` string.
 *
 * Example (scale-in trade):
 *   "Backtest session \"S1\" | Entries: 1 @ 205.35, 2 @ 206.10 | Exits: TP1 50% @ 208.00, TP2 50% @ 210.00 | Fees: $0.40"
 */
export function buildNotes(fills: FillRecord[], feesPaid: number, sessionName?: string): string {
  const parts: string[] = [];
  if (sessionName) parts.push(`Backtest session "${sessionName}"`);
  const entriesNote = buildEntriesNote(fills);
  if (entriesNote) parts.push(entriesNote);
  const exitsNote = buildExitsNote(fills);
  if (exitsNote) parts.push(exitsNote);
  if (feesPaid > 0) parts.push(`Fees: $${feesPaid.toFixed(2)}`);
  return parts.join(' | ');
}

/**
 * Build a single JournalTradePayload from a closed PaperPosition.
 * Returns null for open/unclosed positions (no exitPrice yet).
 */
export function buildJournalPayload(
  pos: PaperPosition,
  userId: string,
  session: BacktestSession,
): JournalTradePayload | null {
  // Only persist closed positions.
  if (pos.exitPrice == null) return null;

  const fills = pos.fills ?? [];
  const feesPaid = pos.feesPaid ?? 0;

  // Weighted-average exit price from fills (falls back to exitPrice).
  const exitPx = fills.length > 0
    ? (weightedAvgExitPrice(fills) ?? pos.exitPrice)
    : pos.exitPrice;

  // Weighted-average entry price from entry fills (multi-entry scale-in positions).
  // Falls back to pos.entryPrice (already the weighted avg maintained by the reducer).
  const entryPx = fills.length > 0
    ? (weightedAvgEntryPrice(fills) ?? pos.entryPrice)
    : pos.entryPrice;

  // quantity = total entered size (originalSize accumulates all scale-in entries).
  const quantity = pos.originalSize ?? pos.size;

  const pnl = pos.pnl ?? null;
  const outcome: JournalTradePayload['outcome'] =
    pnl == null ? 'OPEN' : pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BE';

  const notes = buildNotes(fills, feesPaid, session.name);

  return {
    user_id: userId,
    symbol: session.symbol ?? '',
    side: pos.side,
    quantity,
    entry_price: entryPx,
    stop_price: pos.stopLoss ?? null,
    take_profit_price: pos.takeProfit ?? null,
    exit_price: exitPx,
    pnl,
    outcome,
    strategy_id: session.strategyId ?? null,
    setup: session.strategyName ?? null,
    tags: ['backtest', `session:${session.name}`],
    notes,
    broker: 'backtest',
    external_id: `bt:${session.id}:${pos.id}`,
    session: null,
    created_at: toIso(pos.entryTime) ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Build journal payloads for an array of positions, skipping open ones.
 */
export function buildJournalPayloads(
  positions: PaperPosition[],
  userId: string,
  session: BacktestSession,
): JournalTradePayload[] {
  const out: JournalTradePayload[] = [];
  for (const pos of positions) {
    const payload = buildJournalPayload(pos, userId, session);
    if (payload) out.push(payload);
  }
  return out;
}

// ─── Public save function (existing API — kept for BacktestChart) ─

/**
 * Save closed backtest positions to the journal.
 * Only closed positions are persisted (open ones have no outcome yet).
 * Each row is tagged `backtest` and linked to the session's strategy when set.
 *
 * Phase 7: for PaperPosition inputs (which carry fills + feesPaid), uses the
 * rich buildJournalPayload path. Falls back to the legacy flat-field path for
 * BacktestPositionLike inputs that lack fills.
 */
export async function saveBacktestTradesToJournal(
  positions: BacktestPositionLike[] | PaperPosition[],
  session: BacktestSession,
  userId: string
): Promise<SaveResult> {
  const result: SaveResult = { saved: 0, skipped: 0, errors: 0 };
  if (!userId) {
    result.skipped = positions.length;
    return result;
  }

  // Detect which union member we're dealing with. PaperPosition always has its
  // `side` as 'LONG'|'SHORT' (uppercase); BacktestPositionLike uses lowercase
  // 'long'/'short'/'buy'/'sell'. This is the most reliable distinguisher since
  // `fills` is optional on PaperPosition and may be absent on older records.
  const isPaperPositions =
    positions.length > 0 &&
    ((positions[0] as PaperPosition).side === 'LONG' || (positions[0] as PaperPosition).side === 'SHORT') &&
    typeof (positions[0] as PaperPosition).entryTime === 'number';

  let rows: JournalTradePayload[];

  if (isPaperPositions) {
    const paperPositions = positions as PaperPosition[];
    const closed = paperPositions.filter((p) => p.exitPrice != null);
    if (closed.length === 0) return result;
    rows = buildJournalPayloads(closed, userId, session);
  } else {
    const legacyPositions = positions as BacktestPositionLike[];
    const closed = legacyPositions.filter(
      (p) => p.isClosed || p.status === 'closed' || p.exitPrice != null
    );
    if (closed.length === 0) return result;

    rows = closed.map((p) => {
      const pnl = realizedPnl(p);
      const mappedSide = normalizeSide(p.side);
      return {
        user_id: userId,
        symbol: p.symbol || session.symbol,
        side: mappedSide,
        quantity: p.size,
        entry_price: p.entryPrice,
        stop_price: p.stopLoss ?? null,
        take_profit_price: p.takeProfit ?? null,
        exit_price: p.exitPrice ?? null,
        pnl,
        outcome: (pnl == null ? 'OPEN' : pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BE') as JournalTradePayload['outcome'],
        strategy_id: session.strategyId ?? null,
        setup: session.strategyName ?? null,
        tags: ['backtest', `session:${session.name}`],
        notes: `Backtest session "${session.name}" (${session.symbol})`,
        broker: 'backtest',
        external_id: `bt:${session.id}:${p.positionId || p.id || ''}`,
        session: null,
        created_at: toIso(p.entryTime) ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
  }

  // Upsert on external_id so re-saving the same session updates rather than duplicates.
  const { error } = await supabase
    .from('trades')
    .upsert(rows, { onConflict: 'external_id', ignoreDuplicates: false });

  if (!error) {
    result.saved = rows.length;
    return result;
  }

  console.error('❌ saveBacktestTradesToJournal bulk upsert error, falling back to per-row:', error);

  // Bulk upsert failed (e.g. one bad row poisons the whole batch). Fall back to
  // per-row upserts so a single problem trade doesn't block the rest, and so
  // failures are individually identifiable + retryable by the caller.
  const failedRows: Array<{ externalId: string; symbol: string; message: string }> = [];
  for (const row of rows) {
    const { error: rowError } = await supabase
      .from('trades')
      .upsert(row, { onConflict: 'external_id', ignoreDuplicates: false });

    if (rowError) {
      failedRows.push({
        externalId: row.external_id,
        symbol: row.symbol,
        message: rowError.message,
      });
    } else {
      result.saved += 1;
    }
  }

  result.errors = failedRows.length;
  if (failedRows.length > 0) {
    result.failedRows = failedRows;
  }
  return result;
}
