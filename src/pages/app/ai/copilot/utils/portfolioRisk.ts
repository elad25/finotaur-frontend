// src/pages/app/ai/copilot/utils/portfolioRisk.ts
// =====================================================
// Pure module — computes portfolio risk analysis from IB holdings.
// No React, no side effects, deterministic per (holdings, totalValue) pair.
//
// Created during COPILOT quality audit Session #1 (2026-05-29):
// — replaced the hardcoded `riskDriverCards` / `riskExposureRows` constants
//   in CopilotSectionPages.tsx that displayed the SAME NVDA/TSLA/74-score
//   to every user regardless of their actual holdings.
// =====================================================

import type { Holding } from '../hooks/usePortfolioMockData';

// ─── Portfolio Health types ───────────────────────────────────────────────────

export type HealthMetricKey = 'diversification' | 'risk' | 'macro' | 'cash';

export interface HealthMetric {
  key: HealthMetricKey;
  label: string;
  score: number; // 0-100, higher = better (health, not risk)
}

export interface PortfolioHealth {
  overall: number; // 0-100
  metrics: HealthMetric[];
}

export type RiskTone = 'red' | 'gold' | 'green';
export type RiskLevel = 'High' | 'Medium' | 'Low';
export type RiskIconKey = 'concentration' | 'equity' | 'options' | 'liquidity';

export interface RiskDriver {
  label: string;
  sublabel: string;
  level: RiskLevel;
  tone: RiskTone;
  /** 0-100, drives the 7-bar meter in RiskDriverCard. */
  progress: number;
  /** 1 short sentence, plain English, with the actual computed pct. */
  text: string;
  iconKey: RiskIconKey;
}

export interface TopExposure {
  ticker: string;
  /** 0-100. */
  weightPct: number;
  level: RiskLevel;
  tone: RiskTone;
}

export interface PortfolioRiskAnalysis {
  /** Composite risk score, 0 = no risk, 100 = max risk. */
  score: number;
  level: 'Low' | 'Moderate' | 'High';
  /** Exactly 4 drivers in fixed order: Concentration, Equity Exposure, Options Leverage, Cash Buffer. Empty when holdings empty. */
  drivers: RiskDriver[];
  /** Up to 5, sorted by weight desc, excludes CASH. */
  topExposures: TopExposure[];
  /** 1-2 sentence auto-summary derived from the worst driver. */
  summary: string;
}

const EMPTY_RESULT: PortfolioRiskAnalysis = {
  score: 0,
  level: 'Low',
  drivers: [],
  topExposures: [],
  summary: 'No positions to analyze yet.',
};

type AssetCategory = 'EQUITY' | 'OPTION' | 'CASH' | 'BOND' | 'OTHER';

/** Map IB AssetClass codes to coarse categories. Mirrors the bucketing used elsewhere in CopilotSectionPages. */
function classifyAsset(cls: string | undefined): AssetCategory {
  const c = (cls || '').toUpperCase();
  if (c === 'STK' || c === 'WAR') return 'EQUITY';
  if (c === 'OPT' || c === 'FOP') return 'OPTION';
  if (c === 'CASH' || c === 'FOREX') return 'CASH';
  if (c === 'BOND') return 'BOND';
  return 'OTHER';
}

/** Bucket a percentage value into (level, tone) using two thresholds. */
function bucketLevel(pct: number, highAt: number, medAt: number): { level: RiskLevel; tone: RiskTone } {
  if (pct >= highAt) return { level: 'High', tone: 'red' };
  if (pct >= medAt) return { level: 'Medium', tone: 'gold' };
  return { level: 'Low', tone: 'green' };
}

/**
 * Compose a one-shot summary from the highest-tone driver.
 * Priority: red > gold > green. All-green → balanced.
 */
function buildSummary(drivers: RiskDriver[]): string {
  if (drivers.length === 0) return EMPTY_RESULT.summary;
  const red = drivers.find((d) => d.tone === 'red');
  if (red) return `${red.label} is the main exposure — ${red.text}`;
  const gold = drivers.find((d) => d.tone === 'gold');
  if (gold) return `Watch ${gold.label}: ${gold.text}`;
  return 'Portfolio risk looks balanced across concentration, equity, options, and cash.';
}

/**
 * Compute risk analysis from current holdings + total portfolio value.
 *
 * Edge cases:
 * — empty holdings OR totalValue ≤ 0 → EMPTY_RESULT.
 * — only cash → equityPct=0, optionPct=0, cashPct=100 → all drivers Low.
 * — single concentrated position → Concentration High, others vary.
 */
