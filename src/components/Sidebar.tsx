// src/components/Sidebar.tsx
// =====================================================
// נ”¥ v2.0: BETA ACCESS SYSTEM
// =====================================================
// Admins/VIPs with hasBetaAccess can see and access ALL locked items
// =====================================================

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDomain } from '@/hooks/useDomain';
import { useAdminAuth } from '@/hooks/useAdminAuth';  // נ”¥ NEW
import { cn } from '@/lib/utils';
import { FEATURES } from '@/config/features';
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
  Copy, 
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
  Sparkles,  // נ”¥ For beta items
  Link2
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
  | 'ai-copilot'
  | 'copy-trade'
  | 'funding'
  | 'settings'
  | 'connections';

const ENVIRONMENT_MENUS: Record<EnvironmentType, Array<{
  label: string;
  path: string;
  icon: any;
  divider?: boolean;
  locked?: boolean;
  beta?: boolean;  // נ”¥ NEW
  children?: Array<{
    label: string;
    path: string;
    icon: any;
    beta?: boolean;
  }>;
}>> = {
  // ===============================================
  // נ ALL MARKETS - נ”’ LOCKED
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
  // נ“ˆ STOCKS
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
    { label: 'Open Interests', path: '/app/futures/open-interests', icon: BarChart3 },
    { label: 'Calendar', path: '/app/futures/calendar', icon: Calendar },
  ],

  // ===============================================
  // נ’± FOREX
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

  'ai': [
    { label: 'Stock Analyzer', path: '/app/ai/stock-analyzer', icon: TrendingUp },
    { label: 'Sector Analyzer', path: '/app/ai/sector-analyzer', icon: Target },
    { label: 'Macro Analyzer', path: '/app/ai/macro-analyzer', icon: Globe },
    { label: 'Options Intelligence', path: '/app/ai/options-intelligence', icon: Layers },
    { label: 'Flow Scanner', path: '/app/ai/flow-scanner', icon: Search },
    { label: 'Top 5', path: '/app/ai/top-5', icon: Award },
    { label: 'AI Assistant', path: '/app/ai/assistant', icon: MessageSquare },
  ],

  'ai-copilot': [
    { label: 'FINOTAUR Copilot', path: '/app/ai/copilot', icon: LayoutDashboard, beta: true },
    { label: 'Top Opportunities', path: '/app/ai/copilot/top-opportunities', icon: Zap, beta: true },
    { label: 'Macro', path: '/app/ai/copilot/macro', icon: Globe, beta: true },
    { label: 'Holdings', path: '/app/ai/copilot/holdings', icon: Layers, beta: true },
    { label: 'Risks', path: '/app/ai/copilot/risks', icon: Shield, beta: true },
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
    { label: 'Statistics', path: '/app/journal/analytics', icon: BarChart3 },
    { label: 'Calendar', path: '/app/journal/calendar', icon: Calendar },
    { label: 'AI Chat', path: '/app/journal/ai-review', icon: MessageSquare },
    { label: 'Prop Firms', path: '/app/journal/prop-firms', icon: Building },
    { label: 'Gameplan', path: '/app/journal/scenarios', icon: Target },
    { label: 'Academy', path: '/app/journal/academy', icon: GraduationCap },
    { label: 'Settings', path: '/app/journal/settings', icon: Settings },
  ],

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

  'copy-trade': [
    { label: 'Connections', path: '/app/copy-trade/overview', icon: Link2, beta: true },
    { label: 'Trade Copier', path: '/app/copy-trade/trade-copier', icon: Copy, beta: true },
    { label: 'Manage Risk', path: '/app/copy-trade/manage-risk', icon: Shield, beta: true },
  ],

  'funding': [
    { label: 'Overview', path: '/app/funding/overview', icon: LayoutDashboard },
    { label: 'Brokers', path: '/app/funding/brokers', icon: Building },
    { label: 'Cash Advance', path: '/app/funding/advance', icon: DollarSign },
    { label: 'Transactions', path: '/app/funding/transactions', icon: FileText },
  ],

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

  settings: [
    { label: 'General', path: '/app/settings', icon: Settings },
    { label: 'Billing', path: '/app/settings/billing', icon: CreditCard },
    { label: 'Usage', path: '/app/settings/usage', icon: Activity },
  ],
};

const sidebarItemBaseClass =
  'relative group flex w-full min-h-[46px] items-center rounded-lg border-l-2 border-transparent py-2.5 text-[13px] font-medium leading-snug transition-all duration-200';
const sidebarItemExpandedClass = 'gap-3 px-3';
const sidebarItemCollapsedClass = 'justify-center px-2';
const sidebarIconClass = 'h-5 w-5 flex-shrink-0';
const sidebarLabelClass = 'flex-1 min-w-0 whitespace-normal break-words leading-snug';
const sidebarBrandLabelClass = 'flex-1 min-w-0 whitespace-normal break-words leading-snug';
const sidebarActiveClass =
  'border-gold-bright bg-gold-primary/20 text-gold-bright shadow-[0_0_22px_rgba(201,166,70,0.22)]';
const sidebarInactiveClass = 'text-ink-secondary hover:bg-gold-primary/10 hover:text-gold-bright';

