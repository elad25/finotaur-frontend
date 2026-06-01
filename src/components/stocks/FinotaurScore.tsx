/**
 * FinotaurScore — FINOTAUR's flagship explainable 1–10 stock score.
 *
 * Inspired by TipRanks Smart Score / Seeking Alpha Quant Rating / Danelfin,
 * but fully explainable: shows the WHY behind the number.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * DATA PROVENANCE — all inputs are redistribution-safe derived analytics.
 *
 * Inputs:
 *   grades.valuation     (0–100) — our own SEC-derived analytic
 *   grades.growth        (0–100) — our own SEC-derived analytic
 *   grades.profitability (0–100) — our own SEC-derived analytic
 *   grades.health        (0–100) — our own SEC-derived analytic
 *   insiderScore         (−100..+100) — computed from SEC EDGAR Form 4 filings
 *
 * No raw FMP / Polygon / Yahoo price values are used or rendered here.
 * No LLM required — explanation is rule-based templated English text.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * SCORING FORMULA
 * ───────────────
 * Step 1: weighted average of the 4 fundamental grades → raw 0–100
 *   rawScore = (profitability × 0.30)
 *            + (valuation     × 0.25)
 *            + (growth        × 0.25)
 *            + (health        × 0.20)
 *
 * Step 2: map rawScore (0–100) → base score (1–10)
 *   baseScore = 1 + (rawScore / 100) × 9   (linear, then Math.round → integer)
 *
 * Step 3: insider nudge ±0.5 (then clamp to 1–10)
 *   if insiderScore > +20 : +0.5  (net buying → slight boost)
 *   if insiderScore < −20 : −0.5  (net selling → slight drag)
 *   else: 0
 *
 * Rationale for weights:
 *   Profitability (0.30) — earnings quality is the strongest predictor of
 *     long-term stock returns (Novy-Marx, 2013; Fama-French profitability factor).
 *   Valuation    (0.25) — value premium is well documented; entering cheap matters.
 *   Growth       (0.25) — revenue/earnings trajectory defines the medium-term story.
 *   Health       (0.20) — balance sheet safety is a risk-reduction factor, not alpha.
 *   Insider nudge (±0.5) — Form 4 net buying is a sentiment signal, not fundamental;
 *     deliberately small weight to avoid letting a single large transaction distort
 *     a fundamentals-driven score.
 *
 * Verdict thresholds:
 *   8–10 → "Outperform"
 *   6–7  → "Neutral"
 *   1–5  → "Underperform"
 *
 * ═══════════════════════════════════════════════════════════════════════
 * PRODUCTION ROADMAP (v1 = client-computed on demand)
 *   v2: nightly server batch persists score to `stock_scores` table
 *       → Score column surfaced in screener, watchlist, heatmap, Daily Brief
 *   v3: factor weight calibration via back-test against 3-month forward returns
 *       on our covered universe; weights become DB-configurable
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Component API
 * ─────────────
 *   <FinotaurScore
 *     grades         SnowflakeGrades | null | undefined
 *     insiderScore   number (−100..+100) — pass 0 when unknown
 *     symbol?        string — shown in badge variant
 *     variant?       "card" (default, full page block) | "badge" (compact, for cards/screeners)
 *   />
 */

import React, { useMemo } from "react";
import type { SnowflakeGrades } from "@/components/stocks/FinotaurSnowflake";

// ─────────────────────────────────────────────────────────────────────────────
// Scoring constants (see formula above)
// ─────────────────────────────────────────────────────────────────────────────

const WEIGHTS = {
  profitability: 0.30,
  valuation:     0.25,
  growth:        0.25,
  health:        0.20,
} as const;

const INSIDER_NUDGE_THRESHOLD = 20;  // |insiderScore| must exceed this to apply nudge
const INSIDER_NUDGE_MAGNITUDE = 0.5; // points added or subtracted

// Thresholds for "factor chip" label generation
const GRADE_HIGH = 70;  // ≥70 → "Strong ..."
const GRADE_LOW  = 44;  // <45 → "Weak ..."
// Between 45–69 = neutral → omit the chip (not noteworthy enough for explanation)

// ─────────────────────────────────────────────────────────────────────────────
// Pure scoring function
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoreResult {
  /** Final score 1–10 (integer). null when grades are entirely missing. */
  score: number | null;
  /** Weighted raw score 0–100 before mapping to 1–10. */
  rawScore: number | null;
  /** Insider nudge applied: +0.5, −0.5, or 0. */
  insiderNudge: number;
  /** 2–4 short English chips explaining the key drivers. */
  chips: FactorChip[];
  /** One-word verdict for the score tier. */
  verdict: "Outperform" | "Neutral" | "Underperform" | null;
}

