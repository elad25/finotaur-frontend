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
  PERSISTENCE_RAMP_COLUMNS_DEFAULT,
  PERSISTENCE_MIN_FACTOR,
  persistenceFactor,
  histogramPercentile,
  kneePercentileForInkBudget,
  KNEE_MIN_PERCENTILE,
  KNEE_MAX_PERCENTILE,
  SENSITIVITY_TARGET_LIT_FRACTION,
  zoomDensityMultiplier,
  ZOOM_MULT_MIN,
  ZOOM_MULT_MAX,
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

describe('persistenceFactor', () => {
  it('dampens a level on its first appearance (consecutiveColumns === 1)', () => {
    expect(persistenceFactor(1)).toBeCloseTo(PERSISTENCE_MIN_FACTOR, 6);
    expect(persistenceFactor(0)).toBeCloseTo(PERSISTENCE_MIN_FACTOR, 6); // defensive — treated same as 1
  });

  it('ramps monotonically from the first column to the default ramp length', () => {
    let prev = -Infinity;
    for (let c = 1; c <= PERSISTENCE_RAMP_COLUMNS_DEFAULT; c++) {
      const f = persistenceFactor(c);
      expect(f).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = f;
    }
  });

  it('reaches full strength (1.0) at/after the ramp length', () => {
    expect(persistenceFactor(PERSISTENCE_RAMP_COLUMNS_DEFAULT)).toBeCloseTo(1, 6);
    expect(persistenceFactor(PERSISTENCE_RAMP_COLUMNS_DEFAULT + 10)).toBeCloseTo(1, 6);
  });

  it('honors a custom ramp length', () => {
    expect(persistenceFactor(1, 3)).toBeCloseTo(PERSISTENCE_MIN_FACTOR, 6);
    expect(persistenceFactor(3, 3)).toBeCloseTo(1, 6);
    expect(persistenceFactor(2, 3)).toBeGreaterThan(PERSISTENCE_MIN_FACTOR);
    expect(persistenceFactor(2, 3)).toBeLessThan(1);
  });

  it('stays within [PERSISTENCE_MIN_FACTOR, 1] across the whole domain', () => {
    for (const c of [1, 2, 3, 4, 5, 6, 7, 100]) {
      const f = persistenceFactor(c);
      expect(f).toBeGreaterThanOrEqual(PERSISTENCE_MIN_FACTOR - 1e-9);
      expect(f).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});

// ── Test histogram builders (kneePercentileForInkBudget / histogramPercentile) ──

/** Builds a 1000-bin histogram from a uniform distribution over [0, 999] with `countPerBin` samples each. */
function buildUniformHistogram(bins = 1000, countPerBin = 10): { hist: Uint32Array; total: number } {
  const hist = new Uint32Array(bins).fill(countPerBin);
  return { hist, total: bins * countPerBin };
}

/** Builds a degenerate histogram where every sample lands in the same bin. */
function buildDegenerateHistogram(bins = 1000, valueBin = 500, count = 1000): { hist: Uint32Array; total: number } {
  const hist = new Uint32Array(bins);
  hist[valueBin] = count;
  return { hist, total: count };
}

describe('histogramPercentile', () => {
  it('finds the expected bin for a uniform distribution', () => {
    const { hist, total } = buildUniformHistogram(1000, 10);
    expect(histogramPercentile(hist, total, 0.5)).toBeCloseTo(500, -1); // within ~10
    expect(histogramPercentile(hist, total, 0.0)).toBeLessThanOrEqual(1);
    expect(histogramPercentile(hist, total, 1.0)).toBe(999);
  });

  it('returns 0 for an empty histogram or non-positive total', () => {
    expect(histogramPercentile(new Uint32Array(10), 0, 0.5)).toBe(0);
    expect(histogramPercentile(new Uint32Array(0), 10, 0.5)).toBe(0);
  });
});

describe('kneePercentileForInkBudget', () => {
  it('a higher target-lit-fraction produces a lower (or equal) knee than a lower one', () => {
    const { hist, total } = buildUniformHistogram(1000, 10);
    const kneeLowBudget = kneePercentileForInkBudget(hist, total, SENSITIVITY_TARGET_LIT_FRACTION.quiet);
    const kneeMidBudget = kneePercentileForInkBudget(hist, total, SENSITIVITY_TARGET_LIT_FRACTION.balanced);
    const kneeHighBudget = kneePercentileForInkBudget(hist, total, SENSITIVITY_TARGET_LIT_FRACTION.detailed);
    expect(kneeMidBudget).toBeLessThanOrEqual(kneeLowBudget);
    expect(kneeHighBudget).toBeLessThanOrEqual(kneeMidBudget);
  });

  it('clamps at the p50 end for an extremely high target-lit-fraction', () => {
    const { hist, total } = buildUniformHistogram(1000, 10);
    const p50 = histogramPercentile(hist, total, KNEE_MIN_PERCENTILE);
    const knee = kneePercentileForInkBudget(hist, total, 0.99); // pct ~= 0.01, way below p50
    expect(knee).toBeCloseTo(p50, -1);
  });

  it('clamps at the p92 end for an extremely low target-lit-fraction', () => {
    const { hist, total } = buildUniformHistogram(1000, 10);
    const p92 = histogramPercentile(hist, total, KNEE_MAX_PERCENTILE);
    const knee = kneePercentileForInkBudget(hist, total, 0.001); // pct ~= 0.999, way above p92
    expect(knee).toBeCloseTo(p92, -1);
  });

  it('handles a degenerate all-equal histogram without throwing (knee === the single value)', () => {
    const { hist, total } = buildDegenerateHistogram(1000, 500, 1000);
    expect(() => kneePercentileForInkBudget(hist, total, 0.08)).not.toThrow();
    expect(kneePercentileForInkBudget(hist, total, 0.08)).toBe(500);
    expect(kneePercentileForInkBudget(hist, total, 0.5)).toBe(500);
  });

  it('returns 0 for a zero-total histogram', () => {
    expect(kneePercentileForInkBudget(new Uint32Array(1000), 0, 0.08)).toBe(0);
  });
});

describe('sensitivity target-lit-fraction constants', () => {
  it('quiet < balanced < detailed', () => {
    expect(SENSITIVITY_TARGET_LIT_FRACTION.quiet).toBeLessThan(SENSITIVITY_TARGET_LIT_FRACTION.balanced);
    expect(SENSITIVITY_TARGET_LIT_FRACTION.balanced).toBeLessThan(SENSITIVITY_TARGET_LIT_FRACTION.detailed);
  });

  it('all presets are positive fractions well under 1', () => {
    for (const v of Object.values(SENSITIVITY_TARGET_LIT_FRACTION)) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(0.5);
    }
  });
});

describe('zoomDensityMultiplier', () => {
  it('returns the zoomed-out multiplier at/below the zoomed-out anchor', () => {
    expect(zoomDensityMultiplier(2)).toBeCloseTo(0.6, 6);
    expect(zoomDensityMultiplier(1)).toBeLessThanOrEqual(0.6);
  });

  it('returns the zoomed-in multiplier at/above the zoomed-in anchor', () => {
    expect(zoomDensityMultiplier(8)).toBeCloseTo(1.4, 6);
  });

  it('is monotonically non-decreasing between the anchors', () => {
    let prev = -Infinity;
    for (const px of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const m = zoomDensityMultiplier(px);
      expect(m).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = m;
    }
  });

  it('clamps to [ZOOM_MULT_MIN, ZOOM_MULT_MAX] far outside the anchors', () => {
    expect(zoomDensityMultiplier(0.01)).toBeCloseTo(ZOOM_MULT_MIN, 6);
    expect(zoomDensityMultiplier(1000)).toBeCloseTo(ZOOM_MULT_MAX, 6);
  });

  it('returns a neutral multiplier (1) for non-finite or non-positive input', () => {
    expect(zoomDensityMultiplier(0)).toBe(1);
    expect(zoomDensityMultiplier(-5)).toBe(1);
    expect(zoomDensityMultiplier(NaN)).toBe(1);
  });
});
