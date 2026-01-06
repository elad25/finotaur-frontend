// ================================================
// OPTIMIZED SUBSCRIPTION HOOK - v8.1.0
// File: src/hooks/useSubscription.ts
// ================================================
// 🔥 v8.0.0 CHANGES:
// - FIXED: Platform plan types to match DB (free/core/pro/enterprise)
// - FIXED: Only Platform PRO gives Journal Premium access
// - FIXED: Platform CORE/FREE = NO Journal access
// - ADDED: hasJournalAccess computed flag
// - ADDED: Journal access from Platform bundle logic
// 🔥 v8.1.0 CHANGES:
// - FIXED: Admin/VIP users now bypass ALL limit checks
// - FIXED: isAdmin check happens FIRST before subscription checks
// - FIXED: canAddTrade always true for admin/vip
// - FIXED: hasJournalAccess always true for admin/vip
// ================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

// ================================================
// TYPES - 🔥 v8.0: Fixed Platform types
// ================================================

/**
 * Journal Account types
 */
export type AccountType = 'free' | 'trial' | 'basic' | 'premium' | 'admin' | 'vip';

/**
 * 🔥 v8.0: Platform Plan types (matches DB values)
 * DB stores: 'free', 'core', 'pro', 'enterprise' (no prefix!)
 */
export type PlatformPlan = 'free' | 'core' | 'pro' | 'enterprise' | null;

