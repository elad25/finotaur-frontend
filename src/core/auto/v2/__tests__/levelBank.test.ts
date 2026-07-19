// ============================================================================
// LEVEL BANK — DETERMINISTIC GOLDEN TESTS + LOOK-AHEAD INVARIANT
// ============================================================================
//
// Conventions mirror `../../__tests__/detectors.test.ts` / `marketContext.test.ts`:
// hand-built fixtures with the expected answer commented inline, plus a
// generic truncated-prefix invariance audit proving no bank series peeks at
// future bars.
//
// All day-scoped fixtures use timezone 'UTC' so day boundaries are easy to
// reason about by hand (no DST/offset arithmetic).
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { Candle } from '../../../../components/ReplayChart/types';
import { LevelBank } from '../LevelBank';
import type { LevelBankOptions } from '../LevelBank';
import type { LevelRef } from '../types';

/** Candle factory. `time` in SECONDS since epoch (journal/UTCTimestamp convention). */
function candle(timeSec: number, open: number, high: number, low: number, close: number): Candle {
  return { time: timeSec, open, high, low, close, volume: 1 };
}

const DAY1_00 = Date.UTC(2024, 0, 1, 0, 0, 0) / 1000;
const HOUR = 3600;
const MIN = 60;

function bank(candles: Candle[], opts: Partial<LevelBankOptions> = {}): LevelBank {
  return new LevelBank(candles, { timezone: 'UTC', ...opts });
}

// ============================================================================
// prevDayHigh / prevDayLow / prevDayClose across a midnight boundary
// ============================================================================

describe('LevelBank prevDay* across a midnight boundary', () => {
  // Day 1 (2024-01-01 UTC): 00:00, 06:00, 12:00 -> day1 high=110 (b1),
  // low=90 (b2), close=95 (b2's close, the LAST bar of day1).
  // Day 2 (2024-01-02 UTC): 00:00, 06:00 -> prevDay* constant = day1's values.
  const candles: Candle[] = [
    candle(DAY1_00, 100, 105, 95, 102), // b0
    candle(DAY1_00 + 6 * HOUR, 102, 110, 100, 108), // b1: day1 high=110
    candle(DAY1_00 + 12 * HOUR, 108, 103, 90, 95), // b2: day1 low=90, close=95
    candle(DAY1_00 + 24 * HOUR, 96, 99, 94, 97), // b3: day2 first bar
    candle(DAY1_00 + 30 * HOUR, 97, 101, 96, 99), // b4: day2 second bar
  ];

  it('is NaN on the series first calendar day (no completed prior day)', () => {
    const b = bank(candles);
    const high = b.getSeries({ type: 'prevDayHigh' });
    const low = b.getSeries({ type: 'prevDayLow' });
    const close = b.getSeries({ type: 'prevDayClose' });
    for (const i of [0, 1, 2]) {
      expect(Number.isNaN(high[i]), `prevDayHigh[${i}]`).toBe(true);
      expect(Number.isNaN(low[i]), `prevDayLow[${i}]`).toBe(true);
      expect(Number.isNaN(close[i]), `prevDayClose[${i}]`).toBe(true);
    }
  });

  it('reflects the fully-completed day1 aggregate, constant through day2', () => {
    const b = bank(candles);
    const high = b.getSeries({ type: 'prevDayHigh' });
    const low = b.getSeries({ type: 'prevDayLow' });
    const close = b.getSeries({ type: 'prevDayClose' });
    for (const i of [3, 4]) {
      expect(high[i], `prevDayHigh[${i}]`).toBeCloseTo(110, 9);
      expect(low[i], `prevDayLow[${i}]`).toBeCloseTo(90, 9);
      expect(close[i], `prevDayClose[${i}]`).toBeCloseTo(95, 9);
    }
  });

  it('dayOpen is the current day first-bar open, known from that bar onward', () => {
    const b = bank(candles);
    const dayOpen = b.getSeries({ type: 'dayOpen' });
    expect(dayOpen[0]).toBeCloseTo(100, 9); // b0 = day1 first bar
    expect(dayOpen[1]).toBeCloseTo(100, 9);
    expect(dayOpen[2]).toBeCloseTo(100, 9);
    expect(dayOpen[3]).toBeCloseTo(96, 9); // b3 = day2 first bar
    expect(dayOpen[4]).toBeCloseTo(96, 9);
  });
});

