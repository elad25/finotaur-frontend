// src/components/floor/FloorLeaderboardTable.tsx
// =====================================================
// Branded leaderboard table for The Floor competition.
// Shows rank, trader, discipline score, and trade count.
// =====================================================

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { FloorLeaderboardRow } from '@/hooks/useFloor';
import { UserStatusBadges } from '@/components/floor/UserStatusBadges';

interface FloorLeaderboardTableProps {
  rows: FloorLeaderboardRow[];
  currentUserId: string | null | undefined;
  minTrades: number;
}

// Medal colours for positions 1–3
const RANK_ACCENTS: Record<number, { text: string; bg: string; border: string }> = {
  1: {
    text: '#E8C766',
    bg: 'rgba(232,199,102,0.08)',
    border: 'rgba(232,199,102,0.25)',
  },
  2: {
    text: '#C0C8D8',
    bg: 'rgba(192,200,216,0.06)',
    border: 'rgba(192,200,216,0.2)',
  },
  3: {
    text: '#CD7F32',
    bg: 'rgba(205,127,50,0.06)',
    border: 'rgba(205,127,50,0.2)',
  },
};

const RANK_MEDALS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

const FloorLeaderboardTable = memo(function FloorLeaderboardTable({
  rows,
  currentUserId,
  minTrades,
}: FloorLeaderboardTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[#666] text-sm">
          No competitors yet — be the first to join.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[20px] overflow-hidden"
      style={{
        background: '#0A0A0A',
        border: '1px solid rgba(201,166,70,0.15)',
      }}
    >
      {/* Header row */}
      <div
        className="grid grid-cols-[48px_1fr_140px_100px] gap-2 px-5 py-3 text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: '#555', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span>Rank</span>
        <span>Trader</span>
        <span className="text-right">Discipline Score</span>
        <span className="text-right">Trades</span>
      </div>

      {/* Data rows */}
      <div className="divide-y divide-white/[0.04]">
        {rows.map((row) => {
          const isCurrentUser = row.user_id === currentUserId;
          const rankAccent =
            row.rank !== null && row.rank <= 3 ? RANK_ACCENTS[row.rank] : null;
          const medal = row.rank !== null && row.rank <= 3 ? RANK_MEDALS[row.rank] : null;
          const isQualified = row.qualified && row.rank !== null;

          return (
            <div
              key={row.user_id}
              className={cn(
                'grid grid-cols-[48px_1fr_140px_100px] gap-2 items-center px-5 py-3.5 transition-colors',
                isCurrentUser
                  ? 'ring-1 ring-inset ring-[#C9A646]/40 bg-[#C9A646]/5'
                  : rankAccent
                  ? ''
                  : 'hover:bg-white/[0.02]',
              )}
              style={
                rankAccent
                  ? {
                      background: rankAccent.bg,
                      boxShadow: isCurrentUser
                        ? `inset 0 0 0 1px ${rankAccent.border}, inset 0 0 0 1px rgba(201,166,70,0.4)`
                        : `inset 0 0 0 1px ${rankAccent.border}`,
                    }
                  : undefined
              }
            >
              {/* Rank */}
              <span
                className="text-sm font-bold tabular-nums"
                style={{
                  color: rankAccent ? rankAccent.text : isQualified ? '#888' : '#444',
                }}
              >
                {medal ? (
                  <span title={`Rank ${row.rank ?? ''}`}>{medal}</span>
                ) : row.rank !== null ? (
                  `#${row.rank}`
                ) : (
                  '—'
                )}
              </span>

              {/* Trader name + badges */}
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    'text-sm font-medium truncate',
                    isCurrentUser ? 'text-[#E8C766]' : 'text-white/85',
                  )}
                >
                  {row.display_name}
                  {isCurrentUser && (
                    <span className="ml-1.5 text-[10px] font-normal text-[#C9A646]/70">
                      (you)
                    </span>
                  )}
                </span>
                {row.is_champion && (
                  <UserStatusBadges userId={row.user_id} />
                )}
              </div>

              {/* Discipline Score */}
              <div className="text-right">
                {isQualified && row.discipline_score !== null ? (
                  <span
                    className="text-sm font-semibold tabular-nums"
                    style={{ color: rankAccent ? rankAccent.text : '#C9A646' }}
                  >
                    {row.discipline_score.toFixed(1)}
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-end">
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        color: '#555',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {row.trade_count}/{minTrades} to qualify
                    </span>
                  </span>
                )}
              </div>

              {/* Trade count */}
              <span
                className="text-right text-sm tabular-nums"
                style={{ color: isQualified ? '#888' : '#444' }}
              >
                {row.trade_count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

FloorLeaderboardTable.displayName = 'FloorLeaderboardTable';

export { FloorLeaderboardTable };
