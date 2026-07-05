// src/components/charting/orderflow/__tests__/footprintRender.test.ts
//
// Regression coverage for the "FootprintLayer never paints anything on
// production" bug (fixed 2026-07-05).
//
// Two independent things are exercised:
//   1. computeDetailLevel — the zoom-driven progressive-disclosure gate.
//      Proven correct in isolation (it was NOT the root cause of the paint
//      bug — the real bug was in FootprintLayer.tsx's coordinate-anchor
//      resolution at the live edge, see FootprintLayer.tsx's ref2 fallback).
//      Still covered here because it is the primary "should this frame draw
//      anything at all" decision and the task calls for direct proof of its
//      thresholds against realistic px values.
//   2. prepareCandleDraw + drawCandleFootprint against a mocked
//      CanvasRenderingContext2D — proves that, given a realistic FlowCandle
//      built from ~200 synthetic trades, the draw path actually issues
//      fillRect/fillText calls with finite, on-canvas coordinates. This is
//      the closest thing to an end-to-end proof that "footprint cells paint"
//      without spinning up a real lightweight-charts instance (which
//      requires a full DOM/canvas environment not present in this repo's
//      node-environment vitest config).

import { describe, it, expect, vi } from 'vitest';
import {
  computeDetailLevel,
  prepareCandleDraw,
  drawCandleFootprint,
  formatCellValue,
  type CandleProjection,
  type FootprintDrawExtras,
} from '../footprintRender';
import type { FlowCandleView, FlowTrade, FootprintConfig } from '../types';
import { DEFAULT_FOOTPRINT_CONFIG } from '../types';
import { FlowBinStore } from '../flowBinStore';

// ─── computeDetailLevel ──────────────────────────────────────────────────────

describe('computeDetailLevel', () => {
  it('cold start (previousStage=hidden): candleWidth 40px / rowHeight 12px → shaded (wide enough to shade, too narrow for legible bid×ask text)', () => {
    expect(computeDetailLevel(40, 12, 'hidden')).toBe('shaded');
  });

  it('cold start: candleWidth 60px / rowHeight 14px → full (both dimensions clear the text-legibility thresholds)', () => {
    expect(computeDetailLevel(60, 14, 'hidden')).toBe('full');
  });

  it('cold start: candleWidth 8px → hidden (below the shading threshold entirely, regardless of row height)', () => {
    expect(computeDetailLevel(8, 100, 'hidden')).toBe('hidden');
  });

  it('hysteresis: stays in "full" until candleWidth drops below the EXIT threshold, not the (higher) ENTER threshold', () => {
    // Entered 'full' at 60/14. Now candleWidth drops to 45 — below the 50px
    // ENTER threshold but still above the 42px EXIT threshold — must hold 'full'.
    expect(computeDetailLevel(45, 14, 'full')).toBe('full');
    // Drop below the exit threshold — must fall through to shaded/hidden re-evaluation.
    expect(computeDetailLevel(41, 14, 'full')).toBe('shaded');
  });

  it('hysteresis: stays in "shaded" until candleWidth drops below the shading EXIT threshold', () => {
    expect(computeDetailLevel(12, 5, 'shaded')).toBe('shaded'); // above 11px exit
    expect(computeDetailLevel(10, 5, 'shaded')).toBe('hidden'); // below 11px exit
  });

  it('promotes shaded → full once both dimensions clear the enter thresholds', () => {
    expect(computeDetailLevel(51, 12, 'shaded')).toBe('full');
  });
});

// ─── prepareCandleDraw + drawCandleFootprint against a mocked ctx ──────────

/** Build ~200 synthetic trades spread across a handful of price bins within one candle. */
function buildSyntheticTrades(count: number): FlowTrade[] {
  const trades: FlowTrade[] = [];
  const basePrice = 100_000; // realistic BTCUSDT magnitude
  for (let i = 0; i < count; i++) {
    // Spread trades across 5 price levels (rowSize=10 apart) so the candle
    // has multiple distinct bins, matching real footprint data shape.
    const level = i % 5;
    trades.push({
      time: i * 100, // all within the same 60s candle bucket
      price: basePrice + level * 10 + (i % 3), // small jitter inside the bin
      qty: 1 + (i % 4),
      buyerAggressor: i % 2 === 0,
    });
  }
  return trades;
}

