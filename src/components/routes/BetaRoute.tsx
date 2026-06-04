// src/components/routes/BetaRoute.tsx
// =====================================================
// 🔥 BETA ROUTE GUARD
// =====================================================
// 
// Use this component to wrap routes that are in BETA.
// Only users with beta access (admin, vip, beta account type)
// will be able to access these routes.
// 
// USAGE in App.tsx:
// <Route path="journal/new-feature" element={<BetaRoute><NewFeaturePage /></BetaRoute>} />
// =====================================================

import { ReactNode, Suspense, memo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';

interface BetaRouteProps {
  children: ReactNode;
  fallbackPath?: string;
}

// PageLoader imported from @/components/ds/Spinner

/**
 * BetaRoute - Protects routes that are in beta
 * Only allows access to users with beta access (admin, vip, beta)
 */
export const BetaRoute = memo(({ 
  children, 
  fallbackPath = '/app/journal/overview' 
}: BetaRouteProps) => {
  const location = useLocation();
  const { hasBetaAccess, isLoading } = useAdminAuth();

  // Show loading while checking access
  if (isLoading) {
    return <RouteSkeleton />;
  }

  // No beta access - redirect
  if (!hasBetaAccess) {
    console.log(`🧪 [BetaRoute] Access denied for ${location.pathname}. Redirecting...`);
    return <Navigate to={fallbackPath} replace state={{ from: location }} />;
  }

  // Has beta access - render children
  console.log(`🧪 [BetaRoute] Beta access granted for ${location.pathname}`);
  return (
    <Suspense fallback={<RouteSkeleton />}>
      {children}
    </Suspense>
  );
});

BetaRoute.displayName = 'BetaRoute';

// =====================================================
// 🔥 BETA BADGE COMPONENT
// =====================================================
// Use this to show a "BETA" badge next to feature names

interface BetaBadgeProps {
  className?: string;
}

export const BetaBadge = memo(({ className = '' }: BetaBadgeProps) => (
  <span 
    className={`
      inline-flex items-center px-1.5 py-0.5 
      text-[10px] font-semibold uppercase tracking-wide
      bg-orange-500/20 text-orange-400 
      border border-orange-500/30 rounded
      ${className}
    `}
  >
    BETA
  </span>
));

BetaBadge.displayName = 'BetaBadge';

// =====================================================
// 🔥 COMING SOON BADGE COMPONENT
// =====================================================

interface ComingSoonBadgeProps {
  className?: string;
}

export const ComingSoonBadge = memo(({ className = '' }: ComingSoonBadgeProps) => (
  <span 
    className={`
      inline-flex items-center px-1.5 py-0.5 
      text-[10px] font-semibold uppercase tracking-wide
      bg-zinc-500/20 text-zinc-400 
      border border-zinc-500/30 rounded
      ${className}
    `}
  >
    Coming Soon
  </span>
));

ComingSoonBadge.displayName = 'ComingSoonBadge';