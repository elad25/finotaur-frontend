// src/components/charting/orderflow/barBuilder.ts
// Bar-type FOUNDATION — alternative bar aggregations derived from the same
// FlowTrade stream that feeds FlowBinStore (ATAS-style tick/volume bars, in
// addition to the existing time-bucketed bars from tradesToBars.ts).
//
// Scope note: this module is data-layer only. It is NOT yet wired into any
// chart — OrderFlowControls exposes a disabled "Bars: Time | Tick | Volume"
// stub (Time active) and ChartTab continues to render Binance klines
// unchanged. See the FINOTAUR bar-type milestone plan for the follow-up
// integration phase.
//
// Pure TypeScript, no React, no DOM — mirrors the "pure engine" style of
// flowBinStore.ts / tradesToBars.ts.

import type { UTCTimestamp } from 'lightweight-charts';
import type { FlowBin, FlowTrade } from './types';

/**
 * Selects how the trade stream is folded into bars.
 * - 'time': bucket by wall-clock interval (delegates to the same bucketing
 *   math as tradesToBars.ts — a fixed-width time window).
 * - 'tick': close a bar every N trades (prints), regardless of elapsed time
 *   or volume.
 * - 'volume': close a bar once cumulative traded quantity within the bar
 *   reaches >= volumePerBar. A single oversized trade that crosses the
 *   threshold closes the bar it lands in — trades are never split across
 *   bars; the overflow stays in that bar and the next bar starts fresh at
 *   the next trade.
 */
export type BarAggregation =
  | { kind: 'time'; intervalMs: number }
  | { kind: 'tick'; tradesPerBar: number }
  | { kind: 'volume'; volumePerBar: number };

/**
 * One aggregated bar produced by buildBars()/BarBuilder, independent of
 * lightweight-charts' Bar type (which only carries time/OHLC/volume) — this
 * shell also carries delta + trade metadata + the true first/last trade
 * timestamps within the bar (distinct from a rounded bucket boundary, which
 * only 'time' bars have).
 */
export interface FlowCandleShell {
  /** Bucket time (seconds, UTCTimestamp) — for 'time' bars this is the
   * bucket boundary; for 'tick'/'volume' bars this equals startTime/1000
   * floored to the second, i.e. the first trade's time. */
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** buyVol - sellVol, signed by aggressor side (buyerAggressor => +qty). */
  delta: number;
  /** Epoch ms of the first trade folded into this bar. */
  startTime: number;
  /** Epoch ms of the last trade folded into this bar. */
  endTime: number;
  /** Count of individual trades (prints) folded into this bar. */
  tradeCount: number;
}

function bucketTimeSec(ms: number, intervalMs: number): number {
  return Math.floor(ms / intervalMs) * (intervalMs / 1000);
}

function newShell(trade: FlowTrade, timeSec: number): FlowCandleShell {
  const signedQty = trade.buyerAggressor ? trade.qty : -trade.qty;
  return {
    time: timeSec as UTCTimestamp,
    open: trade.price,
    high: trade.price,
    low: trade.price,
    close: trade.price,
    volume: trade.qty,
    delta: signedQty,
    startTime: trade.time,
    endTime: trade.time,
    tradeCount: 1,
  };
}

function foldInto(shell: FlowCandleShell, trade: FlowTrade): void {
  shell.high = Math.max(shell.high, trade.price);
  shell.low = Math.min(shell.low, trade.price);
  shell.close = trade.price;
  shell.volume += trade.qty;
  shell.delta += trade.buyerAggressor ? trade.qty : -trade.qty;
  shell.endTime = trade.time;
  shell.tradeCount += 1;
}

/**
 * Deterministic fold over an ascending-by-time trade stream, producing OHLC
 * bars per the given aggregation. Always equals folding BarBuilder.push()
 * over the same trades in the same order (see BarBuilder below) — the two
 * paths share the same per-trade transition logic.
 */
export function buildBars(trades: FlowTrade[], agg: BarAggregation): FlowCandleShell[] {
  const builder = new BarBuilder(agg);
  const bars: FlowCandleShell[] = [];
  for (const trade of trades) {
    const closed = builder.push(trade);
    if (closed) bars.push(closed);
  }
  const tail = builder.current();
  if (tail) bars.push(tail);
  return bars;
}

/**
 * Incremental bar builder for live use — push() delivers a CLOSED bar the
 * moment one closes (returns null while a bar is still open), and current()
 * exposes the in-progress bar (or null before the first trade). Folding
 * push() over a trade stream produces the same closed bars as buildBars()
 * over that same stream (buildBars is implemented on top of this class).
 */
export class BarBuilder {
  private readonly agg: BarAggregation;
  private open: FlowCandleShell | null = null;

  constructor(agg: BarAggregation) {
    this.agg = agg;
  }

  /** Returns the bar that just CLOSED as a result of this trade, or null if
   * the current bar is still open (the trade was folded into it). */
  push(trade: FlowTrade): FlowCandleShell | null {
    switch (this.agg.kind) {
      case 'time':
        return this.pushTime(trade, this.agg.intervalMs);
      case 'tick':
        return this.pushTick(trade, this.agg.tradesPerBar);
      case 'volume':
        return this.pushVolume(trade, this.agg.volumePerBar);
      default: {
        // Exhaustiveness guard — BarAggregation is a closed union.
        const _never: never = this.agg;
        throw new Error(`buildBars: unknown aggregation kind ${JSON.stringify(_never)}`);
      }
    }
  }

