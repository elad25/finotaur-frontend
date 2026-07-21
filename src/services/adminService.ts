// src/services/adminService.ts
// ============================================
// OPTIMIZED FOR 5000+ CONCURRENT USERS
// ============================================
// Version: v9.0.0-CATEGORY-FILTERED
//
// 🔥 v9.0.0 CHANGES:
// - getAllUsers filters subscribers by product category
// - Supported categories: platform, journal, newsletter
// - Each category maps to a distinct subscriber segment
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
  ProductCategory,
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
    monthly: 24.99,
    yearly: 19.08,
  },
  premium: {
    monthly: 44.99,
    yearly: 34.08,
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
  supabaseCache.invalidate('new-joins-24h');
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
    
    // Whop identifiers (kept for backward compat; unused for filtering)
    whop_membership_id: user.whop_membership_id || null,
    whop_user_id: user.whop_user_id || null,
    whop_product_id: user.whop_product_id || null,

    // Real product-status columns
    platform_subscription_status: user.platform_subscription_status || null,
    newsletter_status: user.newsletter_status || null,
    top_secret_status: user.top_secret_status || null,
    platform_plan: user.platform_plan || null,

    // Derived product membership badges
    products: deriveProducts(user),
  };
}

/** Derive which product categories a user belongs to from the real profile columns. */
function deriveProducts(user: {
  platform_subscription_status?: string | null;
  account_type?: string | null;
  newsletter_status?: string | null;
  top_secret_status?: string | null;
}): ProductCategory[] {
  const cats: ProductCategory[] = [];
  if (user.platform_subscription_status === 'active') cats.push('platform');
  if (user.account_type === 'basic' || user.account_type === 'premium') cats.push('journal');
  if (user.newsletter_status === 'active') cats.push('warzone');
  if (user.top_secret_status === 'active') cats.push('top_secret');
  return cats;
}

// ============================================
// USER MANAGEMENT - OPTIMIZED
// ============================================

// Row shape returned by the admin_list_users SECURITY DEFINER RPC.
// Column names match the profiles table exactly, so mapDbRowToUserWithStats
// works without modification.
interface AdminListUsersRow {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  account_type: string | null;
  subscription_status: string | null;
  whop_membership_id: string | null;
  is_in_trial: boolean | null;
  trial_ends_at: string | null;
  subscription_cancel_at_period_end: boolean | null;
  subscription_started_at: string | null;
  total_pnl: number | null;
  initial_portfolio: number | null;
  current_portfolio: number | null;
  risk_mode: string | null;
  risk_percentage: number | null;
  newsletter_status: string | null;
  newsletter_whop_membership_id: string | null;
  newsletter_enabled: boolean | null;
  newsletter_paid: boolean | null;
  newsletter_trial_ends_at: string | null;
  newsletter_cancel_at_period_end: boolean | null;
  newsletter_expires_at: string | null;
  top_secret_status: string | null;
  top_secret_whop_membership_id: string | null;
  top_secret_enabled: boolean | null;
  top_secret_is_in_trial: boolean | null;
  top_secret_trial_ends_at: string | null;
  top_secret_cancel_at_period_end: boolean | null;
  top_secret_started_at: string | null;
  top_secret_expires_at: string | null;
  platform_plan: string | null;
  platform_subscription_status: string | null;
  platform_is_in_trial: boolean | null;
  platform_trial_ends_at: string | null;
  platform_cancel_at_period_end: boolean | null;
  last_login_at: string | null;
  trade_count: number | null;
  subscription_interval: string | null;
  subscription_expires_at: string | null;
  role: string | null;
  is_banned: boolean | null;
}

/**
 * Applies the product_filter client-side on a full set of RPC rows.
 * Called after admin_list_users returns all non-deleted users.
 *
 * product_filter:
 *   undefined / omitted → all active subscribers across any product
 *   'platform'          → platform_subscription_status = 'active'
 *   'journal'           → account_type IN ('basic','premium')
 *   'newsletter'        → the Investor set: newsletter_status = 'active' OR top_secret_status = 'active'
 *   'trial'             → active app trial (account_type='trial') OR legacy Whop basic-trial.
 *                        Fresh signups land in Trial directly; at expiry the sweep flips
 *                        account_type 'trial' -> 'free'.
 *   'free'              → genuine free / finished-trial: account_type = 'free' | null
 *
 * account_type (legacy, still honoured when product_filter is absent):
 *   'trial'   → the app trial (account_type='trial') OR legacy Whop basic-trial
 *   'basic'   → account_type='basic'
 *   'premium' → account_type='premium'
 */
