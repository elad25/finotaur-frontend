// src/components/charting/orderflow/flowBinStore.ts
// Pure aggregation engine — footprint/CVD/delta all derive from THIS store.
// No React, no DOM, no network. Mirrors the "pure engine" style of
// src/lib/shadow/scenarioEngine.ts.

import type {
  CvdPoint,
  FlowBin,
  FlowBinStoreConfig,
  FlowCandle,
  FlowCandleView,
  FlowTrade,
} from './types';

// Raw trade ring buffer cap — bounds memory while still allowing re-binning
// (interval/rowSize change) without a network refetch.
const RAW_TRADE_RING_CAP = 250_000;

// Safety cap on price bins per candle — a too-small rowSize (e.g. a stray
// manual entry or a suggestRowSize edge case on a wide-range symbol) would
// otherwise explode the per-candle bins Map, tanking render + memory. Chosen
// generously above any legitimate footprint density (visible clusters rarely
// exceed a few hundred rows even on 'full' detail).
const MAX_PRICE_BINS = 2000;

type ChangeListener = () => void;

// ─────────────────────────────────────────────────────────────────────────
// Serialization (local session recording — flowStorePersistence.ts). Compact
// on purpose: aggregated bins only, NOT the raw trade ring (which can hold
// up to RAW_TRADE_RING_CAP entries) — keeps an IndexedDB snapshot small
// enough to write every ~10s without perf concerns. A hydrated store can
// still receive new live trades normally (they land in whatever candle/bin
// already exists, or create a new one) — only re-binning via setConfig()
// (which replays the raw ring) won't see pre-hydration history, an accepted
// v1 limitation for recorded sessions.
// ─────────────────────────────────────────────────────────────────────────

export interface SerializedFlowBin {
  binPrice: number;
  buyVol: number;
  sellVol: number;
  trades: number;
}

export interface SerializedFlowCandle {
  time: number;
  bins: SerializedFlowBin[];
  totalVol: number;
  delta: number;
  minDelta: number;
  maxDelta: number;
  poc: number | null;
}

/** Compact, JSON-able snapshot of a FlowBinStore's aggregated state — see the header comment above for what's deliberately excluded. */
export interface SerializedFlowBinStore {
  config: FlowBinStoreConfig;
  candles: SerializedFlowCandle[];
}

/**
 * Aggregates a stream of FlowTrade into per-candle, per-price-bin buy/sell
 * volume. Re-binnable: changing intervalSec/rowSize replays the raw ring
 * buffer instead of requiring a refetch.
 */
export class FlowBinStore {
  private config: FlowBinStoreConfig;
  private candles = new Map<number, FlowCandle>();
  // Ascending-sorted candle times, incrementally maintained (binary-insert on
  // first-seen candle time in applySingleTrade; reset alongside `candles` on
  // clear()/setConfig() re-bin). Lets getRange() binary-search a window
  // instead of doing `Array.from(candles.keys()).filter().sort()` on every
  // call — that was O(all candles) per call and getRange() feeds every
  // footprint render frame, so it scaled with total loaded history.
  private sortedTimes: number[] = [];
  // Raw trades kept for re-binning. Fixed-capacity ring: oldest dropped first.
  private rawRing: FlowTrade[] = [];
  private rawRingHead = 0; // write cursor when the ring is full
  private listeners = new Set<ChangeListener>();
  // Per-candle sorted-bins view cache, invalidated by a dirty flag.
  private sortedViewCache = new Map<number, FlowBin[]>();
  private dirtyCandles = new Set<number>();
  // Monotonic count of genuinely NEW trades ingested via the public
  // applyTrades() API — deliberately NOT bumped by setConfig()'s internal
  // re-bin replay (which re-feeds the same trades already counted once).
  // Consumers (FuturesChartTab) use this to distinguish "the store got new
  // data" from "the store just replayed/re-binned existing data" without
  // inspecting notify() call sites — see the render-loop fix in
  // FuturesChartTab.tsx for why this distinction matters.
  private tradesIngested = 0;
  // Set for the duration of setConfig()'s replay so applySingleTrade's
  // caller (applyTrades) knows not to bump tradesIngested for replayed trades.
  private isReplaying = false;
  // Incrementally-tracked raw trade price extent (NOT bin-snapped) — cheap
  // O(1)-per-trade bookkeeping that lets setConfig() validate a candidate
  // rowSize against the bin-count cap without draining the raw ring. Reset
  // alongside candles on clear()/setConfig() re-bin (the replay in setConfig
  // re-populates it via applySingleTrade, so it stays accurate post-rebin).
  private minPrice = Infinity;
  private maxPrice = -Infinity;
  // Whether the last setConfig() call clamped the requested rowSize upward
  // to satisfy MAX_PRICE_BINS — see setConfig()'s doc comment.
  private rowSizeWasClamped = false;