export interface FactorChip {
  label: string;
  sentiment: "positive" | "negative" | "neutral";
}

/**
 * computeFinotaurScore — pure function, no side effects.
 *
 * @param grades    The 4 SEC-derived fundamental grades (0–100 each)
 * @param insiderScore  Net insider sentiment (−100..+100); pass 0 when unavailable
 */
export function computeFinotaurScore(
  grades: SnowflakeGrades | null | undefined,
  insiderScore: number,
): ScoreResult {
  const EMPTY: ScoreResult = {
    score: null,
    rawScore: null,
    insiderNudge: 0,
    chips: [],
    verdict: null,
  };

  // Require at least one grade to produce a meaningful score
  if (!grades) return EMPTY;
  const { valuation, growth, profitability, health } = grades;
  if (
    valuation == null &&
    growth == null &&
    profitability == null &&
    health == null
  ) return EMPTY;

  // Step 1: weighted average (treat missing grades as 50 = neutral filler)
  const g = {
    valuation:     valuation     ?? 50,
    growth:        growth        ?? 50,
    profitability: profitability ?? 50,
    health:        health        ?? 50,
  };

  const rawScore =
    g.profitability * WEIGHTS.profitability +
    g.valuation     * WEIGHTS.valuation     +
    g.growth        * WEIGHTS.growth        +
    g.health        * WEIGHTS.health;

  // Step 2: map 0–100 → 1.0–10.0, then round to nearest integer
  const baseFloat = 1 + (rawScore / 100) * 9;

  // Step 3: insider nudge
  const insiderNudge =
    insiderScore > INSIDER_NUDGE_THRESHOLD  ?  INSIDER_NUDGE_MAGNITUDE :
    insiderScore < -INSIDER_NUDGE_THRESHOLD ? -INSIDER_NUDGE_MAGNITUDE :
    0;

  const finalFloat = baseFloat + insiderNudge;
  const score = Math.min(10, Math.max(1, Math.round(finalFloat)));

  // Verdict
  const verdict: ScoreResult["verdict"] =
    score >= 8 ? "Outperform" :
    score >= 6 ? "Neutral"    :
                 "Underperform";

  // ── Factor chips: pick the most salient 2–4 drivers ──────────────────────
  const chips: FactorChip[] = [];

  // Valuation chip
  if (valuation != null) {
    if (valuation >= GRADE_HIGH)
      chips.push({ label: `Undervalued (V ${valuation})`,     sentiment: "positive" });
    else if (valuation < GRADE_LOW)
      chips.push({ label: `Overvalued (V ${valuation})`,      sentiment: "negative" });
  }

  // Profitability chip
  if (profitability != null) {
    if (profitability >= GRADE_HIGH)
      chips.push({ label: `Strong profitability (P ${profitability})`, sentiment: "positive" });
    else if (profitability < GRADE_LOW)
      chips.push({ label: `Weak profitability (P ${profitability})`,   sentiment: "negative" });
  }

  // Growth chip
  if (growth != null) {
    if (growth >= GRADE_HIGH)
      chips.push({ label: `Strong growth (G ${growth})`,      sentiment: "positive" });
    else if (growth < GRADE_LOW)
      chips.push({ label: `Weak growth (G ${growth})`,        sentiment: "negative" });
  }

  // Health chip
  if (health != null) {
    if (health >= GRADE_HIGH)
      chips.push({ label: `Solid balance sheet (H ${health})`, sentiment: "positive" });
    else if (health < GRADE_LOW)
      chips.push({ label: `Stretched balance sheet (H ${health})`, sentiment: "negative" });
  }

  // Insider chip (only when data is present — insiderScore === 0 can mean
  // either "neutral" or "no data"; we only add chip when clearly directional)
  if (insiderScore > INSIDER_NUDGE_THRESHOLD)
    chips.push({ label: "Net insider buying",  sentiment: "positive" });
  else if (insiderScore < -INSIDER_NUDGE_THRESHOLD)
    chips.push({ label: "Net insider selling", sentiment: "negative" });

  // If no chips generated (all grades mid-range, insider neutral), add a
  // generic "Balanced fundamentals" chip so the UI never shows zero chips.
  if (chips.length === 0)
    chips.push({ label: "Balanced fundamentals", sentiment: "neutral" });

  // Cap at 4 chips (most salient first; already ordered by factor weight)
  const finalChips = chips.slice(0, 4);

  return { score, rawScore, insiderNudge, chips: finalChips, verdict };
}

// ─────────────────────────────────────────────────────────────────────────────
// Color helpers
// ─────────────────────────────────────────────────────────────────────────────

