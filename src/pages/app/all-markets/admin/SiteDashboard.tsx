// src/pages/app/all-markets/admin/SiteDashboard.tsx
// =====================================================
// 🔥 SITE DASHBOARD - ADMIN ONLY (FIXED v2.0.0)
// =====================================================
// Comprehensive statistics dashboard for:
// - Journal subscriptions (Basic, Premium, Trial)
// - Top Secret subscriptions (Trial, Month 1, Month 2, Full)
// - Total registered users
// 
// 🔥 DB COLUMNS USED:
// - last_login_at (NOT last_sign_in_at)
// - account_type: 'basic' | 'premium' | null
// - subscription_status: 'active' | 'expired' | 'cancelled' | null
// - is_in_trial: boolean
// - top_secret_enabled: boolean
// - top_secret_status: 'active' | 'inactive' | 'cancelled'
// - top_secret_is_in_trial: boolean
// - top_secret_trial_ends_at: timestamp
// - top_secret_started_at: timestamp
// - top_secret_cancel_at_period_end: boolean
// =====================================================

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, Users, Crown, Shield, TrendingUp, 
  Calendar, DollarSign, Activity, RefreshCw,
  BookOpen, Lock, Star, Zap, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// =====================================================
// TYPES
// =====================================================

interface JournalStats {
  totalUsers: number;
  basicUsers: number;
  basicTrial: number;
  basicPaid: number;
  premiumUsers: number;
  premiumTrial: number;
  premiumPaid: number;
  freeUsers: number;
}

interface TopSecretStats {
  totalRegistered: number;
  totalSubscribers: number;
  inTrial: number;
  month1: number;
  month2: number;
  fullSubscribers: number;
  cancelled: number;
}

