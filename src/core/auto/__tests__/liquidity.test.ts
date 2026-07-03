// ============================================================================
// LIQUIDITY (equal-levels) — GOLDEN TESTS + LOOK-AHEAD INVARIANT
// ============================================================================
//
// Companion to detectors.test.ts, scoped to the 'equal-levels' mode of the
// LIQUIDITY detector (detectEqualLevels in detectors/liquidity.ts). This mode
// became the shipped default (see DEFAULT_PATTERN_PARAMS.LIQUIDITY) because it
// is the only mode that reads minTouches / equalTolerancePct — the two knobs
// SetupBuilderForm exposes for LIQUIDITY.
//
// FRACTAL NOTE: a swing pivot at index p needs k bars on EACH side (k=2 here),
// so it only CONFIRMS at bar p + k. Pivot blocks below are spaced >= 5 bars
// apart so their k=2 windows never overlap.
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { Candle } from '../../../components/ReplayChart/types';
import type { LiquidityParams, PatternParams } from '../types';
import { MarketContext } from '../MarketContext';
import { runDetectors } from '../detectors/registry';
import { detect as detectLiquidity } from '../detectors/liquidity';

// ----------------------------------------------------------------------------
// Test helpers
// ----------------------------------------------------------------------------

/** Candle factory. `time` is in SECONDS (the journal/UTCTimestamp convention). */
function c(
  i: number,
  open: number,
  high: number,
  low: number,
  close: number,
): Candle {
  return { time: 1_700_000_000 + i * 900, open, high, low, close, volume: 1 };
}

function ctxFor(candles: Candle[], swingLookback = 2, atrPeriod = 14): MarketContext {
  return MarketContext.build(candles, { swingLookback, atrPeriod });
}

function baseParams(overrides: Partial<LiquidityParams> = {}): LiquidityParams {
  return {
    type: 'LIQUIDITY',
    mode: 'equal-levels',
    swing: { lookback: 2 },
    equalTolerancePct: 0.03,
    minTouches: 4,
    requireReclaim: true,
    requireMSS: true,
    ...overrides,
  };
}

/**
 * Build a series with `count` equal swing-high pivots (all at `pivotHigh`,
 * within a tight tolerance band), each block spaced 5 bars apart so k=2
 * fractal windows never overlap. Filler bars stay well below the pivot.
 */
function equalHighsSeries(count: number, pivotHigh = 110): Candle[] {
  const out: Candle[] = [];
  let i = 0;
  for (let p = 0; p < count; p++) {
    // Two low filler bars before the pivot.
    out.push(c(i++, 100, 101, 99, 100));
    out.push(c(i++, 100, 102, 99, 101));
    // Pivot bar: strict local max over [i-2, i+2]. Nudge price by a few
    // hundredths of a point per pivot -- still inside 0.03% tolerance of 110
    // (0.03% of 110 = 0.033), but proves clustering isn't just an exact match.
    const nudge = p % 2 === 0 ? 0 : 0.02;
    out.push(c(i++, 103, pivotHigh + nudge, 102, 104));
    // Two low filler bars after the pivot.
    out.push(c(i++, 100, 102, 99, 101));
    out.push(c(i++, 100, 101, 99, 100));
  }
  return out;
}

// ============================================================================
// Equal-levels: touch-count threshold
// ============================================================================

