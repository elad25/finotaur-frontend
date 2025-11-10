export type MarketKey = 'stocks' | 'indices' | 'crypto' | 'futures' | 'forex' | 'commodities';

export function pathForHeatmap(m: MarketKey) {
  return `/app/all-markets/heatmap?m=${m}`;
}
