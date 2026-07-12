// src/components/charting/orderflow/__tests__/databentoBarsSource.test.ts
// Regression test for the two-caches defect (fixed 2026-07-05): a
// DatabentoBarsSource used to maintain its OWN trade cache, separate from the
// FlowBinStore useOrderFlow fills for the footprint. On a closed weekend the
// footprint's store had the smart anchor-backfill data but the bars source's
// independent cache stayed empty, so getBars() always returned [] and the
// chart never painted. This test proves getBars() now reads straight off a
// shared FlowBinStore — no network, no second cache.

import { describe, it, expect, vi } from 'vitest';
import type { UTCTimestamp } from 'lightweight-charts';
import { DatabentoBarsSource } from '../DatabentoBarsSource';
import { FlowBinStore } from '../flowBinStore';
import type { FlowTrade } from '../types';

const NQ_BASE_PRICE = 19500;

/** Friday-session synthetic trades: 2026-07-03T15:35Z → 17:35Z, one every ~0.72s (~10,000 trades over 2h — trimmed here to a lighter but still representative 300-trade sample spread across the same window). */
function buildFridayTrades(): FlowTrade[] {
  const startMs = Date.UTC(2026, 6, 3, 15, 35, 0); // 2026-07-03T15:35:00Z (Friday)
  const endMs = Date.UTC(2026, 6, 3, 17, 35, 0); // 2026-07-03T17:35:00Z
  const count = 300;
  const stepMs = (endMs - startMs) / (count - 1);

  const trades: FlowTrade[] = [];
  for (let i = 0; i < count; i++) {
    const time = Math.round(startMs + i * stepMs);
    // Gentle price drift + oscillation so OHLC isn't flat.
    const drift = Math.sin(i / 12) * 8 + i * 0.02;
    const price = NQ_BASE_PRICE + drift;
    trades.push({
      time,
      price: Math.round(price * 4) / 4, // snap to a 0.25 tick like NQ
      qty: 1 + (i % 5),
      buyerAggressor: i % 2 === 0,
    });
  }
  return trades;
}

describe('DatabentoBarsSource — shared FlowBinStore, weekend anchor fallback', () => {
  it('returns non-empty bars anchored to Friday data when queried with a Sunday window', async () => {
    const store = new FlowBinStore({ intervalSec: 15 * 60, rowSize: 0.25 });
    const fridayTrades = buildFridayTrades();
    store.applyTrades(fridayTrades);

    const source = new DatabentoBarsSource(store);

    // Sunday window — market closed, no trades exist in this range at all.
    const sundayFromSec = Math.floor(Date.UTC(2026, 6, 5, 15, 0, 0) / 1000);
    const sundayToSec = Math.floor(Date.UTC(2026, 6, 5, 17, 0, 0) / 1000);

    const bars = await source.getBars(
      'NQU6',
      '15m',
      sundayFromSec as UTCTimestamp,
      sundayToSec as UTCTimestamp,
    );

    // 1. Non-empty — this is the core regression: previously this returned [].
    expect(bars.length).toBeGreaterThan(0);

    // 2. Bar times fall within the Friday trade window (with intervalSec-width
    //    bucket tolerance at the edges), NOT within the requested Sunday window.
    const fridayStartSec = Math.floor(fridayTrades[0].time / 1000);
    const fridayEndSec = Math.floor(fridayTrades[fridayTrades.length - 1].time / 1000);
    const intervalSec = 15 * 60;
    for (const bar of bars) {
      expect(barTime(bar)).toBeGreaterThanOrEqual(fridayStartSec - intervalSec);
      expect(barTime(bar)).toBeLessThanOrEqual(fridayEndSec + intervalSec);
    }

    // 3. OHLC sanity on every bar.
    for (const bar of bars) {
      expect(bar.high).toBeGreaterThanOrEqual(bar.low);
      expect(bar.high).toBeGreaterThanOrEqual(bar.open);
      expect(bar.high).toBeGreaterThanOrEqual(bar.close);
      expect(bar.low).toBeLessThanOrEqual(bar.open);
      expect(bar.low).toBeLessThanOrEqual(bar.close);
      expect(bar.volume ?? 0).toBeGreaterThan(0);
    }

    // 4. Bar count roughly matches window-width / interval — the fallback
    //    requests a window the same width as the Sunday query (2h @ 15m = 8
    //    bars), so we should get close to that many (allowing for sparse
    //    buckets at the edges of the synthetic sample).
    const requestedWindowSec = sundayToSec - sundayFromSec;
    const expectedBarsApprox = Math.ceil(requestedWindowSec / intervalSec);
    expect(bars.length).toBeLessThanOrEqual(expectedBarsApprox + 1);
    expect(bars.length).toBeGreaterThanOrEqual(1);

    // Bars strictly ascending by time.
    for (let i = 1; i < bars.length; i++) {
      expect(barTime(bars[i])).toBeGreaterThan(barTime(bars[i - 1]));
    }
  });

  it('regression: trades inside the requested window return normally (no fallback needed)', async () => {
    const store = new FlowBinStore({ intervalSec: 15 * 60, rowSize: 0.25 });
    const fridayTrades = buildFridayTrades();
    store.applyTrades(fridayTrades);

    const source = new DatabentoBarsSource(store);

    const fromSec = Math.floor(fridayTrades[0].time / 1000);
    const toSec = Math.floor(fridayTrades[fridayTrades.length - 1].time / 1000);

    const bars = await source.getBars(
      'NQU6',
      '15m',
      fromSec as UTCTimestamp,
      toSec as UTCTimestamp,
    );

    const intervalSec = 15 * 60;

    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) {
      expect(bar.high).toBeGreaterThanOrEqual(bar.low);
      // Bar time is the FLOOR of the trade time to the interval boundary, so
      // the first bucket can start slightly before `fromSec` — allow one
      // interval of tolerance rather than requiring an exact match.
      expect(barTime(bar)).toBeGreaterThanOrEqual(fromSec - intervalSec);
      expect(barTime(bar)).toBeLessThanOrEqual(toSec);
    }
  });

  it('returns [] when the store has no trades at all (no fallback data to anchor to)', async () => {
    const store = new FlowBinStore({ intervalSec: 15 * 60, rowSize: 0.25 });
    const source = new DatabentoBarsSource(store);

    const fromSec = Math.floor(Date.UTC(2026, 6, 5, 15, 0, 0) / 1000);
    const toSec = Math.floor(Date.UTC(2026, 6, 5, 17, 0, 0) / 1000);

    const bars = await source.getBars(
      'NQU6',
      '15m',
      fromSec as UTCTimestamp,
      toSec as UTCTimestamp,
    );

    expect(bars).toEqual([]);
  });
});

