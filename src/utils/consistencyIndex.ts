/**
 * consistencyIndex.ts
 *
 * Computes a statistical Consistency Index (0–100) from real trade fields.
 * R values, expectancy, and emotional rate are passed IN by the caller —
 * this module does NOT recompute them (single-source-of-truth principle).
 *
 * Composite index (weighted):
 *   0.30 × riskConsistency       — how stable is position sizing?
 *   0.30 × processAdherence      — does the trader follow their own process?
 *   0.25 × behavioralStability   — how free is the trader from emotional trades?
 *   0.15 × outcomeConsistency    — is expectancy positive and R dispersion low?
 *
 * Sub-score rules (fully documented per rule below):
 *   riskConsistency   : CV of per-trade risk (lower CV = more consistent sizing).
 *   processAdherence  : fraction of trades with stop + session (+ strategy when present).
 *   behavioralStability : (1 - emotionalRate) * 100.
 *   outcomeConsistency : blend of expectancy positivity and R standard deviation.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ConsistencyTradeInput {
  id: string;
  outcome?: 'WIN' | 'LOSS' | 'BE' | 'OPEN' | null;
  stop_price?: number | null;
  session?: string | null;
  strategy_id?: string | null;
  risk_usd?: number | null;
  quantity?: number | null;
  entry_price?: number | null;
  multiplier?: number | null;
}

export interface ConsistencySubScores {
  riskConsistency: number;      // 0..100
  processAdherence: number;     // 0..100
  behavioralStability: number;  // 0..100
  outcomeConsistency: number;   // 0..100
}

export interface ConsistencyStats {
  cvRisk: number | null;        // coefficient of variation of per-trade risk
  adherenceRate: number;        // 0..1
  emotionalRate: number;        // 0..1 (echoed from caller input)
  expectancyR: number | null;   // echoed from caller input
  rStdev: number | null;        // population stdev of provided R values
  sampleSize: number;
}

export interface ConsistencyResult {
  index: number;                // 0..100 weighted composite
  subScores: ConsistencySubScores;
  stats: ConsistencyStats;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Arithmetic mean of a non-empty number array. */
