// src/components/charting/WallHeatLayer.tsx
//
// Absolutely-positioned canvas overlay that renders WallSegment[] as a
// Bookmap-style heatmap on top of FinotaurChart's lightweight-charts canvas.
//
// Design:
//   - One <canvas> element; DPR-aware scaling (same pattern as BookmapChart).
//   - Dirty-flag + requestAnimationFrame loop: marks dirty on segment changes,
//     chart pan/zoom, resize, and a 500ms safety-net timer for autoscale shifts.
//   - Cull off-screen segments; clamp dead-wall endTime to canvas right edge.
//   - Each segment renders as a filled rect (fillColor) + a 1px horizontal
//     edge line at the wall's price level (color). Min band height 2px.
//   - pointer-events: none — never steals mouse events from lw-charts.
//   - try/finally on every draw call with ctx.setTransform reset in finally so
//     a mid-frame throw can never corrupt the transform stack.

import { useEffect, useRef } from 'react';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import type { WallSegment } from '@/components/charting/FinotaurChart';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface WallHeatLayerProps {
  /** The lightweight-charts chart instance (for timeToCoordinate). */
  chart: IChartApi;
  /**
   * The candle series (for priceToCoordinate).
   * Typed as ISeriesApi<any> because FinotaurChart passes ISeriesApi<'Candlestick'>
   * but we only call priceToCoordinate — present on any series type.
   * The `any` is unavoidable without re-exporting a union type from lw-charts.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series: ISeriesApi<any>;
  /** Wall segments to render — same array passed to FinotaurChart. */
  segments: WallSegment[];
  /** Container CSS width in px (from ResizeObserver in FinotaurChart). */
  width: number;
  /** Container CSS height in px (from ResizeObserver in FinotaurChart). */
  height: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WallHeatLayer({
  chart,
  series,
  segments,
  width,
  height,
}: WallHeatLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number | null>(null);
  const dirtyRef  = useRef<boolean>(true);

  // Keep latest props in refs so the RAF loop always reads the newest values
  // without re-registering subscriptions every render.
  const segmentsRef = useRef<WallSegment[]>(segments);
  const widthRef    = useRef<number>(width);
  const heightRef   = useRef<number>(height);

  // Update refs on every render (no subscription re-registration needed).
  segmentsRef.current = segments;
  widthRef.current    = width;
  heightRef.current   = height;

  // ── RAF draw loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Capture stable references for the loop. chart + series are stable (don't
    // change during the lifetime of this component instance).
    const chartInstance  = chart;
    const seriesInstance = series;

    let running = true;

    function drawFrame() {
      if (!running) return;
      rafRef.current = requestAnimationFrame(drawFrame);

      if (!dirtyRef.current) return;
      dirtyRef.current = false;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const cssW = widthRef.current;
      const cssH = heightRef.current;
      if (cssW <= 0 || cssH <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      const pixW = Math.round(cssW * dpr);
      const pixH = Math.round(cssH * dpr);

      // Resize the canvas backing store if needed (avoids blur on HiDPI).
      if (canvas.width !== pixW || canvas.height !== pixH) {
        canvas.width  = pixW;
        canvas.height = pixH;
        canvas.style.width  = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      try {
        // Always set an absolute DPR transform so the stack never accumulates
        // across frames (safe even if a previous render threw without reaching finally).
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Clear to transparent — lw-charts canvas is behind us.
        ctx.clearRect(0, 0, cssW, cssH);

        const segs = segmentsRef.current;
        if (segs.length === 0) return;

        // ── Fix 1: use data-pane width, not full container width ──────────
        // timeScale().width() returns the pixel width of the data pane,
        // excluding the right price-axis area. Guard against 0/undefined.
        const rawPaneW = chartInstance.timeScale().width();
        const paneW = (typeof rawPaneW === 'number' && rawPaneW > 0) ? rawPaneW : cssW;

        // Get the visible time range (used to clamp off-screen segment coordinates).
        const visRange = chartInstance.timeScale().getVisibleRange();

        for (const seg of segs) {
          // ── Price → Y coordinates ──────────────────────────────────────────
          // Higher price = lower Y number in canvas space.
          // For thickness mode we only need the price-level Y (yAtBandBot).
          const yAtBandBot = seriesInstance.priceToCoordinate(seg.price);
          if (yAtBandBot === null) continue;
          const priceLevelY = yAtBandBot as number;

          // ── Fix 2: intensity-driven thickness centered on price level ─────
          // thicknessPx ∈ [1, 12] based on seg.intensity (0..1).
          const thicknessPx = 1 + Math.round((seg.intensity ?? 0.3) * 11);
          const halfThick   = thicknessPx / 2;

          // Band top/bot for culling check (centered on priceLevelY).
          const bandTop = priceLevelY - halfThick;
          const bandBot = priceLevelY + halfThick;

          // Cull segments entirely outside the vertical viewport.
          if (bandBot < 0 || bandTop > cssH) continue;

          // drawH is the full thickness (no min-2px expansion — thickness already driven by intensity).
          const drawH = thicknessPx;

          // ── Time → X coordinates ───────────────────────────────────────────
          // startTime: try timeToCoordinate; clamp to left edge if wall started
          // before the visible window; skip otherwise (null for unknown reason).
          let xStart: number;
          const rawXStart = chartInstance.timeScale().timeToCoordinate(
            seg.startTime as UTCTimestamp,
          );

          if (rawXStart !== null) {
            xStart = rawXStart as number;
          } else if (
            visRange !== null &&
            seg.startTime < (visRange.from as unknown as number)
          ) {
            // Wall started before the visible window → clamp to left canvas edge.
            xStart = 0;
          } else {
            // Wall is beyond the right edge or coordinate is genuinely unavailable.
            continue;
          }

          // endTime: alive walls extend to the data-pane right edge (Fix 1).
          let xEnd: number;
          if (seg.endTime === null) {
            // Alive wall — draw to the right edge of the data pane (not cssW).
            xEnd = paneW;
          } else {
            const rawXEnd = chartInstance.timeScale().timeToCoordinate(
              seg.endTime as UTCTimestamp,
            );
            if (rawXEnd !== null) {
              xEnd = rawXEnd as number;
            } else if (
              visRange !== null &&
              seg.endTime < (visRange.from as unknown as number)
            ) {
              // Dead wall entirely to the left of the visible range — cull.
              continue;
            } else {
              // Dead wall end is off the right side — clamp to pane edge (Fix 1).
              xEnd = paneW;
            }
          }

          // Cull segments with no visible horizontal span (Fix 1: use paneW).
          if (xEnd <= 0 || xStart >= paneW) continue;

          // Clip to pane bounds (Fix 1: clamp right edge to paneW).
          const drawX = Math.max(0, xStart);
          const drawW = Math.max(0, Math.min(paneW, xEnd) - drawX);
          if (drawW <= 0) continue;

          // ── Draw fill rect centered on price level ─────────────────────────
          ctx.fillStyle = seg.fillColor;
          ctx.fillRect(drawX, bandTop, drawW, drawH);

          // ── Draw 1px brighter edge line at the wall's price level ──────────
          // Centered on priceLevelY (the seg.price coordinate).
          const edgeY = Math.round(
            Math.min(cssH - 1, Math.max(0, priceLevelY)),
          );
          ctx.strokeStyle = seg.color;
          ctx.lineWidth   = 1;
          ctx.beginPath();
          // 0.5px subpixel offset produces a crisp 1px line on integer-DPR screens.
          ctx.moveTo(drawX,          edgeY + 0.5);
          ctx.lineTo(drawX + drawW,  edgeY + 0.5);
          ctx.stroke();
        }
      } finally {
        // Reset the transform to identity so any throw above cannot leave the
        // context in a broken state that would corrupt the next frame.
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }

    // Start the RAF loop immediately.
    rafRef.current = requestAnimationFrame(drawFrame);

    return () => {
      running = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // chart + series are stable for this component's lifetime — only depend on them.
    // All other reactive state (segments, width, height) is read through refs in the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, series]);

  // ── Subscriptions that mark dirty ─────────────────────────────────────────
  useEffect(() => {
    const timeScale = chart.timeScale();

    const markDirty = () => { dirtyRef.current = true; };

    // Pan / zoom changes shift which bars are visible → all coordinates change.
    timeScale.subscribeVisibleLogicalRangeChange(markDirty);
    timeScale.subscribeVisibleTimeRangeChange(markDirty);

    // Safety-net: the price autoscale (price-axis re-range after new data arrives)
    // has no direct subscription API in lw-charts v4. Poll at 500ms so walls
    // stay aligned after the price scale shifts.
    const safetyInterval = setInterval(markDirty, 500);

    return () => {
      try { timeScale.unsubscribeVisibleLogicalRangeChange(markDirty); } catch { /* chart gone */ }
      try { timeScale.unsubscribeVisibleTimeRangeChange(markDirty); }   catch { /* chart gone */ }
      clearInterval(safetyInterval);
    };
  }, [chart]);

  // Mark dirty whenever segments or container dimensions change.
  useEffect(() => {
    dirtyRef.current = true;
  }, [segments, width, height]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'absolute',
        top:           0,
        left:          0,
        // Initial CSS size is set here; the RAF loop updates style.width/height
        // and the backing-store dimensions whenever they change.
        width:         `${width}px`,
        height:        `${height}px`,
        pointerEvents: 'none',
        // Sits above the lw-charts canvas (no z-index on it = auto/0) but below
        // the marker-icons overlay (z-index 20) and the wall tooltip (z-index 30).
        zIndex:        10,
      }}
      aria-hidden="true"
    />
  );
}

export default WallHeatLayer;
