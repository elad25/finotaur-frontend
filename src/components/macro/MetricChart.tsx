// src/components/macro/MetricChart.tsx
// Reusable interactive line chart for FINOTAUR macro pages.
// Renders recession shading, FOMC event lines, multi-line data, time-range pills.
// Stack: recharts 2.15 ComposedChart.

import { useState, useMemo, useCallback } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { nberInRange, fomcInRange } from '@/lib/macroCalendar';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MetricLine {
  dataKey: string;
  label: string;
  color: string;
  yAxisId?: 'left' | 'right';
  strokeDasharray?: string;
  format?: 'number' | 'percent' | 'compactUSD';
}

export type TimeRange = '1M' | '3M' | '1Y' | '5Y' | 'MAX';

export interface MetricChartProps {
  data: { date: string; [key: string]: number | string | null }[];
  lines: MetricLine[];
  showNBER?: boolean;
  showFOMC?: boolean;
  title?: string;
  isLoading?: boolean;
  defaultRange?: TimeRange;
  height?: number;
  yAxisLeftDomain?: 'auto' | [number, number];
  yAxisRightDomain?: 'auto' | [number, number];
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtPercent(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toFixed(2)}%`;
}

function fmtCompactUSD(v: number | null | undefined): string {
  if (v == null) return '—';
  const abs = Math.abs(v);
  // Assumes input is already in billions
  if (abs >= 1000) return `$${(v / 1000).toFixed(2)}T`;
  if (abs >= 1) return `$${v.toFixed(1)}B`;
  if (abs >= 0.001) return `$${(v * 1000).toFixed(0)}M`;
  return v.toFixed(4);
}

function fmtNumber(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('en-US');
}

function fmtValue(
  v: number | null | undefined,
  format: MetricLine['format'],
): string {
  switch (format) {
    case 'percent':
      return fmtPercent(v);
    case 'compactUSD':
      return fmtCompactUSD(v);
    default:
      return fmtNumber(v);
  }
}

function fmtDateShort(d: string, range: TimeRange): string {
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  const year = parts[0];
  const month = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ][parseInt(parts[1]) - 1] ?? parts[1];
  const day = parseInt(parts[2]);
  if (range === '5Y' || range === 'MAX') return `${month} '${year.slice(2)}`;
  if (range === '1Y') return `${month} '${year.slice(2)}`;
  return `${day} ${month}`;
}

function fmtDateFull(d: string): string {
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  const month = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ][parseInt(parts[1]) - 1] ?? parts[1];
  return `${parseInt(parts[2])} ${month} ${parts[0]}`;
}

// ─── Cutoff date computation ──────────────────────────────────────────────────

function getCutoffDate(range: TimeRange): string | null {
  if (range === 'MAX') return null;
  const now = new Date();
  const d = new Date(now);
  switch (range) {
    case '1M':
      d.setMonth(d.getMonth() - 1);
      break;
    case '3M':
      d.setMonth(d.getMonth() - 3);
      break;
    case '1Y':
      d.setFullYear(d.getFullYear() - 1);
      break;
    case '5Y':
      d.setFullYear(d.getFullYear() - 5);
      break;
  }
  return d.toISOString().slice(0, 10);
}

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  dataKey: string;
  value: number | null;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  lines: MetricLine[];
  nberRanges: { start: string; end: string; label: string }[];
}