/**
 * Subscription status
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
 * TradeLimits interface (Journal)
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
  
  // Trial tracking
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
  
  // 🔥 v8.0: Platform subscription fields
  platform_plan: PlatformPlan;
  platform_subscription_status: SubscriptionStatus;
  platform_subscription_interval: SubscriptionInterval;
  platform_subscription_expires_at: string | null;
  platform_is_in_trial: boolean;
  platform_trial_ends_at: string | null;
  platform_trial_days_remaining: number | null;
  platform_whop_membership_id: string | null;
  platform_bundle_journal_granted: boolean;
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
  platform: (userId: string) => [...subscriptionKeys.all, 'platform', userId] as const,
};

// ================================================
// 🔥 MAIN HOOK - v8.1 WITH ADMIN FIX
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
        
        // Calculate trial info (Journal)
        const trialEndsAt = result.trial_ends_at || result.subscription_expires_at;
        const isInTrial = result.account_type === 'trial' || result.subscription_status === 'trial';
        let trialDaysRemaining: number | null = null;
        
        if (isInTrial && trialEndsAt) {
          const now = new Date();
          const trialEnd = new Date(trialEndsAt);
          trialDaysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }
        
        // 🔥 v8.0: Calculate Platform trial info
        const platformTrialEndsAt = result.platform_trial_ends_at;
        const platformIsInTrial = result.platform_is_in_trial || result.platform_subscription_status === 'trial';
        let platformTrialDaysRemaining: number | null = null;
        
        if (platformIsInTrial && platformTrialEndsAt) {
          const now = new Date();
          const trialEnd = new Date(platformTrialEndsAt);
          platformTrialDaysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }
        
        const accountType = (result.account_type || null) as AccountType;
        // 🔥 v8.0: Platform plan without prefix (matches DB)
        const platformPlan = (result.platform_plan || null) as PlatformPlan;
        
        const tradeLimits: TradeLimits = {
          // Core limits
          remaining: safeNumber(result.remaining, 0),
          used: safeNumber(result.used, 0),
          max_trades: safeNumber(result.max_trades, accountType === 'free' ? 0 : 25),
          plan: safeString(result.plan || result.account_type, ''),
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
          
          // Trial info (Journal)
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
          
          // 🔥 v8.0: Platform subscription fields
          platform_plan: platformPlan,
          platform_subscription_status: (result.platform_subscription_status || null) as SubscriptionStatus,
          platform_subscription_interval: (result.platform_billing_interval || null) as SubscriptionInterval,
          platform_subscription_expires_at: result.platform_subscription_expires_at || null,
          platform_is_in_trial: platformIsInTrial,
          platform_trial_ends_at: platformTrialEndsAt || null,
          platform_trial_days_remaining: platformTrialDaysRemaining,
          platform_whop_membership_id: result.platform_whop_membership_id || null,
          platform_bundle_journal_granted: result.platform_bundle_journal_granted || false,
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
  // 🔥 v8.1.0: ADMIN CHECK FIRST! (CRITICAL FIX)
  // ═══════════════════════════════════════════
  // Admin/VIP users bypass ALL subscription checks
  // This must be checked BEFORE any other logic
  // ═══════════════════════════════════════════
  
  const isAdmin = 
    limits?.role === 'admin' || 
    limits?.role === 'super_admin' ||
    limits?.account_type === 'admin' ||
    limits?.account_type === 'vip';
  
  // 🔥 v8.1.0: Debug log for admin detection
  if (import.meta.env.DEV && limits) {
    logOnce(`admin-check-${effectiveUserId}`, '🛡️ Admin check:', {
      role: limits.role,
      account_type: limits.account_type,
      isAdmin,
    });
  }
  
  // ═══════════════════════════════════════════
  // 🔥 v8.0: PLATFORM COMPUTED VALUES (CORRECTED)
  // ═══════════════════════════════════════════
  
  const platformPlan = limits?.platform_plan || null;
  const isPlatformFree = platformPlan === 'free' || platformPlan === null;
  const isPlatformCore = platformPlan === 'core';
  const isPlatformPro = platformPlan === 'pro';
  const isPlatformEnterprise = platformPlan === 'enterprise';
  const isPlatformPaid = isPlatformCore || isPlatformPro || isPlatformEnterprise;
  
  const isPlatformActive = 
    limits?.platform_subscription_status === 'active' ||
    limits?.platform_subscription_status === 'trial';
  
  const isPlatformInTrial = limits?.platform_is_in_trial ?? false;
  const platformTrialDaysRemaining = limits?.platform_trial_days_remaining ?? null;
  
  // ═══════════════════════════════════════════
  // 🔥 v8.1.0: JOURNAL ACCESS LOGIC (FIXED FOR ADMIN)
  // ═══════════════════════════════════════════
  // 
  // Journal access comes from:
  // 1. 🔥 ADMIN/VIP (always has access - checked FIRST!)
  // 2. Direct Journal subscription (basic/premium/trial)
  // 3. Platform PRO bundle (gives Premium)
  // 4. Platform ENTERPRISE bundle (gives Premium)
  // 
  // Platform FREE/CORE = NO Journal access!
  // ═══════════════════════════════════════════
  
  // Direct Journal subscription check (for non-admins)
  const hasDirectJournalSubscription = 
    !isAdmin && // 🔥 v8.1.0: Skip this check for admins
    limits?.account_type && 
    ['basic', 'premium', 'trial'].includes(limits.account_type) &&
    (limits.subscription_status === 'active' || limits.subscription_status === 'trial');
  
  // 🔥 Platform PRO/Enterprise bundle gives Journal Premium
  const hasJournalFromPlatformBundle = 
    !isAdmin && // 🔥 v8.1.0: Skip this check for admins
    (isPlatformPro || isPlatformEnterprise) && 
    isPlatformActive &&
    (limits?.platform_bundle_journal_granted === true);
  
  // 🔥 v8.1.0: Combined Journal access check - ADMIN FIRST!
  const hasJournalAccess = isAdmin || hasDirectJournalSubscription || hasJournalFromPlatformBundle;
  
  // Determine effective Journal plan
  const effectiveJournalPlan = (() => {
    // 🔥 v8.1.0: Admin/VIP always premium - CHECK FIRST!
    if (isAdmin) {
      return 'premium';
    }
    // Direct subscription takes priority
    if (hasDirectJournalSubscription) {
      return limits?.account_type as AccountType;
    }
    // Platform PRO/Enterprise bundle = Premium
    if (hasJournalFromPlatformBundle) {
      return 'premium';
    }
    return null;
  })();
  
  // ═══════════════════════════════════════════
  // JOURNAL COMPUTED VALUES (v8.1.0 - updated)
  // ═══════════════════════════════════════════
  
  const isTrial = !isAdmin && effectiveJournalPlan === 'trial';
  const isBasic = !isAdmin && effectiveJournalPlan === 'basic';
  const isPremium = isAdmin || effectiveJournalPlan === 'premium'; // 🔥 Admin = always premium
  const isLegacyFreeUser = !isAdmin && limits?.account_type === 'free';
  const isUnlimitedUser = isAdmin || isPremium; // 🔥 Admin = always unlimited
  const isPaidUser = hasJournalAccess && (isBasic || isPremium || isTrial);
  
  // 🔥 v8.1.0: CRITICAL FIX - Admin always has remaining trades
  const tradesRemaining = isAdmin 
    ? Infinity 
    : isUnlimitedUser 
      ? Infinity 
      : !hasJournalAccess 
        ? 0 
        : limits?.remaining ?? 0;
  
  // 🔥 v8.1.0: CRITICAL FIX - Admin can ALWAYS add trades
  const canAddTrade = isAdmin || (hasJournalAccess && (isUnlimitedUser || (limits?.remaining ?? 0) > 0));
  
  // 🔥 v8.1.0: Admin never hits limit
  const isLimitReached = !isAdmin && !isUnlimitedUser && (!hasJournalAccess || (limits?.remaining ?? 0) <= 0);
  
  const canUseSnapTrade = isAdmin || (hasJournalAccess && (isTrial || isBasic || isPremium));
  
  const isExpiringSoon = (() => {
    if (isAdmin) return false; // 🔥 Admin never expires
    if (!limits?.subscription_expires_at) return false;
    const expiresAt = new Date(limits.subscription_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  })();
  
  const daysUntilExpiry = (() => {
    if (isAdmin) return null; // 🔥 Admin = no expiry
    if (!limits?.subscription_expires_at) return null;
    const expiresAt = new Date(limits.subscription_expires_at);
    const now = new Date();
    return Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  })();
  
  const isTrialExpired = (() => {
    if (isAdmin) return false; // 🔥 Admin = no trial
    if (!isTrial) return false;
    if (!limits?.trial_ends_at) return false;
    const trialEnd = new Date(limits.trial_ends_at);
    return trialEnd < new Date();
  })();
  
  const isTrialExpiringSoon = (() => {
    if (isAdmin) return false; // 🔥 Admin = no trial
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
  const isCancelledButActive = !isAdmin && limits?.subscription_cancel_at_period_end && 
    (limits?.subscription_status === 'active' || limits?.subscription_status === 'trial');

  // 🔥 v8.1.0: Admin never needs plan selection
  const needsJournalPlanSelection = !isAdmin && !hasJournalAccess && !isLoading;

  // Platform feature access
  const hasPlatformAiInsights = isAdmin || isPlatformPro || isPlatformEnterprise;
  const hasPlatformApiAccess = isAdmin || isPlatformPro || isPlatformEnterprise;
  const hasPlatformAdvancedScreeners = isAdmin || isPlatformPro || isPlatformEnterprise;
  const hasPlatformCustomReports = isAdmin || isPlatformPro || isPlatformEnterprise;
  const hasPlatformAdvancedCharts = isAdmin || isPlatformCore || isPlatformPro || isPlatformEnterprise;

  const isPlatformTrialExpiringSoon = (() => {
    if (isAdmin) return false; // 🔥 Admin = no trial
    if (!isPlatformInTrial) return false;
    const daysLeft = platformTrialDaysRemaining ?? 0;
    return daysLeft > 0 && daysLeft <= 3;
  })();
  
  const platformDaysUntilExpiry = (() => {
    if (isAdmin) return null; // 🔥 Admin = no expiry
    if (!limits?.platform_subscription_expires_at) return null;
    const expiresAt = new Date(limits.platform_subscription_expires_at);
    const now = new Date();
    return Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  })();

  return {
    // Main data
    limits,
    isLoading,
    loading: isLoading,
    error: error?.message || null,
    
    // 🔥 v8.1.0: Admin flag (NEW - expose for debugging)
    isAdmin,
    
    // 🔥 v8.0: Journal access (NEW - most important!)
    hasJournalAccess,
    effectiveJournalPlan,
    hasDirectJournalSubscription,
    hasJournalFromPlatformBundle,
    
    // Journal: Account type checks
    isTrial,
    isBasic,
    isPremium,
    isPaidUser,
    isUnlimitedUser,
    isLegacyFreeUser,
    needsJournalPlanSelection,
    // Keep old name for backward compatibility
    needsPlanSelection: needsJournalPlanSelection,
    
    // Journal: Trade limits
    tradesRemaining,
    canAddTrade,
    isLimitReached,
    isLifetimeLimit: false,
    
    // Journal: Feature access
    canUseSnapTrade,
    
    // Journal: Subscription status
    isExpiringSoon,
    daysUntilExpiry,
    isCancelledButActive,
    
    // Journal: Trial info
    isInTrial: isTrial,
    isTrialExpired,
    isTrialExpiringSoon,
    trialDaysRemaining: limits?.trial_days_remaining ?? null,
    trialEndsAt: limits?.trial_ends_at ?? null,
    
    // Journal: Payment provider
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
    
    // 🔥 v8.0: Platform subscription (CORRECTED)
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
    platformSubscriptionStatus: limits?.platform_subscription_status ?? null,
    platformSubscriptionExpiresAt: limits?.platform_subscription_expires_at ?? null,
    platformWhopMembershipId: limits?.platform_whop_membership_id ?? null,
    
    // 🔥 v8.0: Platform features
    hasPlatformAiInsights,
    hasPlatformApiAccess,
    hasPlatformAdvancedScreeners,
    hasPlatformCustomReports,
    hasPlatformAdvancedCharts,
    
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
    hasJournalAccess,
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
    needsJournalPlanSelection,
    // Platform
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
    // Journal Access (most important!)
    hasJournalAccess,
    // Journal
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
    needsJournalPlanSelection,
    // Platform
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
// 🔥 v8.0: JOURNAL ACCESS GUARD HOOK (NEW)
// ================================================

/**
 * Hook specifically for checking Journal access
 * Use this in Journal routes to determine if user can access
 */
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
    isLoading,
    refresh,
  } = useSubscription();
  
  return {
    // Main access check
    hasAccess: hasJournalAccess,
    plan: effectiveJournalPlan,
    
    // Source of access
    isFromDirectSubscription: hasDirectJournalSubscription,
    isFromPlatformBundle: hasJournalFromPlatformBundle,
    isFromAdmin: isAdmin, // 🔥 v8.1.0: NEW
    
    // Plan type
    isPremium,
    isBasic,
    isTrial,
    isUnlimited: isUnlimitedUser,
    isAdmin, // 🔥 v8.1.0: NEW
    
    // Trade limits
    canAddTrade,
    tradesRemaining: isUnlimitedUser ? Infinity : tradesRemaining,
    
    // State
    isLoading,
    refresh,
  };
}

