// src/features/affiliate/hooks/useAffiliate.ts
// ============================================
// ENHANCED User-Side Affiliate Hooks
// With Analytics, Notifications, and Full Tracking
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import type {
  Affiliate,
  AffiliateApplication,
  AffiliateApplicationSubmission,
  AffiliateDashboardSummary,
  AffiliateReferral,
  AffiliateCommission,
  AffiliatePayout,
  AffiliateAnalytics,
} from '../types/affiliate.types';

// ============================================
// QUERY KEYS
// ============================================
export const affiliateKeys = {
  all: ['affiliate'] as const,
  profile: () => [...affiliateKeys.all, 'profile'] as const,
  application: () => [...affiliateKeys.all, 'application'] as const,
  dashboard: () => [...affiliateKeys.all, 'dashboard'] as const,
  referrals: () => [...affiliateKeys.all, 'referrals'] as const,
  commissions: (limit?: number) => [...affiliateKeys.all, 'commissions', limit] as const,
  payouts: () => [...affiliateKeys.all, 'payouts'] as const,
  analytics: (start?: string, end?: string) => [...affiliateKeys.all, 'analytics', start, end] as const,
};


// ============================================
// HELPER: Check if user is an affiliate
// ============================================
export function useIsAffiliate() {
  const { user } = useAuth();

  return useQuery({
    queryKey: affiliateKeys.profile(),
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('affiliates')
        .select('id, status, current_tier, affiliate_code')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Error checking affiliate status:', error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}


// ============================================
// HELPER: Get application status
// ============================================
export function useAffiliateApplication() {
  const { user } = useAuth();

  return useQuery({
    queryKey: affiliateKeys.application(),
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('affiliate_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching application:', error);
        return null;
      }

      return data as AffiliateApplication;
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
  });
}


// ============================================
// MUTATION: Submit application
// ============================================
export function useSubmitAffiliateApplication() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AffiliateApplicationSubmission) => {
      const { data: result, error } = await supabase
        .from('affiliate_applications')
        .insert({
          user_id: user?.id || null,
          email: data.email,
          full_name: data.full_name,
          phone: data.phone || null,
          country: data.country || null,
          instagram_handle: data.instagram_handle || null,
          youtube_channel: data.youtube_channel || null,
          tiktok_handle: data.tiktok_handle || null,
          twitter_handle: data.twitter_handle || null,
          website_url: data.website_url || null,
          other_platforms: data.other_platforms || [],
          total_followers: data.total_followers || 0,
          primary_audience: data.primary_audience || null,
          promotion_plan: data.promotion_plan || null,
          expected_monthly_referrals: data.expected_monthly_referrals || null,
          referral_source: data.referral_source || null,
          requested_code: data.requested_code?.toUpperCase() || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: affiliateKeys.application() });
      toast.success('Application submitted!', {
        description: "We'll review your application within 24-48 hours.",
      });
    },
    onError: (error: any) => {
      console.error('Application error:', error);
      toast.error('Failed to submit application', {
        description: error.message,
      });
    },
  });
}


