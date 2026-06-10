import { RenderCtx, Renderer } from './types';
import { Drawing } from '../../types';

export const renderParallelChannel: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, style } = rc;
  // Main line p0→p1; parallel line offset by perpendicular distance from p2
  if (drawing.points.length < 3) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  const p2 = toPixel(drawing.points[2]);
  if (!p0 || !p1 || !p2) return;

  const edgeDx = p1.x - p0.x;
  const edgeDy = p1.y - p0.y;
  const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
  if (edgeLen === 0) return;

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
};

export const renderPitchfork: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas } = rc;
  // handle=p0; median line p0→midpoint(p1,p2), extended; prongs from p1 and p2
  if (drawing.points.length < 3) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  const p2 = toPixel(drawing.points[2]);
  if (!p0 || !p1 || !p2) return;

  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

  // Direction vector of median line
  const mdx = mid.x - p0.x;
  const mdy = mid.y - p0.y;
  const mLen = Math.sqrt(mdx * mdx + mdy * mdy);
  if (mLen === 0) return;

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
};

export const renderGannFan: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas, style } = rc;
  // From p0, fan of 5 rays; p0→p1 is the 1x1 reference slope
  if (drawing.points.length < 2) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  if (!p0 || !p1) return;

  const baseDx = p1.x - p0.x;
  const baseDy = p1.y - p0.y;
  if (Math.abs(baseDx) < 1) return; // need meaningful horizontal extent

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
};
