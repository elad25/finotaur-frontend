// src/pages/app/admin/tabs/AIUsageTab.tsx
// ============================================
// AI Consumption per user — leaderboard + per-tier averages + cost
// estimate. Queries the existing public.ai_usage table:
//
//   ai_usage: { user_id, date, questions_count, tokens_used,
//                estimated_cost_usd }
//
// Joined with profiles (email, display_name, account_type) inline via
// the supabase-js foreign-key shorthand. Aggregated client-side.
// No new RPCs, no schema changes.
// ============================================

import { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  AlertTriangle,
  DollarSign,
  MessageSquare,
  Cpu,
  TrendingUp,
} from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { SkeletonStatRow, SkeletonTable } from '@/components/ds/Skeleton';
import { supabase } from '@/lib/supabase';

type WindowDays = 7 | 30 | 90;

interface RawRow {
  user_id: string;
  questions_count: number | null;
  tokens_used: number | null;
  estimated_cost_usd: number | string | null;
}

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  account_type: string | null;
}

interface UserAgg {
  user_id: string;
  email: string;
  displayName: string;
  accountType: string;
  questions: number;
  tokens: number;
  costUsd: number;
}

interface TierAgg {
  tier: string;
  users: number;
  totalQuestions: number;
  totalTokens: number;
  totalCost: number;
  avgCostPerUser: number;
  avgQuestionsPerUser: number;
}

