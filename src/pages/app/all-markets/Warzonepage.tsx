// =====================================================
// WAR ZONE PAGE - Entry Point
//
// Route: /app/all-markets/warzone
//
// This is the ONLY War Zone file in all-markets root.
// All components are in ./WarzoneComponents/
// =====================================================

import { Suspense, memo, useState } from 'react';
import { lazy } from '@/lib/lazyWithRetry';
import { useUserMeta } from '@/hooks/useUserStatus';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';
import { AllMarketsWarzoneSkeletonPage } from '@/components/skeletons/AllMarketsWarzoneSkeleton';

// Lazy imports - from WarzoneComponents folder
const Warzonelanding = lazy(() => import('./WarzoneComponents/Warzonelanding'));
const WarZoneAdmin = lazy(() => import('@/pages/app/journal/admin/WarZoneAdmin'));

// Admin-only view switcher. Lets an admin preview exactly what a non-subscriber
// (landing) or an active subscriber (reports) sees, without leaving the page.
// Mirrors the TOP SECRET admin toggle pattern.
type AdminViewMode = 'landing' | 'subscriber' | 'admin';

const AdminViewToggle = ({ mode, onChange }: { mode: AdminViewMode; onChange: (m: AdminViewMode) => void }) => (
  <div className="fixed top-28 right-4 z-50 flex items-center gap-1 p-1 rounded-xl bg-black/90 backdrop-blur-sm border border-purple-500/40 shadow-xl">
    {(['landing', 'subscriber', 'admin'] as const).map((m) => (
      <button
        key={m}
        onClick={() => onChange(m)}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          mode === m
            ? m === 'landing'
              ? 'bg-orange-500 text-white'
              : m === 'subscriber'
                ? 'bg-green-500 text-white'
                : 'bg-purple-500 text-white'
            : 'text-gray-400 hover:text-white hover:bg-white/10'
        }`}
      >
        {m === 'landing' ? '🚫 Landing' : m === 'subscriber' ? '✅ Subscriber' : '⚙️ Admin'}
      </button>
    ))}
  </div>
);

/**
 * ⚔️ WAR ZONE PAGE
 *
 * Flow:
 * - Admin → ticker tracking dashboard (default), with a toggle to preview the
 *   non-subscriber landing page and the active-subscriber reports view.
 * - Users → Warzonelanding (handles subscriber/non-subscriber automatically)
 */
function WarZonePage() {
  const { isAdmin, isLoading } = useUserMeta();
  const [adminViewMode, setAdminViewMode] = useState<AdminViewMode>('admin');

  if (isLoading) {
    return <AllMarketsWarzoneSkeletonPage />;
  }

  // Admin view — ticker tracking dashboard + preview toggle
  if (isAdmin) {
    return (
      <>
        <AdminViewToggle mode={adminViewMode} onChange={setAdminViewMode} />
        <Suspense fallback={<RouteSkeleton />}>
          {adminViewMode === 'admin' ? (
            <WarZoneAdmin />
          ) : (
            <Warzonelanding previewMode={adminViewMode} />
          )}
        </Suspense>
      </>
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