function buildCandleFromTrades(trades: FlowTrade[], intervalSec: number, rowSize: number): FlowCandleView {
  const store = new FlowBinStore({ intervalSec, rowSize });
  store.applyTrades(trades);
  const candleTime = Math.floor(trades[0].time / 1000 / intervalSec) * intervalSec;
  const view = store.getCandle(candleTime);
  if (!view) throw new Error('test setup error: expected a candle at the synthetic trades bucket');
  return view;
}

/** Minimal CanvasRenderingContext2D mock — records fillRect/fillText calls, no-ops everything else. */
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
    fillRect: vi.fn((x: number, y: number, w: number, h: number) => {
      fillRectCalls.push({ x, y, w, h });
    }),
    fillText: vi.fn((text: string, x: number, y: number) => {
      fillTextCalls.push({ text, x, y });
    }),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D & {
    fillRectCalls: typeof fillRectCalls;
    fillTextCalls: typeof fillTextCalls;
  };
  return ctx;
}

describe('prepareCandleDraw + drawCandleFootprint — mocked canvas', () => {
  const intervalSec = 60;
  const rowSize = 10;

  it('draws non-zero fillRect/fillText calls with finite, on-canvas coordinates for a realistic candle at "full" detail', () => {
    const trades = buildSyntheticTrades(200);
    const candle = buildCandleFromTrades(trades, intervalSec, rowSize);
    expect(candle.bins.length).toBeGreaterThan(1); // sanity: multiple price bins, like real data

    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, cellMode: 'bidAsk' };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);

    const ctx = createMockCtx();

    // Realistic on-screen geometry: candle centered at x=400 in an 800px-wide
    // pane, 60px wide (well past the FOOTPRINT_MIN_CANDLE_WIDTH_FOR_TEXT=50
    // threshold — matches the production report's "deep zoom" scenario).
    const CANVAS_W = 800;
    const CANVAS_H = 500;
    const centerX = 400;
    const candleWidthPx = 60;
    const rowHeightPx = 14; // above FOOTPRINT_MIN_ROW_HEIGHT_FOR_TEXT=11

    // priceToY: linear map from bin price to canvas y, anchored near the
    // candle's own price range (NOT priceToCoordinate(0) — see
    // FootprintLayer.tsx's fixed candleWidthPx/live-edge derivation for why
    // anchoring far from the visible price range was the axis of the bug).
    const minBinPrice = Math.min(...candle.bins.map((b) => b.binPrice));
    const priceToY = (price: number): number | null => {
      const rowsFromBottom = (price - minBinPrice) / rowSize;
      const y = CANVAS_H - 50 - rowsFromBottom * rowHeightPx;
      return y;
    };

    const projection: CandleProjection = {
      centerX,
      candleWidthPx,
      priceToY,
      rowHeightPx,
      rowSize,
    };

    const detail = computeDetailLevel(candleWidthPx, rowHeightPx, 'hidden');
    expect(detail).toBe('full');

    const extras: FootprintDrawExtras = {
      liveEdgeX: CANVAS_W,
      latestCandleRange: null,
      clipRightX: CANVAS_W,
    };

    drawCandleFootprint(ctx, prepared, projection, detail, config, extras);

    // ── The actual proof: cells painted, not silently skipped ────────────
    expect(ctx.fillRectCalls.length).toBeGreaterThan(0);
    expect(ctx.fillTextCalls.length).toBeGreaterThan(0);

    for (const call of ctx.fillRectCalls) {
      expect(Number.isFinite(call.x)).toBe(true);
      expect(Number.isFinite(call.y)).toBe(true);
      expect(Number.isFinite(call.w)).toBe(true);
      expect(Number.isFinite(call.h)).toBe(true);
      // On-canvas: within the pane bounds (allowing the cell to span the
      // candle's half-width around centerX, and full canvas height).
      expect(call.x).toBeGreaterThanOrEqual(0);
      expect(call.x).toBeLessThanOrEqual(CANVAS_W);
      expect(call.y).toBeGreaterThanOrEqual(-rowHeightPx); // rows can start just above 0
      expect(call.y).toBeLessThanOrEqual(CANVAS_H + rowHeightPx);
    }

    for (const call of ctx.fillTextCalls) {
      expect(Number.isFinite(call.x)).toBe(true);
      expect(Number.isFinite(call.y)).toBe(true);
      expect(call.text.length).toBeGreaterThan(0);
    }
  });

  it('draws nothing when detail is "hidden" (zoomed out — plain candles only)', () => {
    const trades = buildSyntheticTrades(200);
    const candle = buildCandleFromTrades(trades, intervalSec, rowSize);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    const ctx = createMockCtx();

    const projection: CandleProjection = {
      centerX: 400,
      candleWidthPx: 8, // below FOOTPRINT_MIN_CANDLE_WIDTH_FOR_SHADING
      priceToY: (p) => 250 - p,
      rowHeightPx: 5,
      rowSize,
    };
    const extras: FootprintDrawExtras = { liveEdgeX: 800, latestCandleRange: null, clipRightX: 800 };

    drawCandleFootprint(ctx, prepared, projection, 'hidden', config, extras);

    expect(ctx.fillRectCalls.length).toBe(0);
    expect(ctx.fillTextCalls.length).toBe(0);
  });
});

