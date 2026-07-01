// src/lib/futuresSession.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers describing the CME futures daily session boundary.
//
// CME futures trade nearly 24h/day but reset (and are flat-only) daily at
// 5:00 PM America/Chicago ("CT"), with the weekly close Friday 4:00 PM CT
// through the week's reopen Sunday 5:00 PM CT. This mirrors the desktop
// agent's `NextSessionOpenUtc` reset boundary in RiskEnforcer.cs — keep the
// two in sync if the agent's session-boundary logic ever changes.
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_OPEN_HOUR_CT = 17; // 5:00 PM America/Chicago
const SESSION_TIME_ZONE = 'America/Chicago';

/**
 * Returns the wall-clock hour/minute/second that `date` reads as in the given
 * IANA time zone, using `Intl.DateTimeFormat` so DST transitions (CDT/CST)
 * are handled automatically by the platform's tz database rather than a
 * hardcoded UTC offset.
 */
function getZonedParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '0';

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  // Intl can render hour "24" for midnight in some locales/environments —
  // normalize to 0 so downstream arithmetic never sees an out-of-range hour.
  const rawHour = parseInt(get('hour'), 10);

  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: rawHour === 24 ? 0 : rawHour,
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
    weekday: weekdayMap[get('weekday')] ?? 0,
  };
}

/**
 * Builds a UTC `Date` for a given Y/M/D + 17:00:00 wall-clock time *as read
 * in America/Chicago*, by computing the zone's current UTC offset at that
 * calendar date (via a probe) and applying it. This is DST-safe because the
 * offset is derived from the same date being constructed, not a constant.
 */
function chicagoWallClockToUtc(year: number, month: number, day: number, hour: number): Date {
  // Probe: construct a UTC instant using the naive Y/M/D/H as if it were UTC,
  // then ask the Chicago formatter what wall-clock time that instant reads
  // as. The delta between the naive input and the zoned reading gives us the
  // zone's current offset (handles CST -06:00 / CDT -05:00 automatically).
  const naiveUtcGuess = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
  const zoned = getZonedParts(naiveUtcGuess, SESSION_TIME_ZONE);
  const zonedAsUtcMs = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second);
  const offsetMs = naiveUtcGuess.getTime() - zonedAsUtcMs;
  return new Date(naiveUtcGuess.getTime() + offsetMs);
}

/**
 * Returns the next CME futures daily session open: 5:00 PM America/Chicago,
 * strictly after `now`. Futures are closed Friday 4:00 PM CT through Sunday
 * 5:00 PM CT, so if the next calendar 17:00 CT candidate lands on a Saturday
 * it is rolled forward to Sunday 17:00 CT.
 *
 * Mirrors the desktop agent's `NextSessionOpenUtc` reset boundary in
 * RiskEnforcer.cs — keep both in sync if that logic changes.
 */
export function nextSessionOpen(now: Date = new Date()): Date {
  const zoned = getZonedParts(now, SESSION_TIME_ZONE);

  // Start with today's 17:00 CT candidate, then advance by whole days until
  // it's strictly after `now` and not a Saturday.
  let candidateDay = { year: zoned.year, month: zoned.month, day: zoned.day };
  let candidateUtc = chicagoWallClockToUtc(candidateDay.year, candidateDay.month, candidateDay.day, SESSION_OPEN_HOUR_CT);

  const advanceOneDay = () => {
    // Advance the calendar day using a UTC-noon anchor (avoids DST edge
    // cases at midnight) then re-read the zoned Y/M/D.
    const anchor = new Date(Date.UTC(candidateDay.year, candidateDay.month - 1, candidateDay.day, 12, 0, 0));
    anchor.setUTCDate(anchor.getUTCDate() + 1);
    const nextParts = getZonedParts(anchor, SESSION_TIME_ZONE);
    candidateDay = { year: nextParts.year, month: nextParts.month, day: nextParts.day };
    candidateUtc = chicagoWallClockToUtc(candidateDay.year, candidateDay.month, candidateDay.day, SESSION_OPEN_HOUR_CT);
  };

  // Roll forward while the candidate is not strictly after `now`.
  while (candidateUtc.getTime() <= now.getTime()) {
    advanceOneDay();
  }

  // Futures are closed Fri 16:00 CT -> Sun 17:00 CT: a Saturday 17:00 CT
  // candidate is never a real session open, so roll it to Sunday.
  const candidateWeekday = getZonedParts(candidateUtc, SESSION_TIME_ZONE).weekday;
  if (candidateWeekday === 6 /* Saturday */) {
    advanceOneDay();
  }

  return candidateUtc;
}

/**
 * Formats a session-open Date as a human string in CT plus the viewer's
 * local time in parentheses, e.g. "5:00 PM CT (1:00 AM your time)".
 */
export function formatSessionOpen(date: Date): string {
  const ctTime = new Intl.DateTimeFormat('en-US', {
    timeZone: SESSION_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  const localTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  return `${ctTime} CT (${localTime} your time)`;
}
