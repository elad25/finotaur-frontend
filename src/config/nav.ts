// Finotaur Side Navigation Config (focused delta)
import {
  LayoutDashboard, TrendingUp, Flame, Target, Calendar, BarChart3, FileText, Activity,
  Globe, Newspaper, Building, Coins, LineChart, Search, Bell, Users, Zap, Map,
  DollarSign, Wallet, Award, BookOpen, Layers, MessageSquare, PlusSquare,
  ListChecks, GraduationCap, Settings as SettingsIcon, HeadphonesIcon,
  FlaskConical, PlayCircle, Brain, Database, Code, UserPlus, CreditCard,
  Link, Gift, type LucideIcon, Swords, Crown, Shield, Sparkles, Copy, Waves, Calculator,
  Landmark,
} from 'lucide-react';

export interface NavItem { 
  label: string; 
  path: string; 
  icon?: LucideIcon;
  adminOnly?: boolean; // 🔐 NEW: Flag for admin-only items
}

export interface Domain { id: string; label: string; subNav: NavItem[]; sidebar: NavItem[]; }

export const domains: Record<string, Domain> = {
  'all-markets': {
    id: 'all-markets',
    label: 'All Markets',
    subNav: [
      { label: 'Overview', path: '/app/all-markets/overview' },
      { label: 'Chart', path: '/app/all-markets/chart' },
      { label: 'Summary', path: '/app/all-markets/summary' },
      { label: 'News', path: '/app/all-markets/news' },
    ],
    sidebar: [
      { label: 'Overview', path: '/app/all-markets/overview', icon: LayoutDashboard },
      { label: 'Heatmap', path: '/app/all-markets/heatmap', icon: Map },
      { label: 'Movers', path: '/app/all-markets/movers', icon: TrendingUp },
      { label: 'Sentiment', path: '/app/all-markets/sentiment', icon: Activity },
      { label: 'Calendar', path: '/app/all-markets/calendar', icon: Calendar },
    ],
  },

  stocks: {
    id: 'stocks',
    label: 'Stocks',
    subNav: [
      { label: 'Overview', path: '/app/stocks/overview' },
      { label: 'News', path: '/app/stocks/news' },
      { label: 'Screener', path: '/app/stocks/screener' },
      { label: 'Compare', path: '/app/stocks/compare' },
    ],
    sidebar: [
      { label: 'Dashboard', path: '/app/stocks/overview', icon: LayoutDashboard },
      { label: 'Screener', path: '/app/stocks/screener', icon: Search },
      { label: 'Compare Stocks', path: '/app/stocks/compare', icon: BarChart3 },
      { label: 'Insiders', path: '/app/stocks/insiders', icon: Landmark },
      { label: 'Earnings Calendar', path: '/app/stocks/earnings', icon: Calendar },
      { label: 'Top Movers', path: '/app/stocks/movers', icon: TrendingUp },
      { label: 'News', path: '/app/stocks/news', icon: Newspaper },
      { label: 'Sector Analysis', path: '/app/stocks/sectors', icon: Target },
      { label: 'Catalysts', path: '/app/stocks/catalysts', icon: Zap },
      { label: 'Upgrades/Downgrades', path: '/app/stocks/upgrades', icon: Award },
      { label: 'Valuation', path: '/app/stocks/valuation', icon: DollarSign },
      { label: 'Reports & PDFs', path: '/app/stocks/reports', icon: FileText },
      { label: 'Watchlists', path: '/app/stocks/watchlists', icon: Bell },
    ],
  },

  crypto: {
    id: 'crypto',
    label: 'Crypto',
    subNav: [
      { label: 'Overview', path: '/app/crypto/overview' },
      { label: 'News', path: '/app/crypto/news' },
    ],
    sidebar: [
      { label: 'Dashboard', path: '/app/crypto/overview', icon: LayoutDashboard },
      { label: 'Top Coins', path: '/app/crypto/top-coins', icon: Coins },
      { label: 'On-chain Data', path: '/app/crypto/on-chain', icon: Activity },
      { label: 'Heatmap', path: '/app/crypto/heatmap', icon: Map },
      { label: 'News & Sentiment', path: '/app/crypto/news', icon: Newspaper },
      { label: 'Catalysts', path: '/app/crypto/catalysts', icon: Zap },
      { label: 'Exchanges', path: '/app/crypto/exchanges', icon: Building },
      { label: 'Top Movers', path: '/app/crypto/movers', icon: TrendingUp },
      { label: 'Reports', path: '/app/crypto/reports', icon: FileText },
      { label: 'Calendar', path: '/app/crypto/calendar', icon: Calendar },
      { label: 'Whale Tracker', path: '/app/crypto/whales/trades', icon: Waves },
    ],
  },

  futures: {
    id: 'futures',
    label: 'Futures',
    subNav: [
      { label: 'Overview', path: '/app/futures/overview' },
      { label: 'Contracts', path: '/app/futures/contracts' },
    ],
    sidebar: [
      { label: 'Overview', path: '/app/futures/overview', icon: LayoutDashboard },
      { label: 'Contracts', path: '/app/futures/contracts', icon: Layers },
      { label: 'Curves', path: '/app/futures/curves', icon: LineChart },
      { label: 'Positioning', path: '/app/futures/positioning', icon: BarChart3 },
      { label: 'Calculators', path: '/app/futures/tools', icon: Calculator },
    ],
  },

  forex: {
    id: 'forex',
    label: 'Forex',
    subNav: [
      { label: 'Overview', path: '/app/forex/overview' },
      { label: 'News', path: '/app/forex/news' },
    ],
    sidebar: [
      { label: 'Dashboard', path: '/app/forex/overview', icon: LayoutDashboard },
      { label: 'Currency Strength', path: '/app/forex/strength', icon: Activity },
      { label: 'Correlation Map', path: '/app/forex/correlation', icon: Map },
      { label: 'Major/Cross Pairs', path: '/app/forex/pairs', icon: Globe },
      { label: 'Interest Rates', path: '/app/forex/rates', icon: LineChart },
      { label: 'Macro Reports', path: '/app/forex/deep-analysis', icon: FileText },
      { label: 'Alerts & Watchlists', path: '/app/forex/alerts', icon: Bell },
    ],
  },

  commodities: {
    id: 'commodities',
    label: 'Commodities',
    subNav: [
      { label: 'Overview', path: '/app/commodities/overview' },
      { label: 'News', path: '/app/commodities/news' },
    ],
    sidebar: [
      { label: 'Dashboard', path: '/app/commodities/overview', icon: LayoutDashboard },
      { label: 'Screener', path: '/app/commodities/screener', icon: Search },
      { label: 'Catalysts', path: '/app/commodities/catalysts', icon: Zap },
      { label: 'Energy', path: '/app/commodities/energy', icon: Flame },
      { label: 'Metals', path: '/app/commodities/metals', icon: Coins },
      { label: 'Agriculture', path: '/app/commodities/agriculture', icon: Target },
      { label: 'Seasonality', path: '/app/commodities/seasonality', icon: Calendar },
      { label: 'Reports', path: '/app/commodities/reports', icon: FileText },
      { label: 'Calendar', path: '/app/commodities/calendar', icon: Calendar },
    ],
  },

  macro: {
    id: 'macro',
    label: 'Macro & News',
    subNav: [
      { label: 'Overview', path: '/app/macro/overview' },
      { label: 'News', path: '/app/macro/news' },
    ],
    sidebar: [
      { label: 'Market Overview', path: '/app/macro/overview', icon: LayoutDashboard },
      { label: 'Interest Rates', path: '/app/macro/rates', icon: LineChart },
      { label: 'Economic Indicators', path: '/app/macro/indicators', icon: BarChart3 },
      { label: 'Reports & PDFs', path: '/app/macro/reports', icon: FileText },
      { label: 'Sentiment', path: '/app/macro/sentiment', icon: Activity },
    ],
  },

  ai: {
    id: 'ai',
    label: 'AI Arena',
    subNav: [
      { label: 'Overview', path: '/app/ai/overview' },
    ],
    sidebar: [
      { label: 'Daily Summary', path: '/app/ai/overview', icon: LayoutDashboard },
      { label: 'Weekly Digest', path: '/app/ai/digest', icon: BookOpen },
      { label: 'Sentiment Map', path: '/app/ai/sentiment', icon: Map },
      { label: 'Smart Forecasts', path: '/app/ai/forecasts', icon: TrendingUp },
      { label: 'Risk Breakdown', path: '/app/ai/risk', icon: Target },
      { label: 'Pattern Detection', path: '/app/ai/patterns', icon: Activity },
      { label: 'AI Reports', path: '/app/ai/reports', icon: FileText },
      { label: 'Personalized Alerts', path: '/app/ai/alerts', icon: Bell },
      { label: 'Strategy Backtesting', path: '/app/ai/backtesting', icon: BarChart3 },
    ],
  },

  journal: {
    id: 'journal',
    label: 'Journal',
    subNav: [
      { label: 'Journal', path: '/app/journal/overview' },
      { label: 'Add Trade', path: '/app/journal/new' },
      { label: 'Admin', path: '/app/journal/admin', adminOnly: true }, // 🔐 ADMIN ONLY
    ],
    sidebar: [
      { label: 'Dashboard', path: '/app/journal/overview', icon: LayoutDashboard },
      { label: 'Add Trade', path: '/app/journal/new', icon: PlusSquare },
      { label: 'Trades Journal', path: '/app/journal/my-trades', icon: FileText },
      { label: 'My Strategies', path: '/app/journal/strategies', icon: Layers },
      { label: 'Statistics', path: '/app/journal/analytics', icon: BarChart3 },
      { label: 'Calendar', path: '/app/journal/calendar', icon: Calendar },
      { label: 'AI Chat', path: '/app/journal/ai-review', icon: MessageSquare },
      { label: 'Prop Firms', path: '/app/journal/prop-firms', icon: Building },
      { label: 'Gameplan', path: '/app/journal/scenarios', icon: ListChecks },
      { label: 'Academy', path: '/app/journal/academy', icon: GraduationCap },
      { label: 'Settings', path: '/app/journal/settings', icon: SettingsIcon },
    ],
  },

  // 🧪 NEW: Backtest Domain
  backtest: {
    id: 'backtest',
    label: 'Backtest',
    subNav: [
      { label: 'Dashboard', path: '/app/backtest/overview' },
      { label: 'New Backtest', path: '/app/backtest/new' },
      { label: 'Results', path: '/app/backtest/results' },
    ],
    sidebar: [
      { label: 'Dashboard', path: '/app/backtest/overview', icon: LayoutDashboard },
      { label: 'New Backtest', path: '/app/backtest/new', icon: FlaskConical },
      { label: 'My Backtests', path: '/app/backtest/results', icon: FileText },
      { label: 'Strategy Builder', path: '/app/backtest/builder', icon: Code },
      { label: 'Historical Data', path: '/app/backtest/data', icon: Database },
      { label: 'Performance Analytics', path: '/app/backtest/analytics', icon: BarChart3 },
      { label: 'Monte Carlo', path: '/app/backtest/monte-carlo', icon: Activity },
      { label: 'Walk Forward', path: '/app/backtest/walk-forward', icon: TrendingUp },
      { label: 'Optimization', path: '/app/backtest/optimization', icon: Target },
      { label: 'AI Insights', path: '/app/backtest/ai-insights', icon: Brain },
      { label: 'Market Replay', path: '/app/backtest/replay', icon: PlayCircle },
    ],
  },

  'copy-trade': {
    id: 'copy-trade',
    label: 'Trade Copier',
    subNav: [
      { label: 'Trade Copier', path: '/app/copy-trade/overview' },
    ],
    sidebar: [
      { label: 'Connections', path: '/app/copy-trade/overview', icon: Link },
      { label: 'Trade Copier', path: '/app/copy-trade/trade-copier', icon: Copy },
      { label: 'Manage Risk', path: '/app/copy-trade/manage-risk', icon: Shield },
    ],
  },

  funding: {
    id: 'funding',
    label: 'Funding',
    subNav: [
      { label: 'Overview', path: '/app/funding/overview' },
      { label: 'Brokers', path: '/app/funding/brokers' },
    ],
    sidebar: [
      { label: 'Overview', path: '/app/funding/overview', icon: LayoutDashboard },
      { label: 'Brokers', path: '/app/funding/brokers', icon: Building },
      { label: 'Cash Advance', path: '/app/funding/advance', icon: DollarSign },
      { label: 'Transactions', path: '/app/funding/transactions', icon: FileText },
    ],
  },

  // Sealed pending licensed options data feed (Track B). Re-enable when built.
  // To re-enable: set OPTIONS_ENABLED = true below, then restore the subNav/sidebar arrays.
  options: {
    id: 'options',
    label: 'Options',
    subNav: [],
    sidebar: [],
  },
};

export const domainOrder = [
  'all-markets',
  'stocks',
  'crypto',
  'futures',
  'forex',
  'commodities',
  'options',
  'macro',
  'ai',
  'journal',
  'backtest', // 🧪 NEW
  'copy-trade',
  'funding',
];
