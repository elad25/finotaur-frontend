// ================================================
// Shared trade aggregation — used by both My Trades (useTradesData)
// and the Overview dashboard (useDashboardData).
// Keeping it here guarantees the two pages can never diverge.
// ================================================

export type AggregationMode = 'all-accounts' | 'trader';

const TRADE_GROUP_WINDOW_MS = 5_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function roundTimeBucket(value: any): number {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return 0;
  return Math.round(ts / TRADE_GROUP_WINDOW_MS);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function roundPrice(value: any): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toFixed(2);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tradeGroupKey(trade: Record<string, any>): string {
  return [
    (trade.symbol || '').trim().toUpperCase(),
    trade.side || '',
    roundTimeBucket(trade.open_at),
    roundTimeBucket(trade.close_at),
    roundPrice(trade.entry_price),
    roundPrice(trade.exit_price),
  ].join('|');
}

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
  const representative = sorted[0];
  if (group.length === 1) return { ...representative, group_trade_ids: [representative.id] };

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
      ? {
          pnl: totalPnL,
          quantity: totalQuantity,
          fees: totalFees,
          risk_usd: numericSum(group, 'risk_usd'),
          reward_usd: numericSum(group, 'reward_usd'),
          outcome: totalPnL > 0 ? 'WIN' : totalPnL < 0 ? 'LOSS' : 'BE',
        }
      : {};

  return {
    ...representative,
    ...financialFields,
    id: representative.id,
    group_trade_ids: group.map((t) => t.id),
    entry_price: entry ?? representative.entry_price,
    exit_price: exit ?? representative.exit_price,
    close_at: closeAt ?? representative.close_at,
    fees: mode === 'all-accounts' ? totalFees : representative.fees,
    quantity: mode === 'all-accounts' ? totalQuantity : representative.quantity,
    portfolio_id: mode === 'all-accounts' ? null : representative.portfolio_id,
    metrics: representative.metrics,
    updated_at: (() => {
      const updates = group
        .map(trade => trade.updated_at)
        .filter(Boolean)
        .sort();
      return updates[updates.length - 1] ?? representative.updated_at;
    })(),
  } as T;
}

/**
 * De-duplicate copier trades that are the same logical decision mirrored across
 * multiple portfolios. Summing P&L preserves Net P&L while reducing trade count
 * to the number of unique decisions — matching the "My Trades" display.
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
  const groups = new Map<string, T[]>();
  for (const trade of trades) {
    const key = tradeGroupKey(trade);
    const group = groups.get(key) ?? [];
    group.push(trade);
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .map(group => aggregateTradeGroup(group, mode))
    .sort((a, b) => new Date(b.open_at).getTime() - new Date(a.open_at).getTime());
}
