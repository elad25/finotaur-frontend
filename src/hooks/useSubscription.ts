// ================================================
// OPTIMIZED SUBSCRIPTION HOOK - PRODUCTION READY v2
// File: src/hooks/useSubscription.ts
// ✅ Single RPC call (unified data)
// ✅ Smart caching strategy
// ✅ Minimal re-fetches
// ✅ Impersonation support - FIXED
// ✅ INCLUDES initial_portfolio & current_portfolio
// 🔥 v2: FULL DB SYNC - All profile fields aligned!
// ================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

// ================================================
// TYPES - FULLY ALIGNED WITH DB SCHEMA
// ================================================

/**
 * 🔥 Account types - MUST match DB CHECK constraint!
 * CHECK (account_type IN ('free', 'basic', 'premium', 'admin', 'vip', 'trial'))
 */
export type AccountType = 'free' | 'basic' | 'premium' | 'admin' | 'vip' | 'trial';

/**
 * 🔥 Subscription status - MUST match DB CHECK constraint!
 */
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled' | 'past_due' | null;

/**
 * 🔥 Subscription interval - MUST match DB CHECK constraint!
 */
export type SubscriptionInterval = 'monthly' | 'yearly' | null;

/**
 * 🔥 User role - MUST match DB CHECK constraint!
 */
export type UserRole = 'user' | 'admin' | 'super_admin';

/**
 * 🔥 TradeLimits - FULLY SYNCED WITH profiles table columns!
 */
export interface TradeLimits {
  // ═══════════════════════════════════════════
  // CORE SUBSCRIPTION/LIMIT FIELDS
  // ═══════════════════════════════════════════
  remaining: number;                    // Calculated: max_trades - used
  used: number;                         // Current month trades count
  max_trades: number;                   // DB: max_trades column
  plan: string;                         // Same as account_type for display
  reset_date: string;                   // Next billing cycle start
  
  // ═══════════════════════════════════════════
  // ACCOUNT TYPE & ROLE
  // ═══════════════════════════════════════════
  account_type: AccountType;            // DB: account_type column
  role: UserRole;                       // DB: role column
  
  // ═══════════════════════════════════════════
  // SUBSCRIPTION DETAILS
  // ═══════════════════════════════════════════
  subscription_status: SubscriptionStatus;        // DB: subscription_status
  subscription_interval: SubscriptionInterval;    // DB: subscription_interval
  subscription_expires_at: string | null;         // DB: subscription_expires_at
  
  // ═══════════════════════════════════════════
  // 🔥 PORTFOLIO FIELDS - NOW FULLY INCLUDED!
  // ═══════════════════════════════════════════
  initial_portfolio: number;            // DB: initial_portfolio
  current_portfolio: number;            // DB: current_portfolio
  portfolio_size: number;               // DB: portfolio_size (user's configured size)
  total_pnl: number;                    // DB: total_pnl
  
  // ═══════════════════════════════════════════
  // 🔥 RISK SETTINGS (for convenience)
  // ═══════════════════════════════════════════
  risk_mode: 'percentage' | 'fixed';    // DB: risk_mode
  risk_percentage: number | null;       // DB: risk_percentage
  fixed_risk_amount: number | null;     // DB: fixed_risk_amount
  
  // ═══════════════════════════════════════════
  // USAGE TRACKING
  // ═══════════════════════════════════════════
  trade_count: number;                  // DB: trade_count (lifetime)
  current_month_trades_count: number;   // DB: current_month_trades_count
  current_month_active_days: number;    // DB: current_month_active_days
  billing_cycle_start: string | null;   // DB: billing_cycle_start
  
