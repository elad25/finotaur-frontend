// src/lib/symbolCategories.ts
// Minimal ETF classification helper for the omnibox.
// The backend hardcodes assetType:'stock' for every symbol;
// this set lets us re-classify known ETFs client-side.

export const ETF_SYMBOLS: Set<string> = new Set([
  // Broad market
  'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'IVV', 'ITOT', 'SCHB', 'SCHX',
  // Growth / value / factor
  'VUG', 'VTV', 'VIG', 'VYM', 'SCHD', 'SCHG', 'VOOG', 'SPYG', 'SPYV', 'RSP',
  'QQQM', 'IWF', 'IWD', 'IWB', 'IWN', 'IWO', 'MGK', 'QUAL', 'MTUM', 'USMV', 'VLUE',
  // Mid / small cap
  'IJH', 'IJR', 'MDY', 'VV',
  // International
  'EFA', 'EEM', 'IEMG', 'IEFA', 'VEA', 'VWO', 'VXUS', 'ACWI', 'URTH',
  'FXI', 'MCHI', 'EWZ', 'EWJ', 'EWG', 'EWU', 'INDA', 'VPL', 'VGK',
  // Sectors
  'XLF', 'XLE', 'XLK', 'XLV', 'XLI', 'XLY', 'XLP', 'XLU', 'XLB', 'XLC', 'XLRE',
  // Tech / semis / innovation
  'SMH', 'SOXX', 'VGT', 'IYW', 'IGV', 'ARKK', 'ARKG', 'ARKW', 'ARKF', 'ARKQ',
  'BOTZ', 'ICLN', 'TAN', 'LIT', 'DRIV', 'FINX', 'HACK', 'SKYY', 'CLOU', 'WCLD',
  // Healthcare / biotech
  'XBI', 'IBB',
  // Energy / commodities
  'XOP', 'XME', 'GLD', 'SLV', 'IAU', 'USO', 'UNG', 'DBC', 'DBA', 'PDBC',
  'GDX', 'GDXJ',
  // Bonds / fixed income
  'TLT', 'BND', 'AGG', 'LQD', 'HYG', 'IEF', 'SHY', 'GOVT', 'BIL', 'SGOV',
  'BNDX', 'TIP', 'VTEB', 'MUB', 'SCHP', 'EMB',
  // Real estate
  'VNQ', 'FREL', 'SCHH', 'REET',
  // Retail / homebuilders / misc
  'XRT', 'XHB', 'ITB', 'KIE', 'IAK', 'VFH', 'KRE', 'KBE',
  // Dividend / income
  'SDY', 'DGRO', 'NOBL', 'HDV', 'DVY',
  // Leveraged / inverse (widely referenced, not advice)
  'TQQQ', 'SQQQ', 'SPXL', 'SPXS', 'UPRO', 'SOXL', 'SOXS', 'TNA',
  // Volatility
  'UVXY', 'VIXY', 'SVXY',
  // Income / covered-call
  'JEPI', 'JEPQ',
  // Thematic
  'MJ', 'JETS',
  // Crypto ETFs
  'FBTC', 'IBIT', 'GBTC', 'ETHE',
  // Misc popular
  'VMOT', 'SMOT',
]);

/** Returns 'etf' if the symbol is a known ETF, else 'stock'. */
export function classifyEquity(symbol: string): 'stock' | 'etf' {
  return ETF_SYMBOLS.has(symbol.toUpperCase()) ? 'etf' : 'stock';
}