export function computeRiskAnalysis(holdings: Holding[], totalValue: number): PortfolioRiskAnalysis {
  if (!holdings.length || totalValue <= 0) return EMPTY_RESULT;

  // Aggregate market value by category. Options can be short → use abs.
  let equityValue = 0;
  let optionValue = 0;
  let cashValue = 0;
  for (const h of holdings) {
    const cat = classifyAsset(h.assetClass);
    if (cat === 'EQUITY') equityValue += Math.abs(h.marketValue);
    else if (cat === 'OPTION') optionValue += Math.abs(h.marketValue);
    else if (cat === 'CASH') cashValue += h.marketValue;
  }

  const equityPct = (equityValue / totalValue) * 100;
  const optionPct = (optionValue / totalValue) * 100;
  const cashPct = (cashValue / totalValue) * 100;

  // Top exposures by absolute market value, excluding CASH.
  const sortedHoldings = [...holdings]
    .filter((h) => classifyAsset(h.assetClass) !== 'CASH')
    .sort((a, b) => Math.abs(b.marketValue) - Math.abs(a.marketValue));

  const topExposures: TopExposure[] = sortedHoldings.slice(0, 5).map((h) => {
    const weightPct = (Math.abs(h.marketValue) / totalValue) * 100;
    const { level, tone } = bucketLevel(weightPct, 25, 10);
    return { ticker: h.symbol, weightPct, level, tone };
  });

  // Top-3 concentration drives the Concentration driver.
  const top3Pct = topExposures.slice(0, 3).reduce((sum, e) => sum + e.weightPct, 0);

  const concentrationBucket = bucketLevel(top3Pct, 50, 30);
  const equityBucket = bucketLevel(equityPct, 80, 50);
  const optionBucket = bucketLevel(optionPct, 20, 5);
  // Cash buffer reads inverse: low cash = high risk.
  const cashBufferBucket = bucketLevel(100 - cashPct, 95, 80);

  const drivers: RiskDriver[] = [
    {
      label: 'Concentration',
      sublabel: 'Top-3 weight',
      level: concentrationBucket.level,
      tone: concentrationBucket.tone,
      progress: Math.min(100, top3Pct),
      text: `Your top 3 positions are ${top3Pct.toFixed(1)}% of the portfolio.`,
      iconKey: 'concentration',
    },
    {
      label: 'Equity Exposure',
      sublabel: 'Market beta',
      level: equityBucket.level,
      tone: equityBucket.tone,
      progress: Math.min(100, equityPct),
      text: `${equityPct.toFixed(1)}% in equities. Higher exposure increases sensitivity to broad market moves.`,
      iconKey: 'equity',
    },
    {
      label: 'Options Leverage',
      sublabel: 'Notional risk',
      level: optionBucket.level,
      tone: optionBucket.tone,
      // ×2 scale so visual bar fills meaningfully — 20% options notional is already very high.
      progress: Math.min(100, optionPct * 2),
      text: `${optionPct.toFixed(1)}% in options. Time decay and volatility risk apply.`,
      iconKey: 'options',
    },
    {
      label: 'Cash Buffer',
      sublabel: 'Dry powder',
      level: cashBufferBucket.level,
      tone: cashBufferBucket.tone,
      progress: Math.min(100, 100 - cashPct),
      text: `${cashPct.toFixed(1)}% in cash. Lower buffer means less flexibility for drawdowns.`,
      iconKey: 'liquidity',
    },
  ];

  // Composite 0-100 score. Weights chosen for stability across portfolio shapes:
  // — Concentration carries the most weight (single biggest drawdown driver).
  // — Equity exposure second (broad market beta).
  // — Options third (leverage / vol).
  // — Inverse cash a small tiebreaker.
  const score = Math.round(
    Math.min(100, top3Pct * 0.4 + equityPct * 0.3 + optionPct * 0.25 + (100 - cashPct) * 0.05),
  );

  const level: PortfolioRiskAnalysis['level'] = score >= 75 ? 'High' : score >= 45 ? 'Moderate' : 'Low';

  return { score, level, drivers, topExposures, summary: buildSummary(drivers) };
}

// ─── Shared internal percentages helper ──────────────────────────────────────

/**
 * Derive the core percentage breakdown shared by both computeRiskAnalysis
 * and computePortfolioHealth. Extracted so the two functions stay in sync
 * without duplicating the classification logic.
 */
