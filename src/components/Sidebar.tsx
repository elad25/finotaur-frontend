// src/components/Sidebar.tsx
// =====================================================
// נ”¥ v2.0: BETA ACCESS SYSTEM
// =====================================================
// Admins/VIPs with hasBetaAccess can see and access ALL locked items
// =====================================================

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDomain } from '@/hooks/useDomain';
import { useMentorView } from '@/contexts/MentorViewContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { MarketsSidebar } from '@/components/MarketsSidebar';  // נ”¥ NEW
import { cn } from '@/lib/utils';
import { FEATURES } from '@/config/features';
import {
  LayoutDashboard,
  PlusCircle, 
  BookOpen, 
  Layers, 
  BarChart3, 
  Calendar,
  Building,
  Target,
  Users,
  Copy,
  Monitor,
  Download,
  GraduationCap,
  Settings,
  FlaskConical,
  TrendingUp,
  FileText,
  Calculator,
  Activity,
  Shuffle,
  Brain,
  Play,
  Gift,
  Trophy,
  CreditCard,
  HeadphonesIcon,
  UserX,
  ArrowLeft,
  Shield,
  ShieldCheck,
  UserPlus,
  DollarSign,
  Wallet,
  Link,
  Award,
  Map,
  Newspaper,
  LineChart,
  Zap,
  Globe,
  Lock,
  ChevronLeft,
  ChevronRight,
  Crown,
  Search,
  Bell,
  Coins,
  Flame,
  FileBarChart,
  Link2,
  GitCompare,
  MessageSquare,
} from 'lucide-react';
import {
  prefetchAdminStats,
  prefetchAnalytics,
  prefetchSettingsData,
  prefetchStrategies,
  prefetchTrades,
  prefetchUserProfile
} from '@/lib/queryClient';

interface SidebarProps {
  isOpen?: boolean;
  /**
   * 'persistent'        (default) — starts expanded; click toggles, persisted
   *                                  to localStorage 'finotaur-sidebar-expanded'.
   * 'collapsed-default'           — starts collapsed; click toggles same as
   *                                  persistent, persisted to a separate key
   *                                  ('finotaur-copilot-sidebar-expanded') so
   *                                  it doesn't clobber main-app preference.
   *                                  Used by CopilotStandaloneLayout.
   */
  collapseMode?: 'persistent' | 'collapsed-default';
}

type EnvironmentType =
  | 'journal'
  | 'backtest'
  | 'admin'
  | 'affiliate'
  | 'all-markets'
  | 'macro'
  | 'stocks'
  | 'crypto'
  | 'futures'
  | 'forex'
  | 'commodities'
  | 'options'
  | 'ai'
  | 'ai-copilot'
  | 'copy-trade'
  | 'funding'
  | 'settings'
  | 'connections'
  | 'markets'
  | 'war-zone'
  | 'top-secret'
  | 'trading-arena'
  | 'mentorship'
  | 'mentor'
  | 'automation';

