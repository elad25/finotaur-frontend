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
  PieChart,
  Activity,
  Shuffle,
  Brain,
  Play
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

// 🔥 הגדרת סוגי סביבות
type EnvironmentType = 'journal' | 'backtest' | 'admin';

// 🔥 הגדרת תפריטים שונים לכל סביבה - לפי המסלולים ב-App.tsx
const ENVIRONMENT_MENUS: Record<EnvironmentType, Array<{
  label: string;
  path: string;
  icon: any;
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
    { label: 'Chart', path: '/app/journal/backtest/Chart', icon: PlusCircle },
    { label: 'Trades Journal', path: '/app/journal/backtest/results', icon: FileText },
    { label: 'My Strategies', path: '/app/journal/backtest/builder', icon: Layers },
    { label: 'Statistics', path: '/app/journal/backtest/analytics', icon: TrendingUp },
    { label: 'Calendar', path: '/app/journal/backtest/data', icon: Calendar },
    { label: 'AI Chat', path: '/app/journal/backtest/ai-insights', icon: Brain },
    { label: 'Prop Firms', path: '/app/journal/backtest/monte-carlo', icon: Shuffle },
    { label: 'Gameplan', path: '/app/journal/backtest/walk-forward', icon: Activity },
    { label: 'Community Blog', path: '/app/journal/backtest/optimization', icon: Calculator },
    { label: 'Academy', path: '/app/journal/backtest/replay', icon: Play },
    { label: 'Settings', path: '/app/journal/settings', icon: Settings },
  ],
  admin: [
    // 🔥 ONLY DASHBOARD - הסרתי את כל השאר
    { label: 'Dashboard', path: '/app/journal/admin', icon: LayoutDashboard },
  ]
};

export const Sidebar = ({ isOpen }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeDomain, isActive } = useDomain();

  // 🔥 זיהוי הסביבה הנוכחית לפי ה-URL
  const getCurrentEnvironment = (): EnvironmentType => {
    if (location.pathname.startsWith('/app/journal/admin')) return 'admin';
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

  return (
    <aside
      className={cn(
        'fixed left-0 top-28 z-30 h-[calc(100vh-7rem)] border-r border-border bg-base-800 transition-transform duration-300 md:sticky md:translate-x-0',
        isOpen ? 'translate-x-0 w-48' : '-translate-x-full md:w-12'
      )}
    >
      <nav className="flex h-full flex-col gap-1 overflow-y-auto p-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              onMouseEnter={() => handlePrefetch(item.path)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth relative',
                active
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