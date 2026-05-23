// src/constants/stock-universe.ts
// =====================================================
// 📊 STOCK UNIVERSE — SPY + QQQ + IWM Holdings
// =====================================================
// Contains a curated 500-stock universe from major US equity indices.
// This is a STATIC list — loaded once, searched locally.
// No API calls needed for search/autocomplete.
//
// ❌ ETFs (SPY, QQQ, IWM, etc.) are NOT searchable
// ❌ Sector ETFs (XLF, XLK, etc.) are NOT searchable
// ❌ Index tickers (^GSPC, ^NDX, etc.) are NOT searchable
// ✅ Only individual stocks within these indices
//
// Update frequency: Quarterly (when index rebalances)
// Last updated: 2026-05-23
// =====================================================

export interface UniverseStock {
  /** Ticker symbol */
  t: string;
  /** Company name */
  n: string;
  /** Exchange: 'NASDAQ' | 'NYSE' | 'AMEX' */
  e: string;
  /** Sector */
  s: string;
  /** Indices this stock belongs to: 'S' = SPY, 'Q' = QQQ, 'R' = IWM */
  i: string;
}

// =====================================================
// BLOCKED TICKERS — ETFs, Indices, Sectors
// Users cannot search for these
// =====================================================
export const BLOCKED_TICKERS = new Set([
  // Major ETFs
  'SPY', 'QQQ', 'IWM', 'DIA', 'VOO', 'VTI', 'IVV', 'SCHB',
  // Sector ETFs
  'XLF', 'XLK', 'XLE', 'XLV', 'XLI', 'XLP', 'XLY', 'XLU', 'XLC', 'XLRE', 'XLB',
  // Leveraged ETFs
  'TQQQ', 'SQQQ', 'SPXU', 'UPRO', 'SOXL', 'SOXS', 'LABU', 'LABD',
  // Bond ETFs
  'TLT', 'IEF', 'SHY', 'AGG', 'BND', 'HYG', 'LQD', 'JNK',
  // Commodity ETFs
  'GLD', 'SLV', 'USO', 'UNG', 'GOLD',
  // International ETFs
  'EEM', 'EFA', 'VWO', 'FXI', 'INDA', 'EWZ', 'EWJ',
  // Other popular ETFs
  'ARKK', 'ARKW', 'ARKF', 'ARKG', 'ARKQ',
  'VIG', 'VYM', 'SCHD', 'DVY', 'HDV',
  'SMH', 'SOXX', 'IBB', 'XBI',
  'IWF', 'IWD', 'IWB', 'IWN', 'IWO', 'IWP', 'IWR', 'IWS',
  'VTV', 'VUG', 'VO', 'VB',
  'RSP', 'SPLG', 'SPYD', 'SPHD',
  // Indices (shouldn't appear but just in case)
  '^GSPC', '^NDX', '^RUT', '^DJI', '^VIX',
]);

// =====================================================
// THE UNIVERSE — ~1500 stocks from SPY + QQQ + IWM
// =====================================================
// Format: { t: ticker, n: name, e: exchange, s: sector, i: indices }
// i = 'S' (SPY), 'Q' (QQQ), 'R' (IWM), 'SQ' (SPY+QQQ), etc.
//
// This is a representative searchable set for Stock Analyzer.
// The full IWM has ~2000 stocks, and we include a curated liquid subset.
// =====================================================

