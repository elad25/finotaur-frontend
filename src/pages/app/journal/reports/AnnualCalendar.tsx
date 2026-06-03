/**
 * JournalReportsAnnualCalendar — full-year P&L calendar.
 * 12 month mini-grids, colored by daily net P&L intensity.
 */

import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTrades } from '@/hooks/useTradesData';
import { Card } from '@/components/ds/Card';
import { Change } from '@/components/ds/NumberDisplay';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DayData {
  date: string;  // YYYY-MM-DD
  pnl: number;
  count: number;
}

// ---------------------------------------------------------------------------
// Color helper — mirrors CalendarHeatmap approach
// ---------------------------------------------------------------------------

function getCellColor(pnl: number, magnitude: number): string {
  // magnitude: 0–1 clamped (relative to $500)
  const opacity = 0.15 + Math.min(magnitude, 1) * 0.5;
  if (pnl > 0) return `rgba(74, 210, 149, ${opacity})`;
  if (pnl < 0) return `rgba(226, 75, 74, ${opacity})`;
  return 'rgba(255,255,255,0.03)';
}

// ---------------------------------------------------------------------------
// Month mini-grid
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW_LABELS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface MonthGridProps {
  year: number;
  month: number; // 0-based
  dayMap: Map<string, DayData>;
}

