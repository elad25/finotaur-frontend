/**
 * reportMetrics — pure engine for daily-level and extended trade metrics.
 *
 * Metrics explained:
 *
 * TRADE-LEVEL (delegated or extended from computeGroupStats):
 *  netPnl           — sum of all trade P&L
 *  tradeCount       — total closed trade count
 *  winRatePct       — % of trades with pnl > 0 (0–100)
 *  profitFactor     — gross wins / |gross losses|; Infinity when no losses
 *  tradeExpectancy  — winRate/100 * avgWin + (1 − winRate/100) * avgLoss
 *  avgTradeWinLoss  — avgWin / |avgLoss|; Infinity when avgLoss = 0
 *  avgNetTradePnl   — netPnl / tradeCount
 *  avgHoldTimeMs    — mean(close_at − open_at) in ms; only closed trades
 *  avgPlannedR      — mean planned R-multiple. Proxy chain: user_risk_r → rr.
 *                     Rationale: user_risk_r is the user-entered risk-reward
 *                     plan (from the trade form); rr is the calculated planned
 *                     R from price levels. Both represent "what the user planned
 *                     to risk", not what happened. null when no data.
 *  avgRealizedR     — mean realized R-multiple: actual_user_r → actual_r.
 *                     actual_user_r is R calculated from user-entered risk $;
 *                     actual_r falls back to the engine-calculated version.
 *  largestProfitableDay — highest single-day net P&L
 *  largestLosingDay     — most negative single-day net P&L (negative number)
 *
 * TRADE-LEVEL COUNTS & STREAKS (new — Tradezella parity):
 *  winningTrades    — count of trades with outcome === 'WIN'
 *  losingTrades     — count of trades with outcome === 'LOSS'
 *  breakevenTrades  — count of trades with outcome === 'BE'
 *  openTrades       — count of trades with outcome === 'OPEN' or no close_at
 *  maxConsecutiveWins   — longest unbroken WIN streak (by open_at order)
 *  maxConsecutiveLosses — longest unbroken LOSS streak (by open_at order)
 *  largestProfit    — single-trade highest pnl (same as gs.largestWin)
 *  largestLoss      — single-trade most negative pnl (same as gs.largestLoss)
 *  totalFees        — sum of trade.fees across all trades
 *  totalCommissions — placeholder 0 (no separate commission field in Trade)
 *  totalSwap        — placeholder 0 (no swap field in Trade)
 *  avgHoldAllMs     — mean hold time (ms) for all closed trades (= avgHoldTimeMs)
 *  avgHoldWinningMs — mean hold time (ms) for WIN trades only; 0 when none
 *  avgHoldLosingMs  — mean hold time (ms) for LOSS trades only; 0 when none
 *  avgHoldScratchMs — mean hold time (ms) for BE trades only; 0 when none
 *  avgTradePnl      — netPnl / tradeCount (alias for avgNetTradePnl)
 *
 * DAY-LEVEL COUNTS & STREAKS (new — Tradezella parity):
 *  totalTradingDays        — total distinct calendar days with ≥1 trade (= loggedDays)
 *  winningDays             — count of days where net P&L > 0
 *  losingDays              — count of days where net P&L < 0
 *  breakevenDays           — count of days where net P&L === 0
 *  maxConsecutiveWinningDays — longest unbroken run of net-positive days
 *  maxConsecutiveLosingDays  — longest unbroken run of net-negative days
 *  avgWinningDayPnl        — mean P&L of winning days; 0 when none
 *  avgLosingDayPnl         — mean P&L of losing days (negative); 0 when none
 *
 * DRAWDOWN ALIASES (new — Tradezella parity):
 *  maxDrawdown  — alias for maxDailyNetDrawdown (≤ 0)
 *  avgDrawdown  — alias for avgDailyNetDrawdown (≤ 0)
 *
 * MONTH STATS (new — Tradezella parity):
 *  bestMonthPnl    — highest monthly net P&L
 *  lowestMonthPnl  — lowest (most negative) monthly net P&L
 *  avgMonthlyPnl   — mean monthly net P&L
 *  bestMonthLabel  — e.g. "Sep 2025"
 *  lowestMonthLabel — e.g. "Nov 2025"
 *
 * DAILY-LEVEL:
 *  loggedDays       — count of distinct calendar days with ≥1 trade
 *  avgDailyNetPnl   — netPnl / loggedDays
 *  avgDailyWinPct   — % of logged days that were net-positive
 *  avgDailyWinLoss  — avg(netPnl of winning days) / |avg(netPnl of losing days)|;
 *                     Infinity when no losing days, 0 when no winning days
 *  avgDailyVolume   — mean(sum of quantity across all trades in a day)
 *  maxDailyNetDrawdown — most negative running drawdown from the cumulative-daily
 *                        P&L peak (always ≤ 0; 0 when equity never dips)
 *  avgDailyNetDrawdown — mean drawdown value across all daily data points (≤ 0)
 *
 * SERIES (for charts):
 *  cumulativePnl           — running sum of daily netPnl sorted by date
 *  cumulativeAvgDailyWinLoss — running win/loss ratio over the trailing days seen so far
 *  dailyBuckets            — raw daily aggregates
 *
 * No side effects. No React imports. No async.
 */

