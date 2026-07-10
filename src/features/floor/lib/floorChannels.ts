// src/features/floor/lib/floorChannels.ts
// Reddit-style CHANNELS model for The Floor community feed.
//
// A "channel" == a strategy category. Global (the merged r/all view) has no
// filter — it maps to strategy_category = GENERAL_CATEGORY server-side when a
// trade is shared without picking a specific channel. This module derives
// channel metadata (icon + blurb) from the shared STRATEGY_CATEGORIES vocabulary
// WITHOUT modifying it — that list stays the single source of truth for the
// Strategies editor.

import { STRATEGY_CATEGORIES, type StrategyCategory } from '@/lib/strategyCategories';
import type { LucideIcon } from 'lucide-react';
import {
  Globe,
  CandlestickChart,
  Layers,
  Crosshair,
  Activity,
  Waves,
  ArrowLeftRight,
  TrendingUp,
  Zap,
} from 'lucide-react';

/** A Floor channel. `key` is the strategy_category value stored server-side. */
export interface FloorChannel {
  key: string; // strategy_category value, e.g. 'ICT'
  label: string; // display name
  Icon: LucideIcon;
  blurb: string; // one short line, English
}

/** Sentinel strategy_category value for a trade shared to Global (no specific strategy). */
export const GENERAL_CATEGORY = 'General';

const CHANNEL_META: Record<StrategyCategory, { Icon: LucideIcon; blurb: string }> = {
  'Price Action': {
    Icon: CandlestickChart,
    blurb: 'Raw candles, no indicators — read the chart itself.',
  },
  'Supply & Demand': {
    Icon: Layers,
    blurb: 'Zone-based entries where price has reacted before.',
  },
  ICT: {
    Icon: Crosshair,
    blurb: 'Liquidity, FVGs, and smart-money concepts.',
  },
  Indicators: {
    Icon: Activity,
    blurb: 'Signal-driven setups built on indicator confluence.',
  },
  Wyckoff: {
    Icon: Waves,
    blurb: 'Accumulation, distribution, and market-cycle structure.',
  },
  'Order Flow': {
    Icon: ArrowLeftRight,
    blurb: 'Tape reading, DOM, and volume-at-price execution.',
  },
  'Trend Following': {
    Icon: TrendingUp,
    blurb: 'Riding established directional moves.',
  },
  Breakout: {
    Icon: Zap,
    blurb: 'Trades triggered on range or level breaks.',
  },
};

// One channel per existing strategy category, in the SAME order as STRATEGY_CATEGORIES.
export const FLOOR_CHANNELS: FloorChannel[] = STRATEGY_CATEGORIES.map((category) => ({
  key: category,
  label: category,
  Icon: CHANNEL_META[category].Icon,
  blurb: CHANNEL_META[category].blurb,
}));

/** The Global (r/all) pseudo-channel used for the nav bar. key=null => no feed filter. */
export const GLOBAL_CHANNEL = {
  key: null,
  label: 'Global',
  Icon: Globe,
  blurb: 'Every shared trade across the community.',
} as const;

/**
 * Resolves a strategy_category value to its channel metadata.
 * Returns GLOBAL_CHANNEL for null/GENERAL_CATEGORY and the matching
 * FLOOR_CHANNEL otherwise (fallback to GLOBAL_CHANNEL if unrecognized).
 */
export function getChannelByKey(
  key: string | null,
): { label: string; Icon: LucideIcon; blurb: string } {
  if (key == null || key === GENERAL_CATEGORY) return GLOBAL_CHANNEL;
  return FLOOR_CHANNELS.find((c) => c.key === key) ?? GLOBAL_CHANNEL;
}
