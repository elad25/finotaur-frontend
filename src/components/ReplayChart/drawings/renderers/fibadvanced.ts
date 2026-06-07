import { RenderCtx, Renderer } from './types';
import { Drawing } from '../../types';

// Standard fibonacci ratios used across all fib tools
const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

// ============================================================
// Helper: draw a small white label at (x, y)
// ============================================================
function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(text, x + 3, y - 3);
  ctx.restore();
}

// ============================================================
// fib-channel (3 pts)
// p0→p1 = base line (ratio 0). The line through p2 parallel
// to p0→p1 is ratio 1.0. Parallel lines at each fib ratio
// are interpolated between them.
// ============================================================
export const renderFibChannel: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas, color } = rc;
  if (drawing.points.length < 3) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  const p2 = toPixel(drawing.points[2]);
  if (!p0 || !p1 || !p2) return;

  // Direction along base line
  const edgeDx = p1.x - p0.x;
  const edgeDy = p1.y - p0.y;
  const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
  if (edgeLen === 0) return;

  // Unit normal (perpendicular to p0→p1)
  const nx = -edgeDy / edgeLen;
  const ny = edgeDx / edgeLen;

  // Signed perpendicular distance from p2 to the base line
  const offset = (p2.x - p0.x) * nx + (p2.y - p0.y) * ny;

  ctx.strokeStyle = color;
  ctx.lineWidth = rc.style.lineWidth || 1.5;

  for (const r of FIB_RATIOS) {
    const off = offset * r;
    const ax = p0.x + nx * off;
    const ay = p0.y + ny * off;
    const bx = p1.x + nx * off;
    const by = p1.y + ny * off;

    // Extend line to canvas edges using the base direction
    const EXT = canvas.width * 3;
    const udx = edgeDx / edgeLen;
    const udy = edgeDy / edgeLen;

    ctx.beginPath();
    ctx.moveTo(ax - udx * EXT, ay - udy * EXT);
    ctx.lineTo(bx + udx * EXT, by + udy * EXT);
    ctx.stroke();

    drawLabel(ctx, r.toFixed(3), Math.min(ax, bx) + 4, Math.min(ay, by));
  }
};

// ============================================================
// fib-timezone (2 pts)
// Vertical lines at x = p0.x + (p1.x - p0.x) * k for k in
// Fibonacci sequence [0,1,2,3,5,8,13,21].
// ============================================================
export const renderFibTimezone: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas, color } = rc;
  if (drawing.points.length < 2) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  if (!p0 || !p1) return;

  const fibSeq = [0, 1, 2, 3, 5, 8, 13, 21];
  const step = p1.x - p0.x;

  ctx.strokeStyle = color;
  ctx.lineWidth = rc.style.lineWidth || 1.5;

  for (const k of fibSeq) {
    const x = p0.x + step * k;
    if (x < 0 || x > canvas.width) continue;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
    drawLabel(ctx, String(k), x + 2, 14);
  }
};

// ============================================================
// fib-circles (2 pts)
// Concentric circles centered at p0. Radii = R * r for each
// fib ratio, where R = pixel distance p0→p1.
// ============================================================
export const renderFibCircles: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  if (drawing.points.length < 2) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  if (!p0 || !p1) return;

  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const R = Math.sqrt(dx * dx + dy * dy);
  if (R === 0) return;

  const circleRatios = [0.236, 0.382, 0.5, 0.618, 1, 1.618];

  ctx.strokeStyle = color;
  ctx.lineWidth = rc.style.lineWidth || 1.5;

  for (const r of circleRatios) {
    const radius = R * r;
    ctx.beginPath();
    ctx.arc(p0.x, p0.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    // Label on the right of each circle
    drawLabel(ctx, r.toFixed(3), p0.x + radius + 2, p0.y);
  }
};

// ============================================================
// fib-speed-fan (2 pts)
// Bounding box p0→p1. From p0, rays toward
// (p1.x, p0.y + (p1.y - p0.y)*r) for each fib ratio.
// ============================================================
export const renderFibSpeedFan: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas, color } = rc;
  if (drawing.points.length < 2) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  if (!p0 || !p1) return;

  const fanRatios = [0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const totalDy = p1.y - p0.y;
  const EXT = canvas.width * 3;

  ctx.strokeStyle = color;
  ctx.lineWidth = rc.style.lineWidth || 1.5;

  for (const r of fanRatios) {
    const targetY = p0.y + totalDy * r;
    const dx = p1.x - p0.x;
    const dy = targetY - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;

    const ux = dx / len;
    const uy = dy / len;

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p0.x + ux * EXT, p0.y + uy * EXT);
    ctx.stroke();

    // Label near p1.x end
    const labelX = p1.x;
    const labelY = targetY;
    drawLabel(ctx, r.toFixed(3), labelX + 4, labelY);
  }
};

