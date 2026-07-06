// src/lib/journal/tradeDebrief.test.ts
// Vitest suite for the Trade Debrief pure function.
// All expected values are hand-computed from the rules in tradeDebrief.ts.

import { describe, it, expect } from 'vitest';
import { buildTradeDebrief } from './tradeDebrief';
import { computePlannedScenarios } from './plannedScenarios';
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
    pnl: 50,
    open_at: '2026-06-01T09:30:00Z',
    close_at: '2026-06-01T10:00:00Z',
    created_at: '2026-06-01T09:30:00Z',
    updated_at: '2026-06-01T10:00:00Z',
    ...overrides,
  };
}

function debrief(trade: Trade, extras?: Parameters<typeof buildTradeDebrief>[2]) {
  const scenarios = computePlannedScenarios(trade);
  return buildTradeDebrief(trade, scenarios, extras);
}

// ─── Disciplined win ──────────────────────────────────────────────────────────

describe('buildTradeDebrief — disciplined win', () => {
  it('verdict is "Disciplined win" when actual meets/exceeds target', () => {
    // entry=5000, stop=4990 (risk=50), target=5020 (reward=100), exit=5020, pnl=100
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 100,
    });
    const result = debrief(trade);
    expect(result.verdict).toBe('Disciplined win');
    const goodExit = result.points.find((p) => p.kind === 'exit' && p.tone === 'good');
    expect(goodExit).toBeDefined();
    expect(goodExit!.text).toMatch(/met or exceeded the plan target/i);
  });
});

// ─── Early-exit winner ────────────────────────────────────────────────────────

describe('buildTradeDebrief — early-exit winner', () => {
  it('verdict is "Win — early exit" and phrases the gap conditionally', () => {
    // entry=5000, stop=4990 (risk=50), target=5020 (target pnl=100), exit=5010, pnl=50
    // gap = 100-50 = 50, which is > 5% of 100 → meaningful
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 50,
    });
    const result = debrief(trade);
    expect(result.verdict).toBe('Win — early exit');
    const exitPoint = result.points.find((p) => p.kind === 'exit' && p.tone === 'warn');
    expect(exitPoint).toBeDefined();
    // Delta vs target should be $50 exactly
    expect(exitPoint!.text).toContain('$50.00');
    // Honesty guard: conditional phrasing, no false certainty
    expect(exitPoint!.text).toMatch(/if price had reached your target/i);
    expect(result.nextTime.some((n) => /hold to the plan target/i.test(n))).toBe(true);
  });
});

// ─── Loss beyond plan ─────────────────────────────────────────────────────────

describe('buildTradeDebrief — loss beyond plan', () => {
  it('verdict is "Loss beyond plan" when loss exceeds planned risk by >10%', () => {
    // entry=5000, stop=4990 (risk=50), exit=4970, pnl=-150 (> 1.1*50=55)
    const trade = makeTrade({
      entry_price: 5000, exit_price: 4970, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: -150,
    });
    const result = debrief(trade);
    expect(result.verdict).toBe('Loss beyond plan');
    const bad = result.points.find((p) => p.kind === 'discipline' && p.tone === 'bad');
    expect(bad).toBeDefined();
    expect(bad!.text).toMatch(/MORE than planned risk/);
    expect(result.nextTime.some((n) => /stop is a contract/i.test(n))).toBe(true);
  });
});

// ─── Planned loss ─────────────────────────────────────────────────────────────

describe('buildTradeDebrief — planned loss', () => {
  it('verdict is "Planned loss — good process" when loss is within ±10% of planned risk', () => {
    // entry=5000, stop=4990 (risk=50), exit=4990, pnl=-50 (exact match)
    const trade = makeTrade({
      entry_price: 5000, exit_price: 4990, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: -50,
    });
    const result = debrief(trade);
    expect(result.verdict).toBe('Planned loss — good process');
    const good = result.points.find((p) => p.kind === 'discipline' && p.tone === 'good');
    expect(good).toBeDefined();
    expect(good!.text).toMatch(/took the stop as designed/i);
  });
});

// ─── No-stop trade ────────────────────────────────────────────────────────────

