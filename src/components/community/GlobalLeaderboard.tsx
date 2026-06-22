// src/components/community/GlobalLeaderboard.tsx
// Global leaderboard with two metric tabs (Net P&L / Discipline) and a
// period filter (This Month / This Year / All Time).
//
// Mirrors RoomLeaderboard styling exactly:
//   - Gold rank #1/#2/#3
//   - text-num-negative / text-num-neutral for P&L
//   - Period toggle in bg-surface-2 pill
//
// Discipline tab: discipline_score rendered as a 0–100 gold progress bar.

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { DataState } from '@/components/ds/DataState';
import { useGlobalLeaderboard, useGlobalDisciplineLeaderboard } from '@/hooks/useGlobalLeaderboard';
import { useLeaderboardOptIn } from '@/hooks/useLeaderboardOptIn';
import type {
  GlobalPeriod,
  GlobalLeaderboardRow,
  DisciplineLeaderboardRow,
} from '@/types/community';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

type MetricTab = 'net_pnl' | 'discipline';

// ── Configs ────────────────────────────────────────────────────────────────────

const PERIODS: { label: string; value: GlobalPeriod }[] = [
  { label: 'This Month', value: 'this_month' },
  { label: 'This Year', value: 'this_year' },
  { label: 'All Time', value: 'all' },
];

const METRIC_TABS: { label: string; value: MetricTab }[] = [
  { label: 'Net P&L', value: 'net_pnl' },
  { label: 'Discipline', value: 'discipline' },
];

// ── Formatters ─────────────────────────────────────────────────────────────────

/** Formats a dollar amount using U+2212 for negative — matches RoomLeaderboard. */
function formatPnl(value: number): string {
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value < 0) return `−$${abs}`; // U+2212 mathematical minus
  return `$${abs}`;
}

/** Formats a 0..1 win/emotional rate as a percentage with 1 decimal. */
function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

// ── Shared sub-components ──────────────────────────────────────────────────────

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

function RankBadge({ rank }: { rank: number }) {
  const isTop3 = rank <= 3;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        'font-sans tabular-nums text-[13px] font-semibold',
        'w-7 shrink-0',
        isTop3 ? 'text-gold-primary' : 'text-ink-tertiary',
      )}
    >
      {rank}
    </span>
  );
}

// ── Net P&L table ──────────────────────────────────────────────────────────────

function PnlRow({ row }: { row: GlobalLeaderboardRow }) {
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
          {formatRate(row.win_rate)}
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

function PnlTable({ rows }: { rows: GlobalLeaderboardRow[] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-border-ds-subtle bg-surface-2">
          <th scope="col" className="py-ds-2 pl-ds-4 pr-ds-2 text-left font-sans text-[11px] font-medium tracking-[1px] uppercase text-ink-tertiary w-10">
            #
          </th>
          <th scope="col" className="py-ds-2 px-ds-2 text-left font-sans text-[11px] font-medium tracking-[1px] uppercase text-ink-tertiary">
            Trader
          </th>
          <th scope="col" className="py-ds-2 px-ds-2 text-right font-sans text-[11px] font-medium tracking-[1px] uppercase text-ink-tertiary">
            Net P&amp;L
          </th>
          <th scope="col" className="py-ds-2 px-ds-2 text-right font-sans text-[11px] font-medium tracking-[1px] uppercase text-ink-tertiary">
            Win %
          </th>
          <th scope="col" className="py-ds-2 pl-ds-2 pr-ds-4 text-right font-sans text-[11px] font-medium tracking-[1px] uppercase text-ink-tertiary">
            Trades
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <PnlRow key={row.user_id} row={row} />
        ))}
      </tbody>
    </table>
  );
}

// ── Discipline table ───────────────────────────────────────────────────────────

/** Gold progress bar for discipline_score (0–100). */
function DisciplineBar({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score));
  return (
    <div className="flex items-center gap-ds-2 justify-end">
      <div className="w-[64px] h-[5px] rounded-full bg-surface-2 overflow-hidden shrink-0">
        <div
          className="h-full rounded-full bg-gold-primary transition-all duration-300"
          style={{ width: `${clamped}%` }}
          aria-hidden="true"
        />
      </div>
      <span className="font-sans tabular-nums text-[13px] font-medium text-ink-secondary w-9 text-right shrink-0">
        {clamped}
      </span>
    </div>
  );
}

