// src/lib/macroCalendar.ts
// Static macro event data used by MetricChart overlays.
// No API calls — pure constants + pure helper functions.

// NBER-defined US recession date ranges (since 2000)
// Source: https://www.nber.org/research/business-cycle-dating
export const NBER_RECESSIONS: { start: string; end: string; label: string }[] = [
  { start: '2001-03-01', end: '2001-11-30', label: 'Dot-com' },
  { start: '2007-12-01', end: '2009-06-30', label: 'Great Recession' },
  { start: '2020-02-01', end: '2020-04-30', label: 'COVID' },
];

// FOMC meeting dates (last day of each 2-day meeting = decision date).
// Source: https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
// Extend each January with the new calendar year.
export const FOMC_MEETINGS: { date: string; label: string }[] = [
  // 2024
  { date: '2024-01-31', label: 'Jan 2024' },
  { date: '2024-03-20', label: 'Mar 2024' },
  { date: '2024-05-01', label: 'May 2024' },
  { date: '2024-06-12', label: 'Jun 2024' },
  { date: '2024-07-31', label: 'Jul 2024' },
  { date: '2024-09-18', label: 'Sep 2024' },
  { date: '2024-11-07', label: 'Nov 2024' },
  { date: '2024-12-18', label: 'Dec 2024' },
  // 2025
  { date: '2025-01-29', label: 'Jan 2025' },
  { date: '2025-03-19', label: 'Mar 2025' },
  { date: '2025-05-07', label: 'May 2025' },
  { date: '2025-06-18', label: 'Jun 2025' },
  { date: '2025-07-30', label: 'Jul 2025' },
  { date: '2025-09-17', label: 'Sep 2025' },
  { date: '2025-10-29', label: 'Oct 2025' },
  { date: '2025-12-10', label: 'Dec 2025' },
  // 2026
  { date: '2026-01-28', label: 'Jan 2026' },
  { date: '2026-03-18', label: 'Mar 2026' },
  { date: '2026-04-29', label: 'Apr 2026' },
];

// Returns recession ranges that overlap the given visible window.
export function nberInRange(
  fromDate: string,
  toDate: string,
): typeof NBER_RECESSIONS {
  return NBER_RECESSIONS.filter((r) => r.end >= fromDate && r.start <= toDate);
}

// Returns FOMC meeting dates that fall inside the given visible window.
export function fomcInRange(
  fromDate: string,
  toDate: string,
): typeof FOMC_MEETINGS {
  return FOMC_MEETINGS.filter((m) => m.date >= fromDate && m.date <= toDate);
}