export const STOCK_UNIVERSE: UniverseStock[] = [
  // ═══════════════════════════════════════════
  // SPY + QQQ OVERLAP (Mega/Large Cap Tech)
  // ═══════════════════════════════════════════
  { t: 'AAPL', n: 'Apple Inc.', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'MSFT', n: 'Microsoft Corporation', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'AMZN', n: 'Amazon.com Inc.', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'SQ' },
  { t: 'NVDA', n: 'NVIDIA Corporation', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'GOOGL', n: 'Alphabet Inc. Class A', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'GOOG', n: 'Alphabet Inc. Class C', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'META', n: 'Meta Platforms Inc.', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'TSLA', n: 'Tesla Inc.', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'SQ' },
  { t: 'AVGO', n: 'Broadcom Inc.', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'COST', n: 'Costco Wholesale', e: 'NASDAQ', s: 'Consumer Defensive', i: 'SQ' },
  { t: 'NFLX', n: 'Netflix Inc.', e: 'NASDAQ', s: 'Communication Services', i: 'SQ' },
  { t: 'AMD', n: 'Advanced Micro Devices', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'ADBE', n: 'Adobe Inc.', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'PEP', n: 'PepsiCo Inc.', e: 'NASDAQ', s: 'Consumer Defensive', i: 'SQ' },
  { t: 'CSCO', n: 'Cisco Systems Inc.', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'TMUS', n: 'T-Mobile US Inc.', e: 'NASDAQ', s: 'Communication Services', i: 'SQ' },
  { t: 'INTC', n: 'Intel Corporation', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'INTU', n: 'Intuit Inc.', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'CMCSA', n: 'Comcast Corporation', e: 'NASDAQ', s: 'Communication Services', i: 'SQ' },
  { t: 'TXN', n: 'Texas Instruments', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'QCOM', n: 'Qualcomm Inc.', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'AMGN', n: 'Amgen Inc.', e: 'NASDAQ', s: 'Healthcare', i: 'SQ' },
  { t: 'AMAT', n: 'Applied Materials', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'ISRG', n: 'Intuitive Surgical', e: 'NASDAQ', s: 'Healthcare', i: 'SQ' },
  { t: 'BKNG', n: 'Booking Holdings', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'SQ' },
  { t: 'HON', n: 'Honeywell International', e: 'NASDAQ', s: 'Industrials', i: 'SQ' },
  { t: 'LRCX', n: 'Lam Research', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'ADP', n: 'Automatic Data Processing', e: 'NASDAQ', s: 'Industrials', i: 'SQ' },
  { t: 'VRTX', n: 'Vertex Pharmaceuticals', e: 'NASDAQ', s: 'Healthcare', i: 'SQ' },
  { t: 'REGN', n: 'Regeneron Pharmaceuticals', e: 'NASDAQ', s: 'Healthcare', i: 'SQ' },
  { t: 'PANW', n: 'Palo Alto Networks', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'ADI', n: 'Analog Devices', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'KLAC', n: 'KLA Corporation', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'SNPS', n: 'Synopsys Inc.', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'CDNS', n: 'Cadence Design Systems', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'MDLZ', n: 'Mondelez International', e: 'NASDAQ', s: 'Consumer Defensive', i: 'SQ' },
  { t: 'SBUX', n: 'Starbucks Corporation', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'SQ' },
  { t: 'GILD', n: 'Gilead Sciences', e: 'NASDAQ', s: 'Healthcare', i: 'SQ' },
  { t: 'MRVL', n: 'Marvell Technology', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'PYPL', n: 'PayPal Holdings', e: 'NASDAQ', s: 'Financial Services', i: 'SQ' },
  { t: 'ORLY', n: "O'Reilly Automotive", e: 'NASDAQ', s: 'Consumer Cyclical', i: 'SQ' },
  { t: 'ABNB', n: 'Airbnb Inc.', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'SQ' },
  { t: 'CTAS', n: 'Cintas Corporation', e: 'NASDAQ', s: 'Industrials', i: 'SQ' },
  { t: 'FTNT', n: 'Fortinet Inc.', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'MELI', n: 'MercadoLibre Inc.', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'SQ' },
  { t: 'CEG', n: 'Constellation Energy', e: 'NASDAQ', s: 'Utilities', i: 'SQ' },
  { t: 'DASH', n: 'DoorDash Inc.', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'CRWD', n: 'CrowdStrike Holdings', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'CSX', n: 'CSX Corporation', e: 'NASDAQ', s: 'Industrials', i: 'SQ' },
  { t: 'WDAY', n: 'Workday Inc.', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'MAR', n: 'Marriott International', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'SQ' },
  { t: 'MNST', n: 'Monster Beverage', e: 'NASDAQ', s: 'Consumer Defensive', i: 'SQ' },
  { t: 'PCAR', n: 'PACCAR Inc.', e: 'NASDAQ', s: 'Industrials', i: 'SQ' },
  { t: 'ROP', n: 'Roper Technologies', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'DXCM', n: 'DexCom Inc.', e: 'NASDAQ', s: 'Healthcare', i: 'SQ' },
  { t: 'MCHP', n: 'Microchip Technology', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'NXPI', n: 'NXP Semiconductors', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'TTD', n: 'The Trade Desk', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'FAST', n: 'Fastenal Company', e: 'NASDAQ', s: 'Industrials', i: 'SQ' },
  { t: 'LULU', n: 'Lululemon Athletica', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'SQ' },
  { t: 'ODFL', n: 'Old Dominion Freight', e: 'NASDAQ', s: 'Industrials', i: 'SQ' },
  { t: 'KDP', n: 'Keurig Dr Pepper', e: 'NASDAQ', s: 'Consumer Defensive', i: 'SQ' },
  { t: 'EA', n: 'Electronic Arts', e: 'NASDAQ', s: 'Communication Services', i: 'SQ' },
  { t: 'CTSH', n: 'Cognizant Technology', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'VRSK', n: 'Verisk Analytics', e: 'NASDAQ', s: 'Industrials', i: 'SQ' },
  { t: 'GEHC', n: 'GE HealthCare Technologies', e: 'NASDAQ', s: 'Healthcare', i: 'SQ' },
  { t: 'FANG', n: 'Diamondback Energy', e: 'NASDAQ', s: 'Energy', i: 'SQ' },
  { t: 'IDXX', n: 'IDEXX Laboratories', e: 'NASDAQ', s: 'Healthcare', i: 'SQ' },
  { t: 'EXC', n: 'Exelon Corporation', e: 'NASDAQ', s: 'Utilities', i: 'SQ' },
  { t: 'TEAM', n: 'Atlassian Corporation', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'XEL', n: 'Xcel Energy', e: 'NASDAQ', s: 'Utilities', i: 'SQ' },
  { t: 'BIIB', n: 'Biogen Inc.', e: 'NASDAQ', s: 'Healthcare', i: 'SQ' },
  { t: 'ILMN', n: 'Illumina Inc.', e: 'NASDAQ', s: 'Healthcare', i: 'SQ' },
  { t: 'DDOG', n: 'Datadog Inc.', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'ZS', n: 'Zscaler Inc.', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'ANSS', n: 'ANSYS Inc.', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'ROST', n: 'Ross Stores', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'SQ' },
  { t: 'MDB', n: 'MongoDB Inc.', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'AZN', n: 'AstraZeneca PLC', e: 'NASDAQ', s: 'Healthcare', i: 'SQ' },
  { t: 'PAYX', n: 'Paychex Inc.', e: 'NASDAQ', s: 'Industrials', i: 'SQ' },
  { t: 'ON', n: 'ON Semiconductor', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'GFS', n: 'GlobalFoundries', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'CPRT', n: 'Copart Inc.', e: 'NASDAQ', s: 'Industrials', i: 'SQ' },
  { t: 'CHTR', n: 'Charter Communications', e: 'NASDAQ', s: 'Communication Services', i: 'SQ' },
  { t: 'APP', n: 'AppLovin Corporation', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'COIN', n: 'Coinbase Global', e: 'NASDAQ', s: 'Financial Services', i: 'SQ' },
  { t: 'ARM', n: 'Arm Holdings', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'PLTR', n: 'Palantir Technologies', e: 'NASDAQ', s: 'Technology', i: 'SQ' },
  { t: 'SMCI', n: 'Super Micro Computer', e: 'NASDAQ', s: 'Technology', i: 'SQ' },

  // ═══════════════════════════════════════════
  // SPY ONLY (Large Cap, mostly NYSE)
  // ═══════════════════════════════════════════
  { t: 'BRK.B', n: 'Berkshire Hathaway B', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'LLY', n: 'Eli Lilly and Company', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'JPM', n: 'JPMorgan Chase & Co.', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'V', n: 'Visa Inc.', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'UNH', n: 'UnitedHealth Group', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'XOM', n: 'Exxon Mobil Corporation', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'MA', n: 'Mastercard Inc.', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'PG', n: 'Procter & Gamble Co', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'JNJ', n: 'Johnson & Johnson', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'HD', n: 'The Home Depot', e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'ABBV', n: 'AbbVie Inc.', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'WMT', n: 'Walmart Inc.', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'MRK', n: 'Merck & Co.', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'BAC', n: 'Bank of America', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'CRM', n: 'Salesforce Inc.', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'CVX', n: 'Chevron Corporation', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'KO', n: 'Coca-Cola Company', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'ORCL', n: 'Oracle Corporation', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'WFC', n: 'Wells Fargo & Company', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'ACN', n: 'Accenture PLC', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'MCD', n: "McDonald's Corporation", e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'ABT', n: 'Abbott Laboratories', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'IBM', n: 'International Business Machines', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'PM', n: 'Philip Morris International', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'GE', n: 'General Electric', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'CAT', n: 'Caterpillar Inc.', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'DIS', n: 'The Walt Disney Company', e: 'NYSE', s: 'Communication Services', i: 'S' },
  { t: 'NOW', n: 'ServiceNow Inc.', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'GS', n: 'Goldman Sachs Group', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'TMO', n: 'Thermo Fisher Scientific', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'UBER', n: 'Uber Technologies', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'RTX', n: 'RTX Corporation', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'AXP', n: 'American Express', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'VZ', n: 'Verizon Communications', e: 'NYSE', s: 'Communication Services', i: 'S' },
  { t: 'PFE', n: 'Pfizer Inc.', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'NEE', n: 'NextEra Energy', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'DHR', n: 'Danaher Corporation', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'T', n: 'AT&T Inc.', e: 'NYSE', s: 'Communication Services', i: 'S' },
  { t: 'COP', n: 'ConocoPhillips', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'BMY', n: 'Bristol-Myers Squibb', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'LOW', n: "Lowe's Companies", e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'SPGI', n: 'S&P Global Inc.', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'UNP', n: 'Union Pacific', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'MS', n: 'Morgan Stanley', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'ELV', n: 'Elevance Health', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'BLK', n: 'BlackRock Inc.', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'DE', n: 'Deere & Company', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'SCHW', n: 'Charles Schwab', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'BA', n: 'Boeing Company', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'LMT', n: 'Lockheed Martin', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'CI', n: 'Cigna Group', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'SYK', n: 'Stryker Corporation', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'MMC', n: 'Marsh & McLennan', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'CB', n: 'Chubb Limited', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'PLD', n: 'Prologis Inc.', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'MCO', n: "Moody's Corporation", e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'SO', n: 'Southern Company', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'DUK', n: 'Duke Energy', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'SHW', n: 'Sherwin-Williams', e: 'NYSE', s: 'Basic Materials', i: 'S' },
  { t: 'TJX', n: 'TJX Companies', e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'NKE', n: 'Nike Inc.', e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'USB', n: 'U.S. Bancorp', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'TGT', n: 'Target Corporation', e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'BDX', n: 'Becton Dickinson', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'CL', n: 'Colgate-Palmolive', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'MMM', n: '3M Company', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'MDT', n: 'Medtronic PLC', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'NOC', n: 'Northrop Grumman', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'GD', n: 'General Dynamics', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'ZTS', n: 'Zoetis Inc.', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'ITW', n: 'Illinois Tool Works', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'PNC', n: 'PNC Financial Services', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'APD', n: 'Air Products & Chemicals', e: 'NYSE', s: 'Basic Materials', i: 'S' },
  { t: 'AON', n: 'Aon PLC', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'TFC', n: 'Truist Financial', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'FDX', n: 'FedEx Corporation', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'CME', n: 'CME Group Inc.', e: 'NASDAQ', s: 'Financial Services', i: 'S' },
  { t: 'ICE', n: 'Intercontinental Exchange', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'CCI', n: 'Crown Castle', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'MCK', n: 'McKesson Corporation', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'EMR', n: 'Emerson Electric', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'FCX', n: 'Freeport-McMoRan', e: 'NYSE', s: 'Basic Materials', i: 'S' },
  { t: 'NSC', n: 'Norfolk Southern', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'PSA', n: 'Public Storage', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'WM', n: 'Waste Management', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'MPC', n: 'Marathon Petroleum', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'PSX', n: 'Phillips 66', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'VLO', n: 'Valero Energy', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'OXY', n: 'Occidental Petroleum', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'EOG', n: 'EOG Resources', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'SLB', n: 'Schlumberger Limited', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'HCA', n: 'HCA Healthcare', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'ANET', n: 'Arista Networks', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'AIG', n: 'American International Group', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'AFL', n: 'Aflac Inc.', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'COF', n: 'Capital One Financial', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'MET', n: 'MetLife Inc.', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'PRU', n: 'Prudential Financial', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'ALL', n: 'Allstate Corporation', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'TRV', n: 'Travelers Companies', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'F', n: 'Ford Motor Company', e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'GM', n: 'General Motors', e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'HUM', n: 'Humana Inc.', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'WELL', n: 'Welltower Inc.', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'O', n: 'Realty Income Corp', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'AMT', n: 'American Tower', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'SPG', n: 'Simon Property Group', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'EQIX', n: 'Equinix Inc.', e: 'NASDAQ', s: 'Real Estate', i: 'S' },
  { t: 'D', n: 'Dominion Energy', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'AEP', n: 'American Electric Power', e: 'NASDAQ', s: 'Utilities', i: 'SQ' },
  { t: 'SRE', n: 'Sempra', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'ED', n: 'Consolidated Edison', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'WEC', n: 'WEC Energy Group', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'AWK', n: 'American Water Works', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'DOW', n: 'Dow Inc.', e: 'NYSE', s: 'Basic Materials', i: 'S' },
  { t: 'DD', n: 'DuPont de Nemours', e: 'NYSE', s: 'Basic Materials', i: 'S' },
  { t: 'LIN', n: 'Linde PLC', e: 'NYSE', s: 'Basic Materials', i: 'S' },
  { t: 'NUE', n: 'Nucor Corporation', e: 'NYSE', s: 'Basic Materials', i: 'S' },
  { t: 'ECL', n: 'Ecolab Inc.', e: 'NYSE', s: 'Basic Materials', i: 'S' },
  { t: 'ADM', n: 'Archer-Daniels-Midland', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'GIS', n: 'General Mills', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'K', n: 'Kellanova', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'SYY', n: 'Sysco Corporation', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'HSY', n: 'Hershey Company', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'STZ', n: 'Constellation Brands', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'MO', n: 'Altria Group', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'CARR', n: 'Carrier Global', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'ETN', n: 'Eaton Corporation', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'PH', n: 'Parker-Hannifin', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'ROK', n: 'Rockwell Automation', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'AME', n: 'AMETEK Inc.', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'IR', n: 'Ingersoll Rand', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'CMI', n: 'Cummins Inc.', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'MSCI', n: 'MSCI Inc.', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'FIS', n: 'Fidelity National Info', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'FISV', n: 'Fiserv Inc.', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'AJG', n: 'Arthur J. Gallagher', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'TRGP', n: 'Targa Resources', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'WMB', n: 'Williams Companies', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'KMI', n: 'Kinder Morgan', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'HES', n: 'Hess Corporation', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'DVN', n: 'Devon Energy', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'HAL', n: 'Halliburton Company', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'BKR', n: 'Baker Hughes', e: 'NASDAQ', s: 'Energy', i: 'SQ' },

  // ═══════════════════════════════════════════
  // QQQ ONLY (NASDAQ-100 specific)
  // ═══════════════════════════════════════════
  { t: 'PDD', n: 'PDD Holdings', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'Q' },
  { t: 'MSTR', n: 'MicroStrategy Inc.', e: 'NASDAQ', s: 'Technology', i: 'Q' },
  { t: 'FICO', n: 'Fair Isaac Corporation', e: 'NYSE', s: 'Technology', i: 'Q' },
  { t: 'CCEP', n: 'Coca-Cola Europacific', e: 'NASDAQ', s: 'Consumer Defensive', i: 'Q' },
  { t: 'CDW', n: 'CDW Corporation', e: 'NASDAQ', s: 'Technology', i: 'Q' },
  { t: 'TTWO', n: 'Take-Two Interactive', e: 'NASDAQ', s: 'Communication Services', i: 'Q' },
  { t: 'WBD', n: 'Warner Bros. Discovery', e: 'NASDAQ', s: 'Communication Services', i: 'Q' },
  { t: 'SPLK', n: 'Splunk Inc.', e: 'NASDAQ', s: 'Technology', i: 'Q' },

  // ═══════════════════════════════════════════
  // IWM (Russell 2000 - Small/Mid Cap)
  // Top ~300 holdings by weight
  // ═══════════════════════════════════════════
  { t: 'INSM', n: 'Insmed Incorporated', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'FND', n: 'Floor & Decor Holdings', e: 'NYSE', s: 'Consumer Cyclical', i: 'R' },
  { t: 'DOCS', n: 'Doximity Inc.', e: 'NYSE', s: 'Healthcare', i: 'R' },
  { t: 'COOP', n: 'Mr. Cooper Group', e: 'NASDAQ', s: 'Financial Services', i: 'R' },
  { t: 'DUOL', n: 'Duolingo Inc.', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'FNF', n: 'Fidelity National Financial', e: 'NYSE', s: 'Financial Services', i: 'R' },
  { t: 'MTDR', n: 'Matador Resources', e: 'NYSE', s: 'Energy', i: 'R' },
  { t: 'CARG', n: 'CarGurus Inc.', e: 'NASDAQ', s: 'Communication Services', i: 'R' },
  { t: 'RMBS', n: 'Rambus Inc.', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'SKX', n: 'Skechers U.S.A.', e: 'NYSE', s: 'Consumer Cyclical', i: 'R' },
  { t: 'PCVX', n: 'Vaxcyte Inc.', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'MGNI', n: 'Magnite Inc.', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'ENSG', n: 'The Ensign Group', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'LNTH', n: 'Lantheus Holdings', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'EXPO', n: 'Exponent Inc.', e: 'NASDAQ', s: 'Industrials', i: 'R' },
  { t: 'HLI', n: 'Houlihan Lokey', e: 'NYSE', s: 'Financial Services', i: 'R' },
  { t: 'SPSC', n: 'SPS Commerce', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'IPAR', n: 'Inter Parfums', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'R' },
  { t: 'CVLT', n: 'Commvault Systems', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'CALX', n: 'Calix Inc.', e: 'NYSE', s: 'Technology', i: 'R' },
  { t: 'BOOT', n: 'Boot Barn Holdings', e: 'NYSE', s: 'Consumer Cyclical', i: 'R' },
  { t: 'PNFP', n: 'Pinnacle Financial Partners', e: 'NASDAQ', s: 'Financial Services', i: 'R' },
  { t: 'NOVT', n: 'Novanta Inc.', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'CSWI', n: 'CSW Industrials', e: 'NASDAQ', s: 'Industrials', i: 'R' },
  { t: 'SFM', n: 'Sprouts Farmers Market', e: 'NASDAQ', s: 'Consumer Defensive', i: 'R' },
  { t: 'UFPI', n: 'UFP Industries', e: 'NASDAQ', s: 'Industrials', i: 'R' },
  { t: 'ACIW', n: 'ACI Worldwide', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'HALO', n: 'Halozyme Therapeutics', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'ITCI', n: 'Intra-Cellular Therapies', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'PI', n: 'Impinj Inc.', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'GKOS', n: 'Glaukos Corporation', e: 'NYSE', s: 'Healthcare', i: 'R' },
  { t: 'RXRX', n: 'Recursion Pharmaceuticals', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'SAIA', n: 'Saia Inc.', e: 'NASDAQ', s: 'Industrials', i: 'R' },
  { t: 'CRVL', n: 'CorVel Corporation', e: 'NASDAQ', s: 'Industrials', i: 'R' },
  { t: 'RGEN', n: 'Repligen Corporation', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'KTOS', n: 'Kratos Defense', e: 'NASDAQ', s: 'Industrials', i: 'R' },
  { t: 'CADE', n: 'Cadence Bank', e: 'NYSE', s: 'Financial Services', i: 'R' },
  { t: 'RHP', n: 'Ryman Hospitality', e: 'NYSE', s: 'Real Estate', i: 'R' },
  { t: 'WFRD', n: 'Weatherford Intl', e: 'NASDAQ', s: 'Energy', i: 'R' },
  { t: 'VCTR', n: 'Victory Capital Holdings', e: 'NASDAQ', s: 'Financial Services', i: 'R' },
  { t: 'DORM', n: 'Dorman Products', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'R' },
  { t: 'BCC', n: 'Boise Cascade', e: 'NYSE', s: 'Basic Materials', i: 'R' },
  { t: 'WDFC', n: 'WD-40 Company', e: 'NASDAQ', s: 'Basic Materials', i: 'R' },
  { t: 'PIPR', n: 'Piper Sandler Companies', e: 'NYSE', s: 'Financial Services', i: 'R' },
  { t: 'AIT', n: 'Applied Industrial Tech', e: 'NYSE', s: 'Industrials', i: 'R' },
  { t: 'SHAK', n: 'Shake Shack Inc.', e: 'NYSE', s: 'Consumer Cyclical', i: 'R' },
  { t: 'CNX', n: 'CNX Resources', e: 'NYSE', s: 'Energy', i: 'R' },
  { t: 'CORT', n: 'Corcept Therapeutics', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'TNET', n: 'TriNet Group', e: 'NYSE', s: 'Industrials', i: 'R' },
  { t: 'PLXS', n: 'Plexus Corporation', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'ARCB', n: 'ArcBest Corporation', e: 'NASDAQ', s: 'Industrials', i: 'R' },
  { t: 'QLYS', n: 'Qualys Inc.', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'WING', n: 'Wingstop Inc.', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'R' },
  { t: 'TMDX', n: 'TransMedics Group', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'APLS', n: 'Apellis Pharmaceuticals', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'FORM', n: 'FormFactor Inc.', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'IRDM', n: 'Iridium Communications', e: 'NASDAQ', s: 'Communication Services', i: 'R' },
  { t: 'CRS', n: 'Carpenter Technology', e: 'NYSE', s: 'Basic Materials', i: 'R' },
  { t: 'EAT', n: "Brinker International", e: 'NYSE', s: 'Consumer Cyclical', i: 'R' },
  { t: 'HIMS', n: 'Hims & Hers Health', e: 'NYSE', s: 'Healthcare', i: 'R' },
  { t: 'RKLB', n: 'Rocket Lab USA', e: 'NASDAQ', s: 'Industrials', i: 'R' },
  { t: 'JOBY', n: 'Joby Aviation', e: 'NYSE', s: 'Industrials', i: 'R' },
  { t: 'LUNR', n: 'Intuitive Machines', e: 'NASDAQ', s: 'Industrials', i: 'R' },
  { t: 'IONQ', n: 'IonQ Inc.', e: 'NYSE', s: 'Technology', i: 'R' },
  { t: 'AFRM', n: 'Affirm Holdings', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'UPST', n: 'Upstart Holdings', e: 'NASDAQ', s: 'Financial Services', i: 'R' },
  { t: 'SOFI', n: 'SoFi Technologies', e: 'NASDAQ', s: 'Financial Services', i: 'R' },
  { t: 'BILL', n: 'BILL Holdings', e: 'NYSE', s: 'Technology', i: 'R' },
  { t: 'RIVN', n: 'Rivian Automotive', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'R' },
  { t: 'LCID', n: 'Lucid Group', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'R' },
  { t: 'VRT', n: 'Vertiv Holdings', e: 'NYSE', s: 'Industrials', i: 'R' },
  { t: 'CAVA', n: 'CAVA Group', e: 'NYSE', s: 'Consumer Cyclical', i: 'R' },
  { t: 'DT', n: 'Dynatrace Inc.', e: 'NYSE', s: 'Technology', i: 'R' },
  { t: 'TOST', n: 'Toast Inc.', e: 'NYSE', s: 'Technology', i: 'R' },
  { t: 'GLBE', n: 'Global-E Online', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'RELY', n: 'Remitly Global', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'NARI', n: 'Inari Medical', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'NUVB', n: 'Nuvation Bio', e: 'NYSE', s: 'Healthcare', i: 'R' },
  { t: 'ARWR', n: 'Arrowhead Pharmaceuticals', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'RARE', n: 'Ultragenyx Pharmaceutical', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'KRYS', n: 'Krystal Biotech', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'AXON', n: 'Axon Enterprise', e: 'NASDAQ', s: 'Industrials', i: 'R' },
  { t: 'DV', n: 'DoubleVerify Holdings', e: 'NYSE', s: 'Technology', i: 'R' },
  { t: 'BROS', n: 'Dutch Bros Inc.', e: 'NYSE', s: 'Consumer Cyclical', i: 'R' },
  { t: 'CELH', n: 'Celsius Holdings', e: 'NASDAQ', s: 'Consumer Defensive', i: 'R' },
  { t: 'LSCC', n: 'Lattice Semiconductor', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'NTRA', n: 'Natera Inc.', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'ACHR', n: 'Archer Aviation', e: 'NYSE', s: 'Industrials', i: 'R' },
  { t: 'BURL', n: 'Burlington Stores', e: 'NYSE', s: 'Consumer Cyclical', i: 'R' },
  { t: 'EXAS', n: 'Exact Sciences', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'AZEK', n: 'The AZEK Company', e: 'NYSE', s: 'Industrials', i: 'R' },
  { t: 'RBRK', n: 'Rubrik Inc.', e: 'NYSE', s: 'Technology', i: 'R' },
  { t: 'WOLF', n: 'Wolfspeed Inc.', e: 'NYSE', s: 'Technology', i: 'R' },
  { t: 'CRNX', n: 'Crinetics Pharmaceuticals', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'VERA', n: 'Vera Therapeutics', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'RUN', n: 'Sunrun Inc.', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'ENPH', n: 'Enphase Energy', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'SEDG', n: 'SolarEdge Technologies', e: 'NASDAQ', s: 'Technology', i: 'R' },
  { t: 'CRSP', n: 'CRISPR Therapeutics', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'NTLA', n: 'Intellia Therapeutics', e: 'NASDAQ', s: 'Healthcare', i: 'R' },
  { t: 'BEAM', n: 'Beam Therapeutics', e: 'NASDAQ', s: 'Healthcare', i: 'R' },

  // =====================================================
  // EXTENDED LARGE-CAP / LIQUID US UNIVERSE
  // Added 2026-05-23 to bring Stock Analyzer autocomplete to 500 unique stocks.
  // =====================================================
  { t: 'A', n: 'Agilent Technologies', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'AEE', n: 'Ameren Corporation', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'AES', n: 'AES Corporation', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'AKAM', n: 'Akamai Technologies', e: 'NASDAQ', s: 'Technology', i: 'S' },
  { t: 'ALB', n: 'Albemarle Corporation', e: 'NYSE', s: 'Basic Materials', i: 'S' },
  { t: 'ALGN', n: 'Align Technology', e: 'NASDAQ', s: 'Healthcare', i: 'S' },
  { t: 'ALLE', n: 'Allegion PLC', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'AMCR', n: 'Amcor PLC', e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'AMP', n: 'Ameriprise Financial', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'APH', n: 'Amphenol Corporation', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'APO', n: 'Apollo Global Management', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'ARE', n: 'Alexandria Real Estate Equities', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'ARES', n: 'Ares Management Corporation', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'ATO', n: 'Atmos Energy', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'AVB', n: 'AvalonBay Communities', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'AVY', n: 'Avery Dennison', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'BALL', n: 'Ball Corporation', e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'BG', n: 'Bunge Global', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'BRO', n: 'Brown & Brown', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'BSX', n: 'Boston Scientific', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'C', n: 'Citigroup', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'CAH', n: 'Cardinal Health', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'CBOE', n: 'Cboe Global Markets', e: 'CBOE', s: 'Financial Services', i: 'S' },
  { t: 'CFG', n: 'Citizens Financial Group', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'CHD', n: 'Church & Dwight', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'CHRW', n: 'C.H. Robinson Worldwide', e: 'NASDAQ', s: 'Industrials', i: 'S' },
  { t: 'CINF', n: 'Cincinnati Financial', e: 'NASDAQ', s: 'Financial Services', i: 'S' },
  { t: 'CNC', n: 'Centene Corporation', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'CNP', n: 'CenterPoint Energy', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'COR', n: 'Cencora', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'CPAY', n: 'Corpay', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'CPT', n: 'Camden Property Trust', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'CSGP', n: 'CoStar Group', e: 'NASDAQ', s: 'Real Estate', i: 'S' },
  { t: 'CTRA', n: 'Coterra Energy', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'CTVA', n: 'Corteva', e: 'NYSE', s: 'Basic Materials', i: 'S' },
  { t: 'CZR', n: 'Caesars Entertainment', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'S' },
  { t: 'DAL', n: 'Delta Air Lines', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'DAY', n: 'Dayforce', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'DECK', n: 'Deckers Outdoor', e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'DFS', n: 'Discover Financial Services', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'DG', n: 'Dollar General', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'DGX', n: 'Quest Diagnostics', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'DLR', n: 'Digital Realty Trust', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'DLTR', n: 'Dollar Tree', e: 'NASDAQ', s: 'Consumer Defensive', i: 'S' },
  { t: 'DOV', n: 'Dover Corporation', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'DRI', n: 'Darden Restaurants', e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'DTE', n: 'DTE Energy', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'EBAY', n: 'eBay Inc.', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'S' },
  { t: 'EFX', n: 'Equifax', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'EG', n: 'Everest Group', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'EIX', n: 'Edison International', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'EL', n: 'Estee Lauder Companies', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'EME', n: 'EMCOR Group', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'EPAM', n: 'EPAM Systems', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'EQR', n: 'Equity Residential', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'EQT', n: 'EQT Corporation', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'ES', n: 'Eversource Energy', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'ESS', n: 'Essex Property Trust', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'EW', n: 'Edwards Lifesciences', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'EXE', n: 'Expand Energy', e: 'NASDAQ', s: 'Energy', i: 'S' },
  { t: 'EXPD', n: 'Expeditors International', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'EXPE', n: 'Expedia Group', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'S' },
  { t: 'FDS', n: 'FactSet Research Systems', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'FE', n: 'FirstEnergy', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'FFIV', n: 'F5 Inc.', e: 'NASDAQ', s: 'Technology', i: 'S' },
  { t: 'FI', n: 'Fiserv Inc.', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'FITB', n: 'Fifth Third Bancorp', e: 'NASDAQ', s: 'Financial Services', i: 'S' },
  { t: 'FOXA', n: 'Fox Corporation Class A', e: 'NASDAQ', s: 'Communication Services', i: 'S' },
  { t: 'FRT', n: 'Federal Realty Investment Trust', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'GDDY', n: 'GoDaddy', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'GEN', n: 'Gen Digital', e: 'NASDAQ', s: 'Technology', i: 'S' },
  { t: 'GPC', n: 'Genuine Parts', e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'GRMN', n: 'Garmin', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'GWW', n: 'W.W. Grainger', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'HBAN', n: 'Huntington Bancshares', e: 'NASDAQ', s: 'Financial Services', i: 'S' },
  { t: 'HIG', n: 'Hartford Financial Services', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'HOLX', n: 'Hologic', e: 'NASDAQ', s: 'Healthcare', i: 'S' },
  { t: 'HPQ', n: 'HP Inc.', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'HRL', n: 'Hormel Foods', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'HST', n: 'Host Hotels & Resorts', e: 'NASDAQ', s: 'Real Estate', i: 'S' },
  { t: 'HUBB', n: 'Hubbell', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'IFF', n: 'International Flavors & Fragrances', e: 'NYSE', s: 'Basic Materials', i: 'S' },
  { t: 'INVH', n: 'Invitation Homes', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'IQV', n: 'IQVIA Holdings', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'IRM', n: 'Iron Mountain', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'IVZ', n: 'Invesco', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'J', n: 'Jacobs Solutions', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'JBHT', n: 'J.B. Hunt Transport Services', e: 'NASDAQ', s: 'Industrials', i: 'S' },
  { t: 'JBL', n: 'Jabil', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'JKHY', n: 'Jack Henry & Associates', e: 'NASDAQ', s: 'Technology', i: 'S' },
  { t: 'KHC', n: 'Kraft Heinz', e: 'NASDAQ', s: 'Consumer Defensive', i: 'S' },
  { t: 'KEY', n: 'KeyCorp', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'KEYS', n: 'Keysight Technologies', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'KIM', n: 'Kimco Realty', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'KKR', n: 'KKR & Co.', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'KMB', n: 'Kimberly-Clark', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'KMX', n: 'CarMax', e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'KR', n: 'Kroger', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'LDOS', n: 'Leidos Holdings', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'LEN', n: 'Lennar Corporation', e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'LH', n: 'Labcorp Holdings', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'LHX', n: 'L3Harris Technologies', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'LII', n: 'Lennox International', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'LKQ', n: 'LKQ Corporation', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'S' },
  { t: 'LNT', n: 'Alliant Energy', e: 'NASDAQ', s: 'Utilities', i: 'S' },
  { t: 'LYB', n: 'LyondellBasell Industries', e: 'NYSE', s: 'Basic Materials', i: 'S' },
  { t: 'LYV', n: 'Live Nation Entertainment', e: 'NYSE', s: 'Communication Services', i: 'S' },
  { t: 'MAS', n: 'Masco Corporation', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'MGM', n: 'MGM Resorts International', e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'MKC', n: 'McCormick & Company', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'MLM', n: 'Martin Marietta Materials', e: 'NYSE', s: 'Basic Materials', i: 'S' },
  { t: 'MPWR', n: 'Monolithic Power Systems', e: 'NASDAQ', s: 'Technology', i: 'S' },
  { t: 'MTB', n: 'M&T Bank', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'NDAQ', n: 'Nasdaq', e: 'NASDAQ', s: 'Financial Services', i: 'S' },
  { t: 'NI', n: 'NiSource', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'NTRS', n: 'Northern Trust', e: 'NASDAQ', s: 'Financial Services', i: 'S' },
  { t: 'NWSA', n: 'News Corp Class A', e: 'NASDAQ', s: 'Communication Services', i: 'S' },
  { t: 'OKE', n: 'ONEOK', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'OMC', n: 'Omnicom Group', e: 'NYSE', s: 'Communication Services', i: 'S' },
  { t: 'OTIS', n: 'Otis Worldwide', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'PFG', n: 'Principal Financial Group', e: 'NASDAQ', s: 'Financial Services', i: 'S' },
  { t: 'PKG', n: 'Packaging Corporation of America', e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'PNR', n: 'Pentair', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'POOL', n: 'Pool Corporation', e: 'NASDAQ', s: 'Industrials', i: 'S' },
  { t: 'PPG', n: 'PPG Industries', e: 'NYSE', s: 'Basic Materials', i: 'S' },
  { t: 'PPL', n: 'PPL Corporation', e: 'NYSE', s: 'Utilities', i: 'S' },
  { t: 'PTC', n: 'PTC Inc.', e: 'NASDAQ', s: 'Technology', i: 'S' },
  { t: 'PWR', n: 'Quanta Services', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'RF', n: 'Regions Financial', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'RJF', n: 'Raymond James Financial', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'ROL', n: 'Rollins', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'RSG', n: 'Republic Services', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'SBAC', n: 'SBA Communications', e: 'NASDAQ', s: 'Real Estate', i: 'S' },
  { t: 'SJM', n: 'J.M. Smucker', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'STE', n: 'STERIS', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'STLD', n: 'Steel Dynamics', e: 'NASDAQ', s: 'Basic Materials', i: 'S' },
  { t: 'STT', n: 'State Street', e: 'NYSE', s: 'Financial Services', i: 'S' },
  { t: 'SW', n: 'Smurfit Westrock', e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'SWK', n: 'Stanley Black & Decker', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'SWKS', n: 'Skyworks Solutions', e: 'NASDAQ', s: 'Technology', i: 'S' },
  { t: 'TDG', n: 'TransDigm Group', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'TEL', n: 'TE Connectivity', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'TER', n: 'Teradyne', e: 'NASDAQ', s: 'Technology', i: 'S' },
  { t: 'TKO', n: 'TKO Group Holdings', e: 'NYSE', s: 'Communication Services', i: 'S' },
  { t: 'TPL', n: 'Texas Pacific Land', e: 'NYSE', s: 'Energy', i: 'S' },
  { t: 'TPR', n: 'Tapestry', e: 'NYSE', s: 'Consumer Cyclical', i: 'S' },
  { t: 'TRMB', n: 'Trimble', e: 'NASDAQ', s: 'Technology', i: 'S' },
  { t: 'TSCO', n: 'Tractor Supply', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'S' },
  { t: 'TSN', n: 'Tyson Foods', e: 'NYSE', s: 'Consumer Defensive', i: 'S' },
  { t: 'TXT', n: 'Textron', e: 'NYSE', s: 'Industrials', i: 'S' },
  { t: 'TYL', n: 'Tyler Technologies', e: 'NYSE', s: 'Technology', i: 'S' },
  { t: 'UAL', n: 'United Airlines Holdings', e: 'NASDAQ', s: 'Industrials', i: 'S' },
  { t: 'UDR', n: 'UDR Inc.', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'UHS', n: 'Universal Health Services', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'ULTA', n: 'Ulta Beauty', e: 'NASDAQ', s: 'Consumer Cyclical', i: 'S' },
  { t: 'VEEV', n: 'Veeva Systems', e: 'NYSE', s: 'Healthcare', i: 'S' },
  { t: 'VICI', n: 'VICI Properties', e: 'NYSE', s: 'Real Estate', i: 'S' },
  { t: 'VLTO', n: 'Veralto', e: 'NYSE', s: 'Industrials', i: 'S' },
];

