// src/components/floor/FloorLeaderboardTable.tsx
// =====================================================
// Rich leaderboard table for The Floor competition.
// Columns: Rank · Trader · Win % · RR · PF · Trades · Days · Discipline
// PF (Profit Factor) is the emphasized quality column — never a dollar
// figure. Dollar-denominated stats (Avg Win/Loss/Best/Worst) are removed
// entirely; ranking and display are quality-based, never by P&L.
// Horizontal scroll on small screens.
// =====================================================

import { memo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRowRR, type FloorLeaderboardRow } from '@/features/floor/hooks/useFloor';

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

/** Renders RR as a "2.4R"-style ratio — never a dollar amount. */
function fmtRR(value: number | null) {
  if (value === null) return <span style={{ color: '#444' }}>—</span>;
  return <span>{value.toFixed(1)}R</span>;
}

// ── Main component ─────────────────────────────────────────────────────────────

const FloorLeaderboardTable = memo(function FloorLeaderboardTable({
  rows,
  currentUserId,
  minTrades,
}: FloorLeaderboardTableProps) {
  const [expanded, setExpanded] = useState(false);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[#666] text-sm">
          No competitors yet — be the first to join.
        </p>
      </div>
    );
  }

  const coreCols = [
    { label: 'Rank', align: 'left' },
    { label: 'Trader', align: 'left' },
    { label: 'Win %', align: 'right' },
    { label: 'RR', align: 'right' },
    { label: 'PF', align: 'right', gold: true },
    { label: 'Trades', align: 'right' },
    { label: 'Days', align: 'right' },
  ];
  const extraCols = [
    { label: 'Streak', align: 'right' },
  ];
  const headerCols = [
    ...coreCols,
    ...(expanded ? extraCols : []),
    { label: 'Discipline', align: 'right', gold: true },
  ];

  return (
    <div>
      {/* Toolbar — title + expand toggle */}
      <div className="mb-2 flex items-center justify-between px-1">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.05em]"
          style={{ color: '#777' }}
        >
          Full ranking
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-medium transition-opacity hover:opacity-80"
          style={{ color: '#C9A646' }}
        >
          {expanded ? 'Fewer stats' : 'More stats'}
          <ChevronDown
            className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')}
          />
        </button>
      </div>

      <div
        className="overflow-x-auto rounded-[16px]"
        style={{ border: '1px solid rgba(201,166,70,0.15)' }}
      >
        <table
          className="w-full text-sm"
          style={{
            minWidth: expanded ? 660 : 580,
            background: '#0A0A0A',
            borderCollapse: 'collapse',
          }}
        >
          {/* Header */}
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {headerCols.map(({ label, align, gold }) => (
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
              const rr = getRowRR(row);

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

                  {/* RR */}
                  <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums" style={{ color: '#aaa' }}>
                    {fmtRR(rr)}
                  </td>

                  {/* PF — the star column, gold + bold */}
                  <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">
                    {row.profit_factor !== null ? (
                      <span className="font-bold" style={{ color: '#E8C766' }}>
                        {row.profit_factor.toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ color: '#444' }}>—</span>
                    )}
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

                  {/* DAYS */}
                  <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums" style={{ color: '#aaa' }}>
                    {row.active_days !== undefined && row.active_days !== null
                      ? row.active_days
                      : <span style={{ color: '#444' }}>—</span>}
                  </td>

                  {/* EXTRA STATS (expanded only) */}
                  {expanded && (
                    <>
                      {/* STREAK */}
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums" style={{ color: '#aaa' }}>
                        {row.win_streak !== null
                          ? row.win_streak
                          : <span style={{ color: '#444' }}>—</span>}
                      </td>
                    </>
                  )}

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
    </div>
  );
});

FloorLeaderboardTable.displayName = 'FloorLeaderboardTable';

export { FloorLeaderboardTable };
