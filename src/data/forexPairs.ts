// src/data/forexPairs.ts
// Static list of 23 major/minor forex pairs.
// Used by the omnibox Forex tab to surface results without an API call.

export type ForexPair = { symbol: string; name: string };

export const FOREX_PAIRS: ForexPair[] = [
  { symbol: 'EURUSD', name: 'Euro / US Dollar' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen' },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc' },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar' },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar' },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar' },
  { symbol: 'EURGBP', name: 'Euro / British Pound' },
  { symbol: 'EURJPY', name: 'Euro / Japanese Yen' },
  { symbol: 'EURCHF', name: 'Euro / Swiss Franc' },
  { symbol: 'EURCAD', name: 'Euro / Canadian Dollar' },
  { symbol: 'EURAUD', name: 'Euro / Australian Dollar' },
  { symbol: 'EURNZD', name: 'Euro / New Zealand Dollar' },
  { symbol: 'GBPJPY', name: 'British Pound / Japanese Yen' },
  { symbol: 'GBPCHF', name: 'British Pound / Swiss Franc' },
  { symbol: 'GBPCAD', name: 'British Pound / Canadian Dollar' },
  { symbol: 'GBPAUD', name: 'British Pound / Australian Dollar' },
  { symbol: 'GBPNZD', name: 'British Pound / New Zealand Dollar' },
  { symbol: 'AUDJPY', name: 'Australian Dollar / Japanese Yen' },
  { symbol: 'AUDCAD', name: 'Australian Dollar / Canadian Dollar' },
  { symbol: 'AUDCHF', name: 'Australian Dollar / Swiss Franc' },
  { symbol: 'CADJPY', name: 'Canadian Dollar / Japanese Yen' },
  { symbol: 'CHFJPY', name: 'Swiss Franc / Japanese Yen' },
];

/**
 * Search the static forex list.
 * Priority: exact symbol match → symbol prefix → name prefix → name substring.
 * Case-insensitive. Returns up to `limit` results.
 */
export function searchForex(query: string, limit = 6): ForexPair[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];

  const qLower = q.toLowerCase();

  const exactSymbol: ForexPair[] = [];
  const prefixSymbol: ForexPair[] = [];
  const prefixName: ForexPair[] = [];
  const substringName: ForexPair[] = [];

  for (const pair of FOREX_PAIRS) {
    const symUpper = pair.symbol.toUpperCase();
    const nameLower = pair.name.toLowerCase();

    if (symUpper === q) {
      exactSymbol.push(pair);
    } else if (symUpper.startsWith(q)) {
      prefixSymbol.push(pair);
    } else if (nameLower.startsWith(qLower)) {
      prefixName.push(pair);
    } else if (nameLower.includes(qLower)) {
      substringName.push(pair);
    }
  }

  return [...exactSymbol, ...prefixSymbol, ...prefixName, ...substringName].slice(0, limit);
}
