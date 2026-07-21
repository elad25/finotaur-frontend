// src/components/charting/DepthMatrixLayer.tsx
//
// Canvas overlay that renders a scrolling [time × price] depth matrix heatmap
// on top of FinotaurChart's lightweight-charts canvas.
//
// Design (mirrors WallHeatLayer conventions):
//   - Absolutely-positioned canvas (pointer-events: none).
//   - Offscreen canvas for the matrix (1 pixel = 1 cell).
//   - Offscreen repaints ONLY when: new column arrives, normalization changes,
//     or resolution tier flips. Per-frame work = ONE ctx.drawImage() with an
//     affine mapping derived from timeToCoordinate / priceToCoordinate.
//   - Per-frame coordinate fingerprint (same pattern as WallHeatLayer) to
//     detect price-axis rescale which fires no lw-charts v4 subscription.
//   - rAF callback is structured in 4 steps every frame:
//       1. DPR/resize of visible canvas.
//       2. Conditional: offscreen rasterization (only when data/norm changed).
//       3. Recompute x/y affine mapping fresh (bar-snapped anchors + pxPerSec).
//       4. clearRect the visible canvas + ctx.drawImage(offscreen, ...) — ALWAYS,
//          no early-return allowed between clear and blit.
//     The dirty/fingerprint check gates ONLY step 2 — never steps 3+4.
//   - drawImage uses a SOURCE sub-rectangle computed from the visible portion of
//     the depth matrix (not always the full offscreen).  When the matrix spans
//     beyond the visible time range the raw left/right edges go negative or past
//     paneW; clamping the DESTINATION without adjusting the source would stretch
//     the bitmap and shift every column away from its candle — the pan-lock bug.
//     srcLeft/srcRight map the clamped destination back to the exact offscreen
//     pixel columns that are visible, so column ci always lands at colToX(ci.t).
//   - try/finally with setTransform reset — mid-frame throw cannot corrupt
//     the transform stack.
//   - Clips drawing at timeScale().width() so nothing paints over the price axis.
//   - imageSmoothingEnabled = false (pixel-sharp cells).
//   - Cells with q===0 → transparent. Gap columns (flags bit0) → transparent.
//
// Color mapping (Bookmap-style continuous field — see BookmapChart.tsx's
// compressIntensity/HEAT_GAMMA for the reference implementation this copies):
//   vHi  = p99 of visible q values (NOT max — one iceberg must not flatten field)
//   vLo  = the Phase 3 ink-budget knee (below) — doubles as the soft noise KNEE.
//   x    = min(1, usd / vHi)                         — linear, capped at 1
//   t    = compressIntensity(x)
//        = pow(log1p(x * 9) / log1p(9), 1.6)          — log spread + gamma darken
//   palette index = round(t * 255)                    — COLOR only.
//   q===0 (no data in this bin) → transparent (index 0); the black wrapper
//   background supplies the void, Bookmap-style.
//
// Significance mapping (Phase 1 "no manual thresholds" overhaul — see
// depthSignificance.ts): there is no floor/size-filter prop anymore, and no
// binary dimming cap. Technical dust (bins below a tiny % of a column's
// total notional) is already removed upstream at the SAMPLING layer
// (useDepthSlices.ts) — by the time columns reach this component, the data
// is "(almost) everything". Instead of clamping weak cells to a flat
// intensity ceiling, EVERY cell's alpha is a continuous function of its own
// USD size:
//   alpha = softKneeAlpha(usd, vLo)  — smoothstep from a faint minimum
//     (0.18) at usd→0 up to fully opaque (1.0) at usd >= vLo (the ink-budget
//     soft knee). `t` (color/intensity index) is UNCHANGED by this — only the
//     pixel's own alpha byte is scaled, so faint cells still use the correct
//     palette color, just blended lighter against whatever is behind this
//     (transparent) canvas. This keeps the book's continuous shape intact
//     across the whole visible range with no visible seam at any threshold.
//
// Phase 2 (anti-flicker, anti-spoof — see depthSignificance.ts):
//   1. Persistence weighting — recomputeNorm/repaintOffscreen track how many
//      CONSECUTIVE columns each price bin has been present in; a freshly
//      appeared bin's alpha is dampened (persistenceFactor) until it has
//      "proven" itself over ~6 columns. A data-outage gap column never
//      resets a bin's count — only a genuine absence does.
//   2. EMA-smoothed knee stats — vHi/vLo are EMA-blended (α=0.35) across
//      recomputes instead of snapping to the latest window's raw
//      percentiles, so the knee itself doesn't jump and cause blinking near
//      the boundary.
//
// Phase 3 (zoom-aware ink budget + sensitivity — see depthSignificance.ts):
//   vLo is no longer a hardcoded p70. It's picked so that ~targetLitFraction
//   of visible cells render "lit" (kneePercentileForInkBudget, clamped to
//   [p50, p92]), where targetLitFraction = a user-facing sensitivity preset
//   (Quiet/Balanced/Detailed — the `sensitivity` prop) multiplied by a
//   zoom-density factor (fewer lit cells zoomed far out, more zoomed in).
//
// Palette + smoothing (Task S2 — ATAS/Bookmap restyle):
//   The color LUT itself now lives in depthPalettes.ts (3 palettes: 'finotaur'
//   NEW default gold-on-black, 'classic' = the ORIGINAL hardcoded navy→cyan→
//   yellow→white ramp bit-for-bit preserved, 'thermal' = ATAS/inferno-like).
//   `palette` defaults to 'classic' when the prop is absent — MarketScanner.tsx
//   never passes it, so its render stays pixel-identical to pre-S2.
//   `smoothing` (default false when absent) adds two post-process passes to
//   the offscreen raster ONLY (never per-frame — gated the same way as the
//   rest of repaintOffscreen/paintColumnsRange, see Phase 6 below):
//     1. Vertical 3-tap blend between adjacent price rows (kills hard cell
//        banding), only blending painted (alpha>0) neighbors into each other.
//     2. A soft "bloom" halo around cells whose normalized intensity t>=0.95
//        (max-blended into their 4-neighbors) so the strongest walls read as
//        bright hot streaks, ATAS-style.
//
// Phase 6 — VISIBLE-WINDOW PAINTING (perf fix — PR #1568/#1569 regression:
// the "all-orders" column change can carry up to 500 bins/side, ~10-20x more
// cells than before; combined with up to 2880 history columns and a
// per-column-arrival full rebuild, repaintOffscreen was rebuilding a
// multi-million-cell bitmap from scratch every ~5s. See MAX_GRID_CELLS below
// — it is now a PER-WINDOW budget, not a per-history one):
//
//   - The offscreen bitmap covers ONLY the columns intersecting the visible
//     time range, expanded by WINDOW_MARGIN_FRACTION (40%) of the visible
//     span on each side (computeWindowRange in depthSignificance.ts) — small
//     pans/zooms inside the margin need no rebuild at all. Grid EXTENT (price
//     rows) is computed from weightedPriceExtent over the WINDOW's columns
//     only (cheaper and more relevant than scanning full history).
//   - The painted window is tracked implicitly via `meta.cols` (the actual
//     DecodedColumn objects currently painted, indexed 1:1 with offscreen
//     pixel columns 0..meta.numCols-1) — NOT via raw array indices. Reading
//     `meta.cols[0].t` / `meta.cols[meta.numCols-1].t` gives the window's
//     time bounds directly; no separate index bookkeeping is needed across
//     `columns` prop updates (see classifyColumnsUpdate's rotate/append
//     handling below — this is exactly why keying by TIME instead of index
//     survives a ring rotation for free).
//   - Full window rebuilds (view exits the margin, zoom-tier flips, or
//     palette/sensitivity/binSize/smoothing changes) are debounced
//     REBUILD_DEBOUNCE_MS (120ms) via scheduleRebuild() — the OLD bitmap
//     keeps rendering during the debounce window (slightly stale content for
//     ≤120ms is an acceptable trade for coalescing rapid changes).
//   - LIVE-APPEND FAST PATH: the far more common case (a new column arrives
//     ~every 5s, or the ring rotates at the 2880-column cap — which, at cap,
//     happens on EVERY tick and both appends AND rotates simultaneously).
//     classifyColumnsUpdate (depthSignificance.ts) distinguishes append /
//     rotate / reset from the `columns` prop's identity change, keyed on
//     timestamps. If the window is at the live edge (its last painted column
//     matches the array's previous last column) and there's spare capacity
//     (the offscreen is allocated with WINDOW_SLACK_COLS extra columns to
//     the right), the new column(s) are painted via a single small
//     putImageData at x=meta.numCols — no full rebuild. `lastPersistMapRef`
//     carries the persistence Map's per-price consecutive-count state
//     forward across appends so the anti-flicker weighting stays correct
//     without replaying history.
//   - PERSISTENCE WARM-UP (buildPersistWarmupMap): because a window rebuild
//     no longer iterates from the start of history, the persistence Map is
//     seeded by a cheap bookkeeping-only pass over the
//     PERSISTENCE_RAMP_COLUMNS_DEFAULT+2 columns immediately preceding the
//     window (or preceding an append-smoothing strip) — no pixels are
//     written during warm-up, only Map state.
//   - SMOOTHING ACROSS APPENDS: vertical smoothing + bloom are neighborhood
//     ops, so a naive single-column append would leave a visible seam at the
//     boundary. Instead, when `smoothing` is on, the append path re-derives
//     and repaints the last APPEND_SMOOTH_STRIP_COLS columns (a small strip
//     including the new column(s) + a few already-painted neighbors) from
//     their retained DecodedColumn objects in `meta.cols` — this is an exact
//     recomputation (not an approximation over already-blended pixels),
//     because the strip's persistence state is rebuilt via
//     buildPersistWarmupMap immediately before it.
//   - Cheap extra wins: repaints are skipped entirely while `document.hidden`
//     (a visibilitychange listener marks dirty so the view refreshes the
//     instant the tab regains visibility); the paint loop precomputes an
//     alphaSkipCutoffUsd (depthSignificance.ts) to skip bins whose alpha
//     would be imperceptible without touching the color/compression math.
//
// Phase 7 — LEVEL OF DETAIL (LOD) downsampling (perf fix — the visible-window
// painting above bounds cell count to the visible time range, but at a wide
// zoom (e.g. 15m view spanning days) each raw 5s column can collapse to a
// SUB-PIXEL screen width — painting one bitmap cell per raw column paints
// millions of cells that collapse into far fewer screen pixels. Bookmap-class
// tools never paint more cells than screen pixels; this mirrors that:
//   1. Column bucketing (time axis) — `computeBucketFactorWithHysteresis`
//      (depthSignificance.ts, review-hardened — see Phase 8 below) derives
//      how many raw columns to merge into one PAINTED column from the
//      raw column's current screen-px width (`rawColWidthPxRef`, a one-frame-
//      lag measurement of pxPerSec * rawIntervalMs, distinct from
//      `depthColWidthPxRef` which measures the PAINTED column's width and
//      keeps feeding the existing zoom-density ink-budget logic unchanged).
//      `bucketColumns` (depthSignificance.ts) groups the window's raw columns
//      into fixed EPOCH-ALIGNED buckets (stable across repaints/appends,
//      see its doc comment) and merges each bucket via MAX-q per price
//      (`mergeColumnsMaxQ`) — a wall visible at any point in the bucket stays
//      visible, matching Bookmap semantics. The bucketed columns are then fed
//      through the EXACT SAME `paintColumnsRange`/persistence machinery as
//      raw columns — from `repaintOffscreen`'s perspective a bucketed column
//      IS a column, just a synthetic merged one. `bucketFactor <= 1` (the
//      common case — zoomed in enough that raw columns are already >=1.5px)
//      is a documented no-op passthrough with IDENTICAL behavior to pre-LOD.
//   2. Row merging (price axis) — same idea on the price axis:
//      `computeRowMergeFactor` derives how many raw price rows to merge into
//      one painted row from an ESTIMATED row height (pane CSS height /
//      raw numRows — see repaintOffscreen's `paneHeightPxEstimate` param).
//      `paintColumnsRange` picks the WINNER (max-q) raw bin per merged-row
//      group and renders only that bin's color/persistence — same
//      "strongest signal survives" principle as column bucketing, applied to
//      the vertical axis. `meta.rawNumRows` (pre-merge) is kept alongside
//      `meta.numRows` (post-merge, the actual bitmap height) so the append
//      path can still compute the raw price-range bound (`rowMaxPrice`)
//      correctly.
//   3. LOD-tier-change rebuild trigger — a `bucketFactor` crossing (measured
//      every frame from `rawColWidthPxRef`) schedules the SAME debounced
//      full rebuild as a zoom-tier/margin-exceeded change (`lastBucketFactor
//      AppliedRef` mirrors the existing `lastZoomMultAppliedRef` pattern).
//      `rowMergeFactor` has no separate proactive trigger: it depends on
//      `numRows`, which is itself only known mid-rebuild (from the weighted
//      price extent), so it's simply recomputed fresh on every rebuild that
//      already happens for another reason (margin/zoom/bucket/palette
//      changes) — those fire often enough during real pan/zoom/volatility
//      that a dedicated trigger would be redundant.
//   4. Append path under LOD — `meta.lastPaintedRawT` (not the painted
//      column's own `.t`, which is a BUCKET start once LOD is active) is
//      what the live-edge check compares against the `columns` prop's
//      previous last raw timestamp. When `meta.bucketFactor <= 1` the append
//      path is BYTE-FOR-BYTE the pre-LOD code (see the `bucketFactor <= 1`
//      branch below) — zero behavior change in the common case. When > 1,
//      each newly appended RAW column either extends the bucket it belongs
//      to (`meta.lastBucketRawCols` retains the raw columns composing the
//      currently-open last bucket so it can be re-merged via
//      `mergeColumnsMaxQ` on every tick) or starts a new one (advances
//      `meta.numCols` via the existing WINDOW_SLACK_COLS mechanism); either
//      way exactly ONE painted pixel column is repainted (or, with
//      smoothing on, the existing append-smoothing-strip logic runs
//      unchanged over the now-bucketed `meta.cols`, since that logic only
//      ever operates on "whatever `meta.cols` currently holds").

