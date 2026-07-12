// src/components/charting/orderflow/__tests__/flowStoreCache.test.ts
//
// Exercises the raw-trade LRU cache in isolation: eviction order (LRU, not
// insertion order), the get()-touches-recency contract, key composition
// (venue+symbol only — see flowStoreCache.ts's header comment for why
// intervalSec is deliberately excluded), copy-not-reference semantics, and
// staleness sweeping.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildCacheKey,
  getCachedTrades,
  putCachedTrades,
  evictStale,
  __cacheSizeForTests,
  __clearCacheForTests,
} from '../flowStoreCache';
import type { FlowTrade } from '../types';

function trade(time: number): FlowTrade {
  return { time, price: 100, qty: 1, buyerAggressor: true };
}

beforeEach(() => {
  __clearCacheForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('buildCacheKey', () => {
  it('composes venue+symbol only — no intervalSec component', () => {
    expect(buildCacheKey('binance', 'BTCUSDT')).toBe('binance|BTCUSDT');
    expect(buildCacheKey('databento', 'NQU6')).toBe('databento|NQU6');
  });

  it('never collides across venues for the same symbol string', () => {
    expect(buildCacheKey('binance', 'NQ')).not.toBe(buildCacheKey('databento', 'NQ'));
  });
});

describe('getCachedTrades / putCachedTrades — round trip', () => {
  it('returns null on a miss', () => {
    expect(getCachedTrades(buildCacheKey('binance', 'BTCUSDT'))).toBeNull();
  });

  it('round-trips trades + newestMs', () => {
    const key = buildCacheKey('binance', 'BTCUSDT');
    const trades = [trade(1000), trade(2000), trade(3000)];
    putCachedTrades(key, trades, 3000);

    const result = getCachedTrades(key);
    expect(result).not.toBeNull();
    expect(result!.trades).toEqual(trades);
    expect(result!.newestMs).toBe(3000);
  });

  it('stores a COPY — mutating the caller array after put() does not affect the cached entry', () => {
    const key = buildCacheKey('binance', 'ETHUSDT');
    const trades = [trade(1000)];
    putCachedTrades(key, trades, 1000);

    trades.push(trade(2000)); // mutate the original array after the fact

    const result = getCachedTrades(key);
    expect(result!.trades).toHaveLength(1);
  });

  it('different symbols under the same venue are independent entries', () => {
    putCachedTrades(buildCacheKey('binance', 'BTCUSDT'), [trade(1000)], 1000);
    putCachedTrades(buildCacheKey('binance', 'ETHUSDT'), [trade(2000)], 2000);

    expect(getCachedTrades(buildCacheKey('binance', 'BTCUSDT'))!.newestMs).toBe(1000);
    expect(getCachedTrades(buildCacheKey('binance', 'ETHUSDT'))!.newestMs).toBe(2000);
  });
});

describe('LRU eviction order (max 3 entries)', () => {
  it('evicts the least-recently-used entry once a 4th distinct key is put', () => {
    putCachedTrades('A', [trade(1)], 1);
    putCachedTrades('B', [trade(2)], 2);
    putCachedTrades('C', [trade(3)], 3);
    expect(__cacheSizeForTests()).toBe(3);

    putCachedTrades('D', [trade(4)], 4);
    expect(__cacheSizeForTests()).toBe(3);

    // A was the least-recently-used (never touched after its initial put) —
    // it should be the one evicted, not B or C.
    expect(getCachedTrades('A')).toBeNull();
    expect(getCachedTrades('B')).not.toBeNull();
    expect(getCachedTrades('C')).not.toBeNull();
    expect(getCachedTrades('D')).not.toBeNull();
  });

  it('get() touches an entry, moving it to most-recently-used — protecting it from the next eviction', () => {
    putCachedTrades('A', [trade(1)], 1);
    putCachedTrades('B', [trade(2)], 2);
    putCachedTrades('C', [trade(3)], 3);

    // Touch A — it's now the MRU entry; B is now the LRU one.
    getCachedTrades('A');

    putCachedTrades('D', [trade(4)], 4);

    expect(getCachedTrades('A')).not.toBeNull(); // protected by the touch above
    expect(getCachedTrades('B')).toBeNull(); // evicted instead — it was untouched
    expect(getCachedTrades('C')).not.toBeNull();
    expect(getCachedTrades('D')).not.toBeNull();
  });

  it('re-putting an existing key refreshes its recency instead of adding a duplicate slot', () => {
    putCachedTrades('A', [trade(1)], 1);
    putCachedTrades('B', [trade(2)], 2);
    putCachedTrades('C', [trade(3)], 3);

    // Overwrite A with new data — this should count as a "touch", moving A to MRU.
    putCachedTrades('A', [trade(10)], 10);
    expect(__cacheSizeForTests()).toBe(3);

    putCachedTrades('D', [trade(4)], 4);

    expect(getCachedTrades('A')!.newestMs).toBe(10); // still present, with the refreshed data
    expect(getCachedTrades('B')).toBeNull(); // now the LRU victim
  });
});

describe('evictStale', () => {
  it('drops entries older than maxAgeMs, keeps fresher ones', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    putCachedTrades('OLD', [trade(1)], 1);

    vi.setSystemTime(5_000);
    putCachedTrades('FRESH', [trade(2)], 2);

    vi.setSystemTime(11_000); // OLD is now 11s old, FRESH is 6s old
    evictStale(10_000);

    expect(getCachedTrades('OLD')).toBeNull();
    expect(getCachedTrades('FRESH')).not.toBeNull();
  });

  it('is a no-op when nothing exceeds maxAgeMs', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    putCachedTrades('A', [trade(1)], 1);

    vi.setSystemTime(1_000);
    evictStale(10_000);

    expect(getCachedTrades('A')).not.toBeNull();
  });
});
