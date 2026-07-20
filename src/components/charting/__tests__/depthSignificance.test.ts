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
  weightedPriceExtent,
  clampExtentToMaxRows,
  clipColumnsForCellBudget,
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

// ── weightedPriceExtent / clampExtentToMaxRows / clipColumnsForCellBudget ───
// Perf-fix regression tests (PR #1568 follow-up) — see the "Phase 4" doc
// comment in depthSignificance.ts for the full rationale.

describe('weightedPriceExtent', () => {
  it('excludes dust resting at an extreme price (negligible USD weight)', () => {
    // A tight cluster of real book depth around 64,500 plus a single $20
    // dust bid sitting all the way down at 30,000 (roughly half the price).
    const prices: number[] = [];
    const usd: number[] = [];
    for (let i = 0; i < 200; i++) {
      prices.push(64_000 + i * 5); // 64,000..64,995
      usd.push(1_000 + Math.random() * 500); // real-sized levels
    }
    prices.push(30_000);
    usd.push(20); // dust

    const { min, max } = weightedPriceExtent(prices, usd);
    expect(min).toBeGreaterThan(60_000); // dust at 30,000 excluded
    expect(max).toBeLessThanOrEqual(64_995);
  });

  it('includes a big distant wall (large USD far from the cluster)', () => {
    const prices: number[] = [];
    const usd: number[] = [];
    for (let i = 0; i < 200; i++) {
      prices.push(64_000 + i * 5);
      usd.push(1_000);
    }
    // A genuinely large resting wall far below the cluster — should NOT be
    // excluded the way the dust order above was.
    prices.push(50_000);
    usd.push(5_000_000);

    const { min } = weightedPriceExtent(prices, usd);
    expect(min).toBeLessThanOrEqual(50_000);
  });

  it('handles a degenerate single-price input (min === max === that price)', () => {
    const { min, max, median } = weightedPriceExtent([100], [500]);
    expect(min).toBe(100);
    expect(max).toBe(100);
    expect(median).toBe(100);
  });

  it('returns a zero-width degenerate result for empty input', () => {
    const { min, max, median } = weightedPriceExtent([], []);
    expect(min).toBe(0);
    expect(max).toBe(0);
    expect(median).toBe(0);
  });

  it('falls back to raw min/max when every weight is zero/non-finite', () => {
    const { min, max } = weightedPriceExtent([10, 20, 30], [0, NaN, -5]);
    expect(min).toBe(10);
    expect(max).toBe(30);
  });

  it('respects custom loPct/hiPct bounds (narrower window -> narrower or equal extent)', () => {
    const prices = Array.from({ length: 100 }, (_, i) => i);
    const usd = new Array(100).fill(10);
    const wide = weightedPriceExtent(prices, usd, 0.0, 1.0);
    const narrow = weightedPriceExtent(prices, usd, 0.25, 0.75);
    expect(narrow.min).toBeGreaterThanOrEqual(wide.min);
    expect(narrow.max).toBeLessThanOrEqual(wide.max);
  });

  it('median sits between min and max for a uniform-weight distribution', () => {
    const prices = Array.from({ length: 100 }, (_, i) => i);
    const usd = new Array(100).fill(10);
    const { min, max, median } = weightedPriceExtent(prices, usd);
    expect(median).toBeGreaterThanOrEqual(min);
    expect(median).toBeLessThanOrEqual(max);
  });

  it('is order-independent (unsorted input price array still resolves correctly)', () => {
    const prices = [500, 100, 300, 200, 400];
    const usd = [10, 10, 10, 10, 10];
    const { min, max } = weightedPriceExtent(prices, usd, 0, 1);
    expect(min).toBe(100);
    expect(max).toBe(500);
  });
});

describe('clampExtentToMaxRows', () => {
  it('returns the input unchanged when already within the row budget', () => {
    const result = clampExtentToMaxRows(100, 200, 1, 150, 4000);
    expect(result).toEqual({ min: 100, max: 200 });
  });

  it('caps a pathologically wide span to maxRows, centered on the median', () => {
    // binSize=$25, span from 30,000 to 64,500 -> raw numRows ~ 1,381 (within
    // the worked example in the task) — use a smaller binSize to force a
    // clamp: 0.5 -> numRows would be ~69,000.
    const min = 30_000;
    const max = 64_500;
    const binSize = 0.5;
    const median = 64_000; // near the real cluster
    const result = clampExtentToMaxRows(min, max, binSize, median, 4000);
    const rows = Math.round((result.max - result.min) / binSize) + 1;
    expect(rows).toBeLessThanOrEqual(4000);
    expect(result.min).toBeGreaterThanOrEqual(min);
    expect(result.max).toBeLessThanOrEqual(max);
    // Clamped window should still surround (or sit adjacent to) the median.
    expect(result.min).toBeLessThanOrEqual(median);
  });

  it('never produces a window wider than the original [min, max] bounds', () => {
    const result = clampExtentToMaxRows(0, 1000, 1, 999, 100); // median near the top edge
    expect(result.min).toBeGreaterThanOrEqual(0);
    expect(result.max).toBeLessThanOrEqual(1000);
  });

  it('is a no-op for a non-positive binSize or maxRows', () => {
    expect(clampExtentToMaxRows(0, 100, 0, 50, 10)).toEqual({ min: 0, max: 100 });
    expect(clampExtentToMaxRows(0, 100, 1, 50, 0)).toEqual({ min: 0, max: 100 });
  });
});

describe('clipColumnsForCellBudget', () => {
  it('returns numColsAvailable unchanged when already within the cell budget', () => {
    expect(clipColumnsForCellBudget(100, 100, 1_000_000)).toBe(100);
  });

  it('trims columns to fit when numCols*numRows exceeds the budget', () => {
    // 2880 cols * 4000 rows = 11,520,000 — within a 12M budget.
    expect(clipColumnsForCellBudget(2880, 4000, 12_000_000)).toBe(2880);
    // 5000 cols * 4000 rows = 20,000,000 — over budget, must trim.
    const kept = clipColumnsForCellBudget(5000, 4000, 12_000_000);
    expect(kept).toBeLessThan(5000);
    expect(kept * 4000).toBeLessThanOrEqual(12_000_000);
  });

  it('never returns fewer than 1 column even under an extreme budget', () => {
    expect(clipColumnsForCellBudget(5000, 1_000_000, 100)).toBe(1);
  });
});