const ENVIRONMENT_MENUS: Record<EnvironmentType, Array<{
  label: string;
  path: string;
  icon: any;
  divider?: boolean;
  locked?: boolean;
  beta?: boolean;  // נ”¥ NEW
  adminOnly?: boolean; // items only accessible to admins/beta viewers
  newTab?: boolean; // open in new browser tab instead of in-place navigation
  /** Marks this item as compliance price-gated (Polygon redistribution license not held). */
  priceGated?: boolean;
  children?: Array<{
    label: string;
    path: string;
    icon: any;
    beta?: boolean;
    adminOnly?: boolean;
  }>;
}>> = {
  // ===============================================
  // נ ALL MARKETS - נ”’ LOCKED
  // ===============================================
  'all-markets': [
    { label: 'Overview', path: '/app/all-markets/overview', icon: LayoutDashboard, locked: true, priceGated: true },
    { label: 'Heatmap', path: '/app/all-markets/heatmap', icon: Map, locked: true, priceGated: true },
    { label: 'Movers', path: '/app/all-markets/movers', icon: TrendingUp, locked: true, priceGated: true },
    { label: 'Sentiment', path: '/app/all-markets/sentiment', icon: Activity, locked: true },
    { label: 'Calendar', path: '/app/all-markets/calendar', icon: Calendar, locked: true },
    { label: 'News', path: '/app/all-markets/news', icon: Newspaper, locked: true },
    { label: 'divider', path: '', icon: null, divider: true },
    { label: 'Pricing', path: '/app/upgrade', icon: Crown, locked: true },
    { label: 'Settings', path: '/app/settings', icon: Settings, locked: true },
  ],

  // ===============================================
  // נ“ˆ STOCKS
  // ===============================================
  'stocks': [
    { label: 'Dashboard', path: '/app/stocks/overview', icon: LayoutDashboard, priceGated: true },
    // Screener moved to the all-markets (home) level — see constants/markets.ts.
    { label: 'Earnings', path: '/app/stocks/earnings', icon: Calendar },
    { label: 'Top Movers', path: '/app/stocks/movers', icon: TrendingUp, priceGated: true },
    { label: 'News', path: '/app/stocks/news', icon: Newspaper },
    { label: 'Sector Analysis', path: '/app/stocks/sectors', icon: Target },
    { label: 'Catalysts', path: '/app/stocks/catalysts', icon: Zap },
    { label: 'Upgrades/Downgrades', path: '/app/stocks/upgrades', icon: Award },
    { label: 'Valuation', path: '/app/stocks/valuation', icon: DollarSign },
    { label: 'Reports & PDFs', path: '/app/stocks/reports', icon: FileText },
    { label: 'Watchlists', path: '/app/stocks/watchlists', icon: Bell },
  ],

  // ===============================================
  // נ×™ CRYPTO
  // ===============================================
  'crypto': [
    { label: 'Dashboard', path: '/app/crypto/overview', icon: LayoutDashboard },
    { label: 'Screener', path: '/app/crypto/screener', icon: Search },
    { label: 'Derivatives', path: '/app/crypto/derivatives', icon: Activity },
    { label: 'Sentiment & News', path: '/app/crypto/sentiment', icon: Newspaper },
    { label: 'Watchlist', path: '/app/crypto/watchlist', icon: Bell },
    { label: 'Academy', path: '/app/crypto/academy', icon: GraduationCap },
  ],

  // ===============================================
  // נ“ FUTURES
  // ===============================================
  'futures': [
    { label: 'Overview', path: '/app/futures/overview', icon: LayoutDashboard },
    { label: 'Contracts', path: '/app/futures/contracts', icon: Layers },
    { label: 'Curves', path: '/app/futures/curves', icon: GitCompare },
    { label: 'Positioning', path: '/app/futures/positioning', icon: BarChart3 },
    { label: 'Calculators', path: '/app/futures/tools', icon: Calculator },
  ],

  // ===============================================
  // נ’± FOREX
  // ===============================================
  'forex': [
    { label: 'Dashboard', path: '/app/forex/overview', icon: LayoutDashboard },
    { label: 'Currency Strength', path: '/app/forex/strength', icon: Activity },
    { label: 'Correlation Map', path: '/app/forex/correlation', icon: Map },
    { label: 'Major/Cross Pairs', path: '/app/forex/pairs', icon: Globe },
    { label: 'Interest Rates', path: '/app/forex/rates', icon: LineChart },
    { label: 'Macro Reports', path: '/app/forex/deep-analysis', icon: FileText },
    { label: 'Alerts & Watchlists', path: '/app/forex/alerts', icon: Bell },
    { label: 'News', path: '/app/forex/news', icon: Newspaper },
  ],

  // ===============================================
  // נ›¢ן¸ COMMODITIES
  // ===============================================
  'commodities': [
    { label: 'Dashboard', path: '/app/commodities/overview', icon: LayoutDashboard },
    { label: 'Screener', path: '/app/commodities/screener', icon: Search },
    { label: 'Catalysts', path: '/app/commodities/catalysts', icon: Zap },
    { label: 'Energy', path: '/app/commodities/energy', icon: Flame },
    { label: 'Metals', path: '/app/commodities/metals', icon: Coins },
    { label: 'Agriculture', path: '/app/commodities/agriculture', icon: Target },
    { label: 'Seasonality', path: '/app/commodities/seasonality', icon: Calendar },
    { label: 'Reports', path: '/app/commodities/reports', icon: FileText },
    { label: 'Calendar', path: '/app/commodities/calendar', icon: Calendar },
    { label: 'News', path: '/app/commodities/news', icon: Newspaper },
  ],

  // ===============================================
  // נ“‰ OPTIONS
  // ===============================================
  'options': [
    { label: 'Options Chain', path: '/app/options/chain', icon: LayoutDashboard },
    { label: 'Options Flow', path: '/app/options/flow', icon: Activity },
    { label: 'Volatility', path: '/app/options/volatility', icon: TrendingUp },
    { label: 'Strategy Builder', path: '/app/options/strategy', icon: Target },
    { label: 'Simulator', path: '/app/options/simulator', icon: Play },
    { label: 'divider', path: '', icon: null, divider: true },
    { label: 'Greeks Monitor', path: '/app/options/greeks-monitor', icon: Activity },
    { label: 'IV Rank / Percentile', path: '/app/options/iv-rank', icon: BarChart3 },
    { label: 'OI / Volume', path: '/app/options/oi-volume', icon: BarChart3 },
    { label: 'Unusual Activity', path: '/app/options/unusual-activity', icon: Flame },
    { label: 'Earnings IV Crush', path: '/app/options/earnings-iv-crush', icon: FileText },
    { label: 'Shortcuts', path: '/app/options/shortcuts', icon: Target },
  ],

  // ===============================================
  // נ MACRO & NEWS
  // ===============================================
  'macro': [
    { label: 'Pulse', path: '/app/macro/pulse', icon: LayoutDashboard },
    { label: 'Rates & Central Banks', path: '/app/macro/rates', icon: LineChart },
    { label: 'Inflation & Growth', path: '/app/macro/indicators', icon: BarChart3 },
    { label: 'Global Markets', path: '/app/macro/global', icon: Map },
    { label: 'Risk & Regime', path: '/app/macro/risk', icon: Activity },
    { label: 'Macro Desk', path: '/app/macro/desk', icon: FileText },
  ],


  // Markets — handled by MarketsSidebar; empty array is a fallback only
  'markets': [],

  // War Zone — light sidebar (Phase 1 nav redesign)
  'war-zone': [
    { label: 'Latest', path: '/app/all-markets/warzone', icon: Flame },
  ],

  // Top Secret — light sidebar (Phase 1 nav redesign)
  'top-secret': [
    { label: 'Latest Reports', path: '/app/top-secret',       icon: FileText },
    { label: 'Admin',          path: '/app/top-secret/admin', icon: Shield, beta: true, adminOnly: true },
  ],

  // Trading Arena — full-screen workstation (admin + beta only).
  // The sidebar is effectively hidden (HIDE_CHROME_ROUTES), but an entry here
  // prevents getCurrentEnvironment() from falling through to the 'journal' default.
  'trading-arena': [],

  'ai': [
    { label: 'Stock Analyzer', path: '/app/ai/stock-analyzer', icon: TrendingUp },
    { label: 'Sector Analyzer', path: '/app/ai/sector-analyzer', icon: Target },
    { label: 'Macro Analyzer', path: '/app/ai/macro-analyzer', icon: Globe },
    { label: 'Options Intelligence', path: '/app/ai/options-intelligence', icon: Layers },
    { label: 'Flow Scanner', path: '/app/ai/flow-scanner', icon: Search },
    { label: 'Intelligence Desk', path: '/app/ai/top-5', icon: Award },
    { label: 'Upcoming Events', path: '/app/ai/upcoming-events', icon: Calendar },
  ],

  // beta:true is preserved to keep COPILOT gated to hasBetaAccess users
  // (see `if (isBetaItem && !hasBetaAccess) return null`). The visible BETA
  // badge is suppressed for all /copilot items via showBetaBadge below.
  'ai-copilot': [
    { label: 'FINOTAUR Copilot', path: '/copilot', icon: LayoutDashboard, beta: true },
    { label: 'Top Opportunities', path: '/copilot/top-opportunities', icon: Zap, beta: true },
    { label: 'Macro', path: '/copilot/macro', icon: Globe, beta: true },
    { label: 'Quant Flow', path: '/copilot/quant-flow', icon: Activity, beta: true },
    { label: 'Holdings', path: '/copilot/holdings', icon: Layers, beta: true },
    { label: 'Risks', path: '/copilot/risks', icon: Shield, beta: true },
    { label: 'AI Analyst', path: '/copilot/ai-analyst', icon: Brain, beta: true },
  ],

  connections: [
    { label: 'My connections', path: '/app/connections', icon: Link2, beta: true },
    { label: 'Add connection', path: '/app/connections/new', icon: PlusCircle, beta: true },
  ],

  journal: [
    { label: 'Dashboard', path: '/app/journal/overview', icon: LayoutDashboard },
    { label: 'Add Trade', path: '/app/journal/new', icon: PlusCircle },
    { label: 'Trades Journal', path: '/app/journal/my-trades', icon: BookOpen },
    { label: 'My Strategies', path: '/app/journal/strategies', icon: Layers },
    { label: 'Calendar', path: '/app/journal/calendar', icon: Calendar },
    { label: 'Shadow', path: '/app/journal/trade-compare', icon: GitCompare },
    { label: 'Revenge Radar', path: '/app/journal/revenge-radar', icon: Flame },
    { label: 'Reports & Stats', path: '/app/journal/reports', icon: FileBarChart },
    { label: 'Notebook', path: '/app/journal/notes', icon: BookOpen },
    { label: 'Prop Firms', path: '/app/journal/prop-firms', icon: Building },
    // Academy removed from sidebar (route /app/journal/academy still exists in App.tsx)
    { label: 'Settings', path: '/app/journal/settings', icon: Settings },
  ],

  // Backtest sidebar — Sprint E (2026-05-28): trimmed to the 6 practical tabs
  // the trader actually needs. Removed Historical Data / AI Insights / Monte
  // Carlo / Walk Forward / Optimization / Market Replay stubs; AI insight
  // surface lives inline on the Dashboard, and Market Replay is reachable via
  // the Chart page's Immersive Mode button.
  backtest: [
    { label: 'Dashboard', path: '/app/journal/backtest/overview', icon: FlaskConical },
    { label: 'Chart', path: '/app/journal/backtest/chart', icon: PlusCircle },
    { label: 'My Trades', path: '/app/journal/backtest/trades', icon: BarChart3 },
    { label: 'My Backtests', path: '/app/journal/backtest/results', icon: FileText },
    { label: 'Strategy Builder', path: '/app/journal/backtest/builder', icon: Layers },
    { label: 'Analytics', path: '/app/journal/backtest/analytics', icon: TrendingUp },
    { label: 'Automated Backtest', path: '/app/journal/backtest/auto', icon: FlaskConical, locked: true },
  ],

  // Trade Copier is GA (open to all users, 2026-07-02).
  // Prop Risk stays beta-only — hidden entirely from non-beta users.
  'copy-trade': [
    { label: 'Connections', path: '/app/copy-trade/overview', icon: Link2 },
    { label: 'Trade Copier', path: '/app/copy-trade/trade-copier', icon: Copy },
    { label: 'Prop Risk', path: '/app/copy-trade/prop-risk', icon: ShieldCheck, beta: true },
    { label: 'Manage Risk', path: '/app/copy-trade/manage-risk', icon: Shield },
    { label: 'FINOTAUR Agent', path: '/app/copy-trade/install', icon: Download },
  ],

  'funding': [
    { label: 'Overview', path: '/app/funding/overview', icon: LayoutDashboard },
    { label: 'Brokers', path: '/app/funding/brokers', icon: Building },
    { label: 'Cash Advance', path: '/app/funding/advance', icon: DollarSign },
    { label: 'Transactions', path: '/app/funding/transactions', icon: FileText },
  ],

  'mentorship': [
    { label: 'Feed', path: '/app/floor/feed', icon: Newspaper, beta: true },
    { label: 'Leaderboard', path: '/app/floor/leaderboard', icon: Trophy, beta: true },
    { label: 'DM', path: '/app/floor/dm', icon: MessageSquare, beta: true },
  ],

  'mentor': [
    { label: 'Rooms', path: '/app/mentor/rooms', icon: GraduationCap, beta: true },
    { label: 'Mentor Mode', path: '/app/mentor/mode', icon: Users, beta: true },
  ],

  admin: [
    // Admin nav migrated from the retired /app/journal/admin/* prefix to the
    // unified Admin CRM at /app/admin/* (AdminCRMShell). Each target verified
    // against src/pages/app/admin/AdminCRMShell.tsx routes.
    { label: 'Dashboard', path: '/app/admin/overview', icon: LayoutDashboard },
    { label: 'Users', path: '/app/admin/users', icon: Users },
    { label: 'Analytics', path: '/app/admin/analytics', icon: BarChart3 },
    { label: 'Subscribers', path: '/app/admin/billing', icon: CreditCard },
    { label: 'Support', path: '/app/admin/support', icon: HeadphonesIcon },
    { label: 'Cancellations', path: '/app/admin/billing/cancellations', icon: UserX },
    ...(FEATURES.AFFILIATE_TRACKING ? [{ label: 'Affiliate', path: '/app/admin/affiliates', icon: Gift }] : []),
    { label: 'Top Traders', path: '/app/admin/analytics/top-traders', icon: Trophy },
    { label: 'divider', path: '', icon: null, divider: true },
    { label: 'Back to Journal', path: '/app/journal/overview', icon: ArrowLeft },
  ],

  affiliate: FEATURES.AFFILIATE_TRACKING ? [
    { label: 'Dashboard', path: '/app/journal/affiliate/overview', icon: LayoutDashboard },
    { label: 'My Referrals', path: '/app/journal/affiliate/referrals', icon: UserPlus },
    { label: 'Earnings', path: '/app/journal/affiliate/earnings', icon: DollarSign },
    { label: 'Analytics', path: '/app/journal/affiliate/analytics', icon: BarChart3 },
    { label: 'Payouts', path: '/app/journal/affiliate/payouts', icon: Wallet },
    { label: 'Marketing Tools', path: '/app/journal/affiliate/marketing', icon: Link },
    { label: 'Bonuses', path: '/app/journal/affiliate/bonuses', icon: Gift },
    { label: 'Performance', path: '/app/journal/affiliate/performance', icon: TrendingUp },
    { label: 'Settings', path: '/app/journal/affiliate/settings', icon: Settings },
    { label: 'divider', path: '', icon: null, divider: true },
    { label: 'Back to Journal', path: '/app/journal/overview', icon: ArrowLeft },
  ] : [],

  automation: [
    { label: 'Risk Rules', path: '/app/automation/risk',   icon: ShieldCheck, beta: true },
    { label: 'Copier',     path: '/app/automation/copier', icon: Copy,        beta: true },
    { label: 'Agent',      path: '/app/automation/agent',  icon: Shield,      beta: true },
  ],

  settings: [
    { label: 'General', path: '/app/settings', icon: Settings },
    { label: 'Billing', path: '/app/settings/billing', icon: CreditCard },
    { label: 'Usage', path: '/app/settings/usage', icon: Activity },
  ],

};

