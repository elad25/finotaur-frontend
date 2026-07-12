// src/components/charting/orderflow/__tests__/flowBinStore.test.ts
// Regression tests for the FuturesChartTab render-loop freeze (fixed
// 2026-07-05, root cause: an unconditional row-size re-suggestion on every
// onBarsLoad + a notify() that didn't distinguish "new data" from "replay"
// combined into a synchronous getBars→setConfig→notify→getBars cycle that
// froze the renderer on a closed-market Sunday, once the anchored backfill
// landed 50k+ trades).
//
// This file exercises the FlowBinStore-level guarantees the fix depends on:
//   1. getRawTrades() is non-destructive (drainRawInOrder() only reads/copies
//      the ring — it does not mutate rawRing/rawRingHead), so repeated calls
//      never desync the store or corrupt later re-binning.
//   2. setConfig() is a true no-op (no replay, no notify) when intervalSec +
//      rowSize are unchanged.
//   3. tradesIngested is monotonic and does NOT increase from setConfig()'s
//      internal re-bin replay — only from genuinely new applyTrades() calls.
//      FuturesChartTab's barsRefreshToken guard relies on this to avoid
//      bumping on replay-only notifications.

import { describe, it, expect, vi } from 'vitest';
import { FlowBinStore } from '../flowBinStore';
import type { FlowTrade } from '../types';

function buildTrades(count: number, startMs = 0, stepMs = 1000): FlowTrade[] {
  const trades: FlowTrade[] = [];
  for (let i = 0; i < count; i++) {
    trades.push({
      time: startMs + i * stepMs,
      price: 19500 + Math.sin(i / 7) * 5,
      qty: 1 + (i % 3),
      buyerAggressor: i % 2 === 0,
    });
  }
  return trades;
}

describe('FlowBinStore — getRawTrades() is non-destructive', () => {
  it('returns identical results on repeated calls without mutating the ring', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    const trades = buildTrades(500);
    store.applyTrades(trades);

    const first = store.getRawTrades();
    const second = store.getRawTrades();

    expect(first.length).toBe(trades.length);
    expect(second.length).toBe(first.length);
    expect(second).toEqual(first);

    // A third call after re-binning should still see all trades — proves
    // drainRawInOrder() never drained/consumed the ring on the earlier calls.
    store.setConfig({ intervalSec: 60, rowSize: 5 });
    const third = store.getRawTrades();
    expect(third.length).toBe(trades.length);
  });

  it('re-bins correctly after multiple getRawTrades() calls (proves store state is untouched by reads)', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    store.applyTrades([
      { time: 0, price: 100.4, qty: 1, buyerAggressor: true },
      { time: 1000, price: 100.6, qty: 2, buyerAggressor: true },
    ]);

    // Read raw trades several times, as DatabentoBarsSource.getBars() does on
    // every bar-fetch effect run.
    store.getRawTrades();
    store.getRawTrades();
    store.getRawTrades();

    store.setConfig({ intervalSec: 60, rowSize: 10 });
    const candle = store.getCandle(0);
    expect(candle).not.toBeNull();
    expect(candle!.totalVol).toBe(3);
    expect(candle!.bins.length).toBe(1);
    expect(candle!.bins[0].binPrice).toBe(100);
  });
});

