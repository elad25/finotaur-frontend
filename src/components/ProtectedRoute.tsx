// src/components/ProtectedRoute.tsx
// =====================================================
// 🔥 v6.0: Shows JournalLandingPage for users without journal access
// =====================================================
// 
// ACCESS MATRIX:
// ┌─────────────────────┬───────────────┬─────────────────────┐
// │ Subscription        │ All Markets   │ Journal             │
// ├─────────────────────┼───────────────┼─────────────────────┤
// │ Platform FREE       │ ✅ Full       │ 📄 Landing Page     │
// │ Platform CORE       │ ✅ Full       │ 📄 Landing Page     │
// │ Platform PRO        │ ✅ Full       │ ✅ Premium          │
// │ Platform ENTERPRISE │ ✅ Full       │ ✅ Premium          │
// ├─────────────────────┼───────────────┼─────────────────────┤
// │ Journal Basic       │ ✅ Full       │ ✅ Basic (25/mo)    │
// │ Journal Premium     │ ✅ Full       │ ✅ Premium (∞)      │
// │ Journal Trial       │ ✅ Full       │ ✅ Trial (14 days)  │
// │ No subscription     │ ✅ Full       │ 📄 Landing Page     │
// └─────────────────────┴───────────────┴─────────────────────┘
// 
// 🔥 KEY: Trial is treated as Basic - gives full journal access for 14 days
// =====================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { supabase } from '@/lib/supabase';

// 🔥 Lazy load the JournalLandingPage to avoid circular imports
const JournalLandingPage = lazy(() => import('@/pages/app/journal/JournalLandingPage'));

// =====================================================
// ROUTE CATEGORIES
// =====================================================

// Routes that are always accessible (no subscription check)
const PUBLIC_APP_PATHS = [
  '/app/journal/pricing',
  '/app/journal/payment',
  '/pricing-selection',
];

// 🔥 Platform routes - FREE for all authenticated users
const PLATFORM_FREE_PATHS = [
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
  '/app/top-secret',
  '/app/settings',
];

// 🔥 Journal routes - Require Journal subscription OR Platform PRO/Enterprise
const JOURNAL_PATHS = [
  '/app/journal',
];

// =====================================================
// LOADING COMPONENT
// =====================================================

const LoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-black">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D4AF37] border-t-transparent" />
      <p className="text-zinc-400 text-sm">Loading...</p>
    </div>
  </div>
);

// =====================================================
// SUBSCRIPTION CHECK HOOK - Optimized
// =====================================================

interface SubscriptionStatus {
  hasJournalAccess: boolean;
  hasPlatformAccess: boolean;
  isLoading: boolean;
  isChecked: boolean;
}

function useSubscriptionCheck(userId: string | undefined) {
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasJournalAccess: false,
    hasPlatformAccess: true,
    isLoading: true,
    isChecked: false,
  });
  
  const checkedUserId = useRef<string | null>(null);

  useEffect(() => {
    // Skip if no user
    if (!userId) {
      setStatus({ 
        hasJournalAccess: false, 
        hasPlatformAccess: false, 
        isLoading: false,
        isChecked: true,
      });
      return;
    }

    // Skip if already checked for this user
    if (checkedUserId.current === userId && status.isChecked) {
      return;
    }

    const checkSubscription = async () => {
      try {
        console.log('[ProtectedRoute] Checking subscription for user:', userId);
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('account_type, subscription_status, subscription_expires_at, role, platform_plan, platform_subscription_status, platform_bundle_journal_granted')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('[ProtectedRoute] Query error:', error);
          setStatus({ 
            hasJournalAccess: false, 
            hasPlatformAccess: true,
            isLoading: false,
            isChecked: true,
          });
          return;
        }

        // Default: Platform always accessible
        let hasJournalAccess = false;
        const hasPlatformAccess = true;

        if (!profile) {
          console.log('[ProtectedRoute] No profile found - new user');
          setStatus({ 
            hasJournalAccess: false, 
            hasPlatformAccess: true,
            isLoading: false,
            isChecked: true,
          });
          checkedUserId.current = userId;
          return;
        }

        console.log('[ProtectedRoute] Profile data:', {
          account_type: profile.account_type,
          subscription_status: profile.subscription_status,
          platform_plan: profile.platform_plan,
          role: profile.role
        });

        // 🔥 Admin check - FULL ACCESS
        if (profile.role === 'admin' || profile.role === 'super_admin') {
          console.log('[ProtectedRoute] ✅ Admin user - full access');
          setStatus({ 
            hasJournalAccess: true, 
            hasPlatformAccess: true,
            isLoading: false,
            isChecked: true,
          });
          checkedUserId.current = userId;
          return;
        }

        // =====================================================
        // 🔥 Check DIRECT Journal subscription
        // account_type: basic, premium, trial, vip, admin
        // Trial is treated as Basic - gives 14 days access
        // =====================================================
        const hasDirectJournal = 
          ['basic', 'premium', 'vip', 'trial', 'admin'].includes(profile.account_type || '') &&
          ['active', 'trial'].includes(profile.subscription_status || '');
        
        // Check expiration
        let isNotExpired = true;
        if (profile.subscription_expires_at) {
          isNotExpired = new Date(profile.subscription_expires_at) > new Date();
        }

        if (hasDirectJournal && isNotExpired) {
          hasJournalAccess = true;
          console.log('[ProtectedRoute] ✅ Has direct journal subscription');
        }

        // =====================================================
        // 🔥 Check Platform PRO/Enterprise bundle
        // Only PRO and Enterprise get journal access via bundle
        // CORE and FREE do NOT get journal access
        // =====================================================
        const platformPlan = profile.platform_plan;
        const platformActive = ['active', 'trial'].includes(profile.platform_subscription_status || '');
        
        if (!hasJournalAccess && platformActive) {
          // Only PRO or Enterprise with bundle_journal_granted = true
          if ((platformPlan === 'pro' || platformPlan === 'enterprise') && 
              profile.platform_bundle_journal_granted) {
            hasJournalAccess = true;
            console.log('[ProtectedRoute] ✅ Has journal via platform bundle');
          }
        }

        console.log('[ProtectedRoute] Final access:', { hasJournalAccess, hasPlatformAccess });

        setStatus({ 
          hasJournalAccess, 
          hasPlatformAccess,
          isLoading: false,
          isChecked: true,
        });
        checkedUserId.current = userId;

      } catch (error) {
        console.error('[ProtectedRoute] Error:', error);
        setStatus({ 
          hasJournalAccess: false, 
          hasPlatformAccess: true,
          isLoading: false,
          isChecked: true,
        });
      }
    };

    checkSubscription();
  }, [userId]);

  return status;
}

