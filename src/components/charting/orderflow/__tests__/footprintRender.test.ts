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
  computeRowMergeFactor,
  computeCellFontSize,
  computeFootprintBandHeightPx,
  getEnabledStatsRowDefs,
  histogramBarWidth,
  prepareCandleDraw,
  drawCandleFootprint,
  formatCellValue,
  resolveAutoTransformDetail,
  FOOTPRINT_TOTALS_BAND_HEIGHT,
  type CandleProjection,
  type FootprintDrawExtras,
} from '../footprintRender';
import { computeValueArea } from '../valueArea';
import { computeVolumeProfile } from '../volumeProfile';
import type { FlowCandleView, FlowTrade, FootprintConfig } from '../types';
import { DEFAULT_FOOTPRINT_CONFIG } from '../types';
import { FlowBinStore } from '../flowBinStore';
import {
  FOOTPRINT_AUTO_ROW_HEIGHT_MAX,
  FOOTPRINT_AUTO_ROW_HEIGHT_MIN,
  FOOTPRINT_BUY_COLOR,
  FOOTPRINT_BUY_COLOR_BRIGHT,
  FOOTPRINT_SELL_COLOR,
  FOOTPRINT_SELL_COLOR_BRIGHT,
  FOOTPRINT_NEUTRAL_TEXT,
  FOOTPRINT_CELL_GUTTER_PX,
  FOOTPRINT_CELL_FONT_MIN,
  FOOTPRINT_CELL_FONT_MAX,
  FOOTPRINT_BUY_BG_STRONG,
  FOOTPRINT_HISTO_BUY_FILL,
  FOOTPRINT_HISTO_NEUTRAL_FILL,
  FOOTPRINT_HISTO_SELL_FILL,
  FOOTPRINT_STACKED_BUY_BAND,
  FOOTPRINT_STACKED_BUY_BAND_BORDER,
  FOOTPRINT_STACKED_SELL_BAND_BORDER,
  FOOTPRINT_SOLID_SCHEME_BG,
  FOOTPRINT_VOLUME_HEAT_STRONG_ALPHA,
  FOOTPRINT_SKELETON_BODY_FILL_ALPHA,
  FOOTPRINT_SKELETON_BODY_WIDTH_PX,
  FOOTPRINT_SKELETON_WICK_ALPHA,
} from '../footprintTheme';

// ─── computeDetailLevel ──────────────────────────────────────────────────────

// ─── resolveAutoTransformDetail ──────────────────────────────────────────────

describe('resolveAutoTransformDetail', () => {
  it('returns "full" only once candle width and row height can fit text', () => {
    expect(resolveAutoTransformDetail(50, 20, 11)).toBe('full');
    expect(resolveAutoTransformDetail(60, 20, 14)).toBe('full');
  });

  it('returns "hidden" below minPx', () => {
    expect(resolveAutoTransformDetail(19.9, 20)).toBe('hidden');
    expect(resolveAutoTransformDetail(0, 20)).toBe('hidden');
  });

  it('returns "shaded" between the reveal width and safe text dimensions', () => {
    expect(resolveAutoTransformDetail(20, 20, 11)).toBe('shaded');
    expect(resolveAutoTransformDetail(50, 20, 10.9)).toBe('shaded');
  });
});

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

// ─── computeRowMergeFactor — Auto row-density targeting (Step 1: Ladder foundation) ──
//
// Regression coverage for the giant-rows defect: an earlier version derived
// "available height" as `binCount * rowHeightPx`, which made the function's
// internal naive-row-height calculation cancel back out to exactly
// `rowHeightPx` regardless of `binCount` — merging could never actually
// react to the store's real per-row pixel height. These tests exercise the
// fixed contract directly: `baseRowHeightPx` is the ACTUAL single-row height
// at the current zoom, and the function must pick the smallest factor whose
// resulting merged-row height clears FOOTPRINT_AUTO_ROW_HEIGHT_MIN.

describe('computeRowMergeFactor — Auto row-density targeting', () => {
  it('factor=1 when the base row height already clears the target band minimum', () => {
    // Representative "healthy" projection: 18px/row at rowSize=1x — no merge needed.
    expect(computeRowMergeFactor(18, 20)).toBe(1);
    expect(computeRowMergeFactor(FOOTPRINT_AUTO_ROW_HEIGHT_MIN, 20)).toBe(1);
  });

  it('factor=2 when the base row is too short for 1x but 2x lands in the target band', () => {
    // 8px/row * 2 = 16px — inside [14, 22].
    expect(computeRowMergeFactor(8, 25)).toBe(2);
  });

  it('factor=4 when even 2x would stay below the minimum', () => {
    // 3px/row * 2 = 6px (still short) → escalate to 4x = 12px... still short of
    // 14, but 4 is the maximum coarsening factor (matches the existing 1/2/4
    // system) — proves the function never returns anything outside {1,2,4}.
    const factor = computeRowMergeFactor(3, 40);
    expect(factor).toBe(4);
  });

  it('degenerate inputs (no bins / zero row height) default to factor 1, never throw', () => {
    expect(computeRowMergeFactor(18, 0)).toBe(1);
    expect(computeRowMergeFactor(0, 20)).toBe(1);
    expect(computeRowMergeFactor(-5, 20)).toBe(1);
  });

  it('representative BTC 15m @ barSpacing≈70px projections land inside the 14-22px target band', () => {
    // These are the kind of base-row-heights a coarse rowSize would produce
    // BEFORE any merging is applied at various zoom levels — proves that for
    // realistic inputs, the CHOSEN factor's resulting row height is inside
    // (or as close as the discrete 1/2/4 stepping allows to) the target band.
    const representativeBaseHeights = [4, 6, 7.5, 9, 11, 13, 15, 18, 21];
    for (const base of representativeBaseHeights) {
      const factor = computeRowMergeFactor(base, 20);
      const resultHeight = base * factor;
      // The function's contract: never pick a LARGER factor than necessary —
      // resultHeight must be the smallest of {base*1, base*2, base*4} that
      // clears the minimum (or base*4 if none clear it, per the discrete
      // stepping). It must always clear the minimum once achievable at all.
      if (base * 4 >= FOOTPRINT_AUTO_ROW_HEIGHT_MIN) {
        expect(resultHeight).toBeGreaterThanOrEqual(FOOTPRINT_AUTO_ROW_HEIGHT_MIN);
      }
      // No factor is ever chosen needlessly large: halving factor (if >1)
      // must NOT also have cleared the minimum (else that smaller factor
      // should have been picked instead).
      if (factor > 1) {
        expect(base * (factor / 2)).toBeLessThan(FOOTPRINT_AUTO_ROW_HEIGHT_MIN);
      }
    }
    // Sanity: at least one of these representative heights actually lands
    // WITHIN the [MIN, MAX] band after merging (proves the band is reachable
    // for realistic inputs, not just theoretically satisfiable).
    const landedInBand = representativeBaseHeights.some((base) => {
      const factor = computeRowMergeFactor(base, 20);
      const h = base * factor;
      return h >= FOOTPRINT_AUTO_ROW_HEIGHT_MIN && h <= FOOTPRINT_AUTO_ROW_HEIGHT_MAX;
    });
    expect(landedInBand).toBe(true);
  });

  it('hysteresis: holds the previous factor while its merged height stays within the hysteresis margin, even if a cold-start call would pick differently', () => {
    // Cold start at base=8 → factor 2 (16px, in-band).
    const coldFactor = computeRowMergeFactor(8, 20);
    expect(coldFactor).toBe(2);

    // Zoom drifts slightly: base drops to 6px. A cold-start call at 6px would
    // pick factor 4 (6*2=12 < 14 → escalate). But WITH hysteresis and the
    // previous factor of 2, held height = 6*2 = 12, which is still within
    // [MIN - hysteresis, ∞) = [11, ∞) — so it must HOLD at 2, not flicker to 4.
    const heldFactor = computeRowMergeFactor(6, 20, coldFactor);
    expect(heldFactor).toBe(2);

    // But once base drops far enough that even the hysteresis margin can't
    // save the held factor (base=4 → held height 4*2=8, well below 11), it
    // must escalate.
    const escalatedFactor = computeRowMergeFactor(4, 20, coldFactor);
    expect(escalatedFactor).toBe(4);
  });
});

