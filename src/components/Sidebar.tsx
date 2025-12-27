import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDomain } from '@/hooks/useDomain';
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
  ChevronRight
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

type EnvironmentType = 'journal' | 'backtest' | 'admin' | 'affiliate' | 'all-markets' | 'macro';

const ENVIRONMENT_MENUS: Record<EnvironmentType, Array<{
  label: string;
  path: string;
  icon: any;
  divider?: boolean;
  locked?: boolean;
}>> = {
  'all-markets': [
    { label: 'Overview', path: '/app/all-markets/overview', icon: LayoutDashboard, locked: true },
    { label: 'Heatmap', path: '/app/all-markets/heatmap', icon: Map, locked: true },
    { label: 'Movers', path: '/app/all-markets/movers', icon: TrendingUp, locked: true },
    { label: 'Sentiment', path: '/app/all-markets/sentiment', icon: Activity, locked: true },
    { label: 'Calendar', path: '/app/all-markets/calendar', icon: Calendar, locked: true },
    { label: 'News', path: '/app/all-markets/news', icon: Newspaper, locked: true },
    { label: 'divider', path: '', icon: null, divider: true },
  ],
  
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
  ]
};

export const Sidebar = ({ isOpen }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isActive } = useDomain();

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

  const getCurrentEnvironment = (): EnvironmentType => {
    if (location.pathname.startsWith('/app/all-markets')) return 'all-markets';
    if (location.pathname.startsWith('/app/macro')) return 'macro';
    if (location.pathname.startsWith('/app/journal/admin')) return 'admin';
    if (location.pathname.startsWith('/app/journal/affiliate')) return 'affiliate';
    if (location.pathname.startsWith('/app/journal/backtest')) return 'backtest';
    if (location.pathname.startsWith('/app/journal')) return 'journal';
    return 'journal';
  };

  const currentEnvironment = getCurrentEnvironment();
  const sidebarItems = ENVIRONMENT_MENUS[currentEnvironment];

  const shouldShowSidebar = 
    location.pathname.startsWith('/app/journal') || 
    location.pathname.startsWith('/app/all-markets') ||
    location.pathname.startsWith('/app/macro');
  
  if (!shouldShowSidebar) {
    return null;
  }

  const handleNavigation = (path: string, isLocked?: boolean) => {
    if (isLocked) return;
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
    if (itemPath === '/app/journal/admin' && location.pathname === '/app/journal/admin') {
      return true;
    }
    if (itemPath === '/app/journal/affiliate/overview' && location.pathname === '/app/journal/affiliate/overview') {
      return true;
    }
    if (itemPath === '/app/all-markets/overview' && location.pathname === '/app/all-markets/overview') {
      return true;
    }
    if (itemPath === '/app/macro/overview' && location.pathname === '/app/macro/overview') {
      return true;
    }
    if (location.pathname === itemPath) {
      return true;
    }
    if (itemPath !== '/app/journal/admin' && 
        itemPath !== '/app/journal/affiliate/overview' && 
        itemPath !== '/app/all-markets/overview' &&
        itemPath !== '/app/macro/overview' &&
        location.pathname.startsWith(itemPath) && 
        itemPath.length > 10) {
      return true;
    }
    return isActive(itemPath);
  };

  const getEnvironmentHeader = () => {
    if (currentEnvironment === 'admin') {
      return { show: true, icon: Shield, label: 'Admin Panel', bgColor: 'bg-[#D4AF37]/5', textColor: 'text-[#D4AF37]' };
    }
    if (currentEnvironment === 'affiliate') {
      return { show: true, icon: Award, label: 'Affiliate Center', bgColor: 'bg-[#C9A646]/5', textColor: 'text-[#C9A646]' };
    }
    if (currentEnvironment === 'all-markets') {
      return { show: true, icon: LayoutDashboard, label: 'All Markets', bgColor: 'bg-blue-500/5', textColor: 'text-blue-400' };
    }
    if (currentEnvironment === 'macro') {
      return { show: true, icon: Globe, label: 'Macro & News', bgColor: 'bg-emerald-500/5', textColor: 'text-emerald-400' };
    }
    return { show: false };
  };

  const envHeader = getEnvironmentHeader();

  return (
    <aside
      className={cn(
        'fixed left-0 top-28 z-30 h-[calc(100vh-7rem)] border-r border-border bg-base-800 transition-all duration-300 ease-in-out md:sticky md:translate-x-0',
        isExpanded ? 'w-48' : 'w-[60px]'
      )}
    >
      {/* 🔥 לשונית זהב יוקרתית ועדינה */}
      <div
        onClick={handleToggle}
        className="absolute top-1/2 -translate-y-1/2 -right-[14px] z-50 cursor-pointer group"
      >
        <div 
          className={cn(
            "relative flex items-center justify-center",
            "w-[14px] h-20",
            "bg-gradient-to-b from-[#D4AF37]/20 via-[#C9A646]/15 to-[#D4AF37]/20",
            "border border-l-0 border-[#D4AF37]/30",
            "rounded-r-md",
            "transition-all duration-300",
            "hover:from-[#D4AF37]/30 hover:via-[#C9A646]/25 hover:to-[#D4AF37]/30",
            "hover:border-[#D4AF37]/50"
          )}
        >
          {isExpanded ? (
            <ChevronLeft className="h-3.5 w-3.5 text-[#D4AF37]/70 group-hover:text-[#D4AF37] transition-colors" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[#D4AF37]/70 group-hover:text-[#D4AF37] transition-colors" />
          )}
        </div>
      </div>

      {/* 🏷️ Environment Header Badge */}
      {envHeader.show && (
        <div className={cn("px-3 py-2 border-b border-gray-700", envHeader.bgColor)}>
          <div className={cn("flex items-center gap-2", envHeader.textColor)}>
            {envHeader.icon && <envHeader.icon className="w-4 h-4 flex-shrink-0" />}
            {isExpanded && (
              <span className="text-xs font-semibold uppercase tracking-wider truncate">
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
          const isBackButton = item.path === '/app/journal/overview' && (currentEnvironment === 'admin' || currentEnvironment === 'affiliate');
          const isWarZone = item.path === '/app/all-markets/warzone';
          const isLocked = item.locked === true;
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path, isLocked)}
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
                </>
              )}

              {/* Tooltip כשמכווץ */}
              {!isExpanded && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-base-900 border border-gray-600 rounded text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg pointer-events-none">
                  {item.label}
                  {isLocked && <Lock className="inline h-3 w-3 ml-1 text-gray-500" />}
                </div>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};