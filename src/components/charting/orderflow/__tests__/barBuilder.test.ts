// src/components/charting/orderflow/__tests__/barBuilder.test.ts
//
// Coverage for the bar-type FOUNDATION (barBuilder.ts): tick bars, volume
// bars (incl. the oversized-trade rule), OHLC/delta/tradeCount correctness,
// the batch(buildBars)==incremental(BarBuilder.push) property, threshold
// ladder rounding, and the FlowBinStore cross-check for binsFromTrades().

import { describe, it, expect } from 'vitest';
import {
  buildBars,
  BarBuilder,
  suggestTickThreshold,
  suggestVolumeThreshold,
  binsFromTrades,
  type BarAggregation,
} from '../barBuilder';
import { FlowBinStore } from '../flowBinStore';
import type { FlowTrade } from '../types';

function buildTrades(count: number, startMs = 0, stepMs = 1000): FlowTrade[] {
  const trades: FlowTrade[] = [];
  for (let i = 0; i < count; i++) {
    trades.push({
      time: startMs + i * stepMs,
      price: 19500 + Math.sin(i / 7) * 5,
      qty: 1 + (i % 3),
      buyerAggressor: i % 2 === 0,
    });
  }
  return trades;
}

// ─── Tick bars ───────────────────────────────────────────────────────────

describe('buildBars — tick aggregation', () => {
  it('closes a bar every N trades', () => {
    const trades = buildTrades(10, 0, 1000); // 10 trades, tradesPerBar=3 → 3 full bars + 1 tail(1)
    const bars = buildBars(trades, { kind: 'tick', tradesPerBar: 3 });

    expect(bars.length).toBe(4);
    expect(bars[0].tradeCount).toBe(3);
    expect(bars[1].tradeCount).toBe(3);
    expect(bars[2].tradeCount).toBe(3);
    expect(bars[3].tradeCount).toBe(1); // tail bar (incomplete, still returned)
  });

  it('produces exact multiples with no tail when count is divisible', () => {
    const trades = buildTrades(9, 0, 1000);
    const bars = buildBars(trades, { kind: 'tick', tradesPerBar: 3 });
    expect(bars.length).toBe(3);
    expect(bars.every((b) => b.tradeCount === 3)).toBe(true);
  });
});

// ─── Volume bars + oversized-trade rule ─────────────────────────────────

describe('buildBars — volume aggregation', () => {
  it('closes a bar once cumulative volume reaches the threshold', () => {
    const trades: FlowTrade[] = [
      { time: 0, price: 100, qty: 2, buyerAggressor: true },
      { time: 1000, price: 101, qty: 2, buyerAggressor: true },
      { time: 2000, price: 99, qty: 1, buyerAggressor: false }, // cum=5 >= 5 → closes
      { time: 3000, price: 102, qty: 3, buyerAggressor: true }, // starts new bar
    ];
    const bars = buildBars(trades, { kind: 'volume', volumePerBar: 5 });

    expect(bars.length).toBe(2);
    expect(bars[0].volume).toBe(5);
    expect(bars[0].tradeCount).toBe(3);
    expect(bars[1].volume).toBe(3);
    expect(bars[1].tradeCount).toBe(1);
  });

  it('oversized-trade rule: a single trade that crosses the threshold closes its own bar without splitting', () => {
    const trades: FlowTrade[] = [
      { time: 0, price: 100, qty: 1, buyerAggressor: true }, // cum=1
      { time: 1000, price: 101, qty: 50, buyerAggressor: true }, // cum=51 >= 5 → closes, NOT split
      { time: 2000, price: 102, qty: 1, buyerAggressor: false }, // starts fresh bar
    ];
    const bars = buildBars(trades, { kind: 'volume', volumePerBar: 5 });

    expect(bars.length).toBe(2);
    expect(bars[0].volume).toBe(51); // full overflow stays in the bar it landed in
    expect(bars[0].tradeCount).toBe(2);
    expect(bars[1].volume).toBe(1);
    expect(bars[1].tradeCount).toBe(1);
  });
});

// ─── OHLC / delta / tradeCount correctness ──────────────────────────────

describe('buildBars — OHLC/delta/tradeCount correctness (fixed fixture)', () => {
  const fixture: FlowTrade[] = [
    { time: 0, price: 100, qty: 2, buyerAggressor: true }, // +2
    { time: 1000, price: 105, qty: 1, buyerAggressor: true }, // +1 (high=105)
    { time: 2000, price: 98, qty: 3, buyerAggressor: false }, // -3 (low=98)
    { time: 3000, price: 102, qty: 1, buyerAggressor: false }, // -1 (close=102)
  ];

  it('computes open/high/low/close/volume/delta/tradeCount/startTime/endTime for a single tick bar', () => {
    const bars = buildBars(fixture, { kind: 'tick', tradesPerBar: 4 });
    expect(bars.length).toBe(1);
    const bar = bars[0];
    expect(bar.open).toBe(100);
    expect(bar.high).toBe(105);
    expect(bar.low).toBe(98);
    expect(bar.close).toBe(102);
    expect(bar.volume).toBe(2 + 1 + 3 + 1);
    expect(bar.delta).toBe(2 + 1 - 3 - 1); // -1
    expect(bar.tradeCount).toBe(4);
    expect(bar.startTime).toBe(0);
    expect(bar.endTime).toBe(3000);
  });

  it('computes the same fields for a single volume bar covering the whole fixture', () => {
    const bars = buildBars(fixture, { kind: 'volume', volumePerBar: 100 }); // never trips → 1 tail bar
    expect(bars.length).toBe(1);
    const bar = bars[0];
    expect(bar.open).toBe(100);
    expect(bar.high).toBe(105);
    expect(bar.low).toBe(98);
    expect(bar.close).toBe(102);
    expect(bar.delta).toBe(-1);
    expect(bar.tradeCount).toBe(4);
  });

  it('time bars bucket by intervalMs and reproduce the same OHLC when the whole fixture fits one bucket', () => {
    const bars = buildBars(fixture, { kind: 'time', intervalMs: 60_000 });
    expect(bars.length).toBe(1);
    expect(bars[0].open).toBe(100);
    expect(bars[0].close).toBe(102);
    expect(bars[0].high).toBe(105);
    expect(bars[0].low).toBe(98);
    expect(bars[0].delta).toBe(-1);
  });

  it('time bars split across bucket boundaries', () => {
    const trades: FlowTrade[] = [
      { time: 0, price: 100, qty: 1, buyerAggressor: true },
      { time: 500, price: 101, qty: 1, buyerAggressor: true },
      { time: 1000, price: 102, qty: 1, buyerAggressor: false }, // next 1000ms bucket
    ];
    const bars = buildBars(trades, { kind: 'time', intervalMs: 1000 });
    expect(bars.length).toBe(2);
    expect(bars[0].tradeCount).toBe(2);
    expect(bars[0].close).toBe(101);
    expect(bars[1].tradeCount).toBe(1);
    expect(bars[1].open).toBe(102);
  });
});

