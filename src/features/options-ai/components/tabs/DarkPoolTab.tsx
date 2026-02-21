// src/features/options-ai/components/tabs/DarkPoolTab.tsx
// =====================================================
// DARK POOL INTELLIGENCE TAB v2.0
// =====================================================
// Redesigned: No sub-tabs, Live Feed only
// Shows unique symbols aggregated daily (no duplicates)
// 10+ indices/ETFs + 10+ individual stocks
// Summary cards show daily cumulative totals
// Auto-refreshes every 5 min (matches backend cache TTL)
// Optimized for 10K+ concurrent users
// =====================================================

import { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  RefreshCw,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, SectionHeader, Skeleton, SkeletonCard } from '../ui';

// ╔══════════════════════════════════════════════════════╗
// ║  TYPES                                                ║
// ╚══════════════════════════════════════════════════════╝

export interface DarkPoolTrade {
  id: string;
  symbol: string;
  price: number;
  size: number;                    // daily share volume
  notional: number;                // daily notional (price × volume)
  notionalFmt: string;
  side: 'buy' | 'sell' | 'unknown';
  exchange: string;
  timestamp: string;
  timeAgo: string;
  premiumToNBBO: number;
  blockType: 'block' | 'sweep' | 'cross';
  sizeCategory: 'mega' | 'large' | 'notable';
  isETF: boolean;
  changePercent: number;
  change: number;
  // Options flow correlation
  callPremium: number;
  putPremium: number;
  totalOptionsPremium: number;
  optionsPremiumFmt: string;
  topContract: {
    type: 'call' | 'put';
    strike: number;
    expiry: string;
    premium: string;
    volume: number;
    volOiRatio: number;
  } | null;
  optionsCorrelation: string;
}

export interface DarkPoolSummary {
  totalVolume: number;
  totalNotional: number;
  totalNotionalFmt: string;
  buyVolume: number;
  sellVolume: number;
  unknownVolume: number;
  buyPct: number;
  sellPct: number;
  topSymbol: string;
  topSymbolNotional: string;
  tradeCount: number;
  avgTradeSize: string;
  largestTrade: DarkPoolTrade | null;
  narrative: string;
}

export interface DarkPoolData {
  trades: DarkPoolTrade[];
  summary: DarkPoolSummary;
  meta: {
    tickersScanned: number;
    indexCount: number;
    stockCount: number;
    totalBlocks: number;
    uniqueSymbols: number;
    apiCalls?: number;
    scanDurationMs: number;
    timestamp: string;
    isDelayed: boolean;
    cacheTTL: number;
    source?: string;
  };
  lastUpdated: string;
  nextRefresh: string;
}

// ╔══════════════════════════════════════════════════════╗
// ║  CONSTANTS                                            ║
// ╚══════════════════════════════════════════════════════╝

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;  // 5 min — matches backend L1 TTL

const SIDE_CONFIG = {
  buy:     { color: '#22C55E', label: 'BUY',     icon: ArrowUpRight,   bg: 'rgba(34,197,94,0.1)' },
  sell:    { color: '#EF4444', label: 'SELL',     icon: ArrowDownRight, bg: 'rgba(239,68,68,0.1)' },
  unknown: { color: '#8B8B8B', label: 'NEUTRAL', icon: Activity,       bg: 'rgba(139,139,139,0.1)' },
} as const;

const SIZE_CONFIG = {
  mega:    { color: '#EF4444', label: 'MEGA',    glow: '0 0 12px rgba(239,68,68,0.3)' },
  large:   { color: '#F59E0B', label: 'LARGE',   glow: '0 0 8px rgba(245,158,11,0.2)' },
  notable: { color: '#C9A646', label: 'NOTABLE', glow: 'none' },
} as const;

// ╔══════════════════════════════════════════════════════╗
// ║  HELPERS                                              ║
// ╚══════════════════════════════════════════════════════╝