import type { Trade } from '@/hooks/useTradesData';
import { computeGroupStats } from '@/lib/journal/groupStats';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface DailyBucket {
  /** YYYY-MM-DD */
  date: string;
  netPnl: number;
  trades: number;
  wins: number;
  losses: number;
  /** Sum of quantity across all trades in the day */
  volume: number;
}

export interface ReportMetrics {
  // --- trade-level ---
  netPnl: number;
  tradeCount: number;
  winRatePct: number;
  profitFactor: number;
  tradeExpectancy: number;
  /** avgWin / |avgLoss|; Infinity when avgLoss === 0, 0 when no trades */
  avgTradeWinLoss: number;
  /** netPnl / tradeCount; 0 when tradeCount === 0 */
  avgNetTradePnl: number;
  /** mean(close_at − open_at) in milliseconds; 0 when no closed trades */
  avgHoldTimeMs: number;
  /** mean planned R (user_risk_r → rr proxy); null when no data */
  avgPlannedR: number | null;
  /** mean realized R (actual_user_r → actual_r proxy); null when no data */
  avgRealizedR: number | null;
  largestProfitableDay: number;
  /** ≤ 0 (most negative daily P&L); 0 when no losing days */
  largestLosingDay: number;

  // --- trade-level counts (new) ---
  /** Trades with outcome === 'WIN' */
  winningTrades: number;
  /** Trades with outcome === 'LOSS' */
  losingTrades: number;
  /** Trades with outcome === 'BE' */
  breakevenTrades: number;
  /** Trades with outcome === 'OPEN' or no close_at */
  openTrades: number;

  // --- trade-level streaks (new) ---
  /** Longest consecutive WIN streak (by open_at ascending) */
  maxConsecutiveWins: number;
  /** Longest consecutive LOSS streak (by open_at ascending) */
  maxConsecutiveLosses: number;

  // --- trade-level P&L extremes (new) ---
  /** Largest single-trade profit (same as groupStats.largestWin) */
  largestProfit: number;
  /** Most-negative single-trade loss (same as groupStats.largestLoss; ≤ 0) */
  largestLoss: number;

  // --- fees / costs (new) ---
  /** Sum of trade.fees across all trades */
  totalFees: number;
  /**
   * Placeholder 0 — the Trade interface has no dedicated commission field.
   * If a commission field is added in future, compute it here.
   */
  totalCommissions: number;
  /**
   * Placeholder 0 — the Trade interface has no swap/overnight field.
   * If a swap field is added in future, compute it here.
   */
  totalSwap: number;

