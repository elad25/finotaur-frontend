import { useNavigate, useLocation } from 'react-router-dom';
import { useDomain } from '@/hooks/useDomain';
import { cn } from '@/lib/utils';
import { Building } from 'lucide-react'; // 🏢 Icon for Prop Firms
// 🔥 ייבא את כל פונקציות ה-prefetch מ-queryClient
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

export const Sidebar = ({ isOpen }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeDomain, isActive } = useDomain();

  // ✅ FIXED: Only show sidebar in Journal section
  const isJournalSection = location.pathname.startsWith('/app/journal');
  
  if (!isJournalSection) {
    return null;
  }

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // 🔥 OPTIMIZED: Map paths to prefetch functions (using centralized functions)
  const getPrefetchFunction = (path: string): (() => Promise<void>) | undefined => {
    const prefetchMap: Record<string, () => Promise<void>> = {
      '/app/journal/settings': prefetchSettingsData,
      '/app/journal/analytics': prefetchAnalytics,
      '/app/journal/strategies': prefetchStrategies,
      '/app/journal/my-trades': prefetchTrades,
      '/app/journal/performance': prefetchUserProfile,
    };
    
    return prefetchMap[path];
  };

  // 🔥 Safe prefetch with error handling
  const handlePrefetch = async (path: string) => {
    const prefetchFn = getPrefetchFunction(path);
    if (prefetchFn) {
      try {
        await prefetchFn();
      } catch (error) {
        // Silent fail - prefetch is optional, don't break UX
        console.debug(`Prefetch failed for ${path}`, error);
      }
    }
  };

  // 🔥 FIX: Ensure Prop Firms is in the correct position
  const sidebarItems = [...activeDomain.sidebar];
  
  // Find if Prop Firms exists
  const propFirmsIndex = sidebarItems.findIndex(item => item.path === '/app/journal/prop-firms');
  const aiChatIndex = sidebarItems.findIndex(item => item.path === '/app/journal/ai-review');
  
  // If Prop Firms exists but is not right after AI Chat, move it
  if (propFirmsIndex !== -1 && aiChatIndex !== -1 && propFirmsIndex !== aiChatIndex + 1) {
    const [propFirmsItem] = sidebarItems.splice(propFirmsIndex, 1);
    sidebarItems.splice(aiChatIndex + 1, 0, propFirmsItem);
  }
  
  // If Prop Firms doesn't exist at all, add it after AI Chat
  if (propFirmsIndex === -1 && aiChatIndex !== -1) {
    sidebarItems.splice(aiChatIndex + 1, 0, {
      label: 'Prop Firms',
      path: '/app/journal/prop-firms',
      icon: Building
    });
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-28 z-30 h-[calc(100vh-7rem)] border-r border-border bg-base-800 transition-transform duration-300 md:sticky md:translate-x-0',
        // ✂️ קיצור רוחב ב-25%: w-64 (256px) → w-48 (192px) כשפתוח, w-16 (64px) → w-12 (48px) כשסגור
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
              onMouseEnter={() => handlePrefetch(item.path)} // 🔥 Safe prefetch on hover
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