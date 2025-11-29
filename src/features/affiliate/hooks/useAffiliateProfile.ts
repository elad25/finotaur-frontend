// =====================================================
// FINOTAUR AFFILIATE PROFILE HOOK
// =====================================================
// Place in: src/features/affiliate/hooks/useAffiliateProfile.ts
// 
// Hook for affiliates to view their own dashboard data
// Uses the database views and functions already set up
// =====================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";
import type { 
  Affiliate, 
  AffiliateReferral,
  AffiliateCommission,
  AffiliatePayout,
  AffiliateBonus,
  AffiliateTier
} from "../types/affiliate.types";

// ============================================
// QUERY KEYS
// ============================================

export const affiliateProfileKeys = {
  all: ['affiliate-profile'] as const,
  profile: () => [...affiliateProfileKeys.all, 'profile'] as const,
  referrals: (status?: string) => [...affiliateProfileKeys.all, 'referrals', status] as const,
  commissions: () => [...affiliateProfileKeys.all, 'commissions'] as const,
  payouts: () => [...affiliateProfileKeys.all, 'payouts'] as const,
  bonuses: () => [...affiliateProfileKeys.all, 'bonuses'] as const,
  analytics: (startDate?: string, endDate?: string) => [...affiliateProfileKeys.all, 'analytics', startDate, endDate] as const,
  activity: () => [...affiliateProfileKeys.all, 'activity'] as const,
};

// ============================================
// TYPES
// ============================================

export interface AffiliateProfile extends Affiliate {
  // Computed fields from dashboard_summary view
  current_commission_rate: number;
  clients_to_next_tier: number;
  signup_conversion_rate: number;
  qualification_rate: number;
}

export interface AffiliateReferralWithDetails extends AffiliateReferral {
  days_remaining?: number;
  days_since_signup?: number;
  verification_progress_pct?: number;
}

export interface AffiliateAnalytics {
  period: {
    start: string;
    end: string;
  };
  clicks: {
    total: number;
    unique_ips: number;
    converted: number;
    conversion_rate: number;
  };
  signups: {
    total: number;
    pending: number;
    in_verification: number;
    qualified: number;
    failed: number;
    churned: number;
  };
  earnings: {
    total: number;
    recurring: number;
    annual: number;
    sub_affiliate: number;
  };
  top_sources: Array<{
    source: string;
    clicks: number;
  }>;
  daily_clicks: Array<{
    date: string;
    clicks: number;
  }>;
}

export interface AffiliateActivityLog {
  id: string;
  activity_type: string;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// ============================================
// TIER INFO (for display)
// ============================================

export interface TierDisplayInfo {
  name: string;
  minClients: number;
  maxClients: number | null;
  commissionRate: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const TIER_DISPLAY_INFO: Record<AffiliateTier, TierDisplayInfo> = {
  tier_1: {
    name: 'Starter',
    minClients: 0,
    maxClients: 20,
    commissionRate: 0.10,
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/10',
    borderColor: 'border-zinc-500/30',
  },
  tier_2: {
    name: 'Growth',
    minClients: 20,
    maxClients: 75,
    commissionRate: 0.15,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  tier_3: {
    name: 'Pro',
    minClients: 75,
    maxClients: null,
    commissionRate: 0.20,
    color: 'text-[#D4AF37]',
    bgColor: 'bg-[#D4AF37]/10',
    borderColor: 'border-[#D4AF37]/30',
  },
};

// ============================================
// GET AFFILIATE PROFILE
// ============================================

export function useAffiliateProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: affiliateProfileKeys.profile(),
    queryFn: async (): Promise<AffiliateProfile | null> => {
      if (!user?.id) return null;

      // First check if user is an affiliate
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No affiliate record found - user is not an affiliate
          return null;
        }
        console.error('Error fetching affiliate profile:', error);
        throw error;
      }

      if (!data) return null;

      // Calculate additional fields
      const currentTier = data.current_tier as AffiliateTier;
      const tierInfo = TIER_DISPLAY_INFO[currentTier];
      
      // Clients to next tier
      let clientsToNextTier = 0;
      if (currentTier === 'tier_1') {
        clientsToNextTier = Math.max(0, 20 - (data.total_qualified_referrals || 0));
      } else if (currentTier === 'tier_2') {
        clientsToNextTier = Math.max(0, 75 - (data.total_qualified_referrals || 0));
      }

      // Conversion rates
      const signupConversionRate = data.total_clicks > 0 
        ? ((data.total_signups || 0) / data.total_clicks) * 100 
        : 0;
      
      const qualificationRate = data.total_signups > 0 
        ? ((data.total_qualified_referrals || 0) / data.total_signups) * 100 
        : 0;

      return {
        ...data,
        current_commission_rate: tierInfo.commissionRate,
        clients_to_next_tier: clientsToNextTier,
        signup_conversion_rate: Math.round(signupConversionRate * 100) / 100,
        qualification_rate: Math.round(qualificationRate * 100) / 100,
      } as AffiliateProfile;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// ============================================
// CHECK IF USER IS AFFILIATE
// ============================================

export function useIsAffiliate() {
  const { data: profile, isLoading } = useAffiliateProfile();
  
  return {
    isAffiliate: !!profile && profile.status === 'active',
    isPending: !!profile && profile.status === 'inactive',
    isSuspended: !!profile && profile.status === 'suspended',
    isLoading,
    profile,
  };
}

// ============================================
// GET REFERRALS
// ============================================

export function useAffiliateReferrals(status?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: affiliateProfileKeys.referrals(status),
    queryFn: async (): Promise<AffiliateReferralWithDetails[]> => {
      if (!user?.id) return [];

      // Get affiliate ID first
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!affiliate) return [];

      let query = supabase
        .from('affiliate_referrals')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching referrals:', error);
        return [];
      }