function derivePortfolioPercentages(
  holdings: Holding[],
  totalValue: number,
): {
  equityPct: number;
  optionPct: number;
  cashPct: number;
  top3Pct: number;
  assetClassWeights: Map<string, number>;
} {
  let equityValue = 0;
  let optionValue = 0;
  let cashValue = 0;

  // Asset-class weights for Macro Alignment (display-label bucketing matching
  // AssetClassAllocationCard's bucketAssetClass, normalised to the non-cash total).
  const assetClassWeights = new Map<string, number>();

  for (const h of holdings) {
    const cat = classifyAsset(h.assetClass);
    if (cat === 'EQUITY') equityValue += Math.abs(h.marketValue);
    else if (cat === 'OPTION') optionValue += Math.abs(h.marketValue);
    else if (cat === 'CASH') cashValue += h.marketValue;

    // Bucket into display labels used for entropy calculation.
    const displayLabel = (() => {
      const c = (h.assetClass ?? '').toUpperCase();
      if (c === 'STK' || c === 'WAR') return 'Equities';
      if (c === 'ETF')                return 'ETFs';
      if (c === 'OPT' || c === 'FOP') return 'Options';
      if (c === 'FUT')                return 'Futures';
      if (c === 'BOND')               return 'Bonds';
      if (c === 'CASH' || c === 'FOREX') return 'Cash';
      if (c === 'CRYPTO' || c === 'COIN') return 'Crypto';
      if (c === 'CMDTY')              return 'Commodities';
      return 'Other';
    })();
    assetClassWeights.set(
      displayLabel,
      (assetClassWeights.get(displayLabel) ?? 0) + Math.abs(h.marketValue),
    );
  }

  const equityPct = (equityValue / totalValue) * 100;
  const optionPct = (optionValue / totalValue) * 100;
  const cashPct   = (cashValue   / totalValue) * 100;

  // Top-3 ticker concentration (excluding cash).
  const sortedNonCash = [...holdings]
    .filter((h) => classifyAsset(h.assetClass) !== 'CASH')
    .sort((a, b) => Math.abs(b.marketValue) - Math.abs(a.marketValue));
  const top3Pct = sortedNonCash
    .slice(0, 3)
    .reduce((sum, h) => sum + (Math.abs(h.marketValue) / totalValue) * 100, 0);

  return { equityPct, optionPct, cashPct, top3Pct, assetClassWeights };
}

// ─── Portfolio Health ─────────────────────────────────────────────────────────

/** Clamp a value to [0, 100] and round to nearest integer. */
function clamp100(v: number): number {
  return Math.round(Math.max(0, Math.min(100, v)));
}

/**
 * Compute a Shannon entropy score (0-1) for the given weight distribution,
 * normalised by ln(max(numClasses, 2)) so a single-class book → 0 and a
 * perfectly-spread book → 1.
 */
function shannonEntropyScore(weights: Map<string, number>): number {
  const total = Array.from(weights.values()).reduce((s, v) => s + v, 0);
  if (total <= 0 || weights.size === 0) return 0;
  let entropy = 0;
  for (const v of weights.values()) {
    if (v <= 0) continue;
    const p = v / total;
    entropy -= p * Math.log(p);
  }
  const maxEntropy = Math.log(Math.max(weights.size, 2));
  return entropy / maxEntropy;
}

/**
 * Compute a four-metric portfolio health score from live holdings.
 *
 * All scores are 0-100 where **higher = healthier** (inverse of risk score).
 * Empty portfolio (no holdings or totalValue ≤ 0) returns overall 0 and
 * all metrics at 0 — the component renders an empty state instead.
 */
export function computePortfolioHealth(
  holdings: Holding[],
  totalValue: number,
): PortfolioHealth {
  const empty: PortfolioHealth = {
    overall: 0,
    metrics: [
      { key: 'diversification', label: 'Diversification',  score: 0 },
      { key: 'risk',            label: 'Risk Exposure',    score: 0 },
      { key: 'macro',           label: 'Macro Alignment',  score: 0 },
      { key: 'cash',            label: 'Cash Efficiency',  score: 0 },
    ],
  };

  if (!holdings.length || totalValue <= 0) return empty;

  const { equityPct, optionPct, cashPct, top3Pct, assetClassWeights } =
    derivePortfolioPercentages(holdings, totalValue);

  // Diversification: 100 − top3Pct (lower concentration → healthier).
  const diversification = clamp100(100 - top3Pct);

  // Risk Exposure: 100 − min(100, equityPct*0.6 + optionPct*0.8)
  //   Higher score = less risky book.
  const riskRaw = Math.min(100, equityPct * 0.6 + optionPct * 0.8);
  const riskExposure = clamp100(100 - riskRaw);

  // Macro Alignment: Shannon entropy of asset-class weight distribution × 100.
  const macroAlignment = clamp100(shannonEntropyScore(assetClassWeights) * 100);

  // Cash Efficiency: banded score on cashPct.
  //   5–20% band → 100 (sweet spot)
  //   below 5%   → linear from 40 (at 0%) to 100 (at 5%)
  //   above 20%  → linear from 100 (at 20%) to 0 (at 100%)
  let cashEfficiency: number;
  if (cashPct >= 5 && cashPct <= 20) {
    cashEfficiency = 100;
  } else if (cashPct < 5) {
    cashEfficiency = 40 + (cashPct / 5) * 60; // 40 at 0%, 100 at 5%
  } else {
    cashEfficiency = Math.max(0, 100 - ((cashPct - 20) / 80) * 100); // 100 at 20%, 0 at 100%
  }

  const metrics: HealthMetric[] = [
    { key: 'diversification', label: 'Diversification', score: diversification },
    { key: 'risk',            label: 'Risk Exposure',   score: riskExposure    },
    { key: 'macro',           label: 'Macro Alignment', score: macroAlignment  },
    { key: 'cash',            label: 'Cash Efficiency', score: clamp100(cashEfficiency) },
  ];

  const overall = Math.round(
    metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length,
  );

  return { overall, metrics };
}
