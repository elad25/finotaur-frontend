// src/constants/nav.ts
// =====================================================
// FINOTAUR NAVIGATION CONFIG - v4.0.0 (PHASE-1 REDESIGN)
// =====================================================
//
// 🔥 v4.0.0 CHANGES (Phase 1 Nav Redesign):
// - NEW: 'markets' product = unified research hub (asset-selector driven)
// - NEW: 'war-zone' top-level product (promoted from all-markets subNav)
// - NEW: 'top-secret' top-level product (promoted from all-markets subNav)
// - UPDATED: domainOrder reflects new Product Drawer order
// - REMOVED from domainOrder: individual asset domains, 'all-markets', 'funding'
//   (all legacy domain defs KEPT below so Sidebar environment detection still works)
// - Academy items removed from journal + crypto sidebars (routes kept)
//
// 🔥 v3.1.0 CHANGES:
// - ADDED: Site Dashboard page for admins
//
// 🔥 v3.0.0 CHANGES:
// - ADDED: beta flag for domains and nav items
// - ADDED: Beta access system (admin-only access to beta pages)
// =====================================================

import {
  LayoutDashboard, TrendingUp, Flame, Target, Calendar, BarChart3, FileText, Activity,
  Globe, Newspaper, Building, Coins, LineChart, Search, Bell, Users, Zap, Map,
  DollarSign, Wallet, Award, BookOpen, Layers, MessageSquare, PlusSquare,
  ListChecks, GraduationCap, Settings as SettingsIcon, HeadphonesIcon,
  FlaskConical, PlayCircle, Brain, Database, Code, UserPlus, CreditCard,
  Link, Gift, Swords, Crown, Shield, Copy, Droplet,
  type LucideIcon,
} from 'lucide-react';
import { FEATURES } from '@/config/features';

// Polygon redistribution license ($2k/mo) not held — raw price/quote/chart
// display is gated off. Flip to true when licensed.
export const MARKET_DATA_LICENSED = false;

// Finnhub commercial redistribution license not held — earnings calendar and
// corporate news feed are gated off. Flip to true when licensed.
export const FINNHUB_LICENSED = false;

// Sealed pending licensed options data feed (Track B). Re-enable when built.
// To re-enable: set OPTIONS_ENABLED = true, then restore subNav/sidebar below
// and uncomment 'options' in domainOrder.
export const OPTIONS_ENABLED = false;

// Sealed pending licensed futures data feed (CME licensed; Yahoo gray).
// To re-enable: set FUTURES_ENABLED = true, then restore subNav/sidebar in
// the futures domain below and swap ComingSoon back to real components in App.tsx.
export const FUTURES_ENABLED = false;

export interface NavItem {
  label: string;
  path: string;
  icon?: LucideIcon;
  adminOnly?: boolean;
  affiliateOnly?: boolean;
  locked?: boolean;
  beta?: boolean;
  hideForAdmin?: boolean;
  affiliateSmartPage?: boolean;
}

export interface Domain {
  id: string;
  label: string;
  subNav: NavItem[];
  sidebar: NavItem[];
  locked?: boolean;
  beta?: boolean;
  defaultPath?: string;
}