function toNumber(v: number | string | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const parsed = parseFloat(v);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isoNDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

const WINDOW_OPTIONS: WindowDays[] = [7, 30, 90];

export function AIUsageTab() {
  const [windowDays, setWindowDays] = useState<WindowDays>(30);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [profilesById, setProfilesById] = useState<Map<string, ProfileRow>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const since = isoNDaysAgo(windowDays);

        // Step 1: pull ai_usage rows. The FK on ai_usage.user_id targets
        // auth.users(id), NOT public.profiles, so a PostgREST embed
        // (profiles!inner(...)) fails with "no relationship found".
        // Two-step fetch is the supported approach for this shape.
        const { data: usageData, error: usageErr } = await supabase
          .from('ai_usage')
          .select('user_id, questions_count, tokens_used, estimated_cost_usd')
          .gte('date', since)
          .limit(5000);

        if (usageErr) throw usageErr;
        const usageRows = (usageData ?? []) as RawRow[];

        // Step 2: fetch the profile rows for the unique user_ids we saw.
        // Empty input → skip the round-trip.
        const uniqueIds = Array.from(
          new Set(usageRows.map((r) => r.user_id).filter(Boolean)),
        );
        let profileMap = new Map<string, ProfileRow>();
        if (uniqueIds.length > 0) {
          const { data: profileData, error: profileErr } = await supabase
            .from('profiles')
            .select('id, email, display_name, account_type')
            .in('id', uniqueIds);
          if (profileErr) throw profileErr;
          profileMap = new Map(
            ((profileData ?? []) as ProfileRow[]).map((p) => [p.id, p]),
          );
        }

        if (cancelled) return;
        setRows(usageRows);
        setProfilesById(profileMap);
      } catch (err) {
        if (cancelled) return;
        console.error('[AIUsageTab] load failed:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load AI usage data',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [windowDays]);

  const { users, byTier, totals } = useMemo(() => {
    const map = new Map<string, UserAgg>();

    for (const row of rows) {
      const id = row.user_id;
      if (!id) continue;
      const profile = profilesById.get(id) ?? null;
      const existing = map.get(id);
      const q = toNumber(row.questions_count);
      const t = toNumber(row.tokens_used);
      const c = toNumber(row.estimated_cost_usd);

      if (existing) {
        existing.questions += q;
        existing.tokens += t;
        existing.costUsd += c;
      } else {
        map.set(id, {
          user_id: id,
          email: profile?.email ?? '(unknown)',
          displayName: profile?.display_name ?? '',
          accountType: profile?.account_type ?? 'unknown',
          questions: q,
          tokens: t,
          costUsd: c,
        });
      }
    }

    const userList = Array.from(map.values()).sort(
      (a, b) => b.costUsd - a.costUsd
    );

    const tierMap = new Map<string, TierAgg>();
    for (const u of userList) {
      const tier = u.accountType || 'unknown';
      const existing = tierMap.get(tier);
      if (existing) {
        existing.users += 1;
        existing.totalQuestions += u.questions;
        existing.totalTokens += u.tokens;
        existing.totalCost += u.costUsd;
      } else {
        tierMap.set(tier, {
          tier,
          users: 1,
          totalQuestions: u.questions,
          totalTokens: u.tokens,
          totalCost: u.costUsd,
          avgCostPerUser: 0,
          avgQuestionsPerUser: 0,
        });
      }
    }
    const tiers = Array.from(tierMap.values()).map((t) => ({
      ...t,
      avgCostPerUser: t.users > 0 ? t.totalCost / t.users : 0,
      avgQuestionsPerUser: t.users > 0 ? t.totalQuestions / t.users : 0,
    }));
    tiers.sort((a, b) => b.totalCost - a.totalCost);

    const totalsAgg = userList.reduce(
      (acc, u) => {
        acc.questions += u.questions;
        acc.tokens += u.tokens;
        acc.cost += u.costUsd;
        return acc;
      },
      { questions: 0, tokens: 0, cost: 0 }
    );

    return { users: userList, byTier: tiers, totals: totalsAgg };
  }, [rows, profilesById]);

  const leaderboard = users.slice(0, 20);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <SkeletonStatRow count={3} />
        <SkeletonTable rows={8} cols={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">AI usage failed to load</p>
            <p className="text-sm opacity-80 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-start gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
          <Brain className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">AI Consumption</h1>
          <p className="text-sm text-gray-400 mt-1">
            Per-user AI usage from <code className="text-[#D4AF37]">public.ai_usage</code>.
            Estimated dollar cost is the value FINOTAUR writes per call —
            actual provider invoice may differ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {WINDOW_OPTIONS.map((w) => (
            <button
              key={w}
              onClick={() => setWindowDays(w)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                w === windowDays
                  ? 'bg-[#D4AF37] text-black'
                  : 'bg-[#0E0E0E] border border-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {w}d
            </button>
          ))}
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={`Total cost (${windowDays}d)`}
          value={`$${totals.cost.toFixed(2)}`}
          subtitle="estimated_cost_usd sum"
          icon={DollarSign}
        />
        <StatsCard
          title="Total questions"
          value={totals.questions.toLocaleString()}
          subtitle={`${totals.tokens.toLocaleString()} tokens`}
          icon={MessageSquare}
        />
        <StatsCard
          title="Active AI users"
          value={users.length.toLocaleString()}
          subtitle="at least 1 question"
          icon={Cpu}
        />
        <StatsCard
          title="Avg cost / user"
          value={
            users.length > 0
              ? `$${(totals.cost / users.length).toFixed(2)}`
              : '$0.00'
          }
          subtitle="among AI-active users"
          icon={TrendingUp}
        />
      </section>

      <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-800 flex items-baseline justify-between gap-2 flex-wrap">
          <h3 className="text-white font-semibold">
            Top consumers — {windowDays}d
          </h3>
          <span className="text-[11px] text-gray-500">
            top {leaderboard.length} by estimated cost
          </span>
        </header>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No AI usage in the past {windowDays} days.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#0A0A0A] text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-2 font-medium">#</th>
                <th className="text-left px-5 py-2 font-medium">User</th>
                <th className="text-left px-5 py-2 font-medium">Plan</th>
                <th className="text-right px-5 py-2 font-medium">Questions</th>
                <th className="text-right px-5 py-2 font-medium">Tokens</th>
                <th className="text-right px-5 py-2 font-medium">Cost (USD)</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((u, idx) => (
                <tr
                  key={u.user_id}
                  className="border-t border-gray-800 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-2 text-gray-500 text-xs w-10">{idx + 1}</td>
                  <td className="px-5 py-2">
                    <div className="text-white">
                      {u.displayName || '—'}
                    </div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-5 py-2 text-gray-300">{u.accountType}</td>
                  <td className="text-right px-5 py-2 text-gray-300">
                    {u.questions.toLocaleString()}
                  </td>
                  <td className="text-right px-5 py-2 text-gray-400">
                    {u.tokens.toLocaleString()}
                  </td>
                  <td className="text-right px-5 py-2 text-[#D4AF37] font-medium">
                    ${u.costUsd.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-white font-semibold">Per-tier breakdown</h3>
        </header>
        {byTier.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            Nothing to break down yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#0A0A0A] text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-2 font-medium">Tier</th>
                <th className="text-right px-5 py-2 font-medium">Users</th>
                <th className="text-right px-5 py-2 font-medium">
                  Total questions
                </th>
                <th className="text-right px-5 py-2 font-medium">
                  Total cost
                </th>
                <th className="text-right px-5 py-2 font-medium">
                  Avg cost / user
                </th>
                <th className="text-right px-5 py-2 font-medium">
                  Avg questions / user
                </th>
              </tr>
            </thead>
            <tbody>
              {byTier.map((t) => (
                <tr
                  key={t.tier}
                  className="border-t border-gray-800 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-2 text-white">{t.tier}</td>
                  <td className="text-right px-5 py-2 text-gray-300">
                    {t.users.toLocaleString()}
                  </td>
                  <td className="text-right px-5 py-2 text-gray-300">
                    {t.totalQuestions.toLocaleString()}
                  </td>
                  <td className="text-right px-5 py-2 text-[#D4AF37] font-medium">
                    ${t.totalCost.toFixed(2)}
                  </td>
                  <td className="text-right px-5 py-2 text-gray-400">
                    ${t.avgCostPerUser.toFixed(2)}
                  </td>
                  <td className="text-right px-5 py-2 text-gray-400">
                    {t.avgQuestionsPerUser.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default AIUsageTab;
