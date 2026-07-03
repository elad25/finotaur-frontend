/**
 * drawings2/__tests__/newTools.test.ts
 *
 * Node-env unit tests for STAGE 1 + STAGE 2 of the new-tools suite:
 *   - clipLineToRect (Ray / Extended line clipping math)
 *   - fibLevelPrices (Fibonacci retracement level pricing)
 *   - channelOffset (Parallel channel offset math — STAGE 2)
 *   - Serialization round-trip for vertical / ray / extended_line / fibonacci /
 *     text / parallel_channel
 *   - POINTS_REQUIRED regression note (see bottom of file)
 *
 * DrawingController itself is NOT instantiated here — it requires a real
 * IChartApi/ISeriesApi (attachPrimitive, subscribeClick, chartElement, DOM
 * event wiring), which would need a browser/jsdom environment. Consistent
 * with foundation.test.ts, controller-level click-flow tests are skipped
 * (including `updateText`'s delete-on-empty branch, which needs a live
 * controller instance with `_drawings`/`_detach` — not constructible in
 * node); see the note at the bottom of this file for what IS/ISN'T covered.
 */

import { describe, expect, it } from 'vitest';
import { clipLineToRect, fibLevelPrices, channelOffset } from '../geometry';
import type { DPoint, DrawingOptions, SerializedDrawing } from '../base';
import { TrendLineDrawing } from '../tools';
import { VerticalLineDrawing } from '../toolsVertical';
import { FibonacciDrawing, FIB_LEVELS } from '../toolsFib';
import { TextDrawing } from '../toolsText';
import { ParallelChannelDrawing } from '../toolsChannel';

const OPTIONS: DrawingOptions = { color: '#C9A646', width: 2 };

// ─── clipLineToRect ───────────────────────────────────────────────────────────

describe('clipLineToRect', () => {
  const rect = { left: 0, top: 0, right: 100, bottom: 100 };

  it('mode "none" returns the segment unmodified even when it exceeds the rect', () => {
    const result = clipLineToRect(10, 10, 200, 200, rect, 'none');
    expect(result).toEqual({ x0: 10, y0: 10, x1: 200, y1: 200 });
  });

  it('segment fully inside the rect stays unchanged for mode "right"', () => {
    // A fully-inside segment: the ray extension keeps endpoint A fixed and
    // pushes B outward to the rect boundary along the same direction.
    const result = clipLineToRect(20, 20, 40, 40, rect, 'right');
    expect(result.x0).toBe(20);
    expect(result.y0).toBe(20);
    // Direction is (20,20) normalized; extending to the boundary along
    // that direction from (20,20) hits x=100 (dx=dy so also y=100).
    expect(result.x1).toBeCloseTo(100, 5);
    expect(result.y1).toBeCloseTo(100, 5);
  });

  it('ray clipping right edge: horizontal ray extends to right edge, A fixed', () => {
    const result = clipLineToRect(10, 50, 30, 50, rect, 'right');
    expect(result.x0).toBe(10);
    expect(result.y0).toBe(50);
    expect(result.x1).toBeCloseTo(100, 5);
    expect(result.y1).toBeCloseTo(50, 5);
  });

  it('ray clipping when direction points away from any further rect extension falls back to original endpoint', () => {
    // B is already at the rect's right edge and direction points further
    // right/down (still forward) — tEnd should be >= 1, never regress
    // backward past the original endpoint.
    const result = clipLineToRect(0, 0, 100, 100, rect, 'right');
    expect(result.x1).toBeCloseTo(100, 5);
    expect(result.y1).toBeCloseTo(100, 5);
  });

  it('extended (both) clips both edges of a diagonal line', () => {
    const result = clipLineToRect(40, 40, 60, 60, rect, 'both');
    // Direction (1,1) through (40,40)/(60,60) — the full line within the
    // 100x100 rect runs from (0,0) to (100,100).
    expect(result.x0).toBeCloseTo(0, 5);
    expect(result.y0).toBeCloseTo(0, 5);
    expect(result.x1).toBeCloseTo(100, 5);
    expect(result.y1).toBeCloseTo(100, 5);
  });

  it('degenerate vertical direction (both mode) clips only in Y, keeps X constant', () => {
    const result = clipLineToRect(50, 30, 50, 40, rect, 'both');
    expect(result.x0).toBeCloseTo(50, 5);
    expect(result.x1).toBeCloseTo(50, 5);
    expect(result.y0).toBeCloseTo(0, 5);
    expect(result.y1).toBeCloseTo(100, 5);
  });

  it('degenerate horizontal direction (both mode) clips only in X, keeps Y constant', () => {
    const result = clipLineToRect(30, 50, 40, 50, rect, 'both');
    expect(result.y0).toBeCloseTo(50, 5);
    expect(result.y1).toBeCloseTo(50, 5);
    expect(result.x0).toBeCloseTo(0, 5);
    expect(result.x1).toBeCloseTo(100, 5);
  });

  it('degenerate zero-length segment returns the original point pair unmodified', () => {
    const result = clipLineToRect(50, 50, 50, 50, rect, 'both');
    expect(result).toEqual({ x0: 50, y0: 50, x1: 50, y1: 50 });
  });

  it('vertical line entirely outside rect X-range collapses to zero-length at t=0', () => {
    const result = clipLineToRect(150, 10, 150, 90, rect, 'both');
    // x0 is outside [left,right] → tMin=tMax=0 → collapses to the original A point.
    expect(result.x0).toBe(150);
    expect(result.x1).toBe(150);
  });
});