  constructor(config: FlowBinStoreConfig) {
    this.config = config;
  }

  /** Current aggregation config — lets consumers (e.g. FootprintLayer) read
   * intervalSec/rowSize directly instead of inferring them from loaded data. */
  getConfig(): FlowBinStoreConfig {
    return this.config;
  }

  /**
   * True if the most recent setConfig() call clamped the requested rowSize
   * upward to stay within MAX_PRICE_BINS. Lets a future UI surface a note
   * ("row size adjusted — too small for this range") without the store
   * needing any DOM/React dependency itself.
   */
  wasRowSizeClamped(): boolean {
    return this.rowSizeWasClamped;
  }

  setConfig(config: FlowBinStoreConfig): void {
    // Bin-count safety cap: a too-small rowSize against the currently-loaded
    // price span would explode bin counts per candle. Validated against the
    // incrementally-tracked raw price extent (minPrice/maxPrice) — if no
    // candles are loaded yet, the extent is still Infinity/-Infinity and the
    // check is a no-op (skipped); the NEXT setConfig() call after data exists
    // (e.g. the first re-bin) validates normally.
    const clampResult = clampRowSizeForBinCap(config.rowSize, this.minPrice, this.maxPrice);
    this.rowSizeWasClamped = clampResult.clamped;
    const normalizedConfig: FlowBinStoreConfig = { ...config, rowSize: clampResult.rowSize };

    const changed =
      normalizedConfig.intervalSec !== this.config.intervalSec ||
      normalizedConfig.rowSize !== this.config.rowSize;
    this.config = normalizedConfig;
    if (!changed) return;

    // Re-bin from the raw ring buffer with the new config. isReplaying guards
    // tradesIngested from being bumped for trades that were already counted
    // once on their original ingestion — see the field doc comment above.
    const raw = this.drainRawInOrder();
    this.candles.clear();
    this.sortedTimes = [];
    this.sortedViewCache.clear();
    this.dirtyCandles.clear();
    this.rawRing = [];
    this.rawRingHead = 0;
    this.minPrice = Infinity;
    this.maxPrice = -Infinity;
    this.isReplaying = true;
    try {
      this.applyTrades(raw, /* recordRaw */ true);
    } finally {
      this.isReplaying = false;
    }
  }

  clear(): void {
    this.candles.clear();
    this.sortedTimes = [];
    this.sortedViewCache.clear();
    this.dirtyCandles.clear();
    this.rawRing = [];
    this.rawRingHead = 0;
    this.minPrice = Infinity;
    this.maxPrice = -Infinity;
    this.notify();
  }

  /** Ingest new trades (live tick batch or backfill page). */
  applyTrades(trades: FlowTrade[], recordRaw = true): void {
    if (trades.length === 0) return;

    for (const trade of trades) {
      if (recordRaw) this.pushRaw(trade);
      this.applySingleTrade(trade);
    }
    if (!this.isReplaying) this.tradesIngested += trades.length;
    this.notify();
  }

  /**
   * Monotonic count of genuinely new trades ingested (excludes setConfig's
   * internal re-bin replay). Consumers can diff this across renders/effects
   * to tell "new data arrived" apart from "the store merely re-binned" —
   * see FuturesChartTab.tsx's barsRefreshToken guard.
   */
  getTradesIngested(): number {
    return this.tradesIngested;
  }