describe('FlowBinStore — setConfig() no-op when config is unchanged', () => {
  it('does not notify listeners when intervalSec + rowSize are identical', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    store.applyTrades(buildTrades(50));

    const listener = vi.fn();
    store.onChange(listener);

    store.setConfig({ intervalSec: 60, rowSize: 1 }); // identical — must be a no-op
    expect(listener).not.toHaveBeenCalled();

    store.setConfig({ intervalSec: 60, rowSize: 2 }); // actually different — must notify
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('FlowBinStore — tradesIngested excludes setConfig replay', () => {
  it('does not increase tradesIngested when setConfig replays the raw ring', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    const trades = buildTrades(300);
    store.applyTrades(trades);

    expect(store.getTradesIngested()).toBe(300);

    // Re-bin several times (simulates rowSize oscillation) — none of these
    // should move tradesIngested, since no NEW trade data arrived.
    store.setConfig({ intervalSec: 60, rowSize: 2 });
    store.setConfig({ intervalSec: 60, rowSize: 3 });
    store.setConfig({ intervalSec: 30, rowSize: 3 });
    expect(store.getTradesIngested()).toBe(300);

    // Genuinely new trades DO bump it.
    store.applyTrades(buildTrades(10, 1_000_000));
    expect(store.getTradesIngested()).toBe(310);
  });

  it('stays monotonic across clear() (symbol switch) — never decreases', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    store.applyTrades(buildTrades(100));
    expect(store.getTradesIngested()).toBe(100);

    store.clear(); // symbol switch — raw ring emptied, counter untouched
    expect(store.getTradesIngested()).toBe(100);

    store.applyTrades(buildTrades(20, 5_000_000));
    expect(store.getTradesIngested()).toBe(120);
  });
});

describe('FlowBinStore — per-bin trade (print) count', () => {
  it('increments trades by 1 per aggTrade landing in a bin, independent of qty', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    store.applyTrades([
      { time: 0, price: 100.4, qty: 1, buyerAggressor: true },
      { time: 1000, price: 100.4, qty: 25, buyerAggressor: true }, // large qty, still 1 print
      { time: 2000, price: 100.4, qty: 1.5, buyerAggressor: false },
    ]);

    const candle = store.getCandle(0);
    expect(candle).not.toBeNull();
    expect(candle!.bins.length).toBe(1);
    expect(candle!.bins[0].trades).toBe(3);
    expect(candle!.bins[0].buyVol).toBe(26);
    expect(candle!.bins[0].sellVol).toBe(1.5);
  });

  it('tracks trades separately per price bin', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    store.applyTrades([
      { time: 0, price: 100.4, qty: 1, buyerAggressor: true },
      { time: 1000, price: 100.4, qty: 1, buyerAggressor: true },
      { time: 2000, price: 105.9, qty: 1, buyerAggressor: false },
    ]);
    const candle = store.getCandle(0);
    expect(candle).not.toBeNull();
    expect(candle!.bins.length).toBe(2);
    const binAt100 = candle!.bins.find((b) => b.binPrice === 100);
    const binAt105 = candle!.bins.find((b) => b.binPrice === 105);
    expect(binAt100?.trades).toBe(2);
    expect(binAt105?.trades).toBe(1);
  });

  it('survives re-binning (setConfig replay) — trade counts merge correctly at a wider rowSize', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    store.applyTrades([
      { time: 0, price: 100.4, qty: 1, buyerAggressor: true },
      { time: 1000, price: 101.2, qty: 1, buyerAggressor: true },
      { time: 2000, price: 102.9, qty: 1, buyerAggressor: false },
    ]);
    store.setConfig({ intervalSec: 60, rowSize: 10 }); // all 3 trades land in the same wider bin
    const rebinned = store.getCandle(0);
    expect(rebinned).not.toBeNull();
    expect(rebinned!.bins.length).toBe(1);
    expect(rebinned!.bins[0].trades).toBe(3);
  });
});

