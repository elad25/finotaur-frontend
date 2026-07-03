/**
 * drawings2/toolsText.ts
 *
 * Text label — 1-anchor tool. Renders a small rounded "pill" background
 * (drawing color at low alpha) with the drawing color as solid text, anchored
 * at its left-center. Text content itself is edited via a DOM popover wired
 * up in BacktestReplayChart.tsx + DrawingController.onTextEditRequest — this
 * file only owns rendering + hit-testing + drag-translate.
 *
 * hitTest note: canvas draw() only runs inside `useBitmapCoordinateSpace`, so
 * there is no ctx available at hitTest time. We cache the last-rendered
 * bounding box (in CSS space, converted back from bitmap space via the pixel
 * ratios) on the instance during render, and hitTest reads that cache.
 */

import { CanvasRenderingTarget2D } from 'fancy-canvas';
import {
  ISeriesPrimitivePaneRenderer,
  ISeriesPrimitivePaneView,
} from 'lightweight-charts';
import { BaseDrawing, DPoint, DrawingOptions, HitResult, PixelPoint, ToolId } from './base';
import { hexToRgba } from './tools';

const HANDLE_HALF = 5;   // px (CSS space) half-side of the square handle
const HIT_TOLERANCE = 6; // px (CSS space)
const FONT_SIZE_CSS = 12; // px (CSS space), scaled by pixelRatio in bitmap space
const PILL_PAD_X_CSS = 8; // px (CSS space) horizontal padding inside the pill
const PILL_PAD_Y_CSS = 5; // px (CSS space) vertical padding inside the pill

/** Hex color brightened for selected state — mirrors tools.ts selectedColor(). */
function selectedColor(_color: string): string {
  return '#ffffff';
}

/** Cached CSS-space bounding box of the last render, used by hitTest. */
interface CssBBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  TEXT LABEL
// ─────────────────────────────────────────────────────────────────────────────

class TextPaneRenderer implements ISeriesPrimitivePaneRenderer {
  constructor(
    private _p0: PixelPoint | null,
    private _text: string,
    private _options: DrawingOptions,
    private _selected: boolean,
    /** Callback so the renderer can report the CSS-space bbox it drew back
     *  to the owning drawing instance (cached for hitTest — see file header). */
    private _onBBox: (bbox: CssBBox | null) => void,
  ) {}

  draw(target: CanvasRenderingTarget2D): void {
    target.useBitmapCoordinateSpace(scope => {
      if (!this._p0 || !this._text) {
        this._onBBox(null);
        return;
      }
      const ctx = scope.context;
      const hr = scope.horizontalPixelRatio;
      const vr = scope.verticalPixelRatio;

      const fontSize = FONT_SIZE_CSS * vr;
      ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
      const textWidth = ctx.measureText(this._text).width;

      const padX = PILL_PAD_X_CSS * hr;
      const padY = PILL_PAD_Y_CSS * vr;
      const pillHeight = fontSize + padY * 2;
      const pillWidth = textWidth + padX * 2;

      // Anchor = left-center of the pill.
      const x0 = this._p0.x * hr;
      const y0 = this._p0.y * vr;
      const pillLeft = x0;
      const pillTop = y0 - pillHeight / 2;

      ctx.fillStyle = hexToRgba(this._options.color, 0.15);
      const radius = Math.min(6 * hr, pillHeight / 2);
      ctx.beginPath();
      // Simple rounded rect (no roundRect dependency — keep browser support wide).
      ctx.moveTo(pillLeft + radius, pillTop);
      ctx.lineTo(pillLeft + pillWidth - radius, pillTop);
      ctx.arcTo(pillLeft + pillWidth, pillTop, pillLeft + pillWidth, pillTop + radius, radius);
      ctx.lineTo(pillLeft + pillWidth, pillTop + pillHeight - radius);
      ctx.arcTo(pillLeft + pillWidth, pillTop + pillHeight, pillLeft + pillWidth - radius, pillTop + pillHeight, radius);
      ctx.lineTo(pillLeft + radius, pillTop + pillHeight);
      ctx.arcTo(pillLeft, pillTop + pillHeight, pillLeft, pillTop + pillHeight - radius, radius);
      ctx.lineTo(pillLeft, pillTop + radius);
      ctx.arcTo(pillLeft, pillTop, pillLeft + radius, pillTop, radius);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = this._options.color;
      ctx.textBaseline = 'middle';
      ctx.fillText(this._text, pillLeft + padX, y0);

      if (this._selected) {
        const hc = selectedColor(this._options.color);
        ctx.strokeStyle = hc;
        ctx.lineWidth = 1 * vr;
        ctx.strokeRect(pillLeft, pillTop, pillWidth, pillHeight);

        // Single handle at the anchor (left-center).
        const hs = HANDLE_HALF * hr;
        ctx.fillStyle = hc;
        ctx.strokeStyle = this._options.color;
        ctx.lineWidth = 1.5 * vr;
        ctx.beginPath();
        ctx.rect(x0 - hs, y0 - hs, hs * 2, hs * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Report the bbox back in CSS space (divide bitmap coords by pixelRatio)
      // for hitTest, which has no canvas ctx to measure text with.
      this._onBBox({
        left: pillLeft / hr,
        top: pillTop / vr,
        right: (pillLeft + pillWidth) / hr,
        bottom: (pillTop + pillHeight) / vr,
      });
    });
  }
}

class TextPaneView implements ISeriesPrimitivePaneView {
  private _source: TextDrawing;
  private _p0: PixelPoint | null = null;

  constructor(source: TextDrawing) {
    this._source = source;
  }

  update(): void {
    const pt = this._source.points[0];
    this._p0 = pt ? this._source.toPixel(pt) : null;
  }

  renderer(): ISeriesPrimitivePaneRenderer {
    return new TextPaneRenderer(
      this._p0,
      this._source.options.text ?? '',
      this._source.options,
      this._source.selected,
      (bbox) => { this._source._lastBBox = bbox; },
    );
  }
}

export class TextDrawing extends BaseDrawing {
  private _views: TextPaneView[];

  /** Cached CSS-space bbox from the last render — see file header note. */
  _lastBBox: CssBBox | null = null;

  constructor(points: DPoint[], options: DrawingOptions) {
    super(points, options);
    this._views = [new TextPaneView(this)];
  }

  paneViews(): ISeriesPrimitivePaneView[] { return this._views; }
  protected _toolId(): ToolId { return 'text'; }

  serialize() {
    const base = super.serialize();
    return {
      ...base,
      options: { ...base.options, text: base.options.text ?? '' },
    };
  }

  hitTest(cx: number, cy: number): HitResult | null {
    const pt = this.points[0] ? this.toPixel(this.points[0]) : null;
    if (!pt) return null;

    // Anchor handle (only when selected).
    if (this.selected && Math.hypot(cx - pt.x, cy - pt.y) <= HIT_TOLERANCE) {
      return { isBody: false, handleIndex: 0 };
    }

    // Body: point-in-bbox against the cached last-rendered bbox.
    const bbox = this._lastBBox;
    if (!bbox) return null;
    if (
      cx >= bbox.left - HIT_TOLERANCE / 2 &&
      cx <= bbox.right + HIT_TOLERANCE / 2 &&
      cy >= bbox.top - HIT_TOLERANCE / 2 &&
      cy <= bbox.bottom + HIT_TOLERANCE / 2
    ) {
      return { isBody: true };
    }
    return null;
  }
}
