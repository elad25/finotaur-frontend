import { RenderCtx, Renderer } from './types';
import { Drawing } from '../../types';

// text and note share the same rendering body
export const renderTextOrNote: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;

  ctx.fillStyle = color;
  ctx.font = `${drawing.fontSize || 14}px ${drawing.fontFamily || 'sans-serif'}`;
  ctx.textAlign = drawing.textAlign || 'left';
  ctx.fillText(drawing.text || 'Text', p.x, p.y);
};

export const renderMeasure: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  if (drawing.points.length < 2) return;
  const p1 = toPixel(drawing.points[0]);
  const p2 = toPixel(drawing.points[1]);
  if (!p1 || !p2) return;

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
};
