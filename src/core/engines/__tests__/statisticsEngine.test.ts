// ============================================================================
// STATISTICS ENGINE — SORTINO / CALMAR UNIT TESTS
// ============================================================================
//
// Deterministic small trade fixtures, hand-computed expected values:
//   (a) Sortino: mixed win/loss series → downside-only stddev matches a
//       hand-computed value (verified independently, see comment inline).
//   (b) Calmar: two guard cases — zero drawdown (→ 0, div-by-zero guard on
//       maxDrawdownPercent) and zero trading-day span (single trade,
//       entryTime === exitTime → span clamped to 1 day, no NaN/Infinity).
//
// Trade fixtures are plain objects, not imported from the (currently
// unresolved at the type level — see StatisticsEngine.ts's own `'../../types'`
// import) `Position` type; StatisticsEngine.calculate only reads a handful of
// fields at runtime (realizedPnl, realizedPnlPercent, entryTime, exitTime,
// riskAmount, riskRewardRatio), so a minimal structural fixture is sufficient.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { StatisticsEngine } from '../StatisticsEngine';

interface TestTrade {
  realizedPnl: number;
  realizedPnlPercent: number;
  entryTime: number;
  exitTime: number;
  riskAmount?: number;
  riskRewardRatio?: number;
}

function trade(
  realizedPnl: number,
  realizedPnlPercent: number,
  entryTime: number,
  exitTime: number,
): TestTrade {
  return { realizedPnl, realizedPnlPercent, entryTime, exitTime };
}

// StatisticsEngine.calculate is typed against `Position[]` (from the
// unresolved '../../types' module); the engine only reads the fields on
// TestTrade at runtime, so a structural cast is the pragmatic way to call it
// from a fixture that doesn't depend on that broken import.
type CalculateArg = Parameters<StatisticsEngine['calculate']>[0];

function run(trades: TestTrade[], initialBalance: number, currentBalance: number) {
  const engine = new StatisticsEngine();
  return engine.calculate(trades as unknown as CalculateArg, initialBalance, currentBalance);
}

describe('StatisticsEngine — Sortino ratio', () => {
  it('matches a hand-computed value for a mixed win/loss series (downside-only stddev)', () => {
    // returns (fraction): [0.10, -0.05, 0.08, -0.03, 0.06]
    // avgReturn = 0.032
    // downsideReturns = [-0.05, -0.03]
    // downsideVariance = ((-0.05)^2 + (-0.03)^2) / 2 = 0.0017
    // downsideDeviation = sqrt(0.0017) ≈ 0.0412310563
    // sortino = (avgReturn / downsideDeviation) * sqrt(252) ≈ 12.3204278
    const trades: TestTrade[] = [
      trade(1000, 10, 0, 100),
      trade(-500, -5, 100, 200),
      trade(800, 8, 200, 300),
      trade(-300, -3, 300, 400),
      trade(600, 6, 400, 500),
    ];

    const stats = run(trades, 10_000, 11_600);

    expect(stats.sortinoRatio).toBeCloseTo(12.320428, 5);
  });

  it('returns 0 when there are fewer than 2 trades (matches Sharpe edge case)', () => {
    const trades: TestTrade[] = [trade(500, 5, 0, 100)];
    const stats = run(trades, 10_000, 10_500);

    expect(stats.sortinoRatio).toBe(0);
  });

  it('caps at a finite value when there is no downside at all and mean return is positive', () => {
    const trades: TestTrade[] = [
      trade(500, 5, 0, 100),
      trade(300, 3, 100, 200),
      trade(700, 7, 200, 300),
    ];
    const stats = run(trades, 10_000, 11_500);

    expect(stats.sortinoRatio).toBe(100);
    expect(Number.isFinite(stats.sortinoRatio)).toBe(true);
  });
});

describe('StatisticsEngine — Calmar ratio', () => {
  it('guards to 0 when max drawdown is 0 (monotonically increasing equity)', () => {
    const trades: TestTrade[] = [
      trade(1000, 10, 0, 10 * 86_400),
      trade(1000, 10, 10 * 86_400, 20 * 86_400),
      trade(1000, 10, 20 * 86_400, 30 * 86_400),
    ];
    const stats = run(trades, 10_000, 13_000);

    expect(stats.maxDrawdownPercent).toBe(0);
    expect(stats.calmarRatio).toBe(0);
  });

  it('clamps a zero trading-day span to 1 day instead of producing Infinity/NaN', () => {
    // Single trade, entryTime === exitTime → tradingDays span = 0.
    // totalPnlPercent = (9500 - 10000) / 10000 * 100 = -5
    // spanDays = max(1, 0) = 1
    // annualizedReturn = -5 * (365 / 1) = -1825
    // maxDrawdownPercent = 5 (peak 10000 -> balance 9500)
    // calmarRatio = -1825 / 5 = -365
    const trades: TestTrade[] = [trade(-500, -5, 1_000, 1_000)];
    const stats = run(trades, 10_000, 9_500);

    expect(stats.tradingDays).toBe(0);
    expect(Number.isFinite(stats.calmarRatio)).toBe(true);
    expect(stats.calmarRatio).toBeCloseTo(-365, 5);
  });
});
