// src/pages/app/journal/admin/Subscribers.tsx
// ============================================
// Admin Subscribers Management Page
// Shows subscription stats and subscriber list
// ============================================

import { useEffect, useState } from 'react';
import { 
  CreditCard,
  Calendar,
  DollarSign,
  TrendingUp,
  Filter,
  Search,
  Download,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { StatsCard } from '@/components/admin/StatsCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { getSubscriberStats, getSubscribersList } from '@/services/adminService';
import { SubscriberStats, Subscriber } from '@/types/admin';

export default function AdminSubscribers() {
  const [stats, setStats] = useState<SubscriberStats | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterBilling, setFilterBilling] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [statsData, subscribersData] = await Promise.all([
        getSubscriberStats(),
        getSubscribersList()
      ]);
      setStats(statsData);
      setSubscribers(subscribersData);
    } catch (err: any) {
      console.error('Error loading subscriber data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Filter subscribers
  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = 
      sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlan = filterPlan === 'all' || sub.subscription_plan === filterPlan;
    const matchesBilling = filterBilling === 'all' || sub.billing_cycle === filterBilling;
    
    return matchesSearch && matchesPlan && matchesBilling;
  });

  if (loading) {
    return (
      <AdminLayout
        title="Subscribers"
        description="Manage subscriptions and billing"
      >
        <LoadingSkeleton lines={8} />
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout
        title="Subscribers"
        description="Manage subscriptions and billing"
      >
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500">
          Error loading subscriber data: {error}
        </div>
      </AdminLayout>
    );
  }

  if (!stats) return null;

  return (
    <AdminLayout
      title="Subscribers"
      description="Manage subscriptions and billing"
    >
      {/* Subscription Stats */}
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
          subtitle={`₪${stats.basicMRR.toLocaleString()} MRR`}
        />

        <StatsCard
          title="Premium Plan"
          value={stats.premiumSubscribers}
          change={`${stats.premiumMonthly} monthly | ${stats.premiumYearly} yearly`}
          changeType="neutral"
          icon={TrendingUp}
          subtitle={`₪${stats.premiumMRR.toLocaleString()} MRR`}
        />

        <StatsCard
          title="Total MRR"
          value={`₪${stats.totalMRR.toLocaleString()}`}
          change={`₪${stats.totalARR.toLocaleString()} ARR`}
          changeType="positive"
          icon={Calendar}
          subtitle={`${stats.churnRate.toFixed(1)}% churn`}
        />
      </div>

      {/* Billing Cycle Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Plan Distribution</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Basic Monthly</span>
              <div className="flex items-center gap-3">
                <div className="h-2 w-32 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500"
                    style={{ width: `${(stats.basicMonthly / stats.totalSubscribers) * 100}%` }}
                  />
                </div>
                <span className="text-white font-semibold w-12 text-right">
                  {stats.basicMonthly}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Basic Yearly</span>
              <div className="flex items-center gap-3">
                <div className="h-2 w-32 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600"
                    style={{ width: `${(stats.basicYearly / stats.totalSubscribers) * 100}%` }}
                  />
                </div>
                <span className="text-white font-semibold w-12 text-right">
                  {stats.basicYearly}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Premium Monthly</span>
              <div className="flex items-center gap-3">
                <div className="h-2 w-32 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#D4AF37]"
                    style={{ width: `${(stats.premiumMonthly / stats.totalSubscribers) * 100}%` }}
                  />
                </div>
                <span className="text-white font-semibold w-12 text-right">
                  {stats.premiumMonthly}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Premium Yearly</span>
              <div className="flex items-center gap-3">
                <div className="h-2 w-32 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#FFD700]"
                    style={{ width: `${(stats.premiumYearly / stats.totalSubscribers) * 100}%` }}
                  />
                </div>
                <span className="text-white font-semibold w-12 text-right">
                  {stats.premiumYearly}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Revenue Breakdown</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Basic MRR</span>
              <span className="text-white font-semibold">
                ₪{stats.basicMRR.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Premium MRR</span>
              <span className="text-white font-semibold">
                ₪{stats.premiumMRR.toLocaleString()}
              </span>
            </div>
            <div className="border-t border-gray-800 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 font-medium">Total MRR</span>
                <span className="text-[#D4AF37] font-bold text-lg">
                  ₪{stats.totalMRR.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 font-medium">Projected ARR</span>
              <span className="text-[#D4AF37] font-bold text-lg">
                ₪{stats.totalARR.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
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

          {/* Plan Filter */}
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

          {/* Billing Cycle Filter */}
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

          {/* Export */}
          <button
            onClick={() => {/* TODO: Implement export */}}
            className="bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Subscribers Table */}
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
                <tr key={sub.user_id} className="hover:bg-black/50 transition-colors">
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
                    {sub.subscription_end_date 
                      ? new Date(sub.subscription_end_date).toLocaleDateString('he-IL')
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[#D4AF37] font-semibold">
                      ₪{sub.monthly_revenue.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredSubscribers.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-400">No subscribers found matching your filters</p>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mt-4 text-center text-gray-400 text-sm">
        Showing {filteredSubscribers.length} of {subscribers.length} subscribers
      </div>
    </AdminLayout>
  );
}