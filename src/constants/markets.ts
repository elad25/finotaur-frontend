// src/constants/markets.ts
// =====================================================
// FINOTAUR MARKETS — Function × Asset route mapping
// =====================================================
// Phase 1 nav redesign: collapses all per-asset domains into a single
// Markets product with an asset selector.
//
// Iron rule: only map to EXISTING routes. Do NOT invent new paths.
// If a function has no route for an asset, leave the key absent.
// =====================================================

import {
  LayoutDashboard, Search, Map, TrendingUp, Calendar, Newspaper,
  Activity, Bell, FileText, BarChart3, DollarSign, Target, Zap, Award,
  Users, LineChart, Globe, Coins, Flame, Brain, Droplet, Layers,
  type LucideIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Asset classes
// ---------------------------------------------------------------------------
export type AssetClass = 'stocks' | 'crypto' | 'futures' | 'forex' | 'commodities' | 'macro';

export interface AssetClassMeta {
  id: AssetClass;
  label: string;
  icon: LucideIcon;
}

export const ASSET_CLASSES: AssetClassMeta[] = [
  { id: 'stocks',      label: 'Stocks',      icon: TrendingUp },
  { id: 'crypto',      label: 'Crypto',       icon: Coins },
  { id: 'futures',     label: 'Futures',      icon: BarChart3 },
  { id: 'forex',       label: 'Forex',        icon: Globe },
  { id: 'commodities', label: 'Commodities',  icon: Flame },
  { id: 'macro',       label: 'Macro',        icon: Brain },
];

// ---------------------------------------------------------------------------
// Function groups
// ---------------------------------------------------------------------------
export type MarketFunction =
  // Cross-asset
  | 'overview'
  | 'screener'
  | 'heatmap'
  | 'movers'
  | 'calendar'
  | 'news'
  | 'sentiment'
  | 'watchlists'
  | 'reports'
  // Stocks-specific
  | 'fundamentals'
  | 'sectors'
  | 'catalysts'
  | 'upgrades'
  | 'valuation'
  | 'insider'
  | 'earnings'
  // Crypto-specific
  | 'derivatives'
  | 'defi-tvl'
  | 'stablecoins'
  // Futures-specific
  | 'open-interests'
  // Forex-specific
  | 'strength'
  | 'correlation'
  | 'pairs'
  | 'rates'
  // Commodities-specific
  | 'energy'
  | 'metals'
  | 'agriculture'
  | 'seasonality'
  // Macro-specific
  | 'liquidity'
  | 'real-yields'
  | 'credit-spreads'
  | 'cross-asset'
  | 'macro-models'
  | 'indicators'
  | 'events';

export interface MarketFunctionMeta {
  id: MarketFunction;
  label: string;
  icon: LucideIcon;
  /** Which assets support this function (keys present = route exists). */
  routes: Partial<Record<AssetClass, string>>;
}

// ---------------------------------------------------------------------------
// The full function catalogue with per-asset route overrides.
// Only include a key when the route actually exists today.
// ---------------------------------------------------------------------------
export const MARKET_FUNCTIONS: MarketFunctionMeta[] = [
  // ── Cross-asset ──────────────────────────────────────────────────────────
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    routes: {
      stocks:      '/app/stocks/overview',
      crypto:      '/app/crypto/overview',
      futures:     '/app/futures/overview',
      forex:       '/app/forex/overview',
      commodities: '/app/commodities/overview',
      macro:       '/app/macro/overview',
    },
  },
  {
    id: 'screener',
    label: 'Screener',
    icon: Search,
    routes: {
      stocks:      '/app/stocks/screener',
      crypto:      '/app/crypto/screener',
      commodities: '/app/commodities/screener',
    },
  },
  {
    id: 'heatmap',
    label: 'Heatmap',
    icon: Map,
    routes: {
      crypto: '/app/crypto/heatmap',
      macro:  '/app/macro/global-heatmap',
    },
  },
  {
    id: 'movers',
    label: 'Top Movers',
    icon: TrendingUp,
    routes: {
      stocks: '/app/stocks/movers',
    },
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    routes: {
      futures:     '/app/futures/calendar',
      forex:       '/app/forex/calendar',
      commodities: '/app/commodities/calendar',
      macro:       '/app/macro/calendar',
    },
  },
  {
    id: 'news',
    label: 'News',
    icon: Newspaper,
    routes: {
      stocks:      '/app/stocks/news',
      crypto:      '/app/crypto/sentiment',
      forex:       '/app/forex/news',
      commodities: '/app/commodities/news',
    },
  },
  {
    id: 'sentiment',
    label: 'Sentiment',
    icon: Activity,
    routes: {
      crypto: '/app/crypto/sentiment',
      macro:  '/app/macro/sentiment',
    },
  },
  {
    id: 'watchlists',
    label: 'Watchlists',
    icon: Bell,
    routes: {
      stocks: '/app/stocks/watchlists',
      crypto: '/app/crypto/watchlist',
      forex:  '/app/forex/alerts',
    },
  },
  {
    id: 'reports',
    label: 'Reports & PDFs',
    icon: FileText,
    routes: {
      stocks:      '/app/stocks/reports',
      forex:       '/app/forex/deep-analysis',
      commodities: '/app/commodities/reports',
      macro:       '/app/macro/reports',
    },
  },

  // ── Stocks-specific ──────────────────────────────────────────────────────
  {
    id: 'fundamentals',
    label: 'Fundamentals',
    icon: BarChart3,
    routes: {
      stocks: '/app/stocks/fundamentals',
    },
  },
  {
    id: 'sectors',
    label: 'Sector Analysis',
    icon: Target,
    routes: {
      stocks: '/app/stocks/sectors',
    },
  },
  {
    id: 'catalysts',
    label: 'Catalysts',
    icon: Zap,
    routes: {
      stocks:      '/app/stocks/catalysts',
      commodities: '/app/commodities/catalysts',
    },
  },
  {
    id: 'upgrades',
    label: 'Upgrades',
    icon: Award,
    routes: {
      stocks: '/app/stocks/upgrades',
    },
  },
  {
    id: 'valuation',
    label: 'Valuation',
    icon: DollarSign,
    routes: {
      stocks: '/app/stocks/valuation',
    },
  },
  {
    id: 'insider',
    label: 'Insider & 13F',
    icon: Users,
    routes: {
      stocks: '/app/stocks/insider',
    },
  },
  {
    id: 'earnings',
    label: 'Earnings',
    icon: Calendar,
    routes: {
      stocks: '/app/stocks/earnings',
    },
  },

  // ── Crypto-specific ───────────────────────────────────────────────────────
  {
    id: 'derivatives',
    label: 'Derivatives',
    icon: Activity,
    routes: {
      crypto: '/app/crypto/derivatives',
    },
  },
  {
    id: 'defi-tvl',
    label: 'DeFi TVL',
    icon: Coins,
    routes: {
      crypto: '/app/crypto/defi-tvl',
    },
  },
  {
    id: 'stablecoins',
    label: 'Stablecoins',
    icon: DollarSign,
    routes: {
      crypto: '/app/crypto/stablecoins',
    },
  },

  // ── Futures-specific ──────────────────────────────────────────────────────
  {
    id: 'open-interests',
    label: 'Open Interest',
    icon: BarChart3,
    routes: {
      futures: '/app/futures/open-interests',
    },
  },

  // ── Forex-specific ────────────────────────────────────────────────────────
  {
    id: 'strength',
    label: 'Currency Strength',
    icon: Activity,
    routes: {
      forex: '/app/forex/strength',
    },
  },
  {
    id: 'correlation',
    label: 'Correlation Map',
    icon: Map,
    routes: {
      forex: '/app/forex/correlation',
    },
  },
  {
    id: 'pairs',
    label: 'Major/Cross Pairs',
    icon: Globe,
    routes: {
      forex: '/app/forex/pairs',
    },
  },
  {
    id: 'rates',
    label: 'Interest Rates',
    icon: LineChart,
    routes: {
      forex:  '/app/forex/rates',
      macro:  '/app/macro/rates',
    },
  },

  // ── Commodities-specific ─────────────────────────────────────────────────
  {
    id: 'energy',
    label: 'Energy',
    icon: Flame,
    routes: {
      commodities: '/app/commodities/energy',
    },
  },
  {
    id: 'metals',
    label: 'Metals',
    icon: Coins,
    routes: {
      commodities: '/app/commodities/metals',
    },
  },
  {
    id: 'agriculture',
    label: 'Agriculture',
    icon: Target,
    routes: {
      commodities: '/app/commodities/agriculture',
    },
  },
  {
    id: 'seasonality',
    label: 'Seasonality',
    icon: Calendar,
    routes: {
      commodities: '/app/commodities/seasonality',
    },
  },

  // ── Macro-specific ────────────────────────────────────────────────────────
  {
    id: 'liquidity',
    label: 'Net Liquidity',
    icon: Droplet,
    routes: {
      macro: '/app/macro/liquidity',
    },
  },
  {
    id: 'real-yields',
    label: 'Real Yields',
    icon: TrendingUp,
    routes: {
      macro: '/app/macro/real-yields',
    },
  },
  {
    id: 'credit-spreads',
    label: 'Credit Spreads',
    icon: Activity,
    routes: {
      macro: '/app/macro/credit-spreads',
    },
  },
  {
    id: 'cross-asset',
    label: 'Cross-Asset',
    icon: Layers,
    routes: {
      macro: '/app/macro/cross-asset',
    },
  },
  {
    id: 'macro-models',
    label: 'Macro Models',
    icon: Brain,
    routes: {
      macro: '/app/macro/models',
    },
  },
  {
    id: 'indicators',
    label: 'Economic Indicators',
    icon: BarChart3,
    routes: {
      macro: '/app/macro/indicators',
    },
  },
  {
    id: 'events',
    label: 'Major Events',
    icon: Zap,
    routes: {
      macro: '/app/macro/events',
    },
  },
];

