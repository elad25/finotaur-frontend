// ================================================
// REVENGE CALENDAR — small per-month calendars marking revenge-trading days.
// File: src/components/journal/RevengeCalendar.tsx
// Shows the last 3 months as separate mini month grids so a user can see, at a
// glance, how many revenge days they had each month.
// ================================================

import React, { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import dayjs from 'dayjs';
import type { Trade } from '@/hooks/useTradesData';
import type { RevengeDay } from '@/lib/journal/revengeDetection';

// ------------------------------------------------
// Types
// ------------------------------------------------

interface DayCell {
  date: string; // YYYY-MM-DD
  traded: boolean;
  revengeCount: number;
  revengePnl: number;
}

interface RevengeCalendarProps {
  revengeDays: RevengeDay[];
  trades: Trade[];
}

// ------------------------------------------------
// Helpers
// ------------------------------------------------

const DOW_MINI = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS_TO_SHOW = 3;

/** Purple for revenge days, faint white for traded-no-revenge, faintest for no trades. */
function getCellColor(data: DayCell | undefined): string {
  if (!data || (!data.traded && data.revengeCount === 0)) return 'rgba(255, 255, 255, 0.03)';
  if (data.revengeCount > 0) {
    const opacity = 0.3 + Math.min(data.revengeCount / 3, 1) * 0.5;
    return `rgba(167, 139, 250, ${opacity})`;
  }
  return 'rgba(255, 255, 255, 0.06)';
}

function formatTooltip(dateStr: string, data: DayCell | undefined): string {
  const label = dayjs(dateStr).format('MMM DD, YYYY');
  if (!data || (!data.traded && data.revengeCount === 0)) return `${label} • No trades`;
  if (data.revengeCount > 0) {
    const sign = data.revengePnl >= 0 ? '+' : '-';
    return `${label} • ${data.revengeCount} revenge trade${data.revengeCount !== 1 ? 's' : ''} • ${sign}$${Math.abs(data.revengePnl).toFixed(2)}`;
  }
  return `${label} • Traded, no revenge`;
}

// ------------------------------------------------
// Main component
// ------------------------------------------------

const RevengeCalendar: React.FC<RevengeCalendarProps> = ({ revengeDays, trades }) => {
  // Build map: YYYY-MM-DD → DayCell
  const dayMap = useMemo<Map<string, DayCell>>(() => {
    const map = new Map<string, DayCell>();

    for (const t of trades) {
      if (!t.open_at) continue;
      const key = dayjs(t.open_at).format('YYYY-MM-DD');
      const existing = map.get(key);
      if (existing) {
        existing.traded = true;
      } else {
        map.set(key, { date: key, traded: true, revengeCount: 0, revengePnl: 0 });
      }
    }

    for (const rd of revengeDays) {
      const existing = map.get(rd.date);
      if (existing) {
        existing.revengeCount = rd.count;
        existing.revengePnl = rd.pnl;
      } else {
        map.set(rd.date, { date: rd.date, traded: true, revengeCount: rd.count, revengePnl: rd.pnl });
      }
    }

    return map;
  }, [trades, revengeDays]);

  // Build the last N months as calendar grids (weeks of Sun→Sat, padded to full weeks).
  const months = useMemo(() => {
    const today = dayjs();
    const out: {
      key: string;
      label: string;
      monthIndex: number;
      weeks: string[][];
      revengeCount: number;
    }[] = [];

    for (let m = MONTHS_TO_SHOW - 1; m >= 0; m--) {
      const monthStart = today.subtract(m, 'month').startOf('month');
      const gridStart = monthStart.startOf('week'); // Sunday on/before the 1st
      const gridEnd = monthStart.endOf('month').endOf('week'); // Saturday on/after the last

      const days: string[] = [];
      let cur = gridStart;
      while (cur.isBefore(gridEnd) || cur.isSame(gridEnd, 'day')) {
        days.push(cur.format('YYYY-MM-DD'));
        cur = cur.add(1, 'day');
      }

      const weeks: string[][] = [];
      for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

      let revengeCount = 0;
      for (const d of days) {
        if (dayjs(d).month() !== monthStart.month()) continue;
        const cell = dayMap.get(d);
        if (cell && cell.revengeCount > 0) revengeCount++;
      }

      out.push({
        key: monthStart.format('YYYY-MM'),
        label: monthStart.format('MMMM YYYY'),
        monthIndex: monthStart.month(),
        weeks,
        revengeCount,
      });
    }
    return out;
  }, [dayMap]);

  const totalRevenge = months.reduce((s, mo) => s + mo.revengeCount, 0);
  const today = dayjs();

  return (
    <div
      className="rounded-2xl border p-6 shadow-lg"
      style={{
        borderColor: 'rgba(201, 166, 70, 0.15)',
        background: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(14,14,14,0.95) 100%)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <CalendarDays className="w-5 h-5 text-[#C9A646]" />
        <h3 className="text-[#F4F4F4] text-lg font-semibold">Revenge calendar</h3>
        <span className="text-[11px] text-white/45 ml-1">
          last {MONTHS_TO_SHOW} months · {totalRevenge} revenge day{totalRevenge !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Per-month mini calendars */}
      <div className="flex flex-wrap gap-5">
        {months.map((month) => (
          <div key={month.key} className="flex-1" style={{ minWidth: 200 }}>
            {/* Month header + per-month revenge count */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-medium text-white/82">{month.label}</span>
              <span
                className="text-[11px] font-semibold"
                style={{ color: month.revengeCount > 0 ? 'rgba(167,139,250,0.95)' : 'rgba(255,255,255,0.4)' }}
              >
                {month.revengeCount} revenge
              </span>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DOW_MINI.map((d, i) => (
                <div key={i} className="text-[9px] text-[#555] text-center select-none">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {month.weeks.flat().map((dateStr) => {
                const dj = dayjs(dateStr);
                const inMonth = dj.month() === month.monthIndex;
                const isFuture = dj.isAfter(today, 'day');
                const data = dayMap.get(dateStr);
                const showColor = inMonth && !isFuture;
                const isRevenge = showColor && !!data && data.revengeCount > 0;
                return (
                  <div
                    key={dateStr}
                    title={inMonth ? formatTooltip(dateStr, data) : ''}
                    className="flex items-center justify-center rounded-md select-none"
                    style={{
                      aspectRatio: '1 / 1',
                      fontSize: 10,
                      backgroundColor: showColor ? getCellColor(data) : 'transparent',
                      color: !inMonth ? 'transparent' : isRevenge ? '#F4F4F4' : 'rgba(255,255,255,0.35)',
                      border: isRevenge ? '1px solid rgba(167,139,250,0.5)' : '1px solid transparent',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    {inMonth ? dj.date() : ''}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-5 flex items-center gap-4 justify-end">
        <div className="flex items-center gap-1.5">
          <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: 'rgba(167, 139, 250, 0.65)' }} />
          <span className="text-[10px] text-[#888888]">Revenge day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />
          <span className="text-[10px] text-[#888888]">Traded, no revenge</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RevengeCalendar);
