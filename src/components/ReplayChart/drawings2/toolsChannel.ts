/**
 * drawings2/toolsChannel.ts
 *
 * Parallel channel — 3-anchor tool. p0/p1 define the baseline; p2 is an
 * offset sample. The offset is DERIVED from p2 (price-delta relative to the
 * baseline evaluated at p2's own time — see geometry.ts `channelOffset`), not
 * stored separately, so dragging the baseline endpoints (handles 0/1) leaves
 * p2 untouched and therefore automatically re-derives a (possibly different)
 * offset at render time. This is intentional — see hitTest/drag notes below.
 *
 * Render:
 *   - baseline segment p0→p1
 *   - parallel segment: same x-range as the baseline, shifted by the price
 *     offset at each end
 *   - translucent fill between the two lines
 *   - optional thin dashed midline at half the offset
 *
 * Preview: the generalized controller flow constructs this with
 * [p0, p1, cursor] after 2 clicks — but during the 2-click phase (before the
 * 3rd anchor exists) the preview drawing is created with only 2 points
 * ([p0, p1]) by `_attachPreview`/`_onCrosshairMove`. This class must render
 * sensibly with p2 missing (falls back to p1 → zero offset) or with p2 ==
 * p1 depending on how the controller seeds the preview — guard all array
 * access accordingly.
 */

import { CanvasRenderingTarget2D } from 'fancy-canvas';
import {
  ISeriesPrimitivePaneRenderer,
  ISeriesPrimitivePaneView,
} from 'lightweight-charts';
import { BaseDrawing, DPoint, DrawingOptions, HitResult, PixelPoint, ToolId } from './base';
import { channelOffset } from './geometry';
import { hexToRgba } from './tools';

const HANDLE_HALF = 5;   // px (CSS space) half-side of the square handle
const HIT_TOLERANCE = 6; // px (CSS space)

/** Hex color brightened for selected state — mirrors tools.ts selectedColor(). */
function selectedColor(_color: string): string {
  return '#ffffff';
}

// ─────────────────────────────────────────────────────────────────────────────
//  PARALLEL CHANNEL
// ─────────────────────────────────────────────────────────────────────────────

class ChannelPaneRenderer implements ISeriesPrimitivePaneRenderer {
  constructor(
    private _p0: PixelPoint | null,
    private _p1: PixelPoint | null,
    /** Parallel-line endpoints, already offset — same x as p0/p1. */
    private _p0Shifted: PixelPoint | null,
    private _p1Shifted: PixelPoint | null,
    private _options: DrawingOptions,
    private _selected: boolean,
  ) {}

