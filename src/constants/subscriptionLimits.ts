// =====================================================
// FINOTAUR SUBSCRIPTION LIMITS - v3.0.0
// =====================================================
// Place in: src/constants/subscriptionLimits.ts
//
// ✅ Single source of truth for subscription limits
//
// 🔥 v3.0.0 CHANGES (2026-06):
// - REMOVED 'basic' tier (zero active subscribers — confirmed)
// - Journal tiers remaining: Free (10 lifetime trades) and Premium (unlimited)
// - isBasicUser() now only matches 'trial' (legacy in-flight refs) — basic plan is gone
// =====================================================

// ============================================
// SUBSCRIPTION LIMITS CONFIG
// ============================================

export const SUBSCRIPTION_LIMITS = {
  // Basic removed 2026-06 (zero subscribers). Free tier (10 lifetime trades) is handled at DB/RLS level.
  premium: {
    max_trades: Infinity,
    name: 'Trader',
    displayName: 'Trader Plan',
    reset: 'never' as const,
    price_monthly: 44.99,
    price_yearly: 409.00,
    trial_days: 0, // No trial - payment from day 0
    features: [
      'Broker sync — leading brokers supported',
      'Unlimited trades',
      'AI-powered insights & coach',
      'Advanced AI analysis',
      'Pattern recognition',
      'Custom AI reports',
      'Behavioral risk alerts',
      'Backtesting system',
      'Priority support',
      'Early access to new features',
    ],
  },
} as const;

// ============================================
// TYPES
// ============================================

// 'basic' removed from AccountType 2026-06. 'trial' kept for legacy in-flight webhook refs.
export type AccountType = 'premium' | 'admin' | 'vip' | 'trial';
export type PlanType = keyof typeof SUBSCRIPTION_LIMITS;

export interface SubscriptionStatus {
  accountType: AccountType;
  maxTrades: number;
  tradesUsed: number;
  tradesRemaining: number;
  isInTrial: boolean;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  resetDate: string | null;
  isPremium: boolean;
  needsUpgrade: boolean;
  needsPlanSelection: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get maximum trades for an account type.
 * Free tier (account_type = null / 'free') is capped at 10 lifetime trades (enforced at DB level).
 */
export function getMaxTrades(accountType: AccountType | string): number {
  if (isPremiumUser(accountType)) {
    return SUBSCRIPTION_LIMITS.premium.max_trades;
  }

  // 'trial' was a legacy alias for the old Basic plan (25 trades/month).
  // With Basic removed, trial users fall through to the free 10-trade lifetime cap.
  // Return a safe finite sentinel; actual enforcement is at the DB level.
  return 10;
}

/**
 * Check if user has premium access (unlimited trades)
 */
export function isPremiumUser(accountType: string | null | undefined): boolean {
  if (!accountType) return false;
  return accountType === 'premium' ||
         accountType === 'admin' ||
         accountType === 'vip';
}

/**
 * Check if user is in a basic/trial legacy state.
 * Basic plan was removed 2026-06 — this now only matches 'trial' for in-flight webhook refs.
 * TODO: remove callers once all legacy trial refs are migrated.
 */
export function isBasicUser(accountType: string | null | undefined): boolean {
  if (!accountType) return false;
  // 'basic' is kept as a string match for any in-flight DB rows that still have account_type='basic'
  return accountType === 'basic' || accountType === 'trial';
}

/**
 * Check if trade limit is reached
 */
export function isLimitReached(
  tradesUsed: number,
  maxTrades: number,
  accountType: string
): boolean {
  if (isPremiumUser(accountType)) return false;
  return tradesUsed >= maxTrades;
}

/**
 * Get remaining trades
 */
export function getRemainingTrades(
  tradesUsed: number,
  maxTrades: number,
  accountType: string
): number {
  if (isPremiumUser(accountType)) return Infinity;
  return Math.max(0, maxTrades - tradesUsed);
}

/**
 * Check if user needs to select a plan (no valid subscription)
 */
export function needsPlanSelection(
  accountType: string | null | undefined,
  subscriptionStatus: string | null | undefined
): boolean {
  // No account type means needs plan selection
  if (!accountType) return true;

  // Premium users never need plan selection
  if (isPremiumUser(accountType)) return false;

  // Check subscription status
  if (!subscriptionStatus) return true;
  if (subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled') return true;

  return false;
}

/**
 * Get plan display info
 */
export function getPlanDisplayInfo(accountType: AccountType | string): {
  name: string;
  badge: 'premium' | 'vip';
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (isPremiumUser(accountType)) {
    return {
      name: accountType === 'admin' ? 'Admin' : accountType === 'vip' ? 'VIP' : 'Trader',
      badge: accountType === 'vip' ? 'vip' : 'premium',
      color: 'text-[#C9A646]',
      bgColor: 'bg-[#C9A646]/20',
      borderColor: 'border-[#C9A646]/30',
    };
  }

  // Legacy fallback for any remaining 'basic' / 'trial' rows in DB
  return {
    name: accountType === 'trial' ? 'Free (Trial)' : 'Free',
    badge: 'premium', // fallback — callers should handle 'free' state themselves
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
  };
}

/**
 * Calculate trial days remaining
 */
export function getTrialDaysRemaining(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;

  const now = new Date();
  const endDate = new Date(trialEndsAt);
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Get days until monthly reset (1st of next month)
 */
export function getDaysUntilReset(): number {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const diffTime = nextMonth.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format reset date
 */
export function getResetDateFormatted(): string {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);

  return nextMonth.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================
// EXPORTS
// ============================================

export default {
  SUBSCRIPTION_LIMITS,
  getMaxTrades,
  isPremiumUser,
  isBasicUser,
  isLimitReached,
  getRemainingTrades,
  needsPlanSelection,
  getPlanDisplayInfo,
  getTrialDaysRemaining,
  getDaysUntilReset,
  getResetDateFormatted,
};
