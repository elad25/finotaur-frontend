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

// ─── Line clipping (Ray / Extended line) ─────────────────────────────────────

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type ClipMode = 'none' | 'right' | 'both';

export interface ClippedSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Clip the (half-)infinite line through (x0,y0)→(x1,y1) to `rect`.
 *
 * mode === 'none'   → returns the original segment unmodified (trendline).
 * mode === 'right'  → extends the line past (x1,y1) to the rect's right edge
 *                     (or whichever edge the ray direction hits first),
 *                     keeping the (x0,y0) endpoint fixed (ray).
 * mode === 'both'   → extends the line infinitely in both directions,
 *                     clipped to the rect on both ends (extended_line).
 *
 * Degenerate cases (identical points, or perfectly vertical/horizontal
 * direction) are handled explicitly — a vertical line clips only in Y,
 * a horizontal line clips only in X.
 */
export function clipLineToRect(
  x0: number, y0: number,
  x1: number, y1: number,
  rect: Rect,
  mode: ClipMode,
): ClippedSegment {
  if (mode === 'none') return { x0, y0, x1, y1 };

  const dx = x1 - x0;
  const dy = y1 - y0;

  // Degenerate: zero-length segment — nothing to extend.
  if (dx === 0 && dy === 0) return { x0, y0, x1, y1 };

  // Parametrize the infinite line as P(t) = (x0,y0) + t*(dx,dy).
  // Endpoint A is at t=0, endpoint B is at t=1.
  // For 'right': extend only the B side (t >= 1) to the rect boundary.
  // For 'both': extend both sides (t <= 0 and t >= 1) to the rect boundary.

  function tAtEdge(): { tMin: number; tMax: number } {
    // Compute t-range such that P(t) stays within rect, expressed as the
    // intersection of per-axis t-intervals (standard line/box clipping).
    let tMin = -Infinity;
    let tMax = Infinity;

    if (dx !== 0) {
      const tx1 = (rect.left - x0) / dx;
      const tx2 = (rect.right - x0) / dx;
      tMin = Math.max(tMin, Math.min(tx1, tx2));
      tMax = Math.min(tMax, Math.max(tx1, tx2));
    } else {
      // Vertical line: x is constant. If x0 is outside [left,right], there's
      // no valid t — collapse the range so the caller renders nothing extra.
      if (x0 < rect.left || x0 > rect.right) return { tMin: 0, tMax: 0 };
    }

    if (dy !== 0) {
      const ty1 = (rect.top - y0) / dy;
      const ty2 = (rect.bottom - y0) / dy;
      tMin = Math.max(tMin, Math.min(ty1, ty2));
      tMax = Math.min(tMax, Math.max(ty1, ty2));
    } else {
      // Horizontal line: y is constant.
      if (y0 < rect.top || y0 > rect.bottom) return { tMin: 0, tMax: 0 };
    }

    return { tMin, tMax };
  }

  const { tMin, tMax } = tAtEdge();

  if (mode === 'right') {
    // Keep A fixed at t=0; extend B outward to the farthest valid t >= 1
    // (falls back to t=1, i.e. the original point, if the ray direction
    // points away from the rect or the rect bound is unreachable).
    const tEnd = Math.max(1, tMax);
    return {
      x0, y0,
      x1: x0 + tEnd * dx,
      y1: y0 + tEnd * dy,
    };
  }

  // mode === 'both': extend to the full valid t-range in both directions.
  const tA = Math.min(tMin, 0);
  const tB = Math.max(tMax, 1);
  return {
    x0: x0 + tA * dx,
    y0: y0 + tA * dy,
    x1: x0 + tB * dx,
    y1: y0 + tB * dy,
  };
}

// ─── Fibonacci retracement levels ────────────────────────────────────────────

/**
 * Compute the price for each retracement level between two anchor prices.
 *
 * Convention: level 0 = p1Price (the end/second anchor), level 1 = p0Price
 * (the start/first anchor) — i.e. `price = p1 + (p0 - p1) * level`. This
 * matches standard retracement tools where dragging from a swing low to a
 * swing high labels the high as 0% and the low as 100%.
 */
export function fibLevelPrices(p0Price: number, p1Price: number, levels: number[]): number[] {
  return levels.map(level => p1Price + (p0Price - p1Price) * level);
}

// ─── Parallel channel ────────────────────────────────────────────────────────

/** A minimal {time, price} triple — enough to compute the channel offset. */
export interface TimePricePoint {
  time: number;
  price: number;
}

/**
 * Compute the parallel-channel price offset of `p2` relative to the baseline
 * p0→p1, evaluated at p2's own time via linear interpolation along the
 * baseline in the time domain.
 *
 * offset = p2.price − baselinePriceAt(p2.time)
 *
 * Degenerate case: p0.time === p1.time (a vertical/zero-width baseline) has
 * no well-defined interpolation — fall back to using p0's price as the
 * baseline reference (offset = p2.price − p0.price) rather than dividing by
 * zero.
 */
export function channelOffset(
  p0: TimePricePoint,
  p1: TimePricePoint,
  p2: TimePricePoint,
): number {
  if (p1.time === p0.time) {
    return p2.price - p0.price;
  }
  const t = (p2.time - p0.time) / (p1.time - p0.time);
  const baselinePriceAtP2 = p0.price + (p1.price - p0.price) * t;
  return p2.price - baselinePriceAtP2;
}
