// src/pages/app/ai/copilot/components/OpportunityShowcase.tsx
// Danelfin-style per-ticker analysis showcase replacing the flat opportunities table.
// Layout: A. Ticker Carousel → B. Detail Header → C. Stats Band → D. Main Grid → E. Footer

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  DollarSign,
  Flame,
  Gem,
  Info,
  Landmark,
  Shield,
  Sun,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TickerLogo } from './TickerLogo';
import type { Opportunity, ArgPoint, CatalystDetailed } from '../utils/opportunityMapper';
import { fetchCompareBars } from '@/services/etf-analyzer.api';
import type { EtfBarsRange } from '@/services/etf-analyzer.api';
import { useMarketStatus } from '@/lib/marketStatus';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BAR_RANGES: EtfBarsRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y'];

const HORIZON_DOT: Record<string, string> = {
  short: 'bg-[#4ade80]',
  medium: 'bg-[#f59e0b]',
  long: 'bg-[#6366f1]',
};

const RISK_DOT: Record<string, string> = {
  Low: 'bg-[#4ade80]',
  Medium: 'bg-[#f59e0b]',
  High: 'bg-red-500',
};

const BULL_ICONS: LucideIcon[] = [TrendingUp, BarChart3, Shield, Sun, Gem, TrendingUp, BarChart3];
const BEAR_ICONS: LucideIcon[] = [AlertTriangle, TrendingDown, Landmark, DollarSign, Flame, AlertTriangle, TrendingDown];

