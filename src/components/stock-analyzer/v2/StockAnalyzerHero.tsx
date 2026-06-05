// src/components/stock-analyzer/v2/StockAnalyzerHero.tsx
import { memo, useCallback, useState, useEffect, useRef, type ReactNode } from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { cn } from '@/lib/utils';
import { Price, Change } from '@/components/ds/NumberDisplay';
import type { StockData } from '@/types/stock-analyzer.types';
import { usePricePolling } from '@/hooks/usePricePolling';
import type { QuoteUpdate } from '@/services/fetchQuoteOnly';
import { useMarketStatus } from '@/lib/marketStatus';
import { Clock, RefreshCw, WifiOff } from 'lucide-react';

// ─── Sparkline data shape ─────────────────────────────────────────────────────

interface SparkPoint {
  c: number;
}

// ─── Price fields derived from chart-bars (Yahoo-sourced, always legal) ───────

interface ChartBarsDerivedPrice {
  /** Latest bar's close — used as current price when Railway quote returns $0 */
  price: number;
  /** Previous DISTINCT trading day's close — for day-change calculation */
  previousClose: number;
  /** Absolute change: price − previousClose */
  change: number;
  /** Percentage change: change / previousClose × 100 */
  changePercent: number;
  /** 52-week high: max(bar.high) over the full 365-day window */
  high52w: number;
  /** 52-week low: min(bar.low) over the full 365-day window */
  low52w: number;
}

// ─── useStockChartBars — fetch 1Y daily bars, derive price + sparkline ────────
// Single fetch shared by both the sparkline chart and the price header.
// Do NOT call this twice for the same ticker; the hook is designed to be called
// once in StockAnalyzerHero and results passed down as props.

type ChartBarsState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; points: SparkPoint[]; derived: ChartBarsDerivedPrice };

function useStockChartBars(ticker: string): ChartBarsState {
  const [state, setState] = useState<ChartBarsState>({ status: 'loading' });
  // Track the last ticker we fetched so we reset on symbol change
  const lastTicker = useRef<string>('');

  useEffect(() => {
    if (!ticker) {
      setState({ status: 'empty' });
      return;
    }

    // Reset to loading whenever the ticker changes
    if (lastTicker.current !== ticker) {
      lastTicker.current = ticker;
      setState({ status: 'loading' });
    }

    let cancelled = false;

    async function load() {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        if (!cancelled) setState({ status: 'empty' });
        return;
      }

      // 1Y daily bars: from = 365 days ago, to = now (unix seconds)
      const nowSec = Math.floor(Date.now() / 1000);
      const fromSec = nowSec - 365 * 24 * 60 * 60;

      const url =
        `${SUPABASE_URL}/functions/v1/chart-bars` +
        `?symbol=${encodeURIComponent(ticker)}` +
        `&interval=1d` +
        `&from=${fromSec}` +
        `&to=${nowSec}`;

      try {
        const resp = await fetch(url, {
          method: 'GET',
          headers: { apikey: SUPABASE_ANON_KEY },
        });

        if (cancelled) return;

        if (!resp.ok) {
          setState({ status: 'empty' });
          return;
        }

        const payload = (await resp.json()) as {
          bars?: Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>;
        };
        if (cancelled) return;

        if (!Array.isArray(payload.bars) || payload.bars.length === 0) {
          setState({ status: 'empty' });
          return;
        }

        const raw = payload.bars;

        // ── Derive price fields from bars ──────────────────────────────────
        // Current price = latest bar's close
        const latestBar = raw[raw.length - 1];
        const price = latestBar.close;

        // Previous close = second-to-last DISTINCT trading day's close.
        // "Distinct" means a different calendar day (bars are daily, so
        // raw[length-2] is always the prior trading day if it exists).
        const previousClose = raw.length >= 2 ? raw[raw.length - 2].close : price;

        const change = price - previousClose;
        const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

        // 52-week high/low — use the full bars window (already 365 days)
        let high52w = -Infinity;
        let low52w = Infinity;
        for (const b of raw) {
          if (b.high > high52w) high52w = b.high;
          if (b.low < low52w) low52w = b.low;
        }
        if (high52w === -Infinity) high52w = price;
        if (low52w === Infinity) low52w = price;

        const derived: ChartBarsDerivedPrice = {
          price,
          previousClose,
          change,
          changePercent,
          high52w,
          low52w,
        };

        // ── Subsample to ≤60 points for the sparkline ─────────────────────
        // recharts handles it fine but keeps render lean
        const step = raw.length > 60 ? Math.ceil(raw.length / 60) : 1;
        const points: SparkPoint[] = raw
          .filter((_, i) => i % step === 0 || i === raw.length - 1)
          .map((b) => ({ c: b.close }));

        setState({ status: 'ready', points, derived });
      } catch {
        if (!cancelled) setState({ status: 'empty' });
      }
    }

    load();
    return () => { cancelled = true; };
  }, [ticker]);

  return state;
}

