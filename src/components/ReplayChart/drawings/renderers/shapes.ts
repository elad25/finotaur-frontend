import { RenderCtx, Renderer } from './types';
import { Drawing } from '../../types';

export const renderRectangle: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, style } = rc;
  if (drawing.points.length < 2) return;
  const p1 = toPixel(drawing.points[0]);
  const p2 = toPixel(drawing.points[1]);
  if (!p1 || !p2) return;

  const width = p2.x - p1.x;
  const height = p2.y - p1.y;

  if (style.fillColor) {
    ctx.fillRect(p1.x, p1.y, width, height);
  }
  ctx.strokeRect(p1.x, p1.y, width, height);
};

export const renderCircleOrEllipse: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, style } = rc;
  if (drawing.points.length < 2) return;
  const center = toPixel(drawing.points[0]);
  const edge = toPixel(drawing.points[1]);
  if (!center || !edge) return;

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
};

export const renderTriangle: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, style } = rc;
  // Closed polygon p0→p1→p2→p0
  if (drawing.points.length < 3) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  const p2 = toPixel(drawing.points[2]);
  if (!p0 || !p1 || !p2) return;

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
};

export const renderRotatedRectangle: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, style } = rc;
  // p0→p1 = one side; p2 sets perpendicular thickness
  if (drawing.points.length < 3) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  const p2 = toPixel(drawing.points[2]);
  if (!p0 || !p1 || !p2) return;

  const edgeDx = p1.x - p0.x;
  const edgeDy = p1.y - p0.y;
  const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
  if (edgeLen === 0) return;

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
};

export const renderArc: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel } = rc;
  // Quadratic curve p0 → control(p1) → p2
  if (drawing.points.length < 3) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  const p2 = toPixel(drawing.points[2]);
  if (!p0 || !p1 || !p2) return;

  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
  ctx.stroke();
};
