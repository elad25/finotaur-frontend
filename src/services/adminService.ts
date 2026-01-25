// src/services/adminService.ts
// ============================================
// OPTIMIZED FOR 5000+ CONCURRENT USERS
// ============================================
// Version: v9.0.0-WHOP-VERIFIED-ONLY
// 
// 🔥 v9.0.0 CHANGES:
// - getAllUsers now returns ONLY Whop-verified subscribers
// - Added filter: whop_membership_id IS NOT NULL
// - Only shows users who actually paid via Whop
// - Free/legacy users excluded from main list
// - Added "Free (Legacy)" filter to see users without Whop
// ============================================

import { supabase, cachedQuery, supabaseCache } from '@/lib/supabase';
import {
  AdminUser,
  UserWithStats,
  AdminStats,
  UserFilters,
  PaginationParams,
  PaginatedResponse,
  UpdateUserSubscriptionPayload,
  BanUserPayload,
  UnbanUserPayload,
  AdminAuditLog,
  UserGrowthData,
  SubscriptionBreakdown,
  TradeVolumeData,
  AccountType,
  SubscriptionInterval,
  SubscriptionStatus,
  SubscriberStats,
  Subscriber,
} from '@/types/admin';

// ============================================
// TYPES - Archive System
// ============================================

export interface ArchivedUser extends UserWithStats {
  archived_at: string;
  archived_by: string | null;
  days_in_archive: number;
}

// ============================================
// TYPES - Impersonation System
// ============================================

export interface ImpersonationSession {
  access_token: string;
  refresh_token: string;
  user_data: {
    id: string;
    email: string;
    display_name: string;
    role: string;
    account_type: string;
    impersonated: boolean;
    impersonated_by: string;
  };
}

export interface ActiveImpersonationSession {
  id: string;
  admin_id: string;
  admin_email: string;
  target_user_id: string;
  target_user_email: string;
  target_user_name: string;
  session_token: string;
  created_at: string;
  expires_at: string;
  last_activity: string;
  ip_address: string | null;
}

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const PRICING = {
  basic: {
    monthly: 19.99,
    yearly: 12.42,
  },
  premium: {
    monthly: 39.99,
    yearly: 24.92,
  },
  newsletter: {
    monthly: 49,
    yearly: 33.08,
  },
  top_secret: {
    monthly: 70,
    yearly: 41.67,
  },
} as const;

// Cache TTLs (Time To Live)
const CACHE_TTL = {
  STATS: 5 * 60 * 1000,      // 5 minutes
  USERS_LIST: 2 * 60 * 1000,  // 2 minutes
  USER_DETAIL: 1 * 60 * 1000, // 1 minute
  AUDIT_LOGS: 5 * 60 * 1000,  // 5 minutes
  CHARTS: 10 * 60 * 1000,     // 10 minutes
  ARCHIVE: 5 * 60 * 1000,     // 5 minutes
  SUBSCRIBERS: 5 * 60 * 1000, // 5 minutes
  IMPERSONATION: 1 * 60 * 1000, // 1 minute (short cache for active sessions)
} as const;

// ============================================
// 🔥 CACHE KEY FACTORY - Type-safe & centralized
// ============================================

export const adminQueryKeys = {
  all: ['admin'] as const,
  stats: () => [...adminQueryKeys.all, 'stats'] as const,
  users: (filters?: UserFilters, pagination?: PaginationParams) => 
    [...adminQueryKeys.all, 'users', filters, pagination] as const,
  userDetail: (userId: string) => 
    [...adminQueryKeys.all, 'user', userId] as const,
  auditLogs: (limit: number, offset: number) => 
    [...adminQueryKeys.all, 'audit-logs', limit, offset] as const,
  subscriptionBreakdown: () => 
    [...adminQueryKeys.all, 'subscription-breakdown'] as const,
  userGrowth: (days: number) => 
    [...adminQueryKeys.all, 'user-growth', days] as const,
  tradeVolume: (days: number) => 
    [...adminQueryKeys.all, 'trade-volume', days] as const,
  archivedUsers: () => 
    [...adminQueryKeys.all, 'archived-users'] as const,
  subscriberStats: () =>
    [...adminQueryKeys.all, 'subscriber-stats'] as const,
  subscribersList: () =>
    [...adminQueryKeys.all, 'subscribers-list'] as const,
  impersonationSessions: () =>
    [...adminQueryKeys.all, 'impersonation-sessions'] as const,
} as const;

// ============================================
// 🔥 CACHE INVALIDATION HELPERS
// ============================================

/**
 * Invalidate all user-related caches when user data changes
 */
export function invalidateUserCaches(userId?: string) {
  if (userId) {
    supabaseCache.invalidate(`admin-user-${userId}`);
  }
  supabaseCache.invalidate('admin-users');
  supabaseCache.invalidate('admin-stats');
  supabaseCache.invalidate('archived-users');
  supabaseCache.invalidate('subscriber-stats');
  supabaseCache.invalidate('subscribers-list');
}

