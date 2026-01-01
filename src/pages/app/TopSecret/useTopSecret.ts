// ================================================
// TOP SECRET SUBSCRIPTION HOOK
// File: src/pages/app/all-markets/Top Secret/useTopSecret.ts
// ================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

// ========================================
// TYPES
// ========================================

export type TopSecretStatus = 'inactive' | 'active' | 'cancelled';
export type TopSecretInterval = 'monthly' | 'yearly';
export type ReportTypeId = 'ism' | 'company' | 'crypto';

export interface TopSecretSubscription {
  enabled: boolean;
  status: TopSecretStatus;
  membershipId: string | null;
  startedAt: Date | null;
  expiresAt: Date | null;
  interval: TopSecretInterval | null;
  cancelAtPeriodEnd: boolean;
  daysUntilExpiry: number | null;
  isActive: boolean;
}

export interface ReportScheduleItem {
  type: ReportTypeId;
  date: Date;
  dayOfMonth: number;
  label: string;
}

export interface UseTopSecretReturn {
  subscription: TopSecretSubscription | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  cancel: () => Promise<{ success: boolean; error?: string }>;
  reactivate: () => Promise<{ success: boolean; error?: string }>;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get monthly report schedule
 */
export function getMonthlySchedule(year: number, month: number): ReportScheduleItem[] {
  const schedule: ReportScheduleItem[] = [
    { type: 'ism' as const, date: new Date(year, month, 3), dayOfMonth: 3, label: 'ISM Manufacturing' },
    { type: 'company' as const, date: new Date(year, month, 5), dayOfMonth: 5, label: 'Company Analysis' },
    { type: 'crypto' as const, date: new Date(year, month, 10), dayOfMonth: 10, label: 'Crypto Report' },
    { type: 'company' as const, date: new Date(year, month, 20), dayOfMonth: 20, label: 'Company Analysis' },
    { type: 'crypto' as const, date: new Date(year, month, 25), dayOfMonth: 25, label: 'Crypto Report' },
  ];
  
  return schedule.sort((a, b) => a.dayOfMonth - b.dayOfMonth);
}

/**
 * Get the next upcoming report
 */
export function getNextReport(): ReportScheduleItem | null {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  
  const schedule = getMonthlySchedule(currentYear, currentMonth);
  const nextInThisMonth = schedule.find(item => item.dayOfMonth > currentDay);
  
  if (nextInThisMonth) {
    return nextInThisMonth;
  }
  
  // Get first report of next month
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const nextMonthSchedule = getMonthlySchedule(nextYear, nextMonth);
  
  return nextMonthSchedule[0] || null;
}

/**
 * Get all upcoming reports within N days
 */
export function getUpcomingReports(days: number = 30): ReportScheduleItem[] {
  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const results: ReportScheduleItem[] = [];
  
  let currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
  
  while (currentDate <= endDate) {
    const schedule = getMonthlySchedule(currentDate.getFullYear(), currentDate.getMonth());
    
    for (const item of schedule) {
      if (item.date > now && item.date <= endDate) {
        results.push(item);
      }
    }
    
    // Move to next month
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }
  
  return results.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Get report type display info
 */
export function getReportTypeInfo(type: ReportTypeId) {
  const info = {
    ism: {
      name: 'ISM Manufacturing',
      shortName: 'ISM',
      gradient: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-500/20',
      textColor: 'text-amber-400',
      agents: 13,
    },
    company: {
      name: 'Company Analysis',
      shortName: 'Company',
      gradient: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-500/20',
      textColor: 'text-purple-400',
      agents: 18,
    },
    crypto: {
      name: 'Crypto Report',
      shortName: 'Crypto',
      gradient: 'from-cyan-500 to-blue-600',
      bgColor: 'bg-cyan-500/20',
      textColor: 'text-cyan-400',
      agents: 18,
    },
  };
  
  return info[type];
}

// ========================================
// MAIN HOOK
// ========================================

export function useTopSecret(): UseTopSecretReturn {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<TopSecretSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!user?.id) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Try RPC first, fallback to direct query
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_top_secret_status', {
        p_user_id: user.id,
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        const status = rpcData[0];
        const expiresAt = status.top_secret_expires_at ? new Date(status.top_secret_expires_at) : null;
        const daysUntilExpiry = expiresAt 
          ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        setSubscription({
          enabled: status.top_secret_enabled || false,
          status: status.top_secret_status || 'inactive',
          membershipId: status.top_secret_whop_membership_id || null,
          startedAt: status.top_secret_started_at ? new Date(status.top_secret_started_at) : null,
          expiresAt,
          interval: status.top_secret_interval || null,
          cancelAtPeriodEnd: status.top_secret_cancel_at_period_end || false,
          daysUntilExpiry,
          isActive: status.is_active || false,
        });
      } else {
        // Fallback to direct profile query
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(`
            top_secret_enabled,
            top_secret_status,
            top_secret_whop_membership_id,
            top_secret_started_at,
            top_secret_expires_at,
            top_secret_interval,
            top_secret_cancel_at_period_end
          `)
          .eq('id', user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        const expiresAt = profile?.top_secret_expires_at ? new Date(profile.top_secret_expires_at) : null;
        const daysUntilExpiry = expiresAt 
          ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        const isActive = 
          profile?.top_secret_status === 'active' &&
          profile?.top_secret_enabled === true &&
          (!expiresAt || expiresAt > new Date());

        setSubscription({
          enabled: profile?.top_secret_enabled || false,
          status: (profile?.top_secret_status as TopSecretStatus) || 'inactive',
          membershipId: profile?.top_secret_whop_membership_id || null,
          startedAt: profile?.top_secret_started_at ? new Date(profile.top_secret_started_at) : null,
          expiresAt,
          interval: (profile?.top_secret_interval as TopSecretInterval) || null,
          cancelAtPeriodEnd: profile?.top_secret_cancel_at_period_end || false,
          daysUntilExpiry,
          isActive,
        });
      }
    } catch (err: any) {
      console.error('Error fetching Top Secret status:', err);
      setError(err.message || 'Failed to fetch subscription status');
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Cancel subscription
  const cancel = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('cancel_top_secret_subscription', {
        p_user_id: user.id,
      });

      if (rpcError) {
        return { success: false, error: rpcError.message };
      }

      if (data?.success) {
        await fetchStatus();
        return { success: true };
      }

      return { success: false, error: data?.error || 'Failed to cancel subscription' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [user?.id, fetchStatus]);

  // Reactivate subscription
  const reactivate = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('reactivate_top_secret_subscription', {
        p_user_id: user.id,
      });

      if (rpcError) {
        return { success: false, error: rpcError.message };
      }

      if (data?.success) {
        await fetchStatus();
        return { success: true };
      }

      return { success: false, error: data?.error || 'Failed to reactivate subscription' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [user?.id, fetchStatus]);

  return {
    subscription,
    isLoading,
    error,
    refresh: fetchStatus,
    cancel,
    reactivate,
  };
}

export default useTopSecret;