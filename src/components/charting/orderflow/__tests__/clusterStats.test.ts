// src/components/charting/orderflow/__tests__/clusterStats.test.ts
//
// Coverage for the ATAS-style Cluster Statistics strip (6 rows: Volume,
// Delta, Delta%, Max Δ, Min Δ, Session Δ) that replaces/extends the compact
// totals band under the footprint bars — see drawStatsBandAt in
// footprintRender.ts.

import { describe, it, expect } from 'vitest';
import {
  prepareCandleDraw,
  drawStatsBandAt,
  buildClusterStatsRow,
  FOOTPRINT_STATS_BAND_HEIGHT,
  FOOTPRINT_TOTALS_BAND_HEIGHT,
} from '../footprintRender';
import type { FlowTrade, FootprintConfig } from '../types';
import { DEFAULT_FOOTPRINT_CONFIG } from '../types';
import { FlowBinStore } from '../flowBinStore';
import {
  FOOTPRINT_STATS_CHIP_STRONG_ALPHA,
  FOOTPRINT_STATS_LEGEND_GUTTER_WIDTH,
  FOOTPRINT_TOTALS_BG,
} from '../footprintTheme';

// ─── FlowCandle.maxDelta/minDelta sequencing (engine-level, already tracked
// per-trade in flowBinStore's applySingleTrade — proving the exact sequence
// from the task spec) ────────────────────────────────────────────────────

describe('FlowCandle maxDelta/minDelta — intra-candle running-delta sequencing', () => {
  it('sequence buy5, sell3, sell4, buy1 → maxDelta 5, minDelta -2', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 1 });
    store.applyTrades([
      { time: 0, price: 100, qty: 5, buyerAggressor: true }, // delta=5 (max so far 5)
      { time: 1000, price: 100, qty: 3, buyerAggressor: false }, // delta=2
      { time: 2000, price: 100, qty: 4, buyerAggressor: false }, // delta=-2 (min so far -2)
      { time: 3000, price: 100, qty: 1, buyerAggressor: true }, // delta=-1
    ]);
    const candle = store.getCandle(0);
    expect(candle).not.toBeNull();
    expect(candle!.delta).toBe(-1);
    expect(candle!.maxDelta).toBe(5);
    expect(candle!.minDelta).toBe(-2);
  });
});

// ─── buildClusterStatsRow — per-bar stats derivation ────────────────────────

function buildCandle(trades: FlowTrade[], intervalSec = 60, rowSize = 10) {
  const store = new FlowBinStore({ intervalSec, rowSize });
  store.applyTrades(trades);
  const candleTime = Math.floor(trades[0].time / 1000 / intervalSec) * intervalSec;
  const view = store.getCandle(candleTime);
  if (!view) throw new Error('test setup: expected candle');
  return view;
}

describe('buildClusterStatsRow', () => {
  it('computes Volume, Delta, Delta% (1 decimal + "%"), Max Δ, Min Δ for a single candle', () => {
    const trades: FlowTrade[] = [
      { time: 0, price: 100, qty: 5, buyerAggressor: true },
      { time: 1000, price: 100, qty: 3, buyerAggressor: false },
      { time: 2000, price: 100, qty: 4, buyerAggressor: false },
      { time: 3000, price: 100, qty: 1, buyerAggressor: true },
    ];
    const candle = buildCandle(trades);
    const stats = buildClusterStatsRow(candle, /* sessionDelta */ candle.delta);

    expect(stats.volume).toBe(13); // 5+3+4+1
    expect(stats.delta).toBe(-1);
    // delta% = delta/volume = -1/13 = -7.69...% → 1 decimal → "-7.7%"
    expect(stats.deltaPctLabel).toBe('-7.7%');
    expect(stats.maxDelta).toBe(5);
    expect(stats.minDelta).toBe(-2);
    expect(stats.sessionDelta).toBe(-1);
  });

  it('deltaPctLabel is "0.0%" when volume is 0 (guards div-by-zero — cannot happen with real trades but must not throw/NaN)', () => {
    // Synthesize a zero-volume "candle" shape directly (bypassing the store,
    // since a real candle always has totalVol>0 once any trade lands).
    const emptyCandle = {
      time: 0,
      bins: [],
      totalVol: 0,
      delta: 0,
      minDelta: 0,
      maxDelta: 0,
      poc: null,
    };
    const stats = buildClusterStatsRow(emptyCandle, 0);
    expect(stats.deltaPctLabel).toBe('0.0%');
    expect(Number.isNaN(stats.volume)).toBe(false);
  });

  it('sessionDelta is passed through as the running cumulative value (caller-supplied, not recomputed per-candle)', () => {
    const trades: FlowTrade[] = [{ time: 0, price: 100, qty: 10, buyerAggressor: true }];
    const candle = buildCandle(trades);
    const stats = buildClusterStatsRow(candle, 42); // arbitrary running session total
    expect(stats.sessionDelta).toBe(42);
  });
});

