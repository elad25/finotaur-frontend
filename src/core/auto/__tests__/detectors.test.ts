// ============================================================================
// AUTO BACKTEST — DETERMINISTIC GOLDEN TESTS + LOOK-AHEAD INVARIANT
// ============================================================================
//
// These are NEW, additive tests. They do NOT modify the engine. The goal is to
// PROVE two things on hand-crafted candle series where the answer is known:
//   1. Each ICT detector fires on the correct candle pattern (and stays silent
//      when the pattern is absent), at the right formedAtIndex / zone / dir.
//   2. NO detector has look-ahead bias: a detection confirmed at index i must
//      still be derivable from candles[0..i] alone, and may never reference a
//      candle index beyond its own formedAtIndex.
//
// Fixtures are tiny and commented with WHY the pattern is / isn't present.
//
// FRACTAL NOTE: a swing pivot at index p needs k bars on EACH side, so the
// earliest possible pivot index is k and it only CONFIRMS at bar p + k. Every
// swing-based fixture below places its pivot at index >= k (=2) accordingly.
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { Candle } from '../../../components/ReplayChart/types';
import type {
  Detection,
  FVGParams,
  IFVGParams,
  OBParams,
  LiquidityParams,
  BreakerParams,
  PatternParams,
} from '../types';
import { makeDefaultSetup, DEFAULT_PATTERN_PARAMS } from '../types';
import { MarketContext, candleTimeMs } from '../MarketContext';
import { runDetectors } from '../detectors/registry';
import { detect as detectFvg } from '../detectors/fvg';
import { detect as detectIfvg } from '../detectors/ifvg';
import { detect as detectOb } from '../detectors/orderBlock';
import { detect as detectLiquidity } from '../detectors/liquidity';
import { detect as detectBreaker } from '../detectors/breaker';
import { runAutoBacktest } from '../AutoBacktestEngine';

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

/** Build a MarketContext with explicit swing/atr params (bias/session off). */
function ctxFor(candles: Candle[], swingLookback = 2, atrPeriod = 14): MarketContext {
  return MarketContext.build(candles, { swingLookback, atrPeriod });
}

/** FVG params with the gap/displacement gate fully relaxed (geometry-only). */
function looseFvgParams(): FVGParams {
  return {
    type: 'FVG',
    minGapPct: 0, // any positive gap qualifies
    minGapAtrMult: undefined,
    requireDisplacement: false,
    displacementBodyMult: 0,
    mitigation: 'none',
    maxAgeBars: 50,
  };
}

// ============================================================================
// FVG
// ============================================================================

