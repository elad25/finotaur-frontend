// src/components/charting/orderflow/__tests__/magnifier.test.ts
//
// Coverage for the ATAS-style Magnifier: a floating popup that renders one
// hovered candle's full footprint detail at a fixed, comfortable cell size
// while the chart itself is zoomed out (detail stage 'hidden' or 'shaded').
//
// Two things are exercised:
//   1. computeMagnifierLayout — pure layout math (row count, canvas
//      dimensions, row-merge clamping for candles with a huge number of
//      price levels). No canvas, no DOM.
//   2. The magnifier's draw path reuses prepareCandleDraw + drawCandleFootprint
//      against a mocked ctx, proving the popup paints real cells rather than
//      reimplementing cell drawing — same mocked-ctx style as
//      footprintRender.test.ts.

import { describe, it, expect } from 'vitest';
import {
  computeMagnifierLayout,
  prepareCandleDraw,
  drawCandleFootprint,
  MAGNIFIER_ROW_HEIGHT,
  MAGNIFIER_TOTALS_BAND_HEIGHT,
  MAGNIFIER_MAX_HEIGHT,
  type CandleProjection,
  type FootprintDrawExtras,
} from '../footprintRender';
import type { FlowCandleView, FlowTrade, FootprintConfig } from '../types';
import { DEFAULT_FOOTPRINT_CONFIG } from '../types';
import { FlowBinStore } from '../flowBinStore';

// ─── Test fixtures ───────────────────────────────────────────────────────────

function buildCandle(trades: FlowTrade[], intervalSec = 60, rowSize = 10): FlowCandleView {
  const store = new FlowBinStore({ intervalSec, rowSize });
  store.applyTrades(trades);
  const candleTime = Math.floor(trades[0].time / 1000 / intervalSec) * intervalSec;
  const view = store.getCandle(candleTime);
  if (!view) throw new Error('test setup: expected candle');
  return view;
}

/** Build a candle with `levelCount` distinct price bins, one trade each. */
function buildCandleWithLevels(levelCount: number, rowSize = 1): FlowCandleView {
  const trades: FlowTrade[] = [];
  for (let i = 0; i < levelCount; i++) {
    trades.push({ time: i, price: 100 + i * rowSize, qty: 1 + (i % 3), buyerAggressor: i % 2 === 0 });
  }
  return buildCandle(trades, 60, rowSize);
}

// ─── computeMagnifierLayout ─────────────────────────────────────────────────

describe('computeMagnifierLayout', () => {
  it('row count equals the merged-bins count for a normal candle (no merge needed)', () => {
    const candle = buildCandleWithLevels(5, 10);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG };
    const prepared = prepareCandleDraw(candle, 10, 1, config);

    const layout = computeMagnifierLayout(prepared);

    expect(layout.rowCount).toBe(prepared.merged.length);
    expect(layout.mergeFactor).toBe(1);
  });

  it('canvas height = rows * rowH + totals band, for a small candle well under the cap', () => {
    const candle = buildCandleWithLevels(4, 10);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG };
    const prepared = prepareCandleDraw(candle, 10, 1, config);

    const layout = computeMagnifierLayout(prepared);

    expect(layout.rowCount).toBe(4);
    expect(layout.canvasHeight).toBe(4 * MAGNIFIER_ROW_HEIGHT + MAGNIFIER_TOTALS_BAND_HEIGHT);
    expect(layout.canvasHeight).toBeLessThanOrEqual(MAGNIFIER_MAX_HEIGHT);
  });

  it('canvas width is wide enough for bid×ask text side by side, and positive', () => {
    const candle = buildCandleWithLevels(3, 10);
    const prepared = prepareCandleDraw(candle, 10, 1, { ...DEFAULT_FOOTPRINT_CONFIG });
    const layout = computeMagnifierLayout(prepared);

    expect(layout.canvasWidth).toBeGreaterThan(0);
    // Sane floor — must be wide enough to show two formatted numbers + padding.
    expect(layout.canvasWidth).toBeGreaterThanOrEqual(80);
  });

  it('clamps total height at MAGNIFIER_MAX_HEIGHT and row-merges when a candle has >40 levels', () => {
    const candle = buildCandleWithLevels(80, 1); // way more than 40 raw bins
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG };
    // prepareCandleDraw is called with mergeFactor=1 here (raw bins); the
    // magnifier layout itself decides whether further merging is needed to
    // fit within MAGNIFIER_MAX_HEIGHT — mirroring the FootprintLayer pattern
    // where mergeFactor is a rendering decision, not baked into the store.
    const prepared = prepareCandleDraw(candle, 1, 1, config);
    expect(prepared.merged.length).toBe(80); // sanity: no merge happened yet

    const layout = computeMagnifierLayout(prepared);

    expect(layout.canvasHeight).toBeLessThanOrEqual(MAGNIFIER_MAX_HEIGHT);
    // Row count must have shrunk (merged) to fit under the cap.
    expect(layout.rowCount).toBeLessThan(80);
    expect(layout.mergeFactor).toBeGreaterThan(1);
    expect([1, 2, 4]).toContain(layout.mergeFactor);
  });

  it('a candle with exactly 40 levels does not trigger merging (boundary case)', () => {
    const candle = buildCandleWithLevels(40, 1);
    const prepared = prepareCandleDraw(candle, 1, 1, { ...DEFAULT_FOOTPRINT_CONFIG });
    const layout = computeMagnifierLayout(prepared);

    // 40 rows at MAGNIFIER_ROW_HEIGHT must still fit — no merge required.
    if (40 * MAGNIFIER_ROW_HEIGHT + MAGNIFIER_TOTALS_BAND_HEIGHT <= MAGNIFIER_MAX_HEIGHT) {
      expect(layout.mergeFactor).toBe(1);
      expect(layout.rowCount).toBe(40);
    } else {
      // If the constants make 40 rows not fit, merging must have kicked in —
      // either way the height invariant holds.
      expect(layout.canvasHeight).toBeLessThanOrEqual(MAGNIFIER_MAX_HEIGHT);
    }
  });

  it('handles a candle with a single bin (no merging, minimum sane layout)', () => {
    const candle = buildCandleWithLevels(1, 10);
    const prepared = prepareCandleDraw(candle, 10, 1, { ...DEFAULT_FOOTPRINT_CONFIG });
    const layout = computeMagnifierLayout(prepared);

    expect(layout.rowCount).toBe(1);
    expect(layout.mergeFactor).toBe(1);
    expect(layout.canvasHeight).toBe(MAGNIFIER_ROW_HEIGHT + MAGNIFIER_TOTALS_BAND_HEIGHT);
  });
});