interface OverallStats {
  totalSiteUsers: number;
  activeToday: number;
  activeThisWeek: number;
  activeThisMonth: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

// =====================================================
// COMPONENT
// =====================================================

export default function SiteDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [journalStats, setJournalStats] = useState<JournalStats>({
    totalUsers: 0,
    basicUsers: 0,
    basicTrial: 0,
    basicPaid: 0,
    premiumUsers: 0,
    premiumTrial: 0,
    premiumPaid: 0,
    freeUsers: 0,
  });
  const [topSecretStats, setTopSecretStats] = useState<TopSecretStats>({
    totalRegistered: 0,
    totalSubscribers: 0,
    inTrial: 0,
    month1: 0,
    month2: 0,
    fullSubscribers: 0,
    cancelled: 0,
  });
  const [overallStats, setOverallStats] = useState<OverallStats>({
    totalSiteUsers: 0,
    activeToday: 0,
    activeThisWeek: 0,
    activeThisMonth: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // =====================================================
  // FETCH STATS
  // =====================================================

  const fetchAllStats = async () => {
    try {
      setRefreshing(true);

      // Dates for calculations
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(todayStart);
      monthStart.setDate(monthStart.getDate() - 30);
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const twoMonthsAgo = new Date(now);
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      // =====================================================
      // FETCH OVERALL STATS
      // =====================================================

      // Total users (excluding deleted/banned)
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .or('is_banned.eq.false,is_banned.is.null');

      // Active today (using last_login_at - the actual column name)
      const { count: activeToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('last_login_at', todayStart.toISOString());

      // Active this week
      const { count: activeThisWeek } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('last_login_at', weekStart.toISOString());

      // Active this month
      const { count: activeThisMonth } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('last_login_at', monthStart.toISOString());

      // New users today
      const { count: newUsersToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('created_at', todayStart.toISOString());

      // New users this week
      const { count: newUsersThisWeek } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('created_at', weekStart.toISOString());

      // New users this month
      const { count: newUsersThisMonth } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('created_at', monthStart.toISOString());

      setOverallStats({
        totalSiteUsers: totalUsers || 0,
        activeToday: activeToday || 0,
        activeThisWeek: activeThisWeek || 0,
        activeThisMonth: activeThisMonth || 0,
        newUsersToday: newUsersToday || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
      });

      // =====================================================
      // FETCH JOURNAL STATS
      // Using actual DB columns: account_type, subscription_status, is_in_trial
      // =====================================================

      // Basic users total (account_type = 'basic')
      const { count: basicTotal } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('account_type', 'basic');

      // Basic users in trial (account_type = 'basic' AND is_in_trial = true)
      const { count: basicTrial } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('account_type', 'basic')
        .eq('is_in_trial', true);

      // Basic users paid (account_type = 'basic', NOT in trial, subscription active)
      const { count: basicPaid } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('account_type', 'basic')
        .or('is_in_trial.eq.false,is_in_trial.is.null')
        .eq('subscription_status', 'active');

      // Premium users total (account_type = 'premium')
      const { count: premiumTotal } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('account_type', 'premium');

      // Premium users in trial
      const { count: premiumTrial } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('account_type', 'premium')
        .eq('is_in_trial', true);

      // Premium users paid
      const { count: premiumPaid } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('account_type', 'premium')
        .or('is_in_trial.eq.false,is_in_trial.is.null')
        .eq('subscription_status', 'active');

      // Free users (no account_type OR account_type is null/free, no active subscription)
      const { count: freeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .or('account_type.is.null,account_type.eq.free')
        .or('subscription_status.is.null,subscription_status.neq.active');

      setJournalStats({
        totalUsers: totalUsers || 0,
        basicUsers: basicTotal || 0,
        basicTrial: basicTrial || 0,
        basicPaid: basicPaid || 0,
        premiumUsers: premiumTotal || 0,
        premiumTrial: premiumTrial || 0,
        premiumPaid: premiumPaid || 0,
        freeUsers: freeUsers || 0,
      });

      // =====================================================
      // FETCH TOP SECRET STATS (FIXED!)
      // Using: top_secret_enabled, top_secret_status, 
      // top_secret_is_in_trial, top_secret_started_at
      // =====================================================

      // Total Top Secret subscribers (top_secret_status = 'active')
      // 🔥 FIX: Changed from AND to just checking status
      const { count: topSecretTotal } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('top_secret_status', 'active');

      // Top Secret in trial
      // 🔥 FIX: Use top_secret_is_in_trial OR check if started recently with $0 payment
      const { count: topSecretTrial } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('top_secret_status', 'active')
        .eq('top_secret_is_in_trial', true);

      // 🔥 ALTERNATIVE: If top_secret_is_in_trial isn't set, calculate from start date
      // Trial = started within last 14 days
      let finalTrialCount = topSecretTrial || 0;
      
      if (finalTrialCount === 0) {
        const trialCutoff = new Date();
        trialCutoff.setDate(trialCutoff.getDate() - 14);
        
        const { count: recentStarters } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .eq('top_secret_status', 'active')
          .gte('top_secret_started_at', trialCutoff.toISOString());
        
        finalTrialCount = recentStarters || 0;
      }

      // Top Secret Month 1 (started 14-44 days ago, not in trial)
      const month1Start = new Date(now);
      month1Start.setDate(month1Start.getDate() - 44); // ~1.5 months
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() - 14);

      const { count: topSecretMonth1 } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('top_secret_status', 'active')
        .or('top_secret_is_in_trial.eq.false,top_secret_is_in_trial.is.null')
        .lt('top_secret_started_at', trialEnd.toISOString())
        .gte('top_secret_started_at', oneMonthAgo.toISOString());

      // Top Secret Month 2 (started 1-2 months ago)
      const { count: topSecretMonth2 } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('top_secret_status', 'active')
        .or('top_secret_is_in_trial.eq.false,top_secret_is_in_trial.is.null')
        .lt('top_secret_started_at', oneMonthAgo.toISOString())
        .gte('top_secret_started_at', twoMonthsAgo.toISOString());

      // Top Secret Full subscribers (more than 2 months)
      const { count: topSecretFull } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('top_secret_status', 'active')
        .or('top_secret_is_in_trial.eq.false,top_secret_is_in_trial.is.null')
        .lt('top_secret_started_at', twoMonthsAgo.toISOString());

      // Top Secret cancelled
      const { count: topSecretCancelled } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('top_secret_status', 'cancelled');

      // 🔥 DEBUG LOG
      console.log('Top Secret Stats:', {
        topSecretTotal,
        finalTrialCount,
        topSecretMonth1,
        topSecretMonth2,
        topSecretFull,
        topSecretCancelled
      });

      setTopSecretStats({
        totalRegistered: totalUsers || 0,
        totalSubscribers: topSecretTotal || 0,
        inTrial: finalTrialCount,
        month1: topSecretMonth1 || 0,
        month2: topSecretMonth2 || 0,
        fullSubscribers: topSecretFull || 0,
        cancelled: topSecretCancelled || 0,
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllStats();
  }, []);

  // =====================================================
  // STAT CARD COMPONENT
  // =====================================================

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description, 
    trend,
    color = 'gold'
  }: { 
    title: string; 
    value: number | string; 
    icon: any; 
    description?: string;
    trend?: { value: number; label: string };
    color?: 'gold' | 'green' | 'blue' | 'purple' | 'orange' | 'red';
  }) => {
    const colorClasses = {
      gold: 'text-[#C9A646] bg-[#C9A646]/10 border-[#C9A646]/20',
      green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      red: 'text-red-400 bg-red-500/10 border-red-500/20',
    };

    return (
      <Card className="bg-[#0F0F0F] border-[#1A1A1A] hover:border-[#C9A646]/30 transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-[#808080]">{title}</p>
              <p className="text-3xl font-bold text-[#F4F4F4]">
                {loading ? <Skeleton className="h-9 w-20" /> : value.toLocaleString()}
              </p>
              {description && (
                <p className="text-xs text-[#606060]">{description}</p>
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
  // RENDER
  // =====================================================

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
            onClick={fetchAllStats}
            disabled={refreshing}
            className="bg-[#C9A646] hover:bg-[#B8953F] text-black"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-[#1A1A1A] border border-[#2A2A2A]">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
            Overview
          </TabsTrigger>
          <TabsTrigger value="journal" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
            Journal
          </TabsTrigger>
          <TabsTrigger value="topsecret" className="data-[state=active]:bg-[#C9A646] data-[state=active]:text-black">
            Top Secret
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
              value={overallStats.totalSiteUsers}
              icon={Users}
              color="gold"
              description="All users on the site"
            />
            <StatCard
              title="Active Today"
              value={overallStats.activeToday}
              icon={Activity}
              color="green"
              description="Logged in last 24 hours"
            />
            <StatCard
              title="Active This Week"
              value={overallStats.activeThisWeek}
              icon={Calendar}
              color="blue"
              description="Logged in last 7 days"
            />
            <StatCard
              title="Active This Month"
              value={overallStats.activeThisMonth}
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
                    {loading ? '—' : overallStats.newUsersToday}
                  </p>
                  <p className="text-sm text-[#808080] mt-1">Today</p>
                </div>
                <div className="text-center p-4 bg-[#1A1A1A] rounded-xl">
                  <p className="text-4xl font-bold text-blue-400">
                    {loading ? '—' : overallStats.newUsersThisWeek}
                  </p>
                  <p className="text-sm text-[#808080] mt-1">This Week</p>
                </div>
                <div className="text-center p-4 bg-[#1A1A1A] rounded-xl">
                  <p className="text-4xl font-bold text-purple-400">
                    {loading ? '—' : overallStats.newUsersThisMonth}
                  </p>
                  <p className="text-sm text-[#808080] mt-1">This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Journal Summary */}
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardHeader>
                <CardTitle className="text-[#F4F4F4] flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[#C9A646]" />
                  Journal - Quick Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[#808080]">Basic (incl. Trial)</span>
                  <Badge className="bg-blue-500/20 text-blue-400">
                    {journalStats.basicUsers}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#808080]">Premium (incl. Trial)</span>
                  <Badge className="bg-purple-500/20 text-purple-400">
                    {journalStats.premiumUsers}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#808080]">Free Users</span>
                  <Badge className="bg-gray-500/20 text-gray-400">
                    {journalStats.freeUsers}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Top Secret Summary */}
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardHeader>
                <CardTitle className="text-[#F4F4F4] flex items-center gap-2">
                  <Lock className="h-5 w-5 text-[#C9A646]" />
                  Top Secret - Quick Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[#808080]">Total Subscribers</span>
                  <Badge className="bg-[#C9A646]/20 text-[#C9A646]">
                    {topSecretStats.totalSubscribers}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#808080]">In Trial</span>
                  <Badge className="bg-orange-500/20 text-orange-400">
                    {topSecretStats.inTrial}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#808080]">Paying Subscribers</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400">
                    {topSecretStats.month1 + topSecretStats.month2 + topSecretStats.fullSubscribers}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* =====================================================
            JOURNAL TAB
        ===================================================== */}
        <TabsContent value="journal" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Basic - Total"
              value={journalStats.basicUsers}
              icon={Users}
              color="blue"
              description="All Basic users"
            />
            <StatCard
              title="Basic - 14 Day Trial"
              value={journalStats.basicTrial}
              icon={Clock}
              color="orange"
              description="In trial period"
            />
            <StatCard
              title="Basic - Paying"
              value={journalStats.basicPaid}
              icon={DollarSign}
              color="green"
              description="Not in trial, active subscription"
            />
            <StatCard
              title="Free Users"
              value={journalStats.freeUsers}
              icon={Users}
              color="gold"
              description="No subscription"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Premium - Total"
              value={journalStats.premiumUsers}
              icon={Crown}
              color="purple"
              description="All Premium users"
            />
            <StatCard
              title="Premium - Trial"
              value={journalStats.premiumTrial}
              icon={Clock}
              color="orange"
              description="In trial period"
            />
            <StatCard
              title="Premium - Paying"
              value={journalStats.premiumPaid}
              icon={Star}
              color="green"
              description="Active paid subscription"
            />
          </div>

          {/* Breakdown Card */}
          <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
            <CardHeader>
              <CardTitle className="text-[#F4F4F4]">Journal Subscription Breakdown</CardTitle>
              <CardDescription className="text-[#808080]">
                Distribution of subscription types in the trading journal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#808080]">Basic</span>
                  <span className="text-[#F4F4F4]">
                    {journalStats.basicUsers} ({journalStats.totalUsers > 0 
                      ? Math.round((journalStats.basicUsers / journalStats.totalUsers) * 100) 
                      : 0}%)
                  </span>
                </div>
                <Progress 
                  value={journalStats.totalUsers > 0 
                    ? (journalStats.basicUsers / journalStats.totalUsers) * 100 
                    : 0
                  } 
                  className="h-2 bg-[#1A1A1A]"
                />
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-orange-400">Trial: {journalStats.basicTrial}</span>
                  <span className="text-emerald-400">Paid: {journalStats.basicPaid}</span>
                </div>
              </div>

              {/* Premium Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#808080]">Premium</span>
                  <span className="text-[#F4F4F4]">
                    {journalStats.premiumUsers} ({journalStats.totalUsers > 0 
                      ? Math.round((journalStats.premiumUsers / journalStats.totalUsers) * 100) 
                      : 0}%)
                  </span>
                </div>
                <Progress 
                  value={journalStats.totalUsers > 0 
                    ? (journalStats.premiumUsers / journalStats.totalUsers) * 100 
                    : 0
                  } 
                  className="h-2 bg-[#1A1A1A]"
                />
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-orange-400">Trial: {journalStats.premiumTrial}</span>
                  <span className="text-emerald-400">Paid: {journalStats.premiumPaid}</span>
                </div>
              </div>

              {/* Free Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#808080]">Free (no subscription)</span>
                  <span className="text-[#F4F4F4]">
                    {journalStats.freeUsers} ({journalStats.totalUsers > 0 
                      ? Math.round((journalStats.freeUsers / journalStats.totalUsers) * 100) 
                      : 0}%)
                  </span>
                </div>
                <Progress 
                  value={journalStats.totalUsers > 0 
                    ? (journalStats.freeUsers / journalStats.totalUsers) * 100 
                    : 0
                  } 
                  className="h-2 bg-[#1A1A1A]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =====================================================
            TOP SECRET TAB (FIXED!)
        ===================================================== */}
        <TabsContent value="topsecret" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Site Users"
              value={topSecretStats.totalRegistered}
              icon={Users}
              color="gold"
              description="All users on the site"
            />
            <StatCard
              title="Top Secret Subscribers"
              value={topSecretStats.totalSubscribers}
              icon={Lock}
              color="purple"
              description="All active subscribers"
            />
            <StatCard
              title="In Trial (14 days)"
              value={topSecretStats.inTrial}
              icon={Clock}
              color="orange"
              description="Free trial period"
            />
            <StatCard
              title="Cancelled"
              value={topSecretStats.cancelled}
              icon={Activity}
              color="red"
              description="Subscription ended"
            />
          </div>

          {/* Subscription Journey */}
          <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
            <CardHeader>
              <CardTitle className="text-[#F4F4F4] flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#C9A646]" />
                Subscriber Journey - Top Secret
              </CardTitle>
              <CardDescription className="text-[#808080]">
                Subscriber distribution by customer journey stage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Trial */}
                <div className="relative p-6 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl text-center">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0F0F0F] px-2">
                    <Badge className="bg-orange-500/20 text-orange-400">Trial</Badge>
                  </div>
                  <p className="text-5xl font-bold text-orange-400 mt-2">
                    {loading ? '—' : topSecretStats.inTrial}
                  </p>
                  <p className="text-sm text-[#808080] mt-2">14-day free trial</p>
                </div>

                {/* Month 1 */}
                <div className="relative p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl text-center">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0F0F0F] px-2">
                    <Badge className="bg-blue-500/20 text-blue-400">Month 1</Badge>
                  </div>
                  <p className="text-5xl font-bold text-blue-400 mt-2">
                    {loading ? '—' : topSecretStats.month1}
                  </p>
                  <p className="text-sm text-[#808080] mt-2">First paid month</p>
                </div>

                {/* Month 2 */}
                <div className="relative p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl text-center">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0F0F0F] px-2">
                    <Badge className="bg-purple-500/20 text-purple-400">Month 2</Badge>
                  </div>
                  <p className="text-5xl font-bold text-purple-400 mt-2">
                    {loading ? '—' : topSecretStats.month2}
                  </p>
                  <p className="text-sm text-[#808080] mt-2">Second paid month</p>
                </div>

                {/* Full Subscribers */}
                <div className="relative p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl text-center">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0F0F0F] px-2">
                    <Badge className="bg-emerald-500/20 text-emerald-400">Full Sub</Badge>
                  </div>
                  <p className="text-5xl font-bold text-emerald-400 mt-2">
                    {loading ? '—' : topSecretStats.fullSubscribers}
                  </p>
                  <p className="text-sm text-[#808080] mt-2">3+ months</p>
                </div>
              </div>

              {/* Funnel Visualization */}
              <div className="mt-8 p-4 bg-[#1A1A1A] rounded-xl">
                <p className="text-sm text-[#808080] mb-4 text-center">Customer Journey Funnel</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-16 bg-orange-500/20 rounded-t-lg flex items-center justify-center">
                      <span className="text-orange-400 font-bold">{topSecretStats.inTrial}</span>
                    </div>
                    <span className="text-xs text-[#606060] mt-1">Trial</span>
                  </div>
                  <span className="text-[#404040]">→</span>
                  <div className="flex flex-col items-center">
                    <div className="w-28 h-14 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-blue-400 font-bold">{topSecretStats.month1}</span>
                    </div>
                    <span className="text-xs text-[#606060] mt-1">Month 1</span>
                  </div>
                  <span className="text-[#404040]">→</span>
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-purple-400 font-bold">{topSecretStats.month2}</span>
                    </div>
                    <span className="text-xs text-[#606060] mt-1">Month 2</span>
                  </div>
                  <span className="text-[#404040]">→</span>
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-emerald-400 font-bold">{topSecretStats.fullSubscribers}</span>
                    </div>
                    <span className="text-xs text-[#606060] mt-1">Full</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Rates */}
          <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
            <CardHeader>
              <CardTitle className="text-[#F4F4F4]">Conversion Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-[#1A1A1A] rounded-xl">
                  <p className="text-3xl font-bold text-[#C9A646]">
                    {topSecretStats.totalRegistered > 0 
                      ? ((topSecretStats.totalSubscribers / topSecretStats.totalRegistered) * 100).toFixed(1) 
                      : 0}%
                  </p>
                  <p className="text-sm text-[#808080] mt-1">Registered → Subscribers</p>
                </div>
                <div className="text-center p-4 bg-[#1A1A1A] rounded-xl">
                  <p className="text-3xl font-bold text-emerald-400">
                    {topSecretStats.inTrial > 0 
                      ? (((topSecretStats.month1 + topSecretStats.month2 + topSecretStats.fullSubscribers) / 
                         (topSecretStats.inTrial + topSecretStats.month1 + topSecretStats.month2 + topSecretStats.fullSubscribers)) * 100).toFixed(1)
                      : 0}%
                  </p>
                  <p className="text-sm text-[#808080] mt-1">Trial → Paying</p>
                </div>
                <div className="text-center p-4 bg-[#1A1A1A] rounded-xl">
                  <p className="text-3xl font-bold text-purple-400">
                    {(topSecretStats.month1 + topSecretStats.month2) > 0 
                      ? ((topSecretStats.fullSubscribers / (topSecretStats.month1 + topSecretStats.month2 + topSecretStats.fullSubscribers)) * 100).toFixed(1)
                      : 0}%
                  </p>
                  <p className="text-sm text-[#808080] mt-1">Retention (3+ months)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}