// =====================================================
// HELPER: Check route category
// =====================================================

function isJournalRoute(pathname: string): boolean {
  // Skip public paths first
  if (PUBLIC_APP_PATHS.some(path => pathname.startsWith(path))) {
    return false;
  }
  return JOURNAL_PATHS.some(path => pathname.startsWith(path));
}

function isPlatformRoute(pathname: string): boolean {
  return PLATFORM_FREE_PATHS.some(path => pathname.startsWith(path));
}

function isPublicAppPath(pathname: string): boolean {
  return PUBLIC_APP_PATHS.some(path => pathname.startsWith(path));
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const { hasJournalAccess, hasPlatformAccess, isLoading: subLoading } = useSubscriptionCheck(user?.id);

  const isLoading = authLoading || (user && subLoading);

  // 🔥 DEBUG LOGS
  console.log('[ProtectedRoute] Path:', location.pathname);
  console.log('[ProtectedRoute] User:', user?.email);
  console.log('[ProtectedRoute] isLoading:', isLoading);
  console.log('[ProtectedRoute] hasJournalAccess:', hasJournalAccess);
  console.log('[ProtectedRoute] isJournalRoute:', isJournalRoute(location.pathname));

  // ═══════════════════════════════════════════
  // LOADING STATE - Show spinner briefly
  // ═══════════════════════════════════════════
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // ═══════════════════════════════════════════
  // NOT LOGGED IN - Redirect to login
  // ═══════════════════════════════════════════
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // ═══════════════════════════════════════════
  // PUBLIC APP PATHS - Always accessible
  // ═══════════════════════════════════════════
  if (isPublicAppPath(location.pathname)) {
    return <>{children}</>;
  }

  // ═══════════════════════════════════════════
  // 🔥 PLATFORM ROUTES - FREE for all authenticated users
  // Just render, no redirect!
  // ═══════════════════════════════════════════
  if (isPlatformRoute(location.pathname)) {
    return <>{children}</>;
  }

  // ═══════════════════════════════════════════
  // 🔥 JOURNAL ROUTES - Check access
  // Show Landing Page if NO access
  // ═══════════════════════════════════════════
  if (isJournalRoute(location.pathname)) {
    console.log('[ProtectedRoute] 🔥 Journal route detected!');
    console.log('[ProtectedRoute] hasJournalAccess:', hasJournalAccess);
    
    if (hasJournalAccess) {
      // ✅ Has access - render page
      console.log('[ProtectedRoute] ✅ Has access - rendering children');
      return <>{children}</>;
    }
    
    // ❌ No journal access - Show JournalLandingPage
    // 🔥 This is the key change - we show a landing page instead of redirecting
    console.log('[ProtectedRoute] ❌ No access - showing JournalLandingPage');
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <JournalLandingPage />
      </Suspense>
    );
  }

  // ═══════════════════════════════════════════
  // DEFAULT: Allow access (settings, etc.)
  // ═══════════════════════════════════════════
  return <>{children}</>;
};

export { useSubscriptionCheck };