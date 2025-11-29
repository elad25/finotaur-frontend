// =====================================================
// FINOTAUR AFFILIATE SYSTEM - TypeScript Types
// =====================================================
// Place in: src/features/affiliate/types/affiliate.types.ts
// 
// VERSION: 2.3.0
// UPDATES:
// - 🔥 Added DiscountTier type (v2.3)
// - 🔥 Added discount_tier to Affiliate interface (v2.3)
// - 🔥 Added DISCOUNT_TIER_INFO constant (v2.3)
// - Added 'verification_pending' to ReferralStatus (v2.1)
// - Updated annual commission rate to 15% (was 18%) (v2.2)
// =====================================================

// ============================================
// ENUMS
// ============================================

export type AffiliateApplicationStatus = 
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type AffiliateStatus = 
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'terminated';

export type AffiliateTier = 
  | 'tier_1'  // 0-20 clients, 10%
  | 'tier_2'  // 20-75 clients, 15%
  | 'tier_3'; // 75+ clients, 20%

// 🔥 v2.3.0 NEW: Discount Tier (Customer discount when using affiliate code)
export type DiscountTier = 
  | 'standard'  // 10% discount for customers
  | 'vip';      // 15% discount for customers

// 🔥 v2.1 UPDATED: Added 'verification_pending' status
export type ReferralStatus = 
  | 'pending'               // User signed up, awaiting first payment
  | 'verification_pending'  // First payment received, in 7-day verification period
  | 'verification_failed'   // Refund/chargeback during 7-day period
  | 'qualified'             // Passed verification, paying
  | 'churned'               // Was qualified, subscription ended
  | 'refunded';             // Refund issued after qualification

export type CommissionType = 
  | 'monthly_recurring'  // Regular monthly
  | 'annual_upfront'     // 15% upfront for annual
  | 'sub_affiliate';     // 5% from sub-affiliates

export type CommissionStatus = 
  | 'pending'
  | 'confirmed'
  | 'paid'
  | 'cancelled'
  | 'expired';

export type BonusType = 
  | 'milestone_20'          // $100 for 20 clients
  | 'milestone_50'          // $300 for 50 clients
  | 'milestone_100'         // $1,000 for 100 clients
  | 'milestone_50_recurring'; // $100 for every 50 after 100

export type BonusStatus = 
  | 'pending'
  | 'paid'
  | 'cancelled';

export type PayoutStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';


// ============================================
// DATABASE TABLE TYPES
// ============================================

export interface AffiliateApplication {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  phone: string | null;
  country: string | null;
  
  // Social/Marketing Presence
  instagram_handle: string | null;
  youtube_channel: string | null;
  tiktok_handle: string | null;
  twitter_handle: string | null;
  website_url: string | null;
  other_platforms: string[];
  
  // Audience Info
  total_followers: number;
  primary_audience: string | null;
  audience_location: string | null;
  
  // Marketing Plans
  promotion_plan: string | null;
  expected_monthly_referrals: number | null;
  
  // Custom Code Request
  requested_code: string | null;
  
  // Status
  status: AffiliateApplicationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  
  // Metadata
  ip_address: string | null;
  user_agent: string | null;
  referral_source: string | null;
  
  created_at: string;
  updated_at: string;
}

// 🔥 v2.3.0 UPDATED: Added discount_tier field
export interface Affiliate {
  id: string;
  user_id: string;
  application_id: string | null;
  
  // Personal Info
  display_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  
  // Unique Codes
  affiliate_code: string;
  coupon_code: string | null;
  referral_link: string; // Generated: https://finotaur.com/ref/{code}
  
  // Status & Tier
  status: AffiliateStatus;
  current_tier: AffiliateTier;
  
  // 🔥 v2.3.0 NEW: Discount tier for customers using this affiliate's code
  discount_tier: DiscountTier;
  
  // Parent Affiliate (Layer 2)
  parent_affiliate_id: string | null;
  can_recruit_sub_affiliates: boolean;
  
  // Performance Stats
  total_clicks: number;
  total_signups: number;
  total_qualified_referrals: number;
  total_active_customers: number;
  
  // Earnings
  total_earnings_usd: number;
  total_pending_usd: number;
  total_paid_usd: number;
  total_bonuses_usd: number;
  total_sub_affiliate_earnings_usd: number;
  sub_affiliate_count: number;
  
  // Payment Info
  paypal_email: string | null;
  payment_method: string;
  
  // Notification Settings
  notify_on_signup: boolean;
  notify_on_qualification: boolean;
  notify_on_commission: boolean;
  notify_on_payout: boolean;
  
