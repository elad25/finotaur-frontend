/**
 * drawings2/tools.ts
 *
 * Three concrete drawing primitives, each with its own PaneView + PaneRenderer.
 * Pattern mirrors the official TradingView trend.ts example:
 *   - PaneRenderer.draw() uses target.useBitmapCoordinateSpace(scope => {...})
 *   - Coordinates are scaled by scope.horizontalPixelRatio / verticalPixelRatio
 *   - PaneView.update() recomputes pixel coordinates from series + timeScale
 *   - updateAllViews() in BaseDrawing drives recompute on every repaint
 */

import { CanvasRenderingTarget2D } from 'fancy-canvas';
import {
  ISeriesPrimitivePaneRenderer,
  ISeriesPrimitivePaneView,
} from 'lightweight-charts';
import { BaseDrawing, DPoint, DrawingOptions, HitResult, PixelPoint, ToolId } from './base';

// ─── Handle rendering constants ──────────────────────────────────────────────

const HANDLE_HALF = 5;        // px (CSS space) half-side of the square handle
const HIT_TOLERANCE = 6;      // px (CSS space)

/** Hex color brightened for selected state. */
function selectedColor(color: string): string {
  // Simple approach: always white handles on dark chart
  return '#ffffff';
}

// ─── Inline helpers ───────────────────────────────────────────────────────────