  // --- hold-time split (new; ms; 0 when no trades of that type) ---
  /** Mean hold time (ms) of all closed trades — alias for avgHoldTimeMs */
  avgHoldAllMs: number;
  /** Mean hold time (ms) of WIN-outcome closed trades; 0 when none */
  avgHoldWinningMs: number;
  /** Mean hold time (ms) of LOSS-outcome closed trades; 0 when none */
  avgHoldLosingMs: number;
  /** Mean hold time (ms) of BE-outcome (scratch) closed trades; 0 when none */
  avgHoldScratchMs: number;

  // --- per-trade average P&L alias (new) ---
  /** netPnl / tradeCount; alias for avgNetTradePnl */
  avgTradePnl: number;

  // --- daily-level ---
  loggedDays: number;
  avgDailyNetPnl: number;
  /** % of days that are net-positive (0–100) */
  avgDailyWinPct: number;
  /** avg winning day P&L / |avg losing day P&L|; special-cased for zero denominators */
  avgDailyWinLoss: number;
  avgDailyVolume: number;
  /** ≤ 0 — deepest drawdown from running cumulative-daily-P&L peak */
  maxDailyNetDrawdown: number;
  /** ≤ 0 — mean of daily drawdown values */
  avgDailyNetDrawdown: number;

  // --- day-level counts (new) ---
  /** Distinct calendar days with ≥1 trade — alias for loggedDays */
  totalTradingDays: number;
  /** Days where net P&L > 0 */
  winningDays: number;
  /** Days where net P&L < 0 */
  losingDays: number;
  /** Days where net P&L === 0 */
  breakevenDays: number;

  // --- day-level streaks (new) ---
  /** Longest consecutive run of net-positive days */
  maxConsecutiveWinningDays: number;
  /** Longest consecutive run of net-negative days */
  maxConsecutiveLosingDays: number;

  // --- day-level P&L averages (new) ---
  /** Mean P&L of winning days; 0 when no winning days */
  avgWinningDayPnl: number;
  /** Mean P&L of losing days (negative); 0 when no losing days */
  avgLosingDayPnl: number;

  // --- drawdown aliases (new — Tradezella uses "maxDrawdown" / "avgDrawdown") ---
  /** Alias for maxDailyNetDrawdown (≤ 0) */
  maxDrawdown: number;
  /** Alias for avgDailyNetDrawdown (≤ 0) */
  avgDrawdown: number;

  // --- month stats (new) ---
  /** Highest monthly net P&L across all calendar months in the data */
  bestMonthPnl: number;
  /** Most-negative monthly net P&L; 0 when no data */
  lowestMonthPnl: number;
  /** Mean monthly net P&L */
  avgMonthlyPnl: number;
  /** Label of best month, e.g. "Sep 2025"; '' when no data */
  bestMonthLabel: string;
  /** Label of lowest month, e.g. "Nov 2025"; '' when no data */
  lowestMonthLabel: string;

