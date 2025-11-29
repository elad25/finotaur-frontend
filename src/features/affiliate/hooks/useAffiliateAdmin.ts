// =====================================================
// FINOTAUR AFFILIATE ADMIN HOOKS - WITH WHOP INTEGRATION
// =====================================================
// Place in: src/features/affiliate/hooks/useAffiliateAdmin.ts
// 
// Version: 3.0 - Full Whop Integration
// 
// 🆕 Features:
// - Creates promo code in Whop when admin approves affiliate
// - Syncs discount_tier (standard=10%, vip=15%) with Whop
// - Updates affiliate record with whop_promo_id
// =====================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { 
  AffiliateApplication, 
  Affiliate, 
  AffiliatePayout,
  AffiliateApplicationStatus,
  AffiliateStatus,
  PayoutStatus
} from "../types/affiliate.types";

// ============================================
// QUERY KEYS
// ============================================

export const affiliateAdminKeys = {
  all: ['affiliate-admin'] as const,
  stats: () => [...affiliateAdminKeys.all, 'stats'] as const,
  applications: (status?: string) => [...affiliateAdminKeys.all, 'applications', status] as const,
  affiliates: (status?: string) => [...affiliateAdminKeys.all, 'affiliates', status] as const,
  affiliate: (id: string) => [...affiliateAdminKeys.all, 'affiliate', id] as const,
  payouts: (status?: string) => [...affiliateAdminKeys.all, 'payouts', status] as const,
  payout: (id: string) => [...affiliateAdminKeys.all, 'payout', id] as const,
};

// ============================================
// TYPES
// ============================================

// Discount tier type - matches Whop promo codes
export type DiscountTier = 'standard' | 'vip';

// Discount percentages for each tier
export const DISCOUNT_TIER_VALUES: Record<DiscountTier, number> = {
  standard: 10,  // 10% discount
  vip: 15,       // 15% discount
};

export interface AffiliateAdminStats {
  total_affiliates: number;
  active_affiliates: number;
  pending_applications: number;
  total_clicks: number;
  total_signups: number;
  total_qualified: number;
  total_revenue_usd: number;
  total_commissions_usd: number;
  total_pending_payouts_usd: number;
  conversion_rate: number;
  qualification_rate: number;
  top_affiliates: Array<{
    id: string;
    display_name: string;
    affiliate_code: string;
    current_tier: string;
    total_qualified_referrals: number;
    total_earnings_usd: number;
  }>;
  recent_applications: AffiliateApplication[];
  monthly_stats: Array<{
    month: string;
    signups: number;
    qualified: number;
    commissions: number;
  }>;
}

export interface ApplicationWithUser extends AffiliateApplication {
  user?: {
    email: string;
    display_name: string;
  };
}

export interface AffiliateWithDetails extends Affiliate {
  referrals_count?: number;
  pending_commissions?: number;
  active_customers?: number;
}

interface WhopPromoResponse {
  success: boolean;
  whop_promo_id?: string;
  code?: string;
  discount?: number;
  status?: string;
  error?: string;
  message?: string;
}

// ============================================
// HELPER: Check if table exists
// ============================================

async function tableExists(tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);
    
    if (error?.message?.includes('does not exist') || error?.code === '42P01') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ============================================
// 🆕 HELPER: Create Whop Promo Code via Edge Function
// ============================================

async function createWhopPromoCode(
  affiliateId: string,
  couponCode: string,
  discountPercent: number,
  affiliateName?: string
): Promise<WhopPromoResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No active session');
    }

    // Get Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
                        (supabase as any).supabaseUrl ||
                        'https://your-project.supabase.co';

    console.log('[createWhopPromoCode] Calling Edge Function...');
    console.log('[createWhopPromoCode] Affiliate:', affiliateId);
    console.log('[createWhopPromoCode] Code:', couponCode);
    console.log('[createWhopPromoCode] Discount:', discountPercent);

    const response = await fetch(
      `${supabaseUrl}/functions/v1/create-whop-promo`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          affiliate_id: affiliateId,
          coupon_code: couponCode,
          discount_percent: discountPercent,
          affiliate_name: affiliateName,
        }),
      }
    );

    const result = await response.json();
    
    console.log('[createWhopPromoCode] Response:', result);

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create Whop promo code');
    }

    return result;
  } catch (error: any) {
    console.error('[createWhopPromoCode] Error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error creating Whop promo',
    };
  }
}

