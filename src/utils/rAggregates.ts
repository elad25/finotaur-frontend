import { resolvePlanned1R, computeActualR, type StrategyRConfig } from '@/utils/rResolver';

// ----------------------------------------------------------------
// Input types
// ----------------------------------------------------------------

/**
 * Minimal trade shape required by tradeR / aggregateR.
 * Covers the fields from useDashboardData's Trade interface plus
 * the optional fields that rResolver needs for live fallback.
 */
export interface TradeForRAgg {
  pnl?: number | null | undefined;
  actual_r?: number | null | undefined;
  actual_user_r?: number | null | undefined;
  entry_price?: number | null | undefined;
  stop_price?: number | null | undefined;
  quantity?: number | null | undefined;
  multiplier?: number | null | undefined;
  symbol?: string | null | undefined;
  side?: string | null | undefined;
  planned_1r_usd?: number | null | undefined;
  strategy_id?: string | null | undefined;
}

/**
 * Strategy shape accepted by aggregateR's map. Intentionally a
 * structural subset of StrategyRConfig so callers can pass a richer
 * object without casting.
 */
export interface StrategyLike {
  planned_1r_usd?: number | null;
  standard_quantity?: number | null;
  default_stop_loss?: number | null;
}

// ----------------------------------------------------------------
// Per-trade R
// ----------------------------------------------------------------

/**
 * Resolve the realized R multiple for a single trade.
 *
 * Canonical priority — the SAME rule used by every journal surface
 * (Overview / My Trades / Breakdown):
 *   1. strategy.planned_1r_usd > 0  → strategy-based R (for future use once
 *      strategies are assigned to trades)
 *   2. trade.actual_r != null        → stored stop-based actual R
 *   3. live stop fallback            → resolvePlanned1R with null strategy
 *      (resolves via stop_price only, never via a global/user flat-1R value)
 *
 * NOTE: actual_user_r (global user flat-1R) is intentionally NOT used here.
 * It caused Overview to show inflated R (e.g. 4.89R) while My Trades showed
 * the correct stop-based R (2.75R). The canonical R is always stop/strategy-based.
 *
 * Returns null when there is no risk basis (no strategy planned_1r AND
 * no usable stop), so callers can show "—" and offer "Set R".
 */
export function tradeR(
  trade: TradeForRAgg,
  strategy?: StrategyRConfig | StrategyLike | null,
): number | null {
  // 1. Strategy-planned 1R (ready for when strategies get assigned)
  if (strategy?.planned_1r_usd != null && Number(strategy.planned_1r_usd) > 0) {
    return computeActualR(trade.pnl ?? null, Number(strategy.planned_1r_usd));
  }
  // 2. Stored stop-based actual R
  if (trade.actual_r != null) {
    return Number(trade.actual_r);
  }
  // 3. Live stop fallback: pass null for strategy so resolvePlanned1R resolves
  //    via stop_price only — never via a global/user flat-1R value.
  const resolved = resolvePlanned1R(
    {
      entry_price: trade.entry_price,
      stop_price: trade.stop_price,
      quantity: trade.quantity,
      multiplier: trade.multiplier,
      symbol: trade.symbol,
      pnl: trade.pnl,
      side: trade.side,
      planned_1r_usd: trade.planned_1r_usd,
    },
    null, // null = stop-based resolution only
    0,    // global 1R intentionally ignored (see rResolver comment)
  );
  return computeActualR(trade.pnl ?? null, resolved.value);
}

// ----------------------------------------------------------------
// Aggregate interface
// ----------------------------------------------------------------

export interface RAggregates {
  /** Sum of all included R values. */
  totalR: number;
  /** Mean R across all included trades; null when includedCount === 0. */
  avgR: number | null;
  /** Mean R of winning trades (r > 0); null when none. */
  avgWinR: number | null;
  /** Mean |R| of losing trades (r < 0), returned as a positive number; null when none. */
  avgLossR: number | null;
  /**
   * Kelly-style expectancy in R units:
   *   (winRate × avgWinR) − ((1 − winRate) × avgLossR)
   * Null when there are no wins and no losses (can't compute rates).
   */
  expectancyR: number | null;
  /** Number of trades where r > 0. */
  winCount: number;
  /** Number of trades where r < 0. */
  lossCount: number;
  /** Maximum r value across included trades; null when includedCount === 0. */
  bestR: number | null;
  /** Minimum r value across included trades; null when includedCount === 0. */
  worstR: number | null;
  /** Trades for which a valid R was computed. */
  includedCount: number;
  /** Trades skipped because no risk basis was available (r === null). */
  excludedNoRiskCount: number;
}

// ----------------------------------------------------------------
// Aggregate computation
// ----------------------------------------------------------------

/**
 * Compute R-based aggregate statistics for an array of trades.
 *
 * @param trades         Array of trades to aggregate.
 * @param strategyById   Optional map of strategy_id → strategy config for
 *                       the live-fallback R calculation. Pass null / omit
 *                       when strategy context is unavailable.
 */
export function aggregateR(
  trades: TradeForRAgg[],
  strategyById?: Map<string, StrategyLike> | null,
): RAggregates {
  let totalR = 0;
  let winCount = 0;
  let lossCount = 0;
  let sumWinR = 0;
  let sumLossR = 0; // accumulates |r| for losers
  let bestR: number | null = null;
  let worstR: number | null = null;
  let includedCount = 0;
  let excludedNoRiskCount = 0;

  for (const trade of trades) {
    const strategy = trade.strategy_id
      ? (strategyById?.get(trade.strategy_id) ?? null)
      : null;

    const r = tradeR(trade, strategy);

    if (r === null) {
      excludedNoRiskCount++;
      continue;
    }

    includedCount++;
    totalR += r;

    if (bestR === null || r > bestR) bestR = r;
    if (worstR === null || r < worstR) worstR = r;

    if (r > 0) {
      winCount++;
      sumWinR += r;
    } else if (r < 0) {
      lossCount++;
      sumLossR += Math.abs(r); // store as positive magnitude
    }
    // r === 0 → breakeven; excluded from win/loss counts and averages
  }

  const avgR = includedCount > 0 ? totalR / includedCount : null;
  const avgWinR = winCount > 0 ? sumWinR / winCount : null;
  const avgLossR = lossCount > 0 ? sumLossR / lossCount : null;

  let expectancyR: number | null = null;
  const winLossDenom = winCount + lossCount;
  if (winLossDenom > 0) {
    const winRate = winCount / winLossDenom;
    // When one side has no trades treat it as 0 contribution
    const w = avgWinR ?? 0;
    const l = avgLossR ?? 0;
    expectancyR = winRate * w - (1 - winRate) * l;
  }

  return {
    totalR,
    avgR,
    avgWinR,
    avgLossR,
    expectancyR,
    winCount,
    lossCount,
    bestR,
    worstR,
    includedCount,
    excludedNoRiskCount,
  };
}
