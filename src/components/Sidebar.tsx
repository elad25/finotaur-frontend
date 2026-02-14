// src/components/Sidebar.tsx
// =====================================================
// 🔥 v2.0: BETA ACCESS SYSTEM
// =====================================================
// Admins/VIPs with hasBetaAccess can see and access ALL locked items
// =====================================================

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDomain } from '@/hooks/useDomain';
import { useAdminAuth } from '@/hooks/useAdminAuth';  // 🔥 NEW
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  PlusCircle, 
  BookOpen, 
  Layers, 
  BarChart3, 
  Calendar, 
  MessageSquare, 
  Building, 
  Target, 
  Users, 
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
  Sparkles  // 🔥 For beta items
} from 'lucide-react';
import { 
  prefetchSettingsData, 
  prefetchAnalytics, 
  prefetchStrategies,
  prefetchTrades,
  prefetchUserProfile
} from '@/lib/queryClient';

interface SidebarProps {
  isOpen?: boolean;
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
  | 'copy-trade'
  | 'funding'
  | 'settings';

const ENVIRONMENT_MENUS: Record<EnvironmentType, Array<{
  label: string;
  path: string;
  icon: any;
  divider?: boolean;
  locked?: boolean;
  beta?: boolean;  // 🔥 NEW
}>> = {
  // ===============================================
  // 🌍 ALL MARKETS - 🔒 LOCKED
  // ===============================================
  'all-markets': [
    { label: 'Overview', path: '/app/all-markets/overview', icon: LayoutDashboard, locked: true },
    { label: 'Heatmap', path: '/app/all-markets/heatmap', icon: Map, locked: true },
    { label: 'Movers', path: '/app/all-markets/movers', icon: TrendingUp, locked: true },
    { label: 'Sentiment', path: '/app/all-markets/sentiment', icon: Activity, locked: true },
    { label: 'Calendar', path: '/app/all-markets/calendar', icon: Calendar, locked: true },
    { label: 'News', path: '/app/all-markets/news', icon: Newspaper, locked: true },
    { label: 'divider', path: '', icon: null, divider: true },
    { label: 'Pricing', path: '/app/all-markets/pricing', icon: Crown, locked: true },
    { label: 'Settings', path: '/app/settings', icon: Settings, locked: true },
  ],

  // ===============================================
  // 📈 STOCKS
  // ===============================================
  'stocks': [
    { label: 'Dashboard', path: '/app/stocks/overview', icon: LayoutDashboard },
    { label: 'Screener', path: '/app/stocks/screener', icon: Search },
    { label: 'Earnings', path: '/app/stocks/earnings', icon: Calendar },
    { label: 'Fundamentals', path: '/app/stocks/fundamentals', icon: BarChart3 },
    { label: 'Top Movers', path: '/app/stocks/movers', icon: TrendingUp },
    { label: 'News', path: '/app/stocks/news', icon: Newspaper },
    { label: 'Sector Analysis', path: '/app/stocks/sectors', icon: Target },
    { label: 'Catalysts', path: '/app/stocks/catalysts', icon: Zap },
    { label: 'Upgrades/Downgrades', path: '/app/stocks/upgrades', icon: Award },
    { label: 'Valuation', path: '/app/stocks/valuation', icon: DollarSign },
    { label: 'Reports & PDFs', path: '/app/stocks/reports', icon: FileText },
    { label: 'Watchlists', path: '/app/stocks/watchlists', icon: Bell },
  ],

  // ===============================================
  // 🪙 CRYPTO
  // ===============================================
  'crypto': [
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
  ],

  // ===============================================
  // 📊 FUTURES
  // ===============================================
  'futures': [
    { label: 'Overview', path: '/app/futures/overview', icon: LayoutDashboard },
    { label: 'Open Interests', path: '/app/futures/open-interests', icon: BarChart3 },
    { label: 'Calendar', path: '/app/futures/calendar', icon: Calendar },
  ],

  // ===============================================
  // 💱 FOREX
  // ===============================================
  'forex': [
    { label: 'Dashboard', path: '/app/forex/overview', icon: LayoutDashboard },
    { label: 'Currency Strength', path: '/app/forex/strength', icon: Activity },
    { label: 'Correlation Map', path: '/app/forex/correlation', icon: Map },
    { label: 'Economic Calendar', path: '/app/forex/calendar', icon: Calendar },
    { label: 'Major/Cross Pairs', path: '/app/forex/pairs', icon: Globe },
    { label: 'Interest Rates', path: '/app/forex/rates', icon: LineChart },
    { label: 'Macro Reports', path: '/app/forex/deep-analysis', icon: FileText },
    { label: 'Alerts & Watchlists', path: '/app/forex/alerts', icon: Bell },
    { label: 'News', path: '/app/forex/news', icon: Newspaper },
  ],

  // ===============================================
  // 🛢️ COMMODITIES
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
  // 📉 OPTIONS
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
  // 🌐 MACRO & NEWS
  // ===============================================
  'macro': [
    { label: 'Market Overview', path: '/app/macro/overview', icon: LayoutDashboard },
    { label: 'Cross-Asset', path: '/app/macro/cross-asset', icon: Layers },
    { label: 'Global Heatmap', path: '/app/macro/global-heatmap', icon: Map },
    { label: 'Macro Models', path: '/app/macro/models', icon: Brain },
    { label: 'Global Calendar', path: '/app/macro/calendar', icon: Calendar },
    { label: 'Interest Rates', path: '/app/macro/rates', icon: LineChart },
    { label: 'Economic Indicators', path: '/app/macro/indicators', icon: BarChart3 },
    { label: 'Major Events', path: '/app/macro/events', icon: Zap },
    { label: 'Reports & PDFs', path: '/app/macro/reports', icon: FileText },
    { label: 'Sentiment', path: '/app/macro/sentiment', icon: Activity },
    { label: 'News', path: '/app/macro/news', icon: Newspaper },
  ],

// ===============================================
// 🤖 AI INSIGHTS - 🔥 UPDATED v2.1
// ===============================================
'ai': [
  { label: 'My Portfolio', path: '/app/ai/my-portfolio', icon: Shield },
  { label: 'Stock Analyzer', path: '/app/ai/stock-analyzer', icon: TrendingUp },
  { label: 'Sector Analyzer', path: '/app/ai/sector-analyzer', icon: Target },
  { label: 'Macro Analyzer', path: '/app/ai/macro-analyzer', icon: Globe },
  { label: 'Options Intelligence', path: '/app/ai/options-intelligence', icon: Layers },
  { label: 'Flow Scanner', path: '/app/ai/flow-scanner', icon: Search },
  { label: 'Top 5', path: '/app/ai/top-5', icon: Award },
  { label: 'AI Assistant', path: '/app/ai/assistant', icon: MessageSquare },
],
  // ===============================================
  // 📓 JOURNAL
  // ===============================================
  journal: [
    { label: 'Dashboard', path: '/app/journal/overview', icon: LayoutDashboard },
    { label: 'Add Trade', path: '/app/journal/new', icon: PlusCircle },
    { label: 'Trades Journal', path: '/app/journal/my-trades', icon: BookOpen },
    { label: 'My Strategies', path: '/app/journal/strategies', icon: Layers },
    { label: 'Statistics', path: '/app/journal/analytics', icon: BarChart3 },
    { label: 'Calendar', path: '/app/journal/calendar', icon: Calendar },
    { label: 'AI Chat', path: '/app/journal/ai-review', icon: MessageSquare },
    { label: 'Prop Firms', path: '/app/journal/prop-firms', icon: Building },
    { label: 'Gameplan', path: '/app/journal/scenarios', icon: Target },
    { label: 'Community Blog', path: '/app/journal/community', icon: Users },
    { label: 'Academy', path: '/app/journal/academy', icon: GraduationCap },
    { label: 'Settings', path: '/app/journal/settings', icon: Settings },
  ],

  // ===============================================
  // 🧪 BACKTEST
  // ===============================================
  backtest: [
    { label: 'Dashboard', path: '/app/journal/backtest/overview', icon: FlaskConical },
    { label: 'Chart', path: '/app/journal/backtest/chart', icon: PlusCircle },
    { label: 'Results', path: '/app/journal/backtest/results', icon: FileText },
    { label: 'Strategy Builder', path: '/app/journal/backtest/builder', icon: Layers },
    { label: 'Analytics', path: '/app/journal/backtest/analytics', icon: TrendingUp },
    { label: 'Historical Data', path: '/app/journal/backtest/data', icon: Calendar },
    { label: 'AI Insights', path: '/app/journal/backtest/ai-insights', icon: Brain },
    { label: 'Monte Carlo', path: '/app/journal/backtest/monte-carlo', icon: Shuffle },
    { label: 'Walk Forward', path: '/app/journal/backtest/walk-forward', icon: Activity },
    { label: 'Optimization', path: '/app/journal/backtest/optimization', icon: Calculator },
    { label: 'Market Replay', path: '/app/journal/backtest/replay', icon: Play },
  ],

  // ===============================================
  // 👥 COPY TRADE
  // ===============================================
  'copy-trade': [
    { label: 'Overview', path: '/app/copy-trade/overview', icon: LayoutDashboard },
    { label: 'Top Traders', path: '/app/copy-trade/top-traders', icon: Users },
    { label: 'Strategies', path: '/app/copy-trade/strategies', icon: Target },
    { label: 'Portfolios', path: '/app/copy-trade/portfolios', icon: Wallet },
    { label: 'Leaderboard', path: '/app/copy-trade/leaderboard', icon: Award },
    { label: 'My Copying', path: '/app/copy-trade/my-copying', icon: Activity },
    { label: 'Trader Insights', path: '/app/copy-trade/insights', icon: BarChart3 },
  ],

  // ===============================================
  // 💰 FUNDING
  // ===============================================
  'funding': [
    { label: 'Overview', path: '/app/funding/overview', icon: LayoutDashboard },
    { label: 'Brokers', path: '/app/funding/brokers', icon: Building },
    { label: 'Cash Advance', path: '/app/funding/advance', icon: DollarSign },
    { label: 'Transactions', path: '/app/funding/transactions', icon: FileText },
  ],

  // ===============================================
  // 🔐 ADMIN
  // ===============================================
  admin: [
    { label: 'Dashboard', path: '/app/journal/admin', icon: LayoutDashboard },
    { label: 'Users', path: '/app/journal/admin/users', icon: Users },
    { label: 'Analytics', path: '/app/journal/admin/analytics', icon: BarChart3 },
    { label: 'Subscribers', path: '/app/journal/admin/subscribers', icon: CreditCard },
    { label: 'Support', path: '/app/journal/admin/support', icon: HeadphonesIcon },
    { label: 'Cancellations', path: '/app/journal/admin/Cancellations', icon: UserX },
    { label: 'Affiliate', path: '/app/journal/admin/affiliate', icon: Gift },
    { label: 'Top Traders', path: '/app/journal/admin/top-traders', icon: Trophy },
    { label: 'divider', path: '', icon: null, divider: true },
    { label: 'Back to Journal', path: '/app/journal/overview', icon: ArrowLeft },
  ],

  // ===============================================
  // 🤝 AFFILIATE
  // ===============================================
  affiliate: [
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
  ],

  // ===============================================
  // ⚙️ SETTINGS
  // ===============================================
  settings: [
    { label: 'General', path: '/app/settings', icon: Settings },
    { label: 'Billing', path: '/app/settings/billing', icon: CreditCard },
    { label: 'Usage', path: '/app/settings/usage', icon: Activity },
  ]
};

// ===============================================
// 🎨 ENVIRONMENT HEADERS CONFIG
// ===============================================
const ENVIRONMENT_HEADERS: Record<EnvironmentType, { icon: any; label: string; bgColor: string; textColor: string }> = {
  'all-markets': { icon: LayoutDashboard, label: 'All Markets', bgColor: 'bg-blue-500/5', textColor: 'text-blue-400' },
  'stocks': { icon: TrendingUp, label: 'Stocks', bgColor: 'bg-green-500/5', textColor: 'text-green-400' },
  'crypto': { icon: Coins, label: 'Crypto', bgColor: 'bg-orange-500/5', textColor: 'text-orange-400' },
  'futures': { icon: BarChart3, label: 'Futures', bgColor: 'bg-purple-500/5', textColor: 'text-purple-400' },
  'forex': { icon: Globe, label: 'Forex', bgColor: 'bg-cyan-500/5', textColor: 'text-cyan-400' },
  'commodities': { icon: Flame, label: 'Commodities', bgColor: 'bg-amber-500/5', textColor: 'text-amber-400' },
  'options': { icon: Target, label: 'Options', bgColor: 'bg-pink-500/5', textColor: 'text-pink-400' },
  'macro': { icon: Globe, label: 'Macro & News', bgColor: 'bg-emerald-500/5', textColor: 'text-emerald-400' },
  'ai': { icon: Brain, label: 'AI Insights', bgColor: 'bg-violet-500/5', textColor: 'text-violet-400' },
  'journal': { icon: BookOpen, label: 'Journal', bgColor: 'bg-[#C9A646]/5', textColor: 'text-[#C9A646]' },
  'backtest': { icon: FlaskConical, label: 'Backtest', bgColor: 'bg-purple-500/5', textColor: 'text-purple-400' },
  'copy-trade': { icon: Users, label: 'Copy Trade', bgColor: 'bg-teal-500/5', textColor: 'text-teal-400' },
  'funding': { icon: Wallet, label: 'Funding', bgColor: 'bg-lime-500/5', textColor: 'text-lime-400' },
  'admin': { icon: Shield, label: 'Admin Panel', bgColor: 'bg-[#D4AF37]/5', textColor: 'text-[#D4AF37]' },
  'affiliate': { icon: Award, label: 'Affiliate Center', bgColor: 'bg-[#C9A646]/5', textColor: 'text-[#C9A646]' },
  'settings': { icon: Settings, label: 'Settings', bgColor: 'bg-zinc-500/5', textColor: 'text-zinc-400' },
};

export const Sidebar = ({ isOpen }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isActive } = useDomain();
  const { isAdmin, hasBetaAccess } = useAdminAuth();  // 🔥 NEW: Beta access check

  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('finotaur-sidebar-expanded');
    return saved !== 'false';
  });

  const handleToggle = () => {
    setIsExpanded(prev => {
      const newValue = !prev;
      localStorage.setItem('finotaur-sidebar-expanded', String(newValue));
      return newValue;
    });
  };

  // ===============================================
  // 🔍 DETECT CURRENT ENVIRONMENT
  // ===============================================
  const getCurrentEnvironment = (): EnvironmentType => {
    const path = location.pathname;
    
    // Settings first (specific path)
    if (path.startsWith('/app/settings')) return 'settings';
    
    // Admin & Affiliate first (more specific paths)
    if (path.startsWith('/app/journal/admin')) return 'admin';
    if (path.startsWith('/app/journal/affiliate')) return 'affiliate';
    if (path.startsWith('/app/journal/backtest')) return 'backtest';
    
    // All other domains
    if (path.startsWith('/app/all-markets')) return 'all-markets';
    if (path.startsWith('/app/stocks')) return 'stocks';
    if (path.startsWith('/app/crypto')) return 'crypto';
    if (path.startsWith('/app/futures')) return 'futures';
    if (path.startsWith('/app/forex')) return 'forex';
    if (path.startsWith('/app/commodities')) return 'commodities';
    if (path.startsWith('/app/options')) return 'options';
    if (path.startsWith('/app/macro')) return 'macro';
    if (path.startsWith('/app/ai')) return 'ai';
    if (path.startsWith('/app/copy-trade')) return 'copy-trade';
    if (path.startsWith('/app/funding')) return 'funding';
    if (path.startsWith('/app/journal')) return 'journal';
    
    // Default
    return 'journal';
  };

  const currentEnvironment = getCurrentEnvironment();
  const sidebarItems = ENVIRONMENT_MENUS[currentEnvironment];

  // ===============================================
  // 🎯 SHOW SIDEBAR FOR ALL APP ROUTES
  // ===============================================
  const shouldShowSidebar = location.pathname.startsWith('/app/');
  
  // ===============================================
  // 🔥 HIDE SIDEBAR FOR SPECIFIC PAGES
  // ===============================================
  const hideSidebarPaths = [
    '/app/all-markets/warzone',
    '/app/top-secret',
  ];
  
  const isHiddenPath = hideSidebarPaths.some(p => location.pathname.startsWith(p));
  
  if (!shouldShowSidebar || isHiddenPath) {
    return null;
  }

  // 🔥 UPDATED: Beta access allows navigation to locked items
  const handleNavigation = (path: string, isLocked?: boolean) => {
    if (isLocked && !hasBetaAccess) return;
    navigate(path);
  };

  const getPrefetchFunction = (path: string): (() => Promise<void>) | undefined => {
    if (currentEnvironment !== 'journal') return undefined;
    
    const prefetchMap: Record<string, () => Promise<void>> = {
      '/app/journal/settings': prefetchSettingsData,
      '/app/journal/analytics': prefetchAnalytics,
      '/app/journal/strategies': prefetchStrategies,
      '/app/journal/my-trades': prefetchTrades,
      '/app/journal/performance': prefetchUserProfile,
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

  const envHeader = ENVIRONMENT_HEADERS[currentEnvironment];

  return (
    <aside
      className={cn(
        'fixed left-0 top-28 z-30 h-[calc(100vh-7rem)] border-r border-border bg-base-800 transition-all duration-300 ease-in-out md:sticky md:translate-x-0',
        isExpanded ? 'w-48' : 'w-[60px]'
      )}
    >
      {/* 🔥 Gold Toggle Tab */}
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
          {isExpanded ? (
            <ChevronLeft className="h-3.5 w-3.5 text-[#C9A646]/50 group-hover:text-[#C9A646] transition-colors duration-300" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[#C9A646]/50 group-hover:text-[#C9A646] transition-colors duration-300" />
          )}
        </div>
      </div>

      {/* 🏷️ Environment Header Badge */}
      {envHeader && (
        <div className={cn(
          "px-3 py-2 border-b border-gray-700 h-10 min-h-[40px]",
          envHeader.bgColor
        )}>
          <div className={cn(
            "flex items-center gap-2 h-full overflow-hidden",
            envHeader.textColor
          )}>
            {envHeader.icon && (
              <envHeader.icon className="w-4 h-4 flex-shrink-0" />
            )}
            {isExpanded && (
              <span className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis">
                {envHeader.label}
              </span>
            )}
          </div>
        </div>
      )}

      <nav className="flex h-full flex-col gap-1 overflow-y-auto p-2">
        {sidebarItems.map((item, index) => {
          if (item.divider) {
            return <div key={`divider-${index}`} className="my-2 border-t border-gray-700" />;
          }

          const Icon = item.icon;
          const active = isItemActive(item.path);
          const isBackButton = item.label === 'Back to Journal';
          const isWarZone = item.path === '/app/all-markets/warzone';
          const isBetaItem = item.beta === true;
          
          // 🔥 BETA ACCESS: Admins can access locked items
          const isLocked = item.locked === true && !hasBetaAccess;
          
          // 🔥 Hide beta items for non-beta users
          if (isBetaItem && !hasBetaAccess) {
            return null;
          }
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path, item.locked)}
              onMouseEnter={() => !isLocked && handlePrefetch(item.path)}
              disabled={isLocked}
              title={!isExpanded ? item.label : undefined}
              className={cn(
                'flex items-center rounded-lg py-2.5 text-sm font-medium transition-all duration-200 relative group',
                isExpanded ? 'gap-3 px-3' : 'justify-center px-2',
                isLocked
                  ? 'text-gray-500 cursor-not-allowed opacity-60'
                  : isBackButton
                    ? 'text-gray-400 hover:bg-base-700 hover:text-white'
                    : isWarZone
                      ? active
                        ? 'border-l-2 border-red-500 bg-red-500/10 text-red-400'
                        : 'text-red-400/70 hover:bg-red-500/10 hover:text-red-400'
                      : isBetaItem
                        ? active
                          ? 'border-l-2 border-orange-500 bg-orange-500/10 text-orange-400'
                          : 'text-orange-400/70 hover:bg-orange-500/10 hover:text-orange-400'
                        : active
                          ? 'border-l-2 border-gold bg-gold/10 text-gold'
                          : 'text-muted-foreground hover:bg-base-700 hover:text-foreground'
              )}
            >
              {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
              
              {isExpanded && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {isLocked && <Lock className="h-3.5 w-3.5 text-gray-500" />}
                  {isBetaItem && (
                    <span className="px-1 py-0.5 text-[9px] font-bold bg-orange-500/20 text-orange-400 rounded">
                      BETA
                    </span>
                  )}
                </>
              )}

              {/* Tooltip when collapsed */}
              {!isExpanded && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-base-900 border border-gray-600 rounded text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg pointer-events-none">
                  {item.label}
                  {isLocked && <Lock className="inline h-3 w-3 ml-1 text-gray-500" />}
                  {isBetaItem && (
                    <span className="ml-1 px-1 py-0.5 text-[9px] font-bold bg-orange-500/20 text-orange-400 rounded">
                      BETA
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};