// ============================================
// GET ADMIN STATS
// ============================================

export function useAffiliateAdminStats() {
  return useQuery({
    queryKey: affiliateAdminKeys.stats(),
    queryFn: async (): Promise<AffiliateAdminStats> => {
      const emptyStats: AffiliateAdminStats = {
        total_affiliates: 0,
        active_affiliates: 0,
        pending_applications: 0,
        total_clicks: 0,
        total_signups: 0,
        total_qualified: 0,
        total_revenue_usd: 0,
        total_commissions_usd: 0,
        total_pending_payouts_usd: 0,
        conversion_rate: 0,
        qualification_rate: 0,
        top_affiliates: [],
        recent_applications: [],
        monthly_stats: [],
      };

      try {
        const affiliatesExist = await tableExists('affiliates');
        const applicationsExist = await tableExists('affiliate_applications');
        const payoutsExist = await tableExists('affiliate_payouts');

        if (!affiliatesExist && !applicationsExist) {
          console.warn('⚠️ Affiliate tables not found. Run the SQL migration first.');
          return emptyStats;
        }

        let affiliates: any[] = [];
        let pendingApps = 0;
        let recentApps: any[] = [];
        let pendingPayoutsTotal = 0;

        if (affiliatesExist) {
          const { data, error } = await supabase
            .from('affiliates')
            .select('id, status, current_tier, display_name, affiliate_code, total_clicks, total_signups, total_qualified_referrals, total_earnings_usd, total_pending_usd');

          if (!error && data) {
            affiliates = data;
          }
        }

        if (applicationsExist) {
          const { count } = await supabase
            .from('affiliate_applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

          pendingApps = count || 0;

          const { data: apps } = await supabase
            .from('affiliate_applications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

          recentApps = apps || [];
        }

        if (payoutsExist) {
          const { data: payouts } = await supabase
            .from('affiliate_payouts')
            .select('total_amount_usd')
            .eq('status', 'pending');

          if (payouts) {
            pendingPayoutsTotal = payouts.reduce((sum, p) => sum + (p.total_amount_usd || 0), 0);
          }
        }

        const totalAffiliates = affiliates.length;
        const activeAffiliates = affiliates.filter(a => a.status === 'active').length;
        const totalClicks = affiliates.reduce((sum, a) => sum + (a.total_clicks || 0), 0);
        const totalSignups = affiliates.reduce((sum, a) => sum + (a.total_signups || 0), 0);
        const totalQualified = affiliates.reduce((sum, a) => sum + (a.total_qualified_referrals || 0), 0);
        const totalEarnings = affiliates.reduce((sum, a) => sum + (a.total_earnings_usd || 0), 0);

        const topAffiliates = affiliates
          .filter(a => a.status === 'active')
          .sort((a, b) => (b.total_qualified_referrals || 0) - (a.total_qualified_referrals || 0))
          .slice(0, 5)
          .map(a => ({
            id: a.id,
            display_name: a.display_name || 'Unknown',
            affiliate_code: a.affiliate_code || '',
            current_tier: a.current_tier || 'tier_1',
            total_qualified_referrals: a.total_qualified_referrals || 0,
            total_earnings_usd: a.total_earnings_usd || 0,
          }));

        return {
          total_affiliates: totalAffiliates,
          active_affiliates: activeAffiliates,
          pending_applications: pendingApps,
          total_clicks: totalClicks,
          total_signups: totalSignups,
          total_qualified: totalQualified,
          total_revenue_usd: totalEarnings * 5,
          total_commissions_usd: totalEarnings,
          total_pending_payouts_usd: pendingPayoutsTotal,
          conversion_rate: totalClicks > 0 ? (totalSignups / totalClicks) * 100 : 0,
          qualification_rate: totalSignups > 0 ? (totalQualified / totalSignups) * 100 : 0,
          top_affiliates: topAffiliates,
          recent_applications: recentApps,
          monthly_stats: [],
        };
      } catch (error) {
        console.error('Error in useAffiliateAdminStats:', error);
        return emptyStats;
      }
    },
    staleTime: 1000 * 60,
    retry: 1,
  });
}

// ============================================
// GET APPLICATIONS
// ============================================

export function useAffiliateApplications(status?: AffiliateApplicationStatus | 'all') {
  return useQuery({
    queryKey: affiliateAdminKeys.applications(status),
    queryFn: async (): Promise<ApplicationWithUser[]> => {
      try {
        const exists = await tableExists('affiliate_applications');
        if (!exists) {
          console.warn('⚠️ affiliate_applications table not found');
          return [];
        }

        let query = supabase
          .from('affiliate_applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (status && status !== 'all') {
          query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching applications:', error);
          return [];
        }
        
        return data || [];
      } catch (error) {
        console.error('Error in useAffiliateApplications:', error);
        return [];
      }
    },
    retry: 1,
  });
}

// ============================================
// 🔥 APPROVE APPLICATION - WITH WHOP INTEGRATION
// ============================================

export function useApproveApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      applicationId, 
      customCode,
      adminNotes,
      discountTier = 'standard'
    }: { 
      applicationId: string; 
      customCode?: string;
      adminNotes?: string;
      discountTier?: DiscountTier;
    }) => {
      console.log('[useApproveApplication] Starting approval...');
      console.log('[useApproveApplication] Application ID:', applicationId);
      console.log('[useApproveApplication] Custom Code:', customCode);
      console.log('[useApproveApplication] Discount Tier:', discountTier);

      // 1. Get the application details
      const { data: application, error: appError } = await supabase
        .from('affiliate_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (appError) throw appError;
      if (!application) throw new Error('Application not found');

      // 2. Generate affiliate code (no FINOTAUR- prefix)
      const affiliateCode = customCode?.toUpperCase() || 
        application.requested_code?.toUpperCase() ||
        `${application.full_name.split(' ')[0].toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      console.log('[useApproveApplication] Final affiliate code:', affiliateCode);

      // 3. Check if code is unique
      const { data: existing } = await supabase
        .from('affiliates')
        .select('id')
        .eq('affiliate_code', affiliateCode)
        .maybeSingle();

      if (existing) {
        throw new Error(`Code "${affiliateCode}" is already in use`);
      }

      // 4. Get discount percent from tier
      const discountPercent = DISCOUNT_TIER_VALUES[discountTier];

      // 5. Create affiliate record
      const { data: affiliate, error: createError } = await supabase
        .from('affiliates')
        .insert({
          user_id: application.user_id,
          application_id: applicationId,
          display_name: application.full_name,
          email: application.email,
          phone: application.phone,
          country: application.country,
          affiliate_code: affiliateCode,
          coupon_code: affiliateCode, // Same as affiliate_code
          referral_link: `https://finotaur.com/ref/${affiliateCode}`,
          status: 'active',
          current_tier: 'tier_1',
          discount_tier: discountTier,
          activated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;

      console.log('[useApproveApplication] Affiliate created:', affiliate.id);

      // 6. Update application status
      const { error: updateError } = await supabase
        .from('affiliate_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // ============================================
      // 🔥 7. CREATE WHOP PROMO CODE
      // ============================================
      console.log('[useApproveApplication] Creating Whop promo code...');
      
      const whopResult = await createWhopPromoCode(
        affiliate.id,
        affiliateCode,
        discountPercent,
        application.full_name
      );

      let whopPromoId: string | undefined;

      if (whopResult.success && whopResult.whop_promo_id) {
        whopPromoId = whopResult.whop_promo_id;
        console.log('[useApproveApplication] ✅ Whop promo created:', whopPromoId);
        
        // Update affiliate with Whop promo ID
        await supabase
          .from('affiliates')
          .update({ whop_promo_id: whopPromoId })
          .eq('id', affiliate.id);

        toast.success('Whop promo code created!', {
          description: `Code "${affiliateCode}" is now active in Whop with ${discountPercent}% discount`,
        });
      } else {
        console.error('[useApproveApplication] ⚠️ Whop promo failed:', whopResult.error);
        toast.warning('Affiliate approved, but Whop promo creation failed', {
          description: whopResult.error || 'Please create the promo manually in Whop dashboard',
        });
      }

      return {
        affiliate,
        affiliateCode,
        discountTier,
        discountPercent,
        whopPromoId,
        whopSuccess: whopResult.success,
      };
    },
    
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: affiliateAdminKeys.all });
      
      const tierLabel = result.discountTier === 'vip' ? 'VIP (15%)' : 'Standard (10%)';
      toast.success("Application approved!", {
        description: `Code: ${result.affiliateCode} • Discount: ${tierLabel}`,
      });
    },
    
    onError: (error: Error) => {
      console.error('[useApproveApplication] Error:', error);
      toast.error("Failed to approve application", {
        description: error.message,
      });
    },
  });
}

