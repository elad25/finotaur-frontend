// =====================================================
// WAR ZONE PAGE - Entry Point
// 
// Route: /app/all-markets/warzone
// 
// This is the ONLY War Zone file in all-markets root.
// All components are in ./WarzoneComponents/
// =====================================================

import { lazy, Suspense, memo } from 'react';
import { useUserMeta } from '@/hooks/useUserStatus';

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh] bg-[#080812]">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A646]" />
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  </div>
);

// Lazy imports - from WarzoneComponents folder
const Warzonelanding = lazy(() => import('./WarzoneComponents/Warzonelanding'));
const NewsletterSub = lazy(() => import('@/pages/app/journal/admin/NewsletterSub'));

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

  // Admin view
  if (isAdmin) {
    return (
      <Suspense fallback={<PageLoader />}>
        <NewsletterSub />
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