/**
 * Invalidate stats and analytics caches
 */
export function invalidateStatsCaches() {
  supabaseCache.invalidate('admin-stats');
  supabaseCache.invalidate('subscription-breakdown');
  supabaseCache.invalidate('user-growth');
  supabaseCache.invalidate('trade-volume');
  supabaseCache.invalidate('subscriber-stats');
}

/**
 * Invalidate impersonation session caches
 */
export function invalidateImpersonationCaches() {
  supabaseCache.invalidate('active-impersonation-sessions');
}

// ============================================
// 🔥 HELPER: Map DB row to UserWithStats
// ============================================

function mapDbRowToUserWithStats(user: any): UserWithStats {
  // Safely cast subscription_interval
  const rawInterval = user.subscription_interval;
  const subscriptionInterval: SubscriptionInterval | null = 
    rawInterval === 'monthly' || rawInterval === 'yearly' ? rawInterval : null;

  // Safely cast subscription_status
  const rawStatus = user.subscription_status;
  const subscriptionStatus: SubscriptionStatus = 
    ['trial', 'active', 'expired', 'cancelled', 'past_due'].includes(rawStatus) 
      ? rawStatus 
      : 'active';

  // Safely cast account_type
  const rawAccountType = user.account_type;
  const accountType: AccountType = 
    ['free', 'basic', 'premium', 'trial', 'newsletter', 'top_secret', 
     'platform_free', 'platform_core', 'platform_pro', 'platform_enterprise'].includes(rawAccountType)
      ? rawAccountType
      : 'free';

  return {
    // Core fields from AdminUser
    id: user.id,
    email: user.email || '',
    display_name: user.display_name || null,
    avatar_url: user.avatar_url || null,
    role: user.role || 'user',
    account_type: accountType,
    subscription_interval: subscriptionInterval,
    trade_count: Number(user.trade_count) || 0,
    max_trades: Number(user.max_trades) || 0,
    subscription_status: subscriptionStatus,
    subscription_started_at: user.subscription_started_at || null,
    subscription_expires_at: user.subscription_expires_at || null,
    subscription_cancel_at_period_end: Boolean(user.subscription_cancel_at_period_end),
    trial_ends_at: user.trial_ends_at || null,
    is_in_trial: Boolean(user.is_in_trial),
    is_banned: Boolean(user.is_banned),
    ban_reason: user.ban_reason || null,
    banned_at: user.banned_at || null,
    last_login_at: user.last_login_at || null,
    login_count: Number(user.login_count) || 0,
    created_at: user.created_at,
    updated_at: user.updated_at,
    
    // Optional affiliate fields
    affiliate_code: user.affiliate_code || null,
    referred_by: user.referred_by || null,
    free_months_available: user.free_months_available || 0,
    subscription_paused_until: user.subscription_paused_until || null,
    
    // Stats fields from UserWithStats
    total_pnl: Number(user.total_pnl) || 0,
    win_rate: Number(user.win_rate) || 0,
    total_trades: Number(user.trade_count) || Number(user.total_trades) || 0,
    active_trades: Number(user.active_trades) || 0,
    strategies_count: Number(user.strategies_count) || 0,
    last_trade_date: user.last_trade_date || null,
    
    // 🔥 v9.0.0: Whop identifiers
    whop_membership_id: user.whop_membership_id || null,
    whop_user_id: user.whop_user_id || null,
    whop_product_id: user.whop_product_id || null,
  };
}

// ============================================
// USER MANAGEMENT - OPTIMIZED
// ============================================

/**
 * ⚡ v9.0.0: Returns ONLY Whop-verified Journal subscribers
 * 
 * 🔥 CRITICAL CHANGES:
 * - Default: Only users with whop_membership_id (paid via Whop)
 * - Filter 'free': Shows legacy users WITHOUT Whop membership
 * - Filter 'trial': Users in trial period (still need whop_membership_id)
 * - Filter 'basic'/'premium': Specific plan type (with whop_membership_id)
 */
