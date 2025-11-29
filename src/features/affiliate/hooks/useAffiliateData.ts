// src/features/affiliate/hooks/useAffiliateData.ts
// 🚀 Optimized Affiliate Data Hook with React Query caching
// ✅ VERSION 2.6.0 - Added affiliate_type and commission_enabled fields
// 
// CHANGELOG:
// v2.6.0:
// - Added affiliate_type: 'regular' | 'admin'
// - Added commission_enabled: boolean
// v2.5.1:
// - Fixed qualified_date → qualified_at
// - Fixed amount_usd → commission_amount_usd
// - Fixed source_payment_amount_usd → base_amount_usd
// - Added missing fields from DB schema
// - Added usePendingVerifications hook
// - Added useAffiliateBonuses hook
// - Improved type safety

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

// ===============================================
// TYPES - Matching Database Schema v2.6.0
// ===============================================

export interface AffiliateProfile {
  id: string;
  user_id: string;
  application_id: string | null;
  display_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  affiliate_code: string;
  coupon_code: string | null;
  referral_link: string;
  status: 'active' | 'inactive' | 'suspended' | 'terminated';
  current_tier: 'tier_1' | 'tier_2' | 'tier_3';
  discount_tier: 'standard' | 'vip';
  // Admin affiliate fields (NEW in v2.6.0)
  affiliate_type: 'regular' | 'admin';
  commission_enabled: boolean;
  // Sub-affiliate system
  parent_affiliate_id: string | null;
  can_recruit_sub_affiliates: boolean;
  // Stats (denormalized)
  total_clicks: number;
  total_signups: number;
  total_qualified_referrals: number;
  total_active_customers: number;
  // Earnings (denormalized)
  total_earnings_usd: number;
  total_pending_usd: number;
  total_paid_usd: number;
  total_bonuses_usd: number;
  total_sub_affiliate_earnings_usd: number;
  sub_affiliate_count: number;
  // Payment
  paypal_email: string | null;
  payment_method: string;
  // Notifications
  notify_on_signup: boolean;
  notify_on_qualification: boolean;
  notify_on_commission: boolean;
  notify_on_payout: boolean;
  // Timestamps
  activated_at: string;
  last_activity_at: string;
  suspended_at: string | null;
  suspension_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AffiliateReferral {
  id: string;
  affiliate_id: string;
  referred_user_id: string;
  referred_user_email: string;
  click_id: string | null;
  signup_date: string;
  signup_plan: string | null;
  discount_percent: number;
  discount_amount_usd: number;
  verification_start: string | null;
  verification_end: string | null;
  status: 'pending' | 'verification_pending' | 'verification_failed' | 'qualified' | 'churned' | 'refunded';
  qualified_at: string | null;  // ✅ FIXED: was qualified_date
  churned_at: string | null;
  subscription_id: string | null;
  subscription_plan: string | null;
  subscription_type: string | null;
  subscription_price_usd: number | null;
  subscription_started_at: string | null;
  subscription_cancelled_at: string | null;
  commission_eligible: boolean;
  commission_start_date: string | null;
  commission_end_date: string | null;
  months_commissioned: number;
  first_payment_amount_usd: number | null;
  first_payment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (not in DB)
  user_display_name?: string;
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  referral_id: string | null;
  sub_affiliate_id: string | null;
  commission_type: 'monthly_recurring' | 'annual_upfront' | 'sub_affiliate';
  commission_month: string;
  base_amount_usd: number;        // ✅ FIXED: was source_payment_amount_usd
  commission_rate: number;
  commission_amount_usd: number;  // ✅ FIXED: was amount_usd
  tier_at_time: 'tier_1' | 'tier_2' | 'tier_3';
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled' | 'expired';
  payout_id: string | null;
  month_number: number | null;
  is_capped: boolean;
  calculated_at: string;
  confirmed_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  referral_email?: string;
}

export interface AffiliatePayout {
  id: string;
  affiliate_id: string;
  payout_period: string;
  commissions_amount_usd: number;
  bonuses_amount_usd: number;
  adjustments_usd: number;
  total_amount_usd: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  payment_method: string;
  payment_email: string | null;
  transaction_id: string | null;
  scheduled_date: string | null;
  processed_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  retry_count: number;
  processed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AffiliateBonus {
  id: string;
  affiliate_id: string;
  bonus_type: 'milestone_20' | 'milestone_50' | 'milestone_100' | 'milestone_50_recurring';
  milestone_reached: number;
  bonus_amount_usd: number;
  status: 'pending' | 'paid' | 'cancelled';
  payout_id: string | null;
  earned_at: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AffiliateStats {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  availableForPayout: number;
  totalClicks: number;
  totalSignups: number;
  totalQualified: number;
  totalActiveCustomers: number;
  conversionRate: number;
  qualificationRate: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  thisMonthReferrals: number;
  thisMonthClicks: number;
  currentTier: string;
  clientsToNextTier: number;
  currentCommissionRate: number;
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
    daily: Array<{ date: string; clicks: number }>;
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
  top_sources: Array<{ source: string; clicks: number }>;
}

export interface PendingVerification {
  id: string;
  referred_user_email: string;
  verification_start: string | null;
  verification_end: string | null;
  first_payment_amount_usd: number | null;
  subscription_plan: string | null;
  days_remaining: number;
}

// ===============================================
// QUERY KEYS
// ===============================================

export const affiliateKeys = {
  all: ['affiliate'] as const,
  profile: () => [...affiliateKeys.all, 'profile'] as const,
  referrals: (filters?: object) => [...affiliateKeys.all, 'referrals', filters] as const,
  commissions: (filters?: object) => [...affiliateKeys.all, 'commissions', filters] as const,
  payouts: () => [...affiliateKeys.all, 'payouts'] as const,
  bonuses: () => [...affiliateKeys.all, 'bonuses'] as const,
  stats: () => [...affiliateKeys.all, 'stats'] as const,
  analytics: (dateRange?: string) => [...affiliateKeys.all, 'analytics', dateRange] as const,
  pendingVerifications: () => [...affiliateKeys.all, 'pendingVerifications'] as const,
};

// ===============================================
// HELPER FUNCTIONS
// ===============================================

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

// ===============================================
// MAIN HOOK - useAffiliateProfile
// ===============================================

export function useAffiliateProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: affiliateKeys.profile(),
    queryFn: async (): Promise<AffiliateProfile | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'inactive'])
        .maybeSingle();

