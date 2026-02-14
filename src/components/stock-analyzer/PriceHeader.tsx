// src/components/stock-analyzer/PriceHeader.tsx
// =====================================================
// 📌 STOCK ANALYZER — Price Header v2.0
//    With 15-min delayed polling + smart API usage
// =====================================================

import { memo, useCallback, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Bookmark, Share2, RefreshCw, Clock, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StockData } from '@/types/stock-analyzer.types';
import { Card } from './ui';
import { fmt, fmtBig, isValid } from '@/utils/stock-analyzer.utils';
import { usePricePolling } from '@/hooks/usePricePolling';
import type { QuoteUpdate } from '@/services/fetchQuoteOnly';

// ── Helper: format remaining time ──
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'refreshing...';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return '< 1m';
  return `${mins}m`;
}

// ── Helper: session label for UI ──OptionsTab.tsx
function sessionLabel(session: string): { label: string; color: string } {
  switch (session) {
    case 'open':
      return { label: '● Live', color: '#22C55E' };
    case 'premarket':
      return { label: '◐ Pre-Market', color: '#F59E0B' };
    case 'afterhours':
      return { label: '◑ After Hours', color: '#F59E0B' };
    default:
      return { label: '○ Closed', color: '#8B8B8B' };
  }
}

export const PriceHeader = memo(({ data, onPriceUpdate }: {
  data: StockData;
  onPriceUpdate?: (update: Partial<StockData>) => void;
}) => {
  const [isHoveringRefresh, setIsHoveringRefresh] = useState(false);

  // ── Price polling callback ──
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

  // ── Smart polling hook ──
  const {
    isDelayed,
    marketSession,
    lastRefresh,
    nextRefreshIn,
    forceRefresh,
    isRefreshing,
  } = usePricePolling({
    stockData: data,
    onPriceUpdate: handlePriceUpdate,
    enabled: !!onPriceUpdate, // Only poll if parent accepts updates
  });

  const isPos = data.change >= 0;
  const w52h = data.week52High;
  const w52l = data.week52Low;
  const pricePos =
    w52h && w52l && w52h !== w52l
      ? ((data.price - w52l) / (w52h - w52l)) * 100
      : 50;

  const session = sessionLabel(marketSession);

  return (
    <Card gold className="relative">
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left: Company */}
          <div className="flex items-center gap-5">
            <div
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, rgba(201,166,70,0.2), rgba(201,166,70,0.05))',
                border: '2px solid rgba(201,166,70,0.3)',
                boxShadow: '0 8px 32px rgba(201,166,70,0.2)',
              }}
            >
              {data.logo ? (
                <img
  src={data.logo}
  alt={data.ticker}
  className="w-full h-full object-contain p-1 rounded-2xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerHTML =
                      `<span class="text-[#C9A646] font-bold text-xl">${data.ticker.slice(0, 2)}</span>`;
                  }}
                />
              ) : (
                <span className="text-[#C9A646] font-bold text-xl md:text-2xl">
                  {data.ticker.slice(0, 2)}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{data.ticker}</h1>
                <span className="text-xs text-[#6B6B6B] bg-white/5 px-3 py-1 rounded-full">
                  {data.exchange}
                </span>
                {/* Market Session Indicator (from polling hook) */}
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: `${session.color}15`,
                    color: session.color,
                  }}
                >
                  {session.label}
                </span>
              </div>
              <p className="text-[#8B8B8B] text-sm md:text-base">{data.name}</p>
              <p className="text-[#C9A646]/70 text-xs mt-1">
                {data.sector} • {data.industry}
              </p>
            </div>
          </div>

          {/* Right: Price */}
          <div className="flex items-end gap-6">
            <div className="text-right">
              <div className="flex items-baseline gap-3">
                <span className={cn(
                  'text-4xl md:text-5xl font-bold',
                  isDelayed ? 'text-white/70' : 'text-white',
                )}>
                  ${data.price.toFixed(2)}
                </span>
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                    isPos ? 'bg-[#22C55E]/10' : 'bg-[#EF4444]/10'
                  )}
                >
                  {isPos ? (
                    <ArrowUpRight className="h-4 w-4 text-[#22C55E]" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-[#EF4444]" />
                  )}
                  <span
                    className={cn(
                      'font-semibold',
                      isPos ? 'text-[#22C55E]' : 'text-[#EF4444]'
                    )}
                  >
                    {isPos ? '+' : ''}
                    {data.change.toFixed(2)} ({isPos ? '+' : ''}
                    {data.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* ── Price Status Row ── */}
              <div className="flex items-center justify-end gap-3 mt-2">
                {/* Delayed indicator */}
                {isDelayed && (
                  <span className="flex items-center gap-1 text-[10px] text-[#F59E0B]/80 bg-[#F59E0B]/10 px-2 py-0.5 rounded-full">
                    <WifiOff className="h-3 w-3" />
                    Delayed
                  </span>
                )}

                {/* Last updated time */}
                <p className="text-xs text-[#6B6B6B]">
                  Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
                </p>

                {/* Next refresh countdown */}
                {onPriceUpdate && nextRefreshIn > 0 && (
                  <span className="text-[10px] text-[#6B6B6B]/60 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeRemaining(nextRefreshIn)}
                  </span>
                )}

                {/* Manual refresh button */}
                {onPriceUpdate && (
                  <button
                    onClick={forceRefresh}
                    disabled={isRefreshing}
                    onMouseEnter={() => setIsHoveringRefresh(true)}
                    onMouseLeave={() => setIsHoveringRefresh(false)}
                    className={cn(
                      'p-1 rounded-md transition-all duration-200',
                      isRefreshing
                        ? 'text-[#C9A646]/40 cursor-wait'
                        : 'text-[#6B6B6B] hover:text-[#C9A646] hover:bg-[#C9A646]/10',
                    )}
                    title={isRefreshing ? 'Refreshing...' : 'Refresh price now'}
                  >
                    <RefreshCw className={cn(
                      'h-3.5 w-3.5',
                      isRefreshing && 'animate-spin',
                    )} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-3 rounded-xl bg-white/5 hover:bg-[#C9A646]/10 border border-transparent hover:border-[#C9A646]/30 transition-all">
                <Bookmark className="h-5 w-5 text-[#8B8B8B]" />
              </button>
              <button className="p-3 rounded-xl bg-white/5 hover:bg-[#C9A646]/10 border border-transparent hover:border-[#C9A646]/30 transition-all">
                <Share2 className="h-5 w-5 text-[#8B8B8B]" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-8 pt-6 border-t border-[#C9A646]/10">
          {[
            { label: 'Market Cap', value: fmtBig(data.marketCap) },
            { label: 'P/E Ratio', value: isValid(data.pe) ? data.pe!.toFixed(1) + 'x' : 'N/A' },
            { label: 'Dividend', value: isValid(data.dividendYield) ? data.dividendYield!.toFixed(2) + '%' : 'N/A' },
            { label: 'Volume', value: fmt(data.volume, { compact: true }) },
            { label: 'Beta', value: isValid(data.beta) ? data.beta!.toFixed(2) : 'N/A' },
            { label: 'Rating', value: data.analystRating || 'N/A', isRating: true },
          ].map((stat, idx) => (
            <div key={idx} className="text-center md:text-left">
              <p className="text-xs text-[#6B6B6B] mb-1">{stat.label}</p>
              <p
                className={cn(
                  'text-base md:text-lg font-semibold',
                  (stat as any).isRating
                    ? stat.value?.includes('Buy')
                      ? 'text-[#22C55E]'
                      : stat.value === 'Hold'
                      ? 'text-[#F59E0B]'
                      : stat.value?.includes('Sell')
                      ? 'text-[#EF4444]'
                      : 'text-white'
                    : 'text-white'
                )}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* 52W Range */}
        {isValid(w52h) && isValid(w52l) && (
          <div className="mt-6 p-4 rounded-xl bg-white/[0.02]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#6B6B6B]">52 Week Range</span>
              <span className="text-xs text-[#C9A646]">{pricePos.toFixed(0)}% from low</span>
            </div>
            <div className="relative h-2 rounded-full bg-white/10">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #EF4444, #F59E0B, #22C55E)',
                }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#C9A646] shadow-lg"
                style={{
                  left: `calc(${Math.min(Math.max(pricePos, 2), 98)}% - 8px)`,
                }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-[#8B8B8B]">${w52l!.toFixed(2)}</span>
              <span className="text-xs text-[#8B8B8B]">${w52h!.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});

PriceHeader.displayName = 'PriceHeader';