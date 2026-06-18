/**
 * Trading Arena — shared types
 */

import type { Interval } from '@/components/charting/types';

/** Active tab identifiers for the Trading Arena. */
export type TabId = 'chart' | 'order-flow' | 'tape' | 'cvd' | 'options' | 'futures' | 'forex';

export interface TradingArenaTab {
  id: TabId;
  label: string;
  locked: boolean;
}

export const TRADING_ARENA_TABS: TradingArenaTab[] = [
  { id: 'chart',      label: 'Chart',        locked: false },
  { id: 'order-flow', label: 'Order Flow',   locked: false },
  { id: 'tape',       label: 'Time & Sales', locked: false },
  { id: 'cvd',        label: 'CVD',          locked: false },
  { id: 'options',    label: 'Options',      locked: true },
  { id: 'futures',    label: 'Futures',      locked: true },
  { id: 'forex',      label: 'Forex',        locked: true },
];

/** Maps the :section URL param to a TabId, defaulting to 'chart'. */
export function toTabId(raw: string | undefined): TabId {
  const valid: TabId[] = ['chart', 'order-flow', 'tape', 'cvd', 'options', 'futures', 'forex'];
  if (raw && (valid as string[]).includes(raw)) return raw as TabId;
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
