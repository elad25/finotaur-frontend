// ============================================================================
// FAIR VALUE GAP (FVG) DETECTOR
// ============================================================================
//
// ICT DEFINITION
// --------------
// A 3-candle imbalance. Bullish FVG: the LOW of candle i is strictly above the
// HIGH of candle i-2, leaving an unfilled gap [high[i-2], low[i]] created by a
// strong middle (impulse) candle i-1. Bearish FVG is the mirror: high[i] is
// strictly below low[i-2], gap [high[i], low[i-2]].
//
// LOOK-AHEAD GUARANTEE
// --------------------
// The gap is fully defined by candles {i-2, i-1, i}. We emit formedAtIndex = i
// and never read any candle with index > i. Mitigation/age handling is left to
// the engine (which only ever inspects bars >= formedAtIndex going forward).
// ============================================================================

import type { Candle } from '../../../components/ReplayChart/types';
import type { MarketContext } from '../MarketContext';
import type { Detection, FVGParams } from '../types';

export function detect(
  candles: Candle[],
  ctx: MarketContext,
  params: FVGParams,
): Detection[] {
  const out: Detection[] = [];
  const n = candles.length;

  for (let i = 2; i < n; i++) {
    const c0 = candles[i - 2];
    const c2 = candles[i];
    const refClose = candles[i - 1].close || c2.close; // denominator guard

    // ---- Bullish FVG: low[i] > high[i-2] -------------------------------
    if (c2.low > c0.high) {
      const bottom = c0.high;
      const top = c2.low;
      if (passesGap(top, bottom, refClose, params, ctx, i)) {
        out.push({
          patternType: 'FVG',
          direction: 'long',
          formedAtIndex: i,
          zone: { top, bottom },
          meta: {
            gapPct: refClose > 0 ? ((top - bottom) / refClose) * 100 : 0,
            impulseBody: ctx.body(i - 1),
          },
        });
      }
    }

    // ---- Bearish FVG: high[i] < low[i-2] -------------------------------
    if (c2.high < c0.low) {
      const bottom = c2.high;
      const top = c0.low;
      if (passesGap(top, bottom, refClose, params, ctx, i)) {
        out.push({
          patternType: 'FVG',
          direction: 'short',
          formedAtIndex: i,
          zone: { top, bottom },
          meta: {
            gapPct: refClose > 0 ? ((top - bottom) / refClose) * 100 : 0,
            impulseBody: ctx.body(i - 1),
          },
        });
      }
    }
  }

  return out;
}

/**
 * Gap-size + displacement gate. `minGapPct` is interpreted as a percentage
 * (0.05 = 0.05%), matching the rest of the config surface.
 */
function passesGap(
  top: number,
  bottom: number,
  refClose: number,
  params: FVGParams,
  ctx: MarketContext,
  i: number,
): boolean {
  const gap = top - bottom;
  if (gap <= 0) return false;

  const gapPct = refClose > 0 ? (gap / refClose) * 100 : 0;
  const atrPrev = ctx.atr[i - 1] || 0;
  const meetsPct = gapPct >= params.minGapPct;
  const meetsAtr =
    params.minGapAtrMult !== undefined &&
    atrPrev > 0 &&
    gap >= params.minGapAtrMult * atrPrev;

  if (!meetsPct && !meetsAtr) return false;

  if (params.requireDisplacement) {
    // The middle candle (i-1) is the impulse that created the gap.
    if (atrPrev <= 0) return false;
    if (ctx.body(i - 1) < params.displacementBodyMult * atrPrev) return false;
  }

  return true;
}