describe('Liquidity equal-levels detector', () => {
  it('detects a sell-side pool from a cluster of >= 4 equal-high touches', () => {
    const candles = equalHighsSeries(4);
    const ctx = ctxFor(candles, 2, 3);
    const params = baseParams();

    const dets = detectLiquidity(candles, ctx, params);
    const pools = dets.filter(
      (d) => d.direction === 'short' && d.meta.poolSide === 'equal-highs',
    );
    expect(pools).toHaveLength(1);
    const d = pools[0];
    expect(d.patternType).toBe('LIQUIDITY');
    expect(d.meta.mode).toBe('equal-levels');
    expect(Number(d.meta.touches)).toBe(4);
    // Zone spans the small nudge band around 110.
    expect(d.zone.top).toBeCloseTo(110.02, 6);
    expect(d.zone.bottom).toBeCloseTo(110, 6);
  });

  it('does NOT detect a pool from only 3 equal-high touches (minTouches=4)', () => {
    const candles = equalHighsSeries(3);
    const ctx = ctxFor(candles, 2, 3);
    const params = baseParams();

    const dets = detectLiquidity(candles, ctx, params);
    const pools = dets.filter(
      (d) => d.direction === 'short' && d.meta.poolSide === 'equal-highs',
    );
    expect(pools).toHaveLength(0);
  });

  it('the same 3-touch series DOES qualify once minTouches is lowered to 3', () => {
    // Proves the emptiness above is genuinely gated by minTouches, not a
    // fixture mistake.
    const candles = equalHighsSeries(3);
    const ctx = ctxFor(candles, 2, 3);
    const params = baseParams({ minTouches: 3 });

    const dets = detectLiquidity(candles, ctx, params);
    const pools = dets.filter(
      (d) => d.direction === 'short' && d.meta.poolSide === 'equal-highs',
    );
    expect(pools).toHaveLength(1);
    expect(Number(pools[0].meta.touches)).toBe(3);
  });

  it('respects equalTolerancePct: a level outside the band does not join the cluster', () => {
    // 4 touches at 110, but shift the 3rd one 1% away (well outside 0.03%
    // tolerance) -> only 3 remain clustered -> below minTouches=4.
    const candles = equalHighsSeries(4);
    // 3rd pivot bar is at index 2 (first block) + 5*2 = index 12.
    candles[12] = c(12, 103, 111.5, 102, 104); // ~1.36% away from 110
    const ctx = ctxFor(candles, 2, 3);
    const params = baseParams();

    const dets = detectLiquidity(candles, ctx, params);
    const pools = dets.filter(
      (d) => d.direction === 'short' && d.meta.poolSide === 'equal-highs',
    );
    expect(pools).toHaveLength(0);
  });
});

// ============================================================================
// LOOK-AHEAD INVARIANT for equal-levels
// ============================================================================

describe('Liquidity equal-levels look-ahead invariant', () => {
  it('a pool detection never references a candle index beyond its formedAtIndex', () => {
    const candles = equalHighsSeries(4);
    const ctx = ctxFor(candles, 2, 3);
    const params = baseParams();

    const dets = detectLiquidity(candles, ctx, params);
    expect(dets.length).toBeGreaterThanOrEqual(1);

    for (const d of dets) {
      expect(d.formedAtIndex).toBeGreaterThanOrEqual(0);
      expect(d.formedAtIndex).toBeLessThan(candles.length);
      if (d.refSwing) {
        expect(d.refSwing.index).toBeLessThanOrEqual(d.formedAtIndex);
      }
    }
  });

  it('a pool detection is reproducible from candles[0..formedAtIndex] alone', () => {
    const candles = equalHighsSeries(4);
    const patterns: PatternParams[] = [baseParams()];
    const fullCtx = ctxFor(candles, 2, 3);
    const full = runDetectors(patterns, candles, fullCtx);
    const pools = full.filter(
      (d) => d.patternType === 'LIQUIDITY' && d.meta.mode === 'equal-levels',
    );
    expect(pools.length).toBeGreaterThanOrEqual(1);

    for (const d of pools) {
      const prefix = candles.slice(0, d.formedAtIndex + 1);
      const prefixCtx = ctxFor(prefix, 2, 3);
      const prefixDets = runDetectors(patterns, prefix, prefixCtx);
      const found = prefixDets.some(
        (p) =>
          p.patternType === d.patternType &&
          p.direction === d.direction &&
          p.formedAtIndex === d.formedAtIndex &&
          Math.abs(p.zone.top - d.zone.top) < 1e-6 &&
          Math.abs(p.zone.bottom - d.zone.bottom) < 1e-6,
      );
      expect(
        found,
        `Equal-levels pool @${d.formedAtIndex} not reproducible from ` +
          `candles[0..${d.formedAtIndex}] -> LOOK-AHEAD BIAS`,
      ).toBe(true);
    }
  });
});
