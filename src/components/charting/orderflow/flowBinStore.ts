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

type ChangeListener = () => void;

/**
 * Aggregates a stream of FlowTrade into per-candle, per-price-bin buy/sell
 * volume. Re-binnable: changing intervalSec/rowSize replays the raw ring
 * buffer instead of requiring a refetch.
 */
export class FlowBinStore {
  private config: FlowBinStoreConfig;
  private candles = new Map<number, FlowCandle>();
  // Raw trades kept for re-binning. Fixed-capacity ring: oldest dropped first.
  private rawRing: FlowTrade[] = [];
  private rawRingHead = 0; // write cursor when the ring is full
  private listeners = new Set<ChangeListener>();
  // Per-candle sorted-bins view cache, invalidated by a dirty flag.
  private sortedViewCache = new Map<number, FlowBin[]>();
  private dirtyCandles = new Set<number>();

  constructor(config: FlowBinStoreConfig) {
    this.config = config;
  }

  /** Current aggregation config — lets consumers (e.g. FootprintLayer) read
   * intervalSec/rowSize directly instead of inferring them from loaded data. */
  getConfig(): FlowBinStoreConfig {
    return this.config;
  }

  setConfig(config: FlowBinStoreConfig): void {
    const changed =
      config.intervalSec !== this.config.intervalSec || config.rowSize !== this.config.rowSize;
    this.config = config;
    if (!changed) return;

    // Re-bin from the raw ring buffer with the new config.
    const raw = this.drainRawInOrder();
    this.candles.clear();
    this.sortedViewCache.clear();
    this.dirtyCandles.clear();
    this.rawRing = [];
    this.rawRingHead = 0;
    this.applyTrades(raw, /* recordRaw */ true);
  }

  clear(): void {
    this.candles.clear();
    this.sortedViewCache.clear();
    this.dirtyCandles.clear();
    this.rawRing = [];
    this.rawRingHead = 0;
    this.notify();
  }

  /** Ingest new trades (live tick batch or backfill page). */
  applyTrades(trades: FlowTrade[], recordRaw = true): void {
    if (trades.length === 0) return;

    for (const trade of trades) {
      if (recordRaw) this.pushRaw(trade);
      this.applySingleTrade(trade);
    }
    this.notify();
  }

  getCandle(timeSec: number): FlowCandleView | null {
    const candle = this.candles.get(timeSec);
    if (!candle) return null;
    return this.toView(candle);
  }

  getRange(fromSec: number, toSec: number): FlowCandleView[] {
    const out: FlowCandleView[] = [];
    // Candle count in a window is small (chart viewport), so a full scan of
    // this.candles (also bounded — one entry per visible interval bucket)
    // is cheap; avoids maintaining a separate sorted-time index.
    const times = Array.from(this.candles.keys())
      .filter((t) => t >= fromSec && t <= toSec)
      .sort((a, b) => a - b);
    for (const t of times) {
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
    }

    let bin = candle.bins.get(binPrice);
    if (!bin) {
      bin = { binPrice, buyVol: 0, sellVol: 0 };
      candle.bins.set(binPrice, bin);
    }

    if (trade.buyerAggressor) {
      bin.buyVol += trade.qty;
    } else {
      bin.sellVol += trade.qty;
    }

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