export async function getAllUsers(
  filters?: UserFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<UserWithStats>> {
  const cacheKey = `admin-users-${JSON.stringify({ filters, pagination })}`;
  
  return cachedQuery(
    cacheKey,
    async () => {
      console.time('⚡ getAllUsers (Whop-verified only)');
      
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 50;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // ============================================
      // 🔥 v9.0.0: WHOP-VERIFIED SUBSCRIBERS ONLY
      // ============================================
      
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);

      // ============================================
      // FILTER LOGIC
      // ============================================
      
      if (filters?.account_type === 'free') {
        // 🔥 SPECIAL CASE: "Free (Legacy)" - users WITHOUT Whop membership
        // These are users who registered but never paid via Whop
        query = query
          .is('whop_membership_id', null)
          .or('account_type.eq.free,account_type.is.null');
          
      } else if (filters?.account_type === 'trial') {
        // 🔥 TRIAL: Users in trial period WITH Whop membership
        query = query
          .not('whop_membership_id', 'is', null)
          .eq('account_type', 'basic')
          .eq('is_in_trial', true);
          
      } else if (filters?.account_type === 'basic') {
        // 🔥 BASIC: Basic plan users WITH Whop membership
        query = query
          .not('whop_membership_id', 'is', null)
          .eq('account_type', 'basic');
          
      } else if (filters?.account_type === 'premium') {
        // 🔥 PREMIUM: Premium plan users WITH Whop membership
        query = query
          .not('whop_membership_id', 'is', null)
          .eq('account_type', 'premium');
          
      } else {
        // 🔥 DEFAULT (All Subscribers): Only Whop-verified users
        // Shows all basic + premium users who paid via Whop
        query = query
          .not('whop_membership_id', 'is', null)
          .in('account_type', ['basic', 'premium']);
      }

      // ============================================
      // ADDITIONAL FILTERS
      // ============================================

      // Search filter (email or display_name)
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        query = query.or(`email.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`);
      }

      // Sorting
      const sortBy = pagination?.sortBy || 'created_at';
      const sortOrder = pagination?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      query = query.range(from, to);

      // ============================================
      // EXECUTE QUERY
      // ============================================
      
      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching users:', error);
        throw error;
      }

      console.timeEnd('⚡ getAllUsers (Whop-verified only)');
      console.log(`📊 Found ${count} Whop-verified subscribers`);

      // 🔥 v9.0.0: Map to UserWithStats with proper type safety
      const usersWithStats: UserWithStats[] = (data || []).map(mapDbRowToUserWithStats);

      return {
        data: usersWithStats,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    CACHE_TTL.USERS_LIST
  );
}

/**
 * ⚡ Get single user by ID (includes all users, not just subscribers)
 */
export async function getUserById(userId: string): Promise<UserWithStats | null> {
  const cacheKey = `admin-user-${userId}`;
  
  return cachedQuery(
    cacheKey,
    async () => {
      const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return mapDbRowToUserWithStats(user);
    },
    CACHE_TTL.USER_DETAIL
  );
}

// ============================================
// USER ACTIONS - WITH CACHE INVALIDATION
// ============================================

export async function updateUserSubscription(
  payload: UpdateUserSubscriptionPayload,
  adminId: string
): Promise<void> {
  const { 
    userId, 
    account_type, 
    subscription_interval,
    subscription_status, 
    subscription_expires_at, 
  } = payload;

  // Use RPC function to bypass RLS
  const { data, error: updateError } = await supabase.rpc('admin_update_subscription', {
    p_user_id: userId,
    p_account_type: account_type,
    p_subscription_interval: account_type !== 'free' ? subscription_interval : null,
    p_subscription_status: subscription_status,
    p_subscription_expires_at: subscription_expires_at,
  });

  if (updateError) throw updateError;

  // 🔥 Invalidate all related caches
  invalidateUserCaches(userId);
  invalidateStatsCaches();

  console.log('✅ User subscription updated:', userId);
}

/**
 * 🎁 Grant free premium access to a user without payment
 */
export async function grantFreeAccess(
  userId: string,
  months: number,
  reason: string,
  adminId: string
): Promise<void> {
  console.time('⚡ grantFreeAccess');
  
  try {
    const { data, error } = await supabase.rpc('grant_free_access', {
      p_user_id: userId,
      p_months: months,
      p_reason: reason || `Free access granted for ${months} month(s)`,
      p_admin_id: adminId
    });

    if (error) {
      console.error('❌ Error granting free access:', error);
      throw error;
    }

    console.log('✅ Free access granted successfully');

    // 🔥 Invalidate all related caches
    invalidateUserCaches(userId);
    invalidateStatsCaches();

    console.timeEnd('⚡ grantFreeAccess');
  } catch (error) {
    console.error('❌ grantFreeAccess failed:', error);
    throw error;
  }
}

export async function banUser(payload: BanUserPayload): Promise<void> {
  const { userId, reason, bannedBy } = payload;

  const { error } = await supabase
    .from('profiles')
    .update({
      is_banned: true,
      ban_reason: reason,
      banned_at: new Date().toISOString(),
      banned_by: bannedBy,
    })
    .eq('id', userId);

  if (error) throw error;

  await logAdminAction({
    admin_id: bannedBy,
    action_type: 'BAN_USER',
    target_user_id: userId,
    reason,
  });

  // 🔥 Invalidate caches
  invalidateUserCaches(userId);

  console.log('✅ User banned:', userId);
}

/**
 * 🆕 v8.4.10: UNBAN USER - Restore user access
 */
