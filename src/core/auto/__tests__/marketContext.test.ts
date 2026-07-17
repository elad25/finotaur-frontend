// ============================================================================
// MARKET CONTEXT — UNIT TESTS
// ============================================================================
//
// Unit-tests MarketContext.build in isolation: ATR finiteness/positivity,
// causal-confirmation of swings (a pivot at index p only becomes visible via
// lastConfirmedSwingHigh/Low starting at bar p+k, never before), and the
// session filter for a known timestamp/timezone.
//
// Conventions follow detectors.test.ts: `c()` candle factory (time in
// SECONDS, journal/UTCTimestamp convention).
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { Candle } from '../../../components/ReplayChart/types';
import type { BiasFilter, SessionFilter } from '../types';
import { MarketContext } from '../MarketContext';

function c(
  i: number,
  open: number,
  high: number,
  low: number,
  close: number,
): Candle {
  return { time: 1_700_000_000 + i * 900, open, high, low, close, volume: 1 };
}

// ============================================================================
// (a) ATR — finite and positive on a non-degenerate series
// ============================================================================

describe('MarketContext.atr', () => {
  it('is finite and positive at every bar for a series with real range', () => {
    const candles: Candle[] = [
      c(0, 100, 104, 98, 102),
      c(1, 102, 106, 100, 104),
      c(2, 104, 108, 101, 106),
      c(3, 106, 109, 103, 107),
      c(4, 107, 111, 104, 109),
      c(5, 109, 112, 106, 110),
    ];
    const ctx = MarketContext.build(candles, { swingLookback: 2, atrPeriod: 14 });

    expect(ctx.atr).toHaveLength(candles.length);
    for (let i = 0; i < candles.length; i++) {
      expect(Number.isFinite(ctx.atr[i]), `atr[${i}] not finite: ${ctx.atr[i]}`).toBe(true);
      expect(ctx.atr[i], `atr[${i}] not positive: ${ctx.atr[i]}`).toBeGreaterThan(0);
    }
  });

  it('is 0 (not NaN/Infinity) for a completely flat series (zero true range)', () => {
    const candles: Candle[] = [
      c(0, 100, 100, 100, 100),
      c(1, 100, 100, 100, 100),
      c(2, 100, 100, 100, 100),
    ];
    const ctx = MarketContext.build(candles, { swingLookback: 1, atrPeriod: 14 });
    for (let i = 0; i < candles.length; i++) {
      expect(Number.isFinite(ctx.atr[i])).toBe(true);
      expect(ctx.atr[i]).toBe(0);
    }
  });
});

// ============================================================================
// (b) Confirmed swings are causal
// ============================================================================

