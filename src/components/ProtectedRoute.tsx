// src/components/ProtectedRoute.tsx
// =====================================================
// 🔥 v7.0: FIXED - Uses centralized useSubscription hook
// =====================================================
// 
// ACCESS MATRIX:
// ┌─────────────────────┬───────────────┬─────────────────────┐
// │ Subscription        │ All Markets   │ Journal             │
// ├─────────────────────┼───────────────┼─────────────────────┤
// │ Admin/VIP           │ ✅ Full       │ ✅ Full (Premium)   │
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
// 🔥 v7.0 CHANGES:
// - REMOVED: Duplicate useSubscriptionCheck hook
// - USES: Centralized useSubscription hook from useSubscription.ts
// - FIXED: Admin/VIP always have full access
// - FIXED: Consistent logic with the rest of the app
// =====================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { lazy, Suspense } from 'react';
import { useSubscription } from '@/hooks/useSubscription';

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
// 🔥 Logging control - prevent spam
// =====================================================

const _loggedOnce = new Set<string>();

function logOnce(key: string, ...args: unknown[]) {
  if (import.meta.env.DEV && !_loggedOnce.has(key)) {
    _loggedOnce.add(key);
    console.log(...args);
  }
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading: authLoading } = useAuth();
  const location = useLocation();
  
  // 🔥 v7.0: Use centralized useSubscription hook
  const { 
    hasJournalAccess, 
    isAdmin, 
    isLoading: subLoading,
    limits 
  } = useSubscription();

  const isLoading = authLoading || (user && subLoading);

  // 🔥 DEBUG LOGS (only in dev, only once per path)
  logOnce(`route-${location.pathname}`, '[ProtectedRoute] Path:', location.pathname, {
    user: user?.email,
    hasJournalAccess,
    isAdmin,
    isLoading,
    accountType: limits?.account_type,
    role: limits?.role,
  });

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
  // 🔥 ADMIN/VIP - Full access to everything
  // ═══════════════════════════════════════════
  if (isAdmin) {
    logOnce(`admin-access-${location.pathname}`, '[ProtectedRoute] ✅ Admin access granted');
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
    logOnce(`journal-check-${location.pathname}`, '[ProtectedRoute] 🔥 Journal route check:', {
      hasJournalAccess,
      accountType: limits?.account_type,
      subscriptionStatus: limits?.subscription_status,
    });
    
    if (hasJournalAccess) {
      // ✅ Has access - render page
      logOnce(`journal-granted-${location.pathname}`, '[ProtectedRoute] ✅ Journal access granted');
      return <>{children}</>;
    }
    
    // ❌ No journal access - Show JournalLandingPage
    logOnce(`journal-denied-${location.pathname}`, '[ProtectedRoute] ❌ No journal access - showing landing page');
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

export default ProtectedRoute;