// =====================================================
// USER STATUS HOOK - v1.0.0
// Single source of truth for ALL subscription statuses
// Newsletter (War Zone) + Top Secret + Platform
// =====================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

// ============================================
// TYPES
// ============================================

export interface NewsletterStatus {
  is_active: boolean;
  enabled: boolean;
  status: string;
  membership_id: string | null;
  started_at: string | null;
  expires_at: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  interval: string | null;
  is_in_trial: boolean;
  days_until_expiry: number | null;
  days_until_trial_ends: number | null;
}

export interface TopSecretStatus {
  is_active: boolean;
  enabled: boolean;
  status: string;
  membership_id: string | null;
  started_at: string | null;
  expires_at: string | null;
  interval: string | null;
  cancel_at_period_end: boolean;
}

export interface PlatformStatus {
  account_type: string;
  subscription_status: string | null;
  subscription_interval: string | null;
  expires_at: string | null;
  membership_id: string | null;
}

export interface UserMeta {
  role: string;
  is_admin: boolean;
  is_tester: boolean;
}

export interface UserFullStatus {
  success: boolean;
  error?: string;
  newsletter: NewsletterStatus;
  top_secret: TopSecretStatus;
  platform: PlatformStatus;
  user: UserMeta;
}

// ============================================
// QUERY KEY
// ============================================

export const userStatusKeys = {
  all: ['user-status'] as const,
  user: (userId: string) => [...userStatusKeys.all, userId] as const,
};

// ============================================
// HOOK
// ============================================

export function useUserStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id || '';

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: userStatusKeys.user(userId),
    queryFn: async (): Promise<UserFullStatus | null> => {
      if (!userId) return null;

      const { data, error } = await supabase.rpc('get_user_subscription_status', {
  p_user_id: user.id
});


      if (error) {
        console.error('[useUserStatus] RPC error:', error);
        throw error;
      }

      return data as UserFullStatus;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  // Derived values
  const newsletter = data?.newsletter || null;
  const topSecret = data?.top_secret || null;
  const platform = data?.platform || null;
  const userMeta = data?.user || null;

  return {
    // Raw data
    data,
    
    // Loading/Error
    isLoading,
    error: error?.message || data?.error || null,
    
    // Newsletter (War Zone)
    newsletter,
    isWarZoneActive: newsletter?.is_active ?? false,
    isWarZoneInTrial: newsletter?.is_in_trial ?? false,
    warZoneDaysRemaining: newsletter?.days_until_expiry ?? null,
    warZoneTrialDaysRemaining: newsletter?.days_until_trial_ends ?? null,
    
    // Top Secret
    topSecret,
    isTopSecretActive: topSecret?.is_active ?? false,
    
    // Platform
    platform,
    
    // User meta
    isAdmin: userMeta?.is_admin ?? false,
    isTester: userMeta?.is_tester ?? false,
    userRole: userMeta?.role ?? 'user',
    
    // Actions
    refresh: () => refetch(),
    invalidate: () => queryClient.invalidateQueries({ 
      queryKey: userStatusKeys.user(userId) 
    }),
  };
}

// ============================================
// LIGHTWEIGHT HOOKS FOR SPECIFIC USE CASES
// ============================================

export function useWarZoneStatus() {
  const { newsletter, isWarZoneActive, isWarZoneInTrial, warZoneDaysRemaining, warZoneTrialDaysRemaining, isLoading, refresh } = useUserStatus();
  
  return {
    isActive: isWarZoneActive,
    isInTrial: isWarZoneInTrial,
    status: newsletter?.status ?? 'inactive',
    membershipId: newsletter?.membership_id ?? null,
    expiresAt: newsletter?.expires_at ?? null,
    trialEndsAt: newsletter?.trial_ends_at ?? null,
    cancelAtPeriodEnd: newsletter?.cancel_at_period_end ?? false,
    interval: newsletter?.interval ?? null,
    daysRemaining: warZoneDaysRemaining,
    trialDaysRemaining: warZoneTrialDaysRemaining,
    isLoading,
    refresh,
  };
}

export function useTopSecretStatus() {
  const { topSecret, isTopSecretActive, isLoading, refresh } = useUserStatus();
  
  return {
    isActive: isTopSecretActive,
    status: topSecret?.status ?? 'inactive',
    membershipId: topSecret?.membership_id ?? null,
    expiresAt: topSecret?.expires_at ?? null,
    interval: topSecret?.interval ?? null,
    cancelAtPeriodEnd: topSecret?.cancel_at_period_end ?? false,
    isLoading,
    refresh,
  };
}

export function useUserMeta() {
  const { isAdmin, isTester, userRole, isLoading } = useUserStatus();
  
  return {
    isAdmin,
    isTester,
    role: userRole,
    isLoading,
  };
}