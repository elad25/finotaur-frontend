// src/pages/app/ai/copilot/components/MarketComparisonChart.tsx
// =====================================================
// PERFORMANCE card — Portfolio vs S&P 500 vs NASDAQ.
// Three normalised %-return polylines on a shared SVG canvas.
// Mirrors the card-shell styling of PerformanceChart.tsx.
// =====================================================

import { useMemo } from 'react';
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

const CHART_WIDTH  = 760;
const CHART_HEIGHT = 240;
const PADDING = { top: 12, right: 16, bottom: 28, left: 52 };

// Line colours — gold-variant palette, no green/blue (ADL-020).
const COLOURS = {
  portfolio: '#F4D97B',
  sp500:     'rgba(255,255,255,0.62)',
  nasdaq:    '#9B7D22',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise an array of numeric values to %-return from the first point. */
function normalise(values: number[]): number[] {
  if (values.length === 0) return [];
  const v0 = values[0];
  return values.map((v) => (v0 > 0 ? (v / v0 - 1) * 100 : 0));
}

/** Build a compact dollar string without a sign. */
function formatDollar(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000)    return `$${(abs / 1_000).toFixed(1)}K`;
  if (abs >= 1_000)     return `$${(abs / 1_000).toFixed(2)}K`;
  if (abs >= 1)         return `$${abs.toFixed(2)}`;
  if (abs > 0)          return `$${abs.toFixed(4)}`;
  return '$0.00';
}

