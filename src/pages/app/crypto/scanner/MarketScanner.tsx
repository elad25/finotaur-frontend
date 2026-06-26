// src/pages/app/crypto/scanner/MarketScanner.tsx
// Market Scanner — fullscreen workstation.
//
// Layout: fixed inset-0 z-[100] covers viewport including app topnav/sidebar.
// Top ~55%: FinotaurChart (Binance candles for selected coin + interval).
// Bottom ~45%: BookmapChart (live order-book liquidity heatmap).
// Slim header: coin pills, timeframe pills, LIVE status, close button.

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { X, RefreshCw, Crosshair } from 'lucide-react';
import { useBinanceOrderBook, type BookStatus } from './useBinanceOrderBook';
import { FinotaurChart, type WallSegment } from '@/components/charting/FinotaurChart';
import { pickDataSource } from '@/components/charting/dataSources';
import type { Interval } from '@/components/charting/types';
import { fetchWallsHistory } from '../_shared/api';
import { useDepthSlices } from './useDepthSlices';
import { useLiquidityBand } from './useLiquidityBand';

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

// ── Wall computation helpers ──────────────────────────────────────────────────
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


interface WallSpec {
  id: string;
  price: number;   // binFloor-rounded price
  notional: number;
  side: 'bid' | 'ask';
  /** Bin size (price units) used to floor this entry — captured at detection time. */
  binSize: number;
}

// Performance cap: max tracked alive bins per side per tick.
// Far above what's visible on screen; prevents pathological growth.
const MAX_ALIVE_BINS_PER_SIDE = 600;

/**
 * Aggregate ALL levels of both sides into bins and return every bin whose
 * notional >= floorUsd. No band-selection, no top-N cap — the full book.
 * binFloor / computeWallBinSize math is unchanged from the previous version.
 */
function computeWalls(
  bids: Map<number, number>,
  asks: Map<number, number>,
  floorUsd: number,
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

  // Aggregate ALL levels of both sides into bins — full-book scan.
  const bidBins = new Map<number, number>();
  const askBins = new Map<number, number>();

  for (const [price, qty] of bids) {
    const bin = binFloor(price, binSize);
    bidBins.set(bin, (bidBins.get(bin) ?? 0) + qty * price);
  }
  for (const [price, qty] of asks) {
    const bin = binFloor(price, binSize);
    askBins.set(bin, (askBins.get(bin) ?? 0) + qty * price);
  }

  function selectAll(bins: Map<number, number>, side: 'bid' | 'ask'): WallSpec[] {
    // Filter by floor, then sort desc by notional, cap at performance limit.
    return Array.from(bins.entries())
      .filter(([, n]) => n >= floorUsd)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_ALIVE_BINS_PER_SIDE)
      .map(([price, notional]) => ({
        id: `${side}-${price}`,
        price,
        notional,
        side,
        binSize,
      }));
  }

  return [...selectAll(bidBins, 'bid'), ...selectAll(askBins, 'ask')];
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
// Symbol change via key= causes a full remount, which resets all tracking refs
// to their initial empty state automatically — no explicit reset needed.

const WALL_INTERVAL_MS = 3_000; // recompute walls every 3 seconds

// Wall lifecycle constants
const WALL_MISS_TICKS_UNTIL_DEAD = 2;   // ticks without detection before marking dead
const WALL_MIN_LIFETIME_MS       = 45_000; // walls alive < 45s are dropped on death (noise)
const WALL_DEAD_CAP              = 400; // max stored dead walls (oldest evicted by deadAt)

// Floor filter options: notional USD — all bins ≥ TRACK_FLOOR_USD are TRACKED
// (so raising the display floor doesn't corrupt history), but only bins ≥ floorUsd
// are EMITTED as visible segments.
// "All" = $1K floor so the fine heatmap texture is visible (per spec).
const FLOOR_OPTIONS = [
  { label: 'All',   value: 1_000 },
  { label: '$150K', value: 150_000 },
  { label: '$500K', value: 500_000 },
  { label: '$1M',   value: 1_000_000 },
  { label: '$5M',   value: 5_000_000 },
] as const;
const FLOOR_DEFAULT    = 500_000;   // fallback floor before history loads
const TRACK_FLOOR_USD  = 100_000;   // track ≥ $100K — kills small-order noise at the source

// Adaptive ("Auto") floor: per-symbol threshold derived from the symbol's own
// 72h wall-history notionals, so each coin shows its significant walls at its
// own $-scale (BTC walls ~$200K today; the old fixed $500K hid ~97% of real
// walls). p70 of observed wall sizes, clamped to a sane band.
const AUTO_FLOOR_PCTL = 0.60;
const AUTO_FLOOR_MIN  = 50_000;
const AUTO_FLOOR_MAX  = 5_000_000;

