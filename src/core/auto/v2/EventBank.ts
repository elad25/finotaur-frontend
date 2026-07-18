// ============================================================================
// EVENT BANK — precomputed CAUSAL price-action event arrays (v2)
// ============================================================================
//
// LOOK-AHEAD GUARANTEE
// --------------------
// Every array here is index-aligned to the candle series passed to the
// constructor. `engulfing[i]` and `insideBar[i]` read only candles `i-1..i`.
// `mss[i]`, `choch[i]`, `sweep[i]` read only pivots CONFIRMED at or before
// `i` (via `./swings.ts`'s `confirmedAt` gate) plus candle `i` itself — same
// causal discipline as `MarketContext.lastConfirmedSwingHigh/Low` and the
// scan-based helpers in `../detectors/mss.ts` (credited inline below).
// `wickRejection()` is a pure per-bar function, not a precomputed array — it
// reads only candle `i` (and an optional caller-supplied `level`), so it
// carries no look-ahead risk regardless of when it's called.
//
// DIRECTION CONVENTION (all Int8Array outputs: -1 | 0 | +1)
// -----------------------------------------------------------------------
//  - engulfing : +1 bullish engulfing (bull body engulfs a bear body),
//                -1 bearish engulfing, 0 none.
//  - mss       : +1 bullish market-structure-shift (close breaks ABOVE the
//                active confirmed swing high), -1 bearish (close breaks
//                BELOW the active confirmed swing low), 0 none. Each
//                specific swing pivot fires AT MOST ONCE (the bar where its
//                break is first confirmed by a close) — mirrors
//                `findBullishMSS`/`findBearishMSS` in `../detectors/mss.ts`,
//                which return the FIRST qualifying bar for a scan window;
//                here that "first bar" property is baked into a per-bar
//                array by tracking, per direction, which swing pivot index
//                already fired.
//  - choch     : subset of `mss` events that represent a REVERSAL of the
//                running regime (the previous non-zero mss direction was
//                the OPPOSITE sign). A same-direction mss (trend
//                continuation / "break of structure") is NOT a choch.
//  - sweep     : +1 bullish sweep (price wicks BELOW a confirmed swing LOW
//                — sell-side liquidity taken — but CLOSES back at/above it:
//                a reclaim/rejection, bullish signal), -1 bearish sweep
//                (wicks ABOVE a confirmed swing HIGH — buy-side liquidity
//                taken — but closes back at/below it). Unlike `mss`, sweep
//                events are NOT deduplicated per swing: a genuine wick+
//                reclaim can recur against the same still-active pivot.
// ============================================================================

import type { Candle } from '../../../components/ReplayChart/types';
import { computeConfirmedSwings } from './swings';
import type { ConfirmedSwing } from './swings';

/** Options controlling EventBank's causal-event computation. */
export interface EventBankOptions {
  /** Fractal half-width (k) used for the swing pivots that back `mss`,
   *  `choch`, and `sweep`. Default 2 — matches v1's swing discipline. */
  swingLookback?: number;
}

/** Parameters for the parametric `wickRejection` helper. */
export interface WickRejectionParams {
  /** 1 = bullish rejection (long lower wick, price rejected UP).
   *  -1 = bearish rejection (long upper wick, price rejected DOWN). */
  direction: 1 | -1;
  /** Rejecting wick must be >= this multiple of the candle's body size.
   *  Default 2. A zero/near-zero body is treated as satisfying the ratio
   *  as long as the wick itself is strictly positive (avoids a division- or
   *  comparison-degenerate doji case silently failing every check). */
  wickBodyRatio?: number;
  /** Optional price level the wick must have pierced AND the body must have
   *  closed back on the far side of, to qualify as a rejection OF that
   *  specific level (rather than just "a long-wicked candle somewhere"). */
  level?: number;
}

export class EventBank {
  /** +1 bullish / -1 bearish / 0 none. See module doc for the exact rule. */
  readonly engulfing: Int8Array;
  /** 1 if bar i's range is fully contained within bar i-1's range, else 0. */
  readonly insideBar: Uint8Array;
  /** +1 bullish / -1 bearish / 0 none market-structure-shift event. */
  readonly mss: Int8Array;
  /** +1 bullish / -1 bearish / 0 none change-of-character (reversal mss). */
  readonly choch: Int8Array;
  /** +1 bullish / -1 bearish / 0 none liquidity sweep. */
  readonly sweep: Int8Array;

  constructor(candles: Candle[], opts: EventBankOptions = {}) {
    const k = Math.max(1, Math.floor(opts.swingLookback ?? 2));
    this.engulfing = computeEngulfing(candles);
    this.insideBar = computeInsideBar(candles);
    const { highs, lows } = computeConfirmedSwings(candles, k);
    const structure = computeStructureEvents(candles, highs, lows);
    this.mss = structure.mss;
    this.choch = structure.choch;
    this.sweep = computeSweep(candles, highs, lows);
  }
}

/**
 * Parametric, per-bar wick-rejection test (NOT precomputed — see module doc
 * for why). Returns true iff candle `i`'s rejecting-side wick (lower wick
 * for `direction: 1`, upper wick for `direction: -1`) is at least
 * `wickBodyRatio` times the candle's body, AND — when `level` is supplied —
 * the wick pierced `level` while the candle's body closed back on the far
 * side of it.
 */
