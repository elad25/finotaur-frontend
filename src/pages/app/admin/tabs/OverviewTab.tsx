// src/pages/app/admin/tabs/OverviewTab.tsx
// ============================================
// CRM Truth rebuild (2026-07-12) — lean, action-first Overview.
//
// Layout, top to bottom:
//   1. Needs Attention  — tickets/drafts/KB/refunds/failures/cancellations/
//      expiring subs, sourced from admin_attention_summary RPC. Every card
//      links straight to the surface that resolves it.
//   2. Money — Real     — actual paying counts + $ revenue from
//      admin_revenue_truth RPC (Whop-verified), not the empty-field MRR/ARR
//      estimate that used to live here.
//   3. Users — Reality  — total/new/active users from the existing
//      admin_get_stats RPC.
//   4. User Growth chart — unchanged.
//   5. "Deep dive →" link to the legacy detailed analytics surface.
//
// Both new RPCs are optional at the DB level (migrations applied
// separately) — adminService.getAttentionSummary/getRevenueTruth swallow
// errors and return null, and this file renders a "Data source pending"
// note instead of crashing when that happens.
//
// Removed from this tab (components NOT deleted, just no longer mounted
// here): MRR/ARR StatsCards, Trial→Paid + Free→Paid conversion, Churn Rate,
// CohortRetention heatmap, Plan Mix pie, Revenue-per-Plan table, Trading
// Activity row, Forecast/ExecutivePlaceholder embed.
// ============================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
  UserPlus,
  Crown,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  Bot,
  BookOpen,
  RotateCcw,
  CreditCard,
  UserX,
  Clock,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { StatsCard } from '@/components/admin/StatsCard';
import { SkeletonStatRow, SkeletonChart } from '@/components/ds/Skeleton';
import {
  getAdminStats,
  getUserGrowthData,
  getAttentionSummary,
  getRevenueTruth,
  type AdminAttentionSummary,
  type AdminRevenueTruth,
} from '@/services/adminService';
import type { AdminStats, UserGrowthData } from '@/types/admin';

// ============================================
// Small building blocks
// ============================================

function DataSourcePending({ label }: { label: string }) {
  return (
    <div className="bg-[#111111] border border-gray-800 rounded-lg p-4 flex items-center gap-2 text-xs text-gray-500">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-gray-600" />
      <span>Data source pending — {label} not available yet.</span>
    </div>
  );
}

interface AttentionCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  subtitle?: string;
  href: string;
  tone?: 'gold' | 'red';
}

