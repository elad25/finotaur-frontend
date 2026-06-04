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
  Users, LineChart, Globe, Coins, Flame, Brain, Droplet, Layers, PieChart,
  Home, Wallet, Sparkles, Filter, GitCompare,
  type LucideIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Asset classes
// ---------------------------------------------------------------------------
export type AssetClass = 'home' | 'stocks' | 'options' | 'crypto' | 'futures' | 'forex' | 'commodities' | 'macro' | 'etf';

export interface AssetClassMeta {
  id: AssetClass;
  label: string;
  icon: LucideIcon;
  /** True when the asset is sealed (coming soon) — tabs show a "Soon" badge. */
  comingSoon?: boolean;
}

export const ASSET_CLASSES: AssetClassMeta[] = [
  { id: 'home',        label: 'Home',        icon: Home },
  { id: 'stocks',      label: 'Stocks',      icon: TrendingUp },
  { id: 'options',     label: 'Options',     icon: Layers,    comingSoon: true },
  { id: 'crypto',      label: 'Crypto',      icon: Coins },
  { id: 'futures',     label: 'Futures',     icon: BarChart3 },
  { id: 'forex',       label: 'Forex',       icon: Globe },
  { id: 'commodities', label: 'Commodities', icon: Flame },
  { id: 'macro',       label: 'Macro',       icon: Brain },
  { id: 'etf',         label: 'ETF',         icon: PieChart,  comingSoon: true },
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
  | 'portfolio'
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
  | 'commodities-markets'
  | 'commodities-macro'
  | 'seasonality'
  | 'commodities-positioning'
  | 'commodities-calendar'
  | 'commodities-desk'
  // Macro-specific
  | 'liquidity'
  | 'real-yields'
  | 'credit-spreads'
  | 'cross-asset'
  | 'macro-models'
  | 'indicators'
  | 'events'
  // Options-specific
  | 'options-chain'
  | 'options-flow'
  | 'options-volatility'
  | 'options-greeks'
  | 'options-iv-rank'
  | 'options-oi-volume'
  | 'options-unusual'
  | 'options-strategy'
  | 'options-simulator'
  | 'options-earnings-iv'
  // ETF-specific
  | 'etf-overview'
  | 'etf-directory'
  | 'etf-screener'
  | 'etf-compare'
  | 'etf-news'
  | 'etf-holdings'
  | 'etf-flows'
  | 'etf-performance'
  // New macro sidebar tabs (isolated — not shared with other asset classes)
  | 'macro-pulse'
  | 'macro-rates-cb'
  | 'macro-inflation'
  | 'macro-global'
  | 'macro-risk'
  | 'macro-calendar'
  | 'macro-desk';

export interface MarketFunctionMeta {
  id: MarketFunction;
  label: string;
  icon: LucideIcon;
  /** Which assets support this function (keys present = route exists). */
  routes: Partial<Record<AssetClass, string>>;
  /** Closed to the general public (paywall). Free Research Lab items omit this. */
  locked?: boolean;
  /** Marks this item as compliance price-gated (Polygon redistribution license not held). */
  priceGated?: boolean;
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
      home:        '/app/all-markets/overview',
      stocks:      '/app/stocks/overview',
      crypto:      '/app/crypto/overview',
      futures:     '/app/futures/overview',
      forex:       '/app/forex/overview',
      commodities: '/app/commodities/overview',
      macro:       '/app/macro/overview',
    },
    priceGated: true,  // compliance gate: Overview pages render raw Polygon price/chart data for stocks + all-markets
  },
  {
    id: 'screener',
    label: 'Screener',
    icon: Search,
    routes: {
      home: '/app/all-markets/screener',
    },
  },
  {
    id: 'heatmap',
    label: 'Heatmap',
    icon: Map,
    routes: {
      home: '/app/all-markets/heatmap',
    },
    locked: true,      // Polygon redistribution license required — closed to public
    priceGated: true,  // compliance gate: raw price data not licensed for redistribution
  },
  {
    id: 'movers',
    label: 'Top Movers',
    icon: TrendingUp,
    routes: {
      home: '/app/all-markets/movers',
    },
    locked: true,      // Polygon redistribution license required — closed to public
    priceGated: true,  // compliance gate: raw price data not licensed for redistribution
  },
  {
    id: 'calendar',
    label: 'Economic Calendar',
    icon: Calendar,
    routes: {
      home: '/app/all-markets/calendar',
    },
  },
  {
    id: 'news',
    label: 'News',
    icon: Newspaper,
    routes: {
      home: '/app/all-markets/news',
    },
  },
  {
    id: 'sentiment',
    label: 'Sentiment',
    icon: Activity,
    routes: {
      home: '/app/all-markets/sentiment',
      crypto: '/app/crypto/sentiment',
    },
  },
  {
    id: 'watchlists',
    label: 'Watchlists',
    icon: Bell,
    routes: {
      home: '/app/all-markets/watchlist',
    },
  },
  {
    id: 'reports',
    label: 'Reports & PDFs',
    icon: FileText,
    routes: {
      stocks:      '/app/stocks/reports',
      forex:       '/app/forex/deep-analysis',
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
    },
  },
  {
    id: 'upgrades',
    label: 'Upgrades',
    icon: Award,
    routes: {
      stocks: '/app/stocks/upgrades',
    },
    locked: true, // analyst ratings = Finnhub/FMP, no redistribution license — closed to public
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
    locked: true, // earnings calendar = Finnhub, no commercial license — closed to public
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
    id: 'commodities-markets',
    label: 'Markets',
    icon: BarChart3,
    routes: {
      commodities: '/app/commodities/markets',
    },
  },
  {
    id: 'commodities-macro',
    label: 'Macro Drivers',
    icon: Activity,
    routes: {
      commodities: '/app/commodities/macro',
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
  {
    id: 'commodities-positioning',
    label: 'Positioning & Supply',
    icon: Layers,
    routes: {
      commodities: '/app/commodities/positioning',
    },
  },
  {
    id: 'commodities-calendar',
    label: 'Calendar & News',
    icon: Newspaper,
    routes: {
      commodities: '/app/commodities/calendar',
    },
  },
  {
    id: 'commodities-desk',
    label: 'My Desk',
    icon: Bell,
    routes: {
      commodities: '/app/commodities/watchlist',
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
    locked: true, // closed to public (not in free Research Lab list)
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
    locked: true, // closed to public (not in free Research Lab list)
  },

  // ── Options-specific ─────────────────────────────────────────────────────
  {
    id: 'options-chain',
    label: 'Options Chain',
    icon: Layers,
    routes: {
      options: '/app/options/chain',
    },
  },
  {
    id: 'options-flow',
    label: 'Options Flow',
    icon: Activity,
    routes: {
      options: '/app/options/flow',
    },
  },
  {
    id: 'options-volatility',
    label: 'Volatility',
    icon: LineChart,
    routes: {
      options: '/app/options/volatility',
    },
  },
  {
    id: 'options-greeks',
    label: 'Greeks Monitor',
    icon: Target,
    routes: {
      options: '/app/options/greeks-monitor',
    },
  },
  {
    id: 'options-iv-rank',
    label: 'IV Rank',
    icon: BarChart3,
    routes: {
      options: '/app/options/iv-rank',
    },
  },
  {
    id: 'options-oi-volume',
    label: 'OI / Volume',
    icon: BarChart3,
    routes: {
      options: '/app/options/oi-volume',
    },
  },
  {
    id: 'options-unusual',
    label: 'Unusual Activity',
    icon: Zap,
    routes: {
      options: '/app/options/unusual-activity',
    },
  },
  {
    id: 'options-strategy',
    label: 'Strategy Builder',
    icon: Brain,
    routes: {
      options: '/app/options/strategy',
    },
  },
  {
    id: 'options-simulator',
    label: 'Simulator',
    icon: Map,
    routes: {
      options: '/app/options/simulator',
    },
  },
  {
    id: 'options-earnings-iv',
    label: 'Earnings IV Crush',
    icon: Calendar,
    routes: {
      options: '/app/options/earnings-iv-crush',
    },
  },

  // ── ETF-specific ──────────────────────────────────────────────────────────
  // Fixed sidebar items for the ETF asset under Markets.
  // Ticker-aware analysis (Holdings, Performance, Risk, Dividends, Cost, Verdict)
  // is accessed via inline tabs in ETFLayout — not as sidebar items.
  {
    id: 'etf-overview',
    label: 'ETF Analyzer',
    icon: Sparkles,
    routes: {
      etf: '/app/etfs/overview',
    },
  },
  {
    id: 'etf-directory',
    label: 'Directory',
    icon: LayoutDashboard,
    routes: {
      etf: '/app/etfs/directory',
    },
  },
  {
    id: 'etf-screener',
    label: 'Screener',
    icon: Filter,
    routes: {
      etf: '/app/etfs/screener',
    },
  },
  {
    id: 'etf-compare',
    label: 'Compare',
    icon: GitCompare,
    routes: {
      etf: '/app/etfs/compare',
    },
  },
  {
    id: 'etf-news',
    label: 'News',
    icon: Newspaper,
    routes: {
      etf: '/app/etfs/news',
    },
  },

  // ── Home-only ─────────────────────────────────────────────────────────────
  {
    id: 'portfolio',
    label: 'My Portfolio',
    icon: Wallet,
    routes: {
      home: '/app/all-markets/portfolio',
    },
    locked: false, // Manual portfolio builder — free, open to all signed-in users
  },
];

// ---------------------------------------------------------------------------
// Dedicated sidebar items for the Macro asset class.
// These 7 tabs map to the new macro container pages shipped in the
// macro-nav redesign. They are isolated here so shared MARKET_FUNCTIONS
// entries (used by stocks, forex, etc.) are never mutated or relabelled.
// ---------------------------------------------------------------------------
const MACRO_FUNCTIONS: MarketFunctionMeta[] = [
  { id: 'macro-pulse',     label: 'Pulse',                icon: LayoutDashboard, routes: { macro: '/app/macro/pulse' },      locked: false },
  { id: 'macro-rates-cb',  label: 'Rates & Central Banks', icon: LineChart,       routes: { macro: '/app/macro/rates' },      locked: false },
  { id: 'macro-inflation', label: 'Inflation & Growth',   icon: BarChart3,       routes: { macro: '/app/macro/indicators' }, locked: false },
  { id: 'macro-global',    label: 'Global Markets',       icon: Map,             routes: { macro: '/app/macro/global' },     locked: false },
  { id: 'macro-risk',      label: 'Risk & Regime',        icon: Activity,        routes: { macro: '/app/macro/risk' },       locked: false },
  { id: 'macro-calendar',  label: 'Economic Calendar',    icon: Calendar,        routes: { macro: '/app/macro/calendar' },   locked: false },
  { id: 'macro-desk',      label: 'Macro Desk',           icon: FileText,        routes: { macro: '/app/macro/desk' },       locked: false },
];

// ---------------------------------------------------------------------------
// Helper: get the sidebar items for a given asset class
// (only functions that have a route for that asset)
// ---------------------------------------------------------------------------
export function getMarketsItemsForAsset(asset: AssetClass): MarketFunctionMeta[] {
  if (asset === 'macro') return MACRO_FUNCTIONS;
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
  '/app/options',
  '/app/crypto',
  '/app/futures',
  '/app/forex',
  '/app/commodities',
  '/app/macro',
  '/app/etfs',
  '/app/etf',
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
    ['/app/all-markets', 'home'],
    ['/app/stocks',      'stocks'],
    ['/app/options',     'options'],
    ['/app/crypto',      'crypto'],
    ['/app/futures',     'futures'],
    ['/app/forex',       'forex'],
    ['/app/commodities', 'commodities'],
    ['/app/macro',       'macro'],
    // /app/etfs must come before /app/etf (more specific prefix first)
    ['/app/etfs',        'etf'],
    ['/app/etf',         'etf'],
  ];
  for (const [prefix, asset] of map) {
    if (pathname.startsWith(prefix)) return asset;
  }
  return 'stocks'; // default
}
