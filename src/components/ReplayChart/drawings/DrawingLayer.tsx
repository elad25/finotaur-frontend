// drawings/DrawingLayer.tsx
import React, { useRef, useEffect } from 'react';
import { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { Drawing, DrawingPoint, Theme } from '../types';
import { DRAWING_COLORS } from '../constants';
import { RENDERERS } from './renderers';

// ✅ Export interface
export interface DrawingLayerProps {
  drawings: Drawing[];
  activeDrawing: Drawing | null;
  chart: IChartApi | null;
  candlestickSeries: ISeriesApi<'Candlestick'> | null;
  containerRef: React.RefObject<HTMLDivElement>;
  theme: Theme;
}

export const DrawingLayer: React.FC<DrawingLayerProps> = ({
  drawings,
  activeDrawing,
  chart,
  candlestickSeries,
  containerRef,
  theme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDark = theme === 'dark';
  const colors = isDark ? DRAWING_COLORS.dark : DRAWING_COLORS.light;

  useEffect(() => {
    if (!canvasRef.current || !chart || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const timeScale = chart.timeScale();

    const toPixel = (point: DrawingPoint): { x: number; y: number } | null => {
      try {
        if (!candlestickSeries) return null;
        const x = point.logical != null
          ? timeScale.logicalToCoordinate(point.logical as any)
          : timeScale.timeToCoordinate(point.time as Time);
        const y = candlestickSeries.priceToCoordinate(point.price);
        if (x === null || y === null) return null;
        return { x, y };
      } catch {
        return null;
      }
    };

    const allDrawings = [...drawings.filter(d => d.visible)];
    if (activeDrawing) allDrawings.push(activeDrawing);

    for (const drawing of allDrawings) {
      // Normalize style: old localStorage drawings may lack a `style` object.
      const style = drawing.style ?? {
        color: drawing.color,
        lineWidth: drawing.lineWidth,
        lineStyle: 'solid' as const,
      };

      const color = drawing.selected
        ? colors.selected
        : drawing.locked
        ? colors.locked
        : (style.color || colors.default);

      ctx.strokeStyle = color;
      ctx.fillStyle = style.fillColor || color;
      ctx.lineWidth = style.lineWidth || 2;
      ctx.globalAlpha = style.fillOpacity || 1;

      switch (style.lineStyle) {
        case 'dashed':
          ctx.setLineDash([5, 5]);
          break;
        case 'dotted':
          ctx.setLineDash([2, 2]);
          break;
        default:
          ctx.setLineDash([]);
      }

      const renderer = RENDERERS[drawing.type];
      if (renderer) {
        renderer({ ctx, toPixel, canvas, colors, style, color, candlestickSeries }, drawing);
      }

      ctx.globalAlpha = 1;
    }
  }, [drawings, activeDrawing, chart, candlestickSeries, containerRef, theme, colors, isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
};