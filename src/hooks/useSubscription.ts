// ================================================
// OPTIMIZED SUBSCRIPTION HOOK - v8.4.2 FINAL FIX
// File: src/hooks/useSubscription.ts
// ================================================
// 🔥🔥🔥 v8.4.2 CRITICAL FIX:
// - FIXED: RPC parameter name MUST be 'user_id_param' (NOT 'p_user_id')
// - The DB function signature uses 'p_user_id' internally but Supabase
//   exposes it as 'user_id_param' (without the 'p_' prefix)
// ================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

// ================================================
// TYPES
// ================================================

export type AccountType = 'free' | 'trial' | 'basic' | 'premium' | 'admin' | 'vip';
export type PlatformPlan = 'free' | 'core' | 'pro' | 'enterprise' | null;
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled' | 'past_due' | null;
export type SubscriptionInterval = 'monthly' | 'yearly' | null;
export type UserRole = 'user' | 'admin' | 'super_admin';
export type PaymentProvider = 'whop' | 'payplus' | 'stripe' | 'paypal' | 'admin_granted' | 'manual' | 'lifetime' | null;

/**
 * TradeLimits interface - MATCHES EXACT DB FUNCTION COLUMN ORDER!
 * 
 * DB function get_user_subscription_status returns 34 columns
 */
export interface TradeLimits {
  // Account info (1-2)
  account_type: AccountType;
  role: UserRole;
  
  // Subscription status (3-8)
  subscription_status: SubscriptionStatus;
  subscription_interval: SubscriptionInterval;
  subscription_expires_at: string | null;
  subscription_started_at: string | null;
  subscription_cancel_at_period_end: boolean;
  pending_downgrade_plan: string | null;
  
  // Trial info (9-12)
  is_in_trial: boolean;
  trial_ends_at: string | null;
  trial_used: boolean;
  trial_days_remaining: number | null;
  
  // Trade limits (13-17)
  max_trades: number;
  remaining: number;
  used: number;
  plan: string;
  reset_date: string;
  
  // Portfolio & Risk (18-24)
  initial_portfolio: number;
  current_portfolio: number;
  portfolio_size: number;
  total_pnl: number;
  risk_mode: 'percentage' | 'fixed';
  risk_percentage: number | null;
  fixed_risk_amount: number | null;
  
  // Usage tracking (25-28)
  trade_count: number;
  current_month_trades_count: number;
  current_month_active_days: number;
  billing_cycle_start: string | null;
  
