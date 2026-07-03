/**
 * drawings2/geometry.ts
 *
 * Pure, unit-testable geometry helpers for the drawing engine.
 * No chart/DOM dependencies — safe to import from node-env tests.
 */

/** A candidate OHLC price already projected to a pixel Y coordinate. */
export interface SnapCandidate {
  price: number;
  y: number;
}

/**
 * Given a pointer's Y pixel and a list of OHLC candidate Y-projections,
 * return the candidate nearest to the pointer (magnet / snap-to-OHLC).
 * Returns null when there are no candidates to snap to.
 */
export function snapToOHLC(py: number, candidates: SnapCandidate[]): SnapCandidate | null {
  if (candidates.length === 0) return null;
  let best = candidates[0];
  let bestDist = Math.abs(py - best.y);
  for (let i = 1; i < candidates.length; i++) {
    const dist = Math.abs(py - candidates[i].y);
    if (dist < bestDist) {
      best = candidates[i];
      bestDist = dist;
    }
  }
  return best;
}
