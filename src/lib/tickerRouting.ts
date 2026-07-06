// src/lib/tickerRouting.ts
// Shared routing helper — maps a ticker + assetType to the correct app route.
// Single source of truth used by GlobalOmnibox, GlobalTickerSearch, CommandPalette.

import type { SuggestItem } from '@/components/Search/useSymbolSuggest';

/**
 * Returns the navigation path for a given ticker symbol and its asset type.
 *
 * @param sym       - Ticker symbol (any casing; callers typically pass uppercase)
 * @param assetType - Asset class from the backend or a local classification.
 * @param coinId    - Optional CoinGecko id used to deep-link into a specific crypto coin page.
 * @param hasBetaAccess - Whether the current user can access the beta-only Markets area.
 */
export function routeForSuggest(
  sym: string,
  assetType: SuggestItem['assetType'],
  coinId?: string,
  hasBetaAccess: boolean = true,
): string {
  // The Markets research area (ETF / Crypto / Forex / Futures / Macro-bond) is
  // beta-only. A non-beta user's search must NOT deep-link into a locked asset
  // page — send them to the upgrade page instead. Stocks/index route to the
  // AI Stock Analyzer (stays open), so they are never gated here.
  const marketsLockedAsset =
    assetType === 'etf' ||
    assetType === 'crypto' ||
    assetType === 'fx' ||
    assetType === 'futures' ||
    assetType === 'bond';
  if (marketsLockedAsset && !hasBetaAccess) return '/app/upgrade';

  if (assetType === 'etf')     return `/app/etfs/${sym}/overview`;
  if (assetType === 'crypto')  return coinId ? `/app/crypto/coin/${coinId}` : '/app/crypto/overview';
  if (assetType === 'fx')      return `/app/forex/pair/${sym}`;
  if (assetType === 'futures') return '/app/futures/overview';
  if (assetType === 'bond')    return '/app/macro/rates';
  // stock / index / unknown / undefined → Stock Analyzer
  return `/app/ai/stock-analyzer?symbol=${sym}`;
}