function AttentionCard({ icon: Icon, label, value, subtitle, href, tone = 'gold' }: AttentionCardProps) {
  const isZero = value === 0;
  const accentText = tone === 'red' ? 'text-red-400' : 'text-[#D4AF37]';
  const accentBorder = tone === 'red' ? 'border-red-500/40' : 'border-[#D4AF37]/40';
  const accentDot = tone === 'red' ? 'bg-red-500' : 'bg-[#D4AF37]';

  return (
    <Link
      to={href}
      className={`block rounded-lg border p-4 transition-all ${
        isZero
          ? 'bg-[#111111] border-gray-800 opacity-50 hover:opacity-80'
          : `bg-[#111111] ${accentBorder} hover:bg-white/5`
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-4 h-4 ${isZero ? 'text-gray-500' : accentText}`} />
        {!isZero && <span className={`h-1.5 w-1.5 rounded-full ${accentDot}`} />}
      </div>
      <p className={`text-2xl font-bold ${isZero ? 'text-gray-500' : 'text-white'}`}>
        {value.toLocaleString('en-US')}
      </p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      {subtitle && <p className="text-[11px] text-gray-600 mt-0.5">{subtitle}</p>}
    </Link>
  );
}

export function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [growth, setGrowth] = useState<UserGrowthData[]>([]);
  const [attention, setAttention] = useState<AdminAttentionSummary | null>(null);
  const [revenue, setRevenue] = useState<AdminRevenueTruth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [adminStats, growthData, attentionData, revenueData] = await Promise.all([
          getAdminStats(),
          getUserGrowthData(90),
          getAttentionSummary(),
          getRevenueTruth(),
        ]);

        if (cancelled) return;
        setStats(adminStats);
        setGrowth(growthData);
        setAttention(attentionData);
        setRevenue(revenueData);
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
      <div className="p-6 space-y-6">
        <SkeletonStatRow count={4} />
        <SkeletonStatRow count={4} />
        <SkeletonChart height="h-64" />
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

  if (!stats) return null;

  const growthLast30 = growth.slice(-30);

  const cancellationsVsActivations = revenue
    ? `${revenue.cancellations30d} / ${revenue.activations30d}`
    : '—';
  const netFlowPositive = revenue ? revenue.activations30d >= revenue.cancellations30d : true;

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            What needs attention today, and what's actually true about revenue.
          </p>
        </div>
        <div className="text-[11px] text-gray-600 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          <span>Live from Supabase</span>
        </div>
      </header>

      {/* ==================== NEEDS ATTENTION ==================== */}
      <section>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#D4AF37]" />
          Needs Attention
        </h2>

        {attention === null ? (
          <DataSourcePending label="admin_attention_summary" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <AttentionCard
              icon={MessageCircle}
              label="Tickets awaiting reply"
              value={attention.ticketsAwaiting}
              subtitle={
                attention.ticketsOldestDays !== null
                  ? `Oldest ${attention.ticketsOldestDays}d`
                  : undefined
              }
              href="/app/admin/support"
            />
            <AttentionCard
              icon={Bot}
              label="AI drafts pending"
              value={attention.draftsPending}
              href="/app/admin/support?tab=ai_drafts"
            />
            <AttentionCard
              icon={BookOpen}
              label="KB suggestions pending"
              value={attention.kbSuggestionsPending}
              href="/app/admin/support?tab=ai_drafts&panel=kb"
            />
            <AttentionCard
              icon={RotateCcw}
              label="Refunds (7d)"
              value={attention.refunds7d}
              href="/app/admin/billing"
              tone="red"
            />
            <AttentionCard
              icon={CreditCard}
              label="Payment failures (7d)"
              value={attention.paymentFailures7d}
              href="/app/admin/billing"
              tone="red"
            />
            <AttentionCard
              icon={UserX}
              label="Cancellations (7d)"
              value={attention.cancellations7d}
              href="/app/admin/billing"
            />
            <AttentionCard
              icon={Clock}
              label="Expiring ≤7d"
              value={attention.expiring7d}
              href="/app/admin/billing"
            />
          </div>
        )}
      </section>

      {/* ==================== MONEY — REAL ==================== */}
      <section>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#D4AF37]" />
          Money — Real
        </h2>

        {revenue === null ? (
          <DataSourcePending label="admin_revenue_truth" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Paying Members"
              value={(revenue.payingPremium + revenue.payingBasic + revenue.platformActive).toLocaleString('en-US')}
              subtitle={`${revenue.payingPremium} premium · ${revenue.payingBasic} basic · ${revenue.platformActive} platform`}
              icon={Crown}
            />
            <StatsCard
              title="Revenue (30d)"
              value={`$${revenue.revenue30d.toLocaleString('en-US')}`}
              subtitle={`$${revenue.revenue90d.toLocaleString('en-US')} last 90d`}
              icon={DollarSign}
            />
            <StatsCard
              title="Refunds (30d)"
              value={`$${revenue.refunds30d.toLocaleString('en-US')}`}
              subtitle="Whop-verified refunds"
              changeType={revenue.refunds30d > 0 ? 'negative' : 'positive'}
              icon={RotateCcw}
            />
            <StatsCard
              title="Cancellations vs Activations"
              value={cancellationsVsActivations}
              subtitle="last 30 days"
              changeType={netFlowPositive ? 'positive' : 'negative'}
              icon={netFlowPositive ? TrendingUp : TrendingDown}
            />
          </div>
        )}
      </section>

      {/* ==================== USERS — REALITY ==================== */}
      <section>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#D4AF37]" />
          Users — Reality
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString('en-US')}
            subtitle={`${stats.activeUsers.toLocaleString('en-US')} active (30d)`}
            icon={Users}
          />
          <StatsCard
            title="New This Month"
            value={stats.newUsersThisMonth.toLocaleString('en-US')}
            change={`+${stats.newUsersThisWeek} this week`}
            changeType="positive"
            icon={UserPlus}
          />
          <StatsCard
            title="Active Traders (7d)"
            value={stats.weeklyActiveUsers.toLocaleString('en-US')}
            subtitle="Weekly active users"
            icon={Activity}
          />
        </div>
      </section>

      {/* ==================== USER GROWTH CHART ==================== */}
      <section className="bg-[#111111] border border-gray-800 rounded-lg p-5">
        <header className="flex items-baseline justify-between mb-4">
          <h3 className="text-white font-semibold">
            User Growth — last 30 days
          </h3>
          <span className="text-[11px] text-gray-500">
            daily new vs. active
          </span>
        </header>

        {growthLast30.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">
            No growth data available.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={growthLast30}>
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
      </section>

      {/* ==================== DEEP DIVE ==================== */}
      <Link
        to="/app/admin/analytics"
        className="flex items-center justify-center gap-2 border border-gray-800 rounded-lg p-4 text-sm font-medium text-gray-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all"
      >
        Deep dive — full analytics, conversion, cohorts, plan mix
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