// ─── Empty (zero-volume) rows paint NO fill in ANY cell mode ────────────────
//
// ATAS parity: a price level with no prints at all shows the chart
// background through it, not a neutral/red/green wash. Regression coverage
// for the "whole column washed with color" defect (bidAsk mode previously
// painted a fixed-alpha red/green half for every row, including empty ones).

describe('drawCandleFootprint — empty rows produce zero fill calls', () => {
  const rowSize = 10;

  /** A single-bin candle (one real trade) merged so an ADJACENT empty price level exists as its own row. */
  function buildCandleWithGap(): FlowCandleView {
    const store = new FlowBinStore({ intervalSec: 60, rowSize });
    store.applyTrades([
      { time: 0, price: 100, qty: 5, buyerAggressor: true },
      { time: 1000, price: 130, qty: 3, buyerAggressor: false },
    ]);
    const candle = store.getCandle(0);
    if (!candle) throw new Error('test setup error');
    return candle;
  }

  function drawWithSyntheticEmptyRow(cellMode: FootprintConfig['cellMode']) {
    const candle = buildCandleWithGap();
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, cellMode };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);

    // Inject a synthetic zero-volume row into the merged set — the real
    // store never emits a bin for a price level with no prints, but a wide
    // merge group CAN span an empty sub-range (sparse tape), so the
    // draw-time contract must hold regardless of how the empty row arose.
    prepared.merged.push({ binPrice: 999_999, buyVol: 0, sellVol: 0, trades: 0 });
    // Keep imbalances array in sync (drawCandleFootprint indexes it by row position).
    prepared.imbalances.push({ side: null, highlighted: false });

    const ctx = createMockCtx();
    const rowHeightPx = 18;
    const priceToY = (price: number): number | null => {
      if (price === 999_999 + rowSize) return 40; // top of the synthetic empty row
      if (price === 999_999) return 40 + rowHeightPx; // bottom of the synthetic empty row
      const minBinPrice = 100;
      const rowsFromBottom = (price - minBinPrice) / rowSize;
      return 400 - rowsFromBottom * rowHeightPx;
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
    return ctx;
  }

  it('bidAsk mode: the synthetic empty row contributes zero fillRect calls at its own coordinates', () => {
    const ctx = drawWithSyntheticEmptyRow('bidAsk');
    // The empty row's cell spans y in [40, 58]. No fillRect call should ever
    // target that exact top (its background half-fills would start at y=40).
    const fillsAtEmptyRow = ctx.fillRectCalls.filter((c) => c.y === 40);
    expect(fillsAtEmptyRow.length).toBe(0);
  });

  it('delta mode: the synthetic empty row contributes zero fillRect calls', () => {
    const ctx = drawWithSyntheticEmptyRow('delta');
    const fillsAtEmptyRow = ctx.fillRectCalls.filter((c) => c.y === 40);
    expect(fillsAtEmptyRow.length).toBe(0);
  });

  it('volume mode: the synthetic empty row contributes zero fillRect calls', () => {
    const ctx = drawWithSyntheticEmptyRow('volume');
    const fillsAtEmptyRow = ctx.fillRectCalls.filter((c) => c.y === 40);
    expect(fillsAtEmptyRow.length).toBe(0);
  });

  it('trades mode: the synthetic empty row contributes zero fillRect calls', () => {
    const ctx = drawWithSyntheticEmptyRow('trades');
    const fillsAtEmptyRow = ctx.fillRectCalls.filter((c) => c.y === 40);
    expect(fillsAtEmptyRow.length).toBe(0);
  });

  it('volumeDelta mode: the synthetic empty row contributes zero fillRect calls', () => {
    const ctx = drawWithSyntheticEmptyRow('volumeDelta');
    const fillsAtEmptyRow = ctx.fillRectCalls.filter((c) => c.y === 40);
    expect(fillsAtEmptyRow.length).toBe(0);
  });

  it('non-empty rows in the same draw call DO still paint (proves the guard is row-scoped, not a global "cellMode broken" regression)', () => {
    const ctx = drawWithSyntheticEmptyRow('bidAsk');
    expect(ctx.fillRectCalls.length).toBeGreaterThan(0);
  });
});

// ─── bidAsk mode: volume-keyed alpha replaces the old fixed 0.16 halves ─────

describe('drawCandleFootprint — bidAsk mode alpha scales with row volume', () => {
  const intervalSec = 60;
  const rowSize = 10;

  it('a heavier row (more total volume) renders a higher-alpha fill than a lighter row', () => {
    // Two distinct bins with deliberately different total volume, so
    // maxRowVol > 0 and the two rows land at different points on the
    // volume-magnitude curve.
    const trades: FlowTrade[] = [
      { time: 0, price: 100, qty: 1, buyerAggressor: true }, // light row: vol=1
      { time: 1000, price: 110, qty: 20, buyerAggressor: true }, // heavy row: vol=20
    ];
    const store = new FlowBinStore({ intervalSec, rowSize });
    store.applyTrades(trades);
    const candle = store.getCandle(0);
    if (!candle) throw new Error('test setup error');

    // showPoc disabled — otherwise the busiest row (heavy, vol=20) also
    // draws the gold POC band fillRect at the SAME (x, y) as its bidAsk
    // half-fill, which would confound the alpha this test is isolating.
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, cellMode: 'bidAsk', showPoc: false };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    expect(prepared.merged.length).toBe(2);

    const rowHeightPx = 18;
    const priceToY = (price: number): number | null => {
      const rowsFromBottom = (price - 100) / rowSize;
      return 400 - rowsFromBottom * rowHeightPx;
    };
    const projection: CandleProjection = {
      centerX: 400,
      candleWidthPx: 60,
      priceToY,
      rowHeightPx,
      rowSize,
    };
    const extras: FootprintDrawExtras = { liveEdgeX: 800, latestCandleRange: null, clipRightX: 800 };

    // fillStyle-aware mock: real Canvas2D reads fillStyle AT fillRect() call
    // time, so a plain call-log mock (createMockCtx) can't recover which
    // alpha was used per row — createStyledMockCtx() snapshots it.
    const styledCtx = createStyledMockCtx();
    drawCandleFootprint(styledCtx, prepared, projection, 'full', config, extras);

    // Match the BUY-side half-fill specifically (x === midX, i.e. width
    // equal to half the candle width) — with showPoc off, this is the only
    // fillRect issued at each row's top.
    const rowAlphas = prepared.merged.map((row) => {
      const yTop = priceToY(row.binPrice + rowSize)!;
      const yBot = priceToY(row.binPrice)!;
      const top = Math.min(yTop, yBot);
      const call = styledCtx.styledFillRectCalls.find(
        (c) => Math.abs(c.y - top) < 0.01 && c.w < 60, // half-width fill, not a full-width one
      );
      expect(call).toBeDefined();
      const alphaMatch = call!.fillStyle.match(/rgba\([^)]+,\s*([\d.]+)\)/);
      expect(alphaMatch).not.toBeNull();
      return { rowVol: row.buyVol + row.sellVol, alpha: parseFloat(alphaMatch![1]) };
    });

    const light = rowAlphas.find((r) => r.rowVol === 1)!;
    const heavy = rowAlphas.find((r) => r.rowVol === 20)!;
    expect(heavy.alpha).toBeGreaterThan(light.alpha);
    // Both must fall within the theme's weak/strong endpoints (0.16-0.32).
    expect(light.alpha).toBeGreaterThanOrEqual(0.16);
    expect(heavy.alpha).toBeLessThanOrEqual(0.32);
  });

  it('the busiest row in the candle (rowVol === maxRowVol) renders at exactly the strong (0.32) endpoint', () => {
    const trades: FlowTrade[] = [
      { time: 0, price: 100, qty: 1, buyerAggressor: true },
      { time: 1000, price: 110, qty: 10, buyerAggressor: true }, // this bin is maxRowVol
    ];
    const store = new FlowBinStore({ intervalSec, rowSize });
    store.applyTrades(trades);
    const candle = store.getCandle(0)!;
    // showPoc disabled — see note in the previous test: the busiest row is
    // also the POC row, whose gold-band fillRect would land at the same
    // (x, y) as the bidAsk half-fill this test is isolating.
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, cellMode: 'bidAsk', showPoc: false };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);

    const styledCtx = createStyledMockCtx();
    const rowHeightPx = 18;
    const priceToY = (price: number): number | null => 400 - ((price - 100) / rowSize) * rowHeightPx;
    const projection: CandleProjection = { centerX: 400, candleWidthPx: 60, priceToY, rowHeightPx, rowSize };
    const extras: FootprintDrawExtras = { liveEdgeX: 800, latestCandleRange: null, clipRightX: 800 };

    drawCandleFootprint(styledCtx, prepared, projection, 'full', config, extras);

    const maxRow = prepared.merged.reduce((a, b) => (a.buyVol + a.sellVol > b.buyVol + b.sellVol ? a : b));
    const yTop = priceToY(maxRow.binPrice + rowSize)!;
    const yBot = priceToY(maxRow.binPrice)!;
    const top = Math.min(yTop, yBot);
    const call = styledCtx.styledFillRectCalls.find(
      (c) => Math.abs(c.y - top) < 0.01 && c.w < 60, // half-width buy/sell fill, not a full-width one
    );
    expect(call).toBeDefined();
    const alphaMatch = call!.fillStyle.match(/rgba\([^)]+,\s*([\d.]+)\)/);
    expect(parseFloat(alphaMatch![1])).toBeCloseTo(0.32, 5);
  });
});

