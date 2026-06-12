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

import { useEffect, useRef } from 'react';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import type { DecodedColumn } from '@/pages/app/crypto/scanner/depthTypes';
import { qToUsd } from '@/pages/app/crypto/scanner/useDepthSlices';

// ── Color LUT ─────────────────────────────────────────────────────────────────

const STOPS: Array<[number, [number, number, number]]> = [
  [0.00, [10,  20,  45 ]],  // slightly lifted navy (not near-black)
  [0.18, [20,  70,  160]],  // blue — ramp starts earlier
  [0.40, [0,   200, 220]],  // cyan — medium walls reach here
  [0.65, [255, 216, 61 ]],  // yellow — large walls
  [0.88, [255, 255, 255]],  // white-hot — top of ramp
];

/** Precomputed 256-entry RGBA Uint32 LUT (ABGR in little-endian Uint32). */
function buildLUT(): Uint32Array {
  const lut = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let r = 0, g = 0, b = 0;
    for (let s = 1; s < STOPS.length; s++) {
      const [t0, c0] = STOPS[s - 1];
      const [t1, c1] = STOPS[s];
      if (t >= t0 && t <= t1) {
        const frac = (t - t0) / (t1 - t0);
        r = Math.round(c0[0] + (c1[0] - c0[0]) * frac);
        g = Math.round(c0[1] + (c1[1] - c0[1]) * frac);
        b = Math.round(c0[2] + (c1[2] - c0[2]) * frac);
        break;
      }
    }
    // Pack as ABGR (ImageData is RGBA in memory, but Uint32 on little-endian
    // hosts reads as ABGR where A is the most-significant byte stored last).
    lut[i] = (0xff << 24) | (b << 16) | (g << 8) | r;
  }
  return lut;
}

const LUT: Uint32Array = buildLUT();

// Faint context color for cells below vLo (alpha 0x40 = 64/255 ≈ 25%).
// navy at 25% opacity → ABGR = (0x40 << 24) | (45 << 16) | (20 << 8) | 10
const FAINT_COLOR = (0x40 << 24) | (45 << 16) | (20 << 8) | 10;

// ── Histogram-based percentile (O(n), no sort) ───────────────────────────────

/** Compute a percentile over uint16 values using a 65536-bin histogram. */
function percentile65536(qValues: Uint16Array, pct: number): number {
  if (qValues.length === 0) return 0;
  const hist = new Uint32Array(65536);
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

  columnsRef.current        = columns;
  binSizeRef.current        = binSize;
  widthRef.current          = width;
  heightRef.current         = height;
  floorUsdRef.current       = floorUsd;
  sizeFilterRef.current     = sizeFilterPct;
  candleIntervalRef.current = candleIntervalMs;

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

    // Helper: map a q value to a canvas pixel color.
    function qToColor(q: number): number {
      if (q === 0 || q < floorQ) return 0; // transparent

      // Size filter: fully hide sub-threshold bins (not even faint context)
      // when a ≥N% tier is active.
      if (qCut > 0 && q < qCut) return 0;

      const usd = qToUsd(q);
      if (usd < floor) return 0;

      let t = (usd - dVLo) / dRange;
      if (t <= 0) return FAINT_COLOR; // below vLo → faint context
      if (t > 1) t = 1;

      // gamma compression (0.50) — stronger mid-lift, cells pop earlier
      const gamma = Math.pow(t, 0.50);
      const idx = Math.min(255, (gamma * 255) | 0);
      // Ensure above-threshold cells are fully opaque for t≥0.35; floor ~0xB0 below.
      const lutColor = LUT[idx];
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

    // Fill cells
    for (let ci = 0; ci < cols.length; ci++) {
      const col = cols[ci];
      if (col.flags & 1) continue; // gap column — leave transparent

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
      }
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

        if (needsRepaint || fingerprintChanged) {
          // Recompute norm when viewport or data changes.
          // pxPerSec and priceToCoordinate anchors are resolved fresh every frame
          // (below) — do NOT cache them across frames; they lag during kinetic zoom.
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
        const actualPxPerBar = ref2.x - ref1.x;
        const pxPerSec       = ivSec > 0 ? actualPxPerBar / ivSec : 1;

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

        // Left edge of first column, right edge of last.
        const drawLeft  = Math.max(0,    x0 - colWidthPx * 0.5);
        const drawRight = Math.min(paneW, xN + colWidthPx * 0.5);

        if (drawRight <= drawLeft) return;

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
        ctx.drawImage(
          offscreen,
          0, 0, meta.numCols, meta.numRows, // source rect (entire offscreen)
          drawLeft, drawTop, drawW, drawH,  // destination rect
        );

      } finally {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = true;
      }

      lastFingerprintRef.current = fingerprint;
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
  }, [columns, binSize, sizeFilterPct, floorUsd]);

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