function applyProductFilter(
  rows: AdminListUsersRow[],
  filters?: UserFilters
): AdminListUsersRow[] {
  const pf = filters?.product_filter;
  const at = filters?.account_type;

  if (pf === 'platform') {
    return rows.filter(r => r.platform_subscription_status === 'active');
  }
  if (pf === 'journal') {
    return rows.filter(r => r.account_type === 'basic' || r.account_type === 'premium');
  }
  if (pf === 'newsletter') {
    return rows.filter(r => r.newsletter_status === 'active' || r.top_secret_status === 'active');
  }
  if (pf === 'trial' || at === 'trial') {
    // Active app trial (fresh signups land here directly); also the legacy Whop basic-trial.
    return rows.filter(r => r.account_type === 'trial' || (r.account_type === 'basic' && r.is_in_trial === true));
  }
  if (pf === 'free' || at === 'free') {
    // Free = genuine free / finished-trial only (account_type flips trial -> free at expiry).
    return rows.filter(r => r.account_type === 'free' || r.account_type == null);
  }
  if (at === 'basic') {
    return rows.filter(r => r.account_type === 'basic');
  }
  if (at === 'premium') {
    return rows.filter(r => r.account_type === 'premium');
  }

  // Default: any subscriber across any product, plus app-trial users (the current
  // active base — every new signup is a trial), so "All Subscribers" is not empty.
  return rows.filter(r =>
    r.platform_subscription_status === 'active' ||
    r.account_type === 'basic' ||
    r.account_type === 'premium' ||
    r.account_type === 'trial' ||
    r.newsletter_status === 'active' ||
    r.top_secret_status === 'active'
  );
}

/**
 * Fetches all non-deleted users via the SECURITY DEFINER RPC
 * `admin_list_users`, bypassing the profiles RLS policy that would
 * otherwise return only the calling admin's own row.
 *
 * Product-category filtering and pagination are applied client-side
 * on the returned dataset (p_limit=1000 covers all real users).
 */