// ─── batch == incremental property ──────────────────────────────────────

describe('buildBars vs BarBuilder.push — batch/incremental equivalence', () => {
  const aggregations: BarAggregation[] = [
    { kind: 'time', intervalMs: 5000 },
    { kind: 'tick', tradesPerBar: 7 },
    { kind: 'volume', volumePerBar: 15 },
  ];

  for (const agg of aggregations) {
    it(`produces identical bars for kind=${agg.kind}`, () => {
      const trades = buildTrades(123, 0, 400);

      const batchBars = buildBars(trades, agg);

      const builder = new BarBuilder(agg);
      const incrementalBars = [];
      for (const trade of trades) {
        const closed = builder.push(trade);
        if (closed) incrementalBars.push(closed);
      }
      const tail = builder.current();
      if (tail) incrementalBars.push(tail);

      expect(incrementalBars).toEqual(batchBars);
    });
  }
});

// ─── Threshold ladder rounding ───────────────────────────────────────────

describe('suggestTickThreshold', () => {
  it('rounds up to the 1/2/5 x 10^n ladder, targeting ~1 bar per 30s', () => {
    // 60 trades/min → target 30/bar → ladder rounds up to 50
    expect(suggestTickThreshold(60)).toBe(50);
    // 120 trades/min → target 60/bar → ladder rounds up to 100
    expect(suggestTickThreshold(120)).toBe(100);
    // 10 trades/min → target 5/bar → already on ladder
    expect(suggestTickThreshold(10)).toBe(5);
    // 4 trades/min → target 2/bar → already on ladder
    expect(suggestTickThreshold(4)).toBe(2);
  });

  it('never returns less than 1 and handles non-positive pace', () => {
    expect(suggestTickThreshold(0)).toBe(1);
    expect(suggestTickThreshold(-5)).toBe(1);
    expect(suggestTickThreshold(1)).toBeGreaterThanOrEqual(1);
  });
});

describe('suggestVolumeThreshold', () => {
  it('rounds up to the 1/2/5 x 10^n ladder, targeting ~1 bar per 30s', () => {
    // 200 qty/min → target 100/bar → already on ladder
    expect(suggestVolumeThreshold(200)).toBe(100);
    // 240 qty/min → target 120/bar → ladder rounds up to 200
    expect(suggestVolumeThreshold(240)).toBe(200);
    // 8 qty/min → target 4/bar → ladder rounds up to 5
    expect(suggestVolumeThreshold(8)).toBe(5);
  });

  it('never returns non-positive and handles non-positive pace', () => {
    expect(suggestVolumeThreshold(0)).toBeGreaterThan(0);
    expect(suggestVolumeThreshold(-10)).toBeGreaterThan(0);
  });
});

// ─── binsFromTrades cross-check vs FlowBinStore ─────────────────────────

describe('binsFromTrades — cross-check against FlowBinStore', () => {
  it('produces identical bins (sorted by binPrice) for the same trade fixture', () => {
    const trades = buildTrades(200, 0, 750);
    const rowSize = 1;

    const store = new FlowBinStore({ intervalSec: 3600, rowSize }); // one giant candle
    store.applyTrades(trades);
    const candle = store.getCandle(0);
    expect(candle).not.toBeNull();

    const bins = binsFromTrades(trades, rowSize);

    expect(bins).toEqual(candle!.bins);
  });

  it('matches FlowBinStore bin math on a small hand-checked fixture', () => {
    const trades: FlowTrade[] = [
      { time: 0, price: 100.4, qty: 1, buyerAggressor: true },
      { time: 1000, price: 100.6, qty: 2, buyerAggressor: true },
      { time: 2000, price: 100.9, qty: 1.5, buyerAggressor: false },
      { time: 3000, price: 105.1, qty: 3, buyerAggressor: false },
    ];
    const rowSize = 1;

    const store = new FlowBinStore({ intervalSec: 3600, rowSize });
    store.applyTrades(trades);
    const candle = store.getCandle(0);

    const bins = binsFromTrades(trades, rowSize);
    expect(bins).toEqual(candle!.bins);
    expect(bins.length).toBe(2);
    expect(bins[0].binPrice).toBe(100);
    expect(bins[0].buyVol).toBe(3);
    expect(bins[0].sellVol).toBe(1.5);
    expect(bins[1].binPrice).toBe(105);
    expect(bins[1].sellVol).toBe(3);
  });
});
