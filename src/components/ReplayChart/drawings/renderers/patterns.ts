// drawings/renderers/patterns.ts
// P6 Pattern drawing tools — harmonic patterns, chart patterns, Elliott Wave, cycles.
// All renderers handle partial progress (fewer committed points) gracefully.

import { RenderCtx, Renderer } from './types';
import { Drawing, DrawingPoint } from '../../types';

// ============================================================================
// HELPERS
// ============================================================================

/** Convert all drawing points to pixel coords, skipping nulls. */
function toPixels(
  rc: RenderCtx,
  pts: DrawingPoint[]
): Array<{ x: number; y: number } | null> {
  return pts.map(p => rc.toPixel(p));
}

/**
 * Draw the connecting polyline for an array of pixel points, followed by
 * a small filled vertex dot and a text label at each vertex.
 * Null entries are skipped silently (partial progress support).
 */
function drawPolyline(
  rc: RenderCtx,
  pixels: Array<{ x: number; y: number } | null>,
  labels: string[]
): void {
  const { ctx, color } = rc;

  // --- Polyline strokes ---
  let inStroke = false;
  ctx.beginPath();
  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i];
    if (!p) { inStroke = false; continue; }
    if (!inStroke) {
      ctx.moveTo(p.x, p.y);
      inStroke = true;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  ctx.stroke();

  // --- Vertex dots and labels ---
  ctx.save();
  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i];
    if (!p) continue;

    // Filled dot
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Vertex label (above-left of the dot)
    const lbl = labels[i] ?? '';
    if (lbl) {
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(lbl, p.x - 6, p.y - 6);
    }
  }
  ctx.restore();
}

/**
 * Price-based retracement ratio: |next.price - cur.price| / |cur.price - prev.price|.
 * Returns 0 on divide-by-zero.
 */
function legRatio(
  prev: DrawingPoint,
  cur: DrawingPoint,
  next: DrawingPoint
): number {
  const denom = Math.abs(cur.price - prev.price);
  if (denom === 0) return 0;
  return Math.abs(next.price - cur.price) / denom;
}

/**
 * Render a ratio label at the midpoint between two pixel points.
 * Rendered in a muted (semi-transparent) style.
 */
function drawRatioLabel(
  rc: RenderCtx,
  from: { x: number; y: number },
  to: { x: number; y: number },
  ratio: number
): void {
  const { ctx } = rc;
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const label = ratio.toFixed(3);

  ctx.save();
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(200,200,200,0.7)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, mx, my - 4);
  ctx.restore();
}

/**
 * Apply ratio labels to the legs of a harmonic pattern.
 * For a pattern with points [p0..pN], the ratio for segment (i-1)→i→(i+1)
 * is placed on the leg from pixel[i] to pixel[i+1].
 * Only drawn when at least 3 committed points exist (i >= 1, i+1 <= last).
 */
function drawHarmonicRatios(
  rc: RenderCtx,
  pts: DrawingPoint[],
  pixels: Array<{ x: number; y: number } | null>
): void {
  // Need at least 3 points to compute the first ratio
  for (let i = 1; i < pts.length - 1; i++) {
    const pPrev = pts[i - 1];
    const pCur = pts[i];
    const pNext = pts[i + 1];
    const pixCur = pixels[i];
    const pixNext = pixels[i + 1];
    if (!pixCur || !pixNext) continue;

    const ratio = legRatio(pPrev, pCur, pNext);
    drawRatioLabel(rc, pixCur, pixNext, ratio);
  }
}

// ============================================================================
// HARMONIC PATTERNS (with ratio labels)
// ============================================================================

/** XABCD — 5 points: X, A, B, C, D */
export const renderXABCD: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const labels = ['X', 'A', 'B', 'C', 'D'];
  const pixels = toPixels(rc, drawing.points);
  drawPolyline(rc, pixels, labels);
  drawHarmonicRatios(rc, drawing.points, pixels);
};

/** Cypher — 5 points: X, A, B, C, D */
export const renderCypher: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const labels = ['X', 'A', 'B', 'C', 'D'];
  const pixels = toPixels(rc, drawing.points);
  drawPolyline(rc, pixels, labels);
  drawHarmonicRatios(rc, drawing.points, pixels);
};

/** ABCD — 4 points: A, B, C, D */
export const renderABCD: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const labels = ['A', 'B', 'C', 'D'];
  const pixels = toPixels(rc, drawing.points);
  drawPolyline(rc, pixels, labels);
  drawHarmonicRatios(rc, drawing.points, pixels);
};

/** Three Drives — 7 points: 0..6 */
export const renderThreeDrives: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const labels = ['0', '1', '2', '3', '4', '5', '6'];
  const pixels = toPixels(rc, drawing.points);
  drawPolyline(rc, pixels, labels);
  drawHarmonicRatios(rc, drawing.points, pixels);
};

// ============================================================================
// CHART PATTERNS
// ============================================================================

/**
 * Head & Shoulders — 7 points.
 * Labels: ['', 'LS', '', 'H', '', 'RS', '']
 * Also draws a dashed neckline connecting points[2] and points[4].
 */
export const renderHeadShoulders: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, color } = rc;
  const labels = ['', 'LS', '', 'H', '', 'RS', ''];
  const pixels = toPixels(rc, drawing.points);
  drawPolyline(rc, pixels, labels);

  // Neckline: connect points[2] (left trough) and points[4] (right trough)
  const p2 = pixels[2];
  const p4 = pixels[4];
  if (p2 && p4) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
};

