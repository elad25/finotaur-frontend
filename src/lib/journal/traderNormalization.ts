// src/lib/journal/traderNormalization.ts
// ════════════════════════════════════════════════════════
// TRADER scope normalization — collapses copier-duplicated
// trade rows into one "decision" row, normalizing dollar P&L
// by either total contract quantity OR distinct account count.
//
// Grouping (net-flat overlap, micro+mini by contract root) and the initial-1R
// risk basis are shared with aggregateCopiedTrades (ALL ACCOUNTS) via
// positionGrouping.ts, so the two views can never disagree on which fills form a
// decision or on R.
//
// R is INITIAL-1R: actual_r = Σpnl / Σ(initial-entry risk to one unified stop) —
// credits the scale-in, consistent across copier copies and micro+mini.
// ════════════════════════════════════════════════════════

import { computeActualR } from '@/utils/rResolver';
import { clusterByOverlap, summedInitialRisk, displaySymbol } from '@/lib/journal/positionGrouping';

export type TraderMode = 'per-contract' | 'per-account';

// Shape of one leg inside the trades.partial_entries JSONB array.
interface PartialEntryLeg {
  price?: number | null;
  quantity?: number | null;
}

interface NormalizableTrade {
  id: string;
  symbol: string;
  side?: string | null;
  open_at: string;
  close_at?: string | null;
  pnl?: number | null;
  quantity?: number | null;
  portfolio_id?: string | null;
  broker_connection_id?: string | null;
  // Risk fields — required to recompute the merged-decision R against the
  // initial entry's 1R. Both raw fill paths (Dashboard fetchAllTradesForTrader
  // and MyTrades useTrades skipCopyAggregation) select these columns from the DB.
  risk_usd?: number | null;
  stop_price?: number | null;
  entry_price?: number | null;
  multiplier?: number | null;
  // First leg of the position; used for the initial-1R basis. Present on
  // broker-synced rows (select('*')); manual rows fall back to entry_price/quantity.
  partial_entries?: PartialEntryLeg[] | null;
  actual_user_r?: number | null;
  actual_r?: number | null;
  rr?: number | null;
  group_trade_ids?: string[];
}

function accountId(trade: NormalizableTrade): string {
  if (trade.portfolio_id) return trade.portfolio_id;
  if (trade.broker_connection_id) return `broker_${trade.broker_connection_id}`;
  return 'manual';
}

export function normalizeTraderTrades<T extends NormalizableTrade>(
  trades: T[],
  mode: TraderMode,
): T[] {
  if (trades.length === 0) return [];

  const result: T[] = [];
  for (const cluster of clusterByOverlap(trades)) {
    const sorted = [...cluster].sort(
      (a, b) => new Date(a.open_at).getTime() - new Date(b.open_at).getTime(),
    );
    const representative = sorted[0];

    if (sorted.length === 1) {
      // Per-contract: a pre-aggregated row with quantity>1 still needs division
      // (e.g. a copy fill collapsed from 19 contracts → pnl must be /19).
      // Per-account: a single-account row is already the full decision amount.
      const qty = representative.quantity != null ? Number(representative.quantity) : 1;
      const rawPnl = representative.pnl != null ? Number(representative.pnl) : 0;
      const normPnl = mode === 'per-contract' ? rawPnl / Math.max(qty, 1) : rawPnl;
      // R vs initial-1R (RAW pnl / RAW initial risk — the ratio is normalization-independent).
      // No usable stop → keep the row's own stored actual_r.
      const initRisk = summedInitialRisk([representative]);
      const singleR =
        initRisk && initRisk > 0 ? computeActualR(rawPnl, initRisk) : representative.actual_r ?? null;
      result.push({
        ...representative,
        pnl: normPnl,
        quantity: 1,
        actual_r: singleR,
        group_trade_ids: [representative.id],
      } as T);
      continue;
    }

    const totalPnl = sorted.reduce((sum, t) => sum + (t.pnl != null ? Number(t.pnl) : 0), 0);
    const totalQty = sorted.reduce((sum, t) => sum + (t.quantity != null ? Number(t.quantity) : 1), 0);
    const distinctAccounts = new Set(sorted.map(accountId)).size;
    const rawDivisor = mode === 'per-contract' ? totalQty : distinctAccounts;
    const divisor = Math.max(rawDivisor, 1);
    const normPnl = totalPnl / divisor;

    // Initial-1R for the merged decision: Σpnl / Σ(initial-entry risk, one unified stop).
    // actual_user_r and rr are nulled for merged decisions.
    const unifiedRisk = summedInitialRisk(sorted);
    const mergedActualR =
      unifiedRisk && unifiedRisk > 0 ? computeActualR(totalPnl, unifiedRisk) : null;

    result.push({
      ...representative,
      // Uniform micro label when a decision mixes micro+mini (else rep's own symbol).
      symbol: displaySymbol(sorted),
      pnl: normPnl,
      quantity: 1,
      actual_r: mergedActualR,
      actual_user_r: null,
      rr: null,
      group_trade_ids: sorted.map((t) => t.id),
    } as T);
  }

  result.sort((a, b) => new Date(a.open_at).getTime() - new Date(b.open_at).getTime());
  return result;
}