  draw(target: CanvasRenderingTarget2D): void {
    target.useBitmapCoordinateSpace(scope => {
      if (!this._p0 || !this._p1) return;
      const ctx = scope.context;
      const hr = scope.horizontalPixelRatio;
      const vr = scope.verticalPixelRatio;

      const x0 = this._p0.x * hr;
      const y0 = this._p0.y * vr;
      const x1 = this._p1.x * hr;
      const y1 = this._p1.y * vr;

      // Baseline.
      ctx.beginPath();
      ctx.strokeStyle = this._options.color;
      ctx.lineWidth = this._options.width * vr;
      ctx.moveTo(Math.round(x0), Math.round(y0));
      ctx.lineTo(Math.round(x1), Math.round(y1));
      ctx.stroke();

      const hasParallel = this._p0Shifted && this._p1Shifted;

      if (hasParallel) {
        const sx0 = this._p0Shifted!.x * hr;
        const sy0 = this._p0Shifted!.y * vr;
        const sx1 = this._p1Shifted!.x * hr;
        const sy1 = this._p1Shifted!.y * vr;

        // Translucent fill between baseline and parallel line.
        ctx.fillStyle = hexToRgba(this._options.color, 0.08);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(sx1, sy1);
        ctx.lineTo(sx0, sy0);
        ctx.closePath();
        ctx.fill();

        // Parallel line.
        ctx.beginPath();
        ctx.strokeStyle = this._options.color;
        ctx.lineWidth = this._options.width * vr;
        ctx.moveTo(Math.round(sx0), Math.round(sy0));
        ctx.lineTo(Math.round(sx1), Math.round(sy1));
        ctx.stroke();

        // Thin dashed midline at half the offset.
        ctx.save();
        ctx.setLineDash([4 * hr, 3 * hr]);
        ctx.beginPath();
        ctx.strokeStyle = this._options.color;
        ctx.lineWidth = 1 * vr;
        ctx.moveTo(Math.round((x0 + sx0) / 2), Math.round((y0 + sy0) / 2));
        ctx.lineTo(Math.round((x1 + sx1) / 2), Math.round((y1 + sy1) / 2));
        ctx.stroke();
        ctx.restore();
      }

      if (this._selected) {
        const hc = selectedColor(this._options.color);
        const hs = HANDLE_HALF * hr;
        const handles: [number, number][] = [
          [Math.round(x0), Math.round(y0)],
          [Math.round(x1), Math.round(y1)],
        ];
        if (hasParallel) {
          // Handle 2 = midpoint of the parallel line.
          const midX = Math.round((this._p0Shifted!.x * hr + this._p1Shifted!.x * hr) / 2);
          const midY = Math.round((this._p0Shifted!.y * vr + this._p1Shifted!.y * vr) / 2);
          handles.push([midX, midY]);
        }
        for (const [hx, hy] of handles) {
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

class ChannelPaneView implements ISeriesPrimitivePaneView {
  private _source: ParallelChannelDrawing;
  private _p0: PixelPoint | null = null;
  private _p1: PixelPoint | null = null;
  private _p0Shifted: PixelPoint | null = null;
  private _p1Shifted: PixelPoint | null = null;

  constructor(source: ParallelChannelDrawing) {
    this._source = source;
  }

  update(): void {
    const pt0 = this._source.points[0];
    const pt1 = this._source.points[1];
    const pt2 = this._source.points[2];

    this._p0 = pt0 ? this._source.toPixel(pt0) : null;
    this._p1 = pt1 ? this._source.toPixel(pt1) : null;
    this._p0Shifted = null;
    this._p1Shifted = null;

    if (!pt0 || !pt1 || !pt2) return;

    const offset = this._source.offset();
    if (offset == null) return;

    const y0Shifted = this._source.priceToCoordinate(pt0.price + offset);
    const y1Shifted = this._source.priceToCoordinate(pt1.price + offset);
    if (y0Shifted == null || y1Shifted == null || !this._p0 || !this._p1) return;

    this._p0Shifted = { x: this._p0.x, y: y0Shifted };
    this._p1Shifted = { x: this._p1.x, y: y1Shifted };
  }

  renderer(): ISeriesPrimitivePaneRenderer {
    return new ChannelPaneRenderer(
      this._p0, this._p1,
      this._p0Shifted, this._p1Shifted,
      this._source.options,
      this._source.selected,
    );
  }
}

export class ParallelChannelDrawing extends BaseDrawing {
  private _views: ChannelPaneView[];

  constructor(points: DPoint[], options: DrawingOptions) {
    super(points, options);
    this._views = [new ChannelPaneView(this)];
  }

  paneViews(): ISeriesPrimitivePaneView[] { return this._views; }
  protected _toolId(): ToolId { return 'parallel_channel'; }

  /**
   * Price offset of p2 relative to the baseline, or null if fewer than 3
   * points are available yet (2-point preview phase — guard array access).
   */
  offset(): number | null {
    const [p0, p1, p2] = this.points;
    if (!p0 || !p1 || !p2) return null;
    return channelOffset(
      { time: Number(p0.time), price: p0.price },
      { time: Number(p1.time), price: p1.price },
      { time: Number(p2.time), price: p2.price },
    );
  }

  hitTest(cx: number, cy: number): HitResult | null {
    const p0 = this.points[0] ? this.toPixel(this.points[0]) : null;
    const p1 = this.points[1] ? this.toPixel(this.points[1]) : null;
    if (!p0 || !p1) return null;

    const offset = this.offset();
    let p0Shifted: PixelPoint | null = null;
    let p1Shifted: PixelPoint | null = null;
    if (offset != null) {
      const y0s = this.priceToCoordinate(this.points[0].price + offset);
      const y1s = this.priceToCoordinate(this.points[1].price + offset);
      if (y0s != null) p0Shifted = { x: p0.x, y: y0s };
      if (y1s != null) p1Shifted = { x: p1.x, y: y1s };
    }

    // Handles first (only when selected): handle0=p0, handle1=p1,
    // handle2=midpoint of the parallel line.
    if (this.selected) {
      if (Math.hypot(cx - p0.x, cy - p0.y) <= HIT_TOLERANCE) return { isBody: false, handleIndex: 0 };
      if (Math.hypot(cx - p1.x, cy - p1.y) <= HIT_TOLERANCE) return { isBody: false, handleIndex: 1 };
      if (p0Shifted && p1Shifted) {
        const midX = (p0Shifted.x + p1Shifted.x) / 2;
        const midY = (p0Shifted.y + p1Shifted.y) / 2;
        if (Math.hypot(cx - midX, cy - midY) <= HIT_TOLERANCE) return { isBody: false, handleIndex: 2 };
      }
    }

    // Body: distance to either line segment.
    if (BaseDrawing._distToSegment(cx, cy, p0.x, p0.y, p1.x, p1.y) <= HIT_TOLERANCE) {
      return { isBody: true };
    }
    if (p0Shifted && p1Shifted &&
      BaseDrawing._distToSegment(cx, cy, p0Shifted.x, p0Shifted.y, p1Shifted.x, p1Shifted.y) <= HIT_TOLERANCE
    ) {
      return { isBody: true };
    }
    return null;
  }
}
