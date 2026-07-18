// ============================================================================
// INDICATOR BANK — DETERMINISTIC GOLDEN TESTS + LOOK-AHEAD INVARIANT
// ============================================================================
//
// Conventions mirror `./levelBank.test.ts`: hand-built fixtures with the
// expected answer derived in comments (exact fractions where the fixture
// permits, `toBeCloseTo` elsewhere), plus a generic truncated-prefix
// invariance audit proving no bank series peeks at future bars.
//
// All day-scoped fixtures (vwap) use timezone 'UTC' so day boundaries are
// easy to reason about by hand (no DST/offset arithmetic).
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { Candle } from '../../../../components/ReplayChart/types';
import { IndicatorBank } from '../IndicatorBank';
import type { IndicatorBankOptions } from '../IndicatorBank';
import type { IndicatorRef } from '../types';

/** Candle factory. `time` in SECONDS since epoch (journal/UTCTimestamp
 *  convention, matches levelBank.test.ts). `volume` defaults to 1. */
function candle(
  timeSec: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume = 1,
): Candle {
  return { time: timeSec, open, high, low, close, volume };
}

/** Close-only candle factory for sma/ema/rsi fixtures where high/low/volume
 *  are irrelevant — open=close, high=close, low=close keeps it inert. */
function closeCandle(timeSec: number, close: number): Candle {
  return { time: timeSec, open: close, high: close, low: close, close, volume: 1 };
}

const DAY1_00 = Date.UTC(2024, 0, 1, 0, 0, 0) / 1000;
const HOUR = 3600;
const MIN = 60;

function bank(candles: Candle[], opts: Partial<IndicatorBankOptions> = {}): IndicatorBank {
  return new IndicatorBank(candles, { timezone: 'UTC', ...opts });
}

// ============================================================================
// SMA — exact-fraction fixture, length=5, sliding sums all divisible by 5
// ============================================================================

describe('IndicatorBank sma(length=5)', () => {
  // closes: 10,20,30,40,50,15,25,35,45,55
  // window sums (5-wide): [0..4]=150 [1..5]=155 [2..6]=160 [3..7]=165 [4..8]=170 [5..9]=175
  // -> sma: NaN,NaN,NaN,NaN,30,31,32,33,34,35
  const closes = [10, 20, 30, 40, 50, 15, 25, 35, 45, 55];
  const candles: Candle[] = closes.map((c, i) => closeCandle(DAY1_00 + i * HOUR, c));

  it('is NaN for i < length-1, then the exact sliding-window mean', () => {
    const b = bank(candles);
    const sma = b.getSeries({ type: 'sma', length: 5 });
    for (const i of [0, 1, 2, 3]) expect(Number.isNaN(sma[i]), `sma[${i}]`).toBe(true);
    expect(sma[4]).toBeCloseTo(30, 9);
    expect(sma[5]).toBeCloseTo(31, 9);
    expect(sma[6]).toBeCloseTo(32, 9);
    expect(sma[7]).toBeCloseTo(33, 9);
    expect(sma[8]).toBeCloseTo(34, 9);
    expect(sma[9]).toBeCloseTo(35, 9);
  });
});

// ============================================================================
// EMA — seed = SMA seed, then hand-derived recurrence (same length=5 fixture)
// ============================================================================

