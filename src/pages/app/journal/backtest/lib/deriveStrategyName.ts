// src/pages/app/journal/backtest/lib/deriveStrategyName.ts
// ============================================================================
// Pure helper: derive a readable strategy name from a StrategyDefinitionV2
// when the AI parse/patch response didn't supply one. Without this, a fresh
// "Generate Strategy" merge (mergeStrategyV2 onto makeDefaultStrategyV2's
// base) keeps the base's placeholder name — e.g. "MNQ 5m EMA cross (v2
// default)" — even after the AI replaced every phase with a completely
// different strategy, which is misleading in the review panel header.
//
// Deterministic and simple by design: symbol + execution timeframe + a
// truncated one-line summary of the first phase (via describePhase, the
// same formatter StrategyV2Summary already uses for its own display), e.g.
// "MNQ 5m · 1. WHEN price touches Previous Day High". No React/store
// imports — safe to unit-test in isolation.
// ============================================================================

import type { StrategyDefinitionV2 } from '@/core/auto/v2/types';
import { describePhase } from './describeCondition';

const MAX_PHASE_SUMMARY_LEN = 40;

/** Truncate a phase summary to `MAX_PHASE_SUMMARY_LEN` chars, appending an ellipsis when cut. */
function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Build a fallback name from a strategy definition's own content. Intended
 * for callers to use only when the AI response had no `name` — this does
 * NOT check that condition itself (pure function, no "is this a fallback
 * case" branching); callers decide when to invoke it.
 */
export function deriveStrategyName(def: StrategyDefinitionV2): string {
  const { symbol } = def.instrument;
  const execution = def.timeframes.execution;
  const firstPhase = def.phases[0];
  const phaseSummary = firstPhase ? truncate(describePhase(firstPhase, 0), MAX_PHASE_SUMMARY_LEN) : '';
  return phaseSummary ? `${symbol} ${execution} · ${phaseSummary}` : `${symbol} ${execution}`;
}
