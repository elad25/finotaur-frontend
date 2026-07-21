// src/components/charting/depthRasterCore.ts
//
// Pure raster core for the depth-matrix heatmap — the pixel-producing half of
// what used to live inline in DepthMatrixLayer.tsx. Extracted (perf phase,
// 2026-07-20) so FULL-WINDOW rebuilds can run inside depthRaster.worker.ts
// off the main thread, while DepthMatrixLayer keeps calling the exact same
// functions synchronously for the live-append fast path (and as a fallback
// when Worker construction fails). ONE implementation, two call sites — the
// append strip and the worker rebuild can never drift apart.
//
// Hard rule for this module: NO DOM, NO canvas contexts, NO react. Only
// typed arrays, plain objects, and the pure helpers in depthSignificance.ts
// / depthPalettes.ts. `Uint32Array` pixel buffers in ABGR byte order (the
// ImageData memory layout on little-endian platforms) are the only "render"
// output — the main thread wraps them in ImageData and blits.

import type { DecodedColumn } from '@/pages/app/crypto/scanner/depthTypes';
import { getPaletteLUT, type DepthPaletteId } from './depthPalettes';
import {
  qToUsd,
  softKneeAlpha,
  alphaSkipCutoffUsd,
  persistenceFactor,
  sizeGatedPersistenceFactor,
  weightedPriceExtent,
  clampExtentToMaxRows,
  clipColumnsForCellBudget,
  computeRowMergeFactor,
  requiredRowMergeFactorForCap,
  LOD_MAX_ROW_MERGE_FACTOR,
  bucketColumns,
  bucketStartMs,
  bumpPersistMapForColumn,
  PERSISTENCE_RAMP_COLUMNS_DEFAULT,
} from './depthSignificance';

// ── Grid safety caps (moved verbatim from DepthMatrixLayer.tsx) ──────────────
//
// Hard ceiling on the offscreen bitmap's PAINTED row count (far-wall fix,
// 2026-07-20: this used to be a raw-extent clip that silently removed
// genuine far walls). weightedPriceExtent keeps the p0.5/p99.5 weight
// window tight around the market; when the extent (including the
// significant-bin union) spans more raw rows than this, rows are MERGED
// (requiredRowMergeFactorForCap) so the bitmap height stays capped while
// far walls remain visible as coarser rows. Only past
// MAX_GRID_ROWS × LOD_MAX_ROW_MERGE_FACTOR raw rows does the old
// median-centered extent clip kick in as the final backstop.
export const MAX_GRID_ROWS = 4000;
// Hard ceiling on total offscreen cells (window-cols * numRows) — a
// PER-WINDOW budget (the window is already bounded by the visible time range
// + margin), trimming further only in pathological cases.
export const MAX_GRID_CELLS = 3_000_000;

// Bloom gate (perf, 2026-07-20): past this many painted cells in one window,
// cells are only ~1-2px tall/wide (LOD guarantees a floor) and the 1px bloom
// halo is visually indistinguishable — skip the pass (and its full-grid
// snapshot copy) entirely. Decided ONCE per rebuild and carried in the meta
// (`bloomEnabled`) so append strips match the full window — a strip-only
// bloom would leave halo seams at strip boundaries.
export const BLOOM_MAX_CELLS = 1_500_000;

// Normalized-intensity threshold (post-compression t ∈ [0,1]) above which a
// cell is considered "hot" for the bloom pass.
export const BLOOM_HOT_THRESHOLD = 0.95;
// Fraction of a hot cell's own alpha blended into each of its 4 neighbors.
const BLOOM_NEIGHBOR_ALPHA_FRACTION = 0.35;

// Log-spread factor + gamma for the Bookmap-style intensity curve — exact
// copy of BookmapChart.tsx's compressIntensity/HEAT_GAMMA. Applied to the
// linear-capped ratio `x = min(1, usd / vHi)`: log1p spreads out the low end
// so weak levels aren't all crushed to the same near-zero value, then the
// gamma pushes everything below the top ~10-15% back down to near-dark so
// only real walls glow.
const HEAT_LOG_SCALE = 9;
const HEAT_GAMMA = 1.6;

/** Bookmap-style intensity compression: log1p spread + gamma darken, x/t ∈ [0,1]. */
export function compressIntensity(x: number): number {
  const logScaled = Math.log1p(x * HEAT_LOG_SCALE) / Math.log1p(HEAT_LOG_SCALE);
  return Math.pow(logScaled, HEAT_GAMMA);
}

