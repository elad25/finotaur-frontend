// src/pages/app/admin/tabs/FounderCockpitTab.tsx
// ============================================
// Founder Cockpit — single command-center pane.
// AI advisor brief at the top; all accumulated business data below.
// Calls the admin-gated Postgres RPC `admin_founder_intel` (no args).
// ============================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Eye,
  Users,
  UserPlus,
  Activity,
  Crown,
  TrendingDown,
  DollarSign,
  Zap,
  MessageSquare,
  ExternalLink,
  Clock,
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { StatsCard } from '@/components/admin/StatsCard';
import { SkeletonStatRow, SkeletonTable } from '@/components/ds/Skeleton';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FounderMetrics {
  users: {
    total: number;
    signups24h: number;
    signups7d: number;
    signups30d: number;
    activeLogins7d: number;
  };
  subs: {
    platform: number;
    journalPremium: number;
    newsletter: number;
    topSecret: number;
  };
  churn: {
    last7d: number;
    total: number;
  };
  ai: {
    cost24h: number;
    calls24h: number;
    topEngines: Array<{ service: string; calls: number; cost: number }>;
  };
  support: {
    open: number;
    new7d: number;
  };
  events: {
    last7d: number;
    top: Array<{ name: string; c: number }>;
  };
}

interface FounderVoice {
  total: number;
  new7d: number;
  byCategory: Record<string, number>;
  topRequests: Array<{ label: string; count: number }>;
  topPain: Array<{ summary: string; theme: string }>;
  openBugs: Array<{ summary: string; theme: string }>;
  churnThemes: Array<{ label: string; count: number }>;
  churnTrend: Array<{ month: string; count: number }>;
}

interface FounderBrief {
  pulse: string;
  biggest_risk: string;
  do_now: string[];
  improve: string[];
  watch: string[];
}

interface HistoryPoint {
  snapshot_at: string;
  total_users: string;
  signups_7d: string;
  ai_cost_24h: string;
}

interface FounderRevenue {
  mrr: number;
  arr: number;
  paying: number;
  total_users_live: number;
  active_users_live: number;
}

interface FounderIntel {
  snapshot_at: string | null;
  age_minutes: number | null;
  revenue: FounderRevenue | null;
  metrics: FounderMetrics | null;
  voice: FounderVoice | null;
  brief: FounderBrief | null;
  history: HistoryPoint[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BriefColumn({
  icon: Icon,
  iconColor,
  title,
  items,
}: {
  icon: typeof CheckCircle2;
  iconColor: string;
  title: string;
  items: string[];
}) {
  return (
    <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4 flex-1 min-w-0">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
        <Icon className="w-4 h-4 shrink-0" style={{ color: iconColor }} />
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-xs text-gray-600">Nothing recorded.</p>
      ) : (
        // Brief text is English — rendered LTR
        <ul className="space-y-2" dir="ltr">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="text-sm text-gray-300 leading-snug pr-3 border-l-2"
              style={{ borderColor: `${iconColor}50` }}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FounderCockpitTab() {
  const [data, setData] = useState<FounderIntel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          'admin_founder_intel'
        );
        if (rpcErr) throw rpcErr;
        if (cancelled) return;
        setData(rpcData as FounderIntel);
      } catch (err) {
        if (cancelled) return;
        console.error('[FounderCockpitTab] load failed:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load founder intel'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Loading ----
  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <SkeletonStatRow count={4} />
        <SkeletonTable rows={6} cols={4} />
      </div>
    );
  }

  // ---- Error ----
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Founder Cockpit failed to load</p>
            <p className="text-sm opacity-80 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ---- Empty (no snapshot yet) ----
  if (!data || !data.brief) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">
        No snapshot yet — generated every few hours.
      </div>
    );
  }

  const { snapshot_at, age_minutes, revenue, metrics, voice, brief, history } = data;

  // Derived
  const totalPaying = metrics
    ? metrics.subs.platform +
      metrics.subs.journalPremium +
      metrics.subs.newsletter +
      metrics.subs.topSecret
    : 0;

  // Trend chart data — coerce string values from history
  const trendData = (history ?? []).map((h) => ({
    date: shortDate(h.snapshot_at),
    users: Number(h.total_users),
    aiCost: Number(h.ai_cost_24h),
  }));

  const hasTrend = trendData.length >= 2;

  // Voice request bars
  const maxRequests =
    voice && voice.topRequests.length > 0
      ? Math.max(...voice.topRequests.map((r) => r.count))
      : 1;

