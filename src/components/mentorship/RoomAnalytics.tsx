// src/components/mentorship/RoomAnalytics.tsx
// Analytics view for a mentor space.
//
// Layout:
//   1. Period toggle (This Month / This Year / All Time, default This Month)
//   2. Three DS Cards: ROOM NET P&L | AVG WIN RATE | MEMBERS
//   3. Member Performance panel — horizontal bars per member ordered by net_pnl desc.

import { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { DataState } from '@/components/ds/DataState';
import {
  useSpaceAnalyticsSummary,
  useSpaceMemberPerformance,
} from '@/hooks/useSpaceAnalytics';
import type { RoomPeriod, MemberPerformanceRow } from '@/types/mentorship';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoomAnalyticsProps {
  spaceId: string;
}

// ── Period toggle config ───────────────────────────────────────────────────────

const PERIODS: { label: string; value: RoomPeriod }[] = [
  { label: 'This Month', value: 'this_month' },
  { label: 'This Year', value: 'this_year' },
  { label: 'All Time', value: 'all' },
];

// ── Formatters ────────────────────────────────────────────────────────────────

/** Formats a dollar amount with U+2212 for negative. */
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

function MonogramAvatar({ name, size = 7 }: { name: string; size?: number }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center shrink-0',
        `h-${size} w-${size}`,
        'rounded-full',
        'bg-surface-2 border-[0.5px] border-border-ds-subtle',
        'text-ink-secondary text-[11px] font-semibold',
      )}
    >
      {initial}
    </div>
  );
}

// ── Period toggle ─────────────────────────────────────────────────────────────