describe('buildTradeDebrief — no stop recorded', () => {
  it('verdict is "No plan on record" and flags missing stop with a nextTime action', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 0, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 50,
    });
    const result = debrief(trade);
    expect(result.verdict).toBe('No plan on record');
    const bad = result.points.find((p) => p.kind === 'plan' && p.tone === 'bad');
    expect(bad).toBeDefined();
    expect(bad!.text).toMatch(/traded without a recorded stop/i);
    expect(result.nextTime.some((n) => /set a hard stop/i.test(n))).toBe(true);
  });

  it('fires for a losing no-stop trade too (verdict is plan-driven, not outcome-driven)', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 4950, stop_price: 0, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: -250,
    });
    const result = debrief(trade);
    expect(result.verdict).toBe('No plan on record');
  });
});

// ─── next_time echo ───────────────────────────────────────────────────────────

describe('buildTradeDebrief — next_time echo', () => {
  it('places the user\'s own next_time note FIRST in nextTime, ahead of rule-generated actions', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 0, take_profit_price: undefined,
      quantity: 1, multiplier: 5, pnl: 50,
      next_time: 'Wait for the retest before entering.',
    });
    const result = debrief(trade);
    expect(result.nextTime[0]).toBe('Your note: "Wait for the retest before entering.".');
    // Other rule-driven nextTime entries (no stop, no target) still present after it
    expect(result.nextTime.length).toBeGreaterThan(1);
  });

  it('does not add a next_time entry when the field is empty/whitespace', () => {
    const trade = makeTrade({ next_time: '   ' });
    const result = debrief(trade);
    expect(result.nextTime.every((n) => !n.startsWith('Your note:'))).toBe(true);
  });
});

// ─── R:R < 1 warning ──────────────────────────────────────────────────────────

describe('buildTradeDebrief — R:R < 1 warning', () => {
  it('warns when planned reward is smaller than planned risk', () => {
    // entry=5000, stop=4980 (risk=100), target=5010 (reward=50) → RR = 0.5
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5005, stop_price: 4980, take_profit_price: 5010,
      quantity: 1, multiplier: 5, pnl: 25,
    });
    const result = debrief(trade);
    const rrWarn = result.points.find((p) => p.kind === 'plan' && /R:R/.test(p.text));
    expect(rrWarn).toBeDefined();
    expect(rrWarn!.tone).toBe('warn');
    expect(rrWarn!.text).toMatch(/0\.50:1/);
  });

  it('does not warn when R:R >= 1', () => {
    // entry=5000, stop=4990 (risk=50), target=5020 (reward=100) → RR = 2
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 100,
    });
    const result = debrief(trade);
    const rrWarn = result.points.find((p) => p.kind === 'plan' && /R:R/.test(p.text));
    expect(rrWarn).toBeUndefined();
  });
});

// ─── Cap of 5 points ──────────────────────────────────────────────────────────

describe('buildTradeDebrief — cap of 5 points, ranked bad > warn > good > neutral', () => {
  it('never returns more than 5 points, and orders by tone severity', () => {
    // Loaded trade: no stop (bad+nextTime), no target (warn+nextTime), emotion (neutral),
    // mistake (warn), extras.mfeUsd — a losing no-stop/no-target trade can't get exit/risk
    // "good" points, so let's build a winner variant with emotion+mistake+mfe to stack conditions.
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 0, take_profit_price: undefined,
      quantity: 1, multiplier: 5, pnl: 50,
      emotion: 'anxious',
      mistake: 'Entered too early before confirmation',
      next_time: 'Wait for confirmation.',
    });
    const result = debrief(trade, { mfeUsd: 200, stopMoves: 2 });
    expect(result.points.length).toBeLessThanOrEqual(5);
    // Verify ranked: no 'good'/'neutral' tone appears before a 'bad' or 'warn' tone
    for (let i = 1; i < result.points.length; i++) {
      const prevRank = { bad: 3, warn: 2, good: 1, neutral: 0 }[result.points[i - 1].tone];
      const currRank = { bad: 3, warn: 2, good: 1, neutral: 0 }[result.points[i].tone];
      expect(prevRank).toBeGreaterThanOrEqual(currRank);
    }
  });
});

// ─── Honesty guards ───────────────────────────────────────────────────────────