  // Metadata
  activated_at: string;
  last_activity_at: string;
  suspended_at: string | null;
  suspension_reason: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface AffiliateClick {
  id: string;
  affiliate_id: string;
  
  // Click Data
  ip_address: string | null;
  user_agent: string | null;
  referrer_url: string | null;
  landing_page: string | null;
  
  // UTM Parameters
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  
  // Geographic Data
  country_code: string | null;
  region: string | null;
  city: string | null;
  
  // Device Info
  device_type: string | null;
  browser: string | null;
  os: string | null;
  
  // Conversion
  converted: boolean;
  converted_at: string | null;
  converted_user_id: string | null;
  
  created_at: string;
}

export interface AffiliateReferral {
  id: string;
  affiliate_id: string;
  referred_user_id: string;
  referred_user_email: string;
  click_id: string | null;
  
  // Signup Details
  signup_date: string;
  signup_plan: string | null;
  
  // Discount Applied
  discount_percent: number;
  discount_amount_usd: number;
  
  // Verification Period (7 days AFTER first payment)
  verification_start: string | null;
  verification_end: string | null;
  
  // Status
  status: ReferralStatus;
  qualified_at: string | null;
  churned_at: string | null;
  
  // Subscription Info
  subscription_id: string | null;
  subscription_plan: string | null;
  subscription_type: string | null;
  subscription_price_usd: number | null;
  subscription_started_at: string | null;
  subscription_cancelled_at: string | null;
  
  // Commission Tracking
  commission_eligible: boolean;
  commission_start_date: string | null;
  commission_end_date: string | null;
  months_commissioned: number;
  
  // First Payment (triggers verification period)
  first_payment_amount_usd: number | null;
  first_payment_date: string | null;
  
  notes: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  referral_id: string | null;
  sub_affiliate_id: string | null;
  
  // Commission Details
  commission_type: CommissionType;
  commission_month: string;
  
  // Calculation
  base_amount_usd: number;
  commission_rate: number;
  commission_amount_usd: number;
  
  // Tier at time
  tier_at_time: AffiliateTier;
  
  // Status
  status: CommissionStatus;
  payout_id: string | null;
  
  // Commission Cap
  month_number: number | null;
  is_capped: boolean;
  
