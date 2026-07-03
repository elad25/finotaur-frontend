// src/components/routes/BacktestRoute.tsx
// 🧪 BACKTEST PROTECTION - Checks if locked first
import { memo, Suspense, ReactNode, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { domains } from '@/constants/nav';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useBacktestAccess } from '@/hooks/useBacktestAccess';
import { useMentorView } from '@/contexts/MentorViewContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';
import { Button } from '@/components/ds/Button';

// How long the access-check skeleton is allowed to spin before we treat it
// as hung and offer the user a way out instead of an infinite spinner.
const ACCESS_CHECK_TIMEOUT_MS = 15000;

/** Shown when isLoading/isAdminLoading never resolve within the timeout. */
const BacktestAccessTimeoutFallback = memo(() => (
  <div className="w-full flex flex-col items-center justify-center gap-3 py-24 text-center px-4">
    <AlertCircle className="text-[#9a9484] shrink-0" size={28} aria-hidden="true" />
    <p className="text-sm text-ink-muted leading-snug max-w-xs">
      This is taking longer than expected. We couldn't confirm your access.
    </p>
    <Button
      variant="goldOutline"
      size="compact"
      showArrow={false}
      onClick={() => window.location.reload()}
    >
      Retry
    </Button>
  </div>
));
BacktestAccessTimeoutFallback.displayName = 'BacktestAccessTimeoutFallback';

// PageLoader imported from @/components/ds/Spinner

// Suspense wrapper
const SuspenseRoute = memo(({ children }: { children: ReactNode }) => (
  <ErrorBoundary boundary="backtest">
    <Suspense fallback={<RouteSkeleton />}>{children}</Suspense>
  </ErrorBoundary>
));
SuspenseRoute.displayName = 'SuspenseRoute';

// 🔒 BACKTEST LOCKED PAGE - Coming Soon
const BacktestLockedPage = memo(() => (
  <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
    <div className="relative mb-8">
      {/* Glow effect */}
      <div 
        className="absolute inset-0 blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, #C9A646 0%, transparent 70%)' }}
      />
      {/* Lock icon container */}
      <div 
        className="relative w-32 h-32 rounded-full flex items-center justify-center"
        style={{ 
          background: 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.05) 100%)',
          border: '2px solid rgba(201,166,70,0.3)'
        }}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-16 w-16 text-[#C9A646]" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          style={{ filter: 'drop-shadow(0 0 8px rgba(201,166,70,0.5))' }}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
          />
        </svg>
      </div>
    </div>

    <h1 
      className="text-4xl font-bold mb-4 text-center"
      style={{ 
        background: 'linear-gradient(135deg, #C9A646 0%, #F4D87C 50%, #C9A646 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '0 0 40px rgba(201,166,70,0.3)'
      }}
    >
      Backtest - Coming Soon
    </h1>

    <p className="text-[#A0A0A0] text-lg text-center max-w-md mb-8">
      Our powerful backtesting engine is under development. 
      Test your strategies against historical data and optimize your trading performance.
    </p>

    <div className="flex flex-wrap gap-4 justify-center mb-8">
      {[
        { icon: '📊', label: 'Strategy Testing' },
        { icon: '📈', label: 'Historical Analysis' },
        { icon: '🎯', label: 'Performance Metrics' },
        { icon: '🧪', label: 'Monte Carlo Simulation' },
      ].map((feature) => (
        <div 
          key={feature.label}
          className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{ 
            background: 'rgba(201,166,70,0.05)',
            border: '1px solid rgba(201,166,70,0.2)'
          }}
        >
          <span>{feature.icon}</span>
          <span className="text-sm text-[#F4F4F4]">{feature.label}</span>
        </div>
      ))}
    </div>

    <button
      onClick={() => window.history.back()}
      className="px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105"
      style={{ 
        background: 'linear-gradient(135deg, #C9A646 0%, #B8963F 100%)',
        color: '#0F0F0F',
        boxShadow: '0 4px 20px rgba(201,166,70,0.3)'
      }}
    >
      ← Back to Journal
    </button>
  </div>
));
BacktestLockedPage.displayName = 'BacktestLockedPage';

// Lazy load BacktestLanding
import { lazy } from '@/lib/lazyWithRetry';
const BacktestLanding = lazy(() => import('@/pages/app/journal/backtest/BacktestLanding'));

// 🧪 BACKTEST PROTECTION COMPONENT
export const BacktestRoute = memo(({ children }: { children: ReactNode }) => {
  const { hasAccess, isLoading } = useBacktestAccess();
  const { isMentorView } = useMentorView();
  const { hasBetaAccess, isAdmin, isLoading: isAdminLoading } = useAdminAuth();

  // 🔒 Check if backtest domain is globally locked
  const isBacktestLocked = domains['journal-backtest']?.locked === true;

  const accessLoading = isLoading || isAdminLoading;

  // Guard against the access hooks never resolving (e.g. a hung auth/admin
  // check) leaving the user stuck on the skeleton forever — surface a
  // Retry after ACCESS_CHECK_TIMEOUT_MS instead.
  const [accessCheckTimedOut, setAccessCheckTimedOut] = useState(false);
  useEffect(() => {
    if (!accessLoading) {
      setAccessCheckTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setAccessCheckTimedOut(true), ACCESS_CHECK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [accessLoading]);

  if (accessLoading) {
    return accessCheckTimedOut ? <BacktestAccessTimeoutFallback /> : <RouteSkeleton />;
  }

  // 🔒 If backtest is globally locked, show Coming Soon page
  if (isBacktestLocked) {
    return <BacktestLockedPage />;
  }

  // 🔒 Direct-URL hardening: only beta/admin (or mentor view) may access.
  // Regular tier-based hasAccess is no longer sufficient on its own —
  // the Backtest sub-nav is locked: true, so non-beta/admin should always
  // land on the landing page even if they navigate via URL.
  if (!hasBetaAccess && !isAdmin && !isMentorView) {
    return (
      <Suspense fallback={<RouteSkeleton />}>
        <BacktestLanding />
      </Suspense>
    );
  }

  // Mentor View: allow read-only entry regardless of the mentor's own tier,
  // so a mentor can view their student's existing backtests (data is RLS-scoped
  // to the student; run/save actions are hidden in mentor view).
  if (!hasAccess && !isMentorView) {
    return (
      <Suspense fallback={<RouteSkeleton />}>
        <BacktestLanding />
      </Suspense>
    );
  }

  return <SuspenseRoute>{children}</SuspenseRoute>;
});
BacktestRoute.displayName = 'BacktestRoute';

export default BacktestRoute;