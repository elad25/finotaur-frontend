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

          if (style.fillColor) {
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
            
            if (style.fillColor) {
              ctx.fill();
            }
            ctx.stroke();
          } else {
            const radiusX = Math.abs(edge.x - center.x);
            const radiusY = Math.abs(edge.y - center.y);

            ctx.beginPath();
            ctx.ellipse(center.x, center.y, radiusX, radiusY, 0, 0, 2 * Math.PI);
            
            if (style.fillColor) {
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

        case 'arrow': {
          // Line p0→p1 with filled arrowhead at p1
          if (drawing.points.length < 2) break;
          const p0 = toPixel(drawing.points[0]);
          const p1 = toPixel(drawing.points[1]);
          if (!p0 || !p1) break;

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();

          // Arrowhead: two strokes ~12px at ±25° from the reversed line direction
          const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
          const headLen = 12;
          const headAngle = Math.PI / 7; // ~25°
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(
            p1.x - headLen * Math.cos(angle - headAngle),
            p1.y - headLen * Math.sin(angle - headAngle)
          );
          ctx.lineTo(
            p1.x - headLen * Math.cos(angle + headAngle),
            p1.y - headLen * Math.sin(angle + headAngle)
          );
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
          break;
        }

        case 'trend-angle': {
          // Line p0→p1 plus angle label near p1
          if (drawing.points.length < 2) break;
          const p0 = toPixel(drawing.points[0]);
          const p1 = toPixel(drawing.points[1]);
          if (!p0 || !p1) break;

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();

          // Angle relative to horizontal; negate dy because canvas y is inverted
          const angleDeg = Math.atan2(-(p1.y - p0.y), p1.x - p0.x) * 180 / Math.PI;
          ctx.fillStyle = color;
          ctx.font = '11px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`${Math.round(angleDeg)}°`, p1.x + 5, p1.y - 5);
          break;
        }

        case 'horizontal-ray': {
          // Horizontal line from p0 extending RIGHT to canvas edge only
          if (drawing.points.length < 1) break;
          const p0 = toPixel(drawing.points[0]);
          if (!p0) break;

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(canvas.width, p0.y);
          ctx.stroke();

          ctx.fillStyle = color;
          ctx.font = '11px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(drawing.points[0].price.toFixed(2), canvas.width - 10, p0.y - 5);
          break;
        }

        case 'cross-line': {
          // Full-width horizontal + full-height vertical through p0
          if (drawing.points.length < 1) break;
          const p0 = toPixel(drawing.points[0]);
          if (!p0) break;

          ctx.beginPath();
          ctx.moveTo(0, p0.y);
          ctx.lineTo(canvas.width, p0.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(p0.x, 0);
          ctx.lineTo(p0.x, canvas.height);
          ctx.stroke();
          break;
        }

        case 'triangle': {
          // Closed polygon p0→p1→p2→p0
          if (drawing.points.length < 3) break;
          const p0 = toPixel(drawing.points[0]);
          const p1 = toPixel(drawing.points[1]);
          const p2 = toPixel(drawing.points[2]);
          if (!p0 || !p1 || !p2) break;

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.closePath();

          if (style.fillColor) {
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = style.fillColor;
            ctx.fill();
            ctx.restore();
          }
          ctx.stroke();
          break;
        }

        case 'rotated-rectangle': {
          // p0→p1 = one side; p2 sets perpendicular thickness
          if (drawing.points.length < 3) break;
          const p0 = toPixel(drawing.points[0]);
          const p1 = toPixel(drawing.points[1]);
          const p2 = toPixel(drawing.points[2]);
          if (!p0 || !p1 || !p2) break;

          const edgeDx = p1.x - p0.x;
          const edgeDy = p1.y - p0.y;
          const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
          if (edgeLen === 0) break;

          // Unit normal (perpendicular to p0→p1, pointing left)
          const nx = -edgeDy / edgeLen;
          const ny = edgeDx / edgeLen;

          // Project (p2 - p1) onto normal to get signed height
          const dp2x = p2.x - p1.x;
          const dp2y = p2.y - p1.y;
          const h = dp2x * nx + dp2y * ny;

          // Four corners: p0, p1, p1+normal*h, p0+normal*h
          const c0 = p0;
          const c1 = p1;
          const c2 = { x: p1.x + nx * h, y: p1.y + ny * h };
          const c3 = { x: p0.x + nx * h, y: p0.y + ny * h };

          ctx.beginPath();
          ctx.moveTo(c0.x, c0.y);
          ctx.lineTo(c1.x, c1.y);
          ctx.lineTo(c2.x, c2.y);
          ctx.lineTo(c3.x, c3.y);
          ctx.closePath();

          if (style.fillColor) {
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = style.fillColor;
            ctx.fill();
            ctx.restore();
          }
          ctx.stroke();
          break;
        }

        case 'arc': {
          // Quadratic curve p0 → control(p1) → p2
          if (drawing.points.length < 3) break;
          const p0 = toPixel(drawing.points[0]);
          const p1 = toPixel(drawing.points[1]);
          const p2 = toPixel(drawing.points[2]);
          if (!p0 || !p1 || !p2) break;

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
          ctx.stroke();
          break;
        }

        case 'parallel-channel': {
          // Main line p0→p1; parallel line offset by perpendicular distance from p2
          if (drawing.points.length < 3) break;
          const p0 = toPixel(drawing.points[0]);
          const p1 = toPixel(drawing.points[1]);
          const p2 = toPixel(drawing.points[2]);
          if (!p0 || !p1 || !p2) break;

          const edgeDx = p1.x - p0.x;
          const edgeDy = p1.y - p0.y;
          const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
          if (edgeLen === 0) break;

          // Unit normal
          const nx = -edgeDy / edgeLen;
          const ny = edgeDx / edgeLen;

          // Signed distance from p2 to the p0→p1 line
          const dp2x = p2.x - p0.x;
          const dp2y = p2.y - p0.y;
          const offset = dp2x * nx + dp2y * ny;

          // Draw main line
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();

          // Draw parallel line offset by the measured distance
          const op0 = { x: p0.x + nx * offset, y: p0.y + ny * offset };
          const op1 = { x: p1.x + nx * offset, y: p1.y + ny * offset };

          ctx.beginPath();
          ctx.moveTo(op0.x, op0.y);
          ctx.lineTo(op1.x, op1.y);
          ctx.stroke();

          // Optional translucent fill between the two lines
          if (style.fillColor) {
            ctx.save();
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = style.fillColor;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(op1.x, op1.y);
            ctx.lineTo(op0.x, op0.y);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
          break;
        }

        case 'pitchfork': {
          // handle=p0; median line p0→midpoint(p1,p2), extended; prongs from p1 and p2
          if (drawing.points.length < 3) break;
          const p0 = toPixel(drawing.points[0]);
          const p1 = toPixel(drawing.points[1]);
          const p2 = toPixel(drawing.points[2]);
          if (!p0 || !p1 || !p2) break;

          const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

          // Direction vector of median line
          const mdx = mid.x - p0.x;
          const mdy = mid.y - p0.y;
          const mLen = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mLen === 0) break;

          // Extend median line from p0 in the median direction using a fixed scalar
          // (avoids NaN/Infinity when mdx is near zero)
          const udx = mdx / mLen;
          const udy = mdy / mLen;
          const EXT = canvas.width * 3;
          const medEndX = p0.x + udx * EXT;
          const medEndY = p0.y + udy * EXT;

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(medEndX, medEndY);
          ctx.stroke();

          // Two prongs starting at p1 and p2, same direction as p0→mid
          const prongLen = EXT; // extend by the same scalar

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p1.x + udx * prongLen, p1.y + udy * prongLen);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(p2.x, p2.y);
          ctx.lineTo(p2.x + udx * prongLen, p2.y + udy * prongLen);
          ctx.stroke();
          break;
        }

        case 'gann-fan': {
          // From p0, fan of 5 rays; p0→p1 is the 1x1 reference slope
          if (drawing.points.length < 2) break;
          const p0 = toPixel(drawing.points[0]);
          const p1 = toPixel(drawing.points[1]);
          if (!p0 || !p1) break;

          const baseDx = p1.x - p0.x;
          const baseDy = p1.y - p0.y;
          if (Math.abs(baseDx) < 1) break; // need meaningful horizontal extent

          // Slope in px/px; Gann fan multiples applied to dy
          const slopePerPx = baseDy / baseDx;
          const multipliers = [3, 2, 1, 0.5, 1 / 3];

          ctx.save();
          ctx.lineWidth = Math.max((style.lineWidth || 2) - 1, 1);
          for (const m of multipliers) {
            const endX = canvas.width;
            const endY = p0.y + slopePerPx * m * (endX - p0.x);
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
          }
          ctx.restore();
          break;
        }

        case 'fibonacci-extension': {
          // A=p0, B=p1, C=p2; levels projected from C using AB range in pixel space
          if (drawing.points.length < 3) break;
          const pA = toPixel(drawing.points[0]);
          const pB = toPixel(drawing.points[1]);
          const pC = toPixel(drawing.points[2]);
          if (!pA || !pB || !pC) break;

          const extLevels = [0, 0.382, 0.618, 1, 1.618, 2.618];
          const dyAB = pB.y - pA.y; // pixel range AB

          const xLeft = Math.min(pA.x, pC.x);

          extLevels.forEach(level => {
            const ly = pC.y + dyAB * level;
            // Map pixel y back to price for the label
            const price = candlestickSeries
              ? candlestickSeries.coordinateToPrice(ly)
              : null;

            ctx.beginPath();
            ctx.moveTo(xLeft, ly);
            ctx.lineTo(canvas.width, ly);
            ctx.stroke();

            if (drawing.showLabels !== false) {
              ctx.fillStyle = color;
              ctx.font = '11px monospace';
              ctx.textAlign = 'right';
              const priceLabel = price !== null ? price.toFixed(2) : '';
              ctx.fillText(
                `${level} (${priceLabel})`,
                canvas.width - 10,
                ly - 5
              );
            }
          });
          break;
        }

        case 'highlighter': {
          // Freehand polyline like brush but wide and semi-transparent
          if (drawing.points.length < 2) break;
          const firstPt = toPixel(drawing.points[0]);
          if (!firstPt) break;

          ctx.save();
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = Math.max((style.lineWidth || 2) * 4, 12);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.beginPath();
          ctx.moveTo(firstPt.x, firstPt.y);
          for (let i = 1; i < drawing.points.length; i++) {
            const pt = toPixel(drawing.points[i]);
            if (pt) ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
          ctx.restore();
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