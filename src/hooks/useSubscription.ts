// ================================================
// OPTIMIZED SUBSCRIPTION HOOK - PRODUCTION READY
// File: src/hooks/useSubscription.ts
// ✅ Single RPC call (unified data)
// ✅ Smart caching strategy
// ✅ Minimal re-fetches
// ✅ Impersonation support - FIXED
// ✅ INCLUDES initial_portfolio & current_portfolio
// ================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

// ================================================
// TYPES
// ================================================

export interface TradeLimits {
  // Core limits
  remaining: number;
  used: number;
  max_trades: number;
  plan: string;
  reset_date: string;
  
  // Profile info
  account_type: 'free' | 'basic' | 'premium' | 'admin' | 'vip' | 'trial';
  subscription_interval?: 'monthly' | 'yearly' | null;
  subscription_status?: 'trial' | 'active' | 'expired' | 'cancelled' | null;
  subscription_expires_at?: string | null;
  role?: 'user' | 'admin' | 'super_admin';
  
  // 🔥 FIXED: Added portfolio fields
  initial_portfolio?: number | null;
  current_portfolio?: number | null;
}

export interface WarningState {
  shouldShow: boolean;
  daysActive: number;
  avgTradesPerDay: number;
  projectedTotal: number;
  daysRemaining: number;
  currentTradeCount: number;
}

// ================================================
// HELPER: Safe number conversion
// ================================================

function safeNumber(value: any, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

// ================================================
// QUERY KEYS - Centralized
// ================================================

export const subscriptionKeys = {
  all: ['subscription'] as const,
  limits: (userId: string) => [...subscriptionKeys.all, 'limits', userId] as const,
  warning: (userId: string) => [...subscriptionKeys.all, 'warning', userId] as const,
};

// ================================================
// 🔥 MAIN HOOK - SINGLE SOURCE OF TRUTH
// ================================================

export function useSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth(); // 🔥 This now returns the effective user (impersonated or real)
  const effectiveUserId = user?.id || '';
  
  if (import.meta.env.DEV && effectiveUserId) {
    console.log('📊 useSubscription for user:', effectiveUserId);
  }
  
  // ✅ SINGLE unified query - gets EVERYTHING in one call
  const { 
    data: limits,
    isLoading,
    error,
  } = useQuery({
    queryKey: subscriptionKeys.limits(effectiveUserId),
    queryFn: async (): Promise<TradeLimits | null> => {
      if (!effectiveUserId) return null;
      
      try {
        // 🎯 Single RPC call that returns BOTH limits + profile data + portfolio
        const { data, error: rpcError } = await supabase.rpc('get_user_subscription_status', {
          user_id_param: effectiveUserId
        });
        
        if (rpcError) {
          console.error('❌ Failed to fetch subscription:', rpcError);
          throw rpcError;
        }
        
        if (!data || data.length === 0) {
          // Fallback: create default profile if doesn't exist
          return await createDefaultProfile(effectiveUserId);
        }
        
        const result = Array.isArray(data) ? data[0] : data;
        
        // 🔥 SAFE NUMBER CONVERSION
        return {
          remaining: safeNumber(result.remaining, 0),
          used: safeNumber(result.used, 0),
          max_trades: safeNumber(result.max_trades, 10),
          plan: result.plan ?? 'free',
          reset_date: result.reset_date ?? new Date().toISOString(),
          account_type: result.account_type ?? 'free',
          subscription_interval: result.subscription_interval,
          subscription_status: result.subscription_status,
          subscription_expires_at: result.subscription_expires_at,
          role: result.role ?? 'user',
          initial_portfolio: safeNumber(result.initial_portfolio, 10000),
          current_portfolio: safeNumber(result.current_portfolio, 10000),
        };
      } catch (err) {
        console.error('❌ useSubscription error:', err);
        throw err;
      }
    },
    enabled: !!effectiveUserId,
    
    // 🎯 OPTIMIZED CACHING STRATEGY
    staleTime: 2 * 60 * 1000,        // 2 minutes - data is "fresh"
    gcTime: 10 * 60 * 1000,          // 10 minutes - keep in cache
    refetchOnWindowFocus: false,      // Don't refetch on tab switch
    refetchOnMount: false,            // Don't refetch on component mount
    refetchOnReconnect: true,         // Only refetch on network reconnect
    retry: 2,                         // Retry failed requests twice
    retryDelay: 1000,                 // 1 second between retries
  });
  
  // ✅ Warning state - ONLY for BASIC users, LAZY loaded
  const { data: warningState } = useQuery({
    queryKey: subscriptionKeys.warning(effectiveUserId),
    queryFn: async (): Promise<WarningState | null> => {
      if (!effectiveUserId) return null;
      
      try {
        const { data, error } = await supabase.rpc('check_usage_warning', { 
          p_user_id: effectiveUserId 
        });
        
        if (error) {
          console.warn('⚠️ Warning check failed:', error);
          return null;
        }
        
        return data as WarningState;
      } catch (err) {
        console.warn('⚠️ Warning check error:', err);
        return null;
      }
    },
    // 🎯 Only run if user is BASIC and limits are loaded
    enabled: !!effectiveUserId && limits?.account_type === 'basic',
    staleTime: 5 * 60 * 1000,         // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  
  // ✅ Mark warning shown mutation
  const markWarningShownMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveUserId) throw new Error('Not authenticated');
      
      const { error } = await supabase.rpc('mark_warning_shown', { 
        p_user_id: effectiveUserId 
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate only warning query
      queryClient.invalidateQueries({ 
        queryKey: subscriptionKeys.warning(effectiveUserId) 
      });
    },
  });
  
  // ✅ Computed values - memoized by React Query
  const isUnlimitedUser = 
    limits?.account_type === 'admin' || 
    limits?.account_type === 'vip' ||
    limits?.account_type === 'premium' ||
    limits?.role === 'admin' ||
    limits?.role === 'super_admin';
  
  const isPremium = limits?.account_type !== 'free' || isUnlimitedUser;
  
  const tradesRemaining = isUnlimitedUser 
    ? Infinity 
    : limits?.remaining ?? 0;
  
  const canAddTrade = isUnlimitedUser || (limits?.remaining ?? 0) > 0;
  
  const isLimitReached = !isUnlimitedUser && (limits?.remaining ?? 0) <= 0;

  const canUseSnapTrade = 
    limits?.account_type === 'basic' || 
    limits?.account_type === 'premium' ||
    limits?.account_type === 'admin' ||
    limits?.account_type === 'vip' ||
    limits?.role === 'admin' ||
    limits?.role === 'super_admin';

  return {
    // Main data
    limits,
    isLoading,
    loading: isLoading, // Backward compatibility
    error: error?.message || null,
    
    // Computed values
    isPremium,
    tradesRemaining,
    canAddTrade,
    isLimitReached,
    isUnlimitedUser,
    canUseSnapTrade,
    
    // Warning state
    warningState,
    markWarningShown: markWarningShownMutation.mutate,
    
    // Manual refresh (use sparingly!)
    refresh: () => queryClient.invalidateQueries({ 
      queryKey: subscriptionKeys.limits(effectiveUserId) 
    }),
  };
}