function PeriodToggle({
  value,
  onChange,
}: {
  value: RoomPeriod;
  onChange: (v: RoomPeriod) => void;
}) {
  return (
    <div
      className="flex items-center rounded-[8px] bg-surface-2 p-[3px] gap-[2px]"
      role="group"
      aria-label="Period"
    >
      {PERIODS.map(({ label, value: v }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            'px-ds-3 py-[5px] rounded-[6px]',
            'font-sans text-[12px] font-medium',
            'transition-colors duration-base ease-out',
            value === v
              ? 'bg-surface-1 text-ink-primary shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.12)]'
              : 'text-ink-tertiary hover:text-ink-secondary',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Summary cards ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
}

function SummaryCard({ label, value, valueColor, sub }: SummaryCardProps) {
  return (
    <Card variant="default" padding="default" className="flex flex-col gap-ds-2">
      <span className="font-sans text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
        {label}
      </span>
      <span
        className={cn(
          'font-sans tabular-nums text-num-large font-semibold leading-[1.2] tracking-[-0.5px]',
          valueColor ?? 'text-num-neutral',
        )}
      >
        {value}
      </span>
      {sub && (
        <span className="font-sans text-[12px] text-ink-tertiary">{sub}</span>
      )}
    </Card>
  );
}

// ── Member performance bar ────────────────────────────────────────────────────

interface MemberBarProps {
  row: MemberPerformanceRow;
  /** The maximum |net_pnl| in the current data set — used to scale bars. */
  maxAbs: number;
}

function MemberPerformanceBar({ row, maxAbs }: MemberBarProps) {
  const isNegative = row.net_pnl < 0;
  const displayName = row.display_name ?? 'Anonymous';
  // Width as a percentage of the bar track, floor at 4px so 0 is still visible.
  const pct = maxAbs > 0 ? Math.round((Math.abs(row.net_pnl) / maxAbs) * 100) : 0;

  return (
    <div className="flex items-center gap-ds-3 py-[10px] border-b border-border-ds-subtle last:border-0">
      {/* Left: avatar + name + warning */}
      <div className="flex items-center gap-ds-2 min-w-0 w-[140px] shrink-0">
        <MonogramAvatar name={displayName} size={7} />
        <div className="flex items-center gap-[4px] min-w-0">
          <span className="font-sans text-[13px] text-ink-secondary truncate">
            {displayName}
          </span>
          {row.needs_attention && (
            <AlertTriangle
              size={12}
              className="shrink-0 text-status-warning"
              aria-label="Needs attention"
            />
          )}
        </div>
      </div>

      {/* Center: bar track */}
      <div className="flex-1 min-w-0">
        <div
          className="h-[6px] rounded-full bg-surface-2 overflow-hidden"
          aria-label={`Net P&L ${formatPnl(row.net_pnl)}`}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              isNegative ? 'bg-num-negative' : 'bg-gold-primary',
            )}
            style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
          />
        </div>
      </div>

      {/* Right: value */}
      <span
        className={cn(
          'font-sans tabular-nums text-[13px] font-medium shrink-0 w-[80px] text-right',
          isNegative ? 'text-num-negative' : 'text-num-neutral',
        )}
      >
        {formatPnl(row.net_pnl)}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RoomAnalytics({ spaceId }: RoomAnalyticsProps) {
  const [period, setPeriod] = useState<RoomPeriod>('this_month');

  const {
    summary,
    isLoading: summaryLoading,
    isError: summaryError,
    error: summaryErr,
    refetch: refetchSummary,
  } = useSpaceAnalyticsSummary(spaceId, period);

  const {
    rows: memberRows,
    isLoading: membersLoading,
    isError: membersError,
    error: membersErr,
    refetch: refetchMembers,
  } = useSpaceMemberPerformance(spaceId, period);

  /** Max absolute P&L for bar scaling. */
  const maxAbs = useMemo(() => {
    if (memberRows.length === 0) return 0;
    return Math.max(...memberRows.map((r) => Math.abs(r.net_pnl)));
  }, [memberRows]);

  return (
    <div className="flex flex-col gap-ds-5 px-ds-5 py-ds-5">
      {/* Header + period toggle */}
      <div className="flex items-center justify-between gap-ds-3">
        <h2 className="font-sans text-[15px] font-semibold text-ink-primary">
          Analytics
        </h2>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* Summary cards */}
      <DataState
        isLoading={summaryLoading}
        isError={summaryError}
        error={summaryErr}
        data={summary}
        onRetry={refetchSummary}
        empty={
          <div className="grid grid-cols-3 gap-ds-4">
            {['ROOM NET P&L', 'AVG WIN RATE', 'MEMBERS'].map((label) => (
              <SummaryCard key={label} label={label} value="—" />
            ))}
          </div>
        }
      >
        {(s) => (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-ds-4">
            <SummaryCard
              label="Room Net P&L"
              value={formatPnl(s.space_net_pnl)}
              valueColor={s.space_net_pnl < 0 ? 'text-num-negative' : 'text-num-neutral'}
            />
            <SummaryCard
              label="Avg Win Rate"
              value={formatWinRate(s.avg_win_rate)}
            />
            <SummaryCard
              label="Members"
              value={String(s.member_count)}
              sub={
                s.needs_attention > 0
                  ? `${s.needs_attention} need${s.needs_attention === 1 ? 's' : ''} your attention`
                  : undefined
              }
            />
          </div>
        )}
      </DataState>

      {/* Member performance panel */}
      <div className="flex flex-col gap-ds-3">
        <h3 className="font-sans text-[13px] font-medium text-ink-secondary">
          Member Performance
        </h3>

        <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-1 px-ds-4">
          <DataState
            isLoading={membersLoading}
            isError={membersError}
            error={membersErr}
            data={memberRows}
            onRetry={refetchMembers}
            empty={
              <p className="py-ds-8 text-center font-sans text-[13px] text-ink-tertiary">
                No member performance data for this period.
              </p>
            }
          >
            {(rows) => (
              <div>
                {rows.map((row) => (
                  <MemberPerformanceBar key={row.user_id} row={row} maxAbs={maxAbs} />
                ))}
              </div>
            )}
          </DataState>
        </div>
      </div>
    </div>
  );
}
