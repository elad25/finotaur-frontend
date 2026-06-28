// src/features/floor/components/FeedTagRail.tsx
// Right rail for the global community feed.
//
// Two stacked panels:
//   1. "Filter by tag" — facet chips grouped by Instrument / Strategy /
//      Outcome / Tier. Single-select per dimension; clicking an active chip
//      clears that dimension. Counts come from feed_tag_facets().
//   2. "Top this week" — traders ranked by consistency (win rate + profit
//      factor), NEVER by net P&L (community_consistency_leaderboard).

import { cn } from '@/lib/utils';
import type {
  FeedFacet,
  FeedFacetKind,
  FeedFilters,
  ConsistencyLeaderboardRow,
} from '@/features/floor/types/community';

// ── Facet → filter-field mapping ────────────────────────────────────────────────

const GROUPS: { kind: FeedFacetKind; label: string }[] = [
  { kind: 'symbol', label: 'Instrument' },
  { kind: 'strategy_category', label: 'Strategy' },
  { kind: 'outcome', label: 'Outcome' },
  { kind: 'tier', label: 'Membership' },
];

function isActive(kind: FeedFacetKind, value: string, filters: FeedFilters): boolean {
  switch (kind) {
    case 'symbol':
      return filters.symbol === value;
    case 'strategy_category':
      return filters.strategyCategory === value;
    case 'outcome':
      return filters.outcome === value;
    case 'tier':
      return filters.tier === value;
    default:
      return false;
  }
}

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
  facets: FeedFacet[];
  filters: FeedFilters;
  onToggle: (kind: FeedFacetKind, value: string) => void;
  onClearAll: () => void;
  leaderboard: ConsistencyLeaderboardRow[];
}

export function FeedTagRail({ facets, filters, onToggle, onClearAll, leaderboard }: FeedTagRailProps) {
  const hasActiveFilter =
    !!filters.symbol || !!filters.strategyCategory || !!filters.outcome || !!filters.tier;

  return (
    <aside className="flex flex-col gap-ds-4">
      {/* Filter by tag */}
      <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 p-ds-4 flex flex-col gap-ds-3">
        <div className="flex items-center justify-between">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-primary">
            Filter by tag
          </span>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={onClearAll}
              className="font-sans text-[11px] text-ink-tertiary hover:text-ink-secondary transition-colors duration-base ease-out"
            >
              Clear
            </button>
          )}
        </div>

        {GROUPS.map(({ kind, label }) => {
          const items = facets.filter((f) => f.facet === kind);
          if (items.length === 0) return null;
          return (
            <div key={kind} className="flex flex-col gap-[6px]">
              <span className="font-sans text-[11px] text-ink-tertiary">{label}</span>
              <div className="flex flex-wrap gap-[6px]">
                {items.map((f) => {
                  const active = isActive(kind, f.value, filters);
                  return (
                    <button
                      key={`${kind}:${f.value}`}
                      type="button"
                      onClick={() => onToggle(kind, f.value)}
                      aria-pressed={active}
                      className={cn(
                        'inline-flex items-center gap-[5px] rounded-full px-[10px] py-[4px]',
                        'font-sans text-[11px] font-medium',
                        'border-[0.5px] transition-colors duration-base ease-out',
                        active
                          ? 'bg-gradient-gold border-transparent text-surface-base'
                          : 'bg-surface-2 border-border-ds-subtle text-ink-secondary hover:border-border-ds-default hover:text-ink-primary',
                      )}
                    >
                      <span>{f.label}</span>
                      <span
                        className={cn(
                          'tabular-nums font-mono',
                          active ? 'text-surface-base/70' : 'text-ink-tertiary',
                        )}
                      >
                        {f.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

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
