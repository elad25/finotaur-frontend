// src/components/TopNav.tsx
// =====================================================
// FINOTAUR TOP NAVIGATION - v4.0.0 (HAMBURGER NAV)
// =====================================================
//
// 🔥 v4.0.0 CHANGES:
// - REMOVED: horizontal product tabs (desktop + mobile scrollable strip)
// - REMOVED: AssetSelector from top bar (moved into Markets SubNav)
// - ADDED: ☰ hamburger button (opens ProductDrawer via ProductDrawerContext)
// - EXPANDED: GlobalOmnibox takes more horizontal space
//
// Layout (left→right):
//   Logo · ☰ hamburger · GlobalOmnibox · ✨ Upgrade · Ask Fino · User menu
// =====================================================

import { Settings, Crown, LogOut, ChevronDown, Sparkles, Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Button as DSButton } from '@/components/ds/Button';
import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/lib/supabase';
import { Wordmark } from '@/components/ds/Wordmark';
import { GlobalOmnibox } from '@/components/GlobalOmnibox';
import { useFinoChat } from '@/contexts/FinoChatContext';
import { useProductDrawer } from '@/contexts/ProductDrawerContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const TopNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { hasBetaAccess } = useAdminAuth();
  const { open: openFino } = useFinoChat();
  const { toggle: toggleDrawer } = useProductDrawer();
  const [platformPlan, setPlatformPlan] = useState<string | null>(null);

  // Get platform plan
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;

      try {
        const { data } = await supabase
          .from('profiles')
          .select('platform_plan')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          setPlatformPlan(data.platform_plan);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getPlanBadge = () => {
    if (!platformPlan || platformPlan === 'free') return null;

    const colors: Record<string, string> = {
      core:       'bg-blue-500/20 text-blue-400 border-blue-500/40',
      pro:        'bg-[#C9A646]/20 text-[#C9A646] border-[#C9A646]/40',
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
        backgroundColor: '#0A0A0A',
      }}
    >
      {/*
        3-column grid layout:
          col 1 (1fr)  — left cluster: logo + hamburger, left-aligned
          col 2 (auto) — center cluster: omnibox, truly centered in the viewport
          col 3 (1fr)  — right cluster: Upgrade · Ask Fino · user menu, right-aligned

        On < md screens the center column collapses to a compact search icon
        (handled inside GlobalOmnibox via its own mobile overlay).
      */}
      <div className="grid h-16 items-center px-4 lg:px-6"
        style={{ gridTemplateColumns: '1fr auto 1fr' }}
      >

        {/* ── LEFT: Logo + Hamburger ────────────────────────── */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate('/app/home')}
            className="flex items-center cursor-pointer flex-shrink-0"
            aria-label="FINOTAUR home"
          >
            <Wordmark size="nav" interactive />
          </button>

          <button
            type="button"
            onClick={toggleDrawer}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-[#A0A0A0] transition-colors hover:bg-[#1A1A1A] hover:text-[#F4F4F4]"
            aria-label="Open menu"
            data-tour="menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* ── CENTER: GlobalOmnibox — truly viewport-centered ── */}
        <div className="flex items-center justify-center w-full max-w-xl lg:max-w-2xl px-3">
          <GlobalOmnibox />
        </div>

        {/* ── RIGHT: Upgrade · Ask Fino · user menu ────────────── */}
        <div className="flex items-center gap-2 justify-end flex-shrink-0">

          {/* ✨ Upgrade CTA */}
          <DSButton
            variant="gold"
            size="compact"
            showArrow={false}
            onClick={() => navigate('/app/plans')}
            className="hidden lg:inline-flex"
          >
            ✨ Upgrade
          </DSButton>

          {/* Ask Fino — desktop */}
          <button
            type="button"
            onClick={() => openFino({ path: location.pathname, label: 'Ask Fino' })}
            className="hidden lg:flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-[#C9A646] transition-all duration-300 hover:bg-[#C9A646]/10 flex-shrink-0"
            aria-label="Ask FINO AI"
            data-tour="fino"
          >
            <video
              src="/fino/fino-idle-long.mp4"
              poster="/fino/fino-idle-long-poster.png"
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
              className="h-9 w-9 object-contain"
            />
            <span>Ask Fino</span>
          </button>

          {/* Ask Fino — mobile icon */}
          <button
            type="button"
            onClick={() => openFino({ path: location.pathname, label: 'Ask Fino' })}
            className="lg:hidden flex items-center justify-center h-9 w-9 rounded-lg text-[#C9A646] hover:bg-[#C9A646]/10 transition-colors flex-shrink-0"
            aria-label="Ask FINO AI"
          >
            <video
              src="/fino/fino-idle-long.mp4"
              poster="/fino/fino-idle-long-poster.png"
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
              className="h-9 w-9 object-contain"
            />
          </button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 rounded-full hover:bg-[#1A1A1A] px-2 py-1"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                    color: '#fff',
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                    className="w-6 h-6"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M12 13.5c-4.142 0-7.5 2.015-7.5 4.5v1.5h15V18c0-2.485-3.358-4.5-7.5-4.5z" />
                  </svg>
                </div>

                {planBadgeClass && (
                  <span className={`hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${planBadgeClass}`}>
                    <Crown className="w-3 h-3" />
                    {platformPlan?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                )}

                <ChevronDown className="w-4 h-4 text-[#A0A0A0]" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-56 bg-[#0F0F0F] border border-[#C9A646]/20 z-[150]"
            >
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
                      {platformPlan.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Plan
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500">Free Plan</p>
                  )}
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-[#C9A646]/10" />

              <DropdownMenuItem
                onClick={() => navigate('/app/settings?tab=billing')}
                className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800"
              >
                <Crown className="mr-2 h-4 w-4 text-[#C9A646]" />
                <span className="text-white">Plans & Billing</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigate('/app/settings')}
                className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800"
              >
                <Settings className="mr-2 h-4 w-4 text-zinc-400" />
                <span className="text-white">Settings</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-[#C9A646]/10" />

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
    </div>
  );
};

export default TopNav;
