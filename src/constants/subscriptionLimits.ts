// =====================================================
// FINOTAUR SUBSCRIPTION LIMITS - v2.0.0
// =====================================================
// Place in: src/constants/subscriptionLimits.ts
// 
// ✅ Single source of truth for subscription limits
// 
// 🔥 v2.0.0 CHANGES:
// - Removed FREE tier completely
// - Added trial support for BASIC plan (14 days)
// - BASIC: 25 trades/month, payment after trial
// - PREMIUM: Unlimited trades, payment from day 0
// =====================================================

// ============================================
// SUBSCRIPTION LIMITS CONFIG
// ============================================

export const SUBSCRIPTION_LIMITS = {
  basic: {
    max_trades: 25,
    name: 'Basic',
    displayName: 'Basic Plan',
    reset: 'monthly' as const,
    price_monthly: 19.99,
    price_yearly: 149.00,
    trial_days: 14,
    features: [
      'Up to 25 trades per month',
      'Full performance analytics',
      'Strategy builder & tracking',
      'Calendar & trading sessions',
      'Advanced statistics & metrics',
      'Equity curve & charts',
      'Trade screenshots & notes',
      'Email support',
    ],
  },
  premium: {
    max_trades: Infinity,
    name: 'Premium',
    displayName: 'Premium Plan',
    reset: 'never' as const,
    price_monthly: 39.99,
    price_yearly: 299.00,
    trial_days: 0, // No trial - payment from day 0
    features: [
      'Everything in Basic, plus:',
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

export type AccountType = 'basic' | 'premium' | 'admin' | 'vip' | 'trial';
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
 * Get maximum trades for an account type
 */
export function getMaxTrades(accountType: AccountType | string): number {
  if (isPremiumUser(accountType)) {
    return SUBSCRIPTION_LIMITS.premium.max_trades;
  }
  
  if (accountType === 'basic' || accountType === 'trial') {
    return SUBSCRIPTION_LIMITS.basic.max_trades;
  }
  
  // Default to basic limits for unknown types
  return SUBSCRIPTION_LIMITS.basic.max_trades;
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
 * Check if user is in basic tier (including trial)
 */
export function isBasicUser(accountType: string | null | undefined): boolean {
  if (!accountType) return false;
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
  badge: 'basic' | 'premium' | 'vip';
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (isPremiumUser(accountType)) {
    return {
      name: accountType === 'admin' ? 'Admin' : accountType === 'vip' ? 'VIP' : 'Premium',
      badge: accountType === 'vip' ? 'vip' : 'premium',
      color: 'text-[#C9A646]',
      bgColor: 'bg-[#C9A646]/20',
      borderColor: 'border-[#C9A646]/30',
    };
  }
  
  return {
    name: accountType === 'trial' ? 'Basic (Trial)' : 'Basic',
    badge: 'basic',
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