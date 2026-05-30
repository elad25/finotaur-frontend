/**
 * JournalReportsPerformance — Tradezella-parity configurable charts tab.
 *
 * Layout:
 *  1. Two configurable chart panels (metric-picker + optional 2nd series + granularity toggle)
 *  2. Sub-tabs: Summary | Days | Trades
 *
 * NOTE: <ReportsTabsNav> is mounted ABOVE this component by the route parent (ReportsLayout).
 */

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Activity, X as XIcon, Plus } from 'lucide-react';
import { useTrades } from '@/hooks/useTradesData';
import type { Trade } from '@/hooks/useTradesData';
import { Card } from '@/components/ds/Card';
import { Change } from '@/components/ds/NumberDisplay';
import { computeReportMetrics } from '@/lib/journal/reportMetrics';
import type { DailyBucket } from '@/lib/journal/reportMetrics';

// ---------------------------------------------------------------------------
// Chart style constants — identical to Overview.tsx
// ---------------------------------------------------------------------------

const CHART_STYLE = {
  tooltip: {
    contentStyle: {
      backgroundColor: 'hsl(var(--surface-1, 220 14% 8%))',
      border: '0.5px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      fontSize: '12px',
      color: '#fff',
    },
  },
  grid: { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.06)' },
  axis: { stroke: 'rgba(255,255,255,0.25)', fontSize: 11 },
};

// ---------------------------------------------------------------------------
// Granularity
// ---------------------------------------------------------------------------

type Granularity = 'day' | 'week' | 'month';

/** ISO week number (Mon-start) for a YYYY-MM-DD string, returns the Monday date as 'YYYY-MM-DD'. */
function toWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  const offset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + offset);
  return monday.toISOString().slice(0, 10);
}

function toMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // 'YYYY-MM'
}

/**
 * Aggregate daily buckets into week or month buckets.
 * Returns a new array of DailyBucket with period-start as the `date`.
 * Day granularity returns the original buckets unchanged.
 */
function aggregateBuckets(buckets: DailyBucket[], granularity: Granularity): DailyBucket[] {
  if (granularity === 'day') return buckets;

  const periodMap = new Map<string, DailyBucket>();
  const keyFn = granularity === 'week' ? toWeekKey : toMonthKey;

  for (const b of buckets) {
    const key = keyFn(b.date);
    const existing = periodMap.get(key);
    if (existing) {
      existing.netPnl += b.netPnl;
      existing.trades += b.trades;
      existing.wins += b.wins;
      existing.losses += b.losses;
      existing.volume += b.volume;
    } else {
      periodMap.set(key, { date: key, netPnl: b.netPnl, trades: b.trades, wins: b.wins, losses: b.losses, volume: b.volume });
    }
  }

  // Sort ascending by period key
  return Array.from(periodMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Metric registry
// ---------------------------------------------------------------------------

type SeriesPoint = { date: string; value: number };

interface MetricDef {
  key: string;
  label: string;
  kind: 'cumulative' | 'period';
  /** Formatter for tooltip + Y-axis */
  format: 'currency' | 'percent' | 'number' | 'ratio';
  compute: (buckets: DailyBucket[]) => SeriesPoint[];
}

/** Format a value for tooltip display given a MetricDef format. */
function fmtMetricValue(value: number, format: MetricDef['format']): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'ratio':
      if (value >= 9000) return '∞';
      return value.toFixed(2);
    case 'number':
    default:
      return String(Math.round(value));
  }
}

function fmtAxisValue(value: number, format: MetricDef['format']): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(value);
    case 'percent':
      return `${value.toFixed(0)}%`;
    case 'ratio':
      if (value >= 9000) return '∞';
      return value.toFixed(1);
    case 'number':
    default:
      return String(Math.round(value));
  }
}

