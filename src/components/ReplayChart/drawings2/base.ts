/**
 * drawings2/base.ts
 *
 * Shared types and base class for the clean per-primitive drawing system.
 * Mirrors the pattern from the official TradingView examples (trend.ts / rect.ts / base.ts).
 */

import {
  IChartApi,
  ISeriesApi,
  ISeriesPrimitivePaneView,
  SeriesAttachedParameter,
  Time,
} from 'lightweight-charts';

// ─── Data types ──────────────────────────────────────────────────────────────

/**
 * A chart data-point.
 * `logical` is the bar-index x-coordinate — whitespace-safe and stable on
 * pan/zoom. We capture it at creation from `timeScale.coordinateToLogical`.
 */
export interface DPoint {
  time: Time;
  price: number;
  /** Bar-index coordinate.  Populate from timeScale.coordinateToLogical at creation. */
  logical?: number;
}

export interface DrawingOptions {
  color: string;
  width: number;
}

export type ToolId = 'cursor' | 'trendline' | 'horizontal' | 'horizontal_ray' | 'rectangle';

// ─── Hit test result ─────────────────────────────────────────────────────────

export interface HitResult {
  /** true = body of drawing; false = anchor handle */
  isBody: boolean;
  /** Index into `points[]` when isBody=false (i.e. which handle was hit). */
  handleIndex?: number;
}

// ─── Pixel helper ────────────────────────────────────────────────────────────

export interface PixelPoint {
  x: number;
  y: number;
}

// ─── Serialized form ─────────────────────────────────────────────────────────

export interface SerializedDrawing {
  tool: ToolId;
  points: DPoint[];
  options: DrawingOptions;
}

// ─── Abstract base ───────────────────────────────────────────────────────────

/**
 * BaseDrawing — every drawing (TrendLine, HorizontalLine, Rectangle) extends this.
 *
 * Lifecycle:
 *   series.attachPrimitive(drawing) → attached() is called by lightweight-charts.
 *   series.detachPrimitive(drawing) → detached() is called.
 *
 * The library calls updateAllViews() before each repaint, which triggers the
 * pane-view's update() to recompute pixel coordinates from the current zoom/pan.
 */
export abstract class BaseDrawing {
  // Set by attached() / cleared by detached().
  protected _chart?: IChartApi;
  protected _series?: ISeriesApi<'Candlestick'>;
  protected _requestUpdate?: () => void;

  points: DPoint[];
  options: DrawingOptions;
  selected: boolean = false;

  constructor(points: DPoint[], options: DrawingOptions) {
    this.points = points;
    this.options = options;
  }

  // ── ISeriesPrimitive lifecycle ────────────────────────────────────────────

  attached(p: SeriesAttachedParameter<Time>): void {
    this._chart = p.chart as IChartApi;
    this._series = p.series as unknown as ISeriesApi<'Candlestick'>;
    this._requestUpdate = p.requestUpdate;
    p.requestUpdate();
  }

  detached(): void {
    this._chart = undefined;
    this._series = undefined;
    this._requestUpdate = undefined;
  }

  requestUpdate(): void {
    this._requestUpdate?.();
  }

  // ── updateAllViews — called by lightweight-charts before each repaint ─────

  updateAllViews(): void {
    for (const v of this.paneViews()) {
      (v as { update?: () => void }).update?.();
    }
  }

  // ── Abstract: subclasses return their pane views ──────────────────────────

  abstract paneViews(): ISeriesPrimitivePaneView[];

  // ── Pixel-coordinate helper ───────────────────────────────────────────────

  /**
   * Convert a DPoint to canvas pixel coordinates.
   * Uses `logical` when available (whitespace-safe), otherwise `time`.
   * Returns null if either coordinate is unavailable.
   */
  toPixel(pt: DPoint): PixelPoint | null {
    if (!this._chart || !this._series) return null;
    const ts = this._chart.timeScale();
    const rawX = pt.logical != null
      ? ts.logicalToCoordinate(pt.logical as any)
      : ts.timeToCoordinate(pt.time);
    const rawY = this._series.priceToCoordinate(pt.price);
    if (rawX == null || rawY == null) return null;
    return { x: rawX as number, y: rawY as number };
  }

  // ── Hit testing ───────────────────────────────────────────────────────────

  /**
   * Returns a HitResult if (cx, cy) is within ~6 px of this drawing or its
   * selected anchor handles; returns null otherwise.
   *
   * Subclasses override to provide geometry-specific hit testing.
   */
  hitTest(_cx: number, _cy: number): HitResult | null {
    return null;
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  serialize(): SerializedDrawing {
    return {
      tool: this._toolId(),
      points: this.points,
      options: this.options,
    };
  }

  protected abstract _toolId(): ToolId;

  // ── Geometry helpers ─────────────────────────────────────────────────────

  /** Distance from point (px, py) to line segment (ax,ay)→(bx,by). */
  protected static _distToSegment(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number,
  ): number {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
}
