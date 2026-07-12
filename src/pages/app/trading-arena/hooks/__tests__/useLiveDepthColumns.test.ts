// src/pages/app/trading-arena/hooks/__tests__/useLiveDepthColumns.test.ts
//
// Exercises the pure sampling/ring functions useLiveDepthColumns.ts is
// built on (no React render harness in this codebase — see
// useLiquidityPreferences.test.ts's header comment for the same
// convention): book -> DecodedColumn sampling (bin size, notional
// multiplier, floor filter, grid slotting), and the ring-buffer append/cap
// behavior.

import { describe, expect, it } from 'vitest';
import {
  RING_CAP,
  SAMPLE_INTERVAL_MS,
  appendColumnToRing,
  binFloor,
  computeBinSize,
  sampleBookToColumn,
  usdToQ,
} from '../useLiveDepthColumns';
import type { DecodedColumn } from '@/pages/app/crypto/scanner/depthTypes';

function emptyBook() {
  return { bids: new Map<number, number>(), asks: new Map<number, number>() };
}

describe('sampleBookToColumn', () => {
  it('returns null when both sides of the book are empty', () => {
    const col = sampleBookToColumn(emptyBook(), { notionalMultiplier: 1, floorUsd: 0, nowMs: 1_000 });
    expect(col).toBeNull();
  });

  it('samples bids+asks into notional-weighted bins, slotted onto the 5s grid', () => {
    const book = {
      bids: new Map([[18500, 4]]), // price 18500, qty 4
      asks: new Map([[18500.25, 2]]),
    };
    const col = sampleBookToColumn(book, { notionalMultiplier: 20, floorUsd: 0, nowMs: 1_700_000_007_500 });

    expect(col).not.toBeNull();
    // nowMs=…07500 floors to the 5s slot …05000.
    expect(col!.t).toBe(Math.floor(1_700_000_007_500 / SAMPLE_INTERVAL_MS) * SAMPLE_INTERVAL_MS);
    expect(col!.anchor).toBeCloseTo((18500 + 18500.25) / 2, 5);
    expect(col!.bids).toHaveLength(1);
    expect(col!.asks).toHaveLength(1);
    // notional = price * qty * multiplier = 18500 * 4 * 20 = 1_480_000
    expect(col!.bids[0].q).toBe(usdToQ(18500 * 4 * 20));
  });

  it('applies notionalMultiplier — the SAME resting size produces a larger notional at a higher multiplier', () => {
    const book = { bids: new Map([[100, 10]]), asks: new Map<number, number>() };
    const low = sampleBookToColumn(book, { notionalMultiplier: 1, floorUsd: 0, nowMs: 0 })!;
    const high = sampleBookToColumn(book, { notionalMultiplier: 20, floorUsd: 0, nowMs: 0 })!;
    expect(high.bids[0].q).toBeGreaterThan(low.bids[0].q);
  });

  it('drops bins below floorUsd', () => {
    const book = { bids: new Map([[100, 1]]), asks: new Map<number, number>() }; // notional = 100 * 1 * 1 = 100
    const belowFloor = sampleBookToColumn(book, { notionalMultiplier: 1, floorUsd: 1_000, nowMs: 0 })!;
    expect(belowFloor.bids).toHaveLength(0);

    const aboveFloor = sampleBookToColumn(book, { notionalMultiplier: 1, floorUsd: 50, nowMs: 0 })!;
    expect(aboveFloor.bids).toHaveLength(1);
  });

  it('ignores non-positive price/qty levels defensively', () => {
    const book = { bids: new Map([[0, 5], [-1, 5], [100, 3]]), asks: new Map([[50, 0]]) };
    const col = sampleBookToColumn(book, { notionalMultiplier: 1, floorUsd: 0, nowMs: 0 })!;
    expect(col.bids).toHaveLength(1); // only price=100 survives
    expect(col.asks).toHaveLength(0); // qty=0 dropped
  });

  it('mid price falls back to the single-sided price when only bids or only asks exist', () => {
    const bidsOnly = sampleBookToColumn(
      { bids: new Map([[100, 1]]), asks: new Map() },
      { notionalMultiplier: 1, floorUsd: 0, nowMs: 0 },
    )!;
    expect(bidsOnly.anchor).toBe(100);

    const asksOnly = sampleBookToColumn(
      { bids: new Map(), asks: new Map([[200, 1]]) },
      { notionalMultiplier: 1, floorUsd: 0, nowMs: 0 },
    )!;
    expect(asksOnly.anchor).toBe(200);
  });
});

describe('binFloor / usdToQ / computeBinSize', () => {
  it('binFloor rounds down to the nearest bin boundary', () => {
    expect(binFloor(18507.3, 5)).toBe(18505);
    expect(binFloor(18505, 5)).toBe(18505);
  });

  it('usdToQ is monotonically increasing in the notional value', () => {
    expect(usdToQ(100)).toBeLessThan(usdToQ(10_000));
    expect(usdToQ(0)).toBe(0);
  });

  it('computeBinSize never returns 0/NaN for a sane mid price', () => {
    expect(computeBinSize(18500)).toBeGreaterThan(0);
    expect(computeBinSize(0)).toBe(1); // defensive fallback
    expect(computeBinSize(NaN)).toBe(1);
  });
});

describe('appendColumnToRing', () => {
  function col(t: number): DecodedColumn {
    return { t, anchor: 100, binSize: 1, flags: 0, bids: [], asks: [] };
  }

  it('appends a new slot as a new entry', () => {
    const ring = appendColumnToRing([col(0)], col(5_000), 10);
    expect(ring.map((c) => c.t)).toEqual([0, 5_000]);
  });

  it('replaces the last entry in place when the new column shares the same slot', () => {
    const first = col(5_000);
    const ring = appendColumnToRing([col(0), first], { ...col(5_000), anchor: 999 }, 10);
    expect(ring).toHaveLength(2);
    expect(ring[1].anchor).toBe(999);
  });

  it('trims from the front once the ring exceeds the cap', () => {
    let ring: DecodedColumn[] = [];
    for (let i = 0; i < 5; i++) {
      ring = appendColumnToRing(ring, col(i * SAMPLE_INTERVAL_MS), 3);
    }
    expect(ring).toHaveLength(3);
    // Oldest two (t=0, t=5000) evicted — only the most recent 3 slots remain.
    expect(ring.map((c) => c.t)).toEqual([2, 3, 4].map((i) => i * SAMPLE_INTERVAL_MS));
  });

  it('uses the RING_CAP constant as the hook wires it (~4h at one column per 5s)', () => {
    expect(RING_CAP).toBe(2_880);
    expect(RING_CAP * SAMPLE_INTERVAL_MS).toBe(4 * 60 * 60 * 1000);
  });
});