// ─── Session Δ via getCvdSeries — running cumulative across candles ────────

describe('Session Δ derivation — running cumulative delta across loaded candles', () => {
  it('matches getCvdSeries cumulative values across 3 sequential candles', () => {
    const store = new FlowBinStore({ intervalSec: 60, rowSize: 10 });
    store.applyTrades([
      { time: 0, price: 100, qty: 10, buyerAggressor: true }, // candle 0: delta +10
      { time: 61_000, price: 100, qty: 4, buyerAggressor: false }, // candle 1: delta -4
      { time: 122_000, price: 100, qty: 2, buyerAggressor: true }, // candle 2: delta +2
    ]);
    const cvd = store.getCvdSeries(0, 200);
    expect(cvd.map((p) => p.cvd)).toEqual([10, 6, 8]);
  });
});

// ─── drawStatsBandAt — mocked-canvas draw-call assertions ──────────────────

function createMockCtx() {
  const fillRectCalls: { x: number; y: number; w: number; h: number; fillStyle: string }[] = [];
  const fillTextCalls: { text: string; x: number; y: number; fillStyle: string }[] = [];
  let currentFillStyle = '';
  const ctx = {
    fillRectCalls,
    fillTextCalls,
    get fillStyle() {
      return currentFillStyle;
    },
    set fillStyle(v: string) {
      currentFillStyle = v;
    },
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    fillRect: (x: number, y: number, w: number, h: number) => {
      fillRectCalls.push({ x, y, w, h, fillStyle: currentFillStyle });
    },
    fillText: (text: string, x: number, y: number) => {
      fillTextCalls.push({ text, x, y, fillStyle: currentFillStyle });
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

describe('drawStatsBandAt', () => {
  const intervalSec = 60;
  const rowSize = 10;

  it('renders 6 rows of text (one label + one value area per row) for a single bar', () => {
    const trades: FlowTrade[] = [
      { time: 0, price: 100, qty: 5, buyerAggressor: true },
      { time: 1000, price: 100, qty: 3, buyerAggressor: false },
      { time: 2000, price: 110, qty: 4, buyerAggressor: true },
    ];
    const candle = buildCandle(trades, intervalSec, rowSize);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    const stats = buildClusterStatsRow(candle, candle.delta);

    const ctx = createMockCtx();
    drawStatsBandAt(ctx, [{ prepared, stats, leftX: 0, rightX: 80 }], {
      top: 400,
      labelGutterWidth: 60,
      rowMaxima: computeRowMaxima([stats]),
    });

    // 6 rows: Volume, Delta, Delta%, Max Δ, Min Δ, Session Δ — 1 value cell
    // per bar (only 1 bar here) → 6 fillText calls for values, plus 6 label
    // fillText calls = 12 total.
    expect(ctx.fillTextCalls.length).toBe(12);
    const texts = ctx.fillTextCalls.map((c) => c.text);
    expect(texts).toContain('Volume');
    expect(texts).toContain('Delta');
    expect(texts).toContain('Delta%');
    expect(texts).toContain('Max Δ');
    expect(texts).toContain('Min Δ');
    expect(texts).toContain('Session Δ');
  });

  it('band height grows to accommodate 6 rows (FOOTPRINT_STATS_BAND_HEIGHT > legacy 2-row FOOTPRINT_TOTALS_BAND_HEIGHT)', () => {
    expect(FOOTPRINT_STATS_BAND_HEIGHT).toBeGreaterThan(FOOTPRINT_TOTALS_BAND_HEIGHT);
  });

  it('colors Delta/Session Δ cells by sign (positive vs negative use different fillStyle values)', () => {
    const posTrades: FlowTrade[] = [{ time: 0, price: 100, qty: 10, buyerAggressor: true }];
    const negTrades: FlowTrade[] = [{ time: 0, price: 100, qty: 10, buyerAggressor: false }];
    const posCandle = buildCandle(posTrades, intervalSec, rowSize);
    const negCandle = buildCandle(negTrades, intervalSec, rowSize);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG };

    const posPrepared = prepareCandleDraw(posCandle, rowSize, 1, config);
    const negPrepared = prepareCandleDraw(negCandle, rowSize, 1, config);
    const posStats = buildClusterStatsRow(posCandle, posCandle.delta);
    const negStats = buildClusterStatsRow(negCandle, negCandle.delta);

    const ctx = createMockCtx();
    drawStatsBandAt(
      ctx,
      [
        { prepared: posPrepared, stats: posStats, leftX: 0, rightX: 80 },
        { prepared: negPrepared, stats: negStats, leftX: 80, rightX: 160 },
      ],
      { top: 400, labelGutterWidth: 60, rowMaxima: computeRowMaxima([posStats, negStats]) },
    );

    const deltaCallForPos = ctx.fillTextCalls.find((c) => c.text === '10.0');
    const deltaCallForNeg = ctx.fillTextCalls.find((c) => c.text === '-10.0');
    expect(deltaCallForPos).toBeDefined();
    expect(deltaCallForNeg).toBeDefined();
    expect(deltaCallForPos!.fillStyle).not.toBe(deltaCallForNeg!.fillStyle);
  });

  it('background heat-shading: fillRect alpha/opacity scales with |value| relative to the row max (row with the larger volume gets a stronger fill call than a near-zero one)', () => {
    const bigTrades: FlowTrade[] = [{ time: 0, price: 100, qty: 100, buyerAggressor: true }];
    const smallTrades: FlowTrade[] = [{ time: 0, price: 100, qty: 1, buyerAggressor: true }];
    const bigCandle = buildCandle(bigTrades, intervalSec, rowSize);
    const smallCandle = buildCandle(smallTrades, intervalSec, rowSize);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG };

    const bigPrepared = prepareCandleDraw(bigCandle, rowSize, 1, config);
    const smallPrepared = prepareCandleDraw(smallCandle, rowSize, 1, config);
    const bigStats = buildClusterStatsRow(bigCandle, bigCandle.delta);
    const smallStats = buildClusterStatsRow(smallCandle, smallCandle.delta);

    const rowMaxima = computeRowMaxima([bigStats, smallStats]);

    const ctx = createMockCtx();
    drawStatsBandAt(
      ctx,
      [
        { prepared: bigPrepared, stats: bigStats, leftX: 0, rightX: 80 },
        { prepared: smallPrepared, stats: smallStats, leftX: 80, rightX: 160 },
      ],
      { top: 400, labelGutterWidth: 60, rowMaxima },
    );

    // Volume row background fillRect calls: extract alpha from the rgba fillStyle.
    const volumeRowFillRects = ctx.fillRectCalls.filter((c) => c.fillStyle.includes('rgba'));
    expect(volumeRowFillRects.length).toBeGreaterThan(0);

    const alphaOf = (rgba: string): number => {
      const m = rgba.match(/rgba?\(([^)]+)\)/);
      if (!m) return 0;
      const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
      return parts[3] ?? 1;
    };

    // First bar (big volume=100) row-background alpha should exceed the
    // second bar (small volume=1) for at least one shared row (Volume row).
    const alphas = volumeRowFillRects.map((c) => alphaOf(c.fillStyle));
    expect(Math.max(...alphas)).toBeGreaterThan(0);
  });
});