import { useEffect, useRef } from 'react';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import type { DecodedColumn } from '@/pages/app/crypto/scanner/depthTypes';
import { getPaletteLUT, type DepthPaletteId } from './depthPalettes';
import {
  qToUsd,
  histogramPercentile,
  kneePercentileForInkBudget,
  effectiveTargetLitFraction,
  zoomDensityMultiplier,
  computeWindowRange,
  alphaSkipCutoffUsd,
  classifyColumnsUpdate,
  requiredRowMergeFactorForCap,
  computeBucketFactorWithHysteresis,
  computeRowMergeFactorWithHysteresis,
  mergeColumnsMaxQ,
  bucketStartMs,
  paintedWindowEndMs,
  bumpPersistMapForColumn,
  PERSISTENCE_RAMP_COLUMNS_DEFAULT,
  type DepthSensitivity,
} from './depthSignificance';
import {
  MAX_GRID_ROWS,
  MAX_GRID_CELLS,
  buildPersistWarmupMap,
  paintColumnsRangeToBuffer,
  computeFullRaster,
  type RasterJob,
  type RasterResult,
} from './depthRasterCore';

// Grid safety caps (MAX_GRID_ROWS / MAX_GRID_CELLS) moved to
// depthRasterCore.ts (perf phase, 2026-07-20) alongside the rebuild compute
// they bound — imported above.

// Phase 6 — visible-window painting constants.
// Fraction of the visible time span painted as margin on EACH side beyond
// the visible range, so small pans/zooms don't need a rebuild.
const WINDOW_MARGIN_FRACTION = 0.4;
// Debounce for a full window rebuild (view exits margin / zoom-tier flip /
// palette-sensitivity-binSize-smoothing change) — coalesces rapid changes
// (e.g. a sensitivity slider drag or a fast continuous pan) into one rebuild.
const REBUILD_DEBOUNCE_MS = 120;
// Extra offscreen columns allocated beyond the painted window so the
// live-append fast path can paint new columns without a canvas resize. Once
// exhausted, the next update forces a full window rebuild.
const WINDOW_SLACK_COLS = 64;
// Columns re-derived (from their retained DecodedColumn objects) and
// repainted on every live append when smoothing is enabled, so the vertical
// smoothing / bloom neighborhood ops never leave a seam at the append
// boundary. Includes the newly appended column(s) plus a few prior neighbors.
// An ADDITIONAL 1-column left border is added on top of this at the call
// site (see the append path's `stripStart` comment) so bloom/smoothing
// reach is exact at the strip's own left edge too.
const APPEND_SMOOTH_STRIP_COLS = 8;
// Fallback depth-column sampling interval (ms) used only when fewer than 2
// columns are available to estimate it from recent timestamp deltas.
const DEFAULT_COL_INTERVAL_MS = 5000;

// Intensity/bloom/smoothing raster helpers moved to depthRasterCore.ts
// (perf phase, 2026-07-20) so the worker and the append fast path share one
// implementation.

// ── Histogram-based percentile (O(n) build, no sort) ─────────────────────────
//
// Reusable 65536-bin histogram — hoisted to avoid allocating 256KB per call.
// Module-scoped + single-threaded (rAF) so reuse is safe; zero-filled each
// call. Built ONCE per recomputeNorm call and fed to the pure percentile
// helpers in depthSignificance.ts (histogramPercentile /
// kneePercentileForInkBudget) so p99 (color reference) and the ink-budget
// knee (p50/p92/target — Phase 3) share a single histogram build instead of
// each re-scanning the raw q-value array from scratch.
const HIST_SCRATCH = new Uint32Array(65536);

/** Fills HIST_SCRATCH from a uint16 value array and returns it + the total count. Reused across multiple percentile queries in the same recomputeNorm call. */
function buildQHistogram(qValues: Uint16Array): { hist: Uint32Array; total: number } {
  const hist = HIST_SCRATCH;
  hist.fill(0);
  for (let i = 0; i < qValues.length; i++) hist[qValues[i]]++;
  return { hist, total: qValues.length };
}

/**
 * Thin canvas adapter over depthRasterCore.paintColumnsRangeToBuffer — kept
 * so the live-append call sites below stay shaped exactly as before the
 * worker extraction (perf phase, 2026-07-20): creates the range-sized
 * ImageData, lets the core paint/smooth/bloom into its buffer, and blits it
 * at `destX`. Full-window rebuilds no longer come through here — they run in
 * depthRaster.worker.ts (or the sync computeFullRaster fallback) and are
 * committed wholesale by commitRasterResult inside the component.
 */
function paintColumnsRange(
  octx: OffscreenCanvasRenderingContext2D,
  cols: DecodedColumn[],
  rangeStart: number,
  rangeEnd: number,
  destX: number,
  priceMin: number,
  rowMaxPrice: number,
  rowEpsilon: number,
  curBinSize: number,
  numRows: number,
  vLo: number,
  vHi: number,
  lut: Uint32Array,
  legacyQCut: number,
  alphaCutoffUsd: number,
  smoothingEnabled: boolean,
  bloomEnabled: boolean,
  persistMap: Map<number, number>,
  rowMergeFactor: number = 1,
  bumpRangeStart: number = rangeStart,
  // Step 2A (live-append fast-path threading — the Step-1 gap): forwarded to
  // paintColumnsRangeToBuffer so live-tick appends in 'clean' mode paint
  // with the SAME clean alpha as a full rebuild, instead of always falling
  // back to legacy alpha here. Defaults to 'legacy' for any other caller.
  visualModel: 'legacy' | 'clean' = 'legacy',
): void {
  const width = rangeEnd - rangeStart;
  if (width <= 0) return;
  const imgData = octx.createImageData(width, numRows);
  const buf = new Uint32Array(imgData.data.buffer);
  paintColumnsRangeToBuffer(
    buf,
    cols,
    rangeStart,
    rangeEnd,
    priceMin,
    rowMaxPrice,
    rowEpsilon,
    curBinSize,
    numRows,
    vLo,
    vHi,
    lut,
    legacyQCut,
    alphaCutoffUsd,
    smoothingEnabled,
    bloomEnabled,
    persistMap,
    rowMergeFactor,
    bumpRangeStart,
    visualModel,
  );
  octx.putImageData(imgData, destX, 0);
}