export const Sidebar = ({ isOpen }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isActive } = useDomain();
  const { isAdmin, hasBetaAccess } = useAdminAuth();  // נ”¥ NEW: Beta access check

  const [isExpanded, setIsExpanded] = useState(() => {
    // Auto-collapse sidebar on AI Assistant page
    if (window.location.pathname.startsWith('/app/ai/assistant')) {
      return false;
    }
    const saved = localStorage.getItem('finotaur-sidebar-expanded');
    return saved !== 'false';
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Auto-collapse on AI Assistant, restore on other pages
  useEffect(() => {
    if (location.pathname.startsWith('/app/ai/assistant')) {
      setIsExpanded(false);
    } else {
      const saved = localStorage.getItem('finotaur-sidebar-expanded');
      setIsExpanded(saved !== 'false');
    }
  }, [location.pathname]);

  const handleToggle = () => {
    setIsExpanded(prev => {
      const newValue = !prev;
      localStorage.setItem('finotaur-sidebar-expanded', String(newValue));
      return newValue;
    });
  };

  // ===============================================
  // נ” DETECT CURRENT ENVIRONMENT
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
    if (path.startsWith('/app/ai/copilot')) return 'ai-copilot';
    if (path.startsWith('/app/ai')) return 'ai';
    if (path.startsWith('/app/copy-trade')) return 'copy-trade';
    if (path.startsWith('/app/funding')) return 'funding';
    if (path.startsWith('/app/connections')) return 'connections';
    if (path.startsWith('/app/journal')) return 'journal';
    
    // Default
    return 'journal';
  };

  const currentEnvironment = getCurrentEnvironment();
  const sidebarItems = ENVIRONMENT_MENUS[currentEnvironment];
  const sidebarTopClass = 'top-28 h-[calc(100vh-7rem)]';

  // ===============================================
  // נ¯ SHOW SIDEBAR FOR ALL APP ROUTES
  // ===============================================
  const shouldShowSidebar = location.pathname.startsWith('/app/');
  
  // ===============================================
  // נ”¥ HIDE SIDEBAR FOR SPECIFIC PAGES
  // ===============================================
  const hideSidebarPaths = [
    '/app/all-markets/warzone',
    '/app/top-secret',
  ];
  
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

    if (itemPath === '/app/ai/copilot') {
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
    <aside
      className={cn(
        'fixed left-0 z-30 border-r border-border bg-base-800 transition-all duration-300 ease-in-out md:sticky md:translate-x-0',
        sidebarTopClass,
        isExpanded ? 'w-56' : 'w-[60px]'
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
          {isExpanded ? (
            <ChevronLeft className="h-3.5 w-3.5 text-[#C9A646]/50 group-hover:text-[#C9A646] transition-colors duration-300" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[#C9A646]/50 group-hover:text-[#C9A646] transition-colors duration-300" />
          )}
        </div>
      </div>

      <nav className="flex h-full flex-col gap-1 overflow-y-auto p-2">
        {sidebarItems.map((item, index) => {
          if (item.divider) {
            return <div key={`divider-${index}`} className="my-2 border-t border-gray-700" />;
          }

          const Icon = item.icon;
          const active = isItemActive(item.path);
          const isBackButton = item.label === 'Back to Journal';
          const isBetaItem = item.beta === true;
          const isCopilotItem = item.path === '/app/ai/copilot';
          const showBetaBadge = isBetaItem && !isCopilotItem;
          const hasChildren = Boolean(item.children?.length);
          const childrenOpen = isExpanded && hasChildren && openGroups[item.path];
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
                  if (!isExpanded) {
                    setIsExpanded(true);
                    localStorage.setItem('finotaur-sidebar-expanded', 'true');
                    setOpenGroups(prev => ({ ...prev, [item.path]: true }));
                    return;
                  }

                  setOpenGroups(prev => ({ ...prev, [item.path]: !prev[item.path] }));
                  return;
                }
                handleNavigation(item.path, item.locked);
              }}
              onMouseEnter={() => !isLocked && handlePrefetch(item.path)}
              disabled={isLocked}
              title={hasChildren ? (childrenOpen ? 'Hide Copilot pages' : 'Show Copilot pages') : !isExpanded ? item.label : undefined}
              className={cn(
                sidebarItemBaseClass,
                isExpanded ? sidebarItemExpandedClass : sidebarItemCollapsedClass,
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
              
              {isExpanded && (
                <>
                  <span className={item.label === 'FINOTAUR Copilot' ? sidebarBrandLabelClass : sidebarLabelClass}>
                    {item.label === 'FINOTAUR Copilot' ? (
                      <>
                        <span className="bg-gradient-to-b from-gold-bright via-gold-primary to-gold-deep bg-clip-text font-bold tracking-[0.04em] text-transparent">
                          FINOTAUR
                        </span>{' '}
                        <span className="font-semibold text-ink-primary">Copilot</span>
                      </>
                    ) : item.label}
                  </span>
                  {isLocked && <Lock className="h-3.5 w-3.5 text-gray-500" />}
                  {showBetaBadge && (
                    <span className="rounded bg-gold/15 px-1 py-0.5 text-[9px] font-bold text-gold">
                      BETA
                    </span>
                  )}
                  {hasChildren && (
                    <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.12em] text-gold/70">
                      {childrenOpen ? 'Open' : 'Pages'}
                    </span>
                  )}
                </>
              )}

              {/* Tooltip when collapsed */}
              {!isExpanded && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-base-900 border border-gray-600 rounded text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg pointer-events-none">
                  {item.label}
                  {isLocked && <Lock className="inline h-3 w-3 ml-1 text-gray-500" />}
                  {showBetaBadge && (
                    <span className="ml-1 rounded bg-gold/15 px-1 py-0.5 text-[9px] font-bold text-gold">
                      BETA
                    </span>
                  )}
                </div>
              )}
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
                        onClick={() => handleNavigation(child.path)}
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
    </aside>
  );
};
