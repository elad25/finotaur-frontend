// src/lib/marketStatus.ts
// =====================================================
// US EQUITY MARKET STATUS — single source of truth
// =====================================================
// Returns whether the US equity market (NYSE/NASDAQ) is currently open,
// and if closed, what the last trading day was so UIs can show
// "Showing Friday's Close" instead of presenting stale weekend data
// as if it were live.
//
// All time math runs in America/New_York via Intl.DateTimeFormat — we
// never trust the browser's local timezone. Holidays are encoded inline
// (NYSE 2025-2026 official calendar); add new years as needed.
//
// PROJECT-WIDE WORKING ASSUMPTION (see finotaur/CLAUDE.md):
// any UI that displays US equity prices/quotes MUST surface market
// status when closed. Use the `useMarketStatus()` hook or call
// `getMarketStatus()` directly. Do NOT roll your own day-of-week check.
// =====================================================

import { useEffect, useState } from 'react';

export type MarketStatus =
  | 'open'
  | 'closed-weekend'
  | 'closed-after-hours'
  | 'closed-pre-market'
  | 'closed-holiday';

export interface MarketStatusResult {
  status: MarketStatus;
  isOpen: boolean;
  /** The last calendar date the market was open (ET). For "now" during a trading session, this is today. */
  lastTradingDay: Date;
  /** Human label for lastTradingDay, e.g. "Friday's Close" / "Friday, May 22" / "Today's Close". */
  lastTradingDayLabel: string;
  /** Short label suitable for badges, e.g. "Friday" / "Wednesday" / "Today". */
  lastTradingDayShort: string;
  /** Next time the market opens (ET). null if unknown. */
  nextOpen: Date | null;
  /** Short reason copy, e.g. "Weekend" / "After hours" / "Holiday: Memorial Day". */
  reason: string;
  /** Name of holiday if status is closed-holiday, else null. */
  holidayName: string | null;
}

// NYSE official holidays. Add new years as needed.
// Format: 'YYYY-MM-DD' (ET calendar date).
const NYSE_HOLIDAYS_2025: Record<string, string> = {
  '2025-01-01': "New Year's Day",
  '2025-01-20': 'Martin Luther King Jr. Day',
  '2025-02-17': "Presidents' Day",
  '2025-04-18': 'Good Friday',
  '2025-05-26': 'Memorial Day',
  '2025-06-19': 'Juneteenth',
  '2025-07-04': 'Independence Day',
  '2025-09-01': 'Labor Day',
  '2025-11-27': 'Thanksgiving',
  '2025-12-25': 'Christmas',
};

const NYSE_HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': "New Year's Day",
  '2026-01-19': 'Martin Luther King Jr. Day',
  '2026-02-16': "Presidents' Day",
  '2026-04-03': 'Good Friday',
  '2026-05-25': 'Memorial Day',
  '2026-06-19': 'Juneteenth',
  '2026-07-03': 'Independence Day (observed)',
  '2026-09-07': 'Labor Day',
  '2026-11-26': 'Thanksgiving',
  '2026-12-25': 'Christmas',
};

const NYSE_HOLIDAYS: Record<string, string> = {
  ...NYSE_HOLIDAYS_2025,
  ...NYSE_HOLIDAYS_2026,
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

interface EtParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  /** JS day-of-week index: 0=Sun .. 6=Sat */
  weekday: number;
}

/** Extract ET calendar parts from a Date (typically `new Date()`). */
function getEtParts(d: Date): EtParts {
  // en-US 'short' weekday returns 'Mon', 'Tue', etc. We map back to 0-6.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = fmt.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekdayStr = get('weekday');
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  let hour = parseInt(get('hour'), 10);
  // Intl with hour12:false in en-US can return '24' at midnight on some engines — normalize.
  if (hour === 24) hour = 0;
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour,
    minute: parseInt(get('minute'), 10),
    weekday: weekdayMap[weekdayStr] ?? 0,
  };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function etDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function isHoliday(year: number, month: number, day: number): string | null {
  return NYSE_HOLIDAYS[etDateKey(year, month, day)] ?? null;
}

function isTradingDay(year: number, month: number, day: number, weekday: number): boolean {
  if (weekday === 0 || weekday === 6) return false; // Sun, Sat
  if (isHoliday(year, month, day)) return false;
  return true;
}

/**
 * Construct a Date that represents the given ET calendar moment.
 * We build it by string + timezone-naive parsing won't work cross-DST,
 * so we use the standard trick: format a candidate UTC, measure the
 * actual ET offset, then correct.
 */
function etCalendarToDate(year: number, month: number, day: number, hour: number, minute: number): Date {
  // First-pass: assume UTC = ET literal (wrong by some offset)
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
  const naiveDate = new Date(naive);
  const seen = getEtParts(naiveDate);
  // Compute the diff in minutes between what ET sees and what we wanted
  const wanted = year * 525600 + month * 43800 + day * 1440 + hour * 60 + minute;
  const got = seen.year * 525600 + seen.month * 43800 + seen.day * 1440 + seen.hour * 60 + seen.minute;
  const diffMin = wanted - got;
  return new Date(naive + diffMin * 60_000);
}

/** Step a (y,m,d) by `delta` calendar days. Uses UTC math for simple arithmetic. */
function addDays(year: number, month: number, day: number, delta: number): { year: number; month: number; day: number; weekday: number } {
  const base = new Date(Date.UTC(year, month - 1, day));
  base.setUTCDate(base.getUTCDate() + delta);
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
    weekday: base.getUTCDay(),
  };
}

