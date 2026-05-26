// src/pages/app/admin/tabs/tools/HealthRiskPanel.tsx
// ============================================
// Risk Watch — calls getAllUsers once for a sample of paying subscribers
// and runs computeHealthScore on each, surfacing distribution + a list
// of the lowest-scoring users so we know who to reach out to.
//
// No new RPCs: leans entirely on the cached getAllUsers + the pure
// healthScore.ts lib added in the same Phase.
// ============================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { getAllUsers, invalidateUserCaches } from '@/services/adminService';
import {
  computeHealthScore,
  aggregateHealth,
  BUCKET_META,
  type HealthBucket,
} from '@/lib/admin/healthScore';
import type { UserWithStats } from '@/types/admin';

const SAMPLE_SIZE = 200;

interface ScoredUser {
  user: UserWithStats;
  health: ReturnType<typeof computeHealthScore>;
}

export function HealthRiskPanel() {
  const [scored, setScored] = useState<ScoredUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await getAllUsers({}, { page: 1, pageSize: SAMPLE_SIZE });
      const agg = aggregateHealth(res.data);
      setScored(agg.scored);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleRefresh() {
    invalidateUserCaches();
    load();
  }

  const distribution = (Object.keys(BUCKET_META) as HealthBucket[]).map(
    (bucket) => {
      const count = scored.filter((s) => s.health.bucket === bucket).length;
      const percent = scored.length > 0 ? (count / scored.length) * 100 : 0;
      return { bucket, count, percent };
    }
  );

  // Sort by score ascending — riskiest first
  const riskiest = [...scored]
    .sort((a, b) => a.health.score - b.health.score)
    .filter((s) => s.health.bucket === 'at-risk' || s.health.bucket === 'churning')
    .slice(0, 20);

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
            <Heart className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Risk Watch</h1>
            <p className="text-sm text-gray-400 mt-1">
              Health Score 0-100 per subscriber.
              Pull from a sample of {SAMPLE_SIZE} Whop-verified users
              {total > 0 && ` (of ${total.toLocaleString()} total)`}.
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                     px-3 py-1.5 rounded-md bg-white/5 border border-gray-800"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Distribution */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {distribution.map(({ bucket, count, percent }) => {
          const meta = BUCKET_META[bucket];
          return (
            <div
              key={bucket}
              className={`rounded-lg p-4 border ${meta.bg} ${meta.border}`}
            >
              <p className={`text-[11px] uppercase tracking-wide font-semibold ${meta.color}`}>
                {meta.label}
              </p>
              <p className="text-3xl font-bold text-white mt-1">
                {count.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {percent.toFixed(1)}% of sample
              </p>
              <p className="text-[11px] text-gray-500 mt-2 leading-snug">
                {meta.description}
              </p>
            </div>
          );
        })}
      </section>

      {/* Distribution bar */}
      <section className="bg-[#111111] border border-gray-800 rounded-lg p-5">
        <header className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-[#D4AF37]" />
          <h3 className="text-white font-semibold text-sm">Distribution</h3>
        </header>
        <div className="flex h-3 rounded-full overflow-hidden bg-[#0A0A0A]">
          {distribution.map(({ bucket, percent }) => {
            const bg = {
              healthy: 'bg-green-500',
              watch: 'bg-yellow-500',
              'at-risk': 'bg-orange-500',
              churning: 'bg-red-500',
            }[bucket];
            return (
              <div
                key={bucket}
                className={bg}
                style={{ width: `${percent}%` }}
                title={`${bucket}: ${percent.toFixed(1)}%`}
              />
            );
          })}
        </div>
      </section>

      {/* Riskiest table */}
      <section className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-white font-semibold text-sm">
            Reach-out list — lowest 20 scores
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Sorted ascending by score. Tap a row for the full user profile.
          </p>
        </header>

        {loading && scored.length === 0 && (
          <p className="p-8 text-center text-sm text-gray-500">
            Scoring users…
          </p>
        )}

        {!loading && riskiest.length === 0 && (
          <p className="p-8 text-center text-sm text-gray-500">
            Nobody in the at-risk or churning buckets in this sample. 🎉
          </p>
        )}

        {riskiest.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-[#0A0A0A] text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-2 font-medium">User</th>
                <th className="text-left px-5 py-2 font-medium">Plan</th>
                <th className="text-right px-5 py-2 font-medium">Score</th>
                <th className="text-left px-5 py-2 font-medium">Why</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {riskiest.map(({ user, health }) => {
                const meta = BUCKET_META[health.bucket];
                return (
                  <tr
                    key={user.id}
                    className="border-t border-gray-800 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3">
                      <p className="text-white text-sm font-medium truncate max-w-[200px]">
                        {user.display_name || user.email}
                      </p>
                      {user.display_name && (
                        <p className="text-[11px] text-gray-500 truncate max-w-[200px]">
                          {user.email}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-gray-400">
                        {user.account_type}
                      </span>
                      {user.subscription_interval && (
                        <span className="text-[11px] text-gray-600 ml-1">
                          ({user.subscription_interval})
                        </span>
                      )}
                    </td>
                    <td className="text-right px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-xs font-semibold ${meta.bg} ${meta.color}`}
                      >
                        {health.score}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {health.negatives.slice(0, 2).join(' · ') ||
                          '(no specific risk markers)'}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        to={`/app/admin/users/${user.id}`}
                        className="text-gray-500 hover:text-[#D4AF37] inline-flex"
                        title="Open user profile"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Formula transparency */}
      <section className="bg-[#0E0E0E] border border-gray-800 rounded-lg p-5">
        <h3 className="text-white font-semibold text-sm mb-2">How the score is built</h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          Baseline 50. Recency of last login adds up to +30 or subtracts up to
          -30. Subscription state adds up to +20 (active) or subtracts up to
          -30 (cancelled). Trade engagement adds up to +15. Login regularity
          adds up to +5. Bans subtract 50. Final score clamped 0-100, bucketed
          as Healthy (75+) / Watch (50-74) / At-Risk (25-49) / Churning (&lt;25).
        </p>
        <p className="text-[11px] text-gray-500 mt-2">
          Frontend-only v1 — sources: <code className="text-gray-400">last_login_at</code>,{' '}
          <code className="text-gray-400">subscription_status</code>,{' '}
          <code className="text-gray-400">total_trades</code>,{' '}
          <code className="text-gray-400">login_count</code>,{' '}
          <code className="text-gray-400">is_banned</code>. No DB migration.
        </p>
      </section>
    </div>
  );
}
