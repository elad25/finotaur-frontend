import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

export interface AffiliateStatus {
  isAffiliate: boolean;
  isLoading: boolean;
  affiliateId: string | null;
  affiliateCode: string | null;
  currentTier: 'tier_1' | 'tier_2' | 'tier_3' | null;
  discountTier: 'standard' | 'vip' | null;
  status: string | null;
}

/**
 * Hook to check if the current user is an active affiliate
 * Can be used anywhere to conditionally show affiliate features
 */
export function useAffiliateStatus(): AffiliateStatus {
  const { user } = useAuth();
  const [affiliateStatus, setAffiliateStatus] = useState<AffiliateStatus>({
    isAffiliate: false,
    isLoading: true,
    affiliateId: null,
    affiliateCode: null,
    currentTier: null,
    discountTier: null,
    status: null,
  });

  useEffect(() => {
    async function checkAffiliateStatus() {
      if (!user?.id) {
        setAffiliateStatus({
          isAffiliate: false,
          isLoading: false,
          affiliateId: null,
          affiliateCode: null,
          currentTier: null,
          discountTier: null,
          status: null,
        });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('affiliates')
          .select('id, affiliate_code, current_tier, discount_tier, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (error) {
          console.error('Error checking affiliate status:', error);
          setAffiliateStatus(prev => ({ ...prev, isLoading: false }));
          return;
        }

        if (data) {
          setAffiliateStatus({
            isAffiliate: true,
            isLoading: false,
            affiliateId: data.id,
            affiliateCode: data.affiliate_code,
            currentTier: data.current_tier,
            discountTier: data.discount_tier,
            status: data.status,
          });
        } else {
          setAffiliateStatus({
            isAffiliate: false,
            isLoading: false,
            affiliateId: null,
            affiliateCode: null,
            currentTier: null,
            discountTier: null,
            status: null,
          });
        }
      } catch (error) {
        console.error('Error in checkAffiliateStatus:', error);
        setAffiliateStatus(prev => ({ ...prev, isLoading: false }));
      }
    }

    checkAffiliateStatus();
  }, [user?.id]);

  return affiliateStatus;
}

/**
 * Simplified hook that just returns boolean for affiliate check
 */
export function useIsAffiliate(): { isAffiliate: boolean; isLoading: boolean } {
  const { isAffiliate, isLoading } = useAffiliateStatus();
  return { isAffiliate, isLoading };
}

export default useAffiliateStatus;