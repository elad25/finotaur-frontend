// src/components/routes/AffiliateRoute.tsx
// 🤝 AFFILIATE PROTECTION - Affiliates & Admins Only
import { memo, useEffect, useState, Suspense, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { FEATURES } from '@/config/features';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';

// PageLoader imported from @/components/ds/Spinner

// Suspense wrapper
const SuspenseRoute = memo(({ children }: { children: ReactNode }) => (
  <Suspense fallback={<RouteSkeleton />}>{children}</Suspense>
));
SuspenseRoute.displayName = 'SuspenseRoute';

// 🤝 AFFILIATE PROTECTION COMPONENT
export const AffiliateRoute = memo(({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!FEATURES.AFFILIATE_TRACKING) {
      setHasAccess(false);
      setIsLoading(false);
      return;
    }

    async function checkAccess() {
      if (!user?.id) {
        setIsLoading(false);
        setHasAccess(false);
        return;
      }

      try {
        // Check if user is an admin
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileData?.role === 'admin' || profileData?.role === 'super_admin') {
          setHasAccess(true);
          setIsLoading(false);
          return;
        }

        // Check if user is an active affiliate
        const { data: affiliateData } = await supabase
          .from('affiliates')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        setHasAccess(!!affiliateData);
      } catch (error) {
        console.error('Error checking affiliate access:', error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAccess();
  }, [user?.id]);

  if (isLoading) {
    return <RouteSkeleton />;
  }

  if (!hasAccess) {
    return <Navigate to="/app/journal/overview" replace />;
  }

  return <SuspenseRoute>{children}</SuspenseRoute>;
});
AffiliateRoute.displayName = 'AffiliateRoute';

export default AffiliateRoute;