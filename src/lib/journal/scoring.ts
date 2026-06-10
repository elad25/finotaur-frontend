/**
 * Pure deterministic trade scoring engine — NO AI, NO side effects.
 *
 * Rules (heuristics — intentionally simple):
 *   followedStop  — stop_price is set AND the trade did not blow through it:
 *                   met when stop_price is present AND outcome is not undefined.
 *                   (We cannot know exactly whether the stop was honored on synced
 *                    fills, so we use stop_price-present as a proxy.)
 *   hitTarget     — outcome === 'WIN'
 *   positiveR     — actual_user_r ?? actual_r ?? rr ?? 0 > 0
 *   hasNotes      — notes is non-empty after trimming
 *   withinSession — session field is set and non-empty
 *
 * Each met criterion earns `weight` points; not met earns 0.
 * score = sum of earned (0-100 when weights sum to 100).
 */

import type { Trade } from '@/hooks/useTradesData';

export type ScoreWeights = {
  followedStop: number;
  hitTarget: number;
  positiveR: number;
  hasNotes: number;
  withinSession: number;
};

export const DEFAULT_WEIGHTS: ScoreWeights = {
  followedStop: 25,
  hitTarget: 25,
  positiveR: 25,
  hasNotes: 15,
  withinSession: 10,
};

export type ScoreBreakdown = Record<
  keyof ScoreWeights,
  { earned: number; max: number; met: boolean }
>;

export function scoreTrade(
  trade: Trade,
  weights: ScoreWeights,
): { score: number; breakdown: ScoreBreakdown } {
  // followedStop: stop_price present AND outcome is known (not undefined/OPEN)
  const metFollowedStop =
    !!trade.stop_price &&
    trade.outcome !== undefined &&
    trade.outcome !== 'OPEN';

  // hitTarget: trade closed as a WIN
  const metHitTarget = trade.outcome === 'WIN';

  // positiveR: R-multiple > 0 from any available source
  const rValue = trade.actual_user_r ?? trade.actual_r ?? trade.rr ?? 0;
  const metPositiveR = Number(rValue) > 0;

  // hasNotes: non-empty notes text
  const metHasNotes = typeof trade.notes === 'string' && trade.notes.trim().length > 0;

  // withinSession: session field is set and non-empty
  const metWithinSession =
    typeof trade.session === 'string' && trade.session.trim().length > 0;

  const criteria: Record<keyof ScoreWeights, boolean> = {
    followedStop: metFollowedStop,
    hitTarget: metHitTarget,
    positiveR: metPositiveR,
    hasNotes: metHasNotes,
    withinSession: metWithinSession,
  };

  const breakdown = {} as ScoreBreakdown;
  let total = 0;

  for (const key of Object.keys(criteria) as Array<keyof ScoreWeights>) {
    const met = criteria[key];
    const max = weights[key];
    const earned = met ? max : 0;
    breakdown[key] = { earned, max, met };
    total += earned;
  }

  return {
    score: Math.round(total * 100) / 100,
    breakdown,
  };
}
