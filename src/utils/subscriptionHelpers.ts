// ================================================
// SUBSCRIPTION HELPERS - CLIENT UTILITIES ONLY
// File: src/utils/subscriptionHelpers.ts
// ✅ Pure functions - NO Supabase calls
// ✅ Use with useSubscription hook data
// ================================================

import type { TradeLimits } from '@/hooks/useSubscription';

/**
 * Format remaining trades for display
 * Pure function - uses data from useSubscription hook
 */
export function formatTradesRemaining(limits: TradeLimits | null | undefined): string {
  if (!limits) return 'Loading...';
  
  // Unlimited users
  if (
    limits.account_type === 'premium' || 
    limits.account_type === 'admin' ||
    limits.account_type === 'vip' ||
    limits.role === 'admin' ||
    limits.role === 'super_admin'
  ) {
    return '∞ Unlimited';
  }
  
  // Regular users
  return `${limits.remaining} / ${limits.max_trades}`;
}

/**
 * Check if user is on trial
 */
export function isOnTrial(limits: TradeLimits | null | undefined): boolean {
  if (!limits) return false;
  return limits.account_type === 'trial' || limits.subscription_status === 'trial';
}

/**
 * Check if user needs to upgrade (80% threshold)
 */
export function shouldShowUpgradePrompt(limits: TradeLimits | null | undefined): boolean {
  if (!limits) return false;
  
  // Don't show for premium users
  if (limits.account_type !== 'free') return false;
  
  // Show if used 80% or more
  const usagePercent = (limits.used / limits.max_trades) * 100;
  return usagePercent >= 80;
}

/**
 * Get upgrade urgency level
 */
export function getUpgradeUrgency(
  limits: TradeLimits | null | undefined
): 'none' | 'low' | 'medium' | 'high' | 'critical' {
  if (!limits) return 'none';
  
  // No urgency for premium users
  if (limits.account_type !== 'free') return 'none';
  
  const remaining = limits.remaining;
  
  if (remaining === 0) return 'critical';
  if (remaining <= 2) return 'high';
  if (remaining <= 5) return 'medium';
  if (remaining <= 7) return 'low';
  return 'none';
}

/**
 * Get next reset date formatted
 */
export function getNextResetDate(limits: TradeLimits | null | undefined): string {
  if (!limits || !limits.reset_date) return 'Unknown';
  
  try {
    const resetDate = new Date(limits.reset_date);
    return resetDate.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return 'Unknown';
  }
}

/**
 * Calculate days until reset
 */
export function getDaysUntilReset(limits: TradeLimits | null | undefined): number {
  if (!limits || !limits.reset_date) return 0;
  
  try {
    const resetDate = new Date(limits.reset_date);
    const today = new Date();
    const diffTime = resetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch {
    return 0;
  }
}

/**
 * Check if subscription is expired
 */
export function isSubscriptionExpired(limits: TradeLimits | null | undefined): boolean {
  if (!limits || !limits.subscription_expires_at) return false;
  
  try {
    const expiryDate = new Date(limits.subscription_expires_at);
    return expiryDate < new Date();
  } catch {
    return false;
  }
}

/**
 * Get subscription status badge color
 */
export function getSubscriptionBadgeColor(
  status: TradeLimits['subscription_status']
): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'active':
      return 'success';
    case 'trial':
      return 'warning';
    case 'expired':
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}