export const domains: Record<string, Domain> = {
  // ===========================================================================
  // ★ NEW: MARKETS — unified research hub, asset-selector aware
  //   The sidebar items rendered for this domain are handled by
  //   MarketsSidebar.tsx (which reads from constants/markets.ts).
  //   The arrays below are kept minimal / symbolic so existing code that
  //   references activeDomain.subNav / activeDomain.sidebar doesn't break.
  // ===========================================================================
  'markets': {
    id: 'markets',
    label: 'Markets',
    locked: false,   // Research Lab — free ($0/user: SEC/FRED/Polygon-flat/cache). Open to all.
    beta: false,
    defaultPath: '/app/stocks/overview',
    subNav: [
      // The Markets product does not use the SubNav bar for asset switching
      // (the asset selector lives in the Top Bar). Keeping one entry so the
      // SubNav renders the FINO AI button without crashing.
      { label: 'Markets', path: '/app/stocks/overview' },
    ],
    sidebar: [
      // Placeholder — actual Markets sidebar is rendered by MarketsSidebar.tsx
      { label: 'Overview', path: '/app/stocks/overview', icon: LayoutDashboard },
    ],
  },

  // ===========================================================================
  // ★ NEW: WAR ZONE — top-level brand product (promoted)
  // ===========================================================================
  'war-zone': {
    id: 'war-zone',
    label: 'War Zone',
    locked: false,
    beta: false,
    defaultPath: '/app/all-markets/warzone',
    subNav: [
      { label: 'Latest',  path: '/app/all-markets/warzone' },
      { label: 'Compose', path: '/app/all-markets/warzone/compose', adminOnly: true },
    ],
    sidebar: [
      { label: 'Latest',   path: '/app/all-markets/warzone', icon: Flame },
      { label: 'Archive',  path: '/app/all-markets/warzone/archive', icon: FileText },
      { label: 'Compose',  path: '/app/all-markets/warzone/compose', icon: Code, adminOnly: true },
    ],
  },

  // ===========================================================================
  // ★ NEW: TOP SECRET — top-level brand product (promoted)
  // ===========================================================================
  'top-secret': {
    id: 'top-secret',
    label: 'Top Secret',
    locked: false,
    beta: false,
    defaultPath: '/app/top-secret',
    subNav: [
      { label: 'Reports',    path: '/app/top-secret', hideForAdmin: true },
      { label: 'Admin',      path: '/app/top-secret/admin', adminOnly: true },
    ],
    sidebar: [
      { label: 'Latest Reports', path: '/app/top-secret', icon: FileText, hideForAdmin: true },
      { label: 'Admin',          path: '/app/top-secret/admin', icon: Shield, adminOnly: true },
    ],
  },

  // ===========================================================================
  // AI ARENA — unchanged from v3
  // ===========================================================================
  ai: {
    id: 'ai',
    label: 'AI Arena',
    locked: false,
    beta: false,
    defaultPath: '/app/ai/stock-analyzer',
    subNav: [
      { label: 'AI Analytics',    path: '/app/ai/stock-analyzer' },
    ],
    sidebar: [
      { label: 'Stock Analyzer',      path: '/app/ai/stock-analyzer',      icon: TrendingUp },
      { label: 'Sector Analyzer',     path: '/app/ai/sector-analyzer',     icon: Target },
      { label: 'Macro Analyzer',      path: '/app/ai/macro-analyzer',      icon: Globe },
      { label: 'Options Intelligence', path: '/app/ai/options-intelligence', icon: Layers },
      { label: 'Flow Scanner',        path: '/app/ai/flow-scanner',        icon: Search },
      { label: 'Intelligence Desk',   path: '/app/ai/top-5',               icon: Award },
      { label: 'Upcoming Events',     path: '/app/ai/upcoming-events',     icon: Calendar },
    ],
  },

  // ===========================================================================
  // COPILOT — standalone product (Phase 1 nav redesign). Lives in the
  // /copilot/* standalone shell (CopilotStandaloneLayout) with its own sidebar.
  // Drawer entry is a launch point; tier-locked (FINOTAUR, ADL-006).
  // ===========================================================================
  copilot: {
    id: 'copilot',
    label: 'Copilot',
    locked: true,
    beta: false,
    defaultPath: '/copilot',
    subNav: [
      { label: 'Copilot', path: '/copilot', locked: true },
    ],
    sidebar: [],
  },

  // ===========================================================================
  // JOURNAL — Academy item removed from sidebar (route kept in App.tsx)
  // ===========================================================================
  journal: {
    id: 'journal',
    label: 'Journal',
    locked: false,
    beta: false,
    subNav: [
      { label: 'Journal',     path: '/app/journal/overview' },
      { label: 'Backtest',    path: '/app/journal/backtest/overview' },
      { label: 'FINOTAUR AI', path: '/app/journal/finotaur-ai' },
      { label: 'Mentor Mode', path: '/app/journal/mentor' },
    ],
    sidebar: [
      { label: 'Dashboard',     path: '/app/journal/overview',    icon: LayoutDashboard },
      { label: 'Add Trade',     path: '/app/journal/new',          icon: PlusSquare },
      { label: 'Trades Journal', path: '/app/journal/my-trades',   icon: FileText },
      { label: 'My Strategies', path: '/app/journal/strategies',   icon: Layers },
      { label: 'Reports & Stats', path: '/app/journal/reports',    icon: BarChart3 },
      { label: 'Calendar',      path: '/app/journal/calendar',     icon: Calendar },
      { label: 'AI Chat',       path: '/app/journal/ai-review',    icon: MessageSquare },
      { label: 'Gameplan',      path: '/app/journal/scenarios',    icon: ListChecks },
      // Academy removed from sidebar (route /app/journal/academy still exists in App.tsx)
      { label: 'Settings',      path: '/app/journal/settings',     icon: SettingsIcon },
    ],
  },

  // ===========================================================================
  // TRADE COPIER — hidden from drawer (beta/admin-only); kept for DomainGuard
  // ===========================================================================
  'copy-trade': {
    id: 'copy-trade',
    label: 'Trade Copier',
    locked: false,
    beta: true, // 🔒 Non-beta users get hidden tab + DomainGuard redirect
    subNav: [
      { label: 'Trade Copier', path: '/app/copy-trade/overview' },
    ],
    sidebar: [
      { label: 'Connections',  path: '/app/copy-trade/overview',      icon: Link },
      { label: 'Trade Copier', path: '/app/copy-trade/trade-copier',   icon: Copy },
      { label: 'Manage Risk',  path: '/app/copy-trade/manage-risk',    icon: Shield },
    ],
  },

  // ===========================================================================
  // LEGACY DOMAINS — KEPT IN FULL so Sidebar environment detection, route
  // guards, and DomainGuard still work. Removed from domainOrder so they no
  // longer appear in the Product Drawer. Routes in App.tsx are untouched.
  // ===========================================================================

  'all-markets': {
    id: 'all-markets',
    label: 'All Markets',
    locked: false,
    beta: false,
    defaultPath: '/app/top-secret',
    subNav: [
      { label: 'Overview',    path: '/app/all-markets/overview',          locked: true },
      { label: 'Summary',     path: '/app/all-markets/summary',           locked: true },
      { label: 'Chart',       path: '/app/all-markets/chart',             locked: true },
      { label: 'War Zone',    path: '/app/all-markets/warzone',           locked: false },
      { label: 'Top Secret',  path: '/app/top-secret',                    locked: false, hideForAdmin: true },
      { label: 'Top Secret Admin', path: '/app/top-secret/admin',         adminOnly: true },
      ...(FEATURES.AFFILIATE_TRACKING ? [{ label: 'Affiliate', path: '/app/all-markets/affiliate', affiliateSmartPage: true }] : []),
      { label: 'Admin CRM',   path: '/app/admin',                         adminOnly: true },
      { label: 'Support',     path: '/app/all-markets/admin/support',     adminOnly: true },
    ],
    sidebar: [
      { label: 'Overview',   path: '/app/all-markets/overview',  icon: LayoutDashboard, locked: true },
      { label: 'Heatmap',    path: '/app/all-markets/heatmap',   icon: Map,             locked: true },
      { label: 'Movers',     path: '/app/all-markets/movers',    icon: TrendingUp,      locked: true },
      { label: 'Sentiment',  path: '/app/all-markets/sentiment', icon: Activity,        locked: true },
      { label: 'Calendar',   path: '/app/all-markets/calendar',  icon: Calendar,        locked: true },
      { label: 'News',       path: '/app/all-markets/news',      icon: Newspaper,       locked: true },
      { label: 'Pricing',    path: '/app/all-markets/pricing',   icon: Crown,           locked: false },
      { label: 'Settings',   path: '/app/settings',              icon: SettingsIcon,    locked: true },
    ],
  },

  stocks: {
    id: 'stocks',
    label: 'Stocks',
    locked: false,
    beta: false,
    subNav: [
      { label: 'Overview', path: '/app/stocks/overview' },
      { label: 'News',     path: '/app/stocks/news' },
      // Screener moved to the all-markets (home) level — see constants/markets.ts.
    ],
    sidebar: [
      { label: 'Dashboard',          path: '/app/stocks/overview',     icon: LayoutDashboard },
      // Screener moved to the all-markets (home) level — see constants/markets.ts.
      // Earnings calendar source (Finnhub) not commercially licensed. Sealed pending licensed source.
      { label: 'Earnings',           path: '/app/stocks/earnings',     icon: Calendar,   locked: true },
      { label: 'Fundamentals',       path: '/app/stocks/fundamentals', icon: BarChart3 },
      { label: 'Top Movers',         path: '/app/stocks/movers',       icon: TrendingUp,  locked: true },
      { label: 'News',               path: '/app/stocks/news',         icon: Newspaper },
      { label: 'Sector Analysis',    path: '/app/stocks/sectors',      icon: Target },
      { label: 'Catalysts',          path: '/app/stocks/catalysts',    icon: Zap },
      // Analyst-ratings source (Finnhub/FMP) not licensed for redistribution. Sealed pending licensed source.
      { label: 'Upgrades/Downgrades', path: '/app/stocks/upgrades',   icon: Award,      locked: true },
      { label: 'Valuation',          path: '/app/stocks/valuation',    icon: DollarSign },
      { label: 'Insider & 13F',      path: '/app/stocks/insider',      icon: Users },
      { label: 'Reports & PDFs',     path: '/app/stocks/reports',      icon: FileText },
      { label: 'Watchlists',         path: '/app/stocks/watchlists',   icon: Bell },
    ],
  },

  crypto: {
    id: 'crypto',
    label: 'Crypto',
    locked: false,
    beta: false,
    subNav: [
      { label: 'Overview',    path: '/app/crypto/overview' },
      { label: 'Screener',    path: '/app/crypto/screener' },
      { label: 'Sentiment',   path: '/app/crypto/sentiment' },
      { label: 'DeFi',        path: '/app/crypto/defi-tvl' },
      { label: 'Stablecoins', path: '/app/crypto/stablecoins' },
      { label: 'Heatmap',     path: '/app/crypto/heatmap' },
    ],
    sidebar: [
      { label: 'Dashboard',       path: '/app/crypto/overview',    icon: LayoutDashboard },
      { label: 'Screener',        path: '/app/crypto/screener',    icon: Search },
      { label: 'Derivatives',     path: '/app/crypto/derivatives', icon: Activity },
      { label: 'Sentiment & News', path: '/app/crypto/sentiment',  icon: Newspaper },
      { label: 'DeFi TVL',        path: '/app/crypto/defi-tvl',   icon: Coins },
      { label: 'Stablecoins',     path: '/app/crypto/stablecoins', icon: DollarSign },
      { label: 'Heatmap',         path: '/app/crypto/heatmap',     icon: Map },
      { label: 'Watchlist',       path: '/app/crypto/watchlist',   icon: Bell },
      // Academy removed from sidebar (route /app/crypto/academy still exists)
    ],
  },

  // No free/legal futures data feed (CME licensed; Yahoo gray). Sealed pending licensed source.
  // To re-enable: set FUTURES_ENABLED = true above and restore subNav/sidebar entries below.
  futures: {
    id: 'futures',
    label: 'Futures',
    locked: false,
    beta: false,
    subNav: [],
    sidebar: [],
  },

  forex: {
    id: 'forex',
    label: 'Forex',
    locked: false,
    beta: false,
    subNav: [
      { label: 'Overview', path: '/app/forex/overview' },
      { label: 'News',     path: '/app/forex/news' },
    ],
    sidebar: [
      { label: 'Dashboard',          path: '/app/forex/overview',      icon: LayoutDashboard },
      { label: 'Currency Strength',  path: '/app/forex/strength',      icon: Activity },
      { label: 'Correlation Map',    path: '/app/forex/correlation',   icon: Map },
      { label: 'Economic Calendar',  path: '/app/forex/calendar',      icon: Calendar },
      { label: 'Major/Cross Pairs',  path: '/app/forex/pairs',         icon: Globe },
      { label: 'Interest Rates',     path: '/app/forex/rates',         icon: LineChart },
      { label: 'Macro Reports',      path: '/app/forex/deep-analysis', icon: FileText },
      { label: 'Alerts & Watchlists', path: '/app/forex/alerts',      icon: Bell },
    ],
  },

  commodities: {
    id: 'commodities',
    label: 'Commodities',
    locked: false,
    beta: false,
    subNav: [
      { label: 'Overview', path: '/app/commodities/overview' },
      { label: 'News',     path: '/app/commodities/news' },
    ],
    sidebar: [
      { label: 'Dashboard',  path: '/app/commodities/overview',     icon: LayoutDashboard },
      { label: 'Screener',   path: '/app/commodities/screener',     icon: Search },
      { label: 'Catalysts',  path: '/app/commodities/catalysts',    icon: Zap },
      { label: 'Energy',     path: '/app/commodities/energy',       icon: Flame },
      { label: 'Metals',     path: '/app/commodities/metals',       icon: Coins },
      { label: 'Agriculture', path: '/app/commodities/agriculture', icon: Target },
      { label: 'Seasonality', path: '/app/commodities/seasonality', icon: Calendar },
      { label: 'Reports',    path: '/app/commodities/reports',      icon: FileText },
      { label: 'Calendar',   path: '/app/commodities/calendar',     icon: Calendar },
    ],
  },

  macro: {
    id: 'macro',
    label: 'Macro & News',
    locked: false,
    beta: false,
    subNav: [
      { label: 'Overview',      path: '/app/macro/overview' },
      { label: 'Liquidity',     path: '/app/macro/liquidity' },
      { label: 'Real Yields',   path: '/app/macro/real-yields' },
      { label: 'Credit Spreads', path: '/app/macro/credit-spreads' },
    ],
    sidebar: [
      { label: 'Market Overview',      path: '/app/macro/overview',      icon: LayoutDashboard },
      { label: 'Net Liquidity',        path: '/app/macro/liquidity',     icon: Droplet },
      { label: 'Real Yields & TIPS',   path: '/app/macro/real-yields',   icon: TrendingUp },
      { label: 'Credit Spreads',       path: '/app/macro/credit-spreads', icon: Activity },
      { label: 'Cross-Asset',          path: '/app/macro/cross-asset',   icon: Layers },
      { label: 'Macro Models',         path: '/app/macro/models',        icon: Brain },
      { label: 'Global Heatmap',       path: '/app/macro/global-heatmap', icon: Map },
      { label: 'Global Calendar',      path: '/app/macro/calendar',      icon: Calendar },
      { label: 'Interest Rates',       path: '/app/macro/rates',         icon: LineChart },
      { label: 'Economic Indicators',  path: '/app/macro/indicators',    icon: BarChart3 },
      { label: 'Major Events',         path: '/app/macro/events',        icon: Zap },
      { label: 'Reports & PDFs',       path: '/app/macro/reports',       icon: FileText },
      { label: 'Sentiment',            path: '/app/macro/sentiment',     icon: Activity },
    ],
  },

  // ===========================================================================
  // Sub-domains (not in Drawer; only affect Sidebar environment detection)
  // ===========================================================================

  'journal-backtest': {
    id: 'journal-backtest',
    label: 'Backtest',
    locked: false,
    beta: false,
    subNav: [
      { label: 'Dashboard',   path: '/app/journal/backtest/overview' },
      { label: 'My Trades',   path: '/app/journal/backtest/trades' },
      { label: 'New Backtest', path: '/app/journal/backtest/new' },
      { label: 'Results',     path: '/app/journal/backtest/results' },
    ],
    sidebar: [
      { label: 'Dashboard',        path: '/app/journal/backtest/overview', icon: LayoutDashboard },
      { label: 'Chart',            path: '/app/journal/backtest/chart',    icon: FlaskConical },
      { label: 'My Trades',        path: '/app/journal/backtest/trades',   icon: BarChart3 },
      { label: 'My Backtests',     path: '/app/journal/backtest/results',  icon: FileText },
      { label: 'Strategy Builder', path: '/app/journal/backtest/builder',  icon: Code },
      { label: 'Analytics',        path: '/app/journal/backtest/analytics', icon: BarChart3 },
    ],
  },

  'journal-affiliate': {
    id: 'journal-affiliate',
    label: 'Affiliate Center',
    locked: false,
    beta: false,
    subNav: [
      { label: 'Dashboard',  path: '/app/journal/affiliate/overview' },
      { label: 'My Referrals', path: '/app/journal/affiliate/referrals' },
      { label: 'Earnings',   path: '/app/journal/affiliate/earnings' },
      { label: 'Payouts',    path: '/app/journal/affiliate/payouts' },
    ],
    sidebar: [
      { label: 'Dashboard',          path: '/app/journal/affiliate/overview',      icon: LayoutDashboard },
      { label: 'My Referrals',       path: '/app/journal/affiliate/referrals',     icon: UserPlus },
      { label: 'Commission History', path: '/app/journal/affiliate/earnings',      icon: DollarSign },
      { label: 'Earnings Analytics', path: '/app/journal/affiliate/analytics',     icon: BarChart3 },
      { label: 'Request Payout',     path: '/app/journal/affiliate/request-payout', icon: CreditCard },
      { label: 'Payout History',     path: '/app/journal/affiliate/payouts',       icon: Wallet },
      { label: 'Marketing Tools',    path: '/app/journal/affiliate/marketing',     icon: Link },
      { label: 'Bonuses & Rewards',  path: '/app/journal/affiliate/bonuses',       icon: Gift },
      { label: 'Performance',        path: '/app/journal/affiliate/performance',   icon: TrendingUp },
      { label: 'Settings',           path: '/app/journal/affiliate/settings',      icon: SettingsIcon },
    ],
  },

  // ===========================================================================
  // FUNDING — removed from domainOrder but def kept (routes in App.tsx intact)
  // ===========================================================================
  funding: {
    id: 'funding',
    label: 'Funding',
    locked: true,
    beta: false,
    subNav: [
      { label: 'Overview', path: '/app/funding/overview' },
      { label: 'Brokers',  path: '/app/funding/brokers' },
    ],
    sidebar: [
      { label: 'Overview',      path: '/app/funding/overview',      icon: LayoutDashboard },
      { label: 'Brokers',       path: '/app/funding/brokers',       icon: Building },
      { label: 'Cash Advance',  path: '/app/funding/advance',       icon: DollarSign },
      { label: 'Transactions',  path: '/app/funding/transactions',  icon: FileText },
    ],
  },

  // ===========================================================================
  // ETFs — now a member of the Markets product (fixed sidebar via MarketsSidebar).
  // The 7 per-ticker sections (Overview/Holdings/Performance/Risk/Dividends/
  // Cost/Verdict) are exposed as inline header tabs in ETFLayout, not as
  // sidebar items. The sidebar shows only the fixed market-level items
  // (Overview, and future Screener) via the 'etf' asset in markets.ts.
  // ===========================================================================
  etfs: {
    id: 'etfs',
    label: 'ETFs',
    locked: false,
    beta: false,
    defaultPath: '/app/etfs/overview',
    subNav: [
      { label: 'Overview', path: '/app/etfs/overview' },
    ],
    sidebar: [
      // Sidebar is rendered by MarketsSidebar when selectedAsset === 'etf'.
      // This placeholder keeps activeDomain.sidebar callers from crashing.
      { label: 'Overview', path: '/app/etfs/overview', icon: LayoutDashboard },
    ],
  },

  // ===========================================================================
  // OPTIONS — sealed (Track B). Kept exactly as before.
  // ===========================================================================
  options: {
    id: 'options',
    locked: false,
    label: 'Options',
    beta: false,
    subNav: [],
    sidebar: [],
  },

};

