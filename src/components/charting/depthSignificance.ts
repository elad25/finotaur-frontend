// src/components/charting/depthSignificance.ts
//
// Pure significance-mapping helpers for the depth-matrix heatmap (Phase 1 of
// the "no manual thresholds" overhaul — see LiquidityTab.tsx / DepthMatrixLayer.tsx
// for the callers). No canvas/react/DOM dependencies — unit-testable in
// isolation. Two concerns, kept intentionally separate:
//
//   1. dustCutoffUsd — a PAYLOAD bound applied at the SAMPLING layer
//      (useDepthSlices.ts). Removes only technically-negligible bins (a
//      handful of dollars resting on a level) so the wire payload / render
//      grid isn't paying for literal noise. This is NOT a display filter —
//      it never hides a real, meaningfully-sized resting order; the data
//      going into the renderer is "(almost) everything" by design.
//
//   2. softKneeAlpha — a CONTINUOUS visibility curve applied at RENDER time
//      (DepthMatrixLayer.tsx). Replaces the old binary WEAK_CELL_T_CAP
//      dimming (a bin either cleared a threshold and rendered at full
//      intensity, or got clamped to a flat faint cap). Every cell above the
//      dust cutoff is still painted — its alpha just ramps smoothly from
//      faint (near the noise floor) to fully opaque (at/above the knee).
//      Nothing is hidden; nothing snaps.

/** Fraction of a column/side's total notional used as the raw dust threshold before clamping. */
export const DUST_PCT = 0.0002; // 0.02%
/** Absolute floor for the dust cutoff — never treats less than this as "dust" even for a tiny column. */
export const DUST_MIN_USD = 10;
/** Absolute ceiling for the dust cutoff — never treats more than this as "dust" even for a whale column. */
export const DUST_MAX_USD = 2_000;

/**
 * Technical dust threshold for one sampled column/side: 0.02% of that
 * column's TOTAL notional (sum of all its bin notionals), clamped to
 * [DUST_MIN_USD, DUST_MAX_USD]. This is a payload bound, not a display
 * filter — it exists so a column with one $50M whale bin doesn't also carry
 * thousands of sub-$1 resting-order bins that are computational noise, not
 * signal. Bins that clear this still render at full continuous intensity
 * via softKneeAlpha below — nothing above dust is ever hidden.
 */
export function dustCutoffUsd(binNotionals: number[]): number {
  let total = 0;
  for (const n of binNotionals) {
    if (Number.isFinite(n) && n > 0) total += n;
  }
  const raw = total * DUST_PCT;
  return Math.min(DUST_MAX_USD, Math.max(DUST_MIN_USD, raw));
}

/**
 * Continuous per-cell alpha for the depth-matrix render: a smoothstep ramp
 * from `minAlpha` (usd → 0) up to 1.0 (usd >= kneeUsd). Replaces the old
 * binary "dim to a flat cap below a threshold" behavior — a cell just under
 * the knee is nearly-full-alpha, not snapped to a flat floor value, so the
 * book's continuous shape reads naturally with no visible seam at the knee.
 * `kneeUsd <= 0` (no meaningful knee — e.g. an empty/degenerate window)
 * returns full alpha rather than dividing by zero.
 */
export function softKneeAlpha(usd: number, kneeUsd: number, minAlpha = 0.18): number {
  if (!Number.isFinite(usd) || usd <= 0) return minAlpha;
  if (!Number.isFinite(kneeUsd) || kneeUsd <= 0) return 1;
  const x = Math.min(1, Math.max(0, usd / kneeUsd));
  const smooth = x * x * (3 - 2 * x); // smoothstep
  return minAlpha + (1 - minAlpha) * smooth;
}