// ─── HeroSparkline — compact gold line chart (156×88) ───────────────────────
// Accepts pre-computed ChartBarsState so the bars are NOT fetched twice.

function HeroSparkline({ barsState }: { barsState: ChartBarsState }) {
  const sparkline = barsState;

  // Loading state: subtle animated placeholder bar
  if (sparkline.status === 'loading') {
    return (
      <div
        className="h-full w-full flex items-end"
        aria-hidden="true"
      >
        <div className="w-full h-0.5 rounded-full bg-white/10 animate-pulse" />
      </div>
    );
  }

  // Empty / error state: muted dash
  if (sparkline.status === 'empty' || (sparkline.status === 'ready' && sparkline.points.length === 0)) {
    return (
      <div
        className="h-full w-full flex items-center justify-center"
        aria-hidden="true"
      >
        <span className="text-[10px] text-ink-muted/40 select-none">—</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={sparkline.points}
          margin={{ top: 4, right: 0, left: 0, bottom: 4 }}
        >
          <Line
            type="monotone"
            dataKey="c"
            stroke="#C9A646"
            strokeWidth={1.4}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'refreshing...';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return '< 1m';
  return `${mins}m`;
}

function sessionLabel(session: string): { label: string; dot: string } {
  switch (session) {
    case 'open':
      return { label: 'LIVE', dot: 'bg-gold-primary' };
    case 'premarket':
      return { label: 'PRE-MARKET', dot: 'bg-gold-bright/70' };
    case 'afterhours':
      return { label: 'AFTER HOURS', dot: 'bg-gold-bright/70' };
    default:
      return { label: 'CLOSED', dot: 'bg-ink-muted' };
  }
}

interface StockAnalyzerHeroProps {
  data: StockData;
  onPriceUpdate?: (update: Partial<StockData>) => void;
  actions?: ReactNode;
}

export const StockAnalyzerHero = memo(({ data, onPriceUpdate, actions }: StockAnalyzerHeroProps) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoRetried, setLogoRetried] = useState(false);

  // SEC submissions rarely expose a website (so no Clearbit logo). Fall back to
  // the free FMP ticker-image CDN (by symbol, no auth). On error → ticker initials.
  const logoSrc = data.logo || `https://financialmodelingprep.com/image-stock/${data.ticker}.png`;

  // ── Single chart-bars fetch shared by sparkline AND price header ─────────
  // chart-bars is Yahoo-sourced via the edge function — always legal, always
  // available even when the Railway quote-extended endpoint returns $0.
  const barsState = useStockChartBars(data.ticker);

  // Prefer chart-bars derived price when Railway returns $0 (gated/stale).
  // Fall back to data.* only when bars are unavailable.
  const hasBars = barsState.status === 'ready';
  const displayPrice       = hasBars ? barsState.derived.price        : data.price;
  const displayChange      = hasBars ? barsState.derived.change       : data.change;
  const displayChangePct   = hasBars ? barsState.derived.changePercent : data.changePercent;

  const handlePriceUpdate = useCallback((update: QuoteUpdate) => {
    if (!onPriceUpdate) return;
    onPriceUpdate({
      price: update.price,
      change: update.change,
      changePercent: update.changePercent,
      volume: update.volume,
      dayHigh: update.dayHigh,
      dayLow: update.dayLow,
      open: update.open,
      previousClose: update.previousClose,
      marketStatus: update.marketStatus,
      lastUpdated: update.lastUpdated,
    });
  }, [onPriceUpdate]);

  const {
    isDelayed,
    marketSession,
    nextRefreshIn,
    forceRefresh,
    isRefreshing,
  } = usePricePolling({
    stockData: data,
    onPriceUpdate: handlePriceUpdate,
    enabled: !!onPriceUpdate,
  });

  const session = sessionLabel(marketSession);
  // Centralized market status — adds weekend/holiday context the per-stock
  // polling hook cannot derive (it only knows session at quote time, not why).
  const marketStatus = useMarketStatus();

  return (
    <div className="relative flex flex-col gap-ds-7 py-ds-2 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-start gap-ds-5">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[8px] md:h-16 md:w-16"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
            border: '0.5px solid rgba(255,255,255,0.12)',
            boxShadow: '0 16px 36px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          {logoSrc && !logoFailed ? (
            <img
              src={logoRetried ? `${logoSrc}?retry=1` : logoSrc}
              alt={data.ticker}
              loading="lazy"
              className="h-full w-full object-contain p-1"
              onError={() => {
                if (!logoRetried) {
                  setLogoRetried(true);
                  return;
                }
                setLogoFailed(true);
              }}
            />
          ) : (
            <span className="font-mono text-2xl font-semibold tracking-[0] text-gold-primary md:text-3xl">
              {data.ticker.slice(0, 2)}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <p
            className="mb-ds-3 font-sans text-[11px] font-medium uppercase text-gold-primary/70"
            style={{ letterSpacing: '0.18em' }}
          >
            STOCK ANALYZER · {data.exchange}
          </p>
          <h1 className="font-sans text-[56px] font-semibold leading-[0.92] tracking-[0] text-ink-primary md:text-[68px]">
            {data.ticker}
          </h1>
          <p className="mt-ds-3 max-w-[420px] truncate text-[20px] font-medium text-ink-primary/90">
            {data.name}
          </p>
          <p className="mt-ds-2 text-[13px] leading-relaxed text-ink-tertiary">
            {data.sector}
            {data.industry && (
              <>
                <span className="mx-2 opacity-60">·</span>
                {data.industry}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Live price/change block — chart-bars + SEC fundamentals data, public */}
      <div className="flex flex-col items-start gap-ds-3 lg:items-end">
        <div className="flex items-center gap-ds-2">
          <span
            className={cn('h-1.5 w-1.5 rounded-full', session.dot, session.label === 'LIVE' && 'animate-pulse')}
            aria-hidden="true"
          />
          <span
            className="font-sans text-[11px] font-medium uppercase text-gold-primary/72"
            style={{ letterSpacing: '0.18em' }}
          >
            {session.label}
          </span>
          {isDelayed && (
            <span className="ml-ds-2 flex items-center gap-1 rounded-[4px] border border-border-ds-subtle px-2 py-0.5 text-[10px] text-ink-tertiary">
              <WifiOff className="h-3 w-3" aria-hidden="true" />
              Delayed
            </span>
          )}
        </div>

        <div className="flex items-end gap-ds-6">
          <div className="text-left lg:text-right">
            <Price value={displayPrice} size="display" format="currency" />
            <div className="mt-ds-1 flex items-baseline gap-ds-2 font-mono text-[16px] tabular-nums lg:justify-end">
              <Change value={displayChange} format="plain" decimals={2} />
              <span className="text-ink-tertiary">·</span>
              <Change value={displayChangePct} format="percent" decimals={2} />
            </div>
          </div>
          <div className="hidden h-[88px] w-[156px] border-l border-white/[0.08] pl-ds-5 lg:block">
            {/* barsState is shared — no second network call */}
            <HeroSparkline barsState={barsState} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-ds-3 text-[11px] text-ink-tertiary lg:justify-end">
          {!marketStatus.isOpen && (
            <span>
              Showing{' '}
              <span className="font-medium text-ink-secondary">
                {marketStatus.lastTradingDayLabel}
              </span>
              <span className="mx-2 opacity-60">·</span>
            </span>
          )}
          <span>
            Last updated {new Date(data.lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {onPriceUpdate && nextRefreshIn > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatTimeRemaining(nextRefreshIn)}
            </span>
          )}
          {onPriceUpdate && (
            <button
              type="button"
              onClick={forceRefresh}
              disabled={isRefreshing}
              title={isRefreshing ? 'Refreshing...' : 'Refresh price now'}
              className={cn(
                'rounded-md p-1 transition-colors duration-base ease-out',
                isRefreshing
                  ? 'cursor-wait text-gold-primary/40'
                  : 'text-ink-tertiary hover:text-gold-primary',
              )}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} aria-hidden="true" />
            </button>
          )}
        </div>

        {actions && <div className="mt-ds-1 flex items-center gap-ds-2">{actions}</div>}
      </div>
    </div>
  );
});

StockAnalyzerHero.displayName = 'StockAnalyzerHero';
