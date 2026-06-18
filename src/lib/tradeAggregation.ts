// ================================================
// Shared trade aggregation — used by both My Trades (useTradesData)
// and the Overview dashboard (useDashboardData).
// Keeping it here guarantees the two pages can never diverge.
// ================================================

import { getAssetMultiplier } from '@/utils/tradeCalculations';
import { computeActualR } from '@/utils/rResolver';

export type AggregationMode = 'all-accounts' | 'trader';

// In all-accounts mode, trades that share the same symbol+side and whose
// open_at timestamps fall within this window are treated as a single logical
// position (partials + copier copies of the same entry signal).
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

  // Single-row clusters: return as-is (own actual_r is correct for an unsplit trade).
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
          // Compute a single whole-position R for merged clusters. Individual per-leg
          // R values must not be used — they reflect partial exits, not the full trade.
          const summedRisk = numericSum(group, 'risk_usd');
          let unifiedRisk: number | null = summedRisk > 0 ? summedRisk : null;

          if (!unifiedRisk) {
            // Stop-based fallback: |entry - stop| × total_qty × multiplier
            const stopPrice = Number(rep.stop_price);
            const entryPrice = Number(rep.entry_price);
            const mult =
              Number(rep.multiplier) > 0
                ? Number(rep.multiplier)
                : getAssetMultiplier(rep.symbol || '');
            const stopDist = Math.abs(entryPrice - stopPrice);
            if (Number.isFinite(stopDist) && stopDist > 0 && totalQuantity > 0 && mult > 0) {
              unifiedRisk = stopDist * totalQuantity * mult;
            }
          }

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
 * In all-accounts mode the grouping key is entry-time proximity: trades sharing
 * the same symbol+side whose open_at falls within ENTRY_CLUSTER_WINDOW_MS of the
 * cluster anchor are merged into one position. This collapses partial take-profits
 * and copier copies of the same signal regardless of exit price or close time.
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

  // all-accounts mode: cluster by entry-time proximity.
  // Sort ascending: symbol → side → open_at (invalid open_at sorts last).
  const sorted = [...trades].sort((a, b) => {
    const symA = (a.symbol || '').trim().toUpperCase();
    const symB = (b.symbol || '').trim().toUpperCase();
    if (symA < symB) return -1;
    if (symA > symB) return 1;
    const sideA = a.side || '';
    const sideB = b.side || '';
    if (sideA < sideB) return -1;
    if (sideA > sideB) return 1;
    const tsA = new Date(a.open_at).getTime();
    const tsB = new Date(b.open_at).getTime();
    const validA = Number.isFinite(tsA);
    const validB = Number.isFinite(tsB);
    if (!validA && !validB) return 0;
    if (!validA) return 1;  // invalid sorts last
    if (!validB) return -1;
    return tsA - tsB;
  });

  const clusters: T[][] = [];
  let currentCluster: T[] = [];
  let anchorSymbol = '';
  let anchorSide = '';
  let anchorTs = NaN;

  for (const trade of sorted) {
    const sym = (trade.symbol || '').trim().toUpperCase();
    const side = trade.side || '';
    const ts = new Date(trade.open_at).getTime();
    const validTs = Number.isFinite(ts);

    const sameSymbolSide = sym === anchorSymbol && side === anchorSide;
    const withinWindow = validTs && Number.isFinite(anchorTs) && (ts - anchorTs) <= ENTRY_CLUSTER_WINDOW_MS;

    if (currentCluster.length === 0) {
      // Start the very first cluster.
      currentCluster.push(trade);
      anchorSymbol = sym;
      anchorSide = side;
      anchorTs = validTs ? ts : NaN;
    } else if (!validTs) {
      // Trades with invalid/missing open_at never merge — each forms its own cluster.
      clusters.push(currentCluster);
      currentCluster = [trade];
      anchorSymbol = sym;
      anchorSide = side;
      anchorTs = NaN;
    } else if (sameSymbolSide && withinWindow) {
      currentCluster.push(trade);
    } else {
      // Different symbol/side or outside the window — start a new cluster.
      clusters.push(currentCluster);
      currentCluster = [trade];
      anchorSymbol = sym;
      anchorSide = side;
      anchorTs = ts;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  return clusters
    .map(cluster => aggregateTradeGroup(cluster, mode))
    .sort((a, b) => new Date(b.open_at).getTime() - new Date(a.open_at).getTime());
}
