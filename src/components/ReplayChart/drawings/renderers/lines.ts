import { RenderCtx, Renderer } from './types';
import { Drawing } from '../../types';

// trendline / ray / extended share one body — type distinction handled inline
export const renderLine: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas } = rc;
  if (drawing.points.length < 2) return;
  const p1 = toPixel(drawing.points[0]);
  const p2 = toPixel(drawing.points[1]);
  if (!p1 || !p2) return;

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
};

export const renderHorizontal: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas, color } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;

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
};

export const renderVertical: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;

  ctx.beginPath();
  ctx.moveTo(p.x, 0);
  ctx.lineTo(p.x, canvas.height);
  ctx.stroke();
};

export const renderArrow: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  // Line p0→p1 with filled arrowhead at p1
  if (drawing.points.length < 2) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  if (!p0 || !p1) return;

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
};

export const renderTrendAngle: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  // Line p0→p1 plus angle label near p1
  if (drawing.points.length < 2) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  if (!p0 || !p1) return;

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
};

export const renderHorizontalRay: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas, color } = rc;
  // Horizontal line from p0 extending RIGHT to canvas edge only
  if (drawing.points.length < 1) return;
  const p0 = toPixel(drawing.points[0]);
  if (!p0) return;

  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(canvas.width, p0.y);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(drawing.points[0].price.toFixed(2), canvas.width - 10, p0.y - 5);
};

export const renderCrossLine: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas } = rc;
  // Full-width horizontal + full-height vertical through p0
  if (drawing.points.length < 1) return;
  const p0 = toPixel(drawing.points[0]);
  if (!p0) return;

  ctx.beginPath();
  ctx.moveTo(0, p0.y);
  ctx.lineTo(canvas.width, p0.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(p0.x, 0);
  ctx.lineTo(p0.x, canvas.height);
  ctx.stroke();
};
