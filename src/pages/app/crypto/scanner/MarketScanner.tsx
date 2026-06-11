// src/pages/app/crypto/scanner/MarketScanner.tsx
// Market Scanner — fullscreen workstation.
//
// Layout: fixed inset-0 z-[100] covers viewport including app topnav/sidebar.
// Top ~55%: FinotaurChart (Binance candles for selected coin + interval).
// Bottom ~45%: BookmapChart (live order-book liquidity heatmap).
// Slim header: coin pills, timeframe pills, LIVE status, close button.

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { useBinanceOrderBook, type BookStatus } from './useBinanceOrderBook';
import { FinotaurChart, type OverlayPriceLine } from '@/components/charting/FinotaurChart';
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

// ── Wall computation helpers ───────────────────────────────────────────────────
// Copied (not imported) from BookmapChart to keep BookmapChart.tsx untouched.

/** Round a price DOWN to the nearest bin boundary. */
function binFloor(price: number, binSize: number): number {
  return Math.floor(price / binSize) * binSize;
}

/**
 * Compute a readable bin size ≈ mid * 0.0005, rounded to a clean 1/2/5 × 10^n tick.
 * Slightly coarser than the heatmap's 0.0002 so wall lines don't crowd each other.
 */
function computeWallBinSize(mid: number): number {
  const raw = mid * 0.0005;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const ratio = raw / mag;
  if (ratio < 1.5) return mag;
  if (ratio < 3.5) return 2 * mag;
  if (ratio < 7.5) return 5 * mag;
  return 10 * mag;
}

