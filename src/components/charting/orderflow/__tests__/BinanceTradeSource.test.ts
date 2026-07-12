// src/components/charting/orderflow/__tests__/BinanceTradeSource.test.ts
// Regression coverage for the 2026-07-12 backfill fix: footprint cells were
// only visible on the last candle(s) because DEFAULT_MAX_BACKFILL_REQUESTS
// (40) covered a tiny sliver of a 40-bar*15m window, and the single
// end-of-run `store.applyTrades()` meant nothing painted until the whole
// backward walk finished. These tests exercise the backfill() mechanics in
// isolation (mocked fetch, no network): backward pagination, request-cap
// enforcement, aggTradeId dedupe across page boundaries, aggressor-side
// inference, progressive per-chunk delivery (the new `onChunk` callback),
// and graceful mid-walk abort.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { BinanceTradeSource } from '../BinanceTradeSource';
import type { FlowTrade } from '../types';

interface AggTradeRestItem {
  a?: number;
  p: string;
  q: string;
  T: number;
  m: boolean;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Stateful mock: returns pre-baked pages in call order, ignoring the actual
 * request URL (query params). Each call beyond `pages.length` returns an
 * empty page — same shape the real Binance endpoint returns once a window is
 * exhausted, exercising the same code path `backfill()` handles for that
 * case. Pages must be pre-sorted ASCENDING by `T` (matches real Binance
 * aggTrades REST responses — `backfill()` relies on `page[0].T` being the
 * earliest item in the page).
 */
function makeSequentialFetchMock(pages: AggTradeRestItem[][]) {
  let call = 0;
  return vi.fn(async () => {
    const page = pages[call] ?? [];
    call += 1;
    return jsonResponse(page);
  });
}

function item(a: number, T: number, m: boolean, p = '100', q = '1'): AggTradeRestItem {
  return { a, p, q, T, m };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BinanceTradeSource.backfill', () => {
  it('walks backward across multiple pages and returns full ascending coverage', async () => {
    const pages: AggTradeRestItem[][] = [
      [item(9, 9000, false), item(10, 10000, true), item(11, 11000, false), item(12, 12000, true)],
      [item(5, 5000, false), item(6, 6000, true), item(7, 7000, false), item(8, 8000, true)],
      [item(1, 1000, false), item(2, 2000, true), item(3, 3000, false), item(4, 4000, true)],
    ];
    const fetchMock = makeSequentialFetchMock(pages);
    vi.stubGlobal('fetch', fetchMock);

    // fromMs=999 makes the loop's cursor check (`cursor > fromMs`) go false
    // right after the 3rd page (cursor lands on 999), so exactly 3 requests
    // fire — no trailing empty-page fallback probing.
    const result = await BinanceTradeSource.backfill('BTCUSDT', 999, 13_000);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.trades).toHaveLength(12);
    expect(result.trades.map((t) => t.time)).toEqual([
      1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
    ]);
    expect(result.coveredFromMs).toBe(1000);
  });

  it('enforces the request-cap: stops after maxRequests round-trips even with more data available', async () => {
    const pages: AggTradeRestItem[][] = [
      [item(9, 9000, false), item(10, 10000, true), item(11, 11000, false), item(12, 12000, true)],
      [item(5, 5000, false), item(6, 6000, true), item(7, 7000, false), item(8, 8000, true)],
    ];
    const fetchMock = makeSequentialFetchMock(pages);
    vi.stubGlobal('fetch', fetchMock);

    const result = await BinanceTradeSource.backfill('BTCUSDT', 999, 13_000, { maxRequests: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.trades).toHaveLength(4);
    expect(result.trades.map((t) => t.time)).toEqual([9000, 10000, 11000, 12000]);
    // Partial coverage — only the LATEST slice was fetched, contiguous with
    // the live stream; the 5000-8000 page was never requested.
    expect(result.coveredFromMs).toBe(9000);
  });

  it('dedupes trades sharing an aggTradeId across a page boundary', async () => {
    const pages: AggTradeRestItem[][] = [
      [item(3, 3000, false), item(4, 4000, true), item(5, 5000, false)],
      // id 3 recurs at the boundary (simulates a server-side off-by-one) —
      // must be counted once, not twice.
      [item(1, 1000, false), item(2, 2000, true), item(3, 3000, false)],
    ];
    const fetchMock = makeSequentialFetchMock(pages);
    vi.stubGlobal('fetch', fetchMock);

    const result = await BinanceTradeSource.backfill('BTCUSDT', 999, 6_000);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.trades).toHaveLength(5); // ids 1,2,3,4,5 — not 6
    expect(result.trades.map((t) => t.time)).toEqual([1000, 2000, 3000, 4000, 5000]);
  });