describe('buildTradeDebrief — honesty guards', () => {
  it('never uses the word "pattern" or "always" (single-trade scope)', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 4960, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: -200,
      emotion: 'frustrated',
      mistake: 'Ignored my own stop',
      next_time: 'Respect the stop.',
    });
    const result = debrief(trade, { stopMoves: 3 });
    const allText = [result.headline, ...result.points.map((p) => p.text), ...result.nextTime].join(' ');
    expect(allText.toLowerCase()).not.toMatch(/\bpattern\b/);
    expect(allText.toLowerCase()).not.toMatch(/\balways\b/);
  });

  it('headline stays within ~140 characters', () => {
    const trade = makeTrade({ symbol: 'MNQ', pnl: 1500, exit_price: 5010, stop_price: 4990, take_profit_price: 5020 });
    const result = debrief(trade);
    expect(result.headline.length).toBeLessThanOrEqual(140);
  });
});

// ─── Scratch ──────────────────────────────────────────────────────────────────

describe('buildTradeDebrief — scratch', () => {
  it('verdict is "Scratch" when pnl is negligible relative to planned risk', () => {
    // entry=5000, stop=4990 (risk=50), exit=5000.4, pnl=2 (< 5% of 50 = 2.5)
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5000.4, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 2,
    });
    const result = debrief(trade);
    expect(result.verdict).toBe('Scratch');
  });
});

// ─── Report lines (small-report format) ───────────────────────────────────────

describe('buildTradeDebrief — reportLines', () => {
  it('always has between 4 and 7 lines', () => {
    const cases: Trade[] = [
      // Disciplined win
      makeTrade({ entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020, quantity: 1, multiplier: 5, pnl: 100 }),
      // Early-exit winner
      makeTrade({ entry_price: 5000, exit_price: 5010, stop_price: 4990, take_profit_price: 5020, quantity: 1, multiplier: 5, pnl: 50 }),
      // Loss beyond plan
      makeTrade({ entry_price: 5000, exit_price: 4970, stop_price: 4990, take_profit_price: 5020, quantity: 1, multiplier: 5, pnl: -150 }),
      // No stop, no target
      makeTrade({ entry_price: 5000, exit_price: 5010, stop_price: 0, take_profit_price: undefined, quantity: 1, multiplier: 5, pnl: 50 }),
      // Scratch
      makeTrade({ entry_price: 5000, exit_price: 5000.4, stop_price: 4990, take_profit_price: 5020, quantity: 1, multiplier: 5, pnl: 2 }),
    ];
    for (const trade of cases) {
      const result = debrief(trade);
      expect(result.reportLines.length).toBeGreaterThanOrEqual(4);
      expect(result.reportLines.length).toBeLessThanOrEqual(7);
    }
  });

  it('Result is always first and Next time is always last', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 100,
    });
    const result = debrief(trade);
    expect(result.reportLines[0].label).toBe('Result');
    expect(result.reportLines[result.reportLines.length - 1].label).toBe('Next time');
  });

  it('every report line text is <= 110 characters', () => {
    // Loaded/worst-case trade to stress the longest possible line compositions.
    const trade = makeTrade({
      entry_price: 5000, exit_price: 4960, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: -200,
      emotion: 'frustrated',
      mistake: 'Ignored my own stop and moved it twice hoping price would come back in my favor',
      next_time: 'Respect the stop and never move it once the trade is live, no matter what the chart looks like.',
    });
    const result = debrief(trade, { stopMoves: 3, mfeUsd: 5 });
    for (const line of result.reportLines) {
      expect(line.text.length).toBeLessThanOrEqual(110);
    }
  });

  it('Stop line reads "None recorded" when no stop is on record', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 0, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 50,
    });
    const result = debrief(trade);
    const stopLine = result.reportLines.find((l) => l.label === 'Stop');
    expect(stopLine).toBeDefined();
    expect(stopLine!.text).toMatch(/none recorded/i);
    expect(stopLine!.tone).toBe('bad');
  });

  it('Target line reads "None recorded" when no target is on record', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 4990, take_profit_price: undefined,
      quantity: 1, multiplier: 5, pnl: 50,
    });
    const result = debrief(trade);
    const targetLine = result.reportLines.find((l) => l.label === 'Target');
    expect(targetLine).toBeDefined();
    expect(targetLine!.text).toMatch(/none recorded/i);
    expect(targetLine!.tone).toBe('warn');
  });

  it('Target line uses conditional phrasing for an early exit winner', () => {
    // entry=5000, stop=4990 (risk=50), target=5020 (target pnl=100), exit=5010, pnl=50
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 50,
    });
    const result = debrief(trade);
    const targetLine = result.reportLines.find((l) => l.label === 'Target');
    expect(targetLine).toBeDefined();
    expect(targetLine!.text).toMatch(/exited early/i);
    expect(targetLine!.text).toMatch(/if price had reached it/i);
  });

  it('uses the user\'s own next_time note as the Next time line when present', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 0, take_profit_price: undefined,
      quantity: 1, multiplier: 5, pnl: 50,
      next_time: 'Wait for the retest before entering.',
    });
    const result = debrief(trade);
    const nextTimeLine = result.reportLines[result.reportLines.length - 1];
    expect(nextTimeLine.label).toBe('Next time');
    expect(nextTimeLine.text).toContain('Wait for the retest before entering.');
  });

  it('includes a Behavior line only when there is material (emotion/mistake/stopMoves/MFE give-back)', () => {
    const quiet = makeTrade({
      entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 100,
    });
    const quietResult = debrief(quiet);
    expect(quietResult.reportLines.find((l) => l.label === 'Behavior')).toBeUndefined();

    const loaded = makeTrade({
      entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 100,
      mistake: 'Entered too early',
    });
    const loadedResult = debrief(loaded);
    expect(loadedResult.reportLines.find((l) => l.label === 'Behavior')).toBeDefined();
  });

  it('includes a Risk line only when plannedRR < 1', () => {
    const rrLow = makeTrade({
      entry_price: 5000, exit_price: 5005, stop_price: 4980, take_profit_price: 5010,
      quantity: 1, multiplier: 5, pnl: 25,
    });
    const rrLowResult = debrief(rrLow);
    expect(rrLowResult.reportLines.find((l) => l.label === 'Risk')).toBeDefined();

    const rrOk = makeTrade({
      entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 100,
    });
    const rrOkResult = debrief(rrOk);
    expect(rrOkResult.reportLines.find((l) => l.label === 'Risk')).toBeUndefined();
  });

  it('Verdict line is always present with a short conclusion sentence', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 4970, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: -150,
    });
    const result = debrief(trade);
    const verdictLine = result.reportLines.find((l) => l.label === 'Verdict');
    expect(verdictLine).toBeDefined();
    expect(verdictLine!.text.length).toBeGreaterThan(0);
  });
});

