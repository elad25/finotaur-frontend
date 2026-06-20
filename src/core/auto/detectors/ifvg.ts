// ============================================================================
// INVERTED FAIR VALUE GAP (IFVG) DETECTOR
// ============================================================================
//
// ICT DEFINITION
// --------------
// First a normal FVG forms. Later, price trades back and CLOSES THROUGH the far
// side of that gap, "inverting" it: a former bullish-FVG support that gets
// closed below becomes resistance (short bias), and vice-versa. The original
// gap zone is retained but the trade direction flips.
//
// LOOK-AHEAD GUARANTEE
// --------------------
// We detect base FVGs via the FVG detector (each formedAtIndex = its 3rd bar).
// We then scan FORWARD from that bar looking for the first close-through bar j,
// reading candles only up to j. The inverted detection's formedAtIndex = j, so
// no future data beyond confirmation is used. maxAgeBars bounds the scan.
// ============================================================================

import type { Candle } from '../../../components/ReplayChart/types';
import type { MarketContext } from '../MarketContext';
import type { Detection, IFVGParams, FVGParams } from '../types';
import { detect as detectFvg } from './fvg';

export function detect(
  candles: Candle[],
  ctx: MarketContext,
  params: IFVGParams,
): Detection[] {
  const out: Detection[] = [];
  const n = candles.length;

  // Reuse the base FVG detector with the embedded baseFvg config.
  const baseParams: FVGParams = { type: 'FVG', ...params.baseFvg };
  const baseFvgs = detectFvg(candles, ctx, baseParams);

  for (const base of baseFvgs) {
    const formedAt = base.formedAtIndex;
    const maxScan = Math.min(n - 1, formedAt + params.maxAgeBars);

    // The "far side" relative to the ORIGINAL direction:
    // bullish FVG -> inversion when price closes BELOW the gap bottom.
    // bearish FVG -> inversion when price closes ABOVE the gap top.
    const wasBullish = base.direction === 'long';
    const breakLevel = wasBullish ? base.zone.bottom : base.zone.top;

    for (let j = formedAt + 1; j <= maxScan; j++) {
      const closesThrough = wasBullish
        ? candles[j].close < breakLevel
        : candles[j].close > breakLevel;

      // If confirmCloseThrough is off, a wick through the level also counts.
      const wicksThrough = wasBullish
        ? candles[j].low < breakLevel
        : candles[j].high > breakLevel;

      const triggered = params.confirmCloseThrough ? closesThrough : wicksThrough;
      if (!triggered) continue;

      out.push({
        patternType: 'IFVG',
        direction: wasBullish ? 'short' : 'long', // flipped
        formedAtIndex: j,
        zone: { top: base.zone.top, bottom: base.zone.bottom },
        meta: {
          baseFormedAtIndex: formedAt,
          baseDirection: base.direction,
          breakLevel,
        },
      });
      break; // first inversion only
    }
  }

  return out;
}
