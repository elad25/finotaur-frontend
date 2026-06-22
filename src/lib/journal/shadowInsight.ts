// src/lib/journal/shadowInsight.ts
// =====================================================
// Shadow Insight — deterministic, rule-based coaching layer.
// Pure function: no React, no I/O, no network calls.
// Reads recorded trade decisions and surfaces the biggest
// behavioural patterns, ranked by dollar impact.
// =====================================================

import type { Trade } from '@/hooks/useTradesData';
import { buildAggregate, computePlannedScenarios } from '@/lib/journal/plannedScenarios';

// ─── Public types ─────────────────────────────────────────────────────────────

export type InsightAngle = 'technical' | 'mental' | 'prospective';

export interface ShadowInsight {
  angle: InsightAngle;
  severity: 'high' | 'medium' | 'low';
  headline: string;   // punchy, mentor voice
  detail: string;     // one sentence with real numbers slotted in
  impact: number;     // abs $ used only for ranking
}

// ─── Formatting helper ────────────────────────────────────────────────────────

function money(n: number): string {
  return (n >= 0 ? '+' : '-') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
}

// ─── Core function ────────────────────────────────────────────────────────────

export function buildShadowInsights(trades: Trade[]): ShadowInsight[] {
  if (trades.length === 0) return [];

  const agg = buildAggregate(trades);
  const n = agg.coverage.total;

  if (n === 0) return [];

  const targetGap = agg.totals.target - agg.totals.actual;
  const stopEffect = agg.totals.actual - agg.totals.stop;

  // ── Per-trade loop ─────────────────────────────────────────────────────────
  let earlyExitCount = 0;
  let heldLoserCost = 0;
  let winSum = 0;
  let winCount = 0;
  let lossSum = 0;   // sum of abs values of losing pnl
  let lossCount = 0;

  for (const trade of trades) {
    // Only operate on closed trades (same filter buildAggregate uses)
    if (trade.exit_price == null || trade.exit_price <= 0 || trade.close_at == null) continue;

    const result = computePlannedScenarios(trade);
    const actualPnl = result.actualPnl;
    const scenarioMap = Object.fromEntries(result.scenarios.map((s) => [s.key, s]));

    // Early exit: target was available AND price would have reached it
    const targetScenario = scenarioMap['target'];
    if (
      targetScenario?.available &&
      targetScenario?.deltaVsActual != null &&
      targetScenario.deltaVsActual > 0
    ) {
      earlyExitCount++;
    }

    // Held loser past stop: trade was a loser AND stop was available AND
    // actual pnl was worse than stop scenario pnl
    const stopScenario = scenarioMap['stop'];
    if (
      actualPnl < 0 &&
      stopScenario?.available &&
      stopScenario?.pnl != null
    ) {
      const cost = stopScenario.pnl - actualPnl; // positive = stop would have cut the loss
      if (cost > 0) {
        heldLoserCost += cost;
      }
    }

    // Winners / losers for risk-shape insight
    if (actualPnl > 0) {
      winSum += actualPnl;
      winCount++;
    } else if (actualPnl < 0) {
      lossSum += Math.abs(actualPnl);
      lossCount++;
    }
  }

  const avgWin = winCount > 0 ? winSum / winCount : 0;
  const avgLossAbs = lossCount > 0 ? lossSum / lossCount : 0;
  const winRate = (winCount + lossCount) > 0
    ? (winCount / (winCount + lossCount)) * 100
    : 0;

  // ── Build candidate insights ───────────────────────────────────────────────
  const candidates: ShadowInsight[] = [];

  // 1. EARLY EXITS
  if (targetGap >= 150 && earlyExitCount >= 1) {
    const usePattern = earlyExitCount >= 5;
    const detail = usePattern
      ? `In ${earlyExitCount} of your ${agg.coverage.withTarget} trades with a target, price reached your planned target after you exited — holding to target would have added ${money(targetGap)} overall.`
      : `On a recent trade, you exited before your recorded target was reached — holding to target would have added ${money(targetGap)} to your total across these trades.`;
    candidates.push({
      angle: 'technical',
      severity: targetGap >= 1000 ? 'high' : 'medium',
      headline: "You're banking winners too early.",
      detail,
      impact: Math.abs(targetGap),
    });
  }

  // 2. STOP DISCIPLINE — helping
  if (stopEffect >= 150) {
    candidates.push({
      angle: 'mental',
      severity: 'medium',
      headline: 'Your stop management is paying off.',
      detail: `Across your trades, your exits beat simply holding the original stop by ${money(stopEffect)} — keep trusting those adjustments.`,
      impact: stopEffect,
    });
  }

  // 3. STOP DISCIPLINE — hurting
  if (stopEffect <= -150) {
    candidates.push({
      angle: 'technical',
      severity: 'high',
      headline: 'Moving your stops is costing you.',
      detail: `Holding your original stop would have improved your P&L by ${money(-stopEffect)} — you may be tightening too early.`,
      impact: Math.abs(stopEffect),
    });
  }

  // 4. HELD LOSERS
  if (heldLoserCost >= 150 && lossCount >= 1) {
    const usePattern = lossCount >= 5;
    const detail = usePattern
      ? `Letting losing trades run past your planned stop has cost about ${money(heldLoserCost)} — your stop is the discipline, not a suggestion.`
      : `One trade shows you held a loser past your planned stop, adding about ${money(heldLoserCost)} in unnecessary loss — your stop is the discipline, not a suggestion.`;
    candidates.push({
      angle: 'mental',
      severity: heldLoserCost >= 1000 ? 'high' : 'medium',
      headline: "You're holding losers past your stop.",
      detail,
      impact: heldLoserCost,
    });
  }

  // 5. RISK SHAPE
  if (winCount >= 1 && lossCount >= 1 && avgLossAbs > avgWin) {
    candidates.push({
      angle: 'mental',
      severity: 'medium',
      headline: 'Your losses outrun your wins.',
      detail: `Your average loss (${money(-avgLossAbs)}) is larger than your average win (${money(avgWin)}); even a ${Math.round(winRate)}% win rate struggles to compound like that.`,
      impact: (avgLossAbs - avgWin) * lossCount,
    });
  }

  // 6. COVERAGE (always low; always ranks last via impact=1)
  if (agg.coverage.withStop < n || agg.coverage.withTarget < n) {
    const missingStop = n - agg.coverage.withStop;
    const missingTarget = n - agg.coverage.withTarget;
    candidates.push({
      angle: 'prospective',
      severity: 'low',
      headline: 'Log every stop and target.',
      detail: `${missingStop} of your ${n} trades have no recorded stop and ${missingTarget} have no target — adding them lets Shadow grade those decisions too.`,
      impact: 1,
    });
  }

  // ── Rank by impact DESC ────────────────────────────────────────────────────
  candidates.sort((a, b) => b.impact - a.impact);

  return candidates;
}
