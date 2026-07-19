// src/lib/journal/fees.test.ts
// Vitest suite for the fee-normalization helper.

import { describe, it, expect } from 'vitest';
import { estimateFeeUsd } from './fees';

describe('estimateFeeUsd', () => {
  it('normal case: gross minus net yields the fee', () => {
    // gross=100, net=97.50 → $2.50 of fees on 1 contract (within the $50/contract cap)
    expect(estimateFeeUsd(100, 97.5, 1)).toBeCloseTo(2.5);
  });

  it('null netPnlUsd → 0', () => {
    expect(estimateFeeUsd(100, null, 1)).toBe(0);
  });

  it('undefined netPnlUsd → 0', () => {
    expect(estimateFeeUsd(100, undefined, 1)).toBe(0);
  });

  it('non-finite netPnlUsd → 0', () => {
    expect(estimateFeeUsd(100, NaN, 1)).toBe(0);
  });

  it('clamp violation — negative gap (net > gross) → 0, not a negative fee', () => {
    // gross=100, net=105 → gap is -5, not a real fee (partial fill / bad data)
    expect(estimateFeeUsd(100, 105, 1)).toBe(0);
  });

  it('clamp violation — gap exceeds MAX_FEE_PER_CONTRACT_USD * qty → 0', () => {
    // gross=100, net=0 → gap=100, cap=50*1=50 → out of bounds, not fees
    expect(estimateFeeUsd(100, 0, 1)).toBe(0);
  });

  it('clamp respects quantity — same $ gap valid for more contracts', () => {
    // gross=200, net=100 → gap=100, cap=50*3=150 → within bounds
    expect(estimateFeeUsd(200, 100, 3)).toBeCloseTo(100);
  });

  it('zero gap (net === gross) → 0 fee', () => {
    expect(estimateFeeUsd(100, 100, 1)).toBe(0);
  });

  it('exact cap boundary is accepted (inclusive)', () => {
    // gross=150, net=100 → gap=50, cap=50*1=50 → exactly at boundary, accepted
    expect(estimateFeeUsd(150, 100, 1)).toBeCloseTo(50);
  });
});