const SCORE_LABEL: (score: number) => string = (score) => {
  if (score >= 90) return 'Strong Opportunity';
  if (score >= 80) return 'Opportunity';
  if (score >= 70) return 'Constructive';
  return 'Speculative';
};

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function fmtMarketCap(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString('en')}`;
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '—';
  return `$${n.toFixed(2)}`;
}

function fmtChange(chp: number | null | undefined): { text: string; positive: boolean } {
  if (chp == null) return { text: '—', positive: false };
  const sign = chp >= 0 ? '+' : '';
  return { text: `${sign}${chp.toFixed(2)}%`, positive: chp >= 0 };
}

// Number typed as string (ms epoch) or actual number — normalise to ms number.
function barTimestamp(t: string | number): number {
  if (typeof t === 'number') return t;
  const parsed = Number(t);
  // If it's already a large epoch-ms number
  if (!Number.isNaN(parsed) && parsed > 1e12) return parsed;
  // Otherwise try ISO date string → convert to ms
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function barDate(t: string | number, range: EtfBarsRange): string {
  const ms = barTimestamp(t);
  if (!ms) return '';
  const d = new Date(ms);
  if (range === '1D') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  if (range === '1W' || range === '1M') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// ---------------------------------------------------------------------------
// Watchlist note: the existing WatchlistTable (WatchlistTable.tsx) stores items
// in localStorage as TradingView-prefixed symbols (e.g. "AMEX:SPY"), tightly
// coupled to TradingView widgets. Wiring Add-to-Watchlist here would require
// either (a) duplicating that localStorage logic with a different key format,
// or (b) a refactor of the watchlist service to expose a reusable API.
// Neither is in scope for this task. The "Add to Watchlist" button is OMITTED
// intentionally — see spec note "If it's non-trivial, OMIT".
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Quote fetcher — /api/quotes (the plain ungated Yahoo path used by WatchlistTable)
// ---------------------------------------------------------------------------

interface QuoteEntry {
  price: number | null;
  ch: number | null;
  chp: number | null;
}

async function fetchBatchQuotes(symbols: string[]): Promise<Record<string, QuoteEntry>> {
  if (!symbols.length) return {};
  try {
    // /api/quotes is behind priceGate (403 price_data_gated for customers);
    // watchlist-quotes is the ungated Yahoo v8 path for customer surfaces.
    const r = await fetch(
      '/api/market-data/watchlist-quotes?symbols=' + symbols.map(encodeURIComponent).join(',')
    );
    if (!r.ok) return {};
    const data: unknown = await r.json();
    const quotes = (data as { quotes?: unknown })?.quotes;
    if (!Array.isArray(quotes)) return {};
    const map: Record<string, QuoteEntry> = {};
    for (const q of quotes as Array<{ symbol?: string; price?: number | null; change?: number | null; changePercent?: number | null }>) {
      if (!q?.symbol) continue;
      map[q.symbol.toUpperCase()] = {
        price: typeof q.price === 'number' ? q.price : null,
        ch: typeof q.change === 'number' ? q.change : null,
        chp: typeof q.changePercent === 'number' ? q.changePercent : null,
      };
    }
    return map;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Company profile fetcher — GET /api/company/profile?symbol=
// Only marketCap is used from this endpoint; everything else shows '—'.
// ---------------------------------------------------------------------------

interface ProfileData {
  marketCap?: number | null;
  name?: string | null;
}

async function fetchCompanyProfile(symbol: string): Promise<ProfileData | null> {
  try {
    const r = await fetch(`/api/company/profile?symbol=${encodeURIComponent(symbol)}`, { credentials: 'include' });
    if (!r.ok) return null;
    const j: unknown = await r.json();
    if (!j || typeof j !== 'object') return null;
    // Two shapes seen in the codebase: j.data.marketCap or j.marketCap
    const data = (j as Record<string, unknown>).data ?? j;
    return {
      marketCap: typeof (data as Record<string, unknown>).marketCap === 'number'
        ? (data as Record<string, unknown>).marketCap as number
        : null,
      name: typeof (data as Record<string, unknown>).name === 'string'
        ? (data as Record<string, unknown>).name as string
        : null,
    };
  } catch {
    return null;
  }
}

// Screener endpoint investigation result (reported in task output):
// GET /api/stocks/screener queries Supabase stock_screener_view using grouped-daily
// Polygon data. The view exposes pe_ratio, beta, and dividend_yield columns.
// However, the endpoint is designed for bulk/filter queries (min/max params),
// not single-ticker lookups — there is no ?ticker= param. Wiring a single-ticker
// call would require adding a new server route. To avoid scope creep (the task
// says "if not show '—'"), P/E, Beta, and Dividend Yield show '—' unless a
// future route is added.

// ---------------------------------------------------------------------------
// A. Ticker Carousel
// ---------------------------------------------------------------------------

interface CarouselCardProps {
  opp: Opportunity;
  selected: boolean;
  onClick: () => void;
}

function CarouselCard({ opp, selected, onClick }: CarouselCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex min-w-[148px] flex-shrink-0 cursor-pointer items-center gap-2.5 rounded-[8px] border p-3 text-left transition-all',
        selected
          ? 'border-gold-primary/60 bg-gold-primary/[0.06] shadow-[0_0_16px_rgba(201,166,70,0.12)]'
          : 'border-white/8 bg-[#0a0a0a] hover:border-white/16',
      ].join(' ')}
    >
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[4px] border border-white/8 bg-[#0d0d0d]">
        <TickerLogo ticker={opp.ticker} size={24} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[13px] font-semibold leading-tight text-ink-primary">{opp.ticker}</p>
        <p className="mt-0.5 truncate text-[10px] text-ink-tertiary">{opp.name}</p>
      </div>
      {/* Mini score ring */}
      <MiniScoreRing score={opp.score} size={32} />
    </button>
  );
}

function MiniScoreRing({ score, size }: { score: number; size: number }) {
  const deg = score * 3.6;
  return (
    <div
      className="relative flex-none rounded-full p-[3px]"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(#4ade80 0 ${deg}deg, rgba(255,255,255,0.08) ${deg}deg 360deg)`,
      }}
    >
      <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0a0a0a]">
        <span className="font-mono text-[10px] font-bold text-[#bff26f]">{score}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// C. Stats Band helpers
// ---------------------------------------------------------------------------

function StatCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.08em] text-ink-tertiary">{label}</p>
      <div>{children}</div>
    </div>
  );
}

function ScoreRingLarge({ score }: { score: number }) {
  const deg = score * 3.6;
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative flex-none rounded-full p-[5px] shadow-[0_0_20px_rgba(74,222,128,0.18)]"
        style={{
          width: 64,
          height: 64,
          background: `conic-gradient(#4ade80 0 ${deg}deg, rgba(255,255,255,0.08) ${deg}deg 360deg)`,
        }}
      >
        <div className="flex h-full w-full items-center justify-center rounded-full bg-[#070707]">
          <span className="font-mono text-xl font-bold text-[#bff26f]">{score}</span>
        </div>
      </div>
      <p className="text-[12px] font-medium text-[#4ade80]">{SCORE_LABEL(score)}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// D2. Price chart (AreaChart via recharts)
// ---------------------------------------------------------------------------

interface PriceChartProps {
  ticker: string;
  range: EtfBarsRange;
}

function PriceChart({ ticker, range }: PriceChartProps) {
  const { data: bars, isLoading } = useQuery({
    queryKey: ['opp-bars', ticker, range],
    queryFn: () => fetchCompareBars(ticker, range),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <div className="h-[110px] animate-pulse rounded-[4px] bg-white/[0.04]" />;
  }

  if (!bars || bars.length === 0) {
    return (
      <div className="flex h-[110px] items-center justify-center text-[11px] text-ink-tertiary">
        No chart data
      </div>
    );
  }

  const chartData = bars.map((b) => ({
    t: barTimestamp(b.t),
    c: b.c,
    label: barDate(b.t, range),
  }));

  const prices = chartData.map((d) => d.c);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const isUp = prices[prices.length - 1] >= prices[0];
  const lineColor = isUp ? '#4ade80' : '#e24b4a';
  const gradId = `opp-area-${ticker}-${range}`.replace(/[^a-zA-Z0-9]/g, '-');

  return (
    <ResponsiveContainer width="100%" height={110}>
      <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" hide />
        <YAxis domain={[minPrice * 0.995, maxPrice * 1.005]} hide />
        <RechartsTooltip
          contentStyle={{ background: '#0a0908', border: '1px solid rgba(201,166,70,0.25)', borderRadius: 6, fontSize: 11 }}
          labelStyle={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}
          itemStyle={{ color: lineColor }}
          formatter={(val: unknown) => [`$${Number(val).toFixed(2)}`, 'Price']}
        />
        <Area
          type="monotone"
          dataKey="c"
          stroke={lineColor}
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          dot={false}
          activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// D2. Key Metrics card
// ---------------------------------------------------------------------------

interface KeyMetricsProps {
  ticker: string;
  barsRange: EtfBarsRange;
}

function KeyMetricsCard({ ticker, barsRange }: KeyMetricsProps) {
  const { data: profile } = useQuery({
    queryKey: ['opp-profile', ticker],
    queryFn: () => fetchCompanyProfile(ticker),
    staleTime: 60 * 60 * 1000, // 1h — profile data is stable
  });

  const { data: barsForRange } = useQuery({
    queryKey: ['opp-bars', ticker, '1Y'],
    queryFn: () => fetchCompareBars(ticker, '1Y'),
    staleTime: 5 * 60 * 1000,
  });

  // 52W range from 1Y bars (min low / max high)
  const range52w = React.useMemo(() => {
    if (!barsForRange || barsForRange.length === 0) return null;
    const lows = barsForRange.map((b) => b.l).filter((v) => typeof v === 'number' && v > 0);
    const highs = barsForRange.map((b) => b.h).filter((v) => typeof v === 'number' && v > 0);
    if (!lows.length || !highs.length) return null;
    return { low: Math.min(...lows), high: Math.max(...highs) };
  }, [barsForRange]);

  // OhlcBar interface has a 'v' (volume) field — check if bars carry real volume.
  // Note: the /api/etf/compare/bars (Yahoo) endpoint is confirmed to return bars
  // with v field typed in OhlcBar. If v is 0 for all bars, we show '—'.
  const avgVolume = React.useMemo(() => {
    if (!barsForRange || barsForRange.length === 0) return null;
    const vols = barsForRange.map((b) => b.v).filter((v) => typeof v === 'number' && v > 0);
    if (vols.length === 0) return null;
    return vols.reduce((a, b) => a + b, 0) / vols.length;
  }, [barsForRange]);

  function fmtVol(v: number | null): string {
    if (v == null) return '—';
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return v.toFixed(0);
  }

  const rows: { label: string; value: string }[] = [
    { label: 'Market Cap', value: fmtMarketCap(profile?.marketCap) },
    {
      label: '52W Range',
      value: range52w ? `$${range52w.low.toFixed(2)} – $${range52w.high.toFixed(2)}` : '—',
    },
    // P/E, Beta, Dividend Yield: screener endpoint does not support single-ticker lookup.
    // Show '—' until a dedicated route is available.
    { label: 'P/E Ratio', value: '—' },
    { label: 'Beta', value: '—' },
    { label: 'Dividend Yield', value: '—' },
    { label: 'Avg Volume', value: fmtVol(avgVolume) },
  ];

  return (
    <div className="rounded-[8px] border border-white/8 bg-[#080808] p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-tertiary">
        Key Metrics
      </p>
      <div className="space-y-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-ink-tertiary">{label}</span>
            <span className="font-mono text-[12px] text-ink-primary">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// D3. Bull / Bear argument card
// ---------------------------------------------------------------------------

interface ArgCardProps {
  title: string;
  toneClass: string;
  borderClass: string;
  bgClass: string;
  points: ArgPoint[];
  emptyText: string;
  icons: LucideIcon[];
  iconToneClass: string;
}

function ArgCard({ title, toneClass, borderClass, bgClass, points, emptyText, icons, iconToneClass }: ArgCardProps) {
  return (
    <div className={`rounded-[8px] border ${borderClass} ${bgClass} p-4`}>
      <p className={`mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] ${toneClass}`}>
        {title}
      </p>
      {points.length === 0 ? (
        <p className="text-[11px] italic text-ink-tertiary">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {points.map((pt, i) => {
            const Icon = icons[i % icons.length];
            return (
              <li key={i} className="flex gap-2.5">
                <div className={`flex h-7 w-7 flex-none items-center justify-center rounded-[5px] border border-white/8 ${iconToneClass}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold leading-tight text-ink-primary">{pt.title}</p>
                  <p className="mt-0.5 text-[11px] leading-[1.45] text-ink-secondary">{pt.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// D5. AI Outlook donut (SVG conic)
// ---------------------------------------------------------------------------

interface OutlookDonutProps {
  bullish: number;
  neutral: number;
  bearish: number;
}

function OutlookDonut({ bullish, neutral, bearish }: OutlookDonutProps) {
  const total = bullish + neutral + bearish || 100;
  const bullDeg = (bullish / total) * 360;
  const neutDeg = (neutral / total) * 360;

  return (
    <div
      className="relative flex-none rounded-full"
      style={{
        width: 80,
        height: 80,
        background: `conic-gradient(
          #16a34a 0 ${bullDeg}deg,
          #f59e0b ${bullDeg}deg ${bullDeg + neutDeg}deg,
          #e24b4a ${bullDeg + neutDeg}deg 360deg
        )`,
      }}
    >
      {/* Donut hole */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#080808]"
        style={{ width: 52, height: 52 }}
      />
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[13px] font-bold text-[#16a34a]">{bullish}%</span>
        <span className="text-[8px] text-ink-tertiary">Bullish</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// D5. Right column stacked cards
// ---------------------------------------------------------------------------

interface RightColumnProps {
  opp: Opportunity;
}

function RightColumn({ opp }: RightColumnProps) {
  const { bullish, neutral, bearish, summary } = opp.outlook;

  return (
    <div className="flex flex-col gap-3">
      {/* AI Outlook card */}
      <div className="rounded-[8px] border border-white/8 bg-[#080808] p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-tertiary">
          AI Outlook Summary
        </p>
        <div className="flex items-center gap-4">
          <OutlookDonut bullish={bullish} neutral={neutral} bearish={bearish} />
          <div className="space-y-1.5">
            {(
              [
                { label: 'Bullish', value: bullish, color: 'bg-[#16a34a]', text: 'text-[#16a34a]' },
                { label: 'Neutral', value: neutral, color: 'bg-[#f59e0b]', text: 'text-[#f59e0b]' },
                { label: 'Bearish', value: bearish, color: 'bg-red-500', text: 'text-red-400' },
              ] as const
            ).map(({ label, value, color, text }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`h-2 w-2 flex-none rounded-full ${color}`} />
                <span className="text-[11px] text-ink-secondary">{label}</span>
                <span className={`ml-auto font-mono text-[11px] font-medium ${text}`}>{value}%</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-[1.5] text-ink-secondary">{summary}</p>
      </div>

      {/* Catalysts card */}
      {opp.catalystsDetailed.length > 0 && (
        <div className="rounded-[8px] border border-white/8 bg-[#080808] p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-tertiary">
            Catalysts
          </p>
          <ul className="space-y-2">
            {opp.catalystsDetailed.map((cat, i) => (
              <li key={i} className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="mt-[5px] h-1.5 w-1.5 flex-none rounded-full bg-gold-primary/70" />
                  <span className="text-[12px] leading-[1.45] text-ink-secondary">{cat.text}</span>
                </div>
                {cat.impact && <ImpactBadge impact={cat.impact} />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Related Themes — hidden when empty */}
      {opp.themes.length > 0 && (
        <div className="rounded-[8px] border border-white/8 bg-[#080808] p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-tertiary">
            Related Themes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {opp.themes.map((theme) => (
              <span
                key={theme}
                className="rounded-full bg-white/[0.04] px-2 py-1 text-[11px] text-ink-secondary"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Why for you */}
      {opp.whyForYou && (
        <p className="px-1 text-[11px] italic text-gold-primary/70">
          Why for you: {opp.whyForYou}
        </p>
      )}
    </div>
  );
}

function ImpactBadge({ impact }: { impact: 'High' | 'Medium' | 'Low' }) {
  if (impact === 'High') {
    return (
      <span className="flex-none rounded-[4px] bg-gold-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-gold-primary">
        High Impact
      </span>
    );
  }
  if (impact === 'Medium') {
    return (
      <span className="flex-none rounded-[4px] bg-[#f59e0b]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#f59e0b]">
        Medium Impact
      </span>
    );
  }
  return (
    <span className="flex-none rounded-[4px] bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-ink-tertiary">
      Low Impact
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main OpportunityShowcase export
// ---------------------------------------------------------------------------

interface Props {
  opportunities: Opportunity[];
}

export function OpportunityShowcase({ opportunities }: Props) {
  const [selectedTicker, setSelectedTicker] = useState<string>(
    opportunities[0]?.ticker ?? '',
  );
  const [chartRange, setChartRange] = useState<EtfBarsRange>('3M');
  const scrollRef = useRef<HTMLDivElement>(null);
  const marketStatus = useMarketStatus();

  // If the opportunities list changes and selected ticker no longer exists, reset
  useEffect(() => {
    if (opportunities.length > 0 && !opportunities.find((o) => o.ticker === selectedTicker)) {
      setSelectedTicker(opportunities[0].ticker);
    }
  }, [opportunities, selectedTicker]);

  const opp = opportunities.find((o) => o.ticker === selectedTicker) ?? opportunities[0];

  // Batch-fetch quotes for all opportunity tickers (single query key = all tickers)
  const allTickers = opportunities.map((o) => o.ticker);
  const { data: quoteMap = {} } = useQuery<Record<string, { price: number | null; ch: number | null; chp: number | null }>>({
    queryKey: ['opp-batch-quotes', allTickers.sort().join(',')],
    queryFn: () => fetchBatchQuotes(allTickers),
    staleTime: marketStatus.isOpen ? 30_000 : 5 * 60 * 1000,
    refetchInterval: marketStatus.isOpen ? 30_000 : false,
    refetchIntervalInBackground: false,
  });

  const scrollRight = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  }, []);

  // Empty state
  if (opportunities.length === 0) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-[8px] border border-gold-primary/16 bg-[#050505]/96 p-8 text-center">
        <div>
          <p className="text-[14px] font-medium text-ink-primary">No live opportunities right now.</p>
          <p className="mt-1 text-[12px] text-ink-tertiary">
            AI-ranked ideas appear here after the next brief.
          </p>
        </div>
      </div>
    );
  }

  if (!opp) return null;

  const quote = quoteMap[opp.ticker.toUpperCase()];
  const changeInfo = fmtChange(quote?.chp);

  return (
    <div className="space-y-3">
      {/* ── A. Ticker Carousel ── */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
          style={{ scrollbarWidth: 'thin' }}
        >
          {opportunities.map((o) => (
            <CarouselCard
              key={o.ticker}
              opp={o}
              selected={o.ticker === selectedTicker}
              onClick={() => setSelectedTicker(o.ticker)}
            />
          ))}
        </div>
        {/* Scroll chevron */}
        {opportunities.length > 4 && (
          <button
            type="button"
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-[#141414] border border-white/12 text-ink-tertiary hover:text-ink-primary transition-colors shadow"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── B. Detail Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-gold-primary/14 bg-[#070605]/95 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[6px] border border-white/8 bg-[#0d0d0d]">
            <TickerLogo ticker={opp.ticker} size={32} />
          </div>
          <div>
            <h2 className="font-mono text-2xl font-semibold leading-tight text-ink-primary">
              {opp.ticker}
            </h2>
            <p className="text-[12px] text-ink-secondary">{opp.name}</p>
          </div>
          {opp.sector && (
            <span className="rounded-[4px] bg-white/[0.04] px-2 py-1 text-[10px] text-ink-tertiary">
              {opp.sector}
            </span>
          )}
        </div>
        {/* View Analysis link — no fake watchlist button (see note above) */}
        <Link
          to={`/app/ai/stock-analyzer?ticker=${encodeURIComponent(opp.ticker)}`}
          className="flex h-9 items-center gap-2 rounded-[6px] border border-gold-primary/20 bg-gold-primary/[0.075] px-4 text-[12px] font-semibold text-gold-primary hover:bg-gold-primary/[0.12] transition"
        >
          View Full Analysis
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── C. Stats Band ── */}
      <div className="overflow-hidden rounded-[8px] border border-gold-primary/14 bg-[#070605]/95">
        <div className="grid grid-cols-2 divide-x divide-gold-primary/10 sm:grid-cols-5">
          {/* 1. AI Score */}
          <StatCell label="AI Score">
            <ScoreRingLarge score={opp.score} />
          </StatCell>

          {/* 2. Upside Potential */}
          <StatCell label="Upside Potential">
            <p className="font-mono text-[18px] font-semibold text-[#4ade80]">{opp.upside}</p>
            <div className="mt-1.5 flex gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  className={`h-4 w-2 rounded-[2px] ${i < opp.bars ? 'bg-[#31bd72]' : 'bg-white/[0.07]'}`}
                />
              ))}
            </div>
          </StatCell>

          {/* 3. Timeframe */}
          <StatCell label="Timeframe">
            <div className="flex items-center gap-1.5">
              {opp.timeHorizon && (
                <span className={`h-2 w-2 flex-none rounded-full ${HORIZON_DOT[opp.timeHorizon] ?? 'bg-white/40'}`} />
              )}
              <p className="text-[13px] text-ink-primary">{opp.timeframe}</p>
            </div>
          </StatCell>

          {/* 4. Confidence */}
          <StatCell label="Confidence">
            <p className="text-[13px] font-medium text-ink-primary">{opp.confidence}</p>
          </StatCell>

          {/* 5. Risk Level */}
          <StatCell label="Risk Level">
            <div className="flex items-center gap-1.5">
              {opp.riskLevel && (
                <span className={`h-2 w-2 flex-none rounded-full ${RISK_DOT[opp.riskLevel]}`} />
              )}
              <p className="text-[13px] text-ink-primary">{opp.riskLevel ?? '—'}</p>
            </div>
          </StatCell>
        </div>
      </div>

      {/* ── D. Main Grid ── */}
      <div className="grid gap-3 xl:grid-cols-[280px_1fr_1fr_240px]">
        {/* D1 + D2: Left column — Price chart + Key Metrics */}
        <div className="flex flex-col gap-3">
          {/* D1. Price & Performance card */}
          <div className="rounded-[8px] border border-white/8 bg-[#080808] p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-tertiary">
              Price & Performance
            </p>

            {/* Price headline */}
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-semibold text-ink-primary">
                {fmtPrice(quote?.price)}
              </span>
              {quote?.chp != null && (
                <span
                  className={`font-mono text-[13px] ${changeInfo.positive ? 'text-[#4ade80]' : 'text-red-400'}`}
                >
                  {changeInfo.text}
                </span>
              )}
            </div>

            {/* Market closed note */}
            {!marketStatus.isOpen && (
              <p className="mt-1 text-[10px] text-ink-tertiary">
                Market closed — showing last close ({marketStatus.lastTradingDayShort})
              </p>
            )}

            {/* Chart */}
            <div className="mt-3">
              <PriceChart ticker={opp.ticker} range={chartRange} />
            </div>

            {/* Range pills */}
            <div className="mt-2 flex flex-wrap gap-1">
              {BAR_RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setChartRange(r)}
                  className={[
                    'rounded-[4px] px-2 py-0.5 text-[10px] transition',
                    chartRange === r
                      ? 'bg-gold-primary/20 text-gold-primary'
                      : 'text-ink-tertiary hover:text-ink-primary',
                  ].join(' ')}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* D2. Key Metrics */}
          <KeyMetricsCard ticker={opp.ticker} barsRange={chartRange} />
        </div>

        {/* D3. Why This Stock Can Go Up */}
        <ArgCard
          title="Why This Stock Can Go Up"
          toneClass="text-emerald-400"
          borderClass="border-emerald-500/20"
          bgClass="bg-[linear-gradient(160deg,#050f07,#050505_60%)]"
          points={opp.bullPoints}
          emptyText="No bullish thesis published for this idea yet."
          icons={BULL_ICONS}
          iconToneClass="bg-emerald-500/[0.08] text-emerald-400"
        />

        {/* D4. Why This Stock Can Go Down */}
        <ArgCard
          title="Why This Stock Can Go Down"
          toneClass="text-red-400"
          borderClass="border-red-500/20"
          bgClass="bg-[linear-gradient(160deg,#0f0505,#050505_60%)]"
          points={opp.bearPoints}
          emptyText="No downside scenario published for this idea yet."
          icons={BEAR_ICONS}
          iconToneClass="bg-red-500/[0.08] text-red-400"
        />

        {/* D5. Right column */}
        <RightColumn opp={opp} />
      </div>

      {/* ── E. Footer disclaimer ── */}
      <div className="flex items-start gap-2 border-t border-gold-primary/10 pt-3">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-ink-tertiary" />
        <p className="text-[11px] italic text-ink-tertiary">
          Important: AI scores and analysis are for informational purposes only and do not
          constitute financial advice.
        </p>
      </div>
    </div>
  );
}
