export type CalendarQuery = { from?: string; to?: string; country?: string };
export async function listEvents(q: CalendarQuery) {
  // Placeholder provider: return mock data for now
  return [
    { date: q.from || '2025-01-01', title: 'CPI Release', country: q.country || 'US', impact: 'high' },
    { date: q.to || '2025-01-15', title: 'FOMC Minutes', country: q.country || 'US', impact: 'medium' },
  ];
}