describe('IndicatorBank ema(length=5)', () => {
  // Same closes as the sma fixture above. k = 2/(5+1) = 1/3.
  // ema[4] (seed) = sma[4] = 30 (see sma fixture derivation).
  // ema[5] = close[5]*(1/3) + ema[4]*(2/3) = 15/3 + 60/3 = 5 + 20 = 25
  // ema[6] = close[6]*(1/3) + ema[5]*(2/3) = 25/3 + 50/3 = 75/3 = 25
  // ema[7] = close[7]*(1/3) + ema[6]*(2/3) = 35/3 + 50/3 = 85/3
  const closes = [10, 20, 30, 40, 50, 15, 25, 35, 45, 55];
  const candles: Candle[] = closes.map((c, i) => closeCandle(DAY1_00 + i * HOUR, c));

  it('seeds at i = length-1 with the SMA value, NaN before it', () => {
    const b = bank(candles);
    const ema = b.getSeries({ type: 'ema', length: 5 });
    const sma = b.getSeries({ type: 'sma', length: 5 });
    for (const i of [0, 1, 2, 3]) expect(Number.isNaN(ema[i]), `ema[${i}]`).toBe(true);
    expect(ema[4]).toBeCloseTo(sma[4], 9);
    expect(ema[4]).toBeCloseTo(30, 9);
  });

  it('applies the exact k=2/(length+1) recurrence after the seed', () => {
    const b = bank(candles);
    const ema = b.getSeries({ type: 'ema', length: 5 });
    expect(ema[5]).toBeCloseTo(25, 9);
    expect(ema[6]).toBeCloseTo(25, 9);
    expect(ema[7]).toBeCloseTo(85 / 3, 9);
  });
});

// ============================================================================
// RSI — Wilder smoothing, length=3, exact fractions at 3 consecutive indices
// ============================================================================

describe('IndicatorBank rsi(length=3) Wilder smoothing', () => {
  // closes: 44, 44.5, 43.75, 45, 45.5, 44.75, 46 (indices 0..6)
  // Deltas: d1=+0.5 d2=-0.75 d3=+1.25 d4=+0.5 d5=-0.75 d6=+1.25
  //
  // Seed at i=3 uses SIMPLE mean of d1,d2,d3:
  //   avgGain = (0.5+1.25)/3 = 1.75/3 = 7/12   avgLoss = 0.75/3 = 1/4
  //   RS = (7/12)/(1/4) = 7/3   RSI[3] = 100 - 100/(1+7/3) = 100 - 100/(10/3)
  //      = 100 - 30 = 70                                    (EXACT)
  //
  // i=4 (Wilder recurrence, gain=0.5 loss=0):
  //   avgGain = (7/12*2 + 0.5)/3 = (7/6+1/2)/3 = (10/6)/3 = 5/9
  //   avgLoss = (1/4*2 + 0)/3 = (1/2)/3 = 1/6
  //   RS = (5/9)/(1/6) = 10/3   RSI[4] = 100 - 100/(1+10/3) = 100 - 300/13
  //      = 1000/13                                          (EXACT)
  //
  // i=5 (loss=0.75 gain=0):
  //   avgGain = (5/9*2 + 0)/3 = (10/9)/3 = 10/27
  //   avgLoss = (1/6*2 + 0.75)/3 = (1/3+3/4)/3 = (13/12)/3 = 13/36
  //   RS = (10/27)/(13/36) = 360/351 = 40/39
  //   RSI[5] = 100 - 100/(1+40/39) = 100 - 3900/79           (EXACT)
  const closes = [44, 44.5, 43.75, 45, 45.5, 44.75, 46];
  const candles: Candle[] = closes.map((c, i) => closeCandle(DAY1_00 + i * HOUR, c));

  it('is NaN for i < length', () => {
    const b = bank(candles);
    const rsi = b.getSeries({ type: 'rsi', length: 3 });
    expect(Number.isNaN(rsi[0])).toBe(true);
    expect(Number.isNaN(rsi[1])).toBe(true);
    expect(Number.isNaN(rsi[2])).toBe(true);
  });

  it('matches the exact hand-derived seed and Wilder-recurrence values', () => {
    const b = bank(candles);
    const rsi = b.getSeries({ type: 'rsi', length: 3 });
    expect(rsi[3]).toBeCloseTo(70, 9);
    expect(rsi[4]).toBeCloseTo(1000 / 13, 9);
    expect(rsi[5]).toBeCloseTo(100 - 3900 / 79, 9);
  });
});

