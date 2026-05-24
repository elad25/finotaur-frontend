// =====================================================
// 📊 SECTOR ANALYZER — UI METADATA
// src/components/SectorAnalyzer/data.ts
// =====================================================
// Static UI-only overlay (icon + description + companies count).
// All financial data (price, change, holdings, etc.) lives in Supabase
// table `sector_snapshots` and is fetched via `useAllSectorAnalysis`.
// =====================================================

import type { BreakoutCandidate } from './types';

export interface SectorMetadata {
  icon: string;
  description: string;
  companies: number;
}

/**
 * Keyed by `sector_snapshots.id` (the canonical ID returned by
 * `sectorNameToId` in `useSectorAnalysis.ts`).
 */
export const sectorMetadata: Record<string, SectorMetadata> = {
  technology:       { icon: 'Cpu',        description: 'Software, Hardware, Semiconductors', companies: 68 },
  healthcare:       { icon: 'Heart',      description: 'Pharma, Biotech, Medical Devices',   companies: 64 },
  financials:       { icon: 'Banknote',   description: 'Banks, Insurance, Capital Markets',  companies: 72 },
  energy:           { icon: 'Fuel',       description: 'Oil & Gas, Equipment, Services',     companies: 23 },
  consumer_disc:    { icon: 'ShoppingBag',description: 'Retail, Auto, Entertainment',        companies: 52 },
  industrials:      { icon: 'Factory',    description: 'Aerospace, Defense, Machinery',      companies: 78 },
  materials:        { icon: 'Gem',        description: 'Chemicals, Metals, Mining',          companies: 28 },
  utilities:        { icon: 'Lightbulb',  description: 'Electric, Gas, Water Utilities',     companies: 31 },
  real_estate:      { icon: 'Building2',  description: 'REITs, Property Management',         companies: 31 },
  consumer_staples: { icon: 'Wheat',      description: 'Food, Beverage, Household',          companies: 38 },
  communication:    { icon: 'Globe',      description: 'Media, Telecom, Entertainment',      companies: 24 },
};

/**
 * Used by the snapshot→Sector adapter when a sector_snapshots row is
 * missing the `breakout_candidate` JSONB column. The `Sector` type
 * requires this field non-optional, so we provide a neutral default.
 */
export const defaultBreakoutCandidate: BreakoutCandidate = {
  ticker: '',
  name: '',
  score: 0,
  correlation: 0,
  reasons: [],
  entry: '',
  target: '',
  stop: '',
  riskReward: '',
};
