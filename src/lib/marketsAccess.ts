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
