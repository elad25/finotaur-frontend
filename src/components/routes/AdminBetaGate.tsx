// src/components/routes/AdminBetaGate.tsx
// =====================================================
// 🔒 ADMIN/BETA GATE — in-place locked screen
// =====================================================
// Wraps a route element and gates it to admin and beta users.
// Regular users see an "Early Access" locked screen in place
// (NO redirect — URL stays the same so deep links still work).
//
// USAGE in App.tsx:
// <Route path="some/path" element={<SuspenseRoute><AdminBetaGate><SomePage /></AdminBetaGate></SuspenseRoute>} />
// =====================================================

import { memo, ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';

interface AdminBetaGateProps {
  children: ReactNode;
}

// 🔒 Early Access locked screen — rendered in-place for non-admin/beta users
const EarlyAccessLockedPage = memo(() => (
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
          border: '2px solid rgba(201,166,70,0.3)',
        }}
      >
        <Lock
          className="h-16 w-16 text-[#C9A646]"
          style={{ filter: 'drop-shadow(0 0 8px rgba(201,166,70,0.5))' }}
          aria-hidden="true"
        />
      </div>
    </div>

    <h1
      className="text-4xl font-bold mb-4 text-center"
      style={{
        background: 'linear-gradient(135deg, #C9A646 0%, #F4D87C 50%, #C9A646 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '0 0 40px rgba(201,166,70,0.3)',
      }}
    >
      Early Access
    </h1>

    <p className="text-[#A0A0A0] text-lg text-center max-w-md mb-3">
      This page is currently available to admins and beta members.
    </p>

    <p className="text-[#666666] text-sm text-center max-w-md">
      Coming soon to your plan.
    </p>
  </div>
));
EarlyAccessLockedPage.displayName = 'EarlyAccessLockedPage';

// 🔒 ADMIN/BETA GATE COMPONENT
export const AdminBetaGate = memo(({ children }: AdminBetaGateProps) => {
  const { hasBetaAccess, isLoading } = useAdminAuth();

  if (isLoading) {
    return <RouteSkeleton />;
  }

  if (hasBetaAccess) {
    return <>{children}</>;
  }

  return <EarlyAccessLockedPage />;
});
AdminBetaGate.displayName = 'AdminBetaGate';

export default AdminBetaGate;
