// src/lib/reports/journalReportData.ts
// =====================================================
// FINO REPORTS — Journal report, client-side data builder
// =====================================================
// Pure functions only — no React, no network. Takes the user's trades
// (from useTrades()) and produces every number the 6 Journal Report
// slides render, using the canonical stats engine (calculateAllStats /
// calculateBreakdown from useTradeStats.ts) as the source of truth for
// win rate, profit factor, expectancy, drawdown, streaks, etc.
//
// Degradation policy: several "patterns" require fields that aren't
// reliably present on every trade (trade legs, MFE/MAE, mistake tags).
// When the data isn't there, the pattern is OMITTED — never faked — and
// its key is recorded in `degradedPatterns` for QA/debugging only.
// =====================================================

import type { Trade } from '@/hooks/useTradesData';
import { calculateAllStats, calculateBreakdown, type StrategyStats } from '@/hooks/useTradeStats';
import { calculateActualR } from '@/utils/tradeCalculations';
import type {
  AdvancedStatTile,
  ConsistencyStatCard,
  DailyPnlPoint,
  DayOfWeekRow,
  DisciplineData,
  EdgeScoreData,
  EdgeScoreMetric,
  EntryHourBucket,
  EquityPoint,
  JournalReportData,
  JournalReportGraphs,
  MistakeTagStat,
  PatternResult,
  ReportSlide,
  RiskDrawdownData,
  RMultipleBucket,
  SessionComparison,
  StatusBadge,
  TakeawaySlideInput,
} from './reportTypes';

// ---------------------------------------------------------------------------
// Slide registry
// ---------------------------------------------------------------------------
export const JOURNAL_REPORT_SLIDES: ReportSlide[] = [
  { key: 'consistency', title: 'Consistency Dashboard' },
  { key: 'edge-score', title: 'FINO Edge Score' },
  { key: 'day-of-week', title: 'Day of Week Performance' },
  { key: 'patterns', title: 'Patterns Detected' },
  { key: 'risk-drawdown', title: 'Risk & Drawdown' },
  { key: 'discipline', title: 'Discipline' },
];

export const JOURNAL_REPORT_MIN_TRADES = 5;

// ---------------------------------------------------------------------------
// Small numeric helpers
// ---------------------------------------------------------------------------
const clamp = (n: number, lo = 0, hi = 100): number =>
  Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo;

/** Linear map [lo, hi] -> [0, 100], clamped at both ends. */
const normalizeLinear = (value: number, lo: number, hi: number): number =>
  clamp(((value - lo) / (hi - lo)) * 100);

const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;

