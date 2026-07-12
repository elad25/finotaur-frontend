// src/components/charting/orderflow/__tests__/volumeBubbles.test.ts

import { describe, it, expect } from 'vitest';
import {
  computeBubbleThreshold,
  resolveBubbleThreshold,
  computeVolumeBubbles,
  bubbleRadiusPx,
} from '../volumeBubbles';
import type { FlowCandleView, FlowBin } from '../types';

function bin(binPrice: number, buyVol: number, sellVol: number): FlowBin {
  return { binPrice, buyVol, sellVol, trades: 1 };
}

function candle(time: number, bins: FlowBin[]): FlowCandleView {
  const totalVol = bins.reduce((s, b) => s + b.buyVol + b.sellVol, 0);
  const delta = bins.reduce((s, b) => s + b.buyVol - b.sellVol, 0);
  return { time, bins, totalVol, delta, minDelta: 0, maxDelta: 0, poc: null };
}

describe('computeBubbleThreshold', () => {
  it('returns 0 for an empty candle list', () => {
    expect(computeBubbleThreshold([])).toBe(0);
  });

  it('returns 0 when every bin is perfectly balanced (net volume 0)', () => {
    const candles = [candle(0, [bin(100, 5, 5), bin(101, 3, 3)])];
    expect(computeBubbleThreshold(candles)).toBe(0);
  });

  it('picks the ~98th percentile of dominant-side volumes', () => {
    // 100 bins each 1..100 net buy volume — p98 should land near 98.
    const bins = Array.from({ length: 100 }, (_, i) => bin(1000 + i, i + 1, 0));
    const candles = [candle(0, bins)];
    const threshold = computeBubbleThreshold(candles, 0.98);
    expect(threshold).toBeGreaterThanOrEqual(96);
    expect(threshold).toBeLessThanOrEqual(100);
  });

  it('a lower pct produces a lower (more inclusive) threshold', () => {
    const bins = Array.from({ length: 50 }, (_, i) => bin(1000 + i, i + 1, 0));
    const candles = [candle(0, bins)];
    const p98 = computeBubbleThreshold(candles, 0.98);
    const p50 = computeBubbleThreshold(candles, 0.50);
    expect(p50).toBeLessThan(p98);
  });
});

describe('resolveBubbleThreshold', () => {
  const candles = [candle(0, [bin(100, 10, 0), bin(101, 20, 0), bin(102, 30, 0)])];

  it("'auto' delegates to computeBubbleThreshold", () => {
    expect(resolveBubbleThreshold(candles, 'auto')).toBe(computeBubbleThreshold(candles));
  });

  it('a finite non-negative number is used verbatim', () => {
    expect(resolveBubbleThreshold(candles, 15)).toBe(15);
    expect(resolveBubbleThreshold(candles, 0)).toBe(0);
  });

  it('an invalid number (negative/NaN/Infinity) falls back to 0', () => {
    expect(resolveBubbleThreshold(candles, -5)).toBe(0);
    expect(resolveBubbleThreshold(candles, NaN)).toBe(0);
    expect(resolveBubbleThreshold(candles, Infinity)).toBe(0);
  });
});

describe('computeVolumeBubbles', () => {
  it('produces one bubble per dominant-side bin above threshold', () => {
    const candles = [
      candle(1000, [
        bin(100, 50, 5),  // net buy 45
        bin(101, 2, 40),  // net sell 38
        bin(102, 5, 5),   // balanced — no bubble
      ]),
    ];
    const bubbles = computeVolumeBubbles(candles, 10);
    expect(bubbles).toHaveLength(2);

    const buy = bubbles.find((b) => b.side === 'buy')!;
    expect(buy.price).toBe(100);
    expect(buy.volume).toBe(50);
    expect(buy.time).toBe(1000);

    const sell = bubbles.find((b) => b.side === 'sell')!;
    expect(sell.price).toBe(101);
    expect(sell.volume).toBe(40);
  });

  it('excludes bins at or below the threshold', () => {
    const candles = [candle(0, [bin(100, 10, 0)])];
    expect(computeVolumeBubbles(candles, 10)).toHaveLength(0); // volume === threshold
    expect(computeVolumeBubbles(candles, 9)).toHaveLength(1);  // volume > threshold
  });

  it('returns empty for empty input', () => {
    expect(computeVolumeBubbles([], 0)).toEqual([]);
  });
});

describe('bubbleRadiusPx', () => {
  it('clamps to minPx when maxVolume <= threshold (no meaningful range)', () => {
    expect(bubbleRadiusPx(5, 5, 5)).toBe(3);
    expect(bubbleRadiusPx(5, 0, 0)).toBe(3);
  });

  it('returns minPx for zero/negative volume', () => {
    expect(bubbleRadiusPx(0, 100, 0)).toBe(3);
    expect(bubbleRadiusPx(-1, 100, 0)).toBe(3);
  });

  it('returns maxPx at (or above) maxVolume', () => {
    expect(bubbleRadiusPx(100, 100, 0)).toBe(18);
    expect(bubbleRadiusPx(500, 100, 0)).toBe(18); // clamps
  });

  it('is monotonically increasing with volume between threshold and maxVolume', () => {
    const r1 = bubbleRadiusPx(20, 100, 0);
    const r2 = bubbleRadiusPx(50, 100, 0);
    const r3 = bubbleRadiusPx(80, 100, 0);
    expect(r1).toBeLessThan(r2);
    expect(r2).toBeLessThan(r3);
  });

  it('respects custom min/max px bounds', () => {
    expect(bubbleRadiusPx(100, 100, 0, 5, 25)).toBe(25);
    expect(bubbleRadiusPx(0, 100, 0, 5, 25)).toBe(5);
  });
});
