/**
 * drawings2/toolsFib.ts
 *
 * Fibonacci retracement — 2-anchor tool. Creation flow is identical to
 * TrendLine (generalized POINTS_REQUIRED flow handles the preview).
 *
 * Render:
 *   - dashed p0→p1 diagonal (visual guide only)
 *   - horizontal segments across [min(x0,x1), max(x0,x1)] at each level price
 *   - right-end label "0.618 — 12345.00"
 *   - translucent band fill between adjacent levels
 *
 * hitTest: handles at p0/p1 first, then distance to each level segment.
 */

import { CanvasRenderingTarget2D } from 'fancy-canvas';
import {
  ISeriesPrimitivePaneRenderer,
  ISeriesPrimitivePaneView,
} from 'lightweight-charts';
import { BaseDrawing, DPoint, DrawingOptions, HitResult, PixelPoint, ToolId } from './base';
import { fibLevelPrices } from './geometry';
import { hexToRgba } from './tools';

const HANDLE_HALF = 5;   // px (CSS space) half-side of the square handle
const HIT_TOLERANCE = 6; // px (CSS space)

export const FIB_LEVELS: number[] = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

/** Hex color brightened for selected state — mirrors tools.ts selectedColor(). */
function selectedColor(_color: string): string {
  return '#ffffff';
}

interface FibLevelPixel {
  level: number;
  price: number;
  y: number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  FIBONACCI RETRACEMENT
// ─────────────────────────────────────────────────────────────────────────────

class FibonacciPaneRenderer implements ISeriesPrimitivePaneRenderer {
  constructor(
    private _p0: PixelPoint | null,
    private _p1: PixelPoint | null,
    private _levelPixels: FibLevelPixel[],
    private _options: DrawingOptions,
    private _selected: boolean,
  ) {}

  draw(target: CanvasRenderingTarget2D): void {
    target.useBitmapCoordinateSpace(scope => {
      if (!this._p0 || !this._p1) return;
      const ctx = scope.context;
      const hr = scope.horizontalPixelRatio;
      const vr = scope.verticalPixelRatio;

      const x0 = Math.round(this._p0.x * hr);
      const y0 = Math.round(this._p0.y * vr);
      const x1 = Math.round(this._p1.x * hr);
      const y1 = Math.round(this._p1.y * vr);

      const xLeft = Math.min(x0, x1);
      const xRight = Math.max(x0, x1);

      // Dashed diagonal p0 → p1 (visual guide only).
      ctx.save();
      ctx.setLineDash([4 * hr, 3 * hr]);
      ctx.beginPath();
      ctx.strokeStyle = this._options.color;
      ctx.lineWidth = this._options.width * vr;
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.restore();

      // Translucent bands between adjacent levels.
      const fillColor = hexToRgba(this._options.color, 0.08);
      for (let i = 0; i < this._levelPixels.length - 1; i++) {
        const a = Math.round(this._levelPixels[i].y * vr);
        const b = Math.round(this._levelPixels[i + 1].y * vr);
        const top = Math.min(a, b);
        const height = Math.abs(b - a);
        ctx.fillStyle = fillColor;
        ctx.fillRect(xLeft, top, xRight - xLeft, height);
      }

      // Level lines + labels.
      const fontSize = 11 * vr;
      ctx.font = `${fontSize}px system-ui, sans-serif`;
      for (const lp of this._levelPixels) {
        const y = Math.round(lp.y * vr);
        ctx.beginPath();
        ctx.strokeStyle = this._options.color;
        ctx.lineWidth = this._options.width * vr;
        ctx.moveTo(xLeft, y);
        ctx.lineTo(xRight, y);
        ctx.stroke();

        const label = `${lp.level} — ${lp.price.toFixed(2)}`;
        const tw = ctx.measureText(label).width;
        const pad = 4 * hr;
        ctx.fillStyle = this._options.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(xRight - tw - pad * 2, y - fontSize * 0.8, tw + pad * 2, fontSize * 1.2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#000000';
        ctx.fillText(label, xRight - tw - pad, y + fontSize * 0.2);
      }

      // Handles at the two anchors.
      if (this._selected) {
        const hc = selectedColor(this._options.color);
        const hs = HANDLE_HALF * hr;
        for (const [hx, hy] of [[x0, y0], [x1, y1]]) {
          ctx.fillStyle = hc;
          ctx.strokeStyle = this._options.color;
          ctx.lineWidth = 1.5 * vr;
          ctx.beginPath();
          ctx.rect(hx - hs, hy - hs, hs * 2, hs * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    });
  }
}

class FibonacciPaneView implements ISeriesPrimitivePaneView {
  private _source: FibonacciDrawing;
  private _p0: PixelPoint | null = null;
  private _p1: PixelPoint | null = null;
  private _levelPixels: FibLevelPixel[] = [];

  constructor(source: FibonacciDrawing) {
    this._source = source;
  }

  update(): void {
    const pt0 = this._source.points[0];
    const pt1 = this._source.points[1];
    this._p0 = pt0 ? this._source.toPixel(pt0) : null;
    this._p1 = pt1 ? this._source.toPixel(pt1) : null;
    this._levelPixels = [];

    if (!pt0 || !pt1) return;
    const prices = fibLevelPrices(pt0.price, pt1.price, FIB_LEVELS);
    for (let i = 0; i < FIB_LEVELS.length; i++) {
      const price = prices[i];
      const y = this._source.priceToCoordinate(price);
      if (y == null) continue;
      this._levelPixels.push({ level: FIB_LEVELS[i], price, y });
    }
  }

  renderer(): ISeriesPrimitivePaneRenderer {
    return new FibonacciPaneRenderer(
      this._p0, this._p1,
      this._levelPixels,
      this._source.options,
      this._source.selected,
    );
  }
}

export class FibonacciDrawing extends BaseDrawing {
  private _views: FibonacciPaneView[];

  constructor(points: DPoint[], options: DrawingOptions) {
    super(points, options);
    this._views = [new FibonacciPaneView(this)];
  }

  paneViews(): ISeriesPrimitivePaneView[] { return this._views; }
  protected _toolId(): ToolId { return 'fibonacci'; }

  hitTest(cx: number, cy: number): HitResult | null {
    const p0 = this.points[0] ? this.toPixel(this.points[0]) : null;
    const p1 = this.points[1] ? this.toPixel(this.points[1]) : null;
    if (!p0 || !p1) return null;

    // Handles first (only when selected).
    if (this.selected) {
      if (Math.hypot(cx - p0.x, cy - p0.y) <= HIT_TOLERANCE) return { isBody: false, handleIndex: 0 };
      if (Math.hypot(cx - p1.x, cy - p1.y) <= HIT_TOLERANCE) return { isBody: false, handleIndex: 1 };
    }

    // Distance to each level segment (CSS space).
    const xLeft = Math.min(p0.x, p1.x);
    const xRight = Math.max(p0.x, p1.x);
    const prices = fibLevelPrices(this.points[0].price, this.points[1].price, FIB_LEVELS);
    for (const price of prices) {
      const y = this.priceToCoordinate(price);
      if (y == null) continue;
      if (BaseDrawing._distToSegment(cx, cy, xLeft, y, xRight, y) <= HIT_TOLERANCE) {
        return { isBody: true };
      }
    }
    return null;
  }
}
