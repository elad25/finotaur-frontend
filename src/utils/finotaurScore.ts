/**
 * finotaurScore.ts
 *
 * Single source of truth for the FINOTAUR Score (0–100) shown on the journal
 * Calendar. The score is a weighted composite of three INDEPENDENT pillars so
 * each one can be surfaced to the user as a breakdown:
 *
 *   performance  (40%) — the trader's edge: expectancy in R + profit factor.
 *   consistency  (30%) — discipline: risk sizing + process adherence + outcome
 *                        dispersion. Behavioral is intentionally EXCLUDED here
 *                        (it is its own pillar) so emotion is not double-counted.
 *   behavioral   (30%) — freedom from emotional trades (from the emotion engine).
 *
 * Every input is computed elsewhere by the canonical aggregators and passed in —
 * this module performs NO trade aggregation of its own.
 */

export interface FinotaurScorePillars {
  performance: number; // 0..100
  consistency: number; // 0..100 — discipline only (behavioral excluded)
  behavioral: number;  // 0..100
}

export interface FinotaurScoreResult {
  score: number; // 0..100 weighted composite
  pillars: FinotaurScorePillars;
}

/** Consistency sub-scores as produced by computeConsistencyIndex(). */
export interface FinotaurConsistencySubScores {
  riskConsistency: number;     // 0..100
  processAdherence: number;    // 0..100
  behavioralStability: number; // 0..100 (NOT used here — its own pillar)
  outcomeConsistency: number;  // 0..100
}

export interface FinotaurScoreInput {
  /** Mean expectancy in R units (null when no closed trades). */
  expectancyR: number | null;
  /** Profit factor; 999 is treated as "infinite" → full marks. */
  profitFactor: number;
  /** Consistency sub-scores from computeConsistencyIndex(). */
  consistencySubScores: FinotaurConsistencySubScores;
  /** Behavioral stability 0..100 from the emotion engine ((1 - negativeRate)*100). */
  behavioralStability: number;
}

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute the FINOTAUR Score and its three pillars.
 *
 * Pillar formulas:
 *   performance = 0.6 × expectancyComponent + 0.4 × profitFactorComponent
 *     expectancyComponent : clamp(50 + expectancyR × 25, 0, 100); null → 50 (neutral)
 *       (+2R → 100, 0R → 50, −2R → 0)
 *     profitFactorComponent : 999 → 100; else clamp(profitFactor / 3 × 100, 0, 100)
 *       (PF ≥ 3 → 100, PF = 1.5 → 50, PF = 0 → 0)
 *
 *   consistency = renormalised discipline index, behavioral removed:
 *     (0.30 × riskConsistency + 0.30 × processAdherence + 0.15 × outcomeConsistency) / 0.75
 *
 *   behavioral = behavioralStability (already 0..100)
 *
 *   score = round(0.40 × performance + 0.30 × consistency + 0.30 × behavioral)
 */
export function computeFinotaurScore(input: FinotaurScoreInput): FinotaurScoreResult {
  const { expectancyR, profitFactor, consistencySubScores, behavioralStability } = input;

  // --- Performance pillar ---
  const expectancyComponent =
    expectancyR === null ? 50 : clamp(50 + expectancyR * 25, 0, 100);
  const profitFactorComponent =
    profitFactor >= 999 ? 100 : clamp((profitFactor / 3) * 100, 0, 100);
  const performance = clamp(
    0.6 * expectancyComponent + 0.4 * profitFactorComponent,
    0,
    100,
  );

  // --- Consistency pillar (discipline only, behavioral excluded & renormalised) ---
  const consistency = clamp(
    (0.30 * consistencySubScores.riskConsistency +
      0.30 * consistencySubScores.processAdherence +
      0.15 * consistencySubScores.outcomeConsistency) /
      0.75,
    0,
    100,
  );

  // --- Behavioral pillar ---
  const behavioral = clamp(behavioralStability, 0, 100);

  // --- Weighted composite ---
  const score = Math.round(
    clamp(0.40 * performance + 0.30 * consistency + 0.30 * behavioral, 0, 100),
  );

  return {
    score,
    pillars: {
      performance: Math.round(performance),
      consistency: Math.round(consistency),
      behavioral: Math.round(behavioral),
    },
  };
}
