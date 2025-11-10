
/**
 * FINOTAUR Score — simple weighted composite with graceful fallbacks.
 * Inputs are normalized [0..1]. Output is 0..100.
 */
function clamp01(x) { return Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0)); }

function computeFinotaurScore(parts) {
  const {
    profitability = 0.5,
    growth = 0.5,
    risk = 0.5,        // lower risk => higher score => we invert below
    valuation = 0.5,   // fair valuation => higher score; overvaluation lowers
  } = parts || {};

  const p = clamp01(profitability);
  const g = clamp01(growth);
  const r = clamp01(risk);
  const v = clamp01(valuation);

  // weights can be tuned
  const weights = { p: 0.35, g: 0.30, r: 0.20, v: 0.15 };

  const invRisk = 1 - r;
  const raw = (p*weights.p) + (g*weights.g) + (invRisk*weights.r) + (v*weights.v);
  const score = Math.round(raw * 100);

  // Tagline heuristics
  let tagline = 'Balanced';
  if (g > 0.65 && v >= 0.45) tagline = 'Strong Growth';
  if (v < 0.35) tagline += ' / Valuation Risk';
  if (r > 0.65) tagline += ' / High Volatility';

  return { score, tagline, parts: { profitability: p, growth: g, risk: r, valuation: v } };
}

module.exports = { computeFinotaurScore };
