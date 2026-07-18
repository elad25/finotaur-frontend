// ============================================================================
// V2 SWING HELPER — confirmed-pivot computation shared by LevelBank + EventBank
// ============================================================================
//
// Adapted from the private `computeFractals` / `collectConfirmed` helpers in
// `../MarketContext.ts` (neither is exported there, so the same discipline is
// re-implemented here rather than imported — v1 stays untouched). Identical
// confirm-at-pivot+k rule: a strict-fractal pivot at bar `p` only becomes
// CONFIRMED at bar `p + k`, because it needs `k` bars on EACH side to qualify
// as a local extreme. Callers must never treat a pivot as known before its
// `confirmedAt` bar — that is the entire look-ahead-safety contract of this
// module and of every bank built on top of it (LevelBank, EventBank).
// ============================================================================

import type { Candle } from '../../../components/ReplayChart/types';

/** A confirmed swing pivot (swing high or swing low). */
export interface ConfirmedSwing {
  /** Bar index of the pivot candle itself. */
  index: number;
  /** Pivot price (candle `high` for swing highs, `low` for swing lows). */
  price: number;
  /**
   * Bar index at which this pivot became knowable without look-ahead
   * (`index + k`). Consumers must gate on `confirmedAt <= i` before reading
   * a pivot for bar `i`.
   */
  confirmedAt: number;
}

/**
 * Compute strict-fractal confirmed swing highs/lows for a candle series.
 *
 * A bar `i` (with `k <= i < n - k`) is a swing HIGH iff `candles[i].high` is
 * the STRICT maximum over `[i-k, i+k]`, and a swing LOW iff `candles[i].low`
 * is the STRICT minimum over the same window. Both lists are returned sorted
 * ascending by `confirmedAt` (equivalent to ascending by `index`, since
 * `confirmedAt = index + k` is a monotonic offset).
 *
 * @param candles Full candle series (chronological, ascending time).
 * @param k Fractal half-width. Clamped to >= 1 and floored.
 */
export function computeConfirmedSwings(
  candles: Candle[],
  k: number,
): { highs: ConfirmedSwing[]; lows: ConfirmedSwing[] } {
  const kk = Math.max(1, Math.floor(k));
  const n = candles.length;
  const highs: ConfirmedSwing[] = [];
  const lows: ConfirmedSwing[] = [];

  for (let i = kk; i < n - kk; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    let isHigh = true;
    let isLow = true;
    for (let j = i - kk; j <= i + kk; j++) {
      if (j === i) continue;
      if (candles[j].high >= h) isHigh = false;
      if (candles[j].low <= l) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) highs.push({ index: i, price: h, confirmedAt: i + kk });
    if (isLow) lows.push({ index: i, price: l, confirmedAt: i + kk });
  }
  return { highs, lows };
}

/**
 * Build a Float64Array where `out[i]` is the price of the `nth`-most-recent
 * swing pivot CONFIRMED at or before bar `i` (1 = most recent), or `NaN` if
 * fewer than `nth` pivots have been confirmed yet. Causal by construction:
 * only pivots with `confirmedAt <= i` are ever visible at index `i`.
 *
 * @param length Output array length (== candle series length).
 * @param confirmed Ascending-by-`confirmedAt` list of confirmed pivots (as
 *   returned by {@link computeConfirmedSwings}).
 * @param nth 1-based recency rank (1 = latest, 2 = second-latest, ...).
 */
export function nthMostRecentSwingSeries(
  length: number,
  confirmed: ConfirmedSwing[],
  nth: number,
): Float64Array {
  const rank = Math.max(1, Math.floor(nth));
  const out = new Float64Array(length).fill(NaN);
  const recentPrices: number[] = [];
  let ptr = 0;
  for (let i = 0; i < length; i++) {
    while (ptr < confirmed.length && confirmed[ptr].confirmedAt <= i) {
      recentPrices.push(confirmed[ptr].price);
      if (recentPrices.length > rank) recentPrices.shift();
      ptr++;
    }
    out[i] = recentPrices.length >= rank ? recentPrices[recentPrices.length - rank] : NaN;
  }
  return out;
}