  // ═══════════════════════════════════════════
  // PAYMENT PROVIDER INFO
  // ═══════════════════════════════════════════
  payplus_customer_id: string | null;   // DB: payplus_customer_id
  payplus_subscription_id: string | null; // DB: payplus_subscription_id
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
// HELPER: Safe string conversion
// ================================================

function safeString(value: any, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
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
        
        // 🔥 SAFE CONVERSION WITH FULL DB FIELD MAPPING
        const tradeLimits: TradeLimits = {
          // Core limits
          remaining: safeNumber(result.remaining, 0),
          used: safeNumber(result.used, 0),
          max_trades: safeNumber(result.max_trades, 10),
          plan: safeString(result.plan || result.account_type, 'free'),
          reset_date: safeString(result.reset_date, new Date().toISOString()),
          
          // Account type & role
          account_type: (result.account_type || 'free') as AccountType,
          role: (result.role || 'user') as UserRole,
          
          // Subscription details
          subscription_status: result.subscription_status as SubscriptionStatus,
          subscription_interval: result.subscription_interval as SubscriptionInterval,
          subscription_expires_at: result.subscription_expires_at || null,
          
          // 🔥 Portfolio fields
          initial_portfolio: safeNumber(result.initial_portfolio, 10000),
          current_portfolio: safeNumber(result.current_portfolio, 10000),
          portfolio_size: safeNumber(result.portfolio_size || result.current_portfolio, 10000),
          total_pnl: safeNumber(result.total_pnl, 0),
          
          // 🔥 Risk settings
          risk_mode: (result.risk_mode || 'percentage') as 'percentage' | 'fixed',
          risk_percentage: result.risk_percentage !== null ? safeNumber(result.risk_percentage, 1) : null,
          fixed_risk_amount: result.fixed_risk_amount !== null ? safeNumber(result.fixed_risk_amount, 100) : null,
          
          // Usage tracking
          trade_count: safeNumber(result.trade_count, 0),
          current_month_trades_count: safeNumber(result.current_month_trades_count || result.used, 0),
          current_month_active_days: safeNumber(result.current_month_active_days, 0),
          billing_cycle_start: result.billing_cycle_start || null,
          
          // Payment provider
          payplus_customer_id: result.payplus_customer_id || null,
          payplus_subscription_id: result.payplus_subscription_id || null,
        };
        
        return tradeLimits;
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
  
  // ═══════════════════════════════════════════
  // 🔥 COMPUTED VALUES - Based on account_type and role
  // ═══════════════════════════════════════════
  
  const isUnlimitedUser = 
    limits?.account_type === 'admin' || 
    limits?.account_type === 'vip' ||
    limits?.account_type === 'premium' ||
    limits?.role === 'admin' ||
    limits?.role === 'super_admin';
  
  const isPremium = 
    limits?.account_type === 'premium' ||
    limits?.account_type === 'admin' ||
    limits?.account_type === 'vip';
  
  const isBasic = limits?.account_type === 'basic';
  
  const isFree = limits?.account_type === 'free';
  
  const isTrial = 
    limits?.account_type === 'trial' || 
    limits?.subscription_status === 'trial';
  
  const isAdmin = 
    limits?.role === 'admin' || 
    limits?.role === 'super_admin' ||
    limits?.account_type === 'admin';
  
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
  
  // 🔥 NEW: Check if subscription is about to expire (within 7 days)
  const isExpiringoon = (() => {
    if (!limits?.subscription_expires_at) return false;
    const expiresAt = new Date(limits.subscription_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  })();
  
  // 🔥 NEW: Days until subscription expires
  const daysUntilExpiry = (() => {
    if (!limits?.subscription_expires_at) return null;
    const expiresAt = new Date(limits.subscription_expires_at);
    const now = new Date();
    return Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  })();
  
  // 🔥 NEW: Calculate user's 1R value (convenience method)
  const oneRValue = (() => {
    if (!limits) return 100; // Default fallback
    
    const portfolioSize = limits.portfolio_size || limits.current_portfolio || 10000;
    
    if (limits.risk_mode === 'fixed' && limits.fixed_risk_amount) {
      return limits.fixed_risk_amount;
    }
    
    const riskPercentage = limits.risk_percentage ?? 1;
    return (portfolioSize * riskPercentage) / 100;
  })();

  return {
    // ═══════════════════════════════════════════
    // MAIN DATA
    // ═══════════════════════════════════════════
    limits,
    isLoading,
    loading: isLoading, // Backward compatibility
    error: error?.message || null,
    
    // ═══════════════════════════════════════════
    // ACCOUNT TYPE CHECKS
    // ═══════════════════════════════════════════
    isPremium,
    isBasic,
    isFree,
    isTrial,
    isAdmin,
    isUnlimitedUser,
    
    // ═══════════════════════════════════════════
    // TRADE LIMITS
    // ═══════════════════════════════════════════
    tradesRemaining,
    canAddTrade,
    isLimitReached,
    
    // ═══════════════════════════════════════════
    // FEATURE ACCESS
    // ═══════════════════════════════════════════
    canUseSnapTrade,
    
    // ═══════════════════════════════════════════
    // 🔥 NEW: SUBSCRIPTION STATUS
    // ═══════════════════════════════════════════
    isExpiringSoon: isExpiringoon,
    daysUntilExpiry,
    
    // ═══════════════════════════════════════════
    // 🔥 NEW: PORTFOLIO & RISK (convenience)
    // ═══════════════════════════════════════════
    oneRValue,
    portfolioSize: limits?.portfolio_size ?? limits?.current_portfolio ?? 10000,
    currentPortfolio: limits?.current_portfolio ?? 10000,
    totalPnL: limits?.total_pnl ?? 0,
    
    // ═══════════════════════════════════════════
    // WARNING STATE
    // ═══════════════════════════════════════════
    warningState,
    markWarningShown: markWarningShownMutation.mutate,
    
    // ═══════════════════════════════════════════
    // MANUAL REFRESH (use sparingly!)
    // ═══════════════════════════════════════════
    refresh: () => queryClient.invalidateQueries({ 
      queryKey: subscriptionKeys.limits(effectiveUserId) 
    }),
    
    // 🔥 NEW: Invalidate all subscription data
    invalidateAll: () => queryClient.invalidateQueries({
      queryKey: subscriptionKeys.all
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
      portfolio_size: 10000,
      total_pnl: 0,
      risk_mode: 'percentage' as const,
      risk_percentage: 1,
      fixed_risk_amount: null,
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
      portfolio_size: 10000,
      total_pnl: 0,
      risk_mode: 'percentage',
      risk_percentage: 1,
      fixed_risk_amount: null,
      trade_count: 0,
      current_month_trades_count: 0,
      current_month_active_days: 0,
      billing_cycle_start: new Date().toISOString().split('T')[0],
      payplus_customer_id: null,
      payplus_subscription_id: null,
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
    isBasic,
    isFree,
    isTrial,
    isAdmin,
    isUnlimitedUser,
    canUseSnapTrade,
    isExpiringSoon,
    daysUntilExpiry,
    isLoading 
  } = useSubscription();
  
  return {
    canAddTrade,
    isLimitReached,
    isPremium,
    isBasic,
    isFree,
    isTrial,
    isAdmin,
    isUnlimitedUser,
    canUseSnapTrade,
    isExpiringSoon,
    daysUntilExpiry,
    isLoading,
  };
}

// ================================================
// 🎯 PORTFOLIO QUICK ACCESS - For components needing portfolio data
// ================================================

export function usePortfolioStatus() {
  const { 
    portfolioSize,
    currentPortfolio,
    totalPnL,
    oneRValue,
    limits,
    isLoading 
  } = useSubscription();
  
  return {
    portfolioSize,
    currentPortfolio,
    totalPnL,
    oneRValue,
    riskMode: limits?.risk_mode ?? 'percentage',
    riskPercentage: limits?.risk_percentage ?? 1,
    fixedRiskAmount: limits?.fixed_risk_amount ?? null,
    isLoading,
  };
}