export async function getAllUsers(
  filters?: UserFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<UserWithStats>> {
  const cacheKey = `admin-users-${JSON.stringify({ filters, pagination })}`;

  return cachedQuery(
    cacheKey,
    async () => {
      console.time('⚡ getAllUsers');

      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 50;

      // Build p_filters: only pass search term — product filtering is done client-side
      const p_filters: Record<string, string> = {};
      if (filters?.search) {
        p_filters.search = filters.search;
      }

      const sortBy = pagination?.sortBy || 'created_at';
      const sortOrder = (pagination?.sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';

      // ============================================
      // EXECUTE via SECURITY DEFINER RPC (bypasses RLS)
      // ============================================

      const { data, error } = await supabase.rpc('admin_list_users', {
        p_filters,
        p_limit: 1000,
        p_offset: 0,
        p_sort_by: sortBy,
        p_sort_order: sortOrder,
      });

      if (error) {
        console.error('❌ Error fetching users via admin_list_users RPC:', error);
        throw error;
      }

      const allRows = (data || []) as AdminListUsersRow[];

      // ============================================
      // CLIENT-SIDE: apply product_filter / account_type filter
      // ============================================
      const filteredRows = applyProductFilter(allRows, filters);

      // ============================================
      // CLIENT-SIDE: paginate the filtered set
      // ============================================
      const total = filteredRows.length;
      const from = (page - 1) * pageSize;
      const pageRows = filteredRows.slice(from, from + pageSize);

      console.timeEnd('⚡ getAllUsers');
      console.log(`📊 Found ${total} subscribers (${allRows.length} total from RPC)`);

      const usersWithStats: UserWithStats[] = pageRows.map(mapDbRowToUserWithStats);

      return {
        data: usersWithStats,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
    CACHE_TTL.USERS_LIST
  );
}

/**
 * Count of users who joined each product in the last 24h.
 * Each product is counted by its own *_started_at; FREE = new signups (created_at).
 * A user can appear in multiple categories.
 */
export interface NewJoins24h {
  platform: number;
  journal: number;
  newsletter: number;
  top_secret: number;
  trial: number;
  free: number;
  since: string;
}

/**
 * ⚡ How many users joined each subscription in the last 24h (admin-only RPC).
 */
export async function getNewJoins24h(): Promise<NewJoins24h> {
  return cachedQuery(
    'new-joins-24h',
    async () => {
      const { data, error } = await supabase.rpc('admin_new_joins_24h');
      if (error) {
        console.error('❌ Error fetching 24h joins via admin_new_joins_24h RPC:', error);
        throw error;
      }
      const d = (data || {}) as Partial<NewJoins24h>;
      return {
        platform: Number(d.platform) || 0,
        journal: Number(d.journal) || 0,
        newsletter: Number(d.newsletter) || 0,
        top_secret: Number(d.top_secret) || 0,
        trial: Number(d.trial) || 0,
        free: Number(d.free) || 0,
        since: d.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      };
    },
    CACHE_TTL.STATS
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
      // Uses the admin_get_user_details SECURITY DEFINER RPC (admin-only) —
      // a direct `profiles` select is RLS-subject and returns 0 rows for
      // any non-self user. Row shape = admin_list_users + trailing deleted_at.
      const { data, error } = await supabase.rpc('admin_get_user_details', {
        p_user_id: userId,
      });

      if (error) {
        console.error('❌ Error fetching user via admin_get_user_details RPC:', error);
        throw error;
      }

      const rows = (data || []) as (AdminListUsersRow & { deleted_at: string | null })[];
      if (rows.length === 0) return null;

      const row = rows[0];
      const user = mapDbRowToUserWithStats(row);
      user.deleted_at = row.deleted_at;
      return user;
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
 * Get subscriber statistics — sourced from admin_list_users RPC to bypass
 * the profiles RLS policy (which would otherwise return only 1 row).
 */
export async function getSubscriberStats(): Promise<SubscriberStats> {
  return cachedQuery(
    'subscriber-stats',
    async () => {
      console.time('⚡ getSubscriberStats');

      // Fetch all non-deleted users via SECURITY DEFINER RPC
      const { data, error } = await supabase.rpc('admin_list_users', {
        p_filters: {},
        p_limit: 1000,
        p_offset: 0,
        p_sort_by: 'created_at',
        p_sort_order: 'DESC',
      });

      if (error) {
        console.error('❌ Error fetching subscriber stats via admin_list_users RPC:', error);
        throw error;
      }

      // Restrict to actual subscribers (non-admin, has at least one active product)
      const allRows = (data || []) as AdminListUsersRow[];
      const subscribers = allRows.filter(r =>
        r.role !== 'admin' &&
        r.role !== 'super_admin' &&
        (
          r.platform_subscription_status === 'active' ||
          r.account_type === 'basic' ||
          r.account_type === 'premium' ||
          r.newsletter_status === 'active' ||
          r.top_secret_status === 'active'
        )
      );

      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Category counts (a user can appear in multiple categories)
      const platformSubs = subscribers.filter(s => s.platform_subscription_status === 'active');
      const basicSubs    = subscribers.filter(s => s.account_type === 'basic');
      const premiumSubs  = subscribers.filter(s => s.account_type === 'premium');
      const warzSubs     = subscribers.filter(s => s.newsletter_status === 'active');
      const tsSubs       = subscribers.filter(s => s.top_secret_status === 'active');

      // "Active" = at least one active product flag
      const activeSubscribers = subscribers.filter(s =>
        s.platform_subscription_status === 'active' ||
        ((s.account_type === 'basic' || s.account_type === 'premium') && s.subscription_status === 'active') ||
        s.newsletter_status === 'active' ||
        s.top_secret_status === 'active'
      );

      const newThisMonth = subscribers.filter(
        s => new Date(s.subscription_started_at || s.created_at) >= firstOfMonth
      );

      const basicMonthly   = basicSubs.filter(s => s.subscription_interval === 'monthly').length;
      const basicYearly    = basicSubs.filter(s => s.subscription_interval === 'yearly').length;
      const premiumMonthly = premiumSubs.filter(s => s.subscription_interval === 'monthly').length;
      const premiumYearly  = premiumSubs.filter(s => s.subscription_interval === 'yearly').length;

      const BASIC_MONTHLY_PRICE      = 24.99;
      const BASIC_YEARLY_PRICE       = 229;
      const PREMIUM_MONTHLY_PRICE    = 44.99;
      const PREMIUM_YEARLY_PRICE     = 409;
      const NEWSLETTER_MONTHLY_PRICE = 49;
      const NEWSLETTER_YEARLY_PRICE  = 397;
      const TOP_SECRET_MONTHLY_PRICE = 70;
      const TOP_SECRET_YEARLY_PRICE  = 500;

      const basicMRR =
        basicMonthly * BASIC_MONTHLY_PRICE +
        basicYearly  * (BASIC_YEARLY_PRICE / 12);

      const premiumMRR =
        premiumMonthly * PREMIUM_MONTHLY_PRICE +
        premiumYearly  * (PREMIUM_YEARLY_PRICE / 12);

      const newsletterMRR =
        warzSubs.filter(s => s.subscription_interval === 'monthly').length * NEWSLETTER_MONTHLY_PRICE +
        warzSubs.filter(s => s.subscription_interval === 'yearly').length  * (NEWSLETTER_YEARLY_PRICE / 12);

      const topSecretMRR =
        tsSubs.filter(s => s.subscription_interval === 'monthly').length * TOP_SECRET_MONTHLY_PRICE +
        tsSubs.filter(s => s.subscription_interval === 'yearly').length  * (TOP_SECRET_YEARLY_PRICE / 12);

      const totalMRR = basicMRR + premiumMRR + newsletterMRR + topSecretMRR;
      const totalARR = totalMRR * 12;

      // Churn estimate: cancelled journal subs in the last 30 days (from allRows, no second query needed)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cancelledCount = allRows.filter(r =>
        (r.account_type === 'basic' || r.account_type === 'premium') &&
        r.subscription_status === 'cancelled' &&
        new Date(r.created_at) >= thirtyDaysAgo // using created_at as proxy — no updated_at in RPC result
      ).length;

      const churnRate = cancelledCount && subscribers.length
        ? (cancelledCount / subscribers.length) * 100
        : 0;

      console.timeEnd('⚡ getSubscriberStats');

      return {
        totalSubscribers: subscribers.length,
        activeSubscribers: activeSubscribers.length,
        newSubscribersThisMonth: newThisMonth.length,

        platformSubscribers: platformSubs.length,
        journalSubscribers: basicSubs.length + premiumSubs.length,
        newsletterSubscribers: warzSubs.length,
        topSecretSubscribers: tsSubs.length,

        basicSubscribers: basicSubs.length,
        premiumSubscribers: premiumSubs.length,

        basicMonthly,
        basicYearly,
        premiumMonthly,
        premiumYearly,

        basicMRR: Math.round(basicMRR),
        premiumMRR: Math.round(premiumMRR),
        newsletterMRR: Math.round(newsletterMRR),
        topSecretMRR: Math.round(topSecretMRR),
        totalMRR: Math.round(totalMRR),
        totalARR: Math.round(totalARR),

        churnRate: Math.round(churnRate * 10) / 10,
      };
    },
    CACHE_TTL.SUBSCRIBERS
  );
}

/**
 * Get list of all subscribers — sourced from admin_list_users RPC to bypass
 * the profiles RLS policy (which would otherwise return only 1 row).
 */
export async function getSubscribersList(): Promise<Subscriber[]> {
  return cachedQuery(
    'subscribers-list',
    async () => {
      console.time('⚡ getSubscribersList');

      // Fetch all users via SECURITY DEFINER RPC, sorted by subscription start
      const { data, error } = await supabase.rpc('admin_list_users', {
        p_filters: {},
        p_limit: 1000,
        p_offset: 0,
        p_sort_by: 'subscription_started_at',
        p_sort_order: 'DESC',
      });

      if (error) {
        console.error('❌ Error fetching subscribers list via admin_list_users RPC:', error);
        throw error;
      }

      const allRows = (data || []) as AdminListUsersRow[];

      // Keep only rows that belong to at least one active product
      const activeRows = allRows.filter(r =>
        r.platform_subscription_status === 'active' ||
        r.account_type === 'basic' ||
        r.account_type === 'premium' ||
        r.newsletter_status === 'active' ||
        r.top_secret_status === 'active'
      );

      const BASIC_MONTHLY      = 24.99;
      const BASIC_YEARLY       = 229;
      const PREMIUM_MONTHLY    = 44.99;
      const PREMIUM_YEARLY     = 409;
      const NEWSLETTER_MONTHLY = 49;
      const NEWSLETTER_YEARLY  = 397;
      const TOP_SECRET_MONTHLY = 70;
      const TOP_SECRET_YEARLY  = 500;

      const subscribers: Subscriber[] = activeRows.map(row => {
        // Determine primary plan label for the billing table
        let primaryPlan: Subscriber['subscription_plan'] = 'basic';
        if (row.account_type === 'premium') primaryPlan = 'premium';
        else if (row.newsletter_status === 'active') primaryPlan = 'newsletter';
        else if (row.top_secret_status === 'active') primaryPlan = 'top_secret';
        else if (row.platform_subscription_status === 'active') primaryPlan = 'platform';

        let monthlyRevenue = 0;
        if (row.account_type === 'basic') {
          monthlyRevenue = row.subscription_interval === 'monthly'
            ? BASIC_MONTHLY : BASIC_YEARLY / 12;
        } else if (row.account_type === 'premium') {
          monthlyRevenue = row.subscription_interval === 'monthly'
            ? PREMIUM_MONTHLY : PREMIUM_YEARLY / 12;
        } else if (row.newsletter_status === 'active') {
          monthlyRevenue = row.subscription_interval === 'monthly'
            ? NEWSLETTER_MONTHLY : NEWSLETTER_YEARLY / 12;
        } else if (row.top_secret_status === 'active') {
          monthlyRevenue = row.subscription_interval === 'monthly'
            ? TOP_SECRET_MONTHLY : TOP_SECRET_YEARLY / 12;
        }

        const products = deriveProducts(row);

        return {
          user_id: row.id,
          email: row.email || '',
          full_name: row.display_name,
          subscription_plan: primaryPlan,
          subscription_status: (row.subscription_status || 'active') as 'active' | 'cancelled' | 'past_due' | 'trial',
          billing_cycle: (row.subscription_interval || 'monthly') as 'monthly' | 'yearly',
          subscription_start_date: row.subscription_started_at || new Date().toISOString(),
          subscription_end_date: row.subscription_expires_at,
          monthly_revenue: Math.round(monthlyRevenue),
          total_paid: 0,
          payment_method: null,
          products,
        };
      });

      console.timeEnd('⚡ getSubscribersList');
      console.log(`📊 Found ${subscribers.length} subscribers`);

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

// ============================================
// 🎯 CRM TRUTH — Attention Summary + Revenue Truth
// ============================================
// Both RPCs are applied via a separate migration and may not exist yet in
// every environment. Callers MUST treat a null return as "data source
// pending" and render accordingly — never assume these throw on failure.

export interface AdminAttentionSummary {
  ticketsAwaiting: number;
  ticketsOldestDays: number | null;
  draftsPending: number;
  kbSuggestionsPending: number;
  refunds7d: number;
  paymentFailures7d: number;
  cancellations7d: number;
  expiring7d: number;
}

export interface AdminRevenueTruth {
  payingPremium: number;
  payingBasic: number;
  platformActive: number;
  revenue30d: number;
  revenue90d: number;
  refunds30d: number;
  cancellations30d: number;
  activations30d: number;
}

/**
 * 🔔 Cross-surface "what needs Elad's attention today" counts.
 * Defensive: returns null (not a throw) if the admin_attention_summary RPC
 * is missing or errors — the UI shows a "Data source pending" note.
 */
export async function getAttentionSummary(): Promise<AdminAttentionSummary | null> {
  try {
    const { data, error } = await supabase.rpc('admin_attention_summary');

    if (error) {
      console.warn('⚠️ admin_attention_summary RPC unavailable:', error.message);
      return null;
    }

    const d = (data || {}) as Record<string, unknown>;

    return {
      ticketsAwaiting: Number(d.tickets_awaiting) || 0,
      ticketsOldestDays:
        d.tickets_oldest_days === null || d.tickets_oldest_days === undefined
          ? null
          : Number(d.tickets_oldest_days),
      draftsPending: Number(d.drafts_pending) || 0,
      kbSuggestionsPending: Number(d.kb_suggestions_pending) || 0,
      refunds7d: Number(d.refunds_7d) || 0,
      paymentFailures7d: Number(d.payment_failures_7d) || 0,
      cancellations7d: Number(d.cancellations_7d) || 0,
      expiring7d: Number(d.expiring_7d) || 0,
    };
  } catch (err) {
    console.warn('⚠️ getAttentionSummary failed:', err);
    return null;
  }
}

/**
 * 💰 Whop-verified paying counts + $ revenue — the "real" money numbers,
 * as opposed to the old MRR/ARR estimate computed from empty profile
 * fields. Defensive: returns null if admin_revenue_truth RPC is missing.
 */
export async function getRevenueTruth(): Promise<AdminRevenueTruth | null> {
  try {
    const { data, error } = await supabase.rpc('admin_revenue_truth');

    if (error) {
      console.warn('⚠️ admin_revenue_truth RPC unavailable:', error.message);
      return null;
    }

    const d = (data || {}) as Record<string, unknown>;

    return {
      payingPremium: Number(d.paying_premium) || 0,
      payingBasic: Number(d.paying_basic) || 0,
      platformActive: Number(d.platform_active) || 0,
      revenue30d: Number(d.revenue_30d) || 0,
      revenue90d: Number(d.revenue_90d) || 0,
      refunds30d: Number(d.refunds_30d) || 0,
      cancellations30d: Number(d.cancellations_30d) || 0,
      activations30d: Number(d.activations_30d) || 0,
    };
  } catch (err) {
    console.warn('⚠️ getRevenueTruth failed:', err);
    return null;
  }
}

// ============================================
// 🎯 TRAFFIC ATTRIBUTION — Per-user signup source
// ============================================

export interface SignupAttribution {
  userId: string;
  utmSource: string | null;
  utmMedium: string | null;
  campaign: string | null;
  adName: string | null;
  metaAdId: string | null;
  referrer: string | null;
  landingPage: string | null;
  touchCount: number | null;
  didCheckout: boolean;
  didLogTrade: boolean;
  signupTs: string;
}

// Row shape returned by the admin_signup_attribution SECURITY DEFINER RPC.
interface AdminSignupAttributionRow {
  user_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  campaign: string | null;
  ad_name: string | null;
  meta_ad_id: string | null;
  referrer: string | null;
  landing_page: string | null;
  touch_count: number | null;
  did_checkout: boolean;
  did_log_trade: boolean;
  signup_ts: string;
}

/**
 * 🎯 Per-user signup traffic attribution (admin-only RPC). Pass userIds to
 * filter, or omit/undefined for all users. Defensive: returns an empty Map
 * (never throws) if the RPC is unavailable or errors, so the CRM still
 * renders — users simply show as "Organic / Direct".
 */
export async function getSignupAttribution(
  userIds?: string[]
): Promise<Map<string, SignupAttribution>> {
  try {
    const { data, error } = await supabase.rpc('admin_signup_attribution', {
      p_user_ids: userIds ?? null,
    });

    if (error) {
      console.warn('⚠️ admin_signup_attribution RPC unavailable:', error.message);
      return new Map();
    }

    const rows = (data || []) as AdminSignupAttributionRow[];
    const map = new Map<string, SignupAttribution>();

    for (const row of rows) {
      map.set(row.user_id, {
        userId: row.user_id,
        utmSource: row.utm_source,
        utmMedium: row.utm_medium,
        campaign: row.campaign,
        adName: row.ad_name,
        metaAdId: row.meta_ad_id,
        referrer: row.referrer,
        landingPage: row.landing_page,
        touchCount: row.touch_count,
        didCheckout: Boolean(row.did_checkout),
        didLogTrade: Boolean(row.did_log_trade),
        signupTs: row.signup_ts,
      });
    }

    return map;
  } catch (err) {
    console.warn('⚠️ getSignupAttribution failed:', err);
    return new Map();
  }
}