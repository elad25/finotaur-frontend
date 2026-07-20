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

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — persistence weighting (anti-flicker, anti-spoof)
// ─────────────────────────────────────────────────────────────────────────────
//
// A resting-book level that just appeared in the latest column is
// indistinguishable, at the single-column level, from a spoofed order that
// will be pulled a moment later. Rather than trusting every column equally,
// DepthMatrixLayer.tsx counts how many CONSECUTIVE columns (in time order) a
// price bin has been continuously present in, and dampens a freshly-appeared
// level's alpha until it has "proven" itself by persisting for a few columns.
// This is purely a render-time weighting — the underlying data is untouched.

/** Consecutive-column count at which a level is treated as fully persistent (alpha multiplier reaches 1.0). Default 6 ≈ 30s at 5s depth columns. */
export const PERSISTENCE_RAMP_COLUMNS_DEFAULT = 6;
/** Alpha multiplier applied to a level on its FIRST appearance (consecutiveColumns === 1) — dampened, not hidden. */
export const PERSISTENCE_MIN_FACTOR = 0.45;

/**
 * Smoothstep ramp from `PERSISTENCE_MIN_FACTOR` (a level that just appeared —
 * `consecutiveColumns <= 1`) up to `1.0` (a level that has persisted for
 * `rampColumns` or more consecutive columns). Multiplies a cell's ALPHA only
 * — never its color/intensity — so a flashing/spoofed level renders faint
 * rather than disappearing outright, and a genuinely resting wall reads at
 * full strength once it has proven itself. Monotonically non-decreasing in
 * `consecutiveColumns`.
 */
