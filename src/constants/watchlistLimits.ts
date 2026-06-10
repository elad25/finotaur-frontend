// FREE-tier watch list cap is 20 tickers total (both groups). Paid = unlimited.
export const WATCHLIST_LIMITS: Record<string, number> = {
  free: 20,
  pro: Infinity,
  finotaur: Infinity,
  elite: Infinity,
};
export function watchlistLimitForPlan(plan: string): number {
  return WATCHLIST_LIMITS[plan] ?? 20;
}