// ─── fibLevelPrices ───────────────────────────────────────────────────────────

describe('fibLevelPrices', () => {
  it('ascending anchors (p0 < p1): level 0 = p1, level 1 = p0', () => {
    const prices = fibLevelPrices(100, 200, [0, 0.5, 1]);
    expect(prices[0]).toBeCloseTo(200); // level 0 = p1Price
    expect(prices[1]).toBeCloseTo(150); // midpoint
    expect(prices[2]).toBeCloseTo(100); // level 1 = p0Price
  });

  it('descending anchors (p0 > p1): level 0 = p1, level 1 = p0', () => {
    const prices = fibLevelPrices(200, 100, [0, 0.5, 1]);
    expect(prices[0]).toBeCloseTo(100);
    expect(prices[1]).toBeCloseTo(150);
    expect(prices[2]).toBeCloseTo(200);
  });

  it('full standard level set computes monotonically between the two anchors', () => {
    const prices = fibLevelPrices(100, 200, [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]);
    expect(prices).toHaveLength(7);
    expect(prices[0]).toBeCloseTo(200);
    expect(prices[6]).toBeCloseTo(100);
    // Monotonic decreasing from level 0 to level 1 in the ascending case.
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
    }
  });

  it('equal anchors: every level resolves to the same price', () => {
    const prices = fibLevelPrices(150, 150, [0, 0.5, 1]);
    expect(prices).toEqual([150, 150, 150]);
  });
});

// ─── channelOffset (STAGE 2 — Parallel channel) ──────────────────────────────