// ============================================
// REJECT APPLICATION
// ============================================

export function useRejectApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      applicationId, 
      reason,
      adminNotes 
    }: { 
      applicationId: string; 
      reason: string;
      adminNotes?: string;
    }) => {
      const { error } = await supabase
        .from('affiliate_applications')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: affiliateAdminKeys.applications() });
      toast.success("Application rejected");
    },
    onError: (error: Error) => {
      toast.error("Failed to reject application", {
        description: error.message,
      });
    },
  });
}

// ============================================
// GET AFFILIATES LIST
// ============================================

export function useAffiliatesList(status?: AffiliateStatus | 'all') {
  return useQuery({
    queryKey: affiliateAdminKeys.affiliates(status),
    queryFn: async (): Promise<AffiliateWithDetails[]> => {
      try {
        const exists = await tableExists('affiliates');
        if (!exists) {
          console.warn('⚠️ affiliates table not found');
          return [];
        }

        let query = supabase
          .from('affiliates')
          .select('*')
          .order('created_at', { ascending: false });

        if (status && status !== 'all') {
          query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching affiliates:', error);
          return [];
        }
        
        return data || [];
      } catch (error) {
        console.error('Error in useAffiliatesList:', error);
        return [];
      }
    },
    retry: 1,
  });
}

