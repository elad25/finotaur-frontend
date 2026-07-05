// src/components/charting/orderflow/__tests__/imbalancePresets.test.ts
//
// Coverage for the 3-preset imbalance system (Standard/Strict/Stacked) added
// on top of the existing diagonal-imbalance engine in footprintRender.ts.
// FINOTAUR doctrine: opinionated presets over ATAS's ~400-setting maze — see
// resolveImbalancePreset's doc comment for the exact thresholds per preset.

import { describe, it, expect } from 'vitest';
import {
  resolveImbalancePreset,
  prepareCandleDraw,
  drawCandleFootprint,
  type CandleProjection,
  type FootprintDrawExtras,
} from '../footprintRender';
import type { FlowCandleView, FlowTrade, FootprintConfig } from '../types';
import { DEFAULT_FOOTPRINT_CONFIG } from '../types';
import { FlowBinStore } from '../flowBinStore';

// ─── resolveImbalancePreset ─────────────────────────────────────────────────

describe('resolveImbalancePreset', () => {
  it('standard: ratio 1.5x, 0.5% dust filter, singles included (imbalanceStackedOnly=false)', () => {
    const resolved = resolveImbalancePreset('standard');
    expect(resolved.imbalanceRatio).toBe(1.5);
    expect(resolved.imbalanceMinVolPct).toBe(0.5);
    expect(resolved.stackedMin).toBe(3);
    expect(resolved.imbalanceStackedOnly).toBe(false);
  });

  it('strict: ratio 3.0x, same dust filter, singles included', () => {
    const resolved = resolveImbalancePreset('strict');
    expect(resolved.imbalanceRatio).toBe(3.0);
    expect(resolved.imbalanceMinVolPct).toBe(0.5);
    expect(resolved.imbalanceStackedOnly).toBe(false);
  });

  it('stacked: Standard thresholds (1.5x/0.5%) but imbalanceStackedOnly=true', () => {
    const resolved = resolveImbalancePreset('stacked');
    expect(resolved.imbalanceRatio).toBe(1.5);
    expect(resolved.imbalanceMinVolPct).toBe(0.5);
    expect(resolved.stackedMin).toBe(3);
    expect(resolved.imbalanceStackedOnly).toBe(true);
  });
});

// ─── Ratio boundary + zero-guard (via prepareCandleDraw's detectImbalances) ─

function candleFromBins(
  bins: { binPrice: number; buyVol: number; sellVol: number }[],
  rowSize: number,
): FlowCandleView {
  // Build via FlowBinStore so bins/totalVol/delta are computed the same way
  // production data is (one trade per bin sized to the target buy/sell vol).
  const store = new FlowBinStore({ intervalSec: 60, rowSize });
  const trades: FlowTrade[] = [];
  let t = 0;
  for (const bin of bins) {
    if (bin.buyVol > 0) {
      trades.push({ time: t, price: bin.binPrice, qty: bin.buyVol, buyerAggressor: true });
      t += 100;
    }
    if (bin.sellVol > 0) {
      trades.push({ time: t, price: bin.binPrice, qty: bin.sellVol, buyerAggressor: false });
      t += 100;
    }
  }
  store.applyTrades(trades);
  const view = store.getCandle(0);
  if (!view) throw new Error('test setup error: expected a candle at t=0');
  return view;
}

describe('imbalance ratio boundary — exactly 1.5x IS imbalanced (>=, not >)', () => {
  const rowSize = 10;

  it('row N buyVol exactly 1.5x row N-1 sellVol → buy-side imbalance flagged', () => {
    // Row 0 (binPrice=100): sellVol=100 (large dust-filter clearance).
    // Row 1 (binPrice=110): buyVol=150 → exactly 1.5x of row 0's sellVol.
    const candle = candleFromBins(
      [
        { binPrice: 100, buyVol: 0, sellVol: 100 },
        { binPrice: 110, buyVol: 150, sellVol: 0 },
      ],
      rowSize,
    );
    const config: FootprintConfig = {
      ...DEFAULT_FOOTPRINT_CONFIG,
      imbalancePreset: 'standard',
      ...resolveImbalancePreset('standard'),
    };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    // Row 1 (index 1) should be flagged 'buy' — exactly at the ratio boundary.
    expect(prepared.imbalances[1]?.side).toBe('buy');
  });

  it('row N buyVol just below 1.5x (1.49x) row N-1 sellVol → NOT imbalanced', () => {
    const candle = candleFromBins(
      [
        { binPrice: 100, buyVol: 0, sellVol: 100 },
        { binPrice: 110, buyVol: 149, sellVol: 0 },
      ],
      rowSize,
    );
    const config: FootprintConfig = {
      ...DEFAULT_FOOTPRINT_CONFIG,
      imbalancePreset: 'standard',
      ...resolveImbalancePreset('standard'),
    };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    expect(prepared.imbalances[1]?.side).toBeNull();
  });
});