/** Format a USD notional for the price-line title label: '$8.2M', '$640K', '$12.3K'. */
function formatNotional(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000)     return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(0)}`;
}

/** Round to N significant digits (for stability comparison). */
function roundSig(n: number, sig: number): number {
  if (n === 0) return 0;
  const d = Math.ceil(Math.log10(Math.abs(n)));
  const factor = Math.pow(10, sig - d);
  return Math.round(n * factor) / factor;
}

interface WallSpec {
  id: string;
  price: number;   // binFloor-rounded price
  notional: number;
  side: 'bid' | 'ask';
}

/**
 * Derive up to 4 bid + 4 ask wall specs from the raw order book.
 * Only levels within ±4% of mid are considered.
 * Noise gate: keep only bins whose notional ≥ max(p90 of nonzero bins, 25% of largest).
 */
function computeWalls(
  bids: Map<number, number>,
  asks: Map<number, number>,
): WallSpec[] {
  if (bids.size === 0 && asks.size === 0) return [];

  // Determine mid price
  let bestBid = 0;
  let bestAsk = Infinity;
  for (const p of bids.keys()) if (p > bestBid) bestBid = p;
  for (const p of asks.keys()) if (p < bestAsk) bestAsk = p;
  if (bestBid === 0 && bestAsk === Infinity) return [];
  const mid = bestBid === 0 ? bestAsk : bestAsk === Infinity ? bestBid : (bestBid + bestAsk) / 2;

  const binSize = computeWallBinSize(mid);
  const rangePct = 0.04; // ±4% of mid
  const priceLow  = mid * (1 - rangePct);
  const priceHigh = mid * (1 + rangePct);

  // Aggregate each side into bins within range
  const bidBins = new Map<number, number>();
  const askBins = new Map<number, number>();

  for (const [price, qty] of bids) {
    if (price < priceLow || price > priceHigh) continue;
    const bin = binFloor(price, binSize);
    bidBins.set(bin, (bidBins.get(bin) ?? 0) + qty * price);
  }
  for (const [price, qty] of asks) {
    if (price < priceLow || price > priceHigh) continue;
    const bin = binFloor(price, binSize);
    askBins.set(bin, (askBins.get(bin) ?? 0) + qty * price);
  }

  function selectWalls(bins: Map<number, number>, side: 'bid' | 'ask'): WallSpec[] {
    const nonzero = Array.from(bins.values()).filter(v => v > 0);
    if (nonzero.length === 0) return [];

    const sorted = [...nonzero].sort((a, b) => a - b);
    const p90idx = Math.floor(sorted.length * 0.9);
    const p90    = sorted[Math.min(p90idx, sorted.length - 1)];
    const largest = sorted[sorted.length - 1];
    const threshold = Math.max(p90, largest * 0.25);

    // Filter bins above threshold, then take top-4 by notional
    const candidates = Array.from(bins.entries())
      .filter(([, n]) => n >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return candidates.map(([price, notional]) => ({
      id: `${side}-${price}`,
      price,
      notional,
      side,
    }));
  }

  return [...selectWalls(bidBins, 'bid'), ...selectWalls(askBins, 'ask')];
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

// ── Inner workstation card — holds WS hook + single chart with wall overlays ──
// Separate component so the `key` prop can force a full remount on symbol change.

const WALL_INTERVAL_MS = 3_000; // recompute walls every 3 seconds

// Bid walls: subtle emerald; ask walls: brand gold
const BID_COLOR  = 'rgba(34,197,94,0.55)';
const ASK_COLOR  = 'rgba(201,166,70,0.75)';

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

  // Overlay price-line specs — updated every 3 s, diffed inside FinotaurChart.
  const [wallLines, setWallLines] = useState<OverlayPriceLine[]>([]);
  // Stability ref: previous wall set so we can skip setState when nothing changed.
  const prevWallsRef = useRef<WallSpec[]>([]);

  // Notify parent when WS status changes so the header pill stays in sync
  // without a second parallel WebSocket connection.
  useEffect(() => {
    onStatusChange?.(hook.status);
  }, [hook.status, onStatusChange]);

  // Compute walls every WALL_INTERVAL_MS from the live order book.
  useEffect(() => {
    const tick = () => {
      const { bids, asks } = hook.getBook();
      const next = computeWalls(bids, asks);

      // Stability check: compare ids + rounded notionals to avoid flicker every tick.
      const prev = prevWallsRef.current;
      const changed =
        next.length !== prev.length ||
        next.some((w, i) => {
          const p = prev[i];
          return !p || w.id !== p.id || roundSig(w.notional, 2) !== roundSig(p.notional, 2);
        });

      if (!changed) return;
      prevWallsRef.current = next;

      // Determine the largest bid and largest ask by notional.
      const maxBidNotional = Math.max(
        0,
        ...next.filter(w => w.side === 'bid').map(w => w.notional),
      );
      const maxAskNotional = Math.max(
        0,
        ...next.filter(w => w.side === 'ask').map(w => w.notional),
      );

      const lines: OverlayPriceLine[] = next.map(w => {
        const isBid  = w.side === 'bid';
        const isLargest = isBid
          ? w.notional === maxBidNotional
          : w.notional === maxAskNotional;
        return {
          id: w.id,
          price: w.price,
          title: formatNotional(w.notional),
          color: isBid ? BID_COLOR : ASK_COLOR,
          lineWidth: isLargest ? 2 : 1,
          // Largest wall on each side is solid (0); others are dashed (2)
          lineStyle: isLargest ? 0 : 2,
        };
      });

      setWallLines(lines);
    };

    // Run immediately, then on interval
    tick();
    const id = setInterval(tick, WALL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [hook]);

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
      {/* Chart sub-header: coin/price info + wall legend */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-zinc-800/60 flex-shrink-0">
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
        {/* Minimal wall legend */}
        <span className="ml-auto flex items-center gap-2 text-[10px] text-white/25 select-none">
          <span
            className="inline-block h-[2px] w-4 rounded-full"
            style={{ background: BID_COLOR }}
          />
          <span>bids</span>
          <span
            className="inline-block h-[2px] w-4 rounded-full"
            style={{ background: ASK_COLOR }}
          />
          <span>asks</span>
          <span className="opacity-50">· walls live</span>
        </span>
      </div>

      {/* FinotaurChart fills the full remaining body height */}
      <div className="flex-1 min-h-0">
        <FinotaurChart
          symbol={symbol}
          interval={interval}
          from={from}
          to={to}
          dataSource={dataSource}
          theme="dark"
          height="100%"
          priceLines={wallLines}
        />
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