// ============================================
// QUERY: Get affiliate dashboard
// ============================================
export function useAffiliateDashboard() {
  const { user } = useAuth();

  return useQuery({
    queryKey: affiliateKeys.dashboard(),
    queryFn: async () => {
      if (!user?.id) return null;

      // First get the affiliate ID
      const { data: affiliate, error: affError } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (affError || !affiliate) {
        if (affError?.code === 'PGRST116') return null;
        throw affError;
      }

      // Then get dashboard summary from view
      const { data, error } = await supabase
        .from('affiliate_dashboard_summary')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .single();

      if (error) {
        console.error('Dashboard fetch error:', error);
        // Fallback to direct query
        const { data: fallback, error: fallbackError } = await supabase
          .from('affiliates')
          .select('*')
          .eq('id', affiliate.id)
          .single();

        if (fallbackError) throw fallbackError;

        // Calculate derived fields
        const signupRate = fallback.total_clicks > 0
          ? (fallback.total_signups / fallback.total_clicks) * 100
          : 0;
        const qualRate = fallback.total_signups > 0
          ? (fallback.total_qualified_referrals / fallback.total_signups) * 100
          : 0;

        return {
          ...fallback,
          signup_conversion_rate: signupRate,
          qualification_rate: qualRate,
          current_commission_rate: getCommissionRate(fallback.current_tier),
          clients_to_next_tier: getClientsToNextTier(fallback.current_tier, fallback.total_qualified_referrals),
          notify_on_signup: fallback.notify_on_signup ?? true,
          notify_on_qualification: fallback.notify_on_qualification ?? true,
          notify_on_commission: fallback.notify_on_commission ?? true,
          notify_on_payout: fallback.notify_on_payout ?? true,
        } as AffiliateDashboardSummary;
      }

      return data as AffiliateDashboardSummary;
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
  });
}


// ============================================
// QUERY: Get referrals
// ============================================
export function useAffiliateReferrals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: affiliateKeys.referrals(),
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!affiliate) return [];

      const { data, error } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .order('signup_date', { ascending: false });

      if (error) {
        console.error('Referrals fetch error:', error);
        return [];
      }

      return data as AffiliateReferral[];
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
  });
}


// ============================================
// QUERY: Get commissions
// ============================================
export function useAffiliateCommissions(limit: number = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: affiliateKeys.commissions(limit),
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!affiliate) return [];

      const { data, error } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .order('commission_month', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Commissions fetch error:', error);
        return [];
      }

      return data as AffiliateCommission[];
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
}


// ============================================
// QUERY: Get payouts
// ============================================
export function useAffiliatePayouts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: affiliateKeys.payouts(),
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!affiliate) return [];

      const { data, error } = await supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .order('payout_period', { ascending: false });

      if (error) {
        console.error('Payouts fetch error:', error);
        return [];
      }

      return data as AffiliatePayout[];
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
}


// ============================================
// QUERY: Get analytics
// ============================================
export function useAffiliateAnalytics(startDate?: string, endDate?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: affiliateKeys.analytics(startDate, endDate),
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!affiliate) return null;

      // Call the RPC function
      const { data, error } = await supabase.rpc('get_affiliate_analytics', {
        p_affiliate_id: affiliate.id,
        p_start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        p_end_date: endDate || new Date().toISOString().slice(0, 10),
      });

      if (error) {
        console.error('Analytics fetch error:', error);
        return null;
      }

      return data as AffiliateAnalytics;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}


// ============================================
// MUTATION: Update profile
// ============================================
export function useUpdateAffiliateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: {
      paypal_email?: string;
      notify_on_signup?: boolean;
      notify_on_qualification?: boolean;
      notify_on_commission?: boolean;
      notify_on_payout?: boolean;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!affiliate) throw new Error('Affiliate not found');

      const { error } = await supabase
        .from('affiliates')
        .update(updates)
        .eq('id', affiliate.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: affiliateKeys.dashboard() });
      toast.success('Settings updated!');
    },
    onError: (error: any) => {
      toast.error('Failed to update settings', { description: error.message });
    },
  });
}


// ============================================
// TRACKING: Click tracking
// ============================================
const STORAGE_KEY = 'finotaur_affiliate';
const EXPIRY_DAYS = 30;

interface StoredAffiliateData {
  code: string;
  clickId?: string;
  affiliateId?: string;
  affiliateName?: string;
  timestamp: number;
}

export function getStoredAffiliateCode(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data: StoredAffiliateData = JSON.parse(stored);
    const expiryTime = data.timestamp + EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    if (Date.now() > expiryTime) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return data.code;
  } catch {
    return null;
  }
}

export function getStoredAffiliateData(): StoredAffiliateData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data: StoredAffiliateData = JSON.parse(stored);
    const expiryTime = data.timestamp + EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    if (Date.now() > expiryTime) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function clearStoredAffiliateData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function checkAffiliateIntent(): boolean {
  return !!getStoredAffiliateCode();
}