function formatNotional(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000)     return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)         return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function getSizeCategory(notional: number): 'mega' | 'large' | 'notable' {
  if (notional >= 50_000_000) return 'mega';
  if (notional >= 10_000_000) return 'large';
  return 'notable';
}

// ╔══════════════════════════════════════════════════════╗
// ║  DATA HOOK — Frontend cache + auto-refresh            ║
// ╚══════════════════════════════════════════════════════╝

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// Frontend-level cache (shared across component remounts)
let _cachedData: DarkPoolData | null = null;
let _cachedTs = 0;
const FRONTEND_CACHE_TTL = 4 * 60 * 1000; // 4 min — slightly less than backend

interface UseDarkPoolResult {
  data: DarkPoolData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  countdown: number;
}

function useDarkPool(): UseDarkPoolResult {
  const [data, setData] = useState<DarkPoolData | null>(_cachedData);
  const [loading, setLoading] = useState(!_cachedData);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_MS / 1000);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (isManual = false) => {
    // Check frontend cache first (prevents requests on tab switch)
    if (!isManual && _cachedData && Date.now() - _cachedTs < FRONTEND_CACHE_TTL) {
      setData(_cachedData);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (isManual || !_cachedData) setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/options-ai/dark-pool`, {
        headers: { Accept: 'application/json' },
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result: DarkPoolData = await res.json();

      // DEBUG: Log first trade to verify longPct/shortPct
      if (result.trades?.length) {
        const t0 = result.trades[0] as any;
        console.log('[DarkPool] First trade:', t0.symbol, 'longPct:', t0.longPct, 'shortPct:', t0.shortPct, 'side:', t0.side, 'blockCount:', t0.blockCount);
      }

      // Enrich trades with computed fields if needed
      const trades = (result.trades || []).map((t: any) => ({
        ...t,
        notionalFmt: t.notionalFmt || formatNotional(t.notional || 0),
        sizeCategory: t.sizeCategory || getSizeCategory(t.notional || 0),
      }));

      const enriched = { ...result, trades };

      // Update frontend cache
      _cachedData = enriched;
      _cachedTs = Date.now();

      setData(enriched);
      setCountdown(REFRESH_INTERVAL_MS / 1000);
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setError(e.message || 'Failed to load dark pool data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    timerRef.current = setInterval(() => fetchData(), REFRESH_INTERVAL_MS);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return { data, loading, error, refresh, countdown };
}

// ╔══════════════════════════════════════════════════════╗
// ║  SUB-COMPONENTS                                       ║
// ╚══════════════════════════════════════════════════════╝

// ── Countdown Timer ──
const CountdownTimer = memo(function CountdownTimer({ seconds }: { seconds: number }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct = ((REFRESH_INTERVAL_MS / 1000 - seconds) / (REFRESH_INTERVAL_MS / 1000)) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-24 h-1.5 rounded-full overflow-hidden bg-white/[0.05]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: 'linear-gradient(90deg, #C9A646, #F4D97B)', width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="text-[10px] font-mono text-[#6B6B6B] min-w-[40px]">
        {mins}:{secs.toString().padStart(2, '0')}
      </span>
    </div>
  );
});

// ── Ticker Logo — Pure initials (no external CDN dependency) ──
const TICKER_COLORS: Record<string, string> = {
  SPY: '#E8B931', QQQ: '#6366F1', IWM: '#10B981', DIA: '#3B82F6',
  NVDA: '#76B900', AAPL: '#A2AAAD', MSFT: '#00A4EF', TSLA: '#CC0000',
  AMZN: '#FF9900', META: '#0081FB', GOOGL: '#4285F4', AMD: '#ED1C24',
  JPM: '#003D6B', GS: '#6DA0C9', COIN: '#0052FF', PLTR: '#101010',
  NFLX: '#E50914', BA: '#0033A0', XOM: '#ED1B2F', LLY: '#D52B1E',
};

const TickerLogo = memo(function TickerLogo({ symbol, size = 36 }: { symbol: string; size?: number }) {
  const accent = TICKER_COLORS[symbol] || '#C9A646';
  return (
    <div
      className="rounded-lg flex items-center justify-center overflow-hidden shrink-0"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${accent}22, ${accent}08)`,
        border: `1px solid ${accent}33`,
      }}
    >
      <span className="font-bold" style={{ fontSize: size * 0.35, color: accent }}>
        {symbol.slice(0, 2)}
      </span>
    </div>
  );
});

