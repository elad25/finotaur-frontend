// src/lib/marketDataEntitlement.ts
// =====================================================
// 🔒 MARKET DATA ENTITLEMENT — single source of truth for "is this user
// allowed to use a live/delayed market-data feed in the Trading Arena?"
// =====================================================
// Extracted from MarketDataGate.tsx (the route-level gate for
// /app/trading-arena/connect-data) so the SAME rule can be reused by
// non-route call sites — e.g. FootprintTab.tsx's futures Session Review
// mode, which needs the boolean without rendering a full-page gate.
//
// Rule (unchanged from MarketDataGate.tsx): allowed when the user has
// EITHER a paid Journal subscription OR a paid, active platform-only plan
// — Market Data is a platform-tier capability, not a Journal-tier one, so
// either paid surface should unlock it.
// =====================================================

import { useSubscription } from '@/hooks/useSubscription';

export interface MarketDataEntitlement {
  entitled: boolean;
  isLoading: boolean;
}

export function useMarketDataEntitled(): MarketDataEntitlement {
  const { isFreeJournal, isPlatformPaid, isPlatformActive, isLoading } = useSubscription();

  const hasPaidJournal = !isFreeJournal;
  const hasPaidPlatformPlan = isPlatformPaid && isPlatformActive;

  return {
    entitled: hasPaidJournal || hasPaidPlatformPlan,
    isLoading,
  };
}