  // Timestamps
  calculated_at: string;
  confirmed_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface AffiliateBonus {
  id: string;
  affiliate_id: string;
  
  bonus_type: BonusType;
  milestone_reached: number;
  bonus_amount_usd: number;
  
  status: BonusStatus;
  payout_id: string | null;
  
  earned_at: string;
  paid_at: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface AffiliatePayout {
  id: string;
  affiliate_id: string;
  
  payout_period: string;
  
  // Amounts
  commissions_amount_usd: number;
  bonuses_amount_usd: number;
  adjustments_usd: number;
  total_amount_usd: number;
  
  // Status
  status: PayoutStatus;
  
  // Payment Details
  payment_method: string;
  payment_email: string | null;
  transaction_id: string | null;
  
  // Dates
  scheduled_date: string | null;
  processed_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  
  // Error Handling
  failure_reason: string | null;
  retry_count: number;
  
  // Admin
  processed_by: string | null;
  notes: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface AffiliateActivityLog {
  id: string;
  affiliate_id: string | null;
  
  activity_type: string;
  description: string;
  
  related_referral_id: string | null;
  related_commission_id: string | null;
  related_bonus_id: string | null;
  related_payout_id: string | null;
  
  metadata: Record<string, any>;
  
  triggered_by: string | null;
  is_system_action: boolean;
  
  created_at: string;
}


// ============================================
// VIEW TYPES (Dashboard)
// ============================================

// 🔥 v2.3.0 UPDATED: Added discount_tier and customer_discount_rate
export interface AffiliateDashboardSummary {
  affiliate_id: string;
  user_id: string;
  display_name: string;
  affiliate_code: string;
  coupon_code: string | null;
  referral_link: string;
  status: AffiliateStatus;
  current_tier: AffiliateTier;
  discount_tier: DiscountTier;  // 🔥 v2.3.0 NEW
  
  // Performance
  total_clicks: number;
  total_signups: number;
  total_qualified_referrals: number;
  total_active_customers: number;
  
  // Earnings
  total_earnings_usd: number;
  total_pending_usd: number;
  total_paid_usd: number;
  total_bonuses_usd: number;
  total_sub_affiliate_earnings_usd: number;
  
  // Sub-affiliates
  sub_affiliate_count: number;
  can_recruit_sub_affiliates: boolean;
  
  // Calculated
  current_commission_rate: number;
  customer_discount_rate: number;  // 🔥 v2.3.0 NEW
  clients_to_next_tier: number;
  signup_conversion_rate: number;
  qualification_rate: number;
  
  // Payment Info
  paypal_email: string | null;
  payment_method: string | null;
  
  last_activity_at: string;
  activated_at: string;
}

export interface AffiliateMonthlyPerformance {
  affiliate_id: string;
  user_id: string;
  display_name: string;
  month: string;
  
  recurring_commissions: number;
  annual_commissions: number;
  sub_affiliate_commissions: number;
  total_commissions: number;
  active_referrals_count: number;
}

export interface AffiliatePendingVerification {
  referral_id: string;
  affiliate_id: string;
  affiliate_name: string;
  referred_user_email: string;
  signup_date: string;
  first_payment_date: string | null;
  first_payment_amount_usd: number | null;
  verification_start: string;
  verification_end: string;
  subscription_plan: string | null;
  subscription_price_usd: number | null;
  discount_percent: number;
  days_remaining: number;
  verification_progress_pct: number;
}

export interface AffiliatePendingPayment {
  referral_id: string;
  affiliate_id: string;
  affiliate_name: string;
  referred_user_email: string;
  signup_date: string;
  signup_plan: string | null;
  discount_percent: number;
  days_since_signup: number;
}

// 🔥 v2.3.0 UPDATED: Added discount_tier
export interface AffiliateLeaderboardEntry {
  affiliate_id: string;
  display_name: string;
  affiliate_code: string;
  current_tier: AffiliateTier;
  discount_tier: DiscountTier;  // 🔥 v2.3.0 NEW
  total_qualified_referrals: number;
  total_earnings_usd: number;
  total_active_customers: number;
  sub_affiliate_count: number;
  earnings_rank: number;
  referrals_rank: number;
  current_month_earnings: number;
}


// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface AffiliateApplicationSubmission {
  email: string;
  full_name: string;
  phone?: string;
  country?: string;
  instagram_handle?: string;
  youtube_channel?: string;
  tiktok_handle?: string;
  twitter_handle?: string;
  website_url?: string;
  other_platforms?: string[];
  total_followers?: number;
  primary_audience?: string;
  audience_location?: string;
  promotion_plan?: string;
  expected_monthly_referrals?: number;
  referral_source?: string;
  requested_code?: string;
}

export interface TrackReferralRequest {
  affiliate_code: string;
  user_id: string;
  user_email: string;
  subscription_id?: string;
  subscription_plan?: string;
  subscription_type?: 'monthly' | 'annual';
  subscription_price?: number;
  click_id?: string;
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

export interface ProcessPayoutRequest {
  payout_id: string;
  transaction_id: string;
}

// 🔥 v2.3.0 NEW: Validate code response includes discount_tier
export interface ValidateCodeResponse {
  is_valid: boolean;
  affiliate_id?: string;
  affiliate_name?: string;
  affiliate_code?: string;
  discount_monthly?: number;
  discount_yearly?: number;
  discount_tier?: DiscountTier;
}


// ============================================
// CONFIGURATION TYPES
// ============================================

export interface AffiliateConfig {
  commission_rates: {
    tier_1: { rate: number; min_clients: number; max_clients: number };
    tier_2: { rate: number; min_clients: number; max_clients: number };
    tier_3: { rate: number; min_clients: number; max_clients: number | null };
  };
  annual_commission_rate: { rate: number };
  sub_affiliate_rate: { rate: number; min_tier: AffiliateTier };
  commission_duration_months: { months: number };
  verification_period_days: { days: number };
  bonus_milestones: {
    milestone_20: { clients: number; bonus_usd: number };
    milestone_50: { clients: number; bonus_usd: number };
    milestone_100: { clients: number; bonus_usd: number };
    milestone_50_recurring: { clients_interval: number; bonus_usd: number; starts_after: number };
  };
  payout_settings: {
    min_payout_usd: number;
    payout_day: number;
    payment_methods: string[];
  };
}


// ============================================
// TIER INFORMATION HELPER
// ============================================

export interface TierInfo {
  name: string;
  minClients: number;
  maxClients: number | null;
  commissionRate: number;
  annualRate: number;
  description: string;
  canRecruitSubAffiliates?: boolean;
}

export const TIER_INFO: Record<AffiliateTier, TierInfo> = {
  tier_1: {
    name: 'Tier 1',
    minClients: 0,
    maxClients: 20,
    commissionRate: 0.10,
    annualRate: 0.15,
    description: '0-20 paying clients',
  },
  tier_2: {
    name: 'Tier 2',
    minClients: 20,
    maxClients: 75,
    commissionRate: 0.15,
    annualRate: 0.15,
    description: '20-75 paying clients',
    canRecruitSubAffiliates: true,
  },
  tier_3: {
    name: 'Tier 3',
    minClients: 75,
    maxClients: null,
    commissionRate: 0.20,
    annualRate: 0.15,
    description: '75+ paying clients',
    canRecruitSubAffiliates: true,
  },
} as const;

// 🔥 v2.3.0 NEW: Discount tier information
export interface DiscountTierInfo {
  name: string;
  discountRate: number;
  description: string;
  badgeColor: string;
  bgColor: string;
}

export const DISCOUNT_TIER_INFO: Record<DiscountTier, DiscountTierInfo> = {
  standard: {
    name: 'Standard',
    discountRate: 0.10,  // 10%
    description: '10% discount for customers',
    badgeColor: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
  },
  vip: {
    name: 'VIP',
    discountRate: 0.15,  // 15%
    description: '15% discount for customers',
    badgeColor: 'text-[#D4AF37]',
    bgColor: 'bg-[#D4AF37]/10',
  },
} as const;

export const BONUS_MILESTONES = {
  milestone_20: { clients: 20, bonus: 100 },
  milestone_50: { clients: 50, bonus: 300 },
  milestone_100: { clients: 100, bonus: 1000 },
  milestone_50_recurring: { clientsAfter100: 50, bonus: 100 },
} as const;

export const SUB_AFFILIATE_RATE = 0.05;
export const COMMISSION_DURATION_MONTHS = 12;
export const VERIFICATION_PERIOD_DAYS = 7;
export const MIN_PAYOUT_USD = 100;
export const PAYOUT_DAY = 15;


// ============================================
// UTILITY TYPES
// ============================================

export type AffiliateApplicationInsert = Omit<AffiliateApplication, 
  'id' | 'created_at' | 'updated_at' | 'reviewed_by' | 'reviewed_at' | 'rejection_reason' | 'admin_notes'
>;

export type AffiliateInsert = Omit<Affiliate,
  'id' | 'created_at' | 'updated_at' | 'referral_link' | 'total_clicks' | 'total_signups' | 
  'total_qualified_referrals' | 'total_active_customers' | 'total_earnings_usd' | 'total_pending_usd' |
  'total_paid_usd' | 'total_bonuses_usd' | 'total_sub_affiliate_earnings_usd' | 'sub_affiliate_count'
>;

export type AffiliateUpdate = Partial<Pick<Affiliate,
  'display_name' | 'email' | 'phone' | 'country' | 'paypal_email' | 'payment_method' |
  'notify_on_signup' | 'notify_on_qualification' | 'notify_on_commission' | 'notify_on_payout' |
  'discount_tier'  // 🔥 v2.3.0 NEW: Allow updating discount_tier
>>;

export interface SupabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface AffiliateDiscountInfo {
  code: string;
  discountPercent: number;
  originalPrice: number;
  discountedPrice: number;
  savings: number;
  affiliateName?: string;
  affiliateId?: string;
  clickId?: string;
  discountTier?: DiscountTier;  // 🔥 v2.3.0 NEW
}

export interface StoredAffiliateData {
  code: string;
  clickId?: string;
  affiliateId?: string;
  affiliateName?: string;
  timestamp: number;
}

export interface ReferralStatusDisplay {
  label: string;
  labelHe: string;
  color: string;
  bgClass: string;
  textClass: string;
  icon: string;
}

export const REFERRAL_STATUS_DISPLAY: Record<ReferralStatus, ReferralStatusDisplay> = {
  pending: {
    label: 'Awaiting Payment',
    labelHe: 'ממתין לתשלום',
    color: 'gray',
    bgClass: 'bg-gray-500/10',
    textClass: 'text-gray-400',
    icon: 'Clock',
  },
  verification_pending: {
    label: 'In Verification',
    labelHe: 'בתקופת אימות',
    color: 'yellow',
    bgClass: 'bg-yellow-500/10',
    textClass: 'text-yellow-400',
    icon: 'Timer',
  },
  verification_failed: {
    label: 'Verification Failed',
    labelHe: 'נכשל באימות',
    color: 'red',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-400',
    icon: 'XCircle',
  },
  qualified: {
    label: 'Qualified',
    labelHe: 'זכאי לעמלה',
    color: 'green',
    bgClass: 'bg-green-500/10',
    textClass: 'text-green-400',
    icon: 'CheckCircle',
  },
  churned: {
    label: 'Churned',
    labelHe: 'בוטל',
    color: 'red',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-400',
    icon: 'XCircle',
  },
  refunded: {
    label: 'Refunded',
    labelHe: 'הוחזר',
    color: 'orange',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-400',
    icon: 'RefreshCw',
  },
};