// ============================================================================
// ATR — Wilder smoothing, length=3, exact-integer fixture
// ============================================================================

describe('IndicatorBank atr(length=3) Wilder smoothing', () => {
  // TR0 = high-low (no prior close) = 10-8 = 2
  // TR1 = max(11-7, |11-9|, |7-9|)   = max(4,2,2) = 4
  // TR2 = max(12-9, |12-10|,|9-10|)  = max(3,2,1) = 3
  // TR3 = max(13-10,|13-11|,|10-11|) = max(3,2,1) = 3
  // TR4 = max(9-6,  |9-12|, |6-12|)  = max(3,3,6) = 6
  // TR5 = max(8-5,  |8-7|,  |5-7|)   = max(3,1,2) = 3
  //
  // seed atr[2] = mean(TR0,TR1,TR2) = (2+4+3)/3 = 3
  // atr[3] = (atr[2]*2 + TR3)/3 = (6+3)/3 = 3
  // atr[4] = (atr[3]*2 + TR4)/3 = (6+6)/3 = 4
  // atr[5] = (atr[4]*2 + TR5)/3 = (8+3)/3 = 11/3
  const candles: Candle[] = [
    candle(DAY1_00, 9, 10, 8, 9),
    candle(DAY1_00 + HOUR, 10, 11, 7, 10),
    candle(DAY1_00 + 2 * HOUR, 11, 12, 9, 11),
    candle(DAY1_00 + 3 * HOUR, 12, 13, 10, 12),
    candle(DAY1_00 + 4 * HOUR, 7, 9, 6, 7),
    candle(DAY1_00 + 5 * HOUR, 6, 8, 5, 6),
  ];

  it('is NaN for i < length-1, then the exact hand-derived Wilder values', () => {
    const b = bank(candles);
    const atr = b.getSeries({ type: 'atr', length: 3 });
    expect(Number.isNaN(atr[0])).toBe(true);
    expect(Number.isNaN(atr[1])).toBe(true);
    expect(atr[2]).toBeCloseTo(3, 9);
    expect(atr[3]).toBeCloseTo(3, 9);
    expect(atr[4]).toBeCloseTo(4, 9);
    expect(atr[5]).toBeCloseTo(11 / 3, 9);
  });
});

// ============================================================================
// VWAP — session-anchored (current-bar-inclusive), resets at midnight
// ============================================================================

describe('IndicatorBank vwap session anchoring', () => {
  // Day1 bar0: tp=(10+8+9)/3=9,        vol=100 -> cumPV=900,        cumV=100  -> vwap=9
  // Day1 bar1: tp=(12+9+11)/3=32/3,    vol=50  -> cumPV=900+1600/3=4300/3, cumV=150 -> vwap=4300/450=86/9
  // Day2 bar2 (first bar of a NEW day): tp=(20+16+18)/3=18, vol=40 -> resets:
  //   cumPV=18*40=720, cumV=40 -> vwap=720/40=18 == its OWN typical price
  const candles: Candle[] = [
    candle(DAY1_00, 9, 10, 8, 9, 100),
    candle(DAY1_00 + HOUR, 11, 12, 9, 11, 50),
    candle(DAY1_00 + 24 * HOUR, 18, 20, 16, 18, 40), // day2 first bar
  ];

  it('accumulates typicalPrice*volume/volume within the day, current bar inclusive', () => {
    const b = bank(candles);
    const vwap = b.getSeries({ type: 'vwap' });
    expect(vwap[0]).toBeCloseTo(9, 9);
    expect(vwap[1]).toBeCloseTo(86 / 9, 9);
  });

  it('resets at the midnight boundary: day2 first bar vwap == its own typical price', () => {
    const b = bank(candles);
    const vwap = b.getSeries({ type: 'vwap' });
    const day2TypicalPrice = (20 + 16 + 18) / 3;
    expect(vwap[2]).toBeCloseTo(day2TypicalPrice, 9);
    expect(vwap[2]).toBeCloseTo(18, 9);
  });

  it('is NaN while the day has zero cumulative volume', () => {
    const zeroVolCandles: Candle[] = [candle(DAY1_00, 9, 10, 8, 9, 0), candle(DAY1_00 + HOUR, 9, 10, 8, 9, 0)];
    const b = bank(zeroVolCandles);
    const vwap = b.getSeries({ type: 'vwap' });
    expect(Number.isNaN(vwap[0])).toBe(true);
    expect(Number.isNaN(vwap[1])).toBe(true);
  });
});