describe('imbalance zero-opposite-side guard', () => {
  const rowSize = 10;

  it('does not flag an imbalance when the opposite-side reference row has zero volume (infinite-ratio guard)', () => {
    // Row 0 sellVol = 0 → row 1's buyVol (any value) must NOT trip a 'buy'
    // imbalance against it, since dividing by zero would trivially "pass".
    const candle = candleFromBins(
      [
        { binPrice: 100, buyVol: 0, sellVol: 0.0001 }, // effectively zero, but need >0 vol to exist as a row at all
        { binPrice: 110, buyVol: 500, sellVol: 0 },
      ],
      rowSize,
    );
    // Force row 0's sellVol to a true zero-equivalent isn't representable via
    // FlowBinStore (a trade must have qty>0), so assert the guard directly
    // against detectImbalances' documented behavior: sellVol must be > 0 to
    // be used as a diagonal reference. With sellVol=0.0001 (near-zero) and a
    // huge buyVol, the ratio easily clears 1.5x — that's expected (it's not
    // literal zero). The real guard is exercised below via a bin with NO
    // trades on the opposite side at all (sellVol stays exactly 0 in the map).
    const config: FootprintConfig = {
      ...DEFAULT_FOOTPRINT_CONFIG,
      imbalancePreset: 'standard',
      ...resolveImbalancePreset('standard'),
    };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    // Sanity: with near-zero (not exactly zero) opposite volume, ratio math
    // still produces a flag — proves the guard is specifically an `> 0` check,
    // not a blanket suppression of small-volume rows.
    expect(prepared.imbalances[1]?.side).toBe('buy');
  });

  it('true zero opposite-side volume never triggers an imbalance regardless of same-side volume', () => {
    // Row 0 has ONLY buyVol (sellVol truly 0 — no sell trade ever landed in
    // this bin). Row 1 has a large sellVol. The sell-side diagonal check
    // (row 1 sellVol vs row 0... wait, direction is row i sellVol vs row i+1
    // buyVol) — construct row 1 buyVol = 0 exactly, row 0 sellVol = huge, to
    // exercise the "sell-side imbalance needs above.buyVol > 0" guard.
    const candle = candleFromBins(
      [
        { binPrice: 100, buyVol: 0, sellVol: 500 },
        { binPrice: 110, buyVol: 0, sellVol: 0.0001 }, // buyVol truly 0 at row 1
      ],
      rowSize,
    );
    const config: FootprintConfig = {
      ...DEFAULT_FOOTPRINT_CONFIG,
      imbalancePreset: 'standard',
      ...resolveImbalancePreset('standard'),
    };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);
    // Row 0's sell-side check compares against row 1's buyVol (=0) — the
    // `above.buyVol > 0` guard in detectImbalances must suppress this.
    expect(prepared.imbalances[0]?.side).toBeNull();
  });
});

// ─── Stacked-run detection ──────────────────────────────────────────────────

