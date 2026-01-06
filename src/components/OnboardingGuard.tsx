// src/components/OnboardingGuard.tsx
// =====================================================
// 🔥 v4.0: FIXED - Loading stuck issue resolved
// =====================================================

import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [shouldRender, setShouldRender] = useState(false);
  
  // Track which user+path combo we've checked
  const lastCheckedKey = useRef<string | null>(null);

  const checkAccess = useCallback(async () => {
    const pathname = location.pathname;
    const checkKey = `${user?.id || 'guest'}-${pathname}`;
    
    // ✅ Skip if already checked this exact combo
    if (lastCheckedKey.current === checkKey) {
      return;
    }

    try {
      // ═══════════════════════════════════════════
      // PUBLIC PAGES - Always allow, no check needed
      // ═══════════════════════════════════════════
      const publicPaths = [
        '/auth/login', 
        '/auth/register', 
        '/pricing-selection', 
        '/', 
        '/forgot-password', 
        '/reset-password',
        '/about',
        '/contact',
        '/affiliate',
        '/legal',
        '/warzone-signup',
      ];
      
      if (publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
        lastCheckedKey.current = checkKey;
        setShouldRender(true);
        setChecking(false);
        return;
      }

      // ═══════════════════════════════════════════
      // NO USER - Redirect to login
      // ═══════════════════════════════════════════
      if (!user) {
        console.log('🔒 OnboardingGuard: No user, redirecting to login');
        lastCheckedKey.current = checkKey;
        setShouldRender(false);
        setChecking(false);
        navigate('/auth/login', { replace: true, state: { from: pathname } });
        return;
      }

      // ═══════════════════════════════════════════
      // 🔥 PLATFORM ROUTES - Always allow for logged-in users
      // ═══════════════════════════════════════════
      const platformRoutes = [
        '/app/all-markets',
        '/app/macro',
        '/app/stocks',
        '/app/crypto',
        '/app/futures',
        '/app/forex',
        '/app/commodities',
        '/app/options',
        '/app/ai',
        '/app/copy-trade',
        '/app/funding',
      ];
      
      const isOnPlatformRoute = platformRoutes.some(route => pathname.startsWith(route));
      
      if (isOnPlatformRoute) {
        console.log('✅ OnboardingGuard: Platform route - immediate access');
        lastCheckedKey.current = checkKey;
        setShouldRender(true);
        setChecking(false);
        return;
      }

      // ═══════════════════════════════════════════
      // SETTINGS & OTHER NON-JOURNAL APP ROUTES
      // ═══════════════════════════════════════════
      if (pathname.startsWith('/app/') && !pathname.startsWith('/app/journal')) {
        console.log('✅ OnboardingGuard: Non-journal app route - allowing');
        lastCheckedKey.current = checkKey;
        setShouldRender(true);
        setChecking(false);
        return;
      }

      // ═══════════════════════════════════════════
      // JOURNAL ROUTES - Need to check access
      // ═══════════════════════════════════════════
      if (pathname.startsWith('/app/journal')) {
        // Special case: pricing page always accessible
        if (pathname.includes('/pricing') || pathname.includes('/payment')) {
          lastCheckedKey.current = checkKey;
          setShouldRender(true);
          setChecking(false);
          return;
        }

        // Fetch user subscription data
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            onboarding_completed, 
            account_type, 
            subscription_status,
            platform_plan,
            platform_subscription_status,
            platform_bundle_journal_granted,
            role
          `)
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('OnboardingGuard: DB error', error);
          // On error, allow access (don't block user)
          lastCheckedKey.current = checkKey;
          setShouldRender(true);
          setChecking(false);
          return;
        }

        // Admin always has access
        if (data?.role === 'admin' || data?.role === 'super_admin') {
          console.log('✅ OnboardingGuard: Admin - full access');
          lastCheckedKey.current = checkKey;
          setShouldRender(true);
          setChecking(false);
          return;
        }

        // Check Journal access
        const hasDirectJournal = 
          ['basic', 'premium', 'vip', 'trial', 'admin'].includes(data?.account_type || '') &&
          ['active', 'trial'].includes(data?.subscription_status || '');
        
        const platformPlan = data?.platform_plan;
        const platformActive = ['active', 'trial'].includes(data?.platform_subscription_status || '');
        const hasJournalFromBundle = 
          (platformPlan === 'pro' || platformPlan === 'enterprise') && 
          platformActive &&
          data?.platform_bundle_journal_granted;
        
        const hasJournalAccess = hasDirectJournal || hasJournalFromBundle;

        if (hasJournalAccess) {
          console.log('✅ OnboardingGuard: Journal access confirmed');
          lastCheckedKey.current = checkKey;
          setShouldRender(true);
          setChecking(false);
          return;
        }

        // ❌ No Journal access - redirect to Top Secret
        console.log('⚠️ OnboardingGuard: No Journal access → Top Secret');
        lastCheckedKey.current = checkKey;
        setShouldRender(false);
        setChecking(false);
        navigate('/app/top-secret', { replace: true });
        return;
      }

      // ═══════════════════════════════════════════
      // DEFAULT: Allow access
      // ═══════════════════════════════════════════
      console.log('✅ OnboardingGuard: Default allow');
      lastCheckedKey.current = checkKey;
      setShouldRender(true);
      setChecking(false);
      
    } catch (error) {
      console.error('❌ OnboardingGuard: Error:', error);
      // On error, allow access (don't block user)
      lastCheckedKey.current = checkKey;
      setShouldRender(true);
      setChecking(false);
    }
  }, [user, location.pathname, navigate]);

  useEffect(() => {
    // ✅ Wait for auth to finish loading first
    if (authLoading) {
      return;
    }

    // ✅ Run the check
    checkAccess();
  }, [authLoading, checkAccess]);

  // ✅ Reset when user changes (login/logout)
  useEffect(() => {
    lastCheckedKey.current = null;
    setChecking(true);
    setShouldRender(false);
  }, [user?.id]);

  // ✅ Show loading only while auth is loading OR initial check
  if (authLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return shouldRender ? <>{children}</> : null;
}