export async function unbanUser(payload: UnbanUserPayload, adminId: string): Promise<void> {
  const { userId } = payload;

  console.time('⚡ unbanUser');

  try {
    // Use the toggle function
    const { error } = await supabase.rpc('admin_toggle_user_ban', {
      p_user_id: userId,
      p_ban_reason: null,
    });

    if (error) {
      console.error('❌ Error unbanning user:', error);
      throw error;
    }

    console.log('✅ User unbanned successfully:', userId);

    // 🔥 Invalidate caches
    invalidateUserCaches(userId);
    invalidateStatsCaches();

    console.timeEnd('⚡ unbanUser');
  } catch (error) {
    console.error('❌ unbanUser failed:', error);
    throw error;
  }
}

/**
 * 🗑️ v8.5.0: SOFT DELETE USER
 * Marks user as deleted. After 30 days, auto-archived by cron job.
 */
export async function deleteUser(userId: string, adminId: string): Promise<void> {
  console.time('⚡ deleteUser (soft delete)');

  try {
    // ✅ SOFT DELETE: Mark as deleted
    const { error } = await supabase
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: adminId,
        is_banned: true, // Also revoke access immediately
        ban_reason: 'Account deleted by admin',
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ Error soft-deleting user:', error);
      throw error;
    }

    await logAdminAction({
      admin_id: adminId,
      action_type: 'SOFT_DELETE_USER',
      target_user_id: userId,
      reason: 'User soft-deleted (30-day grace period before archival)',
    });

    // 🔥 Invalidate all caches
    invalidateUserCaches(userId);
    invalidateStatsCaches();

    console.log('✅ User soft-deleted:', userId);
    console.log('ℹ️  Will be archived after 30 days');
    console.timeEnd('⚡ deleteUser (soft delete)');
  } catch (error) {
    console.error('❌ deleteUser failed:', error);
    throw error;
  }
}

// ============================================
// 📦 ARCHIVE SYSTEM FUNCTIONS
// ============================================

/**
 * 📦 Get all archived users
 */
export async function getArchivedUsers(): Promise<ArchivedUser[]> {
  return cachedQuery(
    'archived-users',
    async () => {
      const { data, error } = await supabase
        .from('archived_users_view')
        .select('*')
        .order('archived_at', { ascending: false });

      if (error) throw error;

      return (data || []) as ArchivedUser[];
    },
    CACHE_TTL.ARCHIVE
  );
}

/**
 * 🔄 Restore user from archive
 */
export async function restoreUserFromArchive(
  userId: string,
  adminId: string
): Promise<void> {
  console.time('⚡ restoreUserFromArchive');

  try {
    const { data, error } = await supabase.rpc('restore_user_from_archive', {
      p_user_id: userId,
      p_admin_id: adminId,
    });

    if (error) {
      console.error('❌ Error restoring user from archive:', error);
      throw error;
    }

    console.log('✅ User restored from archive:', userId);

    // 🔥 Invalidate all caches
    invalidateUserCaches(userId);
    invalidateStatsCaches();

    console.timeEnd('⚡ restoreUserFromArchive');
  } catch (error) {
    console.error('❌ restoreUserFromArchive failed:', error);
    throw error;
  }
}

/**
 * ⚠️ Permanently delete user from archive (super admin only)
 */
export async function permanentDeleteFromArchive(
  userId: string,
  adminId: string
): Promise<void> {
  console.time('⚡ permanentDeleteFromArchive');

  try {
    const { data, error } = await supabase.rpc('permanent_delete_from_archive', {
      p_user_id: userId,
      p_admin_id: adminId,
    });

    if (error) {
      console.error('❌ Error permanently deleting from archive:', error);
      throw error;
    }

    console.log('⚠️ User permanently deleted from archive:', userId);

    // 🔥 Invalidate all caches
    invalidateUserCaches(userId);
    invalidateStatsCaches();

    console.timeEnd('⚡ permanentDeleteFromArchive');
  } catch (error) {
    console.error('❌ permanentDeleteFromArchive failed:', error);
    throw error;
  }
}

// ============================================
// 🎭 IMPERSONATION SYSTEM FUNCTIONS
// ============================================

/**
 * 🎭 Start impersonation session
 */
