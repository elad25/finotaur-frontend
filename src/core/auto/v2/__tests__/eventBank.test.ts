// ============================================================================
// EVENT BANK — DETERMINISTIC GOLDEN TESTS + LOOK-AHEAD INVARIANT
// ============================================================================
//
// Conventions mirror `../../__tests__/detectors.test.ts`. Fixtures reuse the
// SAME swing pivot shape used across the v1 detector tests (pivot at index 2,
// k=2, confirms at index 4) so the causal swing discipline is exercised
// identically to the rest of the auto-backtest suite.
// ============================================================================

import { describe, it, expect } from 'vitest';
import type { Candle } from '../../../../components/ReplayChart/types';
import { EventBank, wickRejection } from '../EventBank';

function candle(i: number, open: number, high: number, low: number, close: number): Candle {
  return { time: 1_700_000_000 + i * 900, open, high, low, close, volume: 1 };
}

// ============================================================================
// engulfing
// ============================================================================

describe('EventBank.engulfing', () => {
  it('detects a bullish engulfing (+1): prior bearish body fully engulfed', () => {
    const candles: Candle[] = [
      candle(0, 100, 106, 99, 100), // filler
      candle(1, 105, 106, 99, 100), // bearish body [100,105]
      candle(2, 99, 108, 98, 107), // bullish body [99,107] engulfs [100,105]
    ];
    const bankInst = new EventBank(candles);
    expect(bankInst.engulfing[2]).toBe(1);
  });

  it('detects a bearish engulfing (-1): prior bullish body fully engulfed', () => {
    const candles: Candle[] = [
      candle(0, 100, 106, 99, 100),
      candle(1, 100, 106, 99, 105), // bullish body [100,105]
      candle(2, 107, 108, 97, 98), // bearish body [98,107] engulfs [100,105]
    ];
    const bankInst = new EventBank(candles);
    expect(bankInst.engulfing[2]).toBe(-1);
  });

  it('is 0 when the body does not fully engulf the prior body', () => {
    const candles: Candle[] = [
      candle(0, 100, 106, 99, 100),
      candle(1, 100, 106, 99, 105), // bullish body [100,105]
      candle(2, 101, 107, 96, 104), // bearish-ish but body [101,104] does NOT cover [100,105]
    ];
    const bankInst = new EventBank(candles);
    expect(bankInst.engulfing[2]).toBe(0);
  });

  it('is always 0 at index 0 (no prior bar)', () => {
    const candles: Candle[] = [candle(0, 100, 101, 99, 100)];
    const bankInst = new EventBank(candles);
    expect(bankInst.engulfing[0]).toBe(0);
  });
});

// ============================================================================
// insideBar
// ============================================================================

describe('EventBank.insideBar', () => {
  it('is 1 when bar i is fully contained within bar i-1', () => {
    const candles: Candle[] = [
      candle(0, 100, 110, 95, 105),
      candle(1, 106, 108, 97, 107), // high 108<=110, low 97>=95 -> inside
    ];
    const bankInst = new EventBank(candles);
    expect(bankInst.insideBar[1]).toBe(1);
  });

  it('is 0 when bar i breaks outside bar i-1 on either side', () => {
    const candles: Candle[] = [
      candle(0, 100, 110, 95, 105),
      candle(1, 106, 112, 97, 107), // high 112 > 110 -> NOT inside
    ];
    const bankInst = new EventBank(candles);
    expect(bankInst.insideBar[1]).toBe(0);
  });
});

// ============================================================================
// wickRejection (parametric, pure function — not a precomputed array)
// ============================================================================

describe('wickRejection', () => {
  it('detects a bullish rejection: long lower wick >= ratio * body', () => {
    // body = |102-100| = 2; lower wick = 100-90 = 10 -> ratio 5 >= 2 (default).
    const candles: Candle[] = [candle(0, 100, 103, 90, 102)];
    expect(wickRejection(candles, 0, { direction: 1 })).toBe(true);
  });

  it('rejects when the wick:body ratio is below the threshold', () => {
    // body = 2; lower wick = 100-97 = 3 -> ratio 1.5 < default 2.
    const candles: Candle[] = [candle(0, 100, 103, 97, 102)];
    expect(wickRejection(candles, 0, { direction: 1 })).toBe(false);
  });

  it('with a level: requires the wick to pierce it and the body to close back beyond it', () => {
    // Wick low=90 pierces level=95; body bottom=100 > 95 -> qualifies.
    const candles: Candle[] = [candle(0, 100, 103, 90, 102)];
    expect(wickRejection(candles, 0, { direction: 1, level: 95 })).toBe(true);
    // Level=101 is INSIDE the body -> body did not close back beyond it -> fails.
    expect(wickRejection(candles, 0, { direction: 1, level: 101 })).toBe(false);
  });
});

