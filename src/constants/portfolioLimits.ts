// src/constants/portfolioLimits.ts
// ═══════════════════════════════════════════════════════════════
// Plan-tier caps for multi-portfolio support.
// ═══════════════════════════════════════════════════════════════

export interface PortfolioPlanLimits {
  maxPortfolios: number;
  maxTickersPerPortfolio: number;
}

export const PORTFOLIO_LIMITS: Record<string, PortfolioPlanLimits> = {
  free:     { maxPortfolios: 1, maxTickersPerPortfolio: 10 },
  pro:      { maxPortfolios: 5, maxTickersPerPortfolio: 50 },
  finotaur: { maxPortfolios: 5, maxTickersPerPortfolio: 50 },
  elite:    { maxPortfolios: 5, maxTickersPerPortfolio: 50 },
};

export function portfolioLimitsForPlan(plan: string): PortfolioPlanLimits {
  return PORTFOLIO_LIMITS[plan] ?? PORTFOLIO_LIMITS.free;
}

// Count of UNIQUE tickers in a portfolio (each symbol once, across all accounts).
export function countUniqueTickers(
  p: { accounts: { positions: { ticker: string; quantity: number }[] }[] },
): number {
  const set = new Set<string>();
  for (const acc of p.accounts) {
    for (const lot of acc.positions) {
      const t = lot.ticker.trim().toUpperCase();
      if (t && lot.quantity > 0) set.add(t);
    }
  }
  return set.size;
}