export function hexToRgba(hex: string, alpha: number): string {
  // Support #rrggbb and #rgb
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  TREND LINE
// ─────────────────────────────────────────────────────────────────────────────

class TrendLinePaneRenderer implements ISeriesPrimitivePaneRenderer {
  constructor(
    private _p0: PixelPoint | null,
    private _p1: PixelPoint | null,
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

      ctx.beginPath();
      ctx.strokeStyle = this._options.color;
      ctx.lineWidth = this._options.width * vr;
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

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

class TrendLinePaneView implements ISeriesPrimitivePaneView {
  private _source: TrendLineDrawing;
  private _p0: PixelPoint | null = null;
  private _p1: PixelPoint | null = null;

  constructor(source: TrendLineDrawing) {
    this._source = source;
  }

  update(): void {
    this._p0 = this._source.points[0] ? this._source.toPixel(this._source.points[0]) : null;
    this._p1 = this._source.points[1] ? this._source.toPixel(this._source.points[1]) : null;
  }

  renderer(): ISeriesPrimitivePaneRenderer {
    return new TrendLinePaneRenderer(
      this._p0, this._p1,
      this._source.options,
      this._source.selected,
    );
  }
}

export class TrendLineDrawing extends BaseDrawing {
  private _views: TrendLinePaneView[];

  constructor(points: DPoint[], options: DrawingOptions) {
    super(points, options);
    this._views = [new TrendLinePaneView(this)];
  }

  paneViews(): ISeriesPrimitivePaneView[] { return this._views; }
  protected _toolId(): ToolId { return 'trendline'; }

  hitTest(cx: number, cy: number): HitResult | null {
    const p0 = this.points[0] ? this.toPixel(this.points[0]) : null;
    const p1 = this.points[1] ? this.toPixel(this.points[1]) : null;
    if (!p0 || !p1) return null;

    // Check handles first (only when selected)
    if (this.selected) {
      if (Math.hypot(cx - p0.x, cy - p0.y) <= HIT_TOLERANCE) return { isBody: false, handleIndex: 0 };
      if (Math.hypot(cx - p1.x, cy - p1.y) <= HIT_TOLERANCE) return { isBody: false, handleIndex: 1 };
    }
    // Body: distance to segment
    if (BaseDrawing._distToSegment(cx, cy, p0.x, p0.y, p1.x, p1.y) <= HIT_TOLERANCE) {
      return { isBody: true };
    }
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  HORIZONTAL LINE
// ─────────────────────────────────────────────────────────────────────────────

class HorizontalLinePaneRenderer implements ISeriesPrimitivePaneRenderer {
  constructor(
    private _y: number | null,
    private _price: number,
    private _options: DrawingOptions,
    private _selected: boolean,
  ) {}

  draw(target: CanvasRenderingTarget2D): void {
    target.useBitmapCoordinateSpace(scope => {
      if (this._y === null) return;
      const ctx = scope.context;
      const hr = scope.horizontalPixelRatio;
      const vr = scope.verticalPixelRatio;
      const yScaled = Math.round(this._y * vr);
      const w = scope.bitmapSize.width;

      ctx.beginPath();
      ctx.strokeStyle = this._options.color;
      ctx.lineWidth = this._options.width * vr;
      ctx.moveTo(0, yScaled);
      ctx.lineTo(w, yScaled);
      ctx.stroke();

      // Price label at right edge
      const label = this._price.toFixed(2);
      const fontSize = 11 * vr;
      ctx.font = `${fontSize}px system-ui, sans-serif`;
      const tw = ctx.measureText(label).width;
      const pad = 4 * hr;
      ctx.fillStyle = this._options.color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(w - tw - pad * 2, yScaled - fontSize * 0.8, tw + pad * 2, fontSize * 1.2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000000';
      ctx.fillText(label, w - tw - pad, yScaled + fontSize * 0.2);

      if (this._selected) {
        const hc = selectedColor(this._options.color);
        const hs = HANDLE_HALF * hr;
        const hx = Math.round(w / 2);
        ctx.fillStyle = hc;
        ctx.strokeStyle = this._options.color;
        ctx.lineWidth = 1.5 * vr;
        ctx.beginPath();
        ctx.rect(hx - hs, yScaled - hs, hs * 2, hs * 2);
        ctx.fill();
        ctx.stroke();
      }
    });
  }
}

class HorizontalLinePaneView implements ISeriesPrimitivePaneView {
  private _source: HorizontalLineDrawing;
  private _y: number | null = null;

  constructor(source: HorizontalLineDrawing) {
    this._source = source;
  }

  update(): void {
    const pt = this._source.points[0];
    if (!pt) { this._y = null; return; }
    const pix = this._source.toPixel(pt);
    this._y = pix ? pix.y : null;
  }

  renderer(): ISeriesPrimitivePaneRenderer {
    const pt = this._source.points[0];
    return new HorizontalLinePaneRenderer(
      this._y,
      pt?.price ?? 0,
      this._source.options,
      this._source.selected,
    );
  }
}

export class HorizontalLineDrawing extends BaseDrawing {
  private _views: HorizontalLinePaneView[];

  constructor(points: DPoint[], options: DrawingOptions) {
    super(points, options);
    this._views = [new HorizontalLinePaneView(this)];
  }

  paneViews(): ISeriesPrimitivePaneView[] { return this._views; }
  protected _toolId(): ToolId { return 'horizontal'; }

  hitTest(cx: number, cy: number): HitResult | null {
    const pt = this.points[0] ? this.toPixel(this.points[0]) : null;
    if (!pt) return null;
    if (this.selected && Math.hypot(cx - pt.x, cy - pt.y) <= HIT_TOLERANCE) {
      return { isBody: false, handleIndex: 0 };
    }
    if (Math.abs(cy - pt.y) <= HIT_TOLERANCE) return { isBody: true };
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  HORIZONTAL RAY  (1-click: from the anchor point, extends to the RIGHT only)
// ─────────────────────────────────────────────────────────────────────────────

class HorizontalRayPaneRenderer implements ISeriesPrimitivePaneRenderer {
  constructor(
    private _p0: PixelPoint | null,
    private _price: number,
    private _options: DrawingOptions,
    private _selected: boolean,
  ) {}

  draw(target: CanvasRenderingTarget2D): void {
    target.useBitmapCoordinateSpace(scope => {
      if (!this._p0) return;
      const ctx = scope.context;
      const hr = scope.horizontalPixelRatio;
      const vr = scope.verticalPixelRatio;
      const x0 = Math.round(this._p0.x * hr);
      const yScaled = Math.round(this._p0.y * vr);
      const w = scope.bitmapSize.width;

      // Line from the anchor x to the right edge only.
      ctx.beginPath();
      ctx.strokeStyle = this._options.color;
      ctx.lineWidth = this._options.width * vr;
      ctx.moveTo(x0, yScaled);
      ctx.lineTo(w, yScaled);
      ctx.stroke();

      // Price label at right edge
      const label = this._price.toFixed(2);
      const fontSize = 11 * vr;
      ctx.font = `${fontSize}px system-ui, sans-serif`;
      const tw = ctx.measureText(label).width;
      const pad = 4 * hr;
      ctx.fillStyle = this._options.color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(w - tw - pad * 2, yScaled - fontSize * 0.8, tw + pad * 2, fontSize * 1.2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000000';
      ctx.fillText(label, w - tw - pad, yScaled + fontSize * 0.2);

      // Selected: square handle at the anchor point.
      if (this._selected) {
        const hc = selectedColor(this._options.color);
        const hs = HANDLE_HALF * hr;
        ctx.fillStyle = hc;
        ctx.strokeStyle = this._options.color;
        ctx.lineWidth = 1.5 * vr;
        ctx.beginPath();
        ctx.rect(x0 - hs, yScaled - hs, hs * 2, hs * 2);
        ctx.fill();
        ctx.stroke();
      }
    });
  }
}

class HorizontalRayPaneView implements ISeriesPrimitivePaneView {
  private _source: HorizontalRayDrawing;
  private _p0: PixelPoint | null = null;

  constructor(source: HorizontalRayDrawing) {
    this._source = source;
  }

  update(): void {
    const pt = this._source.points[0];
    this._p0 = pt ? this._source.toPixel(pt) : null;
  }

  renderer(): ISeriesPrimitivePaneRenderer {
    const pt = this._source.points[0];
    return new HorizontalRayPaneRenderer(
      this._p0,
      pt?.price ?? 0,
      this._source.options,
      this._source.selected,
    );
  }
}

export class HorizontalRayDrawing extends BaseDrawing {
  private _views: HorizontalRayPaneView[];

  constructor(points: DPoint[], options: DrawingOptions) {
    super(points, options);
    this._views = [new HorizontalRayPaneView(this)];
  }

  paneViews(): ISeriesPrimitivePaneView[] { return this._views; }
  protected _toolId(): ToolId { return 'horizontal_ray'; }

  hitTest(cx: number, cy: number): HitResult | null {
    const pt = this.points[0] ? this.toPixel(this.points[0]) : null;
    if (!pt) return null;
    // Anchor handle (only when selected)
    if (this.selected && Math.hypot(cx - pt.x, cy - pt.y) <= HIT_TOLERANCE) {
      return { isBody: false, handleIndex: 0 };
    }
    // Body: near the line's y AND to the right of the anchor only.
    if (Math.abs(cy - pt.y) <= HIT_TOLERANCE && cx >= pt.x - HIT_TOLERANCE) {
      return { isBody: true };
    }
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  RECTANGLE
// ─────────────────────────────────────────────────────────────────────────────

class RectanglePaneRenderer implements ISeriesPrimitivePaneRenderer {
  constructor(
    private _p0: PixelPoint | null,
    private _p1: PixelPoint | null,
    private _options: DrawingOptions,
    private _selected: boolean,
  ) {}

  draw(target: CanvasRenderingTarget2D): void {
    target.useBitmapCoordinateSpace(scope => {
      if (!this._p0 || !this._p1) return;
      const ctx = scope.context;
      const hr = scope.horizontalPixelRatio;
      const vr = scope.verticalPixelRatio;

      const x0 = Math.round(Math.min(this._p0.x, this._p1.x) * hr);
      const y0 = Math.round(Math.min(this._p0.y, this._p1.y) * vr);
      const x1 = Math.round(Math.max(this._p0.x, this._p1.x) * hr);
      const y1 = Math.round(Math.max(this._p0.y, this._p1.y) * vr);
      const rw = x1 - x0;
      const rh = y1 - y0;

      // Translucent fill
      ctx.fillStyle = hexToRgba(this._options.color, 0.12);
      ctx.fillRect(x0, y0, rw, rh);

      // Stroke
      ctx.strokeStyle = this._options.color;
      ctx.lineWidth = this._options.width * vr;
      ctx.strokeRect(x0, y0, rw, rh);

      if (this._selected) {
        const hc = selectedColor(this._options.color);
        const hs = HANDLE_HALF * hr;
        // 4 corner handles
        for (const [hx, hy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
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

class RectanglePaneView implements ISeriesPrimitivePaneView {
  private _source: RectangleDrawing;
  private _p0: PixelPoint | null = null;
  private _p1: PixelPoint | null = null;

  constructor(source: RectangleDrawing) {
    this._source = source;
  }

  update(): void {
    this._p0 = this._source.points[0] ? this._source.toPixel(this._source.points[0]) : null;
    this._p1 = this._source.points[1] ? this._source.toPixel(this._source.points[1]) : null;
  }

  renderer(): ISeriesPrimitivePaneRenderer {
    return new RectanglePaneRenderer(
      this._p0, this._p1,
      this._source.options,
      this._source.selected,
    );
  }
}

export class RectangleDrawing extends BaseDrawing {
  private _views: RectanglePaneView[];

  constructor(points: DPoint[], options: DrawingOptions) {
    super(points, options);
    this._views = [new RectanglePaneView(this)];
  }

  paneViews(): ISeriesPrimitivePaneView[] { return this._views; }
  protected _toolId(): ToolId { return 'rectangle'; }

  hitTest(cx: number, cy: number): HitResult | null {
    const p0 = this.points[0] ? this.toPixel(this.points[0]) : null;
    const p1 = this.points[1] ? this.toPixel(this.points[1]) : null;
    if (!p0 || !p1) return null;

    const minX = Math.min(p0.x, p1.x);
    const maxX = Math.max(p0.x, p1.x);
    const minY = Math.min(p0.y, p1.y);
    const maxY = Math.max(p0.y, p1.y);

    if (this.selected) {
      // 4 corner handles
      const corners: [number, number, number][] = [
        [minX, minY, 0], [maxX, minY, 1],
        [minX, maxY, 2], [maxX, maxY, 3],
      ];
      for (const [hx, hy, idx] of corners) {
        if (Math.hypot(cx - hx, cy - hy) <= HIT_TOLERANCE) {
          return { isBody: false, handleIndex: idx };
        }
      }
    }

    // Edge proximity (within HIT_TOLERANCE of any side)
    const nearLeft   = Math.abs(cx - minX) <= HIT_TOLERANCE && cy >= minY && cy <= maxY;
    const nearRight  = Math.abs(cx - maxX) <= HIT_TOLERANCE && cy >= minY && cy <= maxY;
    const nearTop    = Math.abs(cy - minY) <= HIT_TOLERANCE && cx >= minX && cx <= maxX;
    const nearBottom = Math.abs(cy - maxY) <= HIT_TOLERANCE && cx >= minX && cx <= maxX;
    if (nearLeft || nearRight || nearTop || nearBottom) return { isBody: true };

    return null;
  }
}
