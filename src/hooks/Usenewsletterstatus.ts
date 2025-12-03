// =====================================================
// FINOTAUR NEWSLETTER STATUS HOOK - v1.0.0
// =====================================================
// Place in: src/hooks/useNewsletterStatus.ts
//
// This hook provides newsletter subscription status for the
// current user. Newsletter is a SEPARATE product from the
// Trading Journal subscription.
//
// Usage:
//   const { isSubscribed, status, trialDaysLeft, ... } = useNewsletterStatus();
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// ============================================
// TYPES
// ============================================

export type NewsletterStatus = 'inactive' | 'trial' | 'active' | 'cancelled';

export interface NewsletterStatusData {
  // Core status
  newsletter_enabled: boolean;
  newsletter_status: NewsletterStatus;
  
  // Membership info
  newsletter_whop_membership_id: string | null;
  
  // Dates
  newsletter_started_at: string | null;
  newsletter_expires_at: string | null;
  newsletter_trial_ends_at: string | null;
  
  // Cancellation
  newsletter_cancel_at_period_end: boolean;
}

export interface UseNewsletterStatusReturn {
  // Status flags
  isSubscribed: boolean;        // Has active access (active OR trial)
  isActive: boolean;            // Paid and active
  isInTrial: boolean;           // Currently in 7-day trial
  isCancelled: boolean;         // Subscription cancelled
  isInactive: boolean;          // Never subscribed or fully expired
  
  // Detailed status
  status: NewsletterStatus;
  
  // Trial info
  trialDaysLeft: number | null;
  trialEndsAt: Date | null;
  isTrialExpiringSoon: boolean; // Less than 2 days left
  
  // Subscription info
  expiresAt: Date | null;
  startedAt: Date | null;
  willCancelAtPeriodEnd: boolean;
  membershipId: string | null;
  
  // Query state
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  
  // Actions
  refetch: () => void;
  
  // Raw data
  data: NewsletterStatusData | null;
}

// ============================================
// QUERY KEY
// ============================================

export const NEWSLETTER_STATUS_QUERY_KEY = ['newsletter-status'];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate days remaining until a date
 */
