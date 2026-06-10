// src/pages/app/ai/copilot/components/MarketComparisonChart.tsx
// =====================================================
// PERFORMANCE card — Portfolio vs S&P 500 vs NASDAQ.
// Three normalised %-return lines, styled to match the
// canonical ETF Compare chart (recharts-based, gold palette).
// =====================================================

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card } from '@/components/ds/Card';
import { cn } from '@/lib/utils';
import { useBenchmarkSeries } from '../hooks/useBenchmarkSeries';
import type { PerformancePoint, TimeRange } from '../hooks/usePortfolioData';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  portfolioSeries: PerformancePoint[];
  range: TimeRange;
  onRangeChange?: (r: TimeRange) => void;
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const RANGES: TimeRange[] = ['1M', '3M', '6M', 'YTD', '1Y', 'ALL'];

// Canonical ETF Compare palette: Portfolio = gold primary, benchmarks = secondary series colors.
const COLOURS = {
  portfolio: '#C9A646',
  sp500:     'rgba(255,255,255,0.62)',
  nasdaq:    '#60A5FA',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise an array of numeric values to %-return from the first point. */
function normalise(values: number[]): number[] {
  if (values.length === 0) return [];
  const v0 = values[0];
  return values.map((v) => (v0 > 0 ? parseFloat(((v / v0 - 1) * 100).toFixed(2)) : 0));
}

/** Build a dollar amount string for the return headline. */
function formatDollar(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000)    return `$${(abs / 1_000).toFixed(1)}K`;
  if (abs >= 1_000)     return `$${(abs / 1_000).toFixed(2)}K`;
  if (abs >= 1)         return `$${abs.toFixed(2)}`;
  if (abs > 0)          return `$${abs.toFixed(4)}`;
  return '$0.00';
}

/** Format a date string for axis ticks (short month + 2-digit year). */
function formatAxisDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  } catch {
    return dateStr;
  }
}

/** Format a date string for the tooltip label. */
function formatTooltipDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}

function ComparisonTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[8px] border border-border-ds-subtle bg-surface-1 px-3 py-2 text-[12px] shadow-lg space-y-1">
      <p className="text-ink-tertiary mb-1">{formatTooltipDate(label ?? '')}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span style={{ color: p.color }} className="font-data font-semibold">
            {p.name}
          </span>
          <span
            className={`font-data font-semibold ${
              p.value >= 0 ? 'text-[#4AD295]' : 'text-[#E24B4A]'
            }`}
          >
            {p.value >= 0 ? '+' : ''}
            {p.value.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MarketComparisonChart({
  portfolioSeries,
  range,
  onRangeChange,
  className,
}: Props) {
  const { sp500, nasdaq } = useBenchmarkSeries(range);

  // Normalise each series independently to %-return from first point.
  const normPortfolio = useMemo(
    () => normalise(portfolioSeries.map((p) => p.value)),
    [portfolioSeries],
  );
  const normSp500  = useMemo(() => normalise(sp500.map((p) => p.value)),  [sp500]);
  const normNasdaq = useMemo(() => normalise(nasdaq.map((p) => p.value)), [nasdaq]);

  // Merge series into recharts row-per-date format using portfolio dates as spine.
  const chartData = useMemo(() => {
    if (portfolioSeries.length === 0) return [];
    return portfolioSeries.map((point, i) => ({
      date: point.date,
      Portfolio: normPortfolio[i] ?? null,
      'S&P 500':  normSp500.length > i  ? normSp500[i]  : null,
      NASDAQ:     normNasdaq.length > i ? normNasdaq[i] : null,
    }));
  }, [portfolioSeries, normPortfolio, normSp500, normNasdaq]);

  // Total-return headline for the portfolio.
  const totalReturn = useMemo(() => {
    if (portfolioSeries.length < 2) return null;
    const first = portfolioSeries[0].value;
    const last  = portfolioSeries[portfolioSeries.length - 1].value;
    const changeAbs = last - first;
    const changePct = first > 0 ? (changeAbs / first) * 100 : 0;
    return { changeAbs, changePct };
  }, [portfolioSeries]);

  const cardShell =
    'relative overflow-hidden rounded-[7px] bg-[#070604]/92 border-gold-primary/20 shadow-[0_24px_70px_rgba(0,0,0,0.48)]';

  // ── Range pills ──────────────────────────────────────────────────────────
  const rangePills = (
    <div className="flex items-center gap-2 mt-3">
      <span className="text-[10px] uppercase tracking-[1.5px] text-ink-tertiary mr-1">
        TIME RANGE
      </span>
      <div className="flex rounded-[6px] border border-border-ds-subtle overflow-hidden">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onRangeChange?.(r)}
            className={cn(
              'px-ds-3 py-1 text-xs font-medium transition-colors',
              range === r
                ? 'bg-gold-primary/20 text-gold-bright'
                : 'text-ink-tertiary hover:text-ink-secondary',
            )}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );

  // ── Empty guard ──────────────────────────────────────────────────────────
  if (portfolioSeries.length === 0) {
    return (
      <Card className={cn(cardShell, className)}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/70 to-transparent" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(244,217,123,0.065),transparent_32%,rgba(201,166,70,0.025))]" />
        <div className="relative p-5">
          <h2 className="text-[13px] font-normal uppercase text-gold-primary">PERFORMANCE</h2>
          {rangePills}
          <div className="flex h-[320px] items-center justify-center text-sm text-ink-tertiary">
            Connect a broker to compare performance
          </div>
        </div>
      </Card>
    );
  }

  // ── Full chart ───────────────────────────────────────────────────────────
  const positive      = totalReturn ? totalReturn.changeAbs >= 0 : true;
  const returnColour  = positive ? 'text-gold-primary' : 'text-num-negative';

  return (
    <Card className={cn(cardShell, className)}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/70 to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(244,217,123,0.065),transparent_32%,rgba(201,166,70,0.025))]" />
      <div className="relative p-5">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-[13px] font-normal uppercase text-gold-primary">PERFORMANCE</h2>
          {totalReturn && (
            <p className={cn('mt-1 font-mono text-base tabular-nums', returnColour)}>
              {totalReturn.changeAbs >= 0 ? '+' : '−'}
              {formatDollar(Math.abs(totalReturn.changeAbs))}
              {' '}
              <span className="text-sm">
                ({totalReturn.changePct >= 0 ? '+' : ''}
                {totalReturn.changePct.toFixed(2)}%)
              </span>
            </p>
          )}
          {rangePills}
        </div>

        {/* Recharts line chart — same config as ETF Compare */}
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDate}
                tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={60}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
                width={56}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
              <Tooltip content={<ComparisonTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}
              />
              <Line
                type="monotone"
                dataKey="Portfolio"
                stroke={COLOURS.portfolio}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
              {normSp500.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="S&P 500"
                  stroke={COLOURS.sp500}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              )}
              {normNasdaq.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="NASDAQ"
                  stroke={COLOURS.nasdaq}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