export async function startImpersonation(
  userId: string,
  adminEmail: string
): Promise<ImpersonationSession> {
  console.time('⚡ startImpersonation');

  try {
    const { data, error } = await supabase.rpc('start_impersonation_session_v1', {
      p_user_id: userId,
      p_admin_email: adminEmail
    });

    if (error) {
      console.error('❌ Error starting impersonation:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('No session data returned from impersonation RPC');
    }

    const session = data[0];

    if (!session.access_token || !session.refresh_token) {
      throw new Error('Invalid session tokens returned');
    }

    console.log('✅ Impersonation session created');
    invalidateImpersonationCaches();
    console.timeEnd('⚡ startImpersonation');

    return session;
  } catch (error) {
    console.error('❌ startImpersonation failed:', error);
    throw error;
  }
}

/**
 * 🛑 End impersonation session
 */
export async function endImpersonation(sessionToken: string): Promise<void> {
  console.time('⚡ endImpersonation');

  try {
    const { error } = await supabase.rpc('end_impersonation_session', {
      p_session_token: sessionToken
    });

    if (error) {
      console.error('❌ Error ending impersonation:', error);
      throw error;
    }

    console.log('✅ Impersonation session ended');
    invalidateImpersonationCaches();
    console.timeEnd('⚡ endImpersonation');
  } catch (error) {
    console.error('❌ endImpersonation failed:', error);
    throw error;
  }
}

/**
 * 📋 Get active impersonation sessions
 */
export async function getActiveImpersonationSessions(): Promise<ActiveImpersonationSession[]> {
  return cachedQuery(
    'active-impersonation-sessions',
    async () => {
      console.time('⚡ getActiveImpersonationSessions');

      const { data, error } = await supabase
        .rpc('get_active_impersonation_sessions');

      if (error) {
        console.error('❌ Error fetching active sessions:', error);
        throw error;
      }

      console.timeEnd('⚡ getActiveImpersonationSessions');

      return (data || []) as ActiveImpersonationSession[];
    },
    CACHE_TTL.IMPERSONATION
  );
}

/**
 * ✅ Validate impersonation session
 */
export async function validateImpersonationSession(
  sessionToken: string
): Promise<ActiveImpersonationSession | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_active_impersonation_session', {
        p_session_token: sessionToken
      });

    if (error) {
      console.error('❌ Error validating session:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const session = data[0];

    if (new Date(session.expires_at) < new Date()) {
      console.warn('⚠️ Impersonation session expired:', sessionToken);
      return null;
    }

    return session as ActiveImpersonationSession;
  } catch (error) {
    console.error('❌ Error validating session:', error);
    return null;
  }
}

/**
 * 🔄 Update impersonation session activity
 */
export async function updateImpersonationActivity(sessionToken: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_impersonation_activity', {
      p_session_token: sessionToken
    });

    if (error) {
      console.error('❌ Error updating session activity:', error);
    }
  } catch (error) {
    console.error('❌ Exception in updateImpersonationActivity:', error);
  }
}