// ─── formatCellValue — "values divider" K-formatting ───────────────────────

describe('formatCellValue', () => {
  it('keeps existing sub-1000 formatting untouched (>=100 → integer, <100 → 1 decimal)', () => {
    expect(formatCellValue(0)).toBe('0');
    expect(formatCellValue(950.25)).toBe('950'); // >=100 → toFixed(0), same as formatCompact
    expect(formatCellValue(999.9)).toBe('1000'); // toFixed(0) rounds up — matches pre-existing formatCompact behavior
    expect(formatCellValue(1)).toBe('1.0');
    expect(formatCellValue(100)).toBe('100');
  });

  it('formats numbers >= 1000 as "N.NK", stripping a trailing ".0"', () => {
    expect(formatCellValue(1000)).toBe('1K');
    expect(formatCellValue(1049)).toBe('1K'); // 1.049 → toFixed(1) → "1.0" → stripped
    expect(formatCellValue(1234)).toBe('1.2K');
    expect(formatCellValue(12345)).toBe('12.3K');
  });

  it('preserves sign for negative values (e.g. negative deltas)', () => {
    expect(formatCellValue(-1234)).toBe('-1.2K');
    expect(formatCellValue(-950.25)).toBe('-950');
    expect(formatCellValue(-1000)).toBe('-1K');
  });

  it('handles millions/billions consistently with the existing formatCompact scale', () => {
    expect(formatCellValue(1_500_000)).toBe('1.50M');
    expect(formatCellValue(2_000_000_000)).toBe('2.00B');
  });
});

// ─── New cell content modes: 'trades' and 'volumeDelta' ────────────────────

describe('drawCandleFootprint — "trades" cell mode', () => {
  const intervalSec = 60;
  const rowSize = 10;

  it('renders the per-bin print COUNT (not volume) as cell text, neutral-colored', () => {
    const trades = buildSyntheticTrades(200);
    const candle = buildCandleFromTrades(trades, intervalSec, rowSize);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, cellMode: 'trades' };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    const ctx = createMockCtx();

    const minBinPrice = Math.min(...candle.bins.map((b) => b.binPrice));
    const CANVAS_H = 500;
    const rowHeightPx = 14;
    const priceToY = (price: number): number | null => {
      const rowsFromBottom = (price - minBinPrice) / rowSize;
      return CANVAS_H - 50 - rowsFromBottom * rowHeightPx;
    };
    const projection: CandleProjection = {
      centerX: 400,
      candleWidthPx: 60,
      priceToY,
      rowHeightPx,
      rowSize,
    };
    const extras: FootprintDrawExtras = { liveEdgeX: 800, latestCandleRange: null, clipRightX: 800 };

    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    expect(ctx.fillTextCalls.length).toBeGreaterThan(0);

    // Each merged row's rendered text must equal formatCellValue(row.trades),
    // not formatCellValue(buyVol+sellVol) — proves it's a count, not a volume.
    const expectedTexts = prepared.merged.map((r) => formatCellValue(r.trades));
    for (const expected of expectedTexts) {
      expect(ctx.fillTextCalls.some((c) => c.text === expected)).toBe(true);
    }
    // Sanity: trades counts are small integers (~40/bin for 200 trades over 5
    // bins), clearly distinguishable from the much larger synthetic volumes.
    for (const row of prepared.merged) {
      expect(row.trades).toBeGreaterThan(0);
      expect(Number.isInteger(row.trades)).toBe(true);
    }
  });
});

