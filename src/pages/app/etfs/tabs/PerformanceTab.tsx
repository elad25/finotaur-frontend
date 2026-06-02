// src/pages/app/etfs/tabs/PerformanceTab.tsx
// =====================================================
// ETF ANALYZER — Performance Tab
// =====================================================
// Shows: trailing returns table, calendar-year bar chart,
// 1Y/5Y price line chart fetched on mount.
// =====================================================

import { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Card } from '@/components/ds/Card';
import type { EtfData, OhlcBar } from '@/types/etf.types';
import { fetchETFBars, type EtfBarsRange } from '@/services/etf-analyzer.api';
import { fmtReturn, fmtDate } from '../format';

// ─── Trailing returns table ───────────────────────────────────────────────────

function TrailingReturnsTable({ returns }: { returns: EtfData['returns'] }) {
  const rows: { label: string; value: number | null | undefined }[] = [
    { label: 'YTD',              value: returns.ytd },
    { label: '1 Month',         value: returns.m1 },
    { label: '3 Months',        value: returns.m3 },
    { label: '6 Months',        value: returns.m6 },
    { label: '1 Year',          value: returns.y1 },
    { label: '3 Years',         value: returns.y3 },
    { label: '5 Years',         value: returns.y5 },
    { label: 'Since Inception', value: returns.sinceInception },
  ];

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border-ds-subtle">
          <th className="pb-ds-2 text-left text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">
            Period
          </th>
          <th className="pb-ds-2 text-right text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">
            Return
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ label, value }) => {
          if (value === null || value === undefined) return null;
          const isNeg = value < 0;
          return (
            <tr
              key={label}
              className="border-b border-border-ds-subtle/50 last:border-0"
            >
              <td className="py-ds-2 text-ink-secondary">{label}</td>
              <td
                className={`py-ds-2 text-right font-data font-semibold tabular-nums ${
                  isNeg ? 'text-[#E24B4A]' : 'text-ink-primary'
                }`}
              >
                {fmtReturn(value)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Calendar year bar chart ──────────────────────────────────────────────────

interface CalBarTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string | number;
}

function CalBarTooltip({ active, payload, label }: CalBarTooltipProps) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const isNeg = val < 0;
  return (
    <div className="rounded-[8px] border border-border-ds-subtle bg-surface-1 px-3 py-2 text-[12px] shadow-lg">
      <p className="text-ink-tertiary mb-0.5">{label}</p>
      <p className={`font-data font-semibold ${isNeg ? 'text-[#E24B4A]' : 'text-[#4AD295]'}`}>
        {fmtReturn(val)}
      </p>
    </div>
  );
}

function CalendarReturnsChart({ calendarReturns }: { calendarReturns: EtfData['calendarReturns'] }) {
  if (!calendarReturns || calendarReturns.length === 0) {
    return (
      <p className="text-small text-ink-tertiary">No calendar return data available.</p>
    );
  }

  const sorted = [...calendarReturns].sort((a, b) => a.year - b.year);
  const chartData = sorted.map((r) => ({ year: String(r.year), returnPct: r.returnPct }));

  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <BarChart
          data={chartData}
          margin={{ top: 16, right: 8, left: 0, bottom: 8 }}
          barCategoryGap="30%"
        >
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="year"
            tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
            width={48}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
          <Tooltip content={<CalBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="returnPct" radius={[3, 3, 0, 0]} maxBarSize={48}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.returnPct >= 0 ? '#4AD295' : '#E24B4A'}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Price line chart ─────────────────────────────────────────────────────────

interface PriceLineTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function PriceLineTooltip({ active, payload, label }: PriceLineTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[8px] border border-border-ds-subtle bg-surface-1 px-3 py-2 text-[12px] shadow-lg">
      <p className="text-ink-tertiary mb-0.5">{label}</p>
      <p className="font-data font-semibold text-ink-primary">${payload[0].value.toFixed(2)}</p>
    </div>
  );
}

function PriceChart({
  ticker,
  asOf,
}: {
  ticker: string;
  asOf: string | undefined;
}) {
  const [range, setRange] = useState<EtfBarsRange>('1Y');
  const [bars, setBars] = useState<OhlcBar[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = useCallback(
    async (r: EtfBarsRange) => {
      setLoading(true);
      setFetchError(null);
      try {
        const result = await fetchETFBars(ticker, r);
        setBars(result);
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : 'Failed to load price data.');
      } finally {
        setLoading(false);
      }
    },
    [ticker],
  );

  useEffect(() => {
    load(range);
  }, [load, range]);

  // Subsample if >250 bars to keep rendering performant
  const chartData = (() => {
    if (bars.length === 0) return [];
    const step = bars.length > 250 ? Math.ceil(bars.length / 250) : 1;
    return bars
      .filter((_, i) => i % step === 0 || i === bars.length - 1)
      .map((b) => ({
        date: new Date(b.t).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: '2-digit',
        }),
        close: b.c,
      }));
  })();

  const tickInterval = Math.max(1, Math.floor(chartData.length / 6) - 1);

  return (
    <div>
      {/* Range toggle + heading */}
      <div className="flex items-center justify-between mb-ds-3">
        <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
          Price History
        </p>
        <div className="flex gap-1">
          {(['1Y', '5Y'] as EtfBarsRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
                range === r
                  ? 'bg-gold-primary/20 text-gold-primary border border-gold-border'
                  : 'text-ink-tertiary hover:text-ink-secondary border border-transparent'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <span className="text-small text-ink-tertiary animate-pulse">Loading price data…</span>
        </div>
      )}

      {fetchError && !loading && (
        <div className="flex items-center justify-center h-48">
          <span className="text-small text-[#E24B4A]">{fetchError}</span>
        </div>
      )}

      {!loading && !fetchError && chartData.length > 0 && (
        <>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
              >
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={tickInterval}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                  width={48}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<PriceLineTooltip />} />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke="#C9A646"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: '#C9A646' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {asOf && (
            <p className="mt-ds-2 text-[10px] text-ink-tertiary text-right">
              As of {fmtDate(asOf)} · EOD · Delayed
            </p>
          )}
        </>
      )}

      {!loading && !fetchError && chartData.length === 0 && (
        <div className="flex items-center justify-center h-48">
          <span className="text-small text-ink-tertiary">No price data available.</span>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  data: EtfData;
}

export function PerformanceTab({ data }: Props) {
  return (
    <div className="space-y-ds-6">

      {/* ── Trailing Returns ──────────────────────────────────────────── */}
      <Card padding="default">
        <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-4">
          Trailing Returns
        </p>
        <TrailingReturnsTable returns={data.returns} />
      </Card>

      {/* ── Calendar Year Returns ─────────────────────────────────────── */}
      <Card padding="default">
        <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-4">
          Calendar Year Returns
        </p>
        <CalendarReturnsChart calendarReturns={data.calendarReturns} />
      </Card>

      {/* ── Price Chart ───────────────────────────────────────────────── */}
      <Card padding="default">
        <PriceChart ticker={data.ticker} asOf={data.quote?.asOf} />
      </Card>

    </div>
  );
}