describe('MarketContext confirmed-swing causality', () => {
  it('a swing high pivot at index p is NOT visible via lastConfirmedSwingHigh before bar p+k', () => {
    // k=2 fractal: pivot at index 2 (high=110), needs candles at 0,1,3,4 to
    // be strictly lower -> confirms at bar p+k = 4.
    const candles: Candle[] = [
      c(0, 100, 101, 99, 100),
      c(1, 100, 106, 99.5, 105),
      c(2, 105, 110, 104, 109), // pivot candidate (high=110)
      c(3, 109, 109.5, 104, 105),
      c(4, 105, 105.5, 101, 102),
      c(5, 102, 103, 100, 101),
    ];
    const ctx = MarketContext.build(candles, { swingLookback: 2, atrPeriod: 14 });

    // Confirm the pivot actually formed at index 2.
    expect(ctx.swingHighs[2]).toBe(true);

    // BEFORE confirmation (bars 0,1,2,3): lastConfirmedSwingHigh must be null
    // or must NOT reference index 2 (it wasn't confirmed yet).
    for (let i = 0; i < 4; i++) {
      const s = ctx.lastConfirmedSwingHigh(i);
      expect(
        s === null || s.index !== 2,
        `bar ${i}: pivot at index 2 leaked before its confirmation bar (4)`,
      ).toBe(true);
    }

    // AT and AFTER confirmation (bar 4 onward): the pivot IS visible.
    for (let i = 4; i < candles.length; i++) {
      const s = ctx.lastConfirmedSwingHigh(i);
      expect(s).not.toBeNull();
      expect(s!.index).toBe(2);
      expect(s!.price).toBeCloseTo(110, 9);
    }
  });

  it('a swing low pivot at index p is NOT visible via lastConfirmedSwingLow before bar p+k', () => {
    // k=2 fractal: pivot at index 3 (low=85), confirms at bar 3+2=5.
    const candles: Candle[] = [
      c(0, 100, 101, 95, 96),
      c(1, 96, 97, 92, 93),
      c(2, 93, 94, 88, 89),
      c(3, 89, 90, 85, 86), // pivot candidate (low=85)
      c(4, 86, 91, 86, 90),
      c(5, 90, 95, 89, 94),
      c(6, 94, 98, 93, 97),
    ];
    const ctx = MarketContext.build(candles, { swingLookback: 2, atrPeriod: 14 });

    expect(ctx.swingLows[3]).toBe(true);

    for (let i = 0; i < 5; i++) {
      const s = ctx.lastConfirmedSwingLow(i);
      expect(
        s === null || s.index !== 3,
        `bar ${i}: pivot at index 3 leaked before its confirmation bar (5)`,
      ).toBe(true);
    }

    for (let i = 5; i < candles.length; i++) {
      const s = ctx.lastConfirmedSwingLow(i);
      expect(s).not.toBeNull();
      expect(s!.index).toBe(3);
      expect(s!.price).toBeCloseTo(85, 9);
    }
  });

  it('confirmedSwingHighsUpTo/LowsUpTo never include a pivot confirmed after the queried bar', () => {
    const candles: Candle[] = [
      c(0, 100, 101, 99, 100),
      c(1, 100, 106, 99.5, 105),
      c(2, 105, 110, 104, 109), // high pivot @2, confirms @4
      c(3, 109, 109.5, 104, 105),
      c(4, 105, 105.5, 101, 102),
      c(5, 102, 103, 100, 101),
    ];
    const ctx = MarketContext.build(candles, { swingLookback: 2, atrPeriod: 14 });

    for (let i = 0; i < candles.length; i++) {
      const highs = ctx.confirmedSwingHighsUpTo(i);
      for (const h of highs) {
        // Every returned pivot's own confirmation point (index + k) must be
        // <= the queried bar i. We don't have direct access to confirmedAt
        // here, but by construction index + swingLookback <= i must hold.
        expect(h.index + 2).toBeLessThanOrEqual(i);
      }
    }
  });
});

// ============================================================================
// (c) Session filter — known timestamp/timezone
// ============================================================================

