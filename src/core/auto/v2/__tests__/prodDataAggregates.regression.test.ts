// ============================================================================
// PRODUCTION-DATA AGGREGATES REGRESSION (PERMANENT) — pins StatisticsEngine
// math against an independently-reimplemented set of formulas
// ============================================================================
// Runs the flagship PDH definition (identical to `prodData.regression.test.ts`'s
// `buildProdDefinition`, duplicated here rather than imported so this file
// stays a self-contained pin — see that file's header for the def's history)
// on the real MNQ 5m fixture, then recomputes totalTrades / winRate /
// grossProfit / grossLoss / profitFactor / netProfit(totalPnl) /
// maxDrawdown% / sharpe / sortino / calmar / R-multiple-distribution buckets
// from `result.trades` using formulas written FRESH in this test (NOT
// imported from `StatisticsEngine.ts`), and asserts each equals
// `result.statistics`'s own value to a tight relative tolerance. A prior
// manual audit verified these match; this test pins that match permanently
// so a future edit to StatisticsEngine (or to the engine's trade-closing
// order/shape) that silently drifts the aggregate math is caught immediately.
// ============================================================================

import { describe, it, expect } from 'vitest';
import fixtureRows from './fixtures/mnq-5m-prod.json';
import type { Candle } from '../../../../components/ReplayChart/types';
import type { StrategyDefinitionV2 } from '../types';
import { makeDefaultStrategyV2 } from '../types';
import { runStrategyV2 } from '../StrategyEngine';
import { mergeStrategyV2 } from '../../../../pages/app/journal/backtest/lib/mergeStrategyV2';
import type { AutoPosition } from '../../signalToPosition';

function loadRealMnqCandles(): Candle[] {
  const rows = fixtureRows as unknown as number[][];
  return rows.map((row) => ({
    time: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }));
}

/** Verbatim copy of `prodData.regression.test.ts`'s `buildProdDefinition` —
 *  the flagship PDH short-reject definition ("short when price rejects the
 *  previous day high, stop above the wick, 3R target"). Duplicated (not
 *  imported) so this aggregates test doesn't depend on that file's internals. */
function buildProdDefinition(): StrategyDefinitionV2 {
  const base = makeDefaultStrategyV2('MNQ', '5m');
  const partial: Partial<StrategyDefinitionV2> = {
    schemaVersion: 2,
    direction: 'short',
    instrument: { symbol: 'MNQ', source: 'databento' },
    timeframes: { execution: '5m' },
    phases: [
      {
        id: 'pdh-reject',
        when: {
          kind: 'levelInteraction',
          level: { type: 'prevDayHigh' },
          interaction: 'reject',
          wickBodyRatio: 2,
        },
      },
    ],
    entry: {
      orderType: 'limit',
      priceAnchor: { phaseId: 'pdh-reject', anchor: 'triggerPrice' },
      validForBars: 5,
    },
    stop: { basis: 'wick' },
    exits: { target: { basis: 'rMultiple', value: 3 } },
    filters: {},
  };
  return mergeStrategyV2(base, partial);
}

// ----------------------------------------------------------------------------
// Independent reimplementation of StatisticsEngine's formulas — deliberately
// NOT imported, so a shared bug in StatisticsEngine.ts can't hide from this
// pin. See StatisticsEngine.ts's own doc comments for the formulas this
// mirrors (annualization √252, sample stdDev n-1, calmar = totalPnlPercent *
// (365/spanDays) / maxDrawdownPercent).
// ----------------------------------------------------------------------------