function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[idx];
}

function computeAutoFloor(notionals: number[]): number {
  const p = percentile(notionals, AUTO_FLOOR_PCTL);
  if (!Number.isFinite(p)) return FLOOR_DEFAULT;
  return Math.min(AUTO_FLOOR_MAX, Math.max(AUTO_FLOOR_MIN, Math.round(p)));
}

// Bar-interval size in seconds — used to align wall times to candle boundaries.
function intervalSeconds(iv: Interval): number {
  switch (iv) {
    case '1m':  return 60;
    case '5m':  return 5 * 60;
    case '15m': return 15 * 60;
    case '1h':  return 60 * 60;
    case '4h':  return 4 * 60 * 60;
    case '1d':  return 24 * 60 * 60;
    default:    return 60;
  }
}

/** Round a unix-seconds timestamp DOWN to the nearest bar boundary. */
function alignToBar(t: number, ivSec: number): number {
  return Math.floor(t / ivSec) * ivSec;
}

// Legend swatch colors (fixed — mid-opacity representative shade)
const BID_COLOR  = 'rgba(34,197,94,0.55)';
const ASK_COLOR  = 'rgba(220,38,38,0.65)';

/**
 * Continuous-intensity color helper.
 *
 * ratio: notional / per-side-alive-max, in [0, 1].
 * dead:  apply dead-wall dimming (fill capped at 0.20, edge alpha 0.25).
 *
 * Color hues:
 *   Bids (emerald): fill rgb(34,197,94)  → rgb(80,230,150) at full intensity
 *                   edge rgb(34,197,94)  → rgb(140,255,190)
 *   Asks (red):     fill rgb(220,38,38)  → rgb(248,90,90)
 *                   edge rgb(220,38,38)  → rgb(255,140,140)
 *
 * Alpha ramps (alive):
 *   fillAlpha = 0.06 + 0.50 * curve
 *   edgeAlpha = 0.20 + 0.75 * curve
 */
/**
 * Change B: power-curve intensity — big walls pop, dust is crushed.
 * Replaces old log1p + ^1.35 curve.
 */
function computeCurve(ratio: number): number {
  return Math.pow(Math.min(1, Math.max(0, ratio)), 0.7);
}

