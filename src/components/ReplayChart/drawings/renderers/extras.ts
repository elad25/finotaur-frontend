// drawings/renderers/extras.ts
// Final batch of 10 drawing tools for TradingView parity.
// Groups: Curves (Shapes), Projection (Position), Anchored Annotations (Annotations).

import { RenderCtx, Renderer } from './types';
import { Drawing } from '../../types';

// ============================================================================
// HELPER
// ============================================================================

function hexToRgba(color: string, alpha: number): string {
  const hex = color.trim();
  if (hex.startsWith('#')) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length >= 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return `rgba(128,128,128,${alpha})`;
}

// ============================================================================
// CURVES (Shapes group)
// ============================================================================

/**
 * curve — 3 points.
 * Quadratic Bézier: p0 = start, p1 = control point, p2 = end.
 * Renders partial progress (1 or 2 points available).
 */
export const renderCurve: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  if (drawing.points.length < 1) return;

  const p0 = toPixel(drawing.points[0]);
  if (!p0) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.beginPath();

  if (drawing.points.length < 2) {
    // Single point — draw a small dot to show placement
    ctx.arc(p0.x, p0.y, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const p1 = toPixel(drawing.points[1]);
  if (!p1) { ctx.restore(); return; }

  if (drawing.points.length < 3) {
    // Partial: straight line p0→p1
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const p2 = toPixel(drawing.points[2]);
  if (!p2) { ctx.restore(); return; }

  // Full quadratic Bézier: p0 → quadraticCurveTo(p1, p2)
  ctx.moveTo(p0.x, p0.y);
  ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
  ctx.stroke();
  ctx.restore();
};

/**
 * double-curve — 5 points.
 * Two chained quadratic Béziers:
 *   Curve 1: p0 → control(p1) → p2
 *   Curve 2: p2 → control(p3) → p4
 * Renders partial progress as each point is added.
 */
export const renderDoubleCurve: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  if (drawing.points.length < 1) return;

  const p0 = toPixel(drawing.points[0]);
  if (!p0) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.beginPath();

  const pts = drawing.points.slice(0, 5).map(pt => toPixel(pt));

  if (drawing.points.length < 2 || !pts[1]) {
    ctx.arc(p0.x, p0.y, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // First segment: always start from p0
  ctx.moveTo(p0.x, p0.y);

  if (drawing.points.length < 3 || !pts[2]) {
    // Partial: straight to p1
    ctx.lineTo(pts[1]!.x, pts[1]!.y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // First quadratic p0 → control(p1) → p2
  ctx.quadraticCurveTo(pts[1]!.x, pts[1]!.y, pts[2]!.x, pts[2]!.y);

  if (drawing.points.length < 4 || !pts[3]) {
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (drawing.points.length < 5 || !pts[4]) {
    // Partial second segment: straight p2→p3
    ctx.lineTo(pts[3]!.x, pts[3]!.y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Second quadratic p2 → control(p3) → p4 (continues from the first curve end)
  ctx.quadraticCurveTo(pts[3]!.x, pts[3]!.y, pts[4]!.x, pts[4]!.y);
  ctx.stroke();
  ctx.restore();
};

// ============================================================================
// PROJECTION (Position group)
// ============================================================================

/**
 * forecast — 3 points.
 * p0→p1: solid "measured move" leg.
 * p1→p2: dashed "forecast" leg with arrowhead at p2.
 * Label "Forecast" near p2.
 */
export const renderForecast: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  if (drawing.points.length < 1) return;

  const p0 = toPixel(drawing.points[0]);
  if (!p0) return;

  ctx.save();
  ctx.strokeStyle = color;

  // ── Solid leg p0→p1 ──
  if (drawing.points.length >= 2) {
    const p1 = toPixel(drawing.points[1]);
    if (p1) {
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      // ── Dashed forecast leg p1→p2 ──
      if (drawing.points.length >= 3) {
        const p2 = toPixel(drawing.points[2]);
        if (p2) {
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Arrowhead at p2
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          const headLen = 10;
          ctx.beginPath();
          ctx.moveTo(p2.x, p2.y);
          ctx.lineTo(
            p2.x - headLen * Math.cos(angle - Math.PI / 7),
            p2.y - headLen * Math.sin(angle - Math.PI / 7)
          );
          ctx.lineTo(
            p2.x - headLen * Math.cos(angle + Math.PI / 7),
            p2.y - headLen * Math.sin(angle + Math.PI / 7)
          );
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();

          // Label
          ctx.fillStyle = color;
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText('Forecast', p2.x + 6, p2.y - 4);
        }
      }
    }
  }

  ctx.restore();
};

/**
 * projection — 3 points.
 * Draws a shaded parallelogram using anchors p0, p1, p2.
 * Fourth corner derived as p0 + (p2 - p1).
 * Fill at 0.12 alpha, border at full color.
 * Label "Projection" centered.
 */
export const renderProjection: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color, style } = rc;
  if (drawing.points.length < 2) return;

  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  if (!p0 || !p1) return;

  ctx.save();

  if (drawing.points.length < 3) {
    // Partial — just draw the first edge
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const p2 = toPixel(drawing.points[2]);
  if (!p2) { ctx.restore(); return; }

  // Fourth corner: p0 + (p2 - p1)
  const p3 = {
    x: p0.x + (p2.x - p1.x),
    y: p0.y + (p2.y - p1.y),
  };

  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.closePath();

  ctx.fillStyle = hexToRgba(style.color ?? color, 0.12);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.stroke();

  // Centered label
  const cx = (p0.x + p1.x + p2.x + p3.x) / 4;
  const cy = (p0.y + p1.y + p2.y + p3.y) / 4;
  ctx.fillStyle = color;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Projection', cx, cy);

  ctx.restore();
};

/**
 * bars-pattern — 2 points.
 * Labeled region (rectangle p0→p1) with 0.08 alpha fill and dashed border.
 * NOTE: Full bar-copy playback logic is out of scope for this renderer;
 * this is a labeled region marker only.
 */
export const renderBarsPattern: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color, style } = rc;
  if (drawing.points.length < 2) return;

  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  if (!p0 || !p1) return;

  const x = Math.min(p0.x, p1.x);
  const y = Math.min(p0.y, p1.y);
  const w = Math.abs(p1.x - p0.x);
  const h = Math.abs(p1.y - p0.y);

  ctx.save();

  // Fill
  ctx.fillStyle = hexToRgba(style.color ?? color, 0.08);
  ctx.fillRect(x, y, w, h);

  // Dashed border
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = color;
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  // Centered label
  ctx.fillStyle = color;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Bars Pattern', x + w / 2, y + h / 2);

  ctx.restore();
};

/**
 * ghost-feed — 2 points.
 * Placeholder projection region: rectangle p0→p1 with 0.08 alpha fill and dotted border.
 * NOTE: Ghost-feed live data projection is out of scope for this renderer;
 * this is a placeholder region marker only.
 */
export const renderGhostFeed: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color, style } = rc;
  if (drawing.points.length < 2) return;

  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  if (!p0 || !p1) return;

  const x = Math.min(p0.x, p1.x);
  const y = Math.min(p0.y, p1.y);
  const w = Math.abs(p1.x - p0.x);
  const h = Math.abs(p1.y - p0.y);

  ctx.save();

  // Fill
  ctx.fillStyle = hexToRgba(style.color ?? color, 0.08);
  ctx.fillRect(x, y, w, h);

  // Dotted border
  ctx.setLineDash([2, 4]);
  ctx.strokeStyle = color;
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  // Centered label
  ctx.fillStyle = color;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Ghost Feed', x + w / 2, y + h / 2);

  ctx.restore();
};

// ============================================================================
// ANCHORED ANNOTATIONS (Annotations group)
// ============================================================================

/**
 * anchored-text — 1 point.
 * Renders drawing.text at p0. The `anchor` field ('bar' | 'screen') governs
 * how the host chart positions p0; this renderer simply draws at the given pixel.
 */
export const renderAnchoredText: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;

  const text = drawing.text ?? 'Text';
  const fontSize = drawing.fontSize ?? 13;

  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${drawing.fontWeight ?? 'normal'} ${fontSize}px ${drawing.fontFamily ?? 'sans-serif'}`;
  ctx.textAlign = (drawing.textAlign as CanvasTextAlign) ?? 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, p.x, p.y);
  ctx.restore();
};

/**
 * anchored-note — 1 point.
 * Renders a small speech-bubble glyph + drawing.text at p0.
 * Mirrors the existing comment/note rendering style.
 */
export const renderAnchoredNote: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color, style } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;

  const text = drawing.text ?? '';
  const fontSize = drawing.fontSize ?? 12;
  const paddingX = 8;
  const paddingY = 5;
  const radius = 5;
  const tailH = 8;
  const noteGlyphSize = 14;

  ctx.save();
  ctx.font = `${fontSize}px ${drawing.fontFamily ?? 'sans-serif'}`;
  const textW = text ? ctx.measureText(text).width : 40;
  const boxW = Math.max(textW + paddingX * 2, 44);
  const boxH = fontSize + paddingY * 2;

  // Position bubble above-right of p0
  const bx = p.x + noteGlyphSize;
  const by = p.y - boxH - tailH;

  // Small note glyph at p0 (pencil/note icon via Unicode)
  ctx.fillStyle = color;
  ctx.font = `${noteGlyphSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📝', p.x, p.y);

  // Bubble
  ctx.font = `${fontSize}px ${drawing.fontFamily ?? 'sans-serif'}`;
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, radius);
  ctx.fillStyle = hexToRgba(style.color ?? color, 0.15);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();

  // Tail
  const tailX = bx + 8;
  const tailTopY = by + boxH;
  ctx.beginPath();
  ctx.moveTo(tailX - 5, tailTopY);
  ctx.lineTo(tailX + 5, tailTopY);
  ctx.lineTo(tailX, tailTopY + tailH);
  ctx.closePath();
  ctx.fillStyle = hexToRgba(style.color ?? color, 0.15);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();

  // Text in bubble
  if (text) {
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px ${drawing.fontFamily ?? 'sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + boxW / 2, by + boxH / 2);
  }

  ctx.restore();
};

/**
 * price-note — 1 point.
 * A pill at p0 showing drawing.text (if any) plus the price at points[0].
 */
export const renderPriceNote: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;

  const priceStr = drawing.points[0].price.toFixed(2);
  const noteText = drawing.text ? `${drawing.text}  ${priceStr}` : priceStr;
  const fontSize = 12;
  const paddingX = 10;
  const paddingY = 5;
  const radius = 12; // pill shape

  ctx.save();
  ctx.font = `bold ${fontSize}px sans-serif`;
  const textW = ctx.measureText(noteText).width;
  const boxW = textW + paddingX * 2;
  const boxH = fontSize + paddingY * 2;
  const bx = p.x - boxW / 2;
  const by = p.y - boxH / 2;

  // Pill background
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, radius);
  ctx.fillStyle = color;
  ctx.fill();

  // Pill text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(noteText, p.x, p.y);

  ctx.restore();
};

