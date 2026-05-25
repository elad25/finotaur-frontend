import { useMemo, useState } from 'react';
import { Card } from '@/components/ds/Card';
import { PerformancePoint, TimeRange } from '../hooks/usePortfolioMockData';
import { calculatePortfolioMetrics, fmtPercent, fmtNumber } from '@/lib/portfolio/metrics';
import { cn } from '@/lib/utils';

interface Props {
  series: PerformancePoint[];
  range?: TimeRange;
  onRangeChange?: (r: TimeRange) => void;
}

const RANGES: TimeRange[] = ['1M', '3M', '6M', 'YTD', '1Y', 'ALL'];

type Mode = 'dollar' | 'percent';

const CHART_WIDTH = 760;
const CHART_HEIGHT = 286;
const PADDING = { top: 14, right: 16, bottom: 28, left: 58 };

export function PerformanceChart({ series, range, onRangeChange }: Props) {
  const [mode, setMode] = useState<Mode>('dollar');
  const metrics = useMemo(() => calculatePortfolioMetrics(series), [series]);
  const returnLabel = range === '1Y' || range === 'ALL' || !range
    ? `RETURN (${range ?? '1Y'})`
    : `RETURN (${range})`;

  // X-axis date labels — derived from the actual series, so the user can see the time-range changed
  // even when the value line itself is flat (cash-only or static-balance accounts).
  const xAxisLabels = useMemo(() => {
    if (series.length < 2) return [];
    const ratios = [0, 0.25, 0.5, 0.75, 1];
    const totalDays = (new Date(series[series.length - 1].date).getTime() - new Date(series[0].date).getTime()) / 86_400_000;
    // Short ranges → "MMM DD" ; long ranges → "MMM YYYY"
    const fmt: Intl.DateTimeFormatOptions = totalDays > 180
      ? { month: 'short', year: 'numeric' }
      : { month: 'short', day: 'numeric' };
    return ratios.map((r) => {
      const idx = Math.min(series.length - 1, Math.max(0, Math.round(r * (series.length - 1))));
      const point = series[idx];
      return { ratio: r, label: new Date(point.date).toLocaleDateString('en-US', fmt) };
    });
  }, [series]);

  const rangeSummary = useMemo(() => {
    if (series.length < 2) return null;
    const first = new Date(series[0].date);
    const last = new Date(series[series.length - 1].date);
    const days = Math.round((last.getTime() - first.getTime()) / 86_400_000);
    return { days, first, last };
  }, [series]);

  const chart = useMemo(() => {
    if (series.length === 0) {
      return { path: '', areaPath: '', ticks: [] as number[], min: 0, max: 0, isFlat: false };
    }

    const start = series[0].value;
    const values = series.map((point) =>
      mode === 'dollar' ? point.value : ((point.value - start) / start) * 100
    );
    let min = Math.min(...values);
    let max = Math.max(...values);
    const isFlat = max - min === 0;

    // Flat line (e.g., cash-only account, no historical movement): synthesize a
    // visible band around the single value so the line renders in the middle of
    // the chart instead of at the baseline. Band width = ±10% of value (or ±1
    // when value is 0 for percent mode).
    if (isFlat) {
      const v = max;
      const halfBand = mode === 'percent' ? 1 : Math.max(Math.abs(v) * 0.1, 0.5);
      min = v - halfBand;
      max = v + halfBand;
    }

    const valueRange = max - min || 1;
    const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const coords = values.map((value, index) => {
      const x = PADDING.left + (index / Math.max(values.length - 1, 1)) * innerWidth;
      const y = PADDING.top + (1 - (value - min) / valueRange) * innerHeight;
      return [x, y] as const;
    });

    const path = coords.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    const first = coords[0];
    const last = coords[coords.length - 1];
    const baseline = CHART_HEIGHT - PADDING.bottom;
    const areaPath = `${path} L${last[0].toFixed(1)} ${baseline} L${first[0].toFixed(1)} ${baseline} Z`;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => min + valueRange * ratio);

    return { path, areaPath, ticks, min, max, isFlat };
  }, [series, mode]);

  const formatTick = (value: number) => {
    if (mode === 'percent') return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (abs >= 10_000)    return `$${(value / 1_000).toFixed(1)}K`;
    if (abs >= 1_000)     return `$${(value / 1_000).toFixed(2)}K`;
    if (abs >= 1)         return `$${value.toFixed(2)}`;
    if (abs > 0)          return `$${value.toFixed(4)}`;
    return '$0.00';
  };

  const cardShell = 'relative overflow-hidden rounded-[7px] bg-[#070604]/92 border-gold-primary/20 shadow-[0_24px_70px_rgba(0,0,0,0.48)]';

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
              : 'border border-transparent text-ink-tertiary hover:text-gold-primary hover:border-gold-primary/15'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const modeToggle = (
    <div className="flex items-center gap-1 p-1 rounded-[8px] bg-black/35 border border-gold-primary/15">
      <button
        onClick={() => setMode('dollar')}
        className={cn(
          'px-3 py-1 text-xs font-medium rounded-[5px] transition-colors',
          mode === 'dollar' ? 'bg-gold-primary/18 text-gold-primary' : 'text-ink-secondary hover:text-ink-primary'
        )}
      >
        $
      </button>
      <button
        onClick={() => setMode('percent')}
        className={cn(
          'px-3 py-1 text-xs font-medium rounded-[5px] transition-colors',
          mode === 'percent' ? 'bg-gold-primary/18 text-gold-primary' : 'text-ink-secondary hover:text-ink-primary'
        )}
      >
        %
      </button>
    </div>
  );

  // Empty-series guard: show placeholder but keep header + range buttons visible.
  if (series.length === 0) {
    return (
      <Card className={cardShell}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/70 to-transparent" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(244,217,123,0.065),transparent_32%,rgba(201,166,70,0.025))]" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4 gap-4">
            <div>
              <h2 className="text-[13px] font-normal uppercase text-gold-primary">PERFORMANCE</h2>
              {rangeButtons}
            </div>
            {modeToggle}
          </div>
          <div className="flex h-[286px] items-center justify-center text-sm text-ink-tertiary">
            Connect a broker to see your performance chart
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cardShell}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/70 to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(244,217,123,0.065),transparent_32%,rgba(201,166,70,0.025))]" />
      <div className="relative">
        <div className="flex items-start justify-between mb-4 gap-4">
          <div>
            <h2 className="text-[13px] font-normal uppercase text-gold-primary">PERFORMANCE</h2>
            {rangeButtons}
          </div>
          {modeToggle}
        </div>

        <svg className="h-[286px] w-full overflow-visible" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label="Portfolio performance chart">
          <defs>
            <linearGradient id="copilotSvgArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F4D97B" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#C9A646" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="copilotSvgLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#A98220" />
              <stop offset="42%" stopColor="#F4D97B" />
              <stop offset="100%" stopColor="#C9A646" />
            </linearGradient>
          </defs>

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

          {chart.ticks.map((tick, index) => {
            const y = CHART_HEIGHT - PADDING.bottom - (index / Math.max(chart.ticks.length - 1, 1)) * (CHART_HEIGHT - PADDING.top - PADDING.bottom);
            return (
              <text key={tick} x={PADDING.left - 10} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.42)" fontSize="10">
                {formatTick(tick)}
              </text>
            );
          })}

          <path d={chart.areaPath} fill="url(#copilotSvgArea)" />
          <path d={chart.path} fill="none" stroke="url(#copilotSvgLine)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

          {xAxisLabels.map(({ ratio, label }) => {
            const x = PADDING.left + ratio * (CHART_WIDTH - PADDING.left - PADDING.right);
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

        {rangeSummary && (
          <div className="-mt-2 mb-2 flex items-center justify-between px-4 text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            <span>
              {rangeSummary.first.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' → '}
              {rangeSummary.last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span>
              {rangeSummary.days} days
              {chart.isFlat && <span className="ml-2 text-gold-primary/70">· flat (no movement in range)</span>}
            </span>
          </div>
        )}

        <div className="mt-2 grid grid-cols-2 md:grid-cols-6 border-t border-gold-primary/10">
          {([
            [returnLabel, fmtPercent(metrics.returnRange, { signed: true }), 'text-gold-primary'],
            ['ALPHA', fmtPercent(metrics.alpha, { signed: true }), 'text-ink-tertiary'],
            ['SHARPE RATIO', fmtNumber(metrics.sharpe), 'text-white'],
            ['MAX DRAWDOWN', fmtPercent(metrics.maxDrawdown), 'text-num-negative'],
            ['VOLATILITY', fmtPercent(metrics.volatility), 'text-gold-primary'],
            ['WINNING DAYS', fmtPercent(metrics.winningDays), 'text-white'],
          ] as const).map(([label, value, color]) => (
            <div key={label} className="px-3 py-3 border-r border-gold-primary/10 last:border-r-0">
              <p className="text-[9px] uppercase text-ink-tertiary">{label}</p>
              <p className={`mt-2 font-mono text-sm tabular-nums ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
