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
  HandleScaleOptions,
  HandleScrollOptions,
  IChartApi,
  ISeriesApi,
  MismatchDirection,
  MouseEventParams,
  Time,
} from 'lightweight-charts';
import {
  BaseDrawing,
  DPoint,
  DrawingOptions,
  HitResult,
  POINTS_REQUIRED,
  SerializedDrawing,
  ToolId,
} from './base';
import {
  TrendLineDrawing,
  HorizontalLineDrawing,
  HorizontalRayDrawing,
  RectangleDrawing,
  hexToRgba,
} from './tools';
import { VerticalLineDrawing } from './toolsVertical';
import { FibonacciDrawing } from './toolsFib';
import { TextDrawing } from './toolsText';
import { ParallelChannelDrawing } from './toolsChannel';
import { snapToOHLC, type SnapCandidate } from './geometry';

// ─── Options ─────────────────────────────────────────────────────────────────

export interface DrawingControllerOptions {
  symbol: string;
  onChange?: () => void;
  onSelectionChange?: (sel: { options: DrawingOptions } | null) => void;
  /** Fired when the controller auto-switches tools (e.g. back to 'cursor'
   *  after finishing a drawing) so the React toolbar can stay in sync. */
  onActiveToolChange?: (tool: ToolId) => void;
  /**
   * Resolve a Unix-seconds timestamp to the bar-index (`logical`) on the
   * CURRENTLY loaded `bars` array. Supplied by BacktestReplayChart (binary
   * search over its `bars` closure). Used only to recompute `logical` for
   * loaded points that DO resolve to a real time — see D2. Returns null if
   * the timestamp isn't found (e.g. whitespace beyond the loaded window).
   */
  resolveLogical?: (timeSec: number) => number | null;
  /**
   * STAGE 2 — fired when a `text` drawing needs its content edited:
   *   (a) right after a `text` drawing is finalized (creation click) — fires
   *       with `currentText: ''` so the popover opens empty for first entry.
   *   (b) in cursor mode, when the user clicks an ALREADY-SELECTED text
   *       drawing (a cheap re-edit affordance — no separate "edit" button).
   * `px` is the CSS-space pixel point (chart-relative) where the popover
   * should be anchored; BacktestReplayChart owns the actual <input> UI.
   */
  onTextEditRequest?: (drawingId: string, px: { x: number; y: number }, currentText: string) => void;
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
    case 'trendline':      return new TrendLineDrawing(points, options, 'none');
    case 'ray':             return new TrendLineDrawing(points, options, 'right');
    case 'extended_line':   return new TrendLineDrawing(points, options, 'both');
    case 'horizontal':     return new HorizontalLineDrawing(points, options);
    case 'horizontal_ray': return new HorizontalRayDrawing(points, options);
    case 'vertical':        return new VerticalLineDrawing(points, options);
    case 'rectangle':      return new RectangleDrawing(points, options);
    case 'fibonacci':       return new FibonacciDrawing(points, options);
    case 'text':            return new TextDrawing(points, options);
    case 'parallel_channel': return new ParallelChannelDrawing(points, options);
    default:               return null;
  }
}

// ─── Controller ──────────────────────────────────────────────────────────────

export class DrawingController {
  private _chart: IChartApi;
  private _series: ISeriesApi<'Candlestick'>;
  private _symbol: string;
  private _onChange?: () => void;
  private _onSelectionChange?: (sel: { options: DrawingOptions } | null) => void;
  private _onActiveToolChange?: (tool: ToolId) => void;
  private _resolveLogical?: (timeSec: number) => number | null;
  private _onTextEditRequest?: (drawingId: string, px: { x: number; y: number }, currentText: string) => void;

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
  // D3: chart pan/zoom options captured right before a drag starts, so we can
  // restore EXACTLY what the chart had (not assume defaults) once the drag ends.
  private _savedHandleScroll: boolean | HandleScrollOptions | undefined;
  private _savedHandleScale: boolean | HandleScaleOptions | undefined;

  // Drawing options for new drawings
  private _options: DrawingOptions = { color: '#C9A646', width: 2 };