/** Triangle Pattern — 4 points: A, B, C, D */
export const renderTrianglePattern: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const labels = ['A', 'B', 'C', 'D'];
  const pixels = toPixels(rc, drawing.points);
  drawPolyline(rc, pixels, labels);
};

// ============================================================================
// ELLIOTT WAVE PATTERNS (vertex labels, no ratio labels)
// ============================================================================

/** Elliott Impulse — 6 points: 0,1,2,3,4,5 */
export const renderElliottImpulse: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const labels = ['0', '1', '2', '3', '4', '5'];
  const pixels = toPixels(rc, drawing.points);
  drawPolyline(rc, pixels, labels);
};

/** Elliott Correction — 4 points: 0,A,B,C */
export const renderElliottCorrection: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const labels = ['0', 'A', 'B', 'C'];
  const pixels = toPixels(rc, drawing.points);
  drawPolyline(rc, pixels, labels);
};

/** Elliott Triangle — 6 points: 0,A,B,C,D,E */
export const renderElliottTriangle: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const labels = ['0', 'A', 'B', 'C', 'D', 'E'];
  const pixels = toPixels(rc, drawing.points);
  drawPolyline(rc, pixels, labels);
};

/** Elliott Double Combo (WXY) — 4 points: 0,W,X,Y */
export const renderElliottWXY: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const labels = ['0', 'W', 'X', 'Y'];
  const pixels = toPixels(rc, drawing.points);
  drawPolyline(rc, pixels, labels);
};

/** Elliott Triple Combo (WXYXZ) — 6 points: 0,W,X,Y,X,Z */
export const renderElliottWXYXZ: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const labels = ['0', 'W', 'X', 'Y', 'X', 'Z'];
  const pixels = toPixels(rc, drawing.points);
  drawPolyline(rc, pixels, labels);
};

// ============================================================================
// CYCLE TOOLS
// ============================================================================

/**
 * Cyclic Lines — 2 points.
 * Interval d = pixel x of p1 - pixel x of p0.
 * Draws repeating vertical lines at x = x0 + k*d for all k covering the canvas,
 * including negative k back toward x=0.
 */
export const renderCyclicLines: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, canvas, color } = rc;
  if (drawing.points.length < 1) return;

  const p0 = rc.toPixel(drawing.points[0]);
  if (!p0) return;

  // With only 1 point committed, just draw a single vertical line as preview
  if (drawing.points.length < 2) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p0.x, 0);
    ctx.lineTo(p0.x, canvas.height);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.restore();
    return;
  }

  const p1 = rc.toPixel(drawing.points[1]);
  if (!p1) return;

  const d = p1.x - p0.x;
  if (Math.abs(d) < 1) return; // Guard against zero interval

  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();

  // Extend in both directions to cover the canvas
  const kStart = Math.floor((0 - p0.x) / d) - 1;
  const kEnd = Math.ceil((canvas.width - p0.x) / d) + 1;

  for (let k = kStart; k <= kEnd; k++) {
    const x = p0.x + k * d;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }
  ctx.stroke();
  ctx.restore();
};

/**
 * Time Cycles — 2 points.
 * Same as cyclic lines but each vertical line is labeled with its cycle index.
 */
export const renderTimeCycles: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, canvas, color } = rc;
  if (drawing.points.length < 1) return;

  const p0 = rc.toPixel(drawing.points[0]);
  if (!p0) return;

  if (drawing.points.length < 2) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p0.x, 0);
    ctx.lineTo(p0.x, canvas.height);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.restore();
    return;
  }

  const p1 = rc.toPixel(drawing.points[1]);
  if (!p1) return;

  const d = p1.x - p0.x;
  if (Math.abs(d) < 1) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.5;

  const kStart = Math.floor((0 - p0.x) / d) - 1;
  const kEnd = Math.ceil((canvas.width - p0.x) / d) + 1;

  for (let k = kStart; k <= kEnd; k++) {
    const x = p0.x + k * d;

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();

    // Cycle index label near top of each line
    ctx.globalAlpha = 0.9;
    ctx.font = '10px sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(String(k), x, 4);
    ctx.globalAlpha = 0.5;
  }

  ctx.restore();
};

/**
 * Sine Line — 2 points (approximate).
 * Draws a sine wave from pixel p0 to pixel p1.
 * Amplitude = |y1 - y0| / 2 (or a minimum fixed fraction for flat placements).
 * One full period across the x span.
 * Uses ~100 polyline steps.
 */
export const renderSineLine: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, color } = rc;
  if (drawing.points.length < 1) return;

  const p0 = rc.toPixel(drawing.points[0]);
  if (!p0) return;

  if (drawing.points.length < 2) {
    // Single anchor: draw a small dot as placement preview
    ctx.beginPath();
    ctx.arc(p0.x, p0.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    return;
  }

  const p1 = rc.toPixel(drawing.points[1]);
  if (!p1) return;

  const xSpan = p1.x - p0.x;
  if (Math.abs(xSpan) < 1) return;

  // Amplitude: half the vertical span, minimum 20px so a horizontal drag still shows waves
  const amplitude = Math.max(Math.abs(p1.y - p0.y) / 2, 20);
  const centerY = (p0.y + p1.y) / 2;
  const steps = 100;

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0..1
    const x = p0.x + t * xSpan;
    // One full period (2π) across xSpan
    const y = centerY - amplitude * Math.sin(2 * Math.PI * t);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
};
