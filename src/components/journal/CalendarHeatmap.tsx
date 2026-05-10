// ================================================
// CALENDAR HEATMAP — TradeZella-style daily P&L grid
// File: src/components/journal/CalendarHeatmap.tsx
// Shows last 12 weeks (84 day cells) as a contribution-style grid
// ================================================

import React, { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import dayjs from "dayjs";
import { type Trade } from "@/hooks/useDashboardData";

// ------------------------------------------------
// Types
// ------------------------------------------------

interface DayData {
  date: string; // YYYY-MM-DD
  pnl: number;
  count: number;
}

interface CalendarHeatmapProps {
  trades: Trade[];
}

// ------------------------------------------------
// Helpers
// ------------------------------------------------

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKS = 12;
const DAYS = WEEKS * 7; // 84 cells

/** Returns the CSS background color for a cell based on its net P&L. */
function getCellColor(data: DayData | undefined): string {
  if (!data || data.count === 0) return "rgba(255, 255, 255, 0.03)";

  // Clamp intensity: $0 → 0.15 opacity; $500+ → 0.65 opacity
  const magnitude = Math.min(Math.abs(data.pnl) / 500, 1);
  const opacity = 0.15 + magnitude * 0.5;

  if (data.pnl > 0) {
    return `rgba(74, 210, 149, ${opacity})`;
  } else {
    return `rgba(227, 99, 99, ${opacity})`;
  }
}

function formatTooltip(dateStr: string, data: DayData | undefined): string {
  const label = dayjs(dateStr).format("MMM DD, YYYY");
  if (!data || data.count === 0) return `${label} • No trades`;
  const sign = data.pnl >= 0 ? "+" : "";
  return `${label} • ${sign}$${Math.abs(data.pnl).toFixed(2)} • ${data.count} trade${data.count !== 1 ? "s" : ""}`;
}

// ------------------------------------------------
// Main component
// ------------------------------------------------

const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({ trades }) => {
  // Build map: YYYY-MM-DD → { pnl, count }
  const dayMap = useMemo<Map<string, DayData>>(() => {
    const map = new Map<string, DayData>();
    for (const t of trades) {
      if (!t.close_at) continue;
      const key = dayjs(t.close_at).format("YYYY-MM-DD");
      const existing = map.get(key);
      if (existing) {
        existing.pnl += t.pnl ?? 0;
        existing.count += 1;
      } else {
        map.set(key, { date: key, pnl: t.pnl ?? 0, count: 1 });
      }
    }
    return map;
  }, [trades]);

  // Build the grid: 12 columns (weeks), each column = 7 days (Sun→Sat)
  // Start from the most recent completed Sunday (or today's week start).
  const weeks = useMemo<string[][]>(() => {
    // Find the Sunday that starts the current week
    const today = dayjs();
    const startOfCurrentWeek = today.startOf("week"); // dayjs: week starts Sunday
    // Go back (WEEKS - 1) weeks to get the first Sunday
    const gridStart = startOfCurrentWeek.subtract(WEEKS - 1, "week");

    const result: string[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const col: string[] = [];
      for (let d = 0; d < 7; d++) {
        col.push(gridStart.add(w * 7 + d, "day").format("YYYY-MM-DD"));
      }
      result.push(col);
    }
    return result;
  }, []);

  // Month labels: for each column, if the Monday (index 1) is the 1st–7th of its month,
  // emit a month label above that column.
  const monthLabels = useMemo<(string | null)[]>(() => {
    return weeks.map(col => {
      const mondayDate = dayjs(col[1]); // Monday is index 1 (0=Sun,1=Mon)
      if (mondayDate.date() <= 7) {
        return mondayDate.format("MMM");
      }
      return null;
    });
  }, [weeks]);

  return (
    <div
      className="rounded-2xl border p-6 shadow-lg"
      style={{
        borderColor: "rgba(201, 166, 70, 0.15)",
        background: "linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(14,14,14,0.95) 100%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <CalendarDays className="w-5 h-5 text-[#C9A646]" />
        <h3 className="text-[#F4F4F4] text-lg font-semibold">Daily P&L Calendar</h3>
        <span className="ml-auto text-xs text-[#666666]">Last {WEEKS} weeks</span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: `${WEEKS * 20}px` }}>
          {/* Month labels row */}
          <div className="flex mb-1">
            {/* Spacer for DOW label column */}
            <div style={{ width: 28, flexShrink: 0 }} />
            {weeks.map((_, wi) => (
              <div
                key={wi}
                className="text-[10px] text-[#666666] text-center"
                style={{ flex: 1, minWidth: 14 }}
              >
                {monthLabels[wi] ?? ""}
              </div>
            ))}
          </div>

          {/* Grid: 7 rows (Sun–Sat), 12 columns (weeks) */}
          {Array.from({ length: 7 }, (_, dayOfWeek) => (
            <div key={dayOfWeek} className="flex items-center mb-[3px]">
              {/* DOW label */}
              <div
                className="text-[10px] text-[#555555] text-right pr-1.5 select-none"
                style={{ width: 28, flexShrink: 0 }}
              >
                {/* Show label only for odd rows to reduce clutter */}
                {dayOfWeek % 2 !== 0 ? DOW_LABELS[dayOfWeek].slice(0, 1) : ""}
              </div>

              {/* Week cells for this day-of-week */}
              {weeks.map((col, wi) => {
                const dateStr = col[dayOfWeek];
                const data = dayMap.get(dateStr);
                const isFuture = dayjs(dateStr).isAfter(dayjs(), "day");
                const tooltip = formatTooltip(dateStr, data);

                return (
                  <div
                    key={wi}
                    title={tooltip}
                    style={{
                      flex: 1,
                      minWidth: 14,
                      height: 14,
                      margin: "0 1.5px",
                      borderRadius: 3,
                      backgroundColor: isFuture
                        ? "transparent"
                        : getCellColor(data),
                      cursor: data && data.count > 0 ? "default" : "default",
                      opacity: isFuture ? 0 : 1,
                      transition: "background-color 0.15s",
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
        <span className="text-[10px] text-[#555555]">Less</span>
        {[0.15, 0.3, 0.45, 0.6, 0.65].map(op => (
          <div
            key={op}
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              backgroundColor: `rgba(74, 210, 149, ${op})`,
            }}
          />
        ))}
        <span className="text-[10px] text-[#555555]">More</span>
      </div>
    </div>
  );
};

export default React.memo(CalendarHeatmap);
