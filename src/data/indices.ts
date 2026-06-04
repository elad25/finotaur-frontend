// src/data/indices.ts
// Static list of major global indices.
// Used by the omnibox Indices tab to surface results without an API call.
// searchIndices matches against symbol (with leading '^' stripped) AND name,
// so queries like "spx", "vix", "500", "nasdaq", "dax" work without the caret.

export type IndexEntry = { symbol: string; name: string };

export const INDICES: IndexEntry[] = [
  { symbol: '^GSPC',    name: 'S&P 500' },
  { symbol: '^DJI',     name: 'Dow Jones Industrial Average' },
  { symbol: '^IXIC',    name: 'NASDAQ Composite' },
  { symbol: '^NDX',     name: 'NASDAQ 100' },
  { symbol: '^RUT',     name: 'Russell 2000' },
  { symbol: '^VIX',     name: 'CBOE Volatility Index' },
  { symbol: '^FTSE',    name: 'FTSE 100' },
  { symbol: '^GDAXI',   name: 'DAX 40' },
  { symbol: '^FCHI',    name: 'CAC 40' },
  { symbol: '^N225',    name: 'Nikkei 225' },
  { symbol: '^HSI',     name: 'Hang Seng' },
  { symbol: '^STOXX50E', name: 'Euro Stoxx 50' },
];

// Common aliases: maps an uppercase alias → the symbol it resolves to.
// Checked before the main match loop so "SPX" instantly finds ^GSPC.
const ALIASES: Record<string, string> = {
  SPX:    '^GSPC',
  SP500:  '^GSPC',
  'SP 500': '^GSPC',
  '500':  '^GSPC',
  DOW:    '^DJI',
  DJIA:   '^DJI',
  NASDAQ: '^IXIC',
  COMP:   '^IXIC',
  NDX:    '^NDX',
  NQ:     '^NDX',
  RUT:    '^RUT',
  RTY:    '^RUT',
  VIX:    '^VIX',
  DAX:    '^GDAXI',
  CAC:    '^FCHI',
  NIKKEI: '^N225',
  N225:   '^N225',
  HSI:    '^HSI',
  STOXX:  '^STOXX50E',
};

/**
 * Search the static indices list.
 * Matches against the symbol (with leading '^' stripped) AND the name.
 * Also resolves common aliases (SPX → ^GSPC, VIX → ^VIX, etc.).
 * Priority: alias hit → exact symbol → symbol prefix → name prefix → name substring.
 * Case-insensitive. Returns up to `limit` results.
 */
export function searchIndices(query: string, limit = 6): IndexEntry[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];

  const qLower = q.toLowerCase();

  // 1. Alias resolution: if the query matches an alias exactly, put that entry first.
  const aliasSymbol = ALIASES[q];
  const aliasEntries: IndexEntry[] = aliasSymbol
    ? INDICES.filter((idx) => idx.symbol === aliasSymbol)
    : [];
  const aliasSymbols = new Set(aliasEntries.map((e) => e.symbol));

  const exactSymbol: IndexEntry[] = [];
  const prefixSymbol: IndexEntry[] = [];
  const prefixName: IndexEntry[] = [];
  const substringName: IndexEntry[] = [];

  for (const entry of INDICES) {
    if (aliasSymbols.has(entry.symbol)) continue; // already in aliasEntries

    // Strip leading '^' for symbol matching so "gspc", "ixic", etc. work.
    const rawSym = entry.symbol.startsWith('^')
      ? entry.symbol.slice(1).toUpperCase()
      : entry.symbol.toUpperCase();
    const nameLower = entry.name.toLowerCase();

    if (rawSym === q) {
      exactSymbol.push(entry);
    } else if (rawSym.startsWith(q)) {
      prefixSymbol.push(entry);
    } else if (nameLower.startsWith(qLower)) {
      prefixName.push(entry);
    } else if (nameLower.includes(qLower)) {
      substringName.push(entry);
    }
  }

  return [
    ...aliasEntries,
    ...exactSymbol,
    ...prefixSymbol,
    ...prefixName,
    ...substringName,
  ].slice(0, limit);
}
