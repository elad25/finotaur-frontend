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
  SOFT_KNEE_MIN_ALPHA,
  HIDE_BELOW_KNEE_FRACTION,
  PERSISTENCE_RAMP_COLUMNS_DEFAULT,
  PERSISTENCE_MIN_FACTOR,
  persistenceFactor,
  PERSISTENCE_SIZE_GATE_LO_KNEE_FRACTION,
  sizeGatedPersistenceFactor,
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
  computeWindowRange,
  alphaSkipCutoffUsd,
  classifyColumnsUpdate,
  TARGET_MIN_COL_PX,
  TARGET_MIN_ROW_PX,
  LOD_MAX_BUCKET_FACTOR,
  LOD_MAX_ROW_MERGE_FACTOR,
  computeBucketFactor,
  computeRowMergeFactor,
  computeLodFactors,
  requiredRowMergeFactorForCap,
  bucketStartMs,
  mergeColumnsMaxQ,
  bucketColumns,
  LOD_HYSTERESIS_LOW_RATIO,
  LOD_HYSTERESIS_HIGH_RATIO,
  computeBucketFactorWithHysteresis,
  computeRowMergeFactorWithHysteresis,
  paintedWindowEndMs,
  bumpPersistMapForColumn,
  type DecodedColumnLike,
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
  // Cells under this fraction of the knee are hidden entirely (alpha 0) —
  // see HIDE_BELOW_KNEE_FRACTION's doc comment in depthSignificance.ts.
  const HIDE_FLOOR = KNEE * HIDE_BELOW_KNEE_FRACTION; // 2,000

  it('returns 0 (hidden) at usd = 0', () => {
    expect(softKneeAlpha(0, KNEE)).toBe(0);
  });

  it('returns 1.0 at usd >= kneeUsd', () => {
    expect(softKneeAlpha(KNEE, KNEE)).toBeCloseTo(1, 6);
    expect(softKneeAlpha(KNEE * 5, KNEE)).toBeCloseTo(1, 6);
  });

  it('is monotonically non-decreasing as usd increases (spanning the alpha-0 hide zone and the ramp above it)', () => {
    const samples = [
      0,
      HIDE_FLOOR * 0.5,
      HIDE_FLOOR * 0.99,
      HIDE_FLOOR,
      HIDE_FLOOR * 1.5,
      KNEE * 0.1,
      KNEE * 0.25,
      KNEE * 0.5,
      KNEE * 0.75,
      KNEE * 0.9,
      KNEE,
      KNEE * 2,
    ];
    let prev = -Infinity;
    for (const usd of samples) {
      const a = softKneeAlpha(usd, KNEE);
      expect(a).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = a;
    }
  });

  it('stays within [0, 1] across the whole domain (the hide zone included)', () => {
    for (const usd of [0, 1, 100, HIDE_FLOOR, 50_000, KNEE, KNEE * 10]) {
      const a = softKneeAlpha(usd, KNEE);
      expect(a).toBeGreaterThanOrEqual(-1e-9);
      expect(a).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('is hidden (alpha 0) for usd just below the hide floor', () => {
    expect(softKneeAlpha(HIDE_FLOOR - 1, KNEE)).toBe(0);
    expect(softKneeAlpha(HIDE_FLOOR * 0.99, KNEE)).toBe(0);
  });

  it('ramps to at least SOFT_KNEE_MIN_ALPHA at/just above the hide floor', () => {
    expect(softKneeAlpha(HIDE_FLOOR, KNEE)).toBeGreaterThanOrEqual(SOFT_KNEE_MIN_ALPHA);
    expect(softKneeAlpha(HIDE_FLOOR * 1.01, KNEE)).toBeGreaterThanOrEqual(SOFT_KNEE_MIN_ALPHA);
  });

  it('honors a custom minAlpha above the hide floor', () => {
    expect(softKneeAlpha(HIDE_FLOOR, KNEE, 0.3)).toBeGreaterThanOrEqual(0.3);
    expect(softKneeAlpha(KNEE, KNEE, 0.3)).toBeCloseTo(1, 6);
  });

  it('returns full alpha when kneeUsd is 0 or negative (no meaningful knee)', () => {
    expect(softKneeAlpha(500, 0)).toBe(1);
    expect(softKneeAlpha(500, -10)).toBe(1);
  });

  it('returns 0 for non-finite or non-positive usd', () => {
    expect(softKneeAlpha(0, KNEE)).toBe(0);
    expect(softKneeAlpha(-5, KNEE)).toBe(0);
    expect(softKneeAlpha(NaN, KNEE)).toBe(0);
  });
});

describe('sizeGatedPersistenceFactor', () => {
  const KNEE = 100_000;

  it('fully gates (returns 1.0) at/above the knee, regardless of persistMult', () => {
    expect(sizeGatedPersistenceFactor(0.45, KNEE, KNEE)).toBeCloseTo(1, 6);
    expect(sizeGatedPersistenceFactor(0.45, KNEE * 2, KNEE)).toBeCloseTo(1, 6);
    expect(sizeGatedPersistenceFactor(0.1, KNEE, KNEE)).toBeCloseTo(1, 6);
  });

  it('applies NO gate at or below the low knee fraction (returns persistMult unchanged)', () => {
    const lo = KNEE * PERSISTENCE_SIZE_GATE_LO_KNEE_FRACTION; // 0.5 * knee
    expect(sizeGatedPersistenceFactor(0.45, lo, KNEE)).toBeCloseTo(0.45, 6);
    expect(sizeGatedPersistenceFactor(0.45, lo * 0.5, KNEE)).toBeCloseTo(0.45, 6);
  });

  it('is monotonically increasing between the low knee fraction and the knee itself', () => {
    const lo = KNEE * PERSISTENCE_SIZE_GATE_LO_KNEE_FRACTION;
    const samples = [lo, lo + (KNEE - lo) * 0.25, lo + (KNEE - lo) * 0.5, lo + (KNEE - lo) * 0.75, KNEE];
    let prev = -Infinity;
    for (const usd of samples) {
      const f = sizeGatedPersistenceFactor(0.45, usd, KNEE);
      expect(f).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = f;
    }
  });

  it('falls back to persistMult for a degenerate (non-positive) knee', () => {
    expect(sizeGatedPersistenceFactor(0.45, 1000, 0)).toBeCloseTo(0.45, 6);
    expect(sizeGatedPersistenceFactor(0.45, 1000, -5)).toBeCloseTo(0.45, 6);
  });

  it('falls back to persistMult for non-finite or non-positive usd', () => {
    expect(sizeGatedPersistenceFactor(0.45, 0, KNEE)).toBeCloseTo(0.45, 6);
    expect(sizeGatedPersistenceFactor(0.45, -5, KNEE)).toBeCloseTo(0.45, 6);
    expect(sizeGatedPersistenceFactor(0.45, NaN, KNEE)).toBeCloseTo(0.45, 6);
  });

  it('stays at 1 everywhere when persistMult is already 1 (nothing to gate)', () => {
    for (const usd of [0, KNEE * 0.1, KNEE * 0.5, KNEE * 0.75, KNEE, KNEE * 2]) {
      expect(sizeGatedPersistenceFactor(1, usd, KNEE)).toBeCloseTo(1, 6);
    }
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

  it('clamps at the KNEE_MAX_PERCENTILE (p99.5) end for an extremely low target-lit-fraction', () => {
    const { hist, total } = buildUniformHistogram(1000, 10);
    const pMax = histogramPercentile(hist, total, KNEE_MAX_PERCENTILE);
    const knee = kneePercentileForInkBudget(hist, total, 0.001); // pct ~= 0.999, way above p99.5
    expect(knee).toBeCloseTo(pMax, -1);
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

  /**
   * Builds a wide-spread (exponential-ish) histogram over `bins` distinct
   * values, with per-bin counts growing toward the tail — enough resolution
   * in the p84..p99.5 region that the 3 sensitivity presets' percentiles
   * land on genuinely different bin indices. This is the regression that
   * matters: pre-2026-07-20, KNEE_MAX_PERCENTILE was 0.92, so Quiet's p98
   * AND Balanced's p94 both got clamped down to the SAME p92 value at
   * normal zoom, making the Sensitivity control a no-op between them.
   */
  function buildWideSpreadHistogram(bins = 3000): { hist: Uint32Array; total: number } {
    const hist = new Uint32Array(bins);
    let total = 0;
    for (let i = 0; i < bins; i++) {
      const count = 1 + Math.floor(i / 10); // strictly non-decreasing tail mass
      hist[i] = count;
      total += count;
    }
    return { hist, total };
  }

  it('quiet/balanced/detailed produce three DISTINCT knees on a wide-spread distribution (regression: the old p92 clamp collapsed quiet+balanced onto the same knee)', () => {
    const { hist, total } = buildWideSpreadHistogram();
    const kneeQuiet = kneePercentileForInkBudget(hist, total, SENSITIVITY_TARGET_LIT_FRACTION.quiet);
    const kneeBalanced = kneePercentileForInkBudget(hist, total, SENSITIVITY_TARGET_LIT_FRACTION.balanced);
    const kneeDetailed = kneePercentileForInkBudget(hist, total, SENSITIVITY_TARGET_LIT_FRACTION.detailed);
    expect(kneeQuiet).toBeGreaterThan(kneeBalanced);
    expect(kneeBalanced).toBeGreaterThan(kneeDetailed);
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

describe('computeWindowRange', () => {
  // 100 columns, 5s apart, starting at t=0.
  const times = Array.from({ length: 100 }, (_, i) => i * 5000);

  it('returns an empty range for an empty column array', () => {
    expect(computeWindowRange([], 0, 100, 0.4)).toEqual({ startIdx: 0, endIdx: -1 });
  });

  it('falls back to the whole array for a degenerate visible range', () => {
    expect(computeWindowRange(times, NaN, NaN, 0.4)).toEqual({ startIdx: 0, endIdx: 99 });
    expect(computeWindowRange(times, 50, 10, 0.4)).toEqual({ startIdx: 0, endIdx: 99 }); // to < from
  });

  it('covers exactly the visible range with zero margin', () => {
    // visible [10s, 20s] -> columns at t=10000..20000 -> idx 2..4
    const { startIdx, endIdx } = computeWindowRange(times, 10, 20, 0);
    expect(startIdx).toBe(2);
    expect(endIdx).toBe(4);
  });

  it('expands by the requested fraction of the visible span on each side', () => {
    // visible [50s,60s] span=10s, margin 40% -> 4s each side -> [46s,64s]
    // idx for t=46000 -> ceil(46000/5000)=9.2 -> lowerBound finds first t>=46000 -> t=50000 idx10? wait check exact bins
    const { startIdx, endIdx } = computeWindowRange(times, 50, 60, 0.4);
    // window wants [46000, 64000]; column times are multiples of 5000: 45000,50000,...,60000,65000
    // first t>=46000 -> 50000 (idx10); last t<=64000 -> 60000 (idx12)
    expect(startIdx).toBe(10);
    expect(endIdx).toBe(12);
  });

  it('clamps to array bounds when the margin-expanded window overflows either edge', () => {
    // visible [0,5] span=5s; margin fraction 100 -> margin=500s each side -> window
    // covers everything on the left (clamped to 0) but still bounded on the right.
    const { startIdx, endIdx } = computeWindowRange(times, 0, 5, 100); // huge margin
    expect(startIdx).toBe(0);
    expect(endIdx).toBe(99); // margin (500s each side) now comfortably covers the whole 495s array
  });

  it('falls back to the nearest single column when the window has no overlap with any column', () => {
    // All columns are at t=0..495000ms; ask for a visible range far in the future with no margin.
    const { startIdx, endIdx } = computeWindowRange(times, 10_000, 10_001, 0);
    expect(startIdx).toBe(endIdx);
    expect(startIdx).toBeGreaterThanOrEqual(0);
    expect(startIdx).toBeLessThan(100);
  });

  describe('budget-aware clipping (numRowsEstimate + maxCells)', () => {
    it('is a no-op when omitted (backward compatible with the margin/bounds-only signature)', () => {
      const withBudget = computeWindowRange(times, 50, 60, 0.4);
      expect(withBudget).toEqual({ startIdx: 10, endIdx: 12 });
    });

    it('is a no-op when the margin-expanded window already fits the budget', () => {
      // window is idx 10..12 (3 cols); budget allows up to 100 cols at numRows=100.
      const { startIdx, endIdx } = computeWindowRange(times, 50, 60, 0.4, 100, 10_000);
      expect(startIdx).toBe(10);
      expect(endIdx).toBe(12);
    });

    it('trims the OLDEST (left) margin first when over budget, preserving the live-edge (right) margin', () => {
      // visible [249s,260s] span=11s, margin 40% -> [244.6s,264.4s] -> idx
      // 49..52 (4 cols): left margin is idx49 (one column before the core's
      // own start at idx50); there is no right margin (core end == window
      // end already, both idx52).
      const before = computeWindowRange(times, 249, 260, 0.4);
      expect(before).toEqual({ startIdx: 49, endIdx: 52 });

      // Budget allows exactly 3 cols (numRowsEstimate=1000, maxCells=3000) —
      // exactly the core's size (idx50..52) — so only the 1-column left
      // margin needs trimming; the core itself is untouched.
      const { startIdx, endIdx } = computeWindowRange(times, 249, 260, 0.4, 1000, 3000);
      expect(startIdx).toBe(50);
      expect(endIdx).toBe(52);
    });

    it('trims the core itself (from its oldest/left side) only when the core alone still exceeds budget', () => {
      // Same setup as above; core (idx50..52, 3 cols) exceeds a 2-col budget,
      // so after the margin is exhausted the core itself must shrink.
      const { startIdx, endIdx } = computeWindowRange(times, 249, 260, 0.4, 1000, 2000);
      expect(endIdx - startIdx + 1).toBe(2);
      // Live edge (right/newest) side of the core is preserved -> endIdx stays 52.
      expect(endIdx).toBe(52);
      expect(startIdx).toBe(51);
    });

    it('never returns fewer than 1 column even under an extreme budget', () => {
      const { startIdx, endIdx } = computeWindowRange(times, 50, 60, 0.4, 1000, 1);
      expect(endIdx - startIdx + 1).toBe(1);
    });

    it('applies the same budget clip on the degenerate-visible-range whole-array fallback', () => {
      const { startIdx, endIdx } = computeWindowRange(times, NaN, NaN, 0.4, 10, 500); // maxCols = 50
      expect(endIdx - startIdx + 1).toBe(50);
      expect(endIdx).toBe(99); // live edge (newest/right) preserved
    });
  });
});

describe('alphaSkipCutoffUsd', () => {
  const KNEE = 100_000;
  const HIDE_FLOOR = KNEE * HIDE_BELOW_KNEE_FRACTION; // 2,000

  it('never returns less than the hide floor for a valid knee — the component default (threshold 0.06 > minAlpha 0.05) inverts the ramp above it', () => {
    const cutoff = alphaSkipCutoffUsd(KNEE);
    expect(cutoff).toBeGreaterThanOrEqual(HIDE_FLOOR);
    expect(cutoff).toBeGreaterThan(0);
    expect(cutoff).toBeLessThan(KNEE);
  });

  it('returns exactly the hide floor when threshold <= minAlpha', () => {
    expect(alphaSkipCutoffUsd(KNEE, 0.05, 0.05)).toBeCloseTo(HIDE_FLOOR, 6); // equal case
    expect(alphaSkipCutoffUsd(KNEE, 0.02, 0.05)).toBeCloseTo(HIDE_FLOOR, 6); // threshold < minAlpha
  });

  it('returns 0 for a non-finite or non-positive knee', () => {
    expect(alphaSkipCutoffUsd(0)).toBe(0);
    expect(alphaSkipCutoffUsd(-5)).toBe(0);
    expect(alphaSkipCutoffUsd(NaN)).toBe(0);
  });

  it('inverts softKneeAlpha correctly when threshold > minAlpha (cutoff sits well above the hide floor, so max() with it is a no-op)', () => {
    const knee = KNEE;
    const minAlpha = 0.02;
    const threshold = 0.4; // far above both minAlpha and the 2%-of-knee hide floor
    const cutoff = alphaSkipCutoffUsd(knee, threshold, minAlpha);
    expect(cutoff).toBeGreaterThan(knee * HIDE_BELOW_KNEE_FRACTION); // not clamped by the hide floor
    expect(cutoff).toBeGreaterThan(0);
    expect(cutoff).toBeLessThan(knee);
    // Just below the cutoff -> alpha < threshold; just above -> alpha >= threshold.
    expect(softKneeAlpha(cutoff * 0.99, knee, minAlpha)).toBeLessThan(threshold);
    expect(softKneeAlpha(cutoff * 1.01, knee, minAlpha)).toBeGreaterThanOrEqual(threshold - 1e-6);
  });

  it('the hide-floor-only case: just below a hide-floor-clamped cutoff, alpha is 0 — trivially < threshold', () => {
    // threshold (0.03) <= minAlpha (0.05) -> cutoff clamps to the hide floor.
    const cutoff = alphaSkipCutoffUsd(KNEE, 0.03, 0.05);
    expect(cutoff).toBeCloseTo(HIDE_FLOOR, 6);
    expect(softKneeAlpha(cutoff * 0.99, KNEE, 0.05)).toBe(0);
  });

  it('returns the knee itself when threshold >= 1', () => {
    expect(alphaSkipCutoffUsd(100_000, 1, 0.02)).toBe(100_000);
  });
});

describe('classifyColumnsUpdate', () => {
  const IV = 5000;

  /** Builds a synthetic column array of `{ t }` objects on the IV grid starting at `firstT`. */
  function makeCols(firstT: number, len: number): { t: number }[] {
    return Array.from({ length: len }, (_, i) => ({ t: firstT + i * IV }));
  }

  it('detects unchanged (same length + same first timestamp + same object references)', () => {
    const cols = makeCols(1000, 50);
    expect(classifyColumnsUpdate(cols, cols, IV)).toEqual({ kind: 'unchanged' });
  });

  it('detects a pure append (genuine splice: prev is a prefix of next, same object references)', () => {
    const prev = makeCols(1000, 50);
    const appended = makeCols(1000 + 50 * IV, 3);
    const next = [...prev, ...appended]; // prev's objects are REUSED (same references)
    expect(classifyColumnsUpdate(prev, next, IV)).toEqual({ kind: 'append', appendedCount: 3 });
  });

  it('detects a ring rotation at the history cap (shift by exactly 1 column, length unchanged)', () => {
    // Steady state at cap: oldest column evicted, one new column appended, length stays 2880.
    const prev = makeCols(1_000_000, 2880);
    const newCol = { t: prev[2880 - 1].t + IV };
    const next = [...prev.slice(1), newCol]; // genuine splice — same object refs for survivors
    const result = classifyColumnsUpdate(prev, next, IV);
    expect(result).toEqual({ kind: 'rotate', shiftColumns: 1, appendedCount: 1 });
  });

  it('detects a ring rotation with multiple evicted + multiple appended columns', () => {
    const prev = makeCols(1_000_000, 2880);
    // shift=3 -> survivors = prev[3..2879] (2877 cols); appendedCount=5 -> nextLen=2882
    const appended = makeCols(prev[2880 - 1].t + IV, 5);
    const next = [...prev.slice(3), ...appended];
    const result = classifyColumnsUpdate(prev, next, IV);
    expect(result).toEqual({ kind: 'rotate', shiftColumns: 3, appendedCount: 5 });
  });

  it('falls back to reset when the array shrinks', () => {
    const prev = makeCols(1000, 50);
    const next = prev.slice(0, 40);
    expect(classifyColumnsUpdate(prev, next, IV)).toEqual({ kind: 'reset' });
  });

  it('falls back to reset when either snapshot is empty', () => {
    expect(classifyColumnsUpdate([], makeCols(1000, 10), IV)).toEqual({ kind: 'reset' });
    expect(classifyColumnsUpdate(makeCols(1000, 10), [], IV)).toEqual({ kind: 'reset' });
  });

  it('falls back to reset when the shift does not line up with the column interval', () => {
    const prev = makeCols(1_000_000, 100);
    // Same objects, but shifted by a non-grid-aligned amount.
    const next = prev.map((c) => ({ t: c.t + 1234 }));
    expect(classifyColumnsUpdate(prev, next, IV).kind).toBe('reset');
  });

  it('falls back to reset when time moved backward', () => {
    const prev = makeCols(1_000_000, 100);
    const next = prev.map((c) => ({ t: c.t - IV }));
    expect(classifyColumnsUpdate(prev, next, IV)).toEqual({ kind: 'reset' });
  });

  it('falls back to reset when colIntervalMs is not positive', () => {
    const prev = makeCols(1000, 100);
    const next = prev.map((c) => ({ t: c.t + 1000 }));
    expect(classifyColumnsUpdate(prev, next, 0)).toEqual({ kind: 'reset' });
  });

  // ── CRITICAL 2 (review fix) — object-identity spot checks ────────────────
  it('falls back to reset for a disjoint dataset replacement that only LOOKS like a pure append (same grid, same first timestamp, but brand-new objects)', () => {
    const prev = makeCols(1000, 50);
    // Same firstT + same length pattern, but a COMPLETE resync produced
    // entirely new column objects (e.g. reconnect resync / store clear-and-refill).
    const next = makeCols(1000, 53);
    expect(classifyColumnsUpdate(prev, next, IV)).toEqual({ kind: 'reset' });
  });

  it('falls back to reset for a disjoint dataset replacement that only LOOKS like a ring rotation (grid-aligned shift, but brand-new objects)', () => {
    const prev = makeCols(1_000_000, 2880);
    // nextFirstT lines up exactly with a 1-column shift, and length is
    // unchanged — timestamp-only classification would call this 'rotate',
    // but every object is a fresh reference (a full resync), not a genuine splice.
    const next = makeCols(1_000_000 + IV, 2880);
    expect(classifyColumnsUpdate(prev, next, IV)).toEqual({ kind: 'reset' });
  });

  it('falls back to reset when only the LAST surviving column identity mismatches (partial corruption)', () => {
    const prev = makeCols(1_000_000, 2880);
    const genuineNext = [...prev.slice(1), { t: prev[2880 - 1].t + IV }];
    // Corrupt just the last surviving element's reference (simulate a partial splice bug).
    const corruptLast = genuineNext.length - 2; // last surviving prev column, before the new tail column
    const next = genuineNext.slice();
    next[corruptLast] = { t: next[corruptLast].t }; // same timestamp, different object
    expect(classifyColumnsUpdate(prev, next, IV)).toEqual({ kind: 'reset' });
  });

  it('detects reset when the shift would evict the entire prev array (shiftColumns >= prevLen)', () => {
    const prev = makeCols(1_000_000, 10);
    const next = makeCols(1_000_000 + 10 * IV, 10); // shift == prevLen, nothing survives
    expect(classifyColumnsUpdate(prev, next, IV)).toEqual({ kind: 'reset' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 7 — LOD downsampling helpers (see DepthMatrixLayer.tsx's "LOD design"
// doc comment for the full rationale).
// ─────────────────────────────────────────────────────────────────────────────

describe('computeBucketFactor', () => {
  it('returns 1 (no bucketing) at/above the target column width', () => {
    expect(computeBucketFactor(TARGET_MIN_COL_PX)).toBe(1);
    expect(computeBucketFactor(TARGET_MIN_COL_PX * 2)).toBe(1);
    expect(computeBucketFactor(10)).toBe(1);
  });

  it('returns 1 for non-finite or non-positive input', () => {
    expect(computeBucketFactor(0)).toBe(1);
    expect(computeBucketFactor(-1)).toBe(1);
    expect(computeBucketFactor(NaN)).toBe(1);
  });

  it('merges columns when narrower than the target width', () => {
    // 15m view spanning 4 days: pane 1800px, 2880 raw 5s columns visible ->
    // pxPerRawColumn = 1800 / 2880 = 0.625px.
    const pxPerRawColumn = 1800 / 2880;
    const factor = computeBucketFactor(pxPerRawColumn);
    expect(factor).toBeGreaterThan(1);
    // The resulting painted column width must clear the target.
    expect(pxPerRawColumn * factor).toBeGreaterThanOrEqual(TARGET_MIN_COL_PX);
  });

  it('is monotonically non-increasing as pxPerRawColumn grows (fewer columns need merging when already wider)', () => {
    let prev = Infinity;
    for (const px of [0.1, 0.2, 0.4, 0.8, 1.0, 1.4]) {
      const factor = computeBucketFactor(px);
      expect(factor).toBeLessThanOrEqual(prev);
      prev = factor;
    }
  });

  it('clamps to the provided (or default) max bucket factor for a near-zero column width', () => {
    expect(computeBucketFactor(0.0001)).toBe(LOD_MAX_BUCKET_FACTOR);
    expect(computeBucketFactor(0.0001, 8)).toBe(8);
  });
});

describe('computeRowMergeFactor', () => {
  it('returns 1 (no merging) at/above the target row height', () => {
    expect(computeRowMergeFactor(TARGET_MIN_ROW_PX)).toBe(1);
    expect(computeRowMergeFactor(5)).toBe(1);
  });

  it('returns 1 for non-finite or non-positive input', () => {
    expect(computeRowMergeFactor(0)).toBe(1);
    expect(computeRowMergeFactor(-3)).toBe(1);
    expect(computeRowMergeFactor(NaN)).toBe(1);
  });

  it('merges rows when shorter than the target height', () => {
    // 4000-row grid painted into a 900px pane -> rowPx = 0.225px.
    const rowPx = 900 / 4000;
    const factor = computeRowMergeFactor(rowPx);
    expect(factor).toBeGreaterThan(1);
    expect(rowPx * factor).toBeGreaterThanOrEqual(TARGET_MIN_ROW_PX);
  });

  it('clamps to the provided (or default) max row-merge factor', () => {
    expect(computeRowMergeFactor(0.0001)).toBe(LOD_MAX_ROW_MERGE_FACTOR);
    expect(computeRowMergeFactor(0.0001, 8)).toBe(8);
  });
});

describe('computeLodFactors', () => {
  it('composes computeBucketFactor + computeRowMergeFactor', () => {
    const pxPerRawColumn = 1800 / 2880;
    const rowPx = 900 / 4000;
    const { bucketFactor, rowMergeFactor } = computeLodFactors(pxPerRawColumn, rowPx);
    expect(bucketFactor).toBe(computeBucketFactor(pxPerRawColumn));
    expect(rowMergeFactor).toBe(computeRowMergeFactor(rowPx));
  });

  it('returns {1,1} when both axes are already at/above target (zoomed-in, live-edge case)', () => {
    // 1m view at the live edge: columns ~3px wide, rows comfortably tall.
    const { bucketFactor, rowMergeFactor } = computeLodFactors(3, 10);
    expect(bucketFactor).toBe(1);
    expect(rowMergeFactor).toBe(1);
  });

  it('honors custom caps for both axes', () => {
    const { bucketFactor, rowMergeFactor } = computeLodFactors(0.0001, 0.0001, {
      maxBucketFactor: 4,
      maxRowMergeFactor: 6,
    });
    expect(bucketFactor).toBe(4);
    expect(rowMergeFactor).toBe(6);
  });
});

describe('requiredRowMergeFactorForCap', () => {
  it('returns 1 when rawNumRows is already within maxRows', () => {
    expect(requiredRowMergeFactorForCap(4000, 4000)).toBe(1);
    expect(requiredRowMergeFactorForCap(1, 4000)).toBe(1);
  });

  it('returns the ceiling merge factor when rawNumRows exceeds maxRows', () => {
    expect(requiredRowMergeFactorForCap(4001, 4000)).toBe(2);
    expect(requiredRowMergeFactorForCap(12_000, 4000)).toBe(3);
  });

  it('caps the result at maxFactor for a pathologically large rawNumRows', () => {
    expect(requiredRowMergeFactorForCap(4000 * 64 + 1, 4000)).toBe(64); // would need 65 uncapped
    expect(requiredRowMergeFactorForCap(4000 * 64 + 1, 4000, 64)).toBe(64);
  });

  it('returns 1 for a non-positive rawNumRows or maxRows', () => {
    expect(requiredRowMergeFactorForCap(0, 4000)).toBe(1);
    expect(requiredRowMergeFactorForCap(-100, 4000)).toBe(1);
    expect(requiredRowMergeFactorForCap(100, 0)).toBe(1);
    expect(requiredRowMergeFactorForCap(100, -1)).toBe(1);
  });

  it('honors a custom maxFactor', () => {
    expect(requiredRowMergeFactorForCap(4000 * 10 + 1, 4000, 8)).toBe(8); // would need 11 uncapped
  });
});

describe('bucketStartMs', () => {
  it('aligns to fixed epoch boundaries (not to an arbitrary window start)', () => {
    // interval=5000ms, factor=4 -> bucket span = 20000ms.
    expect(bucketStartMs(0, 5000, 4)).toBe(0);
    expect(bucketStartMs(19999, 5000, 4)).toBe(0);
    expect(bucketStartMs(20000, 5000, 4)).toBe(20000);
    expect(bucketStartMs(35000, 5000, 4)).toBe(20000);
  });

  it('is stable regardless of which raw column is queried within the same bucket', () => {
    const bucketSpan = 5000 * 8;
    const start = bucketStartMs(1_000_000, 5000, 8);
    for (let t = start; t < start + bucketSpan; t += 5000) {
      expect(bucketStartMs(t, 5000, 8)).toBe(start);
    }
  });

  it('returns t unchanged for a non-positive interval or factor', () => {
    expect(bucketStartMs(12345, 0, 4)).toBe(12345);
    expect(bucketStartMs(12345, 5000, 0)).toBe(12345);
  });
});

describe('mergeColumnsMaxQ', () => {
  function col(t: number, bids: Array<[number, number]>, asks: Array<[number, number]>, flags = 0): DecodedColumnLike {
    return {
      t,
      binSize: 1,
      flags,
      bids: bids.map(([price, q]) => ({ price, q })),
      asks: asks.map(([price, q]) => ({ price, q })),
    };
  }

  it('takes the MAX q per price across columns (a wall visible at any point stays visible)', () => {
    const cols = [
      col(0, [[100, 50]], [[110, 20]]),
      col(5000, [[100, 200]], [[110, 5]]),
      col(10000, [[100, 10]], [[110, 300]]),
    ];
    const { bids, asks } = mergeColumnsMaxQ(cols);
    expect(bids).toEqual([{ price: 100, q: 200 }]);
    expect(asks).toEqual([{ price: 110, q: 300 }]);
  });

  it('never sums — merged q equals the single largest raw q, not a total', () => {
    const cols = [col(0, [[100, 50]], []), col(5000, [[100, 50]], [])];
    const { bids } = mergeColumnsMaxQ(cols);
    expect(bids).toEqual([{ price: 100, q: 50 }]); // NOT 100
  });

  it('gap columns (flags bit0) contribute nothing', () => {
    const cols = [col(0, [[100, 999]], [], 1), col(5000, [[100, 40]], [])];
    const { bids } = mergeColumnsMaxQ(cols);
    expect(bids).toEqual([{ price: 100, q: 40 }]);
  });

  it('q<=0 entries contribute nothing', () => {
    const cols = [col(0, [[100, 0]], []), col(5000, [[100, -5]], [])];
    const { bids } = mergeColumnsMaxQ(cols);
    expect(bids).toEqual([]);
  });

  it('returns empty bids/asks for an all-gap or empty input', () => {
    expect(mergeColumnsMaxQ([])).toEqual({ bids: [], asks: [] });
    expect(mergeColumnsMaxQ([col(0, [[100, 50]], [], 1)])).toEqual({ bids: [], asks: [] });
  });
});

describe('bucketColumns', () => {
  const IV = 5000;

  function makeRawCols(n: number, firstT = 0): DecodedColumnLike[] {
    return Array.from({ length: n }, (_, i) => ({
      t: firstT + i * IV,
      binSize: 1,
      flags: 0,
      bids: [{ price: 100, q: i + 1 }], // increasing q so the winner is identifiable
      asks: [],
    }));
  }

  it('is a no-op passthrough for bucketFactor <= 1 (rawCounts all 1, columns unchanged)', () => {
    const raw = makeRawCols(5);
    const { columns, rawCounts } = bucketColumns(raw, IV, 1);
    expect(columns).toEqual(raw);
    expect(rawCounts).toEqual([1, 1, 1, 1, 1]);

    const zeroFactor = bucketColumns(raw, IV, 0);
    expect(zeroFactor.columns).toEqual(raw);
  });

  it('groups raw columns into fixed-size buckets and merges via max-q', () => {
    const raw = makeRawCols(8); // q = 1..8
    const { columns, rawCounts } = bucketColumns(raw, IV, 4);
    expect(columns.length).toBe(2);
    expect(rawCounts).toEqual([4, 4]);
    // bucket 0 = raw[0..3] (q 1..4) -> winner q=4; bucket 1 = raw[4..7] (q 5..8) -> winner q=8.
    expect(columns[0].bids[0].q).toBe(4);
    expect(columns[1].bids[0].q).toBe(8);
  });

  it('handles a partial LAST bucket (window length not a multiple of bucketFactor)', () => {
    const raw = makeRawCols(10); // q = 1..10, bucketFactor=4 -> buckets of 4,4,2
    const { columns, rawCounts } = bucketColumns(raw, IV, 4);
    expect(rawCounts).toEqual([4, 4, 2]);
    expect(columns[2].bids[0].q).toBe(10); // last (partial) bucket's winner
  });

  it('produces epoch-aligned bucket start times stable across different window starts', () => {
    // Window A starts exactly at t=0; window B starts one raw column later.
    const rawA = makeRawCols(8, 0);
    const rawB = makeRawCols(7, IV); // same underlying timeline, shifted start
    const bucketedA = bucketColumns(rawA, IV, 4);
    const bucketedB = bucketColumns(rawB, IV, 4);
    // The SECOND bucket of A (raw[4..7], t=20000..35000) should align with
    // window B's buckets at the same epoch boundary (20000).
    expect(bucketedA.columns[1].t).toBe(20000);
    expect(bucketedB.columns.some((c) => c.t === 20000)).toBe(true);
  });

  it('flags a bucket as a gap ONLY when every raw column in it is a gap', () => {
    const raw = makeRawCols(4).map((c, i) => ({ ...c, flags: i < 3 ? 1 : 0 })); // 3 gaps + 1 real
    const allGapRaw = makeRawCols(4).map((c) => ({ ...c, flags: 1 })); // all gaps

    const mixed = bucketColumns(raw, IV, 4);
    expect(mixed.columns[0].flags & 1).toBe(0); // not all-gap -> not flagged

    const allGap = bucketColumns(allGapRaw, IV, 4);
    expect(allGap.columns[0].flags & 1).toBe(1);
  });

  it('returns an empty result for an empty input', () => {
    expect(bucketColumns([], IV, 4)).toEqual({ columns: [], rawCounts: [] });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 8 — LOD review-fix hardening (CRITICAL 1/2 + SHOULD-FIX 1/3 fixes).
// ─────────────────────────────────────────────────────────────────────────────

describe('computeBucketFactorWithHysteresis (SHOULD-FIX — dead-zone anti-thrash)', () => {
  it('matches the plain computeBucketFactor when clearly BELOW the low bound (dead zone not engaged)', () => {
    const px = TARGET_MIN_COL_PX * LOD_HYSTERESIS_LOW_RATIO - 0.05;
    expect(computeBucketFactorWithHysteresis(px, 1)).toBe(computeBucketFactor(px));
  });

  it('matches the plain computeBucketFactor when clearly ABOVE the high bound', () => {
    const px = TARGET_MIN_COL_PX * LOD_HYSTERESIS_HIGH_RATIO + 0.5;
    expect(computeBucketFactorWithHysteresis(px, 3)).toBe(computeBucketFactor(px));
  });

  it('holds the CURRENTLY APPLIED factor steady inside the dead zone regardless of tiny px jitter', () => {
    // Dead zone is [1.4, 1.65] around TARGET_MIN_COL_PX=1.5. Simulate
    // sub-pixel jitter hovering around 1.5 that would otherwise flip
    // ceil(1.5/px) between 1 and 2 every frame.
    const jitterValues = [1.499999, 1.500001, 1.5, 1.45, 1.6];
    for (const px of jitterValues) {
      expect(computeBucketFactorWithHysteresis(px, 1)).toBe(1); // stayed un-bucketed
      expect(computeBucketFactorWithHysteresis(px, 2)).toBe(2); // stayed at factor 2
    }
  });

  it('does not thrash across a simulated frame sequence hovering at the threshold', () => {
    // Simulates drawFrame's per-frame usage: appliedFactor starts at 1 and
    // is fed back in as the tier check re-runs each "frame".
    const pxSequence = [1.51, 1.49, 1.5, 1.52, 1.48, 1.5, 1.51];
    let applied = 1;
    let changeCount = 0;
    for (const px of pxSequence) {
      const next = computeBucketFactorWithHysteresis(px, applied);
      if (next !== applied) changeCount++;
      applied = next;
    }
    expect(changeCount).toBe(0); // all these values sit inside the dead zone -> zero tier changes
  });

  it('genuinely switches tiers once px moves clearly past the threshold in either direction', () => {
    let applied = 1;
    applied = computeBucketFactorWithHysteresis(0.5, applied); // clearly below low bound -> bucket
    expect(applied).toBeGreaterThan(1);
    applied = computeBucketFactorWithHysteresis(3, applied); // clearly above high bound -> un-bucket
    expect(applied).toBe(1);
  });

  it('falls back to the applied factor (or 1) for non-finite/non-positive px', () => {
    expect(computeBucketFactorWithHysteresis(NaN, 4)).toBe(4);
    expect(computeBucketFactorWithHysteresis(-1, 0)).toBe(1);
  });
});

describe('computeRowMergeFactorWithHysteresis (SHOULD-FIX 1 — pane-resize anti-thrash)', () => {
  it('matches the plain computeRowMergeFactor when clearly outside the dead zone', () => {
    const belowPx = TARGET_MIN_ROW_PX * LOD_HYSTERESIS_LOW_RATIO - 0.05;
    expect(computeRowMergeFactorWithHysteresis(belowPx, 1)).toBe(computeRowMergeFactor(belowPx));
    const abovePx = TARGET_MIN_ROW_PX * LOD_HYSTERESIS_HIGH_RATIO + 0.3;
    expect(computeRowMergeFactorWithHysteresis(abovePx, 5)).toBe(computeRowMergeFactor(abovePx));
  });

  it('holds steady inside the dead zone around TARGET_MIN_ROW_PX', () => {
    const jitterValues = [TARGET_MIN_ROW_PX - 0.001, TARGET_MIN_ROW_PX, TARGET_MIN_ROW_PX + 0.001];
    for (const px of jitterValues) {
      expect(computeRowMergeFactorWithHysteresis(px, 1)).toBe(1);
    }
  });

  it('a pane resize that clearly changes row px does trigger a factor change', () => {
    const shrunk = computeRowMergeFactorWithHysteresis(0.3, 1); // pane got much shorter -> more merging
    expect(shrunk).toBeGreaterThan(1);
    const grown = computeRowMergeFactorWithHysteresis(5, shrunk); // pane grew back tall -> back to 1
    expect(grown).toBe(1);
  });
});

describe('paintedWindowEndMs (CRITICAL 1 fix)', () => {
  it('adds the full bucket span (bucketFactor × rawIntervalMs) to the last column\'s bucket-start time', () => {
    // bucketFactor=4, rawIntervalMs=5000 -> bucket span = 20000ms.
    expect(paintedWindowEndMs(100_000, 4, 5000)).toBe(120_000);
  });

  it('degenerates to +rawIntervalMs when bucketFactor <= 1 (pre-LOD behavior)', () => {
    expect(paintedWindowEndMs(100_000, 1, 5000)).toBe(105_000);
    expect(paintedWindowEndMs(100_000, 0, 5000)).toBe(105_000); // treated as factor=1
  });

  it('never returns something before the input start time for a positive interval', () => {
    expect(paintedWindowEndMs(0, 8, 5000)).toBeGreaterThan(0);
  });

  it('is a no-op addition (0) for a non-positive rawIntervalMs', () => {
    expect(paintedWindowEndMs(100_000, 4, 0)).toBe(100_000);
    expect(paintedWindowEndMs(100_000, 4, -5000)).toBe(100_000);
  });
});

/** Shared test helper for bumpPersistMapForColumn / CRITICAL 2 fix tests below. */
function col(bids: Array<[number, number]>, flags = 0, binSize = 1): DecodedColumnLike {
  return { t: 0, binSize, flags, bids: bids.map(([price, q]) => ({ price, q })), asks: [] };
}

describe('bumpPersistMapForColumn', () => {
  it('bumps a fresh price to count 1 against an empty map', () => {
    const persistMap = new Map<number, number>();
    bumpPersistMapForColumn(persistMap, col([[100, 50]]), 0, 1000, 0.001, 1);
    expect(persistMap.get(100)).toBe(1);
  });

  it('increments an existing count by exactly 1', () => {
    const persistMap = new Map<number, number>([[100, 5]]);
    bumpPersistMapForColumn(persistMap, col([[100, 50]]), 0, 1000, 0.001, 1);
    expect(persistMap.get(100)).toBe(6);
  });

  it('prunes a price absent from this column', () => {
    const persistMap = new Map<number, number>([[100, 5], [200, 2]]);
    bumpPersistMapForColumn(persistMap, col([[100, 50]]), 0, 1000, 0.001, 1);
    expect(persistMap.has(200)).toBe(false);
    expect(persistMap.get(100)).toBe(6);
  });

  it('never mutates persistMap for a gap column (flags bit0)', () => {
    const persistMap = new Map<number, number>([[100, 5]]);
    bumpPersistMapForColumn(persistMap, col([[100, 999]], 1), 0, 1000, 0.001, 1);
    expect(persistMap.get(100)).toBe(5); // unchanged — gap columns never touch persistence
  });

  it('never mutates persistMap when the column\'s binSize mismatches curBinSize', () => {
    const persistMap = new Map<number, number>([[100, 5]]);
    bumpPersistMapForColumn(persistMap, col([[100, 999]], 0, 2), 0, 1000, 0.001, 1); // binSize=2 vs curBinSize=1
    expect(persistMap.get(100)).toBe(5); // unchanged
  });

  it('ignores prices outside [priceMin, rowMaxPrice] (plus epsilon)', () => {
    const persistMap = new Map<number, number>();
    bumpPersistMapForColumn(persistMap, col([[5000, 50]]), 0, 1000, 0.001, 1);
    expect(persistMap.size).toBe(0);
  });
});

describe('CRITICAL 2 fix — persistence advances once per CLOSED bucket, not once per repaint', () => {
  const P = 0.001;

  it('documents the BUG this fix replaces: naively re-bumping the SAME live map on every extension repaint inflates the count once per repaint', () => {
    // This is the pattern the review flagged: calling the bump primitive
    // directly against a persistent, never-reset map every time an OPEN
    // bucket is re-derived (once per raw tick that extends it).
    const buggyLiveMap = new Map<number, number>([[100, 3]]); // baseline before this bucket
    const reMergedBucket = () => col([[100, 50]]);
    bumpPersistMapForColumn(buggyLiveMap, reMergedBucket(), 0, 1000, P, 1); // tick 1 (bucket has 1 raw col)
    bumpPersistMapForColumn(buggyLiveMap, reMergedBucket(), 0, 1000, P, 1); // tick 2 (bucket re-merged, STILL open)
    bumpPersistMapForColumn(buggyLiveMap, reMergedBucket(), 0, 1000, P, 1); // tick 3 (still open)
    // After 3 extension repaints of the SAME still-open bucket, the naive
    // approach has advanced the count by 3 — at bucketFactor>=6 this alone
    // can saturate persistenceFactor's ramp (default 6) almost immediately.
    expect(buggyLiveMap.get(100)).toBe(6); // 3 (baseline) + 3 (one per repaint) -- THE BUG
  });

  it('the FIX: cloning the stable base + bumping ONCE per repaint gives an IDENTICAL, stable result no matter how many times the open bucket is re-derived', () => {
    const persistBaseMap = new Map<number, number>([[100, 3]]); // state right before the open bucket
    function repaintOpenBucketOnce(mergedQ: number): Map<number, number> {
      const working = new Map(persistBaseMap); // FRESH clone every tick — never the previous tick's result
      bumpPersistMapForColumn(working, col([[100, mergedQ]]), 0, 1000, P, 1);
      return working;
    }

    const tick1 = repaintOpenBucketOnce(10); // bucket has 1 raw column so far
    const tick2 = repaintOpenBucketOnce(80); // re-merged with a 2nd raw column (q grew)
    const tick3 = repaintOpenBucketOnce(120); // re-merged with a 3rd

    // All three ticks — regardless of how many raw columns have accumulated
    // into the still-open bucket — report the SAME count: base + 1.
    expect(tick1.get(100)).toBe(4);
    expect(tick2.get(100)).toBe(4);
    expect(tick3.get(100)).toBe(4);
  });

  it('the FIX: closing a bucket commits its FINAL content into the base exactly once, and the NEXT bucket advances by exactly 1 from there', () => {
    let persistBaseMap = new Map<number, number>([[100, 3]]);

    // Bucket B is open for 3 extension ticks (all derived from the SAME base).
    let working = new Map(persistBaseMap);
    bumpPersistMapForColumn(working, col([[100, 50]]), 0, 1000, P, 1);
    expect(working.get(100)).toBe(4);

    // Bucket B closes (a new bucket starts) — commit B's FINAL merged
    // content into the base EXACTLY ONCE.
    const committed = new Map(persistBaseMap);
    bumpPersistMapForColumn(committed, col([[100, 50]]), 0, 1000, P, 1);
    persistBaseMap = committed;
    expect(persistBaseMap.get(100)).toBe(4); // advanced by exactly 1 for the whole of bucket B

    // Bucket B+1 opens — its first extension tick clones the NEW base.
    working = new Map(persistBaseMap);
    bumpPersistMapForColumn(working, col([[100, 5]]), 0, 1000, P, 1);
    expect(working.get(100)).toBe(5); // base(4) + 1 -- exactly one advance per closed bucket

    // A THIRD bucket, still present, advances by exactly 1 again.
    persistBaseMap = new Map(working);
    let working2 = new Map(persistBaseMap);
    bumpPersistMapForColumn(working2, col([[100, 5]]), 0, 1000, P, 1);
    expect(working2.get(100)).toBe(6);
  });

  it('the FIX: a price that disappears from a closed bucket is pruned from the base on commit (not carried forward)', () => {
    let persistBaseMap = new Map<number, number>([[100, 3], [200, 5]]);
    // Bucket B closes without price 200 present anymore.
    const committed = new Map(persistBaseMap);
    bumpPersistMapForColumn(committed, col([[100, 40]]), 0, 1000, P, 1);
    persistBaseMap = committed;
    expect(persistBaseMap.has(200)).toBe(false);
    expect(persistBaseMap.get(100)).toBe(4);
  });
});
