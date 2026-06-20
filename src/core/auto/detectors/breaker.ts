// ============================================================================
// BREAKER BLOCK DETECTOR (composed: OB -> sweep -> MSS)
// ============================================================================
//
// ICT DEFINITION
// --------------
// A breaker is a failed order block that price returns to from the other side.
// The canonical sequence:
//   1. An order block forms (an OB candle attached to a swing).
//   2. Liquidity is swept beyond that OB's attached swing (stop run).
//   3. A market-structure shift (MSS) prints in the OPPOSITE direction to the
//      original OB, confirming the flip.
// On all three, the original OB zone becomes a breaker with the FLIPPED bias.
//
// LOOK-AHEAD GUARANTEE
// --------------------
// Each stage strictly follows the previous in time (OB.formedAtIndex < sweep <
// MSS). The breaker's formedAtIndex = the MSS bar, and no candle beyond it is
// read. requireLiquiditySweep / requireMSS toggles relax the chain but never
// allow using future data past the emitted formedAtIndex.
// ============================================================================

import type { Candle } from '../../../components/ReplayChart/types';
import type { MarketContext } from '../MarketContext';
import type { Detection, BreakerParams, OBParams } from '../types';
import { detect as detectOb } from './orderBlock';
import { findBearishMSS, findBullishMSS } from './mss';

export function detect(
  candles: Candle[],
  ctx: MarketContext,
  params: BreakerParams,
): Detection[] {
  const out: Detection[] = [];
  const n = candles.length;
  const SCAN = 30; // bounded forward search for sweep + MSS

  // Find candidate order blocks (both directions) to flip into breakers.
  const obParams: OBParams = {
    type: 'OB',
    swing: params.swing,
    obKind: 'last-opposite-candle',
    requireDisplacementOut: true,
    displacementBodyMult: 1.5,
    mitigation: 'none',
    maxAgeBars: params.maxAgeBars,
  };
  const obs = detectOb(candles, ctx, obParams);

  for (const ob of obs) {
    const obFormed = ob.formedAtIndex;
    const scanEnd = Math.min(n - 1, obFormed + params.maxAgeBars);

    // The OB is attached to a swing (refSwing). The breaker forms when that
    // swing's liquidity is swept and structure flips against the OB.
    const obIsBullish = ob.direction === 'long';

    // Step 2 — liquidity sweep of the OB's attached swing.
    let sweepBar = obFormed + 1;
    if (params.requireLiquiditySweep) {
      const sweep = findSweepAgainstOb(candles, ctx, ob, obFormed + 1, scanEnd, obIsBullish);
      if (sweep === null) continue;
      sweepBar = sweep;
    }

    // Step 3 — MSS opposite to the original OB direction.
    let formedAt = sweepBar;
    if (params.requireMSS) {
      const mss = obIsBullish
        ? findBearishMSS(candles, ctx, sweepBar + 1, Math.min(scanEnd, sweepBar + SCAN))
        : findBullishMSS(candles, ctx, sweepBar + 1, Math.min(scanEnd, sweepBar + SCAN));
      if (mss === null) continue;
      formedAt = mss;
    }

    out.push({
      patternType: 'BREAKER',
      direction: obIsBullish ? 'short' : 'long', // flipped from the OB
      formedAtIndex: formedAt,
      zone: { top: ob.zone.top, bottom: ob.zone.bottom },
      refSwing: ob.refSwing,
      meta: {
        obFormedAtIndex: obFormed,
        obDirection: ob.direction,
        sweepBarIndex: sweepBar,
      },
    });
  }

  return out;
}

/**
 * Find the first bar in (from..until] that sweeps the OB's attached swing.
 * For a bullish OB (demand) the breaker flips bearish, so we look for a sweep
 * BELOW the OB's swing low; for a bearish OB, a sweep ABOVE its swing high.
 */
function findSweepAgainstOb(
  candles: Candle[],
  _ctx: MarketContext,
  ob: Detection,
  from: number,
  until: number,
  obIsBullish: boolean,
): number | null {
  const level = ob.refSwing
    ? ob.refSwing.price
    : obIsBullish
      ? ob.zone.bottom
      : ob.zone.top;
  const end = Math.min(until, candles.length - 1);
  for (let i = Math.max(0, from); i <= end; i++) {
    if (obIsBullish && candles[i].low < level) return i;
    if (!obIsBullish && candles[i].high > level) return i;
  }
  return null;
}
