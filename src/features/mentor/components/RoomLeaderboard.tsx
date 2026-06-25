// src/components/mentorship/RoomLeaderboard.tsx
// Leaderboard view for a mentor space.
//
// Displays a period-scoped ranked table:
//   RANK  |  TRADER (monogram + name)  |  NET P&L  |  WIN %  |  TRADES
//
// Ranks #1/#2/#3 are highlighted in gold.
// P&L: white (≥ 0) or text-num-negative (< 0), formatted as currency.
// Period toggle: This Month / This Year / All Time.

import { useState } from 'react';
import { DataState } from '@/components/ds/DataState';
import { useSpaceLeaderboard } from '@/features/mentor/hooks/useSpaceAnalytics';
import type { RoomPeriod, LeaderboardRow } from '@/features/mentor/types/mentorship';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoomLeaderboardProps {
  spaceId: string;
}

// ── Period toggle config ───────────────────────────────────────────────────────

const PERIODS: { label: string; value: RoomPeriod }[] = [
  { label: 'This Month', value: 'this_month' },
  { label: 'This Year', value: 'this_year' },
  { label: 'All Time', value: 'all' },
];

// ── Formatters ────────────────────────────────────────────────────────────────

/** Formats a dollar amount as $X,XXX.XX using U+2212 for negative. */
function formatPnl(value: number): string {
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value < 0) return `−$${abs}`; // U+2212 mathematical minus
  return `$${abs}`;
}

/** Formats a 0..1 win rate as a percentage with 1 decimal. */
function formatWinRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

// ── Monogram avatar ───────────────────────────────────────────────────────────

function MonogramAvatar({ name }: { name: string }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center shrink-0',
        'h-7 w-7 rounded-full',
        'bg-surface-2 border-[0.5px] border-border-ds-subtle',
        'text-ink-secondary text-[11px] font-semibold',
      )}
    >
      {initial}
    </div>
  );
}

// ── Rank badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const isTop3 = rank <= 3;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        'font-sans tabular-nums text-[13px] font-semibold',
        'w-7 shrink-0',
        isTop3
          ? 'text-gold-primary'
          : 'text-ink-tertiary',
      )}
    >
      {rank}
    </span>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

function LeaderboardTableRow({ row }: { row: LeaderboardRow }) {
  const isTop3 = row.rank <= 3;
  const isNegative = row.net_pnl < 0;
  const displayName = row.display_name ?? 'Anonymous';

  return (
    <tr
      className={cn(
        'border-b border-border-ds-subtle',
        'transition-colors duration-base ease-out',
        'hover:bg-surface-2',
        isTop3 && 'bg-[rgba(201,166,70,0.03)]',
      )}
    >
      {/* RANK */}
      <td className="py-ds-3 pl-ds-4 pr-ds-2">
        <RankBadge rank={row.rank} />
      </td>

      {/* TRADER */}
      <td className="py-ds-3 px-ds-2">
        <div className="flex items-center gap-ds-2 min-w-0">
          <MonogramAvatar name={displayName} />
          <span
            className={cn(
              'font-sans text-[13px] truncate',
              isTop3 ? 'text-ink-primary font-medium' : 'text-ink-secondary',
            )}
          >
            {displayName}
          </span>
        </div>
      </td>

      {/* NET P&L */}
      <td className="py-ds-3 px-ds-2 text-right">
        <span
          className={cn(
            'font-sans tabular-nums text-[13px] font-medium',
            isNegative ? 'text-num-negative' : 'text-num-neutral',
          )}
        >
          {formatPnl(row.net_pnl)}
        </span>
      </td>

      {/* WIN % */}
      <td className="py-ds-3 px-ds-2 text-right">
        <span className="font-sans tabular-nums text-[13px] text-ink-secondary">
          {formatWinRate(row.win_rate)}
        </span>
      </td>

      {/* TRADES */}
      <td className="py-ds-3 pl-ds-2 pr-ds-4 text-right">
        <span className="font-sans tabular-nums text-[13px] text-ink-tertiary">
          {row.trade_count}
        </span>
      </td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RoomLeaderboard({ spaceId }: RoomLeaderboardProps) {
  const [period, setPeriod] = useState<RoomPeriod>('this_year');
  const { rows, isLoading, isError, error, refetch } = useSpaceLeaderboard(spaceId, period);

  return (
    <div className="flex flex-col gap-ds-4 px-ds-5 py-ds-5">
      {/* Period toggle */}
      <div className="flex items-center justify-between gap-ds-3">
        <h2 className="font-sans text-[15px] font-semibold text-ink-primary">
          Leaderboard
        </h2>
        <div
          className="flex items-center rounded-[8px] bg-surface-2 p-[3px] gap-[2px]"
          role="group"
          aria-label="Period"
        >
          {PERIODS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={cn(
                'px-ds-3 py-[5px] rounded-[6px]',
                'font-sans text-[12px] font-medium',
                'transition-colors duration-base ease-out',
                period === value
                  ? 'bg-surface-1 text-ink-primary shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.12)]'
                  : 'text-ink-tertiary hover:text-ink-secondary',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle overflow-hidden">
        <DataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          data={rows}
          onRetry={refetch}
          empty={
            <p className="py-ds-9 text-center font-sans text-[13px] text-ink-tertiary">
              No ranked trades yet for this period.
            </p>
          }
        >
          {(data) => (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border-ds-subtle bg-surface-2">
                  <th
                    scope="col"
                    className="py-ds-2 pl-ds-4 pr-ds-2 text-left font-sans text-[11px] font-medium tracking-[1px] uppercase text-ink-tertiary w-10"
                  >
                    #
                  </th>
                  <th
                    scope="col"
                    className="py-ds-2 px-ds-2 text-left font-sans text-[11px] font-medium tracking-[1px] uppercase text-ink-tertiary"
                  >
                    Trader
                  </th>
                  <th
                    scope="col"
                    className="py-ds-2 px-ds-2 text-right font-sans text-[11px] font-medium tracking-[1px] uppercase text-ink-tertiary"
                  >
                    Net P&amp;L
                  </th>
                  <th
                    scope="col"
                    className="py-ds-2 px-ds-2 text-right font-sans text-[11px] font-medium tracking-[1px] uppercase text-ink-tertiary"
                  >
                    Win %
                  </th>
                  <th
                    scope="col"
                    className="py-ds-2 pl-ds-2 pr-ds-4 text-right font-sans text-[11px] font-medium tracking-[1px] uppercase text-ink-tertiary"
                  >
                    Trades
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <LeaderboardTableRow key={row.user_id} row={row} />
                ))}
              </tbody>
            </table>
          )}
        </DataState>
      </div>
    </div>
  );
}
