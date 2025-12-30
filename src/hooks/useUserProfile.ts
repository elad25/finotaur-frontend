/**
 * ================================================
 * USER PROFILE HOOK - FIXED v8.6.1
 * ================================================
 * ✅ React Query caching
 * ✅ 30-minute stale time (profile changes slowly)
 * ✅ Proper TypeScript types
 * ✅ Helper functions for plan display
 * ✅ Cancellation fields support
 * 🔥 v8.6.0: Updated for new pricing model
 * 🔥 v8.6.1: Added 'admin' and 'vip' account types
 * ================================================
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

export interface UserProfile {
  // 🔥 v8.6.1: Added 'admin' and 'vip' for special accounts
  account_type: 'free' | 'basic' | 'premium' | 'trial' | 'admin' | 'vip';
  subscription_interval: 'monthly' | 'yearly' | null;
  subscription_status: 'active' | 'trial' | 'inactive' | 'cancelled' | null;
  subscription_expires_at: string | null;
  // 🔥 Cancellation fields
  subscription_cancel_at_period_end?: boolean;
  // 🔥 v8.6.0: Changed from 'free' | 'basic' to 'basic' | 'cancel'
  pending_downgrade_plan?: 'basic' | 'cancel' | null;
}

// ============================================
// 🔥 Fetch function - מחוץ ל-hook לשימוש חוזר
// ============================================
async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      account_type, 
      subscription_interval, 
      subscription_status, 
      subscription_expires_at,
      subscription_cancel_at_period_end,
      pending_downgrade_plan
    `)
    .eq('id', userId)
    .single();

  if (error) throw error;
  return profile;
}

// ============================================
// Hook עם React Query
// ============================================
export function useUserProfile() {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  
  const effectiveUserId = user?.id || null;

  const query = useQuery({
    queryKey: queryKeys.profile(effectiveUserId || undefined),
    queryFn: () => fetchUserProfile(effectiveUserId!),
    enabled: !!effectiveUserId && !authLoading,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });

  const refetch = useCallback(() => {
    return queryClient.invalidateQueries({ 
      queryKey: queryKeys.profile(effectiveUserId || undefined) 
    });
  }, [queryClient, effectiveUserId]);

  return {
    profile: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch,
  };
}

// ============================================
// Helper Functions למשתמש
// ============================================
export function getPlanDisplay(profile: UserProfile | null | undefined) {
  if (!profile) return { name: 'Free', badge: 'free' as const };

  const { account_type, subscription_interval } = profile;

  // 🔥 v8.6.1: Handle 'admin' and 'vip' as Premium
  if (account_type === 'admin' || account_type === 'vip') {
    return { name: 'Premium', badge: 'premium' as const };
  }

  // 🔥 v8.6.0: Handle 'trial' as legacy/no-plan
  if (account_type === 'free' || account_type === 'trial') {
    return { name: 'Free', badge: 'free' as const };
  } else if (account_type === 'basic') {
    const intervalText = subscription_interval === 'yearly' ? 'Yearly' : 'Monthly';
    return { name: `Basic (${intervalText})`, badge: 'basic' as const };
  } else if (account_type === 'premium') {
    const intervalText = subscription_interval === 'yearly' ? 'Yearly' : 'Monthly';
    return { name: `Premium (${intervalText})`, badge: 'premium' as const };
  }

  return { name: 'Free', badge: 'free' as const };
}

export function getNextBillingDate(profile: UserProfile | null | undefined): string {
  // 🔥 v8.6.1: Admin and VIP don't have billing dates
  if (!profile || profile.account_type === 'free' || profile.account_type === 'trial') {
    return 'N/A';
  }

  // 🔥 v8.6.1: Admin/VIP show "Lifetime" instead of date
  if (profile.account_type === 'admin' || profile.account_type === 'vip') {
    return 'Lifetime';
  }

  if (profile.subscription_expires_at) {
    return new Date(profile.subscription_expires_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return 'N/A';
}