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
import { useLocation } from 'react-router-dom';
import { X, Plus, Sparkles } from 'lucide-react';
import { useFinoChat, useRegisterFinoContext } from '@/contexts/FinoChatContext';
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
import { FinoExplains } from '@/components/fino/FinoExplains';

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
  /** Direction for winner highlight: 'high' = higher wins, 'low' = lower wins, null = no highlight */
  better: 'high' | 'low' | null;
  /** Extract the raw numeric value for winner comparison (null = not participates) */
  getNumeric: (ticker: string) => number | null;
}

interface RowGroup {
  heading: string;
  rows: TableRow[];
}

/**
 * Given a metric row and the list of loaded series, return the set of ticker
 * symbols that "win" that metric (may be >1 on a tie). Returns an empty set
 * when: fewer than 2 non-null values exist, or `better` is null.
 */
function computeWinners(
  row: TableRow,
  tickers: string[],
  fundLoading: Record<string, boolean>,
): Set<string> {
  if (row.better === null) return new Set();

  // Collect valid (non-loading, non-null) numeric values
  const pairs: { ticker: string; val: number }[] = [];
  for (const t of tickers) {
    if (fundLoading[t]) continue; // still loading — skip
    const v = row.getNumeric(t);
    if (v == null || !Number.isFinite(v)) continue;
    // For LOWER-is-better metrics, reject non-positive values (e.g. negative P/E)
    if (row.better === 'low' && v <= 0) continue;
    pairs.push({ ticker: t, val: v });
  }

  if (pairs.length < 2) return new Set();

  const best = row.better === 'high'
    ? Math.max(...pairs.map((p) => p.val))
    : Math.min(...pairs.map((p) => p.val));

  return new Set(pairs.filter((p) => p.val === best).map((p) => p.ticker));
}