// ================================================
// 🔥 v8.0: PLATFORM SUBSCRIPTION HOOK (CORRECTED)
// ================================================

/**
 * Hook specifically for Platform subscription
 */
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
  
  // Platform display name
  const platformDisplayName = (() => {
    if (isAdmin) return 'Admin'; // 🔥 v8.1.0
    switch (platformPlan) {
      case 'core': return 'Core';
      case 'pro': return 'Pro';
      case 'enterprise': return 'Enterprise';
      default: return 'Free';
    }
  })();
  
  // Platform trial message
  const platformTrialMessage = (() => {
    if (isAdmin) return null; // 🔥 v8.1.0
    if (!isPlatformInTrial) return null;
    if (platformTrialDaysRemaining === 0) return 'Your trial ends today!';
    if (platformTrialDaysRemaining === 1) return 'Your trial ends tomorrow!';
    if (isPlatformTrialExpiringSoon) return `Your trial ends in ${platformTrialDaysRemaining} days`;
    return `${platformTrialDaysRemaining} days left in your trial`;
  })();
  
  // Can upgrade
  const canUpgradeToCore = !isAdmin && isPlatformFree;
  const canUpgradeToPro = !isAdmin && (isPlatformFree || isPlatformCore);
  
  return {
    // Plan info
    plan: platformPlan,
    displayName: platformDisplayName,
    
    // Plan checks
    isFree: isPlatformFree,
    isCore: isPlatformCore,
    isPro: isPlatformPro,
    isEnterprise: isPlatformEnterprise,
    isPaid: isPlatformPaid,
    isAdmin, // 🔥 v8.1.0: NEW
    
    // Status
    isActive: isPlatformActive,
    status: platformSubscriptionStatus,
    expiresAt: platformSubscriptionExpiresAt,
    daysUntilExpiry: platformDaysUntilExpiry,
    
    // Trial
    isInTrial: isPlatformInTrial,
    trialDaysRemaining: platformTrialDaysRemaining,
    isTrialExpiringSoon: isPlatformTrialExpiringSoon,
    trialMessage: platformTrialMessage,
    
    // Whop
    whopMembershipId: platformWhopMembershipId,
    
    // Features
    hasAiInsights: hasPlatformAiInsights,
    hasApiAccess: hasPlatformApiAccess,
    hasAdvancedScreeners: hasPlatformAdvancedScreeners,
    hasCustomReports: hasPlatformCustomReports,
    hasAdvancedCharts: hasPlatformAdvancedCharts,
    
    // 🔥 v8.0: Journal bundle (only PRO/Enterprise)
    includesJournalPremium: hasJournalFromPlatformBundle,
    
    // Upgrade
    canUpgradeToCore,
    canUpgradeToPro,
    needsUpgrade: !isAdmin && isPlatformFree, // 🔥 v8.1.0
    
    // State
    isLoading,
    refresh,
  };
}