  return (
    <div className="p-8 space-y-6">
      {/* ================================================================
          HEADER
          ================================================================ */}
      <header className="flex items-start gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-lg bg-[#C9A646]/10 flex items-center justify-center shrink-0">
          <Target className="w-6 h-6 text-[#C9A646]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">Founder Cockpit</h1>
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            AI snapshot
            {age_minutes != null
              ? ` · updated ${age_minutes} min ago`
              : snapshot_at
              ? ` · ${shortDate(snapshot_at)}`
              : ''}
          </p>
        </div>
      </header>

      {/* ================================================================
          (a) AI ADVISOR BLOCK — most prominent
          ================================================================ */}
      <section className="bg-[#0D0D0D] border border-[#C9A646]/30 rounded-xl p-6 space-y-5 shadow-[0_0_30px_rgba(201,166,70,0.06)]">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-[#C9A646]" />
          <h2 className="text-lg font-bold text-[#C9A646]">AI Advisor</h2>
        </div>

        {/* Pulse sentence — English, LTR */}
        <p
          className="text-base text-gray-100 leading-relaxed border-l-4 border-[#C9A646]/60 pl-4"
          dir="ltr"
        >
          {brief.pulse}
        </p>

        {/* Biggest risk — red callout, English */}
        <div className="bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-3 flex items-start gap-3">
          <span className="text-base shrink-0">🔴</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">
              Biggest Risk
            </p>
            {/* English content, LTR */}
            <p className="text-sm text-gray-200 leading-snug" dir="ltr">
              {brief.biggest_risk}
            </p>
          </div>
        </div>

        {/* Three action columns */}
        <div className="flex gap-4 flex-wrap">
          <BriefColumn
            icon={CheckCircle2}
            iconColor="#22c55e"
            title="✅ Do Now"
            items={brief.do_now}
          />
          <BriefColumn
            icon={Wrench}
            iconColor="#C9A646"
            title="🔧 Improve"
            items={brief.improve}
          />
          <BriefColumn
            icon={Eye}
            iconColor="#60a5fa"
            title="👀 Watch"
            items={brief.watch}
          />
        </div>
      </section>

      {/* ================================================================
          (b1) REVENUE — MRR / ARR / Paying customers
          ================================================================ */}
      {revenue && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Revenue
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard
              title="MRR"
              value={formatCurrency(revenue.mrr)}
              subtitle="Monthly Recurring Revenue"
              icon={DollarSign}
            />
            <StatsCard
              title="ARR"
              value={formatCurrency(revenue.arr)}
              subtitle="Annual Recurring Revenue"
              icon={DollarSign}
            />
            <StatsCard
              title="Paying Customers"
              value={revenue.paying.toLocaleString('en-US')}
              subtitle={`${revenue.active_users_live.toLocaleString('en-US')} active · ${revenue.total_users_live.toLocaleString('en-US')} total`}
              icon={Crown}
            />
          </div>
        </section>
      )}

      {/* ================================================================
          (b2) GROWTH & REVENUE — stat tiles
          ================================================================ */}
      {metrics && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Growth &amp; Revenue
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatsCard
              title="Total Users"
              value={metrics.users.total.toLocaleString('en-US')}
              subtitle={`+${metrics.users.signups24h} today · +${metrics.users.signups7d} this week`}
              icon={Users}
            />
            <StatsCard
              title="Active (7d)"
              value={metrics.users.activeLogins7d.toLocaleString('en-US')}
              subtitle="unique logins last 7 days"
              icon={Activity}
            />
            <StatsCard
              title="Paying"
              value={totalPaying.toLocaleString('en-US')}
              subtitle={`Platform ${metrics.subs.platform} · Journal ${metrics.subs.journalPremium} · NL ${metrics.subs.newsletter} · TS ${metrics.subs.topSecret}`}
              icon={Crown}
            />
            <StatsCard
              title="Signups (30d)"
              value={metrics.users.signups30d.toLocaleString('en-US')}
              change={`+${metrics.users.signups7d} this week`}
              changeType="positive"
              icon={UserPlus}
            />
            <StatsCard
              title="Churn Total"
              value={metrics.churn.total.toLocaleString('en-US')}
              change={`${metrics.churn.last7d} last 7 days`}
              changeType={metrics.churn.last7d > 0 ? 'negative' : 'neutral'}
              icon={TrendingDown}
            />
          </div>
        </section>
      )}

