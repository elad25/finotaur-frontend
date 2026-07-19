/**
 * useDerivatives — React binding for binanceDerivs.ts's `subscribeDerivatives`.
 *
 * Thin wrapper: owns no timers/WS itself (all of that lives in
 * subscribeDerivatives's returned cleanup, same pattern useOrderFlow.ts
 * follows around BinanceTradeSource). Re-subscribes on symbol change and
 * resets to INITIAL_DERIVATIVES_STATE first, so a symbol switch never shows
 * stale numbers from the previous symbol while the new one connects.
 */

import { useEffect, useState } from 'react';
import { subscribeDerivatives, INITIAL_DERIVATIVES_STATE, type DerivativesState } from './binanceDerivs';

export function useDerivatives(symbol: string): DerivativesState {
  const [state, setState] = useState<DerivativesState>(INITIAL_DERIVATIVES_STATE);

  useEffect(() => {
    setState(INITIAL_DERIVATIVES_STATE);
    const unsubscribe = subscribeDerivatives(symbol, setState);
    return unsubscribe;
  }, [symbol]);

  return state;
}
