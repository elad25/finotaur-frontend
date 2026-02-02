// =====================================================
// FINOTAUR: OPTIMIZED User Status Hook v3.0
// 🔥 PERFORMANCE: Single RPC call for ALL status data
// 🔥 CACHING: React Query with 5min stale time
// 🔥 DEDUPLICATION: No duplicate requests
// =====================================================

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

// ============================================
// TYPES
// ============================================

interface SubscriptionStatus {
  // Newsletter (War Zone)
  newsletter_paid: boolean;
  newsletter_status: string;
  newsletter_expires_at: string | null;
  newsletter_interval: string | null;
  newsletter_whop_membership_id: string | null;
  newsletter_trial_ends_at: string | null;
  newsletter_cancel_at_period_end: boolean;
  // Top Secret
  top_secret_enabled: boolean;
  top_secret_status: string;
  top_secret_expires_at: string | null;
  top_secret_whop_membership_id: string | null;
  // User meta
  role: string;
  is_tester: boolean;
  email: string;
}

interface UnifiedUserStatus {
  // Raw data
  raw: SubscriptionStatus | null;
  
  // War Zone derived
  warZone: {
    isActive: boolean;
    isInTrial: boolean;
    status: string;
    membershipId: string | null;
    expiresAt: string | null;
    trialEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
    daysRemaining: number | null;
    trialDaysRemaining: number | null;
  };
  
  // Top Secret derived
  topSecret: {
    isActive: boolean;
    status: string;
    membershipId: string | null;
    expiresAt: string | null;
  };
  
  // User meta
  meta: {
    role: string | null;
    isTester: boolean;
    isAdmin: boolean;
    email: string | null;
  };
  
  // Query state
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

// ============================================
// HELPER: Calculate days remaining
// ============================================

function calculateDaysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ============================================
// MAIN HOOK: useUnifiedUserStatus
// Single source of truth for all user status
// ============================================

export function useUnifiedUserStatus(): UnifiedUserStatus {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 🔥 Single query for ALL user status data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['unified-user-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Try RPC first (if exists)
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'get_user_subscription_status',
        { p_user_id: user.id }
      );
      
      if (!rpcError && rpcResult && rpcResult.length > 0) {
        return rpcResult[0] as SubscriptionStatus;
      }
      
      // Fallback: Direct profile query
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          newsletter_enabled,
          newsletter_status,
          newsletter_expires_at,
          newsletter_whop_membership_id,
          newsletter_trial_ends_at,
          newsletter_cancel_at_period_end,
          top_secret_enabled,
          top_secret_status,
          top_secret_expires_at,
          top_secret_whop_membership_id,
          role,
          is_tester,
          email
        `)
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('[useUnifiedUserStatus] Profile query error:', profileError);
        throw profileError;
      }
      
      // Map to expected format
      return {
        newsletter_paid: profile?.newsletter_enabled ?? false,
        newsletter_status: profile?.newsletter_status ?? 'inactive',
        newsletter_expires_at: profile?.newsletter_expires_at ?? null,
        newsletter_interval: null,
        newsletter_whop_membership_id: profile?.newsletter_whop_membership_id ?? null,
        newsletter_trial_ends_at: profile?.newsletter_trial_ends_at ?? null,
        newsletter_cancel_at_period_end: profile?.newsletter_cancel_at_period_end ?? false,
        top_secret_enabled: profile?.top_secret_enabled ?? false,
        top_secret_status: profile?.top_secret_status ?? 'inactive',
        top_secret_expires_at: profile?.top_secret_expires_at ?? null,
        top_secret_whop_membership_id: profile?.top_secret_whop_membership_id ?? null,
        role: profile?.role ?? 'user',
        is_tester: profile?.is_tester ?? false,
        email: profile?.email ?? '',
      } as SubscriptionStatus;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  // 🔥 Memoized refresh function
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ 
      queryKey: ['unified-user-status', user?.id] 
    });
    await refetch();
  }, [queryClient, user?.id, refetch]);

  // 🔥 Memoized derived values
  return useMemo(() => {
    const raw = data ?? null;
    
    // War Zone status
    const warZoneIsActive = 
      raw?.newsletter_status === 'active' || 
      raw?.newsletter_status === 'trial' || 
      raw?.newsletter_status === 'trialing';
    
    const warZoneIsInTrial = 
      raw?.newsletter_status === 'trial' || 
      raw?.newsletter_status === 'trialing';
    
    // Top Secret status
    const topSecretIsActive = 
      raw?.top_secret_enabled === true && 
      (raw?.top_secret_status === 'active' || raw?.top_secret_status === 'trial');
    
    // User meta
    const isAdmin = 
      raw?.role === 'admin' || 
      raw?.role === 'super_admin';

    return {
      raw,
      
      warZone: {
        isActive: warZoneIsActive,
        isInTrial: warZoneIsInTrial,
        status: raw?.newsletter_status ?? '',
        membershipId: raw?.newsletter_whop_membership_id ?? null,
        expiresAt: raw?.newsletter_expires_at ?? null,
        trialEndsAt: raw?.newsletter_trial_ends_at ?? null,
        cancelAtPeriodEnd: raw?.newsletter_cancel_at_period_end ?? false,
        daysRemaining: calculateDaysRemaining(raw?.newsletter_expires_at ?? null),
        trialDaysRemaining: calculateDaysRemaining(raw?.newsletter_trial_ends_at ?? null),
      },
      
      topSecret: {
        isActive: topSecretIsActive,
        status: raw?.top_secret_status ?? '',
        membershipId: raw?.top_secret_whop_membership_id ?? null,
        expiresAt: raw?.top_secret_expires_at ?? null,
      },
      
      meta: {
        role: raw?.role ?? null,
        isTester: raw?.is_tester ?? false,
        isAdmin,
        email: raw?.email ?? null,
      },
      
      isLoading,
      error: error as Error | null,
      refresh,
    };
  }, [data, isLoading, error, refresh]);
}

// ============================================
// CONVENIENCE HOOKS (for backward compatibility)
// These use the unified hook internally
// ============================================

export function useWarZoneStatus() {
  const { warZone, isLoading, refresh } = useUnifiedUserStatus();
  
  return {
    isActive: warZone.isActive,
    isInTrial: warZone.isInTrial,
    status: warZone.status,
    membershipId: warZone.membershipId,
    expiresAt: warZone.expiresAt,
    trialEndsAt: warZone.trialEndsAt,
    cancelAtPeriodEnd: warZone.cancelAtPeriodEnd,
    daysRemaining: warZone.daysRemaining,
    trialDaysRemaining: warZone.trialDaysRemaining,
    isLoading,
    refresh,
  };
}

export function useTopSecretStatus() {
  const { topSecret, isLoading, refresh } = useUnifiedUserStatus();
  
  return {
    isActive: topSecret.isActive,
    status: topSecret.status,
    membershipId: topSecret.membershipId,
    expiresAt: topSecret.expiresAt,
    isLoading,
    refresh,
  };
}

export function useUserMeta() {
  const { meta, isLoading } = useUnifiedUserStatus();
  
  return {
    role: meta.role,
    isTester: meta.isTester,
    isAdmin: meta.isAdmin,
    isLoading,
  };
}

export default useUnifiedUserStatus;