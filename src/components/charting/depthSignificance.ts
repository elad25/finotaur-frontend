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
//      intensity, or got clamped to a flat faint cap). A cell's alpha ramps
//      smoothly from faint (near the noise floor) to fully opaque (at/above
//      the knee) — EXCEPT cells under HIDE_BELOW_KNEE_FRACTION of the knee,
//      which are hidden entirely (alpha 0). That hide floor exists because
//      painting every above-dust cell at a visible minimum alpha filled the
//      chart with dozens of faint bands that read as noise and drowned the
//      genuinely significant walls (Elad, 2026-07-20).

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

/** Default minimum alpha at the bottom of the soft-knee ramp (just above the hide floor). Was 0.18 pre-2026-07-20 — every above-dust cell at ≥18% alpha is what filled the chart with faint noise bands. */
export const SOFT_KNEE_MIN_ALPHA = 0.05;
/** Cells below this fraction of the knee are HIDDEN outright (alpha 0) rather than painted faint — the balanced noise-cleanup level Elad picked (2026-07-20). */
export const HIDE_BELOW_KNEE_FRACTION = 0.02;

/**
 * Continuous per-cell alpha for the depth-matrix render: 0 below the hide
 * floor (`kneeUsd * HIDE_BELOW_KNEE_FRACTION`), then a smoothstep ramp from
 * `minAlpha` up to 1.0 (usd >= kneeUsd). A cell just under the knee is
 * nearly-full-alpha, not snapped to a flat floor value, so the book's
 * continuous shape reads naturally with no visible seam at the knee.
 * `kneeUsd <= 0` (no meaningful knee — e.g. an empty/degenerate window)
 * returns full alpha rather than dividing by zero.
 */
export function softKneeAlpha(usd: number, kneeUsd: number, minAlpha = SOFT_KNEE_MIN_ALPHA): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  if (!Number.isFinite(kneeUsd) || kneeUsd <= 0) return 1;
  if (usd < kneeUsd * HIDE_BELOW_KNEE_FRACTION) return 0; // hide floor — sub-noise cells vanish, not dim
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

/** Knee fraction at/below which persistence damping applies at FULL strength (the anti-spoof ramp is unchanged for small orders). */
export const PERSISTENCE_SIZE_GATE_LO_KNEE_FRACTION = 0.5;

/**
 * Size-gates the persistence damping so a genuinely LARGE fresh order is
 * visible immediately (Elad, 2026-07-20: whale walls rendered faint for
 * ~30s until they "proved" themselves — the anti-spoof ramp is the wrong
 * tool for at-knee-size orders, which are exactly what the trader must see
 * the moment they appear). Smoothstep gate on usd/kneeUsd between
 * `PERSISTENCE_SIZE_GATE_LO_KNEE_FRACTION` (0.5×knee — full damping below)
 * and 1.0 (at/above the knee — no damping): returns `persistMult` for small
 * bins, 1.0 for knee-sized-and-up bins, monotone in between. A degenerate
 * knee (`kneeUsd <= 0`) keeps the undamped-size judgement impossible —
 * fall back to the plain `persistMult` (old behavior).
 */
