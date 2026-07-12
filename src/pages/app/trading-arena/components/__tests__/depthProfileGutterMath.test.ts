// src/pages/app/trading-arena/components/__tests__/depthProfileGutterMath.test.ts

import { describe, it, expect } from 'vitest';
import { binFloor, aggregateRestingBook, topLevelsBySize, formatGutterSize } from '../depthProfileGutterMath';

describe('binFloor', () => {
  it('floors a price to the nearest bin boundary', () => {
    expect(binFloor(105.7, 10)).toBe(100);
    expect(binFloor(99.99, 1)).toBe(99);
    expect(binFloor(100, 10)).toBe(100);
  });
});

describe('aggregateRestingBook', () => {
  it('returns empty arrays when binSize is 0 or negative', () => {
    const bids = new Map([[100, 1]]);
    const asks = new Map([[101, 1]]);
    expect(aggregateRestingBook(bids, asks, 0)).toEqual({ bids: [], asks: [] });
    expect(aggregateRestingBook(bids, asks, -5)).toEqual({ bids: [], asks: [] });
  });

  it('aggregates multiple raw levels into the same bin by USD notional', () => {
    const bids = new Map([
      [100.1, 2], // usd 200.2
      [100.4, 3], // usd 301.2 -> same bin (100) as above with binSize=1
    ]);
    const asks = new Map<number, number>();
    const { bids: bidLevels } = aggregateRestingBook(bids, asks, 1);
    expect(bidLevels).toHaveLength(1);
    expect(bidLevels[0].price).toBe(100);
    expect(bidLevels[0].usd).toBeCloseTo(200.2 + 301.2, 5);
  });

  it('sorts bids descending by price and asks ascending by price', () => {
    const bids = new Map([
      [95, 1],
      [99, 1],
      [90, 1],
    ]);
    const asks = new Map([
      [110, 1],
      [105, 1],
      [120, 1],
    ]);
    const { bids: bidLevels, asks: askLevels } = aggregateRestingBook(bids, asks, 1);
    expect(bidLevels.map((l) => l.price)).toEqual([99, 95, 90]);
    expect(askLevels.map((l) => l.price)).toEqual([105, 110, 120]);
  });

  it('returns empty arrays for empty input maps', () => {
    expect(aggregateRestingBook(new Map(), new Map(), 1)).toEqual({ bids: [], asks: [] });
  });
});

describe('topLevelsBySize', () => {
  const levels = [
    { price: 100, usd: 500 },
    { price: 101, usd: 5000 },
    { price: 102, usd: 50 },
    { price: 103, usd: 2000 },
  ];

  it('returns the N largest-usd prices as a Set', () => {
    const top2 = topLevelsBySize(levels, 2);
    expect(top2.size).toBe(2);
    expect(top2.has(101)).toBe(true);
    expect(top2.has(103)).toBe(true);
    expect(top2.has(100)).toBe(false);
  });

  it('returns an empty set when n <= 0', () => {
    expect(topLevelsBySize(levels, 0).size).toBe(0);
    expect(topLevelsBySize(levels, -1).size).toBe(0);
  });

  it('caps at the available level count when n exceeds it', () => {
    expect(topLevelsBySize(levels, 100).size).toBe(levels.length);
  });
});

describe('formatGutterSize', () => {
  it('formats millions with one decimal', () => {
    expect(formatGutterSize(8_200_000)).toBe('$8.2M');
  });

  it('formats thousands with no decimals', () => {
    expect(formatGutterSize(640_000)).toBe('$640K');
    expect(formatGutterSize(1_000)).toBe('$1K');
  });

  it('formats sub-thousand values as plain dollars', () => {
    expect(formatGutterSize(999)).toBe('$999');
    expect(formatGutterSize(0)).toBe('$0');
  });
});
