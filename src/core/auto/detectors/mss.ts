// ============================================================================
// MSS / STRUCTURE HELPERS — shared, causal market-structure utilities
// ============================================================================
//
// LOOK-AHEAD GUARANTEE
// --------------------
// Every function here scans forward from a given `fromIndex` and returns the
// FIRST bar index at which a structural event occurs, reading candles only up
// to and including that returned bar. Callers must treat the returned index as
// the event's `formedAtIndex` and never reference bars beyond it.
// ============================================================================

import type { Candle } from '../../../components/ReplayChart/types';
import type { MarketContext } from '../MarketContext';

/**
 * Find the first bar at or after `fromIndex` whose CLOSE breaks BELOW the most
 * recent confirmed swing low (bearish market-structure shift). Returns the bar
 * index, or null if none up to `until` (inclusive).
 *
 * Causal: the "reference swing low" at each scan bar `i` is the last swing low
 * confirmed at or before `i`, so no future data leaks in.
 */
export function findBearishMSS(
  candles: Candle[],
  ctx: MarketContext,
  fromIndex: number,
  until: number,
): number | null {
  const end = Math.min(until, candles.length - 1);
  for (let i = Math.max(0, fromIndex); i <= end; i++) {
    const swingLow = ctx.lastConfirmedSwingLow(i);
    if (swingLow && swingLow.index < i && candles[i].close < swingLow.price) {
      return i;
    }
  }
  return null;
}

/**
 * Find the first bar at or after `fromIndex` whose CLOSE breaks ABOVE the most
 * recent confirmed swing high (bullish market-structure shift). Returns the bar
 * index, or null.
 */
export function findBullishMSS(
  candles: Candle[],
  ctx: MarketContext,
  fromIndex: number,
  until: number,
): number | null {
  const end = Math.min(until, candles.length - 1);
  for (let i = Math.max(0, fromIndex); i <= end; i++) {
    const swingHigh = ctx.lastConfirmedSwingHigh(i);
    if (swingHigh && swingHigh.index < i && candles[i].close > swingHigh.price) {
      return i;
    }
  }
  return null;
}