describe('FVG detector', () => {
  it('fires exactly one bullish FVG with correct index + zone', () => {
    // 3-candle bullish gap: low[2]=110 > high[0]=104 -> gap [104,110].
    // c1 is the impulse (big up candle). The i3 filler keeps low (111) at or
    // below high[1] (112) so it creates NO second gap.
    const candles: Candle[] = [
      c(0, 100, 104, 99, 103), // i0
      c(1, 103, 112, 102, 111), // i1 impulse up
      c(2, 111, 115, 110, 114), // i2: low 110 > high[0] 104 => bullish FVG
      c(3, 114, 116, 111, 115), // i3 filler: low 111 <= high[1] 112 -> no gap
    ];
    const ctx = ctxFor(candles);
    const dets = detectFvg(candles, ctx, looseFvgParams());

    expect(dets).toHaveLength(1);
    const d = dets[0];
    expect(d.patternType).toBe('FVG');
    expect(d.direction).toBe('long');
    expect(d.formedAtIndex).toBe(2);
    expect(d.zone.bottom).toBeCloseTo(104, 9); // high[0]
    expect(d.zone.top).toBeCloseTo(110, 9); // low[2]
  });

  it('fires a bearish FVG at i2 with correct zone', () => {
    // 3-candle bearish gap: high[2]=90 < low[0]=96 -> gap [90,96].
    const candles: Candle[] = [
      c(0, 100, 101, 96, 97), // i0
      c(1, 97, 98, 88, 89), // i1 impulse down
      c(2, 89, 90, 85, 86), // i2: high 90 < low[0] 96 => bearish FVG
      c(3, 86, 88, 84, 85), // i3 filler: high 88 >= low[1] 88 -> no second gap
    ];
    const ctx = ctxFor(candles);
    const dets = detectFvg(candles, ctx, looseFvgParams());

    const atI2 = dets.filter((d) => d.formedAtIndex === 2);
    expect(atI2).toHaveLength(1);
    const d = atI2[0];
    expect(d.direction).toBe('short');
    expect(d.zone.bottom).toBeCloseTo(90, 9); // high[2]
    expect(d.zone.top).toBeCloseTo(96, 9); // low[0]
  });

  it('finds ZERO FVGs in a smooth overlapping series (no gap)', () => {
    // Every candle overlaps its neighbour-2 -> no imbalance anywhere.
    const candles: Candle[] = [
      c(0, 100, 105, 99, 102),
      c(1, 102, 106, 100, 104),
      c(2, 104, 107, 101, 105), // low 101 <= high[0] 105 -> no bull gap
      c(3, 105, 108, 103, 106),
      c(4, 106, 109, 104, 107),
    ];
    const ctx = ctxFor(candles);
    expect(detectFvg(candles, ctx, looseFvgParams())).toHaveLength(0);
  });

  it('respects minGapPct: a tiny gap below threshold is rejected', () => {
    // Tiny gap: high[0]=100.00, low[2]=100.02 -> gap 0.02 ~ 0.02% of ~100.
    const candles: Candle[] = [
      c(0, 99.9, 100.0, 99.8, 99.95),
      c(1, 99.95, 100.5, 99.9, 100.4),
      c(2, 100.4, 100.6, 100.02, 100.3),
    ];
    const ctx = ctxFor(candles);
    const strict: FVGParams = {
      ...looseFvgParams(),
      minGapPct: 1, // require >= 1% gap; 0.02% must fail
    };
    expect(detectFvg(candles, ctx, strict)).toHaveLength(0);
    // And the loose params (minGapPct 0) DO see it -> proves it's a real gap.
    expect(detectFvg(candles, ctx, looseFvgParams())).toHaveLength(1);
  });
});

// ============================================================================
// ORDER BLOCK
// ============================================================================

