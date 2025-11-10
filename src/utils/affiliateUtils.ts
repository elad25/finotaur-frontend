import { supabase } from '@/lib/supabase';

export interface ReferralDiscount {
  hasDiscount: boolean;
  discountPercent: number;
  referralCode: string | null;
}

/**
 * ⚡ OPTIMIZED: Uses user_referral_info view
 * Before: 2 separate queries
 * After: 1 query with JOIN
 */
export async function getUserReferralDiscount(userId: string): Promise<ReferralDiscount> {
  try {
    const { data, error } = await supabase
      .from('user_referral_info')
      .select('referred_by, discount_applied')
      .eq('user_id', userId)
      .single();

    if (error || !data?.referred_by) {
      return {
        hasDiscount: false,
        discountPercent: 0,
        referralCode: null
      };
    }

    const discountUsed = data.discount_applied || false;

    return {
      hasDiscount: !discountUsed,
      discountPercent: !discountUsed ? 20 : 0,
      referralCode: data.referred_by
    };
  } catch (error) {
    console.error('Error getting referral discount:', error);
    return {
      hasDiscount: false,
      discountPercent: 0,
      referralCode: null
    };
  }
}

/**
 * ⚡ No changes needed - single update query is already optimal
 */
export async function applyReferralDiscount(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('referrals')
      .update({ 
        discount_applied: true,
        status: 'discount_used'
      })
      .eq('referred_id', userId);

    return !error;
  } catch (error) {
    console.error('Error applying referral discount:', error);
    return false;
  }
}

/**
 * ⚡ OPTIMIZED: Reduced from 3+ queries to 2 queries + atomic function
 * Before: 3-4 queries with race conditions
 * After: 2 queries with atomic increment
 */
export async function processReferralPayment(userId: string): Promise<boolean> {
  try {
    // Get and update referral in one query with RETURNING
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .update({
        converted_to_paid: true,
        converted_at: new Date().toISOString(),
        reward_credited: true,
        credited_at: new Date().toISOString(),
        status: 'completed'
      })
      .eq('referred_id', userId)
      .eq('converted_to_paid', false)
      .select('referrer_id')
      .single();

    if (referralError || !referral) {
      return false;
    }

    // ✅ Atomic increment using database function
    const { error: rewardError } = await supabase.rpc('increment_free_months', {
      p_user_id: referral.referrer_id,
      p_amount: 1
    });

    if (rewardError) {
      console.error('Error incrementing free months:', rewardError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error processing referral payment:', error);
    return false;
  }
}

export function calculateDiscountedPrice(originalPrice: number, discountPercent: number): number {
  const discount = (originalPrice * discountPercent) / 100;
  return Math.round((originalPrice - discount) * 100) / 100;
}

/**
 * ⚡ OPTIMIZED: Uses view instead of separate query
 * Before: 1 query to profiles
 * After: 1 query to view (same performance, but consistent with pattern)
 */
export async function getAvailableFreeMonths(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('user_referral_info')
      .select('free_months_available')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error getting free months:', error);
      return 0;
    }

    return data?.free_months_available || 0;
  } catch (error) {
    console.error('Error getting free months:', error);
    return 0;
  }
}

/**
 * ⚡ OPTIMIZED: Uses atomic database function
 * Before: 2 queries with RACE CONDITION
 * After: 1 atomic function call - thread-safe!
 */
export async function useFreeMonth(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('use_free_month', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error using free month:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error using free month:', error);
    return false;
  }
}

/**
 * ⚡ No changes needed - single query is already optimal
 */
export async function validateAffiliateCode(code: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('affiliate_code')
      .eq('affiliate_code', code)
      .single();

    return !error && !!data;
  } catch (error) {
    return false;
  }
}