// ================================================
// OPTIMIZED SUBSCRIPTION HOOK - v6.2.0
// File: src/hooks/useSubscription.ts
// ================================================
// 🔥 v6.2.0 CHANGES:
// - Clear separation: TRIAL (14-day free) vs BASIC (paid)
// - Added 'trial' to AccountType as a real account type
// - isTrial = user in 14-day free period
// - isBasic = user who PAID for Basic plan
// - Legacy 'free' users handled for backward compatibility
// - KEPT: isPremium naming (not changed to isPro)
// ================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

// ================================================
// TYPES - 🔥 v6.2: Clear TRIAL vs BASIC separation
// ================================================

/**
 * Account types in Finotaur
 * 
 * 🔥 v6.2 - CLEAR DEFINITIONS:
 * - 'trial'   = User in FREE 14-day trial period (not paid yet)
 * - 'basic'   = User who PAID for Basic plan ($15.99/month)
 * - 'premium' = User who PAID for Premium plan ($24.99/month)
 * - 'admin'   = Admin user (unlimited access)
 * - 'vip'     = VIP user (unlimited access)
 * - 'free'    = Legacy users only (backward compatibility)
 * 
 * New user flow:
 * 1. Sign up → account_type = 'trial' (14 days free)
 * 2. Trial ends → must pay to continue
 * 3. Pays for Basic → account_type = 'basic'
 * 4. Pays for Premium → account_type = 'premium'
 */
export type AccountType = 'free' | 'trial' | 'basic' | 'premium' | 'admin' | 'vip';

/**
 * Subscription status
 * - 'trial' = in free trial period
 * - 'active' = paid and active
 * - 'expired' = subscription ended
 * - 'cancelled' = user cancelled (may still have access until period end)
 * - 'past_due' = payment failed
 */
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled' | 'past_due' | null;

/**
 * Subscription interval
 */
export type SubscriptionInterval = 'monthly' | 'yearly' | null;

/**
 * User role
 */
export type UserRole = 'user' | 'admin' | 'super_admin';

/**
 * Payment provider types
 */
export type PaymentProvider = 'whop' | 'payplus' | 'stripe' | 'paypal' | 'admin_granted' | 'manual' | null;

/**
 * TradeLimits interface
 */
export interface TradeLimits {
  // Core subscription/limit fields
  remaining: number;
  used: number;
  max_trades: number;
  plan: string;
  reset_date: string;
  
  // Account type & role
  account_type: AccountType;
  role: UserRole;
  
  // Subscription details
  subscription_status: SubscriptionStatus;
  subscription_interval: SubscriptionInterval;
  subscription_expires_at: string | null;
  subscription_cancel_at_period_end: boolean;
  subscription_started_at: string | null;
  
  // 🔥 Trial tracking
  trial_ends_at: string | null;
  is_in_trial: boolean;
  trial_days_remaining: number | null;
  
  // Portfolio fields
  initial_portfolio: number;
  current_portfolio: number;
  portfolio_size: number;
  total_pnl: number;
  
  // Risk settings
  risk_mode: 'percentage' | 'fixed';
  risk_percentage: number | null;
  fixed_risk_amount: number | null;
  
  // Usage tracking
  trade_count: number;
  current_month_trades_count: number;
  current_month_active_days: number;
  billing_cycle_start: string | null;
  is_lifetime_limit: boolean;
  