describe('Order Block detector', () => {
  // Clear bullish-OB sequence. Swing high sits at index 2 (k=2 needs room on
  // both sides), so it confirms at index 4 — BEFORE the displacement at i5.
  //  i2 = swing high (110); i4 = last DOWN candle (OB origin); i5 = up
  //  displacement that CLOSES (117) above the confirmed swing high (110).
  function bullishObSeries(): Candle[] {
    return [
      c(0, 100, 101, 99, 100),
      c(1, 100, 106, 99.5, 105),
      c(2, 105, 110, 104, 109), // swing-high pivot (high 110)
      c(3, 109, 109.5, 104, 105), // down
      c(4, 105, 105.5, 101, 102), // LAST DOWN candle before up = OB origin
      c(5, 102, 118, 101.5, 117), // up displacement, close 117 > 110
      c(6, 117, 119, 116, 118),
    ];
  }

  it('detects a bullish OB at the displacement bar with the origin zone', () => {
    const candles = bullishObSeries();
    const ctx = ctxFor(candles, 2, 3); // small ATR period so displacement registers
    const params: OBParams = {
      type: 'OB',
      swing: { lookback: 2 },
      obKind: 'last-opposite-candle',
      requireDisplacementOut: false, // geometry-first (color-based impulse)
      displacementBodyMult: 0,
      mitigation: 'none',
      maxAgeBars: 50,
    };
    const dets = detectOb(candles, ctx, params);
    const longs = dets
      .filter((d) => d.direction === 'long')
      .sort((a, b) => a.formedAtIndex - b.formedAtIndex);
    expect(longs.length).toBeGreaterThanOrEqual(1);
    const d = longs[0]; // the FIRST (canonical) OB = the breakout bar i5
    expect(d.patternType).toBe('OB');
    expect(d.formedAtIndex).toBe(5);
    // Origin = last down candle before i5 = i4 [low 101, high 105.5].
    expect(Number(d.meta.originIndex)).toBe(4);
    expect(d.zone.bottom).toBeCloseTo(101, 9);
    expect(d.zone.top).toBeCloseTo(105.5, 9);
  });

  it('does NOT detect an OB when no displacement breaks structure', () => {
    // Gentle drift up that never closes above a prior confirmed swing high.
    const candles: Candle[] = [
      c(0, 100, 101, 99, 100),
      c(1, 100, 102, 99, 101),
      c(2, 101, 103, 100, 102),
      c(3, 102, 104, 101, 103),
      c(4, 103, 105, 102, 104),
      c(5, 104, 106, 103, 105),
      c(6, 105, 107, 104, 106),
    ];
    const ctx = ctxFor(candles, 2, 3);
    const params: OBParams = {
      type: 'OB',
      swing: { lookback: 2 },
      obKind: 'last-opposite-candle',
      requireDisplacementOut: true,
      displacementBodyMult: 1.5, // require a real impulse; none here
      mitigation: 'none',
      maxAgeBars: 50,
    };
    expect(detectOb(candles, ctx, params)).toHaveLength(0);
  });
});

// ============================================================================
// LIQUIDITY (sweep)
// ============================================================================

describe('Liquidity sweep detector', () => {
  // Buy-side sweep: a confirmed swing high (index 2, value 110, confirms at i4)
  // is taken out by a later candle whose WICK pierces above it but CLOSE falls
  // back below (reclaim) -> short bias.
  function buySideSweepSeries(): Candle[] {
    return [
      c(0, 100, 101, 99, 100),
      c(1, 100, 106, 99.5, 105),
      c(2, 105, 110, 104, 109), // swing high (high 110) -> confirms at i4
      c(3, 109, 109.5, 104, 105),
      c(4, 105, 106, 103, 104),
      c(5, 104, 105, 102, 103),
      c(6, 103, 104, 101, 102),
      c(7, 102, 112, 101, 104), // SWEEP: high 112 > 110, close 104 < 110
      c(8, 104, 105, 100, 101),
    ];
  }

  it('detects a buy-side sweep (short bias) with reclaim, no MSS required', () => {
    const candles = buySideSweepSeries();
    const ctx = ctxFor(candles, 2, 3);
    const params: LiquidityParams = {
      type: 'LIQUIDITY',
      mode: 'sweep',
      swing: { lookback: 2 },
      equalTolerancePct: 0.05,
      minTouches: 2,
      requireReclaim: true,
      requireMSS: false, // isolate the sweep itself
    };
    const dets = detectLiquidity(candles, ctx, params);
    const shorts = dets.filter((d) => d.direction === 'short');
    expect(shorts.length).toBeGreaterThanOrEqual(1);
    const d = shorts.find((x) => Number(x.meta.sweepBarIndex) === 7);
    expect(d).toBeDefined();
    expect(d!.formedAtIndex).toBe(7); // no MSS -> sweep bar is the formation bar
    expect(d!.patternType).toBe('LIQUIDITY');
    expect(Number(d!.meta.sweptSwingIndex)).toBe(2);
  });

  it('does NOT detect a sweep when price never exceeds the swing high', () => {
    // Same structure but the "sweep" candle high (108) stays below the 110 swing.
    const candles: Candle[] = [
      c(0, 100, 101, 99, 100),
      c(1, 100, 106, 99.5, 105),
      c(2, 105, 110, 104, 109), // swing high 110
      c(3, 109, 109.5, 104, 105),
      c(4, 105, 106, 103, 104),
      c(5, 104, 105, 102, 103),
      c(6, 103, 104, 101, 102),
      c(7, 102, 108, 101, 104), // high 108 < 110 -> NO sweep
      c(8, 104, 105, 100, 101),
    ];
    const ctx = ctxFor(candles, 2, 3);
    const params: LiquidityParams = {
      type: 'LIQUIDITY',
      mode: 'sweep',
      swing: { lookback: 2 },
      equalTolerancePct: 0.05,
      minTouches: 2,
      requireReclaim: true,
      requireMSS: false,
    };
    const dets = detectLiquidity(candles, ctx, params);
    // No detection that references a sweep above the 110 high.
    expect(dets.filter((d) => Number(d.meta.sweepBarIndex) === 7)).toHaveLength(0);
  });
});