// ─── Stats (numbers scorecard) ─────────────────────────────────────────────────

describe('buildTradeDebrief — stats scorecard', () => {
  it('Result stat reflects sign and tone for a winner', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 100,
    });
    const result = debrief(trade);
    const resultStat = result.stats.find((s) => s.label === 'Result');
    expect(resultStat).toBeDefined();
    expect(resultStat!.value).toBe('+$100.00');
    expect(resultStat!.tone).toBe('good');
  });

  it('Result stat reflects sign and tone for a loser', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 4970, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: -150,
    });
    const result = debrief(trade);
    const resultStat = result.stats.find((s) => s.label === 'Result');
    expect(resultStat).toBeDefined();
    expect(resultStat!.value).toBe('-$150.00');
    expect(resultStat!.tone).toBe('bad');
  });

  it('Planned risk reads "—" with bad tone when no stop is recorded', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 0, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 50,
    });
    const result = debrief(trade);
    const riskStat = result.stats.find((s) => s.label === 'Planned risk');
    expect(riskStat).toBeDefined();
    expect(riskStat!.value).toBe('—');
    expect(riskStat!.tone).toBe('bad');
  });

  it('Planned risk shows a $ value with neutral tone when a stop is recorded', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 100,
    });
    const result = debrief(trade);
    const riskStat = result.stats.find((s) => s.label === 'Planned risk');
    expect(riskStat).toBeDefined();
    expect(riskStat!.value).toBe('$50.00');
    expect(riskStat!.tone).toBe('neutral');
  });

  it('Planned R:R reads "—" when target is missing', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 4990, take_profit_price: undefined,
      quantity: 1, multiplier: 5, pnl: 50,
    });
    const result = debrief(trade);
    const rrStat = result.stats.find((s) => s.label === 'Planned R:R');
    expect(rrStat).toBeDefined();
    expect(rrStat!.value).toBe('—');
  });

  it('Planned R:R shows the ratio when both stop and target are recorded', () => {
    // entry=5000, stop=4990 (risk=50), target=5020 (reward=100) → RR = 2.0
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 100,
    });
    const result = debrief(trade);
    const rrStat = result.stats.find((s) => s.label === 'Planned R:R');
    expect(rrStat).toBeDefined();
    expect(rrStat!.value).toBe('2.0:1');
  });

  it('includes "Left on table" only for an early-exit winner, phrased as an estimate', () => {
    // Early-exit winner: entry=5000, stop=4990 (risk=50), target=5020 (target pnl=100), exit=5010, pnl=50
    const earlyExit = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 50,
    });
    const earlyResult = debrief(earlyExit);
    const leftOnTable = earlyResult.stats.find((s) => s.label.includes('Left on table'));
    expect(leftOnTable).toBeDefined();
    expect(leftOnTable!.label).toMatch(/est\.?/i);
    expect(leftOnTable!.value).toBe('$50.00');

    // Disciplined win — met target — must NOT include "Left on table".
    const disciplinedWin = makeTrade({
      entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 100,
    });
    const disciplinedResult = debrief(disciplinedWin);
    expect(disciplinedResult.stats.find((s) => s.label.includes('Left on table'))).toBeUndefined();

    // Loss — must NOT include "Left on table".
    const loss = makeTrade({
      entry_price: 5000, exit_price: 4970, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: -150,
    });
    const lossResult = debrief(loss);
    expect(lossResult.stats.find((s) => s.label.includes('Left on table'))).toBeUndefined();
  });

  it('Actual R stat prefers trade.actual_r when present', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 100,
      actual_r: 3.33,
    });
    const result = debrief(trade);
    const rStat = result.stats.find((s) => s.label === 'Actual R');
    expect(rStat).toBeDefined();
    expect(rStat!.value).toBe('+3.33R');
  });

  it('Actual R falls back to pnl/plannedRisk when actual_r is absent, and reads "—" when not computable', () => {
    const withStop = makeTrade({
      entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 100,
    });
    const withStopResult = debrief(withStop);
    const rStatDerived = withStopResult.stats.find((s) => s.label === 'Actual R');
    expect(rStatDerived).toBeDefined();
    expect(rStatDerived!.value).toBe('+2.00R');

    const noStop = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 0, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 50,
    });
    const noStopResult = debrief(noStop);
    const rStatMissing = noStopResult.stats.find((s) => s.label === 'Actual R');
    expect(rStatMissing).toBeDefined();
    expect(rStatMissing!.value).toBe('—');
  });

  it('stats array has between 3 and 5 entries', () => {
    const cases: Trade[] = [
      makeTrade({ entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020, quantity: 1, multiplier: 5, pnl: 100 }),
      makeTrade({ entry_price: 5000, exit_price: 5010, stop_price: 4990, take_profit_price: 5020, quantity: 1, multiplier: 5, pnl: 50 }),
      makeTrade({ entry_price: 5000, exit_price: 4970, stop_price: 4990, take_profit_price: 5020, quantity: 1, multiplier: 5, pnl: -150 }),
      makeTrade({ entry_price: 5000, exit_price: 5010, stop_price: 0, take_profit_price: undefined, quantity: 1, multiplier: 5, pnl: 50 }),
    ];
    for (const trade of cases) {
      const result = debrief(trade);
      expect(result.stats.length).toBeGreaterThanOrEqual(3);
      expect(result.stats.length).toBeLessThanOrEqual(5);
    }
  });
});

