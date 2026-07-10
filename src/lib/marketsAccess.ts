// src/lib/marketsAccess.ts
// =====================================================
// Single source of truth for the Markets research-area access policy.
//
// Flip MARKETS_BETA_ONLY to `false` to OPEN the entire Markets area to
// everyone. That one switch simultaneously removes: the top asset-class
// SubNav lock (MarketsAssetTabs), the left Sidebar lock (MarketsSidebar),
// the global-search deep-link gate (tickerRouting), AND the direct-URL
// route guard (ProtectedAppLayout). No other edits needed to open it.
// =====================================================

/** When true, the Markets research area is restricted to beta/admin users. */
export const MARKETS_BETA_ONLY = true;

/** True when the current user must be blocked from the Markets area. */
export function isMarketsBlocked(hasBetaAccess: boolean): boolean {
  return MARKETS_BETA_ONLY && !hasBetaAccess;
}

// Asset-class research path prefixes that live under the Markets area.
const MARKETS_ASSET_PREFIXES = [
  '/app/etfs',
  '/app/stocks',
  '/app/crypto',
  '/app/forex',
  '/app/commodities',
  '/app/macro',
  '/app/options',
  '/app/futures',
  '/app/indices',
];

// Specific /app/all-markets/* pages that belong to Markets research. The rest
// of the all-markets namespace (top-secret, warzone, pricing, affiliate, admin)
// is NOT Markets and must stay open — so it is intentionally excluded here.
const MARKETS_ALLMARKETS_PAGES = [
  '/app/all-markets/overview',
  '/app/all-markets/summary',
  '/app/all-markets/chart',
  '/app/all-markets/movers',
  '/app/all-markets/sentiment',
  '/app/all-markets/calendar',
  '/app/all-markets/news',
  '/app/all-markets/heatmap',
  '/app/all-markets/screener',
  '/app/all-markets/portfolio',
  '/app/all-markets/watchlist',
];

/** Whether a pathname is a Markets research page subject to the beta gate. */
export function isMarketsResearchPath(pathname: string): boolean {
  const p = pathname;
  if (MARKETS_ASSET_PREFIXES.some((pre) => p === pre || p.startsWith(pre + '/'))) return true;
  if (MARKETS_ALLMARKETS_PAGES.some((pg) => p === pg || p.startsWith(pg + '/'))) return true;
  return false;
}

// =====================================================
// Search-surface leak fix: a blocked (non-beta) user must not even SEE
// Markets-locked assets (ETF/crypto/fx/futures/bond) in search suggestions —
// not just be blocked from navigating to them. The route gate in
// tickerRouting.ts (routeForSuggest) is the second line of defense for a
// user who somehow still ends up with a locked item; this filter is the
// first line, applied before results ever render.
// =====================================================

/** Asset types that belong to the beta-gated Markets area. Keep in sync with
 * the `marketsLockedAsset` set in tickerRouting.ts. */
export const MARKETS_LOCKED_ASSET_TYPES = ['etf', 'crypto', 'fx', 'futures', 'bond'] as const;

/** True when the given assetType is one of the Markets-locked asset types. */
export function isMarketsLockedAssetType(assetType: string | undefined): boolean {
  return !!assetType && (MARKETS_LOCKED_ASSET_TYPES as readonly string[]).includes(assetType);
}

/**
 * Strips Markets-locked assets (ETF/crypto/fx/futures/bond) out of a list of
 * search suggestions when the current user is blocked from the Markets area.
 * No-op (returns `items` untouched) when the user has access.
 */
export function filterMarketsLockedSuggestions<T extends { assetType?: string }>(
  items: T[],
  hasBetaAccess: boolean,
): T[] {
  if (!isMarketsBlocked(hasBetaAccess)) return items;
  return items.filter((item) => !isMarketsLockedAssetType(item.assetType));
}
