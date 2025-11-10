// src/services/affiliateService.ts
import { supabase, cachedQuery, supabaseCache } from '@/lib/supabase';
import { AffiliatePopupData, ReferralDiscount } from '@/types/affiliate';

// ============================================
// 🔥 CACHE KEYS - Centralized
// ============================================
const CACHE_KEYS = {
  affiliatePopup: (userId: string) => `affiliate:popup:${userId}`,
  affiliateCode: (userId: string) => `affiliate:code:${userId}`,
  referralDiscount: (userId: string) => `affiliate:discount:${userId}`,
  validateCode: (code: string) => `affiliate:validate:${code}`,
  adminStats: () => 'affiliate:admin:stats',
  referralTree: (userId: string) => `affiliate:tree:${userId}`,
} as const;

const CACHE_TTL = {
  POPUP_DATA: 60000, // 1 minute - נתונים שמשתנים לעיתים קרובות
  AFFILIATE_CODE: 300000, // 5 minutes - קוד לא משתנה
  DISCOUNT: 120000, // 2 minutes - סטטוס הנחה
  VALIDATION: 180000, // 3 minutes - validation results
  ADMIN_STATS: 120000, // 2 minutes - admin stats
  REFERRAL_TREE: 300000, // 5 minutes - referral tree
} as const;

// ============================================
// Helper Functions
// ============================================

function calculateNextBillingDate(
  currentExpiry: string | null,
  freeMonths: number,
  interval: 'monthly' | 'yearly' | null
): string | null {
  if (!currentExpiry || !interval) return null;
  const date = new Date(currentExpiry);
  date.setMonth(date.getMonth() + freeMonths);
  return date.toISOString();
}

function buildReferralUrl(code: string): string {
  // ✅ אם בצד שרת, השתמש ב-env variable
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || 'https://app.finotaur.com';
  
  return `${baseUrl}/auth/register?ref=${code}`;
}

// ============================================
// 🔥 OPTIMIZED: Get or Create Affiliate Code
// ============================================

export async function getOrCreateAffiliateCode(
  userId: string
): Promise<{ ok: boolean; code?: string; error?: string }> {
  const cacheKey = CACHE_KEYS.affiliateCode(userId);

  try {
    // ✅ Try cache first
    const cached = supabaseCache.get<string>(cacheKey);
    if (cached) {
      return { ok: true, code: cached };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('affiliate_code')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;
    
    if (profile.affiliate_code) {
      supabaseCache.set(cacheKey, profile.affiliate_code, CACHE_TTL.AFFILIATE_CODE);
      return { ok: true, code: profile.affiliate_code };
    }

    // ✅ Generate unique code on database side
    const { data: newCode, error: generateError } = await supabase
      .rpc('generate_unique_affiliate_code');

    if (generateError || !newCode) {
      throw new Error('Failed to generate unique affiliate code');
    }

    // Update profile with new code
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ affiliate_code: newCode })
      .eq('id', userId);

    if (updateError) throw updateError;

    // ✅ Cache the new code
    supabaseCache.set(cacheKey, newCode, CACHE_TTL.AFFILIATE_CODE);

    return { ok: true, code: newCode };

  } catch (error: any) {
    console.error('❌ Error getting/creating affiliate code:', error);
    return { ok: false, error: error.message };
  }
}

// ============================================
// 🔥 OPTIMIZED: Get Affiliate Popup Data with React Query Support
// ============================================