  // --- chart series ---
  cumulativePnl: { date: string; value: number }[];
  cumulativeAvgDailyWinLoss: { date: string; value: number }[];
  dailyBuckets: DailyBucket[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the date string (YYYY-MM-DD) to bucket a trade into. */
function tradeDateKey(trade: Trade): string {
  const iso = trade.close_at ?? trade.open_at;
  return iso.slice(0, 10);
}

/** Safe divide — returns 0 when denominator is 0 or non-finite. */
function safeDiv(numerator: number, denominator: number): number {
  if (!isFinite(denominator) || denominator === 0) return 0;
  return numerator / denominator;
}

/** Compute cumulative win/loss ratio up to and including day N in the sorted buckets array. */
function runningWinLoss(buckets: DailyBucket[], upToIndex: number): number {
  let totalWinPnl = 0;
  let totalLossPnl = 0; // stored as positive magnitude
  let winDays = 0;
  let lossDays = 0;

  for (let i = 0; i <= upToIndex; i++) {
    const b = buckets[i];
    if (b.netPnl > 0) {
      totalWinPnl += b.netPnl;
      winDays += 1;
    } else if (b.netPnl < 0) {
      totalLossPnl += Math.abs(b.netPnl);
      lossDays += 1;
    }
  }

  const avgWin = winDays > 0 ? totalWinPnl / winDays : 0;
  const avgLoss = lossDays > 0 ? totalLossPnl / lossDays : 0;

  if (avgLoss === 0) return avgWin > 0 ? Infinity : 0;
  return avgWin / avgLoss;
}

/**
 * Compute the longest consecutive run of a given boolean predicate over
 * an array, iterating in order.
 */
function maxConsecutiveRun(items: boolean[]): number {
  let max = 0;
  let current = 0;
  for (const hit of items) {
    if (hit) {
      current += 1;
      if (current > max) max = current;
    } else {
      current = 0;
    }
  }
  return max;
}

/** Format a YYYY-MM key as "Mon YYYY", e.g. "Sep 2025". */
function formatMonthLabel(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export function computeReportMetrics(trades: Trade[]): ReportMetrics {
  // ---- EMPTY GUARD ----
  if (trades.length === 0) {
    return {
      netPnl: 0,
      tradeCount: 0,
      winRatePct: 0,
      profitFactor: 0,
      tradeExpectancy: 0,
      avgTradeWinLoss: 0,
      avgNetTradePnl: 0,
      avgHoldTimeMs: 0,
      avgPlannedR: null,
      avgRealizedR: null,
      largestProfitableDay: 0,
      largestLosingDay: 0,
      // new trade-level counts
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      openTrades: 0,
      // new streaks
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      // new trade extremes
      largestProfit: 0,
      largestLoss: 0,
      // new fees
      totalFees: 0,
      totalCommissions: 0,
      totalSwap: 0,
      // new hold-time split
      avgHoldAllMs: 0,
      avgHoldWinningMs: 0,
      avgHoldLosingMs: 0,
      avgHoldScratchMs: 0,
      // new per-trade pnl alias
      avgTradePnl: 0,
      // daily-level
      loggedDays: 0,
      avgDailyNetPnl: 0,
      avgDailyWinPct: 0,
      avgDailyWinLoss: 0,
      avgDailyVolume: 0,
      maxDailyNetDrawdown: 0,
      avgDailyNetDrawdown: 0,
      // new day-level counts
      totalTradingDays: 0,
      winningDays: 0,
      losingDays: 0,
      breakevenDays: 0,
      // new day streaks
      maxConsecutiveWinningDays: 0,
      maxConsecutiveLosingDays: 0,
      // new day averages
      avgWinningDayPnl: 0,
      avgLosingDayPnl: 0,
      // drawdown aliases
      maxDrawdown: 0,
      avgDrawdown: 0,
      // month stats
      bestMonthPnl: 0,
      lowestMonthPnl: 0,
      avgMonthlyPnl: 0,
      bestMonthLabel: '',
      lowestMonthLabel: '',
      // chart series
      cumulativePnl: [],
      cumulativeAvgDailyWinLoss: [],
      dailyBuckets: [],
    };
  }

  // ---- DELEGATE TRADE-LEVEL STATS ----
  const gs = computeGroupStats(trades);

  // ---- SORT TRADES BY open_at FOR STREAK CALCULATION ----
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.open_at).getTime() - new Date(b.open_at).getTime(),
  );

  // ---- TRADE-LEVEL COUNTS ----
  let winningTrades = 0;
  let losingTrades = 0;
  let breakevenTrades = 0;
  let openTrades = 0;

  for (const t of trades) {
    if (t.outcome === 'OPEN' || !t.close_at) {
      openTrades += 1;
    } else if (t.outcome === 'WIN') {
      winningTrades += 1;
    } else if (t.outcome === 'LOSS') {
      losingTrades += 1;
    } else if (t.outcome === 'BE') {
      breakevenTrades += 1;
    }
  }

  // ---- TRADE-LEVEL STREAKS (sorted by open_at) ----
  const winFlags = sortedTrades.map(t => t.outcome === 'WIN');
  const lossFlags = sortedTrades.map(t => t.outcome === 'LOSS');
  const maxConsecutiveWins = maxConsecutiveRun(winFlags);
  const maxConsecutiveLosses = maxConsecutiveRun(lossFlags);

  // ---- FEES ----
  let totalFees = 0;
  for (const t of trades) {
    totalFees += t.fees ?? 0;
  }
  // totalCommissions and totalSwap are 0 — Trade has no separate fields for these.

  // ---- HOLD TIME (all + per outcome) ----
  let totalHoldMs = 0;
  let holdCount = 0;
  let holdWinMs = 0;
  let holdWinCount = 0;
  let holdLossMs = 0;
  let holdLossCount = 0;
  let holdScratchMs = 0;
  let holdScratchCount = 0;

  for (const t of trades) {
    if (t.open_at && t.close_at) {
      const ms = new Date(t.close_at).getTime() - new Date(t.open_at).getTime();
      if (ms > 0) {
        totalHoldMs += ms;
        holdCount += 1;
        if (t.outcome === 'WIN') {
          holdWinMs += ms;
          holdWinCount += 1;
        } else if (t.outcome === 'LOSS') {
          holdLossMs += ms;
          holdLossCount += 1;
        } else if (t.outcome === 'BE') {
          holdScratchMs += ms;
          holdScratchCount += 1;
        }
      }
    }
  }
  const avgHoldTimeMs = holdCount > 0 ? totalHoldMs / holdCount : 0;
  const avgHoldAllMs = avgHoldTimeMs; // alias
  const avgHoldWinningMs = holdWinCount > 0 ? holdWinMs / holdWinCount : 0;
  const avgHoldLosingMs = holdLossCount > 0 ? holdLossMs / holdLossCount : 0;
  const avgHoldScratchMs = holdScratchCount > 0 ? holdScratchMs / holdScratchCount : 0;

  // ---- PLANNED R ----
  let plannedRTotal = 0;
  let plannedRCount = 0;
  for (const t of trades) {
    // Proxy chain: user_risk_r first (user-entered planned R), then rr (price-level calc)
    const planned = t.user_risk_r ?? t.rr;
    if (planned != null) {
      plannedRTotal += planned;
      plannedRCount += 1;
    }
  }
  const avgPlannedR = plannedRCount > 0 ? plannedRTotal / plannedRCount : null;

  // ---- REALIZED R ----
  let realizedRTotal = 0;
  let realizedRCount = 0;
  for (const t of trades) {
    const realized = t.actual_user_r ?? t.actual_r;
    if (realized != null) {
      realizedRTotal += realized;
      realizedRCount += 1;
    }
  }
  const avgRealizedR = realizedRCount > 0 ? realizedRTotal / realizedRCount : null;

  // ---- avgTradeWinLoss ----
  const avgLossMag = Math.abs(gs.avgLoss); // avgLoss from groupStats is negative
  const avgTradeWinLoss = avgLossMag === 0
    ? gs.avgWin > 0 ? Infinity : 0
    : gs.avgWin / avgLossMag;

  // ---- DAILY BUCKETS ----
  const bucketMap = new Map<string, DailyBucket>();

  for (const t of trades) {
    const dateKey = tradeDateKey(t);
    if (!bucketMap.has(dateKey)) {
      bucketMap.set(dateKey, { date: dateKey, netPnl: 0, trades: 0, wins: 0, losses: 0, volume: 0 });
    }
    const b = bucketMap.get(dateKey)!;
    const pnl = t.pnl ?? 0;
    b.netPnl += pnl;
    b.trades += 1;
    b.volume += t.quantity ?? 0;
    if (pnl > 0) b.wins += 1;
    else if (pnl < 0) b.losses += 1;
  }

  // Sort by date ascending
  const dailyBuckets: DailyBucket[] = Array.from(bucketMap.values()).sort(
    (a, b) => a.date.localeCompare(b.date),
  );

  const loggedDays = dailyBuckets.length;

  // ---- LARGEST PROFITABLE / LOSING DAY ----
  let largestProfitableDay = 0;
  let largestLosingDay = 0;
  for (const b of dailyBuckets) {
    if (b.netPnl > largestProfitableDay) largestProfitableDay = b.netPnl;
    if (b.netPnl < largestLosingDay) largestLosingDay = b.netPnl;
  }

  // ---- DAY-LEVEL COUNTS ----
  const winDayBuckets = dailyBuckets.filter(b => b.netPnl > 0);
  const lossDayBuckets = dailyBuckets.filter(b => b.netPnl < 0);
  const breakevenDays = dailyBuckets.filter(b => b.netPnl === 0).length;
  const winningDaysCount = winDayBuckets.length;
  const losingDaysCount = lossDayBuckets.length;

  // ---- DAY-LEVEL STREAKS ----
  const dayWinFlags = dailyBuckets.map(b => b.netPnl > 0);
  const dayLossFlags = dailyBuckets.map(b => b.netPnl < 0);
  const maxConsecutiveWinningDays = maxConsecutiveRun(dayWinFlags);
  const maxConsecutiveLosingDays = maxConsecutiveRun(dayLossFlags);

  // ---- DAILY WIN % ----
  const avgDailyWinPct = loggedDays > 0 ? (winningDaysCount / loggedDays) * 100 : 0;

  // ---- DAILY WIN/LOSS RATIO ----
  const avgWinDayPnl = winDayBuckets.length > 0
    ? winDayBuckets.reduce((s, b) => s + b.netPnl, 0) / winDayBuckets.length
    : 0;
  const avgLossDayPnl = lossDayBuckets.length > 0
    ? lossDayBuckets.reduce((s, b) => s + b.netPnl, 0) / lossDayBuckets.length
    : 0; // already negative
  const avgLossDayPnlMag = Math.abs(avgLossDayPnl);
  const avgDailyWinLoss = avgLossDayPnlMag === 0
    ? avgWinDayPnl > 0 ? Infinity : 0
    : avgWinDayPnl / avgLossDayPnlMag;

  // ---- DAILY VOLUME ----
  const avgDailyVolume = loggedDays > 0
    ? dailyBuckets.reduce((s, b) => s + b.volume, 0) / loggedDays
    : 0;

  // ---- CUMULATIVE P&L SERIES + DRAWDOWN ----
  const cumulativePnl: { date: string; value: number }[] = [];
  let runningPnl = 0;
  let peakPnl = 0;
  let totalDrawdown = 0;
  let maxDrawdownValue = 0; // stored as most negative value seen

  for (const b of dailyBuckets) {
    runningPnl += b.netPnl;
    cumulativePnl.push({ date: b.date, value: runningPnl });

    if (runningPnl > peakPnl) peakPnl = runningPnl;
    const drawdown = runningPnl - peakPnl; // ≤ 0
    totalDrawdown += drawdown;
    if (drawdown < maxDrawdownValue) maxDrawdownValue = drawdown;
  }

  const maxDailyNetDrawdown = maxDrawdownValue; // ≤ 0
  const avgDailyNetDrawdown = loggedDays > 0 ? totalDrawdown / loggedDays : 0; // ≤ 0

  // ---- CUMULATIVE AVG DAILY WIN/LOSS SERIES ----
  const cumulativeAvgDailyWinLoss: { date: string; value: number }[] = [];
  for (let i = 0; i < dailyBuckets.length; i++) {
    const ratio = runningWinLoss(dailyBuckets, i);
    cumulativeAvgDailyWinLoss.push({
      date: dailyBuckets[i].date,
      // Cap Infinity at a display-friendly sentinel for charts
      value: isFinite(ratio) ? ratio : 9999,
    });
  }

  // ---- MONTH STATS ----
  // Group daily buckets by YYYY-MM and sum net P&L per month.
  const monthMap = new Map<string, number>();
  for (const b of dailyBuckets) {
    const ym = b.date.slice(0, 7); // "YYYY-MM"
    monthMap.set(ym, (monthMap.get(ym) ?? 0) + b.netPnl);
  }

  let bestMonthPnl = 0;
  let lowestMonthPnl = 0;
  let bestMonthLabel = '';
  let lowestMonthLabel = '';
  let monthTotal = 0;

  if (monthMap.size > 0) {
    let bestKey = '';
    let lowestKey = '';
    let bestVal = -Infinity;
    let lowestVal = Infinity;

    for (const [ym, pnl] of monthMap) {
      monthTotal += pnl;
      if (pnl > bestVal) {
        bestVal = pnl;
        bestKey = ym;
      }
      if (pnl < lowestVal) {
        lowestVal = pnl;
        lowestKey = ym;
      }
    }

    bestMonthPnl = bestVal === -Infinity ? 0 : bestVal;
    lowestMonthPnl = lowestVal === Infinity ? 0 : lowestVal;
    bestMonthLabel = bestKey ? formatMonthLabel(bestKey) : '';
    lowestMonthLabel = lowestKey ? formatMonthLabel(lowestKey) : '';
  }

  const avgMonthlyPnl = monthMap.size > 0 ? monthTotal / monthMap.size : 0;

  return {
    netPnl: gs.netPnl,
    tradeCount: gs.count,
    winRatePct: gs.winRate,
    profitFactor: gs.profitFactor,
    tradeExpectancy: gs.expectancy,
    avgTradeWinLoss,
    avgNetTradePnl: safeDiv(gs.netPnl, gs.count),
    avgHoldTimeMs,
    avgPlannedR,
    avgRealizedR,
    largestProfitableDay,
    largestLosingDay,
    // new trade-level counts
    winningTrades,
    losingTrades,
    breakevenTrades,
    openTrades,
    // new streaks
    maxConsecutiveWins,
    maxConsecutiveLosses,
    // new trade extremes (reuse groupStats values which already computed these)
    largestProfit: gs.largestWin,
    largestLoss: gs.largestLoss,
    // new fees
    totalFees,
    totalCommissions: 0,
    totalSwap: 0,
    // new hold-time split
    avgHoldAllMs,
    avgHoldWinningMs,
    avgHoldLosingMs,
    avgHoldScratchMs,
    // new per-trade pnl alias
    avgTradePnl: safeDiv(gs.netPnl, gs.count),
    // daily-level
    loggedDays,
    avgDailyNetPnl: safeDiv(gs.netPnl, loggedDays),
    avgDailyWinPct,
    avgDailyWinLoss,
    avgDailyVolume,
    maxDailyNetDrawdown,
    avgDailyNetDrawdown,
    // new day-level counts
    totalTradingDays: loggedDays,
    winningDays: winningDaysCount,
    losingDays: losingDaysCount,
    breakevenDays,
    // new day streaks
    maxConsecutiveWinningDays,
    maxConsecutiveLosingDays,
    // new day averages
    avgWinningDayPnl: avgWinDayPnl,
    avgLosingDayPnl: avgLossDayPnl,
    // drawdown aliases
    maxDrawdown: maxDailyNetDrawdown,
    avgDrawdown: avgDailyNetDrawdown,
    // month stats
    bestMonthPnl,
    lowestMonthPnl,
    avgMonthlyPnl,
    bestMonthLabel,
    lowestMonthLabel,
    // chart series
    cumulativePnl,
    cumulativeAvgDailyWinLoss,
    dailyBuckets,
  };
}