// ================================================
// HELPER HOOK FOR PLAN SELECTION REDIRECT
// ================================================

export function usePlanSelectionGuard() {
  const { needsJournalPlanSelection, isLegacyFreeUser, isTrialExpired, isLoading, limits, hasJournalAccess, isAdmin } = useSubscription();
  
  return {
    shouldRedirect: !isAdmin && needsJournalPlanSelection, // 🔥 v8.1.0
    isLegacyUser: isLegacyFreeUser,
    isTrialExpired,
    isLoading,
    currentPlan: limits?.account_type ?? null,
    subscriptionStatus: limits?.subscription_status ?? null,
    hasJournalAccess,
    isAdmin, // 🔥 v8.1.0: NEW
  };
}

// ================================================
// HELPER HOOK FOR TRIAL STATUS
// ================================================

export function useTrialStatus() {
  const { 
    isTrial, 
    isTrialExpired, 
    isTrialExpiringSoon,
    trialDaysRemaining,
    trialEndsAt,
    isAdmin,
    isLoading 
  } = useSubscription();
  
  return {
    isTrial,
    isTrialExpired,
    isTrialExpiringSoon,
    trialDaysRemaining,
    trialEndsAt,
    isAdmin, // 🔥 v8.1.0: NEW
    isLoading,
    trialStatusMessage: (() => {
      if (isAdmin) return null; // 🔥 v8.1.0
      if (!isTrial) return null;
      if (isTrialExpired) return 'Your free trial has ended. Upgrade to continue.';
      if (trialDaysRemaining === 0) return 'Your free trial ends today!';
      if (trialDaysRemaining === 1) return 'Your free trial ends tomorrow!';
      if (isTrialExpiringSoon) return `Your free trial ends in ${trialDaysRemaining} days`;
      return `${trialDaysRemaining} days left in your free trial`;
    })(),
  };
}

// ================================================
// 🔥 v8.0: PLATFORM FEATURE ACCESS HOOK
// ================================================

/**
 * Hook for checking Platform feature access
 */
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
  
  /**
   * Check if user has access to a specific feature
   */
  const hasFeature = (feature: string): boolean => {
    // 🔥 v8.1.0: Admin has all features
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
        return true; // Available to all
      default:
        return false;
    }
  };
  
  /**
   * Get the required plan for a feature
   */
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
    isAdmin, // 🔥 v8.1.0: NEW
    hasFeature,
    getRequiredPlan,
    // Quick checks
    hasAiInsights: hasPlatformAiInsights,
    hasApiAccess: hasPlatformApiAccess,
    hasAdvancedScreeners: hasPlatformAdvancedScreeners,
    hasCustomReports: hasPlatformCustomReports,
    hasAdvancedCharts: hasPlatformAdvancedCharts,
    isLoading,
  };
}