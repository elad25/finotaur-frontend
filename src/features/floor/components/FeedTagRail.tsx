// src/features/floor/components/FeedTagRail.tsx
// Right rail for the global community feed — insights/leaderboard rail.
//
// Filtering moved to channel-based navigation (FloorChannelBar). This rail now
// renders a single panel:
//   "Top this week" — traders ranked by consistency (win rate + profit
//   factor), NEVER by net P&L (community_consistency_leaderboard).

import type { ConsistencyLeaderboardRow } from '@/features/floor/types/community';

// ── Leaderboard avatar (monogram fallback) ──────────────────────────────────────

function RankAvatar({ name }: { name: string }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div
      aria-hidden="true"
      className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-semibold bg-surface-2 border-[0.5px] border-border-ds-subtle text-ink-secondary"
    >
      {initial}
    </div>
  );
}

// ── Main rail ────────────────────────────────────────────────────────────────────

export interface FeedTagRailProps {
  leaderboard: ConsistencyLeaderboardRow[];
}

export function FeedTagRail({ leaderboard }: FeedTagRailProps) {
  return (
    <aside className="flex flex-col gap-ds-4">
      {/* Top this week */}
      {leaderboard.length > 0 && (
        <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-4 flex flex-col gap-ds-3">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-primary">
            Top this week
          </span>
          <div className="flex flex-col gap-ds-3">
            {leaderboard.map((row) => (
              <div key={row.user_id} className="flex items-center gap-ds-2">
                <span className="font-mono text-[11px] tabular-nums text-ink-tertiary w-[14px] shrink-0">
                  {row.rank}
                </span>
                <RankAvatar name={row.display_name} />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-sans text-[12px] text-ink-primary truncate">
                    {row.display_name}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-ink-tertiary">
                    {row.win_rate != null ? `${Math.round(row.win_rate * 100)}% WR` : '—'}
                    {row.profit_factor != null && (
                      <span className="text-ink-secondary"> · {row.profit_factor.toFixed(1)} PF</span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
