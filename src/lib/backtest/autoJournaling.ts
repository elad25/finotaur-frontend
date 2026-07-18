// ==========================================
// AUTO BACKTEST → JOURNAL BRIDGE
// ==========================================
// Persists closed trades from the AUTO (pattern-detection) backtest engine
// into the same `trades` table the MANUAL replay backtester writes to (see
// src/lib/backtest/journaling.ts). Sibling file rather than an in-place
// extension of journaling.ts: the auto engine's trade shape (`AutoPosition`,
// from core/auto/signalToPosition.ts) is structurally different from the
// manual engine's `PaperPosition` / `BacktestPositionLike`, so a separate
// mapper keeps journaling.ts's existing exports and behavior untouched
// while reusing its `JournalTradePayload` / `SaveResult` contracts.
//
// Same DB contract as the manual path:
//  - broker = 'backtest' (allowed by trades_broker_check)
//  - unique (user_id, broker, external_id) — upsert-safe re-saves
//  - open_at + idempotency_key are NOT NULL
//
// No schema change: reuses columns already present on `trades`.
// ==========================================

import { supabase } from '@/lib/supabase';
import type { SetupDefinition } from '@/core/auto/types';
import type { AutoPosition } from '@/core/auto/signalToPosition';
import type { JournalTradePayload, SaveResult } from '@/lib/backtest/journaling';

// ─── Private helpers ─────────────────────────────────────────────

/**
 * AutoPosition timestamps are unix seconds (journal convention — see
 * signalToPosition.ts doc-comment). Mirrors journaling.ts's private `toIso`.
 */
function toIso(t?: number): string | null {
  if (!t) return null;
  const ms = t < 1e12 ? t * 1000 : t;
  return new Date(ms).toISOString();
}

function normalizeSide(type: 'long' | 'short'): 'LONG' | 'SHORT' {
  return type === 'long' ? 'LONG' : 'SHORT';
}

/** Distinct pattern-family labels configured on a v1 setup, e.g. "FVG+OB". */
export function patternTypesLabel(setup: SetupDefinition): string {
  const types = Array.from(new Set(setup.patterns.map((p) => p.type)));
  return types.length > 0 ? types.join('+') : 'AUTO';
}

// ─── Run context (engine-agnostic) ─────────────────────────────────

/**
 * Normalized, engine-agnostic fields the mapper needs to build journal
 * payloads. Built by the CALLER (ResultsSummary.handleSaveToJournal) from
 * the store's `selectEffectiveInstrument` — never from the raw v1
 * `currentSetup` directly — so a v2 (Strategy AI) run's journal rows carry
 * the instrument the run ACTUALLY traded instead of whatever the v1 setup
 * slot happened to hold (which may be a stale, unrelated previous run's
 * instrument; this file stays free of `StrategyDefinitionV2` imports by
 * design — the caller resolves engine-specific fields, this mapper just
 * consumes the normalized result).
 */
export interface AutoJournalRunContext {
  /** Strategy/setup name — shown in the `setup` column and in `notes`. */
  name: string;
  /** The instrument the run ACTUALLY traded (from `lastRunInstrument`). */
  instrumentSymbol: string;
  /** Pattern-family label for tags/notes — e.g. "FVG+OB" (v1) or "AUTO" (v2: the generic rules engine has no v1-shaped `patterns` list). */
  patternLabel: string;
}

/**
 * Convenience builder for the classic v1 path — mirrors the pre-refactor
 * behavior exactly (name + pattern label straight off the setup), letting
 * the caller supply `instrumentSymbol` explicitly (normally
 * `selectEffectiveInstrument(...).symbol`, which equals
 * `setup.instrument.symbol` for a v1 run) rather than reading it off
 * `setup` internally — keeps a single source of truth for "which instrument
 * did this run actually use" across both engines.
 */
export function runContextFromSetup(
  setup: SetupDefinition,
  instrumentSymbol: string,
): AutoJournalRunContext {
  return {
    name: setup.name,
    instrumentSymbol,
    patternLabel: patternTypesLabel(setup),
  };
}

// ─── Payload builders (exported for testing) ──────────────────────