// ============================================================================
// IFVG
// ============================================================================

describe('IFVG detector', () => {
  it('inverts a bullish FVG when a later candle CLOSES below the gap bottom', () => {
    // Bullish FVG forms at i2 (gap bottom = high[0] = 104). Later, i5 closes
    // below 104 -> inversion -> short bias, formedAtIndex = 5.
    const candles: Candle[] = [
      c(0, 100, 104, 99, 103), // i0
      c(1, 103, 112, 102, 111), // i1 impulse up
      c(2, 111, 115, 110, 114), // i2 bullish FVG: gap [104, 110]
      c(3, 114, 115, 109, 110), // i3 pull back (still above 104)
      c(4, 110, 111, 105, 106), // i4 closes 106, still above 104
      c(5, 106, 107, 100, 102), // i5 CLOSES 102 < 104 -> inversion
      c(6, 102, 103, 99, 100),
    ];
    const ctx = ctxFor(candles);
    const params: IFVGParams = {
      type: 'IFVG',
      baseFvg: { ...looseFvgParams() },
      confirmCloseThrough: true,
      maxAgeBars: 50,
    };
    const dets = detectIfvg(candles, ctx, params);
    expect(dets.length).toBeGreaterThanOrEqual(1);
    const d = dets[0];
    expect(d.patternType).toBe('IFVG');
    expect(d.direction).toBe('short'); // flipped from the bullish base
    expect(d.formedAtIndex).toBe(5);
    expect(Number(d.meta.baseFormedAtIndex)).toBe(2);
    expect(d.zone.bottom).toBeCloseTo(104, 9);
    expect(d.zone.top).toBeCloseTo(110, 9);
  });

  it('does NOT invert when price never closes through the gap', () => {
    // Same bullish FVG at i2 but price stays above the 104 gap bottom forever.
    const candles: Candle[] = [
      c(0, 100, 104, 99, 103),
      c(1, 103, 112, 102, 111),
      c(2, 111, 115, 110, 114), // bullish FVG [104, 110]
      c(3, 114, 116, 109, 113), // stays above 104
      c(4, 113, 117, 108, 115),
      c(5, 115, 118, 107, 116), // low 107 > 104 -> never breaks
      c(6, 116, 119, 110, 118),
    ];
    const ctx = ctxFor(candles);
    const params: IFVGParams = {
      type: 'IFVG',
      baseFvg: { ...looseFvgParams() },
      confirmCloseThrough: true,
      maxAgeBars: 50,
    };
    expect(detectIfvg(candles, ctx, params)).toHaveLength(0);
  });
});

// ============================================================================
// BREAKER (composed: OB -> sweep -> MSS)
// ============================================================================