  it('infers aggressor side from `m` (isBuyerMaker): m=true -> sell aggressor, m=false -> buy aggressor', async () => {
    const pages: AggTradeRestItem[][] = [
      [item(1, 1000, true, '100', '2'), item(2, 1000, false, '101', '3')],
    ];
    const fetchMock = makeSequentialFetchMock(pages);
    vi.stubGlobal('fetch', fetchMock);

    const result = await BinanceTradeSource.backfill('BTCUSDT', 999, 2_000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.trades).toHaveLength(2);

    const sell = result.trades.find((t) => t.qty === 2)!;
    const buy = result.trades.find((t) => t.qty === 3)!;
    expect(sell.buyerAggressor).toBe(false); // m=true -> taker sold into the bid
    expect(buy.buyerAggressor).toBe(true); // m=false -> taker bought (lifted the offer)
  });

  it('delivers progressive per-chunk callbacks, newest page first, each chunk internally ascending', async () => {
    const pages: AggTradeRestItem[][] = [
      [item(9, 9000, false), item(10, 10000, true), item(11, 11000, false), item(12, 12000, true)],
      [item(5, 5000, false), item(6, 6000, true), item(7, 7000, false), item(8, 8000, true)],
      [item(1, 1000, false), item(2, 2000, true), item(3, 3000, false), item(4, 4000, true)],
    ];
    const fetchMock = makeSequentialFetchMock(pages);
    vi.stubGlobal('fetch', fetchMock);

    const chunks: FlowTrade[][] = [];
    const result = await BinanceTradeSource.backfill('BTCUSDT', 999, 13_000, {
      onChunk: (chunk) => chunks.push(chunk),
    });

    expect(chunks).toHaveLength(3);

    // Each chunk sorted ascending internally.
    for (const chunk of chunks) {
      for (let i = 1; i < chunk.length; i++) {
        expect(chunk[i].time).toBeGreaterThan(chunk[i - 1].time);
      }
    }

    // Chunks arrive newest-page-first (pagination walks backward from toMs).
    const maxOf = (c: FlowTrade[]) => Math.max(...c.map((t) => t.time));
    const minOf = (c: FlowTrade[]) => Math.min(...c.map((t) => t.time));
    expect(minOf(chunks[0])).toBeGreaterThan(maxOf(chunks[1]));
    expect(minOf(chunks[1])).toBeGreaterThan(maxOf(chunks[2]));

    // Progressive delivery covers exactly the same trades as the final
    // resolved array — callers that apply chunks as they arrive (useOrderFlow)
    // must not need to also re-apply `result.trades`.
    const chunkedTimes = chunks.flat().map((t) => t.time).sort((a, b) => a - b);
    expect(chunkedTimes).toEqual(result.trades.map((t) => t.time));
  });

  it('stops the walk when the AbortSignal fires mid-walk, without throwing', async () => {
    const controller = new AbortController();
    const page1: AggTradeRestItem[] = [item(10, 5000, false), item(11, 6000, true)];

    const fetchMock = vi.fn(async () => {
      // Simulate an abort landing while this request was in flight — by the
      // time the loop returns to its top-of-iteration check, it must break
      // instead of firing a second request.
      controller.abort();
      return jsonResponse(page1);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await BinanceTradeSource.backfill('BTCUSDT', 0, 10_000, {
      signal: controller.signal,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.trades).toHaveLength(2);
    expect(result.coveredFromMs).toBe(5000);
  });
});
