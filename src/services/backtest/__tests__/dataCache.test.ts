import { describe, it, expect } from 'vitest';
import { isValidDataset, rangeCovered, type CachedDataset } from '../dataCache';

function makeDataset(overrides: Partial<CachedDataset> = {}): CachedDataset {
  return {
    id: 'binance_btcusdt_1h',
    symbol: 'BTCUSDT',
    timeframe: '1h',
    source: 'binance',
    candles: [
      { time: 1000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 },
      { time: 4600, open: 2, high: 3, low: 1.5, close: 2.5, volume: 12 },
    ],
    lastUpdated: Date.now(),
    ...overrides,
  };
}

describe('isValidDataset', () => {
  it('returns false for null/undefined', () => {
    expect(isValidDataset(null)).toBe(false);
    expect(isValidDataset(undefined)).toBe(false);
  });

  it('returns false for empty candles array', () => {
    expect(isValidDataset(makeDataset({ candles: [] }))).toBe(false);
  });

  it('returns false when the first candle has non-finite OHLC', () => {
    const d = makeDataset({
      candles: [{ time: NaN, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 }],
    });
    expect(isValidDataset(d)).toBe(false);
  });

  it('returns false when metadata has non-finite fields', () => {
    const d = makeDataset({ metadata: { startTime: NaN, endTime: 100, candleCount: 2 } });
    expect(isValidDataset(d)).toBe(false);
  });

  it('returns true for a well-formed dataset with valid metadata', () => {
    const d = makeDataset({ metadata: { startTime: 1000, endTime: 4600, candleCount: 2 } });
    expect(isValidDataset(d)).toBe(true);
  });

  it('returns true for a well-formed dataset with no metadata', () => {
    expect(isValidDataset(makeDataset())).toBe(true);
  });
});

describe('rangeCovered', () => {
  const barSec = 3600; // 1h bars

  it('returns false for an empty candle array', () => {
    expect(rangeCovered([], 0, 100, barSec)).toBe(false);
  });

  it('returns true when the cache fully spans the requested range', () => {
    const candles = [{ time: 1000 }, { time: 100_000 }];
    // requested range fully inside [1000, 100000] with tolerance
    expect(rangeCovered(candles, 2000, 90_000, barSec)).toBe(true);
  });

  it('returns false when the cache only partially covers (missing older data)', () => {
    const candles = [{ time: 50_000 }, { time: 100_000 }];
    // requested `from` (1000) is far before the cache's earliest candle -> miss
    expect(rangeCovered(candles, 1000, 90_000, barSec)).toBe(false);
  });

  it('returns false when the cache only partially covers (missing newer data, e.g. to ~ now)', () => {
    const candles = [{ time: 1000 }, { time: 5000 }];
    // requested `to` is far beyond the cache's latest candle -> miss (stale cache)
    expect(rangeCovered(candles, 1000, 500_000, barSec)).toBe(false);
  });

  it('allows one-bar tolerance at the edges', () => {
    const candles = [{ time: 1000 }, { time: 100_000 }];
    // from is barSec beyond first candle's time, still within tolerance
    expect(rangeCovered(candles, 1000 + barSec, 100_000 - barSec, barSec)).toBe(true);
  });
});
