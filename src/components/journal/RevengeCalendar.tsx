// ================================================
// REVENGE CALENDAR — 12-week grid marking revenge-trading days in purple
// File: src/components/journal/RevengeCalendar.tsx
// Modeled 1:1 on CalendarHeatmap.tsx (same grid/month-label/sizing pattern).
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

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKS = 12;

/** Purple for revenge days, faint white for traded-no-revenge, faintest for no trades. */
function getCellColor(data: DayCell | undefined): string {
  if (!data || (!data.traded && data.revengeCount === 0)) return 'rgba(255, 255, 255, 0.03)';
  if (data.revengeCount > 0) {
    const opacity = 0.25 + Math.min(data.revengeCount / 3, 1) * 0.55;
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

  // Build the grid: 12 columns (weeks), each column = 7 days (Sun→Sat)
  const weeks = useMemo<string[][]>(() => {
    const today = dayjs();
    const startOfCurrentWeek = today.startOf('week');
    const gridStart = startOfCurrentWeek.subtract(WEEKS - 1, 'week');

    const result: string[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const col: string[] = [];
      for (let d = 0; d < 7; d++) {
        col.push(gridStart.add(w * 7 + d, 'day').format('YYYY-MM-DD'));
      }
      result.push(col);
    }
    return result;
  }, []);

  const monthLabels = useMemo<(string | null)[]>(() => {
    return weeks.map((col) => {
      const mondayDate = dayjs(col[1]);
      if (mondayDate.date() <= 7) {
        return mondayDate.format('MMM');
      }
      return null;
    });
  }, [weeks]);

  // Count purple (revenge) days within the visible 12-week window.
  const visibleRevengeDayCount = useMemo(() => {
    let count = 0;
    for (const col of weeks) {
      for (const dateStr of col) {
        const data = dayMap.get(dateStr);
        if (data && data.revengeCount > 0) count++;
      }
    }
    return count;
  }, [weeks, dayMap]);

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
        <h3 className="text-[#F4F4F4] text-lg font-semibold">
          Revenge days (last {WEEKS} weeks): {visibleRevengeDayCount}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: `${WEEKS * 20}px` }}>
          {/* Month labels row */}
          <div className="flex mb-1">
            <div style={{ width: 28, flexShrink: 0 }} />
            {weeks.map((_, wi) => (
              <div
                key={wi}
                className="text-[10px] text-[#666666] text-center"
                style={{ flex: 1, minWidth: 14 }}
              >
                {monthLabels[wi] ?? ''}
              </div>
            ))}
          </div>

          {/* Grid: 7 rows (Sun–Sat), 12 columns (weeks) */}
          {Array.from({ length: 7 }, (_, dayOfWeek) => (
            <div key={dayOfWeek} className="flex items-center mb-[3px]">
              <div
                className="text-[10px] text-[#555555] text-right pr-1.5 select-none"
                style={{ width: 28, flexShrink: 0 }}
              >
                {dayOfWeek % 2 !== 0 ? DOW_LABELS[dayOfWeek].slice(0, 1) : ''}
              </div>

              {weeks.map((col, wi) => {
                const dateStr = col[dayOfWeek];
                const data = dayMap.get(dateStr);
                const isFuture = dayjs(dateStr).isAfter(dayjs(), 'day');
                const tooltip = formatTooltip(dateStr, data);

                return (
                  <div
                    key={wi}
                    title={tooltip}
                    style={{
                      flex: 1,
                      minWidth: 14,
                      height: 14,
                      margin: '0 1.5px',
                      borderRadius: 3,
                      backgroundColor: isFuture ? 'transparent' : getCellColor(data),
                      opacity: isFuture ? 0 : 1,
                      transition: 'background-color 0.15s',
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 justify-end">
        <div className="flex items-center gap-1.5">
          <div
            style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'rgba(167, 139, 250, 0.65)' }}
          />
          <span className="text-[10px] text-[#888888]">Revenge day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
          />
          <span className="text-[10px] text-[#888888]">Traded, no revenge</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RevengeCalendar);
