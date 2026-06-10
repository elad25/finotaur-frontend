import { RenderCtx, Renderer } from './types';
import { Drawing } from '../../types';

// ============================================================
// Helper: draw a small white label at (x, y)
// ============================================================
function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(text, x + 2, y - 2);
  ctx.restore();
}

// Internal grid fractions used in Gann box/square
const GANN_FRACTIONS = [0.25, 0.382, 0.5, 0.618, 0.75];

// ============================================================
// gann-box (2 pts)
// Rectangle from p0 to p1. Internal grid lines at fib
// fractions on both axes. Main diagonal p0→p1.
// Labels: price fractions on left edge, time fractions on bottom.
// ============================================================
export const renderGannBox: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  if (drawing.points.length < 2) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  if (!p0 || !p1) return;

  const x0 = p0.x, y0 = p0.y;
  const x1 = p1.x, y1 = p1.y;
  const w = x1 - x0;
  const h = y1 - y0;

  ctx.strokeStyle = color;
  ctx.lineWidth = rc.style.lineWidth || 1.5;

  // Outer rectangle
  ctx.strokeRect(x0, y0, w, h);

  // Main diagonal
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  // Internal grid lines (light)
  ctx.save();
  ctx.globalAlpha = 0.4;

  for (const r of GANN_FRACTIONS) {
    // Vertical line at r * width
    const vx = x0 + w * r;
    ctx.beginPath();
    ctx.moveTo(vx, y0);
    ctx.lineTo(vx, y1);
    ctx.stroke();
    drawLabel(ctx, r.toFixed(3), vx + 1, y1 + 12);

    // Horizontal line at r * height
    const hy = y0 + h * r;
    ctx.beginPath();
    ctx.moveTo(x0, hy);
    ctx.lineTo(x1, hy);
    ctx.stroke();
    drawLabel(ctx, r.toFixed(3), x0 - 36, hy + 4);
  }

  ctx.restore();
};

// ============================================================
// gann-square (2 pts)
// Box from p0→p1. Both diagonals. Three Gann angle lines
// from p0: 1x1 (diagonal), 2x1 (twice the horizontal slope),
// 1x2 (half the horizontal slope / twice vertical).
// ============================================================
export const renderGannSquare: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas, color } = rc;
  if (drawing.points.length < 2) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  if (!p0 || !p1) return;

  const x0 = p0.x, y0 = p0.y;
  const x1 = p1.x, y1 = p1.y;
  const w = x1 - x0;
  const h = y1 - y0;

  ctx.strokeStyle = color;
  ctx.lineWidth = rc.style.lineWidth || 1.5;

  // Outer rectangle
  ctx.strokeRect(x0, y0, w, h);

  // Both diagonals
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x1, y0);
  ctx.lineTo(x0, y1);
  ctx.stroke();

  // Gann angle lines from p0, extended to canvas
  if (Math.abs(w) < 1) return;
  const EXT = canvas.width * 3;
  const slopePerPx = h / w; // base slope (1x1 = p0→p1 diagonal direction)

  const angles = [
    { m: slopePerPx,       label: '1×1' },
    { m: slopePerPx * 2,   label: '2×1' },
    { m: slopePerPx * 0.5, label: '1×2' },
  ];

  const signX = w >= 0 ? 1 : -1;

  for (const { m, label } of angles) {
    const endX = x0 + signX * EXT;
    const endY = y0 + m * (endX - x0);
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();
    // Label near the box right edge
    const labelX = x1 + 4;
    const labelY = y0 + m * (x1 - x0);
    drawLabel(ctx, label, labelX, labelY);
  }
};

// ============================================================
// gann-square-fixed (2 pts)
// Same as gann-square but forces a SQUARE aspect:
// side = min(|dx|, |dy|) in pixels, applied from p0
// in the direction of p1. Comment: forces square aspect.
// ============================================================
export const renderGannSquareFixed: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas, color } = rc;
  if (drawing.points.length < 2) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  if (!p0 || !p1) return;

  const rawW = p1.x - p0.x;
  const rawH = p1.y - p0.y;

  // Force square: side = min(|dx|, |dy|), preserving direction signs
  const side = Math.min(Math.abs(rawW), Math.abs(rawH));
  const signX = rawW >= 0 ? 1 : -1;
  const signY = rawH >= 0 ? 1 : -1;

  const x0 = p0.x, y0 = p0.y;
  const x1 = x0 + side * signX;
  const y1 = y0 + side * signY;
  const w = x1 - x0;
  const h = y1 - y0;

  ctx.strokeStyle = color;
  ctx.lineWidth = rc.style.lineWidth || 1.5;

  // Outer square
  ctx.strokeRect(x0, y0, w, h);

  // Both diagonals
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x1, y0);
  ctx.lineTo(x0, y1);
  ctx.stroke();

  // Gann angle lines (same as gann-square; slope = 1 since square)
  if (Math.abs(w) < 1) return;
  const EXT = canvas.width * 3;
  const slopePerPx = h / w;

  const angles = [
    { m: slopePerPx,       label: '1×1' },
    { m: slopePerPx * 2,   label: '2×1' },
    { m: slopePerPx * 0.5, label: '1×2' },
  ];

  for (const { m, label } of angles) {
    const endX = x0 + signX * EXT;
    const endY = y0 + m * (endX - x0);
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();
    const labelX = x1 + 4;
    const labelY = y0 + m * (x1 - x0);
    drawLabel(ctx, label, labelX, labelY);
  }
};

