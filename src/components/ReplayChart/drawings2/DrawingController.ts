/**
 * drawings2/DrawingController.ts
 *
 * The orchestrator for the new per-primitive drawing system.
 * Models on RectangleDrawingTool from the official rect.ts reference but
 * generalised across all three tools (cursor / trendline / horizontal / rectangle).
 *
 * Responsibilities:
 *   - Wires click + crosshair subscribers for draw mode
 *   - Handles preview primitive while drawing a 2-pt shape
 *   - In cursor mode: hit-tests on click to select drawings; drag anchors to move
 *   - Persists to localStorage keyed by symbol
 *   - Calls onChange() whenever the drawing set mutates
 */

import {
  IChartApi,
  ISeriesApi,
  MouseEventParams,
  Time,
} from 'lightweight-charts';
import {
  BaseDrawing,
  DPoint,
  DrawingOptions,
  HitResult,
  SerializedDrawing,
  ToolId,
} from './base';
import {
  TrendLineDrawing,
  HorizontalLineDrawing,
  HorizontalRayDrawing,
  RectangleDrawing,
} from './tools';

// ─── Options ─────────────────────────────────────────────────────────────────

export interface DrawingControllerOptions {
  symbol: string;
  onChange?: () => void;
  onSelectionChange?: (hasSelection: boolean) => void;
}

// ─── Persistence key ─────────────────────────────────────────────────────────

