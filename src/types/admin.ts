// src/types/admin.ts
// ============================================
// COMPLETE & FIXED VERSION v9.0.0
// 🔥 v9.0.0 CHANGES:
// - Added Whop identifiers to UserWithStats
// - whop_membership_id, whop_user_id, whop_product_id
// - Required for filtering Whop-verified subscribers
// ============================================

export type UserRole = 'user' | 'admin' | 'super_admin';

// 🔥 v8.7.0: Extended AccountType to match Whop config
// Includes: free, basic, premium, trial, newsletter, top_secret, platform_*
export type AccountType = 
  | 'free' 
  | 'basic' 
  | 'premium' 
  | 'trial'
  | 'newsletter'
  | 'top_secret'
  | 'platform_free'
  | 'platform_core'
  | 'platform_pro'
  | 'platform_enterprise';

export type SubscriptionInterval = 'monthly' | 'yearly';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled' | 'past_due';

// ============================================
// User Management Types
// ============================================

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  account_type: AccountType;
  subscription_interval: SubscriptionInterval | null;
  trade_count: number;
  max_trades: number;
  subscription_status: SubscriptionStatus;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  subscription_cancel_at_period_end: boolean;
  trial_ends_at: string | null;
  is_in_trial: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  last_login_at: string | null;
  login_count: number;
  created_at: string;
  updated_at: string;
  
  // ✅ Affiliate fields
  affiliate_code?: string | null;
  referred_by?: string | null;
  free_months_available?: number;
  subscription_paused_until?: string | null;
}

export interface UserWithStats extends AdminUser {
  // Stats fields
  total_pnl: number;
  win_rate: number;
  total_trades: number;
  active_trades: number;
  strategies_count: number;
  last_trade_date: string | null;
  
  // 🔥 v9.0.0: Whop identifiers (NEW)
  // Required for filtering Whop-verified subscribers
  whop_membership_id?: string | null;
  whop_user_id?: string | null;
  whop_product_id?: string | null;
}

// ============================================
// 🆕 v8.5.0: Archive System Types
// ============================================

export interface ArchivedUser extends UserWithStats {
  archived_at: string;
  archived_by: string | null;
  days_in_archive: number;
}

// ============================================
// Admin Analytics Types
// ============================================

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  
  freeUsers: number;
  basicUsers: number;
  premiumUsers: number;
  proUsers?: number;
  trialUsers: number;
  
  // 🔥 v8.7.0: Added newsletter/top secret stats
  newsletterUsers?: number;
  topSecretUsers?: number;
  
  basicMonthlyUsers: number;
  basicYearlyUsers: number;
  premiumMonthlyUsers: number;
  premiumYearlyUsers: number;
  
  estimatedMonthlyRevenue: number;
  estimatedYearlyRevenue: number;
  
  totalTrades: number;
  tradesThisWeek: number;
  tradesThisMonth: number;
  averageTradesPerUser: number;
  
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  
  freeToPayingConversionRate: number;
  trialToPayingConversionRate: number;
}

export interface UserGrowthData {
  date: string;
  newUsers: number;
  totalUsers: number;
  activeUsers: number;
}

export interface SubscriptionBreakdown {
  accountType: AccountType;
  interval: SubscriptionInterval | null;
  count: number;
  percentage: number;
  revenue: number;
}

export interface TradeVolumeData {
  date: string;
  tradeCount: number;
  uniqueUsers: number;
}

// ============================================
// Referral System Types
// ============================================

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  uses_count: number;
  max_uses: number | null;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  reward_granted_to_referrer: boolean;
  reward_granted_to_referred: boolean;
  reward_type: 'free_month' | 'discount' | 'custom';
  reward_value: number;
  completed_at: string | null;
  created_at: string;
}

export interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalRewardsGranted: number;
  conversionRate: number;
  topReferrers: {
    user_id: string;
    email: string;
    referral_count: number;
  }[];
}

// ============================================
// Admin Actions Types
// ============================================

export interface UpdateUserSubscriptionPayload {
  userId: string;
  account_type: AccountType;
  subscription_interval: SubscriptionInterval;
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  reason: string;
}

export interface BanUserPayload {
  userId: string;
  reason: string;
  bannedBy: string;
}

export interface UnbanUserPayload {
  userId: string;
}

export interface ManualReferralRewardPayload {
  userId: string;
  rewardMonths: number;
  reason: string;
}

// ============================================
// Admin Audit Log Types
// ============================================

export type AdminActionType = 
  | 'USER_UPDATE'
  | 'SUBSCRIPTION_CHANGE'
  | 'BAN_USER'
  | 'UNBAN_USER'
  | 'MANUAL_REWARD'
  | 'DELETE_TRADE'
  | 'DELETE_USER'
  | 'SOFT_DELETE_USER'
  | 'RESTORE_USER_FROM_ARCHIVE'
  | 'PERMANENT_DELETE_FROM_ARCHIVE';

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_email: string;
  action_type: AdminActionType;
  target_user_id: string | null;
  target_user_email: string | null;
  old_data?: Record<string, any> | null;
  new_data?: Record<string, any> | null;
  reason?: string | null;
  ip_address: string | null;
  created_at: string;
}

// ============================================
// Filter & Pagination Types
// ============================================

export interface UserFilters {
  search?: string;
  role?: UserRole;
  account_type?: AccountType;
  subscription_interval?: SubscriptionInterval;
  subscription_status?: SubscriptionStatus;
  is_banned?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: 'created_at' | 'last_login_at' | 'trade_count' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// 🆕 SUBSCRIBERS MANAGEMENT TYPES
// ============================================

export interface SubscriberStats {
  totalSubscribers: number;
  activeSubscribers: number;
  newSubscribersThisMonth: number;
  
  // Plan breakdown
  basicSubscribers: number;
  premiumSubscribers: number;
  
  // 🔥 v8.7.0: Added newsletter/top secret breakdown
  newsletterSubscribers?: number;
  topSecretSubscribers?: number;
  
  // Billing cycle breakdown
  basicMonthly: number;
  basicYearly: number;
  premiumMonthly: number;
  premiumYearly: number;
  
  // Revenue metrics
  basicMRR: number;
  premiumMRR: number;
  totalMRR: number;
  totalARR: number;
  
  // Health metrics
  churnRate: number;
}

export interface Subscriber {
  user_id: string;
  email: string;
  full_name: string | null;
  subscription_plan: 'basic' | 'premium' | 'newsletter' | 'top_secret';
  subscription_status: 'active' | 'cancelled' | 'past_due' | 'trial';
  billing_cycle: 'monthly' | 'yearly';
  subscription_start_date: string;
  subscription_end_date: string | null;
  monthly_revenue: number;
  total_paid: number;
  payment_method: string | null;
}