const MonthGrid: React.FC<MonthGridProps> = ({ year, month, dayMap }) => {
  const firstDay = dayjs(new Date(year, month, 1));
  const daysInMonth = firstDay.daysInMonth();
  const startDow = firstDay.day(); // 0=Sun

  // Build cells array: leading blanks + day numbers
  const cells: (number | null)[] = [
    ...Array.from<null>({ length: startDow }).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Pad to complete last week
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="min-w-[160px]">
      <p className="text-[11px] font-semibold text-ink-secondary mb-2 tracking-wide">
        {MONTH_NAMES[month]}
      </p>

      {/* DOW header */}
      <div className="grid grid-cols-7 mb-1">
        {DOW_LABELS_SHORT.map((l, i) => (
          <div key={i} className="text-[9px] text-center text-ink-tertiary pb-0.5">{l}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-[2px]">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={i} className="aspect-square" />;
          }
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const data = dayMap.get(dateStr);
          const isFuture = dayjs(dateStr).isAfter(dayjs(), 'day');

          const magnitude = data ? Math.min(Math.abs(data.pnl) / 500, 1) : 0;
          const bg = isFuture || !data
            ? 'rgba(255,255,255,0.03)'
            : getCellColor(data.pnl, magnitude);

          const sign = data && data.pnl >= 0 ? '+' : '';
          const tooltip = data && !isFuture
            ? `${dateStr} • ${sign}$${Math.abs(data.pnl).toFixed(2)} • ${data.count} trade${data.count !== 1 ? 's' : ''}`
            : dateStr;

          return (
            <div
              key={i}
              title={tooltip}
              className="aspect-square rounded-[2px] flex items-center justify-center text-[8px] text-white/30 cursor-default transition-colors hover:brightness-125"
              style={{ backgroundColor: bg, opacity: isFuture ? 0.25 : 1 }}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Stat row helper
// ---------------------------------------------------------------------------

interface YearStats {
  netPnl: number;
  count: number;
  wins: number;
  bestDay: { date: string; pnl: number } | null;
  worstDay: { date: string; pnl: number } | null;
}

function computeYearStats(dayMap: Map<string, DayData>): YearStats {
  let netPnl = 0;
  let count = 0;
  let wins = 0;
  let bestDay: { date: string; pnl: number } | null = null;
  let worstDay: { date: string; pnl: number } | null = null;

  for (const [date, data] of dayMap.entries()) {
    netPnl += data.pnl;
    count += data.count;
    if (data.pnl > 0) wins += 1;
    if (bestDay === null || data.pnl > bestDay.pnl) bestDay = { date, pnl: data.pnl };
    if (worstDay === null || data.pnl < worstDay.pnl) worstDay = { date, pnl: data.pnl };
  }

  return { netPnl, count, wins, bestDay, worstDay };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function JournalReportsAnnualCalendar() {
  const { data: trades = [], isLoading } = useTrades();

  // Derive available years from trades; fall back to current year
  const availableYears = useMemo<number[]>(() => {
    const years = new Set<number>();
    for (const t of trades) {
      const d = t.close_at ?? t.open_at;
      if (d) years.add(dayjs(d).year());
    }
    years.add(dayjs().year());
    return Array.from(years).sort((a, b) => b - a); // desc
  }, [trades]);

  const [year, setYear] = useState<number>(dayjs().year());

  // Build dayMap for selected year
  const dayMap = useMemo<Map<string, DayData>>(() => {
    const map = new Map<string, DayData>();
    for (const t of trades) {
      const d = t.close_at ?? t.open_at;
      if (!d) continue;
      const dj = dayjs(d);
      if (dj.year() !== year) continue;
      const key = dj.format('YYYY-MM-DD');
      const existing = map.get(key);
      if (existing) {
        existing.pnl += t.pnl ?? 0;
        existing.count += 1;
      } else {
        map.set(key, { date: key, pnl: t.pnl ?? 0, count: 1 });
      }
    }
    return map;
  }, [trades, year]);

  const yearStats = useMemo(() => computeYearStats(dayMap), [dayMap]);
  const tradingDayCount = dayMap.size;
  const winRate = tradingDayCount > 0
    ? (yearStats.wins / tradingDayCount) * 100
    : 0;

  const noTradesInYear = !isLoading && dayMap.size === 0;

  function prevYear() {
    setYear(y => y - 1);
  }
  function nextYear() {
    const next = year + 1;
    if (next <= dayjs().year()) setYear(next);
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-2xl font-semibold text-ink-primary">Annual Calendar</h2>
        <p className="text-sm text-ink-tertiary mt-1">
          Full-year P&amp;L heatmap — green = profitable day, red = losing day.
        </p>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={prevYear}
          className="p-1.5 rounded-md bg-white/[0.04] text-ink-secondary hover:text-ink-primary hover:bg-white/[0.08] transition-colors"
          aria-label="Previous year"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-lg font-semibold text-ink-primary w-14 text-center">{year}</span>
        <button
          onClick={nextYear}
          disabled={year >= dayjs().year()}
          className="p-1.5 rounded-md bg-white/[0.04] text-ink-secondary hover:text-ink-primary hover:bg-white/[0.08] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Next year"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Available year quick-jump */}
        {availableYears.length > 1 && (
          <div className="flex gap-1 ml-2">
            {availableYears.map(y => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  y === year
                    ? 'bg-[#C9A646]/55 text-white'
                    : 'bg-white/[0.04] text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {noTradesInYear && (
        <Card padding="spacious">
          <div className="text-center text-ink-tertiary text-sm py-8">
            No trades found for {year}. Select a different year or add trades.
          </div>
        </Card>
      )}

      {/* Month grids */}
      {!isLoading && !noTradesInYear && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 12 }, (_, m) => (
            <Card key={m} padding="compact">
              <MonthGrid year={year} month={m} dayMap={dayMap} />
            </Card>
          ))}
        </div>
      )}

      {/* Year summary */}
      {!isLoading && !noTradesInYear && (
        <Card padding="compact">
          <h3 className="text-sm font-semibold text-ink-primary mb-4">{year} Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-ink-tertiary mb-1">Net P&amp;L</p>
              <Change value={yearStats.netPnl} format="currency" decimals={2} className="text-sm font-semibold" />
            </div>
            <div>
              <p className="text-xs text-ink-tertiary mb-1">Total Trades</p>
              <p className="text-sm font-semibold text-ink-primary">{yearStats.count}</p>
            </div>
            <div>
              <p className="text-xs text-ink-tertiary mb-1">Day Win Rate</p>
              <p className={`text-sm font-semibold ${winRate >= 50 ? 'text-[#4AD295]' : 'text-[#E24B4A]'}`}>
                {winRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-tertiary mb-1">Best Day</p>
              {yearStats.bestDay ? (
                <div>
                  <Change value={yearStats.bestDay.pnl} format="currency" decimals={2} className="text-sm font-semibold" />
                  <p className="text-[10px] text-ink-tertiary">{yearStats.bestDay.date}</p>
                </div>
              ) : <p className="text-sm text-ink-tertiary">—</p>}
            </div>
            <div>
              <p className="text-xs text-ink-tertiary mb-1">Worst Day</p>
              {yearStats.worstDay ? (
                <div>
                  <Change value={yearStats.worstDay.pnl} format="currency" decimals={2} className="text-sm font-semibold" />
                  <p className="text-[10px] text-ink-tertiary">{yearStats.worstDay.date}</p>
                </div>
              ) : <p className="text-sm text-ink-tertiary">—</p>}
            </div>
          </div>
        </Card>
      )}

      {/* Legend */}
      {!isLoading && !noTradesInYear && (
        <div className="flex items-center gap-3 text-xs text-ink-tertiary">
          <span>Less</span>
          {[0.15, 0.3, 0.45, 0.65].map(op => (
            <div
              key={op}
              className="w-3 h-3 rounded-[2px]"
              style={{ backgroundColor: `rgba(74, 210, 149, ${op})` }}
            />
          ))}
          <span>More</span>
          <span className="mx-2 text-ink-tertiary/40">|</span>
          {[0.15, 0.3, 0.45, 0.65].map(op => (
            <div
              key={op}
              className="w-3 h-3 rounded-[2px]"
              style={{ backgroundColor: `rgba(226, 75, 74, ${op})` }}
            />
          ))}
          <span>More</span>
        </div>
      )}
    </div>
  );
}
