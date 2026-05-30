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
      loggedDays: 0,
      avgDailyNetPnl: 0,
      avgDailyWinPct: 0,
      avgDailyWinLoss: 0,
      avgDailyVolume: 0,
      maxDailyNetDrawdown: 0,
      avgDailyNetDrawdown: 0,
      cumulativePnl: [],
      cumulativeAvgDailyWinLoss: [],
      dailyBuckets: [],
    };
  }

  // ---- DELEGATE TRADE-LEVEL STATS ----
  const gs = computeGroupStats(trades);

  // ---- HOLD TIME ----
  let totalHoldMs = 0;
  let holdCount = 0;
  for (const t of trades) {
    if (t.open_at && t.close_at) {
      const ms = new Date(t.close_at).getTime() - new Date(t.open_at).getTime();
      if (ms > 0) {
        totalHoldMs += ms;
        holdCount += 1;
      }
    }
  }
  const avgHoldTimeMs = holdCount > 0 ? totalHoldMs / holdCount : 0;

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

  // ---- DAILY WIN % ----
  const winDayCount = dailyBuckets.filter(b => b.netPnl > 0).length;
  const avgDailyWinPct = loggedDays > 0 ? (winDayCount / loggedDays) * 100 : 0;

  // ---- DAILY WIN/LOSS RATIO ----
  const winDays = dailyBuckets.filter(b => b.netPnl > 0);
  const lossDays = dailyBuckets.filter(b => b.netPnl < 0);
  const avgWinDayPnl = winDays.length > 0 ? winDays.reduce((s, b) => s + b.netPnl, 0) / winDays.length : 0;
  const avgLossDayPnlMag = lossDays.length > 0 ? Math.abs(lossDays.reduce((s, b) => s + b.netPnl, 0) / lossDays.length) : 0;
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
  let maxDrawdown = 0; // stored as most negative value seen

  for (const b of dailyBuckets) {
    runningPnl += b.netPnl;
    cumulativePnl.push({ date: b.date, value: runningPnl });

    if (runningPnl > peakPnl) peakPnl = runningPnl;
    const drawdown = runningPnl - peakPnl; // ≤ 0
    totalDrawdown += drawdown;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
  }

  const maxDailyNetDrawdown = maxDrawdown; // ≤ 0
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
    loggedDays,
    avgDailyNetPnl: safeDiv(gs.netPnl, loggedDays),
    avgDailyWinPct,
    avgDailyWinLoss,
    avgDailyVolume,
    maxDailyNetDrawdown,
    avgDailyNetDrawdown,
    cumulativePnl,
    cumulativeAvgDailyWinLoss,
    dailyBuckets,
  };
}
