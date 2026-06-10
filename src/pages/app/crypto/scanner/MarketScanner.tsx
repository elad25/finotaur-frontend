// src/pages/app/crypto/scanner/MarketScanner.tsx
// Market Scanner page — Bookmap-style live crypto liquidity heatmap.
// Data source: Binance public WebSocket (no backend, client-side only).

import { useState, useCallback } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { GlassCard } from '../_shared/GlassUI';
import { useBinanceOrderBook } from './useBinanceOrderBook';
import { BookmapChart } from './BookmapChart';
import { RefreshCw } from 'lucide-react';

// ── Coin config ───────────────────────────────────────────────────────────────

interface Coin {
  label: string;
  symbol: string; // Binance USDT pair
}

const COINS: Coin[] = [
  { label: 'BTC', symbol: 'BTCUSDT' },
  { label: 'ETH', symbol: 'ETHUSDT' },
  { label: 'SOL', symbol: 'SOLUSDT' },
  { label: 'BNB', symbol: 'BNBUSDT' },
  { label: 'XRP', symbol: 'XRPUSDT' },
  { label: 'DOGE', symbol: 'DOGEUSDT' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: 'connecting' | 'live' | 'error' }) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold uppercase tracking-wider">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
        </span>
        Live
      </span>
    );
  }
  if (status === 'connecting') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold uppercase tracking-wider">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-pulse inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
        </span>
        Connecting…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-semibold uppercase tracking-wider">
      <span className="inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
      Error
    </span>
  );
}

function CoinSelector({
  coins,
  selected,
  onChange,
}: {
  coins: Coin[];
  selected: string;
  onChange: (symbol: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {coins.map(coin => {
        const isActive = coin.symbol === selected;
        return (
          <button
            key={coin.symbol}
            onClick={() => onChange(coin.symbol)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
              isActive
                ? 'bg-[#C9A646]/15 text-[#C9A646] border border-[#C9A646]/30'
                : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/[0.07] hover:text-white/70',
            ].join(' ')}
          >
            {coin.label}
          </button>
        );
      })}
    </div>
  );
}

function HeatLegend() {
  // Gradient bar from near-black → amber → gold → near-white
  return (
    <div className="flex items-center gap-4 flex-wrap text-[11px] text-white/40">
      {/* Heat gradient bar */}
      <div className="flex items-center gap-2">
        <div
          className="h-3 w-28 rounded-sm"
          style={{
            background:
              'linear-gradient(to right, #080604, #281806, #6e3c08, #b4821e, #C9A646, #e6d28c, #fff8dc)',
          }}
        />
        <span>Liquidity depth</span>
      </div>

      {/* Buy trades */}
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: 'rgba(52,211,153,0.8)' }}
        />
        <span>Market buys</span>
      </div>

      {/* Sell trades */}
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: 'rgba(248,113,113,0.8)' }}
        />
        <span>Market sells</span>
      </div>

      {/* Last price */}
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-[1px] w-6 bg-white/80" />
        <span>Last price</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MarketScanner() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
  // Key forces full hook reset (and chart reset) when coin changes
  const [resetKey, setResetKey] = useState<number>(0);

  const handleCoinChange = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
    // Increment key to force hook/chart remount on symbol switch
    setResetKey(k => k + 1);
  }, []);

  return (
    <PageTemplate
      title="Market Scanner"
      description="Live order-book liquidity heatmap — watch resting walls and real-time trades"
    >
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CoinSelector
            coins={COINS}
            selected={selectedSymbol}
            onChange={handleCoinChange}
          />
        </div>

        {/* Chart card with inner hook */}
        <ScannerCard
          key={`${selectedSymbol}-${resetKey}`}
          symbol={selectedSymbol}
        />
      </div>
    </PageTemplate>
  );
}

// ── Inner card — holds hook + chart (separate component so key-reset works) ──

function ScannerCard({ symbol }: { symbol: string }) {
  const hook = useBinanceOrderBook(symbol);

  if (hook.status === 'error') {
    return <ErrorBanner onRetry={() => window.location.reload()} />;
  }

  const coinLabel = COINS.find(c => c.symbol === symbol)?.label ?? symbol;

  return (
    <GlassCard padding="sm">
      {/* Card header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <p className="text-sm font-semibold text-white/80">
            {coinLabel} / USDT
            {hook.lastPrice !== null && (
              <span className="ml-3 font-mono text-[#C9A646] text-base">
                ${hook.lastPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            )}
          </p>
          <p className="text-[11px] text-white/30 mt-0.5">
            Order book snapshot every 1s · 15 min history
          </p>
        </div>
        <StatusPill status={hook.status} />
      </div>

      {/* Heatmap canvas */}
      <BookmapChart hook={hook} symbol={symbol} />

      {/* Legend */}
      <div className="mt-3 px-1">
        <HeatLegend />
      </div>
    </GlassCard>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6 flex flex-col items-start gap-4">
      <div>
        <p className="text-sm font-semibold text-red-400 mb-1">
          Live data unavailable
        </p>
        <p className="text-xs text-white/40 max-w-xl leading-relaxed">
          Could not connect to the Binance market data stream. This can happen
          on restricted networks or regions. Check your connection and try again.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white/70 hover:text-white text-xs font-semibold transition-all duration-150"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </button>
    </div>
  );
}