// ============================================================================
// MACD — ema(12) - ema(26), length ignored, warmup = 25 (ema26's boundary)
// ============================================================================

describe('IndicatorBank macd (fixed 12/26, length ignored)', () => {
  // 30 bars of a simple monotonic ramp is enough to exercise both EMA legs.
  const n = 30;
  const candles: Candle[] = Array.from({ length: n }, (_, i) => closeCandle(DAY1_00 + i * HOUR, 100 + i));

  it('is NaN until ema(26) warms up (i < 25), then equals ema12 - ema26 exactly', () => {
    const b = bank(candles);
    const macd = b.getSeries({ type: 'macd' });
    const ema12 = b.getSeries({ type: 'ema', length: 12 });
    const ema26 = b.getSeries({ type: 'ema', length: 26 });
    for (const i of [0, 10, 24]) expect(Number.isNaN(macd[i]), `macd[${i}]`).toBe(true);
    for (const i of [25, 26, 29]) {
      expect(Number.isNaN(macd[i]), `macd[${i}] should be defined`).toBe(false);
      expect(macd[i]).toBeCloseTo(ema12[i] - ema26[i], 9);
    }
  });

  it('length on the ref is ignored (always fixed 12/26)', () => {
    const b = bank(candles);
    const macdDefault = b.getSeries({ type: 'macd' });
    const macdWithLength = b.getSeries({ type: 'macd', length: 9 });
    // Canonical cache key ignores `length` for macd -> same instance.
    expect(macdWithLength).toBe(macdDefault);
  });
});

// ============================================================================
// Warmup NaN ranges — default lengths (sma/ema=20, rsi/atr=14), exact index
// ============================================================================

describe('IndicatorBank warmup NaN ranges at default lengths', () => {
  const n = 40;
  const candles: Candle[] = Array.from({ length: n }, (_, i) =>
    candle(DAY1_00 + i * HOUR, 100 + i, 101 + i, 99 + i, 100.5 + i, 10 + i),
  );

  it('sma/ema default length=20 -> NaN for i<19, defined from i=19', () => {
    const b = bank(candles);
    const sma = b.getSeries({ type: 'sma' });
    const ema = b.getSeries({ type: 'ema' });
    for (let i = 0; i < 19; i++) {
      expect(Number.isNaN(sma[i]), `sma[${i}]`).toBe(true);
      expect(Number.isNaN(ema[i]), `ema[${i}]`).toBe(true);
    }
    expect(Number.isNaN(sma[19])).toBe(false);
    expect(Number.isNaN(ema[19])).toBe(false);
  });

  it('rsi default length=14 -> NaN for i<14, defined from i=14', () => {
    const b = bank(candles);
    const rsi = b.getSeries({ type: 'rsi' });
    for (let i = 0; i < 14; i++) expect(Number.isNaN(rsi[i]), `rsi[${i}]`).toBe(true);
    expect(Number.isNaN(rsi[14])).toBe(false);
  });

  it('atr default length=14 -> NaN for i<13, defined from i=13', () => {
    const b = bank(candles);
    const atr = b.getSeries({ type: 'atr' });
    for (let i = 0; i < 13; i++) expect(Number.isNaN(atr[i]), `atr[${i}]`).toBe(true);
    expect(Number.isNaN(atr[13])).toBe(false);
  });

  it('macd (fixed 26-slow) -> NaN for i<25, defined from i=25', () => {
    const b = bank(candles);
    const macd = b.getSeries({ type: 'macd' });
    for (let i = 0; i < 25; i++) expect(Number.isNaN(macd[i]), `macd[${i}]`).toBe(true);
    expect(Number.isNaN(macd[25])).toBe(false);
  });
});

