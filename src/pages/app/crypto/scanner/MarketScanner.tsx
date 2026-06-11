// src/pages/app/crypto/scanner/MarketScanner.tsx
// Market Scanner — fullscreen workstation.
//
// Layout: fixed inset-0 z-[100] covers viewport including app topnav/sidebar.
// Top ~55%: FinotaurChart (Binance candles for selected coin + interval).
// Bottom ~45%: BookmapChart (live order-book liquidity heatmap).
// Slim header: coin pills, timeframe pills, LIVE status, close button.

import { useState, useCallback, useMemo, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { useBinanceOrderBook, type BookStatus } from './useBinanceOrderBook';
import { BookmapChart } from './BookmapChart';
import { FinotaurChart } from '@/components/charting/FinotaurChart';
import { pickDataSource } from '@/components/charting/dataSources';
import type { Interval } from '@/components/charting/types';

// ── Coin config ───────────────────────────────────────────────────────────────

interface Coin {
  label: string;
  symbol: string; // Binance USDT pair (e.g. BTCUSDT)
}

const COINS: Coin[] = [
  { label: 'BTC', symbol: 'BTCUSDT' },
  { label: 'ETH', symbol: 'ETHUSDT' },
  { label: 'SOL', symbol: 'SOLUSDT' },
  { label: 'BNB', symbol: 'BNBUSDT' },
  { label: 'XRP', symbol: 'XRPUSDT' },
  { label: 'DOGE', symbol: 'DOGEUSDT' },
];

// ── Timeframe config ──────────────────────────────────────────────────────────
// Restricted to the intervals BinanceSource supports (no '2m', no '1wk'/'1mo'
// — those have poor UX for a live scanner workstation).

interface TFOption {
  value: Interval;
  label: string;
}

const TIMEFRAMES: TFOption[] = [
  { value: '1m',  label: '1m'  },
  { value: '5m',  label: '5m'  },
  { value: '15m', label: '15m' },
  { value: '1h',  label: '1h'  },
  { value: '4h',  label: '4h'  },
  { value: '1d',  label: '1D'  },
];

// Lookback window (seconds) per interval. Binance klines with startTime
// returns the FIRST 1000 bars after `from`, so the window MUST stay under
// the 1000-bar cap or the chart shows stale history instead of the present.
const BARS_LOOKBACK = 600;

function lookbackSeconds(interval: Interval): number {
  switch (interval) {
    case '1m':  return BARS_LOOKBACK * 60;
    case '5m':  return BARS_LOOKBACK * 5 * 60;
    case '15m': return BARS_LOOKBACK * 15 * 60;
    case '1h':  return BARS_LOOKBACK * 60 * 60;
    case '4h':  return BARS_LOOKBACK * 4 * 60 * 60;
    case '1d':  return BARS_LOOKBACK * 24 * 60 * 60;
    default:    return BARS_LOOKBACK * 5 * 60;
  }
}

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

function CoinPills({
  coins,
  selected,
  onChange,
}: {
  coins: Coin[];
  selected: string;
  onChange: (symbol: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {coins.map(coin => {
        const isActive = coin.symbol === selected;
        return (
          <button
            key={coin.symbol}
            onClick={() => onChange(coin.symbol)}
            className={[
              'px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150',
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

function TimeframePills({
  options,
  selected,
  onChange,
}: {
  options: TFOption[];
  selected: Interval;
  onChange: (iv: Interval) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {options.map(tf => {
        const isActive = tf.value === selected;
        return (
          <button
            key={tf.value}
            onClick={() => onChange(tf.value)}
            className={[
              'px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150',
              isActive
                ? 'bg-gradient-to-b from-[#D9B65A] to-[#C9A646] text-black shadow-[0_0_10px_rgba(201,166,70,0.4)]'
                : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-[#C9A646]/10 hover:text-[#C9A646]',
            ].join(' ')}
          >
            {tf.label}
          </button>
        );
      })}
    </div>
  );
}

function HeatLegend() {
  return (
    <div className="flex items-center gap-4 flex-wrap text-[11px] text-white/40 px-3 pb-2">
      <div className="flex items-center gap-2">
        <div
          className="h-3 w-24 rounded-sm"
          style={{
            background:
              'linear-gradient(to right, #080604, #281806, #6e3c08, #b4821e, #C9A646, #e6d28c, #fff8dc)',
          }}
        />
        <span>Liquidity depth</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'rgba(52,211,153,0.8)' }} />
        <span>Market buys</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'rgba(248,113,113,0.8)' }} />
        <span>Market sells</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-[1px] w-6 bg-white/80" />
        <span>Last price</span>
      </div>
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/[0.04] m-3">
      <div>
        <p className="text-sm font-semibold text-red-400 mb-1">Live data unavailable</p>
        <p className="text-xs text-white/40 max-w-xl leading-relaxed">
          Could not connect to the Binance market data stream. This can happen on restricted
          networks or regions. Check your connection and try again.
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

// ── Inner workstation card — holds WS hook + both charts ─────────────────────
// Separate component so the `key` prop can force a full remount on symbol change.

interface WorkstationInnerProps {
  symbol: string;
  interval: Interval;
  from: number;
  to: number;
  onStatusChange?: (status: BookStatus) => void;
}

function WorkstationInner({ symbol, interval, from, to, onStatusChange }: WorkstationInnerProps) {
  const hook = useBinanceOrderBook(symbol);
  const dataSource = useMemo(() => pickDataSource(symbol), [symbol]);

  // Notify parent when WS status changes so the header pill stays in sync
  // without a second parallel WebSocket connection.
  useEffect(() => {
    onStatusChange?.(hook.status);
  }, [hook.status, onStatusChange]);

  const coinLabel = COINS.find(c => c.symbol === symbol)?.label ?? symbol;

  if (hook.status === 'error') {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <ErrorBanner onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden min-h-0">
      {/* TOP ~55%: candlestick chart */}
      <div className="flex flex-col" style={{ flex: '0 0 55%', minHeight: 0 }}>
        {/* Chart sub-header: coin/price info */}
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-zinc-800/60">
          <span className="text-xs font-semibold text-white/70">
            {coinLabel} / USDT
          </span>
          {hook.lastPrice !== null && (
            <span className="font-mono text-[#C9A646] text-sm font-semibold">
              ${hook.lastPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          )}
        </div>
        {/* FinotaurChart fills the remaining height of its container */}
        <div className="flex-1 min-h-0">
          <FinotaurChart
            symbol={symbol}
            interval={interval}
            from={from}
            to={to}
            dataSource={dataSource}
            theme="dark"
            height="100%"
          />
        </div>
      </div>

      {/* Thin divider */}
      <div className="h-px bg-zinc-800 flex-shrink-0" />

      {/* BOTTOM ~45%: Bookmap heatmap */}
      <div className="flex flex-col" style={{ flex: '0 0 45%', minHeight: 0 }}>
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-zinc-800/60">
          <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            Order Book · Liquidity Heatmap
          </span>
          <span className="text-[11px] text-white/25">
            Order book snapshot every 1s · 15 min history
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <BookmapChart hook={hook} symbol={symbol} />
        </div>
        <HeatLegend />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MarketScanner() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
  const [selectedInterval, setSelectedInterval] = useState<Interval>('5m');
  // Bumping key forces full hook + chart remount on symbol change so the WS
  // and data source always reflect the selected coin cleanly.
  const [resetKey, setResetKey] = useState<number>(0);
  // WS connection status — lifted from WorkstationInner via onStatusChange so
  // only one WebSocket connection is opened (no duplicate hook in the header).
  const [wsStatus, setWsStatus] = useState<BookStatus>('connecting');

  const handleCoinChange = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
    setResetKey(k => k + 1);
    // Reset to 'connecting' immediately so the header pill reflects the new
    // connection state before WorkstationInner remounts and reports back.
    setWsStatus('connecting');
  }, []);

  // Derive chart time window from selected interval.
  const { from, to } = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return { from: now - lookbackSeconds(selectedInterval), to: now };
  }, [selectedInterval]);

  // Close button: window.close() works for popup windows; history.back() is the
  // fallback for in-app navigation where window.close() is ignored by the browser.
  const handleClose = useCallback(() => {
    window.close();
    // If window.close() was ignored (in-app render), fall back to history.
    setTimeout(() => { history.back(); }, 80);
  }, []);

  return (
    // fixed inset-0 z-[100] covers the entire viewport including app topnav + sidebar.
    // Works identically whether rendered in-app (overlay) or in a popup window.
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">

      {/* ── Slim header bar (~52px) ───────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 border-b border-zinc-800 flex-shrink-0"
        style={{ height: 52 }}
      >
        {/* Title */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="h-3.5 w-0.5 rounded-full bg-[#C9A646]" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">
            Market Scanner
          </span>
        </div>

        {/* Divider */}
        <span className="h-4 w-px bg-zinc-700 flex-shrink-0" />

        {/* Coin pills */}
        <CoinPills
          coins={COINS}
          selected={selectedSymbol}
          onChange={handleCoinChange}
        />

        {/* Divider */}
        <span className="h-4 w-px bg-zinc-700 flex-shrink-0" />

        {/* Timeframe pills */}
        <TimeframePills
          options={TIMEFRAMES}
          selected={selectedInterval}
          onChange={setSelectedInterval}
        />

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          {/* LIVE status — driven by wsStatus lifted from WorkstationInner via
              onStatusChange, so only one WebSocket connection is opened. */}
          <StatusPill status={wsStatus} />

          {/* Close button */}
          <button
            onClick={handleClose}
            title="Close Market Scanner"
            aria-label="Close Market Scanner"
            className="flex items-center justify-center h-7 w-7 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Body: chart panes ─────────────────────────────────────────────── */}
      <WorkstationInner
        key={`${selectedSymbol}-${resetKey}`}
        symbol={selectedSymbol}
        interval={selectedInterval}
        from={from}
        to={to}
        onStatusChange={setWsStatus}
      />
    </div>
  );
}

