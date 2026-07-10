import { isCryptoSymbol, isForexPair } from '@/components/charting/dataSources';

// ─── Asset class presets ────────────────────────────────────────
// Each preset resolves to a source-native symbol. Yahoo handles futures
// (continuous front-month via =F suffix) and equities (bare ticker). Binance
// handles crypto. Pickers default to the most common contracts/tickers per
// class — power users can type freely.
export type AssetClass = 'futures' | 'stocks' | 'forex' | 'crypto';

// Searchable symbol universe per asset class. `ticker` is what the trader
// types/sees (e.g. "ES"); `symbol` is the source-native form passed to the
// data layer (Yahoo futures use a "=F" suffix, equities are bare, Binance
// crypto are "<BASE>USDT"). The first entry per class is the default symbol
// when the trader switches asset class. The picker also accepts free-form
// tickers not in this list (normalized per class on commit).
export interface SymbolEntry { ticker: string; label: string; symbol: string }

export const SYMBOL_UNIVERSE: Record<AssetClass, SymbolEntry[]> = {
  futures: [
    { ticker: 'MNQ', label: 'Micro E-mini Nasdaq-100', symbol: 'MNQ=F' },
    { ticker: 'MES', label: 'Micro E-mini S&P 500', symbol: 'MES=F' },
    { ticker: 'NQ', label: 'E-mini Nasdaq-100', symbol: 'NQ=F' },
    { ticker: 'ES', label: 'E-mini S&P 500', symbol: 'ES=F' },
    { ticker: 'YM', label: 'E-mini Dow', symbol: 'YM=F' },
    { ticker: 'MYM', label: 'Micro E-mini Dow', symbol: 'MYM=F' },
    { ticker: 'RTY', label: 'E-mini Russell 2000', symbol: 'RTY=F' },
    { ticker: 'M2K', label: 'Micro E-mini Russell 2000', symbol: 'M2K=F' },
    { ticker: 'GC', label: 'Gold', symbol: 'GC=F' },
    { ticker: 'MGC', label: 'Micro Gold', symbol: 'MGC=F' },
    { ticker: 'SI', label: 'Silver', symbol: 'SI=F' },
    { ticker: 'SIL', label: 'Micro Silver', symbol: 'SIL=F' },
    { ticker: 'HG', label: 'Copper', symbol: 'HG=F' },
    { ticker: 'CL', label: 'Crude Oil (WTI)', symbol: 'CL=F' },
    { ticker: 'MCL', label: 'Micro Crude Oil', symbol: 'MCL=F' },
    { ticker: 'NG', label: 'Natural Gas', symbol: 'NG=F' },
    { ticker: 'ZB', label: '30-Year T-Bond', symbol: 'ZB=F' },
    { ticker: 'ZN', label: '10-Year T-Note', symbol: 'ZN=F' },
    { ticker: 'ZC', label: 'Corn', symbol: 'ZC=F' },
    { ticker: 'ZS', label: 'Soybeans', symbol: 'ZS=F' },
    { ticker: 'ZW', label: 'Wheat', symbol: 'ZW=F' },
    { ticker: '6E', label: 'Euro FX', symbol: '6E=F' },
    { ticker: '6J', label: 'Japanese Yen', symbol: '6J=F' },
    { ticker: '6B', label: 'British Pound', symbol: '6B=F' },
  ],
  stocks: [
    { ticker: 'AAPL', label: 'Apple', symbol: 'AAPL' },
    { ticker: 'NVDA', label: 'Nvidia', symbol: 'NVDA' },
    { ticker: 'MSFT', label: 'Microsoft', symbol: 'MSFT' },
    { ticker: 'AMZN', label: 'Amazon', symbol: 'AMZN' },
    { ticker: 'GOOGL', label: 'Alphabet (Class A)', symbol: 'GOOGL' },
    { ticker: 'META', label: 'Meta Platforms', symbol: 'META' },
    { ticker: 'TSLA', label: 'Tesla', symbol: 'TSLA' },
    { ticker: 'NFLX', label: 'Netflix', symbol: 'NFLX' },
    { ticker: 'AMD', label: 'Advanced Micro Devices', symbol: 'AMD' },
    { ticker: 'JPM', label: 'JPMorgan Chase', symbol: 'JPM' },
    { ticker: 'V', label: 'Visa', symbol: 'V' },
    { ticker: 'DIS', label: 'Walt Disney', symbol: 'DIS' },
    { ticker: 'BA', label: 'Boeing', symbol: 'BA' },
    { ticker: 'XOM', label: 'Exxon Mobil', symbol: 'XOM' },
    { ticker: 'WMT', label: 'Walmart', symbol: 'WMT' },
    { ticker: 'COST', label: 'Costco', symbol: 'COST' },
    // S&P 100 mega/large caps
    { ticker: 'BRK-B', label: 'Berkshire Hathaway (Class B)', symbol: 'BRK-B' },
    { ticker: 'UNH', label: 'UnitedHealth Group', symbol: 'UNH' },
    { ticker: 'LLY', label: 'Eli Lilly', symbol: 'LLY' },
    { ticker: 'JNJ', label: 'Johnson & Johnson', symbol: 'JNJ' },
    { ticker: 'PG', label: 'Procter & Gamble', symbol: 'PG' },
    { ticker: 'HD', label: 'Home Depot', symbol: 'HD' },
    { ticker: 'MA', label: 'Mastercard', symbol: 'MA' },
    { ticker: 'ABBV', label: 'AbbVie', symbol: 'ABBV' },
    { ticker: 'MRK', label: 'Merck', symbol: 'MRK' },
    { ticker: 'AVGO', label: 'Broadcom', symbol: 'AVGO' },
    { ticker: 'PEP', label: 'PepsiCo', symbol: 'PEP' },
    { ticker: 'KO', label: 'Coca-Cola', symbol: 'KO' },
    { ticker: 'ORCL', label: 'Oracle', symbol: 'ORCL' },
    { ticker: 'CRM', label: 'Salesforce', symbol: 'CRM' },
    { ticker: 'ADBE', label: 'Adobe', symbol: 'ADBE' },
    { ticker: 'ACN', label: 'Accenture', symbol: 'ACN' },
    { ticker: 'MCD', label: "McDonald's", symbol: 'MCD' },
    { ticker: 'CSCO', label: 'Cisco Systems', symbol: 'CSCO' },
    { ticker: 'INTC', label: 'Intel', symbol: 'INTC' },
    { ticker: 'QCOM', label: 'Qualcomm', symbol: 'QCOM' },
    { ticker: 'TXN', label: 'Texas Instruments', symbol: 'TXN' },
    { ticker: 'NKE', label: 'Nike', symbol: 'NKE' },
    { ticker: 'PFE', label: 'Pfizer', symbol: 'PFE' },
    { ticker: 'TMO', label: 'Thermo Fisher Scientific', symbol: 'TMO' },
    { ticker: 'ABT', label: 'Abbott Laboratories', symbol: 'ABT' },
    { ticker: 'DHR', label: 'Danaher', symbol: 'DHR' },
    { ticker: 'LIN', label: 'Linde', symbol: 'LIN' },
    { ticker: 'UPS', label: 'United Parcel Service', symbol: 'UPS' },
    { ticker: 'PM', label: 'Philip Morris International', symbol: 'PM' },
    { ticker: 'RTX', label: 'RTX Corporation', symbol: 'RTX' },
    { ticker: 'HON', label: 'Honeywell', symbol: 'HON' },
    { ticker: 'GS', label: 'Goldman Sachs', symbol: 'GS' },
    { ticker: 'MS', label: 'Morgan Stanley', symbol: 'MS' },
    { ticker: 'BAC', label: 'Bank of America', symbol: 'BAC' },
    { ticker: 'WFC', label: 'Wells Fargo', symbol: 'WFC' },
    { ticker: 'C', label: 'Citigroup', symbol: 'C' },
    { ticker: 'AXP', label: 'American Express', symbol: 'AXP' },
    { ticker: 'CAT', label: 'Caterpillar', symbol: 'CAT' },
    { ticker: 'DE', label: 'Deere & Company', symbol: 'DE' },
    { ticker: 'GE', label: 'GE Aerospace', symbol: 'GE' },
    { ticker: 'LMT', label: 'Lockheed Martin', symbol: 'LMT' },
    { ticker: 'CVX', label: 'Chevron', symbol: 'CVX' },
    { ticker: 'COP', label: 'ConocoPhillips', symbol: 'COP' },
    { ticker: 'T', label: 'AT&T', symbol: 'T' },
    { ticker: 'VZ', label: 'Verizon Communications', symbol: 'VZ' },
    { ticker: 'CMCSA', label: 'Comcast', symbol: 'CMCSA' },
    { ticker: 'IBM', label: 'IBM', symbol: 'IBM' },
    { ticker: 'NOW', label: 'ServiceNow', symbol: 'NOW' },
    { ticker: 'INTU', label: 'Intuit', symbol: 'INTU' },
    { ticker: 'AMAT', label: 'Applied Materials', symbol: 'AMAT' },
    { ticker: 'MU', label: 'Micron Technology', symbol: 'MU' },
    { ticker: 'LRCX', label: 'Lam Research', symbol: 'LRCX' },
    { ticker: 'KLAC', label: 'KLA Corporation', symbol: 'KLAC' },
    { ticker: 'MDT', label: 'Medtronic', symbol: 'MDT' },
    { ticker: 'ISRG', label: 'Intuitive Surgical', symbol: 'ISRG' },
    { ticker: 'REGN', label: 'Regeneron Pharmaceuticals', symbol: 'REGN' },
    { ticker: 'GILD', label: 'Gilead Sciences', symbol: 'GILD' },
    { ticker: 'BMY', label: 'Bristol-Myers Squibb', symbol: 'BMY' },
    { ticker: 'AMGN', label: 'Amgen', symbol: 'AMGN' },
    { ticker: 'CI', label: 'Cigna', symbol: 'CI' },
    { ticker: 'CVS', label: 'CVS Health', symbol: 'CVS' },
    { ticker: 'LOW', label: "Lowe's", symbol: 'LOW' },
    { ticker: 'TGT', label: 'Target', symbol: 'TGT' },
    { ticker: 'SBUX', label: 'Starbucks', symbol: 'SBUX' },
    { ticker: 'BLK', label: 'BlackRock', symbol: 'BLK' },
    { ticker: 'SCHW', label: 'Charles Schwab', symbol: 'SCHW' },
    { ticker: 'AMT', label: 'American Tower', symbol: 'AMT' },
    { ticker: 'PLD', label: 'Prologis', symbol: 'PLD' },
    { ticker: 'NEE', label: 'NextEra Energy', symbol: 'NEE' },
    { ticker: 'DUK', label: 'Duke Energy', symbol: 'DUK' },
    { ticker: 'SO', label: 'Southern Company', symbol: 'SO' },
    // Leading ETFs
    { ticker: 'SPY', label: 'SPDR S&P 500 ETF', symbol: 'SPY' },
    { ticker: 'QQQ', label: 'Invesco QQQ (Nasdaq-100)', symbol: 'QQQ' },
    { ticker: 'IWM', label: 'iShares Russell 2000 ETF', symbol: 'IWM' },
    { ticker: 'DIA', label: 'SPDR Dow Jones Industrial ETF', symbol: 'DIA' },
    { ticker: 'VTI', label: 'Vanguard Total Stock Market ETF', symbol: 'VTI' },
    { ticker: 'VOO', label: 'Vanguard S&P 500 ETF', symbol: 'VOO' },
    { ticker: 'XLF', label: 'Financial Select Sector SPDR', symbol: 'XLF' },
    { ticker: 'XLE', label: 'Energy Select Sector SPDR', symbol: 'XLE' },
    { ticker: 'XLK', label: 'Technology Select Sector SPDR', symbol: 'XLK' },
    { ticker: 'SMH', label: 'VanEck Semiconductor ETF', symbol: 'SMH' },
    { ticker: 'ARKK', label: 'ARK Innovation ETF', symbol: 'ARKK' },
    { ticker: 'GLD', label: 'SPDR Gold Shares ETF', symbol: 'GLD' },
    { ticker: 'TLT', label: 'iShares 20+ Year Treasury Bond ETF', symbol: 'TLT' },
    // Indices
    { ticker: 'SPX', label: 'S&P 500 Index', symbol: '^GSPC' },
    { ticker: 'NDX', label: 'Nasdaq-100 Index', symbol: '^NDX' },
    { ticker: 'VIX', label: 'CBOE Volatility Index', symbol: '^VIX' },
  ],
  forex: [
    // Majors
    { ticker: 'EURUSD', label: 'EUR/USD', symbol: 'EURUSD=X' },
    { ticker: 'GBPUSD', label: 'GBP/USD', symbol: 'GBPUSD=X' },
    { ticker: 'USDJPY', label: 'USD/JPY', symbol: 'USDJPY=X' },
    { ticker: 'AUDUSD', label: 'AUD/USD', symbol: 'AUDUSD=X' },
    { ticker: 'USDCAD', label: 'USD/CAD', symbol: 'USDCAD=X' },
    { ticker: 'USDCHF', label: 'USD/CHF', symbol: 'USDCHF=X' },
    { ticker: 'NZDUSD', label: 'NZD/USD', symbol: 'NZDUSD=X' },
    // Crosses
    { ticker: 'EURGBP', label: 'EUR/GBP', symbol: 'EURGBP=X' },
    { ticker: 'EURJPY', label: 'EUR/JPY', symbol: 'EURJPY=X' },
    { ticker: 'GBPJPY', label: 'GBP/JPY', symbol: 'GBPJPY=X' },
    { ticker: 'EURCHF', label: 'EUR/CHF', symbol: 'EURCHF=X' },
    { ticker: 'EURAUD', label: 'EUR/AUD', symbol: 'EURAUD=X' },
    { ticker: 'EURCAD', label: 'EUR/CAD', symbol: 'EURCAD=X' },
    { ticker: 'AUDJPY', label: 'AUD/JPY', symbol: 'AUDJPY=X' },
    { ticker: 'GBPCHF', label: 'GBP/CHF', symbol: 'GBPCHF=X' },
    { ticker: 'CADJPY', label: 'CAD/JPY', symbol: 'CADJPY=X' },
    { ticker: 'CHFJPY', label: 'CHF/JPY', symbol: 'CHFJPY=X' },
    { ticker: 'AUDNZD', label: 'AUD/NZD', symbol: 'AUDNZD=X' },
    { ticker: 'NZDJPY', label: 'NZD/JPY', symbol: 'NZDJPY=X' },
    { ticker: 'GBPAUD', label: 'GBP/AUD', symbol: 'GBPAUD=X' },
    { ticker: 'AUDCAD', label: 'AUD/CAD', symbol: 'AUDCAD=X' },
  ],
  crypto: [
    { ticker: 'BTC', label: 'Bitcoin', symbol: 'BTCUSDT' },
    { ticker: 'ETH', label: 'Ethereum', symbol: 'ETHUSDT' },
    { ticker: 'SOL', label: 'Solana', symbol: 'SOLUSDT' },
    { ticker: 'BNB', label: 'BNB', symbol: 'BNBUSDT' },
    { ticker: 'XRP', label: 'XRP', symbol: 'XRPUSDT' },
    { ticker: 'ADA', label: 'Cardano', symbol: 'ADAUSDT' },
    { ticker: 'DOGE', label: 'Dogecoin', symbol: 'DOGEUSDT' },
    { ticker: 'AVAX', label: 'Avalanche', symbol: 'AVAXUSDT' },
    { ticker: 'LINK', label: 'Chainlink', symbol: 'LINKUSDT' },
    { ticker: 'DOT', label: 'Polkadot', symbol: 'DOTUSDT' },
    { ticker: 'MATIC', label: 'Polygon', symbol: 'MATICUSDT' },
    { ticker: 'LTC', label: 'Litecoin', symbol: 'LTCUSDT' },
    { ticker: 'TRX', label: 'TRON', symbol: 'TRXUSDT' },
    { ticker: 'BCH', label: 'Bitcoin Cash', symbol: 'BCHUSDT' },
    { ticker: 'NEAR', label: 'NEAR Protocol', symbol: 'NEARUSDT' },
    { ticker: 'APT', label: 'Aptos', symbol: 'APTUSDT' },
    { ticker: 'ARB', label: 'Arbitrum', symbol: 'ARBUSDT' },
    { ticker: 'OP', label: 'Optimism', symbol: 'OPUSDT' },
    { ticker: 'FIL', label: 'Filecoin', symbol: 'FILUSDT' },
    { ticker: 'ICP', label: 'Internet Computer', symbol: 'ICPUSDT' },
  ],
};