// Short "what's in this tab" blurbs shown in the collapsed-rail hover tooltip,
// keyed by route path. Items with no entry gracefully fall back to label-only.
const NAV_DESCRIPTIONS: Record<string, string> = {
  // All Markets
  '/app/all-markets/overview': 'Cross-asset market snapshot in one view',
  '/app/all-markets/heatmap': 'Visual heatmap of market performance',
  '/app/all-markets/movers': "Today's biggest gainers and losers",
  '/app/all-markets/sentiment': 'Overall market sentiment gauge',
  '/app/all-markets/calendar': 'Upcoming economic and earnings events',
  '/app/all-markets/news': 'Latest cross-market headlines',
  '/app/upgrade': 'Plans, pricing and upgrades',
  '/app/settings': 'Account and app settings',
  // Stocks
  '/app/stocks/overview': 'Stock market dashboard',
  '/app/stocks/earnings': 'Earnings dates and results',
  '/app/stocks/movers': 'Top gaining and losing stocks',
  '/app/stocks/news': 'Latest stock news',
  '/app/stocks/sectors': 'Sector performance and rotation',
  '/app/stocks/catalysts': 'Upcoming stock catalysts',
  '/app/stocks/upgrades': 'Analyst upgrades and downgrades',
  '/app/stocks/valuation': 'Valuation metrics and screens',
  '/app/stocks/reports': 'Downloadable research reports and PDFs',
  '/app/stocks/watchlists': 'Your saved stock watchlists',
  // Crypto
  '/app/crypto/overview': 'Crypto market dashboard',
  '/app/crypto/screener': 'Filter and find crypto assets',
  '/app/crypto/derivatives': 'Funding, open interest and derivatives',
  '/app/crypto/sentiment': 'Crypto sentiment and news',
  '/app/crypto/watchlist': 'Your saved crypto watchlist',
  '/app/crypto/academy': 'Learn crypto trading',
  // Futures
  '/app/futures/overview': 'Futures market dashboard',
  '/app/futures/contracts': 'Browse futures contracts',
  '/app/futures/curves': 'Forward curves and spreads',
  '/app/futures/positioning': 'COT and trader positioning',
  '/app/futures/tools': 'Futures calculators and tools',
  // Forex
  '/app/forex/overview': 'Forex market dashboard',
  '/app/forex/strength': 'Live currency strength meter',
  '/app/forex/correlation': 'Currency correlation map',
  '/app/forex/pairs': 'Major and cross pairs',
  '/app/forex/rates': 'Central bank interest rates',
  '/app/forex/deep-analysis': 'In-depth macro reports',
  '/app/forex/alerts': 'Price alerts and watchlists',
  '/app/forex/news': 'Latest forex news',
  // Commodities
  '/app/commodities/overview': 'Commodities dashboard',
  '/app/commodities/screener': 'Filter commodities',
  '/app/commodities/catalysts': 'Upcoming commodity catalysts',
  '/app/commodities/energy': 'Oil, gas and energy markets',
  '/app/commodities/metals': 'Gold, silver and metals',
  '/app/commodities/agriculture': 'Grains and agricultural markets',
  '/app/commodities/seasonality': 'Seasonal price patterns',
  '/app/commodities/reports': 'Commodity research reports',
  '/app/commodities/calendar': 'Commodity events calendar',
  '/app/commodities/news': 'Latest commodity news',
  // Options
  '/app/options/chain': 'Live options chain',
  '/app/options/flow': 'Real-time options order flow',
  '/app/options/volatility': 'Implied and historical volatility',
  '/app/options/strategy': 'Build options strategies',
  '/app/options/simulator': 'Simulate options trades',
  '/app/options/greeks-monitor': 'Track your position Greeks',
  '/app/options/iv-rank': 'IV rank and percentile',
  '/app/options/oi-volume': 'Open interest and volume',
  '/app/options/unusual-activity': 'Unusual options activity',
  '/app/options/earnings-iv-crush': 'Earnings IV-crush plays',
  '/app/options/shortcuts': 'Quick options shortcuts',
  // Macro
  '/app/macro/pulse': 'Macro market pulse',
  '/app/macro/rates': 'Rates and central banks',
  '/app/macro/indicators': 'Inflation and growth data',
  '/app/macro/global': 'Global markets overview',
  '/app/macro/risk': 'Risk regime indicators',
  '/app/macro/desk': 'Macro research desk',
  // War Zone / Top Secret
  '/app/all-markets/warzone': 'Latest Top Secret alerts',
  '/app/top-secret': 'Latest TOP SECRET reports',
  '/app/top-secret/admin': 'TOP SECRET admin tools',
  // AI Arena
  '/app/ai/stock-analyzer': 'AI-powered stock analysis',
  '/app/ai/sector-analyzer': 'AI sector analysis',
  '/app/ai/macro-analyzer': 'AI macro analysis',
  '/app/ai/options-intelligence': 'AI options intelligence',
  '/app/ai/flow-scanner': 'AI options flow scanner',
  '/app/ai/top-5': 'Daily intelligence-desk picks',
  '/app/ai/upcoming-events': 'Upcoming market events',
  // Copilot
  '/copilot': 'Your AI portfolio copilot',
  '/copilot/top-opportunities': 'Top portfolio opportunities',
  '/copilot/macro': 'Macro view for your portfolio',
  '/copilot/quant-flow': 'Quant flow signals',
  '/copilot/holdings': 'Your holdings breakdown',
  '/copilot/risks': 'Portfolio risk analysis',
  '/copilot/ai-analyst': 'Chat with your AI analyst',
  // Connections
  '/app/connections': 'Your broker connections',
  '/app/connections/new': 'Add a new broker connection',
  // Journal
  '/app/journal/overview': 'Your trading performance at a glance',
  '/app/journal/new': 'Log a new trade manually',
  '/app/journal/my-trades': 'All your trades, tagged and filtered',
  '/app/journal/strategies': 'Define and track your strategies',
  '/app/journal/calendar': 'Daily P&L calendar view',
  '/app/journal/trade-compare': 'What-if shadow analysis of your trades',
  '/app/journal/revenge-radar': 'What revenge trading really costs you',
  '/app/journal/reports': 'Performance reports and statistics',
  '/app/journal/notes': 'Your trading notebook',
  '/app/journal/prop-firms': 'Track your prop-firm accounts',
  '/app/journal/settings': 'Journal preferences',
  // Backtest
  '/app/journal/backtest/overview': 'Backtest performance dashboard',
  '/app/journal/backtest/chart': 'Backtest on live charts',
  '/app/journal/backtest/trades': 'Your backtest trades',
  '/app/journal/backtest/results': 'Your saved backtest runs',
  '/app/journal/backtest/builder': 'Build backtest strategies',
  '/app/journal/backtest/analytics': 'Backtest analytics',
  '/app/journal/backtest/auto': 'Automated pattern backtester',
  // Copy Trade
  '/app/copy-trade/overview': 'Your copy-trade connections',
  '/app/copy-trade/trade-copier': 'Mirror trades across accounts',
  '/app/copy-trade/prop-risk': 'Live prop-firm drawdown & targets',
  '/app/copy-trade/manage-risk': 'Risk controls for copying',
  '/app/copy-trade/install': 'Install the FINOTAUR agent',
  // Funding
  '/app/funding/overview': 'Funding overview',
  '/app/funding/brokers': 'Your funded broker accounts',
  '/app/funding/advance': 'Request a cash advance',
  '/app/funding/transactions': 'Funding transactions',
  // The Floor
  '/app/floor/feed': 'Community trade feed',
  '/app/floor/leaderboard': 'Community leaderboard',
  '/app/floor/dm': 'Direct messages',
  // Mentor
  '/app/mentor/rooms': 'Your mentor rooms',
  '/app/mentor/mode': 'Switch to mentor mode',
  // Admin
  '/app/admin/overview': 'Admin dashboard',
  '/app/admin/users': 'Manage users',
  '/app/admin/analytics': 'Platform analytics',
  '/app/admin/billing': 'Subscribers and billing',
  '/app/admin/support': 'Support tickets',
  '/app/admin/billing/cancellations': 'Cancellation flow',
  '/app/admin/affiliates': 'Affiliate management',
  '/app/admin/analytics/top-traders': 'Top traders',
  // Affiliate
  '/app/journal/affiliate/overview': 'Affiliate dashboard',
  '/app/journal/affiliate/referrals': 'Your referrals',
  '/app/journal/affiliate/earnings': 'Affiliate earnings',
  '/app/journal/affiliate/analytics': 'Affiliate analytics',
  '/app/journal/affiliate/payouts': 'Payout history',
  '/app/journal/affiliate/marketing': 'Marketing tools and links',
  '/app/journal/affiliate/bonuses': 'Bonus rewards',
  '/app/journal/affiliate/performance': 'Affiliate performance',
  '/app/journal/affiliate/settings': 'Affiliate settings',
  // Automation
  '/app/automation/risk': 'Automated risk rules',
  '/app/automation/copier': 'Automated trade copier',
  '/app/automation/agent': 'Automation agent',
  // Settings
  '/app/settings/billing': 'Billing and subscription',
  '/app/settings/usage': 'Usage and limits',
};