/** Estimates the depth-column sampling interval (ms) from the last two column timestamps — robust to an occasional gap column since it only looks at the freshest delta. */
function estimateColumnIntervalMs(cols: DecodedColumn[]): number {
  const n = cols.length;
  if (n < 2) return DEFAULT_COL_INTERVAL_MS;
  const delta = cols[n - 1].t - cols[n - 2].t;
  return delta > 0 ? delta : DEFAULT_COL_INTERVAL_MS;
}

/** Metadata attached to the offscreen canvas describing what's currently painted — read by the per-frame blit step AND mutated in place by the live-append fast path. */
interface OffscreenMeta {
  priceMin: number;
  priceMax: number;
  /** Number of REAL (painted) columns — may be less than the canvas's physical width (which includes WINDOW_SLACK_COLS headroom for the append fast path). */
  numCols: number;
  /** PAINTED (post row-merge) row count — the actual bitmap height. See `rawNumRows` for the pre-merge row count. */
  numRows: number;
  /** Pre-merge row count (priceMax-priceMin span / curBinSize) — needed to compute the raw price-range bound (`rowMaxPrice`) in the append path, since `numRows` above is the (smaller, post-merge) bitmap height once `rowMergeFactor > 1`. Equal to `numRows` when `rowMergeFactor === 1`. */
  rawNumRows: number;
  /** The painted column objects for the window, 1:1 with pixel columns 0..numCols-1 — RAW DecodedColumn objects when `bucketFactor === 1` (pre-LOD behavior, unchanged), or synthetic bucket-merged columns (see `bucketColumns`/`mergeColumnsMaxQ`) when `bucketFactor > 1`. Grows in place on live append. */
  cols: DecodedColumn[];
  curBinSize: number;
  /** Physical offscreen canvas width (numCols + slack). */
  bitmapWidth: number;
  /** LOD (Phase 7) — raw columns merged per painted column. 1 = no bucketing (pre-LOD behavior). */
  bucketFactor: number;
  /** LOD (Phase 7) — raw price rows merged per painted row. 1 = no merging. */
  rowMergeFactor: number;
  /** LOD (Phase 7) — the raw depth-column sampling interval (ms) used to compute this repaint's bucket boundaries — needed by the append path to keep bucketing epoch-aligned with what was just painted. */
  rawIntervalMs: number;
  /** LOD (Phase 7) — the LAST raw column timestamp incorporated into the bitmap (as opposed to `cols[numCols-1].t`, which is a BUCKET start time once `bucketFactor > 1` and would never equal a raw `columns` prop timestamp). Used by the live-edge append check. */
  lastPaintedRawT: number;
  /** LOD (Phase 7) — epoch-aligned bucket-start time of the currently-open LAST painted bucket (`cols[numCols-1].t` when `bucketFactor > 1`). Used to decide whether a newly appended raw column extends that bucket or starts a new one. */
  lastBucketStartT: number;
  /** LOD (Phase 7) — the raw columns composing the currently-open last painted bucket, retained so it can be re-merged (`mergeColumnsMaxQ`) as new raw columns arrive within the same bucket span. Empty/unused when `bucketFactor === 1`. */
  lastBucketRawCols: DecodedColumn[];
  /**
   * LOD (Phase 8, CRITICAL 2 review fix) — persistence-count snapshot as of
   * right BEFORE the currently-open last bucket's own contribution. Every
   * extension repaint of that open bucket derives its persistence multiplier
   * from a FRESH clone of this base + exactly one bump for the bucket's
   * CURRENT (re-merged) content — never by mutating a running map across
   * repeated repaints, which would let a single forming bucket accumulate up
   * to `bucketFactor` increments instead of exactly 1. Committed (updated to
   * include the just-closed bucket's own single bump) the moment a NEW
   * bucket opens. Unused when `bucketFactor === 1` (the pre-LOD append path
   * doesn't touch it).
   */
  persistBaseMap: Map<number, number>;
  /**
   * Whether the bloom pass was enabled for THIS window's rebuild (gated by
   * BLOOM_MAX_CELLS in depthRasterCore.computeFullRaster). Append strips
   * must paint with the SAME flag or halo seams appear at strip boundaries.
   */
  bloomEnabled: boolean;
}

function getMeta(offscreen: OffscreenCanvas | null): OffscreenMeta | undefined {
  if (!offscreen) return undefined;
  return (offscreen as unknown as Record<string, unknown>)._meta as OffscreenMeta | undefined;
}

