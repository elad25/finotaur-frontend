// src/components/SubNav.tsx
// =====================================================
// 🔥 v4.0: AFFILIATE IN ALL-MARKETS
// =====================================================
// - Affiliate tab added to all-markets subNav
// - Positioned BEFORE Site Dashboard
// - Visible to: affiliates (active), admins
// - Non-affiliates: can see & click → AffiliateSmartPage shows landing
// - Journal active detection: excludes /affiliate path
// =====================================================

import { useNavigate, useLocation } from 'react-router-dom';
import { useDomain } from '@/hooks/useDomain';
import { Lock, Shield, Users, Sparkles } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, useCallback } from 'react';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useBacktestAccess } from '@/hooks/useBacktestAccess';
import { domains } from '@/constants/nav';
import { MarketsAssetTabs } from '@/components/MarketsAssetTabs';
import { isMarketsBlocked } from '@/lib/marketsAccess';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// 🔧 Helper: Check if a table exists (cached)
const tableExistsCache = new Map<string, boolean>();

async function tableExists(tableName: string): Promise<boolean> {
  if (tableExistsCache.has(tableName)) {
    return tableExistsCache.get(tableName)!;
  }

  try {
    const { error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);

    const exists = !error || (error.code !== '42P01' && error.code !== 'PGRST116' && !error.message?.includes('does not exist'));
    
    tableExistsCache.set(tableName, exists);
    return exists;
  } catch {
    tableExistsCache.set(tableName, false);
    return false;
  }
}

