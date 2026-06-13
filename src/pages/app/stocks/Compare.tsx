// src/pages/app/stocks/Compare.tsx
// =====================================================
// STOCK RESEARCH — Compare Stocks
// =====================================================
// Route: /app/stocks/compare
// Add 2–4 stock tickers. Fetches bars for each via
// fetchCompareBars, then renders a normalized cumulative-%
// performance line chart (rebased to 0% at start).
// Below the chart: fundamentals comparison table.
// Range buttons: 1D · 1W · 1M · 3M · 6M · 1Y · 5Y.
// Autocomplete dropdown powered by useSymbolSuggest.
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
import { fetchCompareBars, type EtfBarsRange } from '@/services/etf-analyzer.api';
import {
  fetchStockFundamentals,
  fetchStockQuotes,
  type StockFundamentals,
  type StockQuote,
} from '@/services/stock-compare.api';
import { useSymbolSuggest, type SuggestItem } from '@/components/Search/useSymbolSuggest';
import type { OhlcBar } from '@/types/etf.types';
import { useMarketStatus } from '@/lib/marketStatus';

// ─── Constants ────────────────────────────────────────────────────────────────

// DS-friendly palette — 4 distinct series colors that work on dark backgrounds
const SERIES_COLORS = ['#C9A646', '#4AD295', '#60A5FA', '#F87171'];

const MAX_TICKERS = 4;

const ALL_RANGES: EtfBarsRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'];

// Intraday ranges — bars are sub-daily (more, closer-spaced points)
const INTRADAY_RANGES = new Set<EtfBarsRange>(['1D', '1W']);

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeriesState {
  ticker: string;
  bars: OhlcBar[];
  loading: boolean;
  error: string | null;
}

// ─── Chart helpers ────────────────────────────────────────────────────────────

// Build chart data: index of dates → { date, [ticker]: normalizedPct }
function buildChartData(series: SeriesState[]): Record<string, string | number>[] {
  const loaded = series.filter((s) => s.bars.length > 0 && !s.loading);
  if (loaded.length === 0) return [];

  // Find common date range: union all dates, sorted
  const dateSet = new Set<string>();
  loaded.forEach((s) => s.bars.forEach((b) => dateSet.add(String(b.t))));
  const dates = Array.from(dateSet).sort();

  return dates.map((date) => {
    const row: Record<string, string | number> = { date };
    loaded.forEach((s) => {
      const barIdx = s.bars.findIndex((b) => String(b.t) === date);
      if (barIdx === -1) return;
      const base = s.bars[0].c;
      if (base === 0) return;
      row[s.ticker] = parseFloat((((s.bars[barIdx].c - base) / base) * 100).toFixed(2));
    });
    return row;
  });
}

/**
 * Parse a chart date key into a Date. Bar timestamps from /api/etf/compare/bars
 * arrive as epoch-ms NUMBERS, which become numeric strings once used as the chart
 * dataKey — `new Date("1749821400000")` yields "Invalid Date", so coerce numeric
 * strings back to a number first. ISO date strings still parse normally.
 */
function toBarDate(dateStr: string): Date {
  const n = Number(dateStr);
  return dateStr.trim() !== '' && Number.isFinite(n) ? new Date(n) : new Date(dateStr);
}

