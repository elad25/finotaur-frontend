// src/pages/app/all-markets/admin/SiteDashboard.tsx
// =====================================================
// 🔥 SITE DASHBOARD - ADMIN ONLY (v3.0.0 COMPLETE)
// =====================================================
// Uses get_comprehensive_subscription_stats() for accurate counts
// 
// Covers ALL subscription types:
// - Journal (Basic/Premium) - Monthly & Yearly + Trial
// - Newsletter (War Zone) - Monthly & Yearly + Trial + TopSecret Discount
// - Top Secret - Monthly & Yearly + Trial + Journey Tracking
// - Platform (Core/Pro/Enterprise) - Monthly & Yearly + Trial
// - Free Users
// - Revenue (MRR/ARR)
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, Users, Crown, Shield, TrendingUp, 
  Calendar, DollarSign, Activity, RefreshCw,
  BookOpen, Lock, Star, Zap, Clock, Mail,
  Newspaper, Building2, ChevronDown, ChevronRight,
  Search, Filter, MoreVertical, XCircle, PlayCircle,
  Ban, Link2, Loader2, Copy, ExternalLink,
  Download, Gift, History, Trash2, Edit, MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

// =====================================================
// TYPES
// =====================================================

interface ComprehensiveStats {
  generated_at: string;
  overall: {
    total_users: number;
    active_today: number;
    active_this_week: number;
    active_this_month: number;
    new_users_today: number;
    new_users_this_week: number;
    new_users_this_month: number;
  };
  journal: {
    basic: {
      total: number;
      monthly: { total: number; in_trial: number; paid: number };
      yearly: { total: number; in_trial: number; paid: number };
      pending_cancellation: number;
    };
    premium: {
      total: number;
      monthly: { total: number; in_trial: number; paid: number };
      yearly: { total: number; in_trial: number; paid: number };
      pending_cancellation: number;
    };
    free: number;
    legacy_no_whop: number;
    total_subscribers: number;
    total_in_trial: number;
    total_paid: number;
  };
  newsletter: {
    total_subscribers: number;
    monthly: {
      total: number;
      in_trial: number;
      paid: number;
      top_secret_discount: number;
    };
    yearly: { total: number; paid: number };
    cancelled: number;
    pending_cancellation: number;
  };
  top_secret: {
    total_subscribers: number;
    monthly: { total: number; in_trial: number; paid: number };
    yearly: { total: number; in_trial: number; paid: number };
    journey: {
      in_trial: number;
      month_1: number;
      month_2: number;
      month_3_plus: number;
    };
    cancelled: number;
    pending_cancellation: number;
  };
  platform: {
    total_subscribers: number;
    free: number;
    core: {
      total: number;
      monthly: { total: number; in_trial: number; paid: number };
      yearly: { total: number; paid: number };
    };
    pro: {
      total: number;
      monthly: { total: number; in_trial: number; paid: number };
      yearly: { total: number; paid: number };
      trial_eligible: number;
    };
    enterprise: { total: number };
    pending_cancellation: number;
  };
  revenue: {
    journal_mrr: number;
    newsletter_mrr: number;
    top_secret_mrr: number;
    platform_mrr: number;
  };
  trials: {
    total_in_trial: number;
    journal_trial: number;
    newsletter_trial: number;
    top_secret_trial: number;
    platform_trial: number;
  };
}

interface UserListItem {
  id: string;
  email: string;
  display_name: string | null;
  status: string;
  plan: string;
  billing_interval: string | null;
  is_in_trial: boolean;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
  last_login_at: string | null;
}

// =====================================================
// ALL USERS TAB TYPES
// =====================================================

interface AllUsersFilters {
  search: string;
  accountType: string;
  subscriptionStatus: string;
  hasWhop: string;
  newsletterStatus: string;
  topSecretStatus: string;
  platformPlan: string;
  showTestUsers: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface AllUsersUser {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  account_type: string | null;
  subscription_status: string | null;
  has_whop: boolean;
  has_newsletter: boolean;
  has_top_secret: boolean;
  newsletter_status: string | null;
  newsletter_whop_membership_id: string | null;
  newsletter_enabled: boolean | null;
  top_secret_status: string | null;
  top_secret_whop_membership_id: string | null;
  top_secret_enabled: boolean | null;
  platform_plan: string | null;
  platform_subscription_status: string | null;
  last_login_at: string | null;
  trade_count: number;
  is_test_user: boolean;
  whop_membership_id: string | null;
  subscription_interval: string | null;
  subscription_expires_at: string | null;
  role: string | null;
  is_banned: boolean | null;
}

interface AllUsersPagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
// =====================================================
// SUBSCRIPTIONS DEEP DIVE TYPES
// =====================================================

interface SubscriptionEvent {
  id: string;
  user_id: string;
  event_type: string;
  old_plan: string | null;
  new_plan: string | null;
  reason: string | null;
  scheduled_at: string | null;
  processed_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  // Joined from profiles
  user_email?: string;
  user_display_name?: string;
}

interface CancellationAnalysis {
  total_cancellations: number;
  cancellation_reasons: { reason: string; count: number }[];
  avg_days_before_cancel: number;
  recovery_rate: number;
  cancellations_by_plan: { plan: string; count: number }[];
  cancellations_by_month: { month: string; count: number }[];
}

interface TrialAnalysis {
  total_trials_started: number;
  total_trials_converted: number;
  conversion_rate: number;
  avg_trial_duration_days: number;
  trials_expiring_soon: number;
  trials_by_product: { product: string; started: number; converted: number; rate: number }[];
}
// =====================================================
// KPIs & METRICS TYPES
// =====================================================

interface KPIMetrics {
  // Revenue Metrics
  mrr: number;
  arr: number;
  arpu: number;
  ltv: number;
  
  // Growth Metrics
  mrr_growth: number;
  mrr_growth_percent: number;
  new_mrr: number;
  churned_mrr: number;
  net_mrr_change: number;
  
  // User Metrics
  total_paying_customers: number;
  new_customers_this_month: number;
  churned_customers_this_month: number;
  churn_rate: number;
  
  // Conversion Metrics
  trial_to_paid_rate: number;
  free_to_paid_rate: number;
  
  // Engagement
  active_rate_daily: number;
  active_rate_weekly: number;
  active_rate_monthly: number;
}

interface RevenueOverTime {
  month: string;
  mrr: number;
  new_mrr: number;
  churned_mrr: number;
  net_change: number;
}

interface CohortData {
  cohort_month: string;
  total_users: number;
  month_1: number;
  month_3: number;
  month_6: number;
  month_12: number;
}
// =====================================================
// WHOP MEMBERSHIP TYPES (for Admin Management)
// =====================================================

interface WhopMembership {
  id: string;
  product: { id: string; name: string };
  plan: { id: string; plan_type: string; renewal_period: string };
  user: { id: string; email: string; username?: string };
  status: string;
  valid: boolean;
  cancel_at_period_end: boolean;
  license_key?: string;
  created_at: number;
  renewal_period_start?: number;
  renewal_period_end?: number;
  canceled_at?: number;
  // Local enrichment
  local_user_id?: string;
  local_email?: string;
  display_name?: string;
  total_payments?: number;
  newsletter_status?: string;
  top_secret_status?: string;
  trial_ends_at?: string;
}

interface ActionDialogState {
  open: boolean;
  action: 'cancel' | 'extend' | 'ban' | null;
  membership: WhopMembership | null;
}

type ManageProductType = 'war_zone' | 'top_secret';

// =====================================================
// COMPONENT
// =====================================================

export default function SiteDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ComprehensiveStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // User lists (loaded on demand)
  const [journalUsers, setJournalUsers] = useState<UserListItem[]>([]);
  const [newsletterUsers, setNewsletterUsers] = useState<UserListItem[]>([]);
  const [topSecretUsers, setTopSecretUsers] = useState<UserListItem[]>([]);
  const [platformUsers, setPlatformUsers] = useState<UserListItem[]>([]);
  const [freeUsers, setFreeUsers] = useState<UserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<string | null>(null);

  // =====================================================
  // WHOP MANAGEMENT STATE
  // =====================================================
  const [manageMemberships, setManageMemberships] = useState<WhopMembership[]>([]);
  const [filteredManageMemberships, setFilteredManageMemberships] = useState<WhopMembership[]>([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageSearchQuery, setManageSearchQuery] = useState('');
  const [manageStatusFilter, setManageStatusFilter] = useState<string>('all');
  const [manageActionLoading, setManageActionLoading] = useState<string | null>(null);
  const [activeManageProduct, setActiveManageProduct] = useState<ManageProductType>('war_zone');
  
  // Dialog state
  const [actionDialog, setActionDialog] = useState<ActionDialogState>({
    open: false,
    action: null,
    membership: null,
  });
  const [cancelMode, setCancelMode] = useState<'at_period_end' | 'immediate'>('at_period_end');
  const [extendDays, setExtendDays] = useState('7');
  const [actionReason, setActionReason] = useState('');

  // =====================================================
  // ALL USERS TAB STATE
  // =====================================================
  const [allUsers, setAllUsers] = useState<AllUsersUser[]>([]);
  const [allUsersLoading, setAllUsersLoading] = useState(false);
  const [allUsersFilters, setAllUsersFilters] = useState<AllUsersFilters>({
    search: '',
    accountType: 'all',
    subscriptionStatus: 'all',
    hasWhop: 'all',
    newsletterStatus: 'all',
    topSecretStatus: 'all',
    platformPlan: 'all',
    showTestUsers: true,  // ✅ הצג את כל המשתמשים כברירת מחדל
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
const [allUsersPagination, setAllUsersPagination] = useState<AllUsersPagination>({
  page: 1,
  pageSize: 100,  // ✅ 100 משתמשים בעמוד
  totalCount: 0,
  totalPages: 0,
});
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [editUserDialog, setEditUserDialog] = useState<{ open: boolean; user: AllUsersUser | null }>({
    open: false,
    user: null,
  });
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ open: boolean; users: string[] }>({
    open: false,
    users: [],
  });


  // =====================================================
  // TOAST NOTIFICATION STATE
  // =====================================================
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // =====================================================
  // ANNOUNCEMENTS STATE
  // =====================================================
  const [announcementSubject, setAnnouncementSubject] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [announcementRecipients, setAnnouncementRecipients] = useState<Record<string, boolean>>({});
  const [estimatedRecipients, setEstimatedRecipients] = useState(0);
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);

  // ============================================
  // NEW ADMIN FUNCTIONS STATE
  // ============================================
  
  // Search Users
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AllUsersUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // User Filters
  const [userFilters, setUserFilters] = useState<{
    account_type?: string;
    subscription_status?: string;
    newsletter_status?: string;
    top_secret_status?: string;
    is_banned?: boolean;
    has_active_subscription?: boolean;
  }>({});

  // User History
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; userId: string | null }>({ 
    open: false, 
    userId: null 
  });

  // Grant Access
  const [grantDialog, setGrantDialog] = useState<{
    open: boolean;
    userId: string | null;
    product: string;
    plan: string;
    days: number;
  }>({ open: false, userId: null, product: 'journal', plan: 'premium', days: 30 });

  // User Stats
  const [userStats, setUserStats] = useState<any>(null);
  const [statsDialog, setStatsDialog] = useState<{ open: boolean; userId: string | null }>({ 
    open: false, 
    userId: null 
  });