// Combined searchable universe across all asset classes, each tagged with its class.
export const ALL_SYMBOLS: (SymbolEntry & { assetClass: AssetClass })[] = (
  Object.entries(SYMBOL_UNIVERSE) as [AssetClass, SymbolEntry[]][]
).flatMap(([ac, entries]) => entries.map((e) => ({ ...e, assetClass: ac })));

// Detect the asset class implied by a source-native symbol.
export function detectAssetClass(sym: string): AssetClass {
  if (isCryptoSymbol(sym)) return 'crypto';
  if (sym.endsWith('=F')) return 'futures';
  if (sym.endsWith('=X')) return 'forex';
  return 'stocks';
}

// Normalize a free-typed ticker to a source-native symbol given an explicit
// asset class. Returns the class-appropriate native form (e.g. adds =X for
// forex pairs that don't already carry the suffix).
export function normalizeRawSymbol(raw: string, assetClass: AssetClass): string {
  const t = raw.trim().toUpperCase();
  if (!t) return t;
  if (assetClass === 'forex') {
    // Only a bare forex pair gets the Yahoo "=X" suffix. NEVER append it to a
    // symbol that already carries another class's native marker (=F futures,
    // ^ index, <BASE>USDT crypto) or an existing =X. A cross-class commit —
    // e.g. typing "NQ" (resolved to NQ=F) while the Forex tab is active — must
    // not become the unresolvable "NQ=F=X".
    const alreadyNative =
      t.endsWith('=X') || t.endsWith('=F') || t.startsWith('^') || isCryptoSymbol(t);
    return alreadyNative ? t : `${t}=X`;
  }
  return t;
}