export async function getAffiliatePopupData(
  userId: string
): Promise<AffiliatePopupData | null> {
  const cacheKey = CACHE_KEYS.affiliatePopup(userId);

  return cachedQuery(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from('affiliate_stats_view')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      let nextBillingDate = null;
      if (data.subscription_expires_at && data.account_type !== 'free') {
        nextBillingDate = calculateNextBillingDate(
          data.subscription_expires_at,
          data.free_months_available || 0,
          data.subscription_interval
        );
      }

      let subscriptionStatus: 'free' | 'active' | 'paused' = 'free';
      if (data.account_type !== 'free') {
        if (data.subscription_paused_until) {
          subscriptionStatus = 'paused';
        } else {
          subscriptionStatus = 'active';
        }
      }

      const referralUrl = buildReferralUrl(data.affiliate_code);

      return {
        affiliate_code: data.affiliate_code || 'GENERATING...',
        referral_url: referralUrl,
        total_signups: data.total_signups || 0,
        total_conversions: data.total_conversions || 0,
        free_months_available: data.free_months_available || 0,
        next_billing_date: nextBillingDate,
        subscription_status: subscriptionStatus,
        account_type: data.account_type,
        subscription_interval: data.subscription_interval,
      };
    },
    CACHE_TTL.POPUP_DATA
  );
}

// ============================================
// 🔥 FIXED: Get Affiliate Admin Stats
// ============================================

