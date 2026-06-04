// src/components/macro/MacroChart.tsx
// =====================================================
// MACRO SECTION — Reusable multi-series compare chart
// =====================================================
// Generalizes the ETF Compare chart into a reusable
// component. Supports normalized % performance or raw
// close values, configurable series colors, timeframe
// pills, ticker chips, and autocomplete via useSymbolSuggest.
// =====================================================

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type FormEvent,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';
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
import { SkeletonChart } from '@/components/ds/Skeleton';
import { fetchETFBars } from '@/services/etf-analyzer.api';
import { useSymbolSuggest, type SuggestItem } from '@/components/Search/useSymbolSuggest';
import type { OhlcBar } from '@/types/etf.types';

// ─── Public types ─────────────────────────────────────────────────────────────

export type MacroChartRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y';

export interface MacroChartProps {
  /** Header label shown above the chart, e.g. "NORMALIZED PERFORMANCE" */
  title?: string;
  /** Seed series loaded on mount. Default: ['SPY'] */
  initialTickers?: string[];
  /** Show ticker-add input + chips. Default: true */
  allowAdd?: boolean;
  /** Maximum number of series. Default: 4 */
  maxSeries?: number;
  /** Initially selected range. Default: '1Y' */
  defaultRange?: MacroChartRange;
  /** Chart height in pixels. Default: 360 */
  height?: number;
  /**
   * Data-fetch function. Receives ticker + range, resolves to OhlcBar[].
   * Default: fetchETFBars from etf-analyzer.api
   */
  fetchBars?: (ticker: string, range: MacroChartRange) => Promise<OhlcBar[]>;
  /**
   * When true (default), rebases each series to 0% at the first bar of the
   * range and shows the Y-axis as "+N%". When false, plots raw close values.
   */
  normalize?: boolean;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface SeriesState {
  ticker: string;
  bars: OhlcBar[];
  loading: boolean;
  error: string | null;
}

// DS-friendly palette — 4 distinct series colors that work on dark backgrounds
const SERIES_COLORS = ['#C9A646', '#4AD295', '#60A5FA', '#F87171'];

const ALL_RANGES: MacroChartRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'];

// Intraday ranges — bars are sub-daily (more, closer-spaced points)
const INTRADAY_RANGES = new Set<MacroChartRange>(['1D', '1W']);

// ─── Chart data builders ──────────────────────────────────────────────────────

/** Build normalized % chart data: each series rebased to 0% at first bar. */
function buildNormalizedData(series: SeriesState[]): Record<string, string | number>[] {
  const loaded = series.filter((s) => s.bars.length > 0 && !s.loading);
  if (loaded.length === 0) return [];

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

/** Build raw close chart data: plots actual close values. */
function buildRawData(series: SeriesState[]): Record<string, string | number>[] {
  const loaded = series.filter((s) => s.bars.length > 0 && !s.loading);
  if (loaded.length === 0) return [];

  const dateSet = new Set<string>();
  loaded.forEach((s) => s.bars.forEach((b) => dateSet.add(b.t)));
  const dates = Array.from(dateSet).sort();

  return dates.map((date) => {
    const row: Record<string, string | number> = { date };
    loaded.forEach((s) => {
      const bar = s.bars.find((b) => b.t === date);
      if (bar) row[s.ticker] = bar.c;
    });
    return row;
  });
}

// ─── Tick / tooltip formatters ────────────────────────────────────────────────

function makeTickFormatter(range: MacroChartRange): (dateStr: string) => string {
  if (INTRADAY_RANGES.has(range)) {
    return (dateStr: string) => {
      try {
        const d = new Date(dateStr);
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        const day = d.getDate();
        const h = d.getHours().toString().padStart(2, '0');
        const m = d.getMinutes().toString().padStart(2, '0');
        return `${month} ${day} ${h}:${m}`;
      } catch {
        return dateStr;
      }
    };
  }
  return (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } catch {
      return dateStr;
    }
  };
}

function formatTooltipDate(dateStr: string, range: MacroChartRange): string {
  try {
    const d = new Date(dateStr);
    if (INTRADAY_RANGES.has(range)) {
      return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ─── Tooltip component ────────────────────────────────────────────────────────

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
  range: MacroChartRange;
  normalize: boolean;
}

function MacroTooltip({ active, payload, label, range, normalize }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[8px] border border-border-ds-subtle bg-surface-1 px-3 py-2 text-[12px] shadow-lg space-y-1">
      <p className="text-ink-tertiary mb-1">{formatTooltipDate(label ?? '', range)}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span style={{ color: p.color }} className="font-data font-semibold">
            {p.name}
          </span>
          {normalize ? (
            <span className={`font-data font-semibold ${p.value >= 0 ? 'text-[#4AD295]' : 'text-[#E24B4A]'}`}>
              {p.value >= 0 ? '+' : ''}{p.value.toFixed(2)}%
            </span>
          ) : (
            <span className="font-data font-semibold text-ink-primary">
              {p.value.toFixed(2)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Autocomplete dropdown ────────────────────────────────────────────────────

interface SuggestDropdownProps {
  items: SuggestItem[];
  highlightIndex: number;
  onSelect: (item: SuggestItem) => void;
}

function SuggestDropdown({ items, highlightIndex, onSelect }: SuggestDropdownProps) {
  if (items.length === 0) return null;
  return (
    <div
      className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-[8px] border border-border-ds-subtle bg-surface-1 shadow-lg overflow-hidden"
      role="listbox"
    >
      {items.map((item, idx) => {
        const isActive = idx === highlightIndex;
        return (
          <button
            key={`${item.symbol}-${idx}`}
            type="button"
            role="option"
            aria-selected={isActive}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item);
            }}
            className={`flex w-full items-center gap-ds-3 px-ds-3 py-ds-2 text-left transition-colors ${
              isActive
                ? 'bg-gold-primary/15 text-ink-primary'
                : 'text-ink-secondary hover:bg-surface-2'
            }`}
          >
            <span className="font-data font-semibold text-sm text-ink-primary min-w-[52px]">
              {item.symbol}
            </span>
            <span className="flex-1 truncate text-xs text-ink-tertiary">{item.name}</span>
            {item.assetType && item.assetType !== 'unknown' && (
              <span
                className={`flex-shrink-0 rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  item.assetType === 'etf'
                    ? 'bg-gold-primary/20 text-gold-bright'
                    : 'bg-surface-2 text-ink-tertiary'
                }`}
              >
                {item.assetType}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function sortByEtfFirst(items: SuggestItem[]): SuggestItem[] {
  return [...items].sort((a, b) => {
    const aIsEtf = a.assetType === 'etf' ? 0 : 1;
    const bIsEtf = b.assetType === 'etf' ? 0 : 1;
    return aIsEtf - bIsEtf;
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MacroChart({
  title = 'NORMALIZED PERFORMANCE',
  initialTickers = ['SPY'],
  allowAdd = true,
  maxSeries = 4,
  defaultRange = '1Y',
  height = 360,
  fetchBars,
  normalize = true,
}: MacroChartProps): JSX.Element {
  const [input, setInput]     = useState('');
  const [series, setSeries]   = useState<SeriesState[]>([]);
  const [range, setRange]     = useState<MacroChartRange>(defaultRange);
  const initializedRef        = useRef(false);

  // Autocomplete state
  const [dropdownOpen, setDropdownOpen]       = useState(false);
  const [highlightIndex, setHighlightIndex]   = useState(-1);
  const inputRef   = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounce input for suggest query
  const [debouncedInput, setDebouncedInput] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedInput(input), 200);
    return () => clearTimeout(id);
  }, [input]);

  const suggestState = useSymbolSuggest(debouncedInput);
  const suggestItems = dropdownOpen
    ? sortByEtfFirst(suggestState.data).slice(0, 8)
    : [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setHighlightIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resolve the actual fetch function (prop override or default)
  const resolvedFetchBars = useCallback(
    (ticker: string, r: MacroChartRange): Promise<OhlcBar[]> => {
      return fetchBars ? fetchBars(ticker, r) : fetchETFBars(ticker, r);
    },
    [fetchBars],
  );

  const loadTicker = useCallback(
    async (ticker: string, currentRange: MacroChartRange) => {
      const sym = ticker.toUpperCase().trim();
      if (!sym) return;
      setSeries((prev) => {
        if (prev.some((s) => s.ticker === sym)) return prev;
        if (prev.length >= maxSeries) return prev;
        return [...prev, { ticker: sym, bars: [], loading: true, error: null }];
      });
      try {
        const bars = await resolvedFetchBars(sym, currentRange);
        setSeries((prev) =>
          prev.map((s) => (s.ticker === sym ? { ...s, bars, loading: false } : s)),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load data.';
        setSeries((prev) =>
          prev.map((s) => (s.ticker === sym ? { ...s, loading: false, error: msg } : s)),
        );
      }
    },
    [maxSeries, resolvedFetchBars],
  );

  // Load initial tickers on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    for (const ticker of initialTickers) {
      loadTicker(ticker, defaultRange);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const atMax = series.length >= maxSeries;

  function addTicker(sym: string) {
    const normalized = sym.trim().toUpperCase();
    if (!normalized || atMax) return;
    loadTicker(normalized, range);
    setInput('');
    setDropdownOpen(false);
    setHighlightIndex(-1);
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (highlightIndex >= 0 && suggestItems[highlightIndex]) {
      addTicker(suggestItems[highlightIndex].symbol);
    } else {
      addTicker(input);
    }
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!dropdownOpen || suggestItems.length === 0) {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setHighlightIndex(-1);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, suggestItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
      setHighlightIndex(-1);
    }
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toUpperCase();
    setInput(val);
    setHighlightIndex(-1);
    if (val.trim()) {
      setDropdownOpen(true);
    } else {
      setDropdownOpen(false);
    }
  }

  function handleInputFocus() {
    if (input.trim() && !atMax) {
      setDropdownOpen(true);
    }
  }

  function handleInputBlur() {
    setTimeout(() => {
      setDropdownOpen(false);
      setHighlightIndex(-1);
    }, 150);
  }

  function handleSuggestSelect(item: SuggestItem) {
    addTicker(item.symbol);
    inputRef.current?.focus();
  }

  function handleRemove(ticker: string) {
    setSeries((prev) => prev.filter((s) => s.ticker !== ticker));
  }

  async function handleRangeChange(newRange: MacroChartRange) {
    setRange(newRange);
    const current = series.map((s) => s.ticker);
    setSeries([]);
    for (const t of current) {
      await (async () => {
        setSeries((prev) => [...prev, { ticker: t, bars: [], loading: true, error: null }]);
        try {
          const bars = await resolvedFetchBars(t, newRange);
          setSeries((prev) =>
            prev.map((s) => (s.ticker === t ? { ...s, bars, loading: false } : s)),
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to load data.';
          setSeries((prev) =>
            prev.map((s) => (s.ticker === t ? { ...s, loading: false, error: msg } : s)),
          );
        }
      })();
    }
  }

  const chartData     = normalize ? buildNormalizedData(series) : buildRawData(series);
  const loadedSeries  = series.filter((s) => s.bars.length > 0 && !s.loading);
  const anyLoading    = series.some((s) => s.loading);
  const tickFormatter = makeTickFormatter(range);

  return (
    <Card padding="default">
      {/* Header row: title + timeframe pills */}
      <div className="flex items-center justify-between mb-ds-4">
        <span className="text-[11px] text-ink-tertiary uppercase tracking-wider">
          {title}
        </span>
        <div className="flex rounded-[6px] border border-border-ds-subtle overflow-hidden">
          {ALL_RANGES.map((r) => (
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

      {/* Ticker-add input + chips (only when allowAdd is true) */}
      {allowAdd && (
        <>
          <form onSubmit={handleAdd} className="flex gap-ds-2 mb-ds-4">
            <div ref={wrapperRef} className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder={atMax ? `Max ${maxSeries} tickers` : 'Add ticker — e.g. SPY'}
                disabled={atMax}
                className="w-full rounded-[8px] border border-border-ds-subtle bg-surface-1 py-ds-3 px-ds-4 text-sm text-ink-primary placeholder:text-ink-muted transition-colors focus:border-border-ds-default focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                autoCapitalize="characters"
                spellCheck={false}
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={dropdownOpen && suggestItems.length > 0}
                aria-haspopup="listbox"
              />
              {dropdownOpen && !atMax && (
                <SuggestDropdown
                  items={suggestItems}
                  highlightIndex={highlightIndex}
                  onSelect={handleSuggestSelect}
                />
              )}
            </div>

            <button
              type="submit"
              disabled={!input.trim() || atMax}
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
            <div className="flex flex-wrap gap-ds-2 mb-ds-4">
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
                  {s.error && (
                    <span className="text-[#E24B4A]" title={s.error}>!</span>
                  )}
                  {/* Final % — only shown when normalize=true */}
                  {normalize && s.bars.length > 0 && !s.loading && (() => {
                    const base = s.bars[0].c;
                    const last = s.bars[s.bars.length - 1].c;
                    const pct  = base > 0 ? ((last - base) / base) * 100 : 0;
                    return (
                      <span className={`font-data tabular-nums ${pct >= 0 ? 'text-[#4AD295]' : 'text-[#E24B4A]'}`}>
                        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                      </span>
                    );
                  })()}
                  {/* Raw last close — only shown when normalize=false */}
                  {!normalize && s.bars.length > 0 && !s.loading && (() => {
                    const last = s.bars[s.bars.length - 1].c;
                    return (
                      <span className="font-data tabular-nums text-ink-secondary">
                        {last.toFixed(2)}
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
        </>
      )}

      {/* Chart or loading/empty state */}
      {anyLoading && loadedSeries.length === 0 ? (
        <div style={{ height }}>
          <SkeletonChart height="h-full" />
        </div>
      ) : loadedSeries.length > 0 ? (
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tickFormatter={tickFormatter}
                tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={INTRADAY_RANGES.has(range) ? 80 : 60}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={
                  normalize
                    ? (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`
                    : (v: number) => v.toFixed(0)
                }
                width={56}
              />
              {normalize && (
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
              )}
              <Tooltip
                content={
                  <MacroTooltip range={range} normalize={normalize} />
                }
              />
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
      ) : (
        series.length === 0 && (
          <p className="text-center text-sm text-ink-tertiary py-8">
            Add at least one ticker above to view performance.
          </p>
        )
      )}
    </Card>
  );
}

export default MacroChart;