export function wickRejection(candles: Candle[], i: number, params: WickRejectionParams): boolean {
  const candle = candles[i];
  const wickBodyRatio = params.wickBodyRatio ?? 2;
  const body = Math.abs(candle.close - candle.open);
  const bodyTop = Math.max(candle.open, candle.close);
  const bodyBottom = Math.min(candle.open, candle.close);
  const lowerWick = bodyBottom - candle.low;
  const upperWick = candle.high - bodyTop;
  const wick = params.direction === 1 ? lowerWick : upperWick;

  if (wick <= 0) return false;
  if (body > 0 && wick < wickBodyRatio * body) return false;

  if (params.level !== undefined) {
    if (params.direction === 1) {
      // Bullish rejection OF `level`: wick pierced at/below it, body closed
      // back above it.
      if (!(candle.low <= params.level && bodyBottom > params.level)) return false;
    } else {
      // Bearish rejection OF `level`: wick pierced at/above it, body closed
      // back below it.
      if (!(candle.high >= params.level && bodyTop < params.level)) return false;
    }
  }
  return true;
}

// ----------------------------------------------------------------------------
// Precomputed arrays
// ----------------------------------------------------------------------------

function computeEngulfing(candles: Candle[]): Int8Array {
  const n = candles.length;
  const out = new Int8Array(n);
  for (let i = 1; i < n; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];
    const curBull = cur.close > cur.open;
    const curBear = cur.close < cur.open;
    const prevBull = prev.close > prev.open;
    const prevBear = prev.close < prev.open;

    const curTop = Math.max(cur.open, cur.close);
    const curBottom = Math.min(cur.open, cur.close);
    const prevTop = Math.max(prev.open, prev.close);
    const prevBottom = Math.min(prev.open, prev.close);

    const bodyEngulfs = curTop >= prevTop && curBottom <= prevBottom && curTop > curBottom;
    if (!bodyEngulfs) continue;

    if (curBull && prevBear) out[i] = 1;
    else if (curBear && prevBull) out[i] = -1;
  }
  return out;
}

function computeInsideBar(candles: Candle[]): Uint8Array {
  const n = candles.length;
  const out = new Uint8Array(n);
  for (let i = 1; i < n; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];
    out[i] = cur.high <= prev.high && cur.low >= prev.low ? 1 : 0;
  }
  return out;
}

/**
 * Bar-by-bar market-structure-shift (`mss`) + change-of-character (`choch`)
 * events. Adapted from the SCAN-based `findBullishMSS`/`findBearishMSS` in
 * `../detectors/mss.ts` (credited there for the underlying rule: "first bar
 * whose close breaks the currently-active confirmed swing"), reshaped here
 * into a per-bar array by tracking, per direction, the pivot INDEX that last
 * fired — so a swing that has already broken does not re-fire every
 * subsequent bar while price remains extended beyond it.
 */
function computeStructureEvents(
  candles: Candle[],
  confirmedHighs: ConfirmedSwing[],
  confirmedLows: ConfirmedSwing[],
): { mss: Int8Array; choch: Int8Array } {
  const n = candles.length;
  const mss = new Int8Array(n);
  const choch = new Int8Array(n);

  let hi = 0;
  let lo = 0;
  let activeHigh: ConfirmedSwing | null = null;
  let activeLow: ConfirmedSwing | null = null;
  let lastFiredHighPivotIndex: number | null = null;
  let lastFiredLowPivotIndex: number | null = null;
  let regime = 0; // running: last non-zero mss direction seen.

  for (let i = 0; i < n; i++) {
    while (hi < confirmedHighs.length && confirmedHighs[hi].confirmedAt <= i) {
      activeHigh = confirmedHighs[hi];
      hi++;
    }
    while (lo < confirmedLows.length && confirmedLows[lo].confirmedAt <= i) {
      activeLow = confirmedLows[lo];
      lo++;
    }

    let fired = 0;
    if (
      activeHigh &&
      activeHigh.index < i &&
      candles[i].close > activeHigh.price &&
      lastFiredHighPivotIndex !== activeHigh.index
    ) {
      fired = 1;
      lastFiredHighPivotIndex = activeHigh.index;
    } else if (
      activeLow &&
      activeLow.index < i &&
      candles[i].close < activeLow.price &&
      lastFiredLowPivotIndex !== activeLow.index
    ) {
      fired = -1;
      lastFiredLowPivotIndex = activeLow.index;
    }

    if (fired !== 0) {
      mss[i] = fired as -1 | 1;
      choch[i] = regime !== 0 && regime !== fired ? (fired as -1 | 1) : 0;
      regime = fired;
    }
  }

  return { mss, choch };
}

/**
 * Bar-by-bar liquidity-sweep events. See module-level DIRECTION CONVENTION
 * doc for the +1/-1 meaning. Unlike `mss`, sweeps are NOT deduplicated per
 * pivot — each bar is independently tested against whichever swing is
 * currently active.
 */
function computeSweep(
  candles: Candle[],
  confirmedHighs: ConfirmedSwing[],
  confirmedLows: ConfirmedSwing[],
): Int8Array {
  const n = candles.length;
  const out = new Int8Array(n);

  let hi = 0;
  let lo = 0;
  let activeHigh: ConfirmedSwing | null = null;
  let activeLow: ConfirmedSwing | null = null;

  for (let i = 0; i < n; i++) {
    while (hi < confirmedHighs.length && confirmedHighs[hi].confirmedAt <= i) {
      activeHigh = confirmedHighs[hi];
      hi++;
    }
    while (lo < confirmedLows.length && confirmedLows[lo].confirmedAt <= i) {
      activeLow = confirmedLows[lo];
      lo++;
    }

    const candle = candles[i];
    if (activeHigh && activeHigh.index < i && candle.high > activeHigh.price && candle.close <= activeHigh.price) {
      out[i] = -1; // bearish: swept buy-side liquidity (highs), rejected down.
    } else if (
      activeLow &&
      activeLow.index < i &&
      candle.low < activeLow.price &&
      candle.close >= activeLow.price
    ) {
      out[i] = 1; // bullish: swept sell-side liquidity (lows), rejected up.
    }
  }

  return out;
}
