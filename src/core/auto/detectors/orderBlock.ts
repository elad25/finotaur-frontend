// ============================================================================
// ORDER BLOCK (OB) DETECTOR
// ============================================================================
//
// ICT DEFINITION
// --------------
// A bullish order block is the last DOWN candle immediately before an up-side
// displacement that breaks structure (closes above the most recent confirmed
// swing high). The full range of that down candle [low, high] becomes a demand
// zone. Bearish OB is the mirror: last UP candle before a down displacement
// that closes below the most recent confirmed swing low -> supply zone.
//
// LOOK-AHEAD GUARANTEE
// --------------------
// The displacement bar i is the confirmation bar; formedAtIndex = i. We only
// look BACKWARD from i to find the origin candle k (k < i) and we compare i's
// close against a swing confirmed at or before i-1. No candle with index > i is
// ever read.
// ============================================================================

import type { Candle } from '../../../components/ReplayChart/types';
import type { MarketContext } from '../MarketContext';
import type { Detection, OBParams } from '../types';

export function detect(
  candles: Candle[],
  ctx: MarketContext,
  params: OBParams,
): Detection[] {
  const out: Detection[] = [];
  const n = candles.length;
  const mult = params.displacementBodyMult;

  for (let i = 1; i < n; i++) {
    // ---- Bullish OB: up-displacement breaking the last swing high -------
    const upDisp = !params.requireDisplacementOut
      ? candles[i].close > candles[i].open
      : ctx.isUpDisplacement(i, mult);
    if (upDisp) {
      const swingHigh = ctx.lastConfirmedSwingHigh(i - 1);
      if (swingHigh && candles[i].close > swingHigh.price) {
        const origin = findOriginCandle(candles, i, params.obKind, 'bullish');
        if (origin >= 0) {
          out.push({
            patternType: 'OB',
            direction: 'long',
            formedAtIndex: i,
            zone: { top: candles[origin].high, bottom: candles[origin].low },
            refSwing: { index: origin, price: candles[origin].low },
            meta: {
              originIndex: origin,
              brokeSwingHighIndex: swingHigh.index,
              obKind: params.obKind,
            },
          });
        }
      }
    }

    // ---- Bearish OB: down-displacement breaking the last swing low ------
    const downDisp = !params.requireDisplacementOut
      ? candles[i].close < candles[i].open
      : ctx.isDownDisplacement(i, mult);
    if (downDisp) {
      const swingLow = ctx.lastConfirmedSwingLow(i - 1);
      if (swingLow && candles[i].close < swingLow.price) {
        const origin = findOriginCandle(candles, i, params.obKind, 'bearish');
        if (origin >= 0) {
          out.push({
            patternType: 'OB',
            direction: 'short',
            formedAtIndex: i,
            zone: { top: candles[origin].high, bottom: candles[origin].low },
            refSwing: { index: origin, price: candles[origin].high },
            meta: {
              originIndex: origin,
              brokeSwingLowIndex: swingLow.index,
              obKind: params.obKind,
            },
          });
        }
      }
    }
  }

  return out;
}

/**
 * Walk back from the impulse bar `i` to find the order-block origin candle.
 * - 'last-opposite-candle': last candle (before i) of the opposite color.
 * - 'last-down-before-up' (bullish) / last-up-before-down (bearish): same
 *   semantics for the relevant direction; treated identically here since the
 *   "opposite candle" of an up-impulse is precisely the last down candle.
 * Returns the origin index, or -1 if none found within a reasonable lookback.
 */
function findOriginCandle(
  candles: Candle[],
  i: number,
  _obKind: OBParams['obKind'],
  side: 'bullish' | 'bearish',
): number {
  const MAX_BACK = 10; // bounded backward search
  const start = Math.max(0, i - MAX_BACK);
  for (let k = i - 1; k >= start; k--) {
    const isDown = candles[k].close < candles[k].open;
    const isUp = candles[k].close > candles[k].open;
    if (side === 'bullish' && isDown) return k; // last down candle before up
    if (side === 'bearish' && isUp) return k; // last up candle before down
  }
  return -1;
}