/**
 * Build a single JournalTradePayload from a closed AutoPosition.
 * Returns null for open/unclosed positions (no exitPrice yet).
 *
 * `index` must be the trade's stable position within the array passed to
 * `buildAutoJournalPayloads` (same array order on every save of the same
 * run) — it feeds the deterministic `external_id`.
 */
export function buildAutoJournalPayload(
  pos: AutoPosition,
  userId: string,
  run: AutoJournalRunContext,
  runId: string,
  index: number,
): JournalTradePayload | null {
  if (pos.exitPrice == null || pos.status !== 'closed') return null;

  const pnl = pos.realizedPnl ?? null;
  const outcome: JournalTradePayload['outcome'] =
    pnl == null ? 'OPEN' : pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BE';

  const symbol = run.instrumentSymbol || pos.symbol || '';
  const externalId = `autobt_${runId}_${index}`;

  return {
    user_id: userId,
    symbol,
    side: normalizeSide(pos.type),
    quantity: pos.size,
    entry_price: pos.entryPrice,
    stop_price: pos.stopLoss ?? null,
    take_profit_price: pos.takeProfit ?? null,
    exit_price: pos.exitPrice ?? null,
    pnl,
    outcome,
    strategy_id: null,
    setup: run.name,
    tags: ['backtest', 'auto', `pattern:${run.patternLabel}`],
    notes: `Auto backtest "${run.name}" (${run.patternLabel}) · run ${runId}`,
    broker: 'backtest',
    external_id: externalId,
    session: null,
    // trades.open_at and trades.idempotency_key are NOT NULL — omitting them
    // fails the insert (23502). idempotency_key mirrors the upsert identity
    // (user + broker + external_id) so re-saves update instead of colliding.
    open_at: toIso(pos.entryTime) ?? new Date().toISOString(),
    close_at: toIso(pos.exitTime),
    idempotency_key: `${userId}:backtest:${externalId}`,
    created_at: toIso(pos.entryTime) ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Build journal payloads for an array of closed AutoPositions.
 * Skips positions that aren't closed (defensive — the auto engine's
 * `result.trades` is already closed-only, but this keeps the mapper
 * self-contained if called with a broader array).
 */
export function buildAutoJournalPayloads(
  trades: AutoPosition[],
  userId: string,
  run: AutoJournalRunContext,
  runId: string,
): JournalTradePayload[] {
  const out: JournalTradePayload[] = [];
  trades.forEach((pos, index) => {
    const payload = buildAutoJournalPayload(pos, userId, run, runId, index);
    if (payload) out.push(payload);
  });
  return out;
}

// ─── Public save function ─────────────────────────────────────────

/**
 * Save closed auto-backtest trades to the journal.
 * Only closed trades are persisted. Each row is tagged `backtest`/`auto` and
 * carries the setup name + pattern types + run id in its notes.
 *
 * Re-saving the same run (same `runId`, same trade order) upserts onto the
 * same `external_id`s instead of duplicating rows.
 */
export async function saveAutoBacktestTradesToJournal(
  input: { trades: AutoPosition[]; run: AutoJournalRunContext; runId: string },
  userId: string,
): Promise<SaveResult> {
  const { trades, run, runId } = input;
  const result: SaveResult = { saved: 0, skipped: 0, errors: 0 };

  if (!userId) {
    result.skipped = trades.length;
    return result;
  }

  const closed = trades.filter((p) => p.exitPrice != null && p.status === 'closed');
  if (closed.length === 0) return result;

  const rows = buildAutoJournalPayloads(closed, userId, run, runId);
  if (rows.length === 0) return result;

  const { error } = await supabase
    .from('trades')
    .upsert(rows, { onConflict: 'user_id,broker,external_id', ignoreDuplicates: false });

  if (!error) {
    result.saved = rows.length;
    return result;
  }

  console.error('❌ saveAutoBacktestTradesToJournal bulk upsert error, falling back to per-row:', error);

  // Bulk upsert failed (e.g. one bad row poisons the whole batch). Fall back
  // to per-row upserts so a single problem trade doesn't block the rest, and
  // so failures are individually identifiable + retryable by the caller.
  const failedRows: Array<{ externalId: string; symbol: string; message: string }> = [];
  for (const row of rows) {
    const { error: rowError } = await supabase
      .from('trades')
      .upsert(row, { onConflict: 'user_id,broker,external_id', ignoreDuplicates: false });

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