      // Add computed fields
      return (data || []).map(ref => {
        const now = new Date();
        let daysRemaining: number | undefined;
        let daysSinceSignup: number | undefined;
        let verificationProgressPct: number | undefined;

        // Calculate days remaining for verification_pending
        if (ref.status === 'verification_pending' && ref.verification_end) {
          const endDate = new Date(ref.verification_end);
          daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          
          if (ref.verification_start) {
            const startDate = new Date(ref.verification_start);
            const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
            const elapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
            verificationProgressPct = Math.min(100, Math.round((elapsed / totalDays) * 100));
          }
        }

        // Calculate days since signup for pending
        if (ref.status === 'pending' && ref.signup_date) {
          const signupDate = new Date(ref.signup_date);
          daysSinceSignup = Math.floor((now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        return {
          ...ref,
          days_remaining: daysRemaining,
          days_since_signup: daysSinceSignup,
          verification_progress_pct: verificationProgressPct,
        };
      });
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
  });
}

// ============================================
// GET COMMISSIONS
// ============================================

export function useAffiliateCommissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: affiliateProfileKeys.commissions(),
    queryFn: async (): Promise<AffiliateCommission[]> => {
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
        .limit(50);

      if (error) {
        console.error('Error fetching commissions:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
  });
}

// ============================================
// GET PAYOUTS
// ============================================

export function useAffiliatePayouts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: affiliateProfileKeys.payouts(),
    queryFn: async (): Promise<AffiliatePayout[]> => {
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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payouts:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
  });
}

// ============================================
// GET BONUSES
// ============================================

export function useAffiliateBonuses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: affiliateProfileKeys.bonuses(),
    queryFn: async (): Promise<AffiliateBonus[]> => {
      if (!user?.id) return [];

      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!affiliate) return [];

      const { data, error } = await supabase
        .from('affiliate_bonuses')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .order('earned_at', { ascending: false });

      if (error) {
        console.error('Error fetching bonuses:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
  });
}

// ============================================
// GET ANALYTICS
// ============================================

export function useAffiliateAnalytics(startDate?: Date, endDate?: Date) {
  const { user } = useAuth();
  
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  return useQuery({
    queryKey: affiliateProfileKeys.analytics(start.toISOString(), end.toISOString()),
    queryFn: async (): Promise<AffiliateAnalytics | null> => {
      if (!user?.id) return null;

      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!affiliate) return null;

      const { data, error } = await supabase
        .rpc('get_affiliate_analytics', {
          p_affiliate_id: affiliate.id,
          p_start_date: start.toISOString().split('T')[0],
          p_end_date: end.toISOString().split('T')[0],
        });

      if (error) {
        console.error('Error fetching analytics:', error);
        return null;
      }

      return data as AffiliateAnalytics;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================
// GET ACTIVITY LOG
// ============================================

export function useAffiliateActivity(limit: number = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: affiliateProfileKeys.activity(),
    queryFn: async (): Promise<AffiliateActivityLog[]> => {
      if (!user?.id) return [];

      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!affiliate) return [];

      const { data, error } = await supabase
        .from('affiliate_activity_log')
        .select('id, activity_type, description, metadata, created_at')
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching activity:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
  });
}

// ============================================
// UPDATE PAYMENT INFO
// ============================================

export function useUpdatePaymentInfo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      paypalEmail, 
      paymentMethod 
    }: { 
      paypalEmail?: string; 
      paymentMethod?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('affiliates')
        .update({
          paypal_email: paypalEmail,
          payment_method: paymentMethod || 'paypal',
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: affiliateProfileKeys.profile() });
      toast.success('Payment information updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update payment info', {
        description: error.message,
      });
    },
  });
}

// ============================================
// UPDATE NOTIFICATION SETTINGS
// ============================================

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: {
      notify_on_signup?: boolean;
      notify_on_qualification?: boolean;
      notify_on_commission?: boolean;
      notify_on_payout?: boolean;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('affiliates')
        .update(settings)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: affiliateProfileKeys.profile() });
      toast.success('Notification settings updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update settings', {
        description: error.message,
      });
    },
  });
}

// ============================================
// COPY LINK HELPER
// ============================================

export function useCopyAffiliateLink() {
  const { data: profile } = useAffiliateProfile();

  const copyLink = async () => {
    if (!profile?.referral_link) {
      toast.error('No referral link available');
      return false;
    }

    try {
      await navigator.clipboard.writeText(profile.referral_link);
      toast.success('Link copied to clipboard!');
      return true;
    } catch (err) {
      toast.error('Failed to copy link');
      return false;
    }
  };

  const copyCode = async () => {
    if (!profile?.affiliate_code) {
      toast.error('No affiliate code available');
      return false;
    }

    try {
      await navigator.clipboard.writeText(profile.affiliate_code);
      toast.success('Code copied to clipboard!');
      return true;
    } catch (err) {
      toast.error('Failed to copy code');
      return false;
    }
  };

  return { copyLink, copyCode, profile };
}

// ============================================
// EXPORT
// ============================================

export default {
  useAffiliateProfile,
  useIsAffiliate,
  useAffiliateReferrals,
  useAffiliateCommissions,
  useAffiliatePayouts,
  useAffiliateBonuses,
  useAffiliateAnalytics,
  useAffiliateActivity,
  useUpdatePaymentInfo,
  useUpdateNotificationSettings,
  useCopyAffiliateLink,
  TIER_DISPLAY_INFO,
};