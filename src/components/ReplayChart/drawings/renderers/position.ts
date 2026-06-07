// drawings/renderers/position.ts
// Renderers for long-position and short-position drawing tools.
// Mimics TradingView's Long/Short Position tool visual style (black theme).

import { RenderCtx, Renderer } from './types';
import { Drawing } from '../../types';
import { computePositionStats } from '../positionMath';

// Fixed box width (px) extending right from the entry x position.
const BOX_WIDTH = 160;

// Zone fill colours (semi-transparent).
const GREEN_FILL   = 'rgba(38,166,91,0.18)';
const GREEN_BORDER = 'rgba(38,166,91,0.70)';
const RED_FILL     = 'rgba(239,83,80,0.18)';
const RED_BORDER   = 'rgba(239,83,80,0.70)';

/**
 * Shared renderer used by both long-position and short-position.
 * direction is read from drawing.type at runtime.
 */
function renderPosition(rc: RenderCtx, drawing: Drawing): void {
  const { ctx, toPixel, canvas, color } = rc;

  // ── Mid-draw fallback: render dots + line for whatever anchors exist ──────
  if (drawing.points.length < 3) {
    ctx.save();
    for (const pt of drawing.points) {
      const px = toPixel(pt);
      if (!px) continue;
      ctx.beginPath();
      ctx.arc(px.x, px.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    if (drawing.points.length === 2) {
      const a = toPixel(drawing.points[0]);
      const b = toPixel(drawing.points[1]);
      if (a && b) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = color;
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }

  // ── Full 3-point render ───────────────────────────────────────────────────
  const stats = computePositionStats(drawing);
  if (!stats) return;

  const pEntry  = toPixel(drawing.points[0]);
  const pStop   = toPixel(drawing.points[1]);
  const pTarget = toPixel(drawing.points[2]);
  if (!pEntry || !pStop || !pTarget) return;

  const xLeft  = pEntry.x;
  const xRight = Math.min(pEntry.x + BOX_WIDTH, canvas.width - 2);

  const yEntry  = pEntry.y;
  const yStop   = pStop.y;
  const yTarget = pTarget.y;

  // Determine which zone is reward and which is risk by pixel position.
  // For a long: target is above entry (smaller y), stop is below (larger y).
  // For a short: target is below entry, stop is above.  The zones are drawn
  // from their pixel coords — direction only influences label colours.

  const rewardTop    = Math.min(yEntry, yTarget);
  const rewardBottom = Math.max(yEntry, yTarget);
  const riskTop      = Math.min(yEntry, yStop);
  const riskBottom   = Math.max(yEntry, yStop);

  ctx.save();

  // ── Reward zone (green) ──
  ctx.fillStyle = GREEN_FILL;
  ctx.fillRect(xLeft, rewardTop, xRight - xLeft, rewardBottom - rewardTop);
  ctx.strokeStyle = GREEN_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(xLeft, rewardTop, xRight - xLeft, rewardBottom - rewardTop);

  // ── Risk zone (red) ──
  ctx.fillStyle = RED_FILL;
  ctx.fillRect(xLeft, riskTop, xRight - xLeft, riskBottom - riskTop);
  ctx.strokeStyle = RED_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(xLeft, riskTop, xRight - xLeft, riskBottom - riskTop);

  // ── Entry line ──
  ctx.beginPath();
  ctx.moveTo(xLeft, yEntry);
  ctx.lineTo(xRight, yEntry);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // ── Labels ───────────────────────────────────────────────────────────────
  const fontSize = 11;
  ctx.font = `${fontSize}px monospace`;
  ctx.textBaseline = 'middle';
  const pad = 6;

  // Target label
  const targetLabel = [
    `Target ${stats.target.toFixed(2)}`,
    `+${stats.rewardAmount.toFixed(2)}`,
  ].join('  ');
  ctx.fillStyle = '#26a65b';
  ctx.textAlign = 'left';
  ctx.fillText(targetLabel, xLeft + pad, yTarget + (yEntry < yTarget ? -10 : 10));

  // Stop label
  let stopLabel = `Stop ${stats.stop.toFixed(2)}  -${stats.riskAmount.toFixed(2)}`;
  if (stats.riskPct != null) {
    stopLabel += `  (${stats.riskPct.toFixed(1)}%)`;
  }
  ctx.fillStyle = '#ef5350';
  ctx.fillText(stopLabel, xLeft + pad, yStop + (yEntry > yStop ? -10 : 10));

  // Entry label
  const entryLabel = [
    `Entry ${stats.entry.toFixed(2)}`,
    `R:R ${stats.rr.toFixed(2)}`,
    `Qty ${stats.qty}`,
  ].join('  ·  ');
  ctx.fillStyle = '#ffffff';
  ctx.fillText(entryLabel, xLeft + pad, yEntry - 12);

  ctx.restore();
}

export const renderLongPosition: Renderer  = renderPosition;
export const renderShortPosition: Renderer = renderPosition;
