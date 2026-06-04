// src/data/treasuryYields.ts
// Static list of US Treasury yield symbols and breakeven inflation rates.
// Used by the omnibox Bonds tab to surface results without an API call.

export type TreasuryYield = { symbol: string; name: string };

export const TREASURY_YIELDS: TreasuryYield[] = [
  { symbol: 'US2Y',   name: 'US 2-Year Treasury Yield' },
  { symbol: 'US5Y',   name: 'US 5-Year Treasury Yield' },
  { symbol: 'US10Y',  name: 'US 10-Year Treasury Yield' },
  { symbol: 'US30Y',  name: 'US 30-Year Treasury Yield' },
  { symbol: 'US5YBE', name: 'US 5-Year Breakeven Inflation' },
  { symbol: 'US10YBE', name: 'US 10-Year Breakeven Inflation' },
];

/**
 * Search the static treasury yields list.
 * Matches against symbol and name; also matches digit-only queries (e.g. "10" → US10Y).
 * Priority: exact symbol → symbol prefix → name prefix → name substring → digit match.
 * Case-insensitive. Returns up to `limit` results.
 */
export function searchBonds(query: string, limit = 6): TreasuryYield[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];

  const qLower = q.toLowerCase();

  const exactSymbol: TreasuryYield[] = [];
  const prefixSymbol: TreasuryYield[] = [];
  const prefixName: TreasuryYield[] = [];
  const substringName: TreasuryYield[] = [];

  for (const entry of TREASURY_YIELDS) {
    const symUpper = entry.symbol.toUpperCase();
    const nameLower = entry.name.toLowerCase();

    if (symUpper === q) {
      exactSymbol.push(entry);
    } else if (symUpper.startsWith(q)) {
      prefixSymbol.push(entry);
    } else if (nameLower.startsWith(qLower)) {
      prefixName.push(entry);
    } else if (nameLower.includes(qLower)) {
      substringName.push(entry);
    }
  }

  return [...exactSymbol, ...prefixSymbol, ...prefixName, ...substringName].slice(0, limit);
}