function FundamentalsTable({
  series,
  fundamentals,
  fundLoading,
  quotes,
  range,
}: FundamentalsTableProps) {
  const location = useLocation();
  const { open: openFino } = useFinoChat();

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

  const tickers = series.map((s) => s.ticker);
  // Tickers with fundamentals fully loaded (not still loading)
  const loadedTickers = tickers.filter((t) => !fundLoading[t]);

  const groups: RowGroup[] = [
    {
      heading: 'PERFORMANCE & PRICE',
      rows: [
        {
          label: 'Last Price',
          getValue: (t) => fmtPrice(quotes[t]?.price),
          better: null,
          getNumeric: () => null,
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
          better: 'high',
          getNumeric: (t) => {
            const v = quotes[t]?.changePercent;
            return v != null && Number.isFinite(v) ? v : null;
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
          better: 'high',
          getNumeric: (t) => rangeReturnNum(t),
        },
        {
          label: '52W High',
          getValue: (t) => fmtPrice(quotes[t]?.high52w),
          better: null,
          getNumeric: () => null,
        },
        {
          label: '52W Low',
          getValue: (t) => fmtPrice(quotes[t]?.low52w),
          better: null,
          getNumeric: () => null,
        },
        {
          label: 'Volume',
          getValue: (t) => fmtInt(quotes[t]?.volume),
          better: null,
          getNumeric: () => null,
        },
      ],
    },
    {
      heading: 'VALUATION',
      rows: [
        {
          label: 'Market Cap',
          getValue: (t) => cell(t, (f) => fmtCurrencyCompact(f?.marketCap)),
          better: null,
          getNumeric: () => null,
        },
        {
          label: 'P/E',
          getValue: (t) => cell(t, (f) => fmtRatio(f?.pe)),
          better: 'low',
          getNumeric: (t) => {
            if (fundLoading[t]) return null;
            const v = fundamentals[t]?.pe;
            return v != null && Number.isFinite(v) ? v : null;
          },
        },
        {
          label: 'P/S',
          getValue: (t) => cell(t, (f) => fmtRatio(f?.ps)),
          better: 'low',
          getNumeric: (t) => {
            if (fundLoading[t]) return null;
            const v = fundamentals[t]?.ps;
            return v != null && Number.isFinite(v) ? v : null;
          },
        },
        {
          label: 'P/B',
          getValue: (t) => cell(t, (f) => fmtRatio(f?.pb)),
          better: 'low',
          getNumeric: (t) => {
            if (fundLoading[t]) return null;
            const v = fundamentals[t]?.pb;
            return v != null && Number.isFinite(v) ? v : null;
          },
        },
        {
          label: 'EV/EBITDA',
          getValue: (t) => cell(t, (f) => fmtRatio(f?.evEbitda)),
          better: 'low',
          getNumeric: (t) => {
            if (fundLoading[t]) return null;
            const v = fundamentals[t]?.evEbitda;
            return v != null && Number.isFinite(v) ? v : null;
          },
        },
      ],
    },
    {
      heading: 'PROFITABILITY',
      rows: [
        {
          label: 'Gross Margin',
          getValue: (t) => cell(t, (f) => fmtPct(f?.grossMargin)),
          better: 'high',
          getNumeric: (t) => {
            if (fundLoading[t]) return null;
            const v = fundamentals[t]?.grossMargin;
            return v != null && Number.isFinite(v) ? v : null;
          },
        },
        {
          label: 'Operating Margin',
          getValue: (t) => cell(t, (f) => fmtPct(f?.operatingMargin)),
          better: 'high',
          getNumeric: (t) => {
            if (fundLoading[t]) return null;
            const v = fundamentals[t]?.operatingMargin;
            return v != null && Number.isFinite(v) ? v : null;
          },
        },
        {
          label: 'Net Margin',
          getValue: (t) => cell(t, (f) => fmtPct(f?.netMargin)),
          better: 'high',
          getNumeric: (t) => {
            if (fundLoading[t]) return null;
            const v = fundamentals[t]?.netMargin;
            return v != null && Number.isFinite(v) ? v : null;
          },
        },
        {
          label: 'ROE',
          getValue: (t) => cell(t, (f) => fmtPct(f?.roe)),
          better: 'high',
          getNumeric: (t) => {
            if (fundLoading[t]) return null;
            const v = fundamentals[t]?.roe;
            return v != null && Number.isFinite(v) ? v : null;
          },
        },
        {
          label: 'ROA',
          getValue: (t) => cell(t, (f) => fmtPct(f?.roa)),
          better: 'high',
          getNumeric: (t) => {
            if (fundLoading[t]) return null;
            const v = fundamentals[t]?.roa;
            return v != null && Number.isFinite(v) ? v : null;
          },
        },
      ],
    },
    {
      heading: 'FINANCIAL HEALTH',
      rows: [
        {
          label: 'Debt / Equity',
          getValue: (t) => cell(t, (f) => fmtRatio(f?.debtToEquity)),
          better: 'low',
          getNumeric: (t) => {
            if (fundLoading[t]) return null;
            const v = fundamentals[t]?.debtToEquity;
            return v != null && Number.isFinite(v) ? v : null;
          },
        },
        {
          label: 'Current Ratio',
          getValue: (t) => cell(t, (f) => fmtRatio(f?.currentRatio)),
          better: 'high',
          getNumeric: (t) => {
            if (fundLoading[t]) return null;
            const v = fundamentals[t]?.currentRatio;
            return v != null && Number.isFinite(v) ? v : null;
          },
        },
        {
          label: 'Altman-Z',
          getValue: (t) => cell(t, (f) => fmtRatio(f?.altmanZ)),
          better: 'high',
          getNumeric: (t) => {
            if (fundLoading[t]) return null;
            const v = fundamentals[t]?.altmanZ;
            return v != null && Number.isFinite(v) ? v : null;
          },
        },
        {
          label: 'Piotroski-F',
          getValue: (t) => cell(t, (f) => {
            if (f?.piotroskiF == null) return '—';
            return String(Math.round(f.piotroskiF));
          }),
          better: 'high',
          getNumeric: (t) => {
            if (fundLoading[t]) return null;
            const v = fundamentals[t]?.piotroskiF;
            return v != null && Number.isFinite(v) ? v : null;
          },
        },
      ],
    },
    {
      heading: 'SIZE',
      rows: [
        {
          label: 'Revenue (TTM)',
          getValue: (t) => cell(t, (f) => fmtCurrencyCompact(f?.revenueTTM)),
          better: 'high',
          getNumeric: (t) => {
            if (fundLoading[t]) return null;
            const v = fundamentals[t]?.revenueTTM;
            return v != null && Number.isFinite(v) ? v : null;
          },
        },
        {
          label: 'Net Income (TTM)',
          getValue: (t) => cell(t, (f) => fmtCurrencyCompact(f?.netIncomeTTM)),
          better: 'high',
          getNumeric: (t) => {
            if (fundLoading[t]) return null;
            const v = fundamentals[t]?.netIncomeTTM;
            return v != null && Number.isFinite(v) ? v : null;
          },
        },
      ],
    },
    {
      heading: 'CLASSIFICATION',
      rows: [
        {
          label: 'Sector',
          getValue: (t) => cell(t, (f) => f?.sector ?? '—'),
          better: null,
          getNumeric: () => null,
        },
      ],
    },
  ];

  // ── Ask Fino handler ────────────────────────────────────────────────────────
  const canAskFino = loadedTickers.length >= 2;

  function handleAskFino() {
    const fmt = (v: number | null | undefined, fn: (x: number) => string): string =>
      v != null && Number.isFinite(v) ? fn(v) : '—';

    const lines = loadedTickers.map((t) => {
      const f = fundamentals[t] ?? null;
      const q = quotes[t];
      return [
        `${t}:`,
        `Price ${fmt(q?.price, (v) => `$${v.toFixed(2)}`)}`,
        `1D ${fmt(q?.changePercent, (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`)}`,
        `MktCap ${fmt(f?.marketCap, fmtCurrencyCompact)}`,
        `P/E ${fmt(f?.pe, (v) => v.toFixed(2))}`,
        `P/S ${fmt(f?.ps, (v) => v.toFixed(2))}`,
        `P/B ${fmt(f?.pb, (v) => v.toFixed(2))}`,
        `EV/EBITDA ${fmt(f?.evEbitda, (v) => v.toFixed(2))}`,
        `GrossM ${fmt(f?.grossMargin, (v) => `${v.toFixed(1)}%`)}`,
        `OpM ${fmt(f?.operatingMargin, (v) => `${v.toFixed(1)}%`)}`,
        `NetM ${fmt(f?.netMargin, (v) => `${v.toFixed(1)}%`)}`,
        `ROE ${fmt(f?.roe, (v) => `${v.toFixed(1)}%`)}`,
        `ROA ${fmt(f?.roa, (v) => `${v.toFixed(1)}%`)}`,
        `D/E ${fmt(f?.debtToEquity, (v) => v.toFixed(2))}`,
        `CurrentRatio ${fmt(f?.currentRatio, (v) => v.toFixed(2))}`,
        `AltmanZ ${fmt(f?.altmanZ, (v) => v.toFixed(2))}`,
        `PiotroskiF ${f?.piotroskiF != null ? Math.round(f.piotroskiF) : '—'}`,
        `Revenue ${fmt(f?.revenueTTM, fmtCurrencyCompact)}`,
        `NetIncome ${fmt(f?.netIncomeTTM, fmtCurrencyCompact)}`,
        `Sector ${f?.sector ?? '—'}`,
      ].join(', ');
    });

    const query = [
      `Deep fundamental comparison of ${loadedTickers.join(', ')}. Data:`,
      ...lines,
      '',
      'Provide a rigorous analyst breakdown:',
      '(1) Valuation — who is cheapest/most expensive on P/E, P/S, P/B, EV/EBITDA and why;',
      '(2) Profitability & quality — gross margin, operating margin, net margin, ROE, ROA;',
      '(3) Financial health — leverage (D/E), liquidity (current ratio), Altman-Z, Piotroski-F score;',
      '(4) Scale & growth — revenue, net income;',
      '(5) For EACH company: key strengths, key weaknesses, main risks;',
      '(6) Bottom line — which is the highest-quality business, which is the most attractively valued, and the key trade-offs. Be specific and cite the numbers.',
    ].join('\n');

    openFino({ path: location.pathname, label: 'Compare Stocks', query });
  }

  // Register comparison data as Fino page context while this table is mounted
  useRegisterFinoContext(
    loadedTickers.length >= 2
      ? {
          kind: 'fundamentals-comparison',
          tickers: loadedTickers,
          metrics: Object.fromEntries(
            loadedTickers.map((t) => [t, { fundamentals: fundamentals[t], quote: quotes[t] }]),
          ),
        }
      : null,
  );

  return (
    <Card padding="default">
      {/* Header row: title on left, Ask Fino button on right */}
      <div className="flex items-center justify-between mb-ds-4">
        <span className="text-[11px] text-ink-tertiary uppercase tracking-wider">
          Fundamentals Comparison
        </span>
        {canAskFino && (
          <button
            type="button"
            onClick={handleAskFino}
            className="flex items-center gap-1.5 rounded-[8px] px-ds-3 py-1.5 text-xs font-semibold text-ink-on-gold transition-opacity hover:opacity-90 active:opacity-75"
            style={{
              background: 'var(--gradient-gold)',
              boxShadow: 'var(--glow-gold-resting)',
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ask Fino
          </button>
        )}
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

                {group.rows.map((row) => {
                  const winners = computeWinners(row, tickers, fundLoading);
                  return (
                    <tr
                      key={`${group.heading}-${row.label}`}
                      className="border-b border-border-ds-subtle last:border-b-0 hover:bg-surface-2/40 transition-colors"
                    >
                      <td className="py-ds-2 pr-ds-4 text-xs text-ink-secondary whitespace-nowrap">
                        {row.label}
                      </td>
                      {series.map((s) => {
                        const val      = row.getValue(s.ticker);
                        const color    = row.getColor?.(s.ticker) ?? '';
                        const isWinner = winners.has(s.ticker);
                        return (
                          <td
                            key={s.ticker}
                            className={`py-ds-2 px-ds-3 text-center font-data tabular-nums text-xs ${
                              val === '…'
                                ? 'text-ink-tertiary'
                                : color || 'text-ink-primary'
                            }`}
                          >
                            {isWinner ? (
                              <span className="inline-block rounded-md ring-1 ring-[#C9A646]/55 px-1.5 py-0.5">
                                {val}
                              </span>
                            ) : (
                              val
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
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
      <div className="relative space-y-ds-1">
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
        <FinoExplains
          title="What is Compare?"
          className="mt-ds-3 ml-auto w-fit"
        >
          Put up to four stocks head-to-head. Add tickers, choose a date range, and see their
          performance normalized on one chart alongside key fundamentals — so you can tell at a
          glance which one came out ahead.
        </FinoExplains>
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
