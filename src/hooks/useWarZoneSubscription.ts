// =====================================================
// useWarZoneSubscription Hook - v1.0.0
// =====================================================
// Hook for managing War Zone (Newsletter) subscription
// Uses the newsletter-cancel Edge Function
// =====================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface WarZoneSubscription {
  enabled: boolean;
  status: string;
  isActive: boolean;
  isInTrial: boolean;
  expiresAt: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  hasMembership: boolean;
  daysRemaining: number | null;
  trialDaysRemaining: number | null;
}

interface CancelOptions {
  reason?: string;
  reason_id?: string;
  reason_label?: string;
  feedback?: string;
}

interface UseWarZoneSubscriptionReturn {
  // Status
  subscription: WarZoneSubscription | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchStatus: () => Promise<WarZoneSubscription | null>;
  cancelSubscription: (options?: CancelOptions) => Promise<{ success: boolean; message: string }>;
  undoCancellation: () => Promise<{ success: boolean; message: string }>;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useWarZoneSubscription(): UseWarZoneSubscriptionReturn {
  const [subscription, setSubscription] = useState<WarZoneSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // FETCH STATUS
  // ============================================
  
  const fetchStatus = useCallback(async (): Promise<WarZoneSubscription | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Not authenticated');
        return null;
      }

      const response = await fetch(`${API_BASE}/functions/v1/newsletter-cancel`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch subscription status');
      }

      if (result.success && result.subscription) {
        setSubscription(result.subscription);
        return result.subscription;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('fetchStatus error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================
  // CANCEL SUBSCRIPTION
  // ============================================
  
  const cancelSubscription = useCallback(async (
    options?: CancelOptions
  ): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        return { success: false, message: 'Not authenticated' };
      }

      const response = await fetch(`${API_BASE}/functions/v1/newsletter-cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancel',
          ...options,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel subscription');
      }

      // Update local state
      if (result.subscription) {
        setSubscription(prev => prev ? {
          ...prev,
          cancelAtPeriodEnd: true,
        } : null);
      }

      return { 
        success: true, 
        message: result.message || 'Subscription cancelled successfully' 
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('cancelSubscription error:', err);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================
  // UNDO CANCELLATION
  // ============================================
  
  const undoCancellation = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        return { success: false, message: 'Not authenticated' };
      }

      const response = await fetch(`${API_BASE}/functions/v1/newsletter-cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'undo_cancel',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reactivate subscription');
      }

      // Update local state
      if (result.subscription) {
        setSubscription(prev => prev ? {
          ...prev,
          cancelAtPeriodEnd: false,
        } : null);
      }

      return { 
        success: true, 
        message: result.message || 'Subscription reactivated successfully' 
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('undoCancellation error:', err);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    subscription,
    isLoading,
    error,
    fetchStatus,
    cancelSubscription,
    undoCancellation,
  };
}

export default useWarZoneSubscription;