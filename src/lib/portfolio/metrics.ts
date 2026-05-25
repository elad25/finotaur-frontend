// src/lib/portfolio/metrics.ts
// Pure portfolio performance metrics computed from a PerformancePoint series.
// No I/O, no React — used by the COPILOT dashboard's metrics strip.

import type { PerformancePoint } from '@/pages/app/ai/copilot/hooks/usePortfolioMockData';

export interface PortfolioMetrics {
  /** Total return over the series ((last-first)/first). Null when series has <2 points. */
  returnRange: number | null;
  /** Sharpe ratio, annualized, risk-free=0. Null when <2 points or zero volatility. */
  sharpe: number | null;
  /** Largest peak-to-trough drawdown across the series (negative number, e.g. -0.0891 = -8.91%). */
  maxDrawdown: number | null;
  /** Annualized standard deviation of daily returns. */
  volatility: number | null;
  /** Share of days with positive daily return (0..1). */
  winningDays: number | null;
  /** Excess return vs benchmark — deferred (no SPY data wired). Always null for now. */
  alpha: number | null;
}

const TRADING_DAYS_PER_YEAR = 252;
const EMPTY: PortfolioMetrics = {
  returnRange: null, sharpe: null, maxDrawdown: null,
  volatility: null, winningDays: null, alpha: null,
};

function dailyReturns(series: PerformancePoint[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].value;
    const curr = series[i].value;
    if (prev > 0) r.push((curr - prev) / prev);
  }
  return r;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function calculatePortfolioMetrics(series: PerformancePoint[]): PortfolioMetrics {
  if (!series || series.length < 2) return EMPTY;

  const first = series[0].value;
  const last = series[series.length - 1].value;
  const returnRange = first > 0 ? (last - first) / first : null;

  const returns = dailyReturns(series);
  if (returns.length === 0) {
    return { ...EMPTY, returnRange };
  }

  const dailyVol = stddev(returns);
  const volatility = dailyVol * Math.sqrt(TRADING_DAYS_PER_YEAR);
  const dailyMean = mean(returns);
  const sharpe = dailyVol > 0
    ? (dailyMean / dailyVol) * Math.sqrt(TRADING_DAYS_PER_YEAR)
    : null;

  // Max drawdown: walk peaks, track largest (trough - peak) / peak.
  let peak = series[0].value;
  let maxDD = 0;
  for (const point of series) {
    if (point.value > peak) peak = point.value;
    if (peak > 0) {
      const dd = (point.value - peak) / peak;
      if (dd < maxDD) maxDD = dd;
    }
  }
  const maxDrawdown = maxDD;

  const winners = returns.filter((r) => r > 0).length;
  const winningDays = winners / returns.length;

  return {
    returnRange,
    sharpe,
    maxDrawdown,
    volatility,
    winningDays,
    alpha: null, // benchmark integration deferred
  };
}

// ─── Formatters ──────────────────────────────────────────────────────────────
// Display helpers: turn null into '—', percentages into '+x.xx%', etc.

export function fmtPercent(v: number | null, opts: { signed?: boolean; decimals?: number } = {}): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const { signed = false, decimals = 2 } = opts;
  const pct = v * 100;
  const sign = signed && pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(decimals)}%`;
}

export function fmtNumber(v: number | null, decimals = 2): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toFixed(decimals);
}
