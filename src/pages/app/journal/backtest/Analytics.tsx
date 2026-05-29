// ================================================
// BACKTEST PERFORMANCE ANALYTICS PAGE
// File: src/pages/app/journal/backtest/Analytics.tsx
// ================================================
// 7 sections:
//   1. Page header
//   2. KPI strip (Sharpe, Sortino, Max Drawdown, Recovery Factor, R-Multiple Avg)
//   3. Max Drawdown Curve (recharts LineChart)
//   4. Monthly Returns Heatmap (table)
//   5. P&L Distribution Histogram (recharts BarChart)
//   6. R-Multiple Distribution Histogram (recharts BarChart)
//   7. Win / Loss Streak Histograms (recharts BarChart × 2)

import React, { useMemo } from 'react';
import {
  BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  Area, AreaChart,
} from 'recharts';
import { TrendingDown, Activity, Repeat2, Target } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { JournalKpiCard } from '@/components/journal/ds/JournalKpiCard';
import { useBacktestStats, type EquityPoint, type BacktestTrade } from '@/hooks/useBacktestStats';
import type { SessionStats } from '@/hooks/useBacktestSession';
import dayjs from 'dayjs';

// ================================================
// SHARED PANEL CLASSNAME (verbatim per spec)
// ================================================

const JOURNAL_PANEL =
  'relative overflow-hidden rounded-[12px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(22,22,22,0.92),rgba(11,11,11,0.96))] shadow-[0_18px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)] p-4';

// ================================================
// QUANT MATH HELPERS
// ================================================

/**
 * Compute per-day P&L return as percentage of previous day's equity.
 * First day return is 0 (no prior equity to divide by).
 * Days with zero previous equity are skipped.
 */
function dailyReturns(equity: EquityPoint[]): number[] {
  if (equity.length < 2) return [];
  const out: number[] = [0]; // first day = 0
  for (let i = 1; i < equity.length; i++) {
    const prev = equity[i - 1].equity;
    if (prev === 0) continue; // skip degenerate
    out.push((equity[i].equity - prev) / Math.abs(prev));
  }
  return out;
}

/** Population standard deviation. Returns 0 for empty / single-element arrays. */
function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Annualised Sharpe Ratio (RFR = 0%).
 * Formula: mean(returns) / std(returns) * sqrt(252)
 * Returns 0 when std is 0 or returns is empty.
 */
function sharpeRatio(returns: number[]): number {
  if (returns.length === 0) return 0;
  const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
  const sd = stdDev(returns);
  if (sd === 0) return 0;
  return (mean / sd) * Math.sqrt(252);
}

/**
 * Annualised Sortino Ratio (downside std only, RFR = 0%).
 * Formula: mean(returns) / downsideStd(returns) * sqrt(252)
 * Returns 9999 (capped Infinity) when no negative returns exist.
 */
function sortinoRatio(returns: number[]): number {
  if (returns.length === 0) return 0;
  const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
  const negatives = returns.filter((r) => r < 0);
  if (negatives.length === 0) return 9999; // no downside — cap at 9999
  const downsideMean = negatives.reduce((s, v) => s + v, 0) / negatives.length;
  // downside deviation: std using only negative values, squared against 0 (MAR)
  const downsideVariance =
    negatives.reduce((s, v) => s + v ** 2, 0) / negatives.length;
  const downsideSd = Math.sqrt(downsideVariance);
  if (downsideSd === 0) return 9999;
  return (mean / downsideSd) * Math.sqrt(252);
  // suppress unused: downsideMean used only for dev clarity
  void downsideMean;
}

/**
 * Peak-to-trough max drawdown on the equity curve.
 * Drawdown at each point = (runningPeak - equity) / runningPeak * 100.
 * Returns { value: maxDrawdownPct, peakIdx, troughIdx }.
 */
function maxDrawdownPercent(equity: EquityPoint[]): {
  value: number;
  peakIdx: number;
  troughIdx: number;
} {
  if (equity.length === 0) return { value: 0, peakIdx: 0, troughIdx: 0 };
  let peak = equity[0].equity;
  let peakIdx = 0;
  let maxDD = 0;
  let bestPeakIdx = 0;
  let troughIdx = 0;

  for (let i = 1; i < equity.length; i++) {
    const eq = equity[i].equity;
    if (eq > peak) {
      peak = eq;
      peakIdx = i;
    }
    // Only compute drawdown when peak > 0 to avoid division by zero
    if (peak !== 0) {
      const dd = ((peak - eq) / Math.abs(peak)) * 100;
      if (dd > maxDD) {
        maxDD = dd;
        bestPeakIdx = peakIdx;
        troughIdx = i;
      }
    }
  }
  return { value: maxDD, peakIdx: bestPeakIdx, troughIdx };
}