      if (error) {
        console.error('Error fetching affiliate profile:', error);
        return null;
      }

      return data as AffiliateProfile;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ===============================================
// useAffiliateStats - Computed stats with caching
// ===============================================

export function useAffiliateStats() {
  const { data: profile } = useAffiliateProfile();

  return useQuery({
    queryKey: affiliateKeys.stats(),
    queryFn: async (): Promise<AffiliateStats> => {
      const defaultStats: AffiliateStats = {
        totalEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
        availableForPayout: 0,
        totalClicks: 0,
        totalSignups: 0,
        totalQualified: 0,
        totalActiveCustomers: 0,
        conversionRate: 0,
        qualificationRate: 0,
        thisMonthEarnings: 0,
        lastMonthEarnings: 0,
        thisMonthReferrals: 0,
        thisMonthClicks: 0,
        currentTier: 'tier_1',
        clientsToNextTier: 20,
        currentCommissionRate: 0.10,
      };

      if (!profile?.id) return defaultStats;

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

      // Parallel queries for performance
      const [
        thisMonthCommissions,
        lastMonthCommissions,
        thisMonthReferrals,
        thisMonthClicks,
        confirmedCommissions,
      ] = await Promise.all([
        supabase
          .from('affiliate_commissions')
          .select('commission_amount_usd')
          .eq('affiliate_id', profile.id)
          .gte('created_at', thisMonthStart)
          .in('status', ['confirmed', 'paid']),
        
        supabase
          .from('affiliate_commissions')
          .select('commission_amount_usd')
          .eq('affiliate_id', profile.id)
          .gte('created_at', lastMonthStart)
          .lte('created_at', lastMonthEnd)
          .in('status', ['confirmed', 'paid']),
        
        supabase
          .from('affiliate_referrals')
          .select('id', { count: 'exact', head: true })
          .eq('affiliate_id', profile.id)
          .gte('signup_date', thisMonthStart),

        supabase
          .from('affiliate_clicks')
          .select('id', { count: 'exact', head: true })
          .eq('affiliate_id', profile.id)
          .gte('created_at', thisMonthStart),

        supabase
          .from('affiliate_commissions')
          .select('commission_amount_usd')
          .eq('affiliate_id', profile.id)
          .eq('status', 'confirmed')
          .is('payout_id', null),
      ]);

      const thisMonthEarnings = thisMonthCommissions.data?.reduce(
        (sum, c) => sum + Number(c.commission_amount_usd), 0
      ) || 0;
      
      const lastMonthEarnings = lastMonthCommissions.data?.reduce(
        (sum, c) => sum + Number(c.commission_amount_usd), 0
      ) || 0;

      const availableForPayout = confirmedCommissions.data?.reduce(
        (sum, c) => sum + Number(c.commission_amount_usd), 0
      ) || 0;

      const conversionRate = profile.total_clicks > 0 
        ? (profile.total_signups / profile.total_clicks) * 100 
        : 0;

      const qualificationRate = profile.total_signups > 0
        ? (profile.total_qualified_referrals / profile.total_signups) * 100
        : 0;

      return {
        totalEarnings: Number(profile.total_earnings_usd) || 0,
        pendingEarnings: Number(profile.total_pending_usd) || 0,
        paidEarnings: Number(profile.total_paid_usd) || 0,
        availableForPayout,
        totalClicks: profile.total_clicks || 0,
        totalSignups: profile.total_signups || 0,
        totalQualified: profile.total_qualified_referrals || 0,
        totalActiveCustomers: profile.total_active_customers || 0,
        conversionRate,
        qualificationRate,
        thisMonthEarnings,
        lastMonthEarnings,
        thisMonthReferrals: thisMonthReferrals.count || 0,
        thisMonthClicks: thisMonthClicks.count || 0,
        currentTier: profile.current_tier,
        clientsToNextTier: getClientsToNextTier(profile.current_tier, profile.total_qualified_referrals),
        currentCommissionRate: getCommissionRate(profile.current_tier),
      };
    },
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// ===============================================
// useAffiliateReferrals - Paginated with search
// ===============================================

interface ReferralsFilters {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export function useAffiliateReferrals(filters: ReferralsFilters = {}) {
  const { data: profile } = useAffiliateProfile();
  const { status = 'all', page = 1, limit = 20, search = '' } = filters;

  return useQuery({
    queryKey: affiliateKeys.referrals({ status, page, limit, search }),
    queryFn: async () => {
      if (!profile?.id) return { data: [], count: 0 };

      let query = supabase
        .from('affiliate_referrals')
        .select(`
          id,
          affiliate_id,
          referred_user_id,
          referred_user_email,
          status,
          signup_date,
          qualified_at,
          churned_at,
          first_payment_date,
          first_payment_amount_usd,
          subscription_plan,
          subscription_type,
          subscription_price_usd,
          commission_eligible,
          months_commissioned,
          discount_percent,
          verification_start,
          verification_end
        `, { count: 'exact' })
        .eq('affiliate_id', profile.id)
        .order('signup_date', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.ilike('referred_user_email', `%${search}%`);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching referrals:', error);
        return { data: [], count: 0 };
      }

      // Fetch display names
      if (data && data.length > 0) {
        const userIds = data.map(r => r.referred_user_id).filter(Boolean);
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', userIds);

        const profilesMap = new Map(
          profiles?.map(p => [p.id, p.display_name]) || []
        );

        const enrichedData = data.map(referral => ({
          ...referral,
          user_display_name: profilesMap.get(referral.referred_user_id) || null,
        }));

        return { data: enrichedData as AffiliateReferral[], count: count || 0 };
      }

      return { data: data as AffiliateReferral[], count: count || 0 };
    },
    enabled: !!profile?.id,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

// ===============================================
// useAffiliateCommissions - Paginated with filters
// ===============================================

interface CommissionsFilters {
  status?: string;
  type?: string;
  month?: string;
  page?: number;
  limit?: number;
}

export function useAffiliateCommissions(filters: CommissionsFilters = {}) {
  const { data: profile } = useAffiliateProfile();
  const { status = 'all', type = 'all', month = 'all', page = 1, limit = 15 } = filters;

  return useQuery({
    queryKey: affiliateKeys.commissions({ status, type, month, page, limit }),
    queryFn: async () => {
      if (!profile?.id) return { data: [], count: 0 };

      let query = supabase
        .from('affiliate_commissions')
        .select(`
          id,
          affiliate_id,
          referral_id,
          sub_affiliate_id,
          commission_type,
          commission_month,
          base_amount_usd,
          commission_rate,
          commission_amount_usd,
          tier_at_time,
          status,
          payout_id,
          month_number,
          is_capped,
          created_at
        `, { count: 'exact' })
        .eq('affiliate_id', profile.id)
        .order('commission_month', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (type !== 'all') {
        query = query.eq('commission_type', type);
      }

      if (month !== 'all') {
        query = query.eq('commission_month', month);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching commissions:', error);
        return { data: [], count: 0 };
      }

      // Enrich with referral emails
      if (data && data.length > 0) {
        const referralIds = data.map(c => c.referral_id).filter(Boolean) as string[];
        
        if (referralIds.length > 0) {
          const { data: referrals } = await supabase
            .from('affiliate_referrals')
            .select('id, referred_user_email')
            .in('id', referralIds);

          const referralsMap = new Map(
            referrals?.map(r => [r.id, r.referred_user_email]) || []
          );

          const enrichedData = data.map(commission => ({
            ...commission,
            referral_email: commission.referral_id 
              ? referralsMap.get(commission.referral_id) 
              : null,
          }));

          return { data: enrichedData as AffiliateCommission[], count: count || 0 };
        }
      }

      return { data: data as AffiliateCommission[], count: count || 0 };
    },
    enabled: !!profile?.id,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

// ===============================================
// useAffiliatePayouts
// ===============================================

export function useAffiliatePayouts() {
  const { data: profile } = useAffiliateProfile();

  return useQuery({
    queryKey: affiliateKeys.payouts(),
    queryFn: async (): Promise<AffiliatePayout[]> => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('affiliate_id', profile.id)
        .order('payout_period', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching payouts:', error);
        return [];
      }

      return data as AffiliatePayout[];
    },
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// ===============================================
// useAffiliateBonuses
// ===============================================

export function useAffiliateBonuses() {
  const { data: profile } = useAffiliateProfile();

  return useQuery({
    queryKey: affiliateKeys.bonuses(),
    queryFn: async (): Promise<AffiliateBonus[]> => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('affiliate_bonuses')
        .select('*')
        .eq('affiliate_id', profile.id)
        .order('earned_at', { ascending: false });

      if (error) {
        console.error('Error fetching bonuses:', error);
        return [];
      }

      return data as AffiliateBonus[];
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// ===============================================
// usePendingVerifications - For dashboard alerts
// ===============================================

export function usePendingVerifications() {
  const { data: profile } = useAffiliateProfile();

  return useQuery({
    queryKey: affiliateKeys.pendingVerifications(),
    queryFn: async (): Promise<PendingVerification[]> => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('affiliate_referrals')
        .select(`
          id,
          referred_user_email,
          verification_start,
          verification_end,
          first_payment_amount_usd,
          subscription_plan
        `)
        .eq('affiliate_id', profile.id)
        .eq('status', 'verification_pending')
        .order('verification_end', { ascending: true });

      if (error) {
        console.error('Error fetching pending verifications:', error);
        return [];
      }

      return data.map(ref => {
        const endDate = ref.verification_end ? new Date(ref.verification_end) : new Date();
        const now = new Date();
        const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        
        return {
          ...ref,
          days_remaining: daysRemaining,
        };
      });
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// ===============================================
// useAffiliateAnalytics - RPC based
// ===============================================

export function useAffiliateAnalytics(dateRange: '7d' | '30d' | '90d' | 'all' = '30d') {
  const { data: profile } = useAffiliateProfile();

  return useQuery({
    queryKey: affiliateKeys.analytics(dateRange),
    queryFn: async (): Promise<AffiliateAnalytics | null> => {
      if (!profile?.id) return null;

      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(profile.created_at);
      }

      // Try RPC function first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_affiliate_analytics', {
        p_affiliate_id: profile.id,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: now.toISOString().split('T')[0],
      });

      if (!rpcError && rpcData) {
        return rpcData as AffiliateAnalytics;
      }

      // Fallback to manual calculation
      const [clicksData, referralsData, commissionsData] = await Promise.all([
        supabase
          .from('affiliate_clicks')
          .select('created_at, converted, ip_hash')
          .eq('affiliate_id', profile.id)
          .gte('created_at', startDate.toISOString()),
        
        supabase
          .from('affiliate_referrals')
          .select('status, signup_date')
          .eq('affiliate_id', profile.id)
          .gte('signup_date', startDate.toISOString()),
        
        supabase
          .from('affiliate_commissions')
          .select('commission_amount_usd, commission_type, status, created_at')
          .eq('affiliate_id', profile.id)
          .gte('created_at', startDate.toISOString()),
      ]);

      const dailyClicks: Record<string, number> = {};
      const uniqueIps = new Set<string>();
      let convertedClicks = 0;

      clicksData.data?.forEach(click => {
        const day = click.created_at.split('T')[0];
        dailyClicks[day] = (dailyClicks[day] || 0) + 1;
        if (click.ip_hash) uniqueIps.add(click.ip_hash);
        if (click.converted) convertedClicks++;
      });

      const statusCounts = {
        total: referralsData.data?.length || 0,
        pending: 0,
        in_verification: 0,
        qualified: 0,
        failed: 0,
        churned: 0,
      };

      referralsData.data?.forEach(r => {
        switch (r.status) {
          case 'pending': statusCounts.pending++; break;
          case 'verification_pending': statusCounts.in_verification++; break;
          case 'qualified': statusCounts.qualified++; break;
          case 'verification_failed': statusCounts.failed++; break;
          case 'churned': statusCounts.churned++; break;
        }
      });

      const earnings = { total: 0, recurring: 0, annual: 0, sub_affiliate: 0 };
      commissionsData.data?.forEach(c => {
        if (c.status === 'confirmed' || c.status === 'paid') {
          const amount = Number(c.commission_amount_usd);
          earnings.total += amount;
          switch (c.commission_type) {
            case 'monthly_recurring': earnings.recurring += amount; break;
            case 'annual_upfront': earnings.annual += amount; break;
            case 'sub_affiliate': earnings.sub_affiliate += amount; break;
          }
        }
      });

      const totalClicks = clicksData.data?.length || 0;

      return {
        period: { start: startDate.toISOString(), end: now.toISOString() },
        clicks: {
          total: totalClicks,
          unique_ips: uniqueIps.size,
          converted: convertedClicks,
          conversion_rate: totalClicks > 0 ? (convertedClicks / totalClicks) * 100 : 0,
          daily: Object.entries(dailyClicks)
            .map(([date, clicks]) => ({ date, clicks }))
            .sort((a, b) => a.date.localeCompare(b.date)),
        },
        signups: statusCounts,
        earnings,
        top_sources: [],
      };
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// ===============================================
// MUTATIONS
// ===============================================

export function useUpdateAffiliateProfile() {
  const queryClient = useQueryClient();
  const { data: profile } = useAffiliateProfile();

  return useMutation({
    mutationFn: async (updates: Partial<Pick<AffiliateProfile, 
      'display_name' | 'phone' | 'paypal_email' | 'payment_method' |
      'notify_on_signup' | 'notify_on_qualification' | 'notify_on_commission' | 'notify_on_payout'
    >>) => {
      if (!profile?.id) throw new Error('No affiliate profile');

      const { error } = await supabase
        .from('affiliates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: affiliateKeys.profile() });
    },
  });
}

export function useRequestPayout() {
  const queryClient = useQueryClient();
  const { data: profile } = useAffiliateProfile();

  return useMutation({
    mutationFn: async (amount: number) => {
      if (!profile?.id) throw new Error('No affiliate profile');
      if (!profile.paypal_email) throw new Error('PayPal email not set');
      if (amount < 100) throw new Error('Minimum payout is $100');

      const { data: confirmedCommissions } = await supabase
        .from('affiliate_commissions')
        .select('commission_amount_usd')
        .eq('affiliate_id', profile.id)
        .eq('status', 'confirmed')
        .is('payout_id', null);

      const available = confirmedCommissions?.reduce(
        (sum, c) => sum + Number(c.commission_amount_usd), 0
      ) || 0;

      if (amount > available) {
        throw new Error(`Insufficient balance. Available: $${available.toFixed(2)}`);
      }

      const { error } = await supabase
        .from('affiliate_payouts')
        .insert({
          affiliate_id: profile.id,
          payout_period: new Date().toISOString().slice(0, 10),
          commissions_amount_usd: amount,
          bonuses_amount_usd: 0,
          adjustments_usd: 0,
          total_amount_usd: amount,
          payment_method: profile.payment_method || 'paypal',
          payment_email: profile.paypal_email,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: affiliateKeys.payouts() });
      queryClient.invalidateQueries({ queryKey: affiliateKeys.stats() });
    },
  });
}

// ===============================================
// PREFETCH
// ===============================================

export function usePrefetchAffiliateData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const prefetchAll = async () => {
    if (!user?.id) return;

    await queryClient.prefetchQuery({
      queryKey: affiliateKeys.profile(),
      queryFn: async () => {
        const { data } = await supabase
          .from('affiliates')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'inactive'])
          .maybeSingle();
        return data;
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetchAll };
}

// ===============================================
// DEFAULT EXPORT
// ===============================================

export default {
  useAffiliateProfile,
  useAffiliateStats,
  useAffiliateReferrals,
  useAffiliateCommissions,
  useAffiliatePayouts,
  useAffiliateBonuses,
  useAffiliateAnalytics,
  usePendingVerifications,
  useUpdateAffiliateProfile,
  useRequestPayout,
  usePrefetchAffiliateData,
  affiliateKeys,
};