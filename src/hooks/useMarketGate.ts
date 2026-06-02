// src/hooks/useMarketGate.ts
// Returns { gated, isAdmin }:
//   gated = true only when the license flag is false AND the user is NOT admin.
//   Admin users always see the real content (with an AdminGateBadge overlay).

import { MARKET_DATA_LICENSED, FINNHUB_LICENSED } from '@/constants/nav';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export interface MarketGateResult {
  /** True when content should be hidden (public view, unlicensed). False for admin or licensed. */
  gated: boolean;
  /** True when the current user has admin access. */
  isAdmin: boolean;
}

/** Gate for raw Polygon price/quote/chart widgets. */
export function useMarketGate(): MarketGateResult {
  const { isAdmin } = useAdminAuth();
  return {
    isAdmin,
    gated: !MARKET_DATA_LICENSED && !isAdmin,
  };
}

export interface FinnhubGateResult {
  gated: boolean;
  isAdmin: boolean;
}

/** Gate for Finnhub-sourced widgets (EarningsToday, MacroNews). */
export function useFinnhubGate(): FinnhubGateResult {
  const { isAdmin } = useAdminAuth();
  return {
    isAdmin,
    gated: !FINNHUB_LICENSED && !isAdmin,
  };
}