function DisciplineRow({ row }: { row: DisciplineLeaderboardRow }) {
  const isTop3 = row.rank <= 3;
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

      {/* DISCIPLINE SCORE (bar) */}
      <td className="py-ds-3 px-ds-2">
        <DisciplineBar score={row.discipline_score} />
      </td>

      {/* EMOTIONAL % */}
      <td className="py-ds-3 px-ds-2 text-right">
        <span className="font-sans tabular-nums text-[13px] text-ink-secondary">
          {formatRate(row.emotional_rate)}
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

function DisciplineTable({ rows }: { rows: DisciplineLeaderboardRow[] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-border-ds-subtle bg-surface-2">
          <th scope="col" className="py-ds-2 pl-ds-4 pr-ds-2 text-left font-sans text-[11px] font-medium tracking-[1px] uppercase text-ink-tertiary w-10">
            #
          </th>
          <th scope="col" className="py-ds-2 px-ds-2 text-left font-sans text-[11px] font-medium tracking-[1px] uppercase text-ink-tertiary">
            Trader
          </th>
          <th scope="col" className="py-ds-2 px-ds-2 text-right font-sans text-[11px] font-medium tracking-[1px] uppercase text-ink-tertiary">
            Score
          </th>
          <th scope="col" className="py-ds-2 px-ds-2 text-right font-sans text-[11px] font-medium tracking-[1px] uppercase text-ink-tertiary">
            Emotional %
          </th>
          <th scope="col" className="py-ds-2 pl-ds-2 pr-ds-4 text-right font-sans text-[11px] font-medium tracking-[1px] uppercase text-ink-tertiary">
            Trades
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <DisciplineRow key={row.user_id} row={row} />
        ))}
      </tbody>
    </table>
  );
}

// ── Visibility banner ─────────────────────────────────────────────────────────

function VisibilityBanner() {
  const { optIn, isLoading, toggle, isSaving } = useLeaderboardOptIn();
  if (isLoading) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-ds-3',
        'rounded-[10px] border-[0.5px] px-ds-4 py-[10px]',
        optIn
          ? 'bg-[rgba(201,166,70,0.06)] border-[rgba(201,166,70,0.20)]'
          : 'bg-surface-2 border-border-ds-subtle',
      )}
    >
      <div className="flex items-center gap-[8px] min-w-0">
        {optIn
          ? <Eye size={14} className="text-gold-primary shrink-0" aria-hidden="true" />
          : <EyeOff size={14} className="text-ink-tertiary shrink-0" aria-hidden="true" />
        }
        <div className="flex flex-col min-w-0">
          <span className={cn(
            'font-sans text-[13px] font-medium leading-snug',
            optIn ? 'text-gold-primary' : 'text-ink-secondary',
          )}>
            {optIn ? 'You\'re visible on the leaderboard' : 'You\'re hidden from the leaderboard'}
          </span>
          {!optIn && (
            <span className="font-sans text-[11px] text-ink-tertiary leading-snug mt-[2px]">
              Only broker-synced trades count — no manual entries.
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        disabled={isSaving}
        onClick={toggle}
        className={cn(
          'shrink-0 px-ds-3 py-[5px] rounded-[6px]',
          'font-sans text-[12px] font-medium',
          'transition-colors duration-base ease-out',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          optIn
            ? 'bg-transparent border-[0.5px] border-[rgba(201,166,70,0.30)] text-gold-primary hover:bg-[rgba(201,166,70,0.08)]'
            : 'bg-gold-primary text-black hover:opacity-90',
        )}
      >
        {isSaving ? '…' : optIn ? 'Leave' : 'Join'}
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function GlobalLeaderboard() {
  const [period, setPeriod] = useState<GlobalPeriod>('this_month');
  const [metricTab, setMetricTab] = useState<MetricTab>('net_pnl');

  const pnlQuery = useGlobalLeaderboard(period, 'net_pnl');
  const disciplineQuery = useGlobalDisciplineLeaderboard(period);

  const activeQuery = metricTab === 'net_pnl' ? pnlQuery : disciplineQuery;

  return (
    <div className="flex flex-col gap-ds-4 px-ds-5 py-ds-5">
      {/* Header row: heading + period toggle */}
      <div className="flex items-center justify-between gap-ds-3 flex-wrap">
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

      {/* Opt-in visibility banner */}
      <VisibilityBanner />

      {/* Metric tab bar */}
      <div
        className="flex items-center gap-[2px] rounded-[8px] bg-surface-2 p-[3px] self-start"
        role="tablist"
        aria-label="Leaderboard metric"
      >
        {METRIC_TABS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={metricTab === value}
            onClick={() => setMetricTab(value)}
            className={cn(
              'px-ds-4 py-[5px] rounded-[6px]',
              'font-sans text-[12px] font-medium',
              'transition-colors duration-base ease-out',
              metricTab === value
                ? 'bg-surface-1 text-ink-primary shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.12)]'
                : 'text-ink-tertiary hover:text-ink-secondary',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle overflow-hidden">
        <DataState
          isLoading={activeQuery.isLoading}
          isError={activeQuery.isError}
          error={activeQuery.error}
          data={activeQuery.rows}
          onRetry={activeQuery.refetch}
          empty={
            <p className="py-ds-9 text-center font-sans text-[13px] text-ink-tertiary">
              No one on the leaderboard yet. Be the first — join above.
            </p>
          }
        >
          {(data) => (
            metricTab === 'net_pnl'
              ? <PnlTable rows={data as GlobalLeaderboardRow[]} />
              : <DisciplineTable rows={data as DisciplineLeaderboardRow[]} />
          )}
        </DataState>
      </div>
    </div>
  );
}