// ---------------------------------------------------------------------------
// Helper: get the sidebar items for a given asset class
// (only functions that have a route for that asset)
// ---------------------------------------------------------------------------
export function getMarketsItemsForAsset(asset: AssetClass): MarketFunctionMeta[] {
  return MARKET_FUNCTIONS.filter((fn) => fn.routes[asset] !== undefined);
}

// ---------------------------------------------------------------------------
// Helper: derive the active route for a function + asset pair
// ---------------------------------------------------------------------------
export function getMarketRoute(fn: MarketFunction, asset: AssetClass): string | undefined {
  const meta = MARKET_FUNCTIONS.find((m) => m.id === fn);
  return meta?.routes[asset];
}

// ---------------------------------------------------------------------------
// URL prefixes that belong to the Markets product.
// Used by active-product detection in TopNav / useDomain.
// ---------------------------------------------------------------------------
export const MARKETS_PATH_PREFIXES = [
  '/app/all-markets',
  '/app/stocks',
  '/app/crypto',
  '/app/futures',
  '/app/forex',
  '/app/commodities',
  '/app/macro',
] as const;

/** Paths that share a Markets prefix but belong to a different top-level product. */
const MARKETS_EXCLUSIONS = [
  '/app/all-markets/warzone',
  '/app/all-markets/admin',
] as const;

/** True when the current pathname belongs to the Markets product. */
export function isMarketsPath(pathname: string): boolean {
  // Exclude sub-paths that belong to other products (War Zone, Admin).
  if (MARKETS_EXCLUSIONS.some((ex) => pathname.startsWith(ex))) return false;
  return MARKETS_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Best-guess: derive the selected asset from the current URL.
 * e.g. /app/stocks/screener → 'stocks', /app/macro/liquidity → 'macro'
 * Falls back to 'stocks' if no match.
 */
export function assetFromPathname(pathname: string): AssetClass {
  const map: Array<[string, AssetClass]> = [
    ['/app/stocks',      'stocks'],
    ['/app/crypto',      'crypto'],
    ['/app/futures',     'futures'],
    ['/app/forex',       'forex'],
    ['/app/commodities', 'commodities'],
    ['/app/macro',       'macro'],
  ];
  for (const [prefix, asset] of map) {
    if (pathname.startsWith(prefix)) return asset;
  }
  return 'stocks'; // default
}
