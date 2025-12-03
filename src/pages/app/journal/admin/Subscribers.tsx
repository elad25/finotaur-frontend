// src/pages/app/journal/admin/Subscribers.tsx
// ============================================
// Admin Subscribers Management Page - v2.0.0
// ============================================
// 🔥 v2.0.0: Added Supabase Realtime for live updates
// ============================================

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  CreditCard,
  Calendar,
  DollarSign,
  TrendingUp,
  Filter,
  Search,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { StatsCard } from '@/components/admin/StatsCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { getSubscriberStats, getSubscribersList, exportSubscribers } from '@/services/adminService';
import { SubscriberStats, Subscriber } from '@/types/admin';
import { useAdminRealtimeUpdates } from '@/hooks/useRealtimeSubscriptions';
import { toast } from 'sonner';

// ============================================
// CACHE CONFIGURATION
// ============================================

const CACHE_CONFIG = {
  staleTime: 2 * 60 * 1000,
  gcTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminSubscribers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterBilling, setFilterBilling] = useState<string>('all');

  const queryClient = useQueryClient();

  // 🔥 REALTIME SUBSCRIPTION
  const { isSubscribed, refresh } = useAdminRealtimeUpdates(true);

  // REACT QUERY - STATS
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    isFetching: statsFetching,
  } = useQuery({
    queryKey: ['admin', 'subscriber-stats'],
    queryFn: getSubscriberStats,
    ...CACHE_CONFIG,
  });

  // REACT QUERY - SUBSCRIBERS LIST
  const {
    data: subscribers = [],
    isLoading: subscribersLoading,
    isFetching: subscribersFetching,
  } = useQuery({
    queryKey: ['admin', 'subscribers-list'],
    queryFn: getSubscribersList,
    ...CACHE_CONFIG,
  });

  // FILTERED SUBSCRIBERS
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((sub) => {
      const matchesSearch = 
        sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPlan = filterPlan === 'all' || sub.subscription_plan === filterPlan;
      const matchesBilling = filterBilling === 'all' || sub.billing_cycle === filterBilling;
      
      return matchesSearch && matchesPlan && matchesBilling;
    });
  }, [subscribers, searchTerm, filterPlan, filterBilling]);

  // HANDLERS
  const handleRefresh = async () => {
    toast.info('Refreshing data...');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriber-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscribers-list'] }),
    ]);
    toast.success('Data refreshed!');
  };

  const handleExport = async () => {
    try {
      toast.info('Generating CSV...');
      const csv = await exportSubscribers();
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `finotaur-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast.success('Export complete!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
    }
  };

  const isLoading = statsLoading || subscribersLoading;
  const isFetching = statsFetching || subscribersFetching;

  if (isLoading) {
    return (
      <AdminLayout title="Subscribers" description="Manage subscriptions and billing">
        <LoadingSkeleton lines={8} />
      </AdminLayout>
    );
  }

  if (statsError) {
    return (
      <AdminLayout title="Subscribers" description="Manage subscriptions and billing">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500">
          Error loading subscriber data
        </div>
      </AdminLayout>
    );
  }

  if (!stats) return null;

  return (
    <AdminLayout title="Subscribers" description="Manage subscriptions and billing">
      {/* 🔥 Realtime Status Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <div className="flex items-center gap-2 text-green-500 text-sm">
              <Wifi className="w-4 h-4" />
              <span>Live updates enabled</span>
              {isFetching && (
                <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-500 text-sm">
              <WifiOff className="w-4 h-4" />
              <span>Connecting...</span>
            </div>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Subscribers"
          value={stats.totalSubscribers}
          change={`+${stats.newSubscribersThisMonth} this month`}
          changeType="positive"
          icon={CreditCard}
          subtitle={`${stats.activeSubscribers} active`}
        />
        <StatsCard
          title="Basic Plan"
          value={stats.basicSubscribers}
          change={`${stats.basicMonthly} monthly | ${stats.basicYearly} yearly`}
          changeType="neutral"
          icon={DollarSign}
          subtitle={`$${stats.basicMRR.toLocaleString()} MRR`}
        />
        <StatsCard
          title="Premium Plan"
          value={stats.premiumSubscribers}
          change={`${stats.premiumMonthly} monthly | ${stats.premiumYearly} yearly`}
          changeType="neutral"
          icon={TrendingUp}
          subtitle={`$${stats.premiumMRR.toLocaleString()} MRR`}
        />
        <StatsCard
          title="Total MRR"
          value={`$${stats.totalMRR.toLocaleString()}`}
          change={`$${stats.totalARR.toLocaleString()} ARR`}
          changeType="positive"
          icon={Calendar}
          subtitle={`${stats.churnRate.toFixed(1)}% churn`}
        />
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Plan Distribution</h2>
          <div className="space-y-4">
            <PlanBar label="Basic Monthly" count={stats.basicMonthly} total={stats.totalSubscribers} color="bg-blue-500" />
            <PlanBar label="Basic Yearly" count={stats.basicYearly} total={stats.totalSubscribers} color="bg-blue-600" />
            <PlanBar label="Premium Monthly" count={stats.premiumMonthly} total={stats.totalSubscribers} color="bg-[#D4AF37]" />
            <PlanBar label="Premium Yearly" count={stats.premiumYearly} total={stats.totalSubscribers} color="bg-[#FFD700]" />
          </div>
        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Revenue Breakdown</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Basic MRR</span>
              <span className="text-white font-semibold">${stats.basicMRR.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Premium MRR</span>
              <span className="text-white font-semibold">${stats.premiumMRR.toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-800 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 font-medium">Total MRR</span>
                <span className="text-[#D4AF37] font-bold text-lg">${stats.totalMRR.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 font-medium">Projected ARR</span>
              <span className="text-[#D4AF37] font-bold text-lg">${stats.totalARR.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="bg-black border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#D4AF37] appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="all">All Plans</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
            <select
              value={filterBilling}
              onChange={(e) => setFilterBilling(e.target.value)}
              className="bg-black border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#D4AF37] appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="all">All Billing</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <button
            onClick={handleExport}
            className="bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Plan</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Billing</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Started</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Renews</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredSubscribers.map((sub) => (
                <SubscriberRow key={sub.user_id} subscriber={sub} />
              ))}
            </tbody>
          </table>
        </div>
        {filteredSubscribers.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-400">No subscribers found matching your filters</p>
          </div>
        )}
      </div>

      <div className="mt-4 text-center text-gray-400 text-sm">
        Showing {filteredSubscribers.length} of {subscribers.length} subscribers
      </div>
    </AdminLayout>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function PlanBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}</span>
      <div className="flex items-center gap-3">
        <div className="h-2 w-32 bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percentage}%` }} />
        </div>
        <span className="text-white font-semibold w-12 text-right">{count}</span>
      </div>
    </div>
  );
}

