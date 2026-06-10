import { RenderCtx, Renderer } from './types';
import { Drawing } from '../../types';

export const renderBrush: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel } = rc;
  if (drawing.points.length < 2) return;

  ctx.beginPath();
  const firstPoint = toPixel(drawing.points[0]);
  if (!firstPoint) return;

  ctx.moveTo(firstPoint.x, firstPoint.y);

  for (let i = 1; i < drawing.points.length; i++) {
    const p = toPixel(drawing.points[i]);
    if (p) ctx.lineTo(p.x, p.y);
  }

  ctx.stroke();
};

export const renderHighlighter: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, style } = rc;
  // Freehand polyline like brush but wide and semi-transparent
  if (drawing.points.length < 2) return;
  const firstPt = toPixel(drawing.points[0]);
  if (!firstPt) return;

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
};