// ============================================================
// pitchfork-schiff (3 pts)
// Pitchfork variant: median ORIGIN = midpoint of p0 and p1
// (instead of p0 itself); prongs parallel through p1 and p2.
// ============================================================
export const renderPitchforkSchiff: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas, color } = rc;
  if (drawing.points.length < 3) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  const p2 = toPixel(drawing.points[2]);
  if (!p0 || !p1 || !p2) return;

  // Schiff: median starts from midpoint(p0, p1) instead of p0
  const origin = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

  const mdx = mid.x - origin.x;
  const mdy = mid.y - origin.y;
  const mLen = Math.sqrt(mdx * mdx + mdy * mdy);
  if (mLen === 0) return;

  const udx = mdx / mLen;
  const udy = mdy / mLen;
  const EXT = canvas.width * 3;

  ctx.strokeStyle = color;
  ctx.lineWidth = rc.style.lineWidth || 1.5;

  // Median
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(origin.x + udx * EXT, origin.y + udy * EXT);
  ctx.stroke();

  // Prongs from p1 and p2
  for (const prong of [p1, p2]) {
    ctx.beginPath();
    ctx.moveTo(prong.x, prong.y);
    ctx.lineTo(prong.x + udx * EXT, prong.y + udy * EXT);
    ctx.stroke();
  }
};

// ============================================================
// pitchfork-modified (3 pts)
// Median origin = midpoint between p0 and midpoint(p1,p2).
// Prongs from p1 and p2 in the same direction as median.
// ============================================================
export const renderPitchforkModified: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas, color } = rc;
  if (drawing.points.length < 3) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  const p2 = toPixel(drawing.points[2]);
  if (!p0 || !p1 || !p2) return;

  // Modified: origin = midpoint(p0, mid(p1,p2))
  const midP1P2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const origin = { x: (p0.x + midP1P2.x) / 2, y: (p0.y + midP1P2.y) / 2 };
  const mid = midP1P2;

  const mdx = mid.x - origin.x;
  const mdy = mid.y - origin.y;
  const mLen = Math.sqrt(mdx * mdx + mdy * mdy);
  if (mLen === 0) return;

  const udx = mdx / mLen;
  const udy = mdy / mLen;
  const EXT = canvas.width * 3;

  ctx.strokeStyle = color;
  ctx.lineWidth = rc.style.lineWidth || 1.5;

  // Median
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(origin.x + udx * EXT, origin.y + udy * EXT);
  ctx.stroke();

  // Prongs from p1 and p2
  for (const prong of [p1, p2]) {
    ctx.beginPath();
    ctx.moveTo(prong.x, prong.y);
    ctx.lineTo(prong.x + udx * EXT, prong.y + udy * EXT);
    ctx.stroke();
  }
};

// ============================================================
// pitchfork-inside (3 pts)
// Origin = p0 (standard). Prongs at 0.25/0.75 between the
// median and the outer prongs instead of at p1/p2.
// APPROXIMATE — prong positions interpolated between median
// direction and p1/p2 directions; comment marks the approx.
// ============================================================
export const renderPitchforkInside: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas, color } = rc;
  if (drawing.points.length < 3) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  const p2 = toPixel(drawing.points[2]);
  if (!p0 || !p1 || !p2) return;

  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

  const mdx = mid.x - p0.x;
  const mdy = mid.y - p0.y;
  const mLen = Math.sqrt(mdx * mdx + mdy * mdy);
  if (mLen === 0) return;

  const udx = mdx / mLen;
  const udy = mdy / mLen;
  const EXT = canvas.width * 3;

  ctx.strokeStyle = color;
  ctx.lineWidth = rc.style.lineWidth || 1.5;

  // Median (standard, from p0)
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p0.x + udx * EXT, p0.y + udy * EXT);
  ctx.stroke();

  // APPROXIMATE inside prongs: interpolate midpoint vectors at 0.25/0.75
  // between median direction and outer p1/p2 directions.
  const insideRatios = [0.25, 0.75];

  for (const ratio of insideRatios) {
    // Inner prong near p1 side
    const ip1 = {
      x: mid.x + (p1.x - mid.x) * ratio,
      y: mid.y + (p1.y - mid.y) * ratio,
    };
    // Inner prong near p2 side
    const ip2 = {
      x: mid.x + (p2.x - mid.x) * ratio,
      y: mid.y + (p2.y - mid.y) * ratio,
    };

    for (const innerP of [ip1, ip2]) {
      const dx = innerP.x - p0.x + udx * (mLen * ratio);
      const dy = innerP.y - p0.y + udy * (mLen * ratio);
      const startX = p0.x + dx;
      const startY = p0.y + dy;
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + udx * EXT, startY + udy * EXT);
      ctx.stroke();
      ctx.restore();
    }
  }
};