function SubscriberRow({ subscriber: sub }: { subscriber: Subscriber }) {
  return (
    <tr className="hover:bg-black/50 transition-colors">
      <td className="px-6 py-4">
        <div>
          <p className="text-white font-medium">{sub.full_name || 'N/A'}</p>
          <p className="text-gray-400 text-sm">{sub.email}</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          sub.subscription_plan === 'premium'
            ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
            : 'bg-blue-500/20 text-blue-400'
        }`}>
          {sub.subscription_plan?.toUpperCase()}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className="text-white capitalize">{sub.billing_cycle}</span>
      </td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          sub.subscription_status === 'active'
            ? 'bg-green-500/20 text-green-400'
            : sub.subscription_status === 'cancelled'
            ? 'bg-red-500/20 text-red-400'
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {sub.subscription_status?.toUpperCase()}
        </span>
      </td>
      <td className="px-6 py-4 text-gray-300">
        {new Date(sub.subscription_start_date).toLocaleDateString('he-IL')}
      </td>
      <td className="px-6 py-4 text-gray-300">
        {sub.subscription_end_date ? new Date(sub.subscription_end_date).toLocaleDateString('he-IL') : '-'}
      </td>
      <td className="px-6 py-4 text-right">
        <span className="text-[#D4AF37] font-semibold">${sub.monthly_revenue.toLocaleString()}</span>
      </td>
    </tr>
  );
}