function daysUntil(dateString: string | null): number | null {
  if (!dateString) return null;
  
  const targetDate = new Date(dateString);
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Parse date string to Date object
 */
function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

// ============================================
// MAIN HOOK
// ============================================

export function useNewsletterStatus(): UseNewsletterStatusReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [...NEWSLETTER_STATUS_QUERY_KEY, user?.id],
    queryFn: async (): Promise<NewsletterStatusData | null> => {
      if (!user?.id) return null;

      // Try RPC first (more efficient, includes computed fields)
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_newsletter_status',
        { p_user_id: user.id }
      );

      if (!rpcError && rpcData?.[0]) {
        const row = rpcData[0];
        return {
          newsletter_enabled: row.newsletter_enabled ?? false,
          newsletter_status: (row.newsletter_status || 'inactive') as NewsletterStatus,
          newsletter_whop_membership_id: row.newsletter_whop_membership_id || null,
          newsletter_started_at: row.newsletter_started_at || null,
          newsletter_expires_at: row.newsletter_expires_at || null,
          newsletter_trial_ends_at: row.newsletter_trial_ends_at || null,
          newsletter_cancel_at_period_end: row.newsletter_cancel_at_period_end ?? false,
        };
      }

      // Fallback: Direct query to profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          newsletter_enabled,
          newsletter_status,
          newsletter_whop_membership_id,
          newsletter_started_at,
          newsletter_expires_at,
          newsletter_trial_ends_at,
          newsletter_cancel_at_period_end
        `)
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('[useNewsletterStatus] Error fetching status:', profileError);
        throw profileError;
      }

      return {
        newsletter_enabled: profileData?.newsletter_enabled ?? false,
        newsletter_status: (profileData?.newsletter_status || 'inactive') as NewsletterStatus,
        newsletter_whop_membership_id: profileData?.newsletter_whop_membership_id || null,
        newsletter_started_at: profileData?.newsletter_started_at || null,
        newsletter_expires_at: profileData?.newsletter_expires_at || null,
        newsletter_trial_ends_at: profileData?.newsletter_trial_ends_at || null,
        newsletter_cancel_at_period_end: profileData?.newsletter_cancel_at_period_end ?? false,
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes (formerly cacheTime)
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Computed values
  const status: NewsletterStatus = data?.newsletter_status || 'inactive';
  const isActive = status === 'active';
  const isInTrial = status === 'trial';
  const isCancelled = status === 'cancelled';
  const isInactive = status === 'inactive';
  
  // User has access if active OR in trial (and not expired)
  const isSubscribed = data?.newsletter_enabled === true && (isActive || isInTrial);
  
  // Trial calculations
  const trialDaysLeft = isInTrial ? daysUntil(data?.newsletter_trial_ends_at || null) : null;
  const trialEndsAt = parseDate(data?.newsletter_trial_ends_at || null);
  const isTrialExpiringSoon = isInTrial && trialDaysLeft !== null && trialDaysLeft <= 2;
  
  // Subscription dates
  const expiresAt = parseDate(data?.newsletter_expires_at || null);
  const startedAt = parseDate(data?.newsletter_started_at || null);
  const willCancelAtPeriodEnd = data?.newsletter_cancel_at_period_end ?? false;
  const membershipId = data?.newsletter_whop_membership_id || null;

  return {
    // Status flags
    isSubscribed,
    isActive,
    isInTrial,
    isCancelled,
    isInactive,
    
    // Detailed status
    status,
    
    // Trial info
    trialDaysLeft,
    trialEndsAt,
    isTrialExpiringSoon,
    
    // Subscription info
    expiresAt,
    startedAt,
    willCancelAtPeriodEnd,
    membershipId,
    
    // Query state
    isLoading,
    isError,
    error: error as Error | null,
    
    // Actions
    refetch: () => refetch(),
    
    // Raw data
    data: data || null,
  };
}

// ============================================
// PREFETCH HELPER
// ============================================

/**
 * Prefetch newsletter status for a user
 * Useful for SSR or preloading data
 */
export async function prefetchNewsletterStatus(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: [...NEWSLETTER_STATUS_QUERY_KEY, userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_newsletter_status', {
        p_user_id: userId,
      });
      
      if (error) throw error;
      
      const row = data?.[0];
      if (!row) return null;
      
      return {
        newsletter_enabled: row.newsletter_enabled ?? false,
        newsletter_status: row.newsletter_status || 'inactive',
        newsletter_whop_membership_id: row.newsletter_whop_membership_id || null,
        newsletter_started_at: row.newsletter_started_at || null,
        newsletter_expires_at: row.newsletter_expires_at || null,
        newsletter_trial_ends_at: row.newsletter_trial_ends_at || null,
        newsletter_cancel_at_period_end: row.newsletter_cancel_at_period_end ?? false,
      };
    },
  });
}

// ============================================
// INVALIDATION HELPER
// ============================================

/**
 * Invalidate newsletter status cache
 * Call this after subscription changes
 */
export function invalidateNewsletterStatus(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string
): void {
  if (userId) {
    queryClient.invalidateQueries({
      queryKey: [...NEWSLETTER_STATUS_QUERY_KEY, userId],
    });
  } else {
    queryClient.invalidateQueries({
      queryKey: NEWSLETTER_STATUS_QUERY_KEY,
    });
  }
}

// ============================================
// SUBSCRIPTION CHECK HOOK (Simplified)
// ============================================

/**
 * Simple hook to check if user has newsletter access
 * Returns just the boolean and loading state
 */
export function useHasNewsletterAccess(): {
  hasAccess: boolean;
  isLoading: boolean;
} {
  const { isSubscribed, isLoading } = useNewsletterStatus();
  
  return {
    hasAccess: isSubscribed,
    isLoading,
  };
}

// ============================================
// TRIAL INFO HOOK
// ============================================

/**
 * Hook specifically for trial information
 * Useful for showing trial banners/warnings
 */
export function useNewsletterTrial(): {
  isInTrial: boolean;
  daysLeft: number | null;
  endsAt: Date | null;
  isExpiringSoon: boolean;
  isLoading: boolean;
} {
  const { isInTrial, trialDaysLeft, trialEndsAt, isTrialExpiringSoon, isLoading } = useNewsletterStatus();
  
  return {
    isInTrial,
    daysLeft: trialDaysLeft,
    endsAt: trialEndsAt,
    isExpiringSoon: isTrialExpiringSoon,
    isLoading,
  };
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default useNewsletterStatus;