function recomputeAggregates(trades: AutoPosition[], initialBalance: number) {
  const totalTrades = trades.length;
  const winners = trades.filter((t) => (t.realizedPnl ?? 0) > 0);
  const losers = trades.filter((t) => (t.realizedPnl ?? 0) < 0);
  const winRate = (winners.length / totalTrades) * 100;

  const grossProfit = winners.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0);
  const grossLoss = Math.abs(losers.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0));
  const totalPnl = trades.reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0);
  const netProfit = grossProfit - grossLoss;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
  const totalPnlPercent = (totalPnl / initialBalance) * 100;

  // Max drawdown — running balance/peak walk, SAME order as `trades` (the
  // engine closes exactly one position at a time, so `result.trades` is
  // already in chronological close order — identical to what
  // StatisticsEngine.calculate walks).
  let balance = initialBalance;
  let peak = initialBalance;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  for (const t of trades) {
    balance += t.realizedPnl ?? 0;
    if (balance > peak) peak = balance;
    const dd = peak - balance;
    const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
      maxDrawdownPercent = ddPct;
    }
  }

  // Sharpe: per-trade returns (realizedPnlPercent/100), sample stdDev (n-1),
  // annualized ×√252.
  const returns = trades.map((t) => (t.realizedPnlPercent ?? 0) / 100);
  const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + (r - avgReturn) * (r - avgReturn), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252);

  // Sortino: downside deviation over losing-return count only, annualized
  // ×√252. Mirrors StatisticsEngine's "no downside" edge case exactly.
  const downsideReturns = returns.filter((r) => r < 0);
  let sortinoRatio: number;
  if (downsideReturns.length === 0) {
    sortinoRatio = avgReturn > 0 ? 100 : 0;
  } else {
    const downsideVariance = downsideReturns.reduce((s, r) => s + r * r, 0) / downsideReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance);
    sortinoRatio = downsideDeviation === 0 ? 0 : (avgReturn / downsideDeviation) * Math.sqrt(252);
  }

  // Calmar: annualized (365/spanDays) totalPnlPercent / maxDrawdownPercent.
  const firstEntry = trades[0]?.entryTime ?? 0;
  const lastExit = trades[trades.length - 1]?.exitTime ?? 0;
  const tradingDaysSpan = (lastExit - firstEntry) / (24 * 60 * 60);
  const spanDays = Math.max(1, tradingDaysSpan);
  const calmarRatio =
    maxDrawdownPercent === 0 ? 0 : (totalPnlPercent * (365 / spanDays)) / maxDrawdownPercent;

  // R-multiple distribution buckets — identical bucketing to
  // `StrategyEngine.ts`'s `computeRDistributionV2`.
  const rDist = {
    '< -2R': 0,
    '-2R to -1R': 0,
    '-1R to 0R': 0,
    '0R to 1R': 0,
    '1R to 2R': 0,
    '2R to 3R': 0,
    '> 3R': 0,
  };
  for (const t of trades) {
    const riskAmount = t.riskAmount && t.riskAmount > 0 ? t.riskAmount : null;
    if (riskAmount === null) continue;
    const r = (t.realizedPnl ?? 0) / riskAmount;
    if (r < -2) rDist['< -2R']++;
    else if (r < -1) rDist['-2R to -1R']++;
    else if (r < 0) rDist['-1R to 0R']++;
    else if (r < 1) rDist['0R to 1R']++;
    else if (r < 2) rDist['1R to 2R']++;
    else if (r <= 3) rDist['2R to 3R']++;
    else rDist['> 3R']++;
  }

  return {
    totalTrades,
    winRate,
    grossProfit,
    grossLoss,
    profitFactor,
    netProfit,
    totalPnl,
    maxDrawdownPercent,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    rDist,
  };
}

function expectCloseRel(actual: number, expected: number, label: string): void {
  if (expected === 0) {
    expect(actual, label).toBeCloseTo(0, 6);
    return;
  }
  const relError = Math.abs((actual - expected) / expected);
  expect(relError, `${label}: actual=${actual} expected=${expected}`).toBeLessThan(1e-6);
}

describe('StrategyEngine v2 — production-data AGGREGATES regression (pins StatisticsEngine math)', () => {
  it('independently-recomputed aggregates match result.statistics to 1e-6 relative', async () => {
    const candles = loadRealMnqCandles();
    const def = buildProdDefinition();
    const result = await runStrategyV2(def, candles);

    expect(result.trades.length).toBeGreaterThan(0);

    const recomputed = recomputeAggregates(result.trades, def.risk.initialBalance);
    // `BacktestStatisticsLike` only strongly types a handful of fields and
    // falls back to `[key: string]: unknown` for the rest (see
    // `AutoBacktestEngine.ts`) — narrow the fields this test actually reads.
    const stats = result.statistics as unknown as {
      totalTrades: number;
      winRate: number;
      grossProfit: number;
      grossLoss: number;
      profitFactor: number;
      netProfit: number;
      totalPnl: number;
      maxDrawdownPercent: number;
      sharpeRatio: number;
      sortinoRatio: number;
      calmarRatio: number;
    };

    expect(recomputed.totalTrades).toBe(stats.totalTrades);
    expectCloseRel(recomputed.winRate, stats.winRate, 'winRate');
    expectCloseRel(recomputed.grossProfit, stats.grossProfit, 'grossProfit');
    expectCloseRel(recomputed.grossLoss, stats.grossLoss, 'grossLoss');
    expectCloseRel(recomputed.profitFactor, stats.profitFactor, 'profitFactor');
    expectCloseRel(recomputed.netProfit, stats.netProfit, 'netProfit');
    expectCloseRel(recomputed.totalPnl, stats.totalPnl, 'totalPnl (netProfit)');
    expectCloseRel(recomputed.maxDrawdownPercent, stats.maxDrawdownPercent, 'maxDrawdownPercent');
    expectCloseRel(recomputed.sharpeRatio, stats.sharpeRatio, 'sharpeRatio');
    expectCloseRel(recomputed.sortinoRatio, stats.sortinoRatio, 'sortinoRatio');
    expectCloseRel(recomputed.calmarRatio, stats.calmarRatio, 'calmarRatio');

    expect(recomputed.rDist).toEqual(result.rMultipleDistribution);
  });
});