const sidebarItemBaseClass =
  'relative group flex w-full min-h-[46px] items-center rounded-lg border-l-2 border-transparent py-2.5 text-[13px] font-medium leading-snug transition-all duration-200';
const sidebarItemExpandedClass = 'gap-3 px-3';
const sidebarItemCollapsedClass = 'justify-center px-2';
const sidebarIconClass = 'h-5 w-5 flex-shrink-0';
// whitespace-nowrap + overflow-hidden = text clips cleanly during the 300ms
// width transition instead of wrapping one letter per line (the "vertical
// letters" artifact reported on /copilot sidebar toggle).
const sidebarLabelClass = 'flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis leading-snug';
const sidebarBrandLabelClass = 'flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis leading-snug';
const sidebarActiveClass =
  'border-gold-bright bg-gold-primary/20 text-gold-bright shadow-[0_0_22px_rgba(201,166,70,0.22)]';
const sidebarInactiveClass = 'text-ink-secondary hover:bg-gold-primary/10 hover:text-gold-bright';

export const Sidebar = ({ isOpen, collapseMode = 'persistent' }: SidebarProps) => {
  // Two storage profiles so /copilot's preference doesn't override the main app.
  const storageKey = collapseMode === 'collapsed-default'
    ? 'finotaur-copilot-sidebar-expanded'
    : 'finotaur-sidebar-expanded';
  // Default to the narrow icon-rail on first visit for every surface
  // (space-efficient). Users who explicitly expand via the toggle keep their
  // choice — that preference is honored below via `saved !== 'false'`.
  const defaultExpanded = false;
  const navigate = useNavigate();
  const location = useLocation();
  const { isActive } = useDomain();
  const { isMentorView } = useMentorView();
  const { isAdmin, hasBetaAccess } = useAdminAuth();  // נ”¥ NEW: Beta access check

  const isMobile = useIsMobile();

  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved === null) return defaultExpanded; // first visit per surface
    return saved !== 'false';
  });
  // Mobile-only overlay open/closed state. Never persisted — every mobile
  // visit starts closed (off-screen rail), independent of the desktop
  // isExpanded preference.
  const [mobileOpen, setMobileOpen] = useState(false);
  // Single source of truth for render-time branching (widths, labels,
  // chevron direction, tooltips). On mobile it tracks mobileOpen; on
  // desktop it tracks the persisted isExpanded preference.
  const effectiveExpanded = isMobile ? mobileOpen : isExpanded;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  // Collapsed-rail hover tooltip. Rendered via a body portal with position:fixed
  // so it escapes the scrolling <nav> (overflow-y-auto), which would otherwise
  // clip an absolutely-positioned pill that sticks out to the right of the rail.
  const [hoverTip, setHoverTip] = useState<{ label: string; desc?: string; beta: boolean; top: number; left: number } | null>(null);

  // CSS var --finotaur-sidebar-width is read by ProtectedAppLayout's <main>
  // ONLY at md+ (`md:ml-[var(--finotaur-sidebar-width)]`), so it must keep
  // following the DESKTOP isExpanded state, not effectiveExpanded — the
  // mobile overlay must never push page content via this var.
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--finotaur-sidebar-width',
      isExpanded ? '12rem' : '60px'
    );

    return () => {
      document.documentElement.style.removeProperty('--finotaur-sidebar-width');
    };
  }, [isExpanded]);

  const handleToggle = () => {
    if (isMobile) {
      // Mobile: toggle the overlay only. Never persisted to localStorage —
      // the desktop preference (storageKey) must stay untouched.
      setMobileOpen(prev => !prev);
      return;
    }
    setIsExpanded(prev => {
      const newValue = !prev;
      localStorage.setItem(storageKey, String(newValue));
      return newValue;
    });
  };

  useEffect(() => {
    // The Floor pages keep the sidebar collapsed (closed) per Elad's request.
    if (location.pathname.startsWith('/app/floor')) {
      // Force-collapse the rail on The Floor. View-only — do NOT persist, so the
      // user's saved preference is restored when they leave The Floor.
      setIsExpanded(false);
    } else {
      // Left The Floor: restore the user's persisted preference.
      const saved = localStorage.getItem(storageKey);
      setIsExpanded(saved === null ? defaultExpanded : saved !== 'false');
    }
  }, [location.pathname, storageKey]);

  // ===============================================
  // נ” DETECT CURRENT ENVIRONMENT
  // ===============================================
  const getCurrentEnvironment = (): EnvironmentType => {
    const path = location.pathname;
    
    // Settings first (specific path)
    if (path.startsWith('/app/settings')) return 'settings';

    // Automation (specific path)
    if (path.startsWith('/app/automation')) return 'automation';
    
    // Admin & Affiliate first (more specific paths)
    if (path.startsWith('/app/journal/admin')) return 'admin';
    if (path.startsWith('/app/journal/affiliate')) return 'affiliate';
    if (path.startsWith('/app/journal/backtest')) return 'backtest';
    
    // Trading Arena (full-screen — sidebar hidden, but environment must resolve)
    if (path.startsWith('/app/trading-arena')) return 'trading-arena';

    // Phase 1 products — must come before generic all-markets check
    if (path.startsWith('/app/all-markets/warzone') || path.startsWith('/app/warzone')) return 'war-zone';
    if (path.startsWith('/app/top-secret')) return 'top-secret';
    // Markets product: any per-asset URL resolves to Markets environment.
    // /app/etfs is now a Markets member (same fixed sidebar as Stocks/Crypto/etc).
    if (
      path.startsWith('/app/stocks') ||
      path.startsWith('/app/options') ||
      path.startsWith('/app/crypto') ||
      path.startsWith('/app/futures') ||
      path.startsWith('/app/forex') ||
      path.startsWith('/app/commodities') ||
      path.startsWith('/app/macro') ||
      path.startsWith('/app/etfs') ||
      path.startsWith('/app/etf') ||
      path.startsWith('/app/all-markets')
    ) return 'markets';
    if (path.startsWith('/app/ai/copilot') || path.startsWith('/copilot')) return 'ai-copilot';
    if (path.startsWith('/app/ai')) return 'ai';
    if (path.startsWith('/app/copy-trade')) return 'copy-trade';
    if (path.startsWith('/app/funding')) return 'funding';
    if (path.startsWith('/app/connections')) return 'connections';
    if (path.startsWith('/app/mentor')) return 'mentor';
    if (path.startsWith('/app/floor')) return 'mentorship';
    if (path.startsWith('/app/journal')) return 'journal';

    // Default
    return 'journal';
  };

  const currentEnvironment = getCurrentEnvironment();
  // In Mentor View the journal is read-only, so hide mutation-oriented items
  // (the student's data is browsed, not edited, by the mentor).
  const MENTOR_HIDDEN_ITEMS = ['Add Trade', 'Settings'];
  const sidebarItems = isMentorView
    ? ENVIRONMENT_MENUS[currentEnvironment].filter((item) => !MENTOR_HIDDEN_ITEMS.includes(item.label))
    : ENVIRONMENT_MENUS[currentEnvironment];
  // True when the user is already inside the /copilot/* standalone shell
  const inStandaloneCopilot = location.pathname.startsWith('/copilot');
  // top-28 = 7rem (TopNav+SubNav). When an admin/mentor banner is shown,
  // ProtectedAppLayout sets --app-banner-offset (52px each) so the fixed
  // sidebar shifts down and shrinks to stay full-height and aligned.
  const sidebarTopClass =
    'top-[calc(7rem+var(--app-banner-offset,0px))] h-[calc(100vh-7rem-var(--app-banner-offset,0px))]';

  // ===============================================
  // נ¯ SHOW SIDEBAR FOR ALL APP ROUTES
  // ===============================================
  const shouldShowSidebar = location.pathname.startsWith('/app/') || location.pathname.startsWith('/copilot');
  
  // ===============================================
  // נ”¥ HIDE SIDEBAR FOR SPECIFIC PAGES
  // ===============================================
  // Phase 1: War Zone and Top Secret now have their own sidebars — no longer hidden.
  const hideSidebarPaths: string[] = [];
  
  const isHiddenPath = hideSidebarPaths.some(p => location.pathname.startsWith(p));
  
  if (!shouldShowSidebar || isHiddenPath) {
    return null;
  }

  // נ”¥ UPDATED: Beta access allows navigation to locked items
  const handleNavigation = (path: string, isLocked?: boolean) => {
    if (isLocked && !hasBetaAccess) return;
    navigate(path);
  };

  const getPrefetchFunction = (path: string): (() => Promise<void>) | undefined => {
    const prefetchMap: Record<string, () => Promise<void>> = {
      // Journal routes
      '/app/journal/overview':             prefetchAnalytics,
      '/app/journal/my-trades':            prefetchTrades,
      '/app/journal/strategies':           prefetchStrategies,
      '/app/journal/calendar':             prefetchTrades,
      '/app/journal/reports':              prefetchTrades,
      '/app/journal/settings':             prefetchSettingsData,
      '/app/journal/performance':          prefetchUserProfile,
      // Backtest sub-routes
      '/app/journal/backtest/trades':      prefetchTrades,
      '/app/journal/backtest/analytics':   prefetchAnalytics,
      // Affiliate sub-routes (profile-based, no userId needed)
      '/app/journal/affiliate/analytics':  prefetchAnalytics,
      '/app/journal/affiliate/performance': prefetchUserProfile,
      // Settings routes
      '/app/settings':                     prefetchSettingsData,
      '/app/settings/billing':             prefetchUserProfile,
      '/app/settings/usage':               prefetchUserProfile,
      // Admin routes
      '/app/admin/overview':               prefetchAdminStats,
      '/app/admin/analytics':              prefetchAdminStats,
      '/app/admin/users':                  prefetchAdminStats,
    };

    return prefetchMap[path];
  };

  const handlePrefetch = async (path: string) => {
    const prefetchFn = getPrefetchFunction(path);
    if (prefetchFn) {
      try {
        await prefetchFn();
      } catch (error) {
        console.debug(`Prefetch failed for ${path}`, error);
      }
    }
  };

  const isItemActive = (itemPath: string): boolean => {
    if (location.pathname === itemPath) {
      return true;
    }

    if (itemPath === '/app/ai/copilot' || itemPath === '/copilot') {
      return false;
    }
    
    // Special cases for dashboard pages
    const dashboardPaths = [
      '/app/journal/admin',
      '/app/journal/affiliate/overview',
      '/app/all-markets/overview',
      '/app/macro/overview',
      '/app/stocks/overview',
      '/app/crypto/overview',
      '/app/futures/overview',
      '/app/forex/overview',
      '/app/commodities/overview',
      '/app/ai/overview',
      '/app/copy-trade/overview',
      '/app/funding/overview',
      '/app/settings',
    ];
    
    if (dashboardPaths.includes(itemPath) && location.pathname === itemPath) {
      return true;
    }
    
    // Check if current path starts with item path (for nested routes)
    if (!dashboardPaths.includes(itemPath) && 
        location.pathname.startsWith(itemPath) && 
        itemPath.length > 10) {
      return true;
    }
    
    return isActive(itemPath);
  };

  return (
    <>
      {/* Mobile-only backdrop: closes the overlay menu on tap. Never renders at md+. */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 transition-opacity duration-300 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
      className={cn(
        'fixed left-0 z-30 border-r border-border bg-base-800 transition-all duration-300 ease-in-out md:translate-x-0',
        sidebarTopClass,
        isMobile && !mobileOpen ? '-translate-x-full' : 'translate-x-0',
        effectiveExpanded ? 'w-48' : 'w-[60px]'
      )}
    >
      {/* נ”¥ Gold Toggle Tab */}
      <div
        onClick={handleToggle}
        className="absolute top-1/2 -translate-y-1/2 -right-[16px] z-50 cursor-pointer group"
      >
        <div 
          className={cn(
            "relative flex items-center justify-center",
            "w-[16px] h-24",
            "bg-gradient-to-b from-[#1A1A1A] via-[#C9A646]/10 to-[#1A1A1A]",
            "border border-l-0 border-[#C9A646]/25",
            "rounded-r-lg",
            "transition-all duration-300",
            "shadow-[0_0_8px_rgba(201,166,70,0.08)]",
            "hover:via-[#C9A646]/20",
            "hover:border-[#C9A646]/40",
            "hover:shadow-[0_0_12px_rgba(201,166,70,0.15)]"
          )}
        >
          {effectiveExpanded ? (
            <ChevronLeft className="h-3.5 w-3.5 text-[#C9A646]/50 group-hover:text-[#C9A646] transition-colors duration-300" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[#C9A646]/50 group-hover:text-[#C9A646] transition-colors duration-300" />
          )}
        </div>
      </div>

      <nav className="flex h-full flex-col gap-1 overflow-y-auto p-2">
        {/* Phase 1: Markets product uses its own asset-aware sidebar */}
        {currentEnvironment === 'markets' ? (
          <MarketsSidebar isExpanded={effectiveExpanded} />
        ) : sidebarItems.map((item, index) => {
          if (item.divider) {
            return <div key={`divider-${index}`} className="my-2 border-t border-gray-700" />;
          }

          const Icon = item.icon;
          const active = isItemActive(item.path);
          const isBackButton = item.label === 'Back to Journal';
          const isBetaItem = item.beta === true;
          const isAdminOnlyItem = item.adminOnly === true;
          const isPriceGatedItem = item.priceGated === true;
          const isCopilotItem = item.path === '/copilot';
          // Suppress the visible BETA badge for ALL /copilot items (graduated
          // out of beta visually) while keeping beta access-gating intact.
          const showBetaBadge = isBetaItem && !item.path.startsWith('/copilot');
          // Show a subtle lock indicator to beta/admin viewers for items gated from regular users
          const showAdminLockIndicator = hasBetaAccess && (item.locked === true || isBetaItem || isAdminOnlyItem);
          const hasChildren = Boolean(item.children?.length);
          const childrenOpen = effectiveExpanded && hasChildren && openGroups[item.path];
          const parentActive = hasChildren
            ? location.pathname === item.path || item.children?.some(child => location.pathname === child.path)
            : active;
          
          // נ”¥ BETA ACCESS: Admins can access locked items
          const isLocked = item.locked === true && !hasBetaAccess;
          
          // נ”¥ Hide beta items for non-beta users
          if (isBetaItem && !hasBetaAccess) {
            return null;
          }
          
          return (
            <div key={item.path}>
              <button
              onClick={() => {
                if (hasChildren) {
                  if (!effectiveExpanded) {
                    if (isMobile) {
                      setMobileOpen(true);
                    } else {
                      setIsExpanded(true);
                      localStorage.setItem(storageKey, 'true');
                    }
                    setOpenGroups(prev => ({ ...prev, [item.path]: true }));
                    return;
                  }

                  setOpenGroups(prev => ({ ...prev, [item.path]: !prev[item.path] }));
                  return;
                }
                // Copilot items (/copilot/*) open in a new tab when the user is NOT
                // already inside the standalone /copilot shell.
                if (item.path.startsWith('/copilot') && !inStandaloneCopilot) {
                  if (!item.locked || hasBetaAccess) {
                    window.open(item.path, '_blank', 'noopener,noreferrer');
                  }
                  if (isMobile) setMobileOpen(false);
                  return;
                }
                handleNavigation(item.path, item.locked);
                // Close the mobile overlay on navigation so the menu doesn't
                // stay open over the newly-navigated page.
                if (isMobile) setMobileOpen(false);
              }}
              onMouseEnter={(e) => {
                if (!isLocked) handlePrefetch(item.path);
                if (!effectiveExpanded) {
                  const r = e.currentTarget.getBoundingClientRect();
                  setHoverTip({
                    label: item.label,
                    desc: NAV_DESCRIPTIONS[item.path],
                    beta: showBetaBadge,
                    top: r.top + r.height / 2,
                    left: r.right + 12,
                  });
                }
              }}
              onMouseLeave={() => setHoverTip(null)}
              disabled={isLocked}
              title={hasChildren && effectiveExpanded ? (childrenOpen ? 'Hide Copilot pages' : 'Show Copilot pages') : undefined}
              className={cn(
                sidebarItemBaseClass,
                effectiveExpanded ? sidebarItemExpandedClass : sidebarItemCollapsedClass,
                isLocked
                  ? 'text-gray-500 cursor-not-allowed opacity-60'
                  : isBackButton
                    ? 'text-gray-400 hover:bg-base-700 hover:text-white'
                      : isCopilotItem
                        ? parentActive
                          ? sidebarActiveClass
                          : sidebarInactiveClass
                      : isBetaItem
                        ? parentActive
                          ? sidebarActiveClass
                          : sidebarInactiveClass
                        : parentActive
                          ? sidebarActiveClass
                          : sidebarInactiveClass
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    sidebarIconClass,
                    hasChildren && 'transition-transform duration-200',
                    childrenOpen && 'rotate-90'
                  )}
                />
              )}
              
              {effectiveExpanded && (
                <>
                  <span className={item.label === 'FINOTAUR Copilot' ? sidebarBrandLabelClass : sidebarLabelClass}>
                    {item.label === 'FINOTAUR Copilot' ? (
                      <span className="text-[11px]">
                        <span className="bg-gradient-to-b from-gold-bright via-gold-primary to-gold-deep bg-clip-text font-bold tracking-[0.04em] text-transparent">
                          FINOTAUR
                        </span>{' '}
                        <span className="font-semibold text-ink-primary">Copilot</span>
                      </span>
                    ) : item.label}
                  </span>
                  {isLocked && <Lock className="h-3.5 w-3.5 text-gray-500" />}
                  {showBetaBadge && (
                    <span className="rounded bg-gold/15 px-1 py-0.5 text-[9px] font-bold text-gold">
                      BETA
                    </span>
                  )}
                  {/* Admin indicator: item is gated for regular users; admin can still access */}
                  {showAdminLockIndicator && !isLocked && (
                    <Lock
                      className="h-2.5 w-2.5 flex-shrink-0"
                      style={{ color: 'rgba(201,166,70,0.55)' }}
                      aria-label="Locked for regular users"
                      title="Locked for regular users"
                    />
                  )}
                  {/* Price-gate indicator: visible to all users; item is compliance-gated */}
                  {isPriceGatedItem && (
                    <Lock
                      className="h-3.5 w-3.5 flex-shrink-0 text-gray-500"
                      aria-label="Price gated"
                      title="Price gated"
                    />
                  )}
                  {hasChildren && (
                    <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.12em] text-gold/70">
                      {childrenOpen ? 'Open' : 'Pages'}
                    </span>
                  )}
                </>
              )}

              {/* Collapsed rail = icons only. The hover label/description pill is
                  rendered once via a body portal (see end of component) so the
                  scrolling <nav> can't clip it. */}
              </button>

              {childrenOpen && (
                <div className="mt-1 space-y-1 pl-4">
                  {item.children?.map((child) => {
                    const ChildIcon = child.icon;
                    const childActive = location.pathname === child.path;

                    if (child.beta && !hasBetaAccess) {
                      return null;
                    }

                    return (
                      <button
                        key={child.path}
                        onClick={() => {
                          handleNavigation(child.path);
                          if (isMobile) setMobileOpen(false);
                        }}
                        onMouseEnter={() => handlePrefetch(child.path)}
                        className={cn(
                          sidebarItemBaseClass,
                          sidebarItemExpandedClass,
                          childActive
                            ? sidebarActiveClass
                            : sidebarInactiveClass
                        )}
                      >
                        {ChildIcon && <ChildIcon className={sidebarIconClass} />}
                        <span className={sidebarLabelClass}>{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      {!effectiveExpanded && hoverTip && createPortal(
        <div
          style={{ position: 'fixed', top: hoverTip.top, left: hoverTip.left, transform: 'translateY(-50%)' }}
          className="z-[9999] max-w-[240px] rounded-lg border border-white/15 bg-black px-3 py-2 text-white shadow-lg pointer-events-none"
        >
          <span className="block whitespace-nowrap text-xs font-semibold">
            {hoverTip.label}
            {hoverTip.beta && (
              <span className="ml-1 rounded bg-gold/15 px-1 py-0.5 text-[9px] font-bold text-gold">BETA</span>
            )}
          </span>
          {hoverTip.desc && (
            <span className="mt-0.5 block text-[11px] font-normal leading-snug text-white/65">
              {hoverTip.desc}
            </span>
          )}
        </div>,
        document.body
      )}
      </aside>
    </>
  );
};