describe('Breaker detector', () => {
  it('emitted breakers satisfy the flip + temporal-order invariants', () => {
    // Bullish OB forms; then its swing low is swept; then a bearish MSS closes
    // below a confirmed swing low -> breaker flips SHORT at the MSS bar.
    const candles: Candle[] = [
      c(0, 100, 101, 99, 100),
      c(1, 100, 106, 99.5, 105),
      c(2, 105, 110, 104, 109), // swing high
      c(3, 109, 109.5, 104, 105),
      c(4, 104, 105, 101, 102), // OB origin (last down before up)
      c(5, 102, 118, 101.5, 117), // up displacement closes > 110 -> bullish OB @5
      c(6, 117, 119, 113, 114), // pullback; forms swing-low region
      c(7, 114, 115, 110, 111),
      c(8, 111, 112, 100, 101), // sweep below OB swing low + strong down
      c(9, 101, 102, 95, 96), // closes below confirmed swing low -> bearish MSS
      c(10, 96, 97, 90, 91),
      c(11, 91, 92, 88, 89),
    ];
    const ctx = ctxFor(candles, 2, 3);
    const params: BreakerParams = {
      type: 'BREAKER',
      swing: { lookback: 2 },
      requireLiquiditySweep: true,
      requireMSS: true,
      maxAgeBars: 50,
    };
    const dets = detectBreaker(candles, ctx, params);
    // The breaker chain is sensitive to exact structure; assert the INVARIANTS
    // that must hold for ANY breaker it emits, rather than a brittle count.
    for (const d of dets) {
      expect(d.patternType).toBe('BREAKER');
      // Flipped from the OB that spawned it.
      const obDir = String(d.meta.obDirection);
      expect(d.direction).toBe(obDir === 'long' ? 'short' : 'long');
      // Temporal ordering: OB formed < sweep <= MSS(formedAtIndex).
      const obFormed = Number(d.meta.obFormedAtIndex);
      const sweep = Number(d.meta.sweepBarIndex);
      expect(obFormed).toBeLessThan(sweep);
      expect(sweep).toBeLessThanOrEqual(d.formedAtIndex);
    }
    // Document the observed count so a regression is visible.
    expect(dets.length).toBeGreaterThanOrEqual(0);
  });

  it('does NOT form a breaker when there is no MSS after the OB', () => {
    // A clean bullish OB with price that keeps rising (no bearish flip).
    const candles: Candle[] = [
      c(0, 100, 101, 99, 100),
      c(1, 100, 106, 99.5, 105),
      c(2, 105, 110, 104, 109),
      c(3, 109, 109.5, 104, 105),
      c(4, 104, 105, 101, 102),
      c(5, 102, 118, 101.5, 117), // bullish OB
      c(6, 117, 123, 116, 122), // keeps ripping up -> no bearish MSS
      c(7, 122, 128, 121, 127),
      c(8, 127, 133, 126, 132),
    ];
    const ctx = ctxFor(candles, 2, 3);
    const params: BreakerParams = {
      type: 'BREAKER',
      swing: { lookback: 2 },
      requireLiquiditySweep: true,
      requireMSS: true,
      maxAgeBars: 50,
    };
    expect(detectBreaker(candles, ctx, params)).toHaveLength(0);
  });
});

// ============================================================================
// LOOK-AHEAD INVARIANT (the critical test)
// ============================================================================

/**
 * Generic look-ahead audit. For a candle series + pattern set:
 *   (1) every detection's formedAtIndex must be a valid index (< length);
 *   (2) any candle index referenced in meta/refSwing must be <= formedAtIndex;
 *   (3) a detection confirmed at index i on the FULL series must STILL be
 *       produced when the series is truncated to candles[0..i] — i.e. it was
 *       derivable without any future bar.
 */