describe('FlowBinStore — suggestRowSize uses PER-BAR range, not window-spanning range', () => {
  // Regression for the giant-price-bin defect (fixed alongside the render
  // merging fix): ChartTab.tsx/FuturesChartTab.tsx used to feed
  // suggestRowSize ONE synthetic bar spanning the entire loaded window's
  // {high, low} — e.g. a 15m BTC window can easily span $2,000+ even though
  // each individual 15m bar only ranges a few dollars. 0.2 * that window
  // range produced a rowSize hundreds of times too coarse (1-3 giant bins
  // per bar instead of a proper footprint ladder).
  it('returns ≈0.2× avg PER-BAR range for N bars with realistic per-bar ranges, not 0.2× the window range', () => {
    // 20 bars, each with a realistic $10 per-bar range, walking the price up
    // so the WINDOW range (first bar's low to last bar's high) is much wider
    // than any single bar's range.
    const bars = Array.from({ length: 20 }, (_, i) => ({
      high: 60_000 + i * 50 + 10,
      low: 60_000 + i * 50,
    }));
    const avgPerBarRange = 10; // every bar is exactly a $10 range
    const windowRange = bars[bars.length - 1].high - bars[0].low; // >> 10

    const tickSize = 0.01;
    const suggested = FlowBinStore.suggestRowSize(bars, tickSize);
    const expected = Math.floor((avgPerBarRange * 0.2) / tickSize) * tickSize;

    expect(suggested).toBeCloseTo(expected, 5);

    // Sanity: the buggy window-spanning computation would have been wildly
    // larger — assert the fixed suggestion is nowhere near it.
    const buggyWindowSuggestion = Math.floor((windowRange * 0.2) / tickSize) * tickSize;
    expect(suggested).toBeLessThan(buggyWindowSuggestion / 10);
  });

  it('a single synthetic bar shaped {high: avgBarRange, low: 0} reproduces the caller-side average-range feed exactly', () => {
    // This mirrors ChartTab.tsx / FuturesChartTab.tsx's handleBarsLoad: since
    // FinotaurChart only reports one avgBarRange number per bar-load event
    // (not the raw bars array), the caller feeds suggestRowSize a single bar
    // shaped this way. Confirms that shape produces the same result as
    // passing the real multi-bar array with the same average range.
    const avgBarRange = 37.5;
    const tickSize = 0.25;

    const viaSyntheticBar = FlowBinStore.suggestRowSize(
      [{ high: avgBarRange, low: 0 }],
      tickSize,
    );
    const viaRealBars = FlowBinStore.suggestRowSize(
      [
        { high: 100, low: 100 - avgBarRange + 10 },
        { high: 200, low: 200 - avgBarRange - 10 },
      ],
      tickSize,
    );

    expect(viaSyntheticBar).toBe(viaRealBars);
  });
});

