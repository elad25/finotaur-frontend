// =====================================================
// FINOTAUR SUBSCRIPTION TYPES - v3.0.0 (BETA SYSTEM)
// =====================================================
// Place in: src/types/subscription.ts
// 
// 🔥 v3.0.0 CHANGES:
// - ADDED: 'beta' to AccountType for beta testers
// - ADDED: Helper functions for beta access
// - Updated plan ordering to include beta
// =====================================================

// ============================================
// CORE TYPES
// ============================================

/**
 * Account types available in Finotaur
 * 🔥 v3.0: Added 'beta' for beta testers with full access
 */
export type AccountType = 'free' | 'basic' | 'premium' | 'trial' | 'admin' | 'vip' | 'beta';

export type SubscriptionInterval = 'monthly' | 'yearly';

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';

// ============================================
// USER LIMITS INTERFACE
// ============================================

export interface UserLimits {
  account_type: AccountType;
  subscription_interval: SubscriptionInterval | null;
  trade_count: number;
  trades_created_total: number;
  max_trades: number;
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  is_in_trial: boolean;
  trial_ends_at: string | null;
  trial_days_remaining: number | null;
}

// ============================================
// SUBSCRIPTION PLAN INTERFACE
// ============================================

export interface SubscriptionPlan {
  id: AccountType;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyMonthlyEquivalent: number;
  interval: SubscriptionInterval;
  features: string[];
  max_trades: number;
  popular?: boolean;
  savings?: string;
  trialDays?: number;
}

// ============================================
// USER SUBSCRIPTION DETAILS
// ============================================

export interface UserSubscriptionDetails extends UserLimits {
  can_add_trade: boolean;
  trades_remaining: number;
  is_premium: boolean;
  is_basic: boolean;
  is_in_trial: boolean;
  is_beta: boolean;  // 🔥 NEW
}

// ============================================
// DATABASE FUNCTION RETURN TYPES
// ============================================

export interface GetUserLimitsResult {
  account_type: AccountType;
  subscription_interval: SubscriptionInterval | null;
  trade_count: number;
  trades_created_total: number;
  max_trades: number;
  trades_remaining: number;
  can_add_trade: boolean;
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  is_in_trial: boolean;
  trial_ends_at: string | null;
}

export interface CanAddTradeResult {
  can_add: boolean;
  reason?: string;
}

// ============================================
// AUDIT LOG TYPES
// ============================================

export interface TradeAuditLog {
  id: string;
  user_id: string;
  trade_id: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  old_data: any | null;
  new_data: any | null;
  created_at: string;
}

// ============================================
// PRICING CONSTANTS
// ============================================

export const SUBSCRIPTION_PRICES = {
  basic: {
    monthly: 19.99,
    yearly: 12.42,
    yearlyTotal: 149,
    trialDays: 14,
  },
  premium: {
    monthly: 39.99,
    yearly: 24.92,
    yearlyTotal: 299,
    trialDays: 0,
  },
} as const;

// ============================================
// SAVINGS CALCULATIONS
// ============================================

export const YEARLY_SAVINGS = {
  basic: Math.round(((19.99 - 12.42) / 19.99) * 100),
  premium: Math.round(((39.99 - 24.92) / 39.99) * 100),
} as const;

// ============================================
// TRADE LIMITS
// ============================================

export const TRADE_LIMITS = {
  basic: 25,
  premium: Infinity,
  trial: 25,
  beta: Infinity,  // 🔥 NEW: Beta users have unlimited trades
} as const;

// ============================================
// HELPER TYPE GUARDS
// ============================================

/**
 * Check if account type is a paid plan (basic or premium)
 */
export function isPaidPlan(accountType: AccountType): boolean {
  return accountType === 'basic' || accountType === 'premium';
}

/**
 * Check if account type has unlimited trades
 * 🔥 v3.0: Beta users now have unlimited trades
 */
export function hasUnlimitedTrades(accountType: AccountType): boolean {
  return accountType === 'premium' || 
         accountType === 'admin' || 
         accountType === 'vip' ||
         accountType === 'beta';  // 🔥 NEW
}

/**
 * 🔥 NEW: Check if account type has beta access
 * Beta access grants access to locked domains and beta features
 */
export function hasBetaAccess(accountType: AccountType, role?: string): boolean {
  return accountType === 'admin' || 
         accountType === 'vip' ||
         accountType === 'beta' ||
         role === 'admin' ||
         role === 'super_admin';
}

/**
 * Get max trades for an account type
 */
export function getMaxTrades(accountType: AccountType): number {
  if (hasUnlimitedTrades(accountType)) {
    return Infinity;
  }
  return TRADE_LIMITS.basic;
}

/**
 * Check if plan has a trial period
 */
export function hasTrial(planId: 'basic' | 'premium'): boolean {
  return SUBSCRIPTION_PRICES[planId].trialDays > 0;
}

// ============================================
// PLAN COMPARISON HELPERS
// ============================================

/**
 * Check if upgrading from one plan to another
 * 🔥 v3.0: Beta is ranked between premium and vip
 */
export function isUpgrade(from: AccountType, to: AccountType): boolean {
  const planOrder: Record<AccountType, number> = {
    free: 0,
    trial: 0,
    basic: 1,
    premium: 2,
    beta: 3,  // 🔥 NEW
    vip: 4,
    admin: 5,
  };
  return planOrder[to] > planOrder[from];
}

/**
 * Check if downgrading from one plan to another
 */
export function isDowngrade(from: AccountType, to: AccountType): boolean {
  const planOrder: Record<AccountType, number> = {
    free: 0,
    trial: 0,
    basic: 1,
    premium: 2,
    beta: 3,  // 🔥 NEW
    vip: 4,
    admin: 5,
  };
  return planOrder[to] < planOrder[from];
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Get display name for account type
 * 🔥 v3.0: Added Beta display name
 */
export function getAccountTypeDisplayName(accountType: AccountType): string {
  const names: Record<AccountType, string> = {
    free: 'Free (Legacy)',
    basic: 'Basic',
    premium: 'Premium',
    trial: 'Trial',
    admin: 'Admin',
    vip: 'VIP',
    beta: 'Beta Tester',  // 🔥 NEW
  };
  return names[accountType] || accountType;
}

/**
 * Get status badge color
 */
export function getStatusColor(status: SubscriptionStatus): string {
  const colors: Record<SubscriptionStatus, string> = {
    trial: 'blue',
    active: 'green',
    expired: 'red',
    cancelled: 'orange',
  };
  return colors[status] || 'gray';
}

/**
 * 🔥 NEW: Get badge color for account type
 */
export function getAccountTypeBadgeColor(accountType: AccountType): string {
  const colors: Record<AccountType, string> = {
    free: 'gray',
    trial: 'blue',
    basic: 'green',
    premium: 'purple',
    beta: 'orange',  // 🔥 NEW
    vip: 'gold',
    admin: 'red',
  };
  return colors[accountType] || 'gray';
}

export default {
  SUBSCRIPTION_PRICES,
  YEARLY_SAVINGS,
  TRADE_LIMITS,
};