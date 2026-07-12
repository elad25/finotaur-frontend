// src/pages/app/trading-arena/components/__tests__/domLadderMath.test.ts
//
// Pure-function tests for DomLadder.tsx's price-grid math — no React render
// harness needed (mirrors depthProfileGutterMath.test.ts's convention).

import { describe, it, expect } from 'vitest';
import {
  inferTickSize,
  decimalsForStep,
  niceStepAtOrBelow,
  computeAutoRowSize,
  priceToRowIndex,
  rowIndexToPrice,
  resolveRowSizeDollars,
  formatLadderPrice,
} from '../domLadderMath';

describe('inferTickSize', () => {
  it('returns the minimum positive gap between sampled bid/ask prices', () => {
    const bids = new Map([[100, 1], [99.5, 1], [99, 1]]);
    const asks = new Map([[100.5, 1], [101, 1]]);
    expect(inferTickSize(bids, asks, 100)).toBeCloseTo(0.5);
  });

  it('falls back to a price-relative epsilon when the book is too thin to sample', () => {
    expect(inferTickSize(new Map(), new Map(), 64200)).toBeCloseTo(64200 * 1e-6);
    expect(inferTickSize(new Map(), new Map(), null)).toBe(0.01);
  });
});

describe('decimalsForStep', () => {
  it('counts decimal places of common steps', () => {
    expect(decimalsForStep(1)).toBe(0);
    expect(decimalsForStep(10)).toBe(0);
    expect(decimalsForStep(0.5)).toBe(1);
    expect(decimalsForStep(0.05)).toBe(2);
    expect(decimalsForStep(0.02)).toBe(2);
    expect(decimalsForStep(0.0001)).toBe(4);
  });

  it('returns a safe default for invalid input', () => {
    expect(decimalsForStep(0)).toBe(2);
    expect(decimalsForStep(-1)).toBe(2);
    expect(decimalsForStep(NaN)).toBe(2);
  });
});

describe('niceStepAtOrBelow', () => {
  it('snaps down to the nearest 1/2/5×10^n value', () => {
    expect(niceStepAtOrBelow(12.84)).toBe(10);
    expect(niceStepAtOrBelow(0.6)).toBe(0.5);
    expect(niceStepAtOrBelow(0.03)).toBe(0.02);
    expect(niceStepAtOrBelow(1)).toBe(1);
    expect(niceStepAtOrBelow(2)).toBe(2);
    expect(niceStepAtOrBelow(4.999)).toBe(2);
    expect(niceStepAtOrBelow(5)).toBe(5);
    expect(niceStepAtOrBelow(9.999)).toBe(5);
  });

  it('returns 0 for non-positive/non-finite input', () => {
    expect(niceStepAtOrBelow(0)).toBe(0);
    expect(niceStepAtOrBelow(-5)).toBe(0);
    expect(niceStepAtOrBelow(NaN)).toBe(0);
  });
});