/**
 * fillStyle-aware canvas mock — snapshots ctx.fillStyle AT THE MOMENT
 * fillRect is called (mirrors real Canvas2D semantics: fillStyle is read at
 * draw time, not bound to the call). Needed for the bidAsk alpha tests above
 * since the plain createMockCtx() only records geometry, not style.
 */
function createStyledMockCtx() {
  const styledFillRectCalls: { x: number; y: number; w: number; h: number; fillStyle: string }[] = [];
  const state = { fillStyle: '' as string };
  const ctx = {
    styledFillRectCalls,
    get fillStyle() { return state.fillStyle; },
    set fillStyle(v: string) { state.fillStyle = v; },
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    fillRect: vi.fn((x: number, y: number, w: number, h: number) => {
      styledFillRectCalls.push({ x, y, w, h, fillStyle: state.fillStyle });
    }),
    fillText: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D & {
    styledFillRectCalls: typeof styledFillRectCalls;
  };
  return ctx;
}

// ─── Text & emphasis pass (Step 2): neutral bidAsk text, imbalance bold+bright,
// removed gold outline, gutter inset, auto font size ─────────────────────────

/**
 * Full-fidelity canvas mock — snapshots fillStyle/font/textAlign AT EACH
 * fillText call, and records every strokeRect call with its strokeStyle at
 * call time. Needed to prove (a) which color/weight rendered for a given
 * cell's text, and (b) that no gold imbalance-outline stroke is ever issued.
 */
function createFullMockCtx() {
  const fillTextCalls: { text: string; x: number; y: number; fillStyle: string; font: string; textAlign: CanvasTextAlign }[] = [];
  const strokeRectCalls: { x: number; y: number; w: number; h: number; strokeStyle: string }[] = [];
  const fillRectCalls: { x: number; y: number; w: number; h: number; fillStyle: string }[] = [];
  const state = { fillStyle: '' as string, strokeStyle: '' as string, font: '', textAlign: 'left' as CanvasTextAlign };
  const ctx = {
    fillTextCalls,
    strokeRectCalls,
    fillRectCalls,
    get fillStyle() { return state.fillStyle; },
    set fillStyle(v: string) { state.fillStyle = v; },
    get strokeStyle() { return state.strokeStyle; },
    set strokeStyle(v: string) { state.strokeStyle = v; },
    get font() { return state.font; },
    set font(v: string) { state.font = v; },
    get textAlign() { return state.textAlign; },
    set textAlign(v: CanvasTextAlign) { state.textAlign = v; },
    lineWidth: 1,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    fillRect: vi.fn((x: number, y: number, w: number, h: number) => {
      fillRectCalls.push({ x, y, w, h, fillStyle: state.fillStyle });
    }),
    fillText: vi.fn((text: string, x: number, y: number) => {
      fillTextCalls.push({ text, x, y, fillStyle: state.fillStyle, font: state.font, textAlign: state.textAlign });
    }),
    strokeRect: vi.fn((x: number, y: number, w: number, h: number) => {
      strokeRectCalls.push({ x, y, w, h, strokeStyle: state.strokeStyle });
    }),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D & {
    fillTextCalls: typeof fillTextCalls;
    strokeRectCalls: typeof strokeRectCalls;
    fillRectCalls: typeof fillRectCalls;
  };
  return ctx;
}

/** Build a single-candle bidAsk projection at a given rowHeightPx — shared by the tests below. */
function buildBidAskFixture(rowHeightPx: number, trades: FlowTrade[]) {
  const intervalSec = 60;
  const rowSize = 10;
  const store = new FlowBinStore({ intervalSec, rowSize });
  store.applyTrades(trades);
  const candle = store.getCandle(0);
  if (!candle) throw new Error('test setup error: expected a candle at time 0');

  const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, cellMode: 'bidAsk', showPoc: false };
  const prepared = prepareCandleDraw(candle, rowSize, 1, config);

  const priceToY = (price: number): number | null => 400 - ((price - 100) / rowSize) * rowHeightPx;
  const projection: CandleProjection = {
    centerX: 400,
    candleWidthPx: 60,
    priceToY,
    rowHeightPx,
    rowSize,
  };
  const extras: FootprintDrawExtras = { liveEdgeX: 800, latestCandleRange: null, clipRightX: 800 };

  return { prepared, projection, config, extras };
}

describe('drawCandleFootprint — bidAsk regular numbers use neutral text', () => {
  it('a non-imbalanced row renders both bid and ask numbers in FOOTPRINT_NEUTRAL_TEXT, not directional green/red', () => {
    // Two mild, roughly balanced levels — ratio well under the imbalance
    // threshold, so neither row should ever be flagged imbalanced.
    const trades: FlowTrade[] = [
      { time: 0, price: 100, qty: 5, buyerAggressor: true },
      { time: 100, price: 100, qty: 5, buyerAggressor: false },
      { time: 200, price: 110, qty: 5, buyerAggressor: true },
      { time: 300, price: 110, qty: 5, buyerAggressor: false },
    ];
    const { prepared, projection, config, extras } = buildBidAskFixture(18, trades);
    expect(prepared.imbalances.every((i) => !i.highlighted)).toBe(true);

    const ctx = createFullMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    expect(ctx.fillTextCalls.length).toBeGreaterThan(0);
    for (const call of ctx.fillTextCalls) {
      expect(call.fillStyle).toBe(FOOTPRINT_NEUTRAL_TEXT);
      // Non-imbalanced text must never be bold.
      expect(call.font.startsWith('bold ')).toBe(false);
    }
  });
});

describe('drawCandleFootprint — imbalanced row: bold + bright winning-side number, no gold stroke', () => {
  it('buy-side imbalance: the ask (buy) number is bold + FOOTPRINT_BUY_COLOR_BRIGHT; no strokeRect calls occur', () => {
    // Row at price=110 has buyVol=100 vs the row below (price=100) sellVol=1
    // — comfortably clears STANDARD_IMBALANCE_RATIO (1.5x) and the dust filter.
    const trades: FlowTrade[] = [
      { time: 0, price: 100, qty: 1, buyerAggressor: false }, // sellVol=1 at level 0
      { time: 100, price: 110, qty: 100, buyerAggressor: true }, // buyVol=100 at level 1
    ];
    const { prepared, projection, config, extras } = buildBidAskFixture(18, trades);
    const imbalancedBuy = prepared.imbalances.some((i) => i.highlighted && i.side === 'buy');
    expect(imbalancedBuy).toBe(true);

    const ctx = createFullMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    // No gold imbalance outline should ever be drawn — outline removal is unconditional.
    expect(ctx.strokeRectCalls.length).toBe(0);

    // The buy-side (ask) number for the imbalanced row is bold + bright green.
    const buyText = formatCellValue(100);
    const buyCall = ctx.fillTextCalls.find((c) => c.text === buyText);
    expect(buyCall).toBeDefined();
    expect(buyCall!.fillStyle).toBe(FOOTPRINT_BUY_COLOR_BRIGHT);
    expect(buyCall!.font.startsWith('bold ')).toBe(true);

    // The opposite (sell) side of the SAME imbalanced row stays neutral, not bright red.
    const sellText = formatCellValue(1);
    const sellCall = ctx.fillTextCalls.find((c) => c.text === sellText);
    expect(sellCall).toBeDefined();
    expect(sellCall!.fillStyle).toBe(FOOTPRINT_NEUTRAL_TEXT);
  });

  it('sell-side imbalance: the bid (sell) number is bold + FOOTPRINT_SELL_COLOR_BRIGHT; no strokeRect calls occur', () => {
    // Row at price=100 has sellVol=100 vs the row above (price=110) buyVol=1
    // — comfortably clears the imbalance ratio for a sell-side flag.
    const trades: FlowTrade[] = [
      { time: 0, price: 100, qty: 100, buyerAggressor: false }, // sellVol=100 at level 0
      { time: 100, price: 110, qty: 1, buyerAggressor: true }, // buyVol=1 at level 1
    ];
    const { prepared, projection, config, extras } = buildBidAskFixture(18, trades);
    const imbalancedSell = prepared.imbalances.some((i) => i.highlighted && i.side === 'sell');
    expect(imbalancedSell).toBe(true);

    const ctx = createFullMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    expect(ctx.strokeRectCalls.length).toBe(0);

    const sellText = formatCellValue(100);
    const sellCall = ctx.fillTextCalls.find((c) => c.text === sellText);
    expect(sellCall).toBeDefined();
    expect(sellCall!.fillStyle).toBe(FOOTPRINT_SELL_COLOR_BRIGHT);
    expect(sellCall!.font.startsWith('bold ')).toBe(true);
  });
});

describe('drawCandleFootprint — bidAsk center gutter', () => {
  it('bid text right-anchors at (midX - halfGutter - padding) and ask text left-anchors at (midX + halfGutter + padding)', () => {
    const trades: FlowTrade[] = [
      { time: 0, price: 100, qty: 3, buyerAggressor: true },
      { time: 100, price: 100, qty: 2, buyerAggressor: false },
    ];
    const { prepared, projection, config, extras } = buildBidAskFixture(18, trades);
    const ctx = createFullMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    const centerX = projection.centerX;
    const halfGutter = FOOTPRINT_CELL_GUTTER_PX / 2;

    const sellCall = ctx.fillTextCalls.find((c) => c.textAlign === 'right');
    const buyCall = ctx.fillTextCalls.find((c) => c.textAlign === 'left');
    expect(sellCall).toBeDefined();
    expect(buyCall).toBeDefined();

    // Sell (bid) anchor sits strictly left of the midline by at least halfGutter.
    expect(centerX - sellCall!.x).toBeGreaterThanOrEqual(halfGutter);
    // Buy (ask) anchor sits strictly right of the midline by at least halfGutter.
    expect(buyCall!.x - centerX).toBeGreaterThanOrEqual(halfGutter);
  });

  it('bidAsk background half-fills stop short of the midline by halfGutter on each side (visual seam)', () => {
    const trades: FlowTrade[] = [
      { time: 0, price: 100, qty: 3, buyerAggressor: true },
      { time: 100, price: 100, qty: 2, buyerAggressor: false },
    ];
    const { prepared, projection, config, extras } = buildBidAskFixture(18, trades);
    const ctx = createFullMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    const centerX = projection.centerX;
    const halfGutter = FOOTPRINT_CELL_GUTTER_PX / 2;

    // Left (sell) half-fill: x + w must not cross past (centerX - halfGutter).
    const leftFill = ctx.fillRectCalls.find((c) => c.x < centerX && c.w < 60);
    expect(leftFill).toBeDefined();
    expect(leftFill!.x + leftFill!.w).toBeLessThanOrEqual(centerX - halfGutter + 0.01);

    // Right (buy) half-fill: x must start at/after (centerX + halfGutter).
    const rightFill = ctx.fillRectCalls.find((c) => c.x >= centerX && c.w < 60);
    expect(rightFill).toBeDefined();
    expect(rightFill!.x).toBeGreaterThanOrEqual(centerX + halfGutter - 0.01);
  });
});

describe('computeCellFontSize — auto font size by row height', () => {
  it('scales roughly linearly with rowHeightPx inside the clamp range', () => {
    // ratio=0.55: 20px row -> round(11) = 11px (within [9,13]).
    expect(computeCellFontSize(20)).toBe(11);
    // 16px row -> round(8.8) = 9px.
    expect(computeCellFontSize(16)).toBe(9);
  });

  it('clamps at FOOTPRINT_CELL_FONT_MIN for very short rows', () => {
    expect(computeCellFontSize(5)).toBe(FOOTPRINT_CELL_FONT_MIN);
    expect(computeCellFontSize(0)).toBe(FOOTPRINT_CELL_FONT_MIN);
  });

  it('clamps at FOOTPRINT_CELL_FONT_MAX for very tall rows', () => {
    expect(computeCellFontSize(40)).toBe(FOOTPRINT_CELL_FONT_MAX);
    expect(computeCellFontSize(100)).toBe(FOOTPRINT_CELL_FONT_MAX);
  });

  it('drawCandleFootprint actually applies the scaled font size to cell text', () => {
    const trades: FlowTrade[] = [
      { time: 0, price: 100, qty: 3, buyerAggressor: true },
      { time: 100, price: 100, qty: 2, buyerAggressor: false },
    ];
    const rowHeightPx = 24; // round(24*0.55) = round(13.2) = 13 -> clamps to FONT_MAX anyway
    const { prepared, projection, config, extras } = buildBidAskFixture(rowHeightPx, trades);
    const ctx = createFullMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    const expectedSize = computeCellFontSize(rowHeightPx);
    expect(ctx.fillTextCalls.length).toBeGreaterThan(0);
    for (const call of ctx.fillTextCalls) {
      expect(call.font).toContain(`${expectedSize}px`);
    }
  });
});

// ─── 'volume' cell mode: neutral text regardless of delta sign (pro convention) ──

describe("drawCandleFootprint — 'volume' cell mode renders neutral text (no directional color)", () => {
  const intervalSec = 60;
  const rowSize = 10;

  it('a positive-delta row still renders FOOTPRINT_NEUTRAL_TEXT, not FOOTPRINT_BUY_COLOR', () => {
    const trades: FlowTrade[] = [{ time: 0, price: 100, qty: 10, buyerAggressor: true }]; // delta=+10
    const candle = buildCandleFromTrades(trades, intervalSec, rowSize);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, cellMode: 'volume' };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    const ctx = createFullMockCtx();

    const rowHeightPx = 18;
    const priceToY = (price: number): number | null => 400 - ((price - 100) / rowSize) * rowHeightPx;
    const projection: CandleProjection = { centerX: 400, candleWidthPx: 60, priceToY, rowHeightPx, rowSize };
    const extras: FootprintDrawExtras = { liveEdgeX: 800, latestCandleRange: null, clipRightX: 800 };

    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    expect(ctx.fillTextCalls.length).toBeGreaterThan(0);
    for (const call of ctx.fillTextCalls) {
      expect(call.fillStyle).toBe(FOOTPRINT_NEUTRAL_TEXT);
      expect(call.fillStyle).not.toBe(FOOTPRINT_BUY_COLOR);
    }
  });

  it('a negative-delta row still renders FOOTPRINT_NEUTRAL_TEXT, not FOOTPRINT_SELL_COLOR', () => {
    const trades: FlowTrade[] = [{ time: 0, price: 100, qty: 10, buyerAggressor: false }]; // delta=-10
    const candle = buildCandleFromTrades(trades, intervalSec, rowSize);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, cellMode: 'volume' };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    const ctx = createFullMockCtx();

    const rowHeightPx = 18;
    const priceToY = (price: number): number | null => 400 - ((price - 100) / rowSize) * rowHeightPx;
    const projection: CandleProjection = { centerX: 400, candleWidthPx: 60, priceToY, rowHeightPx, rowSize };
    const extras: FootprintDrawExtras = { liveEdgeX: 800, latestCandleRange: null, clipRightX: 800 };

    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    expect(ctx.fillTextCalls.length).toBeGreaterThan(0);
    for (const call of ctx.fillTextCalls) {
      expect(call.fillStyle).toBe(FOOTPRINT_NEUTRAL_TEXT);
      expect(call.fillStyle).not.toBe(FOOTPRINT_SELL_COLOR);
    }
  });
});

