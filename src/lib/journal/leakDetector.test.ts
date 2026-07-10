// src/lib/journal/leakDetector.test.ts
// Vitest suite for the Leak Detector pure function.
// All expected values are hand-computed from the rules in leakDetector.ts.

import { describe, it, expect } from 'vitest';
import { buildLeakReport } from './leakDetector';
import type { Trade } from '@/hooks/useTradesData';

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
    take_profit_price: undefined,
    quantity: 1,
    multiplier: 1,
    fees: 0,
    pnl: 10,
    outcome: 'WIN',
    open_at: '2026-02-01T09:00:00Z',
    close_at: '2026-02-01T09:10:00Z',
    created_at: '2026-02-01T09:00:00Z',
    updated_at: '2026-02-01T09:10:00Z',
    ...overrides,
  };
}

/** ISO timestamp helper: day 1-28 of Feb 2026, given hour/minute (UTC). */
function iso(day: number, hour: number, minute: number): string {
  return `2026-02-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`;
}

// ─── Collecting status (< 30 trades) ───────────────────────────────────────────

describe('buildLeakReport — collecting status', () => {
  it('returns status "collecting" with null verdict when under 30 trades', () => {
    const trades = Array.from({ length: 10 }, (_, i) =>
      makeTrade({ id: `t-${i}`, pnl: -10, outcome: 'LOSS' }),
    );
    const report = buildLeakReport(trades);
    expect(report.status).toBe('collecting');
    expect(report.tradesAnalyzed).toBe(10);
    expect(report.minTradesRequired).toBe(30);
    expect(report.verdict).toBeNull();
    expect(report.leaks).toEqual([]);
    expect(report.cleanBill).toBe(false);
  });

  it('returns collecting for an empty trade list', () => {
    const report = buildLeakReport([]);
    expect(report.status).toBe('collecting');
    expect(report.tradesAnalyzed).toBe(0);
  });
});

// ─── Clean bill (60 profitable, disciplined trades) ────────────────────────────

describe('buildLeakReport — clean bill', () => {
  it('reports cleanBill=true for 60 disciplined, profitable, well-spread trades', () => {
    const trades = Array.from({ length: 60 }, (_, i) => {
      const day = (i % 28) + 1;
      const hour = 8 + (i % 8); // spread across 8 different hours
      return makeTrade({
        id: `clean-${i}`,
        symbol: 'MES',
        entry_price: 5000,
        exit_price: 5010,
        quantity: 1,
        multiplier: 1,
        pnl: 50,
        outcome: 'WIN',
        stop_price: 0,
        take_profit_price: undefined,
        open_at: iso(day, hour, 0),
        close_at: iso(day, hour, 10),
      });
    });

    const report = buildLeakReport(trades);
    expect(report.status).toBe('ok');
    expect(report.tradesAnalyzed).toBe(60);
    expect(report.cleanBill).toBe(true);
    expect(report.verdict).toBeNull();
    expect(report.leaks).toEqual([]);
  });
});

// ─── Family 1: revenge_reentry ─────────────────────────────────────────────────

describe('buildLeakReport — revenge trader', () => {
  it('verdict is revenge_reentry for a set with clustered quick-reentry losses', () => {
    const trades: Trade[] = [];

    // 10 pairs: a loss, then a quick same-symbol re-entry (also a loss) within
    // 5 minutes — each pair on its own day/hour so no other family fires.
    for (let i = 0; i < 10; i++) {
      const day = i + 1; // days 1-10
      const hour = 9 + i; // distinct hour per pair, avoids toxic_bucket clustering
      trades.push(
        makeTrade({
          id: `victim-${i}`,
          symbol: 'MES',
          entry_price: 5000,
          exit_price: 4990,
          quantity: 1,
          multiplier: 1,
          pnl: -50,
          outcome: 'LOSS',
          open_at: iso(day, hour, 0),
          close_at: iso(day, hour, 10),
        }),
      );
      trades.push(
        makeTrade({
          id: `revenge-${i}`,
          symbol: 'MES',
          entry_price: 5000,
          exit_price: 4984,
          quantity: 1,
          multiplier: 1,
          pnl: -80,
          outcome: 'LOSS',
          open_at: iso(day, hour, 15), // 5 min after victim's close (quick_reentry ≤15min)
          close_at: iso(day, hour, 25),
        }),
      );
    }

    // 15 unrelated, profitable padding trades on later, separate days.
    for (let i = 0; i < 15; i++) {
      const day = 11 + i;
      trades.push(
        makeTrade({
          id: `pad-${i}`,
          symbol: 'NQ',
          entry_price: 15000,
          exit_price: 15005,
          quantity: 1,
          multiplier: 1,
          pnl: 100,
          outcome: 'WIN',
          open_at: iso(day, 12, 0),
          close_at: iso(day, 12, 10),
        }),
      );
    }

    const report = buildLeakReport(trades);
    expect(report.status).toBe('ok');
    expect(report.verdict).not.toBeNull();
    expect(report.verdict!.family).toBe('revenge_reentry');
    expect(report.verdict!.costUsd).toBeGreaterThanOrEqual(100);
    expect(report.verdict!.sampleSize).toBeGreaterThanOrEqual(5);
  });
});