function mean(nums: number[]): number {
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

/**
 * Population standard deviation of a number array.
 * Returns null when the array has fewer than 2 elements.
 */
function populationStdev(nums: number[]): number | null {
  if (nums.length < 2) return null;
  const m = mean(nums);
  const variance = nums.reduce((s, n) => s + (n - m) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

// ---------------------------------------------------------------------------
// Core computation
// ---------------------------------------------------------------------------

/**
 * Compute the Consistency Index for a set of trades.
 *
 * @param trades       - Trade inputs (no ordering requirement).
 * @param opts.rValues       - Per-trade R values provided by the canonical aggregator.
 * @param opts.expectancyR   - Mean expectancy in R units (null if unavailable).
 * @param opts.emotionalRate - Fraction of trades flagged as emotional (0..1),
 *                             computed by analyzeEmotions() in emotionDetection.ts.
 */
export function computeConsistencyIndex(
  trades: ConsistencyTradeInput[],
  opts: { rValues: number[]; expectancyR: number | null; emotionalRate: number }
): ConsistencyResult {
  const { rValues, expectancyR, emotionalRate } = opts;

  // --- Empty guard ---
  // Return neutral/zero defaults when no trades are available so callers never
  // receive NaN or undefined values.
  if (trades.length === 0) {
    return {
      index: 0,
      subScores: {
        riskConsistency: 50,    // neutral — insufficient data default
        processAdherence: 0,
        behavioralStability: clamp((1 - emotionalRate) * 100, 0, 100),
        outcomeConsistency: 50, // neutral — insufficient data default
      },
      stats: {
        cvRisk: null,
        adherenceRate: 0,
        emotionalRate,
        expectancyR,
        rStdev: null,
        sampleSize: 0,
      },
    };
  }

  // =========================================================================
  // Sub-score 1: riskConsistency
  // =========================================================================
  //
  // For each trade we derive a "riskPerTrade" value from the most reliable
  // source available, in priority order:
  //   1. risk_usd   — explicit dollar risk already stored on the trade.
  //   2. |entry_price - stop_price| × quantity × multiplier — reconstructed
  //      from price levels when risk_usd is absent.
  //
  // Only strictly positive values are included (a zero risk means the field
  // was not filled in, not that the trade had zero risk).
  //
  // CV = stdev / mean of the usable risk values.
  // riskConsistency = 100 × (1 − CV), clamped to [0, 100].
  //   CV = 0   → score 100 (perfectly equal sizing)
  //   CV = 1   → score 0   (stdev equals mean — very erratic)
  //   CV > 1   → clamped to 0
  // When fewer than 2 usable risk values exist, we return the neutral default
  // of 50 (insufficient data to judge consistency).

  const usableRisks: number[] = [];
  for (const t of trades) {
    if (t.risk_usd !== null && t.risk_usd !== undefined && t.risk_usd > 0) {
      usableRisks.push(t.risk_usd);
      continue;
    }
    // Reconstructed risk: all three components must be present and positive.
    const entry = t.entry_price ?? null;
    const stop = t.stop_price ?? null;
    const qty = t.quantity ?? null;
    const mult = t.multiplier ?? 1;
    if (
      entry !== null &&
      stop !== null &&
      qty !== null &&
      qty > 0 &&
      mult > 0
    ) {
      const reconstructed = Math.abs(entry - stop) * qty * mult;
      if (reconstructed > 0) {
        usableRisks.push(reconstructed);
      }
    }
  }

  let cvRisk: number | null = null;
  let riskConsistency: number;

  if (usableRisks.length >= 2) {
    const rMean = mean(usableRisks);
    if (rMean > 0) {
      const rStdevRisk = populationStdev(usableRisks);
      // populationStdev returns null only when length < 2, already guarded above.
      cvRisk = (rStdevRisk ?? 0) / rMean;
      riskConsistency = clamp(100 * (1 - clamp(cvRisk, 0, 1)), 0, 100);
    } else {
      // Mean is zero despite having values — treat as insufficient data.
      riskConsistency = 50;
    }
  } else {
    // Neutral default: insufficient data.
    riskConsistency = 50;
  }

  // =========================================================================
  // Sub-score 2: processAdherence
  // =========================================================================
  //
  // A trade is "adherent" when the trader demonstrably followed their process:
  //   - stop_price is set (the trade had a defined exit plan).
  //   - session is a non-empty string (the trader tracked session context).
  //   - strategy_id is a non-empty string — BUT ONLY when at least one trade
  //     in the entire batch has a strategy_id.  If no trade in the batch ever
  //     has a strategy_id (the user has not set up strategies yet), that
  //     criterion is dropped entirely so the score is not penalised for a
  //     feature they haven't adopted.
  //
  // adherenceRate = adherent / total trades.
  // processAdherence = adherenceRate × 100.

  const anyStrategyPresent = trades.some(
    t =>
      typeof t.strategy_id === 'string' &&
      t.strategy_id.trim().length > 0
  );

  let adherentCount = 0;
  for (const t of trades) {
    const hasStop =
      t.stop_price !== null && t.stop_price !== undefined;
    const hasSession =
      typeof t.session === 'string' && t.session.trim().length > 0;
    const hasStrategy = anyStrategyPresent
      ? typeof t.strategy_id === 'string' && t.strategy_id.trim().length > 0
      : true; // criterion dropped when strategy feature is unused

    if (hasStop && hasSession && hasStrategy) {
      adherentCount++;
    }
  }

  const adherenceRate = adherentCount / trades.length;
  const processAdherence = adherenceRate * 100;

  // =========================================================================
  // Sub-score 3: behavioralStability
  // =========================================================================
  //
  // Simple linear inversion of the emotional rate supplied by the caller.
  // emotionalRate = 0   → 100 (perfectly stable, no emotional trades)
  // emotionalRate = 1   → 0   (every trade flagged as emotional)
  // Clamped to [0, 100] for safety even though emotionalRate should be 0..1.

  const behavioralStability = clamp((1 - emotionalRate) * 100, 0, 100);

  // =========================================================================
  // Sub-score 4: outcomeConsistency
  // =========================================================================
  //
  // Two components blended 60/40:
  //
  // expectancyComponent — how positive is the mean expectancy in R?
  //   expectancyR = +2  → 100  (excellent edge)
  //   expectancyR =  0  → 50   (break-even)
  //   expectancyR = −2  → 0    (strongly negative edge)
  //   Null → neutral 50 (insufficient data).
  //
  // stabilityComponent — how tight is the distribution of R values?
  //   rStdev = 0    → 100  (all trades identical R — perfectly consistent)
  //   rStdev = 5    → 0    (very wide dispersion)
  //   Formula: 100 − (rStdev × 20), clamped to [0, 100].
  //   Null → neutral 50 (fewer than 2 R values provided).
  //
  // outcomeConsistency = round(0.6 × expectancyComponent + 0.4 × stabilityComponent).

  const rStdev = populationStdev(rValues); // null if rValues.length < 2

  const expectancyComponent =
    expectancyR === null
      ? 50
      : clamp(50 + expectancyR * 25, 0, 100);

  const stabilityComponent =
    rStdev === null
      ? 50
      : clamp(100 - rStdev * 20, 0, 100);

  const outcomeConsistency = Math.round(
    0.6 * expectancyComponent + 0.4 * stabilityComponent
  );

  // =========================================================================
  // Composite index
  // =========================================================================
  //
  // Weighted sum rounded to the nearest integer.
  // Weights reflect the relative impact each dimension has on trading success:
  //   Risk consistency   30% — position sizing is the primary lever of ruin/survival.
  //   Process adherence  30% — following a defined process is equally foundational.
  //   Behavioral stab.   25% — emotional control has large but slightly indirect impact.
  //   Outcome consist.   15% — outcomes lag process; weighted lower to avoid noise.

  const rawIndex =
    0.30 * riskConsistency +
    0.30 * processAdherence +
    0.25 * behavioralStability +
    0.15 * outcomeConsistency;

  const index = Math.round(clamp(rawIndex, 0, 100));

  return {
    index,
    subScores: {
      riskConsistency: Math.round(riskConsistency),
      processAdherence: Math.round(processAdherence),
      behavioralStability: Math.round(behavioralStability),
      outcomeConsistency,
    },
    stats: {
      cvRisk,
      adherenceRate,
      emotionalRate,
      expectancyR,
      rStdev,
      sampleSize: trades.length,
    },
  };
}