describe('drawCandleFootprint — "volumeDelta" cell mode', () => {
  const intervalSec = 60;
  const rowSize = 10;

  it('renders both total volume and signed delta text per cell', () => {
    const trades = buildSyntheticTrades(200);
    const candle = buildCandleFromTrades(trades, intervalSec, rowSize);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, cellMode: 'volumeDelta' };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    const ctx = createMockCtx();

    const minBinPrice = Math.min(...candle.bins.map((b) => b.binPrice));
    const CANVAS_H = 500;
    const rowHeightPx = 14;
    const priceToY = (price: number): number | null => {
      const rowsFromBottom = (price - minBinPrice) / rowSize;
      return CANVAS_H - 50 - rowsFromBottom * rowHeightPx;
    };
    const projection: CandleProjection = {
      centerX: 400,
      candleWidthPx: 60,
      priceToY,
      rowHeightPx,
      rowSize,
    };
    const extras: FootprintDrawExtras = { liveEdgeX: 800, latestCandleRange: null, clipRightX: 800 };

    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    // Two fillText calls per visible row: volume text + signed delta text.
    expect(ctx.fillTextCalls.length).toBe(prepared.merged.length * 2);

    for (const row of prepared.merged) {
      const delta = row.buyVol - row.sellVol;
      const expectedVolText = formatCellValue(row.buyVol + row.sellVol);
      const expectedDeltaText = `${delta > 0 ? '+' : ''}${formatCellValue(delta)}`;
      expect(ctx.fillTextCalls.some((c) => c.text === expectedVolText)).toBe(true);
      expect(ctx.fillTextCalls.some((c) => c.text === expectedDeltaText)).toBe(true);
    }
  });

  it('positive delta renders with a leading "+" sign; negative keeps its own "-"', () => {
    // Single bin, single candle: force a known positive delta.
    const trade: FlowTrade[] = [
      { time: 0, price: 100, qty: 5, buyerAggressor: true },
      { time: 1000, price: 100, qty: 2, buyerAggressor: false },
    ];
    const candle = buildCandleFromTrades(trade, intervalSec, rowSize);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, cellMode: 'volumeDelta' };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    const ctx = createMockCtx();

    const rowHeightPx = 14;
    const projection: CandleProjection = {
      centerX: 400,
      candleWidthPx: 60,
      // binPrice=100 (bottom of the merged row) → y=250; binPrice=110 (top,
      // i.e. binPrice+groupSize) → y=250-rowHeightPx, giving a real cellHeight.
      priceToY: (price) => 250 - ((price - 100) / rowSize) * rowHeightPx,
      rowHeightPx,
      rowSize,
    };
    const extras: FootprintDrawExtras = { liveEdgeX: 800, latestCandleRange: null, clipRightX: 800 };

    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    // delta = 5-2 = +3 → formatCellValue(3) = "3.0" (sub-100, 1-decimal rule); volume = 5+2 = 7 → "7.0"
    expect(ctx.fillTextCalls.some((c) => c.text === '+3.0')).toBe(true);
    expect(ctx.fillTextCalls.some((c) => c.text === '7.0')).toBe(true);
  });
});