// ============================================================================
// sessionHigh / sessionLow — running-max causality using bars STRICTLY BEFORE i
// ============================================================================

describe('LevelBank sessionHigh/sessionLow causality', () => {
  const candles: Candle[] = [
    candle(DAY1_00, 100, 105, 95, 102), // b0: first bar of day1
    candle(DAY1_00 + HOUR, 102, 110, 100, 108), // b1
    candle(DAY1_00 + 2 * HOUR, 108, 103, 90, 95), // b2
    candle(DAY1_00 + 24 * HOUR, 96, 99, 94, 97), // b3: first bar of day2 (reset)
  ];

  it('is NaN on the first bar of each day (nothing before it yet)', () => {
    const b = bank(candles);
    const high = b.getSeries({ type: 'sessionHigh' });
    const low = b.getSeries({ type: 'sessionLow' });
    expect(Number.isNaN(high[0])).toBe(true);
    expect(Number.isNaN(low[0])).toBe(true);
    expect(Number.isNaN(high[3])).toBe(true); // day2 reset
    expect(Number.isNaN(low[3])).toBe(true);
  });

  it('excludes the current bar i, only aggregating [dayStart, i-1]', () => {
    const b = bank(candles);
    const high = b.getSeries({ type: 'sessionHigh' });
    const low = b.getSeries({ type: 'sessionLow' });
    // At b1: only b0 is "before" -> sessionHigh = b0.high = 105 (NOT b1's own 110).
    expect(high[1]).toBeCloseTo(105, 9);
    expect(low[1]).toBeCloseTo(95, 9);
    // At b2: max/min of b0,b1 -> high=110, low=95.
    expect(high[2]).toBeCloseTo(110, 9);
    expect(low[2]).toBeCloseTo(95, 9);
  });
});

// ============================================================================
// openingRangeHigh / openingRangeLow — NaN until the window closes
// ============================================================================

describe('LevelBank openingRange (orMinutes window)', () => {
  // orMinutes=30, 15-minute bars: b0 (elapsed 0) and b1 (elapsed 15) are
  // INSIDE the window (both < 30); b2 (elapsed 30) is the first bar where
  // the window has fully closed -> OR = max/min of b0+b1.
  const candles: Candle[] = [
    candle(DAY1_00, 100, 104, 99, 102), // b0, elapsed 0
    candle(DAY1_00 + 15 * MIN, 102, 108, 101, 105), // b1, elapsed 15 -> OR high candidate 108
    candle(DAY1_00 + 30 * MIN, 105, 110, 103, 106), // b2, elapsed 30 -> window CLOSED here
    candle(DAY1_00 + 45 * MIN, 106, 112, 104, 109), // b3, elapsed 45 -> still constant
  ];

  it('is NaN for every bar strictly inside the OR window', () => {
    const b = bank(candles, { orMinutes: 30 });
    const high = b.getSeries({ type: 'openingRangeHigh' });
    const low = b.getSeries({ type: 'openingRangeLow' });
    expect(Number.isNaN(high[0])).toBe(true);
    expect(Number.isNaN(low[0])).toBe(true);
    expect(Number.isNaN(high[1])).toBe(true);
    expect(Number.isNaN(low[1])).toBe(true);
  });

  it('becomes constant (max/min of the window bars) once the window closes', () => {
    const b = bank(candles, { orMinutes: 30 });
    const high = b.getSeries({ type: 'openingRangeHigh' });
    const low = b.getSeries({ type: 'openingRangeLow' });
    // Window = b0,b1 -> high = max(104,108) = 108; low = min(99,101) = 99.
    expect(high[2]).toBeCloseTo(108, 9);
    expect(low[2]).toBeCloseTo(99, 9);
    expect(high[3]).toBeCloseTo(108, 9); // stays constant for the rest of the day
    expect(low[3]).toBeCloseTo(99, 9);
  });

  it('a LevelRef-local orMinutes overrides the bank default', () => {
    // orMinutes=15 on the ref: only b0 (elapsed 0) is inside; b1 (elapsed 15)
    // is already >= 15 -> window closes AT b1, using only b0.
    const b = bank(candles, { orMinutes: 30 }); // bank default irrelevant here
    const ref: LevelRef = { type: 'openingRangeHigh', orMinutes: 15 };
    const high = b.getSeries(ref);
    expect(Number.isNaN(high[0])).toBe(true);
    expect(high[1]).toBeCloseTo(104, 9); // = b0.high alone
  });
});