export function persistenceFactor(
  consecutiveColumns: number,
  rampColumns: number = PERSISTENCE_RAMP_COLUMNS_DEFAULT,
): number {
  if (!Number.isFinite(consecutiveColumns) || consecutiveColumns <= 1) return PERSISTENCE_MIN_FACTOR;
  if (!Number.isFinite(rampColumns) || rampColumns <= 1) return 1;
  const x = Math.min(1, Math.max(0, (consecutiveColumns - 1) / (rampColumns - 1)));
  const smooth = x * x * (3 - 2 * x); // smoothstep
  return PERSISTENCE_MIN_FACTOR + (1 - PERSISTENCE_MIN_FACTOR) * smooth;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — zoom-aware ink budget + sensitivity control
// ─────────────────────────────────────────────────────────────────────────────
//
// Rather than a hardcoded soft-knee reference (Phase 1's flat p70), the knee
// is chosen so that roughly a TARGET FRACTION of visible cells render "lit"
// (alpha >= ~0.7ish) — an ink-budget approach. The target fraction is driven
// by two independent inputs that are then multiplied together:
//   1. A user-facing sensitivity preset (Quiet/Balanced/Detailed).
//   2. The current zoom level (cell pixel density) — zoomed far out, only the
//      majors should light up; zoomed in, more detail is affordable.

/**
 * Generic percentile lookup over a PRE-BUILT histogram (counts per discrete
 * bin, e.g. a 65536-bin q-value histogram) — same "cumulative count, no
 * sort" algorithm DepthMatrixLayer.tsx's percentile65536 already used, but
 * parameterized on `totalCount` so a single histogram build can serve
 * multiple percentile queries (p50/p92/target) instead of re-scanning raw
 * values once per query. Pure — no allocation beyond the cumulative scan.
 */
export function histogramPercentile(histogram: ArrayLike<number>, totalCount: number, pct: number): number {
  const len = histogram.length;
  if (len === 0 || totalCount <= 0) return 0;
  const clampedPct = Math.min(1, Math.max(0, pct));
  const target = Math.ceil(totalCount * clampedPct);
  let cum = 0;
  for (let i = 0; i < len; i++) {
    cum += histogram[i];
    if (cum >= target) return i;
  }
  return len - 1;
}

/** Lower clamp on the ink-budget knee — never look below the median (a level below the 50th percentile is genuinely thin, don't let a very high target fraction force it "lit"). */
export const KNEE_MIN_PERCENTILE = 0.50;
/** Upper clamp on the ink-budget knee — never require the top 8% just to render "lit" (a level above p92 is already exceptional, don't let a very low target fraction hide everything else). */
export const KNEE_MAX_PERCENTILE = 0.92;

/**
 * Picks the soft-knee value (in the same domain as `histogram`'s bin index —
 * e.g. raw q-space, convert to USD via qToUsd at the call site) so that
 * approximately `targetLitFraction` of visible cells clear it — i.e. the
 * knee is the `(1 - targetLitFraction)` percentile of the distribution,
 * clamped between the p50 and p92 values of that SAME distribution (a very
 * aggressive target can't push the knee below the median; a very
 * conservative target can't push it above the 92nd percentile). Replaces
 * Phase 1's hardcoded p70 in recomputeNorm.
 */
export function kneePercentileForInkBudget(
  histogram: ArrayLike<number>,
  totalCount: number,
  targetLitFraction: number,
): number {
  if (totalCount <= 0) return 0;
  const pct = 1 - Math.min(1, Math.max(0, targetLitFraction));
  const raw = histogramPercentile(histogram, totalCount, pct);
  const p50 = histogramPercentile(histogram, totalCount, KNEE_MIN_PERCENTILE);
  const p92 = histogramPercentile(histogram, totalCount, KNEE_MAX_PERCENTILE);
  const lo = Math.min(p50, p92);
  const hi = Math.max(p50, p92);
  return Math.min(hi, Math.max(lo, raw));
}

/** The 3 user-facing sensitivity presets — see useLiquidityPreferences.ts's `LiquiditySensitivity` (kept as an independent identical string-literal union there; this module stays hook-free). */
export type DepthSensitivity = 'quiet' | 'balanced' | 'detailed';

/**
 * Sensitivity preset -> target fraction of visible cells that should render
 * "lit" (alpha near/at 1.0). Quiet = only the clearest majors stand out
 * (fewer lit cells); Detailed = more of the book reads as significant.
 * Multiplied by `zoomDensityMultiplier` below before use.
 */
export const SENSITIVITY_TARGET_LIT_FRACTION: Record<DepthSensitivity, number> = {
  quiet: 0.04,
  balanced: 0.08,
  detailed: 0.16,
};

function isDepthSensitivity(v: unknown): v is DepthSensitivity {
  return v === 'quiet' || v === 'balanced' || v === 'detailed';
}

/** Safe lookup — falls back to 'balanced' for an unrecognized/undefined preset (never throws). */
export function targetLitFractionForSensitivity(sensitivity: unknown): number {
  return SENSITIVITY_TARGET_LIT_FRACTION[isDepthSensitivity(sensitivity) ? sensitivity : 'balanced'];
}

// Zoom-density multiplier anchors — px-per-cell -> multiplier, linear between
// the two anchors, clamped to [ZOOM_MULT_MIN, ZOOM_MULT_MAX] outside them.
const ZOOM_OUT_PX_PER_CELL = 2;   // cells this narrow or narrower -> only majors
const ZOOM_OUT_MULTIPLIER = 0.6;
const ZOOM_IN_PX_PER_CELL = 8;    // cells this wide or wider -> more detail affordable
const ZOOM_IN_MULTIPLIER = 1.4;
/** Absolute floor/ceiling on the zoom-density multiplier regardless of how far px-per-cell drifts past the anchors. */
export const ZOOM_MULT_MIN = 0.5;
export const ZOOM_MULT_MAX = 1.5;

/**
 * Scales the target-lit-fraction by how many screen pixels each depth column
 * currently occupies: zoomed OUT (narrow cells, many columns visible) only
 * the majors should light up (multiplier < 1); zoomed IN (wide cells) more
 * detail is affordable (multiplier > 1). Linear between the two anchors,
 * clamped to [ZOOM_MULT_MIN, ZOOM_MULT_MAX] beyond them. `pxPerCell <= 0` or
 * non-finite -> neutral multiplier (1) rather than throwing/NaN-propagating.
 */
export function zoomDensityMultiplier(pxPerCell: number): number {
  if (!Number.isFinite(pxPerCell) || pxPerCell <= 0) return 1;
  const t = (pxPerCell - ZOOM_OUT_PX_PER_CELL) / (ZOOM_IN_PX_PER_CELL - ZOOM_OUT_PX_PER_CELL);
  const mult = ZOOM_OUT_MULTIPLIER + (ZOOM_IN_MULTIPLIER - ZOOM_OUT_MULTIPLIER) * t;
  return Math.min(ZOOM_MULT_MAX, Math.max(ZOOM_MULT_MIN, mult));
}

/** Convenience composite: sensitivity preset + current zoom density -> the final target-lit-fraction fed into `kneePercentileForInkBudget`. */
export function effectiveTargetLitFraction(sensitivity: unknown, pxPerCell: number): number {
  return targetLitFractionForSensitivity(sensitivity) * zoomDensityMultiplier(pxPerCell);
}
