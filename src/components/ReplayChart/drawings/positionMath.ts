// drawings/positionMath.ts
// Shared math helper for Long/Short Position drawing tools.
// All values derived from drawing.points; drawing.risk holds only qty / accountSize overrides.

import { Drawing } from '../types';

export interface PositionStats {
  direction: 'long' | 'short';
  entry: number;
  stop: number;
  target: number;
  qty: number;
  /** abs(entry - stop) */
  riskPerUnit: number;
  /** abs(target - entry) */
  rewardPerUnit: number;
  /** rewardPerUnit / riskPerUnit  (0 when riskPerUnit === 0) */
  rr: number;
  /** riskPerUnit * qty */
  riskAmount: number;
  /** rewardPerUnit * qty */
  rewardAmount: number;
  /** riskAmount / accountSize * 100  (defined only when accountSize is set) */
  riskPct?: number;
}

/**
 * Derive entry / stop / target from drawing.points and qty / accountSize from
 * drawing.risk.  Returns null when fewer than 3 points are present (mid-draw).
 *
 * Points convention:
 *   points[0] = entry price
 *   points[1] = stop price
 *   points[2] = target price
 *
 * Direction:
 *   'short-position' → short, everything else → long
 */
export function computePositionStats(drawing: Drawing): PositionStats | null {
  if (drawing.points.length < 3) return null;

  const entry  = drawing.points[0].price;
  const stop   = drawing.points[1].price;
  const target = drawing.points[2].price;

  const direction: 'long' | 'short' =
    drawing.type === 'short-position' ? 'short' : 'long';

  const qty         = drawing.risk?.qty ?? 1;
  const accountSize = drawing.risk?.accountSize;

  const riskPerUnit   = Math.abs(entry - stop);
  const rewardPerUnit = Math.abs(target - entry);
  const rr            = riskPerUnit > 0 ? rewardPerUnit / riskPerUnit : 0;
  const riskAmount    = riskPerUnit * qty;
  const rewardAmount  = rewardPerUnit * qty;
  const riskPct       =
    accountSize != null && accountSize > 0
      ? (riskAmount / accountSize) * 100
      : undefined;

  return {
    direction,
    entry,
    stop,
    target,
    qty,
    riskPerUnit,
    rewardPerUnit,
    rr,
    riskAmount,
    rewardAmount,
    riskPct,
  };
}