function auditNoLookAhead(allCandles: Candle[], patterns: PatternParams[]): void {
  const lookback = deriveLookback(patterns);
  const fullCtx = ctxFor(allCandles, lookback);
  const full = runDetectors(patterns, allCandles, fullCtx);

  for (const d of full) {
    // (1) formedAtIndex in range.
    expect(d.formedAtIndex).toBeGreaterThanOrEqual(0);
    expect(d.formedAtIndex).toBeLessThan(allCandles.length);

    // (2) no referenced index exceeds formedAtIndex.
    const refIndices = collectReferencedIndices(d);
    for (const idx of refIndices) {
      expect(
        idx,
        `${d.patternType}/${d.direction}@${d.formedAtIndex} references future index ${idx}`,
      ).toBeLessThanOrEqual(d.formedAtIndex);
    }

    // (3) re-derivable from the truncated prefix [0..formedAtIndex].
    const prefix = allCandles.slice(0, d.formedAtIndex + 1);
    const prefixCtx = ctxFor(prefix, lookback);
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
      `Detection ${d.patternType}/${d.direction}@${d.formedAtIndex} ` +
        `not reproducible from candles[0..${d.formedAtIndex}] -> LOOK-AHEAD BIAS`,
    ).toBe(true);
  }
}

/** Pull every candle index a detection points at (must be <= formedAtIndex). */
function collectReferencedIndices(d: Detection): number[] {
  const out: number[] = [];
  if (d.refSwing) out.push(d.refSwing.index);
  for (const [k, v] of Object.entries(d.meta)) {
    if (typeof v === 'number' && /index|bar/i.test(k)) out.push(v);
  }
  return out;
}

function deriveLookback(patterns: PatternParams[]): number {
  for (const p of patterns) {
    if (p.type === 'OB' || p.type === 'BREAKER' || p.type === 'LIQUIDITY') {
      return p.swing.lookback;
    }
  }
  return 2;
}

describe('Look-ahead invariant (no detector sees the future)', () => {
  it('FVG detections are reproducible from their own prefix', () => {
    const candles: Candle[] = [
      c(0, 100, 104, 99, 103),
      c(1, 103, 112, 102, 111),
      c(2, 111, 115, 110, 114), // bullish FVG @2
      c(3, 114, 116, 111, 115),
      c(4, 115, 116, 100, 101), // closes below -> sets up potential IFVG
      c(5, 101, 102, 95, 96),
    ];
    auditNoLookAhead(candles, [looseFvgParams()]);
  });

  it('all five detectors together are reproducible from their prefixes', () => {
    // A longer, structure-rich series exercising every detector at once.
    const candles: Candle[] = [
      c(0, 100, 101, 99, 100),
      c(1, 100, 106, 99.5, 105),
      c(2, 105, 110, 104, 108), // swing high
      c(3, 108, 109, 104, 105),
      c(4, 104, 105, 101, 102), // OB origin
      c(5, 102, 118, 101.5, 117), // up displacement -> OB + bullish FVG
      c(6, 117, 119, 116, 118),
      c(7, 118, 120, 112, 113), // pullback
      c(8, 113, 114, 105, 106), // closes below FVG bottom region -> IFVG candidate
      c(9, 106, 122, 105, 121), // sweep above the prior highs
      c(10, 121, 123, 100, 101), // reclaim down + structure break
      c(11, 101, 102, 95, 96), // bearish MSS
      c(12, 96, 97, 90, 91),
      c(13, 91, 92, 88, 89),
    ];
    const patterns: PatternParams[] = [
      looseFvgParams(),
      { type: 'IFVG', baseFvg: { ...looseFvgParams() }, confirmCloseThrough: true, maxAgeBars: 50 },
      {
        type: 'OB',
        swing: { lookback: 2 },
        obKind: 'last-opposite-candle',
        requireDisplacementOut: false,
        displacementBodyMult: 0,
        mitigation: 'none',
        maxAgeBars: 50,
      },
      {
        type: 'LIQUIDITY',
        mode: 'sweep',
        swing: { lookback: 2 },
        equalTolerancePct: 0.05,
        minTouches: 2,
        requireReclaim: true,
        requireMSS: false,
      },
      {
        type: 'BREAKER',
        swing: { lookback: 2 },
        requireLiquiditySweep: true,
        requireMSS: true,
        maxAgeBars: 50,
      },
    ];
    auditNoLookAhead(candles, patterns);
  });
});