  getCandle(timeSec: number): FlowCandleView | null {
    const candle = this.candles.get(timeSec);
    if (!candle) return null;
    return this.toView(candle);
  }

  getRange(fromSec: number, toSec: number): FlowCandleView[] {
    const out: FlowCandleView[] = [];
    // sortedTimes is ascending and incrementally maintained (binary-insert in
    // applySingleTrade — see the field doc comment), so the window
    // [fromSec, toSec] is two binary searches + a linear walk over just the
    // matching slice, instead of a filter+sort over ALL candle times on every
    // call (this used to be O(all candles) and getRange() feeds every
    // footprint render frame, so cost scaled with total loaded history).
    const startIdx = lowerBound(this.sortedTimes, fromSec);
    for (let i = startIdx; i < this.sortedTimes.length; i++) {
      const t = this.sortedTimes[i];
      if (t > toSec) break;
      const candle = this.candles.get(t);
      if (candle) out.push(this.toView(candle));
    }
    return out;
  }

  /** Cumulative delta per candle within [fromSec, toSec], reset to 0 at the window start. */
  getCvdSeries(fromSec: number, toSec: number): CvdPoint[] {
    const range = this.getRange(fromSec, toSec);
    let running = 0;
    return range.map((candle) => {
      running += candle.delta;
      return { time: candle.time, cvd: running };
    });
  }