// ─── Candle skeleton strip: centered on the bid|ask seam, above cell
// backgrounds but below cell text, correct color/alpha ──────────────────────

/** Skeleton body-fill/wick-stroke rgba strings — mirrors mixAlphaValue's hex->rgba
 * math against the known FOOTPRINT_BUY_COLOR/FOOTPRINT_SELL_COLOR rgb breakdown
 * (34,197,94 / 220,38,38 — same literal breakdown already hardcoded elsewhere in
 * footprintTheme.ts, e.g. FOOTPRINT_BUY_BG). */
const SKELETON_BODY_FILL_BUY = `rgba(34, 197, 94, ${FOOTPRINT_SKELETON_BODY_FILL_ALPHA})`;
const SKELETON_BODY_FILL_SELL = `rgba(220, 38, 38, ${FOOTPRINT_SKELETON_BODY_FILL_ALPHA})`;
const SKELETON_WICK_BUY = `rgba(34, 197, 94, ${FOOTPRINT_SKELETON_WICK_ALPHA})`;
const SKELETON_WICK_SELL = `rgba(220, 38, 38, ${FOOTPRINT_SKELETON_WICK_ALPHA})`;
const SKELETON_FILL_COLORS = new Set([SKELETON_BODY_FILL_BUY, SKELETON_BODY_FILL_SELL]);
const SKELETON_STROKE_COLORS = new Set([SKELETON_WICK_BUY, SKELETON_WICK_SELL]);

