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
import { FinotaurChart, type WallSegment } from '@/components/charting/FinotaurChart';
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

/**
 * Derive up to 7 bid + 7 ask wall specs from the raw order book using
 * two independent selection bands per side:
 *
 * NEAR band  |dist| ≤ 2.5% of mid  → p90 / 25%-of-max threshold, top 4
 * FAR  band  2.5% < |dist| ≤ 10%   → p95 / 30%-of-max threshold, top 3
 *
 * Two-band approach prevents distant mega-walls (e.g. BTC $13-22 M at
 * 57-60 K) from raising the single threshold so high that every near-
 * price wall ($1-3 M at ±0.5%) gets culled — which caused a blank order
 * book on zoom-in (Bookmap-style view).
 *
 * Aggregation into bins (same binSize) and WallSpec shape are unchanged.
 * Downstream size-ratio rendering (lineWidth/alpha vs max notional) is
 * also unchanged — far mega-walls still render thicker/brighter.
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
  const rangePct = 0.10; // ±10% of mid — show distant walls before price reaches them
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

  // Band constants
  const NEAR_MAX_DIST_PCT = 0.025; // |price - mid| / mid ≤ 2.5%  → NEAR
  const FAR_MAX_DIST_PCT  = 0.10;  // 2.5% < dist ≤ 10%           → FAR
  const NEAR_PCTL         = 0.90;  // p90 of NEAR nonzero bins
  const NEAR_FRAC_MAX     = 0.25;  // 25% of largest NEAR bin
  const NEAR_TOP_N        = 4;
  const FAR_PCTL          = 0.95;  // p95 of FAR nonzero bins
  const FAR_FRAC_MAX      = 0.30;  // 30% of largest FAR bin
  const FAR_TOP_N         = 3;
  // Absolute floor: when a band empties out (e.g. mega-walls get pulled),
  // its relative thresholds collapse and dust orders ($407) slip through.
  // No wall below this notional is ever shown, on any coin.
  const MIN_WALL_NOTIONAL_USD = 150_000;

  /**
   * Select up to topN walls from bins whose bin-centre distance from mid
   * falls within [minDistPct, maxDistPct) of mid.
   * Threshold = max(pctl of nonzero values, fracOfMax × largest value).
   * Returns empty array if the band contains no nonzero bins.
   */
  function selectBand(
    bins: Map<number, number>,
    side: 'bid' | 'ask',
    minDistPct: number,
    maxDistPct: number,
    pctl: number,
    fracOfMax: number,
    topN: number,
  ): WallSpec[] {
    // Collect bins that fall inside this distance band
    const bandEntries = Array.from(bins.entries()).filter(([binPrice]) => {
      const dist = Math.abs(binPrice - mid) / mid;
      return dist >= minDistPct && dist < maxDistPct;
    });

    const nonzeroVals = bandEntries.map(([, n]) => n).filter(v => v > 0);
    if (nonzeroVals.length === 0) return [];

    const sorted  = [...nonzeroVals].sort((a, b) => a - b);
    const pctlIdx = Math.floor(sorted.length * pctl);
    const pctlVal = sorted[Math.min(pctlIdx, sorted.length - 1)];
    const largest = sorted[sorted.length - 1];
    const threshold = Math.max(pctlVal, largest * fracOfMax, MIN_WALL_NOTIONAL_USD);

    const candidates = bandEntries
      .filter(([, n]) => n >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

    return candidates.map(([price, notional]) => ({
      id: `${side}-${price}`,
      price,
      notional,
      side,
      binSize,
    }));
  }

  function selectWalls(bins: Map<number, number>, side: 'bid' | 'ask'): WallSpec[] {
    return [
      ...selectBand(bins, side, 0,                 NEAR_MAX_DIST_PCT, NEAR_PCTL, NEAR_FRAC_MAX, NEAR_TOP_N),
      ...selectBand(bins, side, NEAR_MAX_DIST_PCT,  FAR_MAX_DIST_PCT,  FAR_PCTL,  FAR_FRAC_MAX,  FAR_TOP_N),
    ];
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
// Symbol change via key= causes a full remount, which resets all tracking refs
// to their initial empty state automatically — no explicit reset needed.

const WALL_INTERVAL_MS = 3_000; // recompute walls every 3 seconds

// Wall lifecycle constants
const WALL_MISS_TICKS_UNTIL_DEAD = 2;   // ticks without detection before marking dead
const WALL_MIN_LIFETIME_MS       = 45_000; // walls alive < 45s are dropped on death (noise)
const WALL_DEAD_CAP              = 40;  // max stored dead walls (oldest evicted by deadAt)

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
 * Heat-ramp color helper — 3-tier palette keyed by side + explicit tier.
 *
 * ASKS (red family):
 *   dim     → edge rgba(220,38,38,0.50),   fill rgba(220,38,38,0.16)
 *   mid     → edge rgba(248,80,80,0.80),   fill rgba(220,38,38,0.32)
 *   intense → edge rgba(255,140,140,0.95), fill rgba(248,90,90,0.50)
 *
 * BIDS (emerald family):
 *   dim     → edge rgba(34,197,94,0.45),   fill rgba(34,197,94,0.14)
 *   mid     → edge rgba(52,211,123,0.75),  fill rgba(34,197,94,0.30)
 *   intense → edge rgba(140,255,190,0.95), fill rgba(80,230,150,0.48)
 *
 * Dead walls: halve the fill alpha (cap 0.20), edge alpha 0.25.
 */
function heatColors(
  side: 'bid' | 'ask',
  tier: 'dim' | 'mid' | 'intense',
  dead: boolean,
): { edge: string; fill: string } {
  let edge: string;
  let fill: string;

  if (side === 'ask') {
    if (tier === 'intense') {
      edge = 'rgba(255,140,140,0.95)';
      fill = 'rgba(248,90,90,0.50)';
    } else if (tier === 'mid') {
      edge = 'rgba(248,80,80,0.80)';
      fill = 'rgba(220,38,38,0.32)';
    } else {
      edge = 'rgba(220,38,38,0.50)';
      fill = 'rgba(220,38,38,0.16)';
    }
  } else {
    // bid — emerald family unchanged
    if (tier === 'intense') {
      edge = 'rgba(140,255,190,0.95)';
      fill = 'rgba(80,230,150,0.48)';
    } else if (tier === 'mid') {
      edge = 'rgba(52,211,123,0.75)';
      fill = 'rgba(34,197,94,0.30)';
    } else {
      edge = 'rgba(34,197,94,0.45)';
      fill = 'rgba(34,197,94,0.14)';
    }
  }

  if (dead) {
    // Parse fill alpha and halve it (cap 0.20); fix edge to 0.25.
    // We reconstruct via a known-format regex rather than re-parsing rgba strings.
    const fillMatch = fill.match(/rgba\(([^,]+),([^,]+),([^,]+),([\d.]+)\)/);
    if (fillMatch) {
      const deadFillAlpha = Math.min(0.20, parseFloat(fillMatch[4]) / 2);
      fill = `rgba(${fillMatch[1]},${fillMatch[2]},${fillMatch[3]},${deadFillAlpha.toFixed(2)})`;
    }
    const edgeMatch = edge.match(/rgba\(([^,]+),([^,]+),([^,]+),[\d.]+\)/);
    if (edgeMatch) {
      edge = `rgba(${edgeMatch[1]},${edgeMatch[2]},${edgeMatch[3]},0.25)`;
    }
  }

  return { edge, fill };
}

/** Tracked wall entry — lives in the useRef Map keyed by `${side}:${binPrice}`. */
interface TrackedWall {
  key: string;
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
      const detected = computeWalls(bids, asks);
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
        // If entry exists but deadAt is set, a revived wall at the same price
        // is treated as a new wall — leave the dead entry for history, create fresh.
        else if (entry.deadAt !== null) {
          const freshKey = `${w.side}:${w.price}:${nowMs}`;
          tracked.set(freshKey, {
            key:         freshKey,
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

      // ── Age out walls not detected this tick ───────────────
      for (const entry of Array.from(tracked.values())) {
        if (entry.deadAt !== null) continue; // already dead
        if (detectedKeys.has(entry.key)) continue; // seen this tick

        entry.missedTicks++;
        if (entry.missedTicks >= WALL_MISS_TICKS_UNTIL_DEAD) {
          entry.deadAt = nowMs;

          const lifetime = nowMs - entry.bornAt;
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
      // Tier assignment: per-side rank among currently alive walls.
      // rank 0 → 'intense'; ranks 1-2 → 'mid'; rest → 'dim'.
      // This prevents a distant mega-wall from washing out near walls.
      const aliveWalls = Array.from(tracked.values()).filter(e => e.deadAt === null);

      // Build rank maps per side (sorted desc by maxNotional).
      function buildRankMap(side: 'bid' | 'ask'): Map<string, number> {
        const sideSorted = aliveWalls
          .filter(e => e.side === side)
          .sort((a, b) => b.maxNotional - a.maxNotional);
        const map = new Map<string, number>();
        sideSorted.forEach((e, i) => map.set(e.key, i));
        return map;
      }
      const bidRanks = buildRankMap('bid');
      const askRanks = buildRankMap('ask');

      function rankToTier(rank: number): 'dim' | 'mid' | 'intense' {
        if (rank === 0) return 'intense';
        if (rank <= 2)  return 'mid';
        return 'dim';
      }

      // Max alive notional per side — used only for dead-wall tier assignment.
      const maxAliveBid = aliveWalls
        .filter(e => e.side === 'bid')
        .reduce((m, e) => Math.max(m, e.maxNotional), 0);
      const maxAliveAsk = aliveWalls
        .filter(e => e.side === 'ask')
        .reduce((m, e) => Math.max(m, e.maxNotional), 0);

      const segments: WallSegment[] = [];

      // Alive walls — rendered as colored Bookmap-style band stripes.
      for (const entry of aliveWalls) {
        const rankMap = entry.side === 'bid' ? bidRanks : askRanks;
        const rank    = rankMap.get(entry.key) ?? 99;
        const tier    = rankToTier(rank);
        const { edge, fill } = heatColors(entry.side, tier, false);
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
          // No axis label — tooltip replaces it.
          tooltip:    `${sideLabel} ${formatNotional(entry.maxNotional)} · since ${formatHHMM(entry.bornAt)}`,
        });
      }

      // Dead walls — same band geometry, dimmed via heatColors(dead=true).
      // Tier is derived from a ratio vs the current alive max for that side,
      // so a dead wall's tier is contextually consistent with the live set.
      for (const entry of dead) {
        const maxAliveSide = entry.side === 'bid' ? maxAliveBid : maxAliveAsk;
        const ratio = maxAliveSide > 0 ? entry.maxNotional / maxAliveSide : 0;
        const tier: 'dim' | 'mid' | 'intense' =
          ratio > 0.66 ? 'intense' : ratio > 0.33 ? 'mid' : 'dim';
        const { edge, fill } = heatColors(entry.side, tier, true);
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
          // No axis label — tooltip replaces it.
          tooltip:    `${sideLabel} ${formatNotional(entry.maxNotional)} · ${formatHHMM(entry.bornAt)}–${formatHHMM(entry.deadAt ?? 0)}`,
        });
      }

      setWallSegments(segments);
    };

    // Run immediately, then on interval
    tick();
    const id = setInterval(tick, WALL_INTERVAL_MS);
    return () => clearInterval(id);
  // interval change: ivSec recalculates on next tick — no need to reset history
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook, interval]);

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
          <span>buy walls</span>
          <span
            className="inline-block h-[2px] w-4 rounded-full"
            style={{ background: ASK_COLOR }}
          />
          <span>sell walls</span>
          <span className="opacity-50">· walls + history</span>
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
          wallSegments={wallSegments}
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