/** Build a drawdown series: array of { date, drawdownPct } for the curve chart. */
function buildDrawdownSeries(
  equity: EquityPoint[],
): Array<{ date: string; drawdownPct: number }> {
  if (equity.length === 0) return [];
  let peak = equity[0].equity;
  return equity.map((pt) => {
    if (pt.equity > peak) peak = pt.equity;
    const dd = peak !== 0 ? ((peak - pt.equity) / Math.abs(peak)) * 100 : 0;
    return { date: pt.date, drawdownPct: parseFloat(dd.toFixed(2)) };
  });
}

// ================================================
// SKELETON
// ================================================

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`animate-pulse bg-[#0E0E0E] rounded-[12px] border border-white/[0.05] ${className}`}
  />
);

// ================================================
// EMPTY STATE INNER
// ================================================

const EmptyState: React.FC<{ message?: string }> = ({
  message = 'Run a backtest to see data here.',
}) => (
  <div className="flex items-center justify-center h-32 text-white/30 text-[12px]">
    {message}
  </div>
);

// ================================================
// SECTION 3 — DRAWDOWN CURVE PANEL
// ================================================

const DrawdownCurvePanel: React.FC<{
  equity: EquityPoint[];
}> = ({ equity }) => {
  const series = useMemo(() => buildDrawdownSeries(equity), [equity]);
  const { value: maxDD, peakIdx, troughIdx } = useMemo(
    () => maxDrawdownPercent(equity),
    [equity],
  );

  const peakDate = equity[peakIdx]?.date ?? '—';
  const troughDate = equity[troughIdx]?.date ?? '—';

  return (
    <div className={JOURNAL_PANEL}>
      <h2 className="text-[14px] font-semibold text-white mb-1">
        Drawdown Curve
      </h2>
      <p className="text-[10px] text-white/40 mb-3">
        {equity.length > 0
          ? `Peak ${peakDate} → Trough ${troughDate} (−${maxDD.toFixed(2)}%)`
          : 'No equity data yet'}
      </p>

      {equity.length === 0 ? (
        <EmptyState message="Run a backtest to see your drawdown profile." />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E36363" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#E36363" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fill: '#666', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#666', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `-${v.toFixed(0)}%`}
              domain={[0, 'auto']}
              reversed
            />
            <Tooltip
              contentStyle={{
                background: '#111',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                fontSize: 11,
              }}
              labelStyle={{ color: '#F4F4F4' }}
              formatter={(v: number) => [`-${v.toFixed(2)}%`, 'Drawdown']}
            />
            <Area
              type="monotone"
              dataKey="drawdownPct"
              stroke="#E36363"
              strokeWidth={2}
              fill="url(#ddFill)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

// ================================================
// SECTION 4 — MONTHLY RETURNS HEATMAP
// ================================================

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MonthlyReturnsPanel: React.FC<{ trades: BacktestTrade[] }> = ({
  trades,
}) => {
  // Build (year, month) → { pnl, count } map
  const heatmap = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number }>();
    for (const t of trades) {
      // Use exitTime if available, else entryTime (both are unix seconds)
      const ts = (t.exitTime ?? t.entryTime) * 1000;
      const d = dayjs(ts);
      const key = `${d.year()}-${d.month()}`; // month 0-indexed
      const prev = map.get(key) ?? { pnl: 0, count: 0 };
      map.set(key, { pnl: prev.pnl + t.pnl, count: prev.count + 1 });
    }
    return map;
  }, [trades]);

  const years = useMemo(() => {
    const ys = new Set<number>();
    for (const k of heatmap.keys()) ys.add(parseInt(k.split('-')[0], 10));
    return Array.from(ys).sort((a, b) => b - a); // newest first
  }, [heatmap]);

  const cellColor = (pnl: number | undefined): string => {
    if (pnl === undefined) return 'transparent';
    if (pnl > 0) return 'rgba(74,210,149,0.18)';
    if (pnl < 0) return 'rgba(227,99,99,0.18)';
    return 'rgba(255,255,255,0.04)';
  };

  const cellTextColor = (pnl: number | undefined): string => {
    if (pnl === undefined) return '#333';
    if (pnl > 0) return '#4AD295';
    if (pnl < 0) return '#E36363';
    return '#666';
  };

  const fmt = (pnl: number): string =>
    pnl >= 0 ? `+$${Math.round(pnl)}` : `-$${Math.abs(Math.round(pnl))}`;

  return (
    <div className={JOURNAL_PANEL}>
      <h2 className="text-[14px] font-semibold text-white mb-3">
        Monthly Returns
      </h2>

      {trades.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr>
                <th className="text-white/40 font-medium text-left pb-2 pr-2 w-12">
                  Year
                </th>
                {MONTHS.map((m) => (
                  <th
                    key={m}
                    className="text-white/40 font-medium pb-2 px-1 text-center min-w-[52px]"
                  >
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {years.map((yr) => (
                <tr key={yr}>
                  <td className="text-white/50 font-medium py-1 pr-2">
                    {yr}
                  </td>
                  {Array.from({ length: 12 }, (_, monthIdx) => {
                    const entry = heatmap.get(`${yr}-${monthIdx}`);
                    return (
                      <td
                        key={monthIdx}
                        className="py-1 px-0.5 text-center rounded"
                        title={entry ? `${entry.count} trade${entry.count !== 1 ? 's' : ''}` : 'No trades'}
                      >
                        <div
                          className="rounded px-1 py-0.5 font-medium"
                          style={{
                            background: cellColor(entry?.pnl),
                            color: cellTextColor(entry?.pnl),
                          }}
                        >
                          {entry ? fmt(entry.pnl) : '—'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ================================================
// SECTION 5 — P&L DISTRIBUTION HISTOGRAM
// ================================================

const PnlDistributionPanel: React.FC<{ trades: BacktestTrade[] }> = ({
  trades,
}) => {
  const bins = useMemo(() => {
    if (trades.length === 0) return [];
    const pnls = trades.map((t) => t.pnl);
    const minPnl = Math.min(...pnls);
    const maxPnl = Math.max(...pnls);
    const BIN_COUNT = 20;
    const range = maxPnl - minPnl;
    if (range === 0) {
      // All trades same PnL — single bin
      return [{ label: `$${Math.round(minPnl)}`, count: trades.length, positive: minPnl >= 0 }];
    }
    const step = range / BIN_COUNT;
    const buckets = Array.from({ length: BIN_COUNT }, (_, i) => {
      const lo = minPnl + i * step;
      const hi = lo + step;
      const count = pnls.filter((p) => p >= lo && (i === BIN_COUNT - 1 ? p <= hi : p < hi)).length;
      return {
        label: `$${Math.round(lo)}–$${Math.round(hi)}`,
        count,
        positive: lo >= 0,
      };
    });
    return buckets;
  }, [trades]);

  return (
    <div className={JOURNAL_PANEL}>
      <h2 className="text-[14px] font-semibold text-white mb-3">
        P&L Distribution
      </h2>
      {trades.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={bins} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: '#666', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              interval={2}
            />
            <YAxis
              tick={{ fill: '#666', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: '#111',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                fontSize: 11,
              }}
              labelStyle={{ color: '#F4F4F4' }}
              formatter={(v: number) => [v, 'Trades']}
            />
            <Bar
              dataKey="count"
              // Each bar's fill determined by the 'positive' property via Cell
              // recharts doesn't support per-bar fill via a single <Bar> without Cell
              // — use a custom cell approach via shape or fill accessor
              fill="#4AD295"
              shape={(props: Record<string, unknown>) => {
                const { x, y, width, height, positive } = props as {
                  x: number; y: number; width: number; height: number;
                  positive: boolean;
                };
                return (
                  <rect
                    x={x} y={y} width={width} height={height}
                    fill={positive ? '#4AD295' : '#E36363'}
                    rx={2}
                    opacity={0.8}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

// ================================================
// SECTION 6 — R-MULTIPLE DISTRIBUTION
// ================================================

const RMultiplePanel: React.FC<{
  trades: BacktestTrade[];
  stats: SessionStats;
}> = ({ trades, stats }) => {
  // If avgLoss is 0 (no losses), the panel is meaningless — skip it entirely.
  if (stats.avgLoss === 0) return null;

  const bins = useMemo(() => {
    if (trades.length === 0 || stats.avgLoss === 0) return [];
    // Label buckets: ≤-3R, -2R, -1R, 0R, 1R, 2R, 3R, 4R, ≥5R
    const buckets: Record<string, number> = {
      '≤-3R': 0, '-2R': 0, '-1R': 0, '0R': 0,
      '1R': 0, '2R': 0, '3R': 0, '4R': 0, '≥5R': 0,
    };
    for (const t of trades) {
      // R-multiple = trade PnL / avg-loss-amount (positive reference unit)
      const r = t.pnl / stats.avgLoss;
      const rounded = Math.round(r);
      if (rounded <= -3) buckets['≤-3R']++;
      else if (rounded === -2) buckets['-2R']++;
      else if (rounded === -1) buckets['-1R']++;
      else if (rounded === 0) buckets['0R']++;
      else if (rounded === 1) buckets['1R']++;
      else if (rounded === 2) buckets['2R']++;
      else if (rounded === 3) buckets['3R']++;
      else if (rounded === 4) buckets['4R']++;
      else buckets['≥5R']++;
    }
    return Object.entries(buckets).map(([label, count]) => ({
      label,
      count,
      positive: !label.startsWith('-') && !label.startsWith('≤'),
    }));
  }, [trades, stats.avgLoss]);

  return (
    <div className={JOURNAL_PANEL}>
      <h2 className="text-[14px] font-semibold text-white mb-3">
        R-Multiple Distribution
      </h2>
      {trades.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={bins} margin={{ top: 4, right: 8, left: 0, bottom: 8 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: '#666', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: '#666', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: '#111',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                fontSize: 11,
              }}
              labelStyle={{ color: '#F4F4F4' }}
              formatter={(v: number) => [v, 'Trades']}
            />
            <Bar
              dataKey="count"
              fill="#4AD295"
              shape={(props: Record<string, unknown>) => {
                const { x, y, width, height, positive } = props as {
                  x: number; y: number; width: number; height: number;
                  positive: boolean;
                };
                return (
                  <rect
                    x={x} y={y} width={width} height={height}
                    fill={positive ? '#4AD295' : '#E36363'}
                    rx={2} opacity={0.8}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

// ================================================
// SECTION 7 — STREAK HISTOGRAMS (Win + Loss)
// ================================================

type StreakType = 'win' | 'loss';

/** Compute streak length → frequency map from sorted trades. */
function buildStreakHistogram(
  trades: BacktestTrade[],
  type: StreakType,
): Array<{ label: string; count: number }> {
  if (trades.length === 0) return [];

  // Sort by exitTime (then entryTime as fallback)
  const sorted = [...trades].sort(
    (a, b) => (a.exitTime ?? a.entryTime) - (b.exitTime ?? b.entryTime),
  );

  const freq: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5+': 0 };
  let current = 0;

  const isMatch = (t: BacktestTrade) =>
    type === 'win' ? t.outcome === 'WIN' : t.outcome === 'LOSS';

  for (const t of sorted) {
    if (isMatch(t)) {
      current++;
    } else {
      if (current > 0) {
        const key = current >= 5 ? '5+' : String(current);
        freq[key] = (freq[key] ?? 0) + 1;
        current = 0;
      }
    }
  }
  // Flush final streak
  if (current > 0) {
    const key = current >= 5 ? '5+' : String(current);
    freq[key] = (freq[key] ?? 0) + 1;
  }

  return Object.entries(freq).map(([label, count]) => ({ label, count }));
}

const StreakPanel: React.FC<{
  trades: BacktestTrade[];
  type: StreakType;
}> = ({ trades, type }) => {
  const title = type === 'win' ? 'Win Streaks' : 'Loss Streaks';
  const barColor = type === 'win' ? '#4AD295' : '#E36363';
  const bins = useMemo(() => buildStreakHistogram(trades, type), [trades, type]);

  return (
    <div className={JOURNAL_PANEL}>
      <h2 className="text-[14px] font-semibold text-white mb-3">{title}</h2>
      {trades.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={bins} margin={{ top: 4, right: 8, left: 0, bottom: 8 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: '#666', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: '#666', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: '#111',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                fontSize: 11,
              }}
              labelStyle={{ color: '#F4F4F4' }}
              formatter={(v: number) => [v, 'Occurrences']}
            />
            <Bar dataKey="count" fill={barColor} radius={[2, 2, 0, 0]} opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

// ================================================
// MAIN PAGE — BacktestAnalytics
// ================================================

const BacktestAnalyticsInner: React.FC = () => {
  const { data, isLoading } = useBacktestStats();

  // ── Derived values ──────────────────────────────────────────────────────────
  const trades = data?.trades ?? [];
  const equitySeries = data?.equitySeries ?? [];
  const stats = data?.stats;
  const sessionCount = data?.sessionCount ?? 0;

  const returns = useMemo(() => dailyReturns(equitySeries), [equitySeries]);
  const sharpe = useMemo(() => sharpeRatio(returns), [returns]);
  const sortino = useMemo(() => sortinoRatio(returns), [returns]);
  const { value: maxDD } = useMemo(
    () => maxDrawdownPercent(equitySeries),
    [equitySeries],
  );
  const recoveryFactor = useMemo(() => {
    if (!stats || maxDD === 0) return 0;
    // netPnl / absolute maxDrawdown (maxDD is already a % — convert to $)
    // We don't have starting capital here; use abs(netPnl) ratio heuristic:
    // recoveryFactor = netPnl / (maxDD% / 100 * |grossLoss|) — or simply
    // netPnl / grossLoss * profitFactor for a clean ratio.
    // Spec: netPnl / maxDrawdown_abs — approximate maxDD_abs as a fraction of
    // running equity range (grossLoss is a solid proxy for capital at risk).
    if (stats.grossLoss === 0) return 0;
    const approxMaxDDabs = (maxDD / 100) * stats.grossLoss;
    return approxMaxDDabs > 0 ? stats.netPnl / approxMaxDDabs : 0;
  }, [stats, maxDD]);

  const rMultipleAvg = useMemo(() => {
    if (!stats || stats.avgLoss === 0) return null;
    // avg R = avgWin / avgLoss (avgLoss stored as positive in SessionStats)
    return stats.avgWin / stats.avgLoss;
  }, [stats]);

  // ── Loading state ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070808] text-white">
        <div className="mx-auto max-w-[1360px] space-y-4 px-1 py-3 sm:px-3 lg:px-1">
          {/* Header skeleton */}
          <Skeleton className="h-12 w-64" />
          {/* KPI row skeleton */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          {/* Chart skeletons */}
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#070808] text-white">
      <div className="mx-auto max-w-[1360px] space-y-4 px-1 py-3 sm:px-3 lg:px-1">

        {/* ── Section 1: Page Header ────────────────────────────────────────── */}
        <div className="pt-0.5">
          <h1 className="text-[17px] font-semibold leading-tight tracking-normal text-white">
            Performance Analytics
          </h1>
          <p className="mt-2 text-[11px] text-white/60">
            {trades.length} trades across {sessionCount} session{sessionCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* ── Section 2: KPI Strip ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <JournalKpiCard
            label="Sharpe Ratio"
            value={sharpe.toFixed(2)}
            accent="gold"
            icon={Activity}
            tooltip="Annualised Sharpe Ratio (RFR=0%). Mean daily return ÷ std of daily returns × √252. Higher is better."
          />
          <JournalKpiCard
            label="Sortino Ratio"
            value={sortino >= 9999 ? '∞' : sortino.toFixed(2)}
            accent="gold"
            icon={TrendingDown}
            tooltip="Annualised Sortino Ratio. Like Sharpe but penalises only downside volatility. ∞ means no losing days."
          />
          <JournalKpiCard
            label="Max Drawdown"
            value={`${maxDD.toFixed(2)}%`}
            accent="red"
            icon={TrendingDown}
            tooltip="Largest peak-to-trough decline in cumulative equity as a percentage of peak equity."
            valueColor={maxDD > 0 ? '#E36363' : '#F4F4F4'}
          />
          <JournalKpiCard
            label="Recovery Factor"
            value={recoveryFactor.toFixed(2)}
            accent="gold"
            icon={Repeat2}
            tooltip="Net P&L ÷ Max Drawdown (absolute). Shows how much profit was made relative to the worst drawdown."
          />
          <JournalKpiCard
            label="R-Multiple Avg"
            value={rMultipleAvg !== null ? rMultipleAvg.toFixed(2) : '—'}
            accent="gold"
            icon={Target}
            hint={rMultipleAvg !== null ? `avgWin / avgLoss` : 'No losses yet'}
            tooltip="Average R-Multiple: average win ÷ average loss (absolute). A value >1 means you win more than you risk."
          />
        </div>

        {/* ── Section 3: Drawdown Curve ─────────────────────────────────────── */}
        <DrawdownCurvePanel equity={equitySeries} />

        {/* ── Section 4: Monthly Returns Heatmap ───────────────────────────── */}
        <MonthlyReturnsPanel trades={trades} />

        {/* ── Section 5: P&L Distribution ──────────────────────────────────── */}
        <PnlDistributionPanel trades={trades} />

        {/* ── Section 6: R-Multiple Distribution (hidden when no losses) ───── */}
        {stats && <RMultiplePanel trades={trades} stats={stats} />}

        {/* ── Section 7: Streak Histograms ─────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <StreakPanel trades={trades} type="win" />
          <StreakPanel trades={trades} type="loss" />
        </div>

      </div>
    </div>
  );
};

// ================================================
// DEFAULT EXPORT — wrapped in ErrorBoundary
// ================================================

export const BacktestAnalytics: React.FC = () => (
  <ErrorBoundary boundary="backtest-analytics">
    <BacktestAnalyticsInner />
  </ErrorBoundary>
);

export default BacktestAnalytics;