/** Call-order-aware mock: every draw call is appended (in order) to `log`, tagged by kind. */
function createOrderedMockCtx() {
  type LogEntry =
    | { kind: 'fillRect'; x: number; y: number; w: number; h: number; fillStyle: string }
    | { kind: 'strokeLine'; strokeStyle: string; lineWidth: number };
  const log: LogEntry[] = [];
  const state = { fillStyle: '' as string, strokeStyle: '' as string, lineWidth: 1 };
  // A stroke() call is preceded by beginPath/moveTo/lineTo — we log at stroke()
  // time (mirrors real Canvas2D: the path is only "committed" on stroke()).
  const ctx = {
    get fillStyle() { return state.fillStyle; },
    set fillStyle(v: string) { state.fillStyle = v; },
    get strokeStyle() { return state.strokeStyle; },
    set strokeStyle(v: string) { state.strokeStyle = v; },
    get lineWidth() { return state.lineWidth; },
    set lineWidth(v: number) { state.lineWidth = v; },
    font: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    fillRect: vi.fn((x: number, y: number, w: number, h: number) => {
      log.push({ kind: 'fillRect', x, y, w, h, fillStyle: state.fillStyle });
    }),
    fillText: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(() => {
      log.push({ kind: 'strokeLine', strokeStyle: state.strokeStyle, lineWidth: state.lineWidth });
    }),
  } as unknown as CanvasRenderingContext2D & { log: LogEntry[] };
  (ctx as unknown as { log: LogEntry[] }).log = log;
  return ctx as CanvasRenderingContext2D & { log: LogEntry[] };
}

describe('drawCandleFootprint — candle skeleton strip', () => {
  const intervalSec = 60;
  const rowSize = 10;

  function buildFixtureWithOhlc(ohlc: { open: number; high: number; low: number; close: number }) {
    const trades: FlowTrade[] = [
      { time: 0, price: 100, qty: 5, buyerAggressor: true },
      { time: 100, price: 110, qty: 3, buyerAggressor: false },
    ];
    const candle = buildCandleFromTrades(trades, intervalSec, rowSize);
    // showPoc disabled — the POC band also issues a stroke() (gold top/bottom
    // rule), which would confound the strokeLine filter in the ordering test
    // below. Isolating the skeleton's own buy/sell-styled stroke/fill events
    // (now rgba() with alpha, not the plain hex) is the point of this fixture.
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, cellMode: 'bidAsk', showPoc: false };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);

    const rowHeightPx = 18;
    const priceToY = (price: number): number | null => 400 - ((price - 100) / rowSize) * rowHeightPx;
    const projection: CandleProjection = { centerX: 400, candleWidthPx: 60, priceToY, rowHeightPx, rowSize };
    const extras: FootprintDrawExtras = {
      liveEdgeX: 800,
      latestCandleRange: null,
      clipRightX: 800,
      ohlc,
    };
    return { prepared, projection, config, extras };
  }

  it('the skeleton wick+body draw AFTER cell background fillRects (i.e. above the backgrounds, per canvas paint order)', () => {
    const { prepared, projection, config, extras } = buildFixtureWithOhlc({ open: 100, high: 115, low: 95, close: 110 });
    const ctx = createOrderedMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    const isSkeletonFill = (e: (typeof ctx.log)[number]) => e.kind === 'fillRect' && SKELETON_FILL_COLORS.has(e.fillStyle);
    const isSkeletonStroke = (e: (typeof ctx.log)[number]) => e.kind === 'strokeLine' && SKELETON_STROKE_COLORS.has(e.strokeStyle);

    const skeletonEvents = ctx.log.filter((e) => isSkeletonStroke(e) || isSkeletonFill(e));
    expect(skeletonEvents.length).toBeGreaterThan(0);

    const firstSkeletonIdx = ctx.log.indexOf(skeletonEvents[0]);
    const firstCellFillIdx = ctx.log.findIndex((e) => e.kind === 'fillRect' && !isSkeletonFill(e));
    expect(firstCellFillIdx).toBeGreaterThan(-1);
    // Backgrounds now paint FIRST, then the skeleton — inverted from the old
    // left-edge/beneath-everything geometry, so the skeleton always reads
    // above the bid/ask fills instead of relying on a mode-specific gap.
    expect(firstSkeletonIdx).toBeGreaterThan(firstCellFillIdx);
  });

  it('close >= open renders the body strip in FOOTPRINT_BUY_COLOR at FOOTPRINT_SKELETON_BODY_FILL_ALPHA (green)', () => {
    const { prepared, projection, config, extras } = buildFixtureWithOhlc({ open: 100, high: 115, low: 95, close: 110 });
    const ctx = createOrderedMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    const bodyFill = ctx.log.find((e) => e.kind === 'fillRect' && e.fillStyle === SKELETON_BODY_FILL_BUY);
    expect(bodyFill).toBeDefined();
    // Centered on the bid|ask seam (projection.centerX = 400), not the column's left edge.
    expect(bodyFill?.x).toBeCloseTo(400 - FOOTPRINT_SKELETON_BODY_WIDTH_PX / 2);
    expect(bodyFill?.w).toBe(FOOTPRINT_SKELETON_BODY_WIDTH_PX);

    const wickStroke = ctx.log.find((e) => e.kind === 'strokeLine' && e.strokeStyle === SKELETON_WICK_BUY);
    expect(wickStroke).toBeDefined();
  });

  it('close < open renders the body strip in FOOTPRINT_SELL_COLOR at FOOTPRINT_SKELETON_BODY_FILL_ALPHA (red)', () => {
    const { prepared, projection, config, extras } = buildFixtureWithOhlc({ open: 110, high: 115, low: 95, close: 100 });
    const ctx = createOrderedMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    const bodyFill = ctx.log.find((e) => e.kind === 'fillRect' && e.fillStyle === SKELETON_BODY_FILL_SELL);
    expect(bodyFill).toBeDefined();
    expect(bodyFill?.x).toBeCloseTo(400 - FOOTPRINT_SKELETON_BODY_WIDTH_PX / 2);
    expect(bodyFill?.w).toBe(FOOTPRINT_SKELETON_BODY_WIDTH_PX);

    const wickStroke = ctx.log.find((e) => e.kind === 'strokeLine' && e.strokeStyle === SKELETON_WICK_SELL);
    expect(wickStroke).toBeDefined();
  });

  it('omitting extras.ohlc draws no skeleton (backward compatible — existing callers unaffected)', () => {
    const { prepared, projection, config } = buildFixtureWithOhlc({ open: 100, high: 115, low: 95, close: 110 });
    const extrasNoOhlc: FootprintDrawExtras = { liveEdgeX: 800, latestCandleRange: null, clipRightX: 800 };
    const ctx = createOrderedMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extrasNoOhlc);

    const skeletonFills = ctx.log.filter((e) => e.kind === 'fillRect' && SKELETON_FILL_COLORS.has(e.fillStyle));
    expect(skeletonFills.length).toBe(0);
    // Skeleton wick strokes are tagged by their own buy/sell rgba strokeStyle —
    // distinct from the (unrelated) POC-band top/bottom stroke, which uses
    // FOOTPRINT_POC_COLOR and still fires independently (showPoc defaults on).
    const skeletonStrokes = ctx.log.filter((e) => e.kind === 'strokeLine' && SKELETON_STROKE_COLORS.has(e.strokeStyle));
    expect(skeletonStrokes.length).toBe(0);
  });

  it('the skeleton does not draw at non-full detail stages (shaded/hidden), even if ohlc is provided', () => {
    const { prepared, projection, config, extras } = buildFixtureWithOhlc({ open: 100, high: 115, low: 95, close: 110 });
    const ctx = createOrderedMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'shaded', config, extras);

    // 'shaded' never reaches drawCellBackground/drawCandleSkeleton at all
    // (drawCandleFootprint returns after the merged-length guard only for
    // 'hidden'; 'shaded' still loops but showText=false gates the skeleton
    // call) — assert on buy/sell-styled rgba events only, same reasoning as
    // the previous test.
    const skeletonEvents = ctx.log.filter(
      (e) =>
        (e.kind === 'strokeLine' && SKELETON_STROKE_COLORS.has(e.strokeStyle)) ||
        (e.kind === 'fillRect' && SKELETON_FILL_COLORS.has(e.fillStyle)),
    );
    expect(skeletonEvents.length).toBe(0);
  });
});