function scoreColor(score: number): { text: string; border: string; glow: string } {
  if (score >= 8) return {
    text:   "text-emerald-400",
    border: "border-emerald-500/30",
    glow:   "rgba(16, 185, 129, 0.12)",
  };
  if (score >= 6) return {
    text:   "text-yellow-400",
    border: "border-yellow-500/30",
    glow:   "rgba(234, 179, 8, 0.10)",
  };
  return {
    text:   "text-red-400",
    border: "border-red-500/30",
    glow:   "rgba(239, 68, 68, 0.10)",
  };
}

const chipStyle: Record<FactorChip["sentiment"], string> = {
  positive: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  negative: "bg-red-500/10    text-red-400     border border-red-500/20",
  neutral:  "bg-neutral-700/40 text-neutral-400 border border-neutral-700/60",
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface FinotaurScoreProps {
  grades: SnowflakeGrades | null | undefined;
  /** Net insider sentiment −100..+100 (from computeInsiderScore). Pass 0 when unavailable. */
  insiderScore?: number;
  /** Optional ticker label shown in badge variant */
  symbol?: string;
  /** "card" = full block for page placement (default); "badge" = compact inline chip */
  variant?: "card" | "badge";
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge variant — compact, for cards / screener rows
// ─────────────────────────────────────────────────────────────────────────────

function ScoreBadge({
  result,
  symbol,
  className = "",
}: {
  result: ScoreResult;
  symbol?: string;
  className?: string;
}) {
  if (result.score == null) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold
          bg-neutral-800 text-neutral-500 border border-neutral-700 ${className}`}
      >
        {symbol && <span className="opacity-60">{symbol}</span>}
        <span>Score —</span>
      </span>
    );
  }

  const colors = scoreColor(result.score);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold
        border ${colors.border} ${colors.text} ${className}`}
      style={{ background: colors.glow }}
      title={result.chips.map(c => c.label).join(" · ")}
    >
      {symbol && <span className="opacity-60 font-semibold">{symbol}</span>}
      <span className="text-sm font-black tabular-nums">{result.score}</span>
      <span className="text-[10px] opacity-70">/10</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card variant — full display block
// ─────────────────────────────────────────────────────────────────────────────

function ScoreCard({
  result,
  className = "",
}: {
  result: ScoreResult;
  className?: string;
}) {
  // Empty state
  if (result.score == null) {
    return (
      <div
        className={`rounded-xl p-4 flex items-center justify-center
          bg-neutral-900/60 border border-neutral-800 ${className}`}
      >
        <span className="text-xs text-neutral-500">Score unavailable — no grade data</span>
      </div>
    );
  }

  const colors = scoreColor(result.score);

  return (
    <div
      className={`rounded-xl p-4 border ${colors.border} ${className}`}
      style={{ background: colors.glow }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mb-0.5">
            FINOTAUR Score
          </div>
          <div className="text-[10px] text-neutral-600">
            Profitability · Value · Growth · Health · Insider
          </div>
        </div>

        {/* Verdict pill */}
        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${colors.border} ${colors.text}`}
          style={{ background: colors.glow }}
        >
          {result.verdict}
        </span>
      </div>

      {/* Big score number */}
      <div className="flex items-end gap-2 mb-3">
        <span className={`text-5xl font-black tabular-nums leading-none ${colors.text}`}>
          {result.score}
        </span>
        <span className="text-neutral-500 text-lg font-semibold mb-0.5">/10</span>
      </div>

      {/* Dot-row progress bar */}
      <div className="flex gap-1 mb-3" aria-label={`Score ${result.score} out of 10`}>
        {Array.from({ length: 10 }, (_, i) => {
          const filled = i < result.score!;
          return (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                filled ? colors.text.replace("text-", "bg-") : "bg-neutral-800"
              }`}
            />
          );
        })}
      </div>

      {/* Factor chips */}
      <div className="flex flex-wrap gap-1.5">
        {result.chips.map((chip) => (
          <span
            key={chip.label}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${chipStyle[chip.sentiment]}`}
          >
            {chip.label}
          </span>
        ))}
      </div>

      {/* Provenance footnote */}
      <div className="mt-3 pt-2.5 border-t border-white/[0.04] text-[9px] text-neutral-600">
        Derived from SEC EDGAR filings + Form 4 insider data. Not investment advice.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function FinotaurScore({
  grades,
  insiderScore = 0,
  symbol,
  variant = "card",
  className = "",
}: FinotaurScoreProps) {
  const result = useMemo(
    () => computeFinotaurScore(grades, insiderScore),
    [grades, insiderScore],
  );

  if (variant === "badge") {
    return <ScoreBadge result={result} symbol={symbol} className={className} />;
  }

  return <ScoreCard result={result} className={className} />;
}

export default FinotaurScore;