export function sizeGatedPersistenceFactor(persistMult: number, usd: number, kneeUsd: number): number {
  if (!Number.isFinite(kneeUsd) || kneeUsd <= 0) return persistMult;
  if (!Number.isFinite(usd) || usd <= 0) return persistMult;
  const lo = PERSISTENCE_SIZE_GATE_LO_KNEE_FRACTION;
  const x = Math.min(1, Math.max(0, (usd / kneeUsd - lo) / (1 - lo)));
  const gate = x * x * (3 - 2 * x); // smoothstep
  return persistMult + (1 - persistMult) * gate;
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
/** Upper clamp on the ink-budget knee. Was 0.92 pre-2026-07-20 — that clamp pinned Quiet AND Balanced to the same p92 knee at normal zoom (both presets' target percentiles exceeded it), making the Sensitivity control a no-op between them. p99.5 leaves the presets' own percentiles in charge while still guarding against a degenerate near-p100 knee. */
export const KNEE_MAX_PERCENTILE = 0.995;

/**
 * Picks the soft-knee value (in the same domain as `histogram`'s bin index —
 * e.g. raw q-space, convert to USD via qToUsd at the call site) so that
 * approximately `targetLitFraction` of visible cells clear it — i.e. the
 * knee is the `(1 - targetLitFraction)` percentile of the distribution,
 * clamped between the p50 and p99.5 values of that SAME distribution (a very
 * aggressive target can't push the knee below the median; a very
 * conservative target can't push it into the degenerate near-p100 tail).
 * Replaces Phase 1's hardcoded p70 in recomputeNorm.
 */
export function kneePercentileForInkBudget(
  histogram: ArrayLike<number>,
  totalCount: number,
  targetLitFraction: number,
): number {
  if (totalCount <= 0) return 0;
  const pct = 1 - Math.min(1, Math.max(0, targetLitFraction));
  const raw = histogramPercentile(histogram, totalCount, pct);
  const loVal = histogramPercentile(histogram, totalCount, KNEE_MIN_PERCENTILE);
  const hiVal = histogramPercentile(histogram, totalCount, KNEE_MAX_PERCENTILE);
  const lo = Math.min(loVal, hiVal);
  const hi = Math.max(loVal, hiVal);
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
  quiet: 0.02,
  balanced: 0.06,
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

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 — notional-weighted grid extent (perf fix, PR #1568 regression)
// ─────────────────────────────────────────────────────────────────────────────
//
// PR #1568 removed the old $1K sampling floor in favor of a dust-only cutoff
// (DUST_MIN_USD=$10..DUST_MAX_USD=$2000, see dustCutoffUsd above). That is
// correct for RENDER significance, but DepthMatrixLayer.tsx also used to
// derive the offscreen bitmap's price-row extent from the SAME (now much
// wider) data via a raw min/max across every bin. A single dust order resting
// far from the market (e.g. a $20 bid 50% below price) can now stretch that
// raw extent across tens of thousands of price rows, and the offscreen
// canvas + per-cell paint loop + smoothing/bloom passes are all O(numRows *
// numCols) — an unbounded extent turns into a multi-second freeze.
//
// The fix: weight each bin's contribution to the extent by its own USD
// notional rather than treating every bin equally. Dust carries negligible
// weight, so it falls outside the p0.5/p99.5 window; a genuinely large
// distant wall (real notional) still clears the weight percentile and is
// preserved in the window. DepthMatrixLayer.tsx additionally enforces a hard
// MAX_GRID_ROWS safety cap on top of this (belt-and-suspenders — see its
// repaintOffscreen comment) so pathological data can never regress to an
// unbounded grid again.

/** Default low-tail weight percentile cut for `weightedPriceExtent` (p0.5). */
export const EXTENT_LO_PCT_DEFAULT = 0.005;
/** Default high-tail weight percentile cut for `weightedPriceExtent` (p99.5). */
export const EXTENT_HI_PCT_DEFAULT = 0.995;

export interface WeightedPriceExtentResult {
  min: number;
  max: number;
  /** The weight-median (p50) price — used by callers to center a hard-capped window. */
  median: number;
}

/**
 * Notional-weighted price extent: sorts bins by price, accumulates USD
 * weight, and cuts the tails at `loPct`/`hiPct` of TOTAL weight (default
 * p0.5/p99.5) rather than raw min/max. Also returns the weight-median (p50)
 * price so callers can center a hard-capped window on it (see
 * DepthMatrixLayer.tsx's MAX_GRID_ROWS clamp).
 *
 * Takes two PARALLEL flat arrays (price[i] / usd[i]) rather than an array of
 * objects — the caller (DepthMatrixLayer.tsx's repaintOffscreen) is already
 * iterating every bin once to build these, so this stays a single extra
 * O(n log n) sort with no per-bin object allocation.
 *
 * Non-finite / non-positive weights are treated as zero weight (the bin's
 * PRICE still participates in the raw min/max fallback below, but never
 * pulls the weighted window toward it). If total weight is zero (e.g. every
 * entry has q=0 — shouldn't happen since callers filter q>0 first, but this
 * stays defensive), falls back to the raw min/max of the price array so the
 * function never returns a degenerate empty window when there IS data.
 */
export function weightedPriceExtent(
  prices: ArrayLike<number>,
  usd: ArrayLike<number>,
  loPct: number = EXTENT_LO_PCT_DEFAULT,
  hiPct: number = EXTENT_HI_PCT_DEFAULT,
): WeightedPriceExtentResult {
  const n = prices.length;
  if (n === 0 || usd.length !== n) {
    return { min: 0, max: 0, median: 0 };
  }

  let rawMin = Infinity;
  let rawMax = -Infinity;
  let totalWeight = 0;
  for (let i = 0; i < n; i++) {
    const p = prices[i];
    if (p < rawMin) rawMin = p;
    if (p > rawMax) rawMax = p;
    const w = usd[i];
    if (Number.isFinite(w) && w > 0) totalWeight += w;
  }

  if (totalWeight <= 0) {
    // No usable weight anywhere — fall back to the raw price range rather
    // than collapsing to a zero-width window.
    return { min: rawMin, max: rawMax, median: (rawMin + rawMax) / 2 };
  }

  // Sort bin INDICES by price (not the values themselves — keeps price[i]
  // and usd[i] paired without allocating pairs).
  const order = new Array<number>(n);
  for (let i = 0; i < n; i++) order[i] = i;
  order.sort((a, b) => prices[a] - prices[b]);

  const clampedLo = Math.min(1, Math.max(0, loPct));
  const clampedHi = Math.min(1, Math.max(0, hiPct));
  const loTarget = clampedLo * totalWeight;
  const hiTarget = clampedHi * totalWeight;
  const medTarget = 0.5 * totalWeight;

  let cum = 0;
  let min = prices[order[0]];
  let max = prices[order[n - 1]];
  let median = min;
  let foundMin = false;
  let foundMed = false;
  let foundMax = false;

  for (let i = 0; i < n; i++) {
    const idx = order[i];
    const w = usd[idx];
    if (Number.isFinite(w) && w > 0) cum += w;

    if (!foundMin && cum >= loTarget) {
      min = prices[idx];
      foundMin = true;
    }
    if (!foundMed && cum >= medTarget) {
      median = prices[idx];
      foundMed = true;
    }
    if (!foundMax && cum >= hiTarget) {
      max = prices[idx];
      foundMax = true;
      break; // hiPct is always >= loPct/medTarget in practice; nothing left to learn past this
    }
  }

  if (max < min) {
    const t = min;
    min = max;
    max = t;
  }

  return { min, max, median };
}

/**
 * Hard safety cap on top of `weightedPriceExtent` (belt-and-suspenders — see
 * DepthMatrixLayer.tsx's repaintOffscreen comment). If the extent still spans
 * more than `maxRows` price bins, centers a `maxRows`-sized window on
 * `medianPrice` (the weight-median from the same pass) and clips to it,
 * shifted inward if needed so the window never extends beyond the original
 * [min, max] bounds. Returns the input unchanged when already within budget.
 */
export function clampExtentToMaxRows(
  min: number,
  max: number,
  binSize: number,
  medianPrice: number,
  maxRows: number,
): { min: number; max: number } {
  if (!(binSize > 0) || maxRows <= 0 || !Number.isFinite(min) || !Number.isFinite(max)) {
    return { min, max };
  }
  const rows = Math.round((max - min) / binSize) + 1;
  if (rows <= maxRows) return { min, max };

  const halfSpan = ((maxRows - 1) / 2) * binSize;
  let newMin = medianPrice - halfSpan;
  let newMax = medianPrice + halfSpan;

  // Keep the clamped window inside the original bounds when possible —
  // shift it inward rather than letting it poke outside data that was
  // already narrowed by the weighted-percentile cut above.
  if (newMin < min) {
    const shift = min - newMin;
    newMin += shift;
    newMax += shift;
  }
  if (newMax > max) {
    const shift = newMax - max;
    newMax -= shift;
    newMin -= shift;
  }

  return { min: newMin, max: newMax };
}

/**
 * Total-cell budget guard (belt-and-suspenders — see DepthMatrixLayer.tsx's
 * repaintOffscreen comment): given the FINAL row count and a hard cell-count
 * ceiling, returns how many of the available (time-ordered, oldest-first)
 * columns can be kept without the offscreen canvas + smoothing/bloom passes
 * (all O(numCols * numRows)) exceeding `maxCells`. Callers keep the NEWEST
 * columns and drop the oldest, since the newest are what's actually visible
 * at the live edge of the chart. Returns `numColsAvailable` unchanged when
 * already within budget.
 */
export function clipColumnsForCellBudget(
  numColsAvailable: number,
  numRows: number,
  maxCells: number,
): number {
  if (numRows <= 0 || maxCells <= 0) return numColsAvailable;
  const maxCols = Math.floor(maxCells / numRows);
  return Math.max(1, Math.min(numColsAvailable, maxCols));
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 — visible-window painting (perf fix — see DepthMatrixLayer.tsx's
// repaintOffscreen doc comment for the full windowed-paint design). Three
// pure helpers used by the orchestration there:
//
//   1. computeWindowRange — given the chart's visible time range and the
//      column timestamps, returns the [startIdx, endIdx] slice of columns to
//      paint, expanded by a margin so small pans/zooms inside it need no
//      rebuild. Budget-aware (review fix, SHOULD-FIX 2): callers pass a
//      `numRowsEstimate` + `maxCells` so the margin itself is shrunk UP
//      FRONT to already fit the cell budget — the returned bounds ARE the
//      bounds that get painted, not a pre-budget wish-list that a later
//      trim silently narrows. That silent narrowing was the bug: if
//      repaintOffscreen's own post-hoc clipColumnsForCellBudget trim ran
//      AFTER this function returned its (untrimmed) margin, the ACTUAL
//      painted window ended up narrower than the caller's margin-exceeded
//      check assumed, so an ordinary small pan (well inside the intended
//      40% margin) could exceed the SHRUNKEN actual window and trigger a
//      rebuild — defeating the whole point of having a margin. When over
//      budget, margin is trimmed OLDEST (left) side first, biased toward
//      preserving margin on the live-edge (right/newest) side, since new
//      columns keep arriving there; the visible CORE range itself is only
//      ever trimmed as a last resort (trimmed from its oldest/left side).
//      `numRowsEstimate` is intentionally an ESTIMATE (typically the last
//      rebuild's real numRows) — repaintOffscreen still keeps its own
//      final clipColumnsForCellBudget call as a safety net for when the
//      estimate turns out to be off, but in the common case (numRows
//      doesn't change wildly tick-to-tick) that safety net is a no-op,
//      so painted bounds and intended bounds stay the same thing.
//
//   2. alphaSkipCutoffUsd — inverts softKneeAlpha to find the USD value below
//      which a cell's alpha would fall under a visibility threshold, so the
//      paint loop can skip those cells' color/compression math entirely.
//      Safe as a pre-filter on the RAW softKneeAlpha alone: persistenceFactor
//      only ever SHRINKS a cell's final alpha, never grows it, so if the raw
//      soft-knee alpha is already under threshold the painted alpha will be
//      too.
//
//   3. classifyColumnsUpdate — classifies a `columns` prop update (an
//      identity-changed array) as a pure append, a ring rotation (oldest
//      column(s) spliced off the front — the steady-state case once the
//      history cap is hit, since EVERY new column both appends and rotates
//      there), or something that needs a full window rebuild. Keyed on
//      column TIMESTAMPS, not array indices: a rotated array's surviving
//      columns keep their original times, so a caller that tracks its
//      painted window by column time (not index) never needs an index-shift
//      step at all — the window's time bounds stay valid across a rotation
//      unless the rotation actually evicted a column inside the window
//      (extremely rare in practice — the window sits near the live edge
//      while the ring cap evicts from deep history). Review fix (CRITICAL
//      2): a timestamp-only match is NOT sufficient proof of a genuine
//      append/rotation — columns sit on a fixed epoch-aligned interval
//      grid, so a full content REPLACEMENT (e.g. a reconnect resync that
//      clears and refills the store) can produce a `nextFirstT` that
//      "shifts" by an exact interval multiple purely by coincidence of the
//      grid alignment, with `atLiveEdge` also usually true. The function
//      now takes the actual column arrays (not just first-timestamp +
//      length) and requires an OBJECT-IDENTITY match at the expected
//      positions (`prevCols[shiftColumns] === nextCols[0]` and
//      `prevCols[prevLen-1] === nextCols[prevLen-1-shiftColumns]`) — a
//      genuine splice/append reuses the same column object references;
//      any identity mismatch is treated as a full-content replacement and
//      falls back to `'reset'`.

export interface WindowRangeResult {
  startIdx: number;
  endIdx: number;
}

/** First index i in ascending colTimesMs such that colTimesMs[i] >= targetMs (colTimesMs.length if none). */
function lowerBoundMs(colTimesMs: ArrayLike<number>, targetMs: number): number {
  let lo = 0;
  let hi = colTimesMs.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (colTimesMs[mid] < targetMs) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Last index i such that colTimesMs[i] <= targetMs (-1 if none). Assumes integer-ms timestamps. */
function lastIndexLE(colTimesMs: ArrayLike<number>, targetMs: number): number {
  return lowerBoundMs(colTimesMs, targetMs + 1) - 1;
}

function clampIdx(i: number, n: number): number {
  return Math.max(0, Math.min(i, n - 1));
}

/**
 * Shrinks a margin-expanded `[startIdx, endIdx]` window down to fit
 * `maxCells / numRowsEstimate` columns, if needed. Trims the OLDEST (left)
 * margin first (biased toward preserving margin on the live-edge/right
 * side), then the right margin, then — only if the visible CORE itself
 * (`[coreStart, coreEnd]`) doesn't fit — trims the core from its oldest
 * (left) side too. A no-op (returns the input unchanged) when either
 * `numRowsEstimate` or `maxCells` is absent/non-positive, or the window
 * already fits.
 */
function applyBudgetClip(
  n: number,
  startIdx: number,
  endIdx: number,
  coreStart: number,
  coreEnd: number,
  numRowsEstimate: number | undefined,
  maxCells: number | undefined,
): WindowRangeResult {
  if (!(numRowsEstimate && numRowsEstimate > 0) || !(maxCells && maxCells > 0)) {
    return { startIdx, endIdx };
  }
  const maxCols = Math.max(1, Math.floor(maxCells / numRowsEstimate));
  let s = startIdx;
  let e = endIdx;
  let cur = e - s + 1;
  if (cur <= maxCols) return { startIdx: s, endIdx: e };

  const coreLo = clampIdx(Math.min(coreStart, coreEnd), n);
  const coreHi = clampIdx(Math.max(coreStart, coreEnd), n);

  // Trim the LEFT (older) margin first.
  while (cur > maxCols && s < coreLo) {
    s++;
    cur = e - s + 1;
  }
  // Then the RIGHT margin, if still over budget.
  while (cur > maxCols && e > coreHi) {
    e--;
    cur = e - s + 1;
  }
  // Last resort — even the core doesn't fit (e.g. a very tall numRows):
  // trim the core from its oldest (left) side, keeping the live edge.
  while (cur > maxCols && s < e) {
    s++;
    cur = e - s + 1;
  }
  return { startIdx: s, endIdx: e };
}

/**
 * Returns the [startIdx, endIdx] (inclusive) slice of `colTimesMs` covering
 * the visible time range `[visibleFromSec, visibleToSec]` expanded by
 * `marginFraction` of the visible span on each side, clamped to the array
 * bounds. A degenerate/absent visible range (non-finite, or `to < from`)
 * falls back to the whole array. An empty `colTimesMs` returns an empty
 * range (`startIdx: 0, endIdx: -1`). If the margin-expanded window has no
 * overlap with any column (a large gap, or the visible range sits entirely
 * outside all columns), falls back to the single nearest column so the
 * caller always has something to paint.
 *
 * `numRowsEstimate` + `maxCells` (both optional — omit for the old
 * margin/bounds-only behavior) make this budget-aware UP FRONT: see the
 * module doc comment above (point 1) for why post-hoc trimming elsewhere is
 * NOT equivalent to trimming the margin here.
 */
export function computeWindowRange(
  colTimesMs: ArrayLike<number>,
  visibleFromSec: number,
  visibleToSec: number,
  marginFraction: number,
  numRowsEstimate?: number,
  maxCells?: number,
): WindowRangeResult {
  const n = colTimesMs.length;
  if (n === 0) return { startIdx: 0, endIdx: -1 };

  if (!Number.isFinite(visibleFromSec) || !Number.isFinite(visibleToSec) || visibleToSec < visibleFromSec) {
    return applyBudgetClip(n, 0, n - 1, 0, n - 1, numRowsEstimate, maxCells);
  }

  const span = Math.max(0, visibleToSec - visibleFromSec);
  const margin = span * Math.max(0, marginFraction);
  const wantFromMs = (visibleFromSec - margin) * 1000;
  const wantToMs = (visibleToSec + margin) * 1000;

  let startIdx = lowerBoundMs(colTimesMs, wantFromMs);
  let endIdx = lastIndexLE(colTimesMs, wantToMs);

  if (startIdx > endIdx) {
    const centerMs = (wantFromMs + wantToMs) / 2;
    let idx = lowerBoundMs(colTimesMs, centerMs);
    if (idx >= n) idx = n - 1;
    if (idx < 0) idx = 0;
    startIdx = idx;
    endIdx = idx;
    return { startIdx, endIdx }; // single fallback column — budget can't do less than 1
  }

  startIdx = Math.max(0, Math.min(startIdx, n - 1));
  endIdx = Math.max(0, Math.min(endIdx, n - 1));
  if (endIdx < startIdx) endIdx = startIdx;

  // Visible CORE (no margin) — the part applyBudgetClip protects first.
  const coreStart = clampIdx(lowerBoundMs(colTimesMs, visibleFromSec * 1000), n);
  const coreEnd = clampIdx(lastIndexLE(colTimesMs, visibleToSec * 1000), n);

  return applyBudgetClip(n, startIdx, endIdx, coreStart, coreEnd, numRowsEstimate, maxCells);
}

/**
 * Inverts softKneeAlpha: returns the USD value below which
 * `softKneeAlpha(usd, kneeUsd, minAlpha) < threshold`. Never returns less
 * than the hide floor (`kneeUsd * HIDE_BELOW_KNEE_FRACTION`) — cells under
 * it render at alpha 0, so they are always skippable regardless of
 * `threshold`. Above the hide floor, alpha starts at `minAlpha`, so when
 * `threshold <= minAlpha` only the hide floor applies; otherwise the
 * smoothstep ramp is inverted to find where alpha crosses `threshold`.
 */
export function alphaSkipCutoffUsd(kneeUsd: number, threshold = 0.06, minAlpha = SOFT_KNEE_MIN_ALPHA): number {
  if (!Number.isFinite(kneeUsd) || kneeUsd <= 0) return 0;
  const hideFloorUsd = kneeUsd * HIDE_BELOW_KNEE_FRACTION;
  if (threshold <= minAlpha) return hideFloorUsd; // above the hide floor, alpha >= minAlpha >= threshold
  if (threshold >= 1) return kneeUsd; // asking to skip everything below the knee itself

  const target = (threshold - minAlpha) / (1 - minAlpha); // target smoothstep value in [0,1]
  // Invert smoothstep y = x^2*(3-2x) via bisection (monotonic on [0,1]).
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const y = mid * mid * (3 - 2 * mid);
    if (y < target) lo = mid; else hi = mid;
  }
  const x = (lo + hi) / 2;
  return Math.max(hideFloorUsd, x * kneeUsd);
}

export type ColumnsUpdateKind =
  | { kind: 'unchanged' }
  | { kind: 'append'; appendedCount: number }
  | { kind: 'rotate'; shiftColumns: number; appendedCount: number }
  | { kind: 'reset' };

/** Minimal shape classifyColumnsUpdate needs from a column — just enough to check timestamps + object identity. */
export interface ColumnLike {
  t: number;
}

/**
 * Classifies a `columns` prop update. `colIntervalMs` is the depth-column
 * sampling interval (~5000ms in production); the caller estimates it from
 * recent column timestamp deltas. See the module doc comment above for the
 * append/rotate/reset semantics, INCLUDING the object-identity spot check
 * (review fix, CRITICAL 2) that guards against a full-content replacement
 * masquerading as an append/rotation purely because columns sit on a fixed
 * epoch-aligned interval grid.
 */
// ─────────────────────────────────────────────────────────────────────────────
// Phase 7 — Level-of-Detail (LOD) downsampling (perf fix — see
// DepthMatrixLayer.tsx's module doc comment, "LOD design" section, for the
// full rationale). Zoomed far out, raw 5s columns collapse to sub-pixel
// screen width and price bins collapse to sub-pixel screen height — painting
// one bitmap cell per raw (column, price-bin) pair then paints millions of
// cells that collapse into far fewer screen pixels. Bookmap-class tools never
// paint more cells than screen pixels; these helpers implement the same
// bound:
//
//   1. computeBucketFactor / computeRowMergeFactor / computeLodFactors —
//      given the current screen-px-per-raw-column and screen-px-per-raw-row,
//      decide how many raw columns/rows to merge into one painted cell so
//      painted cells never go below ~TARGET_MIN_COL_PX / TARGET_MIN_ROW_PX
//      screen pixels wide/tall.
//   2. bucketStartMs — fixed epoch-aligned bucket boundaries (not "however
//      many columns happen to be in the window"), so buckets are STABLE
//      across repaints and live appends — the same raw column always
//      belongs to the same bucket regardless of where the window starts.
//   3. mergeColumnsMaxQ — merges multiple raw columns' bid/ask bins into one
//      via MAX-q per price (Bookmap semantics: a wall visible at ANY point
//      in the bucket stays visible; summing would be wrong — it would make
//      a bucket's "size" scale with bucketFactor, which has nothing to do
//      with book depth). Gap columns contribute nothing. Technical dust is
//      NOT re-filtered here — it was already removed upstream at the
//      SAMPLING layer (useDepthSlices.ts's dustCutoffUsd, see the module doc
//      comment above) before columns ever reach the renderer, so a merge of
//      already-dust-filtered columns cannot manufacture new dust.
//   4. bucketColumns — walks a raw column array and groups it into
//      epoch-aligned buckets of `bucketFactor` raw columns each (the last
//      bucket in a slice may be partial), returning one synthetic merged
//      DecodedColumn-shaped object per bucket. Also returns the raw column
//      COUNT consumed by each bucket, so a caller trimming buckets for a
//      cell-budget guard can map back to a raw-column offset (needed for
//      persistence warm-up, which looks up raw history preceding the
//      window).

/** Screen-px floor for a PAINTED column below which columns get merged (bucketed) together. */
export const TARGET_MIN_COL_PX = 1.5;
/** Screen-px floor for a PAINTED row below which price rows get merged together. */
export const TARGET_MIN_ROW_PX = 1.2;
/** Hard ceiling on how many raw columns one painted bucket may merge — belt-and-suspenders against a pathological (near-zero) px-per-column input. */
export const LOD_MAX_BUCKET_FACTOR = 64;
/** Hard ceiling on how many raw price rows one painted row may merge. */
export const LOD_MAX_ROW_MERGE_FACTOR = 64;

/**
 * Number of raw columns to merge into one painted column so painted columns
 * never render narrower than `TARGET_MIN_COL_PX` screen pixels. Returns 1
 * (no bucketing) when `pxPerRawColumn` is already at/above the target, or
 * non-finite/non-positive (can't reason about it — render 1:1 rather than
 * guessing).
 */
export function computeBucketFactor(
  pxPerRawColumn: number,
  maxBucketFactor: number = LOD_MAX_BUCKET_FACTOR,
): number {
  if (!Number.isFinite(pxPerRawColumn) || pxPerRawColumn <= 0 || pxPerRawColumn >= TARGET_MIN_COL_PX) return 1;
  return Math.min(maxBucketFactor, Math.ceil(TARGET_MIN_COL_PX / pxPerRawColumn));
}

/**
 * Number of raw price rows to merge into one painted row so painted rows
 * never render shorter than `TARGET_MIN_ROW_PX` screen pixels. Same
 * shape/semantics as `computeBucketFactor` above, applied to the price axis.
 */
export function computeRowMergeFactor(
  rowPx: number,
  maxRowMergeFactor: number = LOD_MAX_ROW_MERGE_FACTOR,
): number {
  if (!Number.isFinite(rowPx) || rowPx <= 0 || rowPx >= TARGET_MIN_ROW_PX) return 1;
  return Math.min(maxRowMergeFactor, Math.ceil(TARGET_MIN_ROW_PX / rowPx));
}

/**
 * Row-merge factor REQUIRED so `rawNumRows` raw price rows fit into at most
 * `maxRows` painted rows — the merge-instead-of-clip half of the far-wall
 * fix (Elad, 2026-07-20: a genuine wall further than ~MAX_GRID_ROWS/2 bins
 * from the weight-median price used to be clipped out of the bitmap
 * entirely by `clampExtentToMaxRows`; merging rows keeps it visible as a
 * coarser row instead). Deterministic in `rawNumRows` (which only changes
 * on a rebuild), so unlike the px-driven factor it needs NO hysteresis —
 * but it MUST be applied identically in BOTH repaintOffscreen's factor
 * derivation AND drawFrame's rebuild-trigger check, or the two disagree and
 * schedule rebuilds forever. Capped at `maxFactor` (LOD_MAX_ROW_MERGE_FACTOR)
 * — beyond that, callers fall back to `clampExtentToMaxRows` as the backstop.
 */
export function requiredRowMergeFactorForCap(
  rawNumRows: number,
  maxRows: number,
  maxFactor: number = LOD_MAX_ROW_MERGE_FACTOR,
): number {
  if (!(rawNumRows > 0) || !(maxRows > 0)) return 1;
  if (rawNumRows <= maxRows) return 1;
  return Math.min(maxFactor, Math.ceil(rawNumRows / maxRows));
}

export interface LodFactors {
  bucketFactor: number;
  rowMergeFactor: number;
}

export interface LodCaps {
  maxBucketFactor?: number;
  maxRowMergeFactor?: number;
}

/** Convenience composite of computeBucketFactor + computeRowMergeFactor — see DepthMatrixLayer.tsx's "LOD design" doc comment. */
export function computeLodFactors(
  pxPerRawColumn: number,
  rowPx: number,
  caps: LodCaps = {},
): LodFactors {
  return {
    bucketFactor: computeBucketFactor(pxPerRawColumn, caps.maxBucketFactor),
    rowMergeFactor: computeRowMergeFactor(rowPx, caps.maxRowMergeFactor),
  };
}

/**
 * Fixed epoch-aligned bucket start time for raw timestamp `t`, given the raw
 * column sampling interval and a bucket factor (raw columns per bucket).
 * Epoch-aligned (not "aligned to the first column in the current window") so
 * the SAME raw column always maps to the SAME bucket boundary regardless of
 * where a window starts/ends — buckets stay stable across repaints and live
 * appends (no reshuffling every time the visible window shifts by one raw
 * column). Returns `t` unchanged if `intervalMs`/`factor` are non-positive
 * (degenerate — nothing to align to).
 */
export function bucketStartMs(t: number, intervalMs: number, factor: number): number {
  if (!(intervalMs > 0) || !(factor > 0)) return t;
  const bucketSpanMs = intervalMs * factor;
  return Math.floor(t / bucketSpanMs) * bucketSpanMs;
}

/** Minimal shape the LOD merge helpers need from a decoded column's bin — just enough to merge by price. */
export interface DepthBinLike {
  price: number;
  q: number;
}

/** Minimal shape the LOD merge helpers need from a decoded column — matches DecodedColumn's relevant fields (depthTypes.ts) without importing it (keeps this module DOM/type-dependency-free). */
export interface DecodedColumnLike {
  t: number;
  binSize: number;
  flags: number;
  bids: DepthBinLike[];
  asks: DepthBinLike[];
}

/**
 * Merges multiple raw columns' bid/ask bins into one via MAX-q per price —
 * Bookmap semantics: a wall visible at ANY point within the bucket stays
 * visible in the painted (downsampled) column. Summing across columns would
 * be wrong (a bucket's rendered "size" would scale with bucketFactor, which
 * has nothing to do with book depth). Gap columns (flags bit0) and q<=0
 * entries contribute nothing.
 */
export function mergeColumnsMaxQ(cols: readonly DecodedColumnLike[]): { bids: DepthBinLike[]; asks: DepthBinLike[] } {
  const bidMap = new Map<number, number>();
  const askMap = new Map<number, number>();
  for (const col of cols) {
    if (col.flags & 1) continue; // gap column — never contributes
    for (const r of col.bids) {
      if (r.q <= 0) continue;
      const cur = bidMap.get(r.price) ?? 0;
      if (r.q > cur) bidMap.set(r.price, r.q);
    }
    for (const r of col.asks) {
      if (r.q <= 0) continue;
      const cur = askMap.get(r.price) ?? 0;
      if (r.q > cur) askMap.set(r.price, r.q);
    }
  }
  const bids: DepthBinLike[] = [];
  for (const [price, q] of bidMap) bids.push({ price, q });
  const asks: DepthBinLike[] = [];
  for (const [price, q] of askMap) asks.push({ price, q });
  return { bids, asks };
}

export interface BucketedColumns {
  /** One synthetic merged column per bucket, `t` = the bucket's epoch-aligned start time. Structurally `DecodedColumnLike` — callers that need the concrete `DecodedColumn` shape (with its extra `anchor` field, preserved at runtime via the object spread below) cast at the call site rather than fighting a generic here. */
  columns: DecodedColumnLike[];
  /** Number of RAW columns (from the input array) consumed by each bucket, 1:1 with `columns` — lets a caller trimming buckets map back to a raw-array offset. */
  rawCounts: number[];
}

/**
 * Groups a raw column array into epoch-aligned buckets of `bucketFactor` raw
 * columns each (see `bucketStartMs`) and merges each bucket via
 * `mergeColumnsMaxQ`. The FIRST/LAST bucket in the slice may be partial (the
 * slice doesn't necessarily start/end on a bucket boundary) — that's fine,
 * a partial bucket just merges however many raw columns it actually has.
 * `bucketFactor <= 1` is a no-op passthrough (returns the input columns
 * unchanged, one bucket per raw column, `rawCounts` all 1) so callers can
 * unconditionally route through this function without a behavior change
 * when LOD isn't active.
 */
export function bucketColumns(
  cols: readonly DecodedColumnLike[],
  intervalMs: number,
  bucketFactor: number,
): BucketedColumns {
  if (bucketFactor <= 1 || cols.length === 0) {
    return { columns: cols.slice(), rawCounts: cols.map(() => 1) };
  }
  const bucketSpanMs = intervalMs * bucketFactor;
  const columns: DecodedColumnLike[] = [];
  const rawCounts: number[] = [];
  const n = cols.length;
  let i = 0;
  while (i < n) {
    const startT = bucketStartMs(cols[i].t, intervalMs, bucketFactor);
    const endT = startT + bucketSpanMs; // exclusive
    let j = i;
    while (j < n && cols[j].t < endT) j++;
    const group = cols.slice(i, j);
    const { bids, asks } = mergeColumnsMaxQ(group);
    const allGap = group.every((c) => c.flags & 1);
    columns.push({
      ...group[0],
      t: startT,
      flags: allGap ? 1 : 0,
      bids,
      asks,
    });
    rawCounts.push(j - i);
    i = j;
  }
  return { columns, rawCounts };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 8 — LOD review-fix hardening (code review of the initial Phase 7 diff
// found 2 critical + 3 should-fix issues; these helpers implement the fixes
// as pure, unit-testable functions rather than inline component logic):
//
//   CRITICAL 1 — window-margin-exceeded check must compare against the
//   painted window's true END time, not the last painted column's START
//   time. Once bucketFactor > 1 the last painted column's `.t` is a BUCKET
//   START, not its end — comparing the live visible-range end against that
//   start makes `visToSecNow > winEndSec` true almost always while a bucket
//   is still open, firing a rebuild every ~120ms and defeating the append
//   fast path entirely. `paintedWindowEndMs` adds the bucket span.
//
//   CRITICAL 2 — persistence must advance ONCE per CLOSED bucket, not once
//   per repaint of a still-open bucket. `bumpPersistMapForColumn` is the
//   single-column prune+bump primitive (extracted so it's shared — and
//   provably identical — between the full-window paint's per-column chain
//   and the append path's "commit a just-closed bucket" step) that the
//   caller invokes EXACTLY ONCE per bucket close, using a stable persistence
//   BASE snapshot rather than the live per-tick map.
//
//   SHOULD-FIX (hysteresis) — a tier-change trigger recomputed from a raw
//   pixel measurement every frame can THRASH if that measurement hovers at
//   the exact threshold (sub-pixel float jitter from repeated pxPerSec
//   arithmetic). `computeBucketFactorWithHysteresis` /
//   `computeRowMergeFactorWithHysteresis` add a dead zone around the target
//   threshold (±~10%) — Schmitt-trigger semantics: only cross INTO a new
//   tier when clearly past the threshold in that direction; within the dead
//   zone, keep whatever tier is currently applied.

/** Ratio applied to the target px (TARGET_MIN_COL_PX / TARGET_MIN_ROW_PX) for the LOW hysteresis bound (below which bucketing/merging increases). ≈ 1.4/1.5 for columns. */
export const LOD_HYSTERESIS_LOW_RATIO = 0.933;
/** Ratio applied to the target px for the HIGH hysteresis bound (above which bucketing/merging decreases). ≈ 1.65/1.5 for columns. */
export const LOD_HYSTERESIS_HIGH_RATIO = 1.1;

function computeFactorWithHysteresis(
  px: number,
  appliedFactor: number,
  targetPx: number,
  maxFactor: number,
  computeFn: (px: number, max: number) => number,
): number {
  const fallback = appliedFactor > 0 ? appliedFactor : 1;
  if (!Number.isFinite(px) || px <= 0) return fallback;
  const lowBound = targetPx * LOD_HYSTERESIS_LOW_RATIO;
  const highBound = targetPx * LOD_HYSTERESIS_HIGH_RATIO;
  if (px < lowBound || px > highBound) return computeFn(px, maxFactor);
  return fallback; // dead zone — keep whatever's currently applied, don't thrash
}

/**
 * Hysteresis-aware column bucket-factor decision for the PER-FRAME rebuild
 * trigger (see the module doc comment above). The actual bucketFactor a
 * rebuild paints with should ALSO be sourced from this function (not the
 * plain `computeBucketFactor`) so the "should I rebuild" check and "what do
 * I paint with" decision never disagree.
 */
export function computeBucketFactorWithHysteresis(
  pxPerRawColumn: number,
  appliedFactor: number,
  maxBucketFactor: number = LOD_MAX_BUCKET_FACTOR,
): number {
  return computeFactorWithHysteresis(pxPerRawColumn, appliedFactor, TARGET_MIN_COL_PX, maxBucketFactor, computeBucketFactor);
}

/** Hysteresis-aware row merge-factor decision — same shape/semantics as `computeBucketFactorWithHysteresis`, applied to the price axis (SHOULD-FIX 1 — pane-resize rebuild trigger). */
export function computeRowMergeFactorWithHysteresis(
  rowPx: number,
  appliedFactor: number,
  maxRowMergeFactor: number = LOD_MAX_ROW_MERGE_FACTOR,
): number {
  return computeFactorWithHysteresis(rowPx, appliedFactor, TARGET_MIN_ROW_PX, maxRowMergeFactor, computeRowMergeFactor);
}

/**
 * The painted window's true END time (ms) — CRITICAL 1 fix. The last
 * painted column's OWN `.t` is its bucket START (or, pre-LOD, the raw
 * column's own timestamp — equivalent to a 1-raw-column "bucket"), so the
 * window's true end is that start PLUS the full bucket span
 * (bucketFactor × rawIntervalMs). `bucketFactor <= 1` degenerates to
 * `lastColStartT + rawIntervalMs`, matching pre-LOD behavior (the window
 * end is one raw column past the last column's own start — i.e. up to but
 * not including the NEXT column's arrival).
 */
export function paintedWindowEndMs(lastColStartT: number, bucketFactor: number, rawIntervalMs: number): number {
  const factor = bucketFactor > 0 ? bucketFactor : 1;
  const interval = rawIntervalMs > 0 ? rawIntervalMs : 0;
  return lastColStartT + factor * interval;
}

/**
 * Single-column persistence prune+bump primitive (CRITICAL 2 fix) — applies
 * EXACTLY ONE column's presence to `persistMap` in place: prune bins absent
 * from this column, then bump survivors + newly-appeared bins by 1. This is
 * the same operation `paintColumnsRange`'s per-column loop performs (kept
 * bit-for-bit identical — same cellMap-derived "present" semantics, i.e. no
 * additional q<=0 filter beyond what the range check already implies) so a
 * caller applying it standalone (e.g. "commit a just-closed bucket's
 * contribution ONCE") is provably consistent with what the normal per-column
 * paint loop would have produced. Gap columns (flags bit0) or a `binSize`
 * mismatch never touch `persistMap` at all (mirrors `paintColumnsRange`'s
 * own skip condition AND `buildPersistWarmupMap`'s gap-column skip).
 */
export function bumpPersistMapForColumn(
  persistMap: Map<number, number>,
  col: DecodedColumnLike,
  priceMin: number,
  rowMaxPrice: number,
  rowEpsilon: number,
  curBinSize: number,
): void {
  if ((col.flags & 1) || col.binSize !== curBinSize) return;

  const present = new Set<number>();
  for (const r of col.bids) {
    if (r.price < priceMin - rowEpsilon || r.price > rowMaxPrice + rowEpsilon) continue;
    present.add(r.price);
  }
  for (const r of col.asks) {
    if (r.price < priceMin - rowEpsilon || r.price > rowMaxPrice + rowEpsilon) continue;
    present.add(r.price);
  }

  for (const price of persistMap.keys()) {
    if (!present.has(price)) persistMap.delete(price);
  }
  for (const price of present) {
    persistMap.set(price, (persistMap.get(price) ?? 0) + 1);
  }
}

export function classifyColumnsUpdate(
  prevCols: ArrayLike<ColumnLike>,
  nextCols: ArrayLike<ColumnLike>,
  colIntervalMs: number,
): ColumnsUpdateKind {
  const prevLen = prevCols.length;
  const nextLen = nextCols.length;
  if (prevLen <= 0 || nextLen <= 0) return { kind: 'reset' };

  const prevFirstT = prevCols[0].t;
  const nextFirstT = nextCols[0].t;

  if (nextLen === prevLen && nextFirstT === prevFirstT && prevCols[0] === nextCols[0]) {
    return { kind: 'unchanged' };
  }
  if (nextLen < prevLen) return { kind: 'reset' }; // shrink (symbol/store swap) — safest to rebuild

  if (nextFirstT === prevFirstT) {
    // Candidate pure append (ring not rotated, shift = 0). Object-identity
    // spot check: a genuine append never touches the surviving prefix, so
    // the first AND last pre-existing columns must be the SAME references.
    if (prevCols[0] !== nextCols[0]) return { kind: 'reset' };
    if (prevCols[prevLen - 1] !== nextCols[prevLen - 1]) return { kind: 'reset' };
    return { kind: 'append', appendedCount: nextLen - prevLen };
  }

  // Candidate ring rotation (oldest column(s) spliced off the front). Derive
  // the shift from the time delta, keyed on TIMESTAMPS not raw indices.
  if (!(colIntervalMs > 0)) return { kind: 'reset' };
  const rawShift = (nextFirstT - prevFirstT) / colIntervalMs;
  const shiftColumns = Math.round(rawShift);
  if (shiftColumns <= 0) return { kind: 'reset' }; // time went backward, or didn't move a whole column
  if (Math.abs(rawShift - shiftColumns) > 0.2) return { kind: 'reset' }; // doesn't line up with the interval — don't trust it
  if (shiftColumns >= prevLen) return { kind: 'reset' }; // nothing of prev would survive — not a genuine rotation

  const appendedCount = nextLen - (prevLen - shiftColumns);
  if (appendedCount < 0 || appendedCount > nextLen) return { kind: 'reset' }; // inconsistent — bail to a full rebuild

  // Object-identity spot check — a genuine splice+append reuses the SAME
  // column object references at the expected positions; any mismatch means
  // this is a full-content replacement that only LOOKS like a rotation
  // because columns sit on a fixed epoch-aligned interval grid.
  if (prevCols[shiftColumns] !== nextCols[0]) return { kind: 'reset' };
  if (prevCols[prevLen - 1] !== nextCols[prevLen - 1 - shiftColumns]) return { kind: 'reset' };

  return { kind: 'rotate', shiftColumns, appendedCount };
}
