// =====================================================
// FINOTAUR SUBSCRIPTION MANAGEMENT HOOK - v1.0.0
// =====================================================
// Place in: src/hooks/useSubscriptionManagement.ts
// 
// Hook for managing subscriptions (cancel, downgrade)
// =====================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// ============================================
// TYPES
// ============================================

export type DowngradePlan = 'basic' | 'free';

export interface SubscriptionStatus {
  plan: string;
  status: string;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  pendingDowngrade: string | null;
  hasMembership: boolean;
}

export interface ManageSubscriptionResult {
  success: boolean;
  message: string;
  subscription: SubscriptionStatus;
}

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
    cancellationData?: string | { reason_id: string; reason_label: string; feedback?: string }
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
          ...(typeof cancellationData  === 'string' 
            ? { reason: cancellationData  }
            : cancellationData 
          ),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      console.log('✅ Subscription cancelled:', data);

      // Invalidate profile cache
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });

      toast.success('Subscription cancelled', { description: data.message });

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
  }, [user, queryClient]);

  /**
   * Downgrade subscription to a lower plan
   */
  const downgradeSubscription = useCallback(async (
    targetPlan: DowngradePlan
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

      // Invalidate profile cache
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });

      toast.success('Downgrade scheduled', { description: data.message });

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
  }, [user, queryClient]);

  /**
   * Reactivate a cancelled subscription (before period end)
   * Note: This may require a new subscription if already cancelled
   */
  const reactivateSubscription = useCallback(async (): Promise<boolean> => {
    // For now, direct user to re-subscribe
    // Whop may have a reactivate API we can use
    toast.info('To reactivate, please subscribe again from the pricing page.');
    return false;
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
    
    // Helpers
    isAuthenticated: !!user,
  };
}

// Usage example:
// const { cancelSubscription, downgradeSubscription, isLoading } = useSubscriptionManagement();
// 
// // Cancel subscription (user keeps access until period ends)
// await cancelSubscription('Too expensive');
// 
// // Downgrade from Premium to Basic (takes effect at period end)
// await downgradeSubscription('basic');
// 
// // Downgrade to Free (cancels subscription, access until period ends)
// await downgradeSubscription('free');

export default useSubscriptionManagement;