function setMeta(offscreen: OffscreenCanvas, meta: OffscreenMeta): void {
  (offscreen as unknown as Record<string, unknown>)._meta = meta;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface DepthMatrixLayerProps {
  chart: IChartApi;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series: ISeriesApi<any>;
  columns: DecodedColumn[];
  binSize: number;
  /** Container CSS width in px */
  width: number;
  /** Container CSS height in px */
  height: number;
  /** Current candle interval in milliseconds — used to map column→px width */
  candleIntervalMs: number;
  /**
   * @deprecated legacy MarketScanner.tsx-compat ONLY — do not wire this up
   * for any new caller. LiquidityTab.tsx never passes this (undefined/0 —
   * the new continuous soft-knee alpha, see depthSignificance.ts, is the
   * only mapping that runs). When MarketScanner.tsx passes a value > 0, an
   * ADDITIONAL legacy binary dimming cap (bins below a relative-to-p99 qCut
   * get their color intensity clamped, exactly like the old
   * WEAK_CELL_T_CAP=0.10 behavior) is applied ON TOP of the new soft-knee
   * alpha, so MarketScanner's own "Size" filter pills keep working exactly
   * as before. Zero cost when undefined/0 — no legacy branch even evaluated.
   */
  sizeFilterPct?: number;
  /**
   * Color palette for the heatmap ramp — see depthPalettes.ts.
   * Default 'classic': the ORIGINAL navy→blue→cyan→yellow→white ramp,
   * preserved bit-for-bit for backward compat (MarketScanner.tsx never
   * passes this prop). LiquidityTab.tsx passes 'finotaur' (the new default
   * gold-on-black premium look) or 'thermal'.
   */
  palette?: DepthPaletteId;
  /**
   * Enables vertical band-smoothing + a soft bloom halo on the hottest walls
   * (see applyVerticalSmoothing/applyBloom above). Both run ONLY inside the
   * already dirty-gated offscreen rasterization — never per-frame.
   * Default false when absent (safe no-op for MarketScanner.tsx and any
   * other caller that doesn't pass this prop).
   */
  smoothing?: boolean;
  /**
   * Ink-budget sensitivity preset (Phase 3 — see depthSignificance.ts's
   * SENSITIVITY_TARGET_LIT_FRACTION). Controls what fraction of visible
   * cells render "lit" (near-full alpha) before the zoom-density multiplier
   * is applied. Default 'balanced' when absent — safe no-op for
   * MarketScanner.tsx and any other caller that doesn't pass this prop.
   */
  sensitivity?: DepthSensitivity;
  /**
   * Opt-in Bookmap-style clean visual model (steeper alpha ramp — see
   * depthSignificance.ts's softKneeAlpha doc comment). Default 'legacy' —
   * safe no-op for MarketScanner.tsx and any other caller that doesn't pass
   * this prop; the continuous soft-knee formula is unchanged.
   */
  depthVisualModel?: 'legacy' | 'clean';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DepthMatrixLayer({
  chart,
  series,
  columns,
  binSize,
  width,
  height,
  candleIntervalMs,
  sizeFilterPct = 0,
  palette = 'classic',
  smoothing = false,
  sensitivity = 'balanced',
  depthVisualModel = 'legacy',
}: DepthMatrixLayerProps) {
  const canvasRef          = useRef<HTMLCanvasElement>(null);
  const offscreenRef       = useRef<OffscreenCanvas | null>(null);
  const offscreenCtxRef    = useRef<OffscreenCanvasRenderingContext2D | null>(null);

  const rafRef             = useRef<number | null>(null);
  const lastFingerprintRef = useRef<string>('');

  // Phase 6 — full-rebuild debounce (view exits margin / zoom-tier flip /
  // palette-sensitivity-binSize-smoothing change). scheduleRebuild() arms a
  // single REBUILD_DEBOUNCE_MS timer; the frame loop consumes rebuildDueRef.
  const rebuildTimerRef = useRef<number | null>(null);
  const rebuildDueRef   = useRef<boolean>(false);
  const isFirstParamsEffectRef = useRef<boolean>(true);

  // Phase 6 — live-append bookkeeping. `lastColumnsArrayRef` detects a
  // `columns` prop identity change; `lastPersistMapRef` carries the
  // persistence Map's consecutive-count state forward across appends.
  const lastColumnsArrayRef = useRef<DecodedColumn[] | null>(null);
  const lastPersistMapRef   = useRef<Map<number, number>>(new Map());

  // Review fix (SHOULD-FIX 2) — the last rebuild's REAL numRows, fed back
  // into computeWindowRange as the `numRowsEstimate` for the NEXT rebuild so
  // the margin itself is shrunk to fit the cell budget UP FRONT (rather than
  // a later post-hoc trim silently narrowing the painted window below what
  // the margin-exceeded check assumes). `null` before the first rebuild —
  // computeWindowRange treats an absent/non-positive estimate as "no budget
  // clip" (identical to the pre-review behavior for that one first call).
  const lastNumRowsRef = useRef<number | null>(null);

  // Normalization params — recomputed on visible window change or slider move.
  const vLoRef = useRef<number>(0);
  const vHiRef = useRef<number>(1);

  // Phase 2 point 3 — EMA state (alpha=0.35) smoothing vHi/vLo ACROSS
  // recomputes so the knee itself doesn't jump between repaints (the
  // hysteresis that keeps cells near the knee from blinking). `null` = no
  // prior sample yet, i.e. "use the raw value as-is" (the very first
  // recompute after mount). Reset happens implicitly: LiquidityTab.tsx
  // remounts this whole chart subtree per-symbol (`key={symbol}`), so a
  // symbol/store change creates a brand-new component instance with fresh
  // (null) refs — no explicit reset call is needed here.
  const vHiEmaRef = useRef<number | null>(null);
  const vLoEmaRef = useRef<number | null>(null);

  // Phase 3 — tracks the depth-COLUMN pixel width (distinct from the candle
  // bar spacing — see the per-frame affine-mapping block's `colWidthPx`),
  // updated once per frame (one-frame lag, same pattern as `barSpacingRef`
  // below) so recomputeNorm can derive a zoom-density multiplier without a
  // same-frame ordering dependency on the affine-mapping step that runs
  // later in drawFrame.
  const depthColWidthPxRef = useRef<number>(8);
  // The zoom-density multiplier actually baked into the LAST repaint — a
  // fresh repaint is forced (via scheduleRebuild) when the live multiplier
  // drifts away from this by more than ZOOM_REPAINT_EPSILON.
  const lastZoomMultAppliedRef = useRef<number>(1);

  // LOD (Phase 7) — screen-px width of ONE RAW (un-bucketed) depth column,
  // distinct from `depthColWidthPxRef` above (which is the PAINTED column's
  // width — post-bucket once LOD is active, and stays feeding the existing
  // ink-budget zoom-density logic unchanged, per the module doc comment's
  // "LOD design" section point 1). Same one-frame-lag pattern: updated at
  // the end of THIS frame's affine-mapping step, read at the START of the
  // NEXT frame's bucket-factor decision.
  const rawColWidthPxRef = useRef<number>(8);
  // The column bucket factor actually baked into the LAST repaint — mirrors
  // `lastZoomMultAppliedRef`'s role: a fresh repaint is forced when the
  // live bucket factor (derived from rawColWidthPxRef, hysteresis-aware —
  // see computeBucketFactorWithHysteresis) differs from this.
  const lastBucketFactorAppliedRef = useRef<number>(1);
  // SHOULD-FIX 1 (review) — the row merge factor actually baked into the
  // LAST repaint, so a pane-height (CSS resize) change that would flip the
  // ceil-based rowMergeFactor also schedules a rebuild — mirrors
  // `lastBucketFactorAppliedRef` exactly, on the price axis instead of time.
  const lastRowMergeFactorAppliedRef = useRef<number>(1);

  // Keep latest props in refs.
  const columnsRef         = useRef<DecodedColumn[]>(columns);
  const binSizeRef         = useRef<number>(binSize);
  const widthRef           = useRef<number>(width);
  const heightRef          = useRef<number>(height);
  const candleIntervalRef  = useRef<number>(candleIntervalMs);
  // Legacy MarketScanner-compat only — see the prop's @deprecated doc comment.
  const sizeFilterRef      = useRef<number>(sizeFilterPct);
  const paletteRef         = useRef<DepthPaletteId>(palette);
  const smoothingRef       = useRef<boolean>(smoothing);
  const sensitivityRef     = useRef<DepthSensitivity>(sensitivity);
  const visualModelRef     = useRef<'legacy' | 'clean'>(depthVisualModel);

  columnsRef.current        = columns;
  binSizeRef.current        = binSize;
  widthRef.current          = width;
  heightRef.current         = height;
  candleIntervalRef.current = candleIntervalMs;
  sizeFilterRef.current     = sizeFilterPct;
  paletteRef.current        = palette;
  smoothingRef.current      = smoothing;
  sensitivityRef.current    = sensitivity;
  visualModelRef.current    = depthVisualModel;

  // Phase 6 — arms the debounced full-rebuild timer. Idempotent while
  // already armed (lets it fire once rather than perpetually resetting).
  function scheduleRebuild() {
    if (rebuildTimerRef.current !== null) return;
    rebuildTimerRef.current = window.setTimeout(() => {
      rebuildDueRef.current = true;
      rebuildTimerRef.current = null;
    }, REBUILD_DEBOUNCE_MS);
  }

  // ── Normalization ─────────────────────────────────────────────────────────

  // Phase 2 point 3 — EMA smoothing factor for vHi/vLo across recomputes.
  const NORM_EMA_ALPHA = 0.35;

  function recomputeNorm(
    cols: DecodedColumn[],
    chart2: IChartApi,
    curBinSize: number,
    curSensitivity: DepthSensitivity,
    pxPerCell: number,
  ) {
    // Only look at visible columns. `cols` is already the WINDOW slice
    // (Phase 6) — restricting further by visible range (±2min slack) keeps
    // this unified with the same window bounds repaintOffscreen paints.
    const vis = chart2.timeScale().getVisibleRange();
    const fromSec = vis ? (vis.from as unknown as number) : -Infinity;
    const toSec   = vis ? (vis.to   as unknown as number) : Infinity;

    const qList: number[] = [];
    for (const col of cols) {
      const colSec = col.t / 1000;
      if (colSec < fromSec - 120 || colSec > toSec + 120) continue; // ±2 min slack
      if (col.binSize !== curBinSize) continue; // rebucketed columns may differ temporarily
      for (const r of col.bids) {
        if (r.q > 0) qList.push(r.q);
      }
      for (const r of col.asks) {
        if (r.q > 0) qList.push(r.q);
      }
    }

    if (qList.length < 2) {
      // Transient empty/near-empty window (e.g. a brief reconnect gap). On
      // the very first recompute (no prior EMA sample) fall back to the
      // original degenerate defaults. Once a real EMA is established, KEEP
      // it rather than snapping to the fallback and back a frame later —
      // that snap-and-recover was itself a flicker source this phase exists
      // to remove.
      if (vHiEmaRef.current === null) {
        vLoRef.current = 0;
        vHiRef.current = 1;
      }
      return;
    }

    const arr = new Uint16Array(qList.length);
    for (let i = 0; i < qList.length; i++) arr[i] = Math.min(65535, qList[i]);

    const { hist, total } = buildQHistogram(arr);

    // vHi = p99 (clamp ice-bergs) — the color-intensity reference.
    const rawHi = histogramPercentile(hist, total, 0.99);

    const targetLitFraction = effectiveTargetLitFraction(curSensitivity, pxPerCell);
    const rawLo = kneePercentileForInkBudget(hist, total, targetLitFraction);

    // Decode to USD (actual normalization above is in q-space).
    const rawHiUsd = rawHi > 0 ? qToUsd(rawHi) : 1;
    const rawLoUsd = qToUsd(rawLo);

    // EMA-smooth across recomputes (α=0.35) — the hysteresis that keeps the
    // knee itself stable so cells near it don't blink between repaints.
    const prevHi = vHiEmaRef.current;
    const prevLo = vLoEmaRef.current;
    const smoothedHi = prevHi === null ? rawHiUsd : prevHi + NORM_EMA_ALPHA * (rawHiUsd - prevHi);
    const smoothedLo = prevLo === null ? rawLoUsd : prevLo + NORM_EMA_ALPHA * (rawLoUsd - prevLo);
    vHiEmaRef.current = smoothedHi;
    vLoEmaRef.current = smoothedLo;

    vHiRef.current = smoothedHi;
    vLoRef.current = smoothedLo;

    if (vHiRef.current <= vLoRef.current) {
      vHiRef.current = vLoRef.current + 1;
    }
  }

  // ── Offscreen full-window rebuild — worker dispatch + commit (perf phase,
  // 2026-07-20). The former synchronous repaintOffscreen body now lives in
  // depthRasterCore.computeFullRaster and normally runs inside
  // depthRaster.worker.ts; the main thread only (a) snapshots a bounded
  // RasterJob (warm-up slice + window slice + all scalar params), and
  // (b) commits the returned pixels+meta wholesale. While a job is in
  // flight the PREVIOUS bitmap keeps drawing — the visible chart never
  // blanks. Staleness rules:
  //   - jobId is monotonically increasing; only the LATEST dispatched job
  //     may commit (older in-flight results are dropped on arrival).
  //   - If live columns arrived between dispatch and commit (the job window
  //     ended at the live edge but the prop array has newer raw columns
  //     now), commit schedules one more debounced rebuild — the append fast
  //     path can't top up the new bitmap because those columns were never
  //     classified against it.
  //   - Worker construction failure (or a worker runtime error) flips
  //     workerBrokenRef and every subsequent rebuild runs the SAME
  //     computeFullRaster synchronously on the main thread — identical
  //     output, pre-worker behavior.

  const workerRef = useRef<Worker | null>(null);
  const workerBrokenRef = useRef<boolean>(false);
  const jobCounterRef = useRef<number>(0);
  /** Dispatch-time context for in-flight jobs, keyed by jobId — only what commit can't get from the RasterResult itself. */
  const pendingJobsRef = useRef<Map<number, { zoomMult: number; windowEndWasLiveEdge: boolean }>>(new Map());
  /** Stable indirection so the worker's onmessage (bound once on mount) always calls the latest commit closure. */
  const commitFnRef = useRef<(result: RasterResult) => void>(() => {});
  // Single-in-flight serialization (review fix, CRITICAL — rebuild storm).
  // While a job is in flight the tier refs (lastZoomMult/lastBucketFactor/
  // lastRowMergeFactor) still describe the OLD bitmap, so the per-frame
  // triggers keep re-firing scheduleRebuild every REBUILD_DEBOUNCE_MS until
  // the commit lands. Without this guard each of those re-fires dispatched a
  // fresh (redundant) worker job — a queue of wasted full-window rasters
  // whenever one job took longer than the 120ms debounce, exactly on the
  // large windows this worker exists for. Instead: at most ONE job in
  // flight; any rebuild request that arrives meanwhile just queues ONE
  // deferred re-dispatch, which commit converts back into a normal
  // scheduleRebuild (so it re-derives the FRESHEST window/zoom when it
  // actually runs).
  const inFlightJobIdRef = useRef<number | null>(null);
  const redispatchQueuedRef = useRef<boolean>(false);

  function dispatchRebuild(
    fullCols: DecodedColumn[],
    windowStartIdx: number,
    windowEndIdx: number,
    rawIntervalMs: number,
    bucketFactor: number,
    zoomMult: number,
  ): void {
    if (windowEndIdx < windowStartIdx) return;
    if (inFlightJobIdRef.current !== null) {
      redispatchQueuedRef.current = true;
      return;
    }
    // Bounded persistence warm-up lookback — the same reach the old
    // synchronous body used: (rampColumns + 2) columns at the PAINTED
    // granularity, expressed in raw columns (× bucketFactor, plus one
    // bucket of partial-edge margin when bucketing is active).
    const rampColumns = PERSISTENCE_RAMP_COLUMNS_DEFAULT;
    const lookbackRawCount = bucketFactor > 1
      ? (rampColumns + 2) * bucketFactor + bucketFactor
      : rampColumns + 2;
    const warmStart = Math.max(0, windowStartIdx - lookbackRawCount);

    // Step 2A — visible price window (clean mode only need it, but it's
    // cheap to compute unconditionally). Read straight from the series
    // instance, mirroring drawFrame's yAtPriceMax/yAtPriceMin lookups —
    // `series` is the same prop dispatchRebuild already closes over.
    let visPriceLo: number | undefined;
    let visPriceHi: number | undefined;
    {
      const _s = series;
      const _h = heightRef.current;
      const _top = _s?.coordinateToPrice(0);
      const _bot = _h > 0 ? _s?.coordinateToPrice(_h) : null;
      if (_top != null && _bot != null && Number.isFinite(_top) && Number.isFinite(_bot)) {
        visPriceHi = Math.max(_top, _bot);
        visPriceLo = Math.min(_top, _bot);
      }
    }

    const jobId = ++jobCounterRef.current;
    const job: RasterJob = {
      jobId,
      warmupRawCols: fullCols.slice(warmStart, windowStartIdx),
      windowRawCols: fullCols.slice(windowStartIdx, windowEndIdx + 1),
      curBinSize: binSizeRef.current,
      vLo: vLoRef.current,
      vHi: vHiRef.current,
      sizePct: sizeFilterRef.current,
      paletteId: paletteRef.current,
      smoothingEnabled: smoothingRef.current,
      rawIntervalMs,
      bucketFactor,
      paneHeightPxEstimate: heightRef.current,
      visualModel: visualModelRef.current,
      visPriceLo,
      visPriceHi,
    };
    pendingJobsRef.current.set(jobId, {
      zoomMult,
      windowEndWasLiveEdge: windowEndIdx === fullCols.length - 1,
    });
    inFlightJobIdRef.current = jobId;

    const w = workerRef.current;
    if (w && !workerBrokenRef.current) {
      // Structured clone of the two column slices — bounded by the window
      // (not full history). Profile before optimizing further (a packed
      // transfer format is NOT built speculatively — see PR notes).
      w.postMessage(job);
    } else {
      commitFnRef.current(computeFullRaster(job));
    }
  }

  function commitRasterResult(result: RasterResult): void {
    // Clear the in-flight slot and run any deferred re-dispatch FIRST —
    // every early-return below (unknown/superseded/empty) must still
    // release the single-in-flight serialization or rebuilds deadlock.
    // Unconditional (review fix): with at most ONE job ever outstanding,
    // any worker reply must be the answer to that job — a jobId mismatch
    // (e.g. the worker catch's -1 fallback for a malformed message) must
    // still release the slot, or dispatches deadlock for the rest of the
    // mount with no visible error.
    inFlightJobIdRef.current = null;
    if (redispatchQueuedRef.current) {
      redispatchQueuedRef.current = false;
      scheduleRebuild();
    }

    const info = pendingJobsRef.current.get(result.jobId);
    pendingJobsRef.current.delete(result.jobId);
    if (!info) return; // unknown (e.g. cleared on unmount) — drop
    if (result.jobId !== jobCounterRef.current) return; // superseded by a newer dispatch
    if (result.empty) return; // nothing paintable — keep the previous bitmap

    const bitmapWidth = result.numCols + WINDOW_SLACK_COLS;
    if (
      !offscreenRef.current ||
      offscreenRef.current.width !== bitmapWidth ||
      offscreenRef.current.height !== result.paintedNumRows
    ) {
      try {
        offscreenRef.current = new OffscreenCanvas(bitmapWidth, result.paintedNumRows);
        offscreenCtxRef.current = offscreenRef.current.getContext('2d', { alpha: true })!;
      } catch {
        return;
      }
    }
    const octx = offscreenCtxRef.current;
    if (!octx || !result.pixels) return;

    octx.clearRect(0, 0, bitmapWidth, result.paintedNumRows);
    // Zero-copy wrap: the transferred ArrayBuffer becomes the ImageData's
    // backing store directly (length is exactly numCols*paintedNumRows*4).
    const imgData = new ImageData(
      new Uint8ClampedArray(result.pixels),
      result.numCols,
      result.paintedNumRows,
    );
    octx.putImageData(imgData, 0, 0);

    setMeta(offscreenRef.current, {
      priceMin: result.priceMin,
      priceMax: result.priceMax,
      numCols: result.numCols,
      numRows: result.paintedNumRows,
      rawNumRows: result.rawNumRows,
      cols: result.cols,
      curBinSize: result.curBinSize,
      bitmapWidth,
      bucketFactor: result.bucketFactor,
      rowMergeFactor: result.rowMergeFactor,
      rawIntervalMs: result.rawIntervalMs,
      lastPaintedRawT: result.lastPaintedRawT,
      lastBucketStartT: result.lastBucketStartT,
      lastBucketRawCols: result.lastBucketRawCols,
      persistBaseMap: result.persistBaseMap,
      bloomEnabled: result.bloomEnabled,
    });

    lastPersistMapRef.current = result.persistMap;
    // Feed the PAINTED numRows back for the NEXT rebuild's
    // computeWindowRange budget (cells = columns × painted rows).
    lastNumRowsRef.current = result.paintedNumRows;
    // Commit-time (not dispatch-time) tier bookkeeping: if a job errors or
    // is superseded these refs keep describing what's ACTUALLY painted, so
    // the per-frame triggers re-fire rather than silently going stale.
    lastZoomMultAppliedRef.current = info.zoomMult;
    lastBucketFactorAppliedRef.current = result.bucketFactor;
    lastRowMergeFactorAppliedRef.current = result.rowMergeFactor;

    // Live-edge top-up — columns that arrived while the job was in flight
    // exist only in the OLD bitmap's append history (or nowhere), never in
    // this result. One more debounced rebuild folds them in.
    if (info.windowEndWasLiveEdge) {
      const cur = columnsRef.current;
      if (cur.length > 0 && cur[cur.length - 1].t > result.lastPaintedRawT) {
        scheduleRebuild();
      }
    }
  }
  commitFnRef.current = commitRasterResult;

  // Worker lifecycle — one worker per component instance, created on mount.
  useEffect(() => {
    try {
      const w = new Worker(
        new URL('./depthRaster.worker.ts', import.meta.url),
        { type: 'module' },
      );
      w.onmessage = (evt: MessageEvent) => {
        commitFnRef.current(evt.data as RasterResult);
      };
      w.onerror = () => {
        // Fall back to synchronous rebuilds for the rest of this mount; a
        // rebuild is scheduled so the failed job's window still paints.
        // Release the in-flight slot too — the failed job's result will
        // never arrive, and leaving it set would deadlock every future
        // dispatch behind the single-in-flight guard.
        workerBrokenRef.current = true;
        inFlightJobIdRef.current = null;
        redispatchQueuedRef.current = false;
        pendingJobsRef.current.clear();
        scheduleRebuild();
      };
      workerRef.current = w;
    } catch {
      workerBrokenRef.current = true;
    }
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      pendingJobsRef.current.clear();
      inFlightJobIdRef.current = null;
      redispatchQueuedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback bar spacing used when only 1 column is loaded (can't infer from 2 pts).
  // Approximated from chart pane width / number of candles that fit at current interval.
  const barSpacingRef = useRef<number>(8);

  // ── RAF draw loop ─────────────────────────────────────────────────────────

  useEffect(() => {
    const chartInstance  = chart;
    const seriesInstance = series;
    let running = true;

    function drawFrame() {
      if (!running) return;
      rafRef.current = requestAnimationFrame(drawFrame);

      // Cheap extra win — skip all work while the tab is hidden. The
      // visibilitychange listener (below) marks dirty so the view repaints
      // the instant the tab regains visibility.
      if (document.hidden) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const cssW = widthRef.current;
      const cssH = heightRef.current;
      if (cssW <= 0 || cssH <= 0) return;

      // ── Step 1: DPR / resize — keep backing store in sync every frame ────
      // Must happen before clearRect so clearing uses the correct pixel dimensions.
      const dpr = window.devicePixelRatio || 1;
      const pixW = Math.round(cssW * dpr);
      const pixH = Math.round(cssH * dpr);
      if (canvas.width !== pixW || canvas.height !== pixH) {
        canvas.width  = pixW;
        canvas.height = pixH;
        canvas.style.width  = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // ── Step 2: Decide if the offscreen needs a full rebuild or a live
      // append (ONLY gate this) ─────────────────────────────────────────────
      // Per-frame fingerprint (same pattern as WallHeatLayer).
      const rawPaneW = chartInstance.timeScale().width();
      const paneW = (typeof rawPaneW === 'number' && rawPaneW > 0) ? rawPaneW : cssW;

      const logRange = chartInstance.timeScale().getVisibleLogicalRange();
      const fpFrom = logRange ? logRange.from : NaN;
      const fpTo   = logRange ? logRange.to   : NaN;

      // Sentinel probe: use the midpoint of current columns' price range.
      const cols = columnsRef.current;
      let sentinelPrice = 0;
      if (cols.length > 0) {
        for (const col of cols) {
          if (col.bids.length > 0) { sentinelPrice = col.bids[0].price; break; }
          if (col.asks.length > 0) { sentinelPrice = col.asks[0].price; break; }
        }
      }
      const fpY = sentinelPrice > 0
        ? (seriesInstance.priceToCoordinate(sentinelPrice) ?? NaN)
        : NaN;

      const fingerprint = `${paneW}|${cssW}|${cssH}|${fpFrom}|${fpTo}|${fpY}`;
      const fingerprintChanged = fingerprint !== lastFingerprintRef.current;

      // Phase 3 point 6 — zoom-awareness. `depthColWidthPxRef` holds the
      // depth-column pixel width from the PREVIOUS frame's affine-mapping
      // step (one-frame lag — same pattern `barSpacingRef` already uses).
      const ZOOM_REPAINT_EPSILON = 0.03;
      const curZoomMult = zoomDensityMultiplier(depthColWidthPxRef.current);
      const zoomTierChanged = Math.abs(curZoomMult - lastZoomMultAppliedRef.current) > ZOOM_REPAINT_EPSILON;
      if (zoomTierChanged) scheduleRebuild();

      // Raw depth-column sampling interval, computed once per frame and
      // shared by BOTH the columns-update classification below and the LOD
      // bucket-factor decision (previously each recomputed this separately).
      const rawIntervalMs = estimateColumnIntervalMs(cols);

      // Phase 6 — read the current offscreen meta once, up front, so BOTH
      // the LOD tier-change checks below AND the columns-update
      // classification further down can use it without re-fetching.
      const meta0 = getMeta(offscreenRef.current);
      let doFullRebuild = !meta0;
      let appendCols: DecodedColumn[] | null = null;

      // LOD (Phase 7) point 3 — column bucket-factor tier-change trigger.
      // `rawColWidthPxRef` holds the RAW (un-bucketed) column's screen px
      // width from the PREVIOUS frame's affine-mapping step (one-frame lag,
      // same pattern as `depthColWidthPxRef`/`barSpacingRef` above). A
      // bucket-factor crossing schedules the same debounced full rebuild as
      // a zoom-tier/margin change. Review fix (hysteresis) —
      // `computeBucketFactorWithHysteresis` adds a dead zone around
      // TARGET_MIN_COL_PX so sub-pixel float jitter in `pxPerSec` can't
      // flip the tier (and re-trigger a rebuild) every frame.
      const curBucketFactor = computeBucketFactorWithHysteresis(rawColWidthPxRef.current, lastBucketFactorAppliedRef.current);
      const bucketTierChanged = curBucketFactor !== lastBucketFactorAppliedRef.current;
      if (bucketTierChanged) scheduleRebuild();

      // SHOULD-FIX 1 (review) — row merge-factor pane-resize trigger. Unlike
      // bucketFactor (measured directly every frame), rowMergeFactor depends
      // on `numRows`, which is only known mid-rebuild — so this re-ESTIMATES
      // it from the CSS pane height (which changes on container resize) +
      // the LAST rebuild's real `rawNumRows`, with the same hysteresis
      // treatment as bucketFactor.
      if (meta0 && meta0.rawNumRows > 0) {
        const curRowPxEstimate = heightRef.current / meta0.rawNumRows;
        // Same max() as repaintOffscreen's factor derivation (far-wall fix,
        // 2026-07-20): the painted-row-cap term is deterministic in
        // rawNumRows (no hysteresis needed) but MUST appear on both sides
        // or the trigger and the rebuild disagree and loop.
        const curRowMergeFactor = Math.max(
          computeRowMergeFactorWithHysteresis(curRowPxEstimate, lastRowMergeFactorAppliedRef.current),
          requiredRowMergeFactorForCap(meta0.rawNumRows, MAX_GRID_ROWS),
        );
        if (curRowMergeFactor !== lastRowMergeFactorAppliedRef.current) scheduleRebuild();
      }

      const prevCols = lastColumnsArrayRef.current;
      if (cols !== prevCols) {
        if (prevCols && prevCols.length > 0 && cols.length > 0 && meta0) {
          const cls = classifyColumnsUpdate(prevCols, cols, rawIntervalMs);
          if (cls.kind === 'reset') {
            doFullRebuild = true;
            // CRITICAL 1 (review fix) — a 'reset' on an already-mounted
            // instance means the underlying data distribution may be
            // completely different (reconnect resync / store
            // clear-and-refill), NOT just a window/zoom change. Blending
            // the new distribution's knee against the OLD EMA state would
            // wash it out/oversaturate it for many frames. Null both EMA
            // refs so recomputeNorm treats this rebuild as a fresh first
            // sample (see recomputeNorm's `vHiEmaRef.current === null`
            // branch) — vLoRef/vHiRef themselves get freshly computed by
            // that same recomputeNorm call later this frame, no need to
            // touch them here.
            vHiEmaRef.current = null;
            vLoEmaRef.current = null;
          } else if ((cls.kind === 'append' || cls.kind === 'rotate') && cls.appendedCount > 0) {
            const prevLastT = prevCols[prevCols.length - 1].t;
            // LOD (Phase 7) — compare against the last RAW column actually
            // incorporated into the bitmap, NOT meta0.cols[last].t (which is
            // a BUCKET start time once bucketFactor > 1 and would never
            // equal a raw `columns` prop timestamp — see OffscreenMeta's
            // `lastPaintedRawT` doc comment).
            const atLiveEdge = meta0.numCols > 0 && meta0.lastPaintedRawT === prevLastT;
            if (atLiveEdge) {
              const appended = cols.slice(cols.length - cls.appendedCount);
              if (meta0.bucketFactor > 1) {
                // Bucketed append — see the module doc comment's "LOD
                // design" section point 4. Each newly appended RAW column
                // either extends the currently-open last bucket or starts a
                // new one; capacity is checked in BUCKET (painted-column)
                // units against the bitmap's slack headroom.
                const worstCaseNewBuckets = appended.length; // upper bound — every appended raw col could start a new bucket
                if (meta0.numCols + worstCaseNewBuckets <= meta0.bitmapWidth) {
                  appendCols = appended;
                } else {
                  doFullRebuild = true; // slack exhausted (worst case) — fall back to a full rebuild
                }
              } else if (meta0.numCols + appended.length <= meta0.bitmapWidth) {
                appendCols = appended;
              } else {
                doFullRebuild = true; // slack exhausted — fall back to a full rebuild
              }
            }
            // else: window isn't at the live edge — the new column(s) are
            // outside the current painted window; nothing to paint.
          }
        } else if (cols.length > 0) {
          doFullRebuild = true; // no previous snapshot (first data, or prev was empty)
        }
        lastColumnsArrayRef.current = cols;
      }

      // Window-margin check — has the visible range exited the painted
      // window's bounds? (meta.cols is keyed by TIME, so this reads directly
      // off the retained column objects — no separate index bookkeeping.)
      // CRITICAL 1 (review fix) — the window's true END time is the last
      // painted column's bucket START PLUS the full bucket span, not the
      // start alone: once bucketFactor > 1, `cols[last].t` is where the
      // OPEN bucket began, not where it ends, so comparing the live visible
      // range's end against that start made `visToSecNow > winEndSec` true
      // almost continuously while a bucket is still filling — scheduling a
      // rebuild on effectively every frame and defeating the append fast
      // path entirely. `paintedWindowEndMs` (depthSignificance.ts) adds the
      // bucket span; degenerates to the pre-LOD `+rawIntervalMs` behavior
      // when bucketFactor <= 1.
      if (meta0 && meta0.numCols > 0) {
        const visRangeNow = chartInstance.timeScale().getVisibleRange();
        if (visRangeNow) {
          const visFromSecNow = visRangeNow.from as unknown as number;
          const visToSecNow   = visRangeNow.to   as unknown as number;
          const winStartSec = meta0.cols[0].t / 1000;
          const winEndMs    = paintedWindowEndMs(meta0.cols[meta0.numCols - 1].t, meta0.bucketFactor, meta0.rawIntervalMs);
          const winEndSec   = winEndMs / 1000;
          if (visFromSecNow < winStartSec || visToSecNow > winEndSec) {
            scheduleRebuild();
          }
        }
      }

      // Step 2A — price-axis analog of the time window-margin check above,
      // clean mode only: the raster now paints the visible price window
      // (+ margin) rather than a far-wall union, so panning/zooming the
      // PRICE axis past the painted bounds must trigger a rebuild too (the
      // legacy union window was wide enough that this was never needed).
      // Reuses meta0.priceMin/priceMax as the last-rasterized bounds — no
      // new ref required.
      if (visualModelRef.current === 'clean' && meta0 && meta0.numCols > 0) {
        const _top = seriesInstance.coordinateToPrice(0);
        const _bot = seriesInstance.coordinateToPrice(cssH);
        if (_top != null && _bot != null && Number.isFinite(_top) && Number.isFinite(_bot)) {
          const _visHi = Math.max(_top, _bot);
          const _visLo = Math.min(_top, _bot);
          if (_visLo < meta0.priceMin || _visHi > meta0.priceMax) scheduleRebuild();
        }
      }

      if (rebuildDueRef.current) {
        doFullRebuild = true;
        rebuildDueRef.current = false;
      }

      if (doFullRebuild) {
        appendCols = null; // a full rebuild supersedes any pending append this frame
      }

      if (doFullRebuild || appendCols) {
        if (doFullRebuild) {
          const fullCols = cols;
          if (fullCols.length > 0) {
            const colTimesMs = fullCols.map((c) => c.t);
            const visRangeForWindow = chartInstance.timeScale().getVisibleRange();
            const visFromSec = visRangeForWindow ? (visRangeForWindow.from as unknown as number) : (fullCols[0].t / 1000);
            const visToSec   = visRangeForWindow ? (visRangeForWindow.to   as unknown as number) : (fullCols[fullCols.length - 1].t / 1000);
            // Review fix (SHOULD-FIX 2) — budget-aware up front: pass the
            // last rebuild's real numRows (or undefined before the first
            // rebuild) + MAX_GRID_CELLS so the margin itself already fits
            // the budget. Without this, repaintOffscreen's own cell-budget
            // trim could silently narrow the painted window below what the
            // margin-exceeded check above assumes, causing an ordinary
            // small pan to spuriously exceed the (actually-narrower)
            // painted bounds and trigger far too many rebuilds.
            const { startIdx, endIdx } = computeWindowRange(
              colTimesMs,
              visFromSec,
              visToSec,
              WINDOW_MARGIN_FRACTION,
              lastNumRowsRef.current ?? undefined,
              MAX_GRID_CELLS,
            );
            const windowCols = fullCols.slice(startIdx, endIdx + 1);

            recomputeNorm(
              windowCols,
              chartInstance,
              binSizeRef.current,
              sensitivityRef.current,
              depthColWidthPxRef.current,
            );

            // Worker dispatch (perf phase, 2026-07-20) — the rebuild compute
            // runs off-thread; tier bookkeeping (zoom mult / bucket factor /
            // row merge factor / numRows estimate) is committed by
            // commitRasterResult when the result lands, NOT here, so a
            // dropped/superseded job can never leave the trigger refs
            // describing pixels that were never painted.
            dispatchRebuild(
              fullCols,
              startIdx,
              endIdx,
              rawIntervalMs,
              curBucketFactor,
              curZoomMult,
            );
          }
        } else if (appendCols && offscreenCtxRef.current) {
          const meta = getMeta(offscreenRef.current);
          if (meta) {
            const octx = offscreenCtxRef.current;
            const rowMaxPrice = meta.priceMin + (meta.rawNumRows - 1) * meta.curBinSize;
            const rowEpsilon = meta.curBinSize * 0.001;
            const lut = getPaletteLUT(paletteRef.current);
            const legacyQCut = sizeFilterRef.current > 0
              ? Math.round(Math.log1p((sizeFilterRef.current / 100) * vHiRef.current) * 1000)
              : 0;
            const alphaCutoffUsd = alphaSkipCutoffUsd(vLoRef.current);

            if (meta.bucketFactor <= 1) {
              // ── Pre-LOD append path — BYTE-FOR-BYTE unchanged behavior ──
              if (smoothingRef.current) {
                // Re-derive + repaint a small trailing strip (including the
                // new column(s)) so the smoothing/bloom neighborhood ops never
                // leave a seam at the append boundary — see the module doc
                // comment's Phase 6 section.
                meta.cols.push(...appendCols);
                meta.numCols = meta.numCols + appendCols.length;
                // Review fix (SHOULD-FIX 1) — widen the strip by 1 extra
                // column on the LEFT (a border column, also rewritten via
                // putImageData below) so bloom/smoothing reach is exact at
                // the strip's own left boundary. Without this, a hot cell at
                // the strip's leftmost column can't exchange bloom with the
                // column just to its left (applyBloom's `col > 0` guard
                // skips it at local index 0), and that boundary is never
                // revisited on a LATER append either — a persistent 1-column
                // seam. Each new append-strip extends 1 column further left
                // than the previous "new" boundary, so the exact edge that
                // was under-blended last time gets correctly re-blended now.
                const stripStart = Math.max(0, meta.numCols - APPEND_SMOOTH_STRIP_COLS - 1);
                const stripWarmMap = buildPersistWarmupMap(
                  meta.cols,
                  stripStart,
                  meta.priceMin,
                  rowMaxPrice,
                  rowEpsilon,
                  PERSISTENCE_RAMP_COLUMNS_DEFAULT,
                );
                paintColumnsRange(
                  octx,
                  meta.cols,
                  stripStart,
                  meta.numCols,
                  stripStart,
                  meta.priceMin,
                  rowMaxPrice,
                  rowEpsilon,
                  meta.curBinSize,
                  meta.numRows,
                  vLoRef.current,
                  vHiRef.current,
                  lut,
                  legacyQCut,
                  alphaCutoffUsd,
                  true,
                  meta.bloomEnabled,
                  stripWarmMap,
                  meta.rowMergeFactor,
                  stripStart,
                  visualModelRef.current,
                );
                lastPersistMapRef.current = stripWarmMap;
              } else {
                paintColumnsRange(
                  octx,
                  appendCols,
                  0,
                  appendCols.length,
                  meta.numCols,
                  meta.priceMin,
                  rowMaxPrice,
                  rowEpsilon,
                  meta.curBinSize,
                  meta.numRows,
                  vLoRef.current,
                  vHiRef.current,
                  lut,
                  legacyQCut,
                  alphaCutoffUsd,
                  false,
                  meta.bloomEnabled,
                  lastPersistMapRef.current,
                  meta.rowMergeFactor,
                  0,
                  visualModelRef.current,
                );
                meta.cols.push(...appendCols);
                meta.numCols = meta.numCols + appendCols.length;
              }
              meta.lastPaintedRawT = appendCols[appendCols.length - 1].t;
            } else {
              // ── LOD bucketed append path (bucketFactor > 1) — see the
              // module doc comment's "LOD design" section point 4. Each
              // newly appended RAW column either extends the currently-open
              // last bucket (re-merged via mergeColumnsMaxQ) or starts a new
              // bucket (advances meta.numCols by 1). `changedFromCol` tracks
              // the EARLIEST painted column touched this tick so the
              // existing paint machinery below repaints exactly (and only)
              // what changed.
              let changedFromCol = meta.numCols; // default: nothing changed yet (no new/extended bucket this tick)
              let forcedRebuildMidBatch = false;
              for (const rawCol of appendCols) {
                const thisBucketStart = bucketStartMs(rawCol.t, meta.rawIntervalMs, meta.bucketFactor);

                // SHOULD-FIX 3 (review) — out-of-order raw column: time
                // moved BACKWARD relative to the currently-open bucket. This
                // should never happen for a genuine append/rotate (both
                // classifyColumnsUpdate and the live-edge check already
                // guard against a real reset), so treat it as an anomaly —
                // don't push, don't touch meta.lastPaintedRawT for it,
                // schedule a full rebuild to re-derive a consistent state,
                // and skip just this column (the anomaly may be a single
                // bad entry rather than a systemic issue).
                if (meta.numCols > 0 && thisBucketStart < meta.lastBucketStartT) {
                  scheduleRebuild();
                  forcedRebuildMidBatch = true;
                  continue;
                }

                if (meta.numCols > 0 && thisBucketStart === meta.lastBucketStartT) {
                  // Extends the currently-open last bucket.
                  meta.lastBucketRawCols.push(rawCol);
                  const merged = mergeColumnsMaxQ(meta.lastBucketRawCols);
                  const allGap = meta.lastBucketRawCols.every((c) => c.flags & 1);
                  meta.cols[meta.numCols - 1] = {
                    ...meta.lastBucketRawCols[0],
                    t: thisBucketStart,
                    flags: allGap ? 1 : 0,
                    bids: merged.bids,
                    asks: merged.asks,
                  };
                  changedFromCol = Math.min(changedFromCol, meta.numCols - 1);
                  meta.lastPaintedRawT = rawCol.t;
                } else if (meta.numCols < meta.bitmapWidth) {
                  // CRITICAL 2 (review fix) — commit the JUST-CLOSED
                  // bucket's persistence contribution EXACTLY ONCE, into the
                  // stable base snapshot, before opening the new bucket.
                  // Without this, `meta.persistBaseMap` would silently fall
                  // behind (the closed bucket's final content would never
                  // be folded in), corrupting persistence counts for every
                  // bucket after it.
                  if (meta.numCols > 0) {
                    const committed = new Map(meta.persistBaseMap);
                    bumpPersistMapForColumn(committed, meta.cols[meta.numCols - 1], meta.priceMin, rowMaxPrice, rowEpsilon, meta.curBinSize);
                    meta.persistBaseMap = committed;
                  }
                  // Starts a new bucket.
                  meta.lastBucketStartT = thisBucketStart;
                  meta.lastBucketRawCols = [rawCol];
                  const merged = mergeColumnsMaxQ(meta.lastBucketRawCols);
                  meta.cols.push({
                    ...rawCol,
                    t: thisBucketStart,
                    flags: rawCol.flags & 1 ? 1 : 0,
                    bids: merged.bids,
                    asks: merged.asks,
                  });
                  changedFromCol = Math.min(changedFromCol, meta.numCols);
                  meta.numCols = meta.numCols + 1;
                  meta.lastPaintedRawT = rawCol.t;
                } else {
                  // SHOULD-FIX 2 (review) — bitmap slack exhausted: do NOT
                  // update meta.lastPaintedRawT for a column that was never
                  // actually incorporated into the bitmap (that would desync
                  // the live-edge check from what's truly painted). Force a
                  // full rebuild and stop processing this batch — the
                  // remaining raw columns (if any) are picked up by the
                  // rebuild instead of silently dropped.
                  scheduleRebuild();
                  forcedRebuildMidBatch = true;
                  break;
                }
              }

              // CRITICAL 2 (review fix) — persistence for THIS tick's render
              // is derived from a FRESH clone of the stable base + exactly
              // ONE bump for the currently-open bucket's CURRENT (re-merged)
              // content — never by mutating a map that's been bumped again
              // on every prior tick this same bucket was open. `bumpRangeStart
              // = meta.numCols - 1` (paintColumnsRange, Phase 8) makes any
              // OTHER columns in the repainted range (already-closed buckets
              // included only for the smoothing strip's pixel continuity)
              // strictly READ-ONLY against this map — their contribution is
              // already baked into `persistBaseMap` via the commit-on-close
              // step above, so they must NOT be bumped again here.
              if (!forcedRebuildMidBatch && changedFromCol < meta.numCols) {
                const workingMap = new Map(meta.persistBaseMap);
                const bumpRangeStart = meta.numCols - 1;
                if (smoothingRef.current) {
                  const stripStart = Math.max(0, Math.min(changedFromCol, meta.numCols - APPEND_SMOOTH_STRIP_COLS - 1));
                  paintColumnsRange(
                    octx,
                    meta.cols,
                    stripStart,
                    meta.numCols,
                    stripStart,
                    meta.priceMin,
                    rowMaxPrice,
                    rowEpsilon,
                    meta.curBinSize,
                    meta.numRows,
                    vLoRef.current,
                    vHiRef.current,
                    lut,
                    legacyQCut,
                    alphaCutoffUsd,
                    true,
                    meta.bloomEnabled,
                    workingMap,
                    meta.rowMergeFactor,
                    bumpRangeStart,
                    visualModelRef.current,
                  );
                } else {
                  paintColumnsRange(
                    octx,
                    meta.cols,
                    changedFromCol,
                    meta.numCols,
                    changedFromCol,
                    meta.priceMin,
                    rowMaxPrice,
                    rowEpsilon,
                    meta.curBinSize,
                    meta.numRows,
                    vLoRef.current,
                    vHiRef.current,
                    lut,
                    legacyQCut,
                    alphaCutoffUsd,
                    false,
                    meta.bloomEnabled,
                    workingMap,
                    meta.rowMergeFactor,
                    bumpRangeStart,
                    visualModelRef.current,
                  );
                }
                lastPersistMapRef.current = workingMap;
              }
            }
          }
        }
      }

      // ── Steps 3+4: ALWAYS recompute mapping and blit — every single frame ─
      // Per-frame cost: one drawImage + two coordinate lookups. Trivially cheap.
      // Skipping this is what caused the blank canvas: clearRect ran, then the
      // old early-return fired before drawImage, leaving 0% painted pixels.
      const offscreen = offscreenRef.current;
      if (!offscreen) return;

      const meta = getMeta(offscreen);
      if (!meta || meta.numCols === 0 || meta.numRows === 0) return;

      try {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // ── Step 4a: clear the visible canvas every frame ─────────────────
        ctx.clearRect(0, 0, cssW, cssH);
        ctx.imageSmoothingEnabled = false;

        if (meta.cols.length === 0) return;

        // ── Compute affine mapping from offscreen to canvas ───────────────
        // We need to map each column's time → x coordinate and each price row → y.
        // Both axes are linear in lw-charts v4.
        //
        // Problem: timeToCoordinate() returns null for any time that is NOT an
        // existing series bar (e.g. 5s/1m depth-slice buckets vs 5m/1h candles).
        // Fix: resolve a reference bar time that IS in the candle series, compute
        // px-per-second from TWO resolved bar coordinates, then extrapolate any
        // arbitrary column time linearly. This avoids calling timeToCoordinate
        // with non-bar times entirely.

        // Time axis: bar-snapped reference anchor + linear extrapolation.
        const ivMs  = candleIntervalRef.current;
        const ivSec = ivMs > 0 ? ivMs / 1000 : 60;

        // Find the visible range midpoint as a starting candidate for the
        // reference bar.  Fall back to the first column's time if no range.
        const visRange = chartInstance.timeScale().getVisibleRange();
        const midSec   = visRange
          ? Math.floor(((visRange.from as unknown as number) + (visRange.to as unknown as number)) / 2)
          : Math.round(meta.cols[Math.floor(meta.cols.length / 2)].t / 1000);

        // Snap candidate DOWN to the nearest candle boundary.
        const snapDown = (t: number) => Math.floor(t / ivSec) * ivSec;

        // Resolve a bar coordinate by stepping left/right up to 10 times
        // (handles sparse charts where some candles are missing).
        function resolveBarX(startSec: number, stepSec: number): { tSec: number; x: number } | null {
          for (let i = 0; i < 10; i++) {
            const t = (snapDown(startSec) + i * stepSec) as UTCTimestamp;
            const x = chartInstance.timeScale().timeToCoordinate(t);
            if (x !== null) return { tSec: t as unknown as number, x: x as number };
          }
          return null;
        }

        const ref1 = resolveBarX(midSec, -ivSec); // step left
        if (ref1 === null) return; // no bar in visible range at all

        const ref2 = resolveBarX(ref1.tSec + ivSec, ivSec); // one bar right of ref1
        if (ref2 === null) return; // need two bars to compute scale

        // px-per-second derived from the actual distance between two resolved bars.
        // Do NOT use options().barSpacing — it can lag during kinetic zoom.
        // Divide by the ACTUAL time delta between the two resolved bars, not by
        // ivSec alone — they can differ when there is a candle gap between ref1
        // and ref2 (ref2 steps right until it finds the next non-null bar, which
        // may be N > 1 intervals away). Using ivSec in that case overstates
        // pxPerSec by a factor of N and drifts every column off by that ratio.
        const actualPxPerBar  = ref2.x - ref1.x;
        const actualTimeDelta = ref2.tSec - ref1.tSec; // seconds; == ivSec when no gap
        const pxPerSec        = actualTimeDelta > 0 ? actualPxPerBar / actualTimeDelta : 1;

        // Update barSpacingRef each frame (single-column fallback + external readers).
        if (Math.abs(actualPxPerBar) > 0) {
          barSpacingRef.current = Math.abs(actualPxPerBar);
        } else {
          // Estimate from logical range when bars are too close to differentiate.
          const lr = chartInstance.timeScale().getVisibleLogicalRange();
          const paneW2 = chartInstance.timeScale().width();
          if (lr && typeof paneW2 === 'number' && paneW2 > 0) {
            const visibleBars = lr.to - lr.from;
            if (visibleBars > 0) barSpacingRef.current = paneW2 / visibleBars;
          }
        }

        // Map any column time (in ms) to canvas x via linear extrapolation from ref1.
        const colToX = (tMs: number): number =>
          ref1.x + (tMs / 1000 - ref1.tSec) * pxPerSec;

        const firstCol = meta.cols[0];
        const lastCol  = meta.cols[meta.cols.length - 1];

        const x0 = colToX(firstCol.t); // canvas x of first column center
        const xN = colToX(lastCol.t);  // canvas x of last column center

        // Column width in canvas px
        const colWidthPx = meta.numCols > 1
          ? (xN - x0) / (meta.numCols - 1)
          : barSpacingRef.current;

        // Phase 3 point 6 — stash this frame's depth-column pixel width for
        // the NEXT frame's zoom-density lookup (recomputeNorm reads this via
        // depthColWidthPxRef — one-frame lag, same pattern as barSpacingRef).
        if (Number.isFinite(colWidthPx) && colWidthPx > 0) {
          depthColWidthPxRef.current = colWidthPx;
        }

        // LOD (Phase 7) — stash this frame's RAW (un-bucketed) column pixel
        // width for the NEXT frame's bucket-factor decision. Computed
        // independently of `colWidthPx` above (which is the PAINTED
        // column's width and would already reflect bucketing once LOD is
        // active) via pxPerSec * rawIntervalMs directly — see the module
        // doc comment's "LOD design" section point 1.
        const rawColWidthPx = pxPerSec * (rawIntervalMs / 1000);
        if (Number.isFinite(rawColWidthPx) && rawColWidthPx > 0) {
          rawColWidthPxRef.current = rawColWidthPx;
        }

        // Raw (unclipped) left/right canvas edges of the entire offscreen.
        // These may be negative or > paneW when the depth matrix extends
        // beyond the currently-visible time range.
        const rawLeft  = x0 - colWidthPx * 0.5;
        const rawRight = xN + colWidthPx * 0.5;
        const rawWidth = rawRight - rawLeft; // total canvas px span of all columns

        // Clip to the chart pane so we don't paint over the price axis.
        const drawLeft  = Math.max(0,    rawLeft);
        const drawRight = Math.min(paneW, rawRight);

        if (drawRight <= drawLeft) return;

        // ── Source-rect clipping (the pan-lock fix) ───────────────────────
        // When rawLeft < 0 (columns extend before visible range) or
        // rawRight > paneW (columns extend past visible range), naively
        // passing the ENTIRE offscreen to drawImage and clamping only the
        // destination stretches the bitmap to fill the clamped rect. This
        // math operates purely in "real column index" units (meta.numCols),
        // so it is unaffected by the offscreen canvas's physical width
        // including WINDOW_SLACK_COLS headroom — see the module doc
        // comment's Phase 6 section for why.
        const srcScale = meta.numCols / rawWidth;        // offscreen pixels per canvas px
        const srcLeft  = (drawLeft  - rawLeft) * srcScale; // first visible column (fractional)
        const srcRight = (drawRight - rawLeft) * srcScale; // last  visible column (fractional)
        const srcW     = srcRight - srcLeft;

        // Price axis: map priceMin → bottom, priceMax → top in canvas space.
        const yAtPriceMax = seriesInstance.priceToCoordinate(meta.priceMax);
        const yAtPriceMin = seriesInstance.priceToCoordinate(meta.priceMin);

        if (yAtPriceMax === null || yAtPriceMin === null) return;

        const drawTop    = yAtPriceMax as number;
        const drawBottom = yAtPriceMin as number;

        if (drawBottom <= drawTop) return;

        const drawW = drawRight - drawLeft;
        const drawH = drawBottom - drawTop;

        // ── Draw offscreen → canvas (single blit) ───────────────────────
        // Source rect is the clipped sub-rectangle of the offscreen that
        // corresponds to the visible portion of the depth matrix.  Each
        // source column therefore lands at exactly the same canvas x as the
        // candle bar at that column's timestamp.
        ctx.drawImage(
          offscreen,
          srcLeft, 0, srcW, meta.numRows, // source: visible portion of offscreen
          drawLeft, drawTop, drawW, drawH, // destination: visible canvas region
        );

      } finally {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = true;
        // Always commit the fingerprint — even when an early return fires inside
        // the try block (e.g. drawRight <= drawLeft, priceToCoordinate null).
        // Without this, a single missed blit frame left lastFingerprintRef stale,
        // causing fingerprintChanged = true on EVERY subsequent frame and
        // triggering redundant recomputeNorm calls until the pan resolved.
        lastFingerprintRef.current = fingerprint;
      }
    }

    rafRef.current = requestAnimationFrame(drawFrame);

    return () => {
      running = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, series]);

  // Note: the offscreen rebuild/append decision (drawFrame's Step 2) no
  // longer needs an external "mark dirty" signal — it re-derives everything
  // it needs every frame directly from the chart's live visible-range query
  // and the `columns` reference-identity check, both O(1). A canvas resize
  // ([width, height]) doesn't require an offscreen rebuild either: the
  // offscreen bitmap is independent of CSS size, and the per-frame blit
  // already recomputes drawWidth/drawHeight from the latest cssW/cssH.

  // Cheap extra win — force a fresh full rebuild on regaining visibility.
  // Repaints were skipped entirely while `document.hidden` (drawFrame's
  // early return), so the painted window may be far behind after a long
  // hidden period; scheduleRebuild() is a cheap, defensive top-up on top of
  // the per-frame classify/margin checks (which would otherwise also
  // self-heal on the next frame regardless — see the module doc comment's
  // Phase 6 section).
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden) scheduleRebuild();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Schedule a debounced full rebuild on normalization-affecting prop
  // changes (Phase 6) — `columns` updates are handled per-frame instead (see
  // drawFrame's classifyColumnsUpdate block) so live appends can take the
  // fast path rather than always forcing a full rebuild.
  useEffect(() => {
    if (isFirstParamsEffectRef.current) {
      isFirstParamsEffectRef.current = false;
      return;
    }
    scheduleRebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binSize, sizeFilterPct, palette, smoothing, sensitivity]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'absolute',
        top:           0,
        left:          0,
        width:         `${width}px`,
        height:        `${height}px`,
        pointerEvents: 'none',
        // Genuinely behind candles: z-index 5 vs the chart canvas mount's
        // z-index 6 (FinotaurChart.tsx containerRef div), whose
        // layout.background is transparent — see buildChartOptions there.
        // Also below WallHeatLayer (z-index 10).
        zIndex:        5,
      }}
      aria-hidden="true"
    />
  );
}

export default DepthMatrixLayer;
