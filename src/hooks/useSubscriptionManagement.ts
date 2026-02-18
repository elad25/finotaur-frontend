// =====================================================
// FINOTAUR SUBSCRIPTION MANAGEMENT HOOK - v2.0.0
// =====================================================
// Place in: src/hooks/useSubscriptionManagement.ts
// 
// Hook for managing subscriptions (cancel, downgrade, reactivate)
// 
// 🔥 v2.0.0 CHANGES:
// - REMOVED 'free' from DowngradePlan - users can only downgrade to 'basic' or cancel
// - Added validation to prevent downgrade to non-existent 'free' tier
// - Added 'cancel' as an explicit option
// - Improved error messages
// =====================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// ============================================
// TYPES
// ============================================

/**
 * 🔥 v2.0: Removed 'free' - users can only downgrade to Basic or cancel entirely
 */
export type DowngradePlan = 'basic' | 'cancel';

export interface SubscriptionStatus {
  plan: string;
  status: string;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  pendingDowngrade: string | null;
  hasMembership: boolean;
  // 🔥 NEW: Trial info
  isInTrial?: boolean;
  trialEndsAt?: string | null;
}

export interface ManageSubscriptionResult {
  success: boolean;
  message: string;
  subscription: SubscriptionStatus;
}

export interface CancellationReason {
  reason_id: string;
  reason_label: string;
  feedback?: string;
}

// ============================================
// CANCELLATION REASONS (for UI dropdown)
// ============================================

export const CANCELLATION_REASONS = [
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'not_using', label: "I'm not using it enough" },
  { id: 'missing_features', label: 'Missing features I need' },
  { id: 'found_alternative', label: 'Found a better alternative' },
  { id: 'temporary_break', label: 'Taking a temporary break' },
  { id: 'technical_issues', label: 'Technical issues' },
  { id: 'other', label: 'Other reason' },
] as const;

// ============================================
// EDGE FUNCTION URL
// ============================================

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-manage-subscription`;

// ============================================
// HOOK
// ============================================

export function useSubscriptionManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Invalidate all subscription-related caches
   */
  const invalidateCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
    queryClient.invalidateQueries({ queryKey: ['user-limits'] });
  }, [queryClient]);

  /**
   * Get current subscription status
   */
  const getStatus = useCallback(async (): Promise<SubscriptionStatus | null> => {
    if (!user) return null;

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${EDGE_FUNCTION_URL}?action=status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get subscription status');
      }

      const data = await response.json();
      return data.subscription;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('❌ Get status error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Cancel subscription (always at period end - user keeps access until cycle ends)
   */
  const cancelSubscription = useCallback(async (
    cancellationData?: string | CancellationReason,
    product: string = 'journal'
  ): Promise<ManageSubscriptionResult | null> => {
    if (!user) {
      toast.error('Please log in to manage your subscription');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      console.log('🔄 Canceling subscription...');

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancel',
          product,
          ...(typeof cancellationData === 'string' 
            ? { reason: cancellationData }
            : cancellationData 
          ),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      console.log('✅ Subscription cancelled:', data);

      // Invalidate caches
      invalidateCaches();

      toast.success('Subscription cancelled', { 
        description: data.message || 'You will retain access until the end of your billing period.' 
      });

      return data;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('❌ Cancel subscription error:', err);
      toast.error('Failed to cancel subscription', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, invalidateCaches]);

  /**
   * Downgrade subscription to a lower plan
   * 🔥 v2.0: Removed 'free' option - users can only downgrade to Basic or cancel
   */
  const downgradeSubscription = useCallback(async (
    targetPlan: DowngradePlan
  ): Promise<ManageSubscriptionResult | null> => {
    if (!user) {
      toast.error('Please log in to manage your subscription');
      return null;
    }

    // 🔥 Handle 'cancel' as a special case
    if (targetPlan === 'cancel') {
      return cancelSubscription();
    }

    // 🔥 Validate target plan - only 'basic' is allowed
    if (targetPlan !== 'basic') {
      toast.error('Invalid target plan. You can only downgrade to Basic or cancel.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      console.log('🔄 Downgrading subscription to:', targetPlan);

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'downgrade',
          targetPlan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to downgrade subscription');
      }

      console.log('✅ Subscription downgrade scheduled:', data);

      // Invalidate caches
      invalidateCaches();

      toast.success('Downgrade scheduled', { 
        description: data.message || 'Your plan will change at the end of your current billing period.' 
      });

      return data;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('❌ Downgrade subscription error:', err);
      toast.error('Failed to downgrade subscription', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, invalidateCaches, cancelSubscription]);

  /**
   * Reactivate a cancelled subscription (undo cancellation before period end)
   * This removes the cancel_at_period_end flag and keeps the subscription active
   */
  const reactivateSubscription = useCallback(async (): Promise<ManageSubscriptionResult | null> => {
    if (!user) {
      toast.error('Please log in to manage your subscription');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      console.log('🔄 Reactivating subscription...');

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reactivate',
          product: 'journal',  // 🔥 v2.5.0: Required field - journal is the default product here
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate subscription');
      }

      console.log('✅ Subscription reactivated:', data);

      // Invalidate caches
      invalidateCaches();

      toast.success('Subscription reactivated! 🎉', { 
        description: data.message || 'Your subscription will continue as normal.' 
      });

      return data;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('❌ Reactivate subscription error:', err);
      toast.error('Failed to reactivate subscription', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, invalidateCaches]);

  /**
   * Upgrade subscription to a higher plan
   * Redirects to Whop checkout for the new plan
   */
  const upgradeSubscription = useCallback(async (
    targetPlan: 'premium'
  ): Promise<{ checkoutUrl: string } | null> => {
    if (!user) {
      toast.error('Please log in to upgrade your subscription');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      console.log('🔄 Getting upgrade checkout URL for:', targetPlan);

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'upgrade',
          targetPlan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get upgrade URL');
      }

      console.log('✅ Got upgrade checkout URL:', data);

      return { checkoutUrl: data.checkoutUrl };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('❌ Upgrade subscription error:', err);
      toast.error('Failed to upgrade subscription', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    
    // Actions
    getStatus,
    cancelSubscription,
    downgradeSubscription,
    reactivateSubscription,
    upgradeSubscription,
    
    // Helpers
    clearError,
    isAuthenticated: !!user,
  };
}

// ============================================
// USAGE EXAMPLES
// ============================================

/*
const { 
  cancelSubscription, 
  downgradeSubscription, 
  reactivateSubscription,
  upgradeSubscription,
  isLoading 
} = useSubscriptionManagement();

// Cancel subscription (user keeps access until period ends)
await cancelSubscription('Too expensive');

// Cancel with structured reason
await cancelSubscription({
  reason_id: 'too_expensive',
  reason_label: 'Too expensive',
  feedback: 'I love the product but it\'s out of my budget right now'
});

// Downgrade from Premium to Basic (takes effect at period end)
await downgradeSubscription('basic');

// 🔥 Downgrade to cancel (cancels subscription)
await downgradeSubscription('cancel');

// Reactivate a cancelled subscription (undo the cancellation)
await reactivateSubscription();

// Upgrade to Premium (redirects to checkout)
const result = await upgradeSubscription('premium');
if (result?.checkoutUrl) {
  window.location.href = result.checkoutUrl;
}
*/

export default useSubscriptionManagement;