export async function getAffiliateAdminStats(): Promise<{
  total_referrals: number;
  total_conversions: number;
  conversion_rate: number;
  total_free_months_granted: number;
  total_discounts_applied: number;
  top_referrers: Array<{
    user_id: string;
    email: string;
    display_name: string | null;
    total_referrals: number;
    total_conversions: number;
    free_months_earned: number;
  }>;
  recent_conversions: Array<{
    referral_id: string;
    referrer_email: string;
    referred_email: string;
    subscription_type: string;
    converted_at: string;
    reward_credited: boolean;
  }>;
} | null> {
  const cacheKey = CACHE_KEYS.adminStats();

  try {
    return await cachedQuery(
      cacheKey,
      async () => {
        // Get all referrals stats with user info
        const { data: referrals, error: referralsError } = await supabase
          .from('referrals')
          .select(`
            id,
            referrer_id,
            referred_id,
            converted_to_paid,
            subscription_type,
            converted_at,
            discount_applied,
            reward_credited,
            signed_up_at
          `)
          .order('signed_up_at', { ascending: false });

        if (referralsError) throw referralsError;

        const totalReferrals = referrals?.length || 0;
        const totalConversions = referrals?.filter(r => r.converted_to_paid).length || 0;
        const conversionRate = totalReferrals > 0 ? (totalConversions / totalReferrals) * 100 : 0;

        // Calculate total discounts applied
        const totalDiscounts = referrals?.filter(r => r.discount_applied).length || 0;

        // Get total free months granted
        const { data: freeMonthsData, error: freeMonthsError } = await supabase
          .from('profiles')
          .select('free_months_available');

        if (freeMonthsError) throw freeMonthsError;

        const totalFreeMonthsGranted = freeMonthsData?.reduce((sum, p) => sum + (p.free_months_available || 0), 0) || 0;

        // Get unique referrer IDs for top referrers query
        const referrerIds = [...new Set(referrals?.map(r => r.referrer_id) || [])];

        // Get referrer profile info
        const { data: referrerProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, display_name, free_months_available')
          .in('id', referrerIds);

        if (profilesError) throw profilesError;

        // Build profile map
        const profileMap = new Map(
          referrerProfiles?.map(p => [p.id, p]) || []
        );

        // Calculate top referrers
        const referrerMap = new Map<string, {
          user_id: string;
          email: string;
          display_name: string | null;
          total_referrals: number;
          total_conversions: number;
          free_months_earned: number;
        }>();

        referrals?.forEach((ref: any) => {
          const referrerId = ref.referrer_id;
          const profile = profileMap.get(referrerId);
          
          if (!referrerMap.has(referrerId)) {
            referrerMap.set(referrerId, {
              user_id: referrerId,
              email: profile?.email || 'Unknown',
              display_name: profile?.display_name || null,
              total_referrals: 0,
              total_conversions: 0,
              free_months_earned: profile?.free_months_available || 0,
            });
          }
          
          const referrer = referrerMap.get(referrerId)!;
          referrer.total_referrals++;
          if (ref.converted_to_paid) {
            referrer.total_conversions++;
          }
        });

        const topReferrers = Array.from(referrerMap.values())
          .sort((a, b) => b.total_conversions - a.total_conversions)
          .slice(0, 10);

        // Get referred user emails for recent conversions
        const convertedReferrals = referrals?.filter(r => r.converted_to_paid && r.converted_at) || [];
        const referredIds = convertedReferrals.map(r => r.referred_id);
        
        const { data: referredProfiles, error: referredError } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', referredIds);

        if (referredError) throw referredError;

        const referredMap = new Map(
          referredProfiles?.map(p => [p.id, p.email]) || []
        );

        // Get recent conversions
        const recentConversions = convertedReferrals
          .slice(0, 20)
          .map((r: any) => {
            const referrerProfile = profileMap.get(r.referrer_id);
            return {
              referral_id: r.id,
              referrer_email: referrerProfile?.email || 'Unknown',
              referred_email: referredMap.get(r.referred_id) || 'Unknown',
              subscription_type: r.subscription_type || 'unknown',
              converted_at: r.converted_at,
              reward_credited: r.reward_credited || false,
            };
          });

        return {
          total_referrals: totalReferrals,
          total_conversions: totalConversions,
          conversion_rate: Math.round(conversionRate * 10) / 10,
          total_free_months_granted: totalFreeMonthsGranted,
          total_discounts_applied: totalDiscounts,
          top_referrers: topReferrers,
          recent_conversions: recentConversions,
        };
      },
      CACHE_TTL.ADMIN_STATS
    );
  } catch (error) {
    console.error('❌ Error getting admin stats:', error);
    return null;
  }
}

// ============================================
// 🔥 FIXED: Get Referral Tree
// ============================================

export async function getReferralTree(userId: string): Promise<{
  user_id: string;
  email: string;
  display_name: string | null;
  affiliate_code: string;
  signed_up_at: string;
  converted: boolean;
  subscription_type: string | null;
  children: Array<{
    user_id: string;
    email: string;
    display_name: string | null;
    affiliate_code: string;
    signed_up_at: string;
    converted: boolean;
    subscription_type: string | null;
    children: any[];
  }>;
} | null> {
  const cacheKey = CACHE_KEYS.referralTree(userId);

  try {
    return await cachedQuery(
      cacheKey,
      async () => {
        // Get user info
        const { data: user, error: userError } = await supabase
          .from('profiles')
          .select('id, email, display_name, affiliate_code, created_at, account_type, subscription_interval')
          .eq('id', userId)
          .single();

        if (userError) throw userError;

        // Get referrals with profile info
        const { data: referrals, error: referralsError } = await supabase
          .from('referrals')
          .select(`
            id,
            referred_id,
            converted_to_paid,
            subscription_type,
            signed_up_at
          `)
          .eq('referrer_id', userId)
          .order('signed_up_at', { ascending: false });

        if (referralsError) throw referralsError;

        // Get all referred user profiles
        const referredIds = referrals?.map(r => r.referred_id) || [];
        
        const { data: referredProfiles, error: referredError } = await supabase
          .from('profiles')
          .select('id, email, display_name, affiliate_code, created_at')
          .in('id', referredIds);

        if (referredError) throw referredError;

        const profileMap = new Map(
          referredProfiles?.map(p => [p.id, p]) || []
        );

        // Build children array
        const children = (referrals || []).map((r: any) => {
          const profile = profileMap.get(r.referred_id);
          return {
            user_id: r.referred_id,
            email: profile?.email || 'Unknown',
            display_name: profile?.display_name || null,
            affiliate_code: profile?.affiliate_code || '',
            signed_up_at: r.signed_up_at,
            converted: r.converted_to_paid || false,
            subscription_type: r.subscription_type,
            children: [], // For now, only 1 level deep
          };
        });

        // Determine if the main user has converted (has paid subscription)
        const isConverted = user.account_type !== 'free';

        return {
          user_id: user.id,
          email: user.email || 'Unknown',
          display_name: user.display_name || null,
          affiliate_code: user.affiliate_code || '',
          signed_up_at: user.created_at || new Date().toISOString(),
          converted: isConverted,
          subscription_type: user.subscription_interval ? `premium_${user.subscription_interval}` : null,
          children: children,
        };
      },
      CACHE_TTL.REFERRAL_TREE
    );
  } catch (error) {
    console.error('❌ Error getting referral tree:', error);
    return null;
  }
}

// ============================================
// 🔥 FIXED: Admin Grant Free Months
// ============================================

export async function adminGrantFreeMonths(
  userId: string,
  months: number,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (months <= 0) {
      return { ok: false, error: 'Invalid number of months' };
    }

    // Use atomic increment RPC
    const { error: incrementError } = await supabase.rpc('increment_free_months', {
      p_user_id: userId,
      p_amount: months
    });

    if (incrementError) throw incrementError;

    // ✅ Invalidate cache
    supabaseCache.invalidate(`affiliate:popup:${userId}`);
    supabaseCache.invalidate(CACHE_KEYS.adminStats());

    return { ok: true };

  } catch (error: any) {
    console.error('❌ Error granting free months:', error);
    return { ok: false, error: error.message };
  }
}

