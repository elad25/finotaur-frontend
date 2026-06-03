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
import { Spinner } from '@/components/ui/Spinner';

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh] bg-[#080812]">
    <div className="flex flex-col items-center gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  </div>
);

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
    return <PageLoader />;
  }

  // Admin view — WAR ZONE ticker tracking dashboard
  if (isAdmin) {
    return (
      <Suspense fallback={<PageLoader />}>
        <WarZoneAdmin />
      </Suspense>
    );
  }

  // User view
  return (
    <Suspense fallback={<PageLoader />}>
      <Warzonelanding />
    </Suspense>
  );
}

export default memo(WarZonePage);