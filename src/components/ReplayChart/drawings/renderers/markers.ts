// drawings/renderers/markers.ts
// Renderers for emoji/icon markers and annotation markers.

import { RenderCtx, Renderer } from './types';
import { Drawing } from '../../types';

// ============================================================================
// EMOJI / ICON GROUP
// Each is a 1-point renderer that draws a Unicode glyph at points[0].
// ============================================================================

export const renderEmoji: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;

  ctx.save();
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(drawing.emoji ?? '📈', p.x, p.y);
  ctx.restore();
};

export const renderSticker: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;

  ctx.save();
  ctx.font = '32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(drawing.emoji ?? '⭐', p.x, p.y);
  ctx.restore();
};

export const renderIcon: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;

  ctx.save();
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(drawing.emoji ?? '📌', p.x, p.y);
  ctx.restore();
};

// ============================================================================
// ANNOTATION GROUP
// ============================================================================

/**
 * callout — 2 points: p0 = arrow tip/anchor, p1 = label box position.
 * Draws a leader line from p1 to p0 with an arrowhead at p0, plus a rounded
 * rect containing drawing.text at p1.
 */
export const renderCallout: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color, style } = rc;
  if (drawing.points.length < 2) return;
  const p0 = toPixel(drawing.points[0]); // arrow tip
  const p1 = toPixel(drawing.points[1]); // box position
  if (!p0 || !p1) return;

  const label = drawing.text ?? 'Callout';
  const fontSize = drawing.fontSize ?? 13;
  const paddingX = 10;
  const paddingY = 6;
  const radius = 5;

  ctx.save();

  // Measure text for box sizing
  ctx.font = `${fontSize}px ${drawing.fontFamily ?? 'sans-serif'}`;
  const textW = ctx.measureText(label).width;
  const boxW = textW + paddingX * 2;
  const boxH = fontSize + paddingY * 2;
  const boxX = p1.x - boxW / 2;
  const boxY = p1.y - boxH / 2;

  // Leader line p1 → p0
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p0.x, p0.y);
  ctx.strokeStyle = color;
  ctx.stroke();

  // Arrowhead at p0
  const angle = Math.atan2(p0.y - p1.y, p0.x - p1.x);
  const headLen = 10;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(
    p0.x - headLen * Math.cos(angle - Math.PI / 7),
    p0.y - headLen * Math.sin(angle - Math.PI / 7)
  );
  ctx.lineTo(
    p0.x - headLen * Math.cos(angle + Math.PI / 7),
    p0.y - headLen * Math.sin(angle + Math.PI / 7)
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // Box fill (15% alpha)
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, radius);
  const baseColor = style.color ?? color;
  // Parse color and apply 0.15 alpha for fill
  ctx.fillStyle = hexToRgba(baseColor, 0.15);
  ctx.fill();

  // Box border
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, radius);
  ctx.strokeStyle = color;
  ctx.stroke();

  // Label text
  ctx.fillStyle = '#ffffff';
  ctx.font = `${fontSize}px ${drawing.fontFamily ?? 'sans-serif'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, p1.x, p1.y);

  ctx.restore();
};

/**
 * comment — 1 point. A small speech-bubble shape (rounded rect + tail) at p0.
 * Shows drawing.text inside (or just the bubble if empty).
 */
export const renderComment: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color, style } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;

  const text = drawing.text ?? '';
  const fontSize = drawing.fontSize ?? 12;
  const paddingX = 8;
  const paddingY = 5;
  const radius = 5;
  const tailH = 8;

  ctx.save();
  ctx.font = `${fontSize}px ${drawing.fontFamily ?? 'sans-serif'}`;
  const textW = text ? ctx.measureText(text).width : 40;
  const boxW = Math.max(textW + paddingX * 2, 44);
  const boxH = fontSize + paddingY * 2;

  // Center the bubble above p0; tail points down from bottom-center.
  const bx = p.x - boxW / 2;
  const by = p.y - boxH - tailH;

  // Bubble body
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, radius);
  ctx.fillStyle = hexToRgba(style.color ?? color, 0.15);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();

  // Tail (small downward triangle centered)
  const tailX = p.x;
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

  // Text
  if (text) {
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px ${drawing.fontFamily ?? 'sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, p.x, by + boxH / 2);
  }

  ctx.restore();
};

/**
 * price-label — 1 point. A pill (rounded rect) showing the price value at p0.
 */
export const renderPriceLabel: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;

  const price = drawing.points[0].price;
  const label = price.toFixed(2);
  const fontSize = 12;
  const paddingX = 8;
  const paddingY = 4;
  const radius = 10; // pill shape

  ctx.save();
  ctx.font = `bold ${fontSize}px sans-serif`;
  const textW = ctx.measureText(label).width;
  const boxW = textW + paddingX * 2;
  const boxH = fontSize + paddingY * 2;
  const bx = p.x - boxW / 2;
  const by = p.y - boxH / 2;

  // Pill fill
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, radius);
  ctx.fillStyle = color;
  ctx.fill();

  // Label
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, p.x, p.y);

  ctx.restore();
};

/**
 * signpost — 1 point. A vertical pole ~60px upward from p0 with a label box at top.
 */
export const renderSignpost: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color, style } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;

  const label = drawing.text ?? 'Signpost';
  const poleH = 60;
  const fontSize = 12;
  const paddingX = 8;
  const paddingY = 4;
  const radius = 4;
  const topY = p.y - poleH;

  ctx.save();
  ctx.font = `${fontSize}px ${drawing.fontFamily ?? 'sans-serif'}`;
  const textW = ctx.measureText(label).width;
  const boxW = textW + paddingX * 2;
  const boxH = fontSize + paddingY * 2;

  // Pole
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x, topY);
  ctx.strokeStyle = color;
  ctx.stroke();

  // Label box
  const bx = p.x;
  const by = topY - boxH;
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, radius);
  ctx.fillStyle = hexToRgba(style.color ?? color, 0.15);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = `${fontSize}px ${drawing.fontFamily ?? 'sans-serif'}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + paddingX, by + boxH / 2);

  ctx.restore();
};