// ================================================
// HELPER: Create default profile
// ================================================

async function createDefaultProfile(userId: string): Promise<TradeLimits> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const defaultProfile = {
      id: userId,
      email: user?.email || '',
      account_type: 'free' as const,
      max_trades: 10,
      trade_count: 0,
      subscription_status: 'active' as const,
      current_month_trades_count: 0,
      current_month_active_days: 0,
      billing_cycle_start: new Date().toISOString().split('T')[0],
      role: 'user' as const,
      initial_portfolio: 10000,
      current_portfolio: 10000,
    };
    
    const { error } = await supabase
      .from('profiles')
      .insert(defaultProfile);
    
    if (error) throw error;
    
    return {
      remaining: 10,
      used: 0,
      max_trades: 10,
      plan: 'free',
      reset_date: new Date().toISOString(),
      account_type: 'free',
      role: 'user',
      subscription_status: 'active',
      subscription_interval: null,
      subscription_expires_at: null,
      initial_portfolio: 10000,
      current_portfolio: 10000,
    };
  } catch (error) {
    console.error('❌ Failed to create default profile:', error);
    throw error;
  }
}

// ================================================
// 🎯 LIGHTWEIGHT STATUS CHECK - For UI only
// Use this in components that only need to know "can I do X?"
// ================================================

export function useSubscriptionStatus() {
  const { 
    canAddTrade, 
    isLimitReached, 
    isPremium, 
    isUnlimitedUser,
    canUseSnapTrade,
    isLoading 
  } = useSubscription();
  
  return {
    canAddTrade,
    isLimitReached,
    isPremium,
    isUnlimitedUser,
    canUseSnapTrade,
    isLoading,
  };
}