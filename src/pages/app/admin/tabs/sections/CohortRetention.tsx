// src/pages/app/admin/tabs/sections/CohortRetention.tsx
// ============================================
// Cohort Retention — 90-day weekly signup + activity heatmap.
//
// Data: UserGrowthData[] (date, newUsers, totalUsers, activeUsers).
// True per-user cohort retention requires per-user activity tracking
// across weeks — not in the current aggregate RPC. This component shows
// what aggregate data CAN reveal:
//   - Weekly signup intensity (heatmap by ISO week)
//   - Weekly activity rate (activeUsers / totalUsers at that point)
//   - Visual at-a-glance for the past 13 weeks
// ============================================

import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import type { UserGrowthData } from '@/types/admin';

interface WeekCell {
  weekStart: string;       // ISO date for Monday of the week
  weekLabel: string;       // "May 19"
  monthLabel: string;      // "May"
  newUsers: number;
  totalUsers: number;
  activeUsers: number;
  activityRate: number;    // 0..1
  days: number;            // how many days in this week we have data for
}

function startOfISOWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getUTCDay();
  // ISO week starts Monday → offset 0 for Mon, 6 for Sun
  const diff = (day === 0 ? -6 : 1 - day);
  date.setUTCDate(date.getUTCDate() + diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function fmtMonth(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

function fmtWeekLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function bucketByWeek(growth: UserGrowthData[]): WeekCell[] {
  if (growth.length === 0) return [];

  const buckets = new Map<string, WeekCell>();

  for (const row of growth) {
    const date = new Date(row.date);
    if (Number.isNaN(date.getTime())) continue;
    const weekStart = startOfISOWeek(date);
    const key = weekStart.toISOString().slice(0, 10);

    const existing = buckets.get(key);
    if (existing) {
      existing.newUsers += row.newUsers;
      // Keep the latest snapshot for total/active (they're cumulative-ish)
      existing.totalUsers = Math.max(existing.totalUsers, row.totalUsers);
      existing.activeUsers = Math.max(existing.activeUsers, row.activeUsers);
      existing.days += 1;
    } else {
      buckets.set(key, {
        weekStart: key,
        weekLabel: fmtWeekLabel(weekStart),
        monthLabel: fmtMonth(weekStart),
        newUsers: row.newUsers,
        totalUsers: row.totalUsers,
        activeUsers: row.activeUsers,
        activityRate: 0,
        days: 1,
      });
    }
  }

  const result = Array.from(buckets.values()).map((w) => ({
    ...w,
    activityRate: w.totalUsers > 0 ? w.activeUsers / w.totalUsers : 0,
  }));

  result.sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
  return result;
}

function intensityColor(value: number, max: number): string {
  if (max === 0 || value === 0) return 'rgba(212, 175, 55, 0.05)';
  const ratio = Math.min(1, value / max);
  const opacity = 0.12 + ratio * 0.78;
  return `rgba(212, 175, 55, ${opacity.toFixed(3)})`;
}

function activityColor(rate: number): string {
  // green for >50%, yellow for 25-50, red for <25
  if (rate >= 0.5) return 'text-green-400';
  if (rate >= 0.25) return 'text-yellow-400';
  return 'text-red-400';
}

interface CohortRetentionProps {
  growth: UserGrowthData[];
}

export function CohortRetention({ growth }: CohortRetentionProps) {
  const weeks = useMemo(() => bucketByWeek(growth), [growth]);
  const maxNewUsers = useMemo(
    () => weeks.reduce((m, w) => Math.max(m, w.newUsers), 0),
    [weeks]
  );

  const totalSignups = weeks.reduce((s, w) => s + w.newUsers, 0);
  const avgWeeklyActivity =
    weeks.length > 0
      ? weeks.reduce((s, w) => s + w.activityRate, 0) / weeks.length
      : 0;

  // Group weeks by month for the visual row label
  const monthGroups = useMemo(() => {
    const groups: Array<{ month: string; weeks: WeekCell[] }> = [];
    for (const w of weeks) {
      const last = groups[groups.length - 1];
      if (last && last.month === w.monthLabel) {
        last.weeks.push(w);
      } else {
        groups.push({ month: w.monthLabel, weeks: [w] });
      }
    }
    return groups;
  }, [weeks]);

  return (
    <div className="bg-[#111111] border border-gray-800 rounded-lg p-5">
      <header className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#D4AF37]" />
          <h3 className="text-white font-semibold">Cohort Retention — 90d</h3>
        </div>
        <span className="text-[11px] text-gray-500">
          weekly buckets · color = signups intensity
        </span>
      </header>

      {weeks.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-10">
          No growth data available for the past 90 days.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {monthGroups.map((group) => (
              <div key={group.month} className="flex items-center gap-3">
                <div className="w-12 text-xs uppercase tracking-wide text-gray-500 shrink-0">
                  {group.month}
                </div>
                <div className="flex-1 flex gap-1.5 flex-wrap">
                  {group.weeks.map((w) => (
                    <div
                      key={w.weekStart}
                      title={
                        `Week of ${w.weekLabel}\n` +
                        `${w.newUsers} signups · ` +
                        `${(w.activityRate * 100).toFixed(0)}% active (${w.activeUsers}/${w.totalUsers})`
                      }
                      className="relative w-12 h-12 rounded border border-gray-800 flex flex-col items-center justify-center cursor-default hover:border-[#D4AF37]/40 transition-colors"
                      style={{ backgroundColor: intensityColor(w.newUsers, maxNewUsers) }}
                    >
                      <span className="text-[11px] font-semibold text-white leading-none">
                        {w.newUsers}
                      </span>
                      <span
                        className={`text-[9px] mt-0.5 leading-none ${activityColor(w.activityRate)}`}
                      >
                        {(w.activityRate * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <footer className="mt-5 pt-4 border-t border-gray-800 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Signups
              </div>
              <div className="text-lg text-white font-semibold mt-0.5">
                {totalSignups.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Avg weekly active
              </div>
              <div className={`text-lg font-semibold mt-0.5 ${activityColor(avgWeeklyActivity)}`}>
                {(avgWeeklyActivity * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Weeks tracked
              </div>
              <div className="text-lg text-white font-semibold mt-0.5">
                {weeks.length}
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