// ─── Family 4: early_exit ───────────────────────────────────────────────────────

describe('buildLeakReport — early exit', () => {
  it('early_exit fires with correct costUsd for winners exited at 40% of target', () => {
    // entry=5000, target=5100 (target pnl=100), exit=5040 (actual pnl=40)
    // deltaVsActual per trade = 100 - 40 = 60; 30 trades => targetGap = 1800
    const trades = Array.from({ length: 30 }, (_, i) => {
      const day = (i % 28) + 1;
      return makeTrade({
        id: `early-${i}`,
        symbol: 'MES',
        entry_price: 5000,
        exit_price: 5040,
        take_profit_price: 5100,
        stop_price: 0,
        quantity: 1,
        multiplier: 1,
        pnl: 40,
        outcome: 'WIN',
        open_at: iso(day, 8 + (i % 10), 0),
        close_at: iso(day, 8 + (i % 10), 30),
      });
    });

    const report = buildLeakReport(trades);
    const earlyExit = report.leaks.find((l) => l.family === 'early_exit');
    expect(earlyExit).toBeDefined();
    expect(earlyExit!.costUsd).toBeCloseTo(1800, 0);
    expect(earlyExit!.sampleSize).toBe(30);
    expect(earlyExit!.confidence).toBe('high'); // coveredCount (30) >= 15

    // No losses anywhere in this dataset — nothing should compete or crowd it out.
    expect(report.verdict!.family).toBe('early_exit');
  });
});

// ─── Family 3: toxic_bucket ─────────────────────────────────────────────────────

describe('buildLeakReport — toxic hour', () => {
  it('toxic_bucket fires for a concentrated losing hour (10:00-11:00)', () => {
    const trades: Trade[] = [];

    // 6 losing trades, all opened at hour=10, spread across 6 different days
    // so no other family (overtrading, revenge) is triggered.
    for (let i = 0; i < 6; i++) {
      const day = i + 1;
      trades.push(
        makeTrade({
          id: `toxic-${i}`,
          symbol: 'MES',
          entry_price: 5000,
          exit_price: 4980,
          quantity: 1,
          multiplier: 1,
          pnl: -100,
          outcome: 'LOSS',
          stop_price: 0,
          open_at: iso(day, 10, 0),
          close_at: iso(day, 10, 10),
        }),
      );
    }

    // 24 small-positive padding trades at other hours/days.
    for (let i = 0; i < 24; i++) {
      const day = 7 + i;
      const hour = 12 + (i % 8); // never hour 10
      trades.push(
        makeTrade({
          id: `okhour-${i}`,
          symbol: 'MES',
          entry_price: 5000,
          exit_price: 5005,
          quantity: 1,
          multiplier: 1,
          pnl: 5,
          outcome: 'WIN',
          stop_price: 0,
          open_at: iso(day, hour, 0),
          close_at: iso(day, hour, 10),
        }),
      );
    }

    const report = buildLeakReport(trades);
    const toxic = report.leaks.find((l) => l.family === 'toxic_bucket');
    expect(toxic).toBeDefined();
    expect(toxic!.sampleSize).toBe(6);
    expect(toxic!.costUsd).toBeCloseTo(504, 0);

    // Bucket label is derived from the LOCAL hour of open_at (browser timezone),
    // so compute the expected label the same way rather than hardcoding UTC 10:00.
    const localHour = new Date(iso(1, 10, 0)).getHours();
    const nextHour = (localHour + 1) % 24;
    const expectedLabel = `${String(localHour).padStart(2, '0')}:00-${String(nextHour).padStart(2, '0')}:00`;
    expect(toxic!.title).toContain(expectedLabel);
  });
});

// ─── Dedupe: revenge-flagged trade must not double-count in size_escalation ────