// ===========================================================================
// PRODUCT DRAWER ORDER (Phase 1)
// markets | ai | war-zone | top-secret | journal
// copy-trade is hidden from non-beta users (beta:true on the domain)
// ===========================================================================
export const domainOrder = [
  'markets',
  'ai',
  'copilot',
  'war-zone',
  'top-secret',
  'journal',
  'copy-trade', // hidden for non-beta; admin-only in practice
  // Removed from Drawer (routes/pages/domain defs preserved):
  //   'all-markets', 'stocks', 'crypto', 'futures', 'forex',
  //   'commodities', 'macro', 'funding'
  // Options sealed: 'options'
  // portfolio removed: page now lives under /app/all-markets/portfolio (Markets chrome)
] as const;

// =====================================================
// HELPER FUNCTIONS — unchanged API
// =====================================================

export function isNavItemVisible(item: NavItem, isAdmin: boolean, hasBetaAccess: boolean): boolean {
  if (item.adminOnly && !isAdmin) return false;
  if (item.beta && !hasBetaAccess) return false;
  if (item.hideForAdmin && isAdmin) return false;
  return true;
}

export function isDomainVisible(domain: Domain, hasBetaAccess: boolean): boolean {
  if (domain.beta && !hasBetaAccess) return false;
  return true;
}

export function filterNavItems(items: NavItem[], isAdmin: boolean, hasBetaAccess: boolean): NavItem[] {
  return items.filter(item => isNavItemVisible(item, isAdmin, hasBetaAccess));
}
