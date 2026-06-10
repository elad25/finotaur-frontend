/**
 * journaling — serialize a closed PaperPosition into a journal trade payload.
 *
 * Responsible for:
 *   1. Computing weighted-average exit price from all partial fills.
 *   2. Accumulating total net PnL (sum of all fill netPnls).
 *   3. Embedding fees info into the notes string (no new DB columns added;
 *      the `backtest_trades` table has no dedicated fees/commission column).
 *   4. Generating a human-readable "Exits:" note for multi-fill trades.
 *   5. Mapping rich ExitReasons (flatten | reverse) → 'manual' at the
 *      serialization boundary — the DB `exit_reason` column is typed
 *      'manual' | 'sl' | 'tp' | null. Rich reasons live only in local state.
 */

import type { PaperPosition, ExitReason } from '@/hooks/useBacktestSession';
import type { FillRecord } from './orderEngine';

// ─── Wire type — matches backtest_trades INSERT shape ────────────

/**
 * The journal payload sent to the Edge Function / `backtest_trades` table.
 * Only fields that exist in the DB schema are included here.
 * Fees are embedded in `notes` because the table has no dedicated fees column.
 */
export interface JournalTradePayload {
  side: 'LONG' | 'SHORT';
  entry_time: string;       // ISO 8601
  entry_price: number;
  exit_time: string | null;
  exit_price: number | null; // weighted-average exit across all fills
  size: number;              // original size (at open)
  stop_loss: number | null;
  take_profit: number | null;
  pnl: number | null;        // net PnL after all fees
  pnl_percent: number | null;
  /** DB union: 'manual' | 'sl' | 'tp' | null.
   *  flatten → 'manual', reverse → 'manual' (see mapExitReason below). */
  exit_reason: 'manual' | 'sl' | 'tp' | null;
  notes: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────

function unixToIso(unix: number): string {
  return new Date(unix * 1000).toISOString();
}

/**
 * Map the rich in-memory ExitReason to the limited DB union.
 * 'flatten' and 'reverse' both map to 'manual' — the DB contract is
 * manual | sl | tp | null; rich reasons are preserved only in local state.
 */
function mapExitReason(reason: ExitReason | undefined): 'manual' | 'sl' | 'tp' | null {
  if (reason == null) return null;
  // flatten → manual (position closed to flat by trader action)
  // reverse → manual (position closed as part of a reversal)
  if (reason === 'flatten' || reason === 'reverse') return 'manual';
  return reason; // 'manual' | 'sl' | 'tp' pass through unchanged
}

/**
 * Compute the weighted-average exit price from a set of exit fill records.
 * Uses qty-weighted average: sum(price_i * qty_i) / sum(qty_i).
 * Returns null if there are no exit fills (open position, or fill array absent).
 */
function weightedAvgExitPrice(fills: FillRecord[]): number | null {
  const exitFills = fills.filter((f) => f.kind === 'partial_exit' || f.kind === 'final_exit');
  if (exitFills.length === 0) return null;
  const totalQty = exitFills.reduce((sum, f) => sum + f.qty, 0);
  if (totalQty <= 0) return null;
  const weightedSum = exitFills.reduce((sum, f) => sum + f.price * f.qty, 0);
  return weightedSum / totalQty;
}

/**
 * Build a human-readable exits note for multi-fill trades.
 *
 * Format:
 *   "Exits: TP1 50% @ 123.45, TP2 50% @ 125.00"
 *
 * Each exit fill that is a partial_exit or final_exit gets one entry.
 * The label is inferred from the fill's reason; if no reason is present,
 * it falls back to "Exit".
 *
 * Returns null when there is only one exit fill (simple case — no note needed).
 */
function buildExitsNote(fills: FillRecord[]): string | null {
  const exitFills = fills.filter((f) => f.kind === 'partial_exit' || f.kind === 'final_exit');
  if (exitFills.length <= 1) return null;

  // Count partial exits to generate "TP1, TP2..." labels.
  let tpCount = 0;
  let slCount = 0;
  let manualCount = 0;

  // Hoist totalQty out of the map callback — O(n) once instead of O(n²).
  const totalQty = exitFills.reduce((s, ef) => s + ef.qty, 0);

  const parts = exitFills.map((f) => {
    const reason = f.reason;
    let label: string;
    if (reason === 'tp') {
      tpCount++;
      label = `TP${tpCount}`;
    } else if (reason === 'sl') {
      slCount++;
      label = slCount > 1 ? `SL${slCount}` : 'SL';
    } else if (reason === 'flatten') {
      label = 'Flatten';
    } else if (reason === 'reverse') {
      label = 'Reverse';
    } else {
      manualCount++;
      label = manualCount > 1 ? `Exit${manualCount}` : 'Exit';
    }
    const pct = totalQty > 0 ? Math.round((f.qty / totalQty) * 100) : 0;
    return `${label} ${pct}% @ ${f.price.toFixed(2)}`;
  });

  return `Exits: ${parts.join(', ')}`;
}

/**
 * Build the full notes string for a closed trade.
 * Combines:
 *   - Exits note (multi-fill only)
 *   - Fees: $X.XX line
 *
 * Returns null when there is nothing to note.
 */
function buildNotes(fills: FillRecord[], feesPaid: number): string | null {
  const parts: string[] = [];

  const exitsNote = buildExitsNote(fills);
  if (exitsNote) parts.push(exitsNote);

  if (feesPaid > 0) {
    parts.push(`Fees: $${feesPaid.toFixed(2)}`);
  }

  return parts.length > 0 ? parts.join(' | ') : null;
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Serialize a closed PaperPosition into a JournalTradePayload suitable for
 * insertion into `backtest_trades` via the Edge Function.
 *
 * The position must be closed (exitTime + exitPrice present). If not,
 * returns null (open positions are not journaled).
 *
 * Multi-fill positions: exit_price is the qty-weighted average of all exit
 * fills; pnl is the sum of all fill netPnls (already net of fees); fees are
 * embedded in notes.
 */
export function buildJournalPayload(position: PaperPosition): JournalTradePayload | null {
  // Only closed positions are journalable.
  if (position.exitTime == null || position.exitPrice == null) return null;

  const fills = position.fills ?? [];
  const feesPaid = position.feesPaid ?? 0;
  const originalSize = position.originalSize ?? position.size;

  // Weighted-average exit price from fill records; fall back to exitPrice
  // field if fills are absent (backward-compat with positions loaded from
  // old sessions before the fills array was introduced).
  const avgExitPrice = weightedAvgExitPrice(fills) ?? position.exitPrice;

  // Net PnL: use the position's accumulated pnl field (already net of all
  // fees across all fills, computed by the reducer).
  const netPnl = position.pnl ?? null;

  const notes = buildNotes(fills, feesPaid);

  return {
    side: position.side,
    entry_time: unixToIso(position.entryTime),
    entry_price: position.entryPrice,
    exit_time: unixToIso(position.exitTime),
    exit_price: avgExitPrice,
    size: originalSize,
    stop_loss: position.stopLoss ?? null,
    take_profit: position.takeProfit ?? null,
    pnl: netPnl,
    pnl_percent: position.pnlPercent ?? null,
    // Map rich ExitReason → DB-compatible union at the serialization boundary.
    exit_reason: mapExitReason(position.exitReason),
    notes,
  };
}

/**
 * Serialize an array of closed positions. Skips any that are still open
 * (no exitTime). Preserves ordering.
 */
export function buildJournalPayloads(positions: PaperPosition[]): JournalTradePayload[] {
  return positions
    .map(buildJournalPayload)
    .filter((p): p is JournalTradePayload => p !== null);
}
