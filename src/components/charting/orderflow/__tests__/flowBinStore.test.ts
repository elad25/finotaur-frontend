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
