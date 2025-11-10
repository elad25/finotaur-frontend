// src/types/affiliate.ts
// ============================================
// Affiliate System Types
// ============================================

export interface AffiliateCode {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
  total_signups: number;
  total_conversions: number;
  free_months_earned: number;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  code_used: string;
  signed_up_at: string;
  converted_to_paid: boolean;
  converted_at: string | null;
  subscription_type: 'basic_monthly' | 'basic_yearly' | 'premium_monthly' | 'premium_yearly' | null;
  reward_credited: boolean;
  credited_at: string | null;
  discount_applied: boolean; // 20% discount for referred user
}

export interface FreeMonthCredit {
  id: string;
  user_id: string;
  months_earned: number;
  earned_from_user_id: string | null;
  earned_at: string;
  applied: boolean;
  applied_at: string | null;
}

export interface AffiliateStats {
  user_id: string;
  total_signups: number;
  total_conversions: number;
  total_free_months_earned: number;
  last_updated: string;
}

export interface AffiliateUserData {
  affiliate_code: string;
  referred_by: string | null;
  free_months_available: number;
  subscription_paused_until: string | null;
}

// ============================================
// 🔥 NEW: ReferralDiscount interface
// ============================================
export interface ReferralDiscount {
  hasDiscount: boolean;
  discountPercent: number;
  referralCode: string | null;
}

// ============================================
// Admin Types
// ============================================

export interface AffiliateAdminStats {
  total_referrals: number;
  total_conversions: number;
  conversion_rate: number;
  total_free_months_granted: number;
  total_discounts_applied: number;
  top_referrers: TopReferrer[];
  recent_conversions: RecentConversion[];
}

export interface TopReferrer {
  user_id: string;
  email: string;
  display_name: string | null;
  total_referrals: number;
  total_conversions: number;
  free_months_earned: number;
}

export interface RecentConversion {
  referral_id: string;
  referrer_email: string;
  referred_email: string;
  subscription_type: string;
  converted_at: string;
  reward_credited: boolean;
}

// ============================================
// UI Types
// ============================================

export interface AffiliatePopupData {
  affiliate_code: string;
  referral_url: string;
  total_signups: number;
  total_conversions: number;
  free_months_available: number;
  next_billing_date: string | null;
  subscription_status: 'free' | 'active' | 'paused';
  account_type: 'free' | 'basic' | 'premium';
  subscription_interval: 'monthly' | 'yearly' | null;
}

export interface ReferralTreeNode {
  user_id: string;
  email: string;
  display_name: string | null;
  affiliate_code: string;
  signed_up_at: string;
  converted: boolean;
  subscription_type: string | null;
  children: ReferralTreeNode[];
}