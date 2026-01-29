import { lazy, Suspense } from 'react';
import { useUserMeta } from '@/hooks/useUserStatus';
import Warzonelanding from './Warzonelanding';

// Lazy import for admin component
const NewsletterSub = lazy(() => import('@/pages/app/journal/admin/NewsletterSub'));

/**
 * ⚔️ WAR ZONE PAGE - OPTIMIZED
 * 
 * Uses useUserMeta hook (shared cache) instead of separate DB query
 * 
 * Flow:
 * - Admin/Super Admin → NewsletterSub (full admin panel)
 * - Regular users → Warzonelanding (handles subscriber vs non-subscriber internally)
 * 
 * Route: /app/all-markets/warzone
 */
export default function WarZonePage() {
  // 🔥 OPTIMIZED: Uses shared cached hook instead of separate DB call
  const { isAdmin, isLoading } = useUserMeta();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#080812]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A646]"></div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // 🔐 Admin sees the full newsletter management
  if (isAdmin) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh] bg-[#080812]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A646]"></div>
            <p className="text-sm text-gray-500">Loading admin panel...</p>
          </div>
        </div>
      }>
        <NewsletterSub />
      </Suspense>
    );
  }

  // 👤 Regular users see the landing page
  // (Warzonelanding handles subscriber vs non-subscriber internally)
  return <Warzonelanding />;
}