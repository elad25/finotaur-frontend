// src/lib/strategyCategories.ts
// Single source of truth for the strategy-category vocabulary.
// Used by the Strategies editor and by every share-to-global flow (a category
// is REQUIRED when publishing a trade to the community feed).

export const STRATEGY_CATEGORIES = [
  'Price Action',
  'Supply & Demand',
  'ICT',
  'Indicators',
  'Wyckoff',
  'Order Flow',
  'Trend Following',
  'Breakout',
] as const;

export type StrategyCategory = (typeof STRATEGY_CATEGORIES)[number];