// ── Section Divider ──
const SectionDivider = memo(function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-white/[0.06]" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">{label}</span>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
});

// ── Trade Row (Live Feed) — one per unique symbol ──
const TradeRow = memo(function TradeRow({ trade, index }: { trade: DarkPoolTrade; index: number }) {
  const side = SIDE_CONFIG[trade.side] || SIDE_CONFIG.unknown;
  const sizeConf = SIZE_CONFIG[trade.sizeCategory] || SIZE_CONFIG.notable;
  const SideIcon = side.icon;
  const pct = trade.changePercent ?? 0;
  const price = trade.price ?? 0;
  const pctColor = pct > 0 ? '#22C55E' : pct < 0 ? '#EF4444' : '#8B8B8B';
  const blockCount = (trade as any).blockCount ?? trade.size ?? 0;
  const longPct = (trade as any).longPct ?? 50;
  const shortPct = (trade as any).shortPct ?? 50;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
      style={{ borderLeft: `3px solid ${side.color}` }}
    >
      {/* Logo */}
      <TickerLogo symbol={trade.symbol} size={32} />

      {/* Symbol + Block Count */}
      <div className="min-w-[90px]">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-white">{trade.symbol}</span>
          <span
            className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
            style={{ background: sizeConf.color + '15', color: sizeConf.color }}
          >
            {sizeConf.label}
          </span>
        </div>
        <span className="text-[10px] text-[#6B6B6B]">
          {blockCount} block{blockCount !== 1 ? 's' : ''} today
        </span>
      </div>

      {/* Price + Change */}
      <div className="hidden sm:block min-w-[85px]">
        <div className="text-xs text-white font-medium">${price.toFixed(2)}</div>
        <div className="text-[9px] flex items-center gap-0.5" style={{ color: pctColor }}>
          {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
        </div>
      </div>

      {/* Daily Notional — cumulative premium */}
      <div className="min-w-[75px]">
        <div className="text-sm font-bold" style={{ color: sizeConf.color }}>
          {trade.notionalFmt || formatNotional(trade.notional || 0)}
        </div>
        <div className="text-[9px] text-[#6B6B6B]">premium</div>
      </div>

      {/* Flow Bar — long vs short % */}
      <div className="hidden md:flex flex-col min-w-[100px] gap-1">
        <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[0.05]">
          <div
            className="h-full rounded-l-full"
            style={{ width: `${longPct}%`, background: '#22C55E' }}
          />
          <div
            className="h-full rounded-r-full"
            style={{ width: `${shortPct}%`, background: '#EF4444' }}
          />
        </div>
        <div className="flex justify-between text-[8px]">
          <span style={{ color: '#22C55E' }}>{longPct}% long</span>
          <span style={{ color: '#EF4444' }}>{shortPct}% short</span>
        </div>
      </div>

      {/* Options Flow Insight */}
      <div className="flex-1 hidden lg:block min-w-0">
        <p className="text-[11px] text-[#A0A0A0] line-clamp-2 leading-relaxed">
          {trade.optionsCorrelation || '—'}
        </p>
      </div>

      {/* Side Badge */}
      <div className="flex items-center gap-1 shrink-0">
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold"
          style={{ background: side.bg, color: side.color }}
        >
          <SideIcon size={10} />
          {side.label}
        </div>
      </div>
    </motion.div>
  );
});