      {/* ================================================================
          (c) AI COST
          ================================================================ */}
      {metrics && (
        <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#C9A646]" />
            <h3 className="text-white font-semibold">AI Cost</h3>
          </header>
          <div className="px-5 py-4 flex flex-wrap gap-6 items-start">
            {/* Summary numbers */}
            <div className="space-y-1 min-w-[120px]">
              <p className="text-xs text-gray-500">Last 24h spend</p>
              <p className="text-2xl font-bold text-[#C9A646]">
                ${metrics.ai.cost24h.toFixed(3)}
              </p>
              <p className="text-xs text-gray-500">
                {metrics.ai.calls24h.toLocaleString('en-US')} calls
              </p>
            </div>

            {/* Engine breakdown table */}
            {metrics.ai.topEngines.length > 0 && (
              <div className="flex-1 min-w-[240px] overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-gray-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left pb-2 font-medium">Engine</th>
                      <th className="text-right pb-2 font-medium">Calls</th>
                      <th className="text-right pb-2 font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.ai.topEngines.map((engine, idx) => (
                      <tr key={idx} className="border-t border-gray-800">
                        <td className="py-2 text-gray-200 text-xs truncate max-w-[160px]">
                          {engine.service}
                        </td>
                        <td className="py-2 text-right text-gray-400 text-xs">
                          {engine.calls.toLocaleString('en-US')}
                        </td>
                        <td className="py-2 text-right text-[#C9A646] text-xs font-medium">
                          ${engine.cost.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================================================================
          (d) CUSTOMER VOICE — compact summary + link
          ================================================================ */}
      {voice && (
        <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-800 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#C9A646]" />
              <h3 className="text-white font-semibold">Customer Voice</h3>
              <span className="text-xs text-gray-500">
                {voice.total} total · {voice.new7d} new this week
              </span>
            </div>
            <Link
              to="/app/admin/voice"
              className="flex items-center gap-1 text-xs text-[#C9A646] hover:text-[#C9A646]/80 transition-colors"
            >
              Full detail
              <ExternalLink className="w-3 h-3" />
            </Link>
          </header>

          <div className="px-5 py-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top feature requests bars */}
            {voice.topRequests.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Top Requests
                </h4>
                <ul className="space-y-2">
                  {voice.topRequests.slice(0, 5).map((req) => {
                    const pct =
                      maxRequests > 0
                        ? Math.round((req.count / maxRequests) * 100)
                        : 0;
                    return (
                      <li key={req.label}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-xs text-gray-200 truncate flex-1 pr-3">
                            {req.label}
                          </span>
                          <span className="text-xs text-[#C9A646] font-semibold shrink-0">
                            {req.count}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: '#C9A646',
                              opacity: 0.7,
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Churn themes + category chips */}
            <div className="space-y-4">
              {voice.churnThemes.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Churn Themes
                  </h4>
                  <ul className="space-y-1">
                    {voice.churnThemes.slice(0, 4).map((t) => (
                      <li
                        key={t.label}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-gray-300 truncate flex-1 pr-3">
                          {t.label}
                        </span>
                        <span className="text-orange-400 font-medium shrink-0">
                          {t.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Category chips */}
              {Object.keys(voice.byCategory).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    By Category
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      Object.entries(voice.byCategory) as [string, number][]
                    )
                      .filter(([, v]) => v > 0)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, count]) => (
                        <span
                          key={cat}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-800 text-gray-300 border border-gray-700"
                        >
                          {cat}
                          <span className="opacity-60">{count}</span>
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================
          (e) TRENDS — history line/bar combo chart
          ================================================================ */}
      <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#C9A646]" />
          <h3 className="text-white font-semibold">Trends</h3>
          <span className="text-xs text-gray-500 ml-auto">
            Total users &amp; AI cost per snapshot
          </span>
        </header>

        {!hasTrend ? (
          <p className="text-sm text-gray-500 text-center py-12">
            Trend builds over time — needs at least 2 snapshots.
          </p>
        ) : (
          <div className="px-5 py-5" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={trendData}
                margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="users"
                  orientation="left"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="cost"
                  orientation="right"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #374151',
                    borderRadius: 6,
                    fontSize: 12,
                    color: '#e5e7eb',
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  yAxisId="users"
                  type="monotone"
                  dataKey="users"
                  stroke="#C9A646"
                  strokeWidth={2}
                  dot={false}
                  name="Total Users"
                />
                <Bar
                  yAxisId="cost"
                  dataKey="aiCost"
                  fill="#3B82F6"
                  opacity={0.6}
                  radius={[2, 2, 0, 0]}
                  name="AI Cost ($)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}

export default FounderCockpitTab;