  // Payment provider info
  payment_provider: PaymentProvider;
  whop_user_id: string | null;
  whop_membership_id: string | null;
  whop_product_id: string | null;
  whop_plan_id: string | null;
  whop_customer_email: string | null;
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
// HELPERS
// ================================================

function safeNumber(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

function safeString(value: unknown, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

const _loggedOnce = new Set<string>();

function logOnce(key: string, ...args: unknown[]) {
  if (import.meta.env.DEV && !_loggedOnce.has(key)) {
    _loggedOnce.add(key);
    console.log(...args);
  }
}

// ================================================
// QUERY KEYS
// ================================================

export const subscriptionKeys = {
  all: ['subscription'] as const,
  limits: (userId: string) => [...subscriptionKeys.all, 'limits', userId] as const,
  warning: (userId: string) => [...subscriptionKeys.all, 'warning', userId] as const,
};

// ================================================
// 🔥 MAIN HOOK - v6.2 WITH TRIAL vs BASIC SEPARATION
// ================================================

export function useSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const effectiveUserId = user?.id || '';
  
  logOnce(`sub-${effectiveUserId}`, '📊 useSubscription initialized for user:', effectiveUserId);
  
  const { 
    data: limits,
    isLoading,
    error,
  } = useQuery({
    queryKey: subscriptionKeys.limits(effectiveUserId),
    queryFn: async (): Promise<TradeLimits | null> => {
      if (!effectiveUserId) return null;
      
      try {
        const { data, error: rpcError } = await supabase.rpc('get_user_subscription_status', {
          p_user_id: effectiveUserId
        });
        
        if (rpcError) {
          console.error('❌ Failed to fetch subscription:', rpcError);
          throw rpcError;
        }
        
        if (!data || data.length === 0) {
          console.log('⚠️ No subscription found - user needs to select a plan');
          return null;
        }
        
        const result = Array.isArray(data) ? data[0] : data;
        
        // 🔥 v6.2: Calculate trial info
        const trialEndsAt = result.trial_ends_at || result.subscription_expires_at;
        const isInTrial = result.account_type === 'trial' || result.subscription_status === 'trial';
        let trialDaysRemaining: number | null = null;
        
        if (isInTrial && trialEndsAt) {
          const now = new Date();
          const trialEnd = new Date(trialEndsAt);
          trialDaysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }
        
        // 🔥 v6.2: Handle account_type properly
        const accountType = (result.account_type || 'trial') as AccountType;
        
        const tradeLimits: TradeLimits = {
          // Core limits
          remaining: safeNumber(result.remaining, 0),
          used: safeNumber(result.used, 0),
          max_trades: safeNumber(result.max_trades, accountType === 'free' ? 0 : 25),
          plan: safeString(result.plan || result.account_type, 'trial'),
          reset_date: safeString(result.reset_date, new Date().toISOString()),
          
          // Account type & role
          account_type: accountType,
          role: (result.role || 'user') as UserRole,
          
          // Subscription details
          subscription_status: result.subscription_status as SubscriptionStatus,
          subscription_interval: result.subscription_interval as SubscriptionInterval,
          subscription_expires_at: result.subscription_expires_at || null,
          subscription_started_at: result.subscription_started_at || null,
          subscription_cancel_at_period_end: result.subscription_cancel_at_period_end ?? false,
          
          // 🔥 Trial info
          trial_ends_at: trialEndsAt || null,
          is_in_trial: isInTrial,
          trial_days_remaining: trialDaysRemaining,
          
          // Portfolio fields
          initial_portfolio: safeNumber(result.initial_portfolio, 10000),
          current_portfolio: safeNumber(result.current_portfolio, 10000),
          portfolio_size: safeNumber(result.portfolio_size, 10000),
          total_pnl: safeNumber(result.total_pnl, 0),
          
          // Risk settings
          risk_mode: (result.risk_mode || 'percentage') as 'percentage' | 'fixed',
          risk_percentage: result.risk_percentage !== null ? safeNumber(result.risk_percentage, 1) : null,
          fixed_risk_amount: result.fixed_risk_amount !== null ? safeNumber(result.fixed_risk_amount, 100) : null,
          
          // Usage tracking
          trade_count: safeNumber(result.trade_count, 0),
          current_month_trades_count: safeNumber(result.current_month_trades_count, 0),
          current_month_active_days: safeNumber(result.current_month_active_days, 0),
          billing_cycle_start: result.billing_cycle_start || null,
          is_lifetime_limit: false,
          
          // Payment provider
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
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    retry: 2,
    retryDelay: 1000,
  });
  
  // Warning state - for BASIC/TRIAL users approaching limit
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
    enabled: !!effectiveUserId && (limits?.account_type === 'basic' || limits?.account_type === 'trial'),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  
  // Mark warning shown mutation
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
  // 🔥 COMPUTED VALUES - v6.2 CLEAR DEFINITIONS
  // ═══════════════════════════════════════════
  
  // 🔥 v6.2: TRIAL = user in FREE 14-day trial (hasn't paid yet)
  const isTrial = limits?.account_type === 'trial';
  
  // 🔥 v6.2: BASIC = user who PAID for Basic plan
  const isBasic = limits?.account_type === 'basic';
  
  // 🔥 v6.2: PREMIUM = user who paid for Premium plan
  const isPremium = 
    limits?.account_type === 'premium' ||
    limits?.account_type === 'admin' ||
    limits?.account_type === 'vip';
  
  // 🔥 v6.2: Legacy free users (backward compatibility)
  const isLegacyFreeUser = limits?.account_type === 'free';
  
  // Check for admin role
  const isAdmin = 
    limits?.role === 'admin' || 
    limits?.role === 'super_admin' ||
    limits?.account_type === 'admin';
  
  // Check for premium/unlimited access
  const isUnlimitedUser = 
    limits?.account_type === 'admin' || 
    limits?.account_type === 'vip' ||
    limits?.account_type === 'premium' ||
    limits?.role === 'admin' ||
    limits?.role === 'super_admin';
  
  // 🔥 v6.2: isPaidUser = user who has paid (Basic or Premium)
  const isPaidUser = isBasic || isPremium;
  
  // 🔥 v6.2: Calculate trades remaining
  const tradesRemaining = isUnlimitedUser 
    ? Infinity 
    : isLegacyFreeUser 
      ? 0  // Legacy free users have 0 trades
      : limits?.remaining ?? 0;
  
  // 🔥 v6.2: Can add trade
  const canAddTrade = isUnlimitedUser || (!isLegacyFreeUser && (limits?.remaining ?? 0) > 0);
  
  // 🔥 v6.2: Limit reached
  const isLimitReached = !isUnlimitedUser && (isLegacyFreeUser || (limits?.remaining ?? 0) <= 0);

  // SnapTrade access - Trial and paid users can use it
  const canUseSnapTrade = 
    limits?.account_type === 'trial' ||
    limits?.account_type === 'basic' || 
    limits?.account_type === 'premium' ||
    limits?.account_type === 'admin' ||
    limits?.account_type === 'vip' ||
    limits?.role === 'admin' ||
    limits?.role === 'super_admin';
  
  // Subscription expiry checks
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
  
  // 🔥 v6.2: Trial expiration check
  const isTrialExpired = (() => {
    if (!isTrial) return false;
    if (!limits?.trial_ends_at) return false;
    const trialEnd = new Date(limits.trial_ends_at);
    return trialEnd < new Date();
  })();
  
  // 🔥 v6.2: Trial expiring soon (less than 3 days left)
  const isTrialExpiringSoon = (() => {
    if (!isTrial) return false;
    const daysLeft = limits?.trial_days_remaining ?? 0;
    return daysLeft > 0 && daysLeft <= 3;
  })();
  
  // Calculate user's 1R value
  const oneRValue = (() => {
    if (!limits) return 100;
    
    const portfolioSize = limits.portfolio_size || limits.current_portfolio || 10000;
    
    if (limits.risk_mode === 'fixed' && limits.fixed_risk_amount) {
      return limits.fixed_risk_amount;
    }
    
    const riskPercentage = limits.risk_percentage ?? 1;
    return (portfolioSize * riskPercentage) / 100;
  })();

  // Payment provider checks
  const isWhopSubscription = limits?.payment_provider === 'whop';
  const hasActiveWhopSubscription = isWhopSubscription && 
    (limits?.subscription_status === 'active' || limits?.subscription_status === 'trial');
  const isCancelledButActive = limits?.subscription_cancel_at_period_end && 
    (limits?.subscription_status === 'active' || limits?.subscription_status === 'trial');

  // 🔥 v6.2: Check if user needs to select a plan
  const needsPlanSelection = 
    (!limits && !isLoading) ||                                    // No profile at all
    isLegacyFreeUser ||                                           // Legacy free users
    isTrialExpired ||                                             // Trial expired
    (limits?.subscription_status === 'expired' && !isPremium);    // Expired subscription

  return {
    // Main data
    limits,
    isLoading,
    loading: isLoading,
    error: error?.message || null,
    
    // 🔥 v6.2: Account type checks - CLEAR DEFINITIONS
    isTrial,             // 🆕 User in FREE 14-day trial (hasn't paid)
    isBasic,             // 🆕 User who PAID for Basic plan
    isPremium,           // User who paid for Premium (or Admin/VIP)
    isPaidUser,          // 🆕 User who has paid (Basic OR Premium)
    isAdmin,             // Admin role
    isUnlimitedUser,     // Has unlimited trades
    isLegacyFreeUser,    // Legacy free user (backward compat)
    needsPlanSelection,  // User needs to select/pay for a plan
    
    // Trade limits
    tradesRemaining,
    canAddTrade,
    isLimitReached,
    isLifetimeLimit: false,
    
    // Feature access
    canUseSnapTrade,
    
    // Subscription status
    isExpiringSoon,
    daysUntilExpiry,
    isCancelledButActive,
    
    // 🔥 v6.2: Trial info
    isInTrial: isTrial,                                    // Alias for isTrial
    isTrialExpired,                                        // 🆕 Trial has expired
    isTrialExpiringSoon,                                   // 🆕 Trial ending in ≤3 days
    trialDaysRemaining: limits?.trial_days_remaining ?? null,
    trialEndsAt: limits?.trial_ends_at ?? null,
    
    // Payment provider
    isWhopSubscription,
    hasActiveWhopSubscription,
    paymentProvider: limits?.payment_provider ?? null,
    whopMembershipId: limits?.whop_membership_id ?? null,
    whopUserId: limits?.whop_user_id ?? null,
    whopProductId: limits?.whop_product_id ?? null,
    whopPlanId: limits?.whop_plan_id ?? null,
    whopCustomerEmail: limits?.whop_customer_email ?? null,
    
    // Portfolio & Risk
    oneRValue,
    portfolioSize: limits?.portfolio_size ?? limits?.current_portfolio ?? 10000,
    currentPortfolio: limits?.current_portfolio ?? 10000,
    initialPortfolio: limits?.initial_portfolio ?? 10000,
    totalPnL: limits?.total_pnl ?? 0,
    
    // Warning state
    warningState,
    markWarningShown: markWarningShownMutation.mutate,
    
    // Manual refresh
    refresh: () => queryClient.invalidateQueries({ 
      queryKey: subscriptionKeys.limits(effectiveUserId) 
    }),
    invalidateAll: () => queryClient.invalidateQueries({
      queryKey: subscriptionKeys.all
    }),
  };
}

// ================================================
// LIGHTWEIGHT STATUS CHECK
// ================================================

export function useSubscriptionStatus() {
  const { 
    canAddTrade, 
    isLimitReached, 
    isPremium,
    isBasic,
    isTrial,
    isPaidUser,
    isAdmin,
    isUnlimitedUser,
    isLegacyFreeUser,
    canUseSnapTrade,
    isExpiringSoon,
    daysUntilExpiry,
    isWhopSubscription,
    isCancelledButActive,
    isInTrial,
    isTrialExpired,
    isTrialExpiringSoon,
    trialDaysRemaining,
    needsPlanSelection,
    isLoading 
  } = useSubscription();
  
  return {
    canAddTrade,
    isLimitReached,
    isPremium,
    isBasic,
    isTrial,
    isPaidUser,
    isAdmin,
    isUnlimitedUser,
    isLegacyFreeUser,
    canUseSnapTrade,
    isExpiringSoon,
    daysUntilExpiry,
    isWhopSubscription,
    isCancelledButActive,
    isInTrial,
    isTrialExpired,
    isTrialExpiringSoon,
    trialDaysRemaining,
    needsPlanSelection,
    isLoading,
  };
}

// ================================================
// PORTFOLIO QUICK ACCESS
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
// WHOP SUBSCRIPTION DETAILS
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
    isInTrial,
    trialDaysRemaining,
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
    isInTrial,
    trialDaysRemaining,
    isLoading,
    refresh,
  };
}

// ================================================
// 🔥 v6.2: HELPER HOOK FOR PLAN SELECTION REDIRECT
// ================================================

/**
 * Hook to check if user should be redirected to plan selection
 * Use this in protected routes to ensure users have a valid subscription
 */
export function usePlanSelectionGuard() {
  const { needsPlanSelection, isLegacyFreeUser, isTrialExpired, isLoading, limits } = useSubscription();
  
  return {
    shouldRedirect: needsPlanSelection,
    isLegacyUser: isLegacyFreeUser,
    isTrialExpired,
    isLoading,
    currentPlan: limits?.account_type ?? null,
    subscriptionStatus: limits?.subscription_status ?? null,
  };
}

// ================================================
// 🔥 v6.2: HELPER HOOK FOR TRIAL STATUS
// ================================================

/**
 * Hook specifically for trial-related UI components
 * Shows trial banner, countdown, upgrade prompts etc.
 */
export function useTrialStatus() {
  const { 
    isTrial, 
    isTrialExpired, 
    isTrialExpiringSoon,
    trialDaysRemaining,
    trialEndsAt,
    isLoading 
  } = useSubscription();
  
  return {
    isTrial,
    isTrialExpired,
    isTrialExpiringSoon,
    trialDaysRemaining,
    trialEndsAt,
    isLoading,
    // Helper for displaying trial status message
    trialStatusMessage: (() => {
      if (!isTrial) return null;
      if (isTrialExpired) return 'Your free trial has ended. Upgrade to continue.';
      if (trialDaysRemaining === 0) return 'Your free trial ends today!';
      if (trialDaysRemaining === 1) return 'Your free trial ends tomorrow!';
      if (isTrialExpiringSoon) return `Your free trial ends in ${trialDaysRemaining} days`;
      return `${trialDaysRemaining} days left in your free trial`;
    })(),
  };
}