// src/components/stock-analyzer/v2/StockAnalyzerHero.tsx
import { memo, useCallback, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Price, Change } from '@/components/ds/NumberDisplay';
import type { StockData } from '@/types/stock-analyzer.types';
import { usePricePolling } from '@/hooks/usePricePolling';
import type { QuoteUpdate } from '@/services/fetchQuoteOnly';
import { useMarketStatus } from '@/lib/marketStatus';
import { Clock, RefreshCw, WifiOff } from 'lucide-react';

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
          {data.logo && !logoFailed ? (
            <img
              src={logoRetried ? `${data.logo}?retry=1` : data.logo}
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
            <Price value={data.price} size="display" format="currency" />
            <div className="mt-ds-1 flex items-baseline gap-ds-2 font-mono text-[16px] tabular-nums lg:justify-end">
              <Change value={data.change} format="plain" decimals={2} />
              <span className="text-ink-tertiary">·</span>
              <Change value={data.changePercent} format="percent" decimals={2} />
            </div>
          </div>
          <div className="hidden h-[88px] w-[156px] border-l border-white/[0.08] pl-ds-5 lg:block" aria-hidden="true">
            <svg viewBox="0 0 156 88" className="h-full w-full overflow-visible">
              <path
                d="M2 68 L22 55 L35 58 L48 31 L62 39 L74 24 L88 29 L101 18 L116 42 L132 49 L152 34"
                fill="none"
                stroke="rgba(201,166,70,0.82)"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M2 78 H152" stroke="rgba(255,255,255,0.13)" strokeWidth="1" strokeDasharray="2 4" />
            </svg>
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