describe('channelOffset', () => {
  it('p2 above the baseline (higher price) returns a positive offset', () => {
    // Baseline: (t=0, price=100) → (t=100, price=100) — flat.
    // p2 at t=50, price=110 → 10 above the baseline at that time.
    const offset = channelOffset(
      { time: 0, price: 100 },
      { time: 100, price: 100 },
      { time: 50, price: 110 },
    );
    expect(offset).toBeCloseTo(10);
  });

  it('p2 below the baseline (lower price) returns a negative offset', () => {
    const offset = channelOffset(
      { time: 0, price: 100 },
      { time: 100, price: 100 },
      { time: 50, price: 90 },
    );
    expect(offset).toBeCloseTo(-10);
  });

  it('p2 exactly at the baseline endpoint p0: offset = p2.price − p0.price', () => {
    const offset = channelOffset(
      { time: 0, price: 100 },
      { time: 100, price: 200 },
      { time: 0, price: 130 },
    );
    expect(offset).toBeCloseTo(30);
  });

  it('p2 exactly at the baseline endpoint p1: offset = p2.price − p1.price', () => {
    const offset = channelOffset(
      { time: 0, price: 100 },
      { time: 100, price: 200 },
      { time: 100, price: 250 },
    );
    expect(offset).toBeCloseTo(50);
  });

  it('p2 on a sloped baseline is compared against the interpolated price at its own time', () => {
    // Baseline rises from 100 at t=0 to 200 at t=100 → at t=50 it's 150.
    // p2 at t=50, price=160 → offset = 160 - 150 = 10.
    const offset = channelOffset(
      { time: 0, price: 100 },
      { time: 100, price: 200 },
      { time: 50, price: 160 },
    );
    expect(offset).toBeCloseTo(10);
  });

  it('degenerate baseline (p0.time === p1.time): falls back to p2.price − p0.price', () => {
    const offset = channelOffset(
      { time: 500, price: 100 },
      { time: 500, price: 999 }, // same time as p0 — a vertical/zero-width baseline
      { time: 600, price: 130 },
    );
    expect(offset).toBeCloseTo(30); // 130 - 100, NOT dividing by zero
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
    case 'trendline':      return new TrendLineDrawing(points, options, 'none');
    case 'ray':             return new TrendLineDrawing(points, options, 'right');
    case 'extended_line':   return new TrendLineDrawing(points, options, 'both');
    case 'vertical':        return new VerticalLineDrawing(points, options);
    case 'fibonacci':       return new FibonacciDrawing(points, options);
    case 'text':            return new TextDrawing(points, options);
    case 'parallel_channel': return new ParallelChannelDrawing(points, options);
    default:               return null;
  }
}

describe('New drawing serialization round-trip', () => {
  it('vertical: construct → serialize → rehydrate', () => {
    const points: DPoint[] = [{ time: 1000 as any, price: 300, logical: 4 }];
    const original = new VerticalLineDrawing(points, OPTIONS);
    const serialized = original.serialize();
    expect(serialized.tool).toBe('vertical');
    expect(serialized.points).toEqual(points);
    expect(serialized.options).toEqual(OPTIONS);

    const rehydrated = createDrawing(serialized.tool, serialized.points, serialized.options);
    expect(rehydrated).toBeInstanceOf(VerticalLineDrawing);
    expect(rehydrated!.points).toEqual(points);
    expect(rehydrated!.options).toEqual(OPTIONS);
  });

  it('ray: construct (extend="right") → serialize → rehydrate → _toolId round-trips', () => {
    const points: DPoint[] = [
      { time: 1000 as any, price: 100, logical: 5 },
      { time: 2000 as any, price: 120, logical: 10 },
    ];
    const original = new TrendLineDrawing(points, OPTIONS, 'right');
    const serialized = original.serialize();
    expect(serialized.tool).toBe('ray');

    const rehydrated = createDrawing(serialized.tool, serialized.points, serialized.options);
    expect(rehydrated).toBeInstanceOf(TrendLineDrawing);
    expect((rehydrated as TrendLineDrawing).extend).toBe('right');
    expect(rehydrated!.points).toEqual(points);
    // Re-serializing the rehydrated instance must still say "ray" (round-trip stability).
    expect(rehydrated!.serialize().tool).toBe('ray');
  });

  it('extended_line: construct (extend="both") → serialize → rehydrate → _toolId round-trips', () => {
    const points: DPoint[] = [
      { time: 1000 as any, price: 100, logical: 5 },
      { time: 2000 as any, price: 90, logical: 10 },
    ];
    const original = new TrendLineDrawing(points, OPTIONS, 'both');
    const serialized = original.serialize();
    expect(serialized.tool).toBe('extended_line');

    const rehydrated = createDrawing(serialized.tool, serialized.points, serialized.options);
    expect(rehydrated).toBeInstanceOf(TrendLineDrawing);
    expect((rehydrated as TrendLineDrawing).extend).toBe('both');
    expect(rehydrated!.serialize().tool).toBe('extended_line');
  });

  it('plain trendline still round-trips as "trendline" (regression: extend defaults to "none")', () => {
    const points: DPoint[] = [
      { time: 1000 as any, price: 100, logical: 5 },
      { time: 2000 as any, price: 110, logical: 10 },
    ];
    const original = new TrendLineDrawing(points, OPTIONS);
    expect(original.extend).toBe('none');
    expect(original.serialize().tool).toBe('trendline');
  });

  it('fibonacci: construct → serialize → rehydrate', () => {
    const points: DPoint[] = [
      { time: 1000 as any, price: 100, logical: 5 },
      { time: 2000 as any, price: 200, logical: 10 },
    ];
    const original = new FibonacciDrawing(points, OPTIONS);
    const serialized = original.serialize();
    expect(serialized.tool).toBe('fibonacci');
    expect(serialized.points).toEqual(points);

    const rehydrated = createDrawing(serialized.tool, serialized.points, serialized.options);
    expect(rehydrated).toBeInstanceOf(FibonacciDrawing);
    expect(rehydrated!.points).toEqual(points);
    expect(rehydrated!.options).toEqual(OPTIONS);
  });

  it('all new classes construct without a chart (no attached() call)', () => {
    const pt: DPoint = { time: 1000 as any, price: 100 };
    expect(() => new VerticalLineDrawing([pt], OPTIONS).paneViews()).not.toThrow();
    expect(() => new TrendLineDrawing([pt, pt], OPTIONS, 'right').paneViews()).not.toThrow();
    expect(() => new TrendLineDrawing([pt, pt], OPTIONS, 'both').paneViews()).not.toThrow();
    expect(() => new FibonacciDrawing([pt, pt], OPTIONS).paneViews()).not.toThrow();
    expect(() => new TextDrawing([pt], OPTIONS).paneViews()).not.toThrow();
    expect(() => new ParallelChannelDrawing([pt, pt, pt], OPTIONS).paneViews()).not.toThrow();
    // Constructed with only 2 of the 3 required points (mid-preview state) —
    // must not throw at construction time; array-access guards live in
    // offset()/hitTest(), not the constructor.
    expect(() => new ParallelChannelDrawing([pt, pt], OPTIONS).paneViews()).not.toThrow();
  });

  it('FIB_LEVELS exports the standard 7-level retracement set', () => {
    expect(FIB_LEVELS).toEqual([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]);
  });

  // ─── STAGE 2: text ──────────────────────────────────────────────────────────

  it('text: construct with content → serialize → rehydrate', () => {
    const points: DPoint[] = [{ time: 1000 as any, price: 300, logical: 4 }];
    const optionsWithText: DrawingOptions = { ...OPTIONS, text: 'Support zone' };
    const original = new TextDrawing(points, optionsWithText);
    const serialized = original.serialize();
    expect(serialized.tool).toBe('text');
    expect(serialized.points).toEqual(points);
    expect(serialized.options.text).toBe('Support zone');

    const rehydrated = createDrawing(serialized.tool, serialized.points, serialized.options);
    expect(rehydrated).toBeInstanceOf(TextDrawing);
    expect(rehydrated!.options.text).toBe('Support zone');
  });

  it('text: default text is empty string when not provided', () => {
    const points: DPoint[] = [{ time: 1000 as any, price: 300 }];
    const original = new TextDrawing(points, OPTIONS); // OPTIONS has no `text` field
    const serialized = original.serialize();
    expect(serialized.options.text).toBe('');
  });

  // ─── STAGE 2: parallel_channel ──────────────────────────────────────────────

  it('parallel_channel: construct with 3 points → serialize → rehydrate', () => {
    const points: DPoint[] = [
      { time: 0 as any, price: 100, logical: 0 },
      { time: 100 as any, price: 200, logical: 10 },
      { time: 50 as any, price: 160, logical: 5 },
    ];
    const original = new ParallelChannelDrawing(points, OPTIONS);
    const serialized = original.serialize();
    expect(serialized.tool).toBe('parallel_channel');
    expect(serialized.points).toEqual(points);
    expect(serialized.points).toHaveLength(3);

    const rehydrated = createDrawing(serialized.tool, serialized.points, serialized.options);
    expect(rehydrated).toBeInstanceOf(ParallelChannelDrawing);
    expect(rehydrated!.points).toEqual(points);
    expect((rehydrated as ParallelChannelDrawing).offset()).toBeCloseTo(10);
  });

  it('parallel_channel: offset() returns null with fewer than 3 points (preview phase)', () => {
    const p0: DPoint = { time: 0 as any, price: 100 };
    const p1: DPoint = { time: 100 as any, price: 200 };
    const drawing = new ParallelChannelDrawing([p0, p1], OPTIONS);
    expect(drawing.offset()).toBeNull();
  });
});

// ─── POINTS_REQUIRED regression ──────────────────────────────────────────────
//
// DrawingController._handleDrawClick is not unit-testable at this level (it
// requires a live IChartApi for param.point / subscribeClick / attachPrimitive
// — no jsdom in this project's vitest config; see foundation.test.ts's note).
// What IS covered here is the data-level guarantee the click flow depends on:
// POINTS_REQUIRED['horizontal_ray'] === 1, meaning the generalized
// `required <= 1` branch in _handleDrawClick finalizes horizontal_ray on the
// FIRST click, exactly like before the refactor (previously a hardcoded
// `tool === 'horizontal' || tool === 'horizontal_ray'` check). If this value
// ever changes to 2+ without updating the click handler, this test catches
// the drift at the data level even though the DOM-level behavior itself is
// not exercised here.
describe('POINTS_REQUIRED regression (data-level; full click-flow needs jsdom)', () => {
  it('horizontal_ray still requires exactly 1 point (finalizes on first click)', async () => {
    const { POINTS_REQUIRED } = await import('../base');
    expect(POINTS_REQUIRED.horizontal_ray).toBe(1);
    expect(POINTS_REQUIRED.horizontal).toBe(1);
    expect(POINTS_REQUIRED.vertical).toBe(1);
  });

  it('text (STAGE 2) requires exactly 1 point (finalizes on first click, then opens the edit popover)', async () => {
    const { POINTS_REQUIRED } = await import('../base');
    expect(POINTS_REQUIRED.text).toBe(1);
  });

  it('2-point tools all require exactly 2 points', async () => {
    const { POINTS_REQUIRED } = await import('../base');
    expect(POINTS_REQUIRED.trendline).toBe(2);
    expect(POINTS_REQUIRED.ray).toBe(2);
    expect(POINTS_REQUIRED.extended_line).toBe(2);
    expect(POINTS_REQUIRED.rectangle).toBe(2);
    expect(POINTS_REQUIRED.fibonacci).toBe(2);
  });

  it('parallel_channel (STAGE 2) requires exactly 3 points (baseline p0/p1 + offset sample p2)', async () => {
    const { POINTS_REQUIRED } = await import('../base');
    expect(POINTS_REQUIRED.parallel_channel).toBe(3);
  });

  it('cursor requires 0 points (no drawing created in cursor mode)', async () => {
    const { POINTS_REQUIRED } = await import('../base');
    expect(POINTS_REQUIRED.cursor).toBe(0);
  });
});

// ─── STAGE 2 note: updateText / onTextEditRequest controller behavior ────────
//
// DrawingController.updateText() and the onTextEditRequest firing points
// (finalize-a-text-drawing, click-an-already-selected-text-drawing) are NOT
// unit-tested here — same constraint as the POINTS_REQUIRED note above: the
// controller requires a live IChartApi/ISeriesApi (attachPrimitive,
// subscribeClick, chartElement) to construct, which isn't available in this
// project's node-env vitest config (no jsdom). What IS covered at the pure/
// data level: TextDrawing's own delete-on-empty-serialize default ('' when
// no text option is set) and the general serialize/rehydrate round-trip
// above, which `updateText`'s non-delete branch relies on (it just mutates
// `options.text` and calls requestUpdate() + the existing persist path).
