// src/components/DomainGuard.tsx
// =====================================================
// 🔥 v2.0: BETA ACCESS SYSTEM
// =====================================================
// 
// ACCESS MATRIX:
// ┌─────────────────┬──────────────┬──────────────┬────────────┐
// │ User Type       │ Locked Pages │ Normal Pages │ BETA Pages │
// ├─────────────────┼──────────────┼──────────────┼────────────┤
// │ Free/Basic      │ ❌ Coming    │ ✅ Yes       │ ❌ No      │
// │                 │    Soon      │              │            │
// ├─────────────────┼──────────────┼──────────────┼────────────┤
// │ Premium         │ ❌ Coming    │ ✅ Yes       │ ❌ No      │
// │                 │    Soon      │              │            │
// ├─────────────────┼──────────────┼──────────────┼────────────┤
// │ Admin/VIP       │ ✅ Yes       │ ✅ Yes       │ ✅ Yes     │
// │ (hasBetaAccess) │              │              │            │
// └─────────────────┴──────────────┴──────────────┴────────────┘
// =====================================================

import { Navigate, useLocation } from 'react-router-dom';
import { domains } from '@/constants/nav';
import { ReactNode } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { SkeletonText } from '@/components/ds/Skeleton';

interface DomainGuardProps {
  children: ReactNode;
  domainId: string;
}

/**
 * Route guard that checks if a domain is locked or beta
 * - If user is admin → Access everything (locked + beta)
 * - If domain is beta and user is not admin → Redirect
 * - If domain is locked and user is not admin → Redirect
 * - Otherwise → Render children
 */
export const DomainGuard = ({ children, domainId }: DomainGuardProps) => {
  const location = useLocation();
  const domain = domains[domainId];
  const { isAdmin, hasBetaAccess, isLoading } = useAdminAuth();

  // Show nothing while checking admin status
  if (isLoading) {
    return (
      <div className="min-h-[200px] p-6">
        <SkeletonText lines={2} />
      </div>
    );
  }

  // 🔥 Admin/VIP with beta access can see EVERYTHING
  if (isAdmin || hasBetaAccess) {
    console.log(`🔓 Admin/Beta access granted for domain "${domainId}"`);
    return <>{children}</>;
  }

  // Check if domain is beta-only
  if (domain?.beta) {
    console.log(`🧪 Domain "${domainId}" is BETA only. Redirecting...`);
    return <Navigate to="/app/journal/overview" replace state={{ from: location }} />;
  }

  // Check if domain is locked (Coming Soon)
  if (domain?.locked) {
    console.log(`🔒 Domain "${domainId}" is locked. Redirecting...`);
    return <Navigate to="/app/journal/overview" replace state={{ from: location }} />;
  }

  // Domain is accessible, render the page
  return <>{children}</>;
};

// =====================================================
// 🔥 NEW: BetaGuard - For individual routes marked as beta
// =====================================================

interface BetaGuardProps {
  children: ReactNode;
  fallbackPath?: string;
}

/**
 * Route guard specifically for BETA pages
 * Only allows access if user has beta access (admin/vip)
 */
export const BetaGuard = ({ 
  children, 
  fallbackPath = '/app/journal/overview' 
}: BetaGuardProps) => {
  const location = useLocation();
  const { hasBetaAccess, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-[200px] p-6">
        <SkeletonText lines={2} />
      </div>
    );
  }

  if (!hasBetaAccess) {
    console.log(`🧪 BETA access required. Redirecting to ${fallbackPath}...`);
    return <Navigate to={fallbackPath} replace state={{ from: location }} />;
  }

  return <>{children}</>;
};