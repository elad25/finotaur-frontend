export type InstrumentRef = {
  assetClass: "Stocks"|"Futures"|"Crypto"|"FX"|"Options";
  tickSize?: number;
  tickValue?: number;
  multiplier?: number;
  decimals?: number;
};

export const INSTRUMENTS: Record<string, InstrumentRef> = {
  "NQ": { assetClass: "Futures", tickSize: 0.25, tickValue: 5, multiplier: 20 },
  "ES": { assetClass: "Futures", tickSize: 0.25, tickValue: 12.5, multiplier: 50 },
  "AAPL": { assetClass: "Stocks", decimals: 2, multiplier: 1 },
  "MSFT": { assetClass: "Stocks", decimals: 2, multiplier: 1 },
  "BTCUSDT": { assetClass: "Crypto", decimals: 2, multiplier: 1 },
};
