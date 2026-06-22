// src/lib/journal/shadowInsight.test.ts
// Vitest suite for the Shadow Insight pure function.
// All expected values are hand-computed from the insight rules in shadowInsight.ts.

import { describe, it, expect } from 'vitest';
import { buildShadowInsights } from './shadowInsight';
import type { Trade } from '@/hooks/useTradesData';

// ─── Fixture factory ──────────────────────────────────────────────────────────

function makeTrade(overrides: Partial<Trade>): Trade {
  return {
    id: 'test-id',
    user_id: 'user-1',
    symbol: 'MES',
    side: 'LONG',
    entry_price: 5000,
    exit_price: 5010,
    stop_price: 4990,
    take_profit_price: 5020,
    quantity: 1,
    multiplier: 5,
    fees: 0,
    pnl: 50,  // (5010-5000)*1*5
    open_at: '2026-06-01T09:30:00Z',
    close_at: '2026-06-01T10:00:00Z',
    created_at: '2026-06-01T09:30:00Z',
    updated_at: '2026-06-01T10:00:00Z',
    ...overrides,
  };
}

// ─── Empty input ──────────────────────────────────────────────────────────────

describe('buildShadowInsights — empty input', () => {
  it('returns [] for empty trades array', () => {
    expect(buildShadowInsights([])).toEqual([]);
  });

  it('returns [] when all trades are open (no exit_price)', () => {
    const openTrade = makeTrade({ exit_price: undefined, close_at: undefined });
    expect(buildShadowInsights([openTrade])).toEqual([]);
  });
});

// ─── Coverage insight ─────────────────────────────────────────────────────────

describe('buildShadowInsights — coverage insight', () => {
  it('fires when trades have no stop/target recorded', () => {
    const trade = makeTrade({ stop_price: 0, take_profit_price: undefined });
    const insights = buildShadowInsights([trade]);
    const coverage = insights.find((i) => i.angle === 'prospective');
    expect(coverage).toBeDefined();
    expect(coverage!.severity).toBe('low');
    expect(coverage!.impact).toBe(1); // always ranks last
  });

  it('does NOT fire when all trades have both stop and target', () => {
    const trade = makeTrade({ stop_price: 4990, take_profit_price: 5020 });
    const insights = buildShadowInsights([trade]);
    const coverage = insights.find((i) => i.angle === 'prospective');
    // Coverage fires only if missing; single trade with both = no coverage insight
    // But the trade itself has complete coverage, so no prospective insight expected
    expect(coverage).toBeUndefined();
  });
});

// ─── Early-exit insight ───────────────────────────────────────────────────────

describe('buildShadowInsights — early exits', () => {
  it('fires when target gap ≥ 150 and at least one early exit', () => {
    // entry=5000, exit=5005 (actual pnl=25), target=5020 (target pnl=100)
    // deltaVsActual = 100-25 = 75 per trade; need enough trades to push targetGap≥150
    // Two such trades: targetGap = (cumTarget - cumActual) = (200-50) = 150 exactly
    const trade1 = makeTrade({
      entry_price: 5000, exit_price: 5005, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 25,
    });
    const trade2 = makeTrade({
      id: 'test-2',
      entry_price: 5000, exit_price: 5005, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 25,
    });
    const insights = buildShadowInsights([trade1, trade2]);
    const earlyExit = insights.find((i) => i.headline.includes('too early'));
    expect(earlyExit).toBeDefined();
    expect(['high', 'medium']).toContain(earlyExit!.severity);
  });

  it('uses high severity when targetGap ≥ 1000', () => {
    // 5 trades each with pnl=50, target=5020 → each target pnl=100, delta=50
    // targetGap accumulates to 250 across 5 trades — still medium
    // Need bigger delta: exit=5001 (pnl=5), target=5020 (pnl=100), delta=95 per trade × 15 trades
    const trades = Array.from({ length: 15 }, (_, i) =>
      makeTrade({
        id: `t-${i}`,
        entry_price: 5000, exit_price: 5001, take_profit_price: 5020,
        quantity: 1, multiplier: 5, pnl: 5,
      }),
    );
    const insights = buildShadowInsights(trades);
    const earlyExit = insights.find((i) => i.headline.includes('too early'));
    expect(earlyExit).toBeDefined();
    expect(earlyExit!.severity).toBe('high'); // targetGap = (100-5)*15 = 1425 ≥ 1000
  });

  it('does NOT fire when targetGap < 150', () => {
    // Only one trade where target would have been slightly better
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5019, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 95,
    });
    const insights = buildShadowInsights([trade]);
    const earlyExit = insights.find((i) => i.headline.includes('too early'));
    expect(earlyExit).toBeUndefined();
  });
});

// ─── Stop effect insights ─────────────────────────────────────────────────────