// =====================================================
// SEARCH INDEX — Pre-built for fast lookups
// =====================================================

// Map of ticker → UniverseStock for O(1) lookup
const tickerMap = new Map<string, UniverseStock>();
STOCK_UNIVERSE.forEach(s => tickerMap.set(s.t, s));

/**
 * Check if a ticker is in our universe
 */
export function isValidTicker(ticker: string): boolean {
  const upper = ticker.toUpperCase();
  if (BLOCKED_TICKERS.has(upper)) return false;
  return tickerMap.has(upper);
}

/**
 * Check if a ticker is blocked (ETF/Index/Sector)
 */
export function isBlockedTicker(ticker: string): boolean {
  return BLOCKED_TICKERS.has(ticker.toUpperCase());
}

/**
 * Get stock info by ticker
 */
export function getStockByTicker(ticker: string): UniverseStock | null {
  return tickerMap.get(ticker.toUpperCase()) || null;
}

/**
 * Get index label for display
 */
export function getIndexLabel(indexCode: string): string[] {
  const labels: string[] = [];
  if (indexCode.includes('S')) labels.push('S&P 500');
  if (indexCode.includes('Q')) labels.push('NASDAQ-100');
  if (indexCode.includes('R')) labels.push('Russell 2000');
  return labels;
}

