// src/features/shared/types/discipline.ts
// Cross-feature types for user discipline / behavioral scores.
// Sourced from the user_discipline_score() SECURITY DEFINER RPC.
// Shared between floor (feed author display) and mentor (room analytics).

/** Row returned by user_discipline_score(p_user, p_period). Sub-indices 0..100; emotional_rate 0..1. */
export interface UserDisciplineScore {
  discipline_score: number;
  risk_consistency: number;
  process_adherence: number;
  behavioral_stability: number;
  outcome_consistency: number;
  emotional_rate: number;
  trade_count: number;
}
