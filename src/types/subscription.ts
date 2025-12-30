// =====================================================
// FINOTAUR SUBSCRIPTION TYPES - v2.0.0
// =====================================================
// Place in: src/types/subscription.ts
// 
// 🔥 v2.0.0 CHANGES:
// - REMOVED 'free' from AccountType
// - Added trial-related fields (is_in_trial, trial_ends_at, trial_days_remaining)
// - Updated comments to reflect new pricing model
// - Renamed is_free_trial → is_in_trial for consistency
// =====================================================

// ============================================
// CORE TYPES
// ============================================

/**
 * Account types available in Finotaur
 * 🔥 v2.0: 'free' kept for backward compatibility with existing users
 * New users will get 'trial' instead of 'free'
 */
export type AccountType = 'free' | 'basic' | 'premium' | 'trial' | 'admin' | 'vip';

export type SubscriptionInterval = 'monthly' | 'yearly';

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';

// ============================================
// USER LIMITS INTERFACE
// ============================================

export interface UserLimits {
  account_type: AccountType;
  subscription_interval: SubscriptionInterval | null;
  trade_count: number; // Current active trades (can decrease when deleted)
  trades_created_total: number; // Lifetime trades (NEVER decreases)
  max_trades: number; // 25 for basic, unlimited for premium
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  // 🔥 NEW: Trial fields
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
  yearlyMonthlyEquivalent: number; // Price per month when billed yearly
  interval: SubscriptionInterval;
  features: string[];
  max_trades: number;
  popular?: boolean;
  savings?: string; // e.g., "Save 38%"
  trialDays?: number; // 🔥 NEW: 14 for basic, 0 for premium
}

// ============================================
// USER SUBSCRIPTION DETAILS
// ============================================

export interface UserSubscriptionDetails extends UserLimits {
  can_add_trade: boolean;
  trades_remaining: number;
  is_premium: boolean;
  is_basic: boolean;
  is_in_trial: boolean; // 🔥 RENAMED from is_free_trial
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
  // 🔥 NEW
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
    yearly: 12.42, // per month when billed yearly
    yearlyTotal: 149, // $149/year
    trialDays: 14, // 🔥 NEW: 14-day free trial
  },
  premium: {
    monthly: 39.99,
    yearly: 24.92, // per month when billed yearly
    yearlyTotal: 299, // $299/year
    trialDays: 0, // 🔥 NEW: No trial - payment from day 0
  },
} as const;

// ============================================
// SAVINGS CALCULATIONS
// ============================================

export const YEARLY_SAVINGS = {
  basic: Math.round(((19.99 - 12.42) / 19.99) * 100), // ~38%
  premium: Math.round(((39.99 - 24.92) / 39.99) * 100), // ~38%
} as const;

// ============================================
// TRADE LIMITS
// ============================================

export const TRADE_LIMITS = {
  basic: 25, // 25 trades per month
  premium: Infinity, // Unlimited
  trial: 25, // Same as basic during trial
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
 */
export function hasUnlimitedTrades(accountType: AccountType): boolean {
  return accountType === 'premium' || accountType === 'admin' || accountType === 'vip';
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
 */
export function isUpgrade(from: AccountType, to: AccountType): boolean {
  const planOrder: Record<AccountType, number> = {
    free: 0,   // 🔥 v2.0: Legacy users
    trial: 0,
    basic: 1,
    premium: 2,
    vip: 3,
    admin: 4,
  };
  return planOrder[to] > planOrder[from];
}

/**
 * Check if downgrading from one plan to another
 */
export function isDowngrade(from: AccountType, to: AccountType): boolean {
  const planOrder: Record<AccountType, number> = {
    free: 0,   // 🔥 v2.0: Legacy users
    trial: 0,
    basic: 1,
    premium: 2,
    vip: 3,
    admin: 4,
  };
  return planOrder[to] < planOrder[from];
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Get display name for account type
 */
export function getAccountTypeDisplayName(accountType: AccountType): string {
  const names: Record<AccountType, string> = {
    free: 'Free (Legacy)',  // 🔥 v2.0: Legacy users only
    basic: 'Basic',
    premium: 'Premium',
    trial: 'Trial',
    admin: 'Admin',
    vip: 'VIP',
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

export default {
  SUBSCRIPTION_PRICES,
  YEARLY_SAVINGS,
  TRADE_LIMITS,
};