// ─── Magnifier draw path reuses prepareCandleDraw + drawCandleFootprint ─────

function createMockCtx() {
  const fillRectCalls: { x: number; y: number; w: number; h: number }[] = [];
  const fillTextCalls: { text: string; x: number; y: number }[] = [];
  const ctx = {
    fillRectCalls,
    fillTextCalls,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    fillRect: (x: number, y: number, w: number, h: number) => {
      fillRectCalls.push({ x, y, w, h });
    },
    fillText: (text: string, x: number, y: number) => {
      fillTextCalls.push({ text, x, y });
    },
    strokeRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
  } as unknown as CanvasRenderingContext2D & {
    fillRectCalls: typeof fillRectCalls;
    fillTextCalls: typeof fillTextCalls;
  };
  return ctx;
}

describe('Magnifier draw path — reuses prepareCandleDraw + drawCandleFootprint at fixed cell size', () => {
  it('paints non-zero fillRect/fillText calls for the hovered candle at "full" detail, using the layout dimensions', () => {
    const trades: FlowTrade[] = [];
    for (let i = 0; i < 50; i++) {
      const level = i % 6;
      trades.push({ time: i * 100, price: 100 + level * 10, qty: 1 + (i % 3), buyerAggressor: i % 2 === 0 });
    }
    const candle = buildCandle(trades, 60, 10);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, cellMode: 'bidAsk' };
    const prepared = prepareCandleDraw(candle, 10, 1, config);
    const layout = computeMagnifierLayout(prepared);

    const ctx = createMockCtx();
    const minBinPrice = Math.min(...prepared.merged.map((r) => r.binPrice));
    const groupSize = 10 * layout.mergeFactor;
    const priceToY = (price: number): number | null => {
      const rowsFromBottom = (price - minBinPrice) / groupSize;
      return layout.canvasHeight - MAGNIFIER_TOTALS_BAND_HEIGHT - rowsFromBottom * MAGNIFIER_ROW_HEIGHT;
    };

    const projection: CandleProjection = {
      centerX: layout.canvasWidth / 2,
      candleWidthPx: layout.canvasWidth,
      priceToY,
      rowHeightPx: MAGNIFIER_ROW_HEIGHT,
      rowSize: 10,
    };
    const extras: FootprintDrawExtras = {
      liveEdgeX: layout.canvasWidth,
      latestCandleRange: null,
      clipRightX: layout.canvasWidth,
    };

    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    expect(ctx.fillRectCalls.length).toBeGreaterThan(0);
    expect(ctx.fillTextCalls.length).toBeGreaterThan(0);
    for (const call of ctx.fillTextCalls) {
      expect(call.text.length).toBeGreaterThan(0);
    }
  });
});