// ─── Stacked-imbalance zone: hairline border strokes (task 4) ───────────────

describe('drawCandleFootprint — stacked zone bands render a hairline border', () => {
  const intervalSec = 60;
  const rowSize = 10;

  /** Build a candle with a qualifying stacked-buy run (>= stackedMin consecutive buy-imbalanced rows). */
  function buildStackedBuyCandle(): FlowCandleView {
    const trades: FlowTrade[] = [];
    // 4 ascending price levels, each row's buyVol >>> the row below's sellVol
    // (clears STANDARD_IMBALANCE_RATIO with margin), forming a stacked run.
    for (let level = 0; level < 4; level++) {
      trades.push({ time: level * 10, price: 100 + level * rowSize, qty: 1, buyerAggressor: false }); // thin sell base
      trades.push({ time: level * 10 + 1, price: 100 + level * rowSize, qty: 50, buyerAggressor: true }); // heavy buy
    }
    const store = new FlowBinStore({ intervalSec, rowSize });
    store.applyTrades(trades);
    const candle = store.getCandle(0);
    if (!candle) throw new Error('test setup error');
    return candle;
  }

  function buildStackedFixture() {
    const candle = buildStackedBuyCandle();
    const config: FootprintConfig = {
      ...DEFAULT_FOOTPRINT_CONFIG,
      imbalancePreset: 'stacked',
      imbalanceStackedOnly: true,
    };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    expect(prepared.stackedZones.length).toBeGreaterThan(0); // sanity: a zone actually formed

    const rowHeightPx = 18;
    const priceToY = (price: number): number | null => 400 - ((price - 100) / rowSize) * rowHeightPx;
    const projection: CandleProjection = { centerX: 100, candleWidthPx: 40, priceToY, rowHeightPx, rowSize };
    const extras: FootprintDrawExtras = { liveEdgeX: 400, latestCandleRange: null, clipRightX: 400 };
    return { prepared, projection, config, extras };
  }

  it('draws a hairline stroke in FOOTPRINT_STACKED_BUY_BAND_BORDER for a buy-side zone (one stroke() call paints both the top and bottom edge in a single path)', () => {
    const { prepared, projection, config, extras } = buildStackedFixture();
    const ctx = createOrderedMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    const borderStrokes = ctx.log.filter(
      (e) => e.kind === 'strokeLine' && e.strokeStyle === FOOTPRINT_STACKED_BUY_BAND_BORDER,
    );
    // One stroke() call per zone — the top+bottom edges are two moveTo/lineTo
    // segments in the SAME path, committed by a single stroke() (see
    // drawStackedZones), so the mock (which logs once per stroke() call, not
    // per line segment) records exactly 1 entry per qualifying zone.
    expect(borderStrokes.length).toBeGreaterThanOrEqual(1);
  });

  it('never uses the sell-band border color for a buy-side zone', () => {
    const { prepared, projection, config, extras } = buildStackedFixture();
    const ctx = createOrderedMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    const sellBorderStrokes = ctx.log.filter(
      (e) => e.kind === 'strokeLine' && e.strokeStyle === FOOTPRINT_STACKED_SELL_BAND_BORDER,
    );
    expect(sellBorderStrokes.length).toBe(0);
  });
});

// ─── PR 3 — F1: histogram-in-cell layout ────────────────────────────────────

describe('histogram-in-cell layout (F1)', () => {
  const intervalSec = 60;
  const rowSize = 10;

  it('histogramBarWidth: proportional to |value|/maxAbs, capped at availWidth, safe for zero maxAbs/value', () => {
    expect(histogramBarWidth(5, 10, 100)).toBeCloseTo(50, 5);
    expect(histogramBarWidth(10, 10, 100)).toBeCloseTo(100, 5); // exactly at max — full width
    expect(histogramBarWidth(20, 10, 100)).toBeCloseTo(100, 5); // over-max (float drift guard) — still capped
    expect(histogramBarWidth(0, 10, 100)).toBe(0);
    expect(histogramBarWidth(5, 0, 100)).toBe(0); // maxAbs 0 — no crash, no bar
    expect(histogramBarWidth(5, 10, 0)).toBe(0); // zero available width — no bar
  });

  it('bidAsk histogram: sell bar grows leftward from the gutter, buy bar grows rightward, both proportional to maxRowSideVol and capped at the half-cell width', () => {
    const trades: FlowTrade[] = [
      { time: 0, price: 100, qty: 10, buyerAggressor: true },
      { time: 1, price: 100, qty: 2, buyerAggressor: false },
      { time: 2, price: 110, qty: 4, buyerAggressor: true },
      { time: 3, price: 110, qty: 20, buyerAggressor: false },
    ];
    const candle = buildCandleFromTrades(trades, intervalSec, rowSize);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, cellMode: 'bidAsk', layout: 'histogram' };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    expect(prepared.maxRowSideVol).toBe(20); // row @110's sellVol=20 is the candle's busiest single side

    const rowHeightPx = 18;
    const priceToY = (price: number): number | null => 400 - ((price - 100) / rowSize) * rowHeightPx;
    const projection: CandleProjection = { centerX: 200, candleWidthPx: 100, priceToY, rowHeightPx, rowSize };
    const extras: FootprintDrawExtras = { liveEdgeX: 400, latestCandleRange: null, clipRightX: 400 };

    const ctx = createOrderedMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    const sellBars = ctx.log.filter((e) => e.kind === 'fillRect' && e.fillStyle === FOOTPRINT_HISTO_SELL_FILL);
    const buyBars = ctx.log.filter((e) => e.kind === 'fillRect' && e.fillStyle === FOOTPRINT_HISTO_BUY_FILL);
    expect(sellBars.length).toBe(2);
    expect(buyBars.length).toBe(2);

    const halfCellWidth = 100 / 2 - FOOTPRINT_CELL_GUTTER_PX / 2; // 48
    const allWidths = [...sellBars, ...buyBars].map((b) => (b as { w: number }).w);
    // The row at maxRowSideVol (110's sellVol=20) must hit exactly the capped half-cell width.
    expect(Math.max(...allWidths)).toBeCloseTo(halfCellWidth, 5);

    const sortedSellWidths = sellBars.map((b) => (b as { w: number }).w).sort((a, b) => a - b);
    const sortedBuyWidths = buyBars.map((b) => (b as { w: number }).w).sort((a, b) => a - b);
    // 100's sellVol=2 → (2/20)*halfCellWidth.
    expect(sortedSellWidths[0]).toBeCloseTo((2 / 20) * halfCellWidth, 5);
    // 100's buyVol=10 → (10/20)*halfCellWidth.
    expect(sortedBuyWidths[1]).toBeCloseTo((10 / 20) * halfCellWidth, 5);
  });

  it("single-value histogram ('delta' cellMode): one bar per row from the cell's LEFT edge, width proportional to |delta|/maxAbsDelta, colored by sign", () => {
    const trades: FlowTrade[] = [
      { time: 0, price: 100, qty: 10, buyerAggressor: true }, // delta +10 = maxAbsDelta
      { time: 1, price: 110, qty: 4, buyerAggressor: false }, // delta -4
    ];
    const candle = buildCandleFromTrades(trades, intervalSec, rowSize);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, cellMode: 'delta', layout: 'histogram' };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    expect(prepared.maxAbsDelta).toBe(10);

    const rowHeightPx = 18;
    const priceToY = (price: number): number | null => 400 - ((price - 100) / rowSize) * rowHeightPx;
    const projection: CandleProjection = { centerX: 200, candleWidthPx: 100, priceToY, rowHeightPx, rowSize };
    const extras: FootprintDrawExtras = { liveEdgeX: 400, latestCandleRange: null, clipRightX: 400 };

    const ctx = createOrderedMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    const buyBar = ctx.log.find((e) => e.kind === 'fillRect' && e.fillStyle === FOOTPRINT_HISTO_BUY_FILL) as
      | { x: number; w: number }
      | undefined;
    const sellBar = ctx.log.find((e) => e.kind === 'fillRect' && e.fillStyle === FOOTPRINT_HISTO_SELL_FILL) as
      | { x: number; w: number }
      | undefined;
    expect(buyBar).toBeDefined();
    expect(sellBar).toBeDefined();

    const leftX = 200 - 100 / 2; // 150 — single-value bars start at the cell's LEFT edge, not the bidAsk gutter.
    expect(buyBar!.x).toBeCloseTo(leftX, 5);
    expect(sellBar!.x).toBeCloseTo(leftX, 5);
    // Positive row (+10 = maxAbsDelta) fills the entire cell width; negative row (-4) is 40%.
    expect(buyBar!.w).toBeCloseTo(100, 5);
    expect(sellBar!.w).toBeCloseTo(40, 5);
  });

  it('histogram layout skips the flat background wash — only histogram-family fills paint (no FOOTPRINT_NEUTRAL_BG etc.)', () => {
    const trades: FlowTrade[] = [{ time: 0, price: 100, qty: 10, buyerAggressor: true }];
    const candle = buildCandleFromTrades(trades, intervalSec, rowSize);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, cellMode: 'volume', layout: 'histogram', showPoc: false };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);

    const rowHeightPx = 18;
    const priceToY = (price: number): number | null => 400 - ((price - 100) / rowSize) * rowHeightPx;
    const projection: CandleProjection = { centerX: 200, candleWidthPx: 100, priceToY, rowHeightPx, rowSize };
    const extras: FootprintDrawExtras = { liveEdgeX: 400, latestCandleRange: null, clipRightX: 400 };

    const ctx = createOrderedMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    const fillStyles = ctx.log
      .filter((e) => e.kind === 'fillRect')
      .map((e) => (e as { fillStyle: string }).fillStyle);
    expect(fillStyles.length).toBeGreaterThan(0);
    expect(fillStyles.every((f) => f === FOOTPRINT_HISTO_NEUTRAL_FILL)).toBe(true);
  });
});

