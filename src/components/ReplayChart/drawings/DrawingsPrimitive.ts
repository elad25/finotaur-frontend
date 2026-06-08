// drawings/DrawingsPrimitive.ts
//
// lightweight-charts v4 Series Primitive that draws all committed + active
// drawings directly onto the chart's own canvas.  Because the chart calls
// draw() on every repaint (pan, zoom, resize, series update), drawings stay
// perfectly aligned without a separate overlay canvas that can drift.
//
// Usage:
//   const primitive = new DrawingsPrimitive(() => ({ drawings, activeDrawing, theme }));
//   series.attachPrimitive(primitive as unknown as ISeriesPrimitive<Time>);
//   // Whenever drawings/activeDrawing state changes, call:
//   primitive.requestRedraw();
//   // On chart cleanup:
//   series.detachPrimitive(primitive as unknown as ISeriesPrimitive<Time>);

import {
  IChartApi,
  ISeriesApi,
  Time,
  ISeriesPrimitivePaneView,
  ISeriesPrimitivePaneRenderer,
  SeriesAttachedParameter,
  SeriesPrimitivePaneViewZOrder,
} from 'lightweight-charts';
import type { CanvasRenderingTarget2D } from 'fancy-canvas';
import { Drawing, DrawingPoint, Theme } from '../types';
import { DRAWING_COLORS } from '../constants';
import { RENDERERS } from './renderers';

// ─── State shape passed in via the getter callback ───────────────────────────

export interface DrawingsState {
  drawings: Drawing[];
  activeDrawing: Drawing | null;
  theme: Theme;
}

// ─── Renderer (called once per repaint by the library) ───────────────────────

class DrawingsPaneRenderer implements ISeriesPrimitivePaneRenderer {
  constructor(private readonly _primitive: DrawingsPrimitive) {}

  draw(target: CanvasRenderingTarget2D): void {
    target.useMediaCoordinateSpace((scope) => {
      this._primitive.renderInto(
        scope.context,
        scope.mediaSize.width,
        scope.mediaSize.height,
      );
    });
  }
}

// ─── View (stable reference; renderer is reused across frames) ───────────────

class DrawingsPaneView implements ISeriesPrimitivePaneView {
  private readonly _renderer: DrawingsPaneRenderer;

  constructor(primitive: DrawingsPrimitive) {
    this._renderer = new DrawingsPaneRenderer(primitive);
  }

  zOrder(): SeriesPrimitivePaneViewZOrder {
    return 'top';
  }

  renderer(): ISeriesPrimitivePaneRenderer {
    return this._renderer;
  }
}

// ─── Primitive (attach once; lives until chart.remove()) ─────────────────────

export class DrawingsPrimitive {
  private _chart?: IChartApi;
  private _series?: ISeriesApi<'Candlestick'>;
  private _requestUpdate?: () => void;
  private readonly _views: readonly ISeriesPrimitivePaneView[];

  constructor(private readonly _getState: () => DrawingsState) {
    this._views = [new DrawingsPaneView(this)];
  }

  // ── ISeriesPrimitiveBase lifecycle hooks ─────────────────────────────────

  attached(param: SeriesAttachedParameter<Time, 'Candlestick'>): void {
    this._chart = param.chart as unknown as IChartApi;
    this._series = param.series as unknown as ISeriesApi<'Candlestick'>;
    this._requestUpdate = param.requestUpdate;
  }

  detached(): void {
    this._chart = undefined;
    this._series = undefined;
    this._requestUpdate = undefined;
  }

  // updateAllViews is optional — state is pulled live inside renderInto.
  updateAllViews(): void { /* no-op: state read on each draw */ }

  paneViews(): readonly ISeriesPrimitivePaneView[] {
    return this._views;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Ask the chart to schedule a repaint.
   * Call this whenever `drawings` or `activeDrawing` state changes.
   */
  requestRedraw(): void {
    this._requestUpdate?.();
  }

  /**
   * Port of DrawingLayer's draw loop.  Runs inside the chart's own canvas in
   * MEDIA (CSS) coordinates — no devicePixelRatio math needed.
   */
  renderInto(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this._chart || !this._series) return;

    const { drawings, activeDrawing, theme } = this._getState();
    const colors = theme === 'dark' ? DRAWING_COLORS.dark : DRAWING_COLORS.light;
    const ts = this._chart.timeScale();
    const series = this._series;

    const toPixel = (point: DrawingPoint): { x: number; y: number } | null => {
      try {
        const x =
          point.logical != null
            ? ts.logicalToCoordinate(point.logical as any)
            : ts.timeToCoordinate(point.time as Time);
        const y = series.priceToCoordinate(point.price);
        if (x === null || y === null) return null;
        return { x, y };
      } catch {
        return null;
      }
    };

    // Renderers only read `canvas.width` / `canvas.height`; pass a lightweight shim.
    const canvasShim = { width, height } as unknown as HTMLCanvasElement;

    const all: Drawing[] = [...drawings.filter((d) => d.visible)];
    if (activeDrawing) all.push(activeDrawing);

    for (const drawing of all) {
      // Normalize style: old localStorage drawings may lack a `style` object.
      const style = drawing.style ?? {
        color: drawing.color,
        lineWidth: drawing.lineWidth,
        lineStyle: 'solid' as const,
      };

      const color = drawing.selected
        ? colors.selected
        : drawing.locked
        ? colors.locked
        : (style.color || colors.default);

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = style.fillColor || color;
      ctx.lineWidth = style.lineWidth || 2;
      ctx.globalAlpha = style.fillOpacity ?? 1;

      switch (style.lineStyle) {
        case 'dashed':
          ctx.setLineDash([5, 5]);
          break;
        case 'dotted':
          ctx.setLineDash([2, 2]);
          break;
        default:
          ctx.setLineDash([]);
      }

      const renderer = RENDERERS[drawing.type];
      if (renderer) {
        // Defensive: a single drawing renderer must never throw out of the
        // chart's paint pass (that would blank the whole chart canvas).
        try {
          renderer(
            { ctx, toPixel, canvas: canvasShim, colors, style, color, candlestickSeries: series },
            drawing,
          );
        } catch {
          /* skip this drawing, keep painting the rest + the chart */
        }
      }

      ctx.restore();
    }
  }
}