// ============================================================================
// mss / choch — structure-shift + reversal events
// ============================================================================

describe('EventBank.mss / .choch', () => {
  // Swing HIGH pivot at idx2 (high=110), confirmed at idx4.
  // Swing LOW pivot at idx6 (low=95), confirmed at idx8.
  // idx7: close=119 > 110 -> bullish mss (regime 0->1), NOT a choch (no prior regime).
  // idx11: close=82 < 95 -> bearish mss (regime 1->-1) AND a choch (reversal).
  const candles: Candle[] = [
    candle(0, 100, 101, 99, 100),
    candle(1, 100, 106, 99.5, 105),
    candle(2, 105, 110, 104, 109), // swing HIGH pivot (high=110), confirms @4
    candle(3, 109, 109.5, 104, 105),
    candle(4, 104, 105, 101, 102),
    candle(5, 102, 103, 100, 101),
    candle(6, 101, 102, 95, 96), // swing LOW pivot (low=95), confirms @8
    candle(7, 96, 120, 95.5, 119), // close 119 > 110 -> bullish mss
    candle(8, 119, 121, 117, 120),
    candle(9, 120, 121, 110, 111),
    candle(10, 111, 112, 108, 109),
    candle(11, 109, 110, 80, 82), // close 82 < 95 -> bearish mss + choch (reversal)
    candle(12, 82, 83, 78, 80),
    candle(13, 80, 81, 77, 79),
  ];

  it('fires bullish mss at idx7 (close breaks the confirmed swing high)', () => {
    const bankInst = new EventBank(candles, { swingLookback: 2 });
    expect(bankInst.mss[7]).toBe(1);
    // Not a choch: no prior directional regime to reverse.
    expect(bankInst.choch[7]).toBe(0);
  });

  it('fires bearish mss AND choch at idx11 (reversal of the idx7 bullish regime)', () => {
    const bankInst = new EventBank(candles, { swingLookback: 2 });
    expect(bankInst.mss[11]).toBe(-1);
    expect(bankInst.choch[11]).toBe(-1);
  });

  it('does not re-fire mss on bars after idx7 that stay above the same broken swing', () => {
    const bankInst = new EventBank(candles, { swingLookback: 2 });
    expect(bankInst.mss[8]).toBe(0);
    expect(bankInst.mss[9]).toBe(0);
    expect(bankInst.mss[10]).toBe(0);
  });
});

// ============================================================================
// sweep — wick pierces a confirmed swing, close reclaims/rejects back
// ============================================================================