/** Unpacks an ABGR Uint32 into [r, g, b, a] bytes. */
function unpackAbgr(color: number): [number, number, number, number] {
  return [color & 0xff, (color >>> 8) & 0xff, (color >>> 16) & 0xff, (color >>> 24) & 0xff];
}

function packAbgr(r: number, g: number, b: number, a: number): number {
  return ((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
}

// ── Reusable scratch buffers (perf, 2026-07-20) ──────────────────────────────
//
// applyVerticalSmoothing/applyBloom each need a read-only snapshot of the
// pixel buffer; `buf.slice()` allocated up to ~12MB of transient Uint32Array
// PER PASS per rebuild. These module-scoped scratch buffers grow
// geometrically and are reused instead. Safe: each JS realm (main thread,
// worker) gets its own module instance, and within a realm the passes run
// strictly sequentially (rAF / worker message handler — no reentrancy).
let U32_SCRATCH = new Uint32Array(0);
function scratchU32(n: number): Uint32Array {
  if (U32_SCRATCH.length < n) {
    U32_SCRATCH = new Uint32Array(Math.max(n, U32_SCRATCH.length * 2));
  }
  return U32_SCRATCH.subarray(0, n);
}
let U8_SCRATCH = new Uint8Array(0);
function scratchU8Zeroed(n: number): Uint8Array {
  if (U8_SCRATCH.length < n) {
    U8_SCRATCH = new Uint8Array(Math.max(n, U8_SCRATCH.length * 2));
  }
  const view = U8_SCRATCH.subarray(0, n);
  view.fill(0);
  return view;
}

/**
 * Vertical 3-tap smoothing pass — blends each painted (alpha>0) pixel with
 * its immediate row-1/row+1 neighbors (weights 0.25/0.5/0.25). Transparent
 * neighbors contribute the pixel's OWN color instead of black/zero, so edges
 * against empty background never darken — only banding BETWEEN two painted
 * rows softens. Operates on a scratch copy so reads never see
 * already-blended output.
 */
export function applyVerticalSmoothing(buf: Uint32Array, numCols: number, numRows: number): void {
  const src = scratchU32(buf.length);
  src.set(buf);
  for (let row = 0; row < numRows; row++) {
    const rowBase = row * numCols;
    for (let col = 0; col < numCols; col++) {
      const idx = rowBase + col;
      const cur = src[idx];
      const curA = (cur >>> 24) & 0xff;
      if (curA === 0) continue; // never bleed color into empty background

      const above = row > 0 ? src[idx - numCols] : 0;
      const below = row < numRows - 1 ? src[idx + numCols] : 0;
      const aboveA = (above >>> 24) & 0xff;
      const belowA = (below >>> 24) & 0xff;

      const [cr, cg, cb] = unpackAbgr(cur);
      const [ar, ag, ab] = aboveA > 0 ? unpackAbgr(above) : [cr, cg, cb];
      const [br, bg, bb] = belowA > 0 ? unpackAbgr(below) : [cr, cg, cb];

      const r = Math.round(ar * 0.25 + cr * 0.5 + br * 0.25);
      const g = Math.round(ag * 0.25 + cg * 0.5 + bg * 0.25);
      const b = Math.round(ab * 0.25 + cb * 0.5 + bb * 0.25);
      buf[idx] = packAbgr(r, g, b, curA);
    }
  }
}

/**
 * Soft bloom pass — for every cell flagged hot in `hotMask` (t >= BLOOM_HOT_
 * THRESHOLD, computed pre-gamma during rasterization), lightens its 4
 * neighbors toward the hot cell's own color (component-wise max, so an
 * already-brighter neighbor is never dimmed) at BLOOM_NEIGHBOR_ALPHA_FRACTION
 * strength. Purely additive-looking without needing real alpha compositing.
 */
export function applyBloom(buf: Uint32Array, hotMask: Uint8Array, numCols: number, numRows: number): void {
  const hotColors = scratchU32(buf.length); // snapshot BEFORE bloom mutates neighbors
  hotColors.set(buf);
  for (let row = 0; row < numRows; row++) {
    const rowBase = row * numCols;
    for (let col = 0; col < numCols; col++) {
      const idx = rowBase + col;
      if (!hotMask[idx]) continue;
      const [hr, hg, hb] = unpackAbgr(hotColors[idx]);

      const neighbors = [
        row > 0 ? idx - numCols : -1,
        row < numRows - 1 ? idx + numCols : -1,
        col > 0 ? idx - 1 : -1,
        col < numCols - 1 ? idx + 1 : -1,
      ];
      for (const nIdx of neighbors) {
        if (nIdx < 0) continue;
        const cur = buf[nIdx];
        const curA = (cur >>> 24) & 0xff;
        const [cr, cg, cb] = unpackAbgr(cur);
        const r = Math.max(cr, Math.round(cr + (hr - cr) * BLOOM_NEIGHBOR_ALPHA_FRACTION));
        const g = Math.max(cg, Math.round(cg + (hg - cg) * BLOOM_NEIGHBOR_ALPHA_FRACTION));
        const b = Math.max(cb, Math.round(cb + (hb - cb) * BLOOM_NEIGHBOR_ALPHA_FRACTION));
        // Give the halo at least a faint opacity even over previously-empty
        // background so the glow is visible past the wall's own edge.
        const a = Math.max(curA, Math.round(0xff * BLOOM_NEIGHBOR_ALPHA_FRACTION * 0.6));
        buf[nIdx] = packAbgr(r, g, b, a);
      }
    }
  }
}

// Legacy binary dimming ceiling (identical value to the old
// WEAK_CELL_T_CAP) — ONLY reachable via the deprecated sizeFilterPct path.
const LEGACY_WEAK_CELL_T_CAP = 0.10;

/**
 * Factory for the per-cell color function shared by the full-window paint
 * and the live-append paths — keeps the exact same color/alpha formula in
 * one place instead of duplicating it. Mutates a closed-over "was the last
 * cell hot" flag (read via `wasHot()`) instead of allocating a tuple per
 * cell — this runs O(window-cells) times per rebuild so avoiding per-cell
 * allocation matters.
 */
export function makeQToColorFn(vHi: number, vLo: number, lut: Uint32Array, legacyQCut: number, visualModel: 'legacy' | 'clean' = 'legacy') {
  let lastHot = false;
  const colorOf = (q: number, persistMult: number): number => {
    lastHot = false;
    if (q === 0) return 0; // no data in this bin — transparent (the void)

    const usd = qToUsd(q);
    const x = Math.min(1, usd / vHi); // linear ratio to the p99 reference, capped at 1
    let t = compressIntensity(x);
    if (t > 1) t = 1;
    if (t < 0) t = 0;

    // Legacy MarketScanner-compat ONLY (legacyQCut > 0 — LiquidityTab.tsx
    // never triggers this): bins below the relative size cut render at the
    // old flat intensity ceiling instead of their true continuous `t`.
    if (legacyQCut > 0 && q < legacyQCut) {
      t = Math.min(t, LEGACY_WEAK_CELL_T_CAP);
    }

    lastHot = t >= BLOOM_HOT_THRESHOLD;

    const idx = Math.min(255, Math.max(0, Math.round(t * 255)));
    // lut already encodes full 0xff alpha at every stop (color-only ramp);
    // overwrite just the top (alpha) byte with the continuous soft-knee
    // value (further scaled by the persistence multiplier). ImageData is
    // stored/read as STRAIGHT (non-premultiplied) alpha per the Canvas
    // spec, so scaling only the alpha byte is correct. The persistence
    // multiplier is SIZE-GATED (depthSignificance.ts): at/above-knee bins
    // bypass the anti-spoof fade-in entirely so a fresh whale wall is
    // visible at full strength in its first column — this is the single
    // funnel both the full repaint and the append fast path go through, so
    // the gate applies consistently everywhere.
    const alpha = softKneeAlpha(usd, vLo, undefined, visualModel) * sizeGatedPersistenceFactor(persistMult, usd, vLo);
    const a = Math.min(255, Math.max(0, Math.round(alpha * 255)));
    if (a === 0) {
      // Hide floor (2026-07-20): a fully-transparent cell must be COMPLETELY
      // absent — returning the rgb bytes with alpha 0 would still mark it in
      // the bloom hotMask (computed from `t`, independent of alpha) and
      // bleed its color into visible neighbors via applyBloom.
      lastHot = false;
      return 0;
    }
    const rgb = lut[idx];
    return (rgb & 0x00ffffff) | (a << 24);
  };
  return { colorOf, wasHot: () => lastHot };
}

/**
 * Persistence warm-up — bookkeeping-only pass over the `rampColumns + 2`
 * columns immediately preceding `uptoIdxExclusive` in `cols`. No pixels are
 * written; this only seeds the consecutive-column count Map so a
 * window/strip that doesn't start at the beginning of history still has a
 * correct persistence baseline. Reused for both the full-window rebuild
 * (warming up against the history preceding the window) and the
 * append-smoothing strip re-derivation (warming up against the window's own
 * retained `meta.cols`, up to the strip's start index).
 */
export function buildPersistWarmupMap(
  cols: DecodedColumn[],
  uptoIdxExclusive: number,
  priceMin: number,
  rowMaxPrice: number,
  rowEpsilon: number,
  rampColumns: number,
): Map<number, number> {
  const persistMap = new Map<number, number>();
  const warmStart = Math.max(0, uptoIdxExclusive - (rampColumns + 2));
  for (let ci = warmStart; ci < uptoIdxExclusive; ci++) {
    const col = cols[ci];
    if (!col || col.flags & 1) continue; // gap column — never touches persistence
    const present = new Set<number>();
    for (const r of col.bids) {
      if (r.q <= 0) continue;
      if (r.price < priceMin - rowEpsilon || r.price > rowMaxPrice + rowEpsilon) continue;
      present.add(r.price);
    }
    for (const r of col.asks) {
      if (r.q <= 0) continue;
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
  return persistMap;
}

/**
 * Paints columns `cols[rangeStart..rangeEnd)` into the caller-provided ABGR
 * pixel buffer `buf` (sized `(rangeEnd-rangeStart) * numRows`; row-major,
 * canvas orientation — row 0 = highest price). This is the former
 * DepthMatrixLayer paintColumnsRange minus the canvas: the main thread
 * wraps `buf` in an ImageData and putImageData()s it at the destination x;
 * the worker transfers it back inside a RasterResult. `persistMap` is
 * mutated in place as columns are processed (prune absent bins, bump
 * survivors) — callers keep the returned/mutated Map to continue
 * persistence bookkeeping across the next update.
 *
 * `smoothingEnabled` runs the vertical band smoothing; `bloomEnabled`
 * additionally runs the hot-cell bloom pass (gated per-rebuild by
 * BLOOM_MAX_CELLS — see its comment; append strips must pass the SAME flag
 * the full window was built with, via meta.bloomEnabled).
 */
export function paintColumnsRangeToBuffer(
  buf: Uint32Array,
  cols: DecodedColumn[],
  rangeStart: number,
  rangeEnd: number,
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
  // LOD — number of RAW price rows merged into one painted row. `numRows`
  // above is already the PAINTED (post-merge) row count/bitmap height;
  // 1 = no merging.
  rowMergeFactor: number = 1,
  // Columns in [rangeStart, bumpRangeStart) are painted READ-ONLY against
  // `persistMap` (their presence never prunes/bumps it) — used by the
  // bucketed append path to repaint a wide neighborhood for smoothing
  // continuity WITHOUT re-bumping already-CLOSED buckets whose single
  // contribution was already committed into the caller's persistence base
  // snapshot. Defaults to `rangeStart` (bump everything).
  bumpRangeStart: number = rangeStart,
  // Opt-in Bookmap-style clean visual model (steeper alpha ramp — see
  // depthSignificance.ts's softKneeAlpha). Defaults to 'legacy' so every
  // existing caller (MarketScanner, DepthMatrixLayer's live-append path)
  // stays byte-identical unless explicitly threaded through.
  visualModel: 'legacy' | 'clean' = 'legacy',
): void {
  const width = rangeEnd - rangeStart;
  if (width <= 0) return;

  const hotMask = smoothingEnabled && bloomEnabled ? scratchU8Zeroed(width * numRows) : null;
  const { colorOf, wasHot } = makeQToColorFn(vHi, vLo, lut, legacyQCut, visualModel);

  for (let ci = rangeStart; ci < rangeEnd; ci++) {
    const col = cols[ci];
    const localCol = ci - rangeStart;
    // Gap column, OR a column mid-rebucket to a DIFFERENT binSize: its bin
    // prices are on the wrong grid for THIS curBinSize, so priceRow/
    // canvasRow below would misplace it. Treat exactly like a gap column —
    // transparent this repaint, don't touch persistMap; it repaints
    // correctly once the rebucket completes and columns share curBinSize.
    if ((col.flags & 1) || col.binSize !== curBinSize) continue;

    const cellMap = new Map<number, number>(); // price → q
    for (const r of col.bids) {
      if (r.price < priceMin - rowEpsilon || r.price > rowMaxPrice + rowEpsilon) continue;
      const existing = cellMap.get(r.price) ?? 0;
      cellMap.set(r.price, Math.max(existing, r.q));
    }
    for (const r of col.asks) {
      if (r.price < priceMin - rowEpsilon || r.price > rowMaxPrice + rowEpsilon) continue;
      const existing = cellMap.get(r.price) ?? 0;
      cellMap.set(r.price, Math.max(existing, r.q));
    }

    // Persistence bookkeeping for THIS column, in order: prune bins that
    // dropped out since the previous column, then bump the survivors + any
    // newly-appeared bin to count 1. Skipped for columns before
    // `bumpRangeStart` — those are read-only here; `persistMap` already
    // reflects their final, once-committed state. `bumpPersistMapForColumn`
    // (depthSignificance.ts) is the exact same prune+bump primitive used
    // standalone by the append path's "commit a just-closed bucket" step —
    // kept as one shared function so the two never drift apart.
    if (ci >= bumpRangeStart) {
      bumpPersistMapForColumn(persistMap, col, priceMin, rowMaxPrice, rowEpsilon, curBinSize);
    }

    // LOD row merging — when rowMergeFactor > 1, several raw price rows
    // share one painted row. Pick the WINNER (max-q) raw bin per merged
    // group first (same "strongest signal survives" principle as column
    // bucketing's mergeColumnsMaxQ) so only ONE representative bin's
    // color/persistence gets rendered per painted cell — never an
    // index-order-dependent overwrite. rowMergeFactor === 1 (the common
    // case) skips this entirely: `cellMap` itself is iterated directly
    // below, byte-for-byte the original behavior.
    let renderEntries: Iterable<[number, number]> = cellMap;
    if (rowMergeFactor > 1) {
      const winners = new Map<number, [number, number]>(); // mergedRow -> [price, q]
      for (const [price, q] of cellMap) {
        const priceRow = Math.round((price - priceMin) / curBinSize);
        const mergedRow = Math.floor(priceRow / rowMergeFactor);
        const cur = winners.get(mergedRow);
        if (!cur || q > cur[1]) winners.set(mergedRow, [price, q]);
      }
      renderEntries = winners.values();
    }

    for (const [price, q] of renderEntries) {
      // Cheap extra win — skip bins whose alpha would be imperceptible
      // without touching the color/compression math (see alphaSkipCutoffUsd's
      // doc comment: persistMult can only shrink alpha further, never grow
      // it, so this is a safe pre-filter on the raw softKneeAlpha alone).
      const usd = qToUsd(q);
      if (usd < alphaCutoffUsd) continue;

      const persistMult = persistenceFactor(persistMap.get(price) ?? 1);
      const color = colorOf(q, persistMult);
      if (color === 0) continue;

      // Row index: 0 = priceMin, increasing upward in price but canvas Y
      // increases downward — flip so rowIdx 0 = top of canvas = highest
      // price. With row merging, `numRows` here is the PAINTED (post-merge)
      // row count, so the merged row index must be flipped against IT, not
      // the raw row count.
      const priceRow = Math.round((price - priceMin) / curBinSize);
      const mergedRow = rowMergeFactor > 1 ? Math.floor(priceRow / rowMergeFactor) : priceRow;
      const canvasRow = numRows - 1 - mergedRow;
      if (canvasRow < 0 || canvasRow >= numRows) continue; // defensive only

      const idx = canvasRow * width + localCol;
      buf[idx] = color;
      if (hotMask && wasHot()) hotMask[idx] = 1;
    }
  }

  if (smoothingEnabled) {
    applyVerticalSmoothing(buf, width, numRows);
    if (hotMask) applyBloom(buf, hotMask, width, numRows);
  }
}

// ── Full-window rebuild job (the worker's unit of work) ──────────────────────

/** Everything a full-window rebuild needs — structured-cloneable (plain data + DecodedColumn arrays + no functions), so it can cross the worker boundary as-is. */
export interface RasterJob {
  jobId: number;
  /** Bounded slice of raw history IMMEDIATELY PRECEDING the window (persistence warm-up lookback) — NOT the full history array. */
  warmupRawCols: DecodedColumn[];
  /** The raw window columns to paint (post computeWindowRange, pre bucketing/budget-trim). */
  windowRawCols: DecodedColumn[];
  curBinSize: number;
  vLo: number;
  vHi: number;
  /** Legacy MarketScanner-compat only (0 = LiquidityTab). */
  sizePct: number;
  paletteId: DepthPaletteId;
  smoothingEnabled: boolean;
  rawIntervalMs: number;
  bucketFactor: number;
  paneHeightPxEstimate: number;
  /** Opt-in Bookmap-style clean visual model — see depthSignificance.ts's softKneeAlpha doc comment. Defaults to 'legacy' (byte-identical to pre-existing behavior) if undefined. */
  visualModel: 'legacy' | 'clean';
}

/** The rebuild's complete output — pixels + every meta field the main thread needs to commit. `pixels` is transferable (postMessage transfer list) for a zero-copy return. */
export interface RasterResult {
  jobId: number;
  /** True when the job degenerated to nothing paintable (empty window / no finite extent) — commit should keep the previous bitmap untouched. */
  empty: boolean;
  /** ABGR pixel buffer, numCols × paintedNumRows, row-major (row 0 = top / highest price). Null when `empty`. */
  pixels: ArrayBuffer | null;
  priceMin: number;
  priceMax: number;
  numCols: number;
  paintedNumRows: number;
  rawNumRows: number;
  rowMergeFactor: number;
  bloomEnabled: boolean;
  // Job params echoed back so the main-thread commit can build the
  // offscreen meta without correlating against stored dispatch state.
  curBinSize: number;
  rawIntervalMs: number;
  bucketFactor: number;
  /**
   * Bucketed (painted) columns — becomes meta.cols. NOTE: unlike `pixels`
   * this is NOT transferable — it structured-clones back across the worker
   * boundary on every rebuild (bounded by the window's bin count, same
   * order of magnitude as the job's input clone). Profile before optimizing
   * — a packed format for it is deliberately not built speculatively.
   */
  cols: DecodedColumn[];
  lastPaintedRawT: number;
  lastBucketStartT: number;
  lastBucketRawCols: DecodedColumn[];
  persistMap: Map<number, number>;
  persistBaseMap: Map<number, number>;
}

function emptyResult(job: RasterJob): RasterResult {
  return {
    jobId: job.jobId,
    empty: true,
    pixels: null,
    priceMin: 0,
    priceMax: 0,
    numCols: 0,
    paintedNumRows: 0,
    rawNumRows: 0,
    rowMergeFactor: 1,
    bloomEnabled: false,
    curBinSize: job.curBinSize,
    rawIntervalMs: job.rawIntervalMs,
    bucketFactor: job.bucketFactor,
    cols: [],
    lastPaintedRawT: 0,
    lastBucketStartT: 0,
    lastBucketRawCols: [],
    persistMap: new Map(),
    persistBaseMap: new Map(),
  };
}

/**
 * The full-window rebuild — the former DepthMatrixLayer repaintOffscreen
 * body (bucketing → extent union → merge-first row cap → cell budget →
 * persistence warm-up → paint → smoothing/bloom) operating purely on typed
 * arrays. Runs inside depthRaster.worker.ts normally, or synchronously on
 * the main thread as the no-Worker fallback — identical output either way.
 */
export function computeFullRaster(job: RasterJob): RasterResult {
  const {
    jobId,
    warmupRawCols,
    windowRawCols,
    curBinSize,
    vLo,
    vHi,
    sizePct,
    paletteId,
    smoothingEnabled,
    rawIntervalMs,
    bucketFactor,
    paneHeightPxEstimate,
  } = job;
  const visualModel = job.visualModel ?? 'legacy';

  const rawWindowCols = windowRawCols;
  if (rawWindowCols.length === 0) return emptyResult(job);

  // LOD point 1 — column bucketing (epoch-aligned MAX-q merge across each
  // bucket's raw columns). `bucketFactor <= 1` is a documented no-op
  // passthrough. `rawCounts[i]` = number of raw columns consumed by bucketed
  // column i, kept so the cell-budget trim below can map a
  // dropped-bucket-count back to a raw offset for the persistence warm-up.
  const bucketed = bucketFactor > 1 ? bucketColumns(rawWindowCols, rawIntervalMs, bucketFactor) : null;
  let cols: DecodedColumn[] = bucketed ? (bucketed.columns as DecodedColumn[]) : rawWindowCols.slice();
  let rawCounts: number[] = bucketed ? bucketed.rawCounts : rawWindowCols.map(() => 1);
  if (cols.length === 0) return emptyResult(job);

  // ── Determine grid extents ────────────────────────────────────────────
  // Notional-WEIGHTED price extent computed over the (possibly bucketed)
  // WINDOW columns only. Far-wall fix (2026-07-20) — track the price range
  // of SIGNIFICANT bins (usd >= vLo, i.e. anything that would render "lit")
  // alongside the weighted-percentile pass, so a genuine wall far from the
  // market can never be tail-cut by the p0.5/p99.5 weight window: the final
  // extent is the UNION of the weighted window and the significant-bin
  // range.
  const extentPrices: number[] = [];
  const extentUsd: number[] = [];
  let sigMinPrice = Infinity;
  let sigMaxPrice = -Infinity;
  for (const col of cols) {
    for (const r of col.bids) {
      if (r.q <= 0) continue;
      const usd = qToUsd(r.q);
      extentPrices.push(r.price);
      extentUsd.push(usd);
      if (usd >= vLo) {
        if (r.price < sigMinPrice) sigMinPrice = r.price;
        if (r.price > sigMaxPrice) sigMaxPrice = r.price;
      }
    }
    for (const r of col.asks) {
      if (r.q <= 0) continue;
      const usd = qToUsd(r.q);
      extentPrices.push(r.price);
      extentUsd.push(usd);
      if (usd >= vLo) {
        if (r.price < sigMinPrice) sigMinPrice = r.price;
        if (r.price > sigMaxPrice) sigMaxPrice = r.price;
      }
    }
  }
  if (extentPrices.length === 0) return emptyResult(job);

  const weighted = weightedPriceExtent(extentPrices, extentUsd);
  let priceMin = weighted.min;
  let priceMax = weighted.max + curBinSize; // upper edge of the top bin
  if (Number.isFinite(sigMinPrice) && sigMinPrice < priceMin) priceMin = sigMinPrice;
  if (Number.isFinite(sigMaxPrice) && sigMaxPrice + curBinSize > priceMax) priceMax = sigMaxPrice + curBinSize;
  if (!isFinite(priceMin) || !isFinite(priceMax)) return emptyResult(job);

  // Hard safety cap, MERGE-FIRST (far-wall fix, 2026-07-20): MAX_GRID_ROWS
  // is a PAINTED-row cap, not a raw-extent clip — see its doc comment.
  let numRows = Math.round((priceMax - priceMin) / curBinSize) + 1;
  const absMaxRawRows = MAX_GRID_ROWS * LOD_MAX_ROW_MERGE_FACTOR;
  if (numRows > absMaxRawRows) {
    const clamped = clampExtentToMaxRows(priceMin, priceMax, curBinSize, weighted.median, absMaxRawRows);
    priceMin = clamped.min;
    priceMax = clamped.max;
    numRows = Math.round((priceMax - priceMin) / curBinSize) + 1;
  }
  if (numRows <= 0) return emptyResult(job);

  // LOD point 2 — row merging. Estimate raw row px from the CSS pane
  // height (priceToCoordinate isn't available at rebuild time), derive how
  // many raw rows collapse into one painted row, and take the MAX with the
  // factor REQUIRED by the painted-row cap (deterministic in numRows — no
  // hysteresis needed; the same max() lives in drawFrame's rebuild-trigger
  // check so the two never disagree and rebuild-loop).
  const rowPxEstimate = numRows > 0 ? paneHeightPxEstimate / numRows : Infinity;
  const rowMergeFactor = Math.max(
    computeRowMergeFactor(rowPxEstimate),
    requiredRowMergeFactorForCap(numRows, MAX_GRID_ROWS),
  );
  let paintedNumRows = rowMergeFactor > 1 ? Math.ceil(numRows / rowMergeFactor) : numRows;

  // Total-cell budget guard (PER-WINDOW, against the PAINTED grid). Clip the
  // OLDEST painted columns to fit; the newest are what's actually visible at
  // the live edge. Bucketing + row merging already keep this "naturally"
  // under budget at almost any zoom — this is the belt-and-suspenders
  // backstop for pathological cases.
  let trimmedFromStart = 0; // RAW column count trimmed (rawCounts-summed) — for the warm-up index below.
  if (cols.length * paintedNumRows > MAX_GRID_CELLS) {
    const keepCols = clipColumnsForCellBudget(cols.length, paintedNumRows, MAX_GRID_CELLS);
    if (keepCols < cols.length) {
      const dropBuckets = cols.length - keepCols;
      let rawDropped = 0;
      for (let k = 0; k < dropBuckets; k++) rawDropped += rawCounts[k];
      cols = cols.slice(dropBuckets);
      rawCounts = rawCounts.slice(dropBuckets);
      trimmedFromStart = rawDropped;
    }
  }
  if (cols.length === 0) return emptyResult(job);

  const numCols = cols.length;
  const bloomEnabled = smoothingEnabled && numCols * paintedNumRows <= BLOOM_MAX_CELLS;

  // Precise upper price bound for the row-membership filter below — bins
  // outside [priceMin, rowMaxPrice] fall outside the clipped grid and must
  // be excluded BEFORE persistMap bookkeeping. Uses the RAW numRows/
  // curBinSize (the actual price range covered), independent of how many
  // painted rows that range collapses into.
  const rowMaxPrice = priceMin + (numRows - 1) * curBinSize;
  const rowEpsilon = curBinSize * 0.001;

  const lut = getPaletteLUT(paletteId);
  // Legacy MarketScanner-compat cut — sizePct === 0 (LiquidityTab, always)
  // → qCut stays 0 → the branch in colorOf never fires — zero-cost no-op.
  const legacyQCut = sizePct > 0
    ? Math.round(Math.log1p((sizePct / 100) * vHi) * 1000)
    : 0;
  const alphaCutoffUsd = alphaSkipCutoffUsd(vLo);

  // Persistence weighting, seeded by a bookkeeping-only warm-up pass over
  // the columns immediately preceding the window. Warm-up must operate at
  // the SAME granularity as what's actually painted, so "consecutive
  // columns present" means "consecutive BUCKETS present" once
  // bucketFactor > 1 — bucket the preceding raw slice the exact same way
  // before warming up. The warm-up source is `warmupRawCols` PLUS any raw
  // columns the budget trim dropped from the window's own start (they now
  // precede the painted window too).
  const rampColumns = PERSISTENCE_RAMP_COLUMNS_DEFAULT;
  const preWindowRaw = trimmedFromStart > 0
    ? warmupRawCols.concat(rawWindowCols.slice(0, trimmedFromStart))
    : warmupRawCols;
  let persistMap: Map<number, number>;
  if (bucketFactor > 1) {
    const warmupBucketedCols = preWindowRaw.length > 0
      ? (bucketColumns(preWindowRaw, rawIntervalMs, bucketFactor).columns as DecodedColumn[])
      : [];
    persistMap = buildPersistWarmupMap(warmupBucketedCols, warmupBucketedCols.length, priceMin, rowMaxPrice, rowEpsilon, rampColumns);
  } else {
    persistMap = buildPersistWarmupMap(preWindowRaw, preWindowRaw.length, priceMin, rowMaxPrice, rowEpsilon, rampColumns);
  }

  // Historical columns render the book exactly as it WAS at that time, even
  // if price later traded through the level — no penetration suppression
  // (Bookmap shows the book's full history per column).
  const pixels = new Uint32Array(numCols * paintedNumRows);
  paintColumnsRangeToBuffer(
    pixels,
    cols,
    0,
    numCols,
    priceMin,
    rowMaxPrice,
    rowEpsilon,
    curBinSize,
    paintedNumRows,
    vLo,
    vHi,
    lut,
    legacyQCut,
    alphaCutoffUsd,
    smoothingEnabled,
    bloomEnabled,
    persistMap,
    rowMergeFactor,
    0, // bumpRangeStart — full window rebuild always bumps everything
    visualModel,
  );

  // LOD append bookkeeping — track the currently-open LAST painted bucket's
  // raw columns + start time so a subsequent live append can extend it in
  // place rather than forcing a full rebuild on every tick.
  let lastBucketStartT = 0;
  let lastBucketRawCols: DecodedColumn[] = [];
  if (bucketFactor > 1) {
    lastBucketStartT = bucketStartMs(rawWindowCols[rawWindowCols.length - 1].t, rawIntervalMs, bucketFactor);
    let k = rawWindowCols.length - 1;
    while (k >= 0 && rawWindowCols[k].t >= lastBucketStartT) k--;
    lastBucketRawCols = rawWindowCols.slice(k + 1);
  }

  // Seed `persistBaseMap` = persistence state as of right BEFORE the last
  // (currently-open, once bucketFactor > 1) painted bucket's own
  // contribution. A DEDICATED warm-up pass (same bounded rampColumns+2
  // lookback, over the same bucketed `cols` array) rather than reusing
  // `persistMap` itself, since `persistMap` already includes the last
  // bucket's ONE bump — the append path needs the state EXCLUDING that.
  // Unused (empty) when bucketFactor <= 1.
  const persistBaseMap = bucketFactor > 1
    ? buildPersistWarmupMap(cols, numCols - 1, priceMin, rowMaxPrice, rowEpsilon, rampColumns)
    : new Map<number, number>();

  return {
    jobId,
    empty: false,
    pixels: pixels.buffer,
    priceMin,
    priceMax,
    numCols,
    paintedNumRows,
    rawNumRows: numRows,
    rowMergeFactor,
    bloomEnabled,
    curBinSize,
    rawIntervalMs,
    bucketFactor,
    cols,
    lastPaintedRawT: rawWindowCols[rawWindowCols.length - 1].t,
    lastBucketStartT,
    lastBucketRawCols,
    persistMap,
    persistBaseMap,
  };
}