/**
 * 🧹 Cleanup expired impersonation sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  console.time('⚡ cleanupExpiredSessions');

  try {
    const { data, error } = await supabase.rpc('cleanup_expired_impersonation_sessions');

    if (error) {
      console.error('❌ Error cleaning up expired sessions:', error);
      throw error;
    }

    const cleanedCount = data || 0;

    if (cleanedCount > 0) {
      console.log(`✅ Cleaned up ${cleanedCount} expired impersonation sessions`);
      invalidateImpersonationCaches();
    }

    console.timeEnd('⚡ cleanupExpiredSessions');

    return cleanedCount;
  } catch (error) {
    console.error('❌ cleanupExpiredSessions failed:', error);
    throw error;
  }
}

// ============================================
// ANALYTICS - HEAVILY OPTIMIZED
// ============================================

export async function getAdminStats(): Promise<AdminStats> {
  return cachedQuery(
    'admin-stats',
    async () => {
      console.time('⚡ getAdminStats');
      
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_stats');

      if (rpcError) {
        console.error('❌ Error fetching admin stats:', rpcError);
        throw rpcError;
      }

      const stats = Array.isArray(rpcData) ? rpcData[0] : rpcData;

      if (!stats) {
        throw new Error('No stats returned - check admin permissions');
      }

      console.timeEnd('⚡ getAdminStats');

      return {
        totalUsers: stats.total_users || 0,
        activeUsers: stats.active_users || 0,
        newUsersToday: stats.new_users_today || 0,
        newUsersThisWeek: stats.new_users_this_week || 0,
        newUsersThisMonth: stats.new_users_this_month || 0,
        freeUsers: stats.free_users || 0,
        basicUsers: stats.basic_users || 0,
        premiumUsers: stats.premium_users || 0,
        trialUsers: stats.trial_users || 0,
        newsletterUsers: stats.newsletter_users || 0,
        topSecretUsers: stats.top_secret_users || 0,
        basicMonthlyUsers: stats.basic_monthly_users || 0,
        basicYearlyUsers: stats.basic_yearly_users || 0,
        premiumMonthlyUsers: stats.premium_monthly_users || 0,
        premiumYearlyUsers: stats.premium_yearly_users || 0,
        estimatedMonthlyRevenue: stats.estimated_monthly_revenue || 0,
        estimatedYearlyRevenue: stats.estimated_yearly_revenue || 0,
        totalTrades: stats.total_trades || 0,
        tradesThisWeek: stats.trades_this_week || 0,
        tradesThisMonth: stats.trades_this_month || 0,
        averageTradesPerUser: stats.average_trades_per_user || 0,
        dailyActiveUsers: stats.daily_active_users || 0,
        weeklyActiveUsers: stats.weekly_active_users || 0,
        monthlyActiveUsers: stats.monthly_active_users || 0,
        freeToPayingConversionRate: stats.free_to_paying_conversion_rate || 0,
        trialToPayingConversionRate: stats.trial_to_paying_conversion_rate || 0,
      };
    },
    CACHE_TTL.STATS
  );
}

export async function getSubscriptionBreakdown(): Promise<SubscriptionBreakdown[]> {
  return cachedQuery(
    'subscription-breakdown',
    async () => {
      const { data, error } = await supabase
        .from('subscription_breakdown_view')
        .select('*');

      if (error) throw error;

      return (data || []).map(item => {
        let revenue = 0;
        const accountType = item.account_type as AccountType;
        const interval = item.subscription_interval as SubscriptionInterval | null;

        if (accountType === 'basic' && interval === 'monthly') {
          revenue = PRICING.basic.monthly;
        } else if (accountType === 'basic' && interval === 'yearly') {
          revenue = PRICING.basic.yearly;
        } else if (accountType === 'premium' && interval === 'monthly') {
          revenue = PRICING.premium.monthly;
        } else if (accountType === 'premium' && interval === 'yearly') {
          revenue = PRICING.premium.yearly;
        } else if (accountType === 'newsletter' && interval === 'monthly') {
          revenue = PRICING.newsletter.monthly;
        } else if (accountType === 'newsletter' && interval === 'yearly') {
          revenue = PRICING.newsletter.yearly;
        } else if (accountType === 'top_secret' && interval === 'monthly') {
          revenue = PRICING.top_secret.monthly;
        } else if (accountType === 'top_secret' && interval === 'yearly') {
          revenue = PRICING.top_secret.yearly;
        }

        return {
          accountType,
          interval,
          count: item.user_count || 0,
          percentage: item.percentage || 0,
          revenue,
        };
      });
    },
    CACHE_TTL.CHARTS
  );
}

export async function getUserGrowthData(days: number = 30): Promise<UserGrowthData[]> {
  return cachedQuery(
    `user-growth-${days}`,
    async () => {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      
      const { data, error } = await supabase
        .from('user_growth_daily')
        .select('*')
        .gte('date', cutoffDate)
        .order('date', { ascending: true });

      if (error) throw error;

      return (data || []).map(item => ({
        date: item.date,
        newUsers: item.new_users || 0,
        totalUsers: item.total_users || 0,
        activeUsers: item.active_users || 0,
      }));
    },
    CACHE_TTL.CHARTS
  );
}

export async function getTradeVolumeData(days: number = 30): Promise<TradeVolumeData[]> {
  return cachedQuery(
    `trade-volume-${days}`,
    async () => {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      
      const { data, error } = await supabase
        .from('trade_volume_daily')
        .select('*')
        .gte('date', cutoffDate)
        .order('date', { ascending: true });

      if (error) throw error;

      return (data || []).map(item => ({
        date: item.date,
        tradeCount: item.trade_count || 0,
        uniqueUsers: item.unique_users || 0,
      }));
    },
    CACHE_TTL.CHARTS
  );
}

// ============================================
// 🆕 v9.0.0: SUBSCRIBERS MANAGEMENT (WHOP-VERIFIED)
// ============================================

/**
 * Get subscriber statistics - 🔥 NOW COUNTS ONLY WHOP-VERIFIED
 */