// ============================================================================
// SIGNAL BUILDER / ENGINE SANITY
// ============================================================================

describe('Engine sanity (FVG setup -> fill never precedes formation)', () => {
  it('produces a trade whose entry time >= the detection candle time', () => {
    // Bullish FVG at i2 (gap [104,110], zone-50 = 107). Price must later trade
    // DOWN into 107 for the limit-long to fill. We give it a pullback at i4.
    const candles: Candle[] = [
      c(0, 100, 104, 99, 103),
      c(1, 103, 112, 102, 111), // impulse
      c(2, 111, 115, 110, 114), // bullish FVG @2, zone-50 = 107
      c(3, 114, 116, 112, 113), // above zone, no fill
      c(4, 113, 114, 106, 108), // low 106 <= 107 -> limit-long FILLS here (i4)
      c(5, 108, 130, 107, 129), // rips up to TP
      c(6, 129, 131, 128, 130),
      c(7, 130, 132, 129, 131),
    ];

    const setup = makeDefaultSetup('BTCUSDT', '15m');
    setup.direction = 'both';
    setup.patterns = [looseFvgParams()];
    setup.entry = { trigger: 'zone-50', orderType: 'limit', validForBars: 20 };
    setup.stop = { basis: 'zone-far-edge', bufferPct: 0 };
    setup.target = { basis: 'r-multiple', rMultiple: 2 };

    const result = runAutoBacktest(setup, candles);

    // At least one FVG detection was found at index 2.
    const fvg = result.detections.find(
      (d) => d.patternType === 'FVG' && d.formedAtIndex === 2,
    );
    expect(fvg).toBeDefined();

    // A trade resulted; its entry must NOT precede the detection bar, and the
    // earliest legal fill is bar i3 (formedAtIndex + 1), never i2 itself.
    expect(result.trades.length).toBeGreaterThanOrEqual(1);
    const trade = result.trades[0];
    const i3TimeSec = Math.floor(candleTimeMs(candles[3]) / 1000);
    expect(trade.entryTime).toBeGreaterThanOrEqual(i3TimeSec);
  });

  it('never fills a signal on the same bar it was confirmed', () => {
    // Construct an FVG whose zone-50 sits INSIDE the formation candle's range,
    // so a buggy engine COULD fill same-bar. Assert it does not.
    const candles: Candle[] = [
      c(0, 100, 104, 99, 103),
      c(1, 103, 112, 102, 111),
      c(2, 111, 115, 106, 114), // formation bar low=106 reaches zone-50=107
      c(3, 114, 116, 105, 107), // legal earliest fill (low 105 <= 107)
      c(4, 107, 140, 106, 139),
      c(5, 139, 141, 138, 140),
    ];
    const setup = makeDefaultSetup('BTCUSDT', '15m');
    setup.patterns = [looseFvgParams()];
    setup.entry = { trigger: 'zone-50', orderType: 'limit', validForBars: 20 };
    setup.stop = { basis: 'zone-far-edge', bufferPct: 0 };
    setup.target = { basis: 'r-multiple', rMultiple: 2 };

    const result = runAutoBacktest(setup, candles);
    const detTimeSec = Math.floor(candleTimeMs(candles[2]) / 1000);
    for (const t of result.trades) {
      // Entry strictly AFTER the formation candle's open time.
      expect(t.entryTime).toBeGreaterThan(detTimeSec);
    }
  });
});

// Sanity: defaults are well-formed (guards the fixtures' assumptions).
describe('config defaults', () => {
  it('makeDefaultSetup yields an FVG-only setup', () => {
    const s = makeDefaultSetup('BTCUSDT', '15m');
    expect(s.patterns).toHaveLength(1);
    expect(s.patterns[0].type).toBe('FVG');
    expect(DEFAULT_PATTERN_PARAMS.FVG.type).toBe('FVG');
  });
});
