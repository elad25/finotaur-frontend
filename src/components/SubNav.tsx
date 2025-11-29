import { useNavigate, useLocation } from 'react-router-dom';
import { useDomain } from '@/hooks/useDomain';
import { Lock, Shield, Users } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useBacktestAccess } from '@/hooks/useBacktestAccess';

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
          const data = JSON.parse(savedImpersonation);
          userIdToCheck = data.originalAdminId;
          console.log('🎭 Checking admin status for original admin:', userIdToCheck);
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userIdToCheck)
          .single();

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
        // During impersonation, check if the IMPERSONATED user is an affiliate
        // (not the admin)
        const { data, error } = await supabase
          .from('affiliates')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (!error && data) {
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
        console.error('Error checking affiliate status:', error);
        setIsAffiliate(false);
      }
    }

    checkAffiliateStatus();
  }, [user?.id]);

  // 🔥 Enhanced active detection for better tab highlighting
  const isTabActive = (itemPath: string): boolean => {
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
  };

  const handleNavigation = (path: string) => {
    // 🔐 BACKTEST ACCESS CONTROL
    if (path.includes('/backtest')) {
      if (!hasBacktestAccess) {
        // 🔥 Redirect to landing page for non-Premium users
        navigate('/app/journal/backtest/landing');
        return;
      }
      // Premium users can proceed to the requested page
      navigate(path);
      return;
    }

    // 🤝 AFFILIATE ACCESS CONTROL
    if (path.includes('/affiliate') && !path.includes('/admin')) {
      if (!isAffiliate && !isAdmin) {
        // Non-affiliates can't access affiliate pages
        // Could redirect to an "apply" page or show a message
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
  };

  // 🔥 Filter function to check if item should be shown
  const shouldShowItem = (item: any): boolean => {
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
  };

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
            const locked = (activeDomain as any).locked === true;
            const active = isTabActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                disabled={locked}
                className={`relative flex-shrink-0 rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-300 flex items-center gap-1.5 ${
                  locked
                    ? 'cursor-not-allowed opacity-40 text-[#A0A0A0] hover:bg-[#1A1A1A]/50'
                    : active
                    ? 'bg-[#C9A646]/5 text-[#C9A646]'
                    : 'text-[#A0A0A0] hover:bg-[#141414] hover:text-[#F4F4F4]'
                }`}
                style={active ? { 
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
                
                {active && (
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
          })}
      </div>
    </div>
  );
};

export default SubNav;