export async function getSubscriberStats(): Promise<SubscriberStats> {
  return cachedQuery(
    'subscriber-stats',
    async () => {
      console.time('⚡ getSubscriberStats (Whop-verified only)');

      // 🔥 v9.0.0: Only count subscribers with whop_membership_id
      const { data: subscribers, error } = await supabase
        .from('profiles')
        .select('account_type, subscription_interval, subscription_status, subscription_started_at, updated_at, role, whop_membership_id')
        .not('whop_membership_id', 'is', null)  // 🔥 CRITICAL: Only Whop-verified
        .in('account_type', ['basic', 'premium', 'newsletter', 'top_secret'])
        .neq('role', 'admin')
        .neq('role', 'super_admin');

      if (error) throw error;

      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const activeSubscribers = subscribers?.filter(
        s => s.subscription_status === 'active'
      ) || [];

      const newThisMonth = subscribers?.filter(
        s => new Date(s.subscription_started_at || s.updated_at) >= firstOfMonth
      ) || [];

      const basicSubs = subscribers?.filter(s => s.account_type === 'basic') || [];
      const premiumSubs = subscribers?.filter(s => s.account_type === 'premium') || [];
      const newsletterSubs = subscribers?.filter(s => s.account_type === 'newsletter') || [];
      const topSecretSubs = subscribers?.filter(s => s.account_type === 'top_secret') || [];

      const basicMonthly = basicSubs.filter(s => s.subscription_interval === 'monthly').length;
      const basicYearly = basicSubs.filter(s => s.subscription_interval === 'yearly').length;
      const premiumMonthly = premiumSubs.filter(s => s.subscription_interval === 'monthly').length;
      const premiumYearly = premiumSubs.filter(s => s.subscription_interval === 'yearly').length;

      const BASIC_MONTHLY_PRICE = 19.99;
      const BASIC_YEARLY_PRICE = 149;
      const PREMIUM_MONTHLY_PRICE = 39.99;
      const PREMIUM_YEARLY_PRICE = 299;
      const NEWSLETTER_MONTHLY_PRICE = 49;
      const NEWSLETTER_YEARLY_PRICE = 397;
      const TOP_SECRET_MONTHLY_PRICE = 70;
      const TOP_SECRET_YEARLY_PRICE = 500;

      const basicMRR = 
        (basicMonthly * BASIC_MONTHLY_PRICE) + 
        (basicYearly * (BASIC_YEARLY_PRICE / 12));
      
      const premiumMRR = 
        (premiumMonthly * PREMIUM_MONTHLY_PRICE) + 
        (premiumYearly * (PREMIUM_YEARLY_PRICE / 12));

      const newsletterMRR = 
        (newsletterSubs.filter(s => s.subscription_interval === 'monthly').length * NEWSLETTER_MONTHLY_PRICE) +
        (newsletterSubs.filter(s => s.subscription_interval === 'yearly').length * (NEWSLETTER_YEARLY_PRICE / 12));

      const topSecretMRR = 
        (topSecretSubs.filter(s => s.subscription_interval === 'monthly').length * TOP_SECRET_MONTHLY_PRICE) +
        (topSecretSubs.filter(s => s.subscription_interval === 'yearly').length * (TOP_SECRET_YEARLY_PRICE / 12));

      const totalMRR = basicMRR + premiumMRR + newsletterMRR + topSecretMRR;
      const totalARR = totalMRR * 12;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // 🔥 v9.0.0: Only count Whop-verified cancelled users
      const { data: cancelledSubs } = await supabase
        .from('profiles')
        .select('id')
        .not('whop_membership_id', 'is', null)
        .eq('subscription_status', 'cancelled')
        .gte('updated_at', thirtyDaysAgo.toISOString());

      const churnRate = cancelledSubs && subscribers 
        ? (cancelledSubs.length / subscribers.length) * 100 
        : 0;

      console.timeEnd('⚡ getSubscriberStats (Whop-verified only)');

      return {
        totalSubscribers: subscribers?.length || 0,
        activeSubscribers: activeSubscribers.length,
        newSubscribersThisMonth: newThisMonth.length,
        
        basicSubscribers: basicSubs.length,
        premiumSubscribers: premiumSubs.length,
        newsletterSubscribers: newsletterSubs.length,
        topSecretSubscribers: topSecretSubs.length,
        
        basicMonthly,
        basicYearly,
        premiumMonthly,
        premiumYearly,
        
        basicMRR: Math.round(basicMRR),
        premiumMRR: Math.round(premiumMRR),
        totalMRR: Math.round(totalMRR),
        totalARR: Math.round(totalARR),
        
        churnRate: Math.round(churnRate * 10) / 10,
      };
    },
    CACHE_TTL.SUBSCRIBERS
  );
}

/**
 * Get list of all subscribers - 🔥 NOW RETURNS ONLY WHOP-VERIFIED
 */
export async function getSubscribersList(): Promise<Subscriber[]> {
  return cachedQuery(
    'subscribers-list',
    async () => {
      console.time('⚡ getSubscribersList (Whop-verified only)');

      // 🔥 v9.0.0: Only return subscribers with whop_membership_id
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, account_type, subscription_status, subscription_interval, subscription_started_at, subscription_expires_at, whop_membership_id')
        .not('whop_membership_id', 'is', null)  // 🔥 CRITICAL: Only Whop-verified
        .in('account_type', ['basic', 'premium', 'newsletter', 'top_secret'])
        .order('subscription_started_at', { ascending: false });

      if (error) throw error;

      const BASIC_MONTHLY = 19.99;
      const BASIC_YEARLY = 149;
      const PREMIUM_MONTHLY = 39.99;
      const PREMIUM_YEARLY = 299;
      const NEWSLETTER_MONTHLY = 49;
      const NEWSLETTER_YEARLY = 397;
      const TOP_SECRET_MONTHLY = 70;
      const TOP_SECRET_YEARLY = 500;

      const subscribers = (data || []).map(profile => {
        let monthlyRevenue = 0;
        
        if (profile.account_type === 'basic') {
          monthlyRevenue = profile.subscription_interval === 'monthly' 
            ? BASIC_MONTHLY 
            : BASIC_YEARLY / 12;
        } else if (profile.account_type === 'premium') {
          monthlyRevenue = profile.subscription_interval === 'monthly' 
            ? PREMIUM_MONTHLY 
            : PREMIUM_YEARLY / 12;
        } else if (profile.account_type === 'newsletter') {
          monthlyRevenue = profile.subscription_interval === 'monthly' 
            ? NEWSLETTER_MONTHLY 
            : NEWSLETTER_YEARLY / 12;
        } else if (profile.account_type === 'top_secret') {
          monthlyRevenue = profile.subscription_interval === 'monthly' 
            ? TOP_SECRET_MONTHLY 
            : TOP_SECRET_YEARLY / 12;
        }

        return {
          user_id: profile.id,
          email: profile.email || '',
          full_name: profile.display_name,
          subscription_plan: profile.account_type as 'basic' | 'premium' | 'newsletter' | 'top_secret',
          subscription_status: (profile.subscription_status || 'active') as 'active' | 'cancelled' | 'past_due' | 'trial',
          billing_cycle: (profile.subscription_interval || 'monthly') as 'monthly' | 'yearly',
          subscription_start_date: profile.subscription_started_at || new Date().toISOString(),
          subscription_end_date: profile.subscription_expires_at,
          monthly_revenue: Math.round(monthlyRevenue),
          total_paid: 0,
          payment_method: null,
        };
      });

      console.timeEnd('⚡ getSubscribersList (Whop-verified only)');
      console.log(`📊 Found ${subscribers.length} Whop-verified subscribers`);
      
      return subscribers;
    },
    CACHE_TTL.SUBSCRIBERS
  );
}

