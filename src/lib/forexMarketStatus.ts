// src/lib/forexMarketStatus.ts
// =====================================================
// FOREX (spot FX) MARKET STATUS — single source of truth
// =====================================================
// The spot FX market trades continuously from Sunday 5:00 PM ET to
// Friday 5:00 PM ET. It is closed from Friday 5:00 PM ET through Sunday
// 5:00 PM ET. There is NO daily break and NO holiday calendar — unlike
// US equities, which have their own helper in `marketStatus.ts`.
//
// This is deliberately a SEPARATE helper (see finotaur/CLAUDE.md
// "Market Status & Weekend Handling" — forex needs its own helper, do
// NOT overload the equity `marketStatus.ts`).
//
// All time math runs in America/New_York via Intl.DateTimeFormat — we
// never trust the browser's local timezone. Pure JS, no network.
// =====================================================

import { useEffect, useState } from 'react';

export type ForexMarketStatus = 'open' | 'closed-weekend';

export interface ForexMarketStatusResult {
  status: ForexMarketStatus;
  isOpen: boolean;
  /** The most recent Friday 5:00 PM ET close (ET). When open, this is the prior week's close. */
  lastClose: Date;
  /** Human label for the last close, e.g. "Friday's Close (May 30)". */
  lastCloseLabel: string;
  /** Next time the FX market opens — the upcoming Sunday 5:00 PM ET. null when already open. */
  nextOpen: Date | null;
  /** Short reason copy, e.g. "Weekend — FX closed (Fri 5 PM → Sun 5 PM ET)". */
  reason: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

// FX week boundaries in ET.
const FX_OPEN_WEEKDAY = 0; // Sunday
const FX_CLOSE_WEEKDAY = 5; // Friday
const FX_BOUNDARY_HOUR = 17; // 5:00 PM ET (both open Sun and close Fri)
const FX_BOUNDARY_MINUTE = 0;

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
    weekday: weekdayMap[get('weekday')] ?? 0,
  };
}

/**
 * Construct a Date that represents the given ET calendar moment.
 * Format a candidate UTC, measure the actual ET offset, then correct —
 * the standard cross-DST-safe trick.
 */
function etCalendarToDate(year: number, month: number, day: number, hour: number, minute: number): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
  const seen = getEtParts(new Date(naive));
  const wanted = year * 525600 + month * 43800 + day * 1440 + hour * 60 + minute;
  const got = seen.year * 525600 + seen.month * 43800 + seen.day * 1440 + seen.hour * 60 + seen.minute;
  return new Date(naive + (wanted - got) * 60_000);
}

/** Step a (y,m,d) by `delta` calendar days. */
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

/** Walk in `dir` (±1) from (y,m,d) until landing on `targetWeekday`. Returns the start day if it already matches. */
function walkToWeekday(
  year: number, month: number, day: number, weekday: number,
  targetWeekday: number, dir: 1 | -1,
): { year: number; month: number; day: number; weekday: number } {
  let cursor = { year, month, day, weekday };
  for (let i = 0; i < 7; i++) {
    if (cursor.weekday === targetWeekday) return cursor;
    cursor = addDays(cursor.year, cursor.month, cursor.day, dir);
  }
  return cursor;
}

function toMin(h: number, m: number): number {
  return h * 60 + m;
}

/**
 * Core: compute FX market status from a given absolute moment.
 * Pass `now = new Date()` in production; pass a fixed Date in tests.
 */
export function getForexMarketStatus(now: Date = new Date()): ForexMarketStatusResult {
  const et = getEtParts(now);
  const minOfDay = toMin(et.hour, et.minute);
  const boundaryMin = toMin(FX_BOUNDARY_HOUR, FX_BOUNDARY_MINUTE);

  // Closed window: Fri >= 5 PM ET, all of Sat, Sun < 5 PM ET.
  const closed =
    et.weekday === 6 ||
    (et.weekday === FX_CLOSE_WEEKDAY && minOfDay >= boundaryMin) ||
    (et.weekday === FX_OPEN_WEEKDAY && minOfDay < boundaryMin);

  // Most recent Friday 5 PM ET close (walk back to Friday; if today IS Friday it matches).
  const closeDay = walkToWeekday(et.year, et.month, et.day, et.weekday, FX_CLOSE_WEEKDAY, -1);
  const lastClose = etCalendarToDate(closeDay.year, closeDay.month, closeDay.day, FX_BOUNDARY_HOUR, FX_BOUNDARY_MINUTE);
  const lastCloseLabel = `${DAY_NAMES[closeDay.weekday]}'s Close (${MONTH_NAMES[closeDay.month - 1]} ${closeDay.day})`;

  if (!closed) {
    return {
      status: 'open',
      isOpen: true,
      lastClose,
      lastCloseLabel,
      nextOpen: null,
      reason: 'FX market open (Sun 5 PM – Fri 5 PM ET)',
    };
  }

  // Upcoming Sunday 5 PM ET open (walk forward to Sunday; if today IS Sunday it matches).
  const openDay = walkToWeekday(et.year, et.month, et.day, et.weekday, FX_OPEN_WEEKDAY, 1);
  const nextOpen = etCalendarToDate(openDay.year, openDay.month, openDay.day, FX_BOUNDARY_HOUR, FX_BOUNDARY_MINUTE);

  return {
    status: 'closed-weekend',
    isOpen: false,
    lastClose,
    lastCloseLabel,
    nextOpen,
    reason: 'Weekend — FX closed (Fri 5 PM → Sun 5 PM ET)',
  };
}

/** Convenience predicate. */
export function isForexMarketOpen(now: Date = new Date()): boolean {
  return getForexMarketStatus(now).isOpen;
}

/**
 * React hook returning the live FX market status. Re-evaluates every 60s.
 * Cheap: pure JS, no network.
 */
export function useForexMarketStatus(): ForexMarketStatusResult {
  const [result, setResult] = useState<ForexMarketStatusResult>(() => getForexMarketStatus());
  useEffect(() => {
    const tick = () => setResult(getForexMarketStatus());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return result;
}
