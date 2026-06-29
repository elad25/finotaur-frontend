// ================================================
// Shared trade aggregation — used by both My Trades (useTradesData)
// and the Overview dashboard (useDashboardData).
// Keeping it here guarantees the two pages can never diverge.
// ================================================

import { computeActualR } from '@/utils/rResolver';
import { clusterByOverlap, summedClassicRisk } from '@/lib/journal/positionGrouping';

export type AggregationMode = 'all-accounts' | 'trader';

// Trader-mode (legacy Map-keyed) bucket width. all-accounts mode no longer uses
// a time window — it groups by net-flat interval overlap (see clusterByOverlap).
const ENTRY_CLUSTER_WINDOW_MS = 5_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function numericSum(trades: Record<string, any>[], field: string): number {
  return trades.reduce((sum, trade) => sum + (Number(trade[field]) || 0), 0);
}

function weightedAverage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trades: Record<string, any>[],
  field: string,
  weightField: string,
): number | undefined {
  let weighted = 0;
  let weightSum = 0;
  for (const trade of trades) {
    const value = Number(trade[field]);
    const weight = Math.abs(Number(trade[weightField]) || 0) || 1;
    if (!Number.isFinite(value)) continue;
    weighted += value * weight;
    weightSum += weight;
  }
  return weightSum > 0 ? weighted / weightSum : undefined;
}

function aggregateTradeGroup<T extends Record<string, any>>(group: T[], mode: AggregationMode): T {
  const sorted = [...group].sort(
    (a, b) => new Date(a.open_at).getTime() - new Date(b.open_at).getTime(),
  );
  const rep = sorted[0];

  // Single-row clusters: the row's own stored actual_r (classic, full-risk) is correct.
  if (group.length === 1) return { ...rep, group_trade_ids: [rep.id] };

  const totalPnL = numericSum(group, 'pnl');
  const totalQuantity = numericSum(group, 'quantity');
  const totalFees = numericSum(group, 'fees');
  const entry = weightedAverage(group, 'entry_price', 'quantity');
  const exit = weightedAverage(group, 'exit_price', 'quantity');
  const closeCandidates = sorted
    .map(trade => trade.close_at)
    .filter(Boolean)
    .sort();
  const closeAt = closeCandidates[closeCandidates.length - 1];

  const financialFields =
    mode === 'all-accounts'
      ? (() => {
          // Classic R: Σpnl / Σ(full-position risk), shared with TRADER via
          // summedClassicRisk so both views read the same R.
          const unifiedRisk = summedClassicRisk(group);

          return {
            pnl: totalPnL,
            quantity: totalQuantity,
            fees: totalFees,
            risk_usd: numericSum(group, 'risk_usd'),
            reward_usd: numericSum(group, 'reward_usd'),
            outcome: totalPnL > 0 ? 'WIN' : totalPnL < 0 ? 'LOSS' : 'BE',
            actual_r:
              unifiedRisk && unifiedRisk > 0 ? computeActualR(totalPnL, unifiedRisk) : null,
            actual_user_r: null,
          };
        })()
      : {};

  return {
    ...rep,
    ...financialFields,
    id: rep.id,
    group_trade_ids: group.map((t) => t.id),
    entry_price: entry ?? rep.entry_price,
    exit_price: exit ?? rep.exit_price,
    close_at: closeAt ?? rep.close_at,
    fees: mode === 'all-accounts' ? totalFees : rep.fees,
    quantity: mode === 'all-accounts' ? totalQuantity : rep.quantity,
    portfolio_id: mode === 'all-accounts' ? null : rep.portfolio_id,
    metrics: rep.metrics,
    updated_at: (() => {
      const updates = group
        .map(trade => trade.updated_at)
        .filter(Boolean)
        .sort();
      return updates[updates.length - 1] ?? rep.updated_at;
    })(),
  } as T;
}

/**
 * De-duplicate copier trades that are the same logical decision mirrored across
 * multiple portfolios. Summing P&L preserves Net P&L while reducing trade count
 * to the number of unique decisions — matching the "My Trades" display.
 *
 * In all-accounts mode grouping is NET-FLAT and contract-family aware: trades
 * sharing the same contract root + side whose [open_at, close_at] intervals
 * overlap are merged into one position (see clusterByOverlap). This collapses
 * copier copies, scale-ins, and micro+mini of one decision while keeping
 * genuinely separate flat→flat round-trips distinct. R is classic (Σpnl ÷
 * Σ full-position risk, summedClassicRisk), identical to TRADER mode.
 *
 * In trader mode the original Map-keyed grouping is still used (no change there).
 *
 * The generic <T extends Record<string, any>> allows both useTradesData (which
 * uses its own rich Trade type) and useDashboardData (which uses a leaner Trade
 * interface) to call this function without type friction. The helpers above
 * intentionally use `any` internally — justified because the function must be
 * usable with two distinct Trade shapes. eslint-disable comments are per-line.
 */
export function aggregateCopiedTrades<T extends Record<string, any>>(
  trades: T[],
  mode: AggregationMode,
): T[] {
  if (mode !== 'all-accounts') {
    // Trader mode: group by the original fixed-bucket key (symbol|side|openBucket|closeBucket|entry|exit).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groups = new Map<string, T[]>();
    for (const trade of trades) {
      const ts = new Date(trade.open_at).getTime();
      const openBucket = Number.isFinite(ts) ? Math.round(ts / ENTRY_CLUSTER_WINDOW_MS) : 0;
      const closeTs = new Date(trade.close_at).getTime();
      const closeBucket = Number.isFinite(closeTs) ? Math.round(closeTs / ENTRY_CLUSTER_WINDOW_MS) : 0;
      const ep = Number(trade.entry_price);
      const xp = Number(trade.exit_price);
      const key = [
        (trade.symbol || '').trim().toUpperCase(),
        trade.side || '',
        openBucket,
        closeBucket,
        Number.isFinite(ep) ? ep.toFixed(2) : '0',
        Number.isFinite(xp) ? xp.toFixed(2) : '0',
      ].join('|');
      const g = groups.get(key) ?? [];
      g.push(trade);
      groups.set(key, g);
    }
    return Array.from(groups.values())
      .map(group => aggregateTradeGroup(group, mode))
      .sort((a, b) => new Date(b.open_at).getTime() - new Date(a.open_at).getTime());
  }

  // all-accounts mode: net-flat clustering by [open_at, close_at] interval
  // overlap, shared with TRADER (normalizeTraderTrades) via clusterByOverlap so
  // both views group the same fills into the same decisions.
  return clusterByOverlap(trades)
    .map(cluster => aggregateTradeGroup(cluster, mode))
    .sort((a, b) => new Date(b.open_at).getTime() - new Date(a.open_at).getTime());
}
