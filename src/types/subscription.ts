// src/types/subscription.ts

export type AccountType = 'free' | 'basic' | 'premium';

export type SubscriptionInterval = 'monthly' | 'yearly';

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';

export interface UserLimits {
  account_type: AccountType;
  subscription_interval: SubscriptionInterval | null;
  trade_count: number; // Current active trades (can decrease when deleted)
  trades_created_total: number; // Lifetime trades (NEVER decreases)
  max_trades: number; // Maximum allowed trades (10 for free, unlimited for premium)
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
}

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
}

export interface UserSubscriptionDetails extends UserLimits {
  can_add_trade: boolean;
  trades_remaining: number;
  is_premium: boolean;
  is_basic: boolean;
  is_free_trial: boolean;
}

// Database function return types
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
}

export interface CanAddTradeResult {
  can_add: boolean;
  reason?: string;
}

// Audit log types
export interface TradeAuditLog {
  id: string;
  user_id: string;
  trade_id: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  old_data: any | null;
  new_data: any | null;
  created_at: string;
}

// Pricing constants
export const SUBSCRIPTION_PRICES = {
  basic: {
    monthly: 19.99,
    yearly: 12.42, // per month when billed yearly
    yearlyTotal: 149, // $149/year
  },
  premium: {
    monthly: 39.99,
    yearly: 24.92, // per month when billed yearly
    yearlyTotal: 299, // $299/year
  },
} as const;

// Calculate savings percentage
export const YEARLY_SAVINGS = {
  basic: Math.round(((19.99 - 12.42) / 19.99) * 100), // ~38%
  premium: Math.round(((39.99 - 24.92) / 39.99) * 100), // ~38%
} as const;