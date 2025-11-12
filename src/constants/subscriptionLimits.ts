// ✅ Single source of truth for subscription limits
export const SUBSCRIPTION_LIMITS = {
  free: {
    max_trades: 10,
    name: 'Free Plan',
    reset: 'never' as const,
    price: 0,
  },
  basic: {
    max_trades: 25,  // ✅ 25 כמו שרצית
    name: 'Basic Plan',
    reset: 'monthly' as const,
    price: 6.99,
  },
  premium: {
    max_trades: Infinity,
    name: 'Premium Plan',
    reset: 'never' as const,
    price: 12.99,
  },
} as const;

export type AccountType = keyof typeof SUBSCRIPTION_LIMITS;

// Helper functions
export function getMaxTrades(accountType: AccountType): number {
  return SUBSCRIPTION_LIMITS[accountType].max_trades;
}

export function isPremiumUser(accountType: string): boolean {
  return accountType === 'premium' || 
         accountType === 'admin' || 
         accountType === 'vip';
}

export function isLimitReached(
  tradesUsed: number, 
  maxTrades: number, 
  accountType: string
): boolean {
  if (isPremiumUser(accountType)) return false;
  return tradesUsed >= maxTrades;
}