const METRIC_REGISTRY: MetricDef[] = [
  {
    key: 'cumulative-pnl',
    label: 'Cumulative Net P&L',
    kind: 'cumulative',
    format: 'currency',
    compute: (buckets) => {
      let running = 0;
      return buckets.map(b => { running += b.netPnl; return { date: b.date, value: running }; });
    },
  },
  {
    key: 'net-pnl',
    label: 'Net P&L',
    kind: 'period',
    format: 'currency',
    compute: (buckets) => buckets.map(b => ({ date: b.date, value: b.netPnl })),
  },
  {
    key: 'trade-count',
    label: 'Trade Count',
    kind: 'period',
    format: 'number',
    compute: (buckets) => buckets.map(b => ({ date: b.date, value: b.trades })),
  },
  {
    key: 'win-rate',
    label: 'Win Rate %',
    kind: 'period',
    format: 'percent',
    compute: (buckets) =>
      buckets.map(b => {
        const decided = b.wins + b.losses;
        return { date: b.date, value: decided > 0 ? (b.wins / decided) * 100 : 0 };
      }),
  },
  {
    key: 'volume',
    label: 'Volume',
    kind: 'period',
    format: 'number',
    compute: (buckets) => buckets.map(b => ({ date: b.date, value: b.volume })),
  },
  {
    key: 'winning-days',
    label: 'Winning Periods',
    kind: 'period',
    format: 'number',
    compute: (buckets) => buckets.map(b => ({ date: b.date, value: b.netPnl > 0 ? 1 : 0 })),
  },
  {
    key: 'losing-days',
    label: 'Losing Periods',
    kind: 'period',
    format: 'number',
    compute: (buckets) => buckets.map(b => ({ date: b.date, value: b.netPnl < 0 ? 1 : 0 })),
  },
  {
    key: 'cumulative-wl-ratio',
    label: 'Cumulative Win/Loss Ratio',
    kind: 'cumulative',
    format: 'ratio',
    compute: (buckets) => {
      let totalWin = 0;
      let winCount = 0;
      let totalLoss = 0;
      let lossCount = 0;
      return buckets.map(b => {
        if (b.netPnl > 0) { totalWin += b.netPnl; winCount++; }
        else if (b.netPnl < 0) { totalLoss += Math.abs(b.netPnl); lossCount++; }
        const avgWin = winCount > 0 ? totalWin / winCount : 0;
        const avgLoss = lossCount > 0 ? totalLoss / lossCount : 0;
        let ratio: number;
        if (avgLoss === 0) ratio = avgWin > 0 ? 9999 : 0; // 9999 sentinel for ∞
        else ratio = avgWin / avgLoss;
        return { date: b.date, value: ratio };
      });
    },
  },
];