// ─── PR 3 — F2: color-scheme dispatcher ─────────────────────────────────────

describe('color-scheme dispatcher (F2)', () => {
  const intervalSec = 60;
  const rowSize = 10;

  function buildFixture(colorScheme: FootprintConfig['colorScheme'], cellMode: FootprintConfig['cellMode'] = 'delta') {
    const trades: FlowTrade[] = [
      { time: 0, price: 100, qty: 10, buyerAggressor: true }, // delta +10, rowVol 10 = candle's max
      { time: 1, price: 110, qty: 4, buyerAggressor: false }, // delta -4, rowVol 4
    ];
    const candle = buildCandleFromTrades(trades, intervalSec, rowSize);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, cellMode, colorScheme, showPoc: false };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    const rowHeightPx = 18;
    const priceToY = (price: number): number | null => 400 - ((price - 100) / rowSize) * rowHeightPx;
    const projection: CandleProjection = { centerX: 200, candleWidthPx: 100, priceToY, rowHeightPx, rowSize };
    const extras: FootprintDrawExtras = { liveEdgeX: 400, latestCandleRange: null, clipRightX: 400 };
    const ctx = createOrderedMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);
    return ctx.log.filter((e) => e.kind === 'fillRect') as { kind: 'fillRect'; x: number; y: number; w: number; h: number; fillStyle: string }[];
  }

  it("'delta' colorScheme (default) reproduces the exact pre-PR-3 per-cellMode background — regression guard", () => {
    const fills = buildFixture('delta', 'delta');
    // Positive-delta row (delta=+10=maxRowVol → magnitude=1) must hit the STRONG buy background EXACTLY.
    const strongBuy = fills.find((f) => f.fillStyle === FOOTPRINT_BUY_BG_STRONG);
    expect(strongBuy).toBeDefined();
  });

  it("'volumeHeat' colorScheme: single gold ramp, alpha monotonically increases with row-volume magnitude, independent of buy/sell sign", () => {
    const fills = buildFixture('volumeHeat', 'delta');
    const goldFills = fills.filter((f) => f.fillStyle.includes('201, 166, 70'));
    expect(goldFills.length).toBe(2);
    const alphaOf = (rgba: string) => parseFloat(rgba.match(/rgba\([^)]+,\s*([\d.]+)\)/)![1]);
    const alphas = goldFills.map((f) => alphaOf(f.fillStyle)).sort((a, b) => a - b);
    expect(alphas[0]).toBeLessThan(alphas[1]);
    // Row @100 (rowVol=10) IS the candle's max row volume → hits the STRONG endpoint exactly.
    expect(alphas[1]).toBeCloseTo(FOOTPRINT_VOLUME_HEAT_STRONG_ALPHA, 5);
  });

  it("'solid' colorScheme: every non-empty cell gets the exact same fixed background, regardless of row magnitude", () => {
    const fills = buildFixture('solid', 'delta');
    expect(fills.length).toBeGreaterThan(0);
    for (const f of fills) {
      expect(f.fillStyle).toBe(FOOTPRINT_SOLID_SCHEME_BG);
    }
  });

  it('bidAsk histogramless single-cell fill under volumeHeat is NOT split into sell/buy halves (single ramp, independent of side)', () => {
    // buildFixture sets showPoc: false, so every fillRect here is a cell
    // background — a split (sell+buy halves) would be 4 calls for 2 rows; a
    // single full-cell ramp is exactly 2 (one per non-empty row).
    const fills = buildFixture('volumeHeat', 'bidAsk');
    expect(fills.length).toBe(2);
    expect(fills.every((f) => f.w === 100)).toBe(true); // full cell width, not a half-cell split
  });

  it('POC gold band is unaffected by colorScheme (still renders under volumeHeat)', () => {
    const trades: FlowTrade[] = [{ time: 0, price: 100, qty: 10, buyerAggressor: true }];
    const candle = buildCandleFromTrades(trades, intervalSec, rowSize);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, colorScheme: 'volumeHeat', showPoc: true };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    const rowHeightPx = 18;
    const priceToY = (price: number): number | null => 400 - ((price - 100) / rowSize) * rowHeightPx;
    const projection: CandleProjection = { centerX: 200, candleWidthPx: 100, priceToY, rowHeightPx, rowSize };
    const extras: FootprintDrawExtras = { liveEdgeX: 400, latestCandleRange: null, clipRightX: 400 };
    const ctx = createOrderedMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);
    const pocFill = ctx.log.find((e) => e.kind === 'fillRect' && (e as { fillStyle: string }).fillStyle === 'rgba(201, 166, 70, 0.18)');
    expect(pocFill).toBeDefined(); // FOOTPRINT_POC_BG, unaffected by colorScheme
  });
});

// ─── PR 3 — F4: computeValueArea (shared helper) ────────────────────────────