// ============================================================
// fib-spiral (2 pts) — APPROXIMATE golden spiral
// Parametric polyline: theta 0→4π, r = scale * 1.618^(theta/(π/2))
// Scale chosen so spiral reaches roughly p1 at theta=4π.
// This is a logarithmic spiral approximation, not pixel-perfect.
// ============================================================
export const renderFibSpiral: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  if (drawing.points.length < 2) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  if (!p0 || !p1) return;

  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const targetR = Math.sqrt(dx * dx + dy * dy);
  if (targetR === 0) return;

  // Logarithmic spiral: r(θ) = a * e^(b*θ) where b = ln(φ) / (π/2) ≈ 0.3063
  // At θ = 4π, r should equal targetR → a = targetR / e^(b*4π)
  const b = Math.log(1.618) / (Math.PI / 2);
  const thetaMax = 4 * Math.PI;
  const a = targetR / Math.exp(b * thetaMax);

  // Rotation so the spiral points toward p1 at thetaMax
  const baseAngle = Math.atan2(dy, dx) - thetaMax; // offset so final angle faces p1

  ctx.strokeStyle = color;
  ctx.lineWidth = rc.style.lineWidth || 1.5;
  ctx.beginPath();

  const steps = 200;
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * thetaMax;
    const r = a * Math.exp(b * theta);
    const angle = baseAngle + theta;
    const x = p0.x + r * Math.cos(angle);
    const y = p0.y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
};

// ============================================================
// fib-wedge (3 pts)
// Center at p0. angleStart = atan2 toward p1,
// angleEnd = atan2 toward p2. Radius R = max(dist p0→p1, p0→p2).
// Arcs at R*r for r in [0.382, 0.5, 0.618, 1].
// Also draws the two bounding radii lines.
// ============================================================
export const renderFibWedge: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  if (drawing.points.length < 3) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  const p2 = toPixel(drawing.points[2]);
  if (!p0 || !p1 || !p2) return;

  const dx1 = p1.x - p0.x; const dy1 = p1.y - p0.y;
  const dx2 = p2.x - p0.x; const dy2 = p2.y - p0.y;
  const R1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const R2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
  const R = Math.max(R1, R2);
  if (R === 0) return;

  const angleStart = Math.atan2(dy1, dx1);
  const angleEnd = Math.atan2(dy2, dx2);

  const wedgeRatios = [0.382, 0.5, 0.618, 1];

  ctx.strokeStyle = color;
  ctx.lineWidth = rc.style.lineWidth || 1.5;

  // Two bounding radii
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  // Arcs at fib fractions of R
  for (const r of wedgeRatios) {
    const radius = R * r;
    ctx.beginPath();
    ctx.arc(p0.x, p0.y, radius, angleStart, angleEnd);
    ctx.stroke();
    // Label at the midpoint angle of the arc
    const midAngle = (angleStart + angleEnd) / 2;
    const lx = p0.x + radius * Math.cos(midAngle) + 4;
    const ly = p0.y + radius * Math.sin(midAngle);
    drawLabel(ctx, r.toFixed(3), lx, ly);
  }
};

// ============================================================
// pitchfan (3 pts)
// Fan rays from p0 toward p1, midpoint(p1,p2), and p2,
// plus intermediate fib-spaced rays between adjacent lines.
// Reuses the median (p0 → mid(p1,p2)) direction from pitchfork.
// ============================================================
export const renderPitchfan: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, canvas, color } = rc;
  if (drawing.points.length < 3) return;
  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  const p2 = toPixel(drawing.points[2]);
  if (!p0 || !p1 || !p2) return;

  const EXT = canvas.width * 3;
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

  // The three main angles: toward p1, mid(p1,p2), p2
  const mainTargets = [p1, mid, p2];
  const labels = ['p1', 'median', 'p2'];

  // Fan ratios applied between p1 and mid, and mid and p2
  const innerRatios = [0.236, 0.382, 0.5, 0.618, 0.786];

  ctx.strokeStyle = color;
  ctx.lineWidth = rc.style.lineWidth || 1.5;

  // Draw main rays
  for (let i = 0; i < mainTargets.length; i++) {
    const t = mainTargets[i];
    const dx = t.x - p0.x;
    const dy = t.y - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p0.x + (dx / len) * EXT, p0.y + (dy / len) * EXT);
    ctx.stroke();
    drawLabel(ctx, labels[i], t.x + 4, t.y);
  }

  // Draw fib-interpolated rays between p1↔mid and mid↔p2
  const pairs: Array<[typeof p1, typeof p1]> = [[p1, mid], [mid, p2]];
  for (const [from, to] of pairs) {
    for (const r of innerRatios) {
      const ix = from.x + (to.x - from.x) * r;
      const iy = from.y + (to.y - from.y) * r;
      const dx = ix - p0.x;
      const dy = iy - p0.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;

      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p0.x + (dx / len) * EXT, p0.y + (dy / len) * EXT);
      ctx.stroke();
      ctx.restore();
    }
  }
};