  onChange(cb: ChangeListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * Readonly snapshot of every raw trade currently held in the ring buffer,
   * ascending by time. Lets a consumer (e.g. DatabentoBarsSource) derive bars
   * from the SAME trades that fill the footprint, instead of maintaining a
   * second independent trade cache — see DatabentoBarsSource.ts for why this
   * matters (single source of truth for "does the store have any data yet").
   */
  getRawTrades(): readonly FlowTrade[] {
    return this.drainRawInOrder();
  }

  /**
   * Compact, JSON-able snapshot of the current aggregated state — see
   * SerializedFlowBinStore's doc comment for what's included/excluded.
   * Used by flowStorePersistence.ts to record a futures NT8 session into
   * IndexedDB so it survives a bridge disconnect or a same-day tab reopen.
   */
  serialize(): SerializedFlowBinStore {
    const candles: SerializedFlowCandle[] = [];
    for (const time of this.sortedTimes) {
      const candle = this.candles.get(time);
      if (!candle) continue;
      candles.push({
        time: candle.time,
        bins: Array.from(candle.bins.values()).map((bin) => ({ ...bin })),
        totalVol: candle.totalVol,
        delta: candle.delta,
        minDelta: candle.minDelta,
        maxDelta: candle.maxDelta,
        poc: candle.poc,
      });
    }
    return { config: this.config, candles };
  }

  /**
   * Repopulates the store from a serialize() snapshot, REPLACING whatever
   * candles/bins currently exist (raw ring is cleared — a hydrated store
   * can't be re-binned via setConfig() until fresh live trades arrive; see
   * the header comment above SerializedFlowBinStore). Live trades applied
   * after hydrate() land normally (existing candle/bin lookups still work).
   * Bumps tradesIngested by the recovered trade-print count so
   * ingestion-count-gated consumers (e.g. a bars-refresh effect) notice the
   * hydrated data, then notifies listeners once.
   *
   * Also repopulates the raw ring with a SMALL set of synthetic,
   * representative trades derived from the bins (one buy print + one sell
   * print per non-empty bin, at that bin's price) — purely so
   * DatabentoBarsSource's tradesToBars() (which only ever reads
   * getRawTrades(), never the aggregated candles) can still derive an OHLCV
   * candlestick series to render/position the footprint over. These
   * synthetic entries are NOT persisted (flowStorePersistence.ts only ever
   * writes serialize()'s aggregated-bins-only output) and open/close are a
   * best-effort approximation (bin insertion order, not true trade
   * sequence) — acceptable for a recorded-session recap, not a precision
   * OHLC source.
   */
  hydrate(data: SerializedFlowBinStore): void {
    this.candles.clear();
    this.sortedTimes = [];
    this.sortedViewCache.clear();
    this.dirtyCandles.clear();
    this.rawRing = [];
    this.rawRingHead = 0;
    this.minPrice = Infinity;
    this.maxPrice = -Infinity;
    this.config = data.config;

    let recoveredPrints = 0;
    for (const c of data.candles) {
      const bins = new Map<number, FlowBin>();
      for (const bin of c.bins) {
        bins.set(bin.binPrice, { ...bin });
        this.minPrice = Math.min(this.minPrice, bin.binPrice);
        this.maxPrice = Math.max(this.maxPrice, bin.binPrice + this.config.rowSize);
        recoveredPrints += bin.trades;

        // Synthetic raw trades — see the doc comment above for why. Recorded
        // WITHOUT going through pushRaw's ring-cap accounting concerns
        // beyond the cap itself (still respected via pushRaw).
        if (bin.buyVol > 0) {
          this.pushRaw({ time: c.time * 1000, price: bin.binPrice, qty: bin.buyVol, buyerAggressor: true });
        }
        if (bin.sellVol > 0) {
          this.pushRaw({ time: c.time * 1000, price: bin.binPrice, qty: bin.sellVol, buyerAggressor: false });
        }
      }
      this.candles.set(c.time, {
        time: c.time,
        bins,
        totalVol: c.totalVol,
        delta: c.delta,
        minDelta: c.minDelta,
        maxDelta: c.maxDelta,
        poc: c.poc,
      });
      insertSorted(this.sortedTimes, c.time);
    }

    if (recoveredPrints > 0) this.tradesIngested += recoveredPrints;
    this.notify();
  }

  /**
   * TradingView's auto row-size convention: 0.2 * average(high-low) of the
   * last 20 bars, snapped DOWN to a multiple of tickSize, minimum 1 tick.
   */
  static suggestRowSize(bars: { high: number; low: number }[], tickSize: number): number {
    const sample = bars.slice(-20);
    if (sample.length === 0 || tickSize <= 0) return tickSize > 0 ? tickSize : 1;

    const avgRange =
      sample.reduce((sum, bar) => sum + (bar.high - bar.low), 0) / sample.length;
    const raw = avgRange * 0.2;
    const snapped = Math.floor(raw / tickSize) * tickSize;
    return snapped >= tickSize ? snapped : tickSize;
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private pushRaw(trade: FlowTrade): void {
    if (this.rawRing.length < RAW_TRADE_RING_CAP) {
      this.rawRing.push(trade);
    } else {
      this.rawRing[this.rawRingHead % RAW_TRADE_RING_CAP] = trade;
      this.rawRingHead += 1;
    }
  }

  private drainRawInOrder(): FlowTrade[] {
    if (this.rawRing.length < RAW_TRADE_RING_CAP) {
      return this.rawRing.slice();
    }
    const oldest = this.rawRingHead % RAW_TRADE_RING_CAP;
    return [...this.rawRing.slice(oldest), ...this.rawRing.slice(0, oldest)];
  }

  private applySingleTrade(trade: FlowTrade): void {
    const { intervalSec, rowSize } = this.config;
    const candleTime = Math.floor(trade.time / 1000 / intervalSec) * intervalSec;
    const binPrice = Math.floor(trade.price / rowSize) * rowSize;

    // Raw (NOT bin-snapped) price extent, tracked incrementally for the
    // MAX_PRICE_BINS cap check in setConfig() — see clampRowSizeForBinCap().
    this.minPrice = Math.min(this.minPrice, trade.price);
    this.maxPrice = Math.max(this.maxPrice, trade.price);

    let candle = this.candles.get(candleTime);
    if (!candle) {
      candle = {
        time: candleTime,
        bins: new Map(),
        totalVol: 0,
        delta: 0,
        minDelta: 0,
        maxDelta: 0,
        poc: null,
      };
      this.candles.set(candleTime, candle);
      // Binary-insert into the ascending sortedTimes index — trades can
      // arrive out of time order (backfill pages, late live ticks), so this
      // is NOT always a push-to-end; lowerBound finds the correct insertion
      // point regardless of arrival order.
      insertSorted(this.sortedTimes, candleTime);
    }

    let bin = candle.bins.get(binPrice);
    if (!bin) {
      bin = { binPrice, buyVol: 0, sellVol: 0, trades: 0 };
      candle.bins.set(binPrice, bin);
    }

    if (trade.buyerAggressor) {
      bin.buyVol += trade.qty;
    } else {
      bin.sellVol += trade.qty;
    }
    bin.trades += 1; // one aggTrade = 1 print

    candle.totalVol += trade.qty;
    candle.delta += trade.buyerAggressor ? trade.qty : -trade.qty;
    candle.minDelta = Math.min(candle.minDelta, candle.delta);
    candle.maxDelta = Math.max(candle.maxDelta, candle.delta);

    if (
      candle.poc === null ||
      bin.buyVol + bin.sellVol > (candle.bins.get(candle.poc)?.buyVol ?? 0) +
        (candle.bins.get(candle.poc)?.sellVol ?? 0)
    ) {
      candle.poc = binPrice;
    }

    this.dirtyCandles.add(candleTime);
  }

  private toView(candle: FlowCandle): FlowCandleView {
    let sorted = this.sortedViewCache.get(candle.time);
    if (!sorted || this.dirtyCandles.has(candle.time)) {
      sorted = Array.from(candle.bins.values()).sort((a, b) => a.binPrice - b.binPrice);
      this.sortedViewCache.set(candle.time, sorted);
      this.dirtyCandles.delete(candle.time);
    }
    return {
      time: candle.time,
      bins: sorted,
      totalVol: candle.totalVol,
      delta: candle.delta,
      minDelta: candle.minDelta,
      maxDelta: candle.maxDelta,
      poc: candle.poc,
    };
  }

  private notify(): void {
    for (const cb of this.listeners) cb();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Sorted-index helpers (module-level, no `this` — trivial to unit test in
// isolation). Used by FlowBinStore.getRange()/applySingleTrade() to maintain
// `sortedTimes` incrementally instead of re-sorting all candle times per call.
// ─────────────────────────────────────────────────────────────────────────

/** Index of the first element >= target (standard binary lower-bound). Returns arr.length if none qualify. */
function lowerBound(arr: number[], target: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/** Insert `value` into an ascending-sorted array at its correct position. Assumes `value` is not already present (caller only inserts on first-seen candle times). */
function insertSorted(arr: number[], value: number): void {
  const idx = lowerBound(arr, value);
  arr.splice(idx, 0, value);
}

// ─────────────────────────────────────────────────────────────────────────
// Bin-count cap helper (module-level, pure — trivial to unit test in
// isolation). Used by FlowBinStore.setConfig() to keep a candidate rowSize
// from exploding per-candle bin counts against the currently-loaded raw
// price extent. See MAX_PRICE_BINS's doc comment for why the cap exists.
// ─────────────────────────────────────────────────────────────────────────

interface RowSizeClampResult {
  rowSize: number;
  clamped: boolean;
}

/** Same inclusive bin-count formula applySingleTrade's binning implies: floor(price/rowSize) buckets, min through max inclusive. */
function computeBinCount(rowSize: number, minPrice: number, maxPrice: number): number {
  return Math.floor(maxPrice / rowSize) - Math.floor(minPrice / rowSize) + 1;
}

/**
 * Validates `rowSize` against [minPrice, maxPrice] (the raw, un-snapped
 * trade price extent) and clamps it UP to the smallest value that keeps the
 * resulting bin count within MAX_PRICE_BINS. No-op (never clamps) when:
 *  - rowSize is non-positive (caller's problem, not this guard's)
 *  - minPrice/maxPrice aren't finite yet (no candles loaded — "skip the
 *    check and validate on first re-bin", per the task spec)
 *  - the span collapses to 0 (all trades at exactly one price)
 *  - the requested rowSize already satisfies the cap
 */
function clampRowSizeForBinCap(rowSize: number, minPrice: number, maxPrice: number): RowSizeClampResult {
  if (rowSize <= 0 || !Number.isFinite(minPrice) || !Number.isFinite(maxPrice)) {
    return { rowSize, clamped: false };
  }
  const span = maxPrice - minPrice;
  if (span <= 0) return { rowSize, clamped: false };

  if (computeBinCount(rowSize, minPrice, maxPrice) <= MAX_PRICE_BINS) {
    return { rowSize, clamped: false };
  }

  // Smallest rowSize that satisfies span / rowSize <= MAX_PRICE_BINS - 1
  // (the "-1" accounts for the +1 inclusive-bucket term in computeBinCount).
  let candidate = span / (MAX_PRICE_BINS - 1);
  // Floor-boundary safety: floor() bucketing can occasionally land the
  // "exact" minimal rowSize one bin over the cap (e.g. when minPrice/rowSize
  // sits just above an integer boundary) — nudge upward in tiny steps until
  // the ACTUAL bin count satisfies the cap, rather than trusting the formula
  // alone. Bounded so this can never loop indefinitely.
  for (let guard = 0; guard < 10 && computeBinCount(candidate, minPrice, maxPrice) > MAX_PRICE_BINS; guard++) {
    candidate *= 1.001;
  }
  return { rowSize: candidate > rowSize ? candidate : rowSize, clamped: true };
}

// ─────────────────────────────────────────────────────────────────────────
// Self-test — guarded, never runs in production. Exercise from a scratch
// script or a future test runner via `import { selftest } from './flowBinStore'`.
// ─────────────────────────────────────────────────────────────────────────
export function selftest(): void {
  if (!import.meta.env.DEV) return;

  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`flowBinStore.selftest failed: ${msg}`);
  };

  const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });

  // Two buys + one sell in the same candle/bin.
  store.applyTrades([
    { time: 0, price: 100.4, qty: 1, buyerAggressor: true },
    { time: 1000, price: 100.4, qty: 2, buyerAggressor: true },
    { time: 2000, price: 100.4, qty: 1.5, buyerAggressor: false },
  ]);

  const candle = store.getCandle(0);
  assert(candle !== null, 'expected candle at t=0');
  assert(candle!.totalVol === 4.5, `totalVol expected 4.5, got ${candle!.totalVol}`);
  assert(candle!.delta === 1.5, `delta expected 1.5, got ${candle!.delta}`);
  assert(candle!.bins.length === 1, `expected 1 bin, got ${candle!.bins.length}`);
  assert(candle!.bins[0].binPrice === 100, `binPrice expected 100, got ${candle!.bins[0].binPrice}`);
  assert(candle!.poc === 100, `poc expected 100, got ${candle!.poc}`);

  // Second candle (61s later) + a different price bin.
  store.applyTrades([
    { time: 61_000, price: 105.9, qty: 3, buyerAggressor: false },
  ]);
  const cvd = store.getCvdSeries(0, 120);
  assert(cvd.length === 2, `expected 2 cvd points, got ${cvd.length}`);
  assert(cvd[0].cvd === 1.5, `first cvd expected 1.5, got ${cvd[0].cvd}`);
  assert(cvd[1].cvd === -1.5, `second cvd expected -1.5, got ${cvd[1].cvd}`);

  // Re-binning: widen rowSize, raw ring replay should reproduce single bin.
  store.setConfig({ intervalSec: 60, rowSize: 10 });
  const rebinned = store.getCandle(0);
  assert(rebinned !== null && rebinned.bins.length === 1, 're-bin expected 1 bin at rowSize=10');
  assert(rebinned!.bins[0].binPrice === 100, `re-bin binPrice expected 100, got ${rebinned!.bins[0].binPrice}`);

  // suggestRowSize: avg range 10 over 2 bars * 0.2 = 2, snapped to tickSize 0.25 → 2.0
  const suggested = FlowBinStore.suggestRowSize(
    [
      { high: 110, low: 100 },
      { high: 112, low: 102 },
    ],
    0.25,
  );
  assert(suggested === 2, `suggestRowSize expected 2, got ${suggested}`);

  // eslint-disable-next-line no-console
  console.info('[flowBinStore.selftest] all assertions passed');
}
