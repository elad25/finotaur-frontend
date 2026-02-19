// src/components/TopNav.tsx
// =====================================================
// FINOTAUR TOP NAVIGATION - v3.0.0 (BETA ACCESS)
// =====================================================
// 
// 🔥 v3.0.0 CHANGES:
// - ADDED: Beta access system - admins can access locked domains
// - ADDED: useAdminAuth hook for hasBetaAccess check
// 
// 🔥 v2.3.0 CHANGES:
// - UNLOCKED: Settings menu item (now navigates to /app/settings)
// 
// 🔥 v2.2.0 CHANGES:
// - LOCKED: Search functionality (Coming Soon)
// - LOCKED: Upgrade menu item (Coming Soon)
// 
// 🔥 v2.0.2 CHANGES:
// - FIXED: Logo now navigates to /app/top-secret
// =====================================================

import { Search, User, Lock, Settings, Crown, LogOut, ChevronDown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useEffect, useState } from 'react';
import { domains, domainOrder } from '@/constants/nav';
import { useDomain } from '@/hooks/useDomain';
import { useAuth } from '@/providers/AuthProvider';
import { useAdminAuth } from '@/hooks/useAdminAuth';  // 🔥 NEW
import { supabase } from '@/lib/supabase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ✅ קומפוננטת החיפוש (disabled for now)
// import QuickSearch from '@/components/Search/QuickSearch';

