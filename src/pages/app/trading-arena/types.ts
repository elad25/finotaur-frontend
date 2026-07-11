/**
 * Trading Arena — shared types
 */

import type { Interval } from '@/components/charting/types';

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

/** Intervals shown in the Trading Arena interval selector. */
export const ARENA_INTERVALS: { value: Interval; label: string }[] = [
  { value: '1m',  label: '1m' },
  { value: '5m',  label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h',  label: '1h' },
  { value: '4h',  label: '4h' },
  { value: '1d',  label: '1d' },
];
