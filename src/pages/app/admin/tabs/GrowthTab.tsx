// src/pages/app/admin/tabs/GrowthTab.tsx
// ============================================
// Admin "Growth Intelligence" tab.
// Calls the admin-gated Postgres RPC `admin_growth_intel` (no args)
// and renders traffic, funnel, page views, sources, and signup attribution.
// ============================================

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Eye,
  Users,
  Activity,
  BarChart2,
  Info,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { StatsCard } from '@/components/admin/StatsCard';
import { SkeletonStatRow, SkeletonTable } from '@/components/ds/Skeleton';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrafficStats {
  events_7d: number;
  events_30d: number;
  pageviews_7d: number;
  pageviews_30d: number;
  sessions_30d: number;
  visitors_30d: number;
}

interface TopPage {
  page: string;
  views: number;
}

interface DailyPageview {
  day: string; // "YYYY-MM-DD"
  views: number;
}

interface SourceCount {
  source: string;
  count: number;
}

interface SignupBySource {
  source: string;
  signups: number;
}

interface FunnelStats {
  visitors_30d: number;
  signups_30d: number;
  paying: number;
}

interface GrowthIntelData {
  traffic: TrafficStats;
  top_pages: TopPage[];
  daily_pageviews: DailyPageview[];
  sources: SourceCount[];
  signups_by_source: SignupBySource[];
  funnel: FunnelStats;
  signup_events_total: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a decimal ratio as a percentage string, guarding divide-by-zero. */
function pct(num: number, denom: number): string {
  if (!denom || !Number.isFinite(denom)) return '0%';
  return `${Math.round((num / denom) * 100)}%`;
}

/** Shorten a full path for display in a narrow column. */
function shortenPath(path: string): string {
  if (path.length <= 40) return path;
  return `${path.slice(0, 37)}…`;
}

const GOLD = '#C9A646';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GrowthTab() {
  const [data, setData] = useState<GrowthIntelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          'admin_growth_intel'
        );
        if (rpcErr) throw rpcErr;
        if (cancelled) return;
        setData(rpcData as GrowthIntelData);
      } catch (err) {
        if (cancelled) return;
        console.error('[GrowthTab] load failed:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load growth intelligence data'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <SkeletonStatRow count={4} />
        <SkeletonTable rows={6} cols={3} />
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Growth Intelligence failed to load</p>
            <p className="text-sm opacity-80 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ---- Empty state ----
  if (!data) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">
        No growth data available yet.
      </div>
    );
  }

  const { traffic, top_pages, daily_pageviews, sources, signups_by_source, funnel, signup_events_total } = data;

  const maxPageViews = top_pages.length > 0 ? Math.max(...top_pages.map((p) => p.views)) : 1;
  const maxSource = sources.length > 0 ? Math.max(...sources.map((s) => s.count)) : 1;
  const maxSignupSource = signups_by_source.length > 0 ? Math.max(...signups_by_source.map((s) => s.signups)) : 1;

  return (
    <div className="p-8 space-y-6">
      {/* ---- Header ---- */}
      <header className="flex items-start gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-lg bg-[#C9A646]/10 flex items-center justify-center shrink-0">
          <TrendingUp className="w-6 h-6 text-[#C9A646]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">Growth Intelligence</h1>
          <p className="text-sm text-gray-400 mt-1">
            Traffic, funnel, and signup attribution from{' '}
            <code className="text-[#C9A646]">admin_growth_intel</code>. All data is admin-gated server-side.
          </p>
        </div>
      </header>

      {/* ---- (a) Traffic stat tiles ---- */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Page Views (30d)"
          value={traffic.pageviews_30d.toLocaleString('en-US')}
          subtitle={`${traffic.pageviews_7d.toLocaleString('en-US')} in last 7d`}
          icon={Eye}
        />
        <StatsCard
          title="Sessions (30d)"
          value={traffic.sessions_30d.toLocaleString('en-US')}
          subtitle="rolling 30 days"
          icon={Activity}
        />
        <StatsCard
          title="Unique Visitors (30d)"
          value={traffic.visitors_30d.toLocaleString('en-US')}
          subtitle="distinct anon_ids"
          icon={Users}
        />
        <StatsCard
          title="Events (30d)"
          value={traffic.events_30d.toLocaleString('en-US')}
          subtitle={`${traffic.events_7d.toLocaleString('en-US')} in last 7d`}
          icon={BarChart2}
        />
      </section>

      {/* ---- (c) Funnel ---- */}
      <section className="bg-[#111111] border border-gray-800 rounded-lg p-5">
        <h3 className="text-white font-semibold mb-4 text-sm">Conversion Funnel (30d)</h3>
        <div className="flex flex-col sm:flex-row items-stretch gap-0">
          {/* Step: Visitors */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#0A0A0A] rounded-lg text-center">
            <span className="text-xs text-gray-500 uppercase tracking-wide mb-1">Visitors</span>
            <span className="text-3xl font-bold text-white">
              {funnel.visitors_30d.toLocaleString('en-US')}
            </span>
          </div>

          {/* Arrow + conversion: visitors → signups */}
          <div className="flex sm:flex-col items-center justify-center px-2 py-3 shrink-0">
            <span className="hidden sm:block text-[#C9A646] text-lg">↓</span>
            <span className="sm:hidden text-[#C9A646] text-lg">→</span>
            <span className="text-xs text-[#C9A646] font-semibold whitespace-nowrap">
              {pct(funnel.signups_30d, funnel.visitors_30d)}
            </span>
          </div>

          {/* Step: Signups */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#0A0A0A] rounded-lg text-center">
            <span className="text-xs text-gray-500 uppercase tracking-wide mb-1">Signups</span>
            <span className="text-3xl font-bold text-white">
              {funnel.signups_30d.toLocaleString('en-US')}
            </span>
          </div>

          {/* Arrow + conversion: signups → paying */}
          <div className="flex sm:flex-col items-center justify-center px-2 py-3 shrink-0">
            <span className="hidden sm:block text-[#C9A646] text-lg">↓</span>
            <span className="sm:hidden text-[#C9A646] text-lg">→</span>
            <span className="text-xs text-[#C9A646] font-semibold whitespace-nowrap">
              {pct(funnel.paying, funnel.signups_30d)}
            </span>
          </div>

          {/* Step: Paying */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#0A0A0A] rounded-lg text-center">
            <span className="text-xs text-gray-500 uppercase tracking-wide mb-1">Paying</span>
            <span className="text-3xl font-bold text-white">
              {funnel.paying.toLocaleString('en-US')}
            </span>
          </div>
        </div>
      </section>

      {/* ---- (d) Daily Page Views chart ---- */}
      {daily_pageviews.length > 0 && (
        <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#C9A646]" />
            <h3 className="text-white font-semibold">Daily Page Views</h3>
          </header>
          <div className="px-5 py-5" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={daily_pageviews}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #374151',
                    borderRadius: 6,
                    fontSize: 12,
                    color: '#e5e7eb',
                  }}
                  cursor={{ stroke: 'rgba(255,255,255,0.08)' }}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke={GOLD}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: GOLD }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ---- (e) Top Pages ---- */}
      <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-[#C9A646]" />
          <h3 className="text-white font-semibold">Top Pages</h3>
        </header>
        {top_pages.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No page view data yet.</p>
        ) : (
          <ul className="px-5 py-4 space-y-3">
            {top_pages.map((page) => {
              const barPct = maxPageViews > 0 ? Math.round((page.views / maxPageViews) * 100) : 0;
              return (
                <li key={page.page}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span
                      className="text-sm text-gray-200 truncate flex-1 pr-3 font-mono"
                      title={page.page}
                    >
                      {shortenPath(page.page)}
                    </span>
                    <span className="text-xs text-[#C9A646] font-semibold shrink-0">
                      {page.views.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${barPct}%`, backgroundColor: GOLD, opacity: 0.7 }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---- (f) Traffic Sources ---- */}
      <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#C9A646]" />
          <h3 className="text-white font-semibold">Traffic Sources</h3>
        </header>
        {sources.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No source data yet.</p>
        ) : (
          <div className="px-5 py-5" style={{ height: Math.max(180, sources.length * 36 + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sources}
                layout="vertical"
                margin={{ top: 4, right: 40, left: 0, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="source"
                  width={90}
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
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
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {sources.map((s, idx) => (
                    <Cell key={idx} fill={GOLD} opacity={0.75 - idx * 0.04} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ---- (g) Signup Attribution ---- */}
      <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#C9A646]" />
          <h3 className="text-white font-semibold">Signup Attribution</h3>
        </header>

        {signup_events_total === 0 ? (
          /* Empty-state: instrumentation just shipped — explain next steps */
          <div className="px-5 py-6 flex items-start gap-3">
            <Info className="w-5 h-5 text-[#C9A646] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-200 font-medium mb-1">
                Attribution starts collecting now.
              </p>
              <p className="text-sm text-gray-400 leading-relaxed">
                Tag your marketing links with UTM parameters (e.g.{' '}
                <code className="text-[#C9A646] text-xs">
                  ?utm_source=instagram&amp;utm_campaign=reel_options
                </code>
                ) and signups will be attributed here.
              </p>
            </div>
          </div>
        ) : signups_by_source.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No attributed signups yet.</p>
        ) : (
          <ul className="px-5 py-4 space-y-3">
            {signups_by_source.map((s) => {
              const barPct = maxSignupSource > 0 ? Math.round((s.signups / maxSignupSource) * 100) : 0;
              return (
                <li key={s.source}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm text-gray-200 truncate flex-1 pr-3 capitalize">
                      {s.source}
                    </span>
                    <span className="text-xs text-[#C9A646] font-semibold shrink-0">
                      {s.signups.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${barPct}%`, backgroundColor: GOLD, opacity: 0.7 }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default GrowthTab;