export const TopNav = () => {
  const navigate = useNavigate();
  const { domainId } = useDomain();
  const { user } = useAuth();
  const { hasBetaAccess, isAdmin } = useAdminAuth();  // 🔥 NEW: Beta access check
  const [userInitials, setUserInitials] = useState('U');
  const [platformPlan, setPlatformPlan] = useState<string | null>(null);

  // 🔒 Search is LOCKED - no keyboard shortcut
  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
  //       e.preventDefault();
  //       setSearchOpen(true);
  //     }
  //   };
  //   window.addEventListener('keydown', handleKeyDown);
  //   return () => window.removeEventListener('keydown', handleKeyDown);
  // }, []);

  // ✅ Get user initials and platform plan
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;

      try {
        // 🔥 FIXED: Changed first_name, last_name to display_name
        const { data } = await supabase
          .from('profiles')
          .select('display_name, platform_plan')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          // Build initials from display_name
          const displayName = data.display_name || '';
          const nameParts = displayName.trim().split(' ');
          
          if (nameParts.length >= 2) {
            // First letter of first name + first letter of last name
            setUserInitials((nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase());
          } else if (nameParts.length === 1 && nameParts[0]) {
            // Just first letter of single name
            setUserInitials(nameParts[0][0].toUpperCase());
          } else if (user.email) {
            // Fallback to email
            setUserInitials(user.email[0].toUpperCase());
          }
          
          // Platform plan
          setPlatformPlan(data.platform_plan);
        } else if (user.email) {
          setUserInitials(user.email[0].toUpperCase());
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback to email initial
        if (user.email) {
          setUserInitials(user.email[0].toUpperCase());
        }
      }
    };

    fetchUserData();
  }, [user]);

  const handleTabClick = (id: string) => {
    const domain = domains[id];
    
    // 🔥 BETA ACCESS: Allow navigation to locked domains for beta users
    if (domain?.locked && !hasBetaAccess) {
      return;
    }
    
    if (domain?.defaultPath) {
      navigate(domain.defaultPath);
      return;
    }
    
    if (domain?.subNav[0]) {
      navigate(domain.subNav[0].path);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // ✅ Get plan badge color
  const getPlanBadge = () => {
    if (!platformPlan || platformPlan === 'free') return null;
    
    const colors: Record<string, string> = {
      core: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      pro: 'bg-[#C9A646]/20 text-[#C9A646] border-[#C9A646]/40',
      enterprise: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    };
    
    return colors[platformPlan] || null;
  };

  const planBadgeClass = getPlanBadge();

  return (
    <div 
      className="sticky top-0 z-[100] border-b"
      style={{ 
        borderColor: 'rgba(255, 215, 0, 0.08)',
        backgroundColor: '#0A0A0A'
      }}
    >
      <div className="flex h-16 items-center justify-between px-6 lg:px-10">
        {/* Logo - 🔥 NOW NAVIGATES TO TOP SECRET */}
        <div className="flex items-center gap-6 lg:gap-8">
          <button 
            onClick={() => navigate('/app/top-secret')}
            className="flex items-center group cursor-pointer"
          >
            <span className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-white group-hover:text-slate-300 transition-colors">FINO</span>
              <span className="text-[#C9A646] group-hover:text-[#D4AF37] transition-colors">TAUR</span>
            </span>
          </button>

          {/* Main Tabs - Desktop */}
          <nav className="hidden items-center gap-0.5 lg:flex">
            {domainOrder.map((id) => {
              const domain = domains[id];
              const isActive = domainId === id;
              const isBetaDomain = domain?.beta === true;
              
              // 🔥 BETA ACCESS: Override locked status for beta users
              const locked = domain?.locked && !hasBetaAccess;
              
              // 🔥 Hide beta domains from non-beta users
              if (isBetaDomain && !hasBetaAccess) {
                return null;
              }

              return (
                <button
                  key={id}
                  onClick={() => handleTabClick(id)}
                  disabled={locked}
                  className={`group relative rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all duration-300 ${
                    locked
                      ? 'cursor-not-allowed opacity-40 text-[#A0A0A0] hover:bg-[#1A1A1A]/50'
                      : isBetaDomain
                      ? isActive
                        ? 'bg-orange-500/10 text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.15)]'
                        : 'text-orange-400/70 hover:bg-orange-500/10 hover:text-orange-400'
                      : isActive
                      ? 'bg-[#C9A646]/10 text-[#C9A646] shadow-[0_0_12px_rgba(201,166,70,0.15)]'
                      : 'text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-[#F4F4F4]'
                  }`}
                  title={locked ? 'Coming Soon' : isBetaDomain ? 'Beta Feature' : undefined}
                  style={isActive && !locked ? { 
                    borderBottom: isBetaDomain ? '2px solid #f97316' : '2px solid #C9A646' 
                  } : {}}
                >
                  <span className="flex flex-col items-center gap-0.5 whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      {domain.label}
                      {isBetaDomain && (
                        <span className="px-1 py-0.5 text-[8px] font-bold bg-orange-500/20 text-orange-400 rounded">
                          BETA
                        </span>
                      )}
                    </span>
                    {locked && <Lock className="h-2.5 w-2.5 opacity-60" />}
                  </span>
                  
                  {locked && (
                    <span 
                      className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-50"
                      style={{ 
                        background: '#0A0A0A',
                        border: '1px solid rgba(201,166,70,0.2)',
                        color: '#A0A0A0'
                      }}
                    >
                      Coming Soon
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* ═══════════════════════════════════════════
              🔒 SEARCH - LOCKED (Coming Soon) - Unless Beta
          ═══════════════════════════════════════════ */}
          <div className="relative hidden md:block group">
            <Search className={`absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A0A0A0] ${hasBetaAccess ? '' : 'opacity-40'}`} />
            <Input
              placeholder="Search..."
              className={`w-40 lg:w-48 pl-8 pr-12 text-xs h-9 ${hasBetaAccess ? '' : 'cursor-not-allowed opacity-50'}`}
              style={{
                background: 'rgba(20,20,20,0.6)',
                border: '1px solid rgba(255, 215, 0, 0.08)',
                color: '#A0A0A0'
              }}
              readOnly={!hasBetaAccess}
              disabled={!hasBetaAccess}
            />
            {/* Coming Soon indicator - Only show for non-beta users */}
            {!hasBetaAccess && (
              <span 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#A0A0A0]/60 font-medium px-1.5 py-0.5 rounded border border-[#A0A0A0]/20 flex items-center gap-1"
                style={{ background: 'rgba(30,30,30,0.8)' }}
              >
                <Lock className="w-2.5 h-2.5" />
              </span>
            )}
            {/* Tooltip */}
            {!hasBetaAccess && (
              <span 
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-50"
                style={{ 
                  background: '#0A0A0A',
                  border: '1px solid rgba(201,166,70,0.2)',
                  color: '#A0A0A0'
                }}
              >
                Coming Soon
              </span>
            )}
          </div>

          {/* Mobile Search Button - LOCKED unless beta 🔒 */}
          <Button
            variant="ghost"
            size="icon"
            className={`md:hidden hover:bg-[#1A1A1A] ${hasBetaAccess ? '' : 'opacity-40 cursor-not-allowed'}`}
            disabled={!hasBetaAccess}
          >
            <Search className="h-5 w-5 text-[#A0A0A0]" />
          </Button>

          {/* ═══════════════════════════════════════════
              🔥 USER MENU - Settings UNLOCKED
          ═══════════════════════════════════════════ */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 rounded-full hover:bg-[#1A1A1A] px-2 py-1"
              >
                {/* User Avatar/Initials */}
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{
                    background: hasBetaAccess 
                      ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' 
                      : 'linear-gradient(135deg, #C9A646 0%, #8B7355 100%)',
                    color: '#000'
                  }}
                >
                  {userInitials}
                </div>
                
                {/* Plan Badge (Desktop only) */}
                {planBadgeClass && (
                  <span className={`hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${planBadgeClass}`}>
                    <Crown className="w-3 h-3" />
                    {platformPlan?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                )}
                
                <ChevronDown className="w-4 h-4 text-[#A0A0A0]" />
              </Button>
            </DropdownMenuTrigger>
<DropdownMenuContent 
  align="end" 
  className="w-56 bg-[#0F0F0F] border border-[#C9A646]/20 z-[150]"
>
              {/* User Info */}
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.email || 'User'}
                  </p>
                  {hasBetaAccess ? (
                    <p className="text-xs text-orange-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Beta Access
                    </p>
                  ) : platformPlan && platformPlan !== 'free' ? (
                    <p className="text-xs text-[#C9A646] flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      {platformPlan.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Plan
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500">Free Plan</p>
                  )}
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-[#C9A646]/10" />

              {/* ✅ Upgrade - UNLOCKED */}
              <DropdownMenuItem 
                onClick={() => navigate('/app/all-markets/pricing')}
                className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800"
              >
                <Crown className="mr-2 h-4 w-4 text-[#C9A646]" />
                <span className="text-white">Upgrade</span>
              </DropdownMenuItem>

              {/* ✅ Settings - UNLOCKED */}
              <DropdownMenuItem 
                onClick={() => navigate('/app/settings')}
                className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800"
              >
                <Settings className="mr-2 h-4 w-4 text-zinc-400" />
                <span className="text-white">Settings</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-[#C9A646]/10" />

              {/* Logout - Still Active */}
              <DropdownMenuItem 
                onClick={handleLogout}
                className="cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 text-red-400"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Tabs - Scrollable */}
      <div className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden scrollbar-hide">
        {domainOrder.map((id) => {
          const domain = domains[id];
          const isActive = domainId === id;
          const isBetaDomain = domain?.beta === true;
          
          // 🔥 BETA ACCESS: Override locked status for beta users
          const locked = domain?.locked && !hasBetaAccess;
          
          // 🔥 Hide beta domains from non-beta users
          if (isBetaDomain && !hasBetaAccess) {
            return null;
          }

          return (
            <button
              key={id}
              onClick={() => handleTabClick(id)}
              disabled={locked}
              className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300 flex items-center gap-1.5 ${
                locked
                  ? 'cursor-not-allowed opacity-40 text-[#A0A0A0]'
                  : isBetaDomain
                  ? isActive
                    ? 'bg-orange-500/10 text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.15)]'
                    : 'text-orange-400/70 hover:bg-orange-500/10 hover:text-orange-400'
                  : isActive
                  ? 'bg-[#C9A646]/10 text-[#C9A646] shadow-[0_0_12px_rgba(201,166,70,0.15)]'
                  : 'text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-[#F4F4F4]'
              }`}
            >
              {domain.label}
              {isBetaDomain && (
                <span className="px-1 py-0.5 text-[8px] font-bold bg-orange-500/20 text-orange-400 rounded">
                  BETA
                </span>
              )}
              {locked && <Lock className="h-3 w-3 opacity-60" />}
            </button>
          );
        })}
      </div>

      {/* 🔒 Search Modal - DISABLED */}
      {/* <QuickSearch open={searchOpen} onClose={() => setSearchOpen(false)} /> */}
    </div>
  );
};

export default TopNav;