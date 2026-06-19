// src/lib/journal/traderNormalization.ts
// ════════════════════════════════════════════════════════
// TRADER scope normalization — collapses copier-duplicated
// trade rows into one "decision" row, normalizing dollar P&L
// by either total contract quantity OR distinct account count.
//
// R-based metrics are recomputed at the merged-position level
// using the same formula as aggregateCopiedTrades (all-accounts
// mode): actual_r = Σpnl / Σrisk_usd, so TRADER Avg R matches
// ALL ACCOUNTS exactly. $ scaling logic is unchanged.
// ════════════════════════════════════════════════════════

import { computeActualR } from '@/utils/rResolver';
import { getAssetMultiplier } from '@/utils/tradeCalculations';

export type TraderMode = 'per-contract' | 'per-account';

interface NormalizableTrade {
  id: string;
  symbol: string;
  side?: string | null;
  open_at: string;
  pnl?: number | null;
  quantity?: number | null;
  portfolio_id?: string | null;
  broker_connection_id?: string | null;
  // Risk fields — required to recompute merged-position R identically to
  // aggregateCopiedTrades (all-accounts mode). Both raw fill paths (Dashboard
  // fetchAllTradesForTrader and MyTrades useTrades skipCopyAggregation) already
  // select these columns from the DB.
  risk_usd?: number | null;
  stop_price?: number | null;
  entry_price?: number | null;
  multiplier?: number | null;
  actual_user_r?: number | null;
  actual_r?: number | null;
  rr?: number | null;
}

const BUCKET_MS = 5_000; // 5-second grouping window

function entryBucket(openAt: string): number {
  const ms = new Date(openAt).getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.floor(ms / BUCKET_MS);
}

function decisionKey(trade: NormalizableTrade): string {
  const bucket = entryBucket(trade.open_at);
  const bucketStr = bucket === 0 ? trade.open_at : String(bucket);
  return `${(trade.symbol ?? '').trim().toUpperCase()}|${trade.side ?? ''}|${bucketStr}`;
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
  const groups = new Map<string, T[]>();
  for (const trade of trades) {
    const key = decisionKey(trade);
    const group = groups.get(key) ?? [];
    group.push(trade);
    groups.set(key, group);
  }
  const result: T[] = [];
  for (const group of groups.values()) {
    const sorted = [...group].sort(
      (a, b) => new Date(a.open_at).getTime() - new Date(b.open_at).getTime(),
    );
    const representative = sorted[0];
    if (sorted.length === 1) {
      // Per-contract: a pre-aggregated row with quantity>1 still needs division
      // (e.g. a copy fill collapsed from 19 contracts → pnl must be /19).
      // Per-account: a single-account row is already the full decision amount.
      const qty = representative.quantity != null ? Number(representative.quantity) : 1;
      const pnl = representative.pnl != null ? Number(representative.pnl) : 0;
      const normPnl = mode === 'per-contract' ? pnl / Math.max(qty, 1) : pnl;
      result.push({ ...representative, pnl: normPnl, quantity: 1 });
      continue;
    }
    const totalPnl = sorted.reduce((sum, t) => sum + (t.pnl != null ? Number(t.pnl) : 0), 0);
    const totalQty = sorted.reduce((sum, t) => sum + (t.quantity != null ? Number(t.quantity) : 1), 0);
    const distinctAccounts = new Set(sorted.map(accountId)).size;
    const rawDivisor = mode === 'per-contract' ? totalQty : distinctAccounts;
    const divisor = Math.max(rawDivisor, 1);
    const normPnl = totalPnl / divisor;

    // Recompute merged-position R identically to aggregateCopiedTrades (all-accounts
    // mode) so TRADER Avg R matches ALL ACCOUNTS for the same set of fills.
    // Step 1: Σrisk_usd across all fills in this decision group.
    const summedRisk = sorted.reduce((sum, t) => sum + (Number(t.risk_usd) || 0), 0);
    let unifiedRisk: number | null = summedRisk > 0 ? summedRisk : null;
    if (!unifiedRisk) {
      // Step 2 fallback: |entry - stop| × Σqty × multiplier (using representative fill).
      const stopPrice = Number(representative.stop_price);
      const entryPrice = Number(representative.entry_price);
      const mult =
        Number(representative.multiplier) > 0
          ? Number(representative.multiplier)
          : getAssetMultiplier(representative.symbol || '');
      const stopDist = Math.abs(entryPrice - stopPrice);
      if (Number.isFinite(stopDist) && stopDist > 0 && totalQty > 0 && mult > 0) {
        unifiedRisk = stopDist * totalQty * mult;
      }
    }
    // actual_r = Σpnl / unifiedRisk (same as aggregateCopiedTrades).
    // actual_user_r and rr are nulled for merged decisions (matches all-accounts).
    const mergedActualR = unifiedRisk && unifiedRisk > 0 ? computeActualR(totalPnl, unifiedRisk) : null;

    result.push({
      ...representative,
      pnl: normPnl,
      quantity: 1,
      actual_r: mergedActualR,
      actual_user_r: null,
      rr: null,
    } as T);
  }
  result.sort((a, b) => new Date(a.open_at).getTime() - new Date(b.open_at).getTime());
  return result;
}