// ============================================================================
// Truncated-prefix invariance — no indicator peeks at future bars
// ============================================================================

/**
 * For every IndicatorRef kind, computing on the FULL candle series and on a
 * PREFIX must agree on the overlapping range [0, prefixLen). Mirrors the
 * look-ahead audit pattern in `./levelBank.test.ts`.
 */
function assertPrefixInvariant(candles: Candle[], ref: IndicatorRef, prefixLen: number): void {
  const full = bank(candles).getSeries(ref);
  const prefix = bank(candles.slice(0, prefixLen)).getSeries(ref);
  for (let i = 0; i < prefixLen; i++) {
    const a = full[i];
    const bv = prefix[i];
    if (Number.isNaN(a) || Number.isNaN(bv)) {
      expect(Number.isNaN(a), `index ${i}: full=${a} prefix=${bv}`).toBe(Number.isNaN(bv));
    } else {
      expect(a, `index ${i}: full=${a} prefix=${bv}`).toBeCloseTo(bv, 9);
    }
  }
}

describe('IndicatorBank truncated-prefix invariance (no look-ahead)', () => {
  // A longer, day-spanning, volume-varying series exercising every
  // IndicatorRef kind (deterministic formula, not random, for reproducibility).
  const n = 35;
  const candles: Candle[] = Array.from({ length: n }, (_, i) => {
    const dayOffset = i < 20 ? 0 : 24 * HOUR; // crosses a midnight boundary mid-series
    const t = DAY1_00 + dayOffset + (i % 20) * 15 * MIN;
    const base = 100 + Math.sin(i / 3) * 10 + i * 0.5;
    const high = base + 2;
    const low = base - 2;
    const close = base + Math.cos(i / 4);
    const volume = 10 + (i % 7);
    return candle(t, base, high, low, close, volume);
  });

  const refs: IndicatorRef[] = [
    { type: 'sma', length: 5 },
    { type: 'ema', length: 5 },
    { type: 'rsi', length: 5 },
    { type: 'atr', length: 5 },
    { type: 'vwap' },
    { type: 'macd' },
  ];

  for (const ref of refs) {
    it(`${ref.type} agrees between full series and a prefix on the overlap`, () => {
      assertPrefixInvariant(candles, ref, 18); // cut mid-series, before the day boundary
    });
  }
});

// ============================================================================
// Cache — same canonical ref (explicit or defaulted length) -> same instance
// ============================================================================

describe('IndicatorBank caching', () => {
  const candles: Candle[] = Array.from({ length: 10 }, (_, i) => closeCandle(DAY1_00 + i * HOUR, 100 + i));

  it('returns the SAME Float64Array instance for two calls with an identical ref', () => {
    const b = bank(candles);
    const first = b.getSeries({ type: 'ema', length: 5 });
    const second = b.getSeries({ type: 'ema', length: 5 });
    expect(first).toBe(second);
  });

  it('dedupes an explicit length equal to the type default against the defaulted call', () => {
    const b = bank(candles);
    const withDefault = b.getSeries({ type: 'sma' });
    const withExplicit = b.getSeries({ type: 'sma', length: 20 });
    expect(withDefault).toBe(withExplicit);
  });

  it('does NOT share the cache entry across different lengths', () => {
    const b = bank(candles);
    const len5 = b.getSeries({ type: 'ema', length: 5 });
    const len6 = b.getSeries({ type: 'ema', length: 6 });
    expect(len5).not.toBe(len6);
  });
});