// ============================================
// 🔥 OPTIMIZED: Track Referral Signup
// ============================================

export async function trackReferralSignup(
  referredUserId: string,
  referralCode: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // ✅ Validate code first (with cache)
    const isValid = await validateAffiliateCode(referralCode);
    if (!isValid) {
      return { ok: false, error: 'Invalid referral code' };
    }

    const { data: referrer, error: referrerError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('affiliate_code', referralCode)
      .single();

    if (referrerError || !referrer) {
      return { ok: false, error: 'Invalid referral code' };
    }

    if (referrer.id === referredUserId) {
      return { ok: false, error: 'Cannot refer yourself' };
    }

    // Update profile and insert referral
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ referred_by: referralCode })
      .eq('id', referredUserId);

    if (updateError) throw updateError;

    const { error: referralError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.id,
        referred_id: referredUserId,
        referral_code: referralCode,
        status: 'pending',
        converted_to_paid: false,
        discount_applied: false,
        reward_granted_to_referrer: false,
        reward_granted_to_referred: false,
        signed_up_at: new Date().toISOString()
      });

    if (referralError) throw referralError;

    // ✅ Atomic increment
    await supabase.rpc('increment_referral_count', {
      p_user_id: referrer.id
    });

    // ✅ Invalidate relevant caches
    supabaseCache.invalidate(`affiliate:popup:${referrer.id}`);
    supabaseCache.invalidate(`affiliate:discount:${referredUserId}`);
    supabaseCache.invalidate(CACHE_KEYS.adminStats());

    return { ok: true };

  } catch (error: any) {
    console.error('❌ Error tracking referral signup:', error);
    return { ok: false, error: error.message };
  }
}

// ============================================
// 🔥 OPTIMIZED: Process Referral Conversion
// ============================================

export async function processReferralConversion(
  referredUserId: string,
  subscriptionType: 'basic_monthly' | 'basic_yearly' | 'premium_monthly' | 'premium_yearly'
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Update referral and get referrer_id in one query
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .update({
        converted_to_paid: true,
        converted_at: new Date().toISOString(),
        subscription_type: subscriptionType,
        discount_applied: true,
        reward_credited: true,
        reward_granted_to_referrer: true,
        status: 'completed'
      })
      .eq('referred_id', referredUserId)
      .eq('converted_to_paid', false)
      .select('referrer_id')
      .single();

    if (referralError || !referral) {
      console.log('⚠️ No pending referral found for user:', referredUserId);
      return { ok: true };
    }

    // ✅ Atomic increment
    await supabase.rpc('increment_free_months', {
      p_user_id: referral.referrer_id,
      p_amount: 1
    });

    // ✅ Invalidate caches for both users
    supabaseCache.invalidate(`affiliate:popup:${referral.referrer_id}`);
    supabaseCache.invalidate(`affiliate:discount:${referredUserId}`);
    supabaseCache.invalidate(CACHE_KEYS.adminStats());

    return { ok: true };

  } catch (error: any) {
    console.error('❌ Error processing referral conversion:', error);
    return { ok: false, error: error.message };
  }
}