describe('MarketContext.sessionAllowed', () => {
  it('all bars allowed when session filter is disabled', () => {
    const candles: Candle[] = [c(0, 100, 101, 99, 100), c(1, 100, 102, 99, 101)];
    const ctx = MarketContext.build(candles, {
      swingLookback: 2,
      atrPeriod: 14,
      session: { enabled: false, timezone: 'America/New_York', windows: [] },
    });
    expect(ctx.sessionAllowed).toEqual([true, true]);
  });

  it('flags a bar inside a configured UTC window as allowed, and outside as disallowed', () => {
    // 1_700_000_000s = 2023-11-14T22:13:20Z. Use UTC timezone so the local
    // wall-clock minutes are deterministic and easy to reason about.
    const baseSec = 1_700_000_000;
    const knownDate = new Date(baseSec * 1000);
    const utcHour = knownDate.getUTCHours();
    const utcMinute = knownDate.getUTCMinutes();
    const minutesOfDay = utcHour * 60 + utcMinute;

    // Build a window that STARTS exactly at this bar's minute-of-day and
    // spans 60 minutes, so bar 0 is inside and a bar 3 hours later is outside.
    const startH = Math.floor(minutesOfDay / 60);
    const startM = minutesOfDay % 60;
    const endMinutesOfDay = (minutesOfDay + 60) % (24 * 60);
    const endH = Math.floor(endMinutesOfDay / 60);
    const endM = endMinutesOfDay % 60;
    const pad = (n: number) => String(n).padStart(2, '0');

    const session: SessionFilter = {
      enabled: true,
      timezone: 'UTC',
      windows: [{ start: `${pad(startH)}:${pad(startM)}`, end: `${pad(endH)}:${pad(endM)}` }],
    };

    const candles: Candle[] = [
      { time: baseSec, open: 100, high: 101, low: 99, close: 100, volume: 1 }, // inside window
      { time: baseSec + 3 * 60 * 60, open: 100, high: 101, low: 99, close: 100, volume: 1 }, // 3h later -> outside
    ];

    const ctx = MarketContext.build(candles, {
      swingLookback: 2,
      atrPeriod: 14,
      session,
    });

    expect(ctx.sessionAllowed[0]).toBe(true);
    expect(ctx.sessionAllowed[1]).toBe(false);
  });

  it('respects the `days` allowlist (weekday filter)', () => {
    // baseSec = 1_700_000_000 -> 2023-11-14 (a Tuesday, UTC weekday=2).
    const baseSec = 1_700_000_000;
    const knownDate = new Date(baseSec * 1000);
    const utcWeekday = knownDate.getUTCDay(); // 0=Sun..6=Sat, Tue=2

    const otherWeekday = (utcWeekday + 1) % 7; // a day this bar is NOT on

    const session: SessionFilter = {
      enabled: true,
      timezone: 'UTC',
      windows: [{ start: '00:00', end: '23:59' }], // whole day allowed
      days: [otherWeekday], // but only a DIFFERENT weekday is permitted
    };

    const candles: Candle[] = [
      { time: baseSec, open: 100, high: 101, low: 99, close: 100, volume: 1 },
    ];
    const ctx = MarketContext.build(candles, { swingLookback: 2, atrPeriod: 14, session });

    // The bar's actual weekday is excluded from `days` -> disallowed.
    expect(ctx.sessionAllowed[0]).toBe(false);
  });
});

// ============================================================================
// (d) HTF bias — closed-bar causality (Fix 1: no look-ahead into a still-
//     forming HTF bar's close)
// ============================================================================

