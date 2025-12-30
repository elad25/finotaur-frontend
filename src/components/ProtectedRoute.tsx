// src/components/ProtectedRoute.tsx
// 🔥 v2.1: Added debug logs

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const PUBLIC_APP_PATHS = [
  '/app/journal/pricing',
  '/app/journal/payment',
];

function useSubscriptionCheck(userId: string | undefined) {
  const [status, setStatus] = useState<{
    hasAccess: boolean;
    isLoading: boolean;
    accountType: string | null;
  }>({
    hasAccess: false,
    isLoading: true,
    accountType: null,
  });

  useEffect(() => {
    if (!userId) {
      console.log('[ProtectedRoute] ❌ No userId, setting hasAccess=false');
      setStatus({ hasAccess: false, isLoading: false, accountType: null });
      return;
    }

    const checkSubscription = async () => {
      console.log('[ProtectedRoute] 🔍 Checking subscription for:', userId);
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('account_type, subscription_status, subscription_expires_at, role')
          .eq('id', userId)
          .maybeSingle();

        console.log('[ProtectedRoute] 📦 Profile result:', { profile, error });

        if (error || !profile) {
          console.log('[ProtectedRoute] ❌ No profile found, redirecting to pricing');
          setStatus({ hasAccess: false, isLoading: false, accountType: null });
          return;
        }

        // Admins always have access
        if (profile.role === 'admin' || profile.role === 'super_admin') {
          console.log('[ProtectedRoute] ✅ Admin access granted');
          setStatus({ hasAccess: true, isLoading: false, accountType: profile.account_type });
          return;
        }

        // Check for valid subscription
        const hasValidPlan = ['basic', 'premium', 'vip'].includes(profile.account_type || '');
        const hasActiveStatus = ['active', 'trial'].includes(profile.subscription_status || '');
        
        let isNotExpired = true;
        if (profile.subscription_expires_at) {
          isNotExpired = new Date(profile.subscription_expires_at) > new Date();
        }

        const hasAccess = hasValidPlan && hasActiveStatus && isNotExpired;

        console.log('[ProtectedRoute] 🔐 Access calculation:', {
          accountType: profile.account_type,
          subscriptionStatus: profile.subscription_status,
          hasValidPlan,
          hasActiveStatus,
          isNotExpired,
          hasAccess,
        });

        setStatus({ 
          hasAccess, 
          isLoading: false, 
          accountType: profile.account_type 
        });

      } catch (error) {
        console.error('[ProtectedRoute] 💥 Error:', error);
        setStatus({ hasAccess: false, isLoading: false, accountType: null });
      }
    };

    checkSubscription();
  }, [userId]);

  return status;
}

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const { hasAccess, isLoading: subLoading } = useSubscriptionCheck(user?.id);

  const isLoading = authLoading || (user && subLoading);

  console.log('[ProtectedRoute] 🚦 Render state:', {
    path: location.pathname,
    userId: user?.id,
    authLoading,
    subLoading,
    isLoading,
    hasAccess,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D4AF37] border-t-transparent" />
          <p className="text-zinc-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('[ProtectedRoute] 🚫 No user, redirect to login');
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  const isExemptPath = PUBLIC_APP_PATHS.some(path => location.pathname.startsWith(path));

  console.log('[ProtectedRoute] 🎯 Final decision:', {
    hasAccess,
    isExemptPath,
    shouldRedirect: !hasAccess && !isExemptPath,
  });

  if (!hasAccess && !isExemptPath) {
    console.log('[ProtectedRoute] 🔄 REDIRECTING to /pricing-selection');
    return <Navigate to="/pricing-selection" replace />;
  }

  console.log('[ProtectedRoute] ✅ Access granted, rendering children');
  return <>{children}</>;
};