// ============================================================================
// swingHigh / swingLow — confirm-at-(pivot+k) causality
// ============================================================================

describe('LevelBank swingHigh/swingLow confirm-at-k causality', () => {
  // k=2 fractal: pivot at index 2 (high=110) needs candles 0,1,3,4 strictly
  // lower on both sides -> confirms at bar p+k = 4 (identical fixture shape
  // to detectors.test.ts's bullishObSeries swing pivot).
  const candles: Candle[] = [
    candle(1_700_000_000, 100, 101, 99, 100),
    candle(1_700_000_900, 100, 106, 99.5, 105),
    candle(1_700_001_800, 105, 110, 104, 109), // pivot candidate (high=110)
    candle(1_700_002_700, 109, 109.5, 104, 105),
    candle(1_700_003_600, 105, 105.5, 101, 102),
    candle(1_700_004_500, 102, 103, 100, 101),
  ];

  it('is NaN before bar p+k, then the pivot price from p+k onward', () => {
    const b = bank(candles, { swingLookback: 2 });
    const swingHigh = b.getSeries({ type: 'swingHigh', lookback: 2, nth: 1 });
    expect(Number.isNaN(swingHigh[0])).toBe(true);
    expect(Number.isNaN(swingHigh[1])).toBe(true);
    expect(Number.isNaN(swingHigh[2])).toBe(true);
    expect(Number.isNaN(swingHigh[3])).toBe(true); // p+k=4, so bar 3 must NOT see it
    expect(swingHigh[4]).toBeCloseTo(110, 9);
    expect(swingHigh[5]).toBeCloseTo(110, 9);
  });
});

// ============================================================================
// Truncated-prefix invariance
// ============================================================================

/**
 * For every LevelRef kind, computing on the FULL candle series and on a
 * PREFIX must agree on the overlapping range [0, prefixLen). Mirrors the
 * look-ahead audit pattern in `../../__tests__/detectors.test.ts`.
 */