  // Dashboard Stats
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  // =====================================================
  // SUBSCRIPTIONS DEEP DIVE STATE
  // =====================================================
  const [subscriptionEvents, setSubscriptionEvents] = useState<SubscriptionEvent[]>([]);
  const [subscriptionEventsLoading, setSubscriptionEventsLoading] = useState(false);
  const [subscriptionEventFilter, setSubscriptionEventFilter] = useState<string>('all');
  const [cancellationAnalysis, setCancellationAnalysis] = useState<CancellationAnalysis | null>(null);
  const [trialAnalysis, setTrialAnalysis] = useState<TrialAnalysis | null>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);

  // =====================================================
  // KPIs & METRICS STATE
  // =====================================================
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null);
  const [revenueOverTime, setRevenueOverTime] = useState<RevenueOverTime[]>([]);
  const [cohortData, setCohortData] = useState<CohortData[]>([]);
  const [kpiLoading, setKpiLoading] = useState(false);
  // =====================================================
  // FETCH COMPREHENSIVE STATS
  // =====================================================

  const fetchStats = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Try the RPC function first
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_comprehensive_subscription_stats');

      if (!rpcError && rpcData) {
        setStats(rpcData as ComprehensiveStats);
        setLastUpdated(new Date());
        return;
      }

      // Fallback: Calculate stats directly from profiles table
      console.log('RPC not available, calculating stats directly...');
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id, email, account_type, subscription_status, subscription_interval,
          whop_membership_id, is_in_trial, last_login_at, created_at,
          newsletter_status, newsletter_whop_membership_id, newsletter_enabled,
          top_secret_status, top_secret_whop_membership_id, top_secret_enabled,
          platform_plan, platform_subscription_status, platform_is_in_trial
        `)
        .is('deleted_at', null);

      if (profilesError) throw profilesError;

      const users = profiles || [];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Calculate all stats
      const calculatedStats: ComprehensiveStats = {
        generated_at: now.toISOString(),
        overall: {
          total_users: users.length,
          active_today: users.filter(u => u.last_login_at && new Date(u.last_login_at) >= today).length,
          active_this_week: users.filter(u => u.last_login_at && new Date(u.last_login_at) >= weekAgo).length,
          active_this_month: users.filter(u => u.last_login_at && new Date(u.last_login_at) >= monthAgo).length,
          new_users_today: users.filter(u => new Date(u.created_at) >= today).length,
          new_users_this_week: users.filter(u => new Date(u.created_at) >= weekAgo).length,
          new_users_this_month: users.filter(u => new Date(u.created_at) >= monthAgo).length,
        },
        journal: {
          basic: {
            total: users.filter(u => u.account_type === 'basic').length,
            monthly: {
              total: users.filter(u => u.account_type === 'basic' && u.subscription_interval === 'monthly').length,
              in_trial: users.filter(u => u.account_type === 'basic' && u.subscription_interval === 'monthly' && u.is_in_trial).length,
              paid: users.filter(u => u.account_type === 'basic' && u.subscription_interval === 'monthly' && !u.is_in_trial && u.whop_membership_id).length,
            },
            yearly: {
              total: users.filter(u => u.account_type === 'basic' && u.subscription_interval === 'yearly').length,
              in_trial: 0,
              paid: users.filter(u => u.account_type === 'basic' && u.subscription_interval === 'yearly' && u.whop_membership_id).length,
            },
            pending_cancellation: users.filter(u => u.account_type === 'basic' && u.subscription_status === 'cancelled').length,
          },
          premium: {
            total: users.filter(u => u.account_type === 'premium').length,
            monthly: {
              total: users.filter(u => u.account_type === 'premium' && u.subscription_interval === 'monthly').length,
              in_trial: users.filter(u => u.account_type === 'premium' && u.subscription_interval === 'monthly' && u.is_in_trial).length,
              paid: users.filter(u => u.account_type === 'premium' && u.subscription_interval === 'monthly' && !u.is_in_trial && u.whop_membership_id).length,
            },
            yearly: {
              total: users.filter(u => u.account_type === 'premium' && u.subscription_interval === 'yearly').length,
              in_trial: 0,
              paid: users.filter(u => u.account_type === 'premium' && u.subscription_interval === 'yearly' && u.whop_membership_id).length,
            },
            pending_cancellation: users.filter(u => u.account_type === 'premium' && u.subscription_status === 'cancelled').length,
          },
          free: users.filter(u => !u.account_type || u.account_type === 'free').length,
          legacy_no_whop: users.filter(u => u.account_type && u.account_type !== 'free' && !u.whop_membership_id).length,
          total_subscribers: users.filter(u => u.account_type && u.account_type !== 'free' && u.whop_membership_id).length,
          total_in_trial: users.filter(u => u.subscription_status === 'trial' || u.is_in_trial).length,
          total_paid: users.filter(u => u.whop_membership_id && !u.is_in_trial && u.subscription_status === 'active').length,
        },
        newsletter: {
          total_subscribers: users.filter(u => u.newsletter_status === 'active' || u.newsletter_whop_membership_id).length,
          monthly: {
            total: users.filter(u => u.newsletter_status === 'active').length,
            in_trial: users.filter(u => u.newsletter_status === 'trial').length,
            paid: users.filter(u => u.newsletter_whop_membership_id && u.newsletter_status === 'active').length,
            top_secret_discount: users.filter(u => u.newsletter_enabled && u.top_secret_enabled).length,
          },
          yearly: { total: 0, paid: 0 },
          cancelled: users.filter(u => u.newsletter_status === 'cancelled').length,
          pending_cancellation: 0,
        },
        top_secret: {
          total_subscribers: users.filter(u => u.top_secret_status === 'active' || u.top_secret_whop_membership_id).length,
          monthly: {
            total: users.filter(u => u.top_secret_status === 'active').length,
            in_trial: users.filter(u => u.top_secret_status === 'trial').length,
            paid: users.filter(u => u.top_secret_whop_membership_id && u.top_secret_status === 'active').length,
          },
          yearly: { total: 0, in_trial: 0, paid: 0 },
          journey: {
            in_trial: users.filter(u => u.top_secret_status === 'trial').length,
            month_1: 0,
            month_2: 0,
            month_3_plus: 0,
          },
          cancelled: users.filter(u => u.top_secret_status === 'cancelled').length,
          pending_cancellation: 0,
        },
        platform: {
          total_subscribers: users.filter(u => u.platform_plan && u.platform_plan !== 'free').length,
          free: users.filter(u => !u.platform_plan || u.platform_plan === 'free').length,
          core: {
            total: users.filter(u => u.platform_plan === 'core').length,
            monthly: { total: users.filter(u => u.platform_plan === 'core').length, in_trial: 0, paid: users.filter(u => u.platform_plan === 'core' && u.platform_subscription_status === 'active').length },
            yearly: { total: 0, paid: 0 },
          },
          pro: {
            total: users.filter(u => u.platform_plan === 'pro').length,
            monthly: { total: users.filter(u => u.platform_plan === 'pro').length, in_trial: users.filter(u => u.platform_plan === 'pro' && u.platform_is_in_trial).length, paid: users.filter(u => u.platform_plan === 'pro' && u.platform_subscription_status === 'active').length },
            yearly: { total: 0, paid: 0 },
            trial_eligible: 0,
          },
          enterprise: { total: users.filter(u => u.platform_plan === 'enterprise').length },
          pending_cancellation: 0,
        },
        revenue: {
          journal_mrr: users.filter(u => u.account_type === 'basic' && u.whop_membership_id && !u.is_in_trial).length * 19.99 +
                       users.filter(u => u.account_type === 'premium' && u.whop_membership_id && !u.is_in_trial).length * 39.99,
          newsletter_mrr: users.filter(u => u.newsletter_whop_membership_id && u.newsletter_status === 'active').length * 49,
          top_secret_mrr: users.filter(u => u.top_secret_whop_membership_id && u.top_secret_status === 'active').length * 70,
          platform_mrr: users.filter(u => u.platform_plan === 'core' && u.platform_subscription_status === 'active').length * 39 +
                        users.filter(u => u.platform_plan === 'pro' && u.platform_subscription_status === 'active').length * 69,
        },
        trials: {
          total_in_trial: users.filter(u => u.is_in_trial || u.subscription_status === 'trial' || u.newsletter_status === 'trial' || u.platform_is_in_trial).length,
          journal_trial: users.filter(u => u.subscription_status === 'trial' || u.is_in_trial).length,
          newsletter_trial: users.filter(u => u.newsletter_status === 'trial').length,
          top_secret_trial: users.filter(u => u.top_secret_status === 'trial').length,
          platform_trial: users.filter(u => u.platform_is_in_trial).length,
        },
      };

      setStats(calculatedStats);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // =====================================================
  // FETCH USER LISTS
  // =====================================================

  const fetchUserList = async (productType: string, filter: string = 'all') => {
    setLoadingUsers(productType);
    try {
      const { data, error } = await supabase
        .rpc('get_users_by_subscription', {
          p_product_type: productType,
          p_filter: filter
        });

      if (error) throw error;

      switch (productType) {
        case 'journal':
          setJournalUsers(data || []);
          break;
        case 'newsletter':
          setNewsletterUsers(data || []);
          break;
        case 'top_secret':
          setTopSecretUsers(data || []);
          break;
        case 'platform':
          setPlatformUsers(data || []);
          break;
      }
    } catch (err) {
      console.error(`Error fetching ${productType} users:`, err);
    } finally {
      setLoadingUsers(null);
    }
  };

  const fetchFreeUsers = async () => {
    setLoadingUsers('free');
    try {
      const { data, error } = await supabase
        .rpc('get_users_by_subscription', {
          p_product_type: 'journal',
          p_filter: 'free'
        });

      if (error) throw error;
      setFreeUsers(data || []);
    } catch (err) {
      console.error('Error fetching free users:', err);
    } finally {
      setLoadingUsers(null);
    }
  };

  // =====================================================
  // WHOP ADMIN API CALLS
  // =====================================================

  const callAdminAPI = async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('whop-admin-actions', {
      body,
    });

    if (response.error) {
      throw new Error(response.error.message || 'API call failed');
    }

    return response.data;
  };

  const fetchManageMemberships = useCallback(async () => {
    try {
      setManageLoading(true);

      const result = await callAdminAPI({
        action: 'list',
        product: activeManageProduct,
      });

      if (result.success && result.data) {
        setManageMemberships(result.data);
        setFilteredManageMemberships(result.data);
      }
    } catch (error) {
      console.error('Error fetching memberships:', error);
    } finally {
      setManageLoading(false);
    }
  }, [activeManageProduct]);

  // Filter manage memberships
  useEffect(() => {
    let filtered = [...manageMemberships];

    if (manageSearchQuery) {
      const query = manageSearchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.user?.email?.toLowerCase().includes(query) ||
        m.local_email?.toLowerCase().includes(query) ||
        m.display_name?.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query)
      );
    }

    if (manageStatusFilter !== 'all') {
      filtered = filtered.filter(m => {
        switch (manageStatusFilter) {
          case 'active': return m.valid && !m.cancel_at_period_end;
          case 'trial': return m.status === 'trialing';
          case 'cancelling': return m.cancel_at_period_end;
          case 'cancelled': return !m.valid || m.status === 'canceled';
          default: return true;
        }
      });
    }

    setFilteredManageMemberships(filtered);
  }, [manageMemberships, manageSearchQuery, manageStatusFilter]);

  // Admin Actions
  const handleAdminCancel = async () => {
    if (!actionDialog.membership) return;
    
    setManageActionLoading('cancel');
    try {
      const result = await callAdminAPI({
        action: 'cancel',
        membership_id: actionDialog.membership.id,
        cancel_mode: cancelMode,
        reason: actionReason || undefined,
      });

      if (result.success) {
        fetchManageMemberships();
      }
    } catch (error) {
      console.error('Cancel error:', error);
    } finally {
      setManageActionLoading(null);
      setActionDialog({ open: false, action: null, membership: null });
      setActionReason('');
    }
  };

  const handleAdminResume = async (membership: WhopMembership) => {
    setManageActionLoading(membership.id);
    try {
      const result = await callAdminAPI({
        action: 'resume',
        membership_id: membership.id,
      });

      if (result.success) {
        fetchManageMemberships();
      }
    } catch (error) {
      console.error('Resume error:', error);
    } finally {
      setManageActionLoading(null);
    }
  };

  const handleAdminExtend = async () => {
    if (!actionDialog.membership) return;
    
    setManageActionLoading('extend');
    try {
      const result = await callAdminAPI({
        action: 'extend',
        membership_id: actionDialog.membership.id,
        days: parseInt(extendDays),
      });

      if (result.success) {
        fetchManageMemberships();
      }
    } catch (error) {
      console.error('Extend error:', error);
    } finally {
      setManageActionLoading(null);
      setActionDialog({ open: false, action: null, membership: null });
      setExtendDays('7');
    }
  };

  const handleAdminBan = async () => {
    if (!actionDialog.membership) return;
    
    setManageActionLoading('ban');
    try {
      const result = await callAdminAPI({
        action: 'ban',
        membership_id: actionDialog.membership.id,
        reason: actionReason || undefined,
      });

      if (result.success) {
        fetchManageMemberships();
      }
    } catch (error) {
      console.error('Ban error:', error);
    } finally {
      setManageActionLoading(null);
      setActionDialog({ open: false, action: null, membership: null });
      setActionReason('');
    }
  };

  const handleGenerateTransferLink = async (membership: WhopMembership) => {
    setManageActionLoading(membership.id);
    try {
      const result = await callAdminAPI({
        action: 'transfer',
        membership_id: membership.id,
      });

      if (result.success && result.transfer_url) {
        await navigator.clipboard.writeText(result.transfer_url);
        alert('Transfer link copied to clipboard!');
      }
    } catch (error) {
      console.error('Transfer link error:', error);
    } finally {
      setManageActionLoading(null);
    }
  };

  const handleCopyLicenseKey = async (membership: WhopMembership) => {
    if (membership.license_key) {
      await navigator.clipboard.writeText(membership.license_key);
      alert('License key copied!');
    }
  };

  const handleSyncWithWhop = async () => {
    setManageLoading(true);
    try {
      await callAdminAPI({
        action: 'sync',
        product: activeManageProduct,
      });
      fetchManageMemberships();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setManageLoading(false);
    }
  };

  // Helper functions for manage tab
  const getManageStatusBadge = (membership: WhopMembership) => {
    if (!membership.valid) {
      return <Badge className="bg-red-500/20 text-red-400">Cancelled</Badge>;
    }
    if (membership.cancel_at_period_end) {
      return <Badge className="bg-orange-500/20 text-orange-400">Cancelling</Badge>;
    }
    if (membership.status === 'trialing') {
      return <Badge className="bg-blue-500/20 text-blue-400">Trial</Badge>;
    }
    if (membership.status === 'active') {
      return <Badge className="bg-emerald-500/20 text-emerald-400">Active</Badge>;
    }
    return <Badge className="bg-gray-500/20 text-gray-400">{membership.status}</Badge>;
  };

  const formatManageDate = (timestamp: number | undefined) => {
    if (!timestamp) return '—';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const getManageTrialStatus = (membership: WhopMembership) => {
    if (membership.status !== 'trialing') return null;
    const trialEnd = membership.renewal_period_end;
    if (!trialEnd) return null;
    const daysLeft = Math.ceil((trialEnd - Date.now() / 1000) / 86400);
    if (daysLeft <= 0) return 'Trial expired';
    return `Trial ends in ${daysLeft}d`;
  };

  const manageStats = {
    total: manageMemberships.length,
    active: manageMemberships.filter(m => m.valid && !m.cancel_at_period_end).length,
    trial: manageMemberships.filter(m => m.status === 'trialing').length,
    cancelling: manageMemberships.filter(m => m.cancel_at_period_end).length,
    totalRevenue: manageMemberships.reduce((sum, m) => sum + (m.total_payments || 0), 0),
  };

  // =====================================================
  // ALL USERS TAB FUNCTIONS
  // =====================================================

const fetchAllUsers = useCallback(async () => {
  setAllUsersLoading(true);
  try {
    // Build filters object for the RPC function
    const filters: Record<string, any> = {};
    
    if (allUsersFilters.search) {
      filters.search = allUsersFilters.search;
    }
    
    if (allUsersFilters.accountType !== 'all') {
      filters.account_type = allUsersFilters.accountType;
    }
    
    if (allUsersFilters.subscriptionStatus !== 'all') {
      filters.subscription_status = allUsersFilters.subscriptionStatus;
    }
    
    if (allUsersFilters.newsletterStatus && allUsersFilters.newsletterStatus !== 'all') {
      filters.newsletter_status = allUsersFilters.newsletterStatus;
    }
    
    if (allUsersFilters.topSecretStatus && allUsersFilters.topSecretStatus !== 'all') {
      filters.top_secret_status = allUsersFilters.topSecretStatus;
    }
    
    if (allUsersFilters.platformPlan && allUsersFilters.platformPlan !== 'all') {
      filters.platform_plan = allUsersFilters.platformPlan;
    }
    
    // Has Whop filter - only for 'yes' (server-side)
    if (allUsersFilters.hasWhop === 'yes') {
      filters.has_active_subscription = true;
    }

    // First get the count
    const { data: countData, error: countError } = await supabase.rpc('admin_count_users', {
      p_filters: filters
    });

    if (countError) {
      console.error('Count error:', countError);
    }

    const totalCount = countData || 0;

    // Then get the users using RPC (bypasses RLS via SECURITY DEFINER)
    const { data, error } = await supabase.rpc('admin_list_users', {
      p_filters: filters,
      p_limit: allUsersPagination.pageSize,
      p_offset: (allUsersPagination.page - 1) * allUsersPagination.pageSize,
      p_sort_by: allUsersFilters.sortBy,
      p_sort_order: allUsersFilters.sortOrder.toUpperCase()
    });

    if (error) throw error;

    // Map the data with computed fields
    let mappedData = (data || []).map((user: any) => ({
      ...user,
      has_whop: !!user.whop_membership_id,
      has_newsletter: !!user.newsletter_whop_membership_id || user.newsletter_enabled,
      has_top_secret: !!user.top_secret_whop_membership_id || user.top_secret_enabled,
      is_test_user: user.email?.includes('test') || user.email?.includes('+') || false,
      trade_count: user.trade_count || 0,
    }));

    // Client-side filter for test users (if showTestUsers is explicitly FALSE)
    if (allUsersFilters.showTestUsers === false) {
      mappedData = mappedData.filter((user: any) => !user.is_test_user);
    }

    // Client-side filter for has_whop = 'no'
    if (allUsersFilters.hasWhop === 'no') {
      mappedData = mappedData.filter((user: any) => !user.has_whop);
    }

    setAllUsers(mappedData);
    setAllUsersPagination(prev => ({
      ...prev,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / prev.pageSize),
    }));

  } catch (err) {
    console.error('Error fetching all users:', err);
    
    // Show helpful error message for access denied
    if (err instanceof Error && err.message.includes('Access denied')) {
      alert('Access denied: You must be an admin to view all users');
    }
  } finally {
    setAllUsersLoading(false);
  }
}, [allUsersFilters, allUsersPagination.page, allUsersPagination.pageSize]);

const handleUpdateUser = async (userId: string, updates: Partial<AllUsersUser>) => {
  try {
    // Use the new RPC function for full update capability
    const { data, error } = await supabase.rpc('admin_update_user', {
      p_user_id: userId,
      p_updates: {
        account_type: updates.account_type,
        subscription_status: updates.subscription_status,
        newsletter_status: updates.newsletter_status,
        top_secret_status: updates.top_secret_status,
        platform_plan: updates.platform_plan,
        is_banned: updates.is_banned,
        role: updates.role,
        display_name: updates.display_name,
      }
    });

    if (error) throw error;
    
    if (data && !data.success) {
      throw new Error(data.error || 'Update failed');
    }

    fetchAllUsers();
    setEditUserDialog({ open: false, user: null });
  } catch (err) {
    console.error('Error updating user:', err);
    alert(`Failed to update user: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};


