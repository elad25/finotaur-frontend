// src/pages/app/admin/tabs/AttributionTab.tsx
// ============================================
// Admin "Ad Attribution" tab.
// Calls the admin-gated Postgres RPC `admin_ad_attribution(p_days)`
// and renders which ads/platforms/campaigns bring signups.
// ============================================

import { useEffect, useState } from 'react';
import { Megaphone, AlertTriangle, Users, Target, Compass, Info } from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { SkeletonStatRow, SkeletonTable } from '@/components/ds/Skeleton';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AttributionTotals {
  signups: number;
  attributed: number;
  organic: number;
}

interface PlatformCount {
  platform: string;
  signups: number;
}

interface CampaignCount {
  utm_campaign: string;
  utm_source: string;
  signups: number;
}

interface AdCount {
  utm_content: string;
  utm_campaign: string;
  utm_source: string;
  signups: number;
}

interface SignupRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  ts: string;
  platform: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  landing_page: string | null;
  method: string | null;
}

interface AdAttributionData {
  window_days: number;
  totals: AttributionTotals;
  by_platform: PlatformCount[];
  by_campaign: CampaignCount[];
  by_ad: AdCount[];
  signups: SignupRow[];
}

type WindowDays = 7 | 30 | 90;

const WINDOW_OPTIONS: WindowDays[] = [7, 30, 90];
const MAX_RECENT_SIGNUPS = 100;
const GOLD = '#C9A646';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a decimal ratio as a percentage string, guarding divide-by-zero. */
function pct(num: number, denom: number): string {
  if (!denom || !Number.isFinite(denom)) return '0%';
  return `${Math.round((num / denom) * 100)}%`;
}

/** Shorten a long URL for a table cell; full value available via title tooltip. */
function shortenUrl(url: string, maxLen = 40): string {
  if (url.length <= maxLen) return url;
  return `${url.slice(0, maxLen - 1)}…`;
}

/** Best-effort human label for a signup row when email is missing. */
function signupLabel(row: SignupRow): string {
  if (row.email) return row.email;
  if (row.display_name) return row.display_name;
  return `${row.user_id.slice(0, 8)}…`;
}

