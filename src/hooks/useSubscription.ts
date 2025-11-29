// ================================================
// OPTIMIZED SUBSCRIPTION HOOK - PRODUCTION READY v5
// File: src/hooks/useSubscription.ts
// ✅ Single RPC call (unified data) - NO SECOND QUERY!
// ✅ Smart caching strategy
// ✅ Minimal re-fetches
// ✅ Impersonation support
// ✅ INCLUDES initial_portfolio & current_portfolio
// ✅ WHOP INTEGRATION - Full payment provider support
// 🔥 v5: WHOP + AFFILIATE SYNC - RPC NOW RETURNS ALL FIELDS!
// ================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

// ================================================
// TYPES - FULLY ALIGNED WITH DB SCHEMA
// ================================================

/**
 * 🔥 Account types - MUST match DB CHECK constraint!
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
 * 🔥 Payment provider types
 */
export type PaymentProvider = 'whop' | 'payplus' | 'stripe' | 'paypal' | 'admin_granted' | 'manual' | null;

/**
 * 🔥 TradeLimits - FULLY SYNCED WITH profiles table columns!
 * Now ALL fields come from single RPC call!
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
  subscription_cancel_at_period_end: boolean;     // DB: subscription_cancel_at_period_end
  subscription_started_at: string | null;         // DB: subscription_started_at
  
  // ═══════════════════════════════════════════
  // 🔥 PORTFOLIO FIELDS
  // ═══════════════════════════════════════════
  initial_portfolio: number;            // DB: initial_portfolio
  current_portfolio: number;            // DB: current_portfolio
  portfolio_size: number;               // DB: portfolio_size (user's configured size)
  total_pnl: number;                    // DB: total_pnl
  
  // ═══════════════════════════════════════════
  // 🔥 RISK SETTINGS
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
  is_lifetime_limit: boolean;           // TRUE for FREE users (lifetime limit)
  
  // ═══════════════════════════════════════════
  // 🔥 PAYMENT PROVIDER INFO - WHOP INTEGRATION
  // ═══════════════════════════════════════════
  payment_provider: PaymentProvider;    // DB: payment_provider
  whop_user_id: string | null;          // DB: whop_user_id
  whop_membership_id: string | null;    // DB: whop_membership_id
  whop_product_id: string | null;       // DB: whop_product_id
  whop_plan_id: string | null;          // DB: whop_plan_id
  whop_customer_email: string | null;   // DB: whop_customer_email
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

function safeNumber(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

// ================================================
// HELPER: Safe string conversion
// ================================================

function safeString(value: unknown, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

// ================================================
// 🔥 LOGGING CONTROL - Prevent duplicate logs
// ================================================

const _loggedOnce = new Set<string>();

function logOnce(key: string, ...args: unknown[]) {
  if (import.meta.env.DEV && !_loggedOnce.has(key)) {
    _loggedOnce.add(key);
    console.log(...args);
  }
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
  const { user } = useAuth();
  const effectiveUserId = user?.id || '';
  
  logOnce(`sub-${effectiveUserId}`, '📊 useSubscription initialized for user:', effectiveUserId);
  
  // ✅ SINGLE unified query - gets EVERYTHING in one call
  // 🔥 v5: NO SECOND QUERY NEEDED! RPC returns ALL Whop fields now!
  const { 
    data: limits,
    isLoading,
    error,
  } = useQuery({
    queryKey: subscriptionKeys.limits(effectiveUserId),
    queryFn: async (): Promise<TradeLimits | null> => {
      if (!effectiveUserId) return null;
      
      try {
        // 🎯 Single RPC call that returns EVERYTHING including Whop fields
        const { data, error: rpcError } = await supabase.rpc('get_user_subscription_status', {
          user_id_param: effectiveUserId
        });
        
        if (rpcError) {
          console.error('❌ Failed to fetch subscription:', rpcError);
          throw rpcError;
        }
        
        if (!data || data.length === 0) {
          return await createDefaultProfile(effectiveUserId);
        }
        
        const result = Array.isArray(data) ? data[0] : data;
        
        // 🔥 v5: ALL FIELDS NOW COME FROM RPC - NO SECOND QUERY!
        const tradeLimits: TradeLimits = {
          // Core limits (from RPC)
          remaining: safeNumber(result.remaining, 0),
          used: safeNumber(result.used, 0),
          max_trades: safeNumber(result.max_trades, 10),
          plan: safeString(result.plan || result.account_type, 'free'),
          reset_date: safeString(result.reset_date, new Date().toISOString()),
          
          // Account type & role (from RPC)
          account_type: (result.account_type || 'free') as AccountType,
          role: (result.role || 'user') as UserRole,
          
          // Subscription details (from RPC)
          subscription_status: result.subscription_status as SubscriptionStatus,
          subscription_interval: result.subscription_interval as SubscriptionInterval,
          subscription_expires_at: result.subscription_expires_at || null,
          subscription_started_at: result.subscription_started_at || null,
          subscription_cancel_at_period_end: result.subscription_cancel_at_period_end ?? false,
          
          // Portfolio fields (from RPC)
          initial_portfolio: safeNumber(result.initial_portfolio, 10000),
          current_portfolio: safeNumber(result.current_portfolio, 10000),
          portfolio_size: safeNumber(result.portfolio_size, 10000),
          total_pnl: safeNumber(result.total_pnl, 0),
          
          // Risk settings (from RPC)
          risk_mode: (result.risk_mode || 'percentage') as 'percentage' | 'fixed',
          risk_percentage: result.risk_percentage !== null ? safeNumber(result.risk_percentage, 1) : null,
          fixed_risk_amount: result.fixed_risk_amount !== null ? safeNumber(result.fixed_risk_amount, 100) : null,
          
          // Usage tracking (from RPC)
          trade_count: safeNumber(result.trade_count, 0),
          current_month_trades_count: safeNumber(result.current_month_trades_count, 0),
          current_month_active_days: safeNumber(result.current_month_active_days, 0),
          billing_cycle_start: result.billing_cycle_start || null,
          is_lifetime_limit: result.is_lifetime ?? (result.account_type === 'free'),
          
          // 🔥 Payment provider - Whop integration (ALL FROM RPC NOW!)
          payment_provider: (result.payment_provider || null) as PaymentProvider,
          whop_user_id: result.whop_user_id || null,
          whop_membership_id: result.whop_membership_id || null,
          whop_product_id: result.whop_product_id || null,
          whop_plan_id: result.whop_plan_id || null,
          whop_customer_email: result.whop_customer_email || null,
        };
        
        return tradeLimits;
      } catch (err) {
        console.error('❌ useSubscription error:', err);
        throw err;
      }
    },
    enabled: !!effectiveUserId,
    
    // 🎯 OPTIMIZED CACHING STRATEGY
    staleTime: 2 * 60 * 1000,        // 2 minutes
    gcTime: 10 * 60 * 1000,          // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    retry: 2,
    retryDelay: 1000,
  });
  
  // ✅ Warning state - ONLY for BASIC users
  const { data: warningState } = useQuery({
    queryKey: subscriptionKeys.warning(effectiveUserId),
    queryFn: async (): Promise<WarningState | null> => {
      if (!effectiveUserId) return null;
      
      try {
        const { data, error } = await supabase.rpc('check_usage_warning', { 
          p_user_id: effectiveUserId 
        });
        
        if (error) return null;
        return data as WarningState;
      } catch {
        return null;
      }
    },
    enabled: !!effectiveUserId && limits?.account_type === 'basic',
    staleTime: 5 * 60 * 1000,
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
      queryClient.invalidateQueries({ 
        queryKey: subscriptionKeys.warning(effectiveUserId) 
      });
    },
  });
  
  // ═══════════════════════════════════════════
  // 🔥 COMPUTED VALUES
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
  
  // 🔥 Subscription expiry checks
  const isExpiringSoon = (() => {
    if (!limits?.subscription_expires_at) return false;
    const expiresAt = new Date(limits.subscription_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  })();
  
  const daysUntilExpiry = (() => {
    if (!limits?.subscription_expires_at) return null;
    const expiresAt = new Date(limits.subscription_expires_at);
    const now = new Date();
    return Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  })();
  
  // 🔥 Calculate user's 1R value
  const oneRValue = (() => {
    if (!limits) return 100;
    
    const portfolioSize = limits.portfolio_size || limits.current_portfolio || 10000;
    
    if (limits.risk_mode === 'fixed' && limits.fixed_risk_amount) {
      return limits.fixed_risk_amount;
    }
    
    const riskPercentage = limits.risk_percentage ?? 1;
    return (portfolioSize * riskPercentage) / 100;
  })();

  // 🔥 Payment provider checks
  const isWhopSubscription = limits?.payment_provider === 'whop';
  const hasActiveWhopSubscription = isWhopSubscription && limits?.subscription_status === 'active';
  const isCancelledButActive = limits?.subscription_cancel_at_period_end && limits?.subscription_status === 'active';

  return {
    // ═══════════════════════════════════════════
    // MAIN DATA
    // ═══════════════════════════════════════════
    limits,
    isLoading,
    loading: isLoading,
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
    isLifetimeLimit: limits?.is_lifetime_limit ?? false,
    
    // ═══════════════════════════════════════════
    // FEATURE ACCESS
    // ═══════════════════════════════════════════
    canUseSnapTrade,
    
    // ═══════════════════════════════════════════
    // SUBSCRIPTION STATUS
    // ═══════════════════════════════════════════
    isExpiringSoon,
    daysUntilExpiry,
    isCancelledButActive,
    
    // ═══════════════════════════════════════════
    // 🔥 PAYMENT PROVIDER (Whop)
    // ═══════════════════════════════════════════
    isWhopSubscription,
    hasActiveWhopSubscription,
    paymentProvider: limits?.payment_provider ?? null,
    whopMembershipId: limits?.whop_membership_id ?? null,
    whopUserId: limits?.whop_user_id ?? null,
    whopProductId: limits?.whop_product_id ?? null,
    whopPlanId: limits?.whop_plan_id ?? null,
    whopCustomerEmail: limits?.whop_customer_email ?? null,
    
    // ═══════════════════════════════════════════
    // PORTFOLIO & RISK
    // ═══════════════════════════════════════════
    oneRValue,
    portfolioSize: limits?.portfolio_size ?? limits?.current_portfolio ?? 10000,
    currentPortfolio: limits?.current_portfolio ?? 10000,
    initialPortfolio: limits?.initial_portfolio ?? 10000,
    totalPnL: limits?.total_pnl ?? 0,
    
    // ═══════════════════════════════════════════
    // WARNING STATE
    // ═══════════════════════════════════════════
    warningState,
    markWarningShown: markWarningShownMutation.mutate,
    
    // ═══════════════════════════════════════════
    // MANUAL REFRESH
    // ═══════════════════════════════════════════
    refresh: () => queryClient.invalidateQueries({ 
      queryKey: subscriptionKeys.limits(effectiveUserId) 
    }),
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
      subscription_started_at: null,
      subscription_cancel_at_period_end: false,
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
      is_lifetime_limit: true,
      payment_provider: null,
      whop_user_id: null,
      whop_membership_id: null,
      whop_product_id: null,
      whop_plan_id: null,
      whop_customer_email: null,
    };
  } catch (error) {
    console.error('❌ Failed to create default profile:', error);
    throw error;
  }
}

// ================================================
// 🎯 LIGHTWEIGHT STATUS CHECK - For UI only
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
    isWhopSubscription,
    isCancelledButActive,
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
    isWhopSubscription,
    isCancelledButActive,
    isLoading,
  };
}

// ================================================
// 🎯 PORTFOLIO QUICK ACCESS
// ================================================

export function usePortfolioStatus() {
  const { 
    portfolioSize,
    currentPortfolio,
    initialPortfolio,
    totalPnL,
    oneRValue,
    limits,
    isLoading 
  } = useSubscription();
  
  return {
    portfolioSize,
    currentPortfolio,
    initialPortfolio,
    totalPnL,
    oneRValue,
    riskMode: limits?.risk_mode ?? 'percentage',
    riskPercentage: limits?.risk_percentage ?? 1,
    fixedRiskAmount: limits?.fixed_risk_amount ?? null,
    isLoading,
  };
}

// ================================================
// 🎯 WHOP SUBSCRIPTION DETAILS - For payment/billing pages
// ================================================

export function useWhopSubscription() {
  const { 
    limits,
    isWhopSubscription,
    hasActiveWhopSubscription,
    paymentProvider,
    whopMembershipId,
    whopUserId,
    whopProductId,
    whopPlanId,
    whopCustomerEmail,
    isExpiringSoon,
    daysUntilExpiry,
    isCancelledButActive,
    isLoading,
    refresh,
  } = useSubscription();
  
  return {
    isWhopSubscription,
    hasActiveWhopSubscription,
    paymentProvider,
    whopMembershipId,
    whopUserId,
    whopProductId,
    whopPlanId,
    whopCustomerEmail,
    subscriptionStatus: limits?.subscription_status ?? null,
    subscriptionInterval: limits?.subscription_interval ?? null,
    subscriptionExpiresAt: limits?.subscription_expires_at ?? null,
    subscriptionStartedAt: limits?.subscription_started_at ?? null,
    isExpiringSoon,
    daysUntilExpiry,
    isCancelledButActive,
    isLoading,
    refresh,
  };
}