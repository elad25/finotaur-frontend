/**
 * drawings2/__tests__/foundation.test.ts
 *
 * Node-env unit tests for the drawing-foundation work (P0/D2/D3/D4/P1/P2):
 *   - snapToOHLC pure geometry helper
 *   - Serialization round-trip for all four drawing primitives
 *
 * DrawingController itself is NOT instantiated here — it requires a real
 * IChartApi/ISeriesApi (attachPrimitive, subscribeClick, chartElement, DOM
 * event wiring), which would need a browser/jsdom environment. Per the task
 * scope, we skip controller-level tests rather than adding jsdom.
 */

import { describe, expect, it } from 'vitest';
import { snapToOHLC } from '../geometry';
import type { DPoint, DrawingOptions, SerializedDrawing } from '../base';
import {
  TrendLineDrawing,
  HorizontalLineDrawing,
  HorizontalRayDrawing,
  RectangleDrawing,
} from '../tools';

// ─── snapToOHLC ───────────────────────────────────────────────────────────────

describe('snapToOHLC', () => {
  it('picks the nearest candidate to the pointer Y', () => {
    const candidates = [
      { price: 100, y: 10 },
      { price: 105, y: 50 },
      { price: 110, y: 90 },
    ];
    expect(snapToOHLC(48, candidates)).toEqual({ price: 105, y: 50 });
    expect(snapToOHLC(12, candidates)).toEqual({ price: 100, y: 10 });
    expect(snapToOHLC(89, candidates)).toEqual({ price: 110, y: 90 });
  });

  it('returns null for an empty candidate list', () => {
    expect(snapToOHLC(50, [])).toBeNull();
  });

  it('picks the first candidate on an exact tie', () => {
    const candidates = [
      { price: 100, y: 10 },
      { price: 200, y: 30 },
    ];
    // Pointer exactly between the two (distance 10 each) — first wins.
    expect(snapToOHLC(20, candidates)).toEqual({ price: 100, y: 10 });
  });
});

// ─── Serialization round-trip ────────────────────────────────────────────────

/** Mirrors DrawingController's private `createDrawing` factory for test purposes. */
function createDrawing(
  tool: SerializedDrawing['tool'],
  points: DPoint[],
  options: DrawingOptions,
) {
  switch (tool) {
    case 'trendline':      return new TrendLineDrawing(points, options);
    case 'horizontal':     return new HorizontalLineDrawing(points, options);
    case 'horizontal_ray': return new HorizontalRayDrawing(points, options);
    case 'rectangle':      return new RectangleDrawing(points, options);
    default:               return null;
  }
}

const OPTIONS: DrawingOptions = { color: '#C9A646', width: 2 };

describe('Drawing serialization round-trip', () => {
  it('trendline: construct → serialize → rehydrate', () => {
    const points: DPoint[] = [
      { time: 1000 as any, price: 100, logical: 5 },
      { time: 2000 as any, price: 110, logical: 10 },
    ];
    const original = new TrendLineDrawing(points, OPTIONS);
    // Classes must construct without a chart — no attached() call here.
    const serialized = original.serialize();
    expect(serialized.tool).toBe('trendline');
    expect(serialized.points).toEqual(points);
    expect(serialized.options).toEqual(OPTIONS);

    const rehydrated = createDrawing(serialized.tool, serialized.points, serialized.options);
    expect(rehydrated).toBeInstanceOf(TrendLineDrawing);
    expect(rehydrated!.points).toEqual(points);
    expect(rehydrated!.options).toEqual(OPTIONS);
  });

  it('horizontal: construct → serialize → rehydrate', () => {
    const points: DPoint[] = [{ time: 1000 as any, price: 250, logical: 3 }];
    const original = new HorizontalLineDrawing(points, OPTIONS);
    const serialized = original.serialize();
    expect(serialized.tool).toBe('horizontal');

    const rehydrated = createDrawing(serialized.tool, serialized.points, serialized.options);
    expect(rehydrated).toBeInstanceOf(HorizontalLineDrawing);
    expect(rehydrated!.points).toEqual(points);
  });

  it('horizontal_ray: construct → serialize → rehydrate', () => {
    const points: DPoint[] = [{ time: 3000 as any, price: 42, logical: 7 }];
    const original = new HorizontalRayDrawing(points, OPTIONS);
    const serialized = original.serialize();
    expect(serialized.tool).toBe('horizontal_ray');

    const rehydrated = createDrawing(serialized.tool, serialized.points, serialized.options);
    expect(rehydrated).toBeInstanceOf(HorizontalRayDrawing);
    expect(rehydrated!.points).toEqual(points);
  });

  it('rectangle: construct → serialize → rehydrate', () => {
    const points: DPoint[] = [
      { time: 1000 as any, price: 100, logical: 5 },
      { time: 5000 as any, price: 150, logical: 25 },
    ];
    const original = new RectangleDrawing(points, OPTIONS);
    const serialized = original.serialize();
    expect(serialized.tool).toBe('rectangle');

    const rehydrated = createDrawing(serialized.tool, serialized.points, serialized.options);
    expect(rehydrated).toBeInstanceOf(RectangleDrawing);
    expect(rehydrated!.points).toEqual(points);
    expect(rehydrated!.options).toEqual(OPTIONS);
  });

  it('all four classes construct without a chart (no attached() call)', () => {
    // paneViews() must not throw even though attached() was never called —
    // toPixel() internally guards on !this._chart.
    const pts: DPoint[] = [{ time: 1000 as any, price: 100 }];
    expect(() => new TrendLineDrawing([...pts, ...pts], OPTIONS).paneViews()).not.toThrow();
    expect(() => new HorizontalLineDrawing(pts, OPTIONS).paneViews()).not.toThrow();
    expect(() => new HorizontalRayDrawing(pts, OPTIONS).paneViews()).not.toThrow();
    expect(() => new RectangleDrawing([...pts, ...pts], OPTIONS).paneViews()).not.toThrow();
  });
});