function previousTradingDay(year: number, month: number, day: number): { year: number; month: number; day: number; weekday: number } {
  let cursor = addDays(year, month, day, -1);
  // Walk back at most 14 days (covers any conceivable holiday cluster)
  for (let i = 0; i < 14; i++) {
    if (isTradingDay(cursor.year, cursor.month, cursor.day, cursor.weekday)) return cursor;
    cursor = addDays(cursor.year, cursor.month, cursor.day, -1);
  }
  return cursor;
}

function nextTradingDay(year: number, month: number, day: number): { year: number; month: number; day: number; weekday: number } {
  let cursor = addDays(year, month, day, 1);
  for (let i = 0; i < 14; i++) {
    if (isTradingDay(cursor.year, cursor.month, cursor.day, cursor.weekday)) return cursor;
    cursor = addDays(cursor.year, cursor.month, cursor.day, 1);
  }
  return cursor;
}

const MARKET_OPEN_HOUR = 9;
const MARKET_OPEN_MINUTE = 30;
const MARKET_CLOSE_HOUR = 16;
const MARKET_CLOSE_MINUTE = 0;

/** Returns 0..1439, the ET minute-of-day for a given hour/minute pair. */
function toMin(h: number, m: number): number {
  return h * 60 + m;
}

/**
 * Core: compute market status from a given absolute moment.
 * Pass `now = new Date()` in production; pass a fixed Date in tests.
 */
export function getMarketStatus(now: Date = new Date()): MarketStatusResult {
  const et = getEtParts(now);
  const todayHoliday = isHoliday(et.year, et.month, et.day);
  const isWeekend = et.weekday === 0 || et.weekday === 6;
  const minOfDay = toMin(et.hour, et.minute);
  const openMin = toMin(MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE);
  const closeMin = toMin(MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE);

  let status: MarketStatus;
  let lastY: number, lastM: number, lastD: number, lastW: number;
  let holidayName: string | null = null;
  let reason: string;

  if (isWeekend) {
    status = 'closed-weekend';
    const prev = previousTradingDay(et.year, et.month, et.day);
    lastY = prev.year; lastM = prev.month; lastD = prev.day; lastW = prev.weekday;
    reason = 'Weekend';
  } else if (todayHoliday) {
    status = 'closed-holiday';
    holidayName = todayHoliday;
    const prev = previousTradingDay(et.year, et.month, et.day);
    lastY = prev.year; lastM = prev.month; lastD = prev.day; lastW = prev.weekday;
    reason = `Holiday: ${todayHoliday}`;
  } else if (minOfDay < openMin) {
    status = 'closed-pre-market';
    const prev = previousTradingDay(et.year, et.month, et.day);
    lastY = prev.year; lastM = prev.month; lastD = prev.day; lastW = prev.weekday;
    reason = 'Market closed before the regular session';
  } else if (minOfDay >= closeMin) {
    status = 'closed-after-hours';
    lastY = et.year; lastM = et.month; lastD = et.day; lastW = et.weekday;
    reason = 'After hours (closed 4:00 PM ET)';
  } else {
    status = 'open';
    lastY = et.year; lastM = et.month; lastD = et.day; lastW = et.weekday;
    reason = 'Regular session (9:30 AM – 4:00 PM ET)';
  }

  // Build labels for the last trading day
  const dayName = DAY_NAMES[lastW];
  const monthName = MONTH_NAMES[lastM - 1];
  const isToday = lastY === et.year && lastM === et.month && lastD === et.day;

  let lastTradingDayLabel: string;
  let lastTradingDayShort: string;
  if (status === 'open') {
    lastTradingDayLabel = "Today's session (live)";
    lastTradingDayShort = 'Today';
  } else if (isToday) {
    // After-hours: today's close is the latest
    lastTradingDayLabel = "Today's Close";
    lastTradingDayShort = 'Today';
  } else {
    lastTradingDayLabel = `${dayName}'s Close (${monthName} ${lastD})`;
    lastTradingDayShort = dayName;
  }

  // Compute nextOpen
  let nextOpen: Date | null = null;
  if (status !== 'open') {
    if (
      !isWeekend &&
      !todayHoliday &&
      minOfDay < openMin
    ) {
      // Today is a trading day and we're before the open
      nextOpen = etCalendarToDate(et.year, et.month, et.day, MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE);
    } else {
      const next = nextTradingDay(et.year, et.month, et.day);
      nextOpen = etCalendarToDate(next.year, next.month, next.day, MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE);
    }
  }

  // Build Date object for lastTradingDay (use ET noon to avoid DST edge weirdness)
  const lastTradingDay = etCalendarToDate(lastY, lastM, lastD, 12, 0);

  return {
    status,
    isOpen: status === 'open',
    lastTradingDay,
    lastTradingDayLabel,
    lastTradingDayShort,
    nextOpen,
    reason,
    holidayName,
  };
}

/** Convenience predicate. */
export function isMarketOpen(now: Date = new Date()): boolean {
  return getMarketStatus(now).isOpen;
}

/**
 * React hook returning the live market status. Re-evaluates every 60s,
 * which is plenty since session boundaries are at minute granularity.
 * Cheap: pure JS, no network.
 */
export function useMarketStatus(): MarketStatusResult {
  const [result, setResult] = useState<MarketStatusResult>(() => getMarketStatus());
  useEffect(() => {
    const tick = () => setResult(getMarketStatus());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return result;
}
