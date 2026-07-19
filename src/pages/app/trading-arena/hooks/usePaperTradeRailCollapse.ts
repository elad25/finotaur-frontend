/**
 * usePaperTradeRailCollapse — shared collapsed/expanded state for the
 * Trading Arena's right-side PaperTradeRail panel.
 *
 * Every tab that mounts the rail (Chart / Order Flow / Liquidity / DOM) uses
 * this SAME hook via PaperTradeRailShell.tsx, so collapsing the rail on one
 * tab stays collapsed after switching to another. Persisted to localStorage
 * under 'finotaur:arena:tradeRail:v1' (same lazy-init / write-through
 * pattern as useChartStylePreferences.ts / useArenaIndicatorPreferences.ts).
 *
 * Global (not per-symbol) — this is a layout preference, not a trading
 * setting, so unlike useDomPreferences/useLiquidityPreferences it does not
 * key by symbol.
 */

import { useCallback, useState } from 'react';

export const PAPER_TRADE_RAIL_COLLAPSE_STORAGE_KEY = 'finotaur:arena:tradeRail:v1';

function readStoredCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PAPER_TRADE_RAIL_COLLAPSE_STORAGE_KEY) === 'true';
  } catch {
    // Corrupt/blocked storage — fall back to expanded (the pre-existing default).
    return false;
  }
}

function writeStoredCollapsed(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PAPER_TRADE_RAIL_COLLAPSE_STORAGE_KEY, String(value));
  } catch {
    // Storage full / blocked — non-fatal, collapse state just won't persist.
  }
}

export interface UsePaperTradeRailCollapseResult {
  collapsed: boolean;
  toggle: () => void;
}

export function usePaperTradeRailCollapse(): UsePaperTradeRailCollapseResult {
  const [collapsed, setCollapsed] = useState<boolean>(readStoredCollapsed);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writeStoredCollapsed(next);
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