function CustomTooltip({
  active,
  payload,
  label,
  lines,
  nberRanges,
}: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null;

  // Check if this date falls inside a recession
  const recession = nberRanges.find(
    (r) => label >= r.start && label <= r.end,
  );

  return (
    // dir="ltr" forces LTR layout for numbers/dates even inside RTL parent contexts
    <div
      dir="ltr"
      className="bg-black/85 border border-white/[0.08] rounded-lg p-3 text-xs shadow-xl"
    >
      <p className="text-white/60 mb-2 font-medium">{fmtDateFull(label)}</p>
      {recession && (
        <p className="mb-2 px-1.5 py-0.5 rounded text-[10px] bg-white/[0.06] text-white/40">
          Recession: {recession.label}
        </p>
      )}
      {payload.map((entry) => {
        const lineDef = lines.find((l) => l.dataKey === entry.dataKey);
        if (!lineDef) return null;
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 mb-1 last:mb-0">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-white/50">{lineDef.label}:</span>
            <span className="text-white/90 font-mono tabular-nums ml-auto pl-3">
              {fmtValue(entry.value, lineDef.format)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Time-range pill group ────────────────────────────────────────────────────

const TIME_RANGES: TimeRange[] = ['1M', '3M', '1Y', '5Y', 'MAX'];

interface RangePillsProps {
  selected: TimeRange;
  onChange: (r: TimeRange) => void;
  disabled?: boolean;
}

function RangePills({ selected, onChange, disabled }: RangePillsProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Time range">
      {TIME_RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => !disabled && onChange(r)}
          disabled={disabled}
          aria-pressed={selected === r}
          className={[
            'px-3 rounded-full text-xs h-7 leading-none transition-colors duration-100',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-primary',
            selected === r
              ? 'bg-gold-primary text-ink-on-gold font-semibold'
              : 'bg-white/[0.05] text-white/40 hover:bg-white/10 disabled:pointer-events-none',
          ].join(' ')}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// ─── Axis tick formatters ─────────────────────────────────────────────────────

function makeXTickFormatter(range: TimeRange) {
  return (val: string) => fmtDateShort(val, range);
}

function makeYTickFormatter(format: MetricLine['format']) {
  return (val: number) => fmtValue(val, format);
}

// ─── MetricChart ──────────────────────────────────────────────────────────────

export function MetricChart({
  data,
  lines,
  showNBER = true,
  showFOMC = true,
  title,
  isLoading = false,
  defaultRange = '1Y',
  height = 360,
  yAxisLeftDomain = 'auto',
  yAxisRightDomain = 'auto',
}: MetricChartProps) {
  const [range, setRange] = useState<TimeRange>(defaultRange);

  const todayISO = useMemo(() => getTodayISO(), []);

  // Filter data to the visible window
  const visibleData = useMemo(() => {
    const cutoff = getCutoffDate(range);
    if (!cutoff) return data;
    return data.filter((d) => d.date >= cutoff);
  }, [data, range]);

  // Determine window boundaries for overlays
  const windowStart = useMemo(
    () => visibleData[0]?.date ?? todayISO,
    [visibleData, todayISO],
  );

  const visibleNber = useMemo(
    () => (showNBER ? nberInRange(windowStart, todayISO) : []),
    [showNBER, windowStart, todayISO],
  );

  const visibleFomc = useMemo(
    () => (showFOMC ? fomcInRange(windowStart, todayISO) : []),
    [showFOMC, windowStart, todayISO],
  );

  // Determine whether a right Y-axis is needed
  const hasRightAxis = lines.some((l) => l.yAxisId === 'right');

  // X-axis interval: aim for ~8 ticks regardless of data density
  const xInterval = useMemo(
    () => Math.max(0, Math.floor(visibleData.length / 8) - 1),
    [visibleData.length],
  );

  // Format for left axis ticks (first line's format)
  const leftFormat = lines.find((l) => !l.yAxisId || l.yAxisId === 'left')?.format;
  const rightFormat = lines.find((l) => l.yAxisId === 'right')?.format;

  const handleRangeChange = useCallback((r: TimeRange) => setRange(r), []);

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div>
        {/* Header stub — always render so layout doesn't jump */}
        <div className="flex items-center justify-between mb-3">
          {title && (
            <p className="text-sm font-medium text-white/60">{title}</p>
          )}
          <RangePills selected={range} onChange={handleRangeChange} disabled />
        </div>
        <div
          className="w-full animate-pulse rounded-lg bg-white/[0.04]"
          style={{ height }}
        />
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (visibleData.length < 2) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          {title && (
            <p className="text-sm font-medium text-white/60">{title}</p>
          )}
          <RangePills selected={range} onChange={handleRangeChange} />
        </div>
        <div
          className="w-full flex items-center justify-center rounded-lg bg-white/[0.02] text-sm text-white/30"
          style={{ height }}
        >
          No data available for this range
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        {title ? (
          <p className="text-sm font-medium text-white/70">{title}</p>
        ) : (
          <span />
        )}
        <RangePills selected={range} onChange={handleRangeChange} />
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={visibleData}
          margin={{ top: 4, right: hasRightAxis ? 12 : 4, bottom: 0, left: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            type="category"
            tickFormatter={makeXTickFormatter(range)}
            interval={xInterval}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={false}
          />

          <YAxis
            yAxisId="left"
            orientation="left"
            tickFormatter={makeYTickFormatter(leftFormat)}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={yAxisLeftDomain}
            width={64}
          />

          {hasRightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={makeYTickFormatter(rightFormat)}
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={yAxisRightDomain}
              width={64}
            />
          )}

          <Tooltip
            content={
              <CustomTooltip lines={lines} nberRanges={visibleNber} />
            }
            cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1 }}
          />

          {/* Only render legend when there are multiple lines */}
          {lines.length > 1 && (
            <Legend
              wrapperStyle={{ paddingTop: '12px' }}
              formatter={(value: string) => (
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                  {value}
                </span>
              )}
            />
          )}

          {/* NBER recession shading — rendered below data lines */}
          {visibleNber.map((r) => (
            <ReferenceArea
              key={`nber-${r.start}`}
              yAxisId="left"
              x1={r.start}
              x2={r.end}
              fill="rgba(255,255,255,0.06)"
              fillOpacity={0.08}
              label={{
                value: r.label,
                position: 'insideTop',
                fill: 'rgba(255,255,255,0.35)',
                fontSize: 10,
              }}
            />
          ))}

          {/* FOMC decision date vertical markers */}
          {visibleFomc.map((m) => (
            <ReferenceLine
              key={`fomc-${m.date}`}
              yAxisId="left"
              x={m.date}
              stroke="#C9A646"
              strokeOpacity={0.25}
              strokeDasharray="4 4"
            />
          ))}

          {/* Data lines */}
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              yAxisId={line.yAxisId ?? 'left'}
              type="monotone"
              dataKey={line.dataKey}
              name={line.label}
              stroke={line.color}
              strokeWidth={2}
              strokeDasharray={line.strokeDasharray}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MetricChart;
