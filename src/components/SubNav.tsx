// src/components/SubNav.tsx
// v2.0.0 - Safe affiliate queries with graceful error handling
// CHANGES:
// - Added tableExists check before querying affiliates
// - Added comprehensive try-catch with graceful fallback
// - Uses maybeSingle() instead of direct query
// - Won't crash if affiliates table doesn't exist

import { useNavigate, useLocation } from 'react-router-dom';
import { useDomain } from '@/hooks/useDomain';
import { Lock, Shield, Users } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, useCallback } from 'react';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useBacktestAccess } from '@/hooks/useBacktestAccess';
import { domains } from '@/constants/nav';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// 🔧 Helper: Check if a table exists (cached)
const tableExistsCache = new Map<string, boolean>();

async function tableExists(tableName: string): Promise<boolean> {
  // Check cache first
  if (tableExistsCache.has(tableName)) {
    return tableExistsCache.get(tableName)!;
  }

  try {
    // Try a minimal query to check if table exists
    const { error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);

    // If error code is 42P01 (undefined_table) or PGRST116, table doesn't exist
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);

  // 🔐 Check if user is admin by fetching role from profiles table
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
            console.log('🎭 Checking admin status for original admin:', userIdToCheck);
          } catch {
            // Invalid JSON, ignore
          }
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userIdToCheck)
          .maybeSingle();

        if (!error && data) {
          const isAdminUser = 
            data.role === 'admin' || 
            data.role === 'super_admin';
          
          console.log('🔐 Admin status check:', {
            userId: userIdToCheck,
            role: data.role,
            isAdmin: isAdminUser,
            isImpersonating
          });
          
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

  // 🤝 Check if user is an active affiliate - WITH SAFE ERROR HANDLING
  useEffect(() => {
    async function checkAffiliateStatus() {
      if (!user?.id) {
        setIsAffiliate(false);
        return;
      }

      try {
        // 🔧 First check if affiliates table exists
        const affiliatesTableExists = await tableExists('affiliates');
        
        if (!affiliatesTableExists) {
          console.log('🤝 Affiliates table not found - skipping affiliate check');
          setIsAffiliate(false);
          return;
        }

        // During impersonation, check if the IMPERSONATED user is an affiliate
        const { data, error } = await supabase
          .from('affiliates')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (error) {
          // Handle specific error codes gracefully
          if (error.code === '42P01' || error.code === 'PGRST116' || error.code === '406') {
            console.log('🤝 Affiliates table/RLS issue - user is not affiliate');
            setIsAffiliate(false);
            return;
          }
          console.error('Error checking affiliate status:', error);
          setIsAffiliate(false);
          return;
        }

        if (data) {
          console.log('🤝 Affiliate status check:', {
            userId: user.id,
            affiliateId: data.id,
            status: data.status,
            isAffiliate: true
          });
          setIsAffiliate(true);
        } else {
          setIsAffiliate(false);
        }
      } catch (error) {
        // Catch any unexpected errors - don't crash the app
        console.error('Error checking affiliate status (non-fatal):', error);
        setIsAffiliate(false);
      }
    }

    checkAffiliateStatus();
  }, [user?.id]);

  // 🔒 Check if a path belongs to a locked domain
  const isPathLocked = useCallback((path: string): boolean => {
    // Check if path is in backtest section
    if (path.includes('/backtest')) {
      const backtestDomain = domains['journal-backtest'];
      return backtestDomain?.locked === true;
    }
    return false;
  }, []);

  // 🔥 Enhanced active detection for better tab highlighting
  const isTabActive = useCallback((itemPath: string): boolean => {
    // Check exact path match first
    if (location.pathname === itemPath) return true;
    
    // For subnav items, check if we're in their section
    if (itemPath === '/app/journal/overview' || itemPath === '/app/journal') {
      // Journal tab is active if we're in /app/journal but NOT in backtest, affiliate, or admin
      return location.pathname.startsWith('/app/journal') && 
             !location.pathname.startsWith('/app/journal/backtest') &&
             !location.pathname.startsWith('/app/journal/affiliate') &&
             !location.pathname.startsWith('/app/journal/admin');
    }
    
    if (itemPath.includes('/backtest')) {
      return location.pathname.includes('/backtest');
    }
    
    if (itemPath.includes('/affiliate')) {
      return location.pathname.includes('/affiliate');
    }
    
    if (itemPath.includes('/admin')) {
      return location.pathname.includes('/admin');
    }
    
    // Fallback to standard check
    return isActive(itemPath);
  }, [location.pathname, isActive]);

  const handleNavigation = useCallback((path: string, itemLocked?: boolean) => {
    // 🔒 CHECK IF INDIVIDUAL ITEM IS LOCKED
    if (itemLocked) {
      console.log('🔒 Item is locked - Coming Soon:', path);
      return;
    }

    // 🔒 BACKTEST LOCKED CHECK - Before any other logic
    if (path.includes('/backtest') && isPathLocked(path)) {
      console.log('🔒 Backtest is locked - Coming Soon');
      return;
    }

    // 🔐 BACKTEST ACCESS CONTROL (if not locked globally)
    if (path.includes('/backtest')) {
      if (!hasBacktestAccess) {
        navigate('/app/journal/backtest/landing');
        return;
      }
      navigate(path);
      return;
    }

    // 🤝 AFFILIATE ACCESS CONTROL
    if (path.includes('/affiliate') && !path.includes('/admin')) {
      if (!isAffiliate && !isAdmin) {
        console.log('🚫 User is not an affiliate, cannot access affiliate pages');
        return;
      }
      navigate(path);
      return;
    }
    
    const isLocked = (activeDomain as any).locked === true;
    
    if (isLocked) {
      return;
    }
    navigate(path);
  }, [navigate, isPathLocked, hasBacktestAccess, isAffiliate, isAdmin, activeDomain]);

  // 🔥 Filter function to check if item should be shown
  const shouldShowItem = useCallback((item: any): boolean => {
    // Hide admin items during impersonation
    if (isImpersonating && item.adminOnly) {
      console.log('🎭 Hiding admin item during impersonation:', item.label);
      return false;
    }
    
    // Hide admin-only items for non-admins
    if (item.adminOnly && !isAdmin) {
      return false;
    }

    // Hide affiliate-only items for non-affiliates (unless admin)
    if (item.affiliateOnly && !isAffiliate && !isAdmin) {
      return false;
    }

    return true;
  }, [isImpersonating, isAdmin, isAffiliate]);

  return (
    <div 
      className="sticky top-16 z-40 border-b backdrop-blur-md"
      style={{ 
        borderColor: 'rgba(255, 215, 0, 0.08)',
        background: 'linear-gradient(to bottom, rgba(15,15,15,0.98), rgba(18,18,18,0.95))'
      }}
    >
      <div className="flex h-12 items-center gap-1 overflow-x-auto px-4 lg:px-6 scrollbar-hide">
        {activeDomain.subNav
          .filter(shouldShowItem)
          .map((item) => {
            const domainLocked = (activeDomain as any).locked === true;
            const backtestLocked = item.path.includes('/backtest') && isPathLocked(item.path);
            const itemLocked = (item as any).locked === true;
            const locked = domainLocked || backtestLocked || itemLocked;
            const active = isTabActive(item.path);
            
            const buttonContent = (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path, itemLocked)}
                disabled={locked}
                className={`relative flex-shrink-0 rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-300 flex items-center gap-1.5 ${
                  locked
                    ? 'cursor-not-allowed opacity-40 text-[#A0A0A0] hover:bg-[#1A1A1A]/50'
                    : active
                    ? 'bg-[#C9A646]/5 text-[#C9A646]'
                    : 'text-[#A0A0A0] hover:bg-[#141414] hover:text-[#F4F4F4]'
                }`}
                style={active && !locked ? { 
                  boxShadow: '0 0 6px rgba(201,166,70,0.08)',
                  borderBottom: '2px solid #C9A646'
                } : {}}
              >
                {item.label}
                {locked && <Lock className="h-3 w-3 opacity-60" />}
                
                {/* 🔐 Admin badge */}
                {item.adminOnly && isAdmin && !isImpersonating && (
                  <Shield 
                    className="h-3 w-3 text-[#C9A646]" 
                    style={{ filter: 'drop-shadow(0 0 4px rgba(201,166,70,0.5))' }}
                  />
                )}

                {/* 🤝 Affiliate badge */}
                {item.affiliateOnly && (isAffiliate || isAdmin) && (
                  <Users 
                    className="h-3 w-3 text-emerald-400" 
                    style={{ filter: 'drop-shadow(0 0 4px rgba(52,211,153,0.5))' }}
                  />
                )}
                
                {active && !locked && (
                  <>
                    <span 
                      className="absolute inset-0 rounded-md opacity-10 blur-sm"
                      style={{ background: '#C9A646' }}
                    />
                    <span 
                      className="absolute top-0 left-0 right-0 h-0.5 bg-[#C9A646] opacity-80"
                      style={{ boxShadow: '0 0 4px rgba(201,166,70,0.3)' }}
                    />
                  </>
                )}
              </button>
            );

            // 🔒 Wrap locked items with tooltip
            if (backtestLocked || itemLocked) {
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
      </div>
    </div>
  );
};

export default SubNav;