/** Format an X-axis tick based on whether the range is intraday or daily. */
function makeTickFormatter(range: EtfBarsRange): (dateStr: string) => string {
  if (INTRADAY_RANGES.has(range)) {
    return (dateStr: string) => {
      try {
        const d = toBarDate(dateStr);
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
      return toBarDate(dateStr).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } catch {
      return dateStr;
    }
  };
}

/** Format a date for the tooltip label. */
function formatTooltipDate(dateStr: string, range: EtfBarsRange): string {
  try {
    const d = toBarDate(dateStr);
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

// ─── Chart tooltip ────────────────────────────────────────────────────────────

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
  range: EtfBarsRange;
}

function CompareTooltip({ active, payload, label, range }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[8px] border border-border-ds-subtle bg-surface-1 px-3 py-2 text-[12px] shadow-lg space-y-1">
      <p className="text-ink-tertiary mb-1">{formatTooltipDate(label ?? '', range)}</p>
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
      className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-[8px] border border-border-ds-subtle bg-popover shadow-lg overflow-hidden"
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
              // Use mousedown (fires before blur) so the click registers before
              // the blur handler closes the dropdown.
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
                  item.assetType === 'stock'
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

// Sort so stock items appear first, then the rest.
function sortByStockFirst(items: SuggestItem[]): SuggestItem[] {
  return [...items].sort((a, b) => {
    const aIsStock = a.assetType === 'stock' ? 0 : 1;
    const bIsStock = b.assetType === 'stock' ? 0 : 1;
    return aIsStock - bIsStock;
  });
}

// ─── Fundamentals table formatting helpers ────────────────────────────────────

/** Format a dollar value in compact notation: $4.28T, $265.6B, $51.4M, $1.2K, or $N. */
function fmtCurrencyCompact(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6)  return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3)  return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Format a dollar price with 2 decimals or '—'. */
function fmtPrice(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format a ratio to 2 decimal places or '—'. */
function fmtRatio(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toFixed(2);
}

/** Format a percentage (input is already a percent value, e.g. 73.49 → "73.5%"). */
function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v.toFixed(1)}%`;
}

/** Format volume as compact integer or '—'. */
function fmtInt(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(abs / 1e3).toFixed(1)}K`;
  return Math.round(abs).toLocaleString('en-US');
}

// ─── Fundamentals table ───────────────────────────────────────────────────────

interface FundamentalsTableProps {
  series: SeriesState[];
  fundamentals: Record<string, StockFundamentals | null>;
  fundLoading: Record<string, boolean>;
  quotes: Record<string, StockQuote>;
  range: EtfBarsRange;
}

interface TableRow {
  label: string;
  getValue: (ticker: string) => string;
  getColor?: (ticker: string) => string;
}

interface RowGroup {
  heading: string;
  rows: TableRow[];
}

function FundamentalsTable({
  series,
  fundamentals,
  fundLoading,
  quotes,
  range,
}: FundamentalsTableProps) {
  // Helper: returns '…' while fundamentals are loading, or the formatted value.
  function cell(ticker: string, getFn: (f: StockFundamentals | null) => string): string {
    if (fundLoading[ticker]) return '…';
    return getFn(fundamentals[ticker] ?? null);
  }

  // Compute per-range return from bars
  function rangeReturnNum(ticker: string): number | null {
    const s = series.find((x) => x.ticker === ticker);
    if (!s || s.bars.length < 2 || s.loading) return null;
    const first = s.bars[0].c;
    const last  = s.bars[s.bars.length - 1].c;
    if (first === 0) return null;
    return ((last - first) / first) * 100;
  }

  const groups: RowGroup[] = [
    {
      heading: 'PERFORMANCE & PRICE',
      rows: [
        {
          label: 'Last Price',
          getValue: (t) => fmtPrice(quotes[t]?.price),
        },
        {
          label: '1D Change',
          getValue: (t) => {
            const pct = quotes[t]?.changePercent;
            if (pct == null || !Number.isFinite(pct)) return '—';
            return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
          },
          getColor: (t) => {
            const pct = quotes[t]?.changePercent;
            if (pct == null) return '';
            return pct >= 0 ? 'text-[#4AD295]' : 'text-[#E24B4A]';
          },
        },
        {
          label: `Return (${range})`,
          getValue: (t) => {
            const r = rangeReturnNum(t);
            if (r == null) return '—';
            return `${r >= 0 ? '+' : ''}${r.toFixed(2)}%`;
          },
          getColor: (t) => {
            const r = rangeReturnNum(t);
            if (r == null) return '';
            return r >= 0 ? 'text-[#4AD295]' : 'text-[#E24B4A]';
          },
        },
        {
          label: '52W High',
          getValue: (t) => fmtPrice(quotes[t]?.high52w),
        },
        {
          label: '52W Low',
          getValue: (t) => fmtPrice(quotes[t]?.low52w),
        },
        {
          label: 'Volume',
          getValue: (t) => fmtInt(quotes[t]?.volume),
        },
      ],
    },
    {
      heading: 'VALUATION',
      rows: [
        {
          label: 'Market Cap',
          getValue: (t) => cell(t, (f) => fmtCurrencyCompact(f?.marketCap)),
        },
        {
          label: 'P/E',
          getValue: (t) => cell(t, (f) => fmtRatio(f?.pe)),
        },
        {
          label: 'P/S',
          getValue: (t) => cell(t, (f) => fmtRatio(f?.ps)),
        },
        {
          label: 'P/B',
          getValue: (t) => cell(t, (f) => fmtRatio(f?.pb)),
        },
        {
          label: 'EV/EBITDA',
          getValue: (t) => cell(t, (f) => fmtRatio(f?.evEbitda)),
        },
      ],
    },
    {
      heading: 'PROFITABILITY',
      rows: [
        {
          label: 'Gross Margin',
          getValue: (t) => cell(t, (f) => fmtPct(f?.grossMargin)),
        },
        {
          label: 'Operating Margin',
          getValue: (t) => cell(t, (f) => fmtPct(f?.operatingMargin)),
        },
        {
          label: 'Net Margin',
          getValue: (t) => cell(t, (f) => fmtPct(f?.netMargin)),
        },
        {
          label: 'ROE',
          getValue: (t) => cell(t, (f) => fmtPct(f?.roe)),
        },
        {
          label: 'ROA',
          getValue: (t) => cell(t, (f) => fmtPct(f?.roa)),
        },
      ],
    },
    {
      heading: 'FINANCIAL HEALTH',
      rows: [
        {
          label: 'Debt / Equity',
          getValue: (t) => cell(t, (f) => fmtRatio(f?.debtToEquity)),
        },
        {
          label: 'Current Ratio',
          getValue: (t) => cell(t, (f) => fmtRatio(f?.currentRatio)),
        },
        {
          label: 'Altman-Z',
          getValue: (t) => cell(t, (f) => fmtRatio(f?.altmanZ)),
        },
        {
          label: 'Piotroski-F',
          getValue: (t) => cell(t, (f) => {
            if (f?.piotroskiF == null) return '—';
            return String(Math.round(f.piotroskiF));
          }),
        },
      ],
    },
    {
      heading: 'SIZE',
      rows: [
        {
          label: 'Revenue (TTM)',
          getValue: (t) => cell(t, (f) => fmtCurrencyCompact(f?.revenueTTM)),
        },
        {
          label: 'Net Income (TTM)',
          getValue: (t) => cell(t, (f) => fmtCurrencyCompact(f?.netIncomeTTM)),
        },
      ],
    },
    {
      heading: 'CLASSIFICATION',
      rows: [
        {
          label: 'Sector',
          getValue: (t) => cell(t, (f) => f?.sector ?? '—'),
        },
      ],
    },
  ];

  return (
    <Card padding="default">
      <div className="mb-ds-4">
        <span className="text-[11px] text-ink-tertiary uppercase tracking-wider">
          Fundamentals Comparison
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {/* empty label column header */}
              <th className="w-[160px] min-w-[140px] py-ds-2 pr-ds-4 text-left text-xs text-ink-tertiary font-medium border-b border-border-ds-subtle" />
              {series.map((s, idx) => (
                <th
                  key={s.ticker}
                  className="py-ds-2 px-ds-3 text-center border-b border-border-ds-subtle"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ background: SERIES_COLORS[idx % SERIES_COLORS.length] }}
                    />
                    <span className="font-data font-semibold text-sm text-ink-primary">
                      {s.ticker}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <>
                {/* Group sub-header */}
                <tr key={`group-${group.heading}`}>
                  <td
                    colSpan={1 + series.length}
                    className="pt-ds-4 pb-ds-1 text-[10px] font-semibold tracking-[1.2px] uppercase text-gold-muted"
                  >
                    {group.heading}
                  </td>
                </tr>

                {group.rows.map((row) => (
                  <tr
                    key={`${group.heading}-${row.label}`}
                    className="border-b border-border-ds-subtle last:border-b-0 hover:bg-surface-2/40 transition-colors"
                  >
                    <td className="py-ds-2 pr-ds-4 text-xs text-ink-secondary whitespace-nowrap">
                      {row.label}
                    </td>
                    {series.map((s) => {
                      const val   = row.getValue(s.ticker);
                      const color = row.getColor?.(s.ticker) ?? '';
                      return (
                        <td
                          key={s.ticker}
                          className={`py-ds-2 px-ds-3 text-center font-data tabular-nums text-xs ${
                            val === '…'
                              ? 'text-ink-tertiary'
                              : color || 'text-ink-primary'
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-ds-3 text-xs text-ink-muted">
        Fundamental ratios are derived from SEC filings and may lag the latest reported quarter.
        Prices are delayed.
      </p>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StocksCompare() {
  const [input, setInput]   = useState('');
  const [series, setSeries] = useState<SeriesState[]>([]);
  const [range, setRange]   = useState<EtfBarsRange>('1Y');

  // Fundamentals & quotes state
  const [fundamentals, setFundamentals] = useState<Record<string, StockFundamentals | null>>({});
  const [fundLoading, setFundLoading]   = useState<Record<string, boolean>>({});
  const [quotes, setQuotes]             = useState<Record<string, StockQuote>>({});

  // Autocomplete state
  const [dropdownOpen, setDropdownOpen]     = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef   = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Market status
  const { isOpen, lastTradingDayLabel } = useMarketStatus();

  // Debounce: only send query to useSymbolSuggest after 200ms of no typing.
  const [debouncedInput, setDebouncedInput] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedInput(input), 200);
    return () => clearTimeout(id);
  }, [input]);

  const suggestState = useSymbolSuggest(debouncedInput);
  const suggestItems = dropdownOpen
    ? sortByStockFirst(suggestState.data).slice(0, 8)
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

  const atMax = series.length >= MAX_TICKERS;

  // Load fundamentals for a single ticker
  const loadFundamentals = useCallback(async (sym: string) => {
    setFundLoading((prev) => ({ ...prev, [sym]: true }));
    try {
      const data = await fetchStockFundamentals(sym);
      setFundamentals((prev) => ({ ...prev, [sym]: data }));
    } catch {
      // Fundamentals unavailable — keep null, don't block the rest
      setFundamentals((prev) => ({ ...prev, [sym]: null }));
    } finally {
      setFundLoading((prev) => ({ ...prev, [sym]: false }));
    }
  }, []);

  // Refresh quotes for all currently tracked symbols plus a new one
  const refreshQuotes = useCallback(async (syms: string[]) => {
    if (syms.length === 0) return;
    try {
      const data = await fetchStockQuotes(syms);
      setQuotes(data);
    } catch {
      // Quotes unavailable — tolerate silently
    }
  }, []);

  const loadTicker = useCallback(
    async (ticker: string, currentRange: EtfBarsRange) => {
      const sym = ticker.toUpperCase().trim();
      if (!sym) return;
      // Guard: no duplicates, respect max
      let alreadyPresent = false;
      setSeries((prev) => {
        if (prev.some((s) => s.ticker === sym)) { alreadyPresent = true; return prev; }
        if (prev.length >= MAX_TICKERS) return prev;
        return [...prev, { ticker: sym, bars: [], loading: true, error: null }];
      });
      if (alreadyPresent) return;

      // Bars + fundamentals in parallel; quotes refreshed after bars resolve
      const barsPromise = fetchCompareBars(sym, currentRange).then((bars) => {
        setSeries((prev) =>
          prev.map((s) => (s.ticker === sym ? { ...s, bars, loading: false } : s)),
        );
        return bars;
      }).catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Failed to load data.';
        setSeries((prev) =>
          prev.map((s) => (s.ticker === sym ? { ...s, loading: false, error: msg } : s)),
        );
        return [] as OhlcBar[];
      });

      void loadFundamentals(sym);

      // After bars resolve, refresh quotes for all known symbols
      barsPromise.then(() => {
        setSeries((prev) => {
          const syms = prev.map((s) => s.ticker);
          void refreshQuotes(syms);
          return prev;
        });
      });
    },
    [loadFundamentals, refreshQuotes],
  );

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
    // Enter is handled by form onSubmit
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
    // Small delay so mousedown on a suggestion row fires first.
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
    setSeries((prev) => {
      const next = prev.filter((s) => s.ticker !== ticker);
      // Refresh quotes for remaining tickers
      const syms = next.map((s) => s.ticker);
      if (syms.length > 0) void refreshQuotes(syms);
      return next;
    });
    setFundamentals((prev) => {
      const next = { ...prev };
      delete next[ticker];
      return next;
    });
    setFundLoading((prev) => {
      const next = { ...prev };
      delete next[ticker];
      return next;
    });
    setQuotes((prev) => {
      const next = { ...prev };
      delete next[ticker];
      return next;
    });
  }

  async function handleRangeChange(newRange: EtfBarsRange) {
    setRange(newRange);
    const current = series.map((s) => s.ticker);
    setSeries([]);
    for (const t of current) {
      await (async () => {
        setSeries((prev) => [...prev, { ticker: t, bars: [], loading: true, error: null }]);
        try {
          const bars = await fetchCompareBars(t, newRange);
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
    // Quotes don't change with range; fundamentals stay as-is
  }

  const chartData     = buildChartData(series);
  const loadedSeries  = series.filter((s) => s.bars.length > 0 && !s.loading);
  const tickFormatter = makeTickFormatter(range);

  return (
    <div className="mx-auto max-w-[960px] py-ds-7 px-ds-4 flex flex-col gap-ds-5">
      {/* Header */}
      <div className="space-y-ds-1">
        <span className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
          Stock Research
        </span>
        <div className="flex items-center gap-ds-3 flex-wrap">
          <h1 className="text-h2 font-medium text-ink-primary">Compare Stocks</h1>
          {!isOpen && (
            <span className="text-xs text-ink-tertiary border border-border-ds-subtle rounded-[4px] px-2 py-0.5">
              Market Closed — showing {lastTradingDayLabel}
            </span>
          )}
        </div>
        <p className="text-body text-ink-secondary">
          Side-by-side normalized performance and fundamentals. Each price series is rebased to
          0% at the start of the selected range.
        </p>
      </div>

      {/* Ticker input + chips */}
      <Card padding="default">
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
              placeholder={atMax ? 'Max 4 stocks' : 'Add ticker — e.g. AAPL'}
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
                {s.error && (
                  <span className="text-[#E24B4A]" title={s.error}>!</span>
                )}
                {/* Range return % */}
                {s.bars.length > 0 && !s.loading && (() => {
                  const base = s.bars[0].c;
                  const last = s.bars[s.bars.length - 1].c;
                  const pct  = base > 0 ? ((last - base) / base) * 100 : 0;
                  return (
                    <span
                      className={`font-data tabular-nums ${pct >= 0 ? 'text-[#4AD295]' : 'text-[#E24B4A]'}`}
                    >
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
          <div className="flex items-center justify-between mb-ds-4">
            <span className="text-[11px] text-ink-tertiary uppercase tracking-wider">
              Normalized Performance
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

          <div style={{ width: '100%', height: 320 }}>
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
                  tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
                  width={56}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                <Tooltip content={<CompareTooltip range={range} />} />
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

      {/* Fundamentals table — shown once at least 1 ticker is loaded */}
      {series.length >= 1 && (
        <FundamentalsTable
          series={series}
          fundamentals={fundamentals}
          fundLoading={fundLoading}
          quotes={quotes}
          range={range}
        />
      )}

      {/* Empty state */}
      {series.length === 0 && (
        <Card padding="default">
          <p className="text-center text-sm text-ink-tertiary py-8">
            Add at least 2 stock tickers above to compare their performance and fundamentals.
          </p>
        </Card>
      )}
    </div>
  );
}