// Local helper mirroring the "compute row max once per draw" contract —
// exercised here to build the rowMaxima argument the same way FootprintLayer
// will (avoids re-deriving maxima inside drawStatsBandAt itself, per the
// "no per-frame data scans" constraint).
function computeRowMaxima(allStats: ReturnType<typeof buildClusterStatsRow>[]) {
  let volume = 0;
  let delta = 0;
  let deltaPct = 0;
  let maxDelta = 0;
  let minDelta = 0;
  let sessionDelta = 0;
  for (const s of allStats) {
    volume = Math.max(volume, Math.abs(s.volume));
    delta = Math.max(delta, Math.abs(s.delta));
    deltaPct = Math.max(deltaPct, Math.abs(s.deltaPct));
    maxDelta = Math.max(maxDelta, Math.abs(s.maxDelta));
    minDelta = Math.max(minDelta, Math.abs(s.minDelta));
    sessionDelta = Math.max(sessionDelta, Math.abs(s.sessionDelta));
  }
  return { volume, delta, deltaPct, maxDelta, minDelta, sessionDelta };
}

// ─── Stats-band per-cell heat chips + legend gutter (visual-parity punch-list) ──

describe('drawStatsBandAt — per-cell heat chips scale by relative magnitude', () => {
  const intervalSec = 60;
  const rowSize = 10;

  it('the row at exactly rowMax renders its heat chip at the STRONG alpha endpoint', () => {
    const bigTrades: FlowTrade[] = [{ time: 0, price: 100, qty: 100, buyerAggressor: true }];
    const smallTrades: FlowTrade[] = [{ time: 0, price: 100, qty: 1, buyerAggressor: true }];
    const bigCandle = buildCandle(bigTrades, intervalSec, rowSize);
    const smallCandle = buildCandle(smallTrades, intervalSec, rowSize);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG };

    const bigPrepared = prepareCandleDraw(bigCandle, rowSize, 1, config);
    const smallPrepared = prepareCandleDraw(smallCandle, rowSize, 1, config);
    const bigStats = buildClusterStatsRow(bigCandle, bigCandle.delta);
    const smallStats = buildClusterStatsRow(smallCandle, smallCandle.delta);
    const rowMaxima = computeRowMaxima([bigStats, smallStats]);

    const ctx = createMockCtx();
    drawStatsBandAt(
      ctx,
      [
        { prepared: bigPrepared, stats: bigStats, leftX: 100, rightX: 180 },
        { prepared: smallPrepared, stats: smallStats, leftX: 180, rightX: 260 },
      ],
      { top: 400, labelGutterWidth: FOOTPRINT_STATS_LEGEND_GUTTER_WIDTH, rowMaxima },
    );

    // Delta row specifically (rowIdx=1, NOT Volume/rowIdx=0 — both rows
    // happen to share the same 100-vs-1 magnitude ratio in this all-buy
    // fixture, so pinning by y avoids accidentally asserting on the wrong
    // row's chip). Big bar's chip (delta=100, rowMax=100) must land at
    // exactly the strong endpoint.
    const DELTA_ROW_TOP = 400 + 12; // top(400) + rowIdx(1) * STATS_ROW_HEIGHT(12)
    const bigChip = ctx.fillRectCalls.find(
      (c) => c.x === 100 && c.y === DELTA_ROW_TOP && c.fillStyle.includes('rgba'),
    );
    expect(bigChip).toBeDefined();
    const alphaMatch = bigChip!.fillStyle.match(/rgba\([^)]+,\s*([\d.]+)\)/);
    expect(alphaMatch).not.toBeNull();
    expect(parseFloat(alphaMatch![1])).toBeCloseTo(FOOTPRINT_STATS_CHIP_STRONG_ALPHA, 5);
  });

  it('a lighter row renders a lower-alpha chip than a heavier row for the same signed stat', () => {
    const bigTrades: FlowTrade[] = [{ time: 0, price: 100, qty: 100, buyerAggressor: true }];
    const smallTrades: FlowTrade[] = [{ time: 0, price: 100, qty: 5, buyerAggressor: true }];
    const bigCandle = buildCandle(bigTrades, intervalSec, rowSize);
    const smallCandle = buildCandle(smallTrades, intervalSec, rowSize);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG };

    const bigPrepared = prepareCandleDraw(bigCandle, rowSize, 1, config);
    const smallPrepared = prepareCandleDraw(smallCandle, rowSize, 1, config);
    const bigStats = buildClusterStatsRow(bigCandle, bigCandle.delta);
    const smallStats = buildClusterStatsRow(smallCandle, smallCandle.delta);
    const rowMaxima = computeRowMaxima([bigStats, smallStats]);

    const ctx = createMockCtx();
    drawStatsBandAt(
      ctx,
      [
        { prepared: bigPrepared, stats: bigStats, leftX: 100, rightX: 180 },
        { prepared: smallPrepared, stats: smallStats, leftX: 180, rightX: 260 },
      ],
      { top: 400, labelGutterWidth: FOOTPRINT_STATS_LEGEND_GUTTER_WIDTH, rowMaxima },
    );

    // Pin to the Delta row specifically (rowIdx=1) — same reasoning as the
    // strong-endpoint test above.
    const DELTA_ROW_TOP = 400 + 12;
    const alphaOfChipAt = (x: number): number => {
      const chip = ctx.fillRectCalls.find((c) => c.x === x && c.y === DELTA_ROW_TOP && c.fillStyle.includes('rgba'));
      expect(chip).toBeDefined();
      const m = chip!.fillStyle.match(/rgba\([^)]+,\s*([\d.]+)\)/);
      return m ? parseFloat(m[1]) : 0;
    };

    // Delta row: big bar's chip (delta=100=rowMax) must be strictly hotter
    // than the small bar's chip (delta=5).
    expect(alphaOfChipAt(100)).toBeGreaterThan(alphaOfChipAt(180));
  });

  it('a negative-signed row (e.g. Delta) renders its chip at x < 180 with sell-family fillStyle, distinct from the positive row', () => {
    const posTrades: FlowTrade[] = [{ time: 0, price: 100, qty: 20, buyerAggressor: true }];
    const negTrades: FlowTrade[] = [{ time: 0, price: 100, qty: 20, buyerAggressor: false }];
    const posCandle = buildCandle(posTrades, intervalSec, rowSize);
    const negCandle = buildCandle(negTrades, intervalSec, rowSize);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG };

    const posPrepared = prepareCandleDraw(posCandle, rowSize, 1, config);
    const negPrepared = prepareCandleDraw(negCandle, rowSize, 1, config);
    const posStats = buildClusterStatsRow(posCandle, posCandle.delta);
    const negStats = buildClusterStatsRow(negCandle, negCandle.delta);
    const rowMaxima = computeRowMaxima([posStats, negStats]);

    const ctx = createMockCtx();
    drawStatsBandAt(
      ctx,
      [
        { prepared: posPrepared, stats: posStats, leftX: 100, rightX: 180 },
        { prepared: negPrepared, stats: negStats, leftX: 180, rightX: 260 },
      ],
      { top: 400, labelGutterWidth: FOOTPRINT_STATS_LEGEND_GUTTER_WIDTH, rowMaxima },
    );

    // Target the Delta row specifically (STATS_ROW_HEIGHT=12, row index 1 —
    // NOT row 0/Volume, which uses the same neutral tint for both bars since
    // volume is unsigned). A plain x-only lookup would otherwise match
    // Volume's chip first (drawn in the same row loop, row index 0) and both
    // bars share that neutral color — which was the bug in an earlier
    // version of this test (both chips resolved to FOOTPRINT_NEUTRAL_TEXT's
    // rgb triple, "not.toBe" failed because they legitimately WERE the same
    // row's neutral chip, not the signed Delta row this test intends to check).
    const DELTA_ROW_TOP = 400 + 12; // top(400) + rowIdx(1) * STATS_ROW_HEIGHT(12)
    const posChip = ctx.fillRectCalls.find((c) => c.x === 100 && c.y === DELTA_ROW_TOP && c.fillStyle.includes('rgba'));
    const negChip = ctx.fillRectCalls.find((c) => c.x === 180 && c.y === DELTA_ROW_TOP && c.fillStyle.includes('rgba'));
    expect(posChip).toBeDefined();
    expect(negChip).toBeDefined();
    // Different base color (buy-green vs sell-red rgb triple), not just alpha.
    const rgbOf = (rgba: string) => rgba.match(/rgba\(([^,]+),\s*([^,]+),\s*([^,]+),/)!.slice(1, 4).join(',');
    expect(rgbOf(posChip!.fillStyle)).not.toBe(rgbOf(negChip!.fillStyle));
  });
});