function storageKey(symbol: string): string {
  return `finotaur_drawings2_${symbol}`;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

function createDrawing(
  tool: ToolId,
  points: DPoint[],
  options: DrawingOptions,
): BaseDrawing | null {
  switch (tool) {
    case 'trendline':      return new TrendLineDrawing(points, options);
    case 'horizontal':     return new HorizontalLineDrawing(points, options);
    case 'horizontal_ray': return new HorizontalRayDrawing(points, options);
    case 'rectangle':      return new RectangleDrawing(points, options);
    default:               return null;
  }
}

// ─── Controller ──────────────────────────────────────────────────────────────

export class DrawingController {
  private _chart: IChartApi;
  private _series: ISeriesApi<'Candlestick'>;
  private _symbol: string;
  private _onChange?: () => void;
  private _onSelectionChange?: (hasSelection: boolean) => void;

  private _activeTool: ToolId = 'cursor';
  private _drawings: BaseDrawing[] = [];
  private _selected: BaseDrawing | null = null;

  // Drawing-in-progress
  private _pendingPoints: DPoint[] = [];
  private _preview: BaseDrawing | null = null;

  // Drag state (cursor mode anchor drag)
  private _dragging: boolean = false;
  private _dragDrawing: BaseDrawing | null = null;
  private _dragHandleIndex: number = -1;
  // Whether the drag was on a body (move all points) vs. single handle
  private _dragBody: boolean = false;
  private _dragLastX: number = 0;
  private _dragLastY: number = 0;

  // Drawing options for new drawings
  private _options: DrawingOptions = { color: '#C9A646', width: 2 };

  // Bound handlers stored for unsubscription
  private _clickHandler: (p: MouseEventParams) => void;
  private _moveHandler: (p: MouseEventParams) => void;
  private _mousedownHandler: (e: MouseEvent) => void;
  private _mousemoveHandler: (e: MouseEvent) => void;
  private _mouseupHandler: (e: MouseEvent) => void;

  constructor(
    chart: IChartApi,
    series: ISeriesApi<'Candlestick'>,
    opts: DrawingControllerOptions,
  ) {
    this._chart = chart;
    this._series = series;
    this._symbol = opts.symbol;
    this._onChange = opts.onChange;
    this._onSelectionChange = opts.onSelectionChange;

    this._clickHandler = (p) => this._onClick(p);
    this._moveHandler  = (p) => this._onCrosshairMove(p);

    const container = chart.chartElement() as HTMLElement;

    this._mousedownHandler = (e: MouseEvent) => this._onMousedown(e, container);
    this._mousemoveHandler = (e: MouseEvent) => this._onMousemove(e);
    this._mouseupHandler   = () => this._onMouseup();

    chart.subscribeClick(this._clickHandler);
    chart.subscribeCrosshairMove(this._moveHandler);

    container.addEventListener('mousedown', this._mousedownHandler);
    window.addEventListener('mousemove', this._mousemoveHandler);
    window.addEventListener('mouseup', this._mouseupHandler);

    this._loadFromStorage();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  setActiveTool(tool: ToolId): void {
    if (this._activeTool === tool) return;
    this._cancelPreview();
    this._activeTool = tool;
    if (tool === 'cursor') {
      // Keep selection when switching to cursor
    } else {
      // Deselect when picking a draw tool
      this._deselectAll();
    }
  }

  getActiveTool(): ToolId {
    return this._activeTool;
  }

  setOptions(o: Partial<DrawingOptions>): void {
    this._options = { ...this._options, ...o };
    // Apply to selected drawing immediately
    if (this._selected) {
      this._selected.options = { ...this._selected.options, ...o };
      this._selected.requestUpdate();
    }
  }

  deleteSelected(): void {
    if (!this._selected) return;
    this._detach(this._selected);
    this._drawings = this._drawings.filter(d => d !== this._selected);
    this._selected = null;
    this._saveToStorage();
    this._onChange?.();
  }

  clearAll(): void {
    for (const d of this._drawings) this._detach(d);
    this._drawings = [];
    this._selected = null;
    this._cancelPreview();
    this._saveToStorage();
    this._onChange?.();
  }

  destroy(): void {
    this._cancelPreview();
    for (const d of this._drawings) this._detach(d);
    this._drawings = [];
    this._selected = null;

    this._chart.unsubscribeClick(this._clickHandler);
    this._chart.unsubscribeCrosshairMove(this._moveHandler);

    try {
      const container = this._chart.chartElement() as HTMLElement;
      container.removeEventListener('mousedown', this._mousedownHandler);
    } catch { /* chart may already be removed */ }
    window.removeEventListener('mousemove', this._mousemoveHandler);
    window.removeEventListener('mouseup', this._mouseupHandler);
  }

  // ── Coordinate conversion ─────────────────────────────────────────────────

  /**
   * Convert a pixel point (from param.point or MouseEvent) to a DPoint.
   * Uses logical (bar-index) x so clicks in whitespace right of last bar work.
   */
  private _toDPoint(px: number, py: number): DPoint | null {
    const ts = this._chart.timeScale();
    const price = (this._series as unknown as ISeriesApi<'Candlestick'>).coordinateToPrice(py as any);
    if (price == null) return null;
    const logical = ts.coordinateToLogical(px as any);
    const timeAt = ts.coordinateToTime(px as any) as Time | null;
    return {
      time: timeAt ?? (0 as Time),
      price: Number(price),
      logical: logical != null ? Number(logical) : undefined,
    };
  }

  // ── Click handler ─────────────────────────────────────────────────────────

  private _onClick(param: MouseEventParams): void {
    if (!param.point) return;
    const { x, y } = param.point;

    if (this._activeTool === 'cursor') {
      this._handleCursorClick(x, y);
      return;
    }

    // Draw mode
    this._handleDrawClick(x, y);
  }

  private _handleCursorClick(x: number, y: number): void {
    // Hit-test all drawings; select the first hit
    for (const d of [...this._drawings].reverse()) {
      const hit = d.hitTest(x, y);
      if (hit) {
        this._selectOnly(d);
        return;
      }
    }
    // Clicked empty space → deselect
    this._deselectAll();
  }

  private _handleDrawClick(x: number, y: number): void {
    const tool = this._activeTool;
    if (tool === 'cursor') return;

    const dp = this._toDPoint(x, y);
    if (!dp) return;

    // Single-point tools (horizontal line / horizontal ray) → finalize immediately
    if (tool === 'horizontal' || tool === 'horizontal_ray') {
      this._finalize(tool, [dp]);
      return;
    }

    // Trend line / Rectangle: 2 points
    this._pendingPoints.push(dp);

    if (this._pendingPoints.length === 1) {
      // First click: attach preview
      this._attachPreview(tool, dp);
    } else if (this._pendingPoints.length >= 2) {
      // Second click: finalize
      this._cancelPreview();
      this._finalize(tool, this._pendingPoints.slice(0, 2));
      this._pendingPoints = [];
      this._activeTool = 'cursor';
    }
  }

  // ── Crosshair move ────────────────────────────────────────────────────────

  private _onCrosshairMove(param: MouseEventParams): void {
    if (this._activeTool === 'cursor') return;
    if (!param.point) return;
    if (this._pendingPoints.length === 0) return;
    if (!this._preview) return;

    const dp = this._toDPoint(param.point.x, param.point.y);
    if (!dp) return;

    // Update preview's second point
    if (this._preview.points.length >= 2) {
      this._preview.points[1] = dp;
    } else {
      this._preview.points = [this._pendingPoints[0], dp];
    }
    this._preview.requestUpdate();
  }

  // ── DOM drag (anchor drag in cursor mode) ─────────────────────────────────

  private _onMousedown(e: MouseEvent, container: HTMLElement): void {
    if (e.button !== 0) return;
    if (this._activeTool !== 'cursor') return;
    if (!this._selected) return;

    const rect = container.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const hit = this._selected.hitTest(cx, cy);
    if (!hit) return;

    this._dragging = true;
    this._dragDrawing = this._selected;
    this._dragBody = hit.isBody;
    this._dragHandleIndex = hit.handleIndex ?? -1;
    this._dragLastX = cx;
    this._dragLastY = cy;

    e.stopPropagation(); // Prevent chart pan
  }

  private _onMousemove(e: MouseEvent): void {
    if (!this._dragging || !this._dragDrawing) return;

    const container = this._chart.chartElement() as HTMLElement;
    const rect = container.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const dx = cx - this._dragLastX;
    const dy = cy - this._dragLastY;
    this._dragLastX = cx;
    this._dragLastY = cy;

    // Move in price/logical space by computing delta
    const ts = this._chart.timeScale();

    if (this._dragBody) {
      // Translate all points
      for (let i = 0; i < this._dragDrawing.points.length; i++) {
        const pt = this._dragDrawing.points[i];
        const pix = this._dragDrawing.toPixel(pt);
        if (!pix) continue;
        const newDp = this._toDPoint(pix.x + dx, pix.y + dy);
        if (newDp) this._dragDrawing.points[i] = newDp;
      }
    } else {
      // Move single anchor
      const idx = this._dragHandleIndex;
      if (idx >= 0 && idx < this._dragDrawing.points.length) {
        const pt = this._dragDrawing.points[idx];
        const pix = this._dragDrawing.toPixel(pt);
        if (pix) {
          const newDp = this._toDPoint(pix.x + dx, pix.y + dy);
          if (newDp) this._dragDrawing.points[idx] = newDp;
        }
      }
    }

    this._dragDrawing.requestUpdate();
    e.preventDefault();
  }

  private _onMouseup(): void {
    if (!this._dragging) return;
    this._dragging = false;
    this._dragDrawing = null;
    this._saveToStorage();
    this._onChange?.();
  }

  // ── Preview management ────────────────────────────────────────────────────

  private _attachPreview(tool: ToolId, firstPoint: DPoint): void {
    this._cancelPreview();
    const preview = createDrawing(tool, [firstPoint, firstPoint], {
      ...this._options,
      color: this._options.color + 'aa', // slightly transparent
    });
    if (!preview) return;
    this._preview = preview;
    this._series.attachPrimitive(preview as any);
  }

  private _cancelPreview(): void {
    if (this._preview) {
      try { this._series.detachPrimitive(this._preview as any); } catch { /* ok */ }
      this._preview = null;
    }
    this._pendingPoints = [];
  }

  // ── Finalize drawing ──────────────────────────────────────────────────────

  private _finalize(tool: ToolId, points: DPoint[]): void {
    const drawing = createDrawing(tool, [...points], { ...this._options });
    if (!drawing) return;
    this._series.attachPrimitive(drawing as any);
    this._drawings.push(drawing);
    this._saveToStorage();
    this._onChange?.();
  }

  // ── Selection helpers ─────────────────────────────────────────────────────

  private _selectOnly(d: BaseDrawing): void {
    for (const other of this._drawings) {
      if (other !== d && other.selected) {
        other.selected = false;
        other.requestUpdate();
      }
    }
    if (!d.selected) {
      d.selected = true;
      d.requestUpdate();
    }
    this._selected = d;
    this._onSelectionChange?.(true);
  }

  private _deselectAll(): void {
    for (const d of this._drawings) {
      if (d.selected) {
        d.selected = false;
        d.requestUpdate();
      }
    }
    this._selected = null;
    this._onSelectionChange?.(false);
  }

  // ── Detach helper ─────────────────────────────────────────────────────────

  private _detach(d: BaseDrawing): void {
    try { this._series.detachPrimitive(d as any); } catch { /* ok */ }
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  private _saveToStorage(): void {
    try {
      const data: SerializedDrawing[] = this._drawings.map(d => d.serialize());
      localStorage.setItem(storageKey(this._symbol), JSON.stringify(data));
    } catch { /* storage full or unavailable */ }
  }

  private _loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(storageKey(this._symbol));
      if (!raw) return;
      const data: SerializedDrawing[] = JSON.parse(raw);
      for (const item of data) {
        const d = createDrawing(item.tool, item.points, item.options);
        if (!d) continue;
        this._series.attachPrimitive(d as any);
        this._drawings.push(d);
      }
    } catch { /* corrupt storage — skip silently */ }
  }
}
