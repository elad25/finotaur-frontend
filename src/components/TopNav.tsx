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
import { SubscriptionBadge } from '@/components/nav/SubscriptionBadge';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Button as DSButton } from '@/components/ds/Button';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/lib/supabase';
import { Wordmark } from '@/components/ds/Wordmark';
import { GlobalOmnibox } from '@/components/GlobalOmnibox';
import PromoOfferChip from '@/components/PromoOfferChip';
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
  const [accountType, setAccountType] = useState<string | null>(null);

  // Get platform plan + journal tier for the subscription badge
  const fetchUserData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('platform_plan, account_type')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setPlatformPlan(data.platform_plan);
        setAccountType(data.account_type);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, [user?.id]);

  // Initial load + refresh whenever the user returns to the tab, so a tier
  // change made elsewhere (e.g. right after checkout) shows up without a reload.
  useEffect(() => {
    fetchUserData();
    const onFocus = () => fetchUserData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchUserData]);

  // After returning from Whop checkout (?payment=success), the webhook that
  // assigns the new tier is processed asynchronously — poll a few times so the
  // badge reflects the new subscription without a manual reload.
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('payment')) return;
    const timers = [0, 3000, 8000, 15000].map((delay) =>
      setTimeout(() => { fetchUserData(); }, delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [location.search, fetchUserData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };


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

          {/* 🎁 Promo offer chip — JOIN2026. ml-auto pushes it to the right
              of the left column (toward the centered search), with a margin
              so it sits a touch left of the omnibox rather than flush. */}
          <PromoOfferChip className="ml-auto mr-8 lg:mr-20" />
        </div>

        {/* ── CENTER: GlobalOmnibox — truly viewport-centered ── */}
        <div className="flex items-center justify-center w-full max-w-xl lg:max-w-2xl px-3">
          <GlobalOmnibox />
        </div>

        {/* ── RIGHT: Upgrade · Ask Fino · user menu ────────────── */}
        <div className="flex items-center gap-2 justify-end flex-shrink-0">

          {/* Subscription tier badge */}
          <div className="hidden md:flex items-center">
            <SubscriptionBadge platformPlan={platformPlan} accountType={accountType} />
          </div>

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
                  className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center ring-1 ring-white/20"
                  style={{
                    background: 'linear-gradient(135deg, #5DBFEF 0%, #1B86CF 50%, #075A9C 100%)',
                    color: '#fff',
                    boxShadow:
                      'inset 0 1px 1.5px rgba(255,255,255,0.45), 0 2px 10px rgba(20,120,200,0.45)',
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                    className="!w-9 !h-9"
                  >
                    <ellipse cx="12" cy="8.5" rx="4.1" ry="4.6" />
                    <path d="M12 14c-5 0-9 3-9 6.7V22h18v-1.3c0-3.7-4-6.7-9-6.7z" />
                  </svg>
                </div>

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