// ─── Checklist (discipline) ────────────────────────────────────────────────────

describe('buildTradeDebrief — discipline checklist', () => {
  it('has exactly 4 rows in the fixed order', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 100,
    });
    const result = debrief(trade);
    expect(result.checklist.map((c) => c.label)).toEqual([
      'Stop set before entry',
      'Stop respected',
      'Target defined',
      'Held to target',
    ]);
  });

  it('"Stop set before entry" fails when no stop is recorded', () => {
    const trade = makeTrade({ stop_price: 0 });
    const result = debrief(trade);
    const check = result.checklist.find((c) => c.label === 'Stop set before entry');
    expect(check!.status).toBe('fail');
  });

  it('"Stop respected" is na when no stop is recorded', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 0, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 50,
    });
    const result = debrief(trade);
    const check = result.checklist.find((c) => c.label === 'Stop respected');
    expect(check!.status).toBe('na');
  });

  it('"Stop respected" passes for a loss within 1.1x planned risk', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 4990, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: -50,
    });
    const result = debrief(trade);
    const check = result.checklist.find((c) => c.label === 'Stop respected');
    expect(check!.status).toBe('pass');
  });

  it('"Stop respected" fails for a loss beyond 1.1x planned risk', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 4970, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: -150,
    });
    const result = debrief(trade);
    const check = result.checklist.find((c) => c.label === 'Stop respected');
    expect(check!.status).toBe('fail');
  });

  it('"Stop respected" passes for a winner with a stop on record', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 100,
    });
    const result = debrief(trade);
    const check = result.checklist.find((c) => c.label === 'Stop respected');
    expect(check!.status).toBe('pass');
  });

  it('"Target defined" fails when no target is recorded', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 4990, take_profit_price: undefined,
      quantity: 1, multiplier: 5, pnl: 50,
    });
    const result = debrief(trade);
    const check = result.checklist.find((c) => c.label === 'Target defined');
    expect(check!.status).toBe('fail');
  });

  it('"Held to target" is na when no target is recorded', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 4990, take_profit_price: undefined,
      quantity: 1, multiplier: 5, pnl: 50,
    });
    const result = debrief(trade);
    const check = result.checklist.find((c) => c.label === 'Held to target');
    expect(check!.status).toBe('na');
  });

  it('"Held to target" passes when actual pnl meets/exceeds the target', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 100,
    });
    const result = debrief(trade);
    const check = result.checklist.find((c) => c.label === 'Held to target');
    expect(check!.status).toBe('pass');
  });

  it('"Held to target" fails when exited early (below target)', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 50,
    });
    const result = debrief(trade);
    const check = result.checklist.find((c) => c.label === 'Held to target');
    expect(check!.status).toBe('fail');
  });
});