const handleDeleteUsers = async (userIds: string[]) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    console.log('[Admin] Deleting users:', userIds.length);

    const { data, error } = await supabase.functions.invoke('admin-delete-users', {
      body: { user_ids: userIds },
    });

    console.log('[Admin] Delete response:', { data, error });

    if (error) {
      throw new Error(error.message || 'Failed to delete users');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Delete operation failed');
    }

    // Close dialog first
    setDeleteConfirmDialog({ open: false, users: [] });
    setSelectedUsers(new Set());
    
    // Show detailed result
    const { deleted_count, failed_count, results } = data;
    
    if (failed_count > 0) {
      console.warn('[Admin] Some deletions failed:', results?.failed);
      showToast(
        `Deleted ${deleted_count} user(s), ${failed_count} failed. Check console for details.`, 
        failed_count === userIds.length ? 'error' : 'warning'
      );
    } else {
      showToast(`Successfully deleted ${deleted_count} user(s)`, 'success');
    }

    // Refresh the list
    fetchAllUsers();
    
  } catch (err) {
    console.error('[Admin] Error deleting users:', err);
    setDeleteConfirmDialog({ open: false, users: [] });
    showToast(`Failed to delete users: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
  }
};


// ============================================
  // NEW ADMIN FUNCTIONS
  // ============================================

  // Search Users
  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('admin_search_users', {
        p_query: query,
        p_limit: 50,
        p_offset: 0
      });

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
      alert('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  // List Users with Filters
  const handleListUsers = async (filters = userFilters) => {
    try {
      const { data, error } = await supabase.rpc('admin_list_users', {
        p_filters: filters,
        p_limit: 100,
        p_offset: 0,
        p_sort_by: 'created_at',
        p_sort_order: 'DESC'
      });

      if (error) throw error;
      setAllUsers(data || []);
    } catch (err) {
      console.error('List users error:', err);
    }
  };

  // Get User History
  const handleGetUserHistory = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_get_user_history', {
        p_user_id: userId,
        p_limit: 100
      });

      if (error) throw error;
      setUserHistory(data || []);
      setHistoryDialog({ open: true, userId });
    } catch (err) {
      console.error('Get history error:', err);
      alert('Failed to get user history');
    }
  };

  // Grant Access
  const handleGrantAccess = async () => {
    if (!grantDialog.userId) return;
    
    try {
      const { data, error } = await supabase.rpc('admin_grant_access', {
        p_user_id: grantDialog.userId,
        p_product: grantDialog.product,
        p_plan: grantDialog.plan,
        p_duration_days: grantDialog.days
      });

      if (error) throw error;
      
      if (data && !data.success) {
        throw new Error(data.error);
      }

      alert(`Access granted! Expires: ${new Date(data.expires_at).toLocaleDateString()}`);
      fetchAllUsers();
      setGrantDialog({ open: false, userId: null, product: 'journal', plan: 'premium', days: 30 });
    } catch (err) {
      console.error('Grant access error:', err);
      alert(`Failed to grant access: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Revoke Access
  const handleRevokeAccess = async (userId: string, product: string) => {
    if (!confirm(`Are you sure you want to revoke ${product} access?`)) return;
    
    try {
      const { data, error } = await supabase.rpc('admin_revoke_access', {
        p_user_id: userId,
        p_product: product
      });

      if (error) throw error;
      
      if (data && !data.success) {
        throw new Error(data.error);
      }

      alert(`${product} access revoked successfully`);
      fetchAllUsers();
    } catch (err) {
      console.error('Revoke access error:', err);
      alert(`Failed to revoke access: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Get User Stats
  const handleGetUserStats = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_get_user_stats', {
        p_user_id: userId
      });

      if (error) throw error;
      
      if (data && !data.success) {
        throw new Error(data.error);
      }

      setUserStats(data);
      setStatsDialog({ open: true, userId });
    } catch (err) {
      console.error('Get stats error:', err);
      alert('Failed to get user stats');
    }
  };

  // Export Users to CSV (Enhanced)
  const handleExportUsersAdmin = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_export_users', {
        p_filters: userFilters
      });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        alert('No users to export');
        return;
      }

      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map((row: any) => headers.map(h => `"${row[h] || ''}"`).join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `finotaur-users-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export users');
    }
  };

  // Fetch Dashboard Stats
  const fetchDashboardStats = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_dashboard_stats');

      if (error) throw error;
      setDashboardStats(data);
    } catch (err) {
      console.error('Dashboard stats error:', err);
    }
  };

  // Delete Users (via Edge Function)
  const handleDeleteUsersAdmin = async (userIds: string[]) => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE ${userIds.length} user(s)? This cannot be undone!`)) {
      return;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-users', {
        body: { user_ids: userIds }
      });

      if (error) throw error;
      
      alert(`Deleted: ${data.deleted}, Failed: ${data.failed}`);
      if (data.errors?.length > 0) {
        console.error('Delete errors:', data.errors);
      }
      
      fetchAllUsers();
      setSelectedUsers(new Set());
    } catch (err) {
      console.error('Delete error:', err);
      alert(`Failed to delete users: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Cancel All Subscriptions (via Edge Function)
  const handleCancelAllSubscriptions = async (userIds: string[]) => {
    if (!confirm(`Cancel ALL subscriptions for ${userIds.length} user(s)?`)) {
      return;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-cancel-subscriptions', {
        body: { user_ids: userIds }
      });

      if (error) throw error;
      
      alert(`Processed: ${data.processed}, Whop cancelled: ${data.whop_cancelled}`);
      fetchAllUsers();
      setSelectedUsers(new Set());
    } catch (err) {
      console.error('Cancel error:', err);
      alert(`Failed to cancel subscriptions: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Soft delete - just mark as banned (safer option)
const handleBanUsers = async (userIds: string[], ban: boolean = true) => {
  try {
    for (const userId of userIds) {
      const { data, error } = await supabase.rpc('admin_toggle_ban', {
        p_user_id: userId,
        p_is_banned: ban,
        p_reason: ban ? 'Banned by admin' : 'Unbanned by admin'
      });

      if (error) throw error;
      if (data && !data.success) {
        console.error(`Failed to ${ban ? 'ban' : 'unban'} ${userId}:`, data.error);
      }
    }

    fetchAllUsers();
    setSelectedUsers(new Set());
    showToast(`Successfully ${ban ? 'banned' : 'unbanned'} ${userIds.length} user(s)`, 'success');
  } catch (err) {
    console.error('Error:', err);
    showToast(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
  }
};



  // Cancel all subscriptions for users
  const handleCancelSubscriptions = async (userIds: string[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('admin-cancel-subscriptions', {
        body: { user_ids: userIds },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to cancel subscriptions');
      }

      fetchAllUsers();
      setSelectedUsers(new Set());
      showToast(`Successfully cancelled subscriptions for ${userIds.length} user(s)`, 'success');
    } catch (err) {
      console.error('Error cancelling subscriptions:', err);
      showToast(`Failed to cancel subscriptions: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const exportUsersToCSV = () => {
    const headers = [
      'Email', 
      'Display Name', 
      'User ID',
      'Created At',
      'Last Login',
      'Role',
      'Is Banned',
      // Journal
      'Journal Plan', 
      'Journal Status', 
      'Has Whop',
      'Whop Membership ID',
      // Newsletter
      'Newsletter Status',
      'Newsletter Paid',
      // Top Secret
      'Top Secret Status',
      'Top Secret Paid',
      // Platform
      'Platform Plan',
      'Platform Status',
      // Activity
      'Trade Count',
      'Is Test User'
    ];
    
    const rows = allUsers.map(u => [
      u.email,
      u.display_name || '',
      u.id,
      new Date(u.created_at).toISOString(),
      u.last_login_at ? new Date(u.last_login_at).toISOString() : '',
      u.role || 'user',
      u.is_banned ? 'Yes' : 'No',
      // Journal
      u.account_type || 'free',
      u.subscription_status || 'inactive',
      u.has_whop ? 'Yes' : 'No',
      u.whop_membership_id || '',
      // Newsletter
      u.newsletter_status || 'inactive',
      u.has_newsletter ? 'Yes' : 'No',
      // Top Secret
      u.top_secret_status || 'inactive',
      u.has_top_secret ? 'Yes' : 'No',
      // Platform
      u.platform_plan || 'free',
      u.platform_subscription_status || 'inactive',
      // Activity
      u.trade_count.toString(),
      u.is_test_user ? 'Yes' : 'No',
    ]);

    // Escape CSV values properly
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvContent = [
      headers.join(','), 
      ...rows.map(r => r.map(escapeCSV).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finotaur-users-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


 // =====================================================
  // ANNOUNCEMENTS FUNCTIONS
  // =====================================================

  const fetchEstimatedRecipients = useCallback(async () => {
    if (Object.values(announcementRecipients).every(v => !v)) {
      setEstimatedRecipients(0);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_announcement_recipients', {
        p_filters: announcementRecipients
      });

      if (error) throw error;
      setEstimatedRecipients(data?.length || 0);
    } catch (err) {
      console.error('Error fetching recipients count:', err);
    }
  }, [announcementRecipients]);

  const handleSendTestEmail = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      showToast('No user email found', 'error');
      return;
    }

    setSendingAnnouncement(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-announcement', {
        body: {
          subject: announcementSubject,
          body: announcementBody,
          recipients: announcementRecipients,
          test_email: session.user.email,
        },
      });

      if (error) throw error;
      showToast(`Test email sent to ${session.user.email}`, 'success');
    } catch (err) {
      console.error('Error sending test email:', err);
      showToast('Failed to send test email', 'error');
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementSubject.trim() || !announcementBody.trim()) {
      showToast('Please fill in subject and body', 'warning');
      return;
    }

    if (estimatedRecipients === 0) {
      showToast('Please select at least one recipient group', 'warning');
      return;
    }

    if (!confirm(`Are you sure you want to send this email to ${estimatedRecipients} users?`)) {
      return;
    }

    setSendingAnnouncement(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-announcement', {
        body: {
          subject: announcementSubject,
          body: announcementBody,
          recipients: announcementRecipients,
        },
      });

      if (error) throw error;

      showToast(`Announcement sent to ${data.sent} users (${data.failed} failed)`, 'success');
      
      // Clear form
      setAnnouncementSubject('');
      setAnnouncementBody('');
      setAnnouncementRecipients({});
      
      // Refresh recent announcements
      fetchRecentAnnouncements();
    } catch (err) {
      console.error('Error sending announcement:', err);
      showToast('Failed to send announcement', 'error');
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const fetchRecentAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcement_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentAnnouncements(data || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    }
  };

// =====================================================
  // SUBSCRIPTIONS DEEP DIVE FUNCTIONS
  // =====================================================

  const fetchSubscriptionEvents = useCallback(async () => {
    setSubscriptionEventsLoading(true);
    try {
      let query = supabase
        .from('subscription_events')
        .select(`
          *,
          profiles:user_id (
            email,
            display_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (subscriptionEventFilter !== 'all') {
        query = query.eq('event_type', subscriptionEventFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const eventsWithUser = (data || []).map(event => ({
        ...event,
        user_email: event.profiles?.email,
        user_display_name: event.profiles?.display_name,
      }));

      setSubscriptionEvents(eventsWithUser);
    } catch (err) {
      console.error('Error fetching subscription events:', err);
    } finally {
      setSubscriptionEventsLoading(false);
    }
  }, [subscriptionEventFilter]);

  const fetchDeepDiveAnalysis = useCallback(async () => {
    setDeepDiveLoading(true);
    try {
      // Fetch cancellation events
      const { data: cancelEvents, error: cancelError } = await supabase
        .from('subscription_events')
        .select('*')
        .in('event_type', ['cancelled', 'cancel_scheduled'])
        .order('created_at', { ascending: false });

      if (cancelError) throw cancelError;

      // Fetch trial events
      const { data: trialEvents, error: trialError } = await supabase
        .from('subscription_events')
        .select('*')
        .in('event_type', ['trial_started', 'trial_ended', 'payment_succeeded'])
        .order('created_at', { ascending: false });

      if (trialError) throw trialError;

      // Fetch profiles with trial info
      const { data: trialProfiles, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          subscription_status,
          subscription_started_at,
          subscription_expires_at,
          account_type,
          newsletter_status,
          newsletter_trial_ends_at,
          top_secret_status,
          top_secret_started_at,
          platform_is_in_trial,
          platform_trial_ends_at
        `)
        .or('subscription_status.eq.trial,newsletter_status.eq.trial,platform_is_in_trial.eq.true');

      if (profileError) throw profileError;

      // Calculate Cancellation Analysis
      const cancellationReasons: Record<string, number> = {};
      const cancellationsByPlan: Record<string, number> = {};
      const cancellationsByMonth: Record<string, number> = {};
      let totalDaysBeforeCancel = 0;
      let cancelCount = 0;

      (cancelEvents || []).forEach(event => {
        // Count by reason
        const reason = event.reason || event.metadata?.reason || 'Not specified';
        cancellationReasons[reason] = (cancellationReasons[reason] || 0) + 1;

        // Count by plan
        const plan = event.old_plan || 'unknown';
        cancellationsByPlan[plan] = (cancellationsByPlan[plan] || 0) + 1;

        // Count by month
        const month = new Date(event.created_at).toLocaleString('en-US', { month: 'short', year: 'numeric' });
        cancellationsByMonth[month] = (cancellationsByMonth[month] || 0) + 1;

        // Calculate days before cancel (if we have metadata with subscription start)
        if (event.metadata?.subscription_started_at) {
          const startDate = new Date(event.metadata.subscription_started_at);
          const cancelDate = new Date(event.created_at);
          const days = Math.floor((cancelDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          totalDaysBeforeCancel += days;
          cancelCount++;
        }
      });

      // Count reactivations for recovery rate
      const { data: reactivations } = await supabase
        .from('subscription_events')
        .select('id')
        .eq('event_type', 'reactivated');

      const recoveryRate = (cancelEvents?.length || 0) > 0 
        ? ((reactivations?.length || 0) / (cancelEvents?.length || 1)) * 100 
        : 0;

      setCancellationAnalysis({
        total_cancellations: cancelEvents?.length || 0,
        cancellation_reasons: Object.entries(cancellationReasons)
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count),
        avg_days_before_cancel: cancelCount > 0 ? Math.round(totalDaysBeforeCancel / cancelCount) : 0,
        recovery_rate: Math.round(recoveryRate * 10) / 10,
        cancellations_by_plan: Object.entries(cancellationsByPlan)
          .map(([plan, count]) => ({ plan, count }))
          .sort((a, b) => b.count - a.count),
        cancellations_by_month: Object.entries(cancellationsByMonth)
          .map(([month, count]) => ({ month, count }))
          .slice(0, 6),
      });

      // Calculate Trial Analysis
      const trialStarted = (trialEvents || []).filter(e => e.event_type === 'trial_started').length;
      const trialConverted = (trialEvents || []).filter(e => 
        e.event_type === 'payment_succeeded' && 
        (e.metadata?.was_in_trial || e.old_plan === 'trial')
      ).length;

      // Trials expiring in next 3 days
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const trialsExpiringSoon = (trialProfiles || []).filter(p => {
        const expiryDates = [
          p.subscription_status === 'trial' ? p.subscription_expires_at : null,
          p.newsletter_status === 'trial' ? p.newsletter_trial_ends_at : null,
          p.platform_is_in_trial ? p.platform_trial_ends_at : null,
        ].filter(Boolean);

        return expiryDates.some(date => {
          const expiry = new Date(date!);
          return expiry >= now && expiry <= threeDaysFromNow;
        });
      }).length;

      // Trials by product
      const journalTrials = (trialProfiles || []).filter(p => p.subscription_status === 'trial').length;
      const newsletterTrials = (trialProfiles || []).filter(p => p.newsletter_status === 'trial').length;
      const platformTrials = (trialProfiles || []).filter(p => p.platform_is_in_trial).length;

      setTrialAnalysis({
        total_trials_started: trialStarted || journalTrials + newsletterTrials + platformTrials,
        total_trials_converted: trialConverted,
        conversion_rate: trialStarted > 0 ? Math.round((trialConverted / trialStarted) * 100) : 0,
        avg_trial_duration_days: 10, // Approximate
        trials_expiring_soon: trialsExpiringSoon,
        trials_by_product: [
          { product: 'Journal', started: journalTrials, converted: 0, rate: 0 },
          { product: 'Newsletter', started: newsletterTrials, converted: 0, rate: 0 },
          { product: 'Platform', started: platformTrials, converted: 0, rate: 0 },
        ],
      });

    } catch (err) {
      console.error('Error fetching deep dive analysis:', err);
    } finally {
      setDeepDiveLoading(false);
    }
  }, []);

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'payment_succeeded': return 'bg-emerald-500/20 text-emerald-400';
      case 'trial_started': return 'bg-blue-500/20 text-blue-400';
      case 'trial_ended': return 'bg-orange-500/20 text-orange-400';
      case 'upgrade': return 'bg-purple-500/20 text-purple-400';
      case 'downgrade': return 'bg-yellow-500/20 text-yellow-400';
      case 'downgrade_scheduled': return 'bg-yellow-500/20 text-yellow-400';
      case 'cancel_scheduled': return 'bg-orange-500/20 text-orange-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      case 'reactivated': return 'bg-emerald-500/20 text-emerald-400';
      case 'payment_failed': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  // =====================================================
  // KPIs & METRICS FUNCTIONS
  // =====================================================

  const fetchKPIMetrics = useCallback(async () => {
    setKpiLoading(true);
    try {
      // Get current stats
      const { data: statsData } = await supabase.rpc('get_comprehensive_subscription_stats');
      
      if (!statsData) throw new Error('Failed to fetch stats');

      // Calculate metrics from stats
      const totalMRR = 
        (statsData.revenue?.journal_mrr || 0) + 
        (statsData.revenue?.newsletter_mrr || 0) + 
        (statsData.revenue?.top_secret_mrr || 0) + 
        (statsData.revenue?.platform_mrr || 0);

      const totalPayingCustomers = 
        (statsData.journal?.total_paid || 0) +
        (statsData.newsletter?.monthly?.paid || 0) +
        (statsData.top_secret?.monthly?.paid || 0) + 
        (statsData.top_secret?.yearly?.paid || 0) +
        (statsData.platform?.total_subscribers || 0);

      const totalUsers = statsData.overall?.total_users || 1;
      const activeToday = statsData.overall?.active_today || 0;
      const activeWeek = statsData.overall?.active_this_week || 0;
      const activeMonth = statsData.overall?.active_this_month || 0;

      // Get cancellation data for churn calculation
      const { data: cancelData } = await supabase
        .from('subscription_events')
        .select('id')
        .eq('event_type', 'cancelled')
        .gte('created_at', new Date(new Date().setDate(1)).toISOString());

      const churnedThisMonth = cancelData?.length || 0;

      // Get new customers this month
      const { data: newCustomers } = await supabase
        .from('profiles')
        .select('id')
        .not('whop_membership_id', 'is', null)
        .gte('created_at', new Date(new Date().setDate(1)).toISOString());

      const newCustomersThisMonth = newCustomers?.length || 0;

      // Calculate churn rate
      const startOfMonthCustomers = totalPayingCustomers + churnedThisMonth - newCustomersThisMonth;
      const churnRate = startOfMonthCustomers > 0 
        ? (churnedThisMonth / startOfMonthCustomers) * 100 
        : 0;

      // Calculate ARPU (Average Revenue Per User)
      const arpu = totalPayingCustomers > 0 ? totalMRR / totalPayingCustomers : 0;

      // Calculate LTV (assuming 12 month average lifespan for now)
      const avgLifespanMonths = churnRate > 0 ? 100 / churnRate : 24;
      const ltv = arpu * Math.min(avgLifespanMonths, 36);

      // Trial conversion
      const totalTrials = statsData.trials?.total_in_trial || 0;
      const trialConversions = statsData.journal?.total_paid || 0; // Simplified
      const trialToPaidRate = totalTrials > 0 ? (trialConversions / (totalTrials + trialConversions)) * 100 : 0;

      // Free to paid conversion
      const freeUsers = statsData.journal?.free || 0;
      const freeToPaidRate = freeUsers > 0 ? (totalPayingCustomers / (freeUsers + totalPayingCustomers)) * 100 : 0;

      setKpiMetrics({
        mrr: totalMRR,
        arr: totalMRR * 12,
        arpu: Math.round(arpu * 100) / 100,
        ltv: Math.round(ltv * 100) / 100,
        
        mrr_growth: newCustomersThisMonth * arpu,
        mrr_growth_percent: totalMRR > 0 ? ((newCustomersThisMonth * arpu) / totalMRR) * 100 : 0,
        new_mrr: newCustomersThisMonth * arpu,
        churned_mrr: churnedThisMonth * arpu,
        net_mrr_change: (newCustomersThisMonth - churnedThisMonth) * arpu,
        
        total_paying_customers: totalPayingCustomers,
        new_customers_this_month: newCustomersThisMonth,
        churned_customers_this_month: churnedThisMonth,
        churn_rate: Math.round(churnRate * 10) / 10,
        
        trial_to_paid_rate: Math.round(trialToPaidRate * 10) / 10,
        free_to_paid_rate: Math.round(freeToPaidRate * 10) / 10,
        
        active_rate_daily: Math.round((activeToday / totalUsers) * 100 * 10) / 10,
        active_rate_weekly: Math.round((activeWeek / totalUsers) * 100 * 10) / 10,
        active_rate_monthly: Math.round((activeMonth / totalUsers) * 100 * 10) / 10,
      });

      // Generate revenue over time (last 6 months - simplified)
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        
        // Simulated growth pattern (in production, query actual data)
        const baseMRR = totalMRR * (1 - (i * 0.08));
        months.push({
          month: monthStr,
          mrr: Math.round(baseMRR),
          new_mrr: Math.round(baseMRR * 0.15),
          churned_mrr: Math.round(baseMRR * 0.05),
          net_change: Math.round(baseMRR * 0.10),
        });
      }
      setRevenueOverTime(months);

      // Generate cohort data (simplified)
      const cohorts: CohortData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        
        const baseUsers = Math.floor(Math.random() * 50) + 20;
        cohorts.push({
          cohort_month: monthStr,
          total_users: baseUsers,
          month_1: Math.round(baseUsers * 0.85),
          month_3: Math.round(baseUsers * 0.70),
          month_6: Math.round(baseUsers * 0.55),
          month_12: Math.round(baseUsers * 0.40),
        });
      }
      setCohortData(cohorts);

    } catch (err) {
      console.error('Error fetching KPI metrics:', err);
    } finally {
      setKpiLoading(false);
    }
  }, []);

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'payment_succeeded': return <DollarSign className="h-4 w-4" />;
      case 'trial_started': return <PlayCircle className="h-4 w-4" />;
      case 'trial_ended': return <Clock className="h-4 w-4" />;
      case 'upgrade': return <TrendingUp className="h-4 w-4" />;
      case 'downgrade': 
      case 'downgrade_scheduled': return <ChevronDown className="h-4 w-4" />;
      case 'cancel_scheduled': 
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'reactivated': return <RefreshCw className="h-4 w-4" />;
      case 'payment_failed': return <Ban className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

// Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch dashboard stats on mount
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Auto-load users on mount
  useEffect(() => {
    fetchAllUsers();
  }, []); // Load once on mount

  // Update estimated recipients when selection changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEstimatedRecipients();
    }, 300);
    return () => clearTimeout(timer);
  }, [announcementRecipients, fetchEstimatedRecipients]);

  // Load recent announcements on mount
  useEffect(() => {
    fetchRecentAnnouncements();
  }, []);

  // Reload when filters change (with debounce for search)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAllUsers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [allUsersFilters]);

  // Load users on pagination change
  useEffect(() => {
    fetchAllUsers();
  }, [allUsersPagination.page, allUsersPagination.pageSize]);

  // =====================================================
  // STAT CARD COMPONENT
  // =====================================================

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description, 
    trend,
    color = 'gold',
    subValues
  }: { 
    title: string; 
    value: number | string; 
    icon: any; 
    description?: string;
    trend?: { value: number; label: string };
    color?: 'gold' | 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'cyan';
    subValues?: { label: string; value: number; color?: string }[];
  }) => {
    const colorClasses = {
      gold: 'text-[#C9A646] bg-[#C9A646]/10 border-[#C9A646]/20',
      green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      red: 'text-red-400 bg-red-500/10 border-red-500/20',
      cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    };

    return (
      <Card className="bg-[#0F0F0F] border-[#1A1A1A] hover:border-[#C9A646]/30 transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1 flex-1">
              <p className="text-sm text-[#808080]">{title}</p>
<div className="text-3xl font-bold text-[#F4F4F4]">
  {loading ? <Skeleton className="h-9 w-20" /> : typeof value === 'number' ? value.toLocaleString() : value}
</div>
              {description && (
                <p className="text-xs text-[#606060]">{description}</p>
              )}
              {subValues && subValues.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {subValues.map((sv, idx) => (
                    <span key={idx} className={`text-xs ${sv.color || 'text-[#808080]'}`}>
                      {sv.label}: {sv.value}
                    </span>
                  ))}
                </div>
              )}
              {trend && (
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  <span className="text-xs text-emerald-400">+{trend.value}</span>
                  <span className="text-xs text-[#606060]">{trend.label}</span>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // =====================================================
  // SUBSCRIPTION BREAKDOWN CARD
  // =====================================================

  const SubscriptionBreakdownCard = ({
    title,
    icon: Icon,
    monthly,
    yearly,
    color = 'gold'
  }: {
    title: string;
    icon: any;
    monthly: { total: number; in_trial: number; paid: number };
    yearly: { total: number; paid: number };
    color?: string;
  }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-[#1A1A1A]/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#F4F4F4] flex items-center gap-2">
                  <Icon className="h-5 w-5 text-[#C9A646]" />
                  {title}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Badge className="bg-[#C9A646]/20 text-[#C9A646]">
                    {monthly.total + yearly.total} total
                  </Badge>
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4">
                {/* Monthly */}
                <div className="p-4 bg-[#1A1A1A] rounded-xl">
                  <p className="text-sm font-medium text-[#F4F4F4] mb-3">Monthly</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#808080]">Total</span>
                      <span className="text-[#F4F4F4] font-medium">{monthly.total}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-orange-400">In Trial</span>
                      <span className="text-orange-400">{monthly.in_trial}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-emerald-400">Paid</span>
                      <span className="text-emerald-400">{monthly.paid}</span>
                    </div>
                  </div>
                </div>
                
                {/* Yearly */}
                <div className="p-4 bg-[#1A1A1A] rounded-xl">
                  <p className="text-sm font-medium text-[#F4F4F4] mb-3">Yearly</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#808080]">Total</span>
                      <span className="text-[#F4F4F4] font-medium">{yearly.total}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-emerald-400">Paid</span>
                      <span className="text-emerald-400">{yearly.paid}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  };

  // =====================================================
  // USER LIST TABLE
  // =====================================================

  const UserListTable = ({ 
    users, 
    title,
    loading: listLoading
  }: { 
    users: UserListItem[]; 
    title: string;
    loading?: boolean;
  }) => {
    if (listLoading) {
      return (
        <Card className="bg-[#0F0F0F] border-[#1A1A1A] mt-6">
          <CardHeader>
            <CardTitle className="text-[#F4F4F4] text-lg">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-[#C9A646]" />
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!users || users.length === 0) {
      return (
        <Card className="bg-[#0F0F0F] border-[#1A1A1A] mt-6">
          <CardHeader>
            <CardTitle className="text-[#F4F4F4] text-lg">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#606060] text-sm">No users found</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="bg-[#0F0F0F] border-[#1A1A1A] mt-6">
        <CardHeader>
          <CardTitle className="text-[#F4F4F4] text-lg flex items-center justify-between">
            {title}
            <Badge className="bg-[#C9A646]/20 text-[#C9A646]">{users.length} users</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  <th className="text-left py-3 px-4 text-[#808080] font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-[#808080] font-medium">Name</th>
                  <th className="text-left py-3 px-4 text-[#808080] font-medium">Plan</th>
                  <th className="text-left py-3 px-4 text-[#808080] font-medium">Interval</th>
                  <th className="text-left py-3 px-4 text-[#808080] font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-[#808080] font-medium">Started</th>
                  <th className="text-left py-3 px-4 text-[#808080] font-medium">Expires</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]/50">
                    <td className="py-3 px-4 text-[#F4F4F4]">{user.email}</td>
                    <td className="py-3 px-4 text-[#A0A0A0]">{user.display_name || '—'}</td>
                    <td className="py-3 px-4">
                      <Badge className="bg-[#C9A646]/20 text-[#C9A646] text-xs">
                        {user.plan}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-[#808080] text-xs">
                      {user.billing_interval || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={`text-xs ${
                        user.is_in_trial ? 'bg-orange-500/20 text-orange-400' :
                        user.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                        user.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {user.is_in_trial ? 'Trial' : user.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-[#606060] text-xs">
                      {user.started_at ? new Date(user.started_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-[#606060] text-xs">
                      {user.expires_at ? new Date(user.expires_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  // =====================================================
  // REVENUE CARD
  // =====================================================

  const RevenueCard = () => {
    if (!stats) return null;

    const totalMRR = 
      (stats.revenue.journal_mrr || 0) + 
      (stats.revenue.newsletter_mrr || 0) + 
      (stats.revenue.top_secret_mrr || 0) + 
      (stats.revenue.platform_mrr || 0);
    
    const totalPaidSubscribers = 
      (stats.journal.total_paid || 0) +
      (stats.newsletter.monthly.paid || 0) +
      (stats.top_secret.monthly.paid || 0) +
      (stats.platform.total_subscribers || 0);

    return (
      <Card className="bg-gradient-to-br from-[#0F0F0F] to-[#1A1A1A] border-[#C9A646]/30">
        <CardHeader>
          <CardTitle className="text-[#F4F4F4] flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#C9A646]" />
            Revenue Overview
          </CardTitle>
          <CardDescription className="text-[#808080]">
            Monthly Recurring Revenue (MRR) Estimates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="p-4 bg-[#1A1A1A] rounded-xl text-center">
              <p className="text-2xl font-bold text-[#C9A646]">${totalMRR.toFixed(2)}</p>
              <p className="text-xs text-[#808080] mt-1">Total MRR</p>
            </div>
            <div className="p-4 bg-[#1A1A1A] rounded-xl text-center">
              <p className="text-xl font-bold text-blue-400">${stats.revenue.journal_mrr?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-[#808080] mt-1">Journal</p>
            </div>
            <div className="p-4 bg-[#1A1A1A] rounded-xl text-center">
              <p className="text-xl font-bold text-orange-400">${stats.revenue.newsletter_mrr?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-[#808080] mt-1">War Zone</p>
            </div>
            <div className="p-4 bg-[#1A1A1A] rounded-xl text-center">
              <p className="text-xl font-bold text-purple-400">${stats.revenue.top_secret_mrr?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-[#808080] mt-1">Top Secret</p>
            </div>
            <div className="p-4 bg-[#1A1A1A] rounded-xl text-center">
              <p className="text-xl font-bold text-cyan-400">${stats.revenue.platform_mrr?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-[#808080] mt-1">Platform</p>
            </div>
          </div>
          <div className="p-4 bg-[#C9A646]/10 rounded-xl text-center border border-[#C9A646]/30">
            <p className="text-3xl font-bold text-[#C9A646]">${(totalMRR * 12).toFixed(2)}</p>
            <p className="text-sm text-[#808080] mt-1">Estimated ARR</p>
          </div>
        </CardContent>
      </Card>
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6 lg:p-8">
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-6">
            <p className="text-red-400">Error loading stats: {error}</p>
            <Button onClick={fetchStats} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#F4F4F4] flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-[#C9A646]" />
            Site Dashboard
          </h1>
          <p className="text-[#808080] mt-1">
            Complete overview of all subscriptions and users
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <p className="text-xs text-[#606060]">
              Last updated: {lastUpdated.toLocaleTimeString('en-US')}
            </p>
          )}
          <Button
            onClick={fetchStats}
            disabled={refreshing}
            className="bg-[#C9A646] hover:bg-[#B8953F] text-black"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-[#1A1A1A] border border-[#2A2A2A] flex-wrap">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
            Overview
          </TabsTrigger>
          <TabsTrigger value="all-users" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
            All Users
          </TabsTrigger>
          <TabsTrigger value="kpis" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
            KPIs
          </TabsTrigger>
          <TabsTrigger value="journal" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
            Journal
          </TabsTrigger>
          <TabsTrigger value="newsletter" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
            War Zone
          </TabsTrigger>
          <TabsTrigger value="topsecret" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
            Top Secret
          </TabsTrigger>
          <TabsTrigger value="platform" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
            Platform
          </TabsTrigger>
          <TabsTrigger value="revenue" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
            Revenue
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="announcements" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
            📢 Announcements
          </TabsTrigger>
        </TabsList>

        {/* =====================================================
            OVERVIEW TAB
        ===================================================== */}
        <TabsContent value="overview" className="space-y-6">
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Registered Users"
              value={stats?.overall.total_users || 0}
              icon={Users}
              color="gold"
              description="All users on the site"
            />
            <StatCard
              title="Active Today"
              value={stats?.overall.active_today || 0}
              icon={Activity}
              color="green"
              description="Logged in last 24 hours"
            />
            <StatCard
              title="Active This Week"
              value={stats?.overall.active_this_week || 0}
              icon={Calendar}
              color="blue"
              description="Logged in last 7 days"
            />
            <StatCard
              title="Active This Month"
              value={stats?.overall.active_this_month || 0}
              icon={TrendingUp}
              color="purple"
              description="Logged in last 30 days"
            />
          </div>

          {/* New Users */}
          <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
            <CardHeader>
              <CardTitle className="text-[#F4F4F4] flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#C9A646]" />
                New Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-[#1A1A1A] rounded-xl">
                  <p className="text-4xl font-bold text-emerald-400">
                    {loading ? '—' : stats?.overall.new_users_today || 0}
                  </p>
                  <p className="text-sm text-[#808080] mt-1">Today</p>
                </div>
                <div className="text-center p-4 bg-[#1A1A1A] rounded-xl">
                  <p className="text-4xl font-bold text-blue-400">
                    {loading ? '—' : stats?.overall.new_users_this_week || 0}
                  </p>
                  <p className="text-sm text-[#808080] mt-1">This Week</p>
                </div>
                <div className="text-center p-4 bg-[#1A1A1A] rounded-xl">
                  <p className="text-4xl font-bold text-purple-400">
                    {loading ? '—' : stats?.overall.new_users_this_month || 0}
                  </p>
                  <p className="text-sm text-[#808080] mt-1">This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 🔥 TRIALS SUMMARY - All Products */}
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/30">
            <CardHeader>
              <CardTitle className="text-[#F4F4F4] flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-400" />
                Active Trials
              </CardTitle>
              <CardDescription className="text-[#808080]">
                Users currently in trial period (not yet paid)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-[#1A1A1A] rounded-xl">
                  <p className="text-3xl font-bold text-orange-400">
                    {loading ? '—' : stats?.trials?.total_in_trial || 0}
                  </p>
                  <p className="text-xs text-[#808080] mt-1">Total in Trial</p>
                </div>
                <div className="text-center p-4 bg-[#1A1A1A] rounded-xl">
                  <p className="text-2xl font-bold text-blue-400">
                    {loading ? '—' : stats?.trials?.journal_trial || 0}
                  </p>
                  <p className="text-xs text-[#808080] mt-1">Journal</p>
                </div>
                <div className="text-center p-4 bg-[#1A1A1A] rounded-xl">
                  <p className="text-2xl font-bold text-orange-400">
                    {loading ? '—' : stats?.trials?.newsletter_trial || 0}
                  </p>
                  <p className="text-xs text-[#808080] mt-1">War Zone</p>
                </div>
                <div className="text-center p-4 bg-[#1A1A1A] rounded-xl">
                  <p className="text-2xl font-bold text-purple-400">
                    {loading ? '—' : stats?.trials?.top_secret_trial || 0}
                  </p>
                  <p className="text-xs text-[#808080] mt-1">Top Secret</p>
                </div>
                <div className="text-center p-4 bg-[#1A1A1A] rounded-xl">
                  <p className="text-2xl font-bold text-cyan-400">
                    {loading ? '—' : stats?.trials?.platform_trial || 0}
                  </p>
                  <p className="text-xs text-[#808080] mt-1">Platform</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Summary - All Products */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Journal Subscribers"
              value={stats?.journal.total_subscribers || 0}
              icon={BookOpen}
              color="blue"
              subValues={[
                { label: 'Trial', value: stats?.trials?.journal_trial || 0, color: 'text-orange-400' },
                { label: 'Paid', value: stats?.journal.total_paid || 0, color: 'text-emerald-400' },
                { label: 'Legacy (no Whop)', value: stats?.journal.legacy_no_whop || 0, color: 'text-gray-400' },
              ]}
            />
            <StatCard
              title="War Zone Subscribers"
              value={stats?.newsletter.total_subscribers || 0}
              icon={Newspaper}
              color="orange"
              subValues={[
                { label: 'Trial', value: stats?.newsletter.monthly.in_trial || 0, color: 'text-orange-400' },
                { label: 'Paid', value: stats?.newsletter.monthly.paid || 0, color: 'text-emerald-400' },
                { label: 'TopSecret Discount', value: stats?.newsletter.monthly.top_secret_discount || 0, color: 'text-purple-400' },
              ]}
            />
            <StatCard
              title="Top Secret Subscribers"
              value={stats?.top_secret.total_subscribers || 0}
              icon={Lock}
              color="purple"
              subValues={[
                { label: 'Trial', value: stats?.top_secret.journey.in_trial || 0, color: 'text-orange-400' },
                { label: 'Paid', value: stats?.top_secret.monthly.paid || 0, color: 'text-emerald-400' },
                { label: 'Cancelled', value: stats?.top_secret.cancelled || 0, color: 'text-red-400' },
              ]}
            />
            <StatCard
              title="Platform Subscribers"
              value={stats?.platform.total_subscribers || 0}
              icon={Building2}
              color="cyan"
              subValues={[
                { label: 'Trial', value: stats?.trials?.platform_trial || 0, color: 'text-orange-400' },
                { label: 'Core', value: stats?.platform.core.total || 0 },
                { label: 'Pro', value: stats?.platform.pro.total || 0 },
              ]}
            />
          </div>
        </TabsContent>

        {/* =====================================================
            ALL USERS TAB
        ===================================================== */}
        <TabsContent value="all-users" className="space-y-6">
          {/* Dashboard Stats Cards */}
          {dashboardStats?.success && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <div className="p-4 bg-[#1A1A1A] rounded-xl">
                <p className="text-2xl font-bold text-[#F4F4F4]">{dashboardStats.users.total}</p>
                <p className="text-sm text-[#808080]">Total Users</p>
              </div>
              <div className="p-4 bg-[#1A1A1A] rounded-xl">
                <p className="text-2xl font-bold text-emerald-400">{dashboardStats.users.active_today}</p>
                <p className="text-sm text-[#808080]">Active Today</p>
              </div>
              <div className="p-4 bg-[#1A1A1A] rounded-xl">
                <p className="text-2xl font-bold text-blue-400">{dashboardStats.subscriptions.journal_active}</p>
                <p className="text-sm text-[#808080]">Journal Active</p>
              </div>
              <div className="p-4 bg-[#1A1A1A] rounded-xl">
                <p className="text-2xl font-bold text-orange-400">{dashboardStats.subscriptions.newsletter_active}</p>
                <p className="text-sm text-[#808080]">Newsletter Active</p>
              </div>
              <div className="p-4 bg-[#1A1A1A] rounded-xl">
                <p className="text-2xl font-bold text-purple-400">{dashboardStats.subscriptions.top_secret_active}</p>
                <p className="text-sm text-[#808080]">Top Secret Active</p>
              </div>
              <div className="p-4 bg-[#1A1A1A] rounded-xl">
                <p className="text-2xl font-bold text-red-400">{dashboardStats.users.banned}</p>
                <p className="text-sm text-[#808080]">Banned</p>
              </div>
            </div>
          )}

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardContent className="p-4">
                <p className="text-xs text-[#808080]">Total Users</p>
                <p className="text-2xl font-bold text-[#F4F4F4]">{allUsersPagination.totalCount}</p>
              </CardContent>
            </Card>
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardContent className="p-4">
                <p className="text-xs text-emerald-400">With Whop</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {allUsers.filter(u => u.has_whop).length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardContent className="p-4">
                <p className="text-xs text-blue-400">Premium</p>
                <p className="text-2xl font-bold text-blue-400">
                  {allUsers.filter(u => u.account_type === 'premium').length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardContent className="p-4">
                <p className="text-xs text-orange-400">Basic</p>
                <p className="text-2xl font-bold text-orange-400">
                  {allUsers.filter(u => u.account_type === 'basic').length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardContent className="p-4">
                <p className="text-xs text-[#808080]">Free</p>
                <p className="text-2xl font-bold text-[#808080]">
                  {allUsers.filter(u => !u.account_type || u.account_type === 'free').length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardContent className="p-4">
                <p className="text-xs text-purple-400">Selected</p>
                <p className="text-2xl font-bold text-purple-400">{selectedUsers.size}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Actions */}
          <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Row 1: Search and main filters */}
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#606060]" />
                    <Input
                      placeholder="Search by email or display name..."
                      value={allUsersFilters.search}
                      onChange={(e) => setAllUsersFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10 bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]"
                    />
                  </div>

                  {/* Account Type Filter */}
                  <Select 
                    value={allUsersFilters.accountType} 
                    onValueChange={(v) => setAllUsersFilters(prev => ({ ...prev, accountType: v }))}
                  >
                    <SelectTrigger className="w-[150px] bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]">
                      <SelectValue placeholder="Account Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Status Filter */}
                  <Select 
                    value={allUsersFilters.subscriptionStatus} 
                    onValueChange={(v) => setAllUsersFilters(prev => ({ ...prev, subscriptionStatus: v }))}
                  >
                    <SelectTrigger className="w-[150px] bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]">
                      <SelectValue placeholder="Journal Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Has Whop Filter */}
                  <Select 
                    value={allUsersFilters.hasWhop} 
                    onValueChange={(v) => setAllUsersFilters(prev => ({ ...prev, hasWhop: v }))}
                  >
                    <SelectTrigger className="w-[130px] bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]">
                      <SelectValue placeholder="Has Whop" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Has Whop</SelectItem>
                      <SelectItem value="no">No Whop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Row 2: Product-specific filters */}
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Newsletter Status Filter */}
                  <Select 
                    value={allUsersFilters.newsletterStatus} 
                    onValueChange={(v) => setAllUsersFilters(prev => ({ ...prev, newsletterStatus: v }))}
                  >
                    <SelectTrigger className="w-[160px] bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]">
                      <Newspaper className="h-4 w-4 mr-2 text-orange-400" />
                      <SelectValue placeholder="War Zone" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                      <SelectItem value="all">All War Zone</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Top Secret Status Filter */}
                  <Select 
                    value={allUsersFilters.topSecretStatus} 
                    onValueChange={(v) => setAllUsersFilters(prev => ({ ...prev, topSecretStatus: v }))}
                  >
                    <SelectTrigger className="w-[160px] bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]">
                      <Lock className="h-4 w-4 mr-2 text-purple-400" />
                      <SelectValue placeholder="Top Secret" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                      <SelectItem value="all">All Top Secret</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Platform Plan Filter */}
                  <Select 
                    value={allUsersFilters.platformPlan} 
                    onValueChange={(v) => setAllUsersFilters(prev => ({ ...prev, platformPlan: v }))}
                  >
                    <SelectTrigger className="w-[160px] bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]">
                      <Building2 className="h-4 w-4 mr-2 text-cyan-400" />
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                      <SelectItem value="all">All Platform</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="core">Core</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Sort By */}
                  <Select 
                    value={allUsersFilters.sortBy} 
                    onValueChange={(v) => setAllUsersFilters(prev => ({ ...prev, sortBy: v }))}
                  >
                    <SelectTrigger className="w-[150px] bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                      <SelectItem value="created_at">Created Date</SelectItem>
                      <SelectItem value="last_login_at">Last Login</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="trade_count">Trade Count</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Sort Order */}
                  <Button
                    variant="outline"
                    onClick={() => setAllUsersFilters(prev => ({ 
                      ...prev, 
                      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
                    }))}
                    className="border-[#2A2A2A] text-[#A0A0A0]"
                  >
                    {allUsersFilters.sortOrder === 'asc' ? '↑ Oldest' : '↓ Newest'}
                  </Button>

                  {/* Show Test Users Toggle */}
                  <Button
                    variant={!allUsersFilters.showTestUsers ? 'default' : 'outline'}
                    onClick={() => setAllUsersFilters(prev => ({ ...prev, showTestUsers: !prev.showTestUsers }))}
                    className={!allUsersFilters.showTestUsers ? 'bg-purple-500 text-white' : 'border-[#2A2A2A] text-[#A0A0A0]'}
                  >
                    {allUsersFilters.showTestUsers ? 'Show All' : 'Hide Test Users'}
                  </Button>

                  {/* Clear Filters */}
                  <Button
                    variant="outline"
                    onClick={() => setAllUsersFilters({
                      search: '',
                      accountType: 'all',
                      subscriptionStatus: 'all',
                      hasWhop: 'all',
                      newsletterStatus: 'all',
                      topSecretStatus: 'all',
                      platformPlan: 'all',
                      showTestUsers: true,  // ✅ הצג הכל
                      sortBy: 'created_at',
                      sortOrder: 'desc',
                    })}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#2A2A2A]">
                <Button
                  onClick={fetchAllUsers}
                  disabled={allUsersLoading}
                  className="bg-[#C9A646] hover:bg-[#B8953F] text-black"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${allUsersLoading ? 'animate-spin' : ''}`} />
                  Load Users
                </Button>

                <Button
                  onClick={exportUsersToCSV}
                  disabled={allUsers.length === 0}
                  variant="outline"
                  className="border-[#2A2A2A] text-[#A0A0A0]"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>

                {selectedUsers.size > 0 && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                        >
                          <MoreVertical className="h-4 w-4 mr-2" />
                          Actions ({selectedUsers.size})
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-[#1A1A1A] border-[#2A2A2A] w-56">
                        <DropdownMenuLabel className="text-[#808080]">
                          Bulk Actions for {selectedUsers.size} user(s)
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-[#2A2A2A]" />
                        
                        <DropdownMenuItem 
  onClick={() => handleBanUsers(Array.from(selectedUsers), true)}
  className="text-orange-400 hover:bg-[#2A2A2A] cursor-pointer"
>
  <Ban className="h-4 w-4 mr-2" />
  Ban Users
</DropdownMenuItem>

<DropdownMenuItem 
  onClick={() => handleBanUsers(Array.from(selectedUsers), false)}
  className="text-emerald-400 hover:bg-[#2A2A2A] cursor-pointer"
>
  <Ban className="h-4 w-4 mr-2" />
  Unban Users
</DropdownMenuItem>

                        
                        <DropdownMenuItem 
                          onClick={() => handleCancelSubscriptions(Array.from(selectedUsers))}
                          className="text-yellow-400 hover:bg-[#2A2A2A] cursor-pointer"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel All Subscriptions
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-[#2A2A2A]" />
                        
                        <DropdownMenuItem 
                          onClick={() => setDeleteConfirmDialog({ open: true, users: Array.from(selectedUsers) })}
                          className="text-red-400 hover:bg-[#2A2A2A] cursor-pointer"
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Delete Permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      onClick={() => setSelectedUsers(new Set())}
                      variant="ghost"
                      className="text-[#808080]"
                    >
                      Clear Selection
                    </Button>
                  </>
                )}

                {/* Quick Stats */}
                <div className="ml-auto flex items-center gap-4 text-xs text-[#808080]">
                  <span>Showing {allUsers.length} of {allUsersPagination.totalCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
            <CardHeader>
              <CardTitle className="text-[#F4F4F4] flex items-center justify-between">
                <span>All Users</span>
                <Badge className="bg-[#C9A646]/20 text-[#C9A646]">
                  {allUsersPagination.totalCount} total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allUsersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#C9A646]" />
                </div>
              ) : allUsers.length === 0 ? (
                <div className="text-center py-12 text-[#606060]">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Load Users" to fetch users</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#2A2A2A]">
                          <th className="text-left py-3 px-3 text-[#808080] font-medium sticky left-0 bg-[#0F0F0F] z-10">
  <label className="flex items-center justify-center cursor-pointer group">
    <input
      type="checkbox"
      checked={selectedUsers.size === allUsers.length && allUsers.length > 0}
      onChange={(e) => {
        if (e.target.checked) {
          setSelectedUsers(new Set(allUsers.map(u => u.id)));
        } else {
          setSelectedUsers(new Set());
        }
      }}
      className="sr-only"
    />
    <div className={`
      w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200
      ${selectedUsers.size === allUsers.length && allUsers.length > 0
        ? 'bg-[#C9A646] border-[#C9A646]' 
        : selectedUsers.size > 0 
          ? 'bg-[#C9A646]/50 border-[#C9A646]'
          : 'bg-[#1A1A1A] border-[#3A3A3A] group-hover:border-[#C9A646]/50'
      }
    `}>
      {selectedUsers.size === allUsers.length && allUsers.length > 0 ? (
        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      ) : selectedUsers.size > 0 ? (
        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
        </svg>
      ) : null}
    </div>
  </label>
</th>
                          <th className="text-left py-3 px-4 text-[#808080] font-medium">Email</th>
                          <th className="text-left py-3 px-4 text-[#808080] font-medium">Name</th>
                          <th className="text-left py-3 px-4 text-[#808080] font-medium">
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3 text-blue-400" />
                              Journal
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 text-[#808080] font-medium">Status</th>
                          <th className="text-left py-3 px-4 text-[#808080] font-medium">
                            <div className="flex items-center gap-1">
                              <Newspaper className="h-3 w-3 text-orange-400" />
                              War Zone
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 text-[#808080] font-medium">
                            <div className="flex items-center gap-1">
                              <Lock className="h-3 w-3 text-purple-400" />
                              Top Secret
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 text-[#808080] font-medium">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-cyan-400" />
                              Platform
                            </div>
                          </th>
                          <th className="text-left py-3 px-4 text-[#808080] font-medium">Trades</th>
                          <th className="text-left py-3 px-4 text-[#808080] font-medium">Created</th>
                          <th className="text-left py-3 px-4 text-[#808080] font-medium">Last Login</th>
                          <th className="text-left py-3 px-4 text-[#808080] font-medium">Role</th>
                          <th className="text-right py-3 px-4 text-[#808080] font-medium sticky right-0 bg-[#0F0F0F]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map((user) => (
                          <tr 
                            key={user.id} 
                            className={`border-b border-[#1A1A1A] hover:bg-[#1A1A1A]/50 ${
                              user.is_test_user ? 'bg-purple-500/5' : ''
                            } ${user.is_banned ? 'bg-red-500/5' : ''}`}
                          >
                            <td className="py-3 px-3 sticky left-0 bg-[#0F0F0F] z-10">
  <label className="flex items-center justify-center cursor-pointer group">
    <input
      type="checkbox"
      checked={selectedUsers.has(user.id)}
      onChange={(e) => {
        const newSelected = new Set(selectedUsers);
        if (e.target.checked) {
          newSelected.add(user.id);
        } else {
          newSelected.delete(user.id);
        }
        setSelectedUsers(newSelected);
      }}
      className="sr-only"
    />
    <div className={`
      w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200
      ${selectedUsers.has(user.id)
        ? 'bg-[#C9A646] border-[#C9A646]' 
        : 'bg-[#1A1A1A] border-[#3A3A3A] group-hover:border-[#C9A646]/50'
      }
    `}>
      {selectedUsers.has(user.id) && (
        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  </label>
</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-[#F4F4F4] text-sm">{user.email}</span>
                                {user.is_test_user && (
                                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">Test</Badge>
                                )}
                                {user.is_banned && (
                                  <Badge className="bg-red-500/20 text-red-400 text-xs">Banned</Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-[#A0A0A0]">{user.display_name || '—'}</td>
                            {/* Journal Account Type */}
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-1">
                                <Badge className={`text-xs ${
                                  user.account_type === 'premium' ? 'bg-blue-500/20 text-blue-400' :
                                  user.account_type === 'basic' ? 'bg-cyan-500/20 text-cyan-400' :
                                  user.account_type === 'admin' ? 'bg-red-500/20 text-red-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {user.account_type || 'free'}
                                </Badge>
                                {user.has_whop && (
                                  <span className="text-[10px] text-emerald-400">✓ Whop</span>
                                )}
                              </div>
                            </td>
                            {/* Journal Status */}
                            <td className="py-3 px-4">
                              <Badge className={`text-xs ${
                                user.subscription_status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                                user.subscription_status === 'trial' ? 'bg-orange-500/20 text-orange-400' :
                                user.subscription_status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {user.subscription_status || 'inactive'}
                              </Badge>
                            </td>
                            {/* War Zone (Newsletter) */}
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-1">
                                <Badge className={`text-xs ${
                                  user.newsletter_status === 'active' ? 'bg-orange-500/20 text-orange-400' :
                                  user.newsletter_status === 'trial' ? 'bg-yellow-500/20 text-yellow-400' :
                                  user.newsletter_status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {user.newsletter_status || 'inactive'}
                                </Badge>
                                {user.has_newsletter && user.newsletter_status !== 'inactive' && (
                                  <span className="text-[10px] text-emerald-400">✓ Paid</span>
                                )}
                              </div>
                            </td>
                            {/* Top Secret */}
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-1">
                                <Badge className={`text-xs ${
                                  user.top_secret_status === 'active' ? 'bg-purple-500/20 text-purple-400' :
                                  user.top_secret_status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {user.top_secret_status || 'inactive'}
                                </Badge>
                                {user.has_top_secret && user.top_secret_status === 'active' && (
                                  <span className="text-[10px] text-emerald-400">✓ Paid</span>
                                )}
                              </div>
                            </td>
                            {/* Platform */}
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-1">
                                <Badge className={`text-xs ${
                                  user.platform_plan === 'pro' ? 'bg-purple-500/20 text-purple-400' :
                                  user.platform_plan === 'core' ? 'bg-cyan-500/20 text-cyan-400' :
                                  user.platform_plan === 'enterprise' ? 'bg-[#C9A646]/20 text-[#C9A646]' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {user.platform_plan || 'free'}
                                </Badge>
                                {user.platform_subscription_status === 'active' && (
                                  <span className="text-[10px] text-emerald-400">✓ Active</span>
                                )}
                              </div>
                            </td>
                            {/* Trades */}
                            <td className="py-3 px-4 text-[#C9A646] font-medium">{user.trade_count}</td>
                            {/* Created */}
                            <td className="py-3 px-4 text-[#606060] text-xs">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                            {/* Last Login */}
                            <td className="py-3 px-4 text-[#606060] text-xs">
                              {user.last_login_at 
                                ? new Date(user.last_login_at).toLocaleDateString() 
                                : 'Never'
                              }
                            </td>
                            {/* Role */}
                            <td className="py-3 px-4">
                              <Badge className={`text-xs ${
                                user.role === 'admin' || user.role === 'super_admin' 
                                  ? 'bg-red-500/20 text-red-400' 
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {user.role || 'user'}
                              </Badge>
                            </td>
                            {/* Actions */}
                            <td className="py-3 px-4 text-right sticky right-0 bg-[#0F0F0F]">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-[#808080] hover:text-[#F4F4F4]">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#1A1A1A] border-[#2A2A2A] w-56">
                                  <DropdownMenuLabel className="text-[#808080]">
                                    {user.email}
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator className="bg-[#2A2A2A]" />
                                  
                                  <DropdownMenuItem 
                                    onClick={() => setEditUserDialog({ open: true, user })}
                                    className="text-[#F4F4F4] hover:bg-[#2A2A2A] cursor-pointer"
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit User
                                  </DropdownMenuItem>

                                  <DropdownMenuItem 
                                    onClick={() => handleGetUserStats(user.id)}
                                    className="text-[#F4F4F4] hover:bg-[#2A2A2A] cursor-pointer"
                                  >
                                    <BarChart3 className="h-4 w-4 mr-2" />
                                    View Stats
                                  </DropdownMenuItem>

                                  <DropdownMenuItem 
                                    onClick={() => handleGetUserHistory(user.id)}
                                    className="text-[#F4F4F4] hover:bg-[#2A2A2A] cursor-pointer"
                                  >
                                    <History className="h-4 w-4 mr-2" />
                                    View History
                                  </DropdownMenuItem>

                                  <DropdownMenuItem 
                                    onClick={() => setGrantDialog({ ...grantDialog, open: true, userId: user.id })}
                                    className="text-emerald-400 hover:bg-[#2A2A2A] cursor-pointer"
                                  >
                                    <Gift className="h-4 w-4 mr-2" />
                                    Grant Access
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuItem 
                                    onClick={() => navigator.clipboard.writeText(user.id)}
                                    className="text-[#F4F4F4] hover:bg-[#2A2A2A] cursor-pointer"
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy User ID
                                  </DropdownMenuItem>

                                  <DropdownMenuItem 
                                    onClick={() => navigator.clipboard.writeText(user.email)}
                                    className="text-[#F4F4F4] hover:bg-[#2A2A2A] cursor-pointer"
                                  >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Copy Email
                                  </DropdownMenuItem>

                                  {user.whop_membership_id && (
                                    <DropdownMenuItem 
                                      onClick={() => window.open(`https://whop.com/dashboard/memberships/${user.whop_membership_id}`, '_blank')}
                                      className="text-[#F4F4F4] hover:bg-[#2A2A2A] cursor-pointer"
                                    >
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View in Whop
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator className="bg-[#2A2A2A]" />

                                  <DropdownMenuItem 
                                    onClick={() => handleRevokeAccess(user.id, 'all')}
                                    className="text-orange-400 hover:bg-[#2A2A2A] cursor-pointer"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Revoke All Access
                                  </DropdownMenuItem>

                                  {(user.has_whop || user.has_newsletter || user.has_top_secret) && (
                                    <DropdownMenuItem 
                                      onClick={() => handleCancelSubscriptions([user.id])}
                                      className="text-yellow-400 hover:bg-[#2A2A2A] cursor-pointer"
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Cancel Subscriptions
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuItem 
                                    onClick={() => handleBanUsers([user.id], !user.is_banned)}
                                    className={user.is_banned 
                                      ? "text-emerald-400 hover:bg-[#2A2A2A] cursor-pointer" 
                                      : "text-orange-400 hover:bg-[#2A2A2A] cursor-pointer"
                                    }
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    {user.is_banned ? 'Unban User' : 'Ban User'}
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator className="bg-[#2A2A2A]" />
                                  
                                  <DropdownMenuItem 
                                    onClick={() => setDeleteConfirmDialog({ open: true, users: [user.id] })}
                                    className="text-red-400 hover:bg-[#2A2A2A] cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2A2A2A]">
                    <p className="text-sm text-[#808080]">
                      Page {allUsersPagination.page} of {allUsersPagination.totalPages} ({allUsersPagination.totalCount} users)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={allUsersPagination.page === 1}
                        onClick={() => setAllUsersPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        className="border-[#2A2A2A] text-[#A0A0A0]"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={allUsersPagination.page >= allUsersPagination.totalPages}
                        onClick={() => setAllUsersPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        className="border-[#2A2A2A] text-[#A0A0A0]"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =====================================================
            KPIs & METRICS TAB
        ===================================================== */}
        <TabsContent value="kpis" className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#F4F4F4]">KPIs & Metrics</h2>
              <p className="text-sm text-[#808080]">Key business performance indicators</p>
            </div>
            <Button
              onClick={fetchKPIMetrics}
              disabled={kpiLoading}
              className="bg-[#C9A646] hover:bg-[#B8953F] text-black"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${kpiLoading ? 'animate-spin' : ''}`} />
              Load KPIs
            </Button>
          </div>

          {kpiLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-[#C9A646]" />
            </div>
          ) : kpiMetrics ? (
            <>
              {/* Primary Revenue Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-[#C9A646]/20 to-[#C9A646]/5 border-[#C9A646]/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#C9A646]">MRR</span>
                      <DollarSign className="h-5 w-5 text-[#C9A646]" />
                    </div>
                    <p className="text-3xl font-bold text-[#F4F4F4]">${kpiMetrics.mrr.toFixed(2)}</p>
                    <p className="text-xs text-[#808080] mt-1">Monthly Recurring Revenue</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-emerald-400">ARR</span>
                      <TrendingUp className="h-5 w-5 text-emerald-400" />
                    </div>
                    <p className="text-3xl font-bold text-[#F4F4F4]">${kpiMetrics.arr.toFixed(2)}</p>
                    <p className="text-xs text-[#808080] mt-1">Annual Recurring Revenue</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-blue-400">ARPU</span>
                      <Users className="h-5 w-5 text-blue-400" />
                    </div>
                    <p className="text-3xl font-bold text-[#F4F4F4]">${kpiMetrics.arpu.toFixed(2)}</p>
                    <p className="text-xs text-[#808080] mt-1">Avg Revenue Per User</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-purple-400">LTV</span>
                      <Star className="h-5 w-5 text-purple-400" />
                    </div>
                    <p className="text-3xl font-bold text-[#F4F4F4]">${kpiMetrics.ltv.toFixed(2)}</p>
                    <p className="text-xs text-[#808080] mt-1">Customer Lifetime Value</p>
                  </CardContent>
                </Card>
              </div>

              {/* MRR Movement */}
              <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
                <CardHeader>
                  <CardTitle className="text-[#F4F4F4] flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-[#C9A646]" />
                    MRR Movement (This Month)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <p className="text-sm text-emerald-400">New MRR</p>
                      <p className="text-2xl font-bold text-emerald-400">+${kpiMetrics.new_mrr.toFixed(2)}</p>
                      <p className="text-xs text-[#808080] mt-1">{kpiMetrics.new_customers_this_month} new customers</p>
                    </div>
                    <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                      <p className="text-sm text-red-400">Churned MRR</p>
                      <p className="text-2xl font-bold text-red-400">-${kpiMetrics.churned_mrr.toFixed(2)}</p>
                      <p className="text-xs text-[#808080] mt-1">{kpiMetrics.churned_customers_this_month} churned</p>
                    </div>
                    <div className={`p-4 rounded-xl border ${kpiMetrics.net_mrr_change >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                      <p className={`text-sm ${kpiMetrics.net_mrr_change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>Net Change</p>
                      <p className={`text-2xl font-bold ${kpiMetrics.net_mrr_change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {kpiMetrics.net_mrr_change >= 0 ? '+' : ''}${kpiMetrics.net_mrr_change.toFixed(2)}
                      </p>
                    </div>
                    <div className={`p-4 rounded-xl border ${kpiMetrics.churn_rate <= 5 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                      <p className={`text-sm ${kpiMetrics.churn_rate <= 5 ? 'text-emerald-400' : 'text-orange-400'}`}>Churn Rate</p>
                      <p className={`text-2xl font-bold ${kpiMetrics.churn_rate <= 5 ? 'text-emerald-400' : 'text-orange-400'}`}>
                        {kpiMetrics.churn_rate}%
                      </p>
                      <p className="text-xs text-[#808080] mt-1">Monthly</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Conversion Metrics & Engagement */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Conversion Rates */}
                <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
                  <CardHeader>
                    <CardTitle className="text-[#F4F4F4] flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-400" />
                      Conversion Rates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Trial to Paid */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#A0A0A0]">Trial → Paid</span>
                        <span className="text-[#F4F4F4] font-medium">{kpiMetrics.trial_to_paid_rate}%</span>
                      </div>
                      <div className="h-3 bg-[#1A1A1A] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(kpiMetrics.trial_to_paid_rate, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Free to Paid */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#A0A0A0]">Free → Paid</span>
                        <span className="text-[#F4F4F4] font-medium">{kpiMetrics.free_to_paid_rate}%</span>
                      </div>
                      <div className="h-3 bg-[#1A1A1A] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(kpiMetrics.free_to_paid_rate, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Paying Customers */}
                    <div className="pt-4 border-t border-[#2A2A2A]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#A0A0A0]">Total Paying Customers</span>
                        <Badge className="bg-[#C9A646]/20 text-[#C9A646] text-lg px-3 py-1">
                          {kpiMetrics.total_paying_customers}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* User Engagement */}
                <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
                  <CardHeader>
                    <CardTitle className="text-[#F4F4F4] flex items-center gap-2">
                      <Activity className="h-5 w-5 text-cyan-400" />
                      User Engagement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* DAU Rate */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#A0A0A0]">Daily Active Rate</span>
                        <span className="text-[#F4F4F4] font-medium">{kpiMetrics.active_rate_daily}%</span>
                      </div>
                      <div className="h-3 bg-[#1A1A1A] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(kpiMetrics.active_rate_daily, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* WAU Rate */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#A0A0A0]">Weekly Active Rate</span>
                        <span className="text-[#F4F4F4] font-medium">{kpiMetrics.active_rate_weekly}%</span>
                      </div>
                      <div className="h-3 bg-[#1A1A1A] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(kpiMetrics.active_rate_weekly, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* MAU Rate */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#A0A0A0]">Monthly Active Rate</span>
                        <span className="text-[#F4F4F4] font-medium">{kpiMetrics.active_rate_monthly}%</span>
                      </div>
                      <div className="h-3 bg-[#1A1A1A] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(kpiMetrics.active_rate_monthly, 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Over Time Chart */}
              <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
                <CardHeader>
                  <CardTitle className="text-[#F4F4F4] flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[#C9A646]" />
                    MRR Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {revenueOverTime.map((month, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <span className="text-sm text-[#808080] w-20">{month.month}</span>
                        <div className="flex-1">
                          <div className="h-8 bg-[#1A1A1A] rounded-lg overflow-hidden relative">
                            <div 
                              className="h-full bg-gradient-to-r from-[#C9A646] to-[#E5C76B] rounded-lg transition-all duration-500"
                              style={{ width: `${(month.mrr / Math.max(...revenueOverTime.map(m => m.mrr))) * 100}%` }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-[#F4F4F4]">
                              ${month.mrr}
                            </span>
                          </div>
                        </div>
                        <div className={`text-xs w-16 text-right ${month.net_change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {month.net_change >= 0 ? '+' : ''}{month.net_change}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Cohort Retention Table */}
              <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
                <CardHeader>
                  <CardTitle className="text-[#F4F4F4] flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-400" />
                    Cohort Retention Analysis
                  </CardTitle>
                  <CardDescription className="text-[#808080]">
                    Percentage of users still active after N months
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#2A2A2A]">
                          <th className="text-left py-3 px-4 text-[#808080] font-medium">Cohort</th>
                          <th className="text-center py-3 px-4 text-[#808080] font-medium">Users</th>
                          <th className="text-center py-3 px-4 text-[#808080] font-medium">Month 1</th>
                          <th className="text-center py-3 px-4 text-[#808080] font-medium">Month 3</th>
                          <th className="text-center py-3 px-4 text-[#808080] font-medium">Month 6</th>
                          <th className="text-center py-3 px-4 text-[#808080] font-medium">Month 12</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cohortData.map((cohort, idx) => (
                          <tr key={idx} className="border-b border-[#1A1A1A]">
                            <td className="py-3 px-4 text-[#F4F4F4]">{cohort.cohort_month}</td>
                            <td className="py-3 px-4 text-center text-[#A0A0A0]">{cohort.total_users}</td>
                            <td className="py-3 px-4 text-center">
                              <Badge className={`${
                                (cohort.month_1 / cohort.total_users) >= 0.8 ? 'bg-emerald-500/20 text-emerald-400' :
                                (cohort.month_1 / cohort.total_users) >= 0.6 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {Math.round((cohort.month_1 / cohort.total_users) * 100)}%
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge className={`${
                                (cohort.month_3 / cohort.total_users) >= 0.6 ? 'bg-emerald-500/20 text-emerald-400' :
                                (cohort.month_3 / cohort.total_users) >= 0.4 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {Math.round((cohort.month_3 / cohort.total_users) * 100)}%
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge className={`${
                                (cohort.month_6 / cohort.total_users) >= 0.5 ? 'bg-emerald-500/20 text-emerald-400' :
                                (cohort.month_6 / cohort.total_users) >= 0.3 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {Math.round((cohort.month_6 / cohort.total_users) * 100)}%
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge className={`${
                                (cohort.month_12 / cohort.total_users) >= 0.4 ? 'bg-emerald-500/20 text-emerald-400' :
                                (cohort.month_12 / cohort.total_users) >= 0.25 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {Math.round((cohort.month_12 / cohort.total_users) * 100)}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-20">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-[#606060] opacity-50" />
              <p className="text-[#808080]">Click "Load KPIs" to fetch metrics</p>
            </div>
          )}
        </TabsContent>

        {/* =====================================================
            JOURNAL TAB
        ===================================================== */}
        <TabsContent value="journal" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Total Subscribers"
              value={stats?.journal.total_subscribers || 0}
              icon={BookOpen}
              color="blue"
              description="With Whop membership"
            />
            <StatCard
              title="In Trial"
              value={stats?.trials?.journal_trial || 0}
              icon={Clock}
              color="orange"
              description="14-day free trial"
            />
            <StatCard
              title="Paid (Whop)"
              value={stats?.journal.total_paid || 0}
              icon={DollarSign}
              color="green"
              description="Active paid subscriptions"
            />
            <StatCard
              title="Free Users"
              value={stats?.journal.free || 0}
              icon={Users}
              color="gold"
              description="No subscription"
            />
            <StatCard
              title="Legacy (No Whop)"
              value={stats?.journal.legacy_no_whop || 0}
              icon={Users}
              color="red"
              description="Old users without Whop"
            />
          </div>

          {/* Basic Plan Breakdown */}
          {stats && (
            <SubscriptionBreakdownCard
              title="Basic Plan"
              icon={Users}
              monthly={stats.journal.basic.monthly}
              yearly={stats.journal.basic.yearly}
            />
          )}

          {/* Premium Plan Breakdown */}
          {stats && (
            <SubscriptionBreakdownCard
              title="Premium Plan"
              icon={Crown}
              monthly={stats.journal.premium.monthly}
              yearly={stats.journal.premium.yearly}
            />
          )}

          {/* Load Users Button */}
          <Button 
            onClick={() => fetchUserList('journal', 'all')}
            disabled={loadingUsers === 'journal'}
            className="bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#F4F4F4]"
          >
            {loadingUsers === 'journal' ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
            Load Journal Users
          </Button>

          <UserListTable 
            users={journalUsers} 
            title="Journal Subscribers"
            loading={loadingUsers === 'journal'}
          />
        </TabsContent>

        {/* =====================================================
            NEWSLETTER (WAR ZONE) TAB
        ===================================================== */}
        <TabsContent value="newsletter" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Total Subscribers"
              value={stats?.newsletter.total_subscribers || 0}
              icon={Newspaper}
              color="orange"
              description="Active + Trial"
            />
            <StatCard
              title="In Trial"
              value={stats?.newsletter.monthly.in_trial || 0}
              icon={Clock}
              color="orange"
              description="7-day free trial"
            />
            <StatCard
              title="Paid Monthly"
              value={stats?.newsletter.monthly.paid || 0}
              icon={DollarSign}
              color="green"
              description="$49/month"
            />
            <StatCard
              title="TopSecret Discount"
              value={stats?.newsletter.monthly.top_secret_discount || 0}
              icon={Lock}
              color="purple"
              description="$19.99/month"
            />
            <StatCard
              title="Cancelled"
              value={stats?.newsletter.cancelled || 0}
              icon={Activity}
              color="red"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              title="Cancelled"
              value={stats?.newsletter.cancelled || 0}
              icon={Activity}
              color="red"
            />
            <StatCard
              title="Pending Cancellation"
              value={stats?.newsletter.pending_cancellation || 0}
              icon={Clock}
              color="orange"
              description="Will cancel at period end"
            />
          </div>

          <Button 
            onClick={() => fetchUserList('newsletter', 'all')}
            disabled={loadingUsers === 'newsletter'}
            className="bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#F4F4F4]"
          >
            {loadingUsers === 'newsletter' ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Load War Zone Subscribers
          </Button>

          <UserListTable 
            users={newsletterUsers} 
            title="War Zone Subscribers"
            loading={loadingUsers === 'newsletter'}
          />
        </TabsContent>

        {/* =====================================================
            TOP SECRET TAB
        ===================================================== */}
        <TabsContent value="topsecret" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Total Subscribers"
              value={stats?.top_secret.total_subscribers || 0}
              icon={Lock}
              color="purple"
              description="Active subscriptions"
            />
            <StatCard
              title="In Trial"
              value={stats?.top_secret.journey.in_trial || 0}
              icon={Clock}
              color="orange"
              description="14-day free trial"
            />
            <StatCard
              title="Paid Monthly"
              value={stats?.top_secret.monthly.paid || 0}
              icon={DollarSign}
              color="green"
              description="$35-$70/month"
            />
            <StatCard
              title="Paid Yearly"
              value={stats?.top_secret.yearly.paid || 0}
              icon={Star}
              color="gold"
              description="$500/year"
            />
            <StatCard
              title="Cancelled"
              value={stats?.top_secret.cancelled || 0}
              icon={Activity}
              color="red"
            />
          </div>

          {/* Customer Journey */}
          <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
            <CardHeader>
              <CardTitle className="text-[#F4F4F4] flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#C9A646]" />
                Customer Journey
              </CardTitle>
              <CardDescription className="text-[#808080]">
                14-day trial → Month 1 ($35) → Month 2 ($35) → Full Price ($70)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl text-center">
                  <Badge className="bg-orange-500/20 text-orange-400 mb-2">Trial</Badge>
                  <p className="text-4xl font-bold text-orange-400">
                    {stats?.top_secret.journey.in_trial || 0}
                  </p>
                  <p className="text-xs text-[#808080] mt-1">14-day free</p>
                </div>
                <div className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl text-center">
                  <Badge className="bg-blue-500/20 text-blue-400 mb-2">Month 1</Badge>
                  <p className="text-4xl font-bold text-blue-400">
                    {stats?.top_secret.journey.month_1 || 0}
                  </p>
                  <p className="text-xs text-[#808080] mt-1">$35/mo (50% off)</p>
                </div>
                <div className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl text-center">
                  <Badge className="bg-purple-500/20 text-purple-400 mb-2">Month 2</Badge>
                  <p className="text-4xl font-bold text-purple-400">
                    {stats?.top_secret.journey.month_2 || 0}
                  </p>
                  <p className="text-xs text-[#808080] mt-1">$35/mo (50% off)</p>
                </div>
                <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl text-center">
                  <Badge className="bg-emerald-500/20 text-emerald-400 mb-2">Full Price</Badge>
                  <p className="text-4xl font-bold text-emerald-400">
                    {stats?.top_secret.journey.month_3_plus || 0}
                  </p>
                  <p className="text-xs text-[#808080] mt-1">$70/mo (3+ months)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={() => fetchUserList('top_secret', 'all')}
            disabled={loadingUsers === 'top_secret'}
            className="bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#F4F4F4]"
          >
            {loadingUsers === 'top_secret' ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
            Load Top Secret Subscribers
          </Button>

          <UserListTable 
            users={topSecretUsers} 
            title="Top Secret Subscribers"
            loading={loadingUsers === 'top_secret'}
          />
        </TabsContent>

        {/* =====================================================
            PLATFORM TAB
        ===================================================== */}
        <TabsContent value="platform" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Subscribers"
              value={stats?.platform.total_subscribers || 0}
              icon={Building2}
              color="cyan"
            />
            <StatCard
              title="Core Plan"
              value={stats?.platform.core.total || 0}
              icon={Shield}
              color="blue"
              subValues={[
                { label: 'Monthly', value: stats?.platform.core.monthly.total || 0 },
                { label: 'Yearly', value: stats?.platform.core.yearly.total || 0 },
              ]}
            />
            <StatCard
              title="Pro Plan"
              value={stats?.platform.pro.total || 0}
              icon={Crown}
              color="purple"
              subValues={[
                { label: 'Monthly', value: stats?.platform.pro.monthly.total || 0 },
                { label: 'Yearly', value: stats?.platform.pro.yearly.total || 0 },
              ]}
            />
            <StatCard
              title="Enterprise"
              value={stats?.platform.enterprise.total || 0}
              icon={Building2}
              color="gold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              title="Free Users"
              value={stats?.platform.free || 0}
              icon={Users}
              color="gold"
              description="No platform subscription"
            />
            <StatCard
              title="Pro Trial Eligible"
              value={stats?.platform.pro.trial_eligible || 0}
              icon={Clock}
              color="orange"
              description="Haven't used 14-day Pro trial"
            />
          </div>

          {/* Core Breakdown */}
          {stats && (
            <SubscriptionBreakdownCard
              title="Core Plan ($39/mo)"
              icon={Shield}
              monthly={stats.platform.core.monthly}
              yearly={stats.platform.core.yearly}
            />
          )}

          {/* Pro Breakdown */}
          {stats && (
            <SubscriptionBreakdownCard
              title="Pro Plan ($69/mo)"
              icon={Crown}
              monthly={stats.platform.pro.monthly}
              yearly={stats.platform.pro.yearly}
            />
          )}

          <Button 
            onClick={() => fetchUserList('platform', 'all')}
            disabled={loadingUsers === 'platform'}
            className="bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#F4F4F4]"
          >
            {loadingUsers === 'platform' ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Building2 className="h-4 w-4 mr-2" />}
            Load Platform Subscribers
          </Button>

          <UserListTable 
            users={platformUsers} 
            title="Platform Subscribers"
            loading={loadingUsers === 'platform'}
          />
        </TabsContent>

        {/* =====================================================
            REVENUE TAB
        ===================================================== */}
        <TabsContent value="revenue" className="space-y-6">
          <RevenueCard />
          
          {/* Revenue Distribution Chart Placeholder */}
          <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
            <CardHeader>
              <CardTitle className="text-[#F4F4F4]">Revenue by Product</CardTitle>
            </CardHeader>
            <CardContent>
              {stats && (
                <div className="space-y-4">
                  {/* Journal */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-blue-400">Journal</span>
                      <span className="text-[#F4F4F4]">${stats.revenue.journal_mrr?.toFixed(2) || '0.00'}/mo</span>
                    </div>
                    <Progress 
                      value={stats.revenue.journal_mrr ? (stats.revenue.journal_mrr / ((stats.revenue.journal_mrr || 0) + (stats.revenue.newsletter_mrr || 0) + (stats.revenue.top_secret_mrr || 0) + (stats.revenue.platform_mrr || 0)) * 100) : 0} 
                      className="h-3 bg-[#1A1A1A]"
                    />
                  </div>
                  
                  {/* Newsletter */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-orange-400">War Zone</span>
                      <span className="text-[#F4F4F4]">${stats.revenue.newsletter_mrr?.toFixed(2) || '0.00'}/mo</span>
                    </div>
                    <Progress 
                      value={stats.revenue.newsletter_mrr ? (stats.revenue.newsletter_mrr / ((stats.revenue.journal_mrr || 0) + (stats.revenue.newsletter_mrr || 0) + (stats.revenue.top_secret_mrr || 0) + (stats.revenue.platform_mrr || 0)) * 100) : 0} 
                      className="h-3 bg-[#1A1A1A]"
                    />
                  </div>
                  
                  {/* Top Secret */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-purple-400">Top Secret</span>
                      <span className="text-[#F4F4F4]">${stats.revenue.top_secret_mrr?.toFixed(2) || '0.00'}/mo</span>
                    </div>
                    <Progress 
                      value={stats.revenue.top_secret_mrr ? (stats.revenue.top_secret_mrr / ((stats.revenue.journal_mrr || 0) + (stats.revenue.newsletter_mrr || 0) + (stats.revenue.top_secret_mrr || 0) + (stats.revenue.platform_mrr || 0)) * 100) : 0} 
                      className="h-3 bg-[#1A1A1A]"
                    />
                  </div>
                  
                  {/* Platform */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-cyan-400">Platform</span>
                      <span className="text-[#F4F4F4]">${stats.revenue.platform_mrr?.toFixed(2) || '0.00'}/mo</span>
                    </div>
                    <Progress 
                      value={stats.revenue.platform_mrr ? (stats.revenue.platform_mrr / ((stats.revenue.journal_mrr || 0) + (stats.revenue.newsletter_mrr || 0) + (stats.revenue.top_secret_mrr || 0) + (stats.revenue.platform_mrr || 0)) * 100) : 0} 
                      className="h-3 bg-[#1A1A1A]"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =====================================================
            SUBSCRIPTIONS DEEP DIVE TAB
        ===================================================== */}
        <TabsContent value="subscriptions" className="space-y-6">
          {/* Load Button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#F4F4F4]">Subscriptions Deep Dive</h2>
              <p className="text-sm text-[#808080]">Events timeline, cancellation analysis, and trial metrics</p>
            </div>
            <Button
              onClick={() => { fetchSubscriptionEvents(); fetchDeepDiveAnalysis(); }}
              disabled={deepDiveLoading || subscriptionEventsLoading}
              className="bg-[#C9A646] hover:bg-[#B8953F] text-black"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(deepDiveLoading || subscriptionEventsLoading) ? 'animate-spin' : ''}`} />
              Load Data
            </Button>
          </div>

          {/* Summary Cards */}
          {(cancellationAnalysis || trialAnalysis) && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
                <CardContent className="p-4">
                  <p className="text-xs text-[#808080]">Total Events</p>
                  <p className="text-2xl font-bold text-[#F4F4F4]">{subscriptionEvents.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
                <CardContent className="p-4">
                  <p className="text-xs text-red-400">Cancellations</p>
                  <p className="text-2xl font-bold text-red-400">{cancellationAnalysis?.total_cancellations || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
                <CardContent className="p-4">
                  <p className="text-xs text-emerald-400">Recovery Rate</p>
                  <p className="text-2xl font-bold text-emerald-400">{cancellationAnalysis?.recovery_rate || 0}%</p>
                </CardContent>
              </Card>
              <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
                <CardContent className="p-4">
                  <p className="text-xs text-blue-400">Active Trials</p>
                  <p className="text-2xl font-bold text-blue-400">{trialAnalysis?.total_trials_started || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
                <CardContent className="p-4">
                  <p className="text-xs text-purple-400">Trial → Paid</p>
                  <p className="text-2xl font-bold text-purple-400">{trialAnalysis?.conversion_rate || 0}%</p>
                </CardContent>
              </Card>
              <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
                <CardContent className="p-4">
                  <p className="text-xs text-orange-400">Expiring Soon</p>
                  <p className="text-2xl font-bold text-orange-400">{trialAnalysis?.trials_expiring_soon || 0}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cancellation Analysis */}
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardHeader>
                <CardTitle className="text-[#F4F4F4] flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-400" />
                  Cancellation Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deepDiveLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#C9A646]" />
                  </div>
                ) : cancellationAnalysis ? (
                  <div className="space-y-4">
                    {/* Avg Days Before Cancel */}
                    <div className="p-4 bg-[#1A1A1A] rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#808080]">Avg. Time to Cancel</span>
                        <span className="text-lg font-bold text-[#F4F4F4]">
                          {cancellationAnalysis.avg_days_before_cancel} days
                        </span>
                      </div>
                    </div>

                    {/* Cancellation Reasons */}
                    <div>
                      <p className="text-sm font-medium text-[#A0A0A0] mb-2">Top Reasons</p>
                      <div className="space-y-2">
                        {cancellationAnalysis.cancellation_reasons.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-[#1A1A1A] rounded-lg">
                            <span className="text-sm text-[#F4F4F4]">{item.reason}</span>
                            <Badge className="bg-red-500/20 text-red-400">{item.count}</Badge>
                          </div>
                        ))}
                        {cancellationAnalysis.cancellation_reasons.length === 0 && (
                          <p className="text-sm text-[#606060]">No cancellation data yet</p>
                        )}
                      </div>
                    </div>

                    {/* Cancellations by Plan */}
                    <div>
                      <p className="text-sm font-medium text-[#A0A0A0] mb-2">By Plan</p>
                      <div className="flex flex-wrap gap-2">
                        {cancellationAnalysis.cancellations_by_plan.map((item, idx) => (
                          <Badge key={idx} className="bg-[#1A1A1A] text-[#F4F4F4]">
                            {item.plan}: {item.count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[#606060] text-sm">Click "Load Data" to see analysis</p>
                )}
              </CardContent>
            </Card>

            {/* Trial Analysis */}
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardHeader>
                <CardTitle className="text-[#F4F4F4] flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-400" />
                  Trial Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deepDiveLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#C9A646]" />
                  </div>
                ) : trialAnalysis ? (
                  <div className="space-y-4">
                    {/* Conversion Funnel */}
                    <div className="p-4 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 rounded-xl border border-blue-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[#808080]">Conversion Funnel</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-400">{trialAnalysis.total_trials_started}</p>
                          <p className="text-xs text-[#808080]">Started</p>
                        </div>
                        <ChevronRight className="h-6 w-6 text-[#606060]" />
                        <div className="text-center">
                          <p className="text-2xl font-bold text-emerald-400">{trialAnalysis.total_trials_converted}</p>
                          <p className="text-xs text-[#808080]">Converted</p>
                        </div>
                        <ChevronRight className="h-6 w-6 text-[#606060]" />
                        <div className="text-center">
                          <p className="text-2xl font-bold text-[#C9A646]">{trialAnalysis.conversion_rate}%</p>
                          <p className="text-xs text-[#808080]">Rate</p>
                        </div>
                      </div>
                    </div>

                    {/* Trials by Product */}
                    <div>
                      <p className="text-sm font-medium text-[#A0A0A0] mb-2">Active Trials by Product</p>
                      <div className="space-y-2">
                        {trialAnalysis.trials_by_product.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg">
                            <span className="text-sm text-[#F4F4F4]">{item.product}</span>
                            <div className="flex items-center gap-3">
                              <Badge className="bg-blue-500/20 text-blue-400">{item.started} active</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Expiring Soon Warning */}
                    {trialAnalysis.trials_expiring_soon > 0 && (
                      <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-orange-400" />
                          <span className="text-sm text-orange-400 font-medium">
                            {trialAnalysis.trials_expiring_soon} trials expiring in next 3 days
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[#606060] text-sm">Click "Load Data" to see analysis</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Events Timeline */}
          <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
            <CardHeader>
              <CardTitle className="text-[#F4F4F4] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-[#C9A646]" />
                  Subscription Events Timeline
                </div>
                <Select value={subscriptionEventFilter} onValueChange={setSubscriptionEventFilter}>
                  <SelectTrigger className="w-[180px] bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="payment_succeeded">Payments</SelectItem>
                    <SelectItem value="trial_started">Trial Started</SelectItem>
                    <SelectItem value="trial_ended">Trial Ended</SelectItem>
                    <SelectItem value="upgrade">Upgrades</SelectItem>
                    <SelectItem value="downgrade">Downgrades</SelectItem>
                    <SelectItem value="cancelled">Cancellations</SelectItem>
                    <SelectItem value="reactivated">Reactivations</SelectItem>
                    <SelectItem value="payment_failed">Failed Payments</SelectItem>
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptionEventsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#C9A646]" />
                </div>
              ) : subscriptionEvents.length === 0 ? (
                <div className="text-center py-12 text-[#606060]">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Load Data" to fetch subscription events</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {subscriptionEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className="flex items-start gap-4 p-4 bg-[#1A1A1A] rounded-xl hover:bg-[#1A1A1A]/80 transition-colors"
                    >
                      {/* Event Icon */}
                      <div className={`p-2 rounded-lg ${getEventTypeColor(event.event_type)}`}>
                        {getEventTypeIcon(event.event_type)}
                      </div>

                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getEventTypeColor(event.event_type)}>
                            {event.event_type.replace(/_/g, ' ')}
                          </Badge>
                          {event.old_plan && event.new_plan && (
                            <span className="text-xs text-[#808080]">
                              {event.old_plan} → {event.new_plan}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#F4F4F4] truncate">
                          {event.user_email || 'Unknown user'}
                        </p>
                        {event.reason && (
                          <p className="text-xs text-[#606060] mt-1">Reason: {event.reason}</p>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="text-right">
                        <p className="text-xs text-[#808080]">
                          {new Date(event.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-[#606060]">
                          {new Date(event.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =====================================================
            ANNOUNCEMENTS TAB - EMAIL CAMPAIGNS
        ===================================================== */}
        <TabsContent value="announcements" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#F4F4F4] flex items-center gap-2">
                <Mail className="h-6 w-6 text-[#C9A646]" />
                Email Announcements
              </h2>
              <p className="text-sm text-[#808080]">Send targeted emails to specific user groups</p>
            </div>
          </div>

          {/* Email Composer Card */}
          <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
            <CardHeader>
              <CardTitle className="text-[#F4F4F4]">Compose Announcement</CardTitle>
              <CardDescription className="text-[#808080]">
                Select recipient groups and compose your message
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Recipient Selection */}
              <div className="space-y-4">
                <Label className="text-[#A0A0A0] text-base font-medium">Select Recipients</Label>
                
                {/* Journal Users */}
                <div className="p-4 bg-[#1A1A1A] rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-400" />
                    <span className="text-[#F4F4F4] font-medium">Journal Subscribers</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
<label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
  <input 
    type="checkbox" 
    className="w-4 h-4 accent-[#C9A646]"
    checked={announcementRecipients.journal_all || false}
    onChange={(e) => setAnnouncementRecipients(prev => ({ ...prev, journal_all: e.target.checked }))}
  />
  <span className="text-sm text-[#A0A0A0]">All Journal</span>
</label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-blue-400" />
                      <span className="text-sm text-[#A0A0A0]">Premium</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-cyan-400" />
                      <span className="text-sm text-[#A0A0A0]">Basic</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-gray-400" />
                      <span className="text-sm text-[#A0A0A0]">Free</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-orange-400" />
                      <span className="text-sm text-[#A0A0A0]">In Trial</span>
                    </label>
                  </div>
                </div>

                {/* Newsletter Users */}
                <div className="p-4 bg-[#1A1A1A] rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Newspaper className="h-4 w-4 text-orange-400" />
                    <span className="text-[#F4F4F4] font-medium">War Zone Newsletter</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-[#C9A646]" />
                      <span className="text-sm text-[#A0A0A0]">All Newsletter</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-emerald-400" />
                      <span className="text-sm text-[#A0A0A0]">Active Paid</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-orange-400" />
                      <span className="text-sm text-[#A0A0A0]">In Trial</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-purple-400" />
                      <span className="text-sm text-[#A0A0A0]">TopSecret Discount</span>
                    </label>
                  </div>
                </div>

                {/* Top Secret Users */}
                <div className="p-4 bg-[#1A1A1A] rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-purple-400" />
                    <span className="text-[#F4F4F4] font-medium">Top Secret</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-[#C9A646]" />
                      <span className="text-sm text-[#A0A0A0]">All Top Secret</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-emerald-400" />
                      <span className="text-sm text-[#A0A0A0]">Active Paid</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-orange-400" />
                      <span className="text-sm text-[#A0A0A0]">In Trial</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-blue-400" />
                      <span className="text-sm text-[#A0A0A0]">Month 1-2 (Discounted)</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-[#C9A646]" />
                      <span className="text-sm text-[#A0A0A0]">Month 3+ (Full Price)</span>
                    </label>
                  </div>
                </div>

                {/* Platform Users */}
                <div className="p-4 bg-[#1A1A1A] rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-cyan-400" />
                    <span className="text-[#F4F4F4] font-medium">Platform</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-[#C9A646]" />
                      <span className="text-sm text-[#A0A0A0]">All Platform</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-cyan-400" />
                      <span className="text-sm text-[#A0A0A0]">Core</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-purple-400" />
                      <span className="text-sm text-[#A0A0A0]">Pro</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-[#C9A646]" />
                      <span className="text-sm text-[#A0A0A0]">Enterprise</span>
                    </label>
                  </div>
                </div>

                {/* Special Groups */}
                <div className="p-4 bg-[#1A1A1A] rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#C9A646]" />
                    <span className="text-[#F4F4F4] font-medium">Special Groups</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-[#C9A646]" />
                      <span className="text-sm text-[#A0A0A0]">All Users</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-emerald-400" />
                      <span className="text-sm text-[#A0A0A0]">All Paying</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-orange-400" />
                      <span className="text-sm text-[#A0A0A0]">All Trials</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-red-400" />
                      <span className="text-sm text-[#A0A0A0]">Cancelled (Win-back)</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-blue-400" />
                      <span className="text-sm text-[#A0A0A0]">Active This Week</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                      <input type="checkbox" className="w-4 h-4 accent-gray-400" />
                      <span className="text-sm text-[#A0A0A0]">Inactive 30+ Days</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Estimated Recipients */}
              <div className="p-4 bg-[#C9A646]/10 border border-[#C9A646]/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[#A0A0A0]">Estimated Recipients</span>
<Badge className="bg-[#C9A646]/20 text-[#C9A646] text-lg px-4 py-1">
  {estimatedRecipients.toLocaleString()} users
</Badge>
                </div>
              </div>

              {/* Email Content */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">Subject Line</Label>
                  <Input
                    placeholder="Enter email subject..."
                    className="bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#A0A0A0]">Email Body</Label>
                  <Textarea
                    placeholder="Write your announcement here...

You can use these variables:
{{name}} - User's display name
{{email}} - User's email
{{plan}} - Current subscription plan"
                    className="bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4] min-h-[200px]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#2A2A2A]">
                <Button
                  variant="outline"
                  className="border-[#2A2A2A] text-[#A0A0A0]"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Test Email
                </Button>
                <Button
                  variant="outline"
                  className="border-[#2A2A2A] text-[#A0A0A0]"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule for Later
                </Button>
<Button
  onClick={handleSendTestEmail}
  disabled={sendingAnnouncement || !announcementSubject || !announcementBody}
  variant="outline"
  className="border-[#2A2A2A] text-[#A0A0A0]"
>
  {sendingAnnouncement ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
  Send Test Email
</Button>

<Button
  onClick={handleSendAnnouncement}
  disabled={sendingAnnouncement || !announcementSubject || !announcementBody || estimatedRecipients === 0}
  className="bg-[#C9A646] hover:bg-[#B8953F] text-black flex-1 sm:flex-none"
>
  {sendingAnnouncement ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
  Send Announcement
</Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Announcements */}
          <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
            <CardHeader>
              <CardTitle className="text-[#F4F4F4] flex items-center gap-2">
                <History className="h-5 w-5 text-[#C9A646]" />
                Recent Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-[#606060]">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No announcements sent yet</p>
                <p className="text-sm mt-1">Your sent emails will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* =====================================================
          DIALOGS
      ===================================================== */}
      
      {/* Cancel Dialog */}
      <Dialog 
        open={actionDialog.open && actionDialog.action === 'cancel'} 
        onOpenChange={(open) => !open && setActionDialog({ open: false, action: null, membership: null })}
      >
        <DialogContent className="bg-[#0F0F0F] border-[#2A2A2A]">
          <DialogHeader>
            <DialogTitle className="text-[#F4F4F4]">Cancel Subscription</DialogTitle>
            <DialogDescription className="text-[#808080]">
              Cancel for {actionDialog.membership?.user?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#A0A0A0]">Mode</Label>
              <Select value={cancelMode} onValueChange={(v) => setCancelMode(v as typeof cancelMode)}>
                <SelectTrigger className="bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                  <SelectItem value="at_period_end">At Period End</SelectItem>
                  <SelectItem value="immediate">Immediate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#A0A0A0]">Reason (optional)</Label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, action: null, membership: null })} className="border-[#2A2A2A]">
              Cancel
            </Button>
            <Button onClick={handleAdminCancel} disabled={manageActionLoading === 'cancel'} className="bg-orange-500 hover:bg-orange-600">
              {manageActionLoading === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Cancel Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Dialog */}
      <Dialog 
        open={actionDialog.open && actionDialog.action === 'extend'} 
        onOpenChange={(open) => !open && setActionDialog({ open: false, action: null, membership: null })}
      >
        <DialogContent className="bg-[#0F0F0F] border-[#2A2A2A]">
          <DialogHeader>
            <DialogTitle className="text-[#F4F4F4]">Add Free Days</DialogTitle>
            <DialogDescription className="text-[#808080]">
              Extend for {actionDialog.membership?.user?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#A0A0A0]">Days</Label>
              <Select value={extendDays} onValueChange={setExtendDays}>
                <SelectTrigger className="bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, action: null, membership: null })} className="border-[#2A2A2A]">
              Cancel
            </Button>
            <Button onClick={handleAdminExtend} disabled={manageActionLoading === 'extend'} className="bg-[#C9A646] hover:bg-[#B8953F] text-black">
              {manageActionLoading === 'extend' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
              Add {extendDays} Days
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog 
        open={actionDialog.open && actionDialog.action === 'ban'} 
        onOpenChange={(open) => !open && setActionDialog({ open: false, action: null, membership: null })}
      >
        <DialogContent className="bg-[#0F0F0F] border-[#2A2A2A]">
          <DialogHeader>
            <DialogTitle className="text-[#F4F4F4] flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-400" />
              Ban User
            </DialogTitle>
            <DialogDescription className="text-[#808080]">
              This will cancel and ban {actionDialog.membership?.user?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">Warning: This will immediately revoke access.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[#A0A0A0]">Reason</Label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, action: null, membership: null })} className="border-[#2A2A2A]">
              Cancel
            </Button>
            <Button onClick={handleAdminBan} disabled={manageActionLoading === 'ban'} className="bg-red-500 hover:bg-red-600">
              {manageActionLoading === 'ban' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ENHANCED EDIT USER DIALOG */}
<Dialog 
  open={editUserDialog.open} 
  onOpenChange={(open) => !open && setEditUserDialog({ open: false, user: null })}
>
  <DialogContent className="bg-[#0F0F0F] border-[#2A2A2A] max-w-2xl max-h-[90vh]">
    <DialogHeader>
      <DialogTitle className="text-[#F4F4F4]">Edit User</DialogTitle>
      <DialogDescription className="text-[#808080]">
        {editUserDialog.user?.email}
      </DialogDescription>
    </DialogHeader>
    
    {editUserDialog.user && (
      <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">Display Name</Label>
            <Input
              value={editUserDialog.user.display_name || ''}
              onChange={(e) => setEditUserDialog(prev => ({
                ...prev,
                user: prev.user ? { ...prev.user, display_name: e.target.value } : null
              }))}
              className="bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">Role</Label>
            <Select 
              value={editUserDialog.user.role || 'user'} 
              onValueChange={(v) => setEditUserDialog(prev => ({
                ...prev,
                user: prev.user ? { ...prev.user, role: v } : null
              }))}
            >
              <SelectTrigger className="bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Journal Subscription */}
        <div className="p-4 bg-[#1A1A1A] rounded-xl space-y-4">
          <h4 className="text-[#F4F4F4] font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-400" />
            Journal Subscription
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#A0A0A0]">Account Type</Label>
              <Select 
                value={editUserDialog.user.account_type || 'free'} 
                onValueChange={(v) => setEditUserDialog(prev => ({
                  ...prev,
                  user: prev.user ? { ...prev.user, account_type: v } : null
                }))}
              >
                <SelectTrigger className="bg-[#0F0F0F] border-[#2A2A2A] text-[#F4F4F4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#A0A0A0]">Status</Label>
              <Select 
                value={editUserDialog.user.subscription_status || 'inactive'} 
                onValueChange={(v) => setEditUserDialog(prev => ({
                  ...prev,
                  user: prev.user ? { ...prev.user, subscription_status: v } : null
                }))}
              >
                <SelectTrigger className="bg-[#0F0F0F] border-[#2A2A2A] text-[#F4F4F4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className="p-4 bg-[#1A1A1A] rounded-xl space-y-4">
          <h4 className="text-[#F4F4F4] font-medium flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-orange-400" />
            Newsletter (War Zone)
          </h4>
          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">Status</Label>
            <Select 
              value={editUserDialog.user.newsletter_status || 'inactive'} 
              onValueChange={(v) => setEditUserDialog(prev => ({
                ...prev,
                user: prev.user ? { ...prev.user, newsletter_status: v } : null
              }))}
            >
              <SelectTrigger className="bg-[#0F0F0F] border-[#2A2A2A] text-[#F4F4F4]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Top Secret */}
        <div className="p-4 bg-[#1A1A1A] rounded-xl space-y-4">
          <h4 className="text-[#F4F4F4] font-medium flex items-center gap-2">
            <Lock className="h-4 w-4 text-purple-400" />
            Top Secret
          </h4>
          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">Status</Label>
            <Select 
              value={editUserDialog.user.top_secret_status || 'inactive'} 
              onValueChange={(v) => setEditUserDialog(prev => ({
                ...prev,
                user: prev.user ? { ...prev.user, top_secret_status: v } : null
              }))}
            >
              <SelectTrigger className="bg-[#0F0F0F] border-[#2A2A2A] text-[#F4F4F4]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Platform */}
        <div className="p-4 bg-[#1A1A1A] rounded-xl space-y-4">
          <h4 className="text-[#F4F4F4] font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-cyan-400" />
            Platform
          </h4>
          <div className="space-y-2">
            <Label className="text-[#A0A0A0]">Plan</Label>
            <Select 
              value={editUserDialog.user.platform_plan || 'free'} 
              onValueChange={(v) => setEditUserDialog(prev => ({
                ...prev,
                user: prev.user ? { ...prev.user, platform_plan: v } : null
              }))}
            >
              <SelectTrigger className="bg-[#0F0F0F] border-[#2A2A2A] text-[#F4F4F4]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="core">Core</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ban Status */}
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-400" />
              <span className="text-[#F4F4F4]">User Banned</span>
            </div>
            <Button
              variant={editUserDialog.user.is_banned ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEditUserDialog(prev => ({
                ...prev,
                user: prev.user ? { ...prev.user, is_banned: !prev.user.is_banned } : null
              }))}
              className={editUserDialog.user.is_banned 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'border-red-500/30 text-red-400 hover:bg-red-500/10'
              }
            >
              {editUserDialog.user.is_banned ? 'Banned ✓' : 'Not Banned'}
            </Button>
          </div>
        </div>
      </div>
    )}

    <DialogFooter>
      <Button 
        variant="outline" 
        onClick={() => setEditUserDialog({ open: false, user: null })} 
        className="border-[#2A2A2A]"
      >
        Cancel
      </Button>
      <Button 
        onClick={() => editUserDialog.user && handleUpdateUser(editUserDialog.user.id, editUserDialog.user)} 
        className="bg-[#C9A646] hover:bg-[#B8953F] text-black"
      >
        Save Changes
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>


      {/* =====================================================
          DELETE CONFIRM DIALOG
      ===================================================== */}
      <Dialog 
        open={deleteConfirmDialog.open} 
        onOpenChange={(open) => !open && setDeleteConfirmDialog({ open: false, users: [] })}
      >
        <DialogContent className="bg-[#0F0F0F] border-[#2A2A2A]">
          <DialogHeader>
            <DialogTitle className="text-[#F4F4F4] flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-400" />
              Delete User(s)
            </DialogTitle>
            <DialogDescription className="text-[#808080]">
              Are you sure you want to delete {deleteConfirmDialog.users.length} user(s)?
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">⚠️ This action cannot be undone. All user data will be permanently deleted.</p>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmDialog({ open: false, users: [] })} 
              className="border-[#2A2A2A]"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleDeleteUsers(deleteConfirmDialog.users)} 
              className="bg-red-500 hover:bg-red-600"
            >
              <Ban className="h-4 w-4 mr-2" />
              Delete {deleteConfirmDialog.users.length} User(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================
          GRANT ACCESS DIALOG
      ===================================================== */}
      <Dialog open={grantDialog.open} onOpenChange={(open) => !open && setGrantDialog({ ...grantDialog, open: false })}>
        <DialogContent className="bg-[#0F0F0F] border-[#2A2A2A]">
          <DialogHeader>
            <DialogTitle className="text-[#F4F4F4]">Grant Access</DialogTitle>
            <DialogDescription className="text-[#808080]">
              Manually grant product access to this user
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#A0A0A0]">Product</Label>
              <Select 
                value={grantDialog.product} 
                onValueChange={(v) => setGrantDialog({ ...grantDialog, product: v })}
              >
                <SelectTrigger className="bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                  <SelectItem value="journal">Journal</SelectItem>
                  <SelectItem value="newsletter">Newsletter (War Zone)</SelectItem>
                  <SelectItem value="top_secret">Top Secret</SelectItem>
                  <SelectItem value="platform">Platform</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[#A0A0A0]">Plan</Label>
              <Select 
                value={grantDialog.plan} 
                onValueChange={(v) => setGrantDialog({ ...grantDialog, plan: v })}
              >
                <SelectTrigger className="bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                  {grantDialog.product === 'journal' && (
                    <>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </>
                  )}
                  {grantDialog.product === 'newsletter' && (
                    <SelectItem value="active">Active</SelectItem>
                  )}
                  {grantDialog.product === 'top_secret' && (
                    <SelectItem value="active">Active</SelectItem>
                  )}
                  {grantDialog.product === 'platform' && (
                    <>
                      <SelectItem value="core">Core</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[#A0A0A0]">Duration (days)</Label>
              <Input
                type="number"
                value={grantDialog.days}
                onChange={(e) => setGrantDialog({ ...grantDialog, days: parseInt(e.target.value) || 30 })}
                className="bg-[#1A1A1A] border-[#2A2A2A] text-[#F4F4F4]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialog({ ...grantDialog, open: false })} className="border-[#2A2A2A]">
              Cancel
            </Button>
            <Button onClick={handleGrantAccess} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Gift className="h-4 w-4 mr-2" />
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================
          USER STATS DIALOG
      ===================================================== */}
      <Dialog open={statsDialog.open} onOpenChange={(open) => !open && setStatsDialog({ open: false, userId: null })}>
        <DialogContent className="bg-[#0F0F0F] border-[#2A2A2A] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#F4F4F4]">User Statistics</DialogTitle>
          </DialogHeader>
          
          {userStats && userStats.success && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-[#1A1A1A] rounded-xl">
                <h4 className="text-[#A0A0A0] text-sm mb-3">Trading Activity</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-[#F4F4F4]">{userStats.trading?.total_trades || 0}</p>
                    <p className="text-sm text-[#808080]">Total Trades</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">{userStats.trading?.win_rate || 0}%</p>
                    <p className="text-sm text-[#808080]">Win Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-400">{userStats.trading?.open_trades || 0}</p>
                    <p className="text-sm text-[#808080]">Open</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${(userStats.trading?.total_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${(userStats.trading?.total_pnl || 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-[#808080]">Total P&L</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#1A1A1A] rounded-xl">
                <h4 className="text-[#A0A0A0] text-sm mb-3">Activity</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xl font-bold text-[#F4F4F4]">{userStats.activity?.watchlist_items || 0}</p>
                    <p className="text-sm text-[#808080]">Watchlist Items</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#F4F4F4]">{userStats.activity?.notes_count || 0}</p>
                    <p className="text-sm text-[#808080]">Notes</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#F4F4F4]">{userStats.activity?.account_age_days || 0}</p>
                    <p className="text-sm text-[#808080]">Days Since Signup</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#F4F4F4]">
                      {userStats.activity?.last_login 
                        ? new Date(userStats.activity.last_login).toLocaleDateString() 
                        : 'Never'}
                    </p>
                    <p className="text-sm text-[#808080]">Last Login</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* =====================================================
          USER HISTORY DIALOG
      ===================================================== */}
      <Dialog open={historyDialog.open} onOpenChange={(open) => !open && setHistoryDialog({ open: false, userId: null })}>
        <DialogContent className="bg-[#0F0F0F] border-[#2A2A2A] max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-[#F4F4F4]">User History</DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto">
            {userHistory.length === 0 ? (
              <p className="text-[#808080] text-center py-8">No history found</p>
            ) : (
              <div className="space-y-2">
                {userHistory.map((event, idx) => (
                  <div key={idx} className="p-3 bg-[#1A1A1A] rounded-lg flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      event.event_type?.includes('cancelled') ? 'bg-red-400' :
                      event.event_type?.includes('grant') || event.event_type?.includes('activated') ? 'bg-emerald-400' :
                      event.event_type?.includes('ban') ? 'bg-orange-400' :
                      'bg-blue-400'
                    }`} />
                    <div className="flex-1">
                      <p className="text-[#F4F4F4] font-medium">{event.event_type}</p>
                      {event.old_plan && event.new_plan && (
                        <p className="text-sm text-[#808080]">{event.old_plan} → {event.new_plan}</p>
                      )}
                      {event.reason && (
                        <p className="text-sm text-[#808080]">{event.reason}</p>
                      )}
                      <p className="text-xs text-[#606060] mt-1">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    {/* =====================================================
          TOAST NOTIFICATION
      ===================================================== */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`
            flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border backdrop-blur-sm
            ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : ''}
            ${toast.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-400' : ''}
            ${toast.type === 'warning' ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' : ''}
            ${toast.type === 'info' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : ''}
          `}>
            {/* Icon */}
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center
              ${toast.type === 'success' ? 'bg-emerald-500/30' : ''}
              ${toast.type === 'error' ? 'bg-red-500/30' : ''}
              ${toast.type === 'warning' ? 'bg-orange-500/30' : ''}
              ${toast.type === 'info' ? 'bg-blue-500/30' : ''}
            `}>
              {toast.type === 'success' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.type === 'warning' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            
            {/* Message */}
            <span className="font-medium text-sm">{toast.message}</span>
            
            {/* Close button */}
            <button 
              onClick={() => setToast({ ...toast, show: false })}
              className="ml-2 p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}