describe('EventBank.sweep', () => {
  it('fires a bearish sweep (-1): wicks above a confirmed swing HIGH, closes back below it', () => {
    // Identical shape to detectors.test.ts's buySideSweepSeries: swing high
    // (idx2, price 110, confirms @4); idx7 wicks to 112 but closes at 104.
    const candles: Candle[] = [
      candle(0, 100, 101, 99, 100),
      candle(1, 100, 106, 99.5, 105),
      candle(2, 105, 110, 104, 109), // swing high (110), confirms @4
      candle(3, 109, 109.5, 104, 105),
      candle(4, 105, 106, 103, 104),
      candle(5, 104, 105, 102, 103),
      candle(6, 103, 104, 101, 102),
      candle(7, 102, 112, 101, 104), // SWEEP: high 112 > 110, close 104 < 110
      candle(8, 104, 105, 100, 101),
    ];
    const bankInst = new EventBank(candles, { swingLookback: 2 });
    expect(bankInst.sweep[7]).toBe(-1);
  });

  it('fires a bullish sweep (+1): wicks below a confirmed swing LOW, closes back above it', () => {
    // Mirror image: swing low (idx2, price 90, confirms @4); idx7 wicks to 88
    // but closes back at 96.
    const candles: Candle[] = [
      candle(0, 100, 101, 99, 100),
      candle(1, 100, 100.5, 94, 95),
      candle(2, 95, 96, 90, 91), // swing low (90), confirms @4
      candle(3, 91, 95.5, 90.5, 95),
      candle(4, 95, 97, 94, 96),
      candle(5, 96, 98, 95, 97),
      candle(6, 97, 99, 96, 98),
      candle(7, 98, 99, 88, 96), // SWEEP: low 88 < 90, close 96 > 90
      candle(8, 96, 99, 95, 98),
    ];
    const bankInst = new EventBank(candles, { swingLookback: 2 });
    expect(bankInst.sweep[7]).toBe(1);
  });

  it('does NOT fire when the wick never exceeds the confirmed swing', () => {
    const candles: Candle[] = [
      candle(0, 100, 101, 99, 100),
      candle(1, 100, 106, 99.5, 105),
      candle(2, 105, 110, 104, 109), // swing high (110), confirms @4
      candle(3, 109, 109.5, 104, 105),
      candle(4, 105, 106, 103, 104),
      candle(5, 104, 105, 102, 103),
      candle(6, 103, 104, 101, 102),
      candle(7, 102, 108, 101, 104), // high 108 < 110 -> NO sweep
      candle(8, 104, 105, 100, 101),
    ];
    const bankInst = new EventBank(candles, { swingLookback: 2 });
    expect(bankInst.sweep[7]).toBe(0);
  });
});

// ============================================================================
// Truncated-prefix invariance
// ============================================================================

describe('EventBank truncated-prefix invariance (no look-ahead)', () => {
  const candles: Candle[] = [
    candle(0, 100, 101, 99, 100),
    candle(1, 100, 106, 99.5, 105),
    candle(2, 105, 110, 104, 109), // swing high, confirms @4
    candle(3, 109, 109.5, 104, 105),
    candle(4, 104, 105, 101, 102),
    candle(5, 102, 103, 100, 101),
    candle(6, 101, 102, 95, 96), // swing low, confirms @8
    candle(7, 96, 120, 95.5, 119), // bullish mss
    candle(8, 119, 121, 117, 120),
    candle(9, 120, 121, 110, 111),
    candle(10, 111, 112, 108, 109),
    candle(11, 109, 110, 80, 82), // bearish mss + choch
    candle(12, 82, 83, 78, 80),
  ];

  function assertArraysAgreeOnOverlap(
    full: Int8Array | Uint8Array,
    prefix: Int8Array | Uint8Array,
    prefixLen: number,
    label: string,
  ): void {
    for (let i = 0; i < prefixLen; i++) {
      expect(full[i], `${label}[${i}]: full=${full[i]} prefix=${prefix[i]}`).toBe(prefix[i]);
    }
  }

  it('engulfing/insideBar/mss/choch/sweep all agree between full series and a prefix', () => {
    const prefixLen = 9; // cut just after the bullish mss at idx7
    const fullBank = new EventBank(candles, { swingLookback: 2 });
    const prefixBank = new EventBank(candles.slice(0, prefixLen), { swingLookback: 2 });

    assertArraysAgreeOnOverlap(fullBank.engulfing, prefixBank.engulfing, prefixLen, 'engulfing');
    assertArraysAgreeOnOverlap(fullBank.insideBar, prefixBank.insideBar, prefixLen, 'insideBar');
    assertArraysAgreeOnOverlap(fullBank.mss, prefixBank.mss, prefixLen, 'mss');
    assertArraysAgreeOnOverlap(fullBank.choch, prefixBank.choch, prefixLen, 'choch');
    assertArraysAgreeOnOverlap(fullBank.sweep, prefixBank.sweep, prefixLen, 'sweep');
  });

  it('also holds for a prefix cut BEFORE the reversal at idx11', () => {
    const prefixLen = 12; // includes idx11's reversal, excludes idx12+
    const fullBank = new EventBank(candles, { swingLookback: 2 });
    const prefixBank = new EventBank(candles.slice(0, prefixLen), { swingLookback: 2 });

    assertArraysAgreeOnOverlap(fullBank.mss, prefixBank.mss, prefixLen, 'mss');
    assertArraysAgreeOnOverlap(fullBank.choch, prefixBank.choch, prefixLen, 'choch');
  });
});