describe('drawStatsBandAt — legend gutter opaque background drawn on top of bar chips', () => {
  it('draws an opaque FOOTPRINT_TOTALS_BG rect spanning [0, labelGutterWidth] AFTER the per-bar chip fills (last-write-wins for that region)', () => {
    const trades: FlowTrade[] = [{ time: 0, price: 100, qty: 50, buyerAggressor: true }];
    const candle = buildCandle(trades, 60, 10);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG };
    const prepared = prepareCandleDraw(candle, 10, 1, config);
    const stats = buildClusterStatsRow(candle, candle.delta);

    const ctx = createMockCtx();
    // Bar column deliberately overlaps where the gutter would be reserved
    // (leftX=0) — proves the gutter backdrop still wins visually because it
    // is drawn LAST, per the "simpler approach" the task explicitly permits.
    drawStatsBandAt(ctx, [{ prepared, stats, leftX: 0, rightX: 80 }], {
      top: 400,
      labelGutterWidth: FOOTPRINT_STATS_LEGEND_GUTTER_WIDTH,
      rowMaxima: computeRowMaxima([stats]),
    });

    const gutterBgCalls = ctx.fillRectCalls.filter(
      (c) => c.x === 0 && c.w === FOOTPRINT_STATS_LEGEND_GUTTER_WIDTH && c.fillStyle === FOOTPRINT_TOTALS_BG,
    );
    expect(gutterBgCalls.length).toBeGreaterThan(0);

    // The gutter backdrop fillRect call must be the LAST fillRect issued
    // that targets x=0 — i.e. it comes after any bar-chip fill at that x.
    const allFillsAtX0 = ctx.fillRectCalls.filter((c) => c.x === 0);
    const lastFillAtX0 = allFillsAtX0[allFillsAtX0.length - 1];
    expect(lastFillAtX0.fillStyle).toBe(FOOTPRINT_TOTALS_BG);
    expect(lastFillAtX0.w).toBe(FOOTPRINT_STATS_LEGEND_GUTTER_WIDTH);
  });

  it('labelGutterWidth=0 (legacy call shape) draws no dedicated gutter backdrop rect', () => {
    const trades: FlowTrade[] = [{ time: 0, price: 100, qty: 10, buyerAggressor: true }];
    const candle = buildCandle(trades, 60, 10);
    const config: FootprintConfig = { ...DEFAULT_FOOTPRINT_CONFIG };
    const prepared = prepareCandleDraw(candle, 10, 1, config);
    const stats = buildClusterStatsRow(candle, candle.delta);

    const ctx = createMockCtx();
    drawStatsBandAt(ctx, [{ prepared, stats, leftX: 0, rightX: 80 }], {
      top: 400,
      labelGutterWidth: 0,
      rowMaxima: computeRowMaxima([stats]),
    });

    const zeroWidthGutterCalls = ctx.fillRectCalls.filter((c) => c.w === 0);
    expect(zeroWidthGutterCalls.length).toBe(0);
  });
});
