// src/components/charting/__tests__/depthSignificance.test.ts
//
// Unit tests for the pure significance-mapping helpers — see
// depthSignificance.ts's header comment for the dust-cutoff vs. soft-knee
// split this exercises.

import { describe, it, expect } from 'vitest';
import {
  DUST_MIN_USD,
  DUST_MAX_USD,
  DUST_PCT,
  dustCutoffUsd,
  softKneeAlpha,
} from '../depthSignificance';

describe('dustCutoffUsd', () => {
  it('returns the min clamp for an empty column (zero total notional)', () => {
    expect(dustCutoffUsd([])).toBe(DUST_MIN_USD);
  });

  it('returns the min clamp when 0.02% of the total falls below it', () => {
    // total = 100 -> raw = 100 * 0.0002 = 0.02, well under DUST_MIN_USD
    expect(dustCutoffUsd([100])).toBe(DUST_MIN_USD);
  });

  it('computes 0.02% of the total for a single bin in the un-clamped range', () => {
    // total = 100_000 -> raw = 20 (between 10 and 2000)
    expect(dustCutoffUsd([100_000])).toBeCloseTo(100_000 * DUST_PCT, 6);
  });

  it('sums multiple bins before applying the percentage', () => {
    const bins = [40_000, 30_000, 30_000]; // total = 100_000 -> same as single-bin case
    expect(dustCutoffUsd(bins)).toBeCloseTo(100_000 * DUST_PCT, 6);
  });

  it('clamps to DUST_MAX_USD for a very large (whale) column', () => {
    // total = 100_000_000 -> raw = 20_000, clamped down to 2_000
    expect(dustCutoffUsd([100_000_000])).toBe(DUST_MAX_USD);
  });

  it('ignores non-finite / non-positive entries when summing', () => {
    expect(dustCutoffUsd([100_000, NaN, -50, 0, Infinity === Infinity ? 0 : 1])).toBeCloseTo(100_000 * DUST_PCT, 6);
  });
});

describe('softKneeAlpha', () => {
  const KNEE = 100_000;

  it('returns minAlpha (default 0.18) at usd = 0', () => {
    expect(softKneeAlpha(0, KNEE)).toBeCloseTo(0.18, 6);
  });

  it('returns 1.0 at usd >= kneeUsd', () => {
    expect(softKneeAlpha(KNEE, KNEE)).toBeCloseTo(1, 6);
    expect(softKneeAlpha(KNEE * 5, KNEE)).toBeCloseTo(1, 6);
  });

  it('is monotonically non-decreasing as usd increases', () => {
    const samples = [0, KNEE * 0.1, KNEE * 0.25, KNEE * 0.5, KNEE * 0.75, KNEE * 0.9, KNEE, KNEE * 2];
    let prev = -Infinity;
    for (const usd of samples) {
      const a = softKneeAlpha(usd, KNEE);
      expect(a).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = a;
    }
  });

  it('stays within [minAlpha, 1] across the whole domain', () => {
    for (const usd of [0, 1, 100, 50_000, KNEE, KNEE * 10]) {
      const a = softKneeAlpha(usd, KNEE);
      expect(a).toBeGreaterThanOrEqual(0.18 - 1e-9);
      expect(a).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('honors a custom minAlpha', () => {
    expect(softKneeAlpha(0, KNEE, 0.05)).toBeCloseTo(0.05, 6);
    expect(softKneeAlpha(KNEE, KNEE, 0.05)).toBeCloseTo(1, 6);
  });

  it('returns full alpha when kneeUsd is 0 or negative (no meaningful knee)', () => {
    expect(softKneeAlpha(500, 0)).toBe(1);
    expect(softKneeAlpha(500, -10)).toBe(1);
  });

  it('returns minAlpha for non-finite or non-positive usd', () => {
    expect(softKneeAlpha(0, KNEE)).toBeCloseTo(0.18, 6);
    expect(softKneeAlpha(-5, KNEE)).toBeCloseTo(0.18, 6);
    expect(softKneeAlpha(NaN, KNEE)).toBeCloseTo(0.18, 6);
  });
});
