/**
 * ================================================
 * USER PROFILE HOOK - v8.7.0
 * ================================================
 * ✅ React Query caching
 * ✅ 30-minute stale time (profile changes slowly)
 * ✅ Proper TypeScript types
 * ✅ Helper functions for plan display
 * ✅ Cancellation fields support
 * 🔥 v8.6.0: Updated for new pricing model
 * 🔥 v8.6.1: Added 'admin' and 'vip' account types
 * 🔥 v8.7.0: Added role field, improved admin detection
 * ================================================
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

// ============================================
// Types
// ============================================

export interface UserProfile {
  // 🔥 v8.7.0: Added role for admin detection
  role?: 'user' | 'admin' | 'super_admin' | null;
  // 🔥 v8.6.1: Added 'admin' and 'vip' for special accounts
  account_type: 'free' | 'basic' | 'premium' | 'trial' | 'admin' | 'vip';
  subscription_interval: 'monthly' | 'yearly' | null;
  subscription_status: 'active' | 'trial' | 'inactive' | 'cancelled' | 'expired' | null;
  subscription_expires_at: string | null;
  // 🔥 Cancellation fields
  subscription_cancel_at_period_end?: boolean;
  // 🔥 v8.6.0: Changed from 'free' | 'basic' to 'basic' | 'cancel'
  pending_downgrade_plan?: 'basic' | 'cancel' | null;
  // 🔥 v8.7.0: Trade limits for display
  max_trades?: number;
}

// ============================================
// 🔥 Fetch function - מחוץ ל-hook לשימוש חוזר
// ============================================
async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      role,
      account_type, 
      subscription_interval, 
      subscription_status, 
      subscription_expires_at,
      subscription_cancel_at_period_end,
      pending_downgrade_plan,
      max_trades
    `)
    .eq('id', userId)
    .single();

  if (error) {
    console.error('❌ Profile fetch error:', error);
    throw error;
  }
  
  // 🔥 Debug log - remove in production if needed
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Profile fetched:', {
      role: profile?.role,
      account_type: profile?.account_type,
      subscription_status: profile?.subscription_status,
    });
  }
  
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
// 🔥 Helper: Check if user is admin
// ============================================
export function isAdminUser(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  
  // Check by role (preferred)
  if (profile.role === 'admin' || profile.role === 'super_admin') {
    return true;
  }
  
  // Check by account_type (fallback)
  if (profile.account_type === 'admin' || profile.account_type === 'vip') {
    return true;
  }
  
  return false;
}

// ============================================
// 🔥 Helper: Check if user has premium features
// ============================================
export function hasPremiumAccess(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  
  // Admins always have premium access
  if (isAdminUser(profile)) return true;
  
  // Premium users
  if (profile.account_type === 'premium') return true;
  
  return false;
}

// ============================================
// 🔥 Helper: Check if user has active subscription
// ============================================
export function hasActiveSubscription(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  
  // Admins always active
  if (isAdminUser(profile)) return true;
  
  // Check subscription status
  if (profile.subscription_status === 'active' || profile.subscription_status === 'trial') {
    return true;
  }
  
  return false;
}

// ============================================
// Helper Functions למשתמש
// ============================================
export function getPlanDisplay(profile: UserProfile | null | undefined): { 
  name: string; 
  badge: 'free' | 'basic' | 'premium' | 'admin';
} {
  if (!profile) return { name: 'Free', badge: 'free' };

  const { account_type, subscription_interval, role } = profile;

  // 🔥 v8.7.0: Check role first, then account_type
  if (role === 'admin' || role === 'super_admin' || account_type === 'admin' || account_type === 'vip') {
    return { name: 'Premium (Admin)', badge: 'admin' };
  }

  // 🔥 v8.6.0: Handle 'trial' as legacy/no-plan
  if (account_type === 'free' || account_type === 'trial') {
    return { name: 'Free', badge: 'free' };
  }
  
  if (account_type === 'basic') {
    const intervalText = subscription_interval === 'yearly' ? 'Yearly' : 'Monthly';
    return { name: `Basic (${intervalText})`, badge: 'basic' };
  }
  
  if (account_type === 'premium') {
    const intervalText = subscription_interval === 'yearly' ? 'Yearly' : 'Monthly';
    return { name: `Premium (${intervalText})`, badge: 'premium' };
  }

  return { name: 'Free', badge: 'free' };
}

export function getNextBillingDate(profile: UserProfile | null | undefined): string {
  // No profile or free users
  if (!profile || profile.account_type === 'free' || profile.account_type === 'trial') {
    return 'N/A';
  }

  // 🔥 v8.7.0: Admin/VIP show "Lifetime" - check both role and account_type
  if (isAdminUser(profile)) {
    return 'Lifetime';
  }

  // Regular subscribers - show expiration date
  if (profile.subscription_expires_at) {
    return new Date(profile.subscription_expires_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return 'N/A';
}

// ============================================
// 🔥 Helper: Get trade limits display
// ============================================
export function getTradeLimitsDisplay(profile: UserProfile | null | undefined): {
  max: number;
  isUnlimited: boolean;
  displayText: string;
} {
  if (!profile) {
    return { max: 10, isUnlimited: false, displayText: '10 trades (lifetime)' };
  }

  // Admins get unlimited
  if (isAdminUser(profile)) {
    return { max: 999999, isUnlimited: true, displayText: 'Unlimited' };
  }

  const maxTrades = profile.max_trades ?? 10;
  const isUnlimited = maxTrades >= 999999;

  if (isUnlimited) {
    return { max: maxTrades, isUnlimited: true, displayText: 'Unlimited' };
  }

  // Basic = 25/month, Free = 10 lifetime
  const periodText = profile.account_type === 'basic' ? '/month' : ' (lifetime)';
  return { 
    max: maxTrades, 
    isUnlimited: false, 
    displayText: `${maxTrades} trades${periodText}` 
  };
}

// ============================================
// 🔥 Helper: Get subscription status display
// ============================================
export function getSubscriptionStatusDisplay(profile: UserProfile | null | undefined): {
  status: string;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'purple';
  isActive: boolean;
} {
  if (!profile) {
    return { status: 'No Account', color: 'red', isActive: false };
  }

  // Admin users
  if (isAdminUser(profile)) {
    return { status: 'Admin', color: 'purple', isActive: true };
  }

  // Check for pending cancellation
  if (profile.subscription_cancel_at_period_end) {
    return { status: 'Cancelling', color: 'yellow', isActive: true };
  }

  // Check subscription status
  switch (profile.subscription_status) {
    case 'active':
      return { status: 'Active', color: 'green', isActive: true };
    case 'trial':
      return { status: 'Trial', color: 'blue', isActive: true };
    case 'cancelled':
      return { status: 'Cancelled', color: 'red', isActive: false };
    case 'expired':
      return { status: 'Expired', color: 'red', isActive: false };
    case 'inactive':
      return { status: 'Inactive', color: 'red', isActive: false };
    default:
      return { status: 'Free', color: 'blue', isActive: true };
  }
}