/**
 * Search the universe — fast local search
 * Returns matching stocks sorted by relevance
 * 
 * Search priority:
 *   1. Exact ticker match
 *   2. Ticker starts with query
 *   3. Company name contains query
 *   4. Sector matches query
 */
export function searchUniverse(query: string, maxResults = 12): UniverseStock[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];

  // Block ETF/Index searches with helpful message
  if (BLOCKED_TICKERS.has(q)) return [];

  const exact: UniverseStock[] = [];
  const tickerStarts: UniverseStock[] = [];
  const nameContains: UniverseStock[] = [];
  const sectorMatch: UniverseStock[] = [];

  const qLower = query.trim().toLowerCase();

  for (const stock of STOCK_UNIVERSE) {
    if (stock.t === q) {
      exact.push(stock);
    } else if (stock.t.startsWith(q)) {
      tickerStarts.push(stock);
    } else if (stock.n.toLowerCase().includes(qLower)) {
      nameContains.push(stock);
    } else if (stock.s.toLowerCase().includes(qLower)) {
      sectorMatch.push(stock);
    }
  }

  // Sort each group: SPY+QQQ first, then SPY, then QQQ, then IWM
  const sortByIndex = (a: UniverseStock, b: UniverseStock) => {
    const weight = (s: UniverseStock) => 
      s.i === 'SQ' ? 0 : s.i === 'S' ? 1 : s.i === 'Q' ? 2 : 3;
    return weight(a) - weight(b);
  };

  tickerStarts.sort(sortByIndex);
  nameContains.sort(sortByIndex);
  sectorMatch.sort(sortByIndex);

  return [...exact, ...tickerStarts, ...nameContains, ...sectorMatch].slice(0, maxResults);
}

/**
 * Get all stocks in a specific index
 */
export function getStocksByIndex(index: 'S' | 'Q' | 'R'): UniverseStock[] {
  return STOCK_UNIVERSE.filter(s => s.i.includes(index));
}

/**
 * Get all unique sectors
 */
export function getAllSectors(): string[] {
  return [...new Set(STOCK_UNIVERSE.map(s => s.s))].sort();
}

/**
 * Get stocks by sector
 */
export function getStocksBySector(sector: string): UniverseStock[] {
  const s = sector.toLowerCase();
  return STOCK_UNIVERSE.filter(stock => stock.s.toLowerCase() === s);
}
