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
// Color mapping (exact spec):
//   STOPS: [0.00 → navy] [0.18 → blue] [0.40 → cyan] [0.65 → yellow] [0.88+ → white]
//   vHi  = p99 of visible q values (NOT max — one iceberg must not flatten field)
//   vLo  = p70 fixed floor percentile (was slider-driven, now fixed since size
//          filtering is the user control instead of sensitivity)
//   t    = (q/1000 - vLo) / (vHi - vLo), gamma 0.50
//   q===0 → transparent; t≤0 → faint context (lut[0] + alpha 0x40)
//
// Floor filter: bins with decoded USD < floorUsd are treated as q=0.
//   USD = expm1(q / 1000). A bin passes iff expm1(q/1000) >= floorUsd
//   i.e. q >= round(log1p(floorUsd) * 1000).
//
// Size filter (replaces sensitivity slider):
//   sizeFilterPct: 0 (All) | 1 | 5 | 10 | 25 — percent of the p99 cell.
//   Reference = vHi (the p99 USD value of the visible window).
//   qCut = round(log1p(sizeFilterPct/100 * expm1(qP99/1000)) * 1000)
//   With sizeFilterPct=0 (All): no additional cut — same as current behavior.
//   With sizeFilterPct>0: bins below qCut are fully transparent (not faint).
//
// Palette + smoothing (Task S2 — ATAS/Bookmap restyle):
//   The color LUT itself now lives in depthPalettes.ts (3 palettes: 'finotaur'
//   NEW default gold-on-black, 'classic' = the ORIGINAL hardcoded navy→cyan→
//   yellow→white ramp bit-for-bit preserved, 'thermal' = ATAS/inferno-like).
//   `palette` defaults to 'classic' when the prop is absent — MarketScanner.tsx
//   never passes it, so its render stays pixel-identical to pre-S2.
//   `smoothing` (default false when absent) adds two post-process passes to
//   the offscreen raster ONLY (never per-frame — still gated by the same
//   needsRepaint check as the rest of repaintOffscreen):
//     1. Vertical 3-tap blend between adjacent price rows (kills hard cell
//        banding), only blending painted (alpha>0) neighbors into each other.
//     2. A soft "bloom" halo around cells whose normalized intensity t>=0.95
//        (max-blended into their 4-neighbors) so the strongest walls read as
//        bright hot streaks, ATAS-style.

import { useEffect, useRef } from 'react';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import type { DecodedColumn } from '@/pages/app/crypto/scanner/depthTypes';
import { qToUsd } from '@/pages/app/crypto/scanner/useDepthSlices';
import { getPaletteLUT, getPaletteFaintColor, type DepthPaletteId } from './depthPalettes';

// Normalized-intensity threshold (pre-gamma, linear t ∈ [0,1]) above which a
// cell is considered "hot" for the bloom pass.
const BLOOM_HOT_THRESHOLD = 0.95;
// Fraction of a hot cell's own alpha blended into each of its 4 neighbors.
const BLOOM_NEIGHBOR_ALPHA_FRACTION = 0.35;

/** Unpacks an ABGR Uint32 into [r, g, b, a] bytes. */
function unpackAbgr(color: number): [number, number, number, number] {
  return [color & 0xff, (color >>> 8) & 0xff, (color >>> 16) & 0xff, (color >>> 24) & 0xff];
}