function findMetric(key: string): MetricDef {
  return METRIC_REGISTRY.find(m => m.key === key) ?? METRIC_REGISTRY[0];
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonBlock({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={`rounded-[12px] bg-surface-1 border-[0.5px] border-border-ds-subtle ${height} animate-pulse`} />
  );
}

// ---------------------------------------------------------------------------
// Granularity toggle — segmented control
// ---------------------------------------------------------------------------

interface GranularityToggleProps {
  value: Granularity;
  onChange: (v: Granularity) => void;
}

function GranularityToggle({ value, onChange }: GranularityToggleProps) {
  const options: { key: Granularity; label: string }[] = [
    { key: 'day', label: 'Day' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
  ];
  return (
    <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5">
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors ${
            value === opt.key
              ? 'bg-gold-primary/20 text-gold-primary border border-gold-primary/40'
              : 'text-ink-secondary hover:text-ink-primary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric picker dropdown
// ---------------------------------------------------------------------------

interface MetricPickerProps {
  value: string;
  onChange: (key: string) => void;
  excludeKey?: string;
  label?: string;
}

function MetricPicker({ value, onChange, excludeKey, label }: MetricPickerProps) {
  const options = METRIC_REGISTRY.filter(m => m.key !== excludeKey);
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-[11px] text-ink-tertiary">{label}</span>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-surface-1 border border-border-ds-subtle rounded-lg px-2 py-1 text-[12px] text-ink-primary focus:outline-none focus:border-gold-primary/60 cursor-pointer"
      >
        {options.map(m => (
          <option key={m.key} value={m.key}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Configurable chart panel
// ---------------------------------------------------------------------------

interface ChartPanelProps {
  buckets: DailyBucket[];
  primaryMetricKey: string;
  onPrimaryChange: (key: string) => void;
  secondaryMetricKey: string | null;
  onSecondaryChange: (key: string | null) => void;
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
}

function ChartPanel({
  buckets,
  primaryMetricKey,
  onPrimaryChange,
  secondaryMetricKey,
  onSecondaryChange,
  granularity,
  onGranularityChange,
}: ChartPanelProps) {
  const primaryDef = findMetric(primaryMetricKey);
  const secondaryDef = secondaryMetricKey ? findMetric(secondaryMetricKey) : null;

  // Aggregate buckets by granularity then compute series
  const aggregated = useMemo(
    () => aggregateBuckets(buckets, granularity),
    [buckets, granularity],
  );

  const primarySeries = useMemo(() => primaryDef.compute(aggregated), [primaryDef, aggregated]);
  const secondarySeries = useMemo(
    () => secondaryDef ? secondaryDef.compute(aggregated) : null,
    [secondaryDef, aggregated],
  );

  // Merge series by date for recharts
  const chartData = useMemo(() => {
    if (!secondarySeries) return primarySeries.map(p => ({ date: p.date, primary: p.value }));
    const secMap = new Map(secondarySeries.map(s => [s.date, s.value]));
    return primarySeries.map(p => ({
      date: p.date,
      primary: p.value,
      secondary: secMap.get(p.date) ?? null,
    }));
  }, [primarySeries, secondarySeries]);

  const hasData = chartData.length >= 2;

  // X tick formatter: Day → MM-DD, Week → MM-DD, Month → MM-YYYY shortened
  const xTickFmt = (v: string): string => {
    if (granularity === 'month') {
      return v.slice(0, 7); // YYYY-MM
    }
    return v.slice(5); // MM-DD
  };

  return (
    <Card padding="default" className="flex flex-col gap-3">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <MetricPicker
            value={primaryMetricKey}
            onChange={onPrimaryChange}
            excludeKey={secondaryMetricKey ?? undefined}
          />
          {secondaryDef ? (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-ink-tertiary">vs</span>
              <MetricPicker
                value={secondaryMetricKey!}
                onChange={key => onSecondaryChange(key)}
                excludeKey={primaryMetricKey}
                label=""
              />
              <button
                onClick={() => onSecondaryChange(null)}
                className="ml-1 p-0.5 rounded hover:bg-white/10 text-ink-tertiary hover:text-ink-primary transition-colors"
                title="Remove second metric"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                // Default secondary = first metric that's not the primary
                const next = METRIC_REGISTRY.find(m => m.key !== primaryMetricKey);
                if (next) onSecondaryChange(next.key);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border-ds-subtle text-[11px] text-ink-tertiary hover:text-ink-primary hover:border-gold-primary/40 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add metric
            </button>
          )}
        </div>
        <GranularityToggle value={granularity} onChange={onGranularityChange} />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-0.5 bg-[#C9A84C] rounded" />
          <span className="text-[11px] text-ink-secondary">{primaryDef.label}</span>
        </div>
        {secondaryDef && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0.5 bg-[#4AD295] rounded" />
            <span className="text-[11px] text-ink-secondary">{secondaryDef.label}</span>
          </div>
        )}
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="h-52 flex items-center justify-center text-ink-tertiary text-sm">
          Not enough data for a chart.
        </div>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%" debounce={100}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid {...CHART_STYLE.grid} />
              <XAxis
                dataKey="date"
                tick={{ ...CHART_STYLE.axis }}
                tickLine={false}
                tickFormatter={xTickFmt}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ ...CHART_STYLE.axis }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => fmtAxisValue(v, primaryDef.format)}
                width={60}
              />
              <Tooltip
                {...CHART_STYLE.tooltip}
                formatter={(value: number, name: string) => {
                  const def = name === 'primary' ? primaryDef : (secondaryDef ?? primaryDef);
                  return [fmtMetricValue(value, def.format), def.label];
                }}
                labelFormatter={(label: string) => `Date: ${label}`}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="primary"
                stroke="#C9A84C"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              {secondaryDef && (
                <Line
                  type="monotone"
                  dataKey="secondary"
                  stroke="#4AD295"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Summary sub-tab — KPI tiles
// ---------------------------------------------------------------------------

interface KpiTileProps {
  label: string;
  children: React.ReactNode;
}

function KpiTile({ label, children }: KpiTileProps) {
  return (
    <Card padding="compact" className="flex flex-col gap-1">
      <span className="text-[11px] font-medium tracking-[0.8px] uppercase text-ink-tertiary">
        {label}
      </span>
      <div className="text-base font-semibold tabular-nums leading-tight">
        {children}
      </div>
    </Card>
  );
}

function fmtPercent(v: number): string {
  return `${v.toFixed(1)}%`;
}

function fmtRatio(v: number | null): string {
  if (v === null) return '—';
  if (!isFinite(v)) return '∞';
  return v.toFixed(2);
}

// ---------------------------------------------------------------------------
// Days sub-tab — daily bucket table
// ---------------------------------------------------------------------------

interface DaysTableProps {
  buckets: DailyBucket[];
}

function DaysTable({ buckets }: DaysTableProps) {
  if (buckets.length === 0) {
    return <p className="text-ink-tertiary text-sm py-8 text-center">No trading days recorded.</p>;
  }
  // Most-recent first
  const rows = [...buckets].reverse();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[500px]">
        <thead>
          <tr className="border-b border-border-ds-subtle">
            {['Date', 'Net P&L', 'Trades', 'Wins', 'Losses', 'Volume'].map(col => (
              <th
                key={col}
                className="py-2 pr-3 text-left text-[11px] font-semibold tracking-[0.8px] uppercase text-gold-primary last:pr-0"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(b => (
            <tr key={b.date} className="border-b border-border-ds-subtle last:border-b-0">
              <td className="py-2 pr-3 text-[12px] text-ink-secondary tabular-nums">{b.date}</td>
              <td className="py-2 pr-3 text-[12px] font-medium tabular-nums">
                <Change value={b.netPnl} format="currency" decimals={2} showSign />
              </td>
              <td className="py-2 pr-3 text-[12px] text-ink-primary tabular-nums">{b.trades}</td>
              <td className="py-2 pr-3 text-[12px] text-[#4AD295] tabular-nums">{b.wins}</td>
              <td className="py-2 pr-3 text-[12px] text-num-negative tabular-nums">{b.losses}</td>
              <td className="py-2 text-[12px] text-ink-secondary tabular-nums">{b.volume}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trades sub-tab — per-trade table
// ---------------------------------------------------------------------------

const MAX_TRADES = 200;

interface TradesTableProps {
  trades: Trade[];
}

function fmtDate(isoString: string): string {
  return isoString.slice(0, 10);
}

function fmtPnl(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2);
}

function TradesTable({ trades }: TradesTableProps) {
  if (trades.length === 0) {
    return <p className="text-ink-tertiary text-sm py-8 text-center">No trades recorded.</p>;
  }
  // Most-recent first
  const sorted = [...trades].sort(
    (a, b) => new Date(b.open_at).getTime() - new Date(a.open_at).getTime(),
  );
  const truncated = sorted.length > MAX_TRADES;
  const rows = truncated ? sorted.slice(0, MAX_TRADES) : sorted;

  return (
    <div className="overflow-x-auto">
      {truncated && (
        <p className="text-[11px] text-ink-tertiary pb-2">
          Showing {MAX_TRADES} most-recent trades of {sorted.length} total.
        </p>
      )}
      <table className="w-full min-w-[520px]">
        <thead>
          <tr className="border-b border-border-ds-subtle">
            {['Date', 'Symbol', 'Side', 'Net P&L', 'Outcome'].map(col => (
              <th
                key={col}
                className="py-2 pr-3 text-left text-[11px] font-semibold tracking-[0.8px] uppercase text-gold-primary last:pr-0"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(t => {
            const pnl = t.pnl ?? 0;
            return (
              <tr key={t.id} className="border-b border-border-ds-subtle last:border-b-0">
                <td className="py-2 pr-3 text-[12px] text-ink-secondary tabular-nums">{fmtDate(t.open_at)}</td>
                <td className="py-2 pr-3 text-[12px] font-medium text-ink-primary">{t.symbol}</td>
                <td className="py-2 pr-3 text-[12px]">
                  <span className={t.side === 'LONG' ? 'text-[#4AD295]' : 'text-num-negative'}>
                    {t.side}
                  </span>
                </td>
                <td
                  className={`py-2 pr-3 text-[12px] font-medium tabular-nums ${
                    pnl > 0 ? 'text-[#4AD295]' : pnl < 0 ? 'text-num-negative' : 'text-ink-tertiary'
                  }`}
                >
                  {fmtPnl(pnl)}
                </td>
                <td className="py-2 text-[12px] text-ink-secondary">
                  {t.outcome ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-tab control
// ---------------------------------------------------------------------------

type SubTab = 'summary' | 'days' | 'trades';

interface SubTabBarProps {
  value: SubTab;
  onChange: (v: SubTab) => void;
}

function SubTabBar({ value, onChange }: SubTabBarProps) {
  const options: { key: SubTab; label: string }[] = [
    { key: 'summary', label: 'Summary' },
    { key: 'days', label: 'Days' },
    { key: 'trades', label: 'Trades' },
  ];
  return (
    <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5 self-start">
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            value === opt.key
              ? 'bg-yellow-600/25 text-yellow-100 border border-yellow-500/40'
              : 'text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function JournalReportsPerformance() {
  const { data: trades = [], isLoading } = useTrades();

  const metrics = useMemo(() => computeReportMetrics(trades), [trades]);

  // Panel 1 state
  const [p1Primary, setP1Primary] = useState<string>('cumulative-pnl');
  const [p1Secondary, setP1Secondary] = useState<string | null>(null);
  const [p1Gran, setP1Gran] = useState<Granularity>('day');

  // Panel 2 state
  const [p2Primary, setP2Primary] = useState<string>('net-pnl');
  const [p2Secondary, setP2Secondary] = useState<string | null>(null);
  const [p2Gran, setP2Gran] = useState<Granularity>('day');

  // Sub-tab state
  const [subTab, setSubTab] = useState<SubTab>('summary');

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div>
          <div className="h-7 w-40 rounded bg-white/10 animate-pulse" />
          <div className="h-4 w-64 rounded bg-white/10 animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
        <SkeletonBlock height="h-48" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (trades.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-yellow-100">Performance</h2>
          <p className="text-sm text-zinc-400 mt-1">Configurable charts for your trading metrics.</p>
        </div>
        <Card className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Activity className="w-10 h-10 text-ink-tertiary" />
          <p className="text-ink-secondary text-sm">No trades yet — import or log your first trade to see charts.</p>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Destructure metrics
  // ---------------------------------------------------------------------------

  const {
    netPnl, winRatePct, profitFactor, tradeExpectancy, tradeCount,
    avgDailyNetPnl, maxDrawdown, loggedDays,
    dailyBuckets,
  } = metrics;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-8">

      {/* Heading */}
      <div>
        <h2 className="text-2xl font-semibold text-yellow-100">Performance</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Configurable charts across {tradeCount} trades in {loggedDays} logged days.
        </p>
      </div>

      {/* ── Chart panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartPanel
          buckets={dailyBuckets}
          primaryMetricKey={p1Primary}
          onPrimaryChange={setP1Primary}
          secondaryMetricKey={p1Secondary}
          onSecondaryChange={setP1Secondary}
          granularity={p1Gran}
          onGranularityChange={setP1Gran}
        />
        <ChartPanel
          buckets={dailyBuckets}
          primaryMetricKey={p2Primary}
          onPrimaryChange={setP2Primary}
          secondaryMetricKey={p2Secondary}
          onSecondaryChange={setP2Secondary}
          granularity={p2Gran}
          onGranularityChange={setP2Gran}
        />
      </div>

      {/* ── Sub-tabs ── */}
      <div className="flex flex-col gap-4">
        <SubTabBar value={subTab} onChange={setSubTab} />

        {subTab === 'summary' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiTile label="Net P&L">
              <Change value={netPnl} format="currency" decimals={2} showSign={false} />
            </KpiTile>
            <KpiTile label="Win Rate">
              <span className={winRatePct >= 50 ? 'text-[#4AD295]' : 'text-num-negative'}>
                {fmtPercent(winRatePct)}
              </span>
            </KpiTile>
            <KpiTile label="Profit Factor">
              <span className={profitFactor >= 1 ? 'text-[#4AD295]' : 'text-num-negative'}>
                {fmtRatio(profitFactor === Infinity ? null : profitFactor)}
                {profitFactor === Infinity ? '∞' : ''}
              </span>
            </KpiTile>
            <KpiTile label="Expectancy">
              <Change value={tradeExpectancy} format="currency" decimals={2} showSign />
            </KpiTile>
            <KpiTile label="Total Trades">
              <span className="text-ink-primary">{tradeCount}</span>
            </KpiTile>
            <KpiTile label="Avg Daily P&L">
              <Change value={avgDailyNetPnl} format="currency" decimals={2} showSign />
            </KpiTile>
            <KpiTile label="Max Drawdown">
              <Change value={maxDrawdown} format="currency" decimals={2} showSign />
            </KpiTile>
            <KpiTile label="Logged Days">
              <span className="text-ink-primary">{loggedDays}</span>
            </KpiTile>
          </div>
        )}

        {subTab === 'days' && (
          <Card padding="default">
            <DaysTable buckets={dailyBuckets} />
          </Card>
        )}

        {subTab === 'trades' && (
          <Card padding="default">
            <TradesTable trades={trades} />
          </Card>
        )}
      </div>
    </div>
  );
}
