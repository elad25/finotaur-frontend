// src/lib/journal/assetMultipliers.ts
// =====================================================
// Canonical source of truth for futures asset multipliers (symbol root →
// $ per 1 full-point move per 1 contract) used by SHADOW and the journal
// what-if surfaces (useShadow, plannedScenarios, whatIfEngine, TradeCompare).
//
// SOURCE-OF-TRUTH NOTE:
//   Mirrors ASSET_MULTIPLIERS in finotaur-server's
//   src/services/shadow/excursionMath.js — keep both in sync.
// =====================================================

// ─── Per-root-symbol point value ($ per 1 full-point move per 1 contract) ─
export const ASSET_MULTIPLIERS: Record<string, number> = {
  ES: 50,
  MES: 5,
  NQ: 20,
  MNQ: 2,
  YM: 5,
  MYM: 5,
  RTY: 50,
  M2K: 50,
  CL: 1000,
  MCL: 100,
  GC: 100,
  MGC: 10,
  SI: 5000,
  SIL: 1000,
  ZB: 1000,
  ZN: 1000,
};

// ─── rootSymbol ───────────────────────────────────────────────────────────
// Strip a trailing numeric suffix (e.g. contract year digits) to get the
// root symbol. Matches the lookup behavior previously duplicated across
// useShadow.ts, plannedScenarios.ts, whatIfEngine.ts, and TradeCompare.tsx.
export function rootSymbol(symbol: string): string {
  return symbol.toUpperCase().trim().replace(/\d+$/, '');
}

// ─── resolveMultiplier ──────────────────────────────────────────────────────
// Prefer an explicit, valid trade multiplier; otherwise fall back to the
// root-symbol lookup; otherwise fall back to 1 for unknown/missing symbols.
export function resolveMultiplier(
  symbol: string | null | undefined,
  tradeMultiplier?: number | null,
): number {
  if (tradeMultiplier != null && tradeMultiplier > 0) return tradeMultiplier;
  const sym = rootSymbol(symbol ?? '');
  return ASSET_MULTIPLIERS[sym] ?? 1;
}