function assertPrefixInvariant(candles: Candle[], ref: LevelRef, prefixLen: number): void {
  const full = bank(candles, { orMinutes: 30, swingLookback: 2 }).getSeries(ref);
  const prefix = bank(candles.slice(0, prefixLen), { orMinutes: 30, swingLookback: 2 }).getSeries(ref);
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

describe('LevelBank truncated-prefix invariance (no look-ahead)', () => {
  // A longer, day-spanning, swing-rich series exercising every LevelRef kind.
  const candles: Candle[] = [
    candle(DAY1_00, 100, 104, 99, 102),
    candle(DAY1_00 + 15 * MIN, 102, 108, 101, 105),
    candle(DAY1_00 + 30 * MIN, 105, 110, 103, 106),
    candle(DAY1_00 + 45 * MIN, 106, 112, 104, 109),
    candle(DAY1_00 + HOUR, 109, 111, 107, 108), // local high pivot candidate
    candle(DAY1_00 + 75 * MIN, 108, 109, 105, 106),
    candle(DAY1_00 + 90 * MIN, 106, 107, 100, 101), // local low pivot candidate
    candle(DAY1_00 + 105 * MIN, 101, 103, 99, 102),
    candle(DAY1_00 + 24 * HOUR, 96, 99, 94, 97), // day2 first bar
    candle(DAY1_00 + 24 * HOUR + 15 * MIN, 97, 101, 96, 99),
  ];

  const refs: LevelRef[] = [
    { type: 'prevDayHigh' },
    { type: 'prevDayLow' },
    { type: 'prevDayClose' },
    { type: 'dayOpen' },
    { type: 'sessionHigh' },
    { type: 'sessionLow' },
    { type: 'openingRangeHigh' },
    { type: 'openingRangeLow' },
    { type: 'swingHigh', lookback: 2, nth: 1 },
    { type: 'swingLow', lookback: 2, nth: 1 },
  ];

  for (const ref of refs) {
    it(`${ref.type} agrees between full series and a prefix on the overlap`, () => {
      assertPrefixInvariant(candles, ref, 7); // cut mid-series, well before day2
    });
  }
});

// ============================================================================
// phaseAnchor — explicitly unsupported in this candles-only bank
// ============================================================================

describe('LevelBank phaseAnchor', () => {
  it('throws a descriptive error (requires PhaseEngine, Increment 3)', () => {
    const candles: Candle[] = [candle(DAY1_00, 100, 101, 99, 100)];
    const b = bank(candles);
    expect(() => b.getSeries({ type: 'phaseAnchor', phaseId: 'p1', anchor: 'triggerPrice' })).toThrow(
      /PhaseEngine/,
    );
  });
});

// ============================================================================
// Named-session levels (Increment 5) — ALWAYS America/New_York, regardless of
// the bank's own `timezone` option. Fixture dates are all January 2024
// (EST, UTC-5, no DST) so ET offsets are exact and easy to hand-verify:
// UTC hour - 5 = ET hour (with a date rollback when negative).
// ============================================================================

describe('LevelBank named session — asia (18:00-00:00 ET), day-rollover close', () => {
  // Day1 (ET Jan1) asia window = UTC [Jan1 23:00, Jan2 05:00). Contributing
  // bars: b2(23:00 UTC=18:00 ET,110/90), b3(01:00 UTC Jan2=20:00 ET Jan1,
  // 108/92), b4(04:00 UTC Jan2=23:00 ET Jan1,105/95) -> high=110, low=90.
  // The window never explicitly reaches minutes>=endMin(1440) within Jan1 ET
  // (minutes maxes at 1439) -> it closes via the DAY-ROLLOVER branch, at the
  // first Jan2-ET bar (b5, UTC Jan2 05:00 = ET Jan2 00:00).
  // Day2 (ET Jan2) asia window = UTC [Jan2 23:00, Jan3 05:00): b7 contributes
  // 120/80, closes via rollover at b8 (UTC Jan3 05:00 = ET Jan3 00:00).
  const candles: Candle[] = [
    candle(DAY1_00 + 12 * HOUR, 100, 101, 99, 100), // b0: ET Jan1 07:00 — before window
    candle(DAY1_00 + 22 * HOUR, 100, 101, 99, 100), // b1: ET Jan1 17:00 — before window
    candle(DAY1_00 + 23 * HOUR, 105, 110, 90, 108), // b2: ET Jan1 18:00 — window starts
    candle(DAY1_00 + 25 * HOUR, 106, 108, 92, 104), // b3: ET Jan1 20:00 — in window
    candle(DAY1_00 + 28 * HOUR, 100, 105, 95, 101), // b4: ET Jan1 23:00 — in window (last Jan1 bar)
    candle(DAY1_00 + 29 * HOUR, 101, 103, 99, 102), // b5: ET Jan2 00:00 — day rolls over, Jan1 window (110/90) now exposed
    candle(DAY1_00 + 44 * HOUR, 102, 104, 100, 103), // b6: ET Jan2 15:00 — before Jan2's window, still reads 110/90
    candle(DAY1_00 + 47 * HOUR, 103, 120, 80, 118), // b7: ET Jan2 18:00 — Jan2 window starts (still exposes 110/90 THIS bar)
    candle(DAY1_00 + 53 * HOUR, 118, 119, 117, 118), // b8: ET Jan3 00:00 — rollover, Jan2 window (120/80) now exposed
  ];

  it('is NaN before the first completed window, then holds 110/90 through Jan2 until Jan2s window closes', () => {
    const b = bank(candles);
    const high = b.getSeries({ type: 'sessionHigh', sessionName: 'asia' });
    const low = b.getSeries({ type: 'sessionLow', sessionName: 'asia' });

    for (const i of [0, 1, 2, 3, 4]) {
      expect(Number.isNaN(high[i]), `asia high[${i}]`).toBe(true);
      expect(Number.isNaN(low[i]), `asia low[${i}]`).toBe(true);
    }
    for (const i of [5, 6, 7]) {
      expect(high[i], `asia high[${i}]`).toBeCloseTo(110, 9);
      expect(low[i], `asia low[${i}]`).toBeCloseTo(90, 9);
    }
    expect(high[8], 'asia high[8]').toBeCloseTo(120, 9);
    expect(low[8], 'asia low[8]').toBeCloseTo(80, 9);
  });

  it('is truncated-prefix invariant up to the first rollover (bar 5)', () => {
    assertPrefixInvariant(candles, { type: 'sessionHigh', sessionName: 'asia' }, 5);
    assertPrefixInvariant(candles, { type: 'sessionLow', sessionName: 'asia' }, 5);
  });

  it('unnamed sessionHigh/sessionLow (no sessionName) are unaffected — different cache entry', () => {
    const b = bank(candles);
    const namedHigh = b.getSeries({ type: 'sessionHigh', sessionName: 'asia' });
    const plainHigh = b.getSeries({ type: 'sessionHigh' });
    // Plain sessionHigh is the CURRENT-day running high using bars strictly
    // before i — a completely different series from the named-session one.
    expect(namedHigh).not.toBe(plainHigh);
  });
});

describe('LevelBank named session — london (02:00-05:00 ET), mid-day close', () => {
  // London window = UTC [Jan1 07:00, Jan1 10:00) = ET [02:00, 05:00). Closes
  // via the minutes>=endMin branch WITHIN the same ET day (never needs the
  // day-rollover branch) — the OTHER closing path from the asia test above.
  const candles: Candle[] = [
    candle(DAY1_00 + 6 * HOUR, 100, 101, 99, 100), // c0: ET 01:00 — before window
    candle(DAY1_00 + 7 * HOUR, 100, 115, 95, 110), // c1: ET 02:00 — window starts
    candle(DAY1_00 + 9 * HOUR, 110, 118, 93, 112), // c2: ET 04:00 — in window, new extremes
    candle(DAY1_00 + 10 * HOUR, 112, 113, 108, 111), // c3: ET 05:00 — window closes HERE (minutes>=endMin)
    candle(DAY1_00 + 11 * HOUR, 111, 112, 109, 110), // c4: ET 06:00 — first bar to see the completed window
  ];

  it('is NaN through the closing bar itself, then exposes 118/93 starting the NEXT bar', () => {
    const b = bank(candles);
    const high = b.getSeries({ type: 'sessionHigh', sessionName: 'london' });
    const low = b.getSeries({ type: 'sessionLow', sessionName: 'london' });

    for (const i of [0, 1, 2, 3]) {
      expect(Number.isNaN(high[i]), `london high[${i}]`).toBe(true);
      expect(Number.isNaN(low[i]), `london low[${i}]`).toBe(true);
    }
    expect(high[4], 'london high[4]').toBeCloseTo(118, 9);
    expect(low[4], 'london low[4]').toBeCloseTo(93, 9);
  });
});
