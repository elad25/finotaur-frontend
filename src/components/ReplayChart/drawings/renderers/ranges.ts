// drawings/renderers/ranges.ts
// Renderers for price-range, date-range, and date-price-range drawing tools.

import { RenderCtx, Renderer } from './types';
import { Drawing } from '../../types';

// ============================================================================
// PRICE RANGE  (2 points — vertical bracket at p0.x)
// Shows: Δ price and Δ %
// ============================================================================

export const renderPriceRange: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  if (drawing.points.length < 2) {
    // Mid-draw: show single dot
    const p = toPixel(drawing.points[0]);
    if (!p) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    return;
  }

  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  if (!p0 || !p1) return;

  const price0 = drawing.points[0].price;
  const price1 = drawing.points[1].price;
  const delta  = Math.abs(price1 - price0);
  const pct    = price0 !== 0 ? (delta / Math.abs(price0)) * 100 : 0;

  const xBracket = p0.x;
  const yTop     = Math.min(p0.y, p1.y);
  const yBottom  = Math.max(p0.y, p1.y);
  const capLen   = 8;
  const bracketX = xBracket + 20; // bracket drawn slightly to the right

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  // Vertical line
  ctx.beginPath();
  ctx.moveTo(bracketX, yTop);
  ctx.lineTo(bracketX, yBottom);
  ctx.stroke();

  // Top cap
  ctx.beginPath();
  ctx.moveTo(bracketX - capLen / 2, yTop);
  ctx.lineTo(bracketX + capLen / 2, yTop);
  ctx.stroke();

  // Bottom cap
  ctx.beginPath();
  ctx.moveTo(bracketX - capLen / 2, yBottom);
  ctx.lineTo(bracketX + capLen / 2, yBottom);
  ctx.stroke();

  // Anchor dots at each point
  for (const p of [p0, p1]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Label centred on the bracket
  const midY   = (yTop + yBottom) / 2;
  const label  = `Δ ${delta.toFixed(2)}  (${pct.toFixed(2)}%)`;
  ctx.font = '11px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bracketX + capLen / 2 + 4, midY);

  ctx.restore();
};

// ============================================================================
// DATE RANGE  (2 points — horizontal bracket between the two times at p0.y)
// Shows: approximate bar count and time span label
// ============================================================================

export const renderDateRange: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  if (drawing.points.length < 2) {
    const p = toPixel(drawing.points[0]);
    if (!p) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    return;
  }

  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  if (!p0 || !p1) return;

  const t0    = drawing.points[0].time;
  const t1    = drawing.points[1].time;
  const dtSec = Math.abs(t1 - t0);

  // Format the time delta into a human-readable string
  const label = formatTimeDelta(dtSec);

  const yBracket = p0.y - 20; // bracket drawn above p0 anchor
  const xLeft    = Math.min(p0.x, p1.x);
  const xRight   = Math.max(p0.x, p1.x);
  const capLen   = 8;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(xLeft, yBracket);
  ctx.lineTo(xRight, yBracket);
  ctx.stroke();

  // Left cap
  ctx.beginPath();
  ctx.moveTo(xLeft, yBracket - capLen / 2);
  ctx.lineTo(xLeft, yBracket + capLen / 2);
  ctx.stroke();

  // Right cap
  ctx.beginPath();
  ctx.moveTo(xRight, yBracket - capLen / 2);
  ctx.lineTo(xRight, yBracket + capLen / 2);
  ctx.stroke();

  // Anchor dots
  for (const p of [p0, p1]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Vertical drop lines from anchors to bracket
  ctx.setLineDash([3, 3]);
  for (const p of [p0, p1]) {
    const bx = Math.min(Math.max(p.x, xLeft), xRight);
    ctx.beginPath();
    ctx.moveTo(bx, p.y);
    ctx.lineTo(bx, yBracket);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Label centred on the bracket
  const midX = (xLeft + xRight) / 2;
  ctx.font = '11px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, midX, yBracket - 4);

  ctx.restore();
};

// ============================================================================
// DATE-PRICE RANGE  (2 points — filled rectangle with Δprice/% + time label)
// ============================================================================

export const renderDatePriceRange: Renderer = (rc: RenderCtx, drawing: Drawing) => {
  const { ctx, toPixel, color } = rc;
  if (drawing.points.length < 2) {
    const p = toPixel(drawing.points[0]);
    if (!p) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    return;
  }

  const p0 = toPixel(drawing.points[0]);
  const p1 = toPixel(drawing.points[1]);
  if (!p0 || !p1) return;

  const price0 = drawing.points[0].price;
  const price1 = drawing.points[1].price;
  const t0     = drawing.points[0].time;
  const t1     = drawing.points[1].time;

  const priceDelta = Math.abs(price1 - price0);
  const pricePct   = price0 !== 0 ? (priceDelta / Math.abs(price0)) * 100 : 0;
  const dtSec      = Math.abs(t1 - t0);
  const timeLabel  = formatTimeDelta(dtSec);

  const xLeft   = Math.min(p0.x, p1.x);
  const xRight  = Math.max(p0.x, p1.x);
  const yTop    = Math.min(p0.y, p1.y);
  const yBottom = Math.max(p0.y, p1.y);
  const rectW   = xRight - xLeft;
  const rectH   = yBottom - yTop;

  // Direction-aware fill: green if p1 > p0, red if p1 < p0
  const isUp    = price1 >= price0;
  const fillRgb = isUp ? '38,166,91' : '239,83,80';

  ctx.save();

  // Rectangle fill
  ctx.fillStyle = `rgba(${fillRgb},0.15)`;
  ctx.fillRect(xLeft, yTop, rectW, rectH);

  // Rectangle border
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(xLeft, yTop, rectW, rectH);

  // Corner anchors
  for (const p of [p0, p1]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Label box centred in rectangle
  const centerX   = xLeft + rectW / 2;
  const centerY   = yTop + rectH / 2;
  const priceLine = `Δ ${priceDelta.toFixed(2)}  (${pricePct.toFixed(2)}%)`;
  const timeLine  = timeLabel;

  ctx.font = '11px monospace';
  const lineH  = 14;
  const textW  = Math.max(
    ctx.measureText(priceLine).width,
    ctx.measureText(timeLine).width,
  );
  const boxW   = textW + 16;
  const boxH   = lineH * 2 + 10;
  const bx     = centerX - boxW / 2;
  const by     = centerY - boxH / 2;

  // Label background
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 4);
  ctx.fill();

  // Label text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(priceLine, centerX, by + lineH * 0.75);
  ctx.fillText(timeLine,  centerX, by + lineH * 1.75);

  ctx.restore();
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format a time delta (in seconds) into a compact human-readable string.
 * Examples: "45s", "3m 20s", "2h 15m", "5d 4h", "3w 2d"
 */
function formatTimeDelta(seconds: number): string {
  const abs = Math.abs(Math.round(seconds));
  if (abs < 60)     return `${abs}s`;
  if (abs < 3600)   return `${Math.floor(abs / 60)}m ${abs % 60}s`;
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  if (abs < 86400)  return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(abs / 86400);
  const hRem = Math.floor((abs % 86400) / 3600);
  if (abs < 604800) return hRem > 0 ? `${d}d ${hRem}h` : `${d}d`;
  const w = Math.floor(abs / 604800);
  const dRem = Math.floor((abs % 604800) / 86400);
  return dRem > 0 ? `${w}w ${dRem}d` : `${w}w`;
}