// ── Skeleton Loading ──
function DarkPoolSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="h-[100px]" />
        ))}
      </div>
      <SkeletonCard className="h-[600px]" />
    </div>
  );
}

// ╔══════════════════════════════════════════════════════╗
// ║  MAIN COMPONENT                                       ║
// ╚══════════════════════════════════════════════════════╝

export const DarkPoolTab = memo(function DarkPoolTab() {
  const { data, loading, error, refresh, countdown } = useDarkPool();

  // Split trades into indices and stocks
  const { indexTrades, stockTrades } = useMemo(() => {
    if (!data?.trades) return { indexTrades: [], stockTrades: [] };
    return {
      indexTrades: data.trades.filter((t: DarkPoolTrade) => t.isETF),
      stockTrades: data.trades.filter((t: DarkPoolTrade) => !t.isETF),
    };
  }, [data?.trades]);

  if (loading && !data) return <DarkPoolSkeleton />;

  if (error && !data) {
    return (
      <Card>
        <div className="p-8 text-center">
          <EyeOff className="w-12 h-12 text-[#EF4444] mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-white mb-2">Dark Pool Feed Unavailable</h3>
          <p className="text-sm text-[#6B6B6B] mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[#C9A646] bg-[#C9A646]/10 border border-[#C9A646]/20 hover:bg-[#C9A646]/20 transition-colors"
          >
            Retry
          </button>
        </div>
      </Card>
    );
  }

  const summary = data?.summary;
  const trades = data?.trades || [];

  return (
    <div className="space-y-6">

      {/* ── Top Metrics — Daily Cumulative ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* Daily Volume */}
        <div
          className="relative p-5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(13,11,8,0.95) 70%)',
            border: '1px solid rgba(139,92,246,0.2)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-[10px] text-[#6B6B6B] uppercase tracking-widest font-semibold">Daily Volume</span>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}
            >
              <Activity className="w-4 h-4" style={{ color: '#8B5CF6' }} />
            </div>
          </div>
          <div className="text-[1.6rem] font-semibold leading-none mb-1.5 text-white">
            {summary?.totalNotionalFmt || '—'}
          </div>
          <div className="text-[10px] text-[#6B6B6B]">
            {data?.meta?.totalBlocks || summary?.tradeCount || 0} blocks · {data?.meta?.uniqueSymbols || 0} symbols
          </div>
        </div>

        {/* Flow Bias */}
        {(() => {
          const isBull = summary ? summary.buyPct > summary.sellPct : false;
          const isNeutral = summary ? summary.buyPct === summary.sellPct : true;
          const biasColor = isNeutral ? '#8B8B8B' : isBull ? '#22C55E' : '#EF4444';
          const biasLabel = summary
            ? isBull ? 'BULLISH' : summary.sellPct > summary.buyPct ? 'BEARISH' : 'NEUTRAL'
            : '—';
          const BiasIcon = isBull ? TrendingUp : TrendingDown;
          return (
            <div
              className="relative p-5 rounded-2xl"
              style={{
                background: `linear-gradient(135deg, ${biasColor}1A 0%, rgba(13,11,8,0.95) 70%)`,
                border: `1px solid ${biasColor}33`,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-[10px] text-[#6B6B6B] uppercase tracking-widest font-semibold">Flow Bias</span>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${biasColor}26`, border: `1px solid ${biasColor}40` }}
                >
                  <BiasIcon className="w-4 h-4" style={{ color: biasColor }} />
                </div>
              </div>
              <div className="text-[1.6rem] font-semibold leading-none mb-1.5 text-white">
                {biasLabel}
              </div>
              <div className="text-[10px] text-[#6B6B6B]">
                {summary?.buyPct || 0}% buy · {summary?.sellPct || 0}% sell
              </div>
            </div>
          );
        })()}

        {/* Top Symbol */}
        <div
          className="relative p-5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(13,11,8,0.95) 70%)',
            border: '1px solid rgba(201,166,70,0.2)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-[10px] text-[#6B6B6B] uppercase tracking-widest font-semibold">Top Symbol</span>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(201,166,70,0.15)', border: '1px solid rgba(201,166,70,0.3)' }}
            >
              <Eye className="w-4 h-4" style={{ color: '#C9A646' }} />
            </div>
          </div>
          <div className="text-[1.6rem] font-semibold leading-none mb-1.5 text-white">
            {summary?.topSymbol || '—'}
          </div>
          <div className="text-[10px] text-[#6B6B6B]">{summary?.topSymbolNotional || '$0'} notional</div>
        </div>

        {/* Avg Trade */}
        <div
          className="relative p-5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(13,11,8,0.95) 70%)',
            border: '1px solid rgba(245,158,11,0.2)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-[10px] text-[#6B6B6B] uppercase tracking-widest font-semibold">Avg Trade</span>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              <ArrowUpRight className="w-4 h-4" style={{ color: '#F59E0B' }} />
            </div>
          </div>
          <div className="text-[1.6rem] font-semibold leading-none mb-1.5 text-white">
            {summary?.avgTradeSize || '—'}
          </div>
          <div className="text-[10px] text-[#6B6B6B]">per asset today</div>
        </div>

      </div>

      {/* ── Main Content Card — Live Feed Only ── */}
      <Card>
        <div className="p-6 md:p-8">
          {/* Header + Refresh */}
          <div className="flex items-start justify-between mb-1">
            <SectionHeader
              icon={Eye}
              title="Dark Pool Intelligence"
              subtitle="Institutional block prints — daily aggregated"
              iconBg="purple"
            />
            <div className="flex items-center gap-3 shrink-0">
              <CountdownTimer seconds={countdown} />
              <button
                onClick={refresh}
                className="p-2 rounded-lg text-[#6B6B6B] hover:text-[#C9A646] hover:bg-white/[0.05] transition-colors"
                title="Refresh now"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Last updated */}
          {data?.lastUpdated && (
            <p className="text-[10px] text-[#6B6B6B] mb-5 ml-[52px]">
              Last updated: {new Date(data.lastUpdated).toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit', second: '2-digit',
              })}
              {data.meta?.isDelayed && ' (15 min delayed)'}
            </p>
          )}

          {/* ── LIVE FEED — No tabs ── */}
          {trades.length === 0 ? (
            <div className="py-12 text-center">
              <EyeOff className="w-10 h-10 text-[#6B6B6B] mx-auto mb-3 opacity-40" />
              <p className="text-sm text-[#6B6B6B]">No dark pool activity detected today</p>
              <p className="text-xs text-[#4B4B4B] mt-1">Data will appear once markets open</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Description */}
              <p className="text-xs text-[#A0A0A0] mb-4">
                {data?.meta?.uniqueSymbols || trades.length} unique symbols with institutional block activity today.
                Each row shows cumulative daily premium and directional flow.
                {data?.meta?.totalBlocks ? ` ${data.meta.totalBlocks} total blocks across ${data.meta.tickersScanned || 0} scanned tickers.` : ''}
              </p>

              {/* ── INDEX / ETF Section ── */}
              {indexTrades.length > 0 && (
                <>
                  <SectionDivider label={`Indices & ETFs (${indexTrades.length})`} />
                  <div className="space-y-2">
                    {indexTrades.map((t: DarkPoolTrade, i: number) => (
                      <TradeRow key={t.id} trade={t} index={i} />
                    ))}
                  </div>
                </>
              )}

              {/* ── STOCKS Section ── */}
              {stockTrades.length > 0 && (
                <>
                  <SectionDivider label={`Individual Stocks (${stockTrades.length})`} />
                  <div className="space-y-2">
                    {stockTrades.map((t: DarkPoolTrade, i: number) => (
                      <TradeRow key={t.id} trade={t} index={indexTrades.length + i} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
});