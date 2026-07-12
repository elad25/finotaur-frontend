// src/pages/app/trading-arena/components/domLadderMath.ts
//
// Pure math for DomLadder.tsx's price grid: tick inference, display-
// precision inference, the row-size auto heuristic, and integer-bucket row
// anchoring. No React, no DOM — mirrors depthProfileGutterMath.ts's
// convention (pure engine, independently unit-testable, imported not
// duplicated).
//
// Why this exists (production-verified bugs this file fixes):
//   1. Rows used to be exactly ONE TICK each — for BTCUSDT (tick $0.01)
//      that's a $0.20 window at depthCount=10 against a market moving
//      dollars/sec, so the ladder recentered constantly. `computeAutoRowSize`
//      aggregates many ticks into one row, sized to the instrument's own
//      price scale.
//   2. Row prices used to be plain `idx * tick` float arithmetic, which
//      produces garbage like 64178.15996638 once tick/rowSize aren't
//      power-of-ten-clean numbers. `rowIndexToPrice` re-rounds to the row
//      size's own decimal precision so drift never reaches a render or a
//      React `key`.

const TICK_SAMPLE_DEPTH = 50;

/**
 * Minimum positive gap between adjacent sampled price levels (top ~50/side).
 * Falls back to a price-relative epsilon when the book is too thin to
 * sample (fresh connection, one-sided book, etc.).
 */
export function inferTickSize(
  bids: Map<number, number>,
  asks: Map<number, number>,
  lastPrice: number | null,
): number {
  const prices: number[] = [];
  let i = 0;
  for (const p of bids.keys()) {
    prices.push(p);
    if (++i >= TICK_SAMPLE_DEPTH) break;
  }
  i = 0;
  for (const p of asks.keys()) {
    prices.push(p);
    if (++i >= TICK_SAMPLE_DEPTH) break;
  }

  const fallback = lastPrice != null && lastPrice > 0 ? lastPrice * 1e-6 : 0.01;
  if (prices.length < 2) return fallback;

  const sorted = Array.from(new Set(prices)).sort((a, b) => a - b);
  let minGap = Infinity;
  for (let idx = 1; idx < sorted.length; idx++) {
    const gap = sorted[idx] - sorted[idx - 1];
    if (gap > 0 && gap < minGap) minGap = gap;
  }

  return Number.isFinite(minGap) && minGap > 0 ? minGap : fallback;
}

/** Number of decimal places a positive step value (tick or rowSize) needs for display. */
export function decimalsForStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 2;
  const str = step.toString();
  if (str.includes('e-')) {
    const exp = str.split('e-')[1];
    return Math.min(8, parseInt(exp, 10) || 2);
  }
  const dot = str.indexOf('.');
  return dot === -1 ? 0 : Math.min(8, str.length - dot - 1);
}

// ─── Auto row-size heuristic ────────────────────────────────────────────

/** Row-width target as a fraction of price — "roughly 2 basis points". */
const AUTO_ROW_SIZE_BPS_FRACTION = 0.0002;

/** The "nice increment" series every auto/snap value is drawn from: 1, 2, 5 × 10^n. */
const NICE_STEP_MULTIPLIERS = [1, 2, 5] as const;

/**
 * Largest value of the form m×10^n (m ∈ {1,2,5}) that does not exceed
 * `target` — i.e. "snap down to a nice increment". Returns 0 for a
 * non-finite or non-positive target.
 */
export function niceStepAtOrBelow(target: number): number {
  if (!Number.isFinite(target) || target <= 0) return 0;
  const exponent = Math.floor(Math.log10(target));
  let best = 0;
  for (const e of [exponent - 1, exponent, exponent + 1]) {
    for (const m of NICE_STEP_MULTIPLIERS) {
      // Round to 10 significant digits first — Math.pow(10, e) for negative
      // e can land a hair off (e.g. 5×10^-2 → 0.05000000000000001), which
      // would otherwise pollute the <= compare below.
      const candidate = Number((m * Math.pow(10, e)).toPrecision(10));
      if (candidate <= target + 1e-9 && candidate > best) best = candidate;
    }
  }
  return best;
}

/**
 * Auto row-size: target ~2bp of price, snapped down to the nice-increment
 * series, floored at the inferred tick (a row can never be finer than the
 * book's own granularity).
 *
 * Hysteresis: once a `prevAutoRowSize` is established, only switch to a NEW
 * nice value once the raw (pre-snap) target has moved a full
 * `prevAutoRowSize` width away from it. A plain re-snap-every-tick would
 * flap between two adjacent nice values whenever price oscillates around
 * their shared boundary (e.g. target bouncing across 2.0 between the 1 and
 * 2 steps) — this deadband keeps the row grid stable.
 */
export function computeAutoRowSize(
  price: number | null,
  tick: number,
  prevAutoRowSize: number | null,
): number {
  const safeTick = tick > 0 ? tick : 0.01;
  if (price == null || !Number.isFinite(price) || price <= 0) {
    return prevAutoRowSize ?? safeTick;
  }

  const target = price * AUTO_ROW_SIZE_BPS_FRACTION;
  const snapped = Math.max(niceStepAtOrBelow(target), safeTick);

  if (prevAutoRowSize == null || prevAutoRowSize <= 0) return snapped;
  if (snapped === prevAutoRowSize) return prevAutoRowSize;

  const movedAwayFromPrev = Math.abs(target - prevAutoRowSize) >= prevAutoRowSize;
  return movedAwayFromPrev ? snapped : prevAutoRowSize;
}

// ─── Row-grid anchoring (integer-bucket, float-drift-safe) ─────────────────

/** Bucket index for a raw price at the given row size (nearest-row rounding). */
export function priceToRowIndex(price: number, rowSize: number): number {
  return Math.round(price / rowSize);
}

/**
 * Row price for a bucket index — integer `idx * rowSize` arithmetic, then
 * re-rounded to the row size's own decimal precision so accumulated
 * floating-point noise never reaches a rendered label or a React `key`
 * (fixes the production-verified `64178.15996638` garbage-price bug).
 */
export function rowIndexToPrice(idx: number, rowSize: number, decimals: number): number {
  const raw = idx * rowSize;
  return Number(raw.toFixed(decimals));
}

/**
 * Resolves the effective row size in PRICE units from the persisted
 * preference. A numeric preference is a TICK MULTIPLE (symbol-agnostic
 * persistence — see useDomPreferences.ts's `rowSize` doc comment), so the
 * price-unit row size is simply multiplier × tick; `'auto'` defers to
 * `computeAutoRowSize`.
 */
export function resolveRowSizeDollars(
  rowSizePref: 'auto' | number,
  tick: number,
  lastPrice: number | null,
  prevAutoRowSize: number | null,
): number {
  const safeTick = tick > 0 ? tick : 0.01;
  if (rowSizePref === 'auto') {
    return computeAutoRowSize(lastPrice, safeTick, prevAutoRowSize);
  }
  const multiplier = rowSizePref > 0 ? rowSizePref : 1;
  return Math.max(safeTick, multiplier * safeTick);
}

/** Formats a row price with fixed decimals + thousands separators (matches TapeTab.tsx's formatPrice convention). */
export function formatLadderPrice(price: number, decimals: number): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
