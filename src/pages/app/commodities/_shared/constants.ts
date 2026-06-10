// ─── Commodities domain constants ─────────────────────────────────────────────
// Display metadata only — no live-fetch symbols or API endpoints.

export const COMMODITY_SECTORS: Array<{ id: string; label: string }> = [
  { id: 'energy', label: 'Energy' },
  { id: 'metals', label: 'Metals' },
  { id: 'agriculture', label: 'Agriculture' },
  { id: 'indices', label: 'Indices' },
];

/** Display metadata for well-known commodity instruments. */
export const COMMODITY_UNITS: Record<
  string,
  { symbol: string; name: string; sector: 'energy' | 'metals' | 'agriculture' | 'indices'; unit: string }
> = {
  WTI: {
    symbol: 'WTI',
    name: 'WTI Crude Oil',
    sector: 'energy',
    unit: '$/bbl',
  },
  BRENT: {
    symbol: 'BRENT',
    name: 'Brent Crude Oil',
    sector: 'energy',
    unit: '$/bbl',
  },
  NG: {
    symbol: 'NG',
    name: 'Natural Gas',
    sector: 'energy',
    unit: '$/MMBtu',
  },
  GC: {
    symbol: 'GC',
    name: 'Gold',
    sector: 'metals',
    unit: '$/oz',
  },
  SI: {
    symbol: 'SI',
    name: 'Silver',
    sector: 'metals',
    unit: '$/oz',
  },
  HG: {
    symbol: 'HG',
    name: 'Copper',
    sector: 'metals',
    unit: '$/lb',
  },
  ZC: {
    symbol: 'ZC',
    name: 'Corn',
    sector: 'agriculture',
    unit: '¢/bu',
  },
  ZW: {
    symbol: 'ZW',
    name: 'Wheat',
    sector: 'agriculture',
    unit: '¢/bu',
  },
  ZS: {
    symbol: 'ZS',
    name: 'Soybeans',
    sector: 'agriculture',
    unit: '¢/bu',
  },
};
