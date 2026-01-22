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
  Ban, Link2, Loader2, Copy, ExternalLink
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
  // FETCH COMPREHENSIVE STATS
  // =====================================================

  const fetchStats = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_comprehensive_subscription_stats');

      if (rpcError) {
        console.error('Error fetching stats:', rpcError);
        setError(rpcError.message);
        return;
      }

      setStats(data as ComprehensiveStats);
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

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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
              <p className="text-3xl font-bold text-[#F4F4F4]">
                {loading ? <Skeleton className="h-9 w-20" /> : typeof value === 'number' ? value.toLocaleString() : value}
              </p>
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
          <TabsTrigger value="manage" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
            🔧 Manage
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

          {/* Quick Summary - All Products */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Journal Subscribers"
              value={stats?.journal.total_subscribers || 0}
              icon={BookOpen}
              color="blue"
              subValues={[
                { label: 'Basic', value: stats?.journal.basic.total || 0 },
                { label: 'Premium', value: stats?.journal.premium.total || 0 },
              ]}
            />
            <StatCard
              title="War Zone Subscribers"
              value={stats?.newsletter.total_subscribers || 0}
              icon={Newspaper}
              color="orange"
              subValues={[
                { label: 'Trial', value: stats?.newsletter.monthly.in_trial || 0, color: 'text-orange-400' },
                { label: 'Paid', value: (stats?.newsletter.monthly.paid || 0) + (stats?.newsletter.yearly.paid || 0), color: 'text-emerald-400' },
              ]}
            />
            <StatCard
              title="Top Secret Subscribers"
              value={stats?.top_secret.total_subscribers || 0}
              icon={Lock}
              color="purple"
              subValues={[
                { label: 'Trial', value: stats?.top_secret.journey.in_trial || 0, color: 'text-orange-400' },
                { label: 'Paid', value: (stats?.top_secret.monthly.paid || 0) + (stats?.top_secret.yearly.paid || 0), color: 'text-emerald-400' },
              ]}
            />
            <StatCard
              title="Platform Subscribers"
              value={stats?.platform.total_subscribers || 0}
              icon={Building2}
              color="cyan"
              subValues={[
                { label: 'Core', value: stats?.platform.core.total || 0 },
                { label: 'Pro', value: stats?.platform.pro.total || 0 },
              ]}
            />
          </div>
        </TabsContent>

        {/* =====================================================
            JOURNAL TAB
        ===================================================== */}
        <TabsContent value="journal" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Subscribers"
              value={stats?.journal.total_subscribers || 0}
              icon={BookOpen}
              color="blue"
            />
            <StatCard
              title="In Trial"
              value={stats?.journal.total_in_trial || 0}
              icon={Clock}
              color="orange"
            />
            <StatCard
              title="Paid"
              value={stats?.journal.total_paid || 0}
              icon={DollarSign}
              color="green"
            />
            <StatCard
              title="Free Users"
              value={stats?.journal.free || 0}
              icon={Users}
              color="gold"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Subscribers"
              value={stats?.newsletter.total_subscribers || 0}
              icon={Newspaper}
              color="orange"
            />
            <StatCard
              title="In Trial (7 days)"
              value={stats?.newsletter.monthly.in_trial || 0}
              icon={Clock}
              color="orange"
            />
            <StatCard
              title="Monthly Paid"
              value={stats?.newsletter.monthly.paid || 0}
              icon={DollarSign}
              color="green"
              subValues={[
                { label: 'TopSecret Discount', value: stats?.newsletter.monthly.top_secret_discount || 0, color: 'text-purple-400' }
              ]}
            />
            <StatCard
              title="Yearly Paid"
              value={stats?.newsletter.yearly.paid || 0}
              icon={Star}
              color="gold"
              description="$397/year"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Subscribers"
              value={stats?.top_secret.total_subscribers || 0}
              icon={Lock}
              color="purple"
            />
            <StatCard
              title="Monthly"
              value={stats?.top_secret.monthly.total || 0}
              icon={Calendar}
              color="blue"
              subValues={[
                { label: 'Trial', value: stats?.top_secret.monthly.in_trial || 0, color: 'text-orange-400' },
                { label: 'Paid', value: stats?.top_secret.monthly.paid || 0, color: 'text-emerald-400' },
              ]}
            />
            <StatCard
              title="Yearly"
              value={stats?.top_secret.yearly.total || 0}
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
            MANAGE TAB - WHOP ADMIN
        ===================================================== */}
        <TabsContent value="manage" className="space-y-6">
          {/* Product Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex gap-2">
              <Button
                onClick={() => { setActiveManageProduct('war_zone'); setManageMemberships([]); }}
                variant={activeManageProduct === 'war_zone' ? 'default' : 'outline'}
                className={activeManageProduct === 'war_zone' ? 'bg-[#C9A646] text-black' : 'border-[#2A2A2A] text-[#A0A0A0]'}
              >
                <Newspaper className="h-4 w-4 mr-2" />
                War Zone
              </Button>
              <Button
                onClick={() => { setActiveManageProduct('top_secret'); setManageMemberships([]); }}
                variant={activeManageProduct === 'top_secret' ? 'default' : 'outline'}
                className={activeManageProduct === 'top_secret' ? 'bg-[#C9A646] text-black' : 'border-[#2A2A2A] text-[#A0A0A0]'}
              >
                <Lock className="h-4 w-4 mr-2" />
                Top Secret
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSyncWithWhop}
                disabled={manageLoading}
                variant="outline"
                className="border-[#2A2A2A] text-[#A0A0A0]"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${manageLoading ? 'animate-spin' : ''}`} />
                Sync with Whop
              </Button>
              <Button
                onClick={fetchManageMemberships}
                disabled={manageLoading}
                className="bg-[#C9A646] hover:bg-[#B8953F] text-black"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${manageLoading ? 'animate-spin' : ''}`} />
                Load Members
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {manageMemberships.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
                <CardContent className="p-4">
                  <p className="text-xs text-[#808080]">Total</p>
                  <p className="text-2xl font-bold text-[#F4F4F4]">{manageStats.total}</p>
                </CardContent>
              </Card>
              <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
                <CardContent className="p-4">
                  <p className="text-xs text-emerald-400">Active</p>
                  <p className="text-2xl font-bold text-emerald-400">{manageStats.active}</p>
                </CardContent>
              </Card>
              <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
                <CardContent className="p-4">
                  <p className="text-xs text-blue-400">Trial</p>
                  <p className="text-2xl font-bold text-blue-400">{manageStats.trial}</p>
                </CardContent>
              </Card>
              <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
                <CardContent className="p-4">
                  <p className="text-xs text-orange-400">Cancelling</p>
                  <p className="text-2xl font-bold text-orange-400">{manageStats.cancelling}</p>
                </CardContent>
              </Card>
              <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
                <CardContent className="p-4">
                  <p className="text-xs text-[#C9A646]">Revenue</p>
                  <p className="text-2xl font-bold text-[#C9A646]">${manageStats.totalRevenue.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          {manageMemberships.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#606060]" />
                <Input
                  placeholder="Search by email, name, or ID..."
                  value={manageSearchQuery}
                  onChange={(e) => setManageSearchQuery(e.target.value)}
                  className="pl-10 bg-[#0F0F0F] border-[#2A2A2A] text-[#F4F4F4]"
                />
              </div>
              <Select value={manageStatusFilter} onValueChange={setManageStatusFilter}>
                <SelectTrigger className="w-[180px] bg-[#0F0F0F] border-[#2A2A2A] text-[#F4F4F4]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#2A2A2A]">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="cancelling">Cancelling</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Memberships Table */}
          <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
            <CardHeader>
              <CardTitle className="text-[#F4F4F4] flex items-center justify-between">
                <span>{activeManageProduct === 'war_zone' ? 'War Zone' : 'Top Secret'} Members</span>
                {filteredManageMemberships.length > 0 && (
                  <Badge className="bg-[#C9A646]/20 text-[#C9A646]">{filteredManageMemberships.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {manageLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#C9A646]" />
                </div>
              ) : manageMemberships.length === 0 ? (
                <div className="text-center py-12 text-[#606060]">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Load Members" to fetch from Whop</p>
                </div>
              ) : filteredManageMemberships.length === 0 ? (
                <div className="text-center py-12 text-[#606060]">
                  <p>No members match your filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2A2A2A]">
                        <th className="text-left py-3 px-4 text-[#808080] font-medium">User</th>
                        <th className="text-left py-3 px-4 text-[#808080] font-medium">Email</th>
                        <th className="text-left py-3 px-4 text-[#808080] font-medium">Status</th>
                        <th className="text-left py-3 px-4 text-[#808080] font-medium">Created</th>
                        <th className="text-left py-3 px-4 text-[#808080] font-medium">Expires</th>
                        <th className="text-left py-3 px-4 text-[#808080] font-medium">Spent</th>
                        <th className="text-right py-3 px-4 text-[#808080] font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredManageMemberships.map((membership) => (
                        <tr key={membership.id} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#C9A646]/20 flex items-center justify-center">
                                <span className="text-xs text-[#C9A646] font-medium">
                                  {(membership.display_name || membership.user?.email || 'U')[0].toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-[#F4F4F4] font-medium text-sm">
                                  {membership.display_name || membership.user?.username || 'Unknown'}
                                </p>
                                <p className="text-xs text-[#606060]">{membership.id.slice(0, 10)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#F4F4F4] text-sm">{membership.user?.email || '—'}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              {getManageStatusBadge(membership)}
                              {getManageTrialStatus(membership) && (
                                <span className="text-xs text-orange-400">{getManageTrialStatus(membership)}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#808080] text-sm">{formatManageDate(membership.created_at)}</td>
                          <td className="py-3 px-4 text-[#808080] text-sm">
                            {membership.renewal_period_end ? formatManageDate(membership.renewal_period_end) : '—'}
                          </td>
                          <td className="py-3 px-4 text-[#C9A646] font-medium">${(membership.total_payments || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  disabled={manageActionLoading === membership.id}
                                  className="text-[#808080] hover:text-[#F4F4F4]"
                                >
                                  {manageActionLoading === membership.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreVertical className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[#1A1A1A] border-[#2A2A2A] w-48">
                                <DropdownMenuLabel className="text-[#808080]">Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-[#2A2A2A]" />
                                
                                <DropdownMenuItem 
                                  onClick={() => handleGenerateTransferLink(membership)}
                                  className="text-[#F4F4F4] hover:bg-[#2A2A2A] cursor-pointer"
                                >
                                  <Link2 className="h-4 w-4 mr-2" />
                                  Transfer Link
                                </DropdownMenuItem>

                                {membership.license_key && (
                                  <DropdownMenuItem 
                                    onClick={() => handleCopyLicenseKey(membership)}
                                    className="text-[#F4F4F4] hover:bg-[#2A2A2A] cursor-pointer"
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy License
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator className="bg-[#2A2A2A]" />

                                <DropdownMenuItem 
                                  onClick={() => setActionDialog({ open: true, action: 'extend', membership })}
                                  className="text-[#F4F4F4] hover:bg-[#2A2A2A] cursor-pointer"
                                >
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Add Free Days
                                </DropdownMenuItem>

                                {membership.cancel_at_period_end && (
                                  <DropdownMenuItem 
                                    onClick={() => handleAdminResume(membership)}
                                    className="text-emerald-400 hover:bg-[#2A2A2A] cursor-pointer"
                                  >
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    Resume
                                  </DropdownMenuItem>
                                )}

                                {membership.valid && !membership.cancel_at_period_end && (
                                  <DropdownMenuItem 
                                    onClick={() => setActionDialog({ open: true, action: 'cancel', membership })}
                                    className="text-orange-400 hover:bg-[#2A2A2A] cursor-pointer"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator className="bg-[#2A2A2A]" />

                                <DropdownMenuItem 
                                  onClick={() => setActionDialog({ open: true, action: 'ban', membership })}
                                  className="text-red-400 hover:bg-[#2A2A2A] cursor-pointer"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Ban User
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="bg-[#2A2A2A]" />

                                <DropdownMenuItem 
                                  onClick={() => window.open(`https://whop.com/dashboard/memberships/${membership.id}`, '_blank')}
                                  className="text-[#808080] hover:bg-[#2A2A2A] cursor-pointer"
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Open in Whop
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
    </div>
  );
}