// Repair a malformed source-native symbol. A cross-class commit could
// historically double-suffix a symbol (e.g. "NQ=F=X", "AAPL=X", "BTCUSDT=X") —
// a stray forex "=X" stacked on a non-forex base. Genuine forex pairs are two
// fiat ISO-4217 codes; any other symbol carrying "=X" gets the stray suffix
// stripped so it resolves again and legacy persisted sessions self-heal.
export function sanitizeSourceSymbol(sym: string): string {
  const t = (sym ?? '').trim();
  if (!t) return t;
  if (/=X$/i.test(t) && !isForexPair(t)) return t.replace(/=X$/i, '');
  return t;
}

// Normalize a free-typed ticker to a source-native symbol WITHOUT an explicit
// class. Exact-match the combined universe first (covers futures roots like ES,
// indices like SPX->^GSPC, crypto bases like BTC->BTCUSDT); otherwise infer
// from the raw shape (=F => futures, crypto pair => crypto, =X => forex, else
// bare equity).
export function normalizeSymbolAuto(raw: string): string {
  const t = raw.trim().toUpperCase();
  if (!t) return t;
  const hit = ALL_SYMBOLS.find((u) => u.ticker.toUpperCase() === t);
  if (hit) return hit.symbol;
  // For raw strings not in the universe, infer class from shape so that
  // e.g. a manually-typed "EURUSD" without a universe entry stays as-is
  // (forex detection relies on =X suffix already present or a universe hit).
  return t;
}