// ─── Primary action ─────────────────────────────────────────────────────────────

describe('buildTradeDebrief — primaryAction / actionWhy', () => {
  it('uses the trader\'s own next_time note verbatim when present', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 50,
      next_time: 'Wait for the retest before entering.',
    });
    const result = debrief(trade);
    expect(result.primaryAction).toBe('Wait for the retest before entering.');
  });

  it('falls back to the top rule-generated nextTime item when next_time is empty', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5010, stop_price: 0, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 50,
    });
    const result = debrief(trade);
    expect(result.primaryAction).toMatch(/set a hard stop/i);
  });

  it('falls back to the generic message when there is nothing else to say', () => {
    const trade = makeTrade({
      entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 100,
    });
    const result = debrief(trade);
    expect(result.primaryAction).toBe(
      'Keep logging stop, target and reason on every trade so Shadow can grade the next one.',
    );
  });

  it('primaryAction is never empty across a range of trade shapes', () => {
    const cases: Trade[] = [
      makeTrade({ entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020, quantity: 1, multiplier: 5, pnl: 100 }),
      makeTrade({ entry_price: 5000, exit_price: 5010, stop_price: 4990, take_profit_price: 5020, quantity: 1, multiplier: 5, pnl: 50 }),
      makeTrade({ entry_price: 5000, exit_price: 4970, stop_price: 4990, take_profit_price: 5020, quantity: 1, multiplier: 5, pnl: -150 }),
      makeTrade({ entry_price: 5000, exit_price: 5010, stop_price: 0, take_profit_price: undefined, quantity: 1, multiplier: 5, pnl: 50 }),
      makeTrade({ entry_price: 5000, exit_price: 5000.4, stop_price: 4990, take_profit_price: 5020, quantity: 1, multiplier: 5, pnl: 2 }),
    ];
    for (const trade of cases) {
      const result = debrief(trade);
      expect(result.primaryAction.length).toBeGreaterThan(0);
    }
  });

  it('actionWhy is empty for a clean disciplined win, and non-empty for a loss beyond plan', () => {
    const clean = makeTrade({
      entry_price: 5000, exit_price: 5020, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 100,
    });
    expect(debrief(clean).actionWhy).toBe('');

    const badLoss = makeTrade({
      entry_price: 5000, exit_price: 4970, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: -150,
    });
    expect(debrief(badLoss).actionWhy.length).toBeGreaterThan(0);
  });

  it('actionWhy is empty for a scratch trade', () => {
    const scratch = makeTrade({
      entry_price: 5000, exit_price: 5000.4, stop_price: 4990, take_profit_price: 5020,
      quantity: 1, multiplier: 5, pnl: 2,
    });
    expect(debrief(scratch).actionWhy).toBe('');
  });
});