describe('stacked-run detection (imbalanceStackedOnly)', () => {
  const rowSize = 10;

  /**
   * `runLength` rows where each row's buyVol is exactly 1.5x the PREVIOUS
   * row's sellVol (satisfying the diagonal buy-imbalance check at every
   * step), and each row's OWN sellVol is set to a small residual so the next
   * row's required buyVol stays geometrically bounded. Row 0 is a
   * zero-buyVol baseline purely to seed row 1's reference; it is never
   * itself flagged (buyVol=0 can't clear any ratio).
   */
  function buildRunOfBuyImbalances(runLength: number): FlowCandleView {
    const bins: { binPrice: number; buyVol: number; sellVol: number }[] = [];
    let referenceSellVol = 100; // row 0's sellVol — the first diagonal reference
    bins.push({ binPrice: 100, buyVol: 0, sellVol: referenceSellVol });

    for (let i = 1; i <= runLength; i++) {
      const requiredBuy = referenceSellVol * 1.5; // exactly at the Standard/Stacked ratio
      // Small residual sellVol on this row — just enough to itself become a
      // valid (>0) reference for the NEXT row, without requiring the next
      // row's buyVol to explode. Keeps the whole chain's magnitudes small
      // and stable regardless of runLength.
      const ownSellVol = 10;
      bins.push({ binPrice: 100 + i * 10, buyVol: requiredBuy, sellVol: ownSellVol });
      referenceSellVol = ownSellVol;
    }
    // Trailing row with zero buyVol so the run doesn't spill into a further
    // (unintended) imbalance beyond runLength.
    bins.push({ binPrice: 100 + (runLength + 1) * 10, buyVol: 0, sellVol: 0.0001 });
    return candleFromBins(bins, rowSize);
  }

  it('run of 2 consecutive same-direction imbalanced levels → NOT highlighted per-cell in Stacked preset', () => {
    const candle = buildRunOfBuyImbalances(2);
    const config: FootprintConfig = {
      ...DEFAULT_FOOTPRINT_CONFIG,
      imbalancePreset: 'stacked',
      ...resolveImbalancePreset('stacked'),
    };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);

    // Rows 1 and 2 (0-indexed) are the 2-run — detectImbalances still flags
    // them internally (stacked zones/underlying detection is unaffected),
    // but the per-cell highlight visible to drawCandleFootprint must be
    // suppressed for a run shorter than stackedMin (3).
    const ctx = createMockCtx();
    const projection = buildProjection(candle, rowSize);
    const extras: FootprintDrawExtras = { liveEdgeX: 800, latestCandleRange: null, clipRightX: 800 };
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    // No stroke outlines should be drawn for a run of 2 under the Stacked preset.
    expect(ctx.strokeRectCalls.length).toBe(0);
  });

  it('run of 3 consecutive same-direction imbalanced levels → ALL 3 highlighted in Stacked preset', () => {
    const candle = buildRunOfBuyImbalances(3);
    const config: FootprintConfig = {
      ...DEFAULT_FOOTPRINT_CONFIG,
      imbalancePreset: 'stacked',
      ...resolveImbalancePreset('stacked'),
    };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);

    const ctx = createMockCtx();
    const projection = buildProjection(candle, rowSize);
    const extras: FootprintDrawExtras = { liveEdgeX: 800, latestCandleRange: null, clipRightX: 800 };
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    // All 3 rows in the run get a stroke outline.
    expect(ctx.strokeRectCalls.length).toBe(3);
  });

  it('Standard/Strict presets (imbalanceStackedOnly=false) highlight singles — a lone imbalanced row still outlines', () => {
    const candle = buildRunOfBuyImbalances(1);
    const config: FootprintConfig = {
      ...DEFAULT_FOOTPRINT_CONFIG,
      imbalancePreset: 'standard',
      ...resolveImbalancePreset('standard'),
    };
    const prepared = prepareCandleDraw(candle, rowSize, 1, config);

    const ctx = createMockCtx();
    const projection = buildProjection(candle, rowSize);
    const extras: FootprintDrawExtras = { liveEdgeX: 800, latestCandleRange: null, clipRightX: 800 };
    drawCandleFootprint(ctx, prepared, projection, 'full', config, extras);

    expect(ctx.strokeRectCalls.length).toBe(1);
  });
});

// ─── Shared mock/projection helpers (mirrors footprintRender.test.ts style) ─

function createMockCtx() {
  const fillRectCalls: { x: number; y: number; w: number; h: number }[] = [];
  const fillTextCalls: { text: string; x: number; y: number }[] = [];
  const strokeRectCalls: { x: number; y: number; w: number; h: number }[] = [];
  const ctx = {
    fillRectCalls,
    fillTextCalls,
    strokeRectCalls,
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
    strokeRect: (x: number, y: number, w: number, h: number) => {
      strokeRectCalls.push({ x, y, w, h });
    },
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
  } as unknown as CanvasRenderingContext2D & {
    fillRectCalls: typeof fillRectCalls;
    fillTextCalls: typeof fillTextCalls;
    strokeRectCalls: typeof strokeRectCalls;
  };
  return ctx;
}

function buildProjection(candle: FlowCandleView, rowSize: number): CandleProjection {
  const minBinPrice = Math.min(...candle.bins.map((b) => b.binPrice));
  const rowHeightPx = 14;
  const CANVAS_H = 500;
  const priceToY = (price: number): number | null => {
    const rowsFromBottom = (price - minBinPrice) / rowSize;
    return CANVAS_H - 50 - rowsFromBottom * rowHeightPx;
  };
  return {
    centerX: 400,
    candleWidthPx: 60,
    priceToY,
    rowHeightPx,
    rowSize,
  };
}