const fmtPct = (n: number, decimals = 1): string => `${round1(n).toFixed(decimals)}%`;
const fmtMoney = (n: number): string =>
  `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
// Ratios computed from a near-zero denominator (e.g. Sortino with almost no
// downside deviation) explode into absurd magnitudes — cap the DISPLAY at 10+.
const fmtRatio = (n: number): string => {
  if (!Number.isFinite(n)) return '—';
  if (n > 10) return '10+';
  if (n < -10) return '−10+';
  return n.toFixed(2);
};

function tradeDateMs(t: Trade): number | null {
  const raw = t.close_at || t.open_at;
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = clamp(p, 0, 1) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

// ---------------------------------------------------------------------------
// 1. Consistency Dashboard
// ---------------------------------------------------------------------------

function statusFor(
  value: number,
  thresholds: { great: number; good: number; needsWork: number },
  higherIsBetter: boolean,
): StatusBadge {
  const { great, good, needsWork } = thresholds;
  if (higherIsBetter) {
    if (value >= great) return 'GREAT';
    if (value >= good) return 'GOOD';
    if (value >= needsWork) return 'NEEDS WORK';
    return 'WATCH OUT';
  }
  if (value <= great) return 'GREAT';
  if (value <= good) return 'GOOD';
  if (value <= needsWork) return 'NEEDS WORK';
  return 'WATCH OUT';
}

function buildConsistencyCards(stats: StrategyStats, maxDrawdownPct: number): ConsistencyStatCard[] {
  const winRateStatus = statusFor(stats.winRate, { great: 55, good: 45, needsWork: 35 }, true);
  const profitFactorStatus = statusFor(stats.profitFactor, { great: 1.6, good: 1.2, needsWork: 1.0 }, true);
  const avgWinLoss = stats.avgLossR > 0 ? stats.avgWinR / stats.avgLossR : stats.avgWinR > 0 ? 99 : 0;
  const avgWinLossStatus = statusFor(avgWinLoss, { great: 2, good: 1.3, needsWork: 1 }, true);
  const drawdownStatus = statusFor(maxDrawdownPct, { great: 10, good: 20, needsWork: 30 }, false);

  const explanationFor = (label: string, status: StatusBadge, good: string, bad: string) =>
    status === 'GREAT' || status === 'GOOD' ? good : `${label}: ${bad}`;

  return [
    {
      key: 'win-rate',
      label: 'Win Rate',
      value: round1(stats.winRate),
      displayValue: fmtPct(stats.winRate),
      status: winRateStatus,
      explanation: explanationFor(
        'Win Rate',
        winRateStatus,
        'A healthy share of your trades close as winners.',
        'fewer than half your trades are closing as winners — review entry criteria.',
      ),
      tooltip: 'Share of closed trades that ended in profit.',
    },
    {
      key: 'profit-factor',
      label: 'Profit Factor',
      value: round2(stats.profitFactor),
      displayValue: fmtRatio(stats.profitFactor),
      status: profitFactorStatus,
      explanation: explanationFor(
        'Profit Factor',
        profitFactorStatus,
        'Your winners are outweighing your losers by a solid margin.',
        'gross profit is not clearing gross loss by enough of a margin.',
      ),
      tooltip: 'Gross profit divided by gross loss. Above 1.0 means you are net profitable.',
    },
    {
      key: 'avg-win-loss',
      label: 'Avg Win/Loss Ratio',
      value: round2(avgWinLoss),
      displayValue: `${fmtRatio(avgWinLoss)}:1`,
      status: avgWinLossStatus,
      explanation: explanationFor(
        'Avg Win/Loss',
        avgWinLossStatus,
        'Your average winner is meaningfully larger than your average loser.',
        'your average winner is not far ahead of your average loser — cutting winners short or letting losers run.',
      ),
      tooltip: 'Average R of winning trades divided by average R of losing trades.',
    },
    {
      key: 'max-drawdown',
      label: 'Max Drawdown',
      value: round1(maxDrawdownPct),
      displayValue: fmtPct(maxDrawdownPct),
      status: drawdownStatus,
      explanation: explanationFor(
        'Max Drawdown',
        drawdownStatus,
        'Your worst peak-to-trough dip has stayed well controlled.',
        'your worst peak-to-trough dip has been significant — review position sizing.',
      ),
      tooltip: 'The largest drop from a cumulative-P&L peak to the following trough.',
    },
  ];
}

// ---------------------------------------------------------------------------
// 1b. Advanced Stats (Consistency slide → "Advanced Stats" tab)
// ---------------------------------------------------------------------------

/** Badge only where the threshold is meaningful (Sharpe/Sortino/Expectancy);
 *  every other advanced tile is unbadged (undefined). */
function ratioStatus(value: number): StatusBadge | undefined {
  if (!Number.isFinite(value)) return undefined;
  if (value >= 1) return 'GREAT';
  if (value >= 0.5) return 'GOOD';
  return undefined;
}

function fmtHours(hrs: number): string {
  if (hrs >= 24) return `${round1(hrs / 24)}d`;
  return `${round1(hrs)}h`;
}

function buildAdvancedStats(trades: Trade[], stats: StrategyStats, riskLargestLoss: number): AdvancedStatTile[] {
  const wins = trades.filter((t) => (t.pnl ?? 0) > 0).map((t) => Number(t.pnl) || 0);
  const losses = trades.filter((t) => (t.pnl ?? 0) < 0).map((t) => Number(t.pnl) || 0);
  const avgWinDollar = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLossDollar = losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;
  const winRateFrac = stats.winRate / 100;
  const lossRateFrac = stats.totalTrades > 0 ? losses.length / stats.totalTrades : 0;
  const expectancyDollar = winRateFrac * avgWinDollar - lossRateFrac * avgLossDollar;
  const largestWinDollar = wins.length > 0 ? Math.max(...wins) : 0;

  const expectancyStatus: StatusBadge | undefined = expectancyDollar > 0 ? 'GOOD' : undefined;

  const tiles: AdvancedStatTile[] = [
    {
      key: 'expectancy-dollar',
      label: 'Expectancy ($)',
      displayValue: fmtMoney(expectancyDollar),
      tooltip: 'Average dollar P&L you can expect per trade, given your current win rate and average win/loss size.',
      status: expectancyStatus,
    },
    {
      key: 'expectancy-r',
      label: 'Expectancy (R)',
      displayValue: `${stats.expectancy >= 0 ? '' : '−'}${Math.abs(round2(stats.expectancy)).toFixed(2)}R`,
      tooltip: 'Average R-multiple you can expect per trade.',
      status: stats.expectancy > 0 ? 'GOOD' : undefined,
    },
    {
      key: 'avg-r',
      label: 'Avg R',
      displayValue: `${stats.avgR >= 0 ? '' : '−'}${Math.abs(round2(stats.avgR)).toFixed(2)}R`,
      tooltip: 'Average R-multiple across all closed trades.',
    },
    {
      key: 'sharpe',
      label: 'Sharpe Ratio',
      displayValue: fmtRatio(stats.sharpeRatio ?? 0),
      tooltip: 'Mean R-multiple divided by its standard deviation — reward per unit of overall volatility.',
      status: ratioStatus(stats.sharpeRatio ?? 0),
    },
    {
      key: 'sortino',
      label: 'Sortino Ratio',
      displayValue: fmtRatio(stats.sortinoRatio ?? 0),
      tooltip: 'Mean R-multiple divided by downside deviation only — reward per unit of downside risk.',
      status: ratioStatus(stats.sortinoRatio ?? 0),
    },
    {
      key: 'consistency',
      label: 'Consistency',
      displayValue: fmtRatio(stats.consistency ?? 0),
      tooltip: 'How stable your R-multiples are trade to trade — higher means more repeatable results.',
    },
    {
      key: 'total-r',
      label: 'Total R',
      displayValue: `${stats.totalR >= 0 ? '' : '−'}${Math.abs(round2(stats.totalR)).toFixed(2)}R`,
      tooltip: 'Sum of R-multiples across every closed trade.',
    },
    {
      key: 'largest-win',
      label: 'Largest Win',
      displayValue: fmtMoney(largestWinDollar),
      tooltip: 'Your single largest winning trade by dollar P&L.',
    },
    {
      key: 'largest-loss',
      label: 'Largest Loss',
      displayValue: fmtMoney(-Math.abs(riskLargestLoss)),
      tooltip: 'Your single largest losing trade by dollar P&L.',
    },
  ];

  if (stats.longestWinStreak !== undefined) {
    tiles.push({
      key: 'longest-win-streak',
      label: 'Longest Win Streak',
      displayValue: `${stats.longestWinStreak}`,
      tooltip: 'Most consecutive winning trades in a row.',
    });
  }
  if (stats.longestLossStreak !== undefined) {
    tiles.push({
      key: 'longest-loss-streak',
      label: 'Longest Losing Streak',
      displayValue: `${stats.longestLossStreak}`,
      tooltip: 'Most consecutive losing trades in a row.',
    });
  }
  if (stats.avgTradeDuration !== undefined && stats.avgTradeDuration > 0) {
    tiles.push({
      key: 'avg-duration',
      label: 'Avg Trade Duration',
      displayValue: fmtHours(stats.avgTradeDuration),
      tooltip: 'Average time between opening and closing a trade.',
    });
  }
  if (stats.tradesHitting1R !== undefined) {
    tiles.push({
      key: 'trades-hitting-1r',
      label: 'Trades Hitting 1R',
      displayValue: `${stats.tradesHitting1R}`,
      tooltip: 'Number of trades that reached at least +1R before closing.',
    });
  }

  return tiles;
}

// ---------------------------------------------------------------------------
// 1c. Graphs (Consistency slide → "Graphs" tab)
// ---------------------------------------------------------------------------

/** Mirrors the R-multiple resolution logic inside calculateAllStats — no
 *  exported per-trade R array exists on the stats engine, so this stays a
 *  small, deliberately duplicated read-only helper. */
function resolveTradeR(t: Trade): number | undefined {
  let r = t.actual_r ?? t.metrics?.actual_r;
  if (r === undefined && t.exit_price) {
    r = calculateActualR(
      t.entry_price,
      t.stop_price,
      t.exit_price,
      t.quantity,
      t.symbol,
      t.side,
      t.fees || 0,
    );
  }
  return r;
}

const R_BUCKETS: { label: string; lo: number; hi: number }[] = [
  { label: '< −2R', lo: -Infinity, hi: -2 },
  { label: '−2R to −1R', lo: -2, hi: -1 },
  { label: '−1R to 0R', lo: -1, hi: 0 },
  { label: '0R to 1R', lo: 0, hi: 1 },
  { label: '1R to 2R', lo: 1, hi: 2 },
  { label: '2R to 3R', lo: 2, hi: 3 },
  { label: '> 3R', lo: 3, hi: Infinity },
];

function buildRDistribution(trades: Trade[]): RMultipleBucket[] {
  const rValues = trades.map(resolveTradeR).filter((r): r is number => r !== undefined);
  if (rValues.length === 0) return [];

  return R_BUCKETS.map((b) => ({
    label: b.label,
    count: rValues.filter((r) => r > b.lo && r <= b.hi).length,
    isNegative: b.hi <= 0,
  }));
}

function buildDailyPnl(trades: Trade[]): DailyPnlPoint[] {
  const byDate = new Map<string, number>();
  trades.forEach((t) => {
    const ms = tradeDateMs(t);
    if (ms === null || t.pnl == null) return;
    const date = new Date(ms).toISOString().slice(0, 10);
    byDate.set(date, (byDate.get(date) || 0) + (Number(t.pnl) || 0));
  });
  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, pnl]) => ({ date, pnl: round2(pnl) }));
}

function buildGraphs(trades: Trade[]): JournalReportGraphs {
  return { rDistribution: buildRDistribution(trades), dailyPnl: buildDailyPnl(trades) };
}

// ---------------------------------------------------------------------------
// Dollar equity curve — shared by Max Drawdown %, Edge Score, and slide 5.
// ---------------------------------------------------------------------------

interface DollarEquitySeries {
  points: EquityPoint[];
  maxDrawdownDollars: number;
  maxDrawdownPct: number;
  peakDollars: number;
}

function buildDollarEquitySeries(trades: Trade[]): DollarEquitySeries {
  const dated = trades
    .filter((t) => tradeDateMs(t) !== null && t.pnl != null)
    .sort((a, b) => (tradeDateMs(a) as number) - (tradeDateMs(b) as number));

  let cumulative = 0;
  let peak = 0;
  let maxDD = 0;
  let peakIdx = 0;
  let ddStartIdx = 0;
  let ddEndIdx = 0;

  const raw: { date: string; cumulativePnl: number }[] = [];

  dated.forEach((t, i) => {
    cumulative += Number(t.pnl) || 0;
    raw.push({ date: t.close_at || t.open_at, cumulativePnl: cumulative });

    if (cumulative > peak) {
      peak = cumulative;
      peakIdx = i;
    }
    const dd = peak - cumulative;
    if (dd > maxDD) {
      maxDD = dd;
      ddStartIdx = peakIdx;
      ddEndIdx = i;
    }
  });

  const points: EquityPoint[] = raw.map((p, i) => ({
    ...p,
    inDrawdown: i >= ddStartIdx && i <= ddEndIdx && maxDD > 0,
  }));

  // Percentage form uses peak equity as the base; if the account never went
  // positive, fall back to "100% drawdown" only when there was a real loss.
  const maxDrawdownPct = peak > 0 ? (maxDD / peak) * 100 : maxDD > 0 ? 100 : 0;

  return { points, maxDrawdownDollars: maxDD, maxDrawdownPct, peakDollars: peak };
}

// ---------------------------------------------------------------------------
// 2. FINO Edge Score
// ---------------------------------------------------------------------------

function buildEdgeScore(stats: StrategyStats, equity: DollarEquitySeries): EdgeScoreData {
  // Each metric is normalized 0-100 against a documented benchmark, then
  // blended with EQUAL weights into the overall score (per spec).
  const winRateScore = normalizeLinear(stats.winRate, 0, 60); // 60% win rate = perfect spoke
  const pfCapped = Math.min(Number.isFinite(stats.profitFactor) ? stats.profitFactor : 0, 5);
  const profitFactorScore = normalizeLinear(pfCapped, 0.8, 2.5); // 0.8 = 0, 2.5+ = 100
  const avgWinLoss = stats.avgLossR > 0 ? stats.avgWinR / stats.avgLossR : stats.avgWinR > 0 ? 2.5 : 0;
  const avgWinLossScore = normalizeLinear(avgWinLoss, 0, 2.5); // 2.5:1 = perfect spoke
  const maxDrawdownScore = normalizeLinear(equity.maxDrawdownPct, 50, 0); // 0% dd = 100, 50%+ dd = 0
  const recoveryFactorRaw =
    equity.maxDrawdownDollars > 0 ? stats.netPnL / equity.maxDrawdownDollars : stats.netPnL > 0 ? 5 : 0;
  const recoveryFactorCapped = Math.min(Math.max(recoveryFactorRaw, 0), 5);
  const recoveryFactorScore = normalizeLinear(recoveryFactorCapped, 0, 5); // cap 5, per spec
  const consistencyScore = clamp(stats.consistency ?? 0); // already ~0-100 ratio*100

  const metrics: EdgeScoreMetric[] = [
    { key: 'winRate', label: 'Win Rate', rawValue: stats.winRate, rawLabel: fmtPct(stats.winRate), score: round1(winRateScore) },
    { key: 'profitFactor', label: 'Profit Factor', rawValue: stats.profitFactor, rawLabel: fmtRatio(pfCapped), score: round1(profitFactorScore) },
    { key: 'avgWinLoss', label: 'Avg Win/Loss', rawValue: avgWinLoss, rawLabel: `${fmtRatio(avgWinLoss)}:1`, score: round1(avgWinLossScore) },
    { key: 'maxDrawdown', label: 'Max Drawdown', rawValue: equity.maxDrawdownPct, rawLabel: fmtPct(equity.maxDrawdownPct), score: round1(maxDrawdownScore) },
    { key: 'recoveryFactor', label: 'Recovery Factor', rawValue: recoveryFactorCapped, rawLabel: fmtRatio(recoveryFactorCapped), score: round1(recoveryFactorScore) },
    { key: 'consistency', label: 'Consistency', rawValue: stats.consistency ?? 0, rawLabel: fmtRatio(stats.consistency ?? 0), score: round1(consistencyScore) },
  ];

  const overall =
    (winRateScore + profitFactorScore + avgWinLossScore + maxDrawdownScore + recoveryFactorScore + consistencyScore) / 6;

  return { overall: round1(overall), metrics };
}

// ---------------------------------------------------------------------------
// 3. Day of Week Performance
// ---------------------------------------------------------------------------

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function buildDayOfWeek(trades: Trade[]): { rows: DayOfWeekRow[]; entryHourByDay: Record<string, EntryHourBucket[]> } {
  const byDay = new Map<string, Trade[]>();
  DAY_NAMES.forEach((d) => byDay.set(d, []));
  trades.forEach((t) => {
    if (!t.open_at) return;
    const day = DAY_NAMES[new Date(t.open_at).getDay()];
    byDay.get(day)!.push(t);
  });

  const rows: DayOfWeekRow[] = DAY_NAMES.map((day) => {
    const dayTrades = byDay.get(day) || [];
    const s = calculateAllStats(dayTrades);
    return { day, pnl: round2(s.netPnL), wins: s.wins, losses: s.losses, trades: dayTrades.length };
  });

  const entryHourByDay: Record<string, EntryHourBucket[]> = {};
  DAY_NAMES.forEach((day) => {
    const dayTrades = byDay.get(day) || [];
    const hourMap = new Map<number, { pnl: number; trades: number }>();
    dayTrades.forEach((t) => {
      if (!t.open_at) return;
      const hour = new Date(t.open_at).getHours();
      const bucket = hourMap.get(hour) || { pnl: 0, trades: 0 };
      bucket.pnl += Number(t.pnl) || 0;
      bucket.trades += 1;
      hourMap.set(hour, bucket);
    });
    entryHourByDay[day] = Array.from(hourMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hour, v]) => ({
        hour,
        label: `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}${hour < 12 ? 'am' : 'pm'}`,
        pnl: round2(v.pnl),
        trades: v.trades,
      }));
  });

  return { rows, entryHourByDay };
}

// ---------------------------------------------------------------------------
// 4. Patterns Detected
// ---------------------------------------------------------------------------

function buildPatterns(trades: Trade[], degradedPatterns: string[]): PatternResult[] {
  const total = trades.length;
  const patterns: PatternResult[] = [];

  // Scale In / Scale Out — need per-fill trade legs, not present on the
  // Trade shape used by the journal report (no `trade_legs`/`executions`
  // field). Omit gracefully rather than fake it.
  degradedPatterns.push('scale-in (no trade_legs field on Trade)');
  degradedPatterns.push('scale-out (no trade_legs field on Trade)');
  degradedPatterns.push('time-in-drawdown (no MAE/MFE timing data)');

  // Green to Red — was up (positive MFE) but closed a loser.
  const withMfe = trades.filter((t) => t.mfe_r != null);
  if (withMfe.length >= 5) {
    const greenToRed = withMfe.filter((t) => (t.mfe_r ?? 0) > 0 && (t.pnl ?? 0) < 0);
    if (greenToRed.length > 0) {
      patterns.push({
        key: 'green-to-red',
        name: 'Green to Red',
        description: 'Trades that were profitable at some point but closed as a loss — a sign of not locking in gains or moving stops.',
        pct: round1((greenToRed.length / total) * 100),
        count: greenToRed.length,
        classification: 'Area to Improve',
      });
    }
  } else {
    degradedPatterns.push('green-to-red (insufficient MFE data)');
  }

  // Red to Green — was down (negative MAE) but recovered to a winner.
  const withMae = trades.filter((t) => t.mae_r != null);
  if (withMae.length >= 5) {
    const redToGreen = withMae.filter((t) => (t.mae_r ?? 0) < 0 && (t.pnl ?? 0) > 0);
    if (redToGreen.length > 0) {
      patterns.push({
        key: 'red-to-green',
        name: 'Red to Green',
        description: 'Trades that were down at some point but recovered to close as a win — good patience and stop discipline.',
        pct: round1((redToGreen.length / total) * 100),
        count: redToGreen.length,
        classification: 'Strength',
      });
    }
  } else {
    degradedPatterns.push('red-to-green (insufficient MAE data)');
  }

  // Quick Exits — duration below the 25th percentile of closed-trade durations.
  const durations = trades
    .filter((t) => t.open_at && t.close_at)
    .map((t) => ({ t, hrs: (new Date(t.close_at as string).getTime() - new Date(t.open_at).getTime()) / (1000 * 60 * 60) }))
    .filter((d) => d.hrs >= 0);
  if (durations.length >= 5) {
    const sorted = [...durations].map((d) => d.hrs).sort((a, b) => a - b);
    const p25 = percentile(sorted, 0.25);
    const quick = durations.filter((d) => d.hrs <= p25);
    if (quick.length > 0) {
      patterns.push({
        key: 'quick-exits',
        name: 'Quick Exits',
        description: 'A meaningful share of your trades closed unusually fast relative to your average hold time — worth checking whether this is disciplined stop management or premature exits.',
        pct: round1((quick.length / total) * 100),
        count: quick.length,
        classification: 'Neutral',
      });
    }
  } else {
    degradedPatterns.push('quick-exits (insufficient open/close timestamp data)');
  }

  // Revenge pattern — a loss followed within 30 min by a larger-size trade.
  const chrono = [...trades]
    .filter((t) => t.open_at)
    .sort((a, b) => new Date(a.open_at).getTime() - new Date(b.open_at).getTime());
  let revengeCount = 0;
  for (let i = 0; i < chrono.length - 1; i++) {
    const a = chrono[i];
    const b = chrono[i + 1];
    const aOutcome = a.outcome || ((a.pnl ?? 0) > 0 ? 'WIN' : (a.pnl ?? 0) < 0 ? 'LOSS' : 'BE');
    if (aOutcome !== 'LOSS') continue;
    const aEnd = a.close_at ? new Date(a.close_at).getTime() : new Date(a.open_at).getTime();
    const bStart = new Date(b.open_at).getTime();
    const minutesBetween = (bStart - aEnd) / (1000 * 60);
    if (minutesBetween >= 0 && minutesBetween <= 30 && Number(b.quantity) > Number(a.quantity)) {
      revengeCount++;
    }
  }
  if (revengeCount > 0) {
    patterns.push({
      key: 'revenge-trading',
      name: 'Revenge Sizing',
      description: 'Trades opened within 30 minutes of a loss, sized larger than the losing trade — a classic revenge-trading signature.',
      pct: round1((revengeCount / total) * 100),
      count: revengeCount,
      classification: 'Area to Improve',
    });
  }

  // Mistake-tag frequency — most common tagged mistake.
  const mistakeCounts = new Map<string, number>();
  trades.forEach((t) => {
    const tag = (t.mistake || '').trim();
    if (!tag) return;
    mistakeCounts.set(tag, (mistakeCounts.get(tag) || 0) + 1);
  });
  if (mistakeCounts.size > 0) {
    const [topTag, topCount] = Array.from(mistakeCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topCount >= 3) {
      patterns.push({
        key: 'repeated-mistake',
        name: `Repeated Mistake: "${topTag}"`,
        description: `This mistake was tagged on ${topCount} of your logged trades — your most frequent recurring error.`,
        pct: round1((topCount / total) * 100),
        count: topCount,
        classification: 'Area to Improve',
      });
    }
  } else {
    degradedPatterns.push('mistake-tag-frequency (no trades have a mistake tag)');
  }

  return patterns.sort((a, b) => b.pct - a.pct);
}

// ---------------------------------------------------------------------------
// 5. Risk & Drawdown
// ---------------------------------------------------------------------------

function buildRiskDrawdown(trades: Trade[], stats: StrategyStats, equity: DollarEquitySeries): RiskDrawdownData {
  const losses = trades.filter((t) => (t.pnl ?? 0) < 0);
  const largestLoss = losses.length > 0 ? Math.min(...losses.map((t) => Number(t.pnl) || 0)) : 0;
  const recoveryFactor =
    equity.maxDrawdownDollars > 0 ? stats.netPnL / equity.maxDrawdownDollars : stats.netPnL > 0 ? 5 : 0;

  return {
    equityCurve: equity.points,
    maxDrawdown: round2(equity.maxDrawdownDollars),
    recoveryFactor: round2(Math.min(Math.max(recoveryFactor, 0), 5)),
    largestLoss: round2(largestLoss),
    longestLosingStreak: stats.longestLossStreak ?? 0,
  };
}

// ---------------------------------------------------------------------------
// 6. Discipline
// ---------------------------------------------------------------------------

function buildDiscipline(trades: Trade[]): DisciplineData {
  const tagMap = new Map<string, number[]>();
  trades.forEach((t) => {
    const tag = (t.mistake || '').trim();
    if (!tag) return;
    if (!tagMap.has(tag)) tagMap.set(tag, []);
    tagMap.get(tag)!.push(Number(t.pnl) || 0);
  });
  const mistakeTags: MistakeTagStat[] = Array.from(tagMap.entries())
    .map(([tag, pnls]) => ({
      tag,
      count: pnls.length,
      avgPnlImpact: round2(pnls.reduce((a, b) => a + b, 0) / pnls.length),
    }))
    .sort((a, b) => b.count - a.count);

  const bySession = calculateBreakdown(trades).bySession.filter((s) => s.stats.totalTrades >= 3);
  let bestSession: SessionComparison | null = null;
  let worstSession: SessionComparison | null = null;
  if (bySession.length >= 2) {
    const sorted = [...bySession].sort((a, b) => b.stats.netPnL - a.stats.netPnL);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    bestSession = { label: best.name, winRate: round1(best.stats.winRate), netPnl: round2(best.stats.netPnL), trades: best.stats.totalTrades };
    worstSession = { label: worst.name, winRate: round1(worst.stats.winRate), netPnl: round2(worst.stats.netPnL), trades: worst.stats.totalTrades };
  }

  return { mistakeTags, bestSession, worstSession };
}

// ---------------------------------------------------------------------------
// Date range label
// ---------------------------------------------------------------------------

function buildDateRangeLabel(trades: Trade[]): string {
  const dates = trades.map((t) => t.open_at).filter(Boolean).map((d) => new Date(d).getTime()).sort((a, b) => a - b);
  if (dates.length === 0) return 'No trades logged';
  const fmt = (ms: number) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const first = dates[0];
  const last = dates[dates.length - 1];
  return first === last ? fmt(first) : `${fmt(first)} – ${fmt(last)}`;
}

/** Inclusive day-span between the first and last logged trade (min 1). */
function buildDateRangeDays(trades: Trade[]): number {
  const dates = trades.map((t) => t.open_at).filter(Boolean).map((d) => new Date(d).getTime()).sort((a, b) => a - b);
  if (dates.length === 0) return 0;
  const first = dates[0];
  const last = dates[dates.length - 1];
  return Math.max(1, Math.round((last - first) / (1000 * 60 * 60 * 24)) + 1);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function buildJournalReportData(trades: Trade[]): JournalReportData {
  const stats = calculateAllStats(trades);
  const equity = buildDollarEquitySeries(trades);
  const degradedPatterns: string[] = [];

  const { rows: dayOfWeek, entryHourByDay } = buildDayOfWeek(trades);
  const risk = buildRiskDrawdown(trades, stats, equity);

  return {
    totalTrades: trades.length,
    dateRangeLabel: buildDateRangeLabel(trades),
    dateRangeDays: buildDateRangeDays(trades),
    consistency: buildConsistencyCards(stats, equity.maxDrawdownPct),
    advancedStats: buildAdvancedStats(trades, stats, risk.largestLoss),
    graphs: buildGraphs(trades),
    edgeScore: buildEdgeScore(stats, equity),
    dayOfWeek,
    entryHourByDay,
    patterns: buildPatterns(trades, degradedPatterns),
    risk,
    discipline: buildDiscipline(trades),
    degradedPatterns,
  };
}

/** The worst day of week by net P&L — used as the default selection on slide 3. */
export function pickWorstDay(rows: DayOfWeekRow[]): string {
  const withTrades = rows.filter((r) => r.trades > 0);
  if (withTrades.length === 0) return rows[0]?.day ?? 'Sunday';
  return [...withTrades].sort((a, b) => a.pnl - b.pnl)[0].day;
}

// ---------------------------------------------------------------------------
// Compact stats payload for the AI takeaways request — numbers only, no
// raw trades, one entry per unlocked slide.
// ---------------------------------------------------------------------------

export function buildJournalTakeawayInputs(data: JournalReportData, unlockedKeys: string[]): TakeawaySlideInput[] {
  const byKey: Record<string, Record<string, unknown>> = {
    consistency: {
      totalTrades: data.totalTrades,
      cards: data.consistency.map((c) => ({ key: c.key, value: c.value, status: c.status })),
    },
    'edge-score': {
      overall: data.edgeScore.overall,
      metrics: data.edgeScore.metrics.map((m) => ({ key: m.key, score: m.score })),
    },
    'day-of-week': {
      rows: data.dayOfWeek.map((r) => ({ day: r.day, pnl: r.pnl, trades: r.trades })),
    },
    patterns: {
      patterns: data.patterns.map((p) => ({ key: p.key, pct: p.pct, classification: p.classification })),
    },
    'risk-drawdown': {
      maxDrawdown: data.risk.maxDrawdown,
      recoveryFactor: data.risk.recoveryFactor,
      largestLoss: data.risk.largestLoss,
      longestLosingStreak: data.risk.longestLosingStreak,
    },
    discipline: {
      mistakeTags: data.discipline.mistakeTags.slice(0, 5),
      bestSession: data.discipline.bestSession,
      worstSession: data.discipline.worstSession,
    },
  };

  return JOURNAL_REPORT_SLIDES.filter((s) => unlockedKeys.includes(s.key)).map((s) => ({
    key: s.key,
    title: s.title,
    stats: byKey[s.key] ?? {},
  }));
}

// ---------------------------------------------------------------------------
// Deterministic fallback takeaway text — used whenever the AI layer hasn't
// responded (locked slide, network failure, or missing key in the response).
// The report must read as complete without a single word of AI copy.
// ---------------------------------------------------------------------------

export function buildJournalFallbackText(data: JournalReportData): Record<string, string> {
  const winCard = data.consistency.find((c) => c.key === 'win-rate');
  const pfCard = data.consistency.find((c) => c.key === 'profit-factor');
  const topEdgeMetric = [...data.edgeScore.metrics].sort((a, b) => b.score - a.score)[0];
  const daysWithTrades = data.dayOfWeek.filter((d) => d.trades > 0);
  const bestDay = daysWithTrades.length > 0 ? [...daysWithTrades].sort((a, b) => b.pnl - a.pnl)[0] : null;
  const worstDay = daysWithTrades.length > 0 ? [...daysWithTrades].sort((a, b) => a.pnl - b.pnl)[0] : null;
  const topPattern = data.patterns[0];
  const topMistake = data.discipline.mistakeTags[0];

  return {
    consistency: winCard && pfCard
      ? `Across ${data.totalTrades} trades you're winning ${winCard.displayValue} of the time with a ${pfCard.displayValue} profit factor.`
      : `You've logged ${data.totalTrades} trades so far — keep journaling to sharpen these numbers.`,
    'edge-score': topEdgeMetric
      ? `Your FINO Edge Score is ${data.edgeScore.overall.toFixed(1)}/100, led by ${topEdgeMetric.label} (${Math.round(topEdgeMetric.score)}/100).`
      : `Your FINO Edge Score is ${data.edgeScore.overall.toFixed(1)}/100.`,
    'day-of-week': bestDay && worstDay
      ? `${worstDay.day} has been your toughest day so far; ${bestDay.day} has been your strongest.`
      : 'Log trades across more days of the week to unlock day-of-week insights.',
    patterns: topPattern
      ? `Your most notable pattern is "${topPattern.name}", showing up in ${topPattern.pct}% of your trades.`
      : 'No dominant pattern detected yet — keep logging with consistent tags.',
    'risk-drawdown': `Your worst drawdown has been ${fmtMoney(-Math.abs(data.risk.maxDrawdown))}, with a recovery factor of ${fmtRatio(data.risk.recoveryFactor)}.`,
    discipline: topMistake
      ? `Your most frequent tagged mistake is "${topMistake.tag}" (${topMistake.count} trades, averaging ${fmtMoney(topMistake.avgPnlImpact)} per trade).`
      : 'Tag mistakes on your trades to unlock discipline insights here.',
  };
}
