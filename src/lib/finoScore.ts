import type { DashboardStats } from "@/hooks/useDashboardData";

export interface FinoScoreAxis {
  key: string;
  label: string;
  /** 0-100 normalized sub-score (one radar spoke). */
  value: number;
  /** Formatted underlying metric, shown in tooltips. */
  rawLabel: string;
}

export interface FinoScoreResult {
  /** 0-100 overall score, retaining 2-decimal precision. */
  overall: number;
  /** Always six axes, in radar display order. */
  axes: FinoScoreAxis[];
  hasEnoughData: boolean;
  closedTrades: number;
}

/** Minimum closed trades before the score is considered meaningful. */
export const FINO_SCORE_MIN_TRADES = 5;

const clamp = (n: number, lo = 0, hi = 100): number =>
  Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo;

const round1 = (n: number): number => Math.round(n * 10) / 10;

interface DerivedSeriesMetrics {
  /** Max drawdown as a fraction of peak equity (0..1+). */
  ddRatio: number;
  /** Fraction of active days that were positive (0..1). */
  pctPositiveDays: number;
}

function deriveFromEquitySeries(
  series: DashboardStats["equitySeries"] | undefined,
): DerivedSeriesMetrics {
  if (!series || series.length === 0) {
    return { ddRatio: 1, pctPositiveDays: 0 };
  }

  let peak = -Infinity;
  let peakEquity = 0;
  let maxDd = 0;
  for (const point of series) {
    const eq = point.equity ?? 0;
    if (eq > peak) peak = eq;
    if (peak > peakEquity) peakEquity = peak;
    const dd = peak - eq;
    if (dd > maxDd) maxDd = dd;
  }
  const ddRatio = peakEquity > 0 ? maxDd / peakEquity : maxDd > 0 ? 1 : 0;

  const activeDays = series.filter((p) => (p.pnl ?? 0) !== 0);
  const positiveDays = activeDays.filter((p) => (p.pnl ?? 0) > 0).length;
  const pctPositiveDays = activeDays.length > 0 ? positiveDays / activeDays.length : 0;

  return { ddRatio, pctPositiveDays };
}

function emptyResult(stats: DashboardStats | null | undefined): FinoScoreResult {
  return {
    overall: 0,
    hasEnoughData: false,
    closedTrades: stats?.closedTrades ?? 0,
    axes: [
      { key: "winRate", label: "Win %", value: 0, rawLabel: "—" },
      { key: "profitFactor", label: "Profit Factor", value: 0, rawLabel: "—" },
      { key: "avgWinLoss", label: "Avg Win/Loss", value: 0, rawLabel: "—" },
      { key: "recoveryFactor", label: "Recovery Factor", value: 0, rawLabel: "—" },
      { key: "maxDrawdown", label: "Max Drawdown", value: 0, rawLabel: "—" },
      { key: "consistency", label: "Consistency", value: 0, rawLabel: "—" },
    ],
  };
}

/**
 * Computes the FINOTAUR "FINO Score" from a user's closed-trade stats.
 * Each of six metrics is normalized to 0-100 against a standard benchmark,
 * then blended with fixed weights into an overall score. Pure function:
 * deterministic from its input, so the radar updates as the user logs trades.
 */
export function computeFinoScore(
  stats: DashboardStats | null | undefined,
): FinoScoreResult {
  if (!stats) return emptyResult(stats);

  const closedTrades = stats.closedTrades ?? 0;
  if (closedTrades < FINO_SCORE_MIN_TRADES) {
    return { ...emptyResult(stats), closedTrades, hasEnoughData: false };
  }

  const winrate = stats.winrate ?? 0; // 0..1
  const wins = stats.wins ?? 0;
  const losses = stats.losses ?? 0;
  const netPnl = stats.netPnl ?? 0;
  const avgWin = stats.avgWin ?? 0;
  const avgLoss = Math.abs(stats.avgLoss ?? 0);

  // Win % — 60% win rate maps to a perfect spoke.
  const winRateScore = clamp((winrate * 100) / 0.6);

  // Profit Factor — 2.5+ is elite, <=0.8 is zero. No losing trades => elite.
  let pf = stats.profitFactor ?? 0;
  if ((!Number.isFinite(pf) || pf <= 0) && wins > 0 && losses === 0) {
    pf = 5;
  }
  const pfCapped = Math.min(Number.isFinite(pf) ? pf : 0, 5);
  const profitFactorScore = clamp(((pfCapped - 0.8) / (2.5 - 0.8)) * 100);

  // Avg Win/Loss ratio — 2.5:1 is a perfect spoke.
  const awlRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 2.5 : 0;
  const avgWinLossScore = clamp((awlRatio / 2.5) * 100);

  // Recovery Factor — netPnl / max drawdown ($). 4+ is a perfect spoke.
  const maxDdDollars = Math.abs(stats.maxDrawdown ?? 0);
  const recoveryFactor =
    maxDdDollars > 0 ? netPnl / maxDdDollars : netPnl > 0 ? 4 : 0;
  const recoveryFactorScore = clamp((recoveryFactor / 4) * 100);

  // Max Drawdown (inverted) and Consistency — derived from the equity series.
  const { ddRatio, pctPositiveDays } = deriveFromEquitySeries(stats.equitySeries);
  const maxDrawdownScore = clamp(100 - ddRatio * 100 * 2); // 0% dd => 100, 50%+ => 0
  const consistencyScore = clamp((pctPositiveDays / 0.6) * 100); // 60% green days => 100

  const axes: FinoScoreAxis[] = [
    { key: "winRate", label: "Win %", value: round1(winRateScore), rawLabel: `${(winrate * 100).toFixed(1)}%` },
    { key: "profitFactor", label: "Profit Factor", value: round1(profitFactorScore), rawLabel: pfCapped >= 5 ? "5.0+" : pfCapped.toFixed(2) },
    { key: "avgWinLoss", label: "Avg Win/Loss", value: round1(avgWinLossScore), rawLabel: `${awlRatio.toFixed(2)}:1` },
    { key: "recoveryFactor", label: "Recovery Factor", value: round1(recoveryFactorScore), rawLabel: recoveryFactor.toFixed(2) },
    { key: "maxDrawdown", label: "Max Drawdown", value: round1(maxDrawdownScore), rawLabel: `${(ddRatio * 100).toFixed(1)}%` },
    { key: "consistency", label: "Consistency", value: round1(consistencyScore), rawLabel: `${(pctPositiveDays * 100).toFixed(0)}% green days` },
  ];

  const overall =
    winRateScore * 0.175 +
    profitFactorScore * 0.175 +
    avgWinLossScore * 0.175 +
    recoveryFactorScore * 0.15 +
    maxDrawdownScore * 0.15 +
    consistencyScore * 0.175;

  return {
    overall: Math.round(overall * 100) / 100,
    axes,
    hasEnoughData: true,
    closedTrades,
  };
}
