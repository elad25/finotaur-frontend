// src/lib/journal/breakdownDimensions.test.ts
// Vitest suite for the pure Breakdowns-tab dimension logic.

import { describe, it, expect } from 'vitest';
import type { Trade } from '@/hooks/useTradesData';
import {
  groupBySymbol,
  groupByStrategy,
  groupByDuration,
  groupByPriceRange,
  groupByMonth,
  topBottomByNetPnl,
  computeDimensionSummary,
  buildMatrix,
  makeSymbolTop10Accessor,
  MATRIX_DIMENSIONS,
} from './breakdownDimensions';

// ─── Fixture factory ──────────────────────────────────────────────────────────

let idCounter = 0;

function makeTrade(overrides: Partial<Trade>): Trade {
  idCounter += 1;
  return {
    id: `trade-${idCounter}`,
    user_id: 'user-1',
    symbol: 'MES',
    side: 'LONG',
    entry_price: 5000,
    exit_price: 5010,
    stop_price: 0,
    quantity: 1,
    multiplier: 1,
    fees: 0,
    pnl: 10,
    outcome: 'WIN',
    open_at: '2026-02-01T09:00:00Z',
    close_at: '2026-02-01T09:10:00Z',
    ...overrides,
  } as Trade;
}

// ─── groupBySymbol ──────────────────────────────────────────────────────────

describe('groupBySymbol', () => {
  it('groups trades by symbol and sorts by net P&L desc', () => {
    const trades = [
      makeTrade({ symbol: 'ES', pnl: 100 }),
      makeTrade({ symbol: 'NQ', pnl: -50 }),
      makeTrade({ symbol: 'ES', pnl: 50 }),
    ];
    const rows = groupBySymbol(trades);
    expect(rows).toHaveLength(2);
    expect(rows[0].label).toBe('ES');
    expect(rows[0].count).toBe(2);
    expect(rows[0].netPnl).toBe(150);
    expect(rows[1].label).toBe('NQ');
  });

  it('falls back to "(unknown)" for blank symbols', () => {
    const rows = groupBySymbol([makeTrade({ symbol: '' })]);
    expect(rows[0].label).toBe('(unknown)');
  });
});

// ─── groupByStrategy ────────────────────────────────────────────────────────

describe('groupByStrategy', () => {
  it('falls back to "No strategy" (not "(unset)")', () => {
    const rows = groupByStrategy([makeTrade({ strategy_name: undefined })]);
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe('No strategy');
  });

  it('groups by strategy_name', () => {
    const trades = [
      makeTrade({ strategy_name: 'ORB', pnl: 20 }),
      makeTrade({ strategy_name: 'ORB', pnl: 30 }),
      makeTrade({ strategy_name: 'VWAP Fade', pnl: -10 }),
    ];
    const rows = groupByStrategy(trades);
    expect(rows.find(r => r.label === 'ORB')?.netPnl).toBe(50);
    expect(rows.find(r => r.label === 'VWAP Fade')?.netPnl).toBe(-10);
  });
});

// ─── groupByDuration ────────────────────────────────────────────────────────

describe('groupByDuration', () => {
  it('buckets hold time by minutes across all boundaries', () => {
    const trades = [
      makeTrade({ open_at: '2026-02-01T09:00:00Z', close_at: '2026-02-01T09:00:30Z' }), // 0.5m -> <1m
      makeTrade({ open_at: '2026-02-01T09:00:00Z', close_at: '2026-02-01T09:03:00Z' }), // 3m -> 1-5m
      makeTrade({ open_at: '2026-02-01T09:00:00Z', close_at: '2026-02-01T09:10:00Z' }), // 10m -> 5-15m
      makeTrade({ open_at: '2026-02-01T09:00:00Z', close_at: '2026-02-01T09:20:00Z' }), // 20m -> 15-30m
      makeTrade({ open_at: '2026-02-01T09:00:00Z', close_at: '2026-02-01T09:45:00Z' }), // 45m -> 30m-1h
      makeTrade({ open_at: '2026-02-01T09:00:00Z', close_at: '2026-02-01T11:00:00Z' }), // 2h -> 1-4h
      makeTrade({ open_at: '2026-02-01T09:00:00Z', close_at: '2026-02-01T15:00:00Z' }), // 6h -> 4h-1d
      makeTrade({ open_at: '2026-02-01T09:00:00Z', close_at: '2026-02-03T09:00:00Z' }), // 2d -> >1d
    ];
    const rows = groupByDuration(trades);
    const labels = rows.map(r => r.label);
    expect(labels).toEqual(['< 1m', '1–5m', '5–15m', '15–30m', '30m–1h', '1–4h', '4h–1d', '> 1d']);
    for (const row of rows) {
      expect(row.count).toBe(1);
    }
  });

  it('excludes trades without close_at (still-open trades)', () => {
    const rows = groupByDuration([makeTrade({ close_at: undefined })]);
    expect(rows.every(r => r.count === 0)).toBe(true);
  });
});

// ─── groupByPriceRange ──────────────────────────────────────────────────────

describe('groupByPriceRange', () => {
  it('buckets entry_price across all boundaries', () => {
    const trades = [
      makeTrade({ entry_price: 3 }),      // <$5
      makeTrade({ entry_price: 15 }),     // $5-20
      makeTrade({ entry_price: 35 }),     // $20-50
      makeTrade({ entry_price: 75 }),     // $50-100
      makeTrade({ entry_price: 250 }),    // $100-500
      makeTrade({ entry_price: 5000 }),   // >$500 (e.g. futures contract price)
    ];
    const rows = groupByPriceRange(trades);
    const labels = rows.map(r => r.label);
    expect(labels).toEqual(['< $5', '$5–$20', '$20–$50', '$50–$100', '$100–$500', '> $500']);
    for (const row of rows) {
      expect(row.count).toBe(1);
    }
  });
});