// ============================================
// 🔥 OPTIMIZED: Get User Referral Discount
// ============================================

export async function getUserReferralDiscount(
  userId: string
): Promise<ReferralDiscount> {
  const cacheKey = CACHE_KEYS.referralDiscount(userId);

  try {
    return await cachedQuery(
      cacheKey,
      async () => {
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
      },
      CACHE_TTL.DISCOUNT
    );
  } catch (error) {
    console.error('Error getting referral discount:', error);
    return {
      hasDiscount: false,
      discountPercent: 0,
      referralCode: null
    };
  }
}

// ============================================
// 🔥 OPTIMIZED: Validate Affiliate Code (with cache)
// ============================================

export async function validateAffiliateCode(code: string): Promise<boolean> {
  if (!code || code.trim().length === 0) return false;
  
  const cacheKey = CACHE_KEYS.validateCode(code);

  try {
    return await cachedQuery(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('affiliate_code')
          .eq('affiliate_code', code)
          .single();

        return !error && !!data;
      },
      CACHE_TTL.VALIDATION
    );
  } catch (error) {
    return false;
  }
}

// ============================================
// 🔥 OPTIMIZED: Apply Free Months
// ============================================

export async function applyFreeMonths(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('free_months_available, subscription_expires_at, subscription_interval')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    if (!profile.free_months_available || profile.free_months_available === 0) {
      return { ok: false, error: 'No free months available' };
    }

    if (!profile.subscription_expires_at) {
      return { ok: false, error: 'No active subscription' };
    }

    const currentExpiry = new Date(profile.subscription_expires_at);
    const monthsToAdd = profile.free_months_available;
    currentExpiry.setMonth(currentExpiry.getMonth() + monthsToAdd);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_expires_at: currentExpiry.toISOString(),
        free_months_available: 0,
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // ✅ Invalidate cache
    supabaseCache.invalidate(`affiliate:popup:${userId}`);

    return { ok: true };

  } catch (error: any) {
    console.error('❌ Error applying free months:', error);
    return { ok: false, error: error.message };
  }
}

// ============================================
// 🔥 OPTIMIZED: Referral Payment Processing
// ============================================

export async function processReferralPayment(userId: string): Promise<boolean> {
  try {
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

    const { error: rewardError } = await supabase.rpc('increment_free_months', {
      p_user_id: referral.referrer_id,
      p_amount: 1
    });

    if (rewardError) {
      console.error('Error incrementing free months:', rewardError);
      return false;
    }

    // ✅ Invalidate caches
    supabaseCache.invalidate(`affiliate:popup:${referral.referrer_id}`);
    supabaseCache.invalidate(`affiliate:discount:${userId}`);
    supabaseCache.invalidate(CACHE_KEYS.adminStats());

    return true;
  } catch (error) {
    console.error('Error processing referral payment:', error);
    return false;
  }
}

// ============================================
// Utility Functions
// ============================================

export function calculateDiscountedPrice(
  originalPrice: number,
  discountPercent: number
): number {
  const discount = (originalPrice * discountPercent) / 100;
  return Math.round((originalPrice - discount) * 100) / 100;
}

export async function applyReferralDiscount(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('referrals')
      .update({ 
        discount_applied: true,
        status: 'discount_used'
      })
      .eq('referred_id', userId);

    // ✅ Invalidate cache
    if (!error) {
      supabaseCache.invalidate(`affiliate:discount:${userId}`);
    }

    return !error;
  } catch (error) {
    console.error('Error applying referral discount:', error);
    return false;
  }
}