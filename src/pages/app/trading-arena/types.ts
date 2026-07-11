/**
 * Trading Arena — shared types
 */

/** Active tab identifiers for the Trading Arena. */
export type TabId = 'chart' | 'order-flow' | 'liquidity';

export interface TradingArenaTab {
  id: TabId;
  label: string;
  locked: boolean;
}

export const TRADING_ARENA_TABS: TradingArenaTab[] = [
  { id: 'chart',      label: 'Chart',      locked: false },
  { id: 'order-flow', label: 'Order Flow', locked: false },
  { id: 'liquidity',  label: 'Liquidity',  locked: false },
];

/**
 * Maps the :section URL param to a TabId, defaulting to 'chart'.
 *
 * Legacy/removed section slugs are redirected rather than 404ing:
 *   - 'orderflow' (no dash) / 'footprint' (the tab's former slug, before the
 *     2026-07 rename) → 'order-flow', the dedicated footprint chart tab.
 *   - 'tape' / 'cvd' / 'options' / 'futures' / 'forex' (all removed from the
 *     tab bar) → 'chart', the safe default.
 */
export function toTabId(raw: string | undefined): TabId {
  const valid: TabId[] = ['chart', 'order-flow', 'liquidity'];
  if (raw && (valid as string[]).includes(raw)) return raw as TabId;
  if (raw === 'orderflow' || raw === 'footprint') return 'order-flow';
  return 'chart';
}

// The old fixed ARENA_INTERVALS list (1m/5m/15m/1h/4h/1d) has been replaced
// by the arbitrary-timeframe model in ./utils/intervals.ts (ArenaInterval,
// ARENA_TIMEFRAME_GROUPS, DEFAULT_FAVORITE_INTERVALS) — see TimeframeMenu.tsx.