/** Linear interpolate between two RGB triples. */
function lerpRGB(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Change B: 3-anchor color ramp — dim background → full hue → near-white hot.
 *
 * asks (sell): (120,20,20) → (220,38,38) → (255,195,175)
 * bids (buy):  (8,60,30)   → (34,197,94) → (190,255,220)
 *
 * fill alpha: 0.05 + 0.65*w
 * edge alpha: 0.25 + 0.70*w  (ramp w bumped +0.15 so edge is always hotter)
 * dead walls: fill alpha halved capped at 0.20, edge alpha 0.25, no glow.
 */
function heatColors(
  side: 'bid' | 'ask',
  ratio: number,   // notional / per-side p95, [0,1]
  dead: boolean,
): { edge: string; fill: string } {
  const w = computeCurve(ratio); // Change B: use new curve

  // 3-anchor anchors per side
  const anchor1: [number, number, number] = side === 'bid' ? [8,   60,  30 ] : [120, 20,  20 ];
  const anchor2: [number, number, number] = side === 'bid' ? [34,  197, 94 ] : [220, 38,  38 ];
  const anchor3: [number, number, number] = side === 'bid' ? [190, 255, 220] : [255, 195, 175];

  // Fill ramp: lerp a1→a2 for w<0.5, a2→a3 for w>=0.5
  const fillRGB = w < 0.5
    ? lerpRGB(anchor1, anchor2, w * 2)
    : lerpRGB(anchor2, anchor3, (w - 0.5) * 2);

  // Edge ramp: same but shifted +0.15 so it's always one stop hotter than fill
  const ew = Math.min(1, w + 0.15);
  const edgeRGB = ew < 0.5
    ? lerpRGB(anchor1, anchor2, ew * 2)
    : lerpRGB(anchor2, anchor3, (ew - 0.5) * 2);

  let fillAlpha = 0.05 + 0.65 * w;
  let edgeAlpha = 0.25 + 0.70 * w;

  if (dead) {
    fillAlpha = Math.min(0.20, fillAlpha / 2);
    edgeAlpha = 0.25;
  }

  return {
    fill: `rgba(${fillRGB[0]},${fillRGB[1]},${fillRGB[2]},${fillAlpha.toFixed(3)})`,
    edge: `rgba(${edgeRGB[0]},${edgeRGB[1]},${edgeRGB[2]},${edgeAlpha.toFixed(3)})`,
  };
}

/** Tracked wall entry — lives in the useRef Map keyed by `${side}:${binPrice}`. */
interface TrackedWall {
  key: string;
  /** Stable detection key `${side}:${price}` — used for present/absent checks
   *  even when the map key carries a revival timestamp suffix. */
  detectKey: string;
  side: 'bid' | 'ask';
  price: number;
  /** Bin size (price units) captured at birth from computeWallBinSize(mid). */
  binSize: number;
  bornAt: number;       // wall-clock ms
  lastSeenAt: number;   // wall-clock ms
  maxNotional: number;
  missedTicks: number;
  deadAt: number | null; // wall-clock ms, null = alive
}

/** Format HH:MM local time from a wall-clock ms timestamp. */
function formatHHMM(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// Candle interval in ms — needed by DepthMatrixLayer to compute column widths.
function intervalMs(iv: Interval): number {
  switch (iv) {
    case '1m':  return 60_000;
    case '5m':  return 5 * 60_000;
    case '15m': return 15 * 60_000;
    case '1h':  return 60 * 60_000;
    case '4h':  return 4 * 60 * 60_000;
    case '1d':  return 24 * 60 * 60_000;
    default:    return 60_000;
  }
}

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

  // Wall lifecycle tracking — persists across ticks, reset on remount (symbol change).
  const trackedWallsRef = useRef<Map<string, TrackedWall>>(new Map());
  const deadWallsRef    = useRef<TrackedWall[]>([]);

  // WallSegment array passed to FinotaurChart — updated every tick.
  const [wallSegments, setWallSegments] = useState<WallSegment[]>([]);

  // Bumped once after server history is seeded so the wall-tick effect fires
  // immediately and renders history stripes without waiting up to 3 seconds.
  const [seedVersion, setSeedVersion] = useState(0);

  // Floor filter. 'auto' = adaptive per-symbol threshold (default); a number =
  // a manual override picked from the segmented control. Tracking always uses
  // TRACK_FLOOR_USD ($100K) so history isn't lost when the floor changes.
  const [floorMode, setFloorMode] = useState<'auto' | number>('auto');
  const [autoFloorUsd, setAutoFloorUsd] = useState<number>(FLOOR_DEFAULT);
  const floorUsd = floorMode === 'auto' ? autoFloorUsd : floorMode;

  // Depth matrix size filter: percent of the p99 reference cell.
  // 0 = All, 1 | 5 | 10 | 25 = only bins >= N% of the largest wall in view.
  const [sizeFilterPct, setSizeFilterPct] = useState<0 | 1 | 5 | 10 | 25>(5);

  // ── Candle range tracking ───────────────────────────────────────────────
  // Stable ref + accessor so useLiquidityBand can merge candle hi/low into the
  // auto-fit band without needing an additional fetch or re-render cycle.
  const candleRangeRef = useRef<{ high: number; low: number } | null>(null);
  const getCandleRange = useCallback(() => candleRangeRef.current, []);

  // ── Time-window focus token ─────────────────────────────────────────────
  // Bumping this triggers FinotaurChart to re-apply the 6h focusRange on the
  // time scale. Starts at 0 (no-op on first render); bumped on bar load so the
  // initial view snaps to the last-6h window, and again on Fit click.
  const [timeFitToken, setTimeFitToken] = useState(0);

  const handleBarsLoad = useCallback((range: { high: number; low: number } | null) => {
    candleRangeRef.current = range;
    // NOTE: we intentionally do NOT bump timeFitToken here anymore. Bars reload
    // every 30s as the window slides, and bumping the token re-snapped the time
    // axis each time, fighting the user's pan. FinotaurChart now self-fits the
    // visible range once on the first load per symbol/interval; explicit
    // re-centring still happens via the Fit button and interval-change effect.
  }, []);

  // ── Liquidity band auto-fit ─────────────────────────────────────────────
  // When autoFitActive is true, the price axis is fitted to the resting-order
  // band (union of qualifying walls + candle hi/low) so both price action and
  // all resting walls are always visible. The user can disable it by
  // interacting with the price axis; the "Fit" button re-enables it.
  const [autoFitActive, setAutoFitActive] = useState(true);

  const band = useLiquidityBand({
    getBook:       hook.getBook,
    floorUsd,
    isLive:        hook.status === 'live',
    getCandleRange,
  });

  // Reset auto-fit and re-snap the time window on interval change.
  // WorkstationInner remounts on symbol change so state resets automatically;
  // for interval changes we reset explicitly via this effect.
  useEffect(() => {
    setAutoFitActive(true);
    setTimeFitToken(t => t + 1);
  // interval is the only dependency here — symbol remounts the whole component.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval]);

  const handleManualPriceScale = useCallback(() => {
    setAutoFitActive(false);
  }, []);

  const handleFitClick = useCallback(() => {
    setAutoFitActive(true);
    // Also re-snap the time axis to the 6h window so both axes are reset.
    setTimeFitToken(t => t + 1);
  }, []);

  // The band passed to FinotaurChart: active only when auto-fit is on AND the
  // band has been computed (requires at least one 3-second compute cycle).
  const activeBand = autoFitActive ? band : null;

  // ── 6h visible time window ──────────────────────────────────────────────
  // The focusRange passed to FinotaurChart: "show the last 6 hours of data".
  // 6h gives enough candle context AND covers the full depth-history window.
  // Recomputed when `to` changes (every 30s timeTick) but FinotaurChart only
  // re-applies it when timeFitToken is explicitly bumped — not on every slide.
  // Visible window scales with the interval: a fixed number of bars so every
  // timeframe frames a sensible amount of price action (a fixed 6h window was
  // nonsensical on 4h/1d — only 1-2 bars). The price band fits the candles
  // INSIDE this window (see FinotaurChart onBarsLoad), so candles always fill
  // the height instead of being squashed by a wide loaded history.
  const VISIBLE_BARS = 120;
  const focusRange = useMemo(
    () => ({ from: to - VISIBLE_BARS * intervalSeconds(interval), to }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [to, interval],
  );

  // Depth matrix slices — drives DepthMatrixLayer.
  // fromMs/toMs are the same chart window as from/to (in ms).
  // barSpacingPx: approximate, derived from a typical chart width ÷ bars.
  // Resolution tier is determined internally by useDepthSlices.
  const APPROX_BAR_SPACING_PX = 8; // conservative default; DepthMatrixLayer handles zoom
  const depthMatrix = useDepthSlices({
    symbol,
    fromMs: from * 1000,
    toMs:   to   * 1000,
    barSpacingPx:     APPROX_BAR_SPACING_PX,
    candleIntervalMs: intervalMs(interval),
    getBook:  hook.getBook,
    floorUsd,
    isLive: hook.status === 'live',
  });

  // ── Seed refs from server-side wall history on mount ────────────────────
  // WorkstationInner remounts on every symbol change (via key= in the parent),
  // so the effect naturally re-runs for the new symbol with clean refs.
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    fetchWallsHistory(symbol, 72, controller.signal).then(resp => {
      if (cancelled) return;

      // Recompute the adaptive ("Auto") floor for THIS symbol from its own wall
      // history, so each coin shows its significant walls at its own $-scale.
      const notionals = resp.episodes
        .map(ep => ep.maxNotionalUsd)
        .filter((n): n is number => Number.isFinite(n));
      if (notionals.length > 0) setAutoFloorUsd(computeAutoFloor(notionals));

      const nowMs = Date.now();
      const tracked = trackedWallsRef.current;
      const dead    = deadWallsRef.current;

      // Separate into alive vs. dead episodes from the server.
      // Fix 3a: a server episode is only seeded as alive if it is both
      // ep.active AND was last seen within the past 2 minutes. Episodes
      // that are stale-active (worker hiccup / level left the depth view)
      // go through the dead path so they don't render as full-width lines.
      const SEED_FRESHNESS_MS = 120_000;
      const aliveEps = resp.episodes.filter(ep =>
        ep.active && (nowMs - new Date(ep.lastSeenAt).getTime()) < SEED_FRESHNESS_MS,
      );
      const deadEps = resp.episodes.filter(ep =>
        !ep.active ||
        (ep.active && (nowMs - new Date(ep.lastSeenAt).getTime()) >= SEED_FRESHNESS_MS),
      );

      // ── Seed alive episodes into trackedWallsRef ───────────────────────
      for (const ep of aliveEps) {
        const binSize  = computeWallBinSize(ep.price);
        const binPrice = binFloor(ep.price, binSize);
        const key      = `${ep.side}:${binPrice}`;

        // Skip if the live tick loop already registered this wall (dedup).
        if (tracked.has(key)) continue;

        const bornAt = new Date(ep.firstSeenAt).getTime();
        tracked.set(key, {
          key,
          detectKey:   key,
          side:        ep.side,
          price:       binPrice,
          binSize,
          bornAt:      Number.isFinite(bornAt) ? bornAt : nowMs,
          lastSeenAt:  nowMs,
          maxNotional: ep.maxNotionalUsd,
          missedTicks: 0,
          deadAt:      null,
        });
      }

      // ── Seed dead episodes into deadWallsRef (server first, then merge) ─
      // Build a set of keys already present in the live dead list so we can
      // skip exact duplicates (same side + binPrice bin).
      const existingDeadKeys = new Set(dead.map(d => {
        // Reconstruct the bin key from each stored entry's known fields.
        return `${d.side}:${d.price}`;
      }));

      const serverDeads: TrackedWall[] = [];
      for (const ep of deadEps) {
        const binSize  = computeWallBinSize(ep.price);
        const binPrice = binFloor(ep.price, binSize);
        const dedupKey = `${ep.side}:${binPrice}`;

        // Skip if a session-tracked dead wall already covers this bin.
        if (existingDeadKeys.has(dedupKey)) continue;

        const bornAt = new Date(ep.firstSeenAt).getTime();
        // Fix 3a (dead path for stale-active): use lastSeenAt as the death time
        // so the dead stripe spans only the actual observed lifetime.
        const lastSeen = new Date(ep.lastSeenAt).getTime();
        const resolvedDeadAt = Number.isFinite(lastSeen) ? lastSeen : nowMs;
        const resolvedBornAt = Number.isFinite(bornAt) ? bornAt : nowMs;
        // Guard: deadAt must be >= bornAt.
        const clampedDeadAt = Math.max(resolvedDeadAt, resolvedBornAt);

        serverDeads.push({
          key:        `srv:${dedupKey}`,
          detectKey:  dedupKey,
          side:       ep.side,
          price:      binPrice,
          binSize,
          bornAt:     resolvedBornAt,
          lastSeenAt: resolvedDeadAt,
          maxNotional: ep.maxNotionalUsd,
          missedTicks: 0,
          deadAt:     clampedDeadAt,
        });
      }

      // Prepend server episodes (oldest history), then append session deads,
      // keep newest WALL_DEAD_CAP entries by deadAt.
      const merged = [...serverDeads, ...dead];
      merged.sort((a, b) => (b.deadAt ?? 0) - (a.deadAt ?? 0));
      const capped = merged.slice(0, WALL_DEAD_CAP);

      // Replace dead list in-place (mutate the same array the tick loop uses).
      dead.length = 0;
      for (const entry of capped) dead.push(entry);

      // Trigger the wall-tick effect to rebuild segments immediately.
      setSeedVersion(v => v + 1);
    }).catch(() => {
      // History is enhancement-only — swallow errors silently.
    });

    return () => { cancelled = true; controller.abort(); };
  // symbol is fixed per mount — eslint exhaustive-deps would only flag new
  // stable refs (computeWallBinSize, binFloor are module-level, not hooks).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // Notify parent when WS status changes so the header pill stays in sync
  // without a second parallel WebSocket connection.
  useEffect(() => {
    onStatusChange?.(hook.status);
  }, [hook.status, onStatusChange]);

  // Compute + track walls every WALL_INTERVAL_MS.
  useEffect(() => {
    const ivSec = intervalSeconds(interval);

    const tick = () => {
      const { bids, asks } = hook.getBook();
      // Track everything ≥ TRACK_FLOOR_USD ($100K). Display is filtered later by floorUsd.
      const detected = computeWalls(bids, asks, TRACK_FLOOR_USD);
      const nowMs    = Date.now();

      const tracked  = trackedWallsRef.current;
      const dead     = deadWallsRef.current;

      // ── Update existing / register new walls ───────────────
      const detectedKeys = new Set<string>();
      for (const w of detected) {
        const key = `${w.side}:${w.price}`;
        detectedKeys.add(key);
        const entry = tracked.get(key);
        if (entry && entry.deadAt === null) {
          // Alive and still detected: refresh
          entry.lastSeenAt  = nowMs;
          entry.maxNotional = Math.max(entry.maxNotional, w.notional);
          entry.missedTicks = 0;
        } else if (!entry) {
          // New wall — capture binSize at birth
          tracked.set(key, {
            key,
            detectKey:   key,
            side:        w.side,
            price:       w.price,
            binSize:     w.binSize,
            bornAt:      nowMs,
            lastSeenAt:  nowMs,
            maxNotional: w.notional,
            missedTicks: 0,
            deadAt:      null,
          });
        }
        // If entry exists but deadAt is set, the wall has revived. Promote the
        // old dead entry into deadWallsRef (same rules as a normal death: respect
        // min-lifetime and WALL_DEAD_CAP), remove it from trackedWallsRef, then
        // insert a fresh entry so the aging loop can match it via detectKey.
        else if (entry.deadAt !== null) {
          // Move old dead entry to the dead list (if old enough to keep).
          const oldLifetime = (entry.deadAt ?? nowMs) - entry.bornAt;
          if (oldLifetime >= WALL_MIN_LIFETIME_MS) {
            dead.push(entry);
            if (dead.length > WALL_DEAD_CAP) {
              dead.sort((a, b) => (a.deadAt ?? 0) - (b.deadAt ?? 0));
              dead.splice(0, dead.length - WALL_DEAD_CAP);
            }
          }
          tracked.delete(key);

          // Insert fresh alive entry with a timestamp-suffixed map key so the
          // old entry's map slot is truly replaced, but detectKey stays as
          // `${side}:${price}` so the aging loop can match it against detectedKeys.
          const freshKey = `${w.side}:${w.price}:${nowMs}`;
          tracked.set(freshKey, {
            key:         freshKey,
            detectKey:   key,
            side:        w.side,
            price:       w.price,
            binSize:     w.binSize,
            bornAt:      nowMs,
            lastSeenAt:  nowMs,
            maxNotional: w.notional,
            missedTicks: 0,
            deadAt:      null,
          });
        }
      }

      // ── Price-cross kill: walls consumed by price movement ────
      // Compute current mid from the same book data fetched above.
      let pcBestBid = 0;
      let pcBestAsk = Infinity;
      for (const p of bids.keys()) if (p > pcBestBid) pcBestBid = p;
      for (const p of asks.keys()) if (p < pcBestAsk) pcBestAsk = p;
      const hasBothSides = pcBestBid > 0 && pcBestAsk < Infinity;
      if (hasBothSides) {
        const mid = (pcBestBid + pcBestAsk) / 2;
        for (const entry of Array.from(tracked.values())) {
          if (entry.deadAt !== null) continue; // already dead
          // Bid wall penetrated when price fell through its bin floor.
          // Ask wall penetrated when price rose through its bin top.
          const isCrossed =
            entry.side === 'bid'
              ? mid < entry.price
              : mid > entry.price + entry.binSize;
          if (!isCrossed) continue;

          // Kill immediately: deadAt = now (the candle that crossed it).
          entry.deadAt = nowMs;
          const lifetime = nowMs - entry.bornAt;
          if (lifetime < WALL_MIN_LIFETIME_MS) {
            // Too short-lived (noise) — discard silently.
            tracked.delete(entry.key);
          } else {
            // Promote to dead list so a historical stripe remains visible.
            dead.push(entry);
            tracked.delete(entry.key);
            if (dead.length > WALL_DEAD_CAP) {
              dead.sort((a, b) => (a.deadAt ?? 0) - (b.deadAt ?? 0));
              dead.splice(0, dead.length - WALL_DEAD_CAP);
            }
          }
        }
      }

      // ── Age out walls not detected this tick ───────────────
      for (const entry of Array.from(tracked.values())) {
        if (entry.deadAt !== null) continue; // already dead
        if (detectedKeys.has(entry.detectKey)) continue; // seen this tick

        entry.missedTicks++;
        if (entry.missedTicks >= WALL_MISS_TICKS_UNTIL_DEAD) {
          // Fix 3b: backdate deadAt to lastSeenAt so seeded-alive walls that were
          // never confirmed by the live book don't get a "now" death stamp and
          // therefore don't render a near-full-width dead stripe all session.
          // Guard: deadAt must be >= bornAt.
          const backdatedDead = Math.max(entry.lastSeenAt, entry.bornAt);
          entry.deadAt = backdatedDead;

          const lifetime = backdatedDead - entry.bornAt;
          if (lifetime < WALL_MIN_LIFETIME_MS) {
            // Too short-lived — discard as noise
            tracked.delete(entry.key);
          } else {
            // Promote to dead list
            dead.push(entry);
            tracked.delete(entry.key);

            // Cap dead list: evict oldest by deadAt
            if (dead.length > WALL_DEAD_CAP) {
              dead.sort((a, b) => (a.deadAt ?? 0) - (b.deadAt ?? 0));
              dead.splice(0, dead.length - WALL_DEAD_CAP);
            }
          }
        }
      }

      // ── Build WallSegment[] ────────────────────────────────
      // Continuous intensity: ratio vs per-side alive max. Dead walls use
      // the same max so their dimming is contextually consistent.
      const aliveWalls = Array.from(tracked.values()).filter(e => e.deadAt === null);

      // Change A: 95th-percentile alive notional per side so several top walls
      // saturate together rather than only the single largest approaching 1.
      // Fallback to max when fewer than 5 alive walls on a side; fallback to 1
      // when the side is empty (avoids /0).
      function sideP95(side: 'bid' | 'ask'): number {
        const vals = aliveWalls
          .filter(e => e.side === side)
          .map(e => e.maxNotional)
          .sort((a, b) => a - b);
        if (vals.length === 0) return 1;
        if (vals.length < 5)   return vals[vals.length - 1]; // fallback: max
        const idx = Math.floor(vals.length * 0.95);
        return vals[Math.min(idx, vals.length - 1)];
      }

      const maxAliveBid = sideP95('bid');
      const maxAliveAsk = sideP95('ask');

      const segments: WallSegment[] = [];

      // Alive walls — filter by display floor; history is tracked regardless.
      for (const entry of aliveWalls) {
        // Display floor: suppress entries below current floor (but keep tracking them).
        if (entry.maxNotional < floorUsd) continue;

        const maxSide = entry.side === 'bid' ? maxAliveBid : maxAliveAsk;
        // Change A: ratio capped at 1 so above-p95 walls all saturate.
        const ratio   = Math.min(1, entry.maxNotional / maxSide);
        const curve   = computeCurve(ratio);
        const { edge, fill } = heatColors(entry.side, ratio, false);
        const sideLabel = entry.side === 'bid' ? 'BID' : 'ASK';

        segments.push({
          id:         entry.key,
          price:      entry.price,
          bandHeight: entry.binSize, // band occupies [price, price+binSize]
          startTime:  alignToBar(Math.floor(entry.bornAt / 1000), ivSec),
          endTime:    null, // alive → FinotaurChart extends 2 bars past live edge
          color:      edge,
          fillColor:  fill,
          lineWidth:  1,
          intensity:  curve,
          tooltip:    `${sideLabel} ${formatNotional(entry.maxNotional)} · since ${formatHHMM(entry.bornAt)}`,
        });
      }

      // Dead walls — apply display floor; continuous intensity vs alive p95.
      for (const entry of dead) {
        if (entry.maxNotional < floorUsd) continue;

        const maxSide = entry.side === 'bid' ? maxAliveBid : maxAliveAsk;
        // Change A: same p95 reference as alive walls; cap at 1.
        const ratio   = Math.min(1, entry.maxNotional / maxSide);
        const curve   = computeCurve(ratio);
        const { edge, fill } = heatColors(entry.side, ratio, true);
        const sideLabel = entry.side === 'bid' ? 'BID' : 'ASK';

        segments.push({
          id:         `dead:${entry.key}`,
          price:      entry.price,
          bandHeight: entry.binSize,
          startTime:  alignToBar(Math.floor(entry.bornAt  / 1000), ivSec),
          endTime:    alignToBar(Math.floor((entry.deadAt ?? 0) / 1000), ivSec),
          color:      edge,
          fillColor:  fill,
          lineWidth:  1,
          intensity:  curve,
          tooltip:    `${sideLabel} ${formatNotional(entry.maxNotional)} · ${formatHHMM(entry.bornAt)}–${formatHHMM(entry.deadAt ?? 0)}`,
        });
      }

      setWallSegments(segments);
    };

    // Run immediately, then on interval.
    // seedVersion dependency: re-runs the effect (incl. the immediate tick())
    // once after server history is seeded, so stripes appear without waiting
    // up to WALL_INTERVAL_MS.
    // floorUsd: changing the floor re-runs so the new filter applies immediately.
    tick();
    const id = setInterval(tick, WALL_INTERVAL_MS);
    return () => clearInterval(id);
  // interval change: ivSec recalculates on next tick — no need to reset history.
  // seedVersion intentionally included so history renders immediately after seed.
  // hook.getBook (stable useCallback) — NOT the hook object, whose identity
  // changes every render (lastPrice state) and restarted the interval ~1/sec.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.getBook, interval, seedVersion, floorUsd]);

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
      {/* Chart sub-header: coin/price info + floor filter + wall legend */}
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

        {/* Floor filter segmented control */}
        <div className="flex items-center gap-0.5">
          {/* Auto = adaptive per-symbol floor (default) */}
          <button
            key="auto"
            onClick={() => setFloorMode('auto')}
            title={`Adaptive floor — significant walls for ${coinLabel} (~$${Math.round(autoFloorUsd / 1000)}K)`}
            className={[
              'px-2 py-0.5 rounded text-[10px] font-semibold transition-colors duration-100 select-none',
              floorMode === 'auto'
                ? 'text-[#C9A646]'
                : 'text-white/40 hover:text-white/60',
            ].join(' ')}
            style={floorMode === 'auto' ? { color: '#C9A646' } : undefined}
          >
            {`Auto · $${Math.round(autoFloorUsd / 1000)}K`}
          </button>
          {FLOOR_OPTIONS.map(opt => {
            const isActive = floorMode !== 'auto' && opt.value === floorMode;
            return (
              <button
                key={opt.value}
                onClick={() => setFloorMode(opt.value)}
                className={[
                  'px-2 py-0.5 rounded text-[10px] font-semibold transition-colors duration-100 select-none',
                  isActive
                    ? 'text-[#C9A646]'
                    : 'text-white/40 hover:text-white/60',
                ].join(' ')}
                style={isActive ? { color: '#C9A646' } : undefined}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Size filter segmented control for depth matrix */}
        <div className="flex items-center gap-1 select-none">
          <span className="text-[10px] text-white/30 mr-0.5">Size</span>
          {([
            { label: 'All', value: 0  as const },
            { label: '≥1%', value: 1  as const },
            { label: '≥5%', value: 5  as const },
            { label: '≥10%', value: 10 as const },
            { label: '≥25%', value: 25 as const },
          ] as const).map(opt => {
            const isActive = opt.value === sizeFilterPct;
            return (
              <button
                key={opt.value}
                onClick={() => setSizeFilterPct(opt.value)}
                className={[
                  'px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors duration-100 select-none',
                  isActive
                    ? 'text-[#C9A646]'
                    : 'text-white/40 hover:text-white/60',
                ].join(' ')}
                style={isActive ? { color: '#C9A646' } : undefined}
                title={opt.value === 0 ? 'Show all orders' : `Show orders ≥ ${opt.value}% of the largest visible wall`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Fit button — restores auto-fit to the liquidity band.
            Always visible: gold when active (auto-fit on), dim when inactive. */}
        <button
          onClick={handleFitClick}
          title={autoFitActive ? 'Both axes fitted (last 6h · liquidity band)' : 'Click to re-fit both axes: time → last 6h, price → liquidity band'}
          aria-label="Fit both axes to last 6h and liquidity band"
          className={[
            'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors duration-100 select-none border',
            autoFitActive
              ? 'border-[#C9A646]/40 text-[#C9A646]'
              : 'border-zinc-700 text-white/30 hover:text-white/60 hover:border-zinc-600',
          ].join(' ')}
          style={autoFitActive ? { color: '#C9A646', borderColor: 'rgba(201,166,70,0.4)' } : undefined}
        >
          <Crosshair className="h-2.5 w-2.5" />
          Fit
        </button>

        {/* Minimal wall legend */}
        <span className="ml-auto flex items-center gap-2 text-[10px] text-white/25 select-none">
          <span
            className="inline-block h-[2px] w-4 rounded-full"
            style={{ background: BID_COLOR }}
          />
          <span>buy walls</span>
          <span
            className="inline-block h-[2px] w-4 rounded-full"
            style={{ background: ASK_COLOR }}
          />
          <span>sell walls</span>
          <span className="opacity-50">· walls + history</span>
        </span>
      </div>

      {/* FinotaurChart fills the full remaining body height.
          wallRenderMode='matrix': DepthMatrixLayer renders BEHIND candles (z-index 5);
          WallHeatLayer (the alive/dead wall stripes) is intentionally kept by passing
          wallSegments — the matrix and the wall layer coexist at different z-indices. */}
      <div className="flex-1 min-h-0">
        <FinotaurChart
          symbol={symbol}
          interval={interval}
          from={from}
          to={to}
          dataSource={dataSource}
          theme="dark"
          height="100%"
          focusRange={focusRange}
          timeFitToken={timeFitToken}
          wallSegments={wallSegments}
          wallRenderMode="matrix"
          depthMatrixColumns={depthMatrix.columns}
          depthMatrixBinSize={depthMatrix.binSize}
          depthMatrixSizeFilterPct={sizeFilterPct}
          depthMatrixFloorUsd={floorUsd}
          depthMatrixCandleIntervalMs={intervalMs(interval)}
          liquidityBand={activeBand}
          onManualPriceScale={handleManualPriceScale}
          onBarsLoad={handleBarsLoad}
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

  // Bump every 30s so the candle window keeps sliding forward — without
  // this the klines are fetched ONCE at mount and the chart freezes at
  // load time while the live walls keep moving (incident 2026-06-11:
  // after an hour open, candles were an hour stale and walls looked
  // "detached" to the right of them).
  const [timeTick, setTimeTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTimeTick(t => t + 1), 30_000);
    return () => clearInterval(iv);
  }, []);

  // Derive chart time window from selected interval (slides with timeTick).
  const { from, to } = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    return { from: now - lookbackSeconds(selectedInterval), to: now };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timeTick intentionally drives recompute
  }, [selectedInterval, timeTick]);

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