  /** The in-progress (not-yet-closed) bar, or null if no trade has arrived
   * since construction / the last close. */
  current(): FlowCandleShell | null {
    return this.open;
  }

  private pushTime(trade: FlowTrade, intervalMs: number): FlowCandleShell | null {
    const bucketSec = bucketTimeSec(trade.time, intervalMs);

    if (!this.open) {
      this.open = newShell(trade, bucketSec);
      return null;
    }

    if (this.open.time === bucketSec) {
      foldInto(this.open, trade);
      return null;
    }

    // Trade belongs to a new bucket — close the current bar, start a fresh one.
    const closed = this.open;
    this.open = newShell(trade, bucketSec);
    return closed;
  }

  private pushTick(trade: FlowTrade, tradesPerBar: number): FlowCandleShell | null {
    if (tradesPerBar <= 0) throw new Error('buildBars: tradesPerBar must be > 0');

    if (!this.open) {
      this.open = newShell(trade, Math.floor(trade.time / 1000));
      if (this.open.tradeCount >= tradesPerBar) {
        const closed = this.open;
        this.open = null;
        return closed;
      }
      return null;
    }

    foldInto(this.open, trade);
    if (this.open.tradeCount >= tradesPerBar) {
      const closed = this.open;
      this.open = null;
      return closed;
    }
    return null;
  }

  private pushVolume(trade: FlowTrade, volumePerBar: number): FlowCandleShell | null {
    if (volumePerBar <= 0) throw new Error('buildBars: volumePerBar must be > 0');

    if (!this.open) {
      this.open = newShell(trade, Math.floor(trade.time / 1000));
    } else {
      foldInto(this.open, trade);
    }

    // Oversized-trade rule: a single trade that reaches/crosses the
    // threshold closes the bar it landed in — it is never split across
    // bars. The next bar starts fresh at the NEXT trade.
    if (this.open.volume >= volumePerBar) {
      const closed = this.open;
      this.open = null;
      return closed;
    }
    return null;
  }
}

// ─── Threshold ladders ──────────────────────────────────────────────────────
// Round to a "sane" 1/2/5 x 10^n ladder step, targeting ~1 bar per 30s at the
// current trade pace. This mirrors the spirit of FlowBinStore.suggestRowSize
// (round to a human-legible step, not an exact arithmetic quotient).

const LADDER_STEPS = [1, 2, 5];

/** Round `value` UP to the nearest step on the 1/2/5 x 10^n ladder — never
 * rounds down to zero, and never rounds down below the raw target (an
 * under-sized threshold would fire bars faster than intended). */
function roundUpToLadder(value: number): number {
  if (value <= 0) return 1;

  const magnitude = Math.floor(Math.log10(value));
  for (let exp = magnitude - 1; exp <= magnitude + 1; exp++) {
    const scale = 10 ** exp;
    for (const step of LADDER_STEPS) {
      const candidate = step * scale;
      if (candidate >= value) return candidate;
    }
  }
  // Fallback (should be unreachable for finite positive value): next decade.
  return 10 ** (magnitude + 1);
}

/**
 * Suggests a tick-bar threshold (trades per bar) targeting ~1 bar per 30s at
 * the given pace, rounded to a sane 1/2/5 x 10^n ladder step. Minimum 1.
 */
export function suggestTickThreshold(tradesPerMinute: number): number {
  if (tradesPerMinute <= 0) return 1;
  const targetPerBar = tradesPerMinute / 2; // 30s = half a minute
  return Math.max(1, roundUpToLadder(targetPerBar));
}

/**
 * Suggests a volume-bar threshold targeting ~1 bar per 30s at the given
 * pace, rounded to a sane 1/2/5 x 10^n ladder step. Minimum is the smallest
 * positive ladder step (0.1) rather than a hardcoded 1, since volume units
 * (BTC qty, contracts, etc.) can legitimately be sub-1.
 */
export function suggestVolumeThreshold(volumePerMinute: number): number {
  if (volumePerMinute <= 0) return 0.1;
  const targetPerBar = volumePerMinute / 2; // 30s = half a minute
  return roundUpToLadder(targetPerBar);
}

// ─── FlowBinStore compatibility ─────────────────────────────────────────────

/**
 * Bins a trade stream into per-price FlowBin[] using the SAME binning math
 * FlowBinStore uses (binPrice = floor(price / rowSize) * rowSize), so
 * BarBuilder-produced bars can be cross-checked/seeded against footprint
 * data without a second, divergent implementation. This is a minimal
 * re-implementation (not an extraction — see the module header) verified
 * against FlowBinStore's own bins for the same fixture in the test suite.
 */
export function binsFromTrades(trades: FlowTrade[], rowSize: number): FlowBin[] {
  if (rowSize <= 0) throw new Error('binsFromTrades: rowSize must be > 0');

  const bins = new Map<number, FlowBin>();
  for (const trade of trades) {
    const binPrice = Math.floor(trade.price / rowSize) * rowSize;
    let bin = bins.get(binPrice);
    if (!bin) {
      bin = { binPrice, buyVol: 0, sellVol: 0, trades: 0 };
      bins.set(binPrice, bin);
    }
    if (trade.buyerAggressor) {
      bin.buyVol += trade.qty;
    } else {
      bin.sellVol += trade.qty;
    }
    bin.trades += 1;
  }

  return Array.from(bins.values()).sort((a, b) => a.binPrice - b.binPrice);
}
