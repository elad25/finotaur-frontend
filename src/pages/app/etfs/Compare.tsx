// src/pages/app/etfs/Compare.tsx
// =====================================================
// ETF SECTION — Compare
// =====================================================
// Route: /app/etfs/compare
// Add 2–4 ETF tickers. Fetches bars for each via
// fetchETFBars, then renders a normalized cumulative-%
// performance line chart (rebased to 0% at start).
// Range toggle: 1Y / 5Y.
// =====================================================

import { useState, useCallback, type FormEvent } from 'react';
import { X, Plus } from 'lucide-react';
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
import { fetchETFBars, type EtfBarsRange } from '@/services/etf-analyzer.api';
import type { OhlcBar } from '@/types/etf.types';

// DS-friendly palette — 4 distinct series colors that work on dark backgrounds
const SERIES_COLORS = ['#C9A646', '#4AD295', '#60A5FA', '#F87171'];

const MAX_TICKERS = 4;

interface SeriesState {
  ticker: string;
  bars: OhlcBar[];
  loading: boolean;
  error: string | null;
}

// Build chart data: index of dates → { date, [ticker]: normalizedPct }
function buildChartData(series: SeriesState[]): Record<string, string | number>[] {
  const loaded = series.filter((s) => s.bars.length > 0 && !s.loading);
  if (loaded.length === 0) return [];

  // Find common date range: union all dates, sorted
  const dateSet = new Set<string>();
  loaded.forEach((s) => s.bars.forEach((b) => dateSet.add(b.t)));
  const dates = Array.from(dateSet).sort();

  return dates.map((date) => {
    const row: Record<string, string | number> = { date };
    loaded.forEach((s) => {
      const barIdx = s.bars.findIndex((b) => b.t === date);
      if (barIdx === -1) return;
      const base = s.bars[0].c;
      if (base === 0) return;
      row[s.ticker] = parseFloat((((s.bars[barIdx].c - base) / base) * 100).toFixed(2));
    });
    return row;
  });
}

function formatDateShort(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  } catch {
    return dateStr;
  }
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}

function CompareTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[8px] border border-border-ds-subtle bg-surface-1 px-3 py-2 text-[12px] shadow-lg space-y-1">
      <p className="text-ink-tertiary mb-1">{formatDateShort(label ?? '')}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span style={{ color: p.color }} className="font-data font-semibold">
            {p.name}
          </span>
          <span className={`font-data font-semibold ${p.value >= 0 ? 'text-[#4AD295]' : 'text-[#E24B4A]'}`}>
            {p.value >= 0 ? '+' : ''}{p.value.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ETFCompare() {
  const [input, setInput]         = useState('');
  const [series, setSeries]       = useState<SeriesState[]>([]);
  const [range, setRange]         = useState<EtfBarsRange>('1Y');

  const loadTicker = useCallback(async (ticker: string, currentRange: EtfBarsRange) => {
    const sym = ticker.toUpperCase().trim();
    if (!sym) return;
    if (series.some((s) => s.ticker === sym)) return; // already added
    if (series.length >= MAX_TICKERS) return;

    // Add placeholder
    setSeries((prev) => [...prev, { ticker: sym, bars: [], loading: true, error: null }]);

    try {
      const bars = await fetchETFBars(sym, currentRange);
      setSeries((prev) =>
        prev.map((s) => s.ticker === sym ? { ...s, bars, loading: false } : s),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load data.';
      setSeries((prev) =>
        prev.map((s) => s.ticker === sym ? { ...s, loading: false, error: msg } : s),
      );
    }
  }, [series]);

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const sym = input.trim().toUpperCase();
    if (!sym || series.length >= MAX_TICKERS) return;
    setInput('');
    loadTicker(sym, range);
  }

  function handleRemove(ticker: string) {
    setSeries((prev) => prev.filter((s) => s.ticker !== ticker));
  }

  async function handleRangeChange(newRange: EtfBarsRange) {
    setRange(newRange);
    // Reload all existing tickers with new range
    const current = series.map((s) => s.ticker);
    setSeries([]);
    for (const t of current) {
      await (async () => {
        setSeries((prev) => [...prev, { ticker: t, bars: [], loading: true, error: null }]);
        try {
          const bars = await fetchETFBars(t, newRange);
          setSeries((prev) =>
            prev.map((s) => s.ticker === t ? { ...s, bars, loading: false } : s),
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to load data.';
          setSeries((prev) =>
            prev.map((s) => s.ticker === t ? { ...s, loading: false, error: msg } : s),
          );
        }
      })();
    }
  }

  const chartData = buildChartData(series);
  const loadedSeries = series.filter((s) => s.bars.length > 0 && !s.loading);

  return (
    <div className="mx-auto max-w-[960px] py-ds-7 px-ds-4 flex flex-col gap-ds-5">
      {/* Header */}
      <div className="space-y-ds-1">
        <span className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
          ETF Research
        </span>
        <h1 className="text-h2 font-medium text-ink-primary">Compare ETFs</h1>
        <p className="text-body text-ink-secondary">
          Side-by-side normalized performance. Each series is rebased to 0% at the start of the selected range.
        </p>
      </div>

      {/* Ticker input + chips */}
      <Card padding="default">
        <form onSubmit={handleAdd} className="flex gap-ds-2 mb-ds-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder={series.length >= MAX_TICKERS ? 'Max 4 ETFs' : 'Add ticker — e.g. SPY'}
            disabled={series.length >= MAX_TICKERS}
            className="flex-1 rounded-[8px] border border-border-ds-subtle bg-surface-1 py-ds-3 px-ds-4 text-sm text-ink-primary placeholder:text-ink-muted transition-colors focus:border-border-ds-default focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={!input.trim() || series.length >= MAX_TICKERS}
            className="flex items-center gap-1 rounded-[8px] px-ds-4 py-ds-3 text-sm font-semibold text-ink-on-gold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'var(--gradient-gold)',
              boxShadow: 'var(--glow-gold-resting)',
            }}
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </form>

        {/* Chips */}
        {series.length > 0 && (
          <div className="flex flex-wrap gap-ds-2">
            {series.map((s, idx) => (
              <div
                key={s.ticker}
                className="flex items-center gap-1.5 rounded-[6px] border border-border-ds-subtle bg-surface-2 px-ds-3 py-1.5 text-xs"
              >
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ background: SERIES_COLORS[idx % SERIES_COLORS.length] }}
                />
                <span className="font-data font-semibold text-ink-primary">{s.ticker}</span>
                {s.loading && <span className="text-ink-tertiary">…</span>}
                {s.error && <span className="text-[#E24B4A]" title={s.error}>!</span>}
                {/* Final % */}
                {s.bars.length > 0 && !s.loading && (() => {
                  const base = s.bars[0].c;
                  const last = s.bars[s.bars.length - 1].c;
                  const pct = base > 0 ? ((last - base) / base) * 100 : 0;
                  return (
                    <span className={`font-data tabular-nums ${pct >= 0 ? 'text-[#4AD295]' : 'text-[#E24B4A]'}`}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                    </span>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => handleRemove(s.ticker)}
                  className="ml-0.5 text-ink-tertiary hover:text-ink-primary transition-colors"
                  aria-label={`Remove ${s.ticker}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Chart */}
      {loadedSeries.length > 0 && (
        <Card padding="default">
          {/* Range toggle */}
          <div className="flex items-center justify-between mb-ds-4">
            <span className="text-[11px] text-ink-tertiary uppercase tracking-wider">
              Normalized Performance
            </span>
            <div className="flex rounded-[6px] border border-border-ds-subtle overflow-hidden">
              {(['1Y', '5Y'] as EtfBarsRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRangeChange(r)}
                  className={`px-ds-3 py-1 text-xs font-medium transition-colors ${
                    range === r
                      ? 'bg-gold-primary/20 text-gold-bright'
                      : 'text-ink-tertiary hover:text-ink-secondary'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateShort}
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
                <Tooltip content={<CompareTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}
                />
                {loadedSeries.map((s, idx) => (
                  <Line
                    key={s.ticker}
                    type="monotone"
                    dataKey={s.ticker}
                    stroke={SERIES_COLORS[idx % SERIES_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {series.length === 0 && (
        <Card padding="default">
          <p className="text-center text-sm text-ink-tertiary py-8">
            Add at least 2 ETF tickers above to compare their performance.
          </p>
        </Card>
      )}
    </div>
  );
}