describe('buildLeakReport — revenge/size_escalation dedupe', () => {
  it('a trade flagged by detectRevenge is excluded from size_escalation evidence', () => {
    const trades: Trade[] = [];

    // Cluster A (day 1): two consecutive losses (V1, V2) followed by an
    // oversized trade "A" opened 45 minutes after V2's close — this matches
    // BOTH detectRevenge's loss_streak_chase rule (window <=60min, streak>=2)
    // AND the size_escalation pattern (gap>30min, same day, oversized, losing).
    // Because A is flagged by detectRevenge, size_escalation must skip it.
    trades.push(
      makeTrade({
        id: 'v1',
        symbol: 'MES',
        entry_price: 5000,
        exit_price: 4990,
        quantity: 1,
        multiplier: 1,
        pnl: -50,
        outcome: 'LOSS',
        stop_price: 0,
        open_at: iso(1, 9, 0),
        close_at: iso(1, 9, 10),
      }),
    );
    trades.push(
      makeTrade({
        id: 'v2',
        symbol: 'MES',
        entry_price: 5000,
        exit_price: 4990,
        quantity: 1,
        multiplier: 1,
        pnl: -50,
        outcome: 'LOSS',
        stop_price: 0,
        open_at: iso(1, 9, 20),
        close_at: iso(1, 9, 30),
      }),
    );
    trades.push(
      makeTrade({
        id: 'trade-A',
        symbol: 'MES',
        entry_price: 5000,
        exit_price: 4950,
        quantity: 3, // 3x the qty=1 baseline notional → escalation
        multiplier: 1,
        pnl: -150,
        outcome: 'LOSS',
        stop_price: 0,
        open_at: iso(1, 10, 15), // 45 min after v2's close (09:30 -> 10:15)
        close_at: iso(1, 10, 25),
      }),
    );

    // 6 independent clusters (days 2-7): a WIN "reset" trade first (breaks any
    // loss streak carried over from the previous cluster), then a single
    // isolated loss (C_i), then 45 minutes later, same day, an oversized
    // losing trade (B_i). These are NOT flagged by detectRevenge (the reset
    // trade caps the loss streak at 1 => no loss_streak_chase; gap=45min =>
    // outside quick_reentry/rapid_fire/size_escalation windows too), so
    // size_escalation SHOULD pick them up.
    for (let i = 1; i <= 6; i++) {
      const day = i + 1; // days 2-7
      trades.push(
        makeTrade({
          id: `reset-${i}`,
          symbol: 'MES',
          entry_price: 5000,
          exit_price: 5010,
          quantity: 1,
          multiplier: 1,
          pnl: 50,
          outcome: 'WIN',
          stop_price: 0,
          open_at: iso(day, 7, 0),
          close_at: iso(day, 7, 10),
        }),
      );
      trades.push(
        makeTrade({
          id: `c-${i}`,
          symbol: 'MES',
          entry_price: 5000,
          exit_price: 4990,
          quantity: 1,
          multiplier: 1,
          pnl: -50,
          outcome: 'LOSS',
          stop_price: 0,
          open_at: iso(day, 9, 0),
          close_at: iso(day, 9, 10),
        }),
      );
      trades.push(
        makeTrade({
          id: `trade-B${i}`,
          symbol: 'MES',
          entry_price: 5000,
          exit_price: 4950,
          quantity: 3,
          multiplier: 1,
          pnl: -150,
          outcome: 'LOSS',
          stop_price: 0,
          open_at: iso(day, 9, 55), // 45 min after c_i's close (09:10 -> 09:55)
          close_at: iso(day, 10, 5),
        }),
      );
    }

    // 20 unrelated, profitable padding trades on separate later days.
    for (let i = 0; i < 20; i++) {
      const day = 8 + (i % 21); // days 8-28
      trades.push(
        makeTrade({
          id: `pad-${i}`,
          symbol: 'NQ',
          entry_price: 15000,
          exit_price: 15008,
          quantity: 1,
          multiplier: 1,
          pnl: 80,
          outcome: 'WIN',
          stop_price: 0,
          open_at: iso(day, 14 + (i % 6), 0),
          close_at: iso(day, 14 + (i % 6), 10),
        }),
      );
    }

    const report = buildLeakReport(trades);
    const sizeEscalation = report.leaks.find((l) => l.family === 'size_escalation');

    expect(sizeEscalation).toBeDefined();
    // Only the 6 independent B_i trades qualify — trade-A is deduped out.
    expect(sizeEscalation!.sampleSize).toBe(6);

    const evidenceIds = sizeEscalation!.evidence.map((e) => e.tradeId);
    expect(evidenceIds).not.toContain('trade-A');
    for (let i = 1; i <= 6; i++) {
      expect(evidenceIds).toContain(`trade-B${i}`);
    }
  });
});
