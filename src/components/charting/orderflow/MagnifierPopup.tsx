// src/components/charting/orderflow/MagnifierPopup.tsx
//
// ATAS-style Magnifier: a small floating popup that renders ONE hovered
// candle's full footprint detail (bid×ask cells + totals) at a fixed,
// comfortable cell size — without changing chart zoom. Shown only at the
// 'hidden'/'shaded' detail stages (see computeDetailLevel in
// footprintRender.ts); at 'full' the numbers are already on-screen, so the
// magnifier is redundant and stays disabled.
//
// All layout math (row count, canvas size, row-merge clamping) lives in
// footprintRender.ts's computeMagnifierLayout — pure, unit-tested. This
// component only owns the DOM/canvas lifecycle: paint the popup's own small
// canvas by reusing prepareCandleDraw + drawCandleFootprint (never
// reimplementing cell drawing), and position the popup near the cursor,
// clamped within the chart bounds so it never covers the hovered candle.
//
// Perf: the canvas is repainted ONLY when the hovered candle's time changes
// (see the `candleKey` effect dependency) — no rAF loop, no per-frame work.

import { useEffect, useRef } from 'react';
import type { FlowCandleView, FootprintConfig } from './types';
import {
  computeMagnifierLayout,
  drawCandleFootprint,
  drawTotalsRowAt,
  prepareCandleDraw,
  MAGNIFIER_ROW_HEIGHT,
  MAGNIFIER_TOTALS_BAND_HEIGHT,
  type CandleProjection,
  type FootprintDrawExtras,
} from './footprintRender';
import { FOOTPRINT_TOTALS_BG } from './footprintTheme';

export interface MagnifierPopupProps {
  candle: FlowCandleView;
  rowSize: number;
  config: FootprintConfig;
  /** Cursor-anchored position (CSS px, already clamped by the caller to chart bounds). */
  left: number;
  top: number;
}

/** en-US formatted bar time, e.g. "14:32:00" (matches the rest of the chart's locale — never locale-unpinned). */
function formatBarTime(timeSec: number): string {
  return new Date(timeSec * 1000).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function MagnifierPopup({ candle, rowSize, config, left, top }: MagnifierPopupProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    const layout = computeMagnifierLayout(prepared);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(layout.canvasWidth * dpr);
    canvas.height = Math.round(layout.canvasHeight * dpr);
    canvas.style.width = `${layout.canvasWidth}px`;
    canvas.style.height = `${layout.canvasHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Re-prepare at the layout's own merge factor if it differs from 1 (dense
    // candle that needed row-merging to fit MAGNIFIER_MAX_HEIGHT) — mirrors
    // FootprintLayer's pattern of computing mergeFactor then calling
    // prepareCandleDraw again with it.
    const finalPrepared = layout.mergeFactor === 1
      ? prepared
      : prepareCandleDraw(candle, rowSize, layout.mergeFactor, config);

    try {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = FOOTPRINT_TOTALS_BG;
      ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);

      const cellsBottom = layout.canvasHeight - MAGNIFIER_TOTALS_BAND_HEIGHT;
      const groupSize = rowSize * layout.mergeFactor;
      const minBinPrice = finalPrepared.merged.length > 0
        ? finalPrepared.merged[0].binPrice
        : 0;

      const priceToY = (price: number): number | null => {
        const rowsFromBottom = (price - minBinPrice) / groupSize;
        return cellsBottom - rowsFromBottom * MAGNIFIER_ROW_HEIGHT;
      };

      const projection: CandleProjection = {
        centerX: layout.canvasWidth / 2,
        candleWidthPx: layout.canvasWidth,
        priceToY,
        rowHeightPx: MAGNIFIER_ROW_HEIGHT,
        rowSize,
      };
      const extras: FootprintDrawExtras = {
        liveEdgeX: layout.canvasWidth,
        latestCandleRange: null,
        clipRightX: layout.canvasWidth,
      };

      drawCandleFootprint(ctx, finalPrepared, projection, 'full', config, extras);
      drawTotalsRowAt(ctx, finalPrepared, {
        leftX: 0,
        rightX: layout.canvasWidth,
        top: cellsBottom,
      });
    } finally {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }, [candle, rowSize, config]);

  return (
    <div
      className="pointer-events-none absolute z-30 select-none overflow-hidden rounded"
      style={{
        left,
        top,
        background: 'rgba(8,8,10,0.95)',
        border: '1px solid rgba(201,166,70,0.45)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      }}
      aria-hidden="true"
    >
      {/* Header: bar time + totals (volume / delta with sign color) */}
      <div
        className="flex items-center justify-between gap-3 border-b px-2 py-1 text-[10px] font-semibold"
        style={{ borderColor: 'rgba(201,166,70,0.20)', color: '#C9A646' }}
      >
        <span>{formatBarTime(candle.time)}</span>
        <span className="flex items-center gap-2">
          <span style={{ color: '#a1a1aa' }}>Vol {candle.totalVol.toFixed(1)}</span>
          <span style={{ color: candle.delta === 0 ? '#a1a1aa' : candle.delta > 0 ? '#34d399' : '#f87171' }}>
            {candle.delta > 0 ? '+' : ''}
            {candle.delta.toFixed(1)}
          </span>
        </span>
      </div>
      <canvas ref={canvasRef} />
    </div>
  );
}

export default MagnifierPopup;