describe('computeValueArea (F4) — cross-check against volumeProfile.ts on the same fixture', () => {
  const intervalSec = 60;
  const rowSize = 10;

  it('produces the same pocIdx/vahIdx/valIdx-derived prices as computeVolumeProfile for an identical row set', () => {
    const trades: FlowTrade[] = [];
    // 6 price levels, deliberately uneven volume so POC/VA boundaries are non-trivial.
    const vols = [5, 10, 40, 15, 8, 3]; // level 2 is the heaviest → POC
    vols.forEach((v, i) => trades.push({ time: i, price: 100 + i * rowSize, qty: v, buyerAggressor: true }));
    const candle = buildCandleFromTrades(trades, intervalSec, rowSize);

    const profile = computeVolumeProfile([candle]);
    const rows = candle.bins.map((b) => ({ price: b.binPrice, vol: b.buyVol + b.sellVol }));
    const va = computeValueArea(rows);

    expect(va.pocIdx).not.toBeNull();
    expect(rows[va.pocIdx!].price).toBe(profile.poc);
    expect(rows[va.vahIdx!].price).toBe(profile.vah);
    expect(rows[va.valIdx!].price).toBe(profile.val);
  });

  it('prepareCandleDraw wires per-bar VAH/VAL only when showValueArea is on, matching the standalone helper', () => {
    const trades: FlowTrade[] = [];
    const vols = [5, 10, 40, 15, 8, 3];
    vols.forEach((v, i) => trades.push({ time: i, price: 100 + i * rowSize, qty: v, buyerAggressor: true }));
    const candle = buildCandleFromTrades(trades, intervalSec, rowSize);

    const offConfig: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, showValueArea: false };
    const preparedOff = prepareCandleDraw(candle, rowSize, 1, offConfig);
    expect(preparedOff.vahBinPrice).toBeNull();
    expect(preparedOff.valBinPrice).toBeNull();

    const onConfig: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, showValueArea: true };
    const preparedOn = prepareCandleDraw(candle, rowSize, 1, onConfig);
    const rows = preparedOn.merged.map((r) => ({ price: r.binPrice, vol: r.buyVol + r.sellVol }));
    const va = computeValueArea(rows);
    expect(preparedOn.vahBinPrice).toBe(va.vahIdx !== null ? rows[va.vahIdx].price : null);
    expect(preparedOn.valBinPrice).toBe(va.valIdx !== null ? rows[va.valIdx].price : null);
  });
});

// ─── PR 3 — F5: toggleable stats rows ───────────────────────────────────────

describe('toggleable stats rows (F5)', () => {
  it('getEnabledStatsRowDefs: default (all enabled) returns 6 defs in the fixed order; a disabled row is absent from the output', () => {
    const allDefs = getEnabledStatsRowDefs(DEFAULT_FOOTPRINT_CONFIG.statsRows);
    expect(allDefs.map((d) => d.key)).toEqual(['volume', 'delta', 'deltaPct', 'maxDelta', 'minDelta', 'sessionDelta']);

    const partial = getEnabledStatsRowDefs({ ...DEFAULT_FOOTPRINT_CONFIG.statsRows, delta: false, maxDelta: false, minDelta: false });
    expect(partial.map((d) => d.key)).toEqual(['volume', 'deltaPct', 'sessionDelta']);
    expect(partial.find((d) => d.key === 'delta')).toBeUndefined();
  });

  it('computeFootprintBandHeightPx: band height for 6/3/0 enabled rows (showTotals off)', () => {
    const base = { showStats: true, showTotals: false };
    expect(computeFootprintBandHeightPx({ ...base, statsRows: DEFAULT_FOOTPRINT_CONFIG.statsRows }, 'full')).toBe(72); // 6 * 12px — matches today's default, no-op

    const threeRows = { ...DEFAULT_FOOTPRINT_CONFIG.statsRows, delta: false, maxDelta: false, minDelta: false };
    expect(computeFootprintBandHeightPx({ ...base, statsRows: threeRows }, 'full')).toBe(36); // 3 * 12px

    const zeroRows = { volume: false, delta: false, deltaPct: false, maxDelta: false, minDelta: false, sessionDelta: false };
    expect(computeFootprintBandHeightPx({ ...base, statsRows: zeroRows }, 'full')).toBe(0); // all disabled, no totals fallback → height 0
  });

  it('all-rows-disabled falls back to the totals-row height when showTotals is also on', () => {
    const zeroRows = { volume: false, delta: false, deltaPct: false, maxDelta: false, minDelta: false, sessionDelta: false };
    const height = computeFootprintBandHeightPx({ showStats: true, showTotals: true, statsRows: zeroRows }, 'full');
    expect(height).toBe(FOOTPRINT_TOTALS_BAND_HEIGHT);
  });

  it('detail !== "full" always yields height 0, regardless of statsRows', () => {
    expect(computeFootprintBandHeightPx({ showStats: true, showTotals: false, statsRows: DEFAULT_FOOTPRINT_CONFIG.statsRows }, 'shaded')).toBe(0);
    expect(computeFootprintBandHeightPx({ showStats: true, showTotals: false, statsRows: DEFAULT_FOOTPRINT_CONFIG.statsRows }, 'hidden')).toBe(0);
  });
});

// ─── PR 3 — F6: stacked-zone first-revisit kill ─────────────────────────────

describe('stacked-zone first-revisit kill (F6)', () => {
  const intervalSec = 60;
  const rowSize = 10;

  /** Same fixture as the earlier stacked-zone border tests: a qualifying stacked-buy zone spanning price [100, 140). */
  function buildStackedBuyCandle(): FlowCandleView {
    const trades: FlowTrade[] = [];
    for (let level = 0; level < 4; level++) {
      trades.push({ time: level * 10, price: 100 + level * rowSize, qty: 1, buyerAggressor: false });
      trades.push({ time: level * 10 + 1, price: 100 + level * rowSize, qty: 50, buyerAggressor: true });
    }
    const store = new FlowBinStore({ intervalSec, rowSize });
    store.applyTrades(trades);
    const candle = store.getCandle(0);
    if (!candle) throw new Error('test setup error');
    return candle;
  }

  function buildFixture() {
    const candle = buildStackedBuyCandle();
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG, imbalancePreset: 'stacked', imbalanceStackedOnly: true };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    expect(prepared.stackedZones.length).toBeGreaterThan(0); // sanity: a zone actually formed
    const rowHeightPx = 18;
    const priceToY = (price: number): number | null => 400 - ((price - 100) / rowSize) * rowHeightPx;
    const projection: CandleProjection = { centerX: 100, candleWidthPx: 40, priceToY, rowHeightPx, rowSize };
    return { prepared, projection, config };
  }

  it('zone survives when touchedRangeSince reports no candle touched its price band', () => {
    const { prepared, projection, config } = buildFixture();
    const extras: FootprintDrawExtras = {
      liveEdgeX: 400,
      latestCandleRange: null,
      clipRightX: 400,
      touchedRangeSince: () => null,
    };
    const ctx = createOrderedMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);
    const buyBandFills = ctx.log.filter((e) => e.kind === 'fillRect' && e.fillStyle === FOOTPRINT_STACKED_BUY_BAND);
    expect(buyBandFills.length).toBeGreaterThan(0);
  });

  it('zone is killed when a MIDDLE (non-latest) candle touched its price band, even though latestCandleRange alone says "untouched"', () => {
    const { prepared, projection, config } = buildFixture();
    const extras: FootprintDrawExtras = {
      liveEdgeX: 400,
      latestCandleRange: null, // the OLD "only check latest" signal says "untouched"
      clipRightX: 400,
      // A candle strictly between formation and now DID trade back through
      // [100,140) — touchedRangeSince (F6's suffix-based signal) reports it.
      touchedRangeSince: () => ({ low: 105, high: 110 }),
    };
    const ctx = createOrderedMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);
    const buyBandFills = ctx.log.filter((e) => e.kind === 'fillRect' && e.fillStyle === FOOTPRINT_STACKED_BUY_BAND);
    expect(buyBandFills.length).toBe(0); // killed
  });

  it('falls back to latestCandleRange when touchedRangeSince is omitted (backward compatible for callers without a bars-derived suffix structure)', () => {
    const { prepared, projection, config } = buildFixture();
    const extras: FootprintDrawExtras = {
      liveEdgeX: 400,
      latestCandleRange: { low: 105, high: 110 }, // legacy signal — this alone should still kill the zone
      clipRightX: 400,
      // touchedRangeSince intentionally omitted.
    };
    const ctx = createOrderedMockCtx();
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);
    const buyBandFills = ctx.log.filter((e) => e.kind === 'fillRect' && e.fillStyle === FOOTPRINT_STACKED_BUY_BAND);
    expect(buyBandFills.length).toBe(0);
  });
});
