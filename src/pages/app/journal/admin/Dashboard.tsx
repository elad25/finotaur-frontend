// src/pages/app/journal/admin/Dashboard.tsx
// ============================================
// UPDATED: Using AdminLayout with tabs
// ============================================

import { useEffect, useState } from 'react';
import { 
  Users, 
  TrendingUp, 
  Activity,
  UserPlus,
  Calendar,
  BarChart3,
  Crown,
} from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { getAdminStats } from '@/services/adminService';
import { AdminStats } from '@/types/admin';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import AdminLayout from '@/components/admin/AdminLayout';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const data = await getAdminStats();
      setStats(data);
    } catch (err: any) {
      console.error('Error loading admin stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout
        title="Admin Dashboard"
        description="Finotaur platform overview and user management"
      >
        <LoadingSkeleton lines={8} />
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout
        title="Admin Dashboard"
        description="Finotaur platform overview and user management"
      >
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500">
          Error loading stats: {error}
        </div>
      </AdminLayout>
    );
  }

  if (!stats) return null;

  return (
    <AdminLayout
      title="Admin Dashboard"
      description="Finotaur platform overview and user management"
    >
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          change={`+${stats.newUsersThisWeek} this week`}
          changeType="positive"
          icon={Users}
          subtitle={`${stats.activeUsers} active (30d)`}
        />

        <StatsCard
          title="Premium Users"
          value={stats.premiumUsers + (stats.proUsers || 0)}
          change={`${stats.freeToPayingConversionRate.toFixed(1)}% conversion`}
          changeType="positive"
          icon={Crown}
          subtitle={`${stats.freeUsers} free users`}
        />

        <StatsCard
          title="Total Trades"
          value={stats.totalTrades.toLocaleString()}
          change={`+${stats.tradesThisWeek} this week`}
          changeType="positive"
          icon={TrendingUp}
          subtitle={`${stats.averageTradesPerUser.toFixed(1)} avg per user`}
        />

        <StatsCard
          title="Daily Active"
          value={stats.dailyActiveUsers}
          change={`${stats.weeklyActiveUsers} weekly`}
          changeType="neutral"
          icon={Activity}
          subtitle={`${stats.monthlyActiveUsers} monthly`}
        />
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Growth */}
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#D4AF37]" />
            User Growth
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Today</span>
              <span className="text-white font-semibold">+{stats.newUsersToday}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">This Week</span>
              <span className="text-white font-semibold">+{stats.newUsersThisWeek}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">This Month</span>
              <span className="text-white font-semibold">+{stats.newUsersThisMonth}</span>
            </div>
          </div>
        </div>

        {/* Subscription Breakdown */}
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#D4AF37]" />
            Subscription Breakdown
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Free</span>
              <span className="text-white font-semibold">
                {stats.freeUsers} ({((stats.freeUsers / stats.totalUsers) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Basic</span>
              <span className="text-white font-semibold">
                {stats.basicUsers || 0} ({(((stats.basicUsers || 0) / stats.totalUsers) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Premium</span>
              <span className="text-white font-semibold">
                {stats.premiumUsers} ({((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Trial</span>
              <span className="text-white font-semibold">
                {stats.trialUsers}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Activity */}
      <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#D4AF37]" />
          Trading Activity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-gray-400 text-sm mb-1">Total Trades</p>
            <p className="text-2xl font-bold text-white">{stats.totalTrades.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">This Week</p>
            <p className="text-2xl font-bold text-white">{stats.tradesThisWeek.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">This Month</p>
            <p className="text-2xl font-bold text-white">{stats.tradesThisMonth.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}