describe('buildShadowInsights — stop management', () => {
  it('fires "paying off" when stopEffect ≥ 150', () => {
    // stopEffect = actual - stop. If actual > stop, adjustments helped.
    // stop_price below entry for LONG → stop pnl negative, actual pnl positive
    // entry=5000, exit=5010 (actual=50), stop=4980 (stop_pnl=-100)
    // stopEffect = 50 - (-100) = 150 exactly → medium
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 4980,
      quantity: 1, multiplier: 5, pnl: 50,
    });
    const insights = buildShadowInsights([trade]);
    const payingOff = insights.find((i) => i.headline.includes('paying off'));
    expect(payingOff).toBeDefined();
    expect(payingOff!.severity).toBe('medium');
    expect(payingOff!.angle).toBe('mental');
  });

  it('fires "costing you" when stopEffect ≤ -150', () => {
    // stopEffect negative means exits were worse than holding the stop
    // entry=5000, exit=4980 (actual=-100), stop=4990 (stop_pnl=-50)
    // stopEffect = -100 - (-50) = -50 … not enough. Need bigger gap.
    // exit=4960 (actual=-200), stop=4990 (stop_pnl=-50) → stopEffect=-200-(-50)=-150
    const trade = makeTrade({
      entry_price: 5000, exit_price: 4960, stop_price: 4990,
      quantity: 1, multiplier: 5, pnl: -200, side: 'LONG',
    });
    const insights = buildShadowInsights([trade]);
    const costing = insights.find((i) => i.headline.includes('costing'));
    expect(costing).toBeDefined();
    expect(costing!.severity).toBe('high');
    expect(costing!.angle).toBe('technical');
  });
});

// ─── Held losers insight ──────────────────────────────────────────────────────

describe('buildShadowInsights — held losers', () => {
  it('fires when loser was held past stop and cost ≥ 150', () => {
    // entry=5000, exit=4960 (actual=-200), stop=4990 (stop_pnl=-50)
    // heldLoserCost = stop_pnl - actual_pnl = -50 - (-200) = 150
    const trade = makeTrade({
      entry_price: 5000, exit_price: 4960, stop_price: 4990,
      quantity: 1, multiplier: 5, pnl: -200, side: 'LONG',
    });
    const insights = buildShadowInsights([trade]);
    const heldLosers = insights.find((i) => i.headline.includes('holding losers'));
    expect(heldLosers).toBeDefined();
    expect(heldLosers!.angle).toBe('mental');
  });

  it('does NOT fire when loser did not exceed stop', () => {
    // exit=4995 (actual=-25), stop=4990 (stop_pnl=-50)
    // actual > stop_pnl → stop would have been WORSE → heldLoserCost not counted
    const trade = makeTrade({
      entry_price: 5000, exit_price: 4995, stop_price: 4990,
      quantity: 1, multiplier: 5, pnl: -25, side: 'LONG',
    });
    const insights = buildShadowInsights([trade]);
    const heldLosers = insights.find((i) => i.headline.includes('holding losers'));
    expect(heldLosers).toBeUndefined();
  });
});

// ─── Risk shape insight ───────────────────────────────────────────────────────

describe('buildShadowInsights — risk shape', () => {
  it('fires when average loss exceeds average win', () => {
    const winner = makeTrade({ id: 'w1', exit_price: 5005, pnl: 25 }); // +$25
    const loser  = makeTrade({
      id: 'l1', exit_price: 4950, pnl: -250, side: 'LONG',
      stop_price: 4990,
    }); // -$250
    const insights = buildShadowInsights([winner, loser]);
    const riskShape = insights.find((i) => i.headline.includes('outrun'));
    expect(riskShape).toBeDefined();
    expect(riskShape!.angle).toBe('mental');
    expect(riskShape!.severity).toBe('medium');
  });

  it('does NOT fire when wins are larger than losses', () => {
    const winner = makeTrade({ id: 'w1', exit_price: 5100, pnl: 500 }); // +$500
    const loser  = makeTrade({ id: 'l1', exit_price: 4990, pnl: -50, side: 'LONG' });
    const insights = buildShadowInsights([winner, loser]);
    const riskShape = insights.find((i) => i.headline.includes('outrun'));
    expect(riskShape).toBeUndefined();
  });
});

// ─── Ranking ──────────────────────────────────────────────────────────────────

describe('buildShadowInsights — ranking', () => {
  it('coverage insight always ranks last (impact=1)', () => {
    // Create a scenario with both early-exit AND coverage issue
    const trades = Array.from({ length: 10 }, (_, i) =>
      makeTrade({
        id: `t-${i}`,
        entry_price: 5000, exit_price: 5001, take_profit_price: 5020,
        stop_price: 0, // missing stop
        quantity: 1, multiplier: 5, pnl: 5,
      }),
    );
    const insights = buildShadowInsights(trades);
    const last = insights[insights.length - 1];
    expect(last.angle).toBe('prospective'); // coverage is always last
    expect(last.impact).toBe(1);
  });

  it('sorts by impact descending', () => {
    // Multiple insights; verify descending impact order
    const trades = Array.from({ length: 15 }, (_, i) =>
      makeTrade({
        id: `t-${i}`,
        entry_price: 5000, exit_price: 5001, take_profit_price: 5020,
        stop_price: 0,
        quantity: 1, multiplier: 5, pnl: 5,
      }),
    );
    const insights = buildShadowInsights(trades);
    for (let i = 1; i < insights.length; i++) {
      expect(insights[i - 1].impact).toBeGreaterThanOrEqual(insights[i].impact);
    }
  });
});