/** Convert a normalised series to SVG polyline points across the inner width. */
function toPolyPoints(
  series: number[],
  yMin: number,
  yMax: number,
): string {
  if (series.length === 0) return '';
  const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const yRange = yMax - yMin || 1;

  return series
    .map((v, i) => {
      const x = PADDING.left + (i / Math.max(series.length - 1, 1)) * innerW;
      const y = PADDING.top + (1 - (v - yMin) / yRange) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MarketComparisonChart({
  portfolioSeries,
  range,
  onRangeChange,
  className,
}: Props) {
  const { sp500, nasdaq } = useBenchmarkSeries(range);

  // Normalise each series independently.
  const normPortfolio = useMemo(
    () => normalise(portfolioSeries.map((p) => p.value)),
    [portfolioSeries],
  );
  const normSp500  = useMemo(() => normalise(sp500.map((p) => p.value)),  [sp500]);
  const normNasdaq = useMemo(() => normalise(nasdaq.map((p) => p.value)), [nasdaq]);

  // Compute a shared y-domain from ALL three series.
  const { yMin, yMax } = useMemo(() => {
    const all = [...normPortfolio, ...normSp500, ...normNasdaq];
    if (all.length === 0) return { yMin: -5, yMax: 5 };
    const min = Math.min(...all);
    const max = Math.max(...all);
    const pad = Math.max((max - min) * 0.08, 0.5);
    return { yMin: min - pad, yMax: max + pad };
  }, [normPortfolio, normSp500, normNasdaq]);

  // Total-return headline from portfolio series first→last.
  const totalReturn = useMemo(() => {
    if (portfolioSeries.length < 2) return null;
    const first = portfolioSeries[0].value;
    const last  = portfolioSeries[portfolioSeries.length - 1].value;
    const changeAbs = last - first;
    const changePct = first > 0 ? (changeAbs / first) * 100 : 0;
    return { changeAbs, changePct };
  }, [portfolioSeries]);

  // X-axis date labels (5 ticks).
  const xAxisLabels = useMemo(() => {
    if (portfolioSeries.length < 2) return [];
    const ratios = [0, 0.25, 0.5, 0.75, 1];
    const totalDays =
      (new Date(portfolioSeries[portfolioSeries.length - 1].date).getTime() -
        new Date(portfolioSeries[0].date).getTime()) /
      86_400_000;
    const fmt: Intl.DateTimeFormatOptions =
      totalDays > 180
        ? { month: 'short', year: 'numeric' }
        : { month: 'short', day: 'numeric' };
    return ratios.map((r) => {
      const idx = Math.min(
        portfolioSeries.length - 1,
        Math.max(0, Math.round(r * (portfolioSeries.length - 1))),
      );
      return {
        ratio: r,
        label: new Date(portfolioSeries[idx].date).toLocaleDateString('en-US', fmt),
      };
    });
  }, [portfolioSeries]);

  // Range summary (date span).
  const rangeSummary = useMemo(() => {
    if (portfolioSeries.length < 2) return null;
    const first = new Date(portfolioSeries[0].date);
    const last  = new Date(portfolioSeries[portfolioSeries.length - 1].date);
    return { first, last };
  }, [portfolioSeries]);

  // Y-axis ticks (5).
  const yTicks = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((r) => yMin + r * (yMax - yMin));
  }, [yMin, yMax]);

  const cardShell =
    'relative overflow-hidden rounded-[7px] bg-[#070604]/92 border-gold-primary/20 shadow-[0_24px_70px_rgba(0,0,0,0.48)]';

  const rangeButtons = (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase text-ink-tertiary">
      <span className="mr-2">TIME RANGE</span>
      {RANGES.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => onRangeChange?.(label)}
          className={cn(
            'rounded-[4px] px-2 py-1 transition-colors',
            range === label
              ? 'border border-gold-primary/28 bg-gold-primary/10 text-gold-primary'
              : 'border border-transparent text-ink-tertiary hover:text-gold-primary hover:border-gold-primary/15',
          )}
        >
          {label}
        </button>
      ))}
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
          {rangeButtons}
          <div className="flex h-[240px] items-center justify-center text-sm text-ink-tertiary">
            Connect a broker to compare performance
          </div>
        </div>
      </Card>
    );
  }

  // ── Full chart ───────────────────────────────────────────────────────────
  const positive = totalReturn ? totalReturn.changeAbs >= 0 : true;
  const returnColour = positive ? 'text-gold-primary' : 'text-num-negative';

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
          {rangeButtons}
        </div>

        {/* SVG Chart */}
        <svg
          className="h-[240px] w-full overflow-visible"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label="Portfolio vs benchmark performance chart"
        >
          <defs>
            <linearGradient id="mcLineGold" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#B8911F" />
              <stop offset="42%"  stopColor="#F4D97B" />
              <stop offset="100%" stopColor="#D4B04E" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = PADDING.top + ratio * (CHART_HEIGHT - PADDING.top - PADDING.bottom);
            return (
              <line
                key={`h-${ratio}`}
                x1={PADDING.left}
                x2={CHART_WIDTH - PADDING.right}
                y1={y}
                y2={y}
                stroke="rgba(201,166,70,0.08)"
                strokeDasharray="4 6"
              />
            );
          })}

          {/* Vertical gridlines */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => {
            const x = PADDING.left + ratio * (CHART_WIDTH - PADDING.left - PADDING.right);
            return (
              <line
                key={`v-${ratio}`}
                y1={PADDING.top}
                y2={CHART_HEIGHT - PADDING.bottom}
                x1={x}
                x2={x}
                stroke="rgba(201,166,70,0.055)"
                strokeDasharray="4 6"
              />
            );
          })}

          {/* Y-axis % ticks */}
          {yTicks.map((tick, index) => {
            const y =
              CHART_HEIGHT -
              PADDING.bottom -
              (index / Math.max(yTicks.length - 1, 1)) *
                (CHART_HEIGHT - PADDING.top - PADDING.bottom);
            const label = `${tick >= 0 ? '+' : ''}${tick.toFixed(1)}%`;
            return (
              <text
                key={`ytick-${index}`}
                x={PADDING.left - 6}
                y={y + 4}
                textAnchor="end"
                fill="rgba(255,255,255,0.42)"
                fontSize="10"
              >
                {label}
              </text>
            );
          })}

          {/* Zero baseline */}
          {(() => {
            const yRange = yMax - yMin || 1;
            const zeroY = PADDING.top + (1 - (0 - yMin) / yRange) * (CHART_HEIGHT - PADDING.top - PADDING.bottom);
            if (zeroY < PADDING.top || zeroY > CHART_HEIGHT - PADDING.bottom) return null;
            return (
              <line
                x1={PADDING.left}
                x2={CHART_WIDTH - PADDING.right}
                y1={zeroY}
                y2={zeroY}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="0.75"
              />
            );
          })()}

          {/* S&P 500 line */}
          {normSp500.length > 0 && (
            <polyline
              points={toPolyPoints(normSp500, yMin, yMax)}
              fill="none"
              stroke={COLOURS.sp500}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* NASDAQ line */}
          {normNasdaq.length > 0 && (
            <polyline
              points={toPolyPoints(normNasdaq, yMin, yMax)}
              fill="none"
              stroke={COLOURS.nasdaq}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Portfolio line — rendered last so it sits on top */}
          {normPortfolio.length > 0 && (
            <polyline
              points={toPolyPoints(normPortfolio, yMin, yMax)}
              fill="none"
              stroke="url(#mcLineGold)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* X-axis date labels */}
          {xAxisLabels.map(({ ratio, label }) => {
            const x =
              PADDING.left +
              ratio * (CHART_WIDTH - PADDING.left - PADDING.right);
            const anchor = ratio === 0 ? 'start' : ratio === 1 ? 'end' : 'middle';
            return (
              <text
                key={`xl-${ratio}`}
                x={x}
                y={CHART_HEIGHT - PADDING.bottom + 16}
                textAnchor={anchor}
                fill="rgba(255,255,255,0.42)"
                fontSize="10"
              >
                {label}
              </text>
            );
          })}
        </svg>

        {/* Range summary */}
        {rangeSummary && (
          <div className="-mt-1 mb-3 flex items-center justify-between px-0 text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            <span>
              {rangeSummary.first.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              {' → '}
              {rangeSummary.last.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-5 pt-2 border-t border-gold-primary/10">
          <LegendItem colour={COLOURS.portfolio} label="Portfolio" />
          <LegendItem colour={COLOURS.sp500}     label="S&P 500" />
          <LegendItem colour={COLOURS.nasdaq}    label="NASDAQ" />
        </div>
      </div>
    </Card>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function LegendItem({ colour, label }: { colour: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-2.5 w-5 rounded-sm flex-none"
        style={{ background: colour }}
      />
      <span className="text-[10px] uppercase text-ink-secondary">{label}</span>
    </div>
  );
}