export const SubNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeDomain, isActive } = useDomain();
  const { user } = useAuth();
  const { isImpersonating } = useImpersonation();
  const { hasAccess: hasBacktestAccess } = useBacktestAccess();
  const { hasBetaAccess, isAdmin: isAdminFromHook } = useAdminAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);

  // 🔐 Check if user is admin
  useEffect(() => {
    async function checkAdminStatus() {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }

      try {
        const savedImpersonation = localStorage.getItem('impersonation_data');
        let userIdToCheck = user.id;

        if (savedImpersonation) {
          try {
            const data = JSON.parse(savedImpersonation);
            userIdToCheck = data.originalAdminId;
          } catch {
            // ignore
          }
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userIdToCheck)
          .maybeSingle();

        if (!error && data) {
          const isAdminUser = data.role === 'admin' || data.role === 'super_admin';
          setIsAdmin(isAdminUser);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    }

    checkAdminStatus();
  }, [user?.id, isImpersonating]);

  // 🤝 Check if user is an active affiliate
  useEffect(() => {
    async function checkAffiliateStatus() {
      if (!user?.id) {
        setIsAffiliate(false);
        return;
      }

      try {
        const affiliatesTableExists = await tableExists('affiliates');
        
        if (!affiliatesTableExists) {
          setIsAffiliate(false);
          return;
        }

        const { data, error } = await supabase
          .from('affiliates')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (error) {
          if (error.code === '42P01' || error.code === 'PGRST116' || error.code === '406') {
            setIsAffiliate(false);
            return;
          }
          setIsAffiliate(false);
          return;
        }

        setIsAffiliate(!!data);
      } catch (error) {
        console.error('Error checking affiliate status (non-fatal):', error);
        setIsAffiliate(false);
      }
    }

    checkAffiliateStatus();
  }, [user?.id]);

  // 🔒 Check if a path belongs to a locked domain
  const isPathLocked = useCallback((path: string): boolean => {
    if (path.includes('/backtest')) {
      const backtestDomain = domains['journal-backtest'];
      return backtestDomain?.locked === true;
    }
    return false;
  }, []);

  // 🔥 Enhanced active detection
  const isTabActive = useCallback((itemPath: string): boolean => {
    if (location.pathname === itemPath) return true;

    // The Floor tab — active across all /app/floor/* sub-pages
    if (itemPath === '/app/floor/feed') {
      return location.pathname.startsWith('/app/floor');
    }
    // Mentor tab — active across all /app/mentor/* sub-pages
    if (itemPath === '/app/mentor/rooms') {
      return location.pathname.startsWith('/app/mentor');
    }

    if (itemPath === '/app/ai/stock-analyzer') {
      return location.pathname.startsWith('/app/ai') &&
             !location.pathname.startsWith('/app/ai/copilot');
    }

    if (itemPath === '/app/ai/copilot') {
      return location.pathname.startsWith('/app/ai/copilot');
    }
    
    // ADMIN CRM — match anything under /app/admin (unified shell)
    if (itemPath === '/app/admin') {
      return location.pathname === '/app/admin' ||
             location.pathname.startsWith('/app/admin/');
    }
    
    // SUPPORT - Exact matching  
    if (itemPath === '/app/all-markets/admin/support') {
      return location.pathname === '/app/all-markets/admin/support';
    }
    
    // AFFILIATE in all-markets - exact + child paths
    if (itemPath === '/app/all-markets/affiliate') {
      return location.pathname.startsWith('/app/all-markets/affiliate');
    }
    
    // TOP SECRET - Exact matching
    if (itemPath === '/app/top-secret') {
      return location.pathname === '/app/top-secret';
    }
    
    if (itemPath === '/app/top-secret/admin') {
      return location.pathname.startsWith('/app/top-secret/admin');
    }
    
    // Journal tab — must exclude sibling sub-routes that have their own sub-nav entries
    // (backtest / mentor / affiliate / admin / finotaur-ai). Otherwise Journal stays highlighted
    // alongside the actual active sibling tab.
    if (itemPath === '/app/journal/overview' || itemPath === '/app/journal') {
      return location.pathname.startsWith('/app/journal') &&
             !location.pathname.startsWith('/app/journal/backtest') &&
             !location.pathname.startsWith('/app/journal/mentor') &&
             !location.pathname.startsWith('/app/journal/affiliate') &&
             !location.pathname.startsWith('/app/journal/admin') &&
             !location.pathname.startsWith('/app/journal/finotaur-ai');
    }
    
    if (itemPath.includes('/backtest')) {
      return location.pathname.includes('/backtest');
    }
    
    if (itemPath.includes('/affiliate') && !itemPath.includes('/all-markets')) {
      return location.pathname.includes('/affiliate') && 
             !location.pathname.includes('/all-markets/affiliate');
    }
    
    if (itemPath.includes('/admin') && !itemPath.includes('/top-secret')) {
      return location.pathname.includes('/admin') && 
             !location.pathname.includes('/top-secret');
    }
    
    return isActive(itemPath);
  }, [location.pathname, isActive]);

  const handleNavigation = useCallback((path: string, itemLocked?: boolean) => {
    // Admin/beta users can bypass all locks (indicator-only, not access gate).
    const canBypass = hasBetaAccess || isAdminFromHook;

    // 🔥 BETA/ADMIN BYPASS: Allow navigation if user has beta access or is admin
    if (itemLocked && !canBypass) {
      console.log('🔒 Item is locked - Coming Soon:', path);
      return;
    }

    // CO PILOT: opens in a separate browser tab (its own product surface).
    // Auth is shared automatically via Supabase localStorage.
    if (path === '/copilot' || path.startsWith('/copilot/')) {
      if (typeof window !== 'undefined') {
        window.open(path, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    // ADMIN CRM: opens in a separate browser tab — the CRM is a standalone
    // surface that renders without the marketing/trading TopNav + SubNav
    // chrome (see ProtectedAppLayout HIDE_CHROME_ROUTES). Same shared-auth
    // pattern as Copilot above.
    if (path === '/app/admin' || path.startsWith('/app/admin/')) {
      if (typeof window !== 'undefined') {
        window.open(path, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    // BACKTEST LOCKED CHECK
    if (path.includes('/backtest') && isPathLocked(path) && !canBypass) {
      console.log('🔒 Backtest is locked - Coming Soon');
      return;
    }

    // BACKTEST ACCESS CONTROL
    if (path.includes('/backtest')) {
      if (!hasBacktestAccess && !canBypass) {
        navigate('/app/journal/backtest/landing');
        return;
      }
      navigate(path);
      return;
    }

    // AFFILIATE in all-markets: always navigable (smart page handles access internally)
    if (path === '/app/all-markets/affiliate') {
      navigate(path);
      return;
    }

    // AFFILIATE in journal (old paths): still require affiliate/admin
    if (path.includes('/journal/affiliate') && !path.includes('/admin')) {
      if (!isAffiliate && !isAdmin) {
        console.log('🚫 User is not an affiliate, cannot access journal affiliate pages');
        return;
      }
      navigate(path);
      return;
    }
    
    // 🔥 Domain locked check — bypassed for admin/beta
    const isLocked = (activeDomain as any).locked === true && !canBypass;
    
    if (isLocked) {
      return;
    }
    navigate(path);
  }, [navigate, isPathLocked, hasBacktestAccess, isAffiliate, isAdmin, activeDomain, hasBetaAccess, isAdminFromHook]);

  // Filter function to check if item should be shown
  const shouldShowItem = useCallback((item: any): boolean => {
    // Hide admin items during impersonation
    if (isImpersonating && item.adminOnly) {
      return false;
    }
    
    // Hide admin-only items for non-admins
    if (item.adminOnly && !isAdmin) {
      return false;
    }

    // Hide items marked hideForAdmin when user IS admin
    if (item.hideForAdmin && isAdmin) {
      return false;
    }

    // 🤝 Affiliate item in all-markets: visible to everyone (landing shown if not affiliate)
    if ((item as any).affiliateSmartPage) {
      return true;
    }

    // Hide legacy affiliate-only items for non-affiliates (unless admin)
    if (item.affiliateOnly && !isAffiliate && !isAdmin) {
      return false;
    }

    // 🔥 Hide beta items for non-beta users
    if (item.beta && !hasBetaAccess) {
      return false;
    }

    return true;
  }, [isImpersonating, isAdmin, isAffiliate, hasBetaAccess]);

  // Blocked (non-beta) users must not see the Markets asset-tab strip at all —
  // even disabled, it reveals what's inside the gated Markets area. This also
  // covers pages that FALL BACK to the markets domain (e.g. /app/settings).
  // Admin/beta keep the tabs; MARKETS_BETA_ONLY=false reopens for everyone.
  if (activeDomain.id === 'markets' && isMarketsBlocked(hasBetaAccess)) {
    return null;
  }

  return (
    <div
      className="sticky top-16 z-[99] border-b"
      style={{ 
        borderColor: 'rgba(255, 215, 0, 0.08)',
        backgroundColor: '#0F0F0F'
      }}
    >
      <div className="flex h-12 items-center gap-1 overflow-x-auto px-4 lg:px-6 scrollbar-hide">

        {/* Markets product: show asset-class tab row instead of domain subNav */}
        {activeDomain.id === 'markets' ? (
          <MarketsAssetTabs />
        ) : (
        <>
        {activeDomain.subNav
          .filter(shouldShowItem)
          .map((item) => {
            const domainLocked = (activeDomain as any).locked === true;
            const backtestLocked = item.path.includes('/backtest') && isPathLocked(item.path);
            const itemLocked = (item as any).locked === true;
            const isBetaItem = (item as any).beta === true;
            const isAffiliateSmartItem = (item as any).affiliateSmartPage === true;

            // lockedForPublic: true whenever the item is gated — used for the lock ICON (indicator).
            // Admin/beta users still see the icon so they know what is hidden from the public.
            const lockedForPublic = domainLocked || backtestLocked || itemLocked;

            // canBypass: admin/beta can click through even if locked for public.
            const canBypass = hasBetaAccess || isAdminFromHook;

            // locked: drives disabled state + click-blocking (public only).
            const locked = lockedForPublic && !canBypass;
            const active = isTabActive(item.path);

            // Is this the affiliate tab and the user is an active affiliate or admin?
            const isActiveAffiliate = isAffiliateSmartItem && (isAffiliate || isAdmin);
            
            const buttonContent = (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path, itemLocked)}
                disabled={locked}
                data-tour={
                  item.path.includes('top-secret') && !item.path.includes('admin') ? 'top-secret' :
                  item.path.includes('warzone') ? 'warzone' :
                  item.path === '/app/journal/overview' || item.path === '/app/journal' ? 'journal' :
                  item.path.includes('/ai/') ? 'ai' :
                  item.path.includes('/affiliate') ? 'affiliate' :
                  undefined
                }
                className={`relative flex-shrink-0 rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-300 flex items-center gap-1.5 ${
                  locked
                    ? 'cursor-not-allowed opacity-40 text-[#A0A0A0] hover:bg-[#1A1A1A]/50'
                    : isBetaItem
                    ? active
                      ? 'bg-orange-500/10 text-orange-400'
                      : 'text-orange-400/70 hover:bg-orange-500/10 hover:text-orange-400'
                    : active
                    ? 'bg-[#C9A646]/5 text-[#C9A646]'
                    : 'text-[#A0A0A0] hover:bg-[#141414] hover:text-[#F4F4F4]'
                }`}
                style={active && !locked ? { 
                  boxShadow: isBetaItem ? '0 0 6px rgba(249,115,22,0.15)' : '0 0 6px rgba(201,166,70,0.08)',
                  borderBottom: isBetaItem ? '2px solid #f97316' : '2px solid #C9A646'
                } : {}}
              >
                {item.label.startsWith('FINOTAUR ') ? (
                  <span className="relative z-10">
                    <span className="bg-gradient-to-b from-gold-bright via-gold-primary to-gold-deep bg-clip-text font-bold tracking-[0.04em] text-transparent">
                      FINOTAUR
                    </span>{' '}
                    <span className="font-semibold text-ink-primary">{item.label.slice('FINOTAUR '.length)}</span>
                  </span>
                ) : item.label}
                {/* Lock icon: shown for ALL users when item is gated.
                    Admin/beta can still click (not disabled) — the icon is an indicator only.
                    For admin bypass: slightly dimmer + tooltip "Hidden from public — admin view". */}
                {lockedForPublic && !locked && (
                  <Lock
                    className="h-3 w-3 flex-shrink-0"
                    style={{ color: 'rgba(201,166,70,0.55)' }}
                    title="Locked for regular users — admin view"
                    aria-label="Locked for regular users"
                  />
                )}
                
                {/* 🔥 Beta badge */}
                {isBetaItem && (
                  <span className="px-1 py-0.5 text-[9px] font-bold bg-orange-500/20 text-orange-400 rounded">
                    BETA
                  </span>
                )}
                
                {/* Admin badge */}
                {item.adminOnly && isAdmin && !isImpersonating && (
                  <Shield 
                    className="h-3 w-3 text-[#C9A646]" 
                    style={{ filter: 'drop-shadow(0 0 4px rgba(201,166,70,0.5))' }}
                  />
                )}

                {/* Affiliate badge (active affiliates/admins on smart page) */}
                {isActiveAffiliate && (
                  <Users 
                    className="h-3 w-3 text-emerald-400" 
                    style={{ filter: 'drop-shadow(0 0 4px rgba(52,211,153,0.5))' }}
                  />
                )}

                {/* Legacy affiliate-only badge */}
                {item.affiliateOnly && !isAffiliateSmartItem && (isAffiliate || isAdmin) && (
                  <Users 
                    className="h-3 w-3 text-emerald-400" 
                    style={{ filter: 'drop-shadow(0 0 4px rgba(52,211,153,0.5))' }}
                  />
                )}
                
                {active && !locked && (
                  <>
                    <span 
                      className="absolute inset-0 rounded-md opacity-10 blur-sm"
                      style={{ background: isBetaItem ? '#f97316' : '#C9A646' }}
                    />
                    <span 
                      className="absolute top-0 left-0 right-0 h-0.5 opacity-80"
                      style={{ 
                        background: isBetaItem ? '#f97316' : '#C9A646',
                        boxShadow: isBetaItem ? '0 0 4px rgba(249,115,22,0.5)' : '0 0 4px rgba(201,166,70,0.3)' 
                      }}
                    />
                  </>
                )}
              </button>
            );

            // Wrap locked items with tooltip
            if (locked) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    {buttonContent}
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    className="bg-[#1A1A1A] border-[#C9A646]/20 text-[#F4F4F4]"
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-[#C9A646]" />
                      <span className="font-medium text-[#C9A646]">Coming Soon</span>
                    </div>
                    <p className="text-xs text-[#A0A0A0] mt-1">
                      This feature is under development
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            }
            
            return buttonContent;
          })}
        </>
        )}
      </div>
    </div>
  );
};

export default SubNav;