export async function trackAffiliateClick(
  code: string,
  metadata?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    referrer_url?: string;
    landing_page?: string;
  }
): Promise<string | null> {
  try {
    // Normalize code
    const normalizedCode = code.toUpperCase();

    // Call RPC to record click
    const { data, error } = await supabase.rpc('record_affiliate_click', {
      p_affiliate_code: normalizedCode,
      p_ip_address: null, // Server will detect
      p_user_agent: navigator.userAgent,
      p_referrer_url: metadata?.referrer_url || document.referrer || null,
      p_landing_page: metadata?.landing_page || window.location.href,
      p_utm_source: metadata?.utm_source || null,
      p_utm_medium: metadata?.utm_medium || null,
      p_utm_campaign: metadata?.utm_campaign || null,
      p_utm_content: metadata?.utm_content || null,
    });

    if (error) {
      console.error('Click tracking error:', error);
    }

    // Get affiliate info for storage
    const { data: affiliateInfo } = await supabase.rpc('validate_affiliate_code', {
      p_code: normalizedCode,
    });

    // Store in localStorage
    const storageData: StoredAffiliateData = {
      code: normalizedCode,
      clickId: data || undefined,
      affiliateId: affiliateInfo?.[0]?.affiliate_id || undefined,
      affiliateName: affiliateInfo?.[0]?.affiliate_name || undefined,
      timestamp: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));

    return data;
  } catch (error) {
    console.error('Track click error:', error);
    return null;
  }
}


// ============================================
// TRACKING: Referral signup
// ============================================
export async function trackReferralSignup(params: {
  userId: string;
  userEmail: string;
  subscriptionId?: string;
  subscriptionPlan?: string;
  subscriptionType?: 'monthly' | 'annual';
  subscriptionPrice?: number;
}): Promise<string | null> {
  try {
    const storedData = getStoredAffiliateData();
    if (!storedData) {
      console.log('No affiliate data stored');
      return null;
    }

    const { data, error } = await supabase.rpc('track_referral_signup', {
      p_affiliate_code: storedData.code,
      p_user_id: params.userId,
      p_user_email: params.userEmail,
      p_subscription_id: params.subscriptionId || null,
      p_subscription_plan: params.subscriptionPlan || null,
      p_subscription_type: params.subscriptionType || 'monthly',
      p_subscription_price: params.subscriptionPrice || null,
      p_click_id: storedData.clickId || null,
      p_discount_percent: 0, // Will be calculated by function
      p_discount_amount: 0,
    });

    if (error) {
      console.error('Referral signup tracking error:', error);
      return null;
    }

    // Clear stored data after successful signup
    clearStoredAffiliateData();

    return data;
  } catch (error) {
    console.error('Track referral error:', error);
    return null;
  }
}


// ============================================
// HELPER FUNCTIONS
// ============================================

function getCommissionRate(tier: string): number {
  switch (tier) {
    case 'tier_3': return 0.20;
    case 'tier_2': return 0.15;
    case 'tier_1':
    default: return 0.10;
  }
}

function getClientsToNextTier(tier: string, currentClients: number): number {
  switch (tier) {
    case 'tier_1': return Math.max(0, 20 - currentClients);
    case 'tier_2': return Math.max(0, 75 - currentClients);
    case 'tier_3': return 0;
    default: return 20 - currentClients;
  }
}


// ============================================
// EXPORTS
// ============================================
export default {
  useIsAffiliate,
  useAffiliateApplication,
  useSubmitAffiliateApplication,
  useAffiliateDashboard,
  useAffiliateReferrals,
  useAffiliateCommissions,
  useAffiliatePayouts,
  useAffiliateAnalytics,
  useUpdateAffiliateProfile,
  trackAffiliateClick,
  trackReferralSignup,
  getStoredAffiliateCode,
  getStoredAffiliateData,
  clearStoredAffiliateData,
  checkAffiliateIntent,
};