  // Payment provider info (29-34)
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

function safeBool(value: unknown, fallback: boolean = false): boolean {
  if (value === null || value === undefined) return fallback;
  return Boolean(value);
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
  platform: (userId: string) => [...subscriptionKeys.all, 'platform', userId] as const,
};

// ================================================
// 🔥🔥🔥 MAIN HOOK - v8.4.2 FINAL FIX
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
        // ═══════════════════════════════════════════════════════════════
        // 🔥🔥🔥 CRITICAL FIX v8.4.2:
        // The parameter name MUST be 'user_id_param' NOT 'p_user_id'!
        // 
        // Error was:
        // "Could not find the function public.get_user_subscription_status(p_user_id)"
        // "hint: Perhaps you meant to call ...get_user_subscription_status(user_id_param)"
        // ═══════════════════════════════════════════════════════════════
const { data, error: rpcError } = await supabase.rpc('get_user_subscription_status', {
  user_id_param: effectiveUserId  // ✅ תוקן - Supabase חושף את הפרמטר בלי ה-p_
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
        
        // Map DB result to TradeLimits
        const tradeLimits: TradeLimits = {
          // Account info (1-2)
          account_type: (result.account_type || 'free') as AccountType,
          role: (result.role || 'user') as UserRole,
          
          // Subscription status (3-8)
          subscription_status: (result.subscription_status || null) as SubscriptionStatus,
          subscription_interval: (result.subscription_interval || null) as SubscriptionInterval,
          subscription_expires_at: result.subscription_expires_at || null,
          subscription_started_at: result.subscription_started_at || null,
          subscription_cancel_at_period_end: safeBool(result.subscription_cancel_at_period_end, false),
          pending_downgrade_plan: result.pending_downgrade_plan || null,
          
          // Trial info (9-12)
          is_in_trial: safeBool(result.is_in_trial, false),
          trial_ends_at: result.trial_ends_at || null,
          trial_used: safeBool(result.trial_used, false),
          trial_days_remaining: result.trial_days_remaining !== null ? safeNumber(result.trial_days_remaining, 0) : null,
          
          // Trade limits (13-17)
          max_trades: safeNumber(result.max_trades, 25),
          remaining: safeNumber(result.remaining, 0),
          used: safeNumber(result.used, 0),
          plan: safeString(result.plan, 'free'),
          reset_date: safeString(result.reset_date, new Date().toISOString()),
          
          // Portfolio & Risk (18-24)
          initial_portfolio: safeNumber(result.initial_portfolio, 10000),
          current_portfolio: safeNumber(result.current_portfolio, 10000),
          portfolio_size: safeNumber(result.portfolio_size, 10000),
          total_pnl: safeNumber(result.total_pnl, 0),
          risk_mode: (result.risk_mode || 'percentage') as 'percentage' | 'fixed',
          risk_percentage: result.risk_percentage !== null ? safeNumber(result.risk_percentage, 1) : null,
          fixed_risk_amount: result.fixed_risk_amount !== null ? safeNumber(result.fixed_risk_amount, 100) : null,
          
          // Usage tracking (25-28)
          trade_count: safeNumber(result.trade_count, 0),
          current_month_trades_count: safeNumber(result.current_month_trades_count, 0),
          current_month_active_days: safeNumber(result.current_month_active_days, 0),
          billing_cycle_start: result.billing_cycle_start || null,
          
          // Payment provider info (29-34)
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
  user_id_param: effectiveUserId 
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
  user_id_param: effectiveUserId 
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
  // ADMIN CHECK
  // ═══════════════════════════════════════════
  
  const isAdmin = 
    limits?.role === 'admin' || 
    limits?.role === 'super_admin' ||
    limits?.account_type === 'admin' ||
    limits?.account_type === 'vip';
  
  if (import.meta.env.DEV && limits) {
    logOnce(`admin-check-${effectiveUserId}`, '🛡️ Admin check:', {
      role: limits.role,
      account_type: limits.account_type,
      isAdmin,
    });
  }
  
  // ═══════════════════════════════════════════
  // LIFETIME USER CHECK
  // ═══════════════════════════════════════════
  
  const isLifetimeUser = 
    limits?.account_type === 'vip' || 
    limits?.payment_provider === 'lifetime';
  
  // ═══════════════════════════════════════════
  // JOURNAL ACCESS LOGIC
  // ═══════════════════════════════════════════
  
  const hasDirectJournalSubscription = 
    !isAdmin &&
    limits?.account_type && 
    ['basic', 'premium'].includes(limits.account_type) &&
    limits.subscription_status === 'active' &&
    !!limits.whop_membership_id;

  const hasJournalTrial = 
    !isAdmin &&
    limits?.account_type === 'basic' &&
    limits?.subscription_status === 'trial' &&
    limits?.is_in_trial === true &&
    !!limits.whop_membership_id;
  
  const hasJournalAccess = isAdmin || isLifetimeUser || hasDirectJournalSubscription || hasJournalTrial;
  
  const effectiveJournalPlan = (() => {
    if (isAdmin) return 'premium';
    if (isLifetimeUser) return 'premium';
    if (hasDirectJournalSubscription) return limits?.account_type as AccountType;
    if (hasJournalTrial) return 'trial';
    return null;
  })();
  
  // ═══════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════
  
  const isTrial = !isAdmin && !isLifetimeUser && hasJournalTrial;
  const isBasic = !isAdmin && !isLifetimeUser && effectiveJournalPlan === 'basic';
  const isPremium = isAdmin || isLifetimeUser || effectiveJournalPlan === 'premium';
  const isLegacyFreeUser = !isAdmin && limits?.account_type === 'free';
  const isUnlimitedUser = isAdmin || isLifetimeUser || isPremium;
  const isPaidUser = hasJournalAccess && (isBasic || isPremium || isTrial);
  
  const tradesRemaining = isAdmin || isLifetimeUser
    ? Infinity 
    : isUnlimitedUser 
      ? Infinity 
      : !hasJournalAccess 
        ? 0 
        : limits?.remaining ?? 0;
  
  const canAddTrade = isAdmin || isLifetimeUser || (hasJournalAccess && (isUnlimitedUser || (limits?.remaining ?? 0) > 0));
  
  const isLimitReached = !isAdmin && !isLifetimeUser && !isUnlimitedUser && (!hasJournalAccess || (limits?.remaining ?? 0) <= 0);
  
  const canUseSnapTrade = isAdmin || isLifetimeUser || (hasJournalAccess && (isTrial || isBasic || isPremium));
  
  const isExpiringSoon = (() => {
    if (isAdmin || isLifetimeUser) return false;
    if (!limits?.subscription_expires_at) return false;
    const expiresAt = new Date(limits.subscription_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  })();
  
  const daysUntilExpiry = (() => {
    if (isAdmin || isLifetimeUser) return null;
    if (!limits?.subscription_expires_at) return null;
    const expiresAt = new Date(limits.subscription_expires_at);
    const now = new Date();
    return Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  })();
  
  const isTrialExpired = (() => {
    if (isAdmin || isLifetimeUser) return false;
    if (!isTrial) return false;
    if (!limits?.trial_ends_at) return false;
    const trialEnd = new Date(limits.trial_ends_at);
    return trialEnd < new Date();
  })();
  
  const isTrialExpiringSoon = (() => {
    if (isAdmin || isLifetimeUser) return false;
    if (!isTrial) return false;
    const daysLeft = limits?.trial_days_remaining ?? 0;
    return daysLeft > 0 && daysLeft <= 3;
  })();
  
  const oneRValue = (() => {
    if (!limits) return 100;
    const portfolioSize = limits.portfolio_size || limits.current_portfolio || 10000;
    if (limits.risk_mode === 'fixed' && limits.fixed_risk_amount) {
      return limits.fixed_risk_amount;
    }
    const riskPercentage = limits.risk_percentage ?? 1;
    return (portfolioSize * riskPercentage) / 100;
  })();

  const isWhopSubscription = limits?.payment_provider === 'whop';
  const hasActiveWhopSubscription = isWhopSubscription && 
    (limits?.subscription_status === 'active' || limits?.subscription_status === 'trial');
  const isCancelledButActive = !isAdmin && !isLifetimeUser && limits?.subscription_cancel_at_period_end && 
    (limits?.subscription_status === 'active' || limits?.subscription_status === 'trial');

  const needsJournalPlanSelection = !isAdmin && !isLifetimeUser && !hasJournalAccess && !isLoading;

  return {
    // Main data
    limits,
    isLoading,
    loading: isLoading,
    error: error?.message || null,
    
    // Admin & Lifetime flags
    isAdmin,
    isLifetimeUser,
    
    // Journal access
    hasJournalAccess,
    effectiveJournalPlan,
    hasDirectJournalSubscription,
    hasJournalTrial,
    hasJournalFromPlatformBundle: false,
    
    // Account type checks
    isTrial,
    isBasic,
    isPremium,
    isPaidUser,
    isUnlimitedUser,
    isLegacyFreeUser,
    needsJournalPlanSelection,
    needsPlanSelection: needsJournalPlanSelection,
    
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
    
    // Trial info
    isInTrial: isTrial,
    isTrialExpired,
    isTrialExpiringSoon,
    trialDaysRemaining: limits?.trial_days_remaining ?? null,
    trialEndsAt: limits?.trial_ends_at ?? null,
    trialUsed: limits?.trial_used ?? false,
    
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
    
    // Platform fields (defaults)
    platformPlan: null as PlatformPlan,
    isPlatformFree: true,
    isPlatformCore: false,
    isPlatformPro: false,
    isPlatformEnterprise: false,
    isPlatformPaid: false,
    isPlatformActive: false,
    isPlatformInTrial: false,
    platformTrialDaysRemaining: null as number | null,
    isPlatformTrialExpiringSoon: false,
    platformDaysUntilExpiry: null as number | null,
    platformSubscriptionStatus: null as SubscriptionStatus,
    platformSubscriptionExpiresAt: null as string | null,
    platformWhopMembershipId: null as string | null,
    
    // Platform features (defaults)
    hasPlatformAiInsights: isAdmin,
    hasPlatformApiAccess: isAdmin,
    hasPlatformAdvancedScreeners: isAdmin,
    hasPlatformCustomReports: isAdmin,
    hasPlatformAdvancedCharts: isAdmin,
    
    // Pending downgrade
    pendingDowngradePlan: limits?.pending_downgrade_plan ?? null,
    
    // Refresh
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
    hasJournalAccess,
    canAddTrade, 
    isLimitReached, 
    isPremium,
    isBasic,
    isTrial,
    isPaidUser,
    isAdmin,
    isLifetimeUser,
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
    needsJournalPlanSelection,
    platformPlan,
    isPlatformFree,
    isPlatformCore,
    isPlatformPro,
    isPlatformEnterprise,
    isPlatformPaid,
    isPlatformActive,
    isLoading 
  } = useSubscription();
  
  return {
    hasJournalAccess,
    canAddTrade,
    isLimitReached,
    isPremium,
    isBasic,
    isTrial,
    isPaidUser,
    isAdmin,
    isLifetimeUser,
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
    needsJournalPlanSelection,
    platformPlan,
    isPlatformFree,
    isPlatformCore,
    isPlatformPro,
    isPlatformEnterprise,
    isPlatformPaid,
    isPlatformActive,
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
// JOURNAL ACCESS GUARD HOOK
// ================================================

export function useJournalAccess() {
  const {
    hasJournalAccess,
    effectiveJournalPlan,
    hasDirectJournalSubscription,
    hasJournalFromPlatformBundle,
    isPremium,
    isBasic,
    isTrial,
    canAddTrade,
    tradesRemaining,
    isUnlimitedUser,
    isAdmin,
    isLifetimeUser,
    isLoading,
    refresh,
  } = useSubscription();
  
  return {
    hasAccess: hasJournalAccess,
    plan: effectiveJournalPlan,
    isFromDirectSubscription: hasDirectJournalSubscription,
    isFromPlatformBundle: hasJournalFromPlatformBundle,
    isFromAdmin: isAdmin,
    isFromLifetime: isLifetimeUser,
    isPremium,
    isBasic,
    isTrial,
    isUnlimited: isUnlimitedUser,
    isAdmin,
    isLifetimeUser,
    canAddTrade,
    tradesRemaining: isUnlimitedUser ? Infinity : tradesRemaining,
    isLoading,
    refresh,
  };
}

// ================================================
// PLATFORM SUBSCRIPTION HOOK
// ================================================

export function usePlatformSubscription() {
  const {
    platformPlan,
    isPlatformFree,
    isPlatformCore,
    isPlatformPro,
    isPlatformEnterprise,
    isPlatformPaid,
    isPlatformActive,
    isPlatformInTrial,
    platformTrialDaysRemaining,
    isPlatformTrialExpiringSoon,
    platformDaysUntilExpiry,
    platformSubscriptionStatus,
    platformSubscriptionExpiresAt,
    platformWhopMembershipId,
    hasPlatformAiInsights,
    hasPlatformApiAccess,
    hasPlatformAdvancedScreeners,
    hasPlatformCustomReports,
    hasPlatformAdvancedCharts,
    hasJournalFromPlatformBundle,
    isAdmin,
    isLoading,
    refresh,
  } = useSubscription();
  
  const platformDisplayName = (() => {
    if (isAdmin) return 'Admin';
    switch (platformPlan) {
      case 'core': return 'Core';
      case 'pro': return 'Pro';
      case 'enterprise': return 'Enterprise';
      default: return 'Free';
    }
  })();
  
  const platformTrialMessage = (() => {
    if (isAdmin) return null;
    if (!isPlatformInTrial) return null;
    if (platformTrialDaysRemaining === 0) return 'Your trial ends today!';
    if (platformTrialDaysRemaining === 1) return 'Your trial ends tomorrow!';
    if (isPlatformTrialExpiringSoon) return `Your trial ends in ${platformTrialDaysRemaining} days`;
    return `${platformTrialDaysRemaining} days left in your trial`;
  })();
  
  const canUpgradeToCore = !isAdmin && isPlatformFree;
  const canUpgradeToPro = !isAdmin && (isPlatformFree || isPlatformCore);
  
  return {
    plan: platformPlan,
    displayName: platformDisplayName,
    isFree: isPlatformFree,
    isCore: isPlatformCore,
    isPro: isPlatformPro,
    isEnterprise: isPlatformEnterprise,
    isPaid: isPlatformPaid,
    isAdmin,
    isActive: isPlatformActive,
    status: platformSubscriptionStatus,
    expiresAt: platformSubscriptionExpiresAt,
    daysUntilExpiry: platformDaysUntilExpiry,
    isInTrial: isPlatformInTrial,
    trialDaysRemaining: platformTrialDaysRemaining,
    isTrialExpiringSoon: isPlatformTrialExpiringSoon,
    trialMessage: platformTrialMessage,
    whopMembershipId: platformWhopMembershipId,
    hasAiInsights: hasPlatformAiInsights,
    hasApiAccess: hasPlatformApiAccess,
    hasAdvancedScreeners: hasPlatformAdvancedScreeners,
    hasCustomReports: hasPlatformCustomReports,
    hasAdvancedCharts: hasPlatformAdvancedCharts,
    includesJournalPremium: hasJournalFromPlatformBundle,
    canUpgradeToCore,
    canUpgradeToPro,
    needsUpgrade: !isAdmin && isPlatformFree,
    isLoading,
    refresh,
  };
}

// ================================================
// HELPER HOOKS
// ================================================

export function usePlanSelectionGuard() {
  const { needsJournalPlanSelection, isLegacyFreeUser, isTrialExpired, isLoading, limits, hasJournalAccess, isAdmin, isLifetimeUser } = useSubscription();
  
  return {
    shouldRedirect: !isAdmin && !isLifetimeUser && needsJournalPlanSelection,
    isLegacyUser: isLegacyFreeUser,
    isTrialExpired,
    isLoading,
    currentPlan: limits?.account_type ?? null,
    subscriptionStatus: limits?.subscription_status ?? null,
    hasJournalAccess,
    isAdmin,
    isLifetimeUser,
  };
}

export function useTrialStatus() {
  const { 
    isTrial, 
    isTrialExpired, 
    isTrialExpiringSoon,
    trialDaysRemaining,
    trialEndsAt,
    trialUsed,
    isAdmin,
    isLifetimeUser,
    isLoading 
  } = useSubscription();
  
  return {
    isTrial,
    isTrialExpired,
    isTrialExpiringSoon,
    trialDaysRemaining,
    trialEndsAt,
    trialUsed,
    isAdmin,
    isLifetimeUser,
    isLoading,
    trialStatusMessage: (() => {
      if (isAdmin || isLifetimeUser) return null;
      if (!isTrial) return null;
      if (isTrialExpired) return 'Your free trial has ended. Upgrade to continue.';
      if (trialDaysRemaining === 0) return 'Your free trial ends today!';
      if (trialDaysRemaining === 1) return 'Your free trial ends tomorrow!';
      if (isTrialExpiringSoon) return `Your free trial ends in ${trialDaysRemaining} days`;
      return `${trialDaysRemaining} days left in your free trial`;
    })(),
  };
}

export function usePlatformFeatureAccess() {
  const {
    platformPlan,
    isPlatformFree,
    hasPlatformAiInsights,
    hasPlatformApiAccess,
    hasPlatformAdvancedScreeners,
    hasPlatformCustomReports,
    hasPlatformAdvancedCharts,
    isAdmin,
    isLoading,
  } = useSubscription();
  
  const hasFeature = (feature: string): boolean => {
    if (isAdmin) return true;
    
    switch (feature) {
      case 'ai_insights':
        return hasPlatformAiInsights;
      case 'api_access':
        return hasPlatformApiAccess;
      case 'advanced_screeners':
        return hasPlatformAdvancedScreeners;
      case 'custom_reports':
        return hasPlatformCustomReports;
      case 'advanced_charts':
        return hasPlatformAdvancedCharts;
      case 'dashboard':
      case 'market_data':
      case 'basic_analytics':
        return true;
      default:
        return false;
    }
  };
  
  const getRequiredPlan = (feature: string): string => {
    switch (feature) {
      case 'ai_insights':
      case 'api_access':
      case 'advanced_screeners':
      case 'custom_reports':
        return 'Pro';
      case 'advanced_charts':
        return 'Core';
      default:
        return 'Free';
    }
  };
  
  return {
    plan: platformPlan,
    isFree: isPlatformFree,
    isAdmin,
    hasFeature,
    getRequiredPlan,
    hasAiInsights: hasPlatformAiInsights,
    hasApiAccess: hasPlatformApiAccess,
    hasAdvancedScreeners: hasPlatformAdvancedScreeners,
    hasCustomReports: hasPlatformCustomReports,
    hasAdvancedCharts: hasPlatformAdvancedCharts,
    isLoading,
  };
}