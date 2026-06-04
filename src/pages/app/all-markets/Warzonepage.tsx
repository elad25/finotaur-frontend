// =====================================================
// WAR ZONE PAGE - Entry Point
// 
// Route: /app/all-markets/warzone
// 
// This is the ONLY War Zone file in all-markets root.
// All components are in ./WarzoneComponents/
// =====================================================

import { Suspense, memo } from 'react';
import { lazy } from '@/lib/lazyWithRetry';
import { useUserMeta } from '@/hooks/useUserStatus';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';

// Lazy imports - from WarzoneComponents folder
const Warzonelanding = lazy(() => import('./WarzoneComponents/Warzonelanding'));
const WarZoneAdmin = lazy(() => import('@/pages/app/journal/admin/WarZoneAdmin'));

/**
 * ⚔️ WAR ZONE PAGE
 * 
 * Flow:
 * - Admin → NewsletterSub (admin panel)
 * - Users → Warzonelanding (handles subscriber/non-subscriber)
 */
function WarZonePage() {
  const { isAdmin, isLoading } = useUserMeta();

  if (isLoading) {
    return <RouteSkeleton />;
  }

  // Admin view — WAR ZONE ticker tracking dashboard
  if (isAdmin) {
    return (
      <Suspense fallback={<RouteSkeleton />}>
        <WarZoneAdmin />
      </Suspense>
    );
  }

  // User view
  return (
    <Suspense fallback={<RouteSkeleton />}>
      <Warzonelanding />
    </Suspense>
  );
}

export default memo(WarZonePage);