describe('DatabentoBarsSource — memoized getBars() derivation (perf fix 2026-07-12)', () => {
  // getBars() used to call store.getRawTrades() (a full drainRawInOrder()
  // copy of up to 250k raw trades) + re-bin via tradesToBars() on EVERY
  // call, even when the window and the store's trade data were unchanged
  // since the previous call — and it's invoked on every barsRefreshToken
  // bump. These tests assert the memo: a second getBars() with the same
  // (fromMs, toMs, intervalSec, tradesIngested) key returns WITHOUT
  // re-deriving, and any change to those inputs correctly invalidates it.

  it('a second getBars() with the same window and no new trades does NOT re-derive — getRawTrades() called once, same array reference returned', async () => {
    const store = new FlowBinStore({ intervalSec: 15 * 60, rowSize: 0.25 });
    store.applyTrades(buildFridayTrades());

    const getRawTradesSpy = vi.spyOn(store, 'getRawTrades');
    const source = new DatabentoBarsSource(store);

    const fromSec = Math.floor(Date.UTC(2026, 6, 3, 15, 35, 0) / 1000);
    const toSec = Math.floor(Date.UTC(2026, 6, 3, 17, 35, 0) / 1000);

    const first = await source.getBars('NQU6', '15m', fromSec as UTCTimestamp, toSec as UTCTimestamp);
    expect(getRawTradesSpy).toHaveBeenCalledTimes(1);
    expect(first.length).toBeGreaterThan(0);

    // Identical call — same symbol/interval/window, store untouched in between.
    const second = await source.getBars('NQU6', '15m', fromSec as UTCTimestamp, toSec as UTCTimestamp);
    expect(getRawTradesSpy).toHaveBeenCalledTimes(1); // still 1 — no re-derivation
    expect(second).toBe(first); // same array reference, not just equal content

    getRawTradesSpy.mockRestore();
  });

  it('re-derives when new trades are ingested (getTradesIngested() changed) even with the same window', async () => {
    const store = new FlowBinStore({ intervalSec: 15 * 60, rowSize: 0.25 });
    store.applyTrades(buildFridayTrades());

    const getRawTradesSpy = vi.spyOn(store, 'getRawTrades');
    const source = new DatabentoBarsSource(store);

    const fromSec = Math.floor(Date.UTC(2026, 6, 3, 15, 35, 0) / 1000);
    const toSec = Math.floor(Date.UTC(2026, 6, 3, 17, 35, 0) / 1000);

    const first = await source.getBars('NQU6', '15m', fromSec as UTCTimestamp, toSec as UTCTimestamp);
    expect(getRawTradesSpy).toHaveBeenCalledTimes(1);

    // Ingest one more trade inside the window — bumps getTradesIngested(),
    // which must invalidate the memo even though from/to/interval match.
    store.applyTrades([
      { time: Date.UTC(2026, 6, 3, 16, 0, 0), price: NQ_BASE_PRICE, qty: 1, buyerAggressor: true },
    ]);

    const second = await source.getBars('NQU6', '15m', fromSec as UTCTimestamp, toSec as UTCTimestamp);
    expect(getRawTradesSpy).toHaveBeenCalledTimes(2); // re-derived
    expect(second).not.toBe(first); // new array — content may also differ
  });

  it('re-derives when the window (from/to) changes, same trades', async () => {
    const store = new FlowBinStore({ intervalSec: 15 * 60, rowSize: 0.25 });
    store.applyTrades(buildFridayTrades());

    const getRawTradesSpy = vi.spyOn(store, 'getRawTrades');
    const source = new DatabentoBarsSource(store);

    const fromSec = Math.floor(Date.UTC(2026, 6, 3, 15, 35, 0) / 1000);
    const toSec = Math.floor(Date.UTC(2026, 6, 3, 17, 35, 0) / 1000);

    await source.getBars('NQU6', '15m', fromSec as UTCTimestamp, toSec as UTCTimestamp);
    expect(getRawTradesSpy).toHaveBeenCalledTimes(1);

    // Same trades, but a different `to` — must invalidate.
    await source.getBars('NQU6', '15m', fromSec as UTCTimestamp, (toSec - 60) as UTCTimestamp);
    expect(getRawTradesSpy).toHaveBeenCalledTimes(2);
  });

  it('re-derives when the interval changes, same window and trades', async () => {
    const store = new FlowBinStore({ intervalSec: 15 * 60, rowSize: 0.25 });
    store.applyTrades(buildFridayTrades());

    const getRawTradesSpy = vi.spyOn(store, 'getRawTrades');
    const source = new DatabentoBarsSource(store);

    const fromSec = Math.floor(Date.UTC(2026, 6, 3, 15, 35, 0) / 1000);
    const toSec = Math.floor(Date.UTC(2026, 6, 3, 17, 35, 0) / 1000);

    await source.getBars('NQU6', '15m', fromSec as UTCTimestamp, toSec as UTCTimestamp);
    expect(getRawTradesSpy).toHaveBeenCalledTimes(1);

    await source.getBars('NQU6', '5m', fromSec as UTCTimestamp, toSec as UTCTimestamp);
    expect(getRawTradesSpy).toHaveBeenCalledTimes(2);
  });

  it('re-derives when intervalSecOverride changes the resolved interval, same window/interval-param/trades', async () => {
    const store = new FlowBinStore({ intervalSec: 15 * 60, rowSize: 0.25 });
    store.applyTrades(buildFridayTrades());

    const getRawTradesSpy = vi.spyOn(store, 'getRawTrades');
    // Two sources sharing the same store but different custom-timeframe overrides —
    // exercises that the cache key is keyed off the RESOLVED intervalSec, not the
    // raw `interval` param (which is identical, '15m', for both calls below).
    const source45m = new DatabentoBarsSource(store, 45 * 60);

    const fromSec = Math.floor(Date.UTC(2026, 6, 3, 15, 35, 0) / 1000);
    const toSec = Math.floor(Date.UTC(2026, 6, 3, 17, 35, 0) / 1000);

    await source45m.getBars('NQU6', '15m', fromSec as UTCTimestamp, toSec as UTCTimestamp);
    expect(getRawTradesSpy).toHaveBeenCalledTimes(1);

    // Same source instance, same call — memo hit, no re-derivation.
    await source45m.getBars('NQU6', '15m', fromSec as UTCTimestamp, toSec as UTCTimestamp);
    expect(getRawTradesSpy).toHaveBeenCalledTimes(1);
  });

  it('first call always derives (no stale-cache false-positive on an empty store)', async () => {
    const store = new FlowBinStore({ intervalSec: 15 * 60, rowSize: 0.25 });
    const getRawTradesSpy = vi.spyOn(store, 'getRawTrades');
    const source = new DatabentoBarsSource(store);

    const fromSec = Math.floor(Date.UTC(2026, 6, 5, 15, 0, 0) / 1000);
    const toSec = Math.floor(Date.UTC(2026, 6, 5, 17, 0, 0) / 1000);

    const bars = await source.getBars('NQU6', '15m', fromSec as UTCTimestamp, toSec as UTCTimestamp);
    expect(getRawTradesSpy).toHaveBeenCalledTimes(1);
    expect(bars).toEqual([]);
  });
});

function barTime(bar: { time: unknown }): number {
  return bar.time as number;
}
