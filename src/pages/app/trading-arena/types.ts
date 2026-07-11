/**
 * Trading Arena — shared types
 */

/** Active tab identifiers for the Trading Arena. */
export type TabId = 'chart' | 'footprint' | 'liquidity';

export interface TradingArenaTab {
  id: TabId;
  label: string;
  locked: boolean;
}

export const TRADING_ARENA_TABS: TradingArenaTab[] = [
  { id: 'chart',      label: 'Chart',     locked: false },
  { id: 'footprint',  label: 'Footprint', locked: false },
  { id: 'liquidity',  label: 'Liquidity', locked: false },
];

/**
 * Maps the :section URL param to a TabId, defaulting to 'chart'.
 *
 * Legacy/removed section slugs are redirected rather than 404ing:
 *   - 'order-flow' / 'orderflow' (the old Bookmap-style tab) → 'liquidity',
 *     the tab that now owns that Bookmap-style liquidity view.
 *   - 'tape' / 'cvd' / 'options' / 'futures' / 'forex' (all removed from the
 *     tab bar) → 'chart', the safe default.
 */
export function toTabId(raw: string | undefined): TabId {
  const valid: TabId[] = ['chart', 'footprint', 'liquidity'];
  if (raw && (valid as string[]).includes(raw)) return raw as TabId;
  if (raw === 'order-flow' || raw === 'orderflow') return 'liquidity';
  return 'chart';
}

// The old fixed ARENA_INTERVALS list (1m/5m/15m/1h/4h/1d) has been replaced
// by the arbitrary-timeframe model in ./utils/intervals.ts (ArenaInterval,
// ARENA_TIMEFRAME_GROUPS, DEFAULT_FAVORITE_INTERVALS) — see TimeframeMenu.tsx.
