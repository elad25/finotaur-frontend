// src/pages/app/admin/tabs/OverviewTab.tsx
// ============================================
// Phase 0 — unified Overview pulling from existing RPCs only.
// No new backend, no schema changes.
//
// Data sources (all already live in adminService.ts):
//   - getAdminStats           — admin_get_stats RPC
//   - getSubscriberStats      — Whop-verified MRR/ARR/churn
//   - getUserGrowthData(30)   — user_growth_daily view
//   - getSubscriptionBreakdown — subscription_breakdown_view
// ============================================

import { useEffect, useState } from 'react';
import {
  Users,
  Activity,
  DollarSign,
  TrendingUp,
  UserPlus,
  Crown,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { StatsCard } from '@/components/admin/StatsCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import {
  getAdminStats,
  getSubscriberStats,
  getUserGrowthData,
  getSubscriptionBreakdown,
} from '@/services/adminService';
import type {
  AdminStats,
  SubscriberStats,
  UserGrowthData,
  SubscriptionBreakdown,
} from '@/types/admin';

const PLAN_COLORS: Record<string, string> = {
  basic: '#3B82F6',
  premium: '#D4AF37',
  newsletter: '#10B981',
  top_secret: '#A855F7',
  trial: '#F59E0B',
  free: '#6B7280',
};

function planLabel(plan: string): string {
  return plan
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [subStats, setSubStats] = useState<SubscriberStats | null>(null);
  const [growth, setGrowth] = useState<UserGrowthData[]>([]);
  const [breakdown, setBreakdown] = useState<SubscriptionBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [adminStats, subscriberStats, growthData, breakdownData] =
          await Promise.all([
            getAdminStats(),
            getSubscriberStats(),
            getUserGrowthData(30),
            getSubscriptionBreakdown(),
          ]);

        if (cancelled) return;
        setStats(adminStats);
        setSubStats(subscriberStats);
        setGrowth(growthData);
        setBreakdown(breakdownData);
      } catch (err) {
        if (cancelled) return;
        console.error('[OverviewTab] load failed:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load overview data'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSkeleton lines={12} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Overview failed to load</p>
            <p className="text-sm opacity-80 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats || !subStats) return null;

  const churnSeverity =
    subStats.churnRate >= 8
      ? 'negative'
      : subStats.churnRate >= 4
      ? 'neutral'
      : 'positive';

  const pieData = breakdown
    .filter((b) => b.count > 0)
    .map((b) => ({
      name: `${planLabel(b.accountType)}${b.interval ? ` · ${b.interval}` : ''}`,
      value: b.count,
      revenue: b.revenue * b.count,
      planKey: b.accountType,
    }));

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Whop-verified subscribers + platform health, 5-minute cache.
          </p>
        </div>
        <div className="text-[11px] text-gray-600 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          <span>Live from Supabase</span>
        </div>
      </header>

      {/* KPI row 1 — users */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          subtitle={`${stats.activeUsers.toLocaleString()} active (30d)`}
          icon={Users}
        />
        <StatsCard
          title="New This Month"
          value={stats.newUsersThisMonth.toLocaleString()}
          change={`+${stats.newUsersThisWeek} this week`}
          changeType="positive"
          icon={UserPlus}
        />
        <StatsCard
          title="Paying Subscribers"
          value={subStats.activeSubscribers.toLocaleString()}
          subtitle={`${subStats.newSubscribersThisMonth} new this month`}
          icon={Crown}
        />
        <StatsCard
          title="Trial → Paid"
          value={`${stats.trialToPayingConversionRate.toFixed(1)}%`}
          subtitle={`${stats.trialUsers} users currently in trial`}
          icon={Activity}
        />
      </section>

      {/* KPI row 2 — revenue */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="MRR"
          value={`$${subStats.totalMRR.toLocaleString()}`}
          subtitle="Monthly recurring revenue"
          icon={DollarSign}
        />
        <StatsCard
          title="ARR"
          value={`$${subStats.totalARR.toLocaleString()}`}
          subtitle="Annualized run rate"
          icon={TrendingUp}
        />
        <StatsCard
          title="Churn Rate (30d)"
          value={`${subStats.churnRate.toFixed(1)}%`}
          change={
            churnSeverity === 'negative'
              ? 'High — investigate'
              : churnSeverity === 'positive'
              ? 'Healthy'
              : 'Watch closely'
          }
          changeType={churnSeverity}
          icon={AlertTriangle}
        />
        <StatsCard
          title="Free → Paid"
          value={`${stats.freeToPayingConversionRate.toFixed(1)}%`}
          subtitle="Lifetime conversion"
          icon={Activity}
        />
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#111111] border border-gray-800 rounded-lg p-5">
          <header className="flex items-baseline justify-between mb-4">
            <h3 className="text-white font-semibold">
              User Growth — last 30 days
            </h3>
            <span className="text-[11px] text-gray-500">
              daily new vs. active
            </span>
          </header>

          {growth.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">
              No growth data available.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis
                  dataKey="date"
                  stroke="#6B7280"
                  fontSize={11}
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  }
                />
                <YAxis stroke="#6B7280" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E0E0E',
                    border: '1px solid #374151',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(d) =>
                    new Date(d as string).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                    })
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  stroke="#D4AF37"
                  strokeWidth={2}
                  dot={false}
                  name="New users"
                />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  name="Active users"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-lg p-5">
          <header className="flex items-baseline justify-between mb-4">
            <h3 className="text-white font-semibold">Plan Mix</h3>
            <span className="text-[11px] text-gray-500">paying users</span>
          </header>

          {pieData.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">
              No paying users yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {pieData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={PLAN_COLORS[entry.planKey] ?? '#6B7280'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E0E0E',
                    border: '1px solid #374151',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number, _name, props) => [
                    `${value} users · $${(
                      (props.payload?.revenue as number) ?? 0
                    ).toFixed(0)}/mo`,
                    props.payload?.name as string,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Plan-level breakdown table */}
      <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-white font-semibold">Revenue per Plan</h3>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-[#0A0A0A] text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-2 font-medium">Plan</th>
              <th className="text-right px-5 py-2 font-medium">Users</th>
              <th className="text-right px-5 py-2 font-medium">Share</th>
              <th className="text-right px-5 py-2 font-medium">
                Est. revenue / user
              </th>
              <th className="text-right px-5 py-2 font-medium">
                Total per period
              </th>
            </tr>
          </thead>
          <tbody>
            {breakdown.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-gray-500 py-6 text-sm"
                >
                  No subscription data yet.
                </td>
              </tr>
            ) : (
              breakdown.map((b, idx) => (
                <tr
                  key={`${b.accountType}-${b.interval}-${idx}`}
                  className="border-t border-gray-800 hover:bg-white/5"
                >
                  <td className="px-5 py-3 text-white">
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                      style={{
                        backgroundColor:
                          PLAN_COLORS[b.accountType] ?? '#6B7280',
                      }}
                    />
                    {planLabel(b.accountType)}
                    {b.interval && (
                      <span className="text-gray-500 ml-1">
                        ({b.interval})
                      </span>
                    )}
                  </td>
                  <td className="text-right px-5 py-3 text-gray-300">
                    {b.count.toLocaleString()}
                  </td>
                  <td className="text-right px-5 py-3 text-gray-400">
                    {b.percentage.toFixed(1)}%
                  </td>
                  <td className="text-right px-5 py-3 text-gray-400">
                    ${b.revenue.toFixed(2)}
                  </td>
                  <td className="text-right px-5 py-3 text-[#D4AF37] font-medium">
                    ${(b.revenue * b.count).toFixed(0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
