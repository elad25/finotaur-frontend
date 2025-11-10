// src/hooks/useAffiliate.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  getAffiliatePopupData,
  getOrCreateAffiliateCode,
  getUserReferralDiscount,
  validateAffiliateCode,
  applyFreeMonths,
} from '@/services/affiliateService';
import type { AffiliatePopupData, ReferralDiscount } from '@/types/affiliate';

// ============================================
// Query Keys
// ============================================
export const affiliateKeys = {
  all: ['affiliate'] as const,
  popupData: (userId: string) => [...affiliateKeys.all, 'popup', userId] as const,
  code: (userId: string) => [...affiliateKeys.all, 'code', userId] as const,
  discount: (userId: string) => [...affiliateKeys.all, 'discount', userId] as const,
  validate: (code: string) => [...affiliateKeys.all, 'validate', code] as const,
};

// ============================================
// 🔥 Hook: useAffiliatePopupData
// ============================================
export function useAffiliatePopupData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: affiliateKeys.popupData(user?.id || ''),
    queryFn: () => {
      if (!user?.id) throw new Error('No user ID');
      return getAffiliatePopupData(user.id);
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    retry: 3,
    refetchOnWindowFocus: false,
  });
}

// ============================================
// 🔥 Hook: useAffiliateCode
// ============================================
export function useAffiliateCode() {
  const { user } = useAuth();

  return useQuery({
    queryKey: affiliateKeys.code(user?.id || ''),
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      const result = await getOrCreateAffiliateCode(user.id);
      if (!result.ok) throw new Error(result.error);
      return result.code;
    },
    enabled: !!user?.id,
    staleTime: 300000, // 5 minutes - קוד לא משתנה
    gcTime: 600000, // 10 minutes
    retry: 2,
  });
}

// ============================================
// 🔥 Hook: useReferralDiscount
// ============================================
export function useReferralDiscount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: affiliateKeys.discount(user?.id || ''),
    queryFn: () => {
      if (!user?.id) throw new Error('No user ID');
      return getUserReferralDiscount(user.id);
    },
    enabled: !!user?.id,
    staleTime: 120000, // 2 minutes
    gcTime: 300000, // 5 minutes
    retry: 2,
  });
}

// ============================================
// 🔥 Hook: useValidateAffiliateCode
// ============================================
export function useValidateAffiliateCode(code: string | null) {
  return useQuery({
    queryKey: affiliateKeys.validate(code || ''),
    queryFn: () => {
      if (!code) return false;
      return validateAffiliateCode(code);
    },
    enabled: !!code && code.length > 0,
    staleTime: 180000, // 3 minutes
    gcTime: 300000, // 5 minutes
    retry: 1,
  });
}

// ============================================
// 🔥 Hook: useApplyFreeMonths (Mutation)
// ============================================
export function useApplyFreeMonths() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!user?.id) throw new Error('No user ID');
      return applyFreeMonths(user.id);
    },
    onSuccess: (result) => {
      if (result.ok) {
        // ✅ Invalidate relevant queries
        queryClient.invalidateQueries({
          queryKey: affiliateKeys.popupData(user?.id || ''),
        });
        queryClient.invalidateQueries({
          queryKey: ['profile', user?.id],
        });
      }
    },
  });
}

// ============================================
// 🔥 Hook: useAffiliate (Combined - for backward compatibility)
// ============================================
export function useAffiliate() {
  const { user } = useAuth();
  const { data: affiliateData, isLoading, error } = useAffiliatePopupData();

  // ✅ Memoized copy functions - לא יוצרים functions חדשים בכל render
  const copyReferralLink = () => {
    if (!affiliateData?.referral_url) return false;
    try {
      navigator.clipboard.writeText(affiliateData.referral_url);
      return true;
    } catch {
      return false;
    }
  };

  const copyReferralCode = () => {
    if (!affiliateData?.affiliate_code) return false;
    try {
      navigator.clipboard.writeText(affiliateData.affiliate_code);
      return true;
    } catch {
      return false;
    }
  };

  return {
    loading: isLoading,
    affiliateData,
    error: error ? 'Failed to load affiliate data' : null,
    copyReferralLink,
    copyReferralCode,
  };
}