function formatTs(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AttributionTab() {
  const [days, setDays] = useState<WindowDays>(90);
  const [data, setData] = useState<AdAttributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          'admin_ad_attribution',
          { p_days: days }
        );
        if (rpcErr) throw rpcErr;
        if (cancelled) return;
        setData(rpcData as AdAttributionData);
      } catch (err) {
        if (cancelled) return;
        console.error('[AttributionTab] load failed:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load ad attribution data'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const windowToggle = (
    <div className="flex items-center gap-1 bg-[#111111] border border-gray-800 rounded-lg p-1 shrink-0">
      {WINDOW_OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setDays(opt)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            days === opt
              ? 'bg-[#C9A646] text-black font-semibold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {opt}d
        </button>
      ))}
    </div>
  );

  // ---- Header (shown in every state so the toggle stays interactive) ----
  const header = (
    <header className="flex items-start gap-4 flex-wrap justify-between">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-[#C9A646]/10 flex items-center justify-center shrink-0">
          <Megaphone className="w-6 h-6 text-[#C9A646]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">Ad Attribution</h1>
          <p className="text-sm text-gray-400 mt-1">
            Which ads and platforms bring signups
          </p>
        </div>
      </div>
      {windowToggle}
    </header>
  );

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="p-8 space-y-6">
        {header}
        <SkeletonStatRow count={3} />
        <SkeletonTable rows={6} cols={3} />
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="p-8 space-y-6">
        {header}
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Ad Attribution failed to load</p>
            <p className="text-sm opacity-80 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ---- Empty state ----
  if (!data) {
    return (
      <div className="p-8 space-y-6">
        {header}
        <div className="text-center text-gray-500 text-sm py-8">
          No attribution data available yet.
        </div>
      </div>
    );
  }

  const { totals, by_platform, by_campaign, by_ad, signups } = data;
  const maxPlatform = by_platform.length > 0 ? Math.max(...by_platform.map((p) => p.signups)) : 1;
  const recentSignups = [...signups]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, MAX_RECENT_SIGNUPS);

  return (
    <div className="p-8 space-y-6">
      {header}

      {/* ---- KPI cards ---- */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Total Signups"
          value={totals.signups.toLocaleString()}
          subtitle={`last ${data.window_days}d`}
          icon={Users}
        />
        <StatsCard
          title="Attributed"
          value={totals.attributed.toLocaleString()}
          subtitle={`${pct(totals.attributed, totals.signups)} of total — from ads or tagged links`}
          icon={Target}
        />
        <StatsCard
          title="Organic / Direct"
          value={totals.organic.toLocaleString()}
          subtitle={`${pct(totals.organic, totals.signups)} of total`}
          icon={Compass}
        />
      </section>

      {/* ---- Signups by platform ---- */}
      <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-[#C9A646]" />
          <h3 className="text-white font-semibold">Signups by Platform</h3>
        </header>
        {by_platform.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No platform data yet.</p>
        ) : (
          <ul className="px-5 py-4 space-y-3">
            {by_platform.map((p) => {
              const barPct = maxPlatform > 0 ? Math.round((p.signups / maxPlatform) * 100) : 0;
              return (
                <li key={p.platform}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm text-gray-200 truncate flex-1 pr-3">
                      {p.platform}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0 pr-3">
                      {pct(p.signups, totals.signups)}
                    </span>
                    <span className="text-xs text-[#C9A646] font-semibold shrink-0">
                      {p.signups.toLocaleString()}
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

      {/* ---- By campaign ---- */}
      {by_campaign.length === 0 ? (
        <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#C9A646]" />
            <h3 className="text-white font-semibold">By Campaign</h3>
          </header>
          <p className="text-sm text-gray-500 text-center py-8">
            No campaign-tagged signups in this window yet.
          </p>
        </section>
      ) : (
        <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#C9A646]" />
            <h3 className="text-white font-semibold">By Campaign</h3>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-800">
                  <th className="px-5 py-2 font-medium">Campaign</th>
                  <th className="px-5 py-2 font-medium">Source</th>
                  <th className="px-5 py-2 font-medium text-right">Signups</th>
                </tr>
              </thead>
              <tbody>
                {by_campaign.map((c, idx) => (
                  <tr
                    key={`${c.utm_campaign}-${c.utm_source}-${idx}`}
                    className="border-b border-gray-900 last:border-0"
                  >
                    <td className="px-5 py-2.5 text-gray-200">{c.utm_campaign || '—'}</td>
                    <td className="px-5 py-2.5 text-gray-400">{c.utm_source || '—'}</td>
                    <td className="px-5 py-2.5 text-right text-[#C9A646] font-semibold">
                      {c.signups.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---- By ad ---- */}
      {by_ad.length === 0 ? (
        <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#C9A646]" />
            <h3 className="text-white font-semibold">By Ad</h3>
          </header>
          <p className="text-sm text-gray-500 text-center py-8">
            No ad-level attribution yet — make sure each ad URL carries utm_content.
          </p>
        </section>
      ) : (
        <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#C9A646]" />
            <h3 className="text-white font-semibold">By Ad</h3>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-800">
                  <th className="px-5 py-2 font-medium">Ad</th>
                  <th className="px-5 py-2 font-medium">Campaign</th>
                  <th className="px-5 py-2 font-medium">Source</th>
                  <th className="px-5 py-2 font-medium text-right">Signups</th>
                </tr>
              </thead>
              <tbody>
                {by_ad.map((a, idx) => (
                  <tr
                    key={`${a.utm_content}-${a.utm_campaign}-${idx}`}
                    className="border-b border-gray-900 last:border-0"
                  >
                    <td className="px-5 py-2.5 text-gray-200">{a.utm_content || '—'}</td>
                    <td className="px-5 py-2.5 text-gray-400">{a.utm_campaign || '—'}</td>
                    <td className="px-5 py-2.5 text-gray-400">{a.utm_source || '—'}</td>
                    <td className="px-5 py-2.5 text-right text-[#C9A646] font-semibold">
                      {a.signups.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---- Recent signups ---- */}
      <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
          <Info className="w-4 h-4 text-[#C9A646]" />
          <h3 className="text-white font-semibold">Recent Signups</h3>
          {signups.length > MAX_RECENT_SIGNUPS && (
            <span className="text-xs text-gray-500 ml-auto">
              showing latest {MAX_RECENT_SIGNUPS} of {signups.length.toLocaleString()}
            </span>
          )}
        </header>
        {recentSignups.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No signups in this window yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-800">
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">User</th>
                  <th className="px-5 py-2 font-medium">Platform</th>
                  <th className="px-5 py-2 font-medium">Source</th>
                  <th className="px-5 py-2 font-medium">Campaign</th>
                  <th className="px-5 py-2 font-medium">Ad</th>
                  <th className="px-5 py-2 font-medium">Referrer</th>
                  <th className="px-5 py-2 font-medium">Landing Page</th>
                </tr>
              </thead>
              <tbody>
                {recentSignups.map((row) => (
                  <tr key={row.user_id} className="border-b border-gray-900 last:border-0">
                    <td className="px-5 py-2.5 text-gray-400 whitespace-nowrap">
                      {formatTs(row.ts)}
                    </td>
                    <td className="px-5 py-2.5 text-gray-200">{signupLabel(row)}</td>
                    <td className="px-5 py-2.5">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-[#C9A646]/10 text-[#C9A646] border border-[#C9A646]/20">
                        {row.platform}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-gray-400">{row.utm_source || '—'}</td>
                    <td className="px-5 py-2.5 text-gray-400">{row.utm_campaign || '—'}</td>
                    <td className="px-5 py-2.5 text-gray-400">{row.utm_content || '—'}</td>
                    <td
                      className="px-5 py-2.5 text-gray-500 font-mono text-xs max-w-[200px] truncate"
                      title={row.referrer || undefined}
                    >
                      {row.referrer ? shortenUrl(row.referrer) : '—'}
                    </td>
                    <td
                      className="px-5 py-2.5 text-gray-500 font-mono text-xs max-w-[200px] truncate"
                      title={row.landing_page || undefined}
                    >
                      {row.landing_page ? shortenUrl(row.landing_page) : '—'}
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

export default AttributionTab;