describe('computeAutoRowSize — worked examples from the spec', () => {
  it('BTC @ 64,200 (tick $0.01): 2bp target 12.84 snaps down to $10', () => {
    expect(computeAutoRowSize(64_200, 0.01, null)).toBe(10);
  });

  it('ETH @ 3,000 (tick $0.01): 2bp target 0.6 snaps down to $0.5', () => {
    expect(computeAutoRowSize(3_000, 0.01, null)).toBe(0.5);
  });

  it('SOL @ 150 (tick $0.01): 2bp target 0.03 snaps down to $0.02', () => {
    expect(computeAutoRowSize(150, 0.01, null)).toBeCloseTo(0.02);
  });

  it('DOGE @ 0.12 (tick $0.0001): 2bp target 0.000024 floors at the tick', () => {
    expect(computeAutoRowSize(0.12, 0.0001, null)).toBeCloseTo(0.0001);
  });

  it('never returns below the inferred tick even for a huge tick', () => {
    expect(computeAutoRowSize(1, 5, null)).toBe(5);
  });

  it('falls back to prevAutoRowSize (or tick) when price is null/invalid', () => {
    expect(computeAutoRowSize(null, 0.01, 2)).toBe(2);
    expect(computeAutoRowSize(null, 0.01, null)).toBe(0.01);
    expect(computeAutoRowSize(-5, 0.01, 3)).toBe(3);
  });

  it('hysteresis: does not flap between adjacent nice values right at a boundary', () => {
    // 2bp of 10,000 = 2 exactly → boundary case.
    const first = computeAutoRowSize(10_000, 0.01, null);
    expect(first).toBe(2);
    // A tiny nudge above the boundary (still snaps to the same nice value
    // pre-hysteresis) must not change anything.
    const nudged = computeAutoRowSize(10_001, 0.01, first);
    expect(nudged).toBe(2);
  });

  it('hysteresis: switches once the target has moved a full prev-step width away', () => {
    const prev = 2; // e.g. established at price ~10,000
    // Small drift within one prev-step width of prev stays put.
    const small = computeAutoRowSize(10_100, 0.01, prev); // target = 2.02
    expect(small).toBe(prev);
    // Large drift — target moves far enough away to justify a re-snap.
    const large = computeAutoRowSize(30_000, 0.01, prev); // target = 6 → nice 5
    expect(large).toBe(5);
  });

  it('anti-oscillation: once switched to a larger nice value, a small pull-back does not immediately revert', () => {
    const afterCross = computeAutoRowSize(10_001, 0.01, 1); // target=2.0002, prev=1 → crosses to 2
    expect(afterCross).toBe(2);
    const pullback = computeAutoRowSize(9_800, 0.01, afterCross); // target=1.96 (below 2) but within one prev-step of 2
    expect(pullback).toBe(2);
  });
});

describe('priceToRowIndex / rowIndexToPrice — integer-bucket round trip', () => {
  it('round-trips cleanly for a nice rowSize', () => {
    const rowSize = 10;
    const decimals = decimalsForStep(rowSize);
    const idx = priceToRowIndex(64_178.16, rowSize);
    expect(idx).toBe(6418);
    expect(rowIndexToPrice(idx, rowSize, decimals)).toBe(64_180);
  });

  it('never leaves float-drift garbage in the output (regression: 64178.15996638)', () => {
    const rowSize = 0.01;
    const decimals = decimalsForStep(rowSize);
    const idx = priceToRowIndex(64_178.16, rowSize);
    const price = rowIndexToPrice(idx, rowSize, decimals);
    // The bug produced strings with 8 decimal places; the fix must be exact
    // to the row size's own precision.
    expect(price.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(decimals);
    expect(price).toBeCloseTo(64_178.16, 2);
  });

  it('handles fractional (non-integer-cents) rowSize without drift', () => {
    const rowSize = 0.5;
    const decimals = decimalsForStep(rowSize);
    const idx = priceToRowIndex(3_000.3, rowSize);
    const price = rowIndexToPrice(idx, rowSize, decimals);
    expect(price).toBe(3_000.5);
  });
});

describe('resolveRowSizeDollars', () => {
  it("'auto' defers to computeAutoRowSize", () => {
    expect(resolveRowSizeDollars('auto', 0.01, 64_200, null)).toBe(10);
  });

  it('a numeric preference is a TICK MULTIPLE, not a dollar amount', () => {
    expect(resolveRowSizeDollars(5, 0.01, 64_200, null)).toBeCloseTo(0.05);
    expect(resolveRowSizeDollars(10, 0.25, null, null)).toBeCloseTo(2.5); // futures tick example
  });

  it('never returns below tick for a numeric preference', () => {
    expect(resolveRowSizeDollars(1, 0.01, null, null)).toBeCloseTo(0.01);
  });
});

describe('formatLadderPrice', () => {
  it('applies fixed decimals and thousands separators', () => {
    expect(formatLadderPrice(64_178, 0)).toBe('64,178');
    expect(formatLadderPrice(64_178.05, 2)).toBe('64,178.05');
    expect(formatLadderPrice(3_000.5, 1)).toBe('3,000.5');
    expect(formatLadderPrice(0.12, 4)).toBe('0.1200');
  });
});
