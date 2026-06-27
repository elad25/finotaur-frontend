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
  Link, Gift, Swords, Crown, Shield, Copy, Droplet, Grid3x3, Calculator,
  GitCompare,
  ScanLine,
  Crosshair,
  Trophy,
  Monitor,
  Download,
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

// Futures live market data feed is sealed (CME licensed; Yahoo gray).
// The current Futures section is static contract intelligence + local
// calculators only: no quotes, charts, DOM, volume, or OI.
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
  /** Marks this item as compliance price-gated (Polygon redistribution license not held). */
  priceGated?: boolean;
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
    defaultPath: '/app/all-markets/screener',   // Overview is Early-Access-gated; land on the open Screener instead.
    subNav: [
      // The Markets product does not use the SubNav bar for asset switching
      // (the asset selector lives in the Top Bar). Keeping one entry so the
      // SubNav renders the FINO AI button without crashing.
      { label: 'Markets', path: '/app/all-markets/screener' },
    ],
    sidebar: [
      // Placeholder — actual Markets sidebar is rendered by MarketsSidebar.tsx
      { label: 'Overview', path: '/app/all-markets/overview', icon: LayoutDashboard },
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
      { label: 'Backtest',    path: '/app/journal/backtest/overview', locked: true },
      { label: 'The Floor',   path: '/app/floor/feed', beta: true },
      { label: 'Mentor',      path: '/app/mentor/rooms', beta: true },
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
  // MENTORSHIP — beta/admin-only (Early Access)
  // ===========================================================================
  mentorship: {
    id: 'mentorship',
    label: 'The Floor',
    locked: false,
    beta: true, // 🔒 Non-beta users see AdminBetaGate (Early Access screen)
    defaultPath: '/app/floor/feed',
    subNav: [
      { label: 'Feed', path: '/app/floor/feed' },
      { label: 'Leaderboard', path: '/app/floor/leaderboard' },
      { label: 'DM', path: '/app/floor/dm' },
    ],
    sidebar: [
      { label: 'Feed', path: '/app/floor/feed', icon: Newspaper },
      { label: 'Leaderboard', path: '/app/floor/leaderboard', icon: Trophy },
      { label: 'DM', path: '/app/floor/dm', icon: MessageSquare },
    ],
  },

  // ===========================================================================
  // MENTOR — Mentor Mode + Rooms (beta/admin-only); split out of The Floor
  // ===========================================================================
  mentor: {
    id: 'mentor',
    label: 'Mentor',
    locked: false,
    beta: true,
    defaultPath: '/app/mentor/mode',
    subNav: [
      { label: 'Rooms', path: '/app/mentor/rooms' },
      { label: 'Mentor Mode', path: '/app/mentor/mode' },
    ],
    sidebar: [
      { label: 'Rooms', path: '/app/mentor/rooms', icon: GraduationCap },
      { label: 'Mentor Mode', path: '/app/mentor/mode', icon: Users },
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
      { label: 'Agent',        path: '/app/copy-trade/agent',          icon: Monitor },
      { label: 'Install',      path: '/app/copy-trade/install',        icon: Download },
    ],
  },

  // ===========================================================================
  // TRADING ARENA — admin + beta only (Phase 0 scaffold).
  // Full-screen workstation: Chart, Order Flow, locked tabs (Options/Futures/Forex).
  // Hidden from regular users via beta: true (same mechanism as copy-trade).
  // ===========================================================================
  'trading-arena': {
    id: 'trading-arena',
    label: 'Trading Arena',
    locked: false,
    beta: true, // 🔒 hidden from non-beta users (same gate as copy-trade)
    defaultPath: '/app/trading-arena/chart',
    subNav: [
      { label: 'Trading Arena', path: '/app/trading-arena/chart', beta: true },
    ],
    sidebar: [
      { label: 'Chart',       path: '/app/trading-arena/chart',      icon: Crosshair, beta: true },
      { label: 'Order Flow',  path: '/app/trading-arena/order-flow', icon: Activity,  beta: true },
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
      { label: 'Overview',    path: '/app/all-markets/overview',          locked: true,  priceGated: true },
      { label: 'Summary',     path: '/app/all-markets/summary',           locked: true,  priceGated: true },
      { label: 'Chart',       path: '/app/all-markets/chart',             locked: true,  priceGated: true },
      { label: 'War Zone',    path: '/app/all-markets/warzone',           locked: false },
      { label: 'Top Secret',  path: '/app/top-secret',                    locked: false, hideForAdmin: true },
      { label: 'Top Secret Admin', path: '/app/top-secret/admin',         adminOnly: true },
      ...(FEATURES.AFFILIATE_TRACKING ? [{ label: 'Affiliate', path: '/app/all-markets/affiliate', affiliateSmartPage: true }] : []),
      { label: 'Admin CRM',   path: '/app/admin',                         adminOnly: true },
      { label: 'Support',     path: '/app/all-markets/admin/support',     adminOnly: true },
    ],
    sidebar: [
      { label: 'Overview',   path: '/app/all-markets/overview',  icon: LayoutDashboard, locked: true, priceGated: true },
      { label: 'Heatmap',    path: '/app/all-markets/heatmap',   icon: Map,             locked: true, priceGated: true },
      { label: 'Movers',     path: '/app/all-markets/movers',    icon: TrendingUp,      locked: true, priceGated: true },
      { label: 'Sentiment',  path: '/app/all-markets/sentiment', icon: Activity,        locked: true },
      { label: 'Calendar',   path: '/app/all-markets/calendar',  icon: Calendar,        locked: true },
      { label: 'News',       path: '/app/all-markets/news',      icon: Newspaper,       locked: true },
      { label: 'Pricing',    path: '/app/upgrade',               icon: Crown,           locked: false },
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
      { label: 'Dashboard',          path: '/app/stocks/overview',     icon: LayoutDashboard, priceGated: true },
      // Screener moved to the all-markets (home) level — see constants/markets.ts.
      // Market Pulse — market-wide breadth / sentiment / macro built on free derived data (Yahoo + FRED). Not price-gated.
      { label: 'Market Pulse',       path: '/app/stocks/market-pulse', icon: Activity,   locked: false },
      { label: 'Top Movers',         path: '/app/stocks/movers',       icon: TrendingUp,  locked: true, priceGated: true },
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
      { label: 'Block Trades',    path: '/app/crypto/whales/trades', icon: Layers },
      { label: 'Market Scanner',  path: '/app/crypto/scanner',       icon: ScanLine, beta: true },
      { label: 'Heatmap',         path: '/app/crypto/heatmap',     icon: Map },
      { label: 'Watchlist',       path: '/app/crypto/watchlist',   icon: Bell },
      // Academy removed from sidebar (route /app/crypto/academy still exists)
    ],
  },

  // Licensed-data-safe futures workspace. Keep raw exchange data sealed until FUTURES_ENABLED is backed by a licensed feed.
  futures: {
    id: 'futures',
    label: 'Futures',
    locked: true,
    beta: false,
    subNav: [
      { label: 'Overview',     path: '/app/futures/overview' },
      { label: 'Contracts',    path: '/app/futures/contracts' },
      { label: 'Curves',       path: '/app/futures/curves' },
      { label: 'Positioning',  path: '/app/futures/positioning' },
      { label: 'Calculators',  path: '/app/futures/tools' },
    ],
    sidebar: [
      { label: 'Overview', path: '/app/futures/overview', icon: LayoutDashboard },
      { label: 'Contracts', path: '/app/futures/contracts', icon: Layers },
      { label: 'Curves', path: '/app/futures/curves', icon: GitCompare },
      { label: 'Positioning', path: '/app/futures/positioning', icon: BarChart3 },
      { label: 'Calculators', path: '/app/futures/tools', icon: Calculator },
    ],
  },

  forex: {
    id: 'forex',
    label: 'Forex',
    locked: false,
    beta: false,
    subNav: [
      { label: 'Overview', path: '/app/forex/overview' },
      { label: 'Macro Cockpit', path: '/app/forex/currency/USD' },
    ],
    sidebar: [
      { label: 'Dashboard',          path: '/app/forex/overview',         icon: LayoutDashboard },
      { label: 'Macro Cockpit',      path: '/app/forex/currency/USD',     icon: Globe },
      { label: 'Currency Strength',  path: '/app/forex/strength',         icon: Activity },
      { label: 'Heatmap',            path: '/app/forex/heatmap',          icon: Grid3x3 },
      { label: 'Correlation Map',    path: '/app/forex/correlation',      icon: Map },
      { label: 'Major/Cross Pairs',  path: '/app/forex/pairs',            icon: Globe },
      { label: 'Central Bank Watch', path: '/app/forex/cb-watch',         icon: Building },
      { label: 'COT Positioning',    path: '/app/forex/cot',              icon: BarChart3 },
      { label: 'Calculators',         path: '/app/forex/tools',           icon: Calculator },
    ],
  },

  commodities: {
    id: 'commodities',
    label: 'Commodities',
    locked: false,
    beta: false,
    subNav: [
      { label: 'Overview', path: '/app/commodities/overview' },
      { label: 'Markets', path: '/app/commodities/markets' },
      { label: 'Macro Drivers', path: '/app/commodities/macro' },
      { label: 'Seasonality', path: '/app/commodities/seasonality' },
      { label: 'Positioning', path: '/app/commodities/positioning' },
      { label: 'Calendar & News', path: '/app/commodities/calendar' },
      { label: 'My Desk', path: '/app/commodities/watchlist' },
    ],
    sidebar: [
      { label: 'Overview', path: '/app/commodities/overview', icon: LayoutDashboard },
      { label: 'Markets', path: '/app/commodities/markets', icon: BarChart3 },
      { label: 'Macro Drivers', path: '/app/commodities/macro', icon: Activity },
      { label: 'Seasonality', path: '/app/commodities/seasonality', icon: Calendar },
      { label: 'Positioning & Supply', path: '/app/commodities/positioning', icon: Layers },
      { label: 'Calendar & News', path: '/app/commodities/calendar', icon: Newspaper },
      { label: 'My Desk', path: '/app/commodities/watchlist', icon: Bell },
    ],
  },

  macro: {
    id: 'macro',
    label: 'Macro & News',
    locked: false,
    beta: false,
    subNav: [
      { label: 'Pulse',                path: '/app/macro/pulse' },
      { label: 'Rates & Central Banks', path: '/app/macro/rates' },
      { label: 'Inflation & Growth',   path: '/app/macro/indicators' },
      { label: 'Global Markets',       path: '/app/macro/global' },
      { label: 'Risk & Regime',        path: '/app/macro/risk' },
      { label: 'Macro Desk',           path: '/app/macro/desk' },
    ],
    sidebar: [
      { label: 'Pulse',                icon: LayoutDashboard, path: '/app/macro/pulse' },
      { label: 'Rates & Central Banks', icon: LineChart,       path: '/app/macro/rates' },
      { label: 'Inflation & Growth',   icon: BarChart3,       path: '/app/macro/indicators' },
      { label: 'Global Markets',       icon: Map,             path: '/app/macro/global' },
      { label: 'Risk & Regime',        icon: Activity,        path: '/app/macro/risk' },
      { label: 'Macro Desk',           icon: FileText,        path: '/app/macro/desk' },
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
      { label: 'AUTOMATED BACK TEST', path: '/app/backtest/auto', locked: true },
      { label: 'Dashboard',   path: '/app/journal/backtest/overview' },
      { label: 'My Trades',   path: '/app/journal/backtest/trades' },
      { label: 'New Backtest', path: '/app/journal/backtest/new' },
      { label: 'Results',     path: '/app/journal/backtest/results' },
    ],
    sidebar: [
      { label: 'AUTOMATED BACK TEST', path: '/app/backtest/auto',           icon: FlaskConical, locked: true },
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
  // 'mentorship' (The Floor) intentionally NOT in the Drawer — it is reached
  // via the beta-gated "The Floor" tab in the Journal subNav. Domain def,
  // routes, subNav, sidebar, and AdminBetaGate all remain intact.
  'copy-trade',     // hidden for non-beta; admin-only in practice
  'trading-arena',  // hidden for non-beta; full-screen workstation (Phase 0)
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