/**
 * arrow-marker — 1 point.
 * A solid downward-pointing arrow hovering just above p0 (tip touching p0).
 * Distinct from the directional arrow tools — this is a chart marker.
 */
export const renderArrowMarker: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;

  const tipX = p.x;
  const tipY = p.y; // tip touches p0

  // Arrow dimensions
  const headH = 10;
  const headW = 8;
  const stemW = 4;
  const stemH = 8;
  const totalH = headH + stemH;

  // Draw pointing downward: stem top → head → tip
  ctx.save();
  ctx.fillStyle = color;

  ctx.beginPath();
  // Stem: top-left → top-right → at head base right
  ctx.moveTo(tipX - stemW, tipY - totalH);      // stem top-left
  ctx.lineTo(tipX + stemW, tipY - totalH);      // stem top-right
  ctx.lineTo(tipX + stemW, tipY - headH);       // stem bottom-right (head base)
  // Arrowhead right wing
  ctx.lineTo(tipX + headW, tipY - headH);
  // Tip
  ctx.lineTo(tipX, tipY);
  // Arrowhead left wing
  ctx.lineTo(tipX - headW, tipY - headH);
  // Back up the stem left side
  ctx.lineTo(tipX - stemW, tipY - headH);
  ctx.closePath();

  ctx.fill();
  ctx.restore();
};
