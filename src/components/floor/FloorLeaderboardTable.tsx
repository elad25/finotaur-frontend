// src/components/floor/FloorLeaderboardTable.tsx
// =====================================================
// Rich leaderboard table for The Floor competition.
// Columns: Rank · Trader · Win % · Trades · Avg Win ·
//          Avg Loss · PF · Best · Worst · Streak · Discipline
// Horizontal scroll on small screens.
// =====================================================

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { FloorLeaderboardRow } from '@/hooks/useFloor';

interface FloorLeaderboardTableProps {
  rows: FloorLeaderboardRow[];
  currentUserId: string | null | undefined;
  minTrades: number;
}

// ── Rank badge helpers ─────────────────────────────────────────────────────────

interface RankBadgeProps {
  rank: number | null;
  qualified: boolean;
}

function RankBadge({ rank, qualified }: RankBadgeProps) {
  if (rank === null) {
    return <span style={{ color: '#444' }}>—</span>;
  }

  if (rank === 1) {
    return (
      <span
        className="inline-flex items-center justify-center w-[20px] h-[20px] rounded-[6px] text-[11px] font-bold tabular-nums"
        style={{
          background: 'linear-gradient(135deg, #C9A646, #E8C766)',
          color: '#0A0A0A',
        }}
      >
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        className="inline-flex items-center justify-center w-[20px] h-[20px] rounded-[6px] text-[11px] font-bold tabular-nums"
        style={{ background: '#3a3a3a', color: '#ddd' }}
      >
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        className="inline-flex items-center justify-center w-[20px] h-[20px] rounded-[6px] text-[11px] font-bold tabular-nums"
        style={{ background: '#5a3f24', color: '#e8c08a' }}
      >
        3
      </span>
    );
  }

  return (
    <span
      className="text-sm tabular-nums"
      style={{ color: qualified ? '#888' : '#444' }}
    >
      #{rank}
    </span>
  );
}

// ── Small avatar ───────────────────────────────────────────────────────────────

function SmallAvatar({
  name,
  avatarUrl,
  size = 24,
}: {
  name: string;
  avatarUrl: string | null;
  size?: number;
}) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const dim = `${size}px`;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        aria-hidden="true"
        className="rounded-full object-cover shrink-0"
        style={{
          width: dim,
          height: dim,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0 text-[10px] font-bold"
      aria-hidden="true"
      style={{
        width: dim,
        height: dim,
        background: 'rgba(201,166,70,0.15)',
        border: '1px solid rgba(201,166,70,0.3)',
        color: '#E8C766',
      }}
    >
      {initial}
    </div>
  );
}

// ── Formatting helpers ─────────────────────────────────────────────────────────

function fmtGreen(value: number | null) {
  if (value === null) return <span style={{ color: '#444' }}>—</span>;
  return (
    <span style={{ color: '#3fd27a' }}>
      +{Math.round(value).toLocaleString()}
    </span>
  );
}

function fmtRed(value: number | null) {
  if (value === null) return <span style={{ color: '#444' }}>—</span>;
  return (
    <span style={{ color: '#e26b6b' }}>
      −{Math.round(Math.abs(value)).toLocaleString()}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

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
      className="overflow-x-auto rounded-[16px]"
      style={{ border: '1px solid rgba(201,166,70,0.15)' }}
    >
      <table
        className="w-full min-w-[760px] text-sm"
        style={{ background: '#0A0A0A', borderCollapse: 'collapse' }}
      >
        {/* Header */}
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { label: 'Rank', align: 'left' },
              { label: 'Trader', align: 'left' },
              { label: 'Win %', align: 'right' },
              { label: 'Trades', align: 'right' },
              { label: 'Avg Win', align: 'right' },
              { label: 'Avg Loss', align: 'right' },
              { label: 'PF', align: 'right' },
              { label: 'Best', align: 'right' },
              { label: 'Worst', align: 'right' },
              { label: 'Streak', align: 'right' },
              { label: 'Discipline', align: 'right', gold: true },
            ].map(({ label, align, gold }) => (
              <th
                key={label}
                className={cn(
                  'px-3 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap',
                  align === 'right' ? 'text-right' : 'text-left',
                )}
                style={{ color: gold ? '#E8C766' : '#777' }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="divide-y divide-white/[0.04]">
          {rows.map((row) => {
            const isCurrentUser = row.user_id === currentUserId;
            const isQualified = row.qualified && row.rank !== null;
            const nickname = row.floor_username ?? row.display_name;

            return (
              <tr
                key={row.user_id}
                style={
                  isCurrentUser
                    ? { background: 'rgba(201,166,70,0.06)' }
                    : undefined
                }
                className={cn(!isCurrentUser && 'hover:bg-white/[0.02] transition-colors')}
              >
                {/* RANK */}
                <td className="px-3 py-3 whitespace-nowrap">
                  <RankBadge rank={row.rank} qualified={isQualified} />
                </td>

                {/* TRADER */}
                <td className="px-3 py-3 max-w-[160px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <SmallAvatar
                      name={nickname}
                      avatarUrl={row.avatar_url}
                      size={24}
                    />
                    <span
                      className={cn(
                        'text-sm font-medium truncate',
                        isCurrentUser ? 'text-[#E8C766]' : 'text-white/85',
                      )}
                    >
                      {nickname}
                      {isCurrentUser && (
                        <span className="ml-1 text-[10px] font-normal text-[#C9A646]/70">
                          (you)
                        </span>
                      )}
                    </span>
                  </div>
                </td>

                {/* WIN % */}
                <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums" style={{ color: '#aaa' }}>
                  {row.win_rate !== null ? `${row.win_rate}%` : <span style={{ color: '#444' }}>—</span>}
                </td>

                {/* TRADES */}
                <td
                  className="px-3 py-3 text-right whitespace-nowrap tabular-nums"
                  style={{ color: isQualified ? '#888' : '#444' }}
                >
                  {row.trade_count}
                  {!isQualified && (
                    <span
                      className="ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        color: '#555',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {row.trade_count}/{minTrades}
                    </span>
                  )}
                </td>

                {/* AVG WIN */}
                <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums font-semibold text-sm">
                  {fmtGreen(row.avg_win)}
                </td>

                {/* AVG LOSS */}
                <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums font-semibold text-sm">
                  {fmtRed(row.avg_loss)}
                </td>

                {/* PF */}
                <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums" style={{ color: '#aaa' }}>
                  {row.profit_factor !== null
                    ? row.profit_factor.toFixed(2)
                    : <span style={{ color: '#444' }}>—</span>}
                </td>

                {/* BEST */}
                <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums font-semibold text-sm">
                  {fmtGreen(row.best_trade)}
                </td>

                {/* WORST */}
                <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums font-semibold text-sm">
                  {fmtRed(row.worst_trade)}
                </td>

                {/* STREAK */}
                <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums" style={{ color: '#aaa' }}>
                  {row.win_streak !== null
                    ? row.win_streak
                    : <span style={{ color: '#444' }}>—</span>}
                </td>

                {/* DISCIPLINE */}
                <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">
                  {isQualified && row.discipline_score !== null ? (
                    <span className="font-bold" style={{ color: '#E8C766' }}>
                      {row.discipline_score.toFixed(1)}
                    </span>
                  ) : (
                    <span style={{ color: '#444' }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

FloorLeaderboardTable.displayName = 'FloorLeaderboardTable';

export { FloorLeaderboardTable };