/**
 * Export subscribers to CSV - 🔥 ONLY WHOP-VERIFIED
 */
export async function exportSubscribers(): Promise<string> {
  const subscribers = await getSubscribersList();
  
  const headers = [
    'User ID',
    'Email',
    'Name',
    'Plan',
    'Billing Cycle',
    'Status',
    'Start Date',
    'End Date',
    'Monthly Revenue',
  ];

  const rows = subscribers.map(sub => [
    sub.user_id,
    sub.email,
    sub.full_name || '',
    sub.subscription_plan,
    sub.billing_cycle,
    sub.subscription_status,
    sub.subscription_start_date,
    sub.subscription_end_date || '',
    sub.monthly_revenue,
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csv;
}

// ============================================
// AUDIT LOGGING
// ============================================

async function logAdminAction(
  log: Omit<AdminAuditLog, 'id' | 'created_at' | 'admin_email' | 'target_user_email' | 'ip_address'>
) {
  try {
    const { error } = await supabase.rpc('log_admin_action', {
      p_action: log.action_type,
      p_target_user_id: log.target_user_id || null,
      p_target_type: 'user',
      p_target_id: log.target_user_id || null,
      p_details: {
        old_data: log.old_data || null,
        new_data: log.new_data || null,
        reason: log.reason || null,
      }
    });

    if (error) {
      console.error('❌ Error logging admin action:', error);
      return;
    }

    console.log('✅ Admin action logged');
  } catch (error) {
    console.error('❌ Exception in logAdminAction:', error);
  }
}

export async function getAdminAuditLogs(
  limit: number = 100,
  offset: number = 0
): Promise<PaginatedResponse<AdminAuditLog>> {
  return cachedQuery(
    `audit-logs-${limit}-${offset}`,
    async () => {
      const { data, error, count } = await supabase
        .from('admin_audit_logs_enriched')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const logs: AdminAuditLog[] = (data || []).map(log => ({
        id: log.id,
        admin_id: log.admin_id,
        admin_email: log.admin_email || 'Unknown',
        action_type: log.action,
        target_user_id: log.target_user_id,
        target_user_email: log.target_user_email,
        old_data: log.details?.old_data,
        new_data: log.details?.new_data,
        reason: log.details?.reason,
        ip_address: log.ip_address,
        created_at: log.created_at,
      }));

      return {
        data: logs,
        total: count || 0,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        totalPages: Math.ceil((count || 0) / limit),
      };
    },
    CACHE_TTL.AUDIT_LOGS
  );
}

// ============================================
// 🔥 BATCH OPERATIONS
// ============================================

export async function batchUpdateUsers(
  updates: Array<{ userId: string; data: Partial<AdminUser> }>,
  adminId: string
): Promise<void> {
  console.time('⚡ batchUpdateUsers');
  
  const promises = updates.map(async ({ userId, data }) => {
    return supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', userId);
  });

  const results = await Promise.allSettled(promises);
  
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`❌ Failed to update user ${updates[index].userId}:`, result.reason);
    }
  });

  updates.forEach(({ userId }) => invalidateUserCaches(userId));
  invalidateStatsCaches();

  console.timeEnd('⚡ batchUpdateUsers');
  console.log(`✅ Batch updated ${updates.length} users`);
}

export async function prefetchUserDetails(userIds: string[]): Promise<void> {
  const promises = userIds.slice(0, 10).map(userId => getUserById(userId));
  await Promise.allSettled(promises);
  console.log(`✅ Prefetched ${userIds.length} user details`);
}