/**
 * flag — 1 point. A short pole (~24px) with a filled triangular pennant at top.
 */
export const renderFlag: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color, style } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;

  const poleH = 24;
  const flagW = 16;
  const flagH = 12;
  const topY = p.y - poleH;

  ctx.save();

  // Pole
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x, topY);
  ctx.strokeStyle = color;
  ctx.stroke();

  // Pennant (triangle) to the right of the pole top
  ctx.beginPath();
  ctx.moveTo(p.x, topY);
  ctx.lineTo(p.x + flagW, topY + flagH / 2);
  ctx.lineTo(p.x, topY + flagH);
  ctx.closePath();
  ctx.fillStyle = style.color ?? color;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.restore();
};

// ============================================================================
// DIRECTIONAL ARROWS — bold arrow shapes (~24px), centered at p0
// ============================================================================

/** arrow-up — bold upward arrow centered at p0 */
export const renderArrowUp: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;
  drawDirectionalArrow(ctx, p.x, p.y, 'up', color);
};

/** arrow-down — bold downward arrow centered at p0 */
export const renderArrowDown: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;
  drawDirectionalArrow(ctx, p.x, p.y, 'down', color);
};

/** arrow-left — bold leftward arrow centered at p0 */
export const renderArrowLeft: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;
  drawDirectionalArrow(ctx, p.x, p.y, 'left', color);
};

/** arrow-right — bold rightward arrow centered at p0 */
export const renderArrowRight: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  const p = toPixel(drawing.points[0]);
  if (!p) return;
  drawDirectionalArrow(ctx, p.x, p.y, 'right', color);
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Draw a bold directional arrow (~24px) centered at (cx, cy).
 * The arrow is a chevron-head + stem path, filled with fillColor.
 */
function drawDirectionalArrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  direction: 'up' | 'down' | 'left' | 'right',
  fillColor: string
): void {
  const size = 12; // half-size — total arrow spans ~24px

  ctx.save();
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = fillColor;

  // Build path in the "up" orientation, then rotate.
  const angle =
    direction === 'up' ? 0 :
    direction === 'down' ? Math.PI :
    direction === 'left' ? -Math.PI / 2 :
    Math.PI / 2;

  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Arrow pointing up (tip at top): head + stem
  const headH = size * 0.6;      // height of the arrowhead
  const headW = size;             // half-width of arrowhead base
  const stemW = size * 0.35;     // half-width of stem
  const stemH = size * 0.8;      // height of stem below head

  ctx.beginPath();
  // Tip
  ctx.moveTo(0, -size);
  // Right side of head
  ctx.lineTo(headW, -size + headH);
  ctx.lineTo(stemW, -size + headH);
  // Stem right down
  ctx.lineTo(stemW, -size + headH + stemH);
  // Stem left up
  ctx.lineTo(-stemW, -size + headH + stemH);
  ctx.lineTo(-stemW, -size + headH);
  // Left side of head
  ctx.lineTo(-headW, -size + headH);
  ctx.closePath();

  ctx.fill();
  ctx.restore();
}

/**
 * Convert a hex color (or any CSS color string) to rgba with given alpha.
 * Supports #rgb, #rrggbb, and falls back to the raw color string with
 * a workaround for non-hex values.
 */
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
  // For named colors or rgb() strings — just return a grey fallback
  return `rgba(128,128,128,${alpha})`;
}
