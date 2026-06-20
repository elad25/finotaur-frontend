// ============================================================================
// DETECTOR REGISTRY — dispatch PatternParams to its detector
// ============================================================================
//
// Each detector is a pure function (candles, ctx, params) -> Detection[]. This
// registry fans a setup's pattern list out to the matching detectors and merges
// the results, sorted by formedAtIndex so the engine can consume them in the
// same forward order it scans candles.
// ============================================================================

import type { Candle } from '../../../components/ReplayChart/types';
import type { MarketContext } from '../MarketContext';
import type { Detection, PatternParams } from '../types';
import { detect as detectFvg } from './fvg';
import { detect as detectIfvg } from './ifvg';
import { detect as detectOb } from './orderBlock';
import { detect as detectLiquidity } from './liquidity';
import { detect as detectBreaker } from './breaker';

export function runDetectors(
  patterns: PatternParams[],
  candles: Candle[],
  ctx: MarketContext,
): Detection[] {
  const all: Detection[] = [];

  for (const p of patterns) {
    switch (p.type) {
      case 'FVG':
        all.push(...detectFvg(candles, ctx, p));
        break;
      case 'IFVG':
        all.push(...detectIfvg(candles, ctx, p));
        break;
      case 'OB':
        all.push(...detectOb(candles, ctx, p));
        break;
      case 'LIQUIDITY':
        all.push(...detectLiquidity(candles, ctx, p));
        break;
      case 'BREAKER':
        all.push(...detectBreaker(candles, ctx, p));
        break;
      default: {
        // Exhaustiveness guard — if a new PatternType is added without a
        // detector branch, this line fails to compile.
        const _never: never = p;
        void _never;
      }
    }
  }

  all.sort((a, b) => a.formedAtIndex - b.formedAtIndex);
  return all;
}
