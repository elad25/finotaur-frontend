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
  // 🔐 Admin Icons
  Gift,
  Trophy,
  CreditCard,
  HeadphonesIcon,
  ArrowLeft,
  Shield,
  // 🤝 Affiliate Icons
  UserPlus,
  DollarSign,
  Wallet,
  Link,
  Award
} from 'lucide-react';
import { 
  prefetchSettingsData, 
  prefetchAnalytics, 
  prefetchStrategies,
  prefetchTrades,
  prefetchUserProfile
} from '@/lib/queryClient';

interface SidebarProps {
  isOpen: boolean;
}

// 🔥 הגדרת סוגי סביבות - הוספת affiliate!
type EnvironmentType = 'journal' | 'backtest' | 'admin' | 'affiliate';

// 🔥 הגדרת תפריטים שונים לכל סביבה
const ENVIRONMENT_MENUS: Record<EnvironmentType, Array<{
  label: string;
  path: string;
  icon: any;
  divider?: boolean;
}>> = {
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
  // 🔐 ADMIN
  admin: [
    { label: 'Dashboard', path: '/app/journal/admin', icon: LayoutDashboard },
    { label: 'Users', path: '/app/journal/admin/users', icon: Users },
    { label: 'Analytics', path: '/app/journal/admin/analytics', icon: BarChart3 },
    { label: 'Subscribers', path: '/app/journal/admin/subscribers', icon: CreditCard },
    { label: 'Support', path: '/app/journal/admin/support', icon: HeadphonesIcon },
    { label: 'Affiliate', path: '/app/journal/admin/affiliate', icon: Gift },
    { label: 'Top Traders', path: '/app/journal/admin/top-traders', icon: Trophy },
    { label: 'divider', path: '', icon: null, divider: true },
    { label: 'Back to Journal', path: '/app/journal/overview', icon: ArrowLeft },
  ],
  // 🤝 AFFILIATE CENTER - NEW!
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

  // 🔥 זיהוי הסביבה הנוכחית לפי ה-URL - הוספת affiliate!
  const getCurrentEnvironment = (): EnvironmentType => {
    if (location.pathname.startsWith('/app/journal/admin')) return 'admin';
    if (location.pathname.startsWith('/app/journal/affiliate')) return 'affiliate'; // 🤝 NEW!
    if (location.pathname.startsWith('/app/journal/backtest')) return 'backtest';
    return 'journal';
  };

  const currentEnvironment = getCurrentEnvironment();
  const sidebarItems = ENVIRONMENT_MENUS[currentEnvironment];

  // ✅ הצג את ה-Sidebar רק בסקשנים הרלוונטיים
  const shouldShowSidebar = location.pathname.startsWith('/app/journal');
  
  if (!shouldShowSidebar) {
    return null;
  }

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // 🔥 Prefetch רק עבור Journal
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

  // 🔐 בדיקה אם פריט אקטיבי
  const isItemActive = (itemPath: string): boolean => {
    // בדיקה מדויקת לדפים ראשיים
    if (itemPath === '/app/journal/admin' && location.pathname === '/app/journal/admin') {
      return true;
    }
    if (itemPath === '/app/journal/affiliate/overview' && location.pathname === '/app/journal/affiliate/overview') {
      return true;
    }
    // בדיקה לשאר הדפים
    if (itemPath !== '/app/journal/admin' && itemPath !== '/app/journal/affiliate/overview' && location.pathname.startsWith(itemPath)) {
      return true;
    }
    return isActive(itemPath);
  };

  // 🎨 קביעת צבע ה-Header לפי סביבה
  const getEnvironmentHeader = () => {
    if (currentEnvironment === 'admin') {
      return {
        show: true,
        icon: Shield,
        label: 'Admin Panel',
        bgColor: 'bg-[#D4AF37]/5',
        textColor: 'text-[#D4AF37]'
      };
    }
    if (currentEnvironment === 'affiliate') {
      return {
        show: true,
        icon: Award,
        label: 'Affiliate Center',
        bgColor: 'bg-[#C9A646]/5',
        textColor: 'text-[#C9A646]'
      };
    }
    return { show: false };
  };

  const envHeader = getEnvironmentHeader();

  return (
    <aside
      className={cn(
        'fixed left-0 top-28 z-30 h-[calc(100vh-7rem)] border-r border-border bg-base-800 transition-transform duration-300 md:sticky md:translate-x-0',
        isOpen ? 'translate-x-0 w-48' : '-translate-x-full md:w-12'
      )}
    >
      {/* 🏷️ Environment Header Badge */}
      {envHeader.show && isOpen && (
        <div className={cn("px-3 py-2 border-b border-gray-700", envHeader.bgColor)}>
          <div className={cn("flex items-center gap-2", envHeader.textColor)}>
            {envHeader.icon && <envHeader.icon className="w-4 h-4" />}
            <span className="text-xs font-semibold uppercase tracking-wider">{envHeader.label}</span>
          </div>
        </div>
      )}

      <nav className="flex h-full flex-col gap-1 overflow-y-auto p-2">
        {sidebarItems.map((item, index) => {
          // 🆕 קו הפרדה
          if (item.divider) {
            return (
              <div 
                key={`divider-${index}`} 
                className="my-2 border-t border-gray-700"
              />
            );
          }

          const Icon = item.icon;
          const active = isItemActive(item.path);
          const isBackButton = item.path === '/app/journal/overview' && (currentEnvironment === 'admin' || currentEnvironment === 'affiliate');
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              onMouseEnter={() => handlePrefetch(item.path)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth relative',
                // סגנון מיוחד לכפתור חזרה
                isBackButton
                  ? 'text-gray-400 hover:bg-base-700 hover:text-white'
                  : active
                    ? 'border-l-2 border-gold bg-gold/10 text-gold'
                    : 'text-muted-foreground hover:bg-base-700 hover:text-foreground'
              )}
            >
              {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
              {isOpen && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};