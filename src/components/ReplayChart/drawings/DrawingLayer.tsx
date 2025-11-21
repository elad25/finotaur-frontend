// drawings/DrawingLayer.tsx
import React, { useRef, useEffect } from 'react';
import { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { Drawing, DrawingPoint, Theme } from '../types';
import { DRAWING_COLORS } from '../constants';

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
        const x = timeScale.timeToCoordinate(point.time as Time);
        if (!candlestickSeries) return null;
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
      const color = drawing.selected
        ? colors.selected
        : drawing.locked
        ? colors.locked
        : (drawing.style.color || colors.default);

      ctx.strokeStyle = color;
      ctx.fillStyle = drawing.style.fillColor || color;
      ctx.lineWidth = drawing.style.lineWidth || 2;
      ctx.globalAlpha = drawing.style.fillOpacity || 1;
      
      switch (drawing.style.lineStyle) {
        case 1:
          ctx.setLineDash([5, 5]);
          break;
        case 2:
          ctx.setLineDash([2, 2]);
          break;
        default:
          ctx.setLineDash([]);
      }

      switch (drawing.type) {
        case 'trendline':
        case 'ray':
        case 'extended': {
          if (drawing.points.length < 2) break;
          const p1 = toPixel(drawing.points[0]);
          const p2 = toPixel(drawing.points[1]);
          if (!p1 || !p2) break;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);

          if (drawing.type === 'ray' || drawing.type === 'extended') {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length > 0) {
              const extendLength = canvas.width * 2;
              
              if (drawing.type === 'extended') {
                const extendX1 = p1.x - (dx / length) * extendLength;
                const extendY1 = p1.y - (dy / length) * extendLength;
                ctx.moveTo(extendX1, extendY1);
              }
              
              const extendX2 = p1.x + (dx / length) * extendLength;
              const extendY2 = p1.y + (dy / length) * extendLength;
              ctx.lineTo(extendX2, extendY2);
            }
          } else {
            ctx.lineTo(p2.x, p2.y);
          }

          ctx.stroke();
          break;
        }

        case 'horizontal': {
          const p = toPixel(drawing.points[0]);
          if (!p) break;

          ctx.beginPath();
          ctx.moveTo(0, p.y);
          ctx.lineTo(canvas.width, p.y);
          ctx.stroke();

          ctx.fillStyle = color;
          ctx.font = '11px monospace';
          ctx.fillText(
            drawing.points[0].price.toFixed(2),
            canvas.width - 60,
            p.y - 5
          );
          break;
        }

        case 'vertical': {
          const p = toPixel(drawing.points[0]);
          if (!p) break;

          ctx.beginPath();
          ctx.moveTo(p.x, 0);
          ctx.lineTo(p.x, canvas.height);
          ctx.stroke();
          break;
        }

        case 'rectangle': {
          if (drawing.points.length < 2) break;
          const p1 = toPixel(drawing.points[0]);
          const p2 = toPixel(drawing.points[1]);
          if (!p1 || !p2) break;

          const width = p2.x - p1.x;
          const height = p2.y - p1.y;

          if (drawing.style.fillColor) {
            ctx.fillRect(p1.x, p1.y, width, height);
          }
          ctx.strokeRect(p1.x, p1.y, width, height);
          break;
        }

        case 'circle':
        case 'ellipse': {
          if (drawing.points.length < 2) break;
          const center = toPixel(drawing.points[0]);
          const edge = toPixel(drawing.points[1]);
          if (!center || !edge) break;

          if (drawing.type === 'circle') {
            const radius = Math.sqrt(
              Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
            );

            ctx.beginPath();
            ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
            
            if (drawing.style.fillColor) {
              ctx.fill();
            }
            ctx.stroke();
          } else {
            const radiusX = Math.abs(edge.x - center.x);
            const radiusY = Math.abs(edge.y - center.y);

            ctx.beginPath();
            ctx.ellipse(center.x, center.y, radiusX, radiusY, 0, 0, 2 * Math.PI);
            
            if (drawing.style.fillColor) {
              ctx.fill();
            }
            ctx.stroke();
          }
          break;
        }

        case 'brush': {
          if (drawing.points.length < 2) break;

          ctx.beginPath();
          const firstPoint = toPixel(drawing.points[0]);
          if (!firstPoint) break;

          ctx.moveTo(firstPoint.x, firstPoint.y);

          for (let i = 1; i < drawing.points.length; i++) {
            const p = toPixel(drawing.points[i]);
            if (p) ctx.lineTo(p.x, p.y);
          }

          ctx.stroke();
          break;
        }

        case 'text':
        case 'note': {
          const p = toPixel(drawing.points[0]);
          if (!p) break;

          ctx.fillStyle = color;
          ctx.font = `${drawing.fontSize || 14}px ${drawing.fontFamily || 'sans-serif'}`;
          ctx.textAlign = drawing.textAlign || 'left';
          ctx.fillText(drawing.text || 'Text', p.x, p.y);
          break;
        }

        case 'measure': {
          if (drawing.points.length < 2) break;
          const p1 = toPixel(drawing.points[0]);
          const p2 = toPixel(drawing.points[1]);
          if (!p1 || !p2) break;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          const priceDiff = Math.abs(drawing.points[1].price - drawing.points[0].price);
          const pricePercent = (priceDiff / drawing.points[0].price) * 100;

          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;

          ctx.fillStyle = color;
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            `Δ${priceDiff.toFixed(2)} (${pricePercent.toFixed(2)}%)`,
            midX,
            midY - 5
          );
          break;
        }

        case 'fibonacci': {
          if (drawing.points.length < 2) break;
          const p1 = toPixel(drawing.points[0]);
          const p2 = toPixel(drawing.points[1]);
          if (!p1 || !p2) break;

          const levels = drawing.levels || [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const priceDiff = drawing.points[1].price - drawing.points[0].price;

          levels.forEach(level => {
            const price = drawing.points[0].price + priceDiff * level;
            const levelPoint = toPixel({ time: drawing.points[0].time, price });
            if (!levelPoint) return;

            ctx.beginPath();
            ctx.moveTo(0, levelPoint.y);
            ctx.lineTo(canvas.width, levelPoint.y);
            ctx.stroke();

            if (drawing.showLabels !== false) {
              ctx.fillStyle = color;
              ctx.font = '11px monospace';
              ctx.textAlign = 'right';
              ctx.fillText(
                `${(level * 100).toFixed(1)}% (${price.toFixed(2)})`,
                canvas.width - 10,
                levelPoint.y - 5
              );
            }
          });
          break;
        }
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