function packAbgr(r: number, g: number, b: number, a: number): number {
  return ((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
}

/**
 * Vertical 3-tap smoothing pass — blends each painted (alpha>0) pixel with
 * its immediate row-1/row+1 neighbors (weights 0.25/0.5/0.25). Transparent
 * neighbors contribute the pixel's OWN color instead of black/zero, so edges
 * against empty background never darken — only banding BETWEEN two painted
 * rows softens. Operates on a copy so reads never see already-blended output.
 */
function applyVerticalSmoothing(buf: Uint32Array, numCols: number, numRows: number): void {
  const src = buf.slice();
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
function applyBloom(buf: Uint32Array, hotMask: Uint8Array, numCols: number, numRows: number): void {
  const hotColors = buf.slice(); // snapshot BEFORE bloom mutates neighbors
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

// ── Histogram-based percentile (O(n), no sort) ───────────────────────────────

// Reusable 65536-bin histogram — hoisted to avoid allocating 256KB per call.
// Module-scoped + single-threaded (rAF) so reuse is safe; zero-filled each call.
const HIST_SCRATCH = new Uint32Array(65536);

/** Compute a percentile over uint16 values using a 65536-bin histogram. */
function percentile65536(qValues: Uint16Array, pct: number): number {
  if (qValues.length === 0) return 0;
  const hist = HIST_SCRATCH;
  hist.fill(0);
  for (let i = 0; i < qValues.length; i++) hist[qValues[i]]++;

  const target = Math.ceil(qValues.length * pct);
  let cum = 0;
  for (let q = 0; q < 65536; q++) {
    cum += hist[q];
    if (cum >= target) return q;
  }
  return 65535;
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
  /**
   * Relative size filter: percent of the p99 (reference) cell.
   * 0 = All (no size cut, current behavior).
   * 1 | 5 | 10 | 25 = only bins whose decoded USD >= pct/100 * referenceUsd are shown.
   * Default: 5.
   */
  sizeFilterPct?: 0 | 1 | 5 | 10 | 25;
  /** Absolute notional floor in USD — bins below are treated as q=0 */
  floorUsd?: number;
  /** Current candle interval in milliseconds — used to map column→px width */
  candleIntervalMs: number;
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
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DepthMatrixLayer({
  chart,
  series,
  columns,
  binSize,
  width,
  height,
  sizeFilterPct = 5,
  floorUsd = 1_000,
  candleIntervalMs,
  palette = 'classic',
  smoothing = false,
}: DepthMatrixLayerProps) {
  const canvasRef          = useRef<HTMLCanvasElement>(null);
  const offscreenRef       = useRef<OffscreenCanvas | null>(null);
  const offscreenCtxRef    = useRef<OffscreenCanvasRenderingContext2D | null>(null);

  const rafRef             = useRef<number | null>(null);
  const dirtyRef           = useRef<boolean>(true);
  const lastFingerprintRef = useRef<string>('');

  // Track what's painted on the offscreen to avoid redundant repaints.
  const offscreenVersionRef  = useRef<number>(0);
  const paintedVersionRef    = useRef<number>(-1);

  // Normalization params — recomputed on visible window change or slider move.
  const vLoRef = useRef<number>(0);
  const vHiRef = useRef<number>(1);

  // Debounce recolor to rAF while slider drags.
  const sliderRafRef = useRef<number | null>(null);

  // Keep latest props in refs.
  const columnsRef         = useRef<DecodedColumn[]>(columns);
  const binSizeRef         = useRef<number>(binSize);
  const widthRef           = useRef<number>(width);
  const heightRef          = useRef<number>(height);
  const floorUsdRef        = useRef<number>(floorUsd);
  const sizeFilterRef      = useRef<number>(sizeFilterPct);
  const candleIntervalRef  = useRef<number>(candleIntervalMs);
  const paletteRef         = useRef<DepthPaletteId>(palette);
  const smoothingRef       = useRef<boolean>(smoothing);

  columnsRef.current        = columns;
  binSizeRef.current        = binSize;
  widthRef.current          = width;
  heightRef.current         = height;
  floorUsdRef.current       = floorUsd;
  sizeFilterRef.current     = sizeFilterPct;
  candleIntervalRef.current = candleIntervalMs;
  paletteRef.current        = palette;
  smoothingRef.current      = smoothing;

  // ── Normalization ─────────────────────────────────────────────────────────

  function recomputeNorm(
    cols: DecodedColumn[],
    chart2: IChartApi,
    curBinSize: number,
    floor: number,
  ) {
    // Only look at visible columns.
    const vis = chart2.timeScale().getVisibleRange();
    const fromSec = vis ? (vis.from as unknown as number) : -Infinity;
    const toSec   = vis ? (vis.to   as unknown as number) : Infinity;

    // Compute floor q threshold
    const floorQ = Math.round(Math.log1p(floor) * 1000);

    // Collect all q values in the visible window for both sides.
    const qList: number[] = [];
    for (const col of cols) {
      const colSec = col.t / 1000;
      if (colSec < fromSec - 120 || colSec > toSec + 120) continue; // ±2 min slack
      if (col.binSize !== curBinSize) continue; // rebucketed columns may differ temporarily
      for (const r of col.bids) {
        if (r.q >= floorQ && r.q > 0) qList.push(r.q);
      }
      for (const r of col.asks) {
        if (r.q >= floorQ && r.q > 0) qList.push(r.q);
      }
    }

    if (qList.length < 2) {
      vLoRef.current = 0;
      vHiRef.current = 1;
      return;
    }

    const arr = new Uint16Array(qList.length);
    for (let i = 0; i < qList.length; i++) arr[i] = Math.min(65535, qList[i]);

    // vHi = p99 (clamp ice-bergs) — also used as the size-filter reference.
    const rawHi = percentile65536(arr, 0.99);
    // vLo = fixed p70 (previously driven by slider; size filter is the new user control).
    const rawLo = percentile65536(arr, 0.70);

    // Decode to USD for the threshold comparison (actual normalization is in q-space).
    vHiRef.current = rawHi > 0 ? qToUsd(rawHi) : 1;
    vLoRef.current = qToUsd(rawLo);

    if (vHiRef.current <= vLoRef.current) {
      vHiRef.current = vLoRef.current + 1;
    }
  }

  // ── Offscreen repaint ─────────────────────────────────────────────────────
  // Paints the entire matrix to the offscreen canvas.
  // Called only when columns change or normalization changes.

  function repaintOffscreen(
    cols: DecodedColumn[],
    curBinSize: number,
    floor: number,
    vLo: number,
    vHi: number,
    sizePct: number,   // 0 | 1 | 5 | 10 | 25 — percent of vHi reference
    chartInst: IChartApi,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    seriesInst: ISeriesApi<any>,
    paletteId: DepthPaletteId,
    smoothingEnabled: boolean,
  ) {
    if (cols.length === 0) return;

    // ── Determine grid extents ────────────────────────────────────────────
    // Price range: min/max bin price across all columns.
    let priceMin = Infinity;
    let priceMax = -Infinity;
    for (const col of cols) {
      for (const r of col.bids) {
        if (r.price < priceMin) priceMin = r.price;
        if (r.price + curBinSize > priceMax) priceMax = r.price + curBinSize;
      }
      for (const r of col.asks) {
        if (r.price < priceMin) priceMin = r.price;
        if (r.price + curBinSize > priceMax) priceMax = r.price + curBinSize;
      }
    }
    if (!isFinite(priceMin) || !isFinite(priceMax)) return;

    const numCols = cols.length;
    // Number of price rows
    const numRows = Math.round((priceMax - priceMin) / curBinSize) + 1;
    if (numCols <= 0 || numRows <= 0) return;

    // Resize offscreen if needed
    const needed_w = numCols;
    const needed_h = numRows;
    if (
      !offscreenRef.current ||
      offscreenRef.current.width !== needed_w ||
      offscreenRef.current.height !== needed_h
    ) {
      try {
        offscreenRef.current = new OffscreenCanvas(needed_w, needed_h);
        offscreenCtxRef.current = offscreenRef.current.getContext('2d', { alpha: true })!;
      } catch {
        return;
      }
    }

    const octx = offscreenCtxRef.current;
    if (!octx) return;

    // Clear
    octx.clearRect(0, 0, needed_w, needed_h);

    const imgData = octx.createImageData(needed_w, needed_h);
    const buf = new Uint32Array(imgData.data.buffer);
    // Parallel mask (same row-major indexing as buf) marking cells whose
    // normalized intensity cleared BLOOM_HOT_THRESHOLD — consumed by
    // applyBloom() below when smoothingEnabled. Allocated unconditionally
    // (cheap — one Uint8Array the size of the grid) but only ever written to
    // / read from when smoothingEnabled, so it's a no-op cost otherwise.
    const hotMask = smoothingEnabled ? new Uint8Array(needed_w * needed_h) : null;

    const lut = getPaletteLUT(paletteId);
    const faintColor = getPaletteFaintColor(paletteId);

    const floorQ = Math.round(Math.log1p(floor) * 1000);
    const dVLo = vLo;
    const dVHi = vHi;
    const dRange = dVHi - dVLo;

    // Size filter cut: qCut is the minimum q a bin must reach to be rendered
    // when sizePct > 0. Reference = vHi (the p99 USD wall in the visible window).
    // Formula: qCut = round(log1p(sizePct/100 * expm1(qP99/1000)) * 1000)
    // where expm1(qP99/1000) = vHi (already decoded).
    // With sizePct === 0 (All): qCut = 0 → no additional filtering.
    const qCut = sizePct > 0
      ? Math.round(Math.log1p((sizePct / 100) * vHi) * 1000)
      : 0;

    // Set by qToColor on its most recent call — read immediately afterward by
    // the fill loop (single-threaded, synchronous) to populate hotMask.
    // Avoids qToColor allocating a [color, hot] tuple on every cell.
    let lastCellWasHot = false;

    // Helper: map a q value to a canvas pixel color.
    function qToColor(q: number): number {
      lastCellWasHot = false;
      if (q === 0 || q < floorQ) return 0; // transparent

      // Size filter: fully hide sub-threshold bins (not even faint context)
      // when a ≥N% tier is active.
      if (qCut > 0 && q < qCut) return 0;

      const usd = qToUsd(q);
      if (usd < floor) return 0;

      let t = (usd - dVLo) / dRange;
      if (t <= 0) return faintColor; // below vLo → faint context
      if (t > 1) t = 1;
      lastCellWasHot = t >= BLOOM_HOT_THRESHOLD;

      // gamma compression (0.50) — stronger mid-lift, cells pop earlier
      const gamma = Math.pow(t, 0.50);
      const idx = Math.min(255, (gamma * 255) | 0);
      // Ensure above-threshold cells are fully opaque for t≥0.35; floor ~0xB0 below.
      const lutColor = lut[idx];
      if (t >= 0.35) {
        // Force full opacity (LUT already encodes 0xff alpha, but be explicit)
        return (lutColor & 0x00ffffff) | (0xff << 24);
      }
      // Low end of ramp (0 < t < 0.35): ensure alpha ≥ 0xB0
      const existingAlpha = (lutColor >>> 24) & 0xff;
      if (existingAlpha < 0xb0) {
        return (lutColor & 0x00ffffff) | (0xb0 << 24);
      }
      return lutColor;
    }

    // Fill cells.
    //
    // Penetration kill: once price has traded THROUGH a resting level, that
    // order is consumed — never paint it again, even if a fresh order later
    // refills the same price. We scan columns left→right (time order) tracking
    // the running price envelope [seenLo, seenHi] from each column's mid
    // (anchor). A cell's side is implied by its price vs that column's mid:
    // below mid = bid, above mid = ask. A bid dies once price has reached down
    // to it (seenLo <= price); an ask dies once price has reached up to it
    // (seenHi >= price). Gap columns (anchor 0) never widen the envelope.
    let seenLo = Infinity;
    let seenHi = -Infinity;

    for (let ci = 0; ci < cols.length; ci++) {
      const col = cols[ci];
      if (col.flags & 1) continue; // gap column — leave transparent

      const mid = col.anchor;
      if (isFinite(mid) && mid > 0) {
        if (mid < seenLo) seenLo = mid;
        if (mid > seenHi) seenHi = mid;
      }

      // Build a map from binFloor(price) → q for bids + asks combined.
      // Bids go on one side, asks on another, but for the heatmap we render
      // them all together by price level (Bookmap style).
      const cellMap = new Map<number, number>(); // price → q

      for (const r of col.bids) {
        const existing = cellMap.get(r.price) ?? 0;
        cellMap.set(r.price, Math.max(existing, r.q));
      }
      for (const r of col.asks) {
        const existing = cellMap.get(r.price) ?? 0;
        cellMap.set(r.price, Math.max(existing, r.q));
      }

      for (const [price, q] of cellMap) {
        // Suppress any level price has already traded through (see comment above).
        const penetrated =
          price < mid ? seenLo <= price :
          price > mid ? seenHi >= price :
          false;
        if (penetrated) continue;

        const color = qToColor(q);
        if (color === 0) continue;

        // Row index: 0 = priceMin, increasing upward in price but canvas Y increases downward.
        // We flip: rowIdx 0 = top of canvas = highest price.
        const priceRow = Math.round((price - priceMin) / curBinSize);
        // Canvas row 0 = highest price (numRows - 1 - priceRow)
        const canvasRow = numRows - 1 - priceRow;
        if (canvasRow < 0 || canvasRow >= numRows) continue;

        const pixelIdx = canvasRow * numCols + ci;
        buf[pixelIdx] = color;
        if (hotMask && lastCellWasHot) hotMask[pixelIdx] = 1;
      }
    }

    // ── Smoothing / bloom post-process (offscreen-only, dirty-gated) ─────────
    if (smoothingEnabled) {
      applyVerticalSmoothing(buf, numCols, numRows);
      if (hotMask) applyBloom(buf, hotMask, numCols, numRows);
    }

    octx.putImageData(imgData, 0, 0);

    // Annotate with what price range and column array this represents
    // (stored so the per-frame compositor can compute the affine mapping).
    (offscreenRef.current as unknown as Record<string, unknown>)._meta = {
      priceMin,
      priceMax,
      numCols,
      numRows,
      cols,
      curBinSize,
    };
  }

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

      // ── Step 2: Decide if offscreen needs repaint (ONLY gate this) ───────
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
        // Find a representative price from the first non-empty column.
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

      const needsRepaint = offscreenVersionRef.current !== paintedVersionRef.current;

      // The dirty/fingerprint check gates ONLY the expensive offscreen rasterization.
      // It must NEVER gate the clear+blit below — those run every frame unconditionally.
      if (dirtyRef.current || fingerprintChanged || needsRepaint) {
        dirtyRef.current = false;

        // Recompute the percentile norm ONLY when the offscreen will actually be
        // repainted (data/version/floor/filter change). Its output (vLo/vHi) is
        // consumed solely by repaintOffscreen, which is needsRepaint-gated — so
        // recomputing it on pure pan frames (fingerprintChanged) was wasted work
        // (2x 65536-bin histogram allocations every frame). The per-frame re-blit
        // (affine mapping + drawImage) below is unchanged.
        if (needsRepaint) {
          recomputeNorm(
            columnsRef.current,
            chartInstance,
            binSizeRef.current,
            floorUsdRef.current,
          );
        }

        if (needsRepaint) {
          repaintOffscreen(
            columnsRef.current,
            binSizeRef.current,
            floorUsdRef.current,
            vLoRef.current,
            vHiRef.current,
            sizeFilterRef.current,
            chartInstance,
            seriesInstance,
            paletteRef.current,
            smoothingRef.current,
          );
          paintedVersionRef.current = offscreenVersionRef.current;
        }
      }

      // ── Steps 3+4: ALWAYS recompute mapping and blit — every single frame ─
      // Per-frame cost: one drawImage + two coordinate lookups. Trivially cheap.
      // Skipping this is what caused the blank canvas: clearRect ran, then the
      // old early-return fired before drawImage, leaving 0% painted pixels.
      const offscreen = offscreenRef.current;
      if (!offscreen) return;

      const meta = (offscreen as unknown as Record<string, unknown>)._meta as {
        priceMin: number;
        priceMax: number;
        numCols: number;
        numRows: number;
        cols: DecodedColumn[];
        curBinSize: number;
      } | undefined;
      if (!meta || meta.numCols === 0 || meta.numRows === 0) return;

      try {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // ── Step 4a: clear the visible canvas every frame ─────────────────
        // Must run unconditionally, ALWAYS before drawImage. This is the correct
        // location (after offscreen rasterization, before blit) so there is no
        // code path that clears without subsequently drawing.
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
        // destination stretches the bitmap to fill the clamped rect.  That
        // mis-maps every column's pixel to a different canvas x than the candle
        // at the same time occupies — exactly the "walls drift during pan"
        // symptom.
        //
        // Fix: map the clamped destination back to the corresponding SOURCE
        // sub-rectangle so drawImage renders each offscreen column at the exact
        // canvas x that colToX() would assign it.  The mapping is linear
        // because both the offscreen column grid and the canvas time axis are
        // uniformly spaced.
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

  // ── Subscriptions that mark dirty ─────────────────────────────────────────
  useEffect(() => {
    const timeScale = chart.timeScale();
    const markDirty = () => { dirtyRef.current = true; };
    timeScale.subscribeVisibleLogicalRangeChange(markDirty);
    timeScale.subscribeVisibleTimeRangeChange(markDirty);
    const interval = setInterval(markDirty, 500);
    return () => {
      try { timeScale.unsubscribeVisibleLogicalRangeChange(markDirty); } catch { /* chart gone */ }
      try { timeScale.unsubscribeVisibleTimeRangeChange(markDirty); }   catch { /* chart gone */ }
      clearInterval(interval);
    };
  }, [chart]);

  // Mark dirty on size change
  useEffect(() => {
    dirtyRef.current = true;
  }, [width, height]);

  // ── Trigger offscreen repaint on column/normalization changes ─────────────
  useEffect(() => {
    // Debounce via rAF for slider drags
    if (sliderRafRef.current !== null) cancelAnimationFrame(sliderRafRef.current);
    sliderRafRef.current = requestAnimationFrame(() => {
      offscreenVersionRef.current++;
      dirtyRef.current = true;
    });
  }, [columns, binSize, sizeFilterPct, floorUsd, palette, smoothing]);

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
        // Behind candles (z-index 5) and below WallHeatLayer (z-index 10).
        zIndex:        5,
      }}
      aria-hidden="true"
    />
  );
}

export default DepthMatrixLayer;
