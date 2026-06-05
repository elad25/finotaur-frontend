// src/lib/tickerRouting.ts
// Shared routing helper — maps a ticker + assetType to the correct app route.
// Single source of truth used by GlobalOmnibox, GlobalTickerSearch, CommandPalette.

import type { SuggestItem } from '@/components/Search/useSymbolSuggest';

/**
 * Returns the navigation path for a given ticker symbol and its asset type.
 *
 * @param sym       - Ticker symbol (any casing; callers typically pass uppercase)
 * @param assetType - Asset class string from the backend or a local classification.
 *                    Accepts SuggestItem['assetType'] or a plain string so that
 *                    components using different data sources can pass their resolved type.
 * @param coinId    - Optional CoinGecko id used to deep-link into a specific crypto coin page.
 */
export function routeForSuggest(
  sym: string,
  assetType: SuggestItem['assetType'] | (string & {}), // eslint-disable-line @typescript-eslint/ban-types
  coinId?: string,
): string {
  if (assetType === 'etf')     return `/app/etfs/${sym}/overview`;
  if (assetType === 'crypto')  return coinId ? `/app/crypto/coin/${coinId}` : '/app/crypto/overview';
  if (assetType === 'fx')      return `/app/forex/pair/${sym}`;
  if (assetType === 'futures') return '/app/futures/overview';
  if (assetType === 'bond')    return '/app/macro/rates';
  // stock / index / unknown / undefined → Stock Analyzer
  return `/app/ai/stock-analyzer?symbol=${sym}`;
}