  // ── P2: utility toggle flags ──────────────────────────────────────────────
  private _magnetOn: boolean = false;
  private _stayInDrawModeOn: boolean = false;
  private _lockAllOn: boolean = false;
  private _hideAllOn: boolean = false;

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
    this._onActiveToolChange = opts.onActiveToolChange;
    this._resolveLogical = opts.resolveLogical;
    this._onTextEditRequest = opts.onTextEditRequest;

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
    window.addEventListener('blur', this._onDragFailsafe);
    container.addEventListener('mouseleave', this._onDragFailsafe);

    this._loadFromStorage();
    this._installE2EHook();
  }

  // ── E2E test hook ─────────────────────────────────────────────────────────

  /**
   * Exposes a minimal read-only surface on `window.__drawings2` for
   * Playwright/E2E assertions. Only installed in dev builds or when the
   * operator has explicitly opted in via localStorage (survives a prod
   * build for manual QA). Never installed in a plain production session.
   */
  private _installE2EHook(): void {
    let e2eFlag = false;
    try {
      e2eFlag = localStorage.getItem('finotaur_e2e') === '1';
    } catch { /* localStorage unavailable (privacy mode, SSR, etc.) */ }

    if (!(import.meta.env.DEV || e2eFlag)) return;

    (window as any).__drawings2 = {
      controller: this,
      count: () => this._drawings.length,
      tools: () => this._drawings.map(d => d.serialize()),
      activeTool: () => this._activeTool,
    };
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
      // P2 HIDE ALL: selecting a draw tool while hidden auto-unhides, so the
      // user can see what they're drawing relative to existing shapes.
      if (this._hideAllOn) this.setHideAll(false);
    }
  }

  getActiveTool(): ToolId {
    return this._activeTool;
  }

  // ── P2: utility toggles ───────────────────────────────────────────────────

  setMagnet(on: boolean): void {
    this._magnetOn = on;
  }

  setStayInDrawMode(on: boolean): void {
    this._stayInDrawModeOn = on;
  }

  setLockAll(on: boolean): void {
    this._lockAllOn = on;
    if (on) this._deselectAll();
  }

  setHideAll(on: boolean): void {
    if (this._hideAllOn === on) return;
    this._hideAllOn = on;
    if (on) {
      // Detach primitives from the series without touching `points`/`options`
      // state — reattach on unhide restores exactly what was there.
      for (const d of this._drawings) this._detach(d);
    } else {
      for (const d of this._drawings) {
        try { this._series.attachPrimitive(d as any); } catch { /* already attached */ }
      }
    }
  }

  setOptions(o: Partial<DrawingOptions>): void {
    this._options = { ...this._options, ...o };
    // Apply to the selected drawing immediately and persist so the per-shape
    // color/width choice survives a reload.
    if (this._selected) {
      this._selected.options = { ...this._selected.options, ...o };
      this._selected.requestUpdate();
      this._saveToStorage();
      this._onChange?.();
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

  /**
   * STAGE 2 — commit edited text for the `text` drawing identified by
   * `id` (the ephemeral index-based id handed out via onTextEditRequest).
   * Empty/whitespace-only text deletes the drawing instead (reuses the same
   * detach + filter + persist path as deleteSelected — see file header spec:
   * "Empty/whitespace text = the drawing should be deleted").
   */
  updateText(id: string, text: string): void {
    const idx = Number(id);
    const drawing = this._drawings[idx];
    if (!drawing) return;

    if (text.trim() === '') {
      this._detach(drawing);
      this._drawings = this._drawings.filter(d => d !== drawing);
      if (this._selected === drawing) this._selected = null;
      this._saveToStorage();
      this._onChange?.();
      return;
    }

    drawing.options = { ...drawing.options, text };
    drawing.requestUpdate();
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
      container.removeEventListener('mouseleave', this._onDragFailsafe);
    } catch { /* chart may already be removed */ }
    window.removeEventListener('mousemove', this._mousemoveHandler);
    window.removeEventListener('mouseup', this._mouseupHandler);
    window.removeEventListener('blur', this._onDragFailsafe);

    // Clean up the E2E hook only if it still points at this instance (avoids
    // clobbering a newer controller's hook if destroy() runs out of order).
    if ((window as any).__drawings2?.controller === this) {
      delete (window as any).__drawings2;
    }
  }

  // ── Coordinate conversion ─────────────────────────────────────────────────

  /**
   * Convert a pixel point (from param.point or MouseEvent) to a DPoint.
   * Uses logical (bar-index) x so clicks in whitespace right of last bar work.
   *
   * When `snap` is true and the MAGNET toggle (P2) is on, the point is
   * snapped to the nearest OHLC value of the bar under the pointer.
   * Callers pass `snap: true` for creation clicks, crosshair preview moves,
   * and HANDLE drags — but NOT for body-translate drags (a whole-shape move
   * should preserve its shape, not warp toward whichever OHLC value is
   * nearest at each mouse position).
   */
  private _toDPoint(px: number, py: number, snap: boolean = false): DPoint | null {
    const ts = this._chart.timeScale();
    const price = (this._series as unknown as ISeriesApi<'Candlestick'>).coordinateToPrice(py as any);
    if (price == null) return null;
    const logical = ts.coordinateToLogical(px as any);
    const timeAt = ts.coordinateToTime(px as any) as Time | null;

    const base: DPoint = {
      time: timeAt ?? (0 as Time),
      price: Number(price),
      logical: logical != null ? Number(logical) : undefined,
    };

    if (!snap || !this._magnetOn) return base;
    return this._snapDPoint(base, py);
  }

  /**
   * MAGNET (P2): snap a raw DPoint's price + x-coordinate to the nearest
   * OHLC value of the nearest bar at-or-left of the pointer's logical index.
   * Whitespace to the right of the last loaded bar has no bar to snap to —
   * returns the point unmodified in that case.
   */
  private _snapDPoint(pt: DPoint, py: number): DPoint {
    if (pt.logical == null) return pt;
    const roundedLogical = Math.round(pt.logical);
    const bar = this._series.dataByIndex(roundedLogical, MismatchDirection.NearestLeft) as
      | { time: Time; open: number; high: number; low: number; close: number }
      | null;
    if (!bar || bar.open == null) return pt; // whitespace — nothing to snap to

    const candidates: SnapCandidate[] = [];
    for (const price of [bar.open, bar.high, bar.low, bar.close]) {
      const y = this._series.priceToCoordinate(price);
      if (y != null) candidates.push({ price, y: y as number });
    }
    const nearest = snapToOHLC(py, candidates);
    if (!nearest) return pt;

    // `time` is the render-time-preferred coordinate (see D2 / toPixel);
    // `logical` is kept as the whitespace-fallback anchor only.
    return {
      time: bar.time,
      price: nearest.price,
      logical: roundedLogical,
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
    // P2 LOCK ALL: selection is disabled entirely while drawings are locked.
    if (this._lockAllOn) return;

    // Hit-test all drawings; select the first hit
    for (const d of [...this._drawings].reverse()) {
      const hit = d.hitTest(x, y);
      if (hit) {
        // Cheap re-edit affordance: clicking a text drawing that is ALREADY
        // selected re-opens the text-edit popover instead of a no-op reselect.
        // (Clicking an UNselected text drawing just selects it, same as any
        // other tool — the user clicks again to enter edit mode.)
        const isTextDrawing = d.serialize().tool === 'text';
        const wasAlreadySelected = d.selected && d === this._selected;
        this._selectOnly(d);
        if (isTextDrawing && wasAlreadySelected) {
          this._requestTextEdit(d, x, y);
        }
        return;
      }
    }
    // Clicked empty space → deselect
    this._deselectAll();
  }

  /** Resolve a drawing's position in `_drawings` as its ephemeral id string. */
  private _drawingId(d: BaseDrawing): string {
    return String(this._drawings.indexOf(d));
  }

  private _requestTextEdit(d: BaseDrawing, px: number, py: number): void {
    if (!this._onTextEditRequest) return;
    this._onTextEditRequest(this._drawingId(d), { x: px, y: py }, d.options.text ?? '');
  }

  private _handleDrawClick(x: number, y: number): void {
    const tool = this._activeTool;
    if (tool === 'cursor') return;

    const dp = this._toDPoint(x, y, true); // creation click — snap when magnet on
    if (!dp) return;

    const required = POINTS_REQUIRED[tool];

    // 1-point tools (horizontal line / horizontal ray / vertical) → finalize
    // immediately. Stop after one mark: switch back to cursor so the next
    // click does NOT draw another shape (the user must reselect the tool to
    // draw again) — UNLESS stay-in-draw-mode (P2) is on, in which case the
    // tool stays armed for repeated marks.
    if (required <= 1) {
      const created = this._finalize(tool, [dp]);
      if (!this._stayInDrawModeOn) this._resetToCursor();
      // STAGE 2: a freshly-finalized `text` drawing immediately opens the
      // edit popover (empty currentText) so the user can type right away.
      if (tool === 'text' && created) {
        this._selectOnly(created);
        this._requestTextEdit(created, x, y);
      }
      return;
    }

    // Multi-point tools (trendline / ray / extended_line / rectangle /
    // fibonacci): push the pending point; attach/refresh the preview on
    // every click before the last one, finalize once `required` is reached.
    this._pendingPoints.push(dp);

    if (this._pendingPoints.length === 1) {
      // First click: attach preview
      this._attachPreview(tool, dp);
    } else if (this._pendingPoints.length >= required) {
      // Final click: finalize, then stop (back to cursor — no auto-repeat) —
      // UNLESS stay-in-draw-mode (P2) is on, in which case re-arm pending
      // points so the next click starts a new shape of the same tool.
      this._cancelPreview();
      this._finalize(tool, this._pendingPoints.slice(0, required));
      this._pendingPoints = [];
      if (!this._stayInDrawModeOn) this._resetToCursor();
    }
  }

  /**
   * Return to cursor mode after a drawing is committed, and notify React so
   * the toolbar de-highlights the tool. One mark per tool selection — the
   * user reselects the tool to draw again.
   */
  private _resetToCursor(): void {
    this._activeTool = 'cursor';
    this._onActiveToolChange?.('cursor');
  }

  // ── Crosshair move ────────────────────────────────────────────────────────

  private _onCrosshairMove(param: MouseEventParams): void {
    if (this._activeTool === 'cursor') return;
    if (!param.point) return;
    if (this._pendingPoints.length === 0) return;
    if (!this._preview) return;

    const dp = this._toDPoint(param.point.x, param.point.y, true); // preview move — snap when magnet on
    if (!dp) return;

    // Update the preview point at the index of the NEXT pending click — i.e.
    // the confirmed pending points stay fixed, and the crosshair drives the
    // one point that hasn't been clicked yet. For today's 2-point tools this
    // is always index 1, but this generalizes cleanly to future 3-point
    // tools (e.g. fib extension) without another branch here.
    const nextIndex = this._pendingPoints.length; // 0-based index of the point being previewed
    const basePoints = this._pendingPoints.slice(0, nextIndex);
    const previewPoints = [...basePoints];
    previewPoints[nextIndex] = dp;
    this._preview.points = previewPoints;
    this._preview.requestUpdate();
  }

  // ── DOM drag (anchor drag in cursor mode) ─────────────────────────────────

  private _onMousedown(e: MouseEvent, container: HTMLElement): void {
    if (e.button !== 0) return;
    if (this._activeTool !== 'cursor') return;
    if (!this._selected) return;
    // P2 LOCK ALL: dragging is disabled entirely while drawings are locked.
    if (this._lockAllOn) return;

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

    // D3: freeze chart pan/zoom for the duration of the drag. lightweight-
    // charts' own canvas mousedown/mousemove handlers run alongside ours
    // (they're on the same element), so without this a drawing-drag also
    // pans/zooms the chart underneath it.
    this._freezeChartNavigation();

    e.stopPropagation(); // Prevent chart pan
  }

  /** D3: capture current handleScroll/handleScale, then disable both. */
  private _freezeChartNavigation(): void {
    const current = this._chart.options();
    this._savedHandleScroll = current.handleScroll;
    this._savedHandleScale = current.handleScale;
    this._chart.applyOptions({ handleScroll: false, handleScale: false });
  }

  /** D3: restore exactly what was captured in _freezeChartNavigation. */
  private _restoreChartNavigation(): void {
    if (this._savedHandleScroll === undefined && this._savedHandleScale === undefined) return;
    this._chart.applyOptions({
      handleScroll: this._savedHandleScroll,
      handleScale: this._savedHandleScale,
    });
    this._savedHandleScroll = undefined;
    this._savedHandleScale = undefined;
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
      // Move single anchor (handle drag) — snap when magnet on. Body-translate
      // above intentionally does NOT snap (see _toDPoint doc comment).
      const idx = this._dragHandleIndex;
      if (idx >= 0 && idx < this._dragDrawing.points.length) {
        const pt = this._dragDrawing.points[idx];
        const pix = this._dragDrawing.toPixel(pt);
        if (pix) {
          const newDp = this._toDPoint(pix.x + dx, pix.y + dy, true);
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
    this._restoreChartNavigation();
    this._saveToStorage();
    this._onChange?.();
  }

  /**
   * D3 failsafe: if the drag never sees a mouseup (e.g. the user alt-tabs
   * away, or drags the mouse out of the window and releases elsewhere),
   * `window.mouseup` may not fire reliably in every browser. Window `blur`
   * and the chart container's `mouseleave` both re-run the same cleanup so
   * chart navigation never stays stuck disabled.
   */
  private _onDragFailsafe = (): void => {
    if (!this._dragging) return;
    this._dragging = false;
    this._dragDrawing = null;
    this._restoreChartNavigation();
  };

  // ── Preview management ────────────────────────────────────────────────────

  private _attachPreview(tool: ToolId, firstPoint: DPoint): void {
    this._cancelPreview();
    const preview = createDrawing(tool, [firstPoint, firstPoint], {
      ...this._options,
      color: hexToRgba(this._options.color, 0.67), // slightly transparent
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

  private _finalize(tool: ToolId, points: DPoint[]): BaseDrawing | null {
    const drawing = createDrawing(tool, [...points], { ...this._options });
    if (!drawing) return null;
    this._series.attachPrimitive(drawing as any);
    this._drawings.push(drawing);
    this._saveToStorage();
    this._onChange?.();
    return drawing;
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
    this._onSelectionChange?.({ options: d.options });
  }

  private _deselectAll(): void {
    for (const d of this._drawings) {
      if (d.selected) {
        d.selected = false;
        d.requestUpdate();
      }
    }
    this._selected = null;
    this._onSelectionChange?.(null);
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
        const points = item.points.map((pt) => this._reconcilePoint(pt));
        const d = createDrawing(item.tool, points, item.options);
        if (!d) continue;
        this._series.attachPrimitive(d as any);
        this._drawings.push(d);
      }
    } catch { /* corrupt storage — skip silently */ }
  }

  /**
   * D2 fix: a `logical` bar-index saved while viewing one timeframe (e.g. 5m)
   * points at a completely different bar on another timeframe (e.g. 1h) —
   * `time` is the only cross-timeframe-stable coordinate. For every loaded
   * point with a real `time` (time !== 0), recompute `logical` against the
   * CURRENTLY loaded bars via the injected `resolveLogical`. Only keep the
   * stored `logical` as-is for whitespace-anchored points (time === 0, or
   * a time that doesn't resolve on the current window) — those have no
   * other stable anchor.
   */
  private _reconcilePoint(pt: DPoint): DPoint {
    const hasRealTime = pt.time != null && (pt.time as unknown as number) !== 0;
    if (!hasRealTime || !this._resolveLogical) return pt;

    const resolved = this._resolveLogical(pt.time as unknown as number);
    if (resolved == null) return pt; // unresolvable — keep stored logical as fallback anchor
    return { ...pt, logical: resolved };
  }
}
