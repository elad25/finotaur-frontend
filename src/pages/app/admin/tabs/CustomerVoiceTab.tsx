// src/pages/app/admin/tabs/CustomerVoiceTab.tsx
// ============================================
// Admin "Customer Voice" tab — product-feedback intelligence.
// Calls the admin-gated Postgres RPC `admin_voice_summary` (no args)
// and renders the resulting JSON as a structured dashboard.
// ============================================

import { useEffect, useState } from 'react';
import {
  MessageSquare,
  AlertTriangle,
  Bug,
  Star,
  TrendingDown,
  Zap,
  HelpCircle,
} from 'lucide-react';
import {
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

type Category =
  | 'bug'
  | 'request'
  | 'churn'
  | 'pain'
  | 'praise'
  | 'question'
  | 'other';

interface LabelCount {
  label: string;
  count: number;
}

interface ChurnTrendPoint {
  month: string; // "YYYY-MM"
  count: number;
}

interface SignalEntry {
  summary: string;
  theme: string;
  occurred_at: string;
}

interface RecentSignal {
  occurred_at: string;
  category: string;
  theme_label: string;
  sentiment: string;
  summary: string;
  source: string;
}

interface VoiceSummary {
  total: number;
  new_7d: number;
  new_30d: number;
  by_category: Partial<Record<Category, number>>;
  top_requests: LabelCount[];
  churn_themes: LabelCount[];
  churn_trend: ChurnTrendPoint[];
  open_bugs: SignalEntry[];
  pain: SignalEntry[];
  recent: RecentSignal[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeDate(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const CATEGORY_COLORS: Record<string, string> = {
  bug: '#ef4444',
  request: '#C9A646',
  churn: '#f97316',
  pain: '#94a3b8',
  praise: '#22c55e',
  question: '#60a5fa',
  other: '#6b7280',
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  request: 'Request',
  churn: 'Churn',
  pain: 'Pain',
  praise: 'Praise',
  question: 'Question',
  other: 'Other',
};

function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
  const label = CATEGORY_LABELS[category] ?? category;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
      style={{ color, backgroundColor: `${color}20`, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CustomerVoiceTab() {
  const [data, setData] = useState<VoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          'admin_voice_summary'
        );
        if (rpcErr) throw rpcErr;
        if (cancelled) return;
        setData(rpcData as VoiceSummary);
      } catch (err) {
        if (cancelled) return;
        console.error('[CustomerVoiceTab] load failed:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load customer voice data'
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
        <SkeletonStatRow count={3} />
        <SkeletonTable rows={6} cols={4} />
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
            <p className="font-semibold">Customer Voice failed to load</p>
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
        No customer voice data available yet.
      </div>
    );
  }

  const {
    total,
    new_7d,
    new_30d,
    by_category,
    top_requests,
    churn_themes,
    churn_trend,
    open_bugs,
    pain,
    recent,
  } = data;

  // Category chips (only categories with count > 0 — already enforced by RPC,
  // but filter defensively)
  const categoryChips = (Object.entries(by_category) as [string, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  // Bar widths for top_requests and churn_themes
  const maxRequests = top_requests.length > 0
    ? Math.max(...top_requests.map((r) => r.count))
    : 1;

  const maxChurnTheme = churn_themes.length > 0
    ? Math.max(...churn_themes.map((r) => r.count))
    : 1;

  return (
    <div className="p-8 space-y-6">
      {/* ---- Header ---- */}
      <header className="flex items-start gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-lg bg-[#C9A646]/10 flex items-center justify-center shrink-0">
          <MessageSquare className="w-6 h-6 text-[#C9A646]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">Customer Voice</h1>
          <p className="text-sm text-gray-400 mt-1">
            Product-feedback intelligence from{' '}
            <code className="text-[#C9A646]">admin_voice_summary</code>. All
            signals are admin-gated server-side.
          </p>
        </div>
      </header>

      {/* ---- Stat tiles ---- */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Total signals"
          value={total.toLocaleString('en-US')}
          subtitle="all time"
          icon={MessageSquare}
        />
        <StatsCard
          title="New (7d)"
          value={new_7d.toLocaleString('en-US')}
          subtitle="last 7 days"
          icon={Zap}
        />
        <StatsCard
          title="New (30d)"
          value={new_30d.toLocaleString('en-US')}
          subtitle="last 30 days"
          icon={TrendingDown}
        />
      </section>

      {/* ---- Category breakdown chips ---- */}
      {categoryChips.length > 0 && (
        <section className="bg-[#111111] border border-gray-800 rounded-lg p-5">
          <h3 className="text-white font-semibold mb-3 text-sm">
            By category
          </h3>
          <div className="flex flex-wrap gap-2">
            {categoryChips.map(([cat, count]) => {
              const color = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other;
              const label = CATEGORY_LABELS[cat] ?? cat;
              return (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    color,
                    backgroundColor: `${color}15`,
                    border: `1px solid ${color}25`,
                  }}
                >
                  {label}
                  <span className="opacity-70">{count}</span>
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* ---- Top Feature Requests ---- */}
      <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
          <Star className="w-4 h-4 text-[#C9A646]" />
          <h3 className="text-white font-semibold">Top Feature Requests</h3>
        </header>
        {top_requests.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No feature requests yet.
          </p>
        ) : (
          <ul className="px-5 py-4 space-y-3">
            {top_requests.map((req) => {
              const pct = maxRequests > 0
                ? Math.round((req.count / maxRequests) * 100)
                : 0;
              return (
                <li key={req.label}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm text-gray-200 truncate flex-1 pr-3">
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
        )}
      </section>

      {/* ---- Churn Over Time ---- */}
      {churn_trend.length > 0 && (
        <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-orange-400" />
            <h3 className="text-white font-semibold">Churn Over Time</h3>
          </header>
          <div className="px-5 py-5" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={churn_trend}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
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
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {churn_trend.map((_, idx) => (
                    <Cell key={idx} fill="#f97316" opacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ---- Churn Themes ---- */}
      {churn_themes.length > 0 && (
        <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-orange-400" />
            <h3 className="text-white font-semibold">Churn Themes</h3>
          </header>
          <ul className="px-5 py-4 space-y-3">
            {churn_themes.map((t) => {
              const pct = maxChurnTheme > 0
                ? Math.round((t.count / maxChurnTheme) * 100)
                : 0;
              return (
                <li key={t.label}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm text-gray-200 truncate flex-1 pr-3">
                      {t.label}
                    </span>
                    <span className="text-xs text-orange-400 font-semibold shrink-0">
                      {t.count}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: '#f97316',
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ---- Open Bugs + Pain (side-by-side on large screens) ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Open Bugs */}
        <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
            <Bug className="w-4 h-4 text-red-400" />
            <h3 className="text-white font-semibold">Open Bugs</h3>
          </header>
          {open_bugs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No open bugs.
            </p>
          ) : (
            <ul className="divide-y divide-gray-800">
              {open_bugs.map((bug, idx) => (
                <li key={idx} className="px-5 py-3">
                  <p className="text-sm text-gray-200 leading-snug">
                    {bug.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] bg-gray-800 text-gray-400 rounded px-1.5 py-0.5">
                      {bug.theme}
                    </span>
                    <span className="text-[11px] text-gray-600">
                      {relativeDate(bug.occurred_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pain / Confusion */}
        <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <h3 className="text-white font-semibold">Pain / Confusion</h3>
          </header>
          {pain.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No pain points recorded.
            </p>
          ) : (
            <ul className="divide-y divide-gray-800">
              {pain.map((p, idx) => (
                <li key={idx} className="px-5 py-3">
                  <p className="text-sm text-gray-200 leading-snug">
                    {p.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] bg-gray-800 text-gray-400 rounded px-1.5 py-0.5">
                      {p.theme}
                    </span>
                    <span className="text-[11px] text-gray-600">
                      {relativeDate(p.occurred_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ---- Recent Signals ---- */}
      <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-800 flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-white font-semibold">Recent Signals</h3>
          <span className="text-[11px] text-gray-500">
            {recent.length} signal{recent.length !== 1 ? 's' : ''}
          </span>
        </header>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No recent signals.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0A0A0A] text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-2 font-medium whitespace-nowrap">
                    Date
                  </th>
                  <th className="text-left px-5 py-2 font-medium">Category</th>
                  <th className="text-left px-5 py-2 font-medium">Theme</th>
                  <th className="text-left px-5 py-2 font-medium">Source</th>
                  <th className="text-left px-5 py-2 font-medium">Summary</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((sig, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-gray-800 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-2 text-gray-500 text-xs whitespace-nowrap">
                      {relativeDate(sig.occurred_at)}
                    </td>
                    <td className="px-5 py-2">
                      <CategoryBadge category={sig.category} />
                    </td>
                    <td className="px-5 py-2 text-gray-400 text-xs">
                      {sig.theme_label}
                    </td>
                    <td className="px-5 py-2 text-gray-500 text-xs capitalize">
                      {sig.source}
                    </td>
                    <td className="px-5 py-2 text-gray-300 text-xs max-w-xs truncate">
                      {sig.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default CustomerVoiceTab;