describe('FlowBinStore — getRange() incrementally-maintained sorted index', () => {
  // Regression tests for the perf fix (2026-07-12): getRange() used to do
  // Array.from(this.candles.keys()).filter().sort() on EVERY call — O(all
  // candles) per call, and getRange() feeds every footprint render frame, so
  // cost scaled with total loaded history. Replaced with a binary-searched
  // `sortedTimes` index, incrementally maintained by binary-insert in
  // applySingleTrade(). These tests assert output is IDENTICAL to the old
  // filter+sort behavior — same candles, ascending by time — under every
  // shape that matters: full window, partial window, empty window, single
  // candle, out-of-order insertion, and setConfig() re-bin.

  it('full window: returns every loaded candle, ascending by time', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    store.applyTrades(buildTrades(10, 0, 60_000)); // 10 candles, one per minute
    const range = store.getRange(0, 10_000);
    expect(range.length).toBe(10);
    for (let i = 1; i < range.length; i++) {
      expect(range[i].time).toBeGreaterThan(range[i - 1].time);
    }
    expect(range[0].time).toBe(0);
    expect(range[range.length - 1].time).toBe(540);
  });

  it('partial window: returns only candles within [fromSec, toSec], still ascending', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    store.applyTrades(buildTrades(10, 0, 60_000)); // candle times: 0, 60, 120, ..., 540
    const range = store.getRange(120, 300);
    // Expect candles at 120, 180, 240, 300 — 4 candles.
    expect(range.length).toBe(4);
    expect(range.map((c) => c.time)).toEqual([120, 180, 240, 300]);
  });

  it('empty window: returns [] when no candle time falls in [fromSec, toSec]', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    store.applyTrades(buildTrades(5, 0, 60_000)); // candle times: 0, 60, 120, 180, 240
    expect(store.getRange(1000, 2000)).toEqual([]);
    // Also verify a window strictly BEFORE all data returns [].
    expect(store.getRange(-1000, -500)).toEqual([]);
  });

  it('single candle: a window matching exactly one candle time returns that one candle', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    store.applyTrades([{ time: 0, price: 100, qty: 1, buyerAggressor: true }]);
    const range = store.getRange(0, 0);
    expect(range.length).toBe(1);
    expect(range[0].time).toBe(0);
  });

  it('trades applied OUT OF TIME ORDER (later candle inserted before earlier) still return ascending order', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    // Apply candle times in a deliberately scrambled order: 300, 0, 480, 120,
    // 60, 240, 180, 360, 420 — none of these arrive sorted, so a naive
    // push-to-end sortedTimes index (instead of binary-insert) would return
    // them out of order.
    const scrambledCandleTimesSec = [300, 0, 480, 120, 60, 240, 180, 360, 420];
    for (const t of scrambledCandleTimesSec) {
      store.applyTrades([{ time: t * 1000, price: 100 + t * 0.01, qty: 1, buyerAggressor: true }]);
    }

    const range = store.getRange(0, 480);
    expect(range.length).toBe(scrambledCandleTimesSec.length);
    // Must be strictly ascending regardless of insertion order.
    for (let i = 1; i < range.length; i++) {
      expect(range[i].time).toBeGreaterThan(range[i - 1].time);
    }
    expect(range.map((c) => c.time)).toEqual([0, 60, 120, 180, 240, 300, 360, 420, 480]);
  });

  it('multiple trades landing in the SAME already-seen candle time do not duplicate the index entry', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    // 5 trades all within the same 60s candle bucket (times 0, 10s, 20s, 30s, 40s).
    store.applyTrades([
      { time: 0, price: 100, qty: 1, buyerAggressor: true },
      { time: 10_000, price: 100.5, qty: 1, buyerAggressor: true },
      { time: 20_000, price: 101, qty: 1, buyerAggressor: false },
      { time: 30_000, price: 100.2, qty: 1, buyerAggressor: true },
      { time: 40_000, price: 99.8, qty: 1, buyerAggressor: false },
    ]);
    const range = store.getRange(0, 60);
    expect(range.length).toBe(1); // still exactly one candle at t=0, not 5 duplicate entries
    expect(range[0].time).toBe(0);
    expect(range[0].bins.reduce((sum, b) => sum + b.trades, 0)).toBe(5);
  });

  it('setConfig() re-bin rebuilds the sortedTimes index correctly — getRange still works post-rebin', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    // Scrambled insertion order again, pre-rebin.
    const scrambledCandleTimesSec = [180, 0, 300, 60, 240, 120];
    for (const t of scrambledCandleTimesSec) {
      store.applyTrades([{ time: t * 1000, price: 100, qty: 1, buyerAggressor: true }]);
    }

    // Widen rowSize — triggers the raw-ring replay + full index reset/rebuild.
    store.setConfig({ intervalSec: 60, rowSize: 5 });

    const range = store.getRange(0, 300);
    expect(range.length).toBe(scrambledCandleTimesSec.length);
    expect(range.map((c) => c.time)).toEqual([0, 60, 120, 180, 240, 300]);
    for (let i = 1; i < range.length; i++) {
      expect(range[i].time).toBeGreaterThan(range[i - 1].time);
    }

    // A second re-bin (interval change this time) must also leave the index
    // in a correct, queryable state.
    store.setConfig({ intervalSec: 120, rowSize: 5 });
    const rebinnedRange = store.getRange(0, 300);
    for (let i = 1; i < rebinnedRange.length; i++) {
      expect(rebinnedRange[i].time).toBeGreaterThan(rebinnedRange[i - 1].time);
    }
    // With a 120s interval: floor(t/120)*120 buckets 0→0, 60→0, 120→120,
    // 180→120, 240→240, 300→240 — 3 distinct buckets: [0, 120, 240].
    expect(rebinnedRange.map((c) => c.time)).toEqual([0, 120, 240]);
  });

  it('clear() resets the index — getRange returns [] until new trades are applied', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    store.applyTrades(buildTrades(5, 0, 60_000));
    expect(store.getRange(0, 300).length).toBe(5);

    store.clear();
    expect(store.getRange(0, 300)).toEqual([]);

    store.applyTrades([{ time: 0, price: 100, qty: 1, buyerAggressor: true }]);
    expect(store.getRange(0, 0).length).toBe(1);
  });
});