// ─── groupByMonth ───────────────────────────────────────────────────────────

describe('groupByMonth', () => {
  it('groups by calendar month, sorted chronologically ascending', () => {
    const trades = [
      makeTrade({ open_at: '2026-03-15T09:00:00Z', pnl: 5 }),
      makeTrade({ open_at: '2026-01-05T09:00:00Z', pnl: 10 }),
      makeTrade({ open_at: '2026-01-20T09:00:00Z', pnl: 20 }),
    ];
    const rows = groupByMonth(trades);
    expect(rows.map(r => r.label)).toEqual(['2026-01', '2026-03']);
    expect(rows[0].netPnl).toBe(30);
  });
});

// ─── topBottomByNetPnl ──────────────────────────────────────────────────────

describe('topBottomByNetPnl', () => {
  it('returns top N highest and bottom N lowest by net P&L', () => {
    const rows = [
      { label: 'A', count: 5, wins: 3, netPnl: 100, totalR: 0, rCount: 0 },
      { label: 'B', count: 5, wins: 3, netPnl: -50, totalR: 0, rCount: 0 },
      { label: 'C', count: 5, wins: 3, netPnl: 20, totalR: 0, rCount: 0 },
    ];
    const { top, bottom } = topBottomByNetPnl(rows, 2);
    expect(top.map(r => r.label)).toEqual(['A', 'C']);
    expect(bottom.map(r => r.label)).toEqual(['B', 'C']);
  });
});

// ─── computeDimensionSummary ────────────────────────────────────────────────

describe('computeDimensionSummary', () => {
  it('picks best/worst/most-active only among rows meeting the min-count threshold', () => {
    const rows = [
      { label: 'Mon', count: 2, wins: 2, netPnl: 999, totalR: 0, rCount: 0 }, // excluded: count < 3
      { label: 'Tue', count: 5, wins: 4, netPnl: 200, totalR: 0, rCount: 0 },
      { label: 'Wed', count: 10, wins: 2, netPnl: -100, totalR: 0, rCount: 0 },
    ];
    const summary = computeDimensionSummary(rows, 3);
    expect(summary.best?.label).toBe('Tue');
    expect(summary.worst?.label).toBe('Wed');
    expect(summary.mostActive?.label).toBe('Wed');
  });

  it('returns all-null when no row meets the min-count threshold', () => {
    const rows = [{ label: 'X', count: 1, wins: 0, netPnl: 5, totalR: 0, rCount: 0 }];
    const summary = computeDimensionSummary(rows, 3);
    expect(summary).toEqual({ best: null, worst: null, mostActive: null });
  });
});

// ─── makeSymbolTop10Accessor ────────────────────────────────────────────────

describe('makeSymbolTop10Accessor', () => {
  it('buckets non-top-10 symbols into "Other"', () => {
    // 11 distinct symbols; symbol "S0" traded 5x (most), S1..S9 traded once, S10 traded once.
    const trades: Trade[] = [];
    for (let i = 0; i < 5; i++) trades.push(makeTrade({ symbol: 'S0' }));
    for (let i = 1; i <= 10; i++) trades.push(makeTrade({ symbol: `S${i}` }));

    const accessor = makeSymbolTop10Accessor(trades);
    expect(accessor(makeTrade({ symbol: 'S0' }))).toBe('S0');
    // S1-S9 (9 symbols) + S0 = top 10; S10 is the 11th distinct symbol -> "Other"
    expect(accessor(makeTrade({ symbol: 'S10' }))).toBe('Other');
  });
});

// ─── buildMatrix ────────────────────────────────────────────────────────────

describe('buildMatrix', () => {
  it('builds cells keyed by row||col and finds the best cell (count >= 3)', () => {
    const trades = [
      makeTrade({ strategy_name: 'ORB', session: 'NY AM', pnl: 50 }),
      makeTrade({ strategy_name: 'ORB', session: 'NY AM', pnl: 50 }),
      makeTrade({ strategy_name: 'ORB', session: 'NY AM', pnl: 50 }),
      makeTrade({ strategy_name: 'Fade', session: 'London', pnl: 5 }),
    ];
    const rowDim = MATRIX_DIMENSIONS.find(d => d.id === 'strategy')!;
    const colDim = MATRIX_DIMENSIONS.find(d => d.id === 'session')!;
    const result = buildMatrix(trades, rowDim.getAccessor(trades), colDim.getAccessor(trades));

    expect(result.rowKeys).toContain('ORB');
    expect(result.colKeys).toContain('NY AM');
    expect(result.bestCell?.rowKey).toBe('ORB');
    expect(result.bestCell?.row.netPnl).toBe(150);
    expect(result.capped).toBe(false);
  });

  it('caps an axis to the top 20 keys by trade count once it exceeds 30 distinct keys', () => {
    // 35 distinct raw symbols, one trade each, all sharing one column value.
    // (The registry's own "symbol" dimension already caps to top10+"Other" internally,
    // so this test uses a raw per-trade accessor to exercise buildMatrix's generic cap.)
    const trades: Trade[] = [];
    for (let i = 0; i < 35; i++) {
      trades.push(makeTrade({ symbol: `SYM${i}`, session: 'NY AM' }));
    }
    const sessionDim = MATRIX_DIMENSIONS.find(d => d.id === 'session')!;
    const rawSymbolAccessor = (t: Trade) => t.symbol;
    const result = buildMatrix(trades, rawSymbolAccessor, sessionDim.getAccessor(trades));

    expect(result.rowKeys.length).toBe(20);
    expect(result.capped).toBe(true);
  });
});