describe('MarketContext.htfBias — closed-bar semantics', () => {
  // A single flat-price candle at a given time. Only `close` matters for the
  // 'ema' bias method (emaLength=1 makes ema[i] === close[i], so bias[i] is
  // simply sign(close[i] - close[i-1])).
  function mkCandle(time: number, close: number): Candle {
    return { time, open: close, high: close + 1, low: close - 1, close, volume: 1 };
  }

  const T = 1_700_000_000; // arbitrary base, seconds (journal convention)
  const HTF_DURATION_SEC = 4 * 60 * 60; // '4h' = 14400s

  // Three 4h HTF bars, back-to-back with no gaps:
  //   htf0: opens T,          closes T+14400  (close=100 -> bias always 0, first bar)
  //   htf1: opens T+14400,    closes T+28800  (close=90  -> bias -1, since 90 < 100)
  //   htf2: opens T+28800,    closes T+43200  (close=200 -> bias +1, since 200 > 90)
  const htf0 = mkCandle(T, 100);
  const htf1 = mkCandle(T + HTF_DURATION_SEC, 90);
  const htf2 = mkCandle(T + 2 * HTF_DURATION_SEC, 200);
  const htfCandles: Candle[] = [htf0, htf1, htf2];

  const bias: BiasFilter = {
    enabled: true,
    htfTimeframe: '4h',
    method: 'ema',
    emaLength: 1,
  };

  it('never reads a still-forming HTF bar\'s close -- uses the previous CLOSED bar\'s bias instead', () => {
    // LTF (5m) bars probing every relevant instant relative to the 3 HTF bars.
    const ltf: Candle[] = [
      mkCandle(T, 1), // idx0: htf0 not closed yet -> neutral
      mkCandle(T + 14_000, 1), // idx1: still inside htf0 (closes at T+14400) -> neutral
      mkCandle(T + HTF_DURATION_SEC, 1), // idx2: htf0 JUST closed (boundary, <=) -> bias[htf0]=0
      mkCandle(T + 2 * HTF_DURATION_SEC, 1), // idx3: htf1 JUST closed -> bias[htf1]=-1
      mkCandle(T + 2 * HTF_DURATION_SEC + 1_200, 1), // idx4: INSIDE forming htf2 (closes at T+43200) -> must still read htf1's bias (-1), NOT htf2's future +1
      mkCandle(T + 3 * HTF_DURATION_SEC, 1), // idx5: htf2 JUST closed -> bias[htf2]=+1
    ];

    const ctx = MarketContext.build(ltf, {
      swingLookback: 2,
      atrPeriod: 14,
      bias,
      htfCandles,
    });

    expect(ctx.htfBias[0]).toBe(0);
    expect(ctx.htfBias[1]).toBe(0);
    expect(ctx.htfBias[2]).toBe(0); // htf0 closed, but htf0's own bias is neutral (first bar)
    expect(ctx.htfBias[3]).toBe(-1); // htf1 closed -> its bias (-1) becomes visible
    // THE critical assertion: idx4 sits strictly inside htf2's still-forming
    // window. Under the old open-time alignment bug, htf2.open (T+28800) <=
    // this bar's time would have advanced the pointer to htf2 and leaked its
    // eventual (+1) bias -- a look-ahead bug. Closed-bar semantics must keep
    // reading htf1's bias (-1) until htf2 actually closes at idx5.
    expect(ctx.htfBias[4]).toBe(-1);
    expect(ctx.htfBias[5]).toBe(1); // htf2 closed -> its bias (+1) becomes visible
  });

  it('is neutral (0) for every LTF bar before the first HTF bar has closed', () => {
    const ltf: Candle[] = [
      mkCandle(T, 1),
      mkCandle(T + 1_000, 1),
      mkCandle(T + HTF_DURATION_SEC - 1, 1), // 1 second before htf0 closes
    ];
    const ctx = MarketContext.build(ltf, {
      swingLookback: 2,
      atrPeriod: 14,
      bias,
      htfCandles,
    });
    expect(ctx.htfBias).toEqual([0, 0, 0]);
  });

  it('truncated-prefix invariance: dropping the still-forming HTF bar does not change bias for LTF bars that never needed it', () => {
    // Same LTF probe bars as the causality test, but stop BEFORE the point
    // that needs htf2 closed (i.e. exclude idx5 from the causality test).
    const ltf: Candle[] = [
      mkCandle(T, 1),
      mkCandle(T + 14_000, 1),
      mkCandle(T + HTF_DURATION_SEC, 1),
      mkCandle(T + 2 * HTF_DURATION_SEC, 1),
      mkCandle(T + 2 * HTF_DURATION_SEC + 1_200, 1),
    ];

    const fullCtx = MarketContext.build(ltf, {
      swingLookback: 2,
      atrPeriod: 14,
      bias,
      htfCandles, // full 3-bar HTF series (includes the still-forming htf2)
    });

    // Truncate the HTF series at the last CLOSED bar relative to this LTF
    // range (htf1) -- i.e. drop the still-forming/future htf2 entirely, the
    // way a live/incremental run would look mid-way through htf2's window.
    const truncatedHtfCandles = htfCandles.slice(0, 2); // [htf0, htf1] only

    const truncCtx = MarketContext.build(ltf, {
      swingLookback: 2,
      atrPeriod: 14,
      bias,
      htfCandles: truncatedHtfCandles,
    });

    // Every LTF bar in this range is derivable purely from htf0/htf1 (none of
    // them ever needed htf2 to have closed) -> bias must be IDENTICAL whether
    // or not htf2 is present in the input at all.
    expect(truncCtx.htfBias).toEqual(fullCtx.htfBias);
  });
});