describe('FlowBinStore — setConfig() bin-count safety cap', () => {
  // Regression tests for the MAX_PRICE_BINS guard added 2026-07-12: a
  // too-small rowSize against the loaded price span would otherwise explode
  // per-candle bin counts. setConfig() clamps rowSize UP to the smallest
  // value that keeps the bin count within the cap, and exposes that via
  // wasRowSizeClamped() so a future UI can surface a note.

  it('does not clamp when no candles are loaded yet — validates on first re-bin instead', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 0.0001 });
    expect(store.wasRowSizeClamped()).toBe(false);
    expect(store.getConfig().rowSize).toBe(0.0001);
  });

  it('does not clamp a rowSize that already satisfies the cap', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    // Price span of 100 (19450..19550) at rowSize=1 → ~101 bins, well under 2000.
    store.applyTrades(buildTrades(50, 0, 60_000));
    store.setConfig({ intervalSec: 60, rowSize: 1 });
    expect(store.wasRowSizeClamped()).toBe(false);
    expect(store.getConfig().rowSize).toBe(1);
  });

  it('clamps a rowSize that would exceed MAX_PRICE_BINS, and getConfig() reflects the clamped value', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    // Trades spanning price 0..10000 — a rowSize of 0.01 would need ~1,000,000 bins.
    store.applyTrades([
      { time: 0, price: 0, qty: 1, buyerAggressor: true },
      { time: 1000, price: 10_000, qty: 1, buyerAggressor: true },
    ]);

    store.setConfig({ intervalSec: 60, rowSize: 0.01 });

    expect(store.wasRowSizeClamped()).toBe(true);
    const clampedRowSize = store.getConfig().rowSize;
    expect(clampedRowSize).toBeGreaterThan(0.01);

    // The clamped rowSize must actually satisfy the cap: bin count <= 2000.
    const binCount = Math.floor(10_000 / clampedRowSize) - Math.floor(0 / clampedRowSize) + 1;
    expect(binCount).toBeLessThanOrEqual(2000);
  });

  it('a subsequent setConfig() call that no longer needs clamping resets wasRowSizeClamped() to false', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    store.applyTrades([
      { time: 0, price: 0, qty: 1, buyerAggressor: true },
      { time: 1000, price: 10_000, qty: 1, buyerAggressor: true },
    ]);

    store.setConfig({ intervalSec: 60, rowSize: 0.01 });
    expect(store.wasRowSizeClamped()).toBe(true);

    store.setConfig({ intervalSec: 60, rowSize: 50 });
    expect(store.wasRowSizeClamped()).toBe(false);
    expect(store.getConfig().rowSize).toBe(50);
  });
});

describe('FlowBinStore — render-loop fixed-point simulation', () => {
  // Simulates the exact cycle described in the incident: getBars (reads raw
  // trades) → suggestRowSize → setConfig → (would-be) notify → getBars again.
  // With the FuturesChartTab-side one-shot suggestion guard in place (modeled
  // here directly against the store + suggestRowSize, since FuturesChartTab
  // itself is a React component outside this store-level test's scope), the
  // system must reach a fixed point after at most one setConfig call for a
  // stable suggestion, even when driven for many iterations.
  it('setConfig replay happens at most once when the suggested rowSize stabilizes', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 0.25 });
    store.applyTrades(buildTrades(2000));

    let replayCount = 0;
    store.onChange(() => {
      replayCount += 1;
    });

    // Model FuturesChartTab's fixed one-shot guard: compute the suggestion
    // ONCE from the current bars, then attempt to re-apply it N times (as a
    // buggy unthrottled onBarsLoad would try to do) — setConfig's own
    // unchanged-config no-op must absorb every call after the first.
    const trades = store.getRawTrades();
    const bars = trades.slice(-20).map((t) => ({ high: t.price + 1, low: t.price - 1 }));
    const suggested = FlowBinStore.suggestRowSize(bars, 0.25);

    for (let i = 0; i < 25; i++) {
      store.setConfig({ intervalSec: 60, rowSize: suggested });
    }

    // First call actually changes rowSize (0.25 → suggested, assuming they
    // differ) and replays once; every subsequent call is a no-op.
    expect(replayCount).toBeLessThanOrEqual(1);

    // Store still has all trades and is queryable — no corruption from the
    // repeated setConfig calls.
    expect(store.getRawTrades().length).toBe(2000);
  });
});
