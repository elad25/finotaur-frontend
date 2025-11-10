/**
 * ================================================
 * USER PROFILE HOOK - FIXED
 * ================================================
 * ✅ React Query caching
 * ✅ 30-minute stale time (profile changes slowly)
 * ✅ Proper TypeScript types
 * ✅ Helper functions for plan display
 * ================================================
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider'; // 🔥 FIXED: Use AuthProvider
import { queryKeys } from '@/lib/queryClient'; // 🔥 ADDED: Use centralized query keys

export interface UserProfile {
  account_type: 'free' | 'basic' | 'premium';
  subscription_interval: 'monthly' | 'yearly' | null;
  subscription_status: 'active' | 'trial' | 'inactive' | null;
  subscription_expires_at: string | null;
}

// ============================================
// 🔥 Fetch function - מחוץ ל-hook לשימוש חוזר
// ============================================
async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('account_type, subscription_interval, subscription_status, subscription_expires_at')
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
    queryKey: queryKeys.profile(effectiveUserId || undefined), // 🔥 Use centralized queryKeys
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

  if (account_type === 'free') {
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
  if (!profile || profile.account_type === 'free') {
    return 'N/A';
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