// ============================================
// GET SINGLE AFFILIATE
// ============================================

export function useAffiliateDetails(affiliateId: string) {
  return useQuery({
    queryKey: affiliateAdminKeys.affiliate(affiliateId),
    queryFn: async (): Promise<AffiliateWithDetails | null> => {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', affiliateId)
        .single();

      if (error) {
        console.error('Error fetching affiliate details:', error);
        return null;
      }
      return data;
    },
    enabled: !!affiliateId,
    retry: 1,
  });
}

// ============================================
// UPDATE AFFILIATE STATUS
// ============================================

export function useUpdateAffiliateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      affiliateId, 
      status,
      suspensionReason 
    }: { 
      affiliateId: string; 
      status: AffiliateStatus;
      suspensionReason?: string;
    }) => {
      const updates: Record<string, any> = { status };

      if (status === 'suspended') {
        updates.suspended_at = new Date().toISOString();
        updates.suspension_reason = suspensionReason;
      } else if (status === 'active') {
        updates.suspended_at = null;
        updates.suspension_reason = null;
      }

      const { error } = await supabase
        .from('affiliates')
        .update(updates)
        .eq('id', affiliateId);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: affiliateAdminKeys.all });
      toast.success(`Affiliate ${status === 'active' ? 'activated' : status}`);
    },
    onError: (error: Error) => {
      toast.error("Failed to update affiliate", {
        description: error.message,
      });
    },
  });
}

// ============================================
// UPDATE AFFILIATE DETAILS
// ============================================

export function useUpdateAffiliate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      affiliateId, 
      updates 
    }: { 
      affiliateId: string; 
      updates: Partial<Affiliate>;
    }) => {
      const { error } = await supabase
        .from('affiliates')
        .update(updates)
        .eq('id', affiliateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: affiliateAdminKeys.all });
      toast.success("Affiliate updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update affiliate", {
        description: error.message,
      });
    },
  });
}

// ============================================
// UPDATE AFFILIATE DISCOUNT TIER
// ============================================

export function useUpdateAffiliateDiscountTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      affiliateId, 
      discountTier 
    }: { 
      affiliateId: string; 
      discountTier: DiscountTier;
    }) => {
      const { error } = await supabase
        .from('affiliates')
        .update({ discount_tier: discountTier })
        .eq('id', affiliateId);

      if (error) throw error;
    },
    onSuccess: (_, { discountTier }) => {
      queryClient.invalidateQueries({ queryKey: affiliateAdminKeys.all });
      const tierLabel = discountTier === 'vip' ? 'VIP (15%)' : 'Standard (10%)';
      toast.success(`Discount tier updated to ${tierLabel}`);
    },
    onError: (error: Error) => {
      toast.error("Failed to update discount tier", {
        description: error.message,
      });
    },
  });
}

