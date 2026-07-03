/**
 * drawings2/toolsVertical.ts
 *
 * Vertical line — 1-anchor tool. Renders a full pane-height line at the
 * anchor's x-coordinate. Follows the HorizontalLineDrawing pattern in
 * tools.ts exactly (PaneView/PaneRenderer, bitmap-space drawing with
 * pixelRatio handling, serialize/_toolId).
 */

import { CanvasRenderingTarget2D } from 'fancy-canvas';
import {
  ISeriesPrimitivePaneRenderer,
  ISeriesPrimitivePaneView,
} from 'lightweight-charts';
import { BaseDrawing, DrawingOptions, HitResult, PixelPoint, ToolId } from './base';

const HANDLE_HALF = 5;   // px (CSS space) half-side of the square handle
const HIT_TOLERANCE = 6; // px (CSS space)

/** Hex color brightened for selected state — mirrors tools.ts selectedColor(). */
function selectedColor(_color: string): string {
  return '#ffffff';
}

// ─────────────────────────────────────────────────────────────────────────────
//  VERTICAL LINE  (1-click: full pane-height line at the anchor's x)
// ─────────────────────────────────────────────────────────────────────────────

class VerticalLinePaneRenderer implements ISeriesPrimitivePaneRenderer {
  constructor(
    private _p0: PixelPoint | null,
    private _options: DrawingOptions,
    private _selected: boolean,
  ) {}

  draw(target: CanvasRenderingTarget2D): void {
    target.useBitmapCoordinateSpace(scope => {
      if (!this._p0) return;
      const ctx = scope.context;
      const hr = scope.horizontalPixelRatio;
      const vr = scope.verticalPixelRatio;
      const xScaled = Math.round(this._p0.x * hr);
      const h = scope.bitmapSize.height;

      ctx.beginPath();
      ctx.strokeStyle = this._options.color;
      ctx.lineWidth = this._options.width * vr;
      ctx.moveTo(xScaled, 0);
      ctx.lineTo(xScaled, h);
      ctx.stroke();

      if (this._selected) {
        const hc = selectedColor(this._options.color);
        const hs = HANDLE_HALF * hr;
        const hy = Math.round(this._p0.y * vr);
        ctx.fillStyle = hc;
        ctx.strokeStyle = this._options.color;
        ctx.lineWidth = 1.5 * vr;
        ctx.beginPath();
        ctx.rect(xScaled - hs, hy - hs, hs * 2, hs * 2);
        ctx.fill();
        ctx.stroke();
      }
    });
  }
}

class VerticalLinePaneView implements ISeriesPrimitivePaneView {
  private _source: VerticalLineDrawing;
  private _p0: PixelPoint | null = null;

  constructor(source: VerticalLineDrawing) {
    this._source = source;
  }

  update(): void {
    const pt = this._source.points[0];
    this._p0 = pt ? this._source.toPixel(pt) : null;
  }

  renderer(): ISeriesPrimitivePaneRenderer {
    return new VerticalLinePaneRenderer(
      this._p0,
      this._source.options,
      this._source.selected,
    );
  }
}

export class VerticalLineDrawing extends BaseDrawing {
  private _views: VerticalLinePaneView[];

  constructor(points: import('./base').DPoint[], options: DrawingOptions) {
    super(points, options);
    this._views = [new VerticalLinePaneView(this)];
  }

  paneViews(): ISeriesPrimitivePaneView[] { return this._views; }
  protected _toolId(): ToolId { return 'vertical'; }

  hitTest(cx: number, cy: number): HitResult | null {
    const pt = this.points[0] ? this.toPixel(this.points[0]) : null;
    if (!pt) return null;
    // Anchor handle (only when selected) — placed at (x, anchor's own y).
    if (this.selected && Math.hypot(cx - pt.x, cy - pt.y) <= HIT_TOLERANCE) {
      return { isBody: false, handleIndex: 0 };
    }
    // Body: near the line's x, spanning the whole pane height.
    if (Math.abs(cx - pt.x) <= HIT_TOLERANCE) return { isBody: true };
    return null;
  }
}
