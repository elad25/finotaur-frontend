// src/components/routes/JournalRoute.tsx
// =====================================================
// 🔓 JOURNAL ACCESS (v8.5.0 — Journal Open For All)
// =====================================================
//
// Journal is open to every authenticated user. Tier governs LIMITS,
// not access. The trade-limit enforcement lives in useSubscription
// (canAddTrade / isLimitReached / tradesRemaining); this route only
// gates `premiumOnly` features (e.g., backtest, trade copier).
//
// ACCESS MATRIX:
// ┌─────────────────────┬──────────────────────────────────────────┐
// │ User Type           │ Journal Access                           │
// ├─────────────────────┼──────────────────────────────────────────┤
// │ Admin / VIP         │ ✅ Full Premium (unlimited)              │
// │ Premium (paid)      │ ✅ Unlimited + backtest + trade copier   │
// │ Basic (paid)        │ ✅ 25 trades / month                     │
// │ Trial (with Whop)   │ ✅ Trial Access (14 days)                │
// │ Platform PRO        │ ✅ Premium (bundled)                     │
// │ Platform Enterprise │ ✅ Premium (bundled)                     │
// │ Platform CORE       │ ✅ Basic-tier journal (25/mo)            │
// │ FREE (no payment)   │ ✅ 15 trades LIFETIME (manual entry)     │
// │ Platform FREE       │ ✅ 15 trades LIFETIME (manual entry)     │
// │ No subscription     │ ✅ 15 trades LIFETIME (manual entry)     │
// ├─────────────────────┼──────────────────────────────────────────┤
// │ premiumOnly route   │ ❌ Landing page if !isPremium             │
// └─────────────────────┴──────────────────────────────────────────┘
//
// JournalLandingPage is still rendered as a fallback for premiumOnly
// gated routes (backtest, copier) when the user is not Premium, OR
// for the safety net where hasJournalAccess somehow evaluates false
// (should not happen given v8.5.0 — hasJournalFromFree is true for
// every non-admin, non-paid user). Empty-state UX for free users with
// no broker lives in JournalEmptyState (variant="no-broker").
// =====================================================

import { memo, Suspense, ReactNode, lazy } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// =====================================================
// LAZY LOAD LANDING PAGE
// =====================================================

const JournalLandingPage = lazy(() => import('@/pages/app/journal/JournalLandingPage'));

// =====================================================
// LOADING COMPONENT
// =====================================================

const PageLoader = memo(() => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A646]"></div>
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
));
PageLoader.displayName = 'PageLoader';

// =====================================================
// SUSPENSE WRAPPER
// =====================================================

const SuspenseRoute = memo(({ children }: { children: ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
  </ErrorBoundary>
));
SuspenseRoute.displayName = 'SuspenseRoute';

// =====================================================
// 🔒 JOURNAL ROUTE PROTECTION COMPONENT
// =====================================================

interface JournalRouteProps {
  children: ReactNode;
  /** If true, only Premium users can access (for advanced features) */
  premiumOnly?: boolean;
}

export const JournalRoute = memo(({ children, premiumOnly = false }: JournalRouteProps) => {
  const { user } = useAuth();
  const { 
    hasJournalAccess, 
    isAdmin,
    isPremium,
    isLoading,
    limits,
  } = useSubscription();

  // 🔥 DEBUG LOG (only in dev)
  if (import.meta.env.DEV) {
    console.log('[JournalRoute] Access check:', {
      user: user?.email,
      hasJournalAccess,
      isAdmin,
      isPremium,
      isLoading,
      accountType: limits?.account_type,
      subscriptionStatus: limits?.subscription_status,
      whopMembershipId: limits?.whop_membership_id,
    });
  }

  // ═══════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════
  if (isLoading) {
    return <PageLoader />;
  }

  // ═══════════════════════════════════════════
  // NOT LOGGED IN - Should not happen (ProtectedRoute handles this)
  // But just in case, show loading
  // ═══════════════════════════════════════════
  if (!user) {
    return <PageLoader />;
  }

  // ═══════════════════════════════════════════
  // 🔥 ADMIN/VIP - Always has full access
  // ═══════════════════════════════════════════
  if (isAdmin) {
    console.log('[JournalRoute] ✅ Admin access granted');
    return <SuspenseRoute>{children}</SuspenseRoute>;
  }

  // ═══════════════════════════════════════════
  // 🔥 CHECK JOURNAL ACCESS
  // ═══════════════════════════════════════════
  
  // If premium-only feature and user is not premium
  if (premiumOnly && !isPremium) {
    console.log('[JournalRoute] ❌ Premium required - showing landing page');
    return (
      <Suspense fallback={<PageLoader />}>
        <JournalLandingPage />
      </Suspense>
    );
  }

  // If user has journal access, render the page
  if (hasJournalAccess) {
    console.log('[JournalRoute] ✅ Journal access granted');
    return <SuspenseRoute>{children}</SuspenseRoute>;
  }

  // ═══════════════════════════════════════════
  // ❌ NO ACCESS - Show Landing Page
  // ═══════════════════════════════════════════
  console.log('[JournalRoute] ❌ No journal access - showing landing page');
  return (
    <Suspense fallback={<PageLoader />}>
      <JournalLandingPage />
    </Suspense>
  );
});

JournalRoute.displayName = 'JournalRoute';

export default JournalRoute;