// ============================================
// GET PAYOUTS
// ============================================

export function useAffiliatePayouts(status?: PayoutStatus | 'all') {
  return useQuery({
    queryKey: affiliateAdminKeys.payouts(status),
    queryFn: async (): Promise<(AffiliatePayout & { affiliate?: Affiliate })[]> => {
      try {
        const exists = await tableExists('affiliate_payouts');
        if (!exists) {
          console.warn('⚠️ affiliate_payouts table not found');
          return [];
        }

        let query = supabase
          .from('affiliate_payouts')
          .select(`
            *,
            affiliates (
              id,
              display_name,
              email,
              affiliate_code,
              paypal_email
            )
          `)
          .order('created_at', { ascending: false });

        if (status && status !== 'all') {
          query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching payouts:', error);
          return [];
        }
        
        return (data || []).map(item => ({
          ...item,
          affiliate: (item as any).affiliates,
        }));
      } catch (error) {
        console.error('Error in useAffiliatePayouts:', error);
        return [];
      }
    },
    retry: 1,
  });
}

// ============================================
// PROCESS PAYOUT
// ============================================

export function useProcessPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      payoutId, 
      transactionId,
      notes 
    }: { 
      payoutId: string; 
      transactionId: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('affiliate_payouts')
        .update({
          status: 'completed',
          transaction_id: transactionId,
          processed_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          notes,
        })
        .eq('id', payoutId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: affiliateAdminKeys.all });
      toast.success("Payout processed successfully!");
    },
    onError: (error: Error) => {
      toast.error("Failed to process payout", {
        description: error.message,
      });
    },
  });
}

// ============================================
// CANCEL PAYOUT
// ============================================

export function useCancelPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      payoutId, 
      reason 
    }: { 
      payoutId: string; 
      reason: string;
    }) => {
      const { error } = await supabase
        .from('affiliate_payouts')
        .update({
          status: 'cancelled',
          failure_reason: reason,
          failed_at: new Date().toISOString(),
        })
        .eq('id', payoutId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: affiliateAdminKeys.payouts() });
      toast.success("Payout cancelled");
    },
    onError: (error: Error) => {
      toast.error("Failed to cancel payout", {
        description: error.message,
      });
    },
  });
}

// ============================================
// GENERATE MANUAL PAYOUT
// ============================================

export function useGenerateManualPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      affiliateId, 
      amount,
      notes 
    }: { 
      affiliateId: string; 
      amount: number;
      notes?: string;
    }) => {
      const { data: affiliate, error: affError } = await supabase
        .from('affiliates')
        .select('paypal_email, payment_method, email')
        .eq('id', affiliateId)
        .single();

      if (affError) throw affError;

      const { error } = await supabase
        .from('affiliate_payouts')
        .insert({
          affiliate_id: affiliateId,
          payout_period: new Date().toISOString().split('T')[0],
          commissions_amount_usd: amount,
          bonuses_amount_usd: 0,
          adjustments_usd: 0,
          total_amount_usd: amount,
          status: 'pending',
          payment_method: affiliate?.payment_method || 'paypal',
          payment_email: affiliate?.paypal_email || affiliate?.email,
          notes: notes || 'Manual payout',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: affiliateAdminKeys.all });
      toast.success("Manual payout created");
    },
    onError: (error: Error) => {
      toast.error("Failed to create payout", {
        description: error.message,
      });
    },
  });
}

// ============================================
// EXPORT FOR CONVENIENCE
// ============================================

export default {
  useAffiliateAdminStats,
  useAffiliateApplications,
  useApproveApplication,
  useRejectApplication,
  useAffiliatesList,
  useAffiliateDetails,
  useUpdateAffiliateStatus,
  useUpdateAffiliate,
  useUpdateAffiliateDiscountTier,
  useAffiliatePayouts,
  useProcessPayout,
  useCancelPayout,
  useGenerateManualPayout,
};