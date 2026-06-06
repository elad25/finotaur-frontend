// src/data/etfs.ts
// Static list of ~380 US-listed ETFs spanning all major categories.
// Used by the omnibox to surface ETF results without an API call.

export type EtfEntry = { symbol: string; name: string };

export const ETF_LIST: EtfEntry[] = [
  // ---------------------------------------------------------------------------
  // Broad market / total market
  // ---------------------------------------------------------------------------
  { symbol: 'SPY',   name: 'SPDR S&P 500 ETF' },
  { symbol: 'VOO',   name: 'Vanguard S&P 500 ETF' },
  { symbol: 'IVV',   name: 'iShares Core S&P 500 ETF' },
  { symbol: 'QQQ',   name: 'Invesco QQQ Trust (Nasdaq-100)' },
  { symbol: 'QQQM',  name: 'Invesco Nasdaq-100 ETF' },
  { symbol: 'VTI',   name: 'Vanguard Total Stock Market ETF' },
  { symbol: 'ITOT',  name: 'iShares Core S&P Total US Stock Market ETF' },
  { symbol: 'IWM',   name: 'iShares Russell 2000 ETF' },
  { symbol: 'IWB',   name: 'iShares Russell 1000 ETF' },
  { symbol: 'IWV',   name: 'iShares Russell 3000 ETF' },
  { symbol: 'DIA',   name: 'SPDR Dow Jones Industrial Average ETF' },
  { symbol: 'MDY',   name: 'SPDR S&P MidCap 400 ETF' },
  { symbol: 'IJH',   name: 'iShares Core S&P Mid-Cap ETF' },
  { symbol: 'IJR',   name: 'iShares Core S&P Small-Cap ETF' },
  { symbol: 'SCHB',  name: 'Schwab US Broad Market ETF' },
  { symbol: 'SCHX',  name: 'Schwab US Large-Cap ETF' },
  { symbol: 'SCHA',  name: 'Schwab US Small-Cap ETF' },
  { symbol: 'VV',    name: 'Vanguard Large-Cap ETF' },
  { symbol: 'VONE',  name: 'Vanguard Russell 1000 ETF' },
  { symbol: 'VTWO',  name: 'Vanguard Russell 2000 ETF' },
  { symbol: 'VTHR',  name: 'Vanguard Russell 3000 ETF' },
  { symbol: 'RSP',   name: 'Invesco S&P 500 Equal Weight ETF' },
  { symbol: 'ONEQ',  name: 'Fidelity Nasdaq Composite Index ETF' },
  { symbol: 'SPLG',  name: 'SPDR Portfolio S&P 500 ETF' },
  { symbol: 'SPTM',  name: 'SPDR Portfolio S&P 1500 Composite Stock Market ETF' },

  // ---------------------------------------------------------------------------
  // SPDR Select Sector ETFs (all 11)
  // ---------------------------------------------------------------------------
  { symbol: 'XLK',   name: 'Technology Select Sector SPDR' },
  { symbol: 'XLF',   name: 'Financial Select Sector SPDR' },
  { symbol: 'XLE',   name: 'Energy Select Sector SPDR' },
  { symbol: 'XLV',   name: 'Health Care Select Sector SPDR' },
  { symbol: 'XLY',   name: 'Consumer Discretionary Select Sector SPDR' },
  { symbol: 'XLP',   name: 'Consumer Staples Select Sector SPDR' },
  { symbol: 'XLI',   name: 'Industrial Select Sector SPDR' },
  { symbol: 'XLU',   name: 'Utilities Select Sector SPDR' },
  { symbol: 'XLB',   name: 'Materials Select Sector SPDR' },
  { symbol: 'XLRE',  name: 'Real Estate Select Sector SPDR' },
  { symbol: 'XLC',   name: 'Communication Services Select Sector SPDR' },

  // ---------------------------------------------------------------------------
  // Equal-weight sector ETFs (Invesco RSPR series)
  // ---------------------------------------------------------------------------
  { symbol: 'RSPT',  name: 'Invesco S&P 500 Equal Weight Technology ETF' },
  { symbol: 'RSPF',  name: 'Invesco S&P 500 Equal Weight Financials ETF' },
  { symbol: 'RSPE',  name: 'Invesco S&P 500 Equal Weight Energy ETF' },
  { symbol: 'RSPH',  name: 'Invesco S&P 500 Equal Weight Health Care ETF' },
  { symbol: 'RSPD',  name: 'Invesco S&P 500 Equal Weight Consumer Discretionary ETF' },
  { symbol: 'RSPS',  name: 'Invesco S&P 500 Equal Weight Consumer Staples ETF' },
  { symbol: 'RSPN',  name: 'Invesco S&P 500 Equal Weight Industrials ETF' },
  { symbol: 'RSPU',  name: 'Invesco S&P 500 Equal Weight Utilities ETF' },
  { symbol: 'RSPM',  name: 'Invesco S&P 500 Equal Weight Materials ETF' },
  { symbol: 'RSPR',  name: 'Invesco S&P 500 Equal Weight Real Estate ETF' },
  { symbol: 'RSPC',  name: 'Invesco S&P 500 Equal Weight Communication Services ETF' },

  // ---------------------------------------------------------------------------
  // Semiconductors
  // ---------------------------------------------------------------------------
  { symbol: 'SMH',   name: 'VanEck Semiconductor ETF' },
  { symbol: 'SOXX',  name: 'iShares Semiconductor ETF' },
  { symbol: 'XSD',   name: 'SPDR S&P Semiconductor ETF' },
  { symbol: 'PSI',   name: 'Invesco Dynamic Semiconductors ETF' },

  // ---------------------------------------------------------------------------
  // Biotech / Life Sciences
  // ---------------------------------------------------------------------------
  { symbol: 'IBB',   name: 'iShares Biotechnology ETF' },
  { symbol: 'XBI',   name: 'SPDR S&P Biotech ETF' },

  // ---------------------------------------------------------------------------
  // Banks & Financials sub-sector
  // ---------------------------------------------------------------------------
  { symbol: 'KRE',   name: 'SPDR S&P Regional Banking ETF' },
  { symbol: 'KBE',   name: 'SPDR S&P Bank ETF' },
  { symbol: 'KBWB',  name: 'Invesco KBW Bank ETF' },

  // ---------------------------------------------------------------------------
  // Homebuilders / Construction
  // ---------------------------------------------------------------------------
  { symbol: 'ITB',   name: 'iShares US Home Construction ETF' },
  { symbol: 'XHB',   name: 'SPDR S&P Homebuilders ETF' },

  // ---------------------------------------------------------------------------
  // Oil Services & E&P
  // ---------------------------------------------------------------------------
  { symbol: 'OIH',   name: 'VanEck Oil Services ETF' },
  { symbol: 'XOP',   name: 'SPDR S&P Oil & Gas Exploration & Production ETF' },

  // ---------------------------------------------------------------------------
  // Gold & Silver Miners
  // ---------------------------------------------------------------------------
  { symbol: 'GDX',   name: 'VanEck Gold Miners ETF' },
  { symbol: 'GDXJ',  name: 'VanEck Junior Gold Miners ETF' },
  { symbol: 'SIL',   name: 'Global X Silver Miners ETF' },

  // ---------------------------------------------------------------------------
  // Software / Tech sub-sector
  // ---------------------------------------------------------------------------
  { symbol: 'IGV',   name: 'iShares Expanded Tech-Software Sector ETF' },
  { symbol: 'VGT',   name: 'Vanguard Information Technology ETF' },
  { symbol: 'FTEC',  name: 'Fidelity MSCI Information Technology Index ETF' },
  { symbol: 'XSW',   name: 'SPDR S&P Software & Services ETF' },

  // ---------------------------------------------------------------------------
  // Cybersecurity
  // ---------------------------------------------------------------------------
  { symbol: 'HACK',  name: 'ETFMG Prime Cyber Security ETF' },
  { symbol: 'CIBR',  name: 'First Trust NASDAQ Cybersecurity ETF' },
  { symbol: 'BUG',   name: 'Global X Cybersecurity ETF' },

  // ---------------------------------------------------------------------------
  // Cloud Computing
  // ---------------------------------------------------------------------------
  { symbol: 'SKYY',  name: 'First Trust Cloud Computing ETF' },
  { symbol: 'WCLD',  name: 'WisdomTree Cloud Computing ETF' },
  { symbol: 'CLOU',  name: 'Global X Cloud Computing ETF' },

  // ---------------------------------------------------------------------------
  // Fintech
  // ---------------------------------------------------------------------------
  { symbol: 'FINX',  name: 'Global X FinTech ETF' },
  { symbol: 'ARKF',  name: 'ARK Fintech Innovation ETF' },
  { symbol: 'IPAY',  name: 'ETFMG Prime Mobile Payments ETF' },

  // ---------------------------------------------------------------------------
  // Retail
  // ---------------------------------------------------------------------------
  { symbol: 'XRT',   name: 'SPDR S&P Retail ETF' },
  { symbol: 'RTH',   name: 'VanEck Retail ETF' },

  // ---------------------------------------------------------------------------
  // Aerospace & Defense
  // ---------------------------------------------------------------------------
  { symbol: 'ITA',   name: 'iShares US Aerospace & Defense ETF' },
  { symbol: 'PPA',   name: 'Invesco Aerospace & Defense ETF' },
  { symbol: 'XAR',   name: 'SPDR S&P Aerospace & Defense ETF' },

  // ---------------------------------------------------------------------------
  // Transportation
  // ---------------------------------------------------------------------------
  { symbol: 'IYT',   name: 'iShares Transportation Average ETF' },
  { symbol: 'XTN',   name: 'SPDR S&P Transportation ETF' },
  { symbol: 'JETS',  name: 'US Global Jets ETF' },

  // ---------------------------------------------------------------------------
  // Clean Energy
  // ---------------------------------------------------------------------------
  { symbol: 'TAN',   name: 'Invesco Solar ETF' },
  { symbol: 'ICLN',  name: 'iShares Global Clean Energy ETF' },
  { symbol: 'QCLN',  name: 'First Trust NASDAQ Clean Edge Green Energy ETF' },
  { symbol: 'PBW',   name: 'Invesco WilderHill Clean Energy ETF' },
  { symbol: 'FAN',   name: 'First Trust Global Wind Energy ETF' },

  // ---------------------------------------------------------------------------
  // Lithium & Rare Earth / Uranium
  // ---------------------------------------------------------------------------
  { symbol: 'LIT',   name: 'Global X Lithium & Battery Tech ETF' },
  { symbol: 'REMX',  name: 'VanEck Rare Earth/Strategic Metals ETF' },
  { symbol: 'URA',   name: 'Global X Uranium ETF' },
  { symbol: 'URNM',  name: 'Sprott Uranium Miners ETF' },

  // ---------------------------------------------------------------------------
  // Agriculture / Commodities sub-sector
  // ---------------------------------------------------------------------------
  { symbol: 'MOO',   name: 'VanEck Agribusiness ETF' },
  { symbol: 'DBA',   name: 'Invesco DB Agriculture Fund' },
  { symbol: 'WOOD',  name: 'iShares Global Timber & Forestry ETF' },
  { symbol: 'CUT',   name: 'Invesco MSCI Global Timber ETF' },

  // ---------------------------------------------------------------------------
  // Infrastructure
  // ---------------------------------------------------------------------------
  { symbol: 'PAVE',  name: 'Global X US Infrastructure Development ETF' },
  { symbol: 'IFRA',  name: 'iShares US Infrastructure ETF' },

  // ---------------------------------------------------------------------------
  // Robotics & AI
  // ---------------------------------------------------------------------------
  { symbol: 'BOTZ',  name: 'Global X Robotics & Artificial Intelligence ETF' },
  { symbol: 'ROBO',  name: 'ROBO Global Robotics and Automation Index ETF' },
  { symbol: 'IRBO',  name: 'iShares Robotics and Artificial Intelligence Multisector ETF' },

  // ---------------------------------------------------------------------------
  // Gaming / Esports
  // ---------------------------------------------------------------------------
  { symbol: 'ESPO',  name: 'VanEck Video Gaming and eSports ETF' },
  { symbol: 'HERO',  name: 'Global X Video Games & Esports ETF' },

  // ---------------------------------------------------------------------------
  // Cannabis
  // ---------------------------------------------------------------------------
  { symbol: 'MJ',    name: 'ETFMG Alternative Harvest ETF' },

  // ---------------------------------------------------------------------------
  // Insurance
  // ---------------------------------------------------------------------------
  { symbol: 'KIE',   name: 'SPDR S&P Insurance ETF' },

  // ---------------------------------------------------------------------------
  // REITs
  // ---------------------------------------------------------------------------
  { symbol: 'VNQ',   name: 'Vanguard Real Estate ETF' },
  { symbol: 'IYR',   name: 'iShares US Real Estate ETF' },
  { symbol: 'SCHH',  name: 'Schwab US REIT ETF' },
  { symbol: 'REM',   name: 'iShares Mortgage Real Estate ETF' },
  { symbol: 'MORT',  name: 'VanEck Mortgage REIT Income ETF' },
  { symbol: 'RWR',   name: 'SPDR Dow Jones REIT ETF' },
  { symbol: 'ICF',   name: 'iShares Cohen & Steers REIT ETF' },

  // ---------------------------------------------------------------------------
  // Leveraged & Inverse — Nasdaq-100
  // ---------------------------------------------------------------------------
  { symbol: 'TQQQ',  name: 'ProShares UltraPro QQQ (3x Nasdaq-100)' },
  { symbol: 'SQQQ',  name: 'ProShares UltraPro Short QQQ (-3x Nasdaq-100)' },
  { symbol: 'QLD',   name: 'ProShares Ultra QQQ (2x Nasdaq-100)' },
  { symbol: 'PSQ',   name: 'ProShares Short QQQ (-1x Nasdaq-100)' },

  // ---------------------------------------------------------------------------
  // Leveraged & Inverse — S&P 500
  // ---------------------------------------------------------------------------
  { symbol: 'UPRO',  name: 'ProShares UltraPro S&P 500 (3x)' },
  { symbol: 'SPXL',  name: 'Direxion Daily S&P 500 Bull 3X ETF' },
  { symbol: 'SPXS',  name: 'Direxion Daily S&P 500 Bear 3X ETF' },
  { symbol: 'SPXU',  name: 'ProShares UltraPro Short S&P 500 (-3x)' },
  { symbol: 'SSO',   name: 'ProShares Ultra S&P 500 (2x)' },
  { symbol: 'SDS',   name: 'ProShares UltraShort S&P 500 (-2x)' },

  // ---------------------------------------------------------------------------
  // Leveraged & Inverse — Dow Jones
  // ---------------------------------------------------------------------------
  { symbol: 'UDOW',  name: 'ProShares UltraPro Dow30 (3x)' },
  { symbol: 'SDOW',  name: 'ProShares UltraPro Short Dow30 (-3x)' },
  { symbol: 'DDM',   name: 'ProShares Ultra Dow30 (2x)' },
  { symbol: 'DXD',   name: 'ProShares UltraShort Dow30 (-2x)' },

  // ---------------------------------------------------------------------------
  // Leveraged & Inverse — Russell 2000
  // ---------------------------------------------------------------------------
  { symbol: 'TNA',   name: 'Direxion Daily Small Cap Bull 3X ETF' },
  { symbol: 'TZA',   name: 'Direxion Daily Small Cap Bear 3X ETF' },
  { symbol: 'URTY',  name: 'ProShares UltraPro Russell2000 (3x)' },
  { symbol: 'SRTY',  name: 'ProShares UltraPro Short Russell2000 (-3x)' },

  // ---------------------------------------------------------------------------
  // Leveraged & Inverse — Semiconductors
  // ---------------------------------------------------------------------------
  { symbol: 'SOXL',  name: 'Direxion Daily Semiconductor Bull 3X ETF' },
  { symbol: 'SOXS',  name: 'Direxion Daily Semiconductor Bear 3X ETF' },
  { symbol: 'USD',   name: 'ProShares Ultra Semiconductors (2x)' },
  { symbol: 'SSG',   name: 'ProShares UltraShort Semiconductors (-2x)' },

  // ---------------------------------------------------------------------------
  // Leveraged & Inverse — Biotech
  // ---------------------------------------------------------------------------
  { symbol: 'LABU',  name: 'Direxion Daily S&P Biotech Bull 3X ETF' },
  { symbol: 'LABD',  name: 'Direxion Daily S&P Biotech Bear 3X ETF' },

  // ---------------------------------------------------------------------------
  // Leveraged & Inverse — Financials
  // ---------------------------------------------------------------------------
  { symbol: 'FAS',   name: 'Direxion Daily Financial Bull 3X ETF' },
  { symbol: 'FAZ',   name: 'Direxion Daily Financial Bear 3X ETF' },

  // ---------------------------------------------------------------------------
  // Leveraged & Inverse — Technology
  // ---------------------------------------------------------------------------
  { symbol: 'TECL',  name: 'Direxion Daily Technology Bull 3X ETF' },
  { symbol: 'TECS',  name: 'Direxion Daily Technology Bear 3X ETF' },

  // ---------------------------------------------------------------------------
  // Leveraged & Inverse — Gold Miners
  // ---------------------------------------------------------------------------
  { symbol: 'NUGT',  name: 'Direxion Daily Gold Miners Bull 2X ETF' },
  { symbol: 'DUST',  name: 'Direxion Daily Gold Miners Bear 2X ETF' },
  { symbol: 'JNUG',  name: 'Direxion Daily Junior Gold Miners Bull 2X ETF' },
  { symbol: 'JDST',  name: 'Direxion Daily Junior Gold Miners Bear 2X ETF' },

  // ---------------------------------------------------------------------------
  // Leveraged & Inverse — Energy
  // ---------------------------------------------------------------------------
  { symbol: 'ERX',   name: 'Direxion Daily Energy Bull 2X ETF' },
  { symbol: 'ERY',   name: 'Direxion Daily Energy Bear 2X ETF' },
  { symbol: 'GUSH',  name: 'Direxion Daily S&P Oil & Gas E&P Bull 2X ETF' },
  { symbol: 'DRIP',  name: 'Direxion Daily S&P Oil & Gas E&P Bear 2X ETF' },

  // ---------------------------------------------------------------------------
  // Leveraged & Inverse — China
  // ---------------------------------------------------------------------------
  { symbol: 'YINN',  name: 'Direxion Daily FTSE China Bull 3X ETF' },
  { symbol: 'YANG',  name: 'Direxion Daily FTSE China Bear 3X ETF' },

  // ---------------------------------------------------------------------------
  // Leveraged & Inverse — Treasuries
  // ---------------------------------------------------------------------------
  { symbol: 'TMF',   name: 'Direxion Daily 20+ Year Treasury Bull 3X ETF' },
  { symbol: 'TMV',   name: 'Direxion Daily 20+ Year Treasury Bear 3X ETF' },

  // ---------------------------------------------------------------------------
  // Volatility
  // ---------------------------------------------------------------------------
  { symbol: 'UVXY',  name: 'ProShares Ultra VIX Short-Term Futures ETF' },
  { symbol: 'VIXY',  name: 'ProShares VIX Short-Term Futures ETF' },
  { symbol: 'SVXY',  name: 'ProShares Short VIX Short-Term Futures ETF' },

  // ---------------------------------------------------------------------------
  // Leveraged — Natural Gas & Oil
  // ---------------------------------------------------------------------------
  { symbol: 'BOIL',  name: 'ProShares Ultra Bloomberg Natural Gas (2x)' },
  { symbol: 'KOLD',  name: 'ProShares UltraShort Bloomberg Natural Gas (-2x)' },
  { symbol: 'UCO',   name: 'ProShares Ultra Bloomberg Crude Oil (2x)' },
  { symbol: 'SCO',   name: 'ProShares UltraShort Bloomberg Crude Oil (-2x)' },

  // ---------------------------------------------------------------------------
  // Leveraged — FAANG/Big Tech basket
  // ---------------------------------------------------------------------------
  { symbol: 'FNGU',  name: 'MicroSectors FANG+ Index 3X Leveraged ETN' },
  { symbol: 'FNGD',  name: 'MicroSectors FANG+ Index 3X Inverse Leveraged ETN' },

  // ---------------------------------------------------------------------------
  // Single-stock leveraged (popular)
  // ---------------------------------------------------------------------------
  { symbol: 'TSLL',  name: 'Direxion Daily TSLA Bull 2X ETF' },
  { symbol: 'NVDL',  name: 'GraniteShares 2x Long NVDA Daily ETF' },

  // ---------------------------------------------------------------------------
  // Bonds — Core
  // ---------------------------------------------------------------------------
  { symbol: 'AGG',   name: 'iShares Core US Aggregate Bond ETF' },
  { symbol: 'BND',   name: 'Vanguard Total Bond Market ETF' },
  { symbol: 'BNDX',  name: 'Vanguard Total International Bond ETF' },
  { symbol: 'BNDW',  name: 'Vanguard Total World Bond ETF' },

  // ---------------------------------------------------------------------------
  // Bonds — Treasuries
  // ---------------------------------------------------------------------------
  { symbol: 'TLT',   name: 'iShares 20+ Year Treasury Bond ETF' },
  { symbol: 'IEF',   name: 'iShares 7-10 Year Treasury Bond ETF' },
  { symbol: 'SHY',   name: 'iShares 1-3 Year Treasury Bond ETF' },
  { symbol: 'GOVT',  name: 'iShares US Treasury Bond ETF' },
  { symbol: 'VGLT',  name: 'Vanguard Long-Term Treasury ETF' },
  { symbol: 'VGIT',  name: 'Vanguard Intermediate-Term Treasury ETF' },
  { symbol: 'VGSH',  name: 'Vanguard Short-Term Treasury ETF' },
  { symbol: 'BIL',   name: 'SPDR Bloomberg 1-3 Month T-Bill ETF' },
  { symbol: 'SHV',   name: 'iShares Short Treasury Bond ETF' },
  { symbol: 'TLH',   name: 'iShares 10-20 Year Treasury Bond ETF' },
  { symbol: 'SPTL',  name: 'SPDR Portfolio Long Term Treasury ETF' },
  { symbol: 'SPTS',  name: 'SPDR Portfolio Short Term Treasury ETF' },

  // ---------------------------------------------------------------------------
  // Bonds — TIPS / Inflation
  // ---------------------------------------------------------------------------
  { symbol: 'TIP',   name: 'iShares TIPS Bond ETF' },
  { symbol: 'SCHP',  name: 'Schwab US TIPS ETF' },
  { symbol: 'VTIP',  name: 'Vanguard Short-Term Inflation-Protected Securities ETF' },
  { symbol: 'STIP',  name: 'iShares 0-5 Year TIPS Bond ETF' },

  // ---------------------------------------------------------------------------
  // Bonds — Corporate
  // ---------------------------------------------------------------------------
  { symbol: 'LQD',   name: 'iShares iBoxx Investment Grade Corporate Bond ETF' },
  { symbol: 'VCIT',  name: 'Vanguard Intermediate-Term Corporate Bond ETF' },
  { symbol: 'VCSH',  name: 'Vanguard Short-Term Corporate Bond ETF' },
  { symbol: 'IGSB',  name: 'iShares Short-Term Corporate Bond ETF' },

  // ---------------------------------------------------------------------------
  // Bonds — High Yield
  // ---------------------------------------------------------------------------
  { symbol: 'HYG',   name: 'iShares iBoxx High Yield Corporate Bond ETF' },
  { symbol: 'JNK',   name: 'SPDR Bloomberg High Yield Bond ETF' },

  // ---------------------------------------------------------------------------
  // Bonds — Municipal
  // ---------------------------------------------------------------------------
  { symbol: 'MUB',   name: 'iShares National Muni Bond ETF' },
  { symbol: 'VTEB',  name: 'Vanguard Tax-Exempt Bond ETF' },

  // ---------------------------------------------------------------------------
  // Bonds — Preferred / Emerging
  // ---------------------------------------------------------------------------
  { symbol: 'PFF',   name: 'iShares Preferred and Income Securities ETF' },
  { symbol: 'EMB',   name: 'iShares JP Morgan USD Emerging Markets Bond ETF' },

  // ---------------------------------------------------------------------------
  // International Developed — Broad
  // ---------------------------------------------------------------------------
  { symbol: 'VEA',   name: 'Vanguard FTSE Developed Markets ETF' },
  { symbol: 'EFA',   name: 'iShares MSCI EAFE ETF' },
  { symbol: 'IEFA',  name: 'iShares Core MSCI EAFE ETF' },
  { symbol: 'SCHF',  name: 'Schwab International Equity ETF' },
  { symbol: 'SPDW',  name: 'SPDR Portfolio Developed World ex-US ETF' },
  { symbol: 'VXUS',  name: 'Vanguard Total International Stock ETF' },
  { symbol: 'IXUS',  name: 'iShares Core MSCI Total International Stock ETF' },
  { symbol: 'IDEV',  name: 'iShares Core MSCI International Developed Markets ETF' },

  // ---------------------------------------------------------------------------
  // International Developed — Single Country
  // ---------------------------------------------------------------------------
  { symbol: 'EWJ',   name: 'iShares MSCI Japan ETF' },
  { symbol: 'EWG',   name: 'iShares MSCI Germany ETF' },
  { symbol: 'EWU',   name: 'iShares MSCI United Kingdom ETF' },
  { symbol: 'EWC',   name: 'iShares MSCI Canada ETF' },
  { symbol: 'EWA',   name: 'iShares MSCI Australia ETF' },
  { symbol: 'EWH',   name: 'iShares MSCI Hong Kong ETF' },
  { symbol: 'EWL',   name: 'iShares MSCI Switzerland ETF' },
  { symbol: 'EWP',   name: 'iShares MSCI Spain ETF' },
  { symbol: 'EWQ',   name: 'iShares MSCI France ETF' },
  { symbol: 'EWI',   name: 'iShares MSCI Italy ETF' },
  { symbol: 'EWN',   name: 'iShares MSCI Netherlands ETF' },
  { symbol: 'EWD',   name: 'iShares MSCI Sweden ETF' },
  { symbol: 'EWS',   name: 'iShares MSCI Singapore ETF' },
  { symbol: 'EWM',   name: 'iShares MSCI Malaysia ETF' },
  { symbol: 'EWW',   name: 'iShares MSCI Mexico ETF' },
  { symbol: 'EWY',   name: 'iShares MSCI South Korea ETF' },
  { symbol: 'EWT',   name: 'iShares MSCI Taiwan ETF' },
  { symbol: 'EWZ',   name: 'iShares MSCI Brazil ETF' },
  { symbol: 'EZA',   name: 'iShares MSCI South Africa ETF' },
  { symbol: 'EPOL',  name: 'iShares MSCI Poland ETF' },
  { symbol: 'EIDO',  name: 'iShares MSCI Indonesia ETF' },
  { symbol: 'EPHE',  name: 'iShares MSCI Philippines ETF' },
  { symbol: 'THD',   name: 'iShares MSCI Thailand ETF' },
  { symbol: 'TUR',   name: 'iShares MSCI Turkey ETF' },
  { symbol: 'GREK',  name: 'Global X MSCI Greece ETF' },

  // ---------------------------------------------------------------------------
  // Emerging Markets — Broad
  // ---------------------------------------------------------------------------
  { symbol: 'VWO',   name: 'Vanguard FTSE Emerging Markets ETF' },
  { symbol: 'EEM',   name: 'iShares MSCI Emerging Markets ETF' },
  { symbol: 'IEMG',  name: 'iShares Core MSCI Emerging Markets ETF' },
  { symbol: 'SCHE',  name: 'Schwab Emerging Markets Equity ETF' },
  { symbol: 'SPEM',  name: 'SPDR Portfolio Emerging Markets ETF' },

  // ---------------------------------------------------------------------------
  // Emerging Markets — China
  // ---------------------------------------------------------------------------
  { symbol: 'FXI',   name: 'iShares China Large-Cap ETF' },
  { symbol: 'MCHI',  name: 'iShares MSCI China ETF' },
  { symbol: 'KWEB',  name: 'KraneShares CSI China Internet ETF' },
  { symbol: 'CQQQ',  name: 'Invesco China Technology ETF' },
  { symbol: 'ASHR',  name: 'Xtrackers Harvest CSI 300 China A-Shares ETF' },
  { symbol: 'CXSE',  name: 'WisdomTree China ex-State-Owned Enterprises ETF' },
  { symbol: 'PGJ',   name: 'Invesco Golden Dragon China ETF' },

  // ---------------------------------------------------------------------------
  // Emerging Markets — India
  // ---------------------------------------------------------------------------
  { symbol: 'INDA',  name: 'iShares MSCI India ETF' },
  { symbol: 'INDY',  name: 'iShares India 50 ETF' },
  { symbol: 'SMIN',  name: 'iShares MSCI India Small-Cap ETF' },
  { symbol: 'EPI',   name: 'WisdomTree India Earnings ETF' },

  // ---------------------------------------------------------------------------
  // Emerging Markets — Latin America
  // ---------------------------------------------------------------------------
  { symbol: 'ILF',   name: 'iShares Latin America 40 ETF' },

  // ---------------------------------------------------------------------------
  // Commodities & Metals — Physical
  // ---------------------------------------------------------------------------
  { symbol: 'GLD',   name: 'SPDR Gold Shares ETF' },
  { symbol: 'IAU',   name: 'iShares Gold Trust ETF' },
  { symbol: 'SGOL',  name: 'Aberdeen Standard Physical Gold Shares ETF' },
  { symbol: 'GLDM',  name: 'SPDR Gold MiniShares ETF' },
  { symbol: 'SLV',   name: 'iShares Silver Trust ETF' },
  { symbol: 'SIVR',  name: 'Aberdeen Standard Physical Silver Shares ETF' },
  { symbol: 'PPLT',  name: 'Aberdeen Standard Physical Platinum Shares ETF' },
  { symbol: 'PALL',  name: 'Aberdeen Standard Physical Palladium Shares ETF' },

  // ---------------------------------------------------------------------------
  // Commodities — Energy
  // ---------------------------------------------------------------------------
  { symbol: 'USO',   name: 'United States Oil Fund ETF' },
  { symbol: 'BNO',   name: 'United States Brent Oil Fund ETF' },
  { symbol: 'UNG',   name: 'United States Natural Gas Fund ETF' },
  { symbol: 'UGA',   name: 'United States Gasoline Fund ETF' },

  // ---------------------------------------------------------------------------
  // Commodities — Broad Baskets
  // ---------------------------------------------------------------------------
  { symbol: 'DBC',   name: 'Invesco DB Commodity Index Tracking Fund' },
  { symbol: 'PDBC',  name: 'Invesco Optimum Yield Diversified Commodity Strategy ETF' },
  { symbol: 'GSG',   name: 'iShares S&P GSCI Commodity-Indexed Trust ETF' },
  { symbol: 'COMT',  name: 'iShares GSCI Commodity Dynamic Roll Strategy ETF' },
  { symbol: 'DJP',   name: 'iPath Bloomberg Commodity Index Total Return ETN' },
  { symbol: 'FTGC',  name: 'First Trust Global Tactical Commodity Strategy Fund' },

  // ---------------------------------------------------------------------------
  // Commodities — Copper / Grains
  // ---------------------------------------------------------------------------
  { symbol: 'CPER',  name: 'United States Copper Index Fund ETF' },
  { symbol: 'WEAT',  name: 'Teucrium Wheat Fund ETF' },
  { symbol: 'CORN',  name: 'Teucrium Corn Fund ETF' },
  { symbol: 'SOYB',  name: 'Teucrium Soybean Fund ETF' },

  // ---------------------------------------------------------------------------
  // Dividend & Income
  // ---------------------------------------------------------------------------
  { symbol: 'SCHD',  name: 'Schwab US Dividend Equity ETF' },
  { symbol: 'VYM',   name: 'Vanguard High Dividend Yield ETF' },
  { symbol: 'VIG',   name: 'Vanguard Dividend Appreciation ETF' },
  { symbol: 'DGRO',  name: 'iShares Core Dividend Growth ETF' },
  { symbol: 'DVY',   name: 'iShares Select Dividend ETF' },
  { symbol: 'SDY',   name: 'SPDR S&P Dividend ETF' },
  { symbol: 'HDV',   name: 'iShares Core High Dividend ETF' },
  { symbol: 'NOBL',  name: 'ProShares S&P 500 Dividend Aristocrats ETF' },
  { symbol: 'DGRW',  name: 'WisdomTree US Quality Dividend Growth ETF' },
  { symbol: 'VYMI',  name: 'Vanguard International High Dividend Yield ETF' },
  { symbol: 'SPHD',  name: 'Invesco S&P 500 High Dividend Low Volatility ETF' },

  // ---------------------------------------------------------------------------
  // Factor / Smart Beta
  // ---------------------------------------------------------------------------
  { symbol: 'MTUM',  name: 'iShares MSCI USA Momentum Factor ETF' },
  { symbol: 'QUAL',  name: 'iShares MSCI USA Quality Factor ETF' },
  { symbol: 'USMV',  name: 'iShares MSCI USA Min Vol Factor ETF' },
  { symbol: 'VLUE',  name: 'iShares MSCI USA Value Factor ETF' },
  { symbol: 'SIZE',  name: 'iShares MSCI USA Size Factor ETF' },
  { symbol: 'SPLV',  name: 'Invesco S&P 500 Low Volatility ETF' },
  { symbol: 'EFAV',  name: 'iShares MSCI EAFE Min Vol Factor ETF' },
  { symbol: 'ACWV',  name: 'iShares MSCI All Country World Min Vol Factor ETF' },
  { symbol: 'FNDX',  name: 'Schwab Fundamental US Large Company Index ETF' },
  { symbol: 'FNDA',  name: 'Schwab Fundamental US Small Company Index ETF' },

  // ---------------------------------------------------------------------------
  // Growth vs Value
  // ---------------------------------------------------------------------------
  { symbol: 'VTV',   name: 'Vanguard Value ETF' },
  { symbol: 'VUG',   name: 'Vanguard Growth ETF' },
  { symbol: 'IWF',   name: 'iShares Russell 1000 Growth ETF' },
  { symbol: 'IWD',   name: 'iShares Russell 1000 Value ETF' },
  { symbol: 'IVW',   name: 'iShares S&P 500 Growth ETF' },
  { symbol: 'IVE',   name: 'iShares S&P 500 Value ETF' },
  { symbol: 'MGK',   name: 'Vanguard Mega Cap Growth ETF' },
  { symbol: 'MGV',   name: 'Vanguard Mega Cap Value ETF' },

  // ---------------------------------------------------------------------------
  // ARK Invest & Thematic
  // ---------------------------------------------------------------------------
  { symbol: 'ARKK',  name: 'ARK Innovation ETF' },
  { symbol: 'ARKG',  name: 'ARK Genomic Revolution ETF' },
  { symbol: 'ARKW',  name: 'ARK Next Generation Internet ETF' },
  { symbol: 'ARKQ',  name: 'ARK Autonomous Technology & Robotics ETF' },
  { symbol: 'ARKX',  name: 'ARK Space Exploration & Innovation ETF' },

  // ---------------------------------------------------------------------------
  // IPO / Innovation
  // ---------------------------------------------------------------------------
  { symbol: 'MOON',  name: 'Direxion Moonshots Innovation ETF' },
  { symbol: 'IPO',   name: 'Renaissance IPO ETF' },
  { symbol: 'XT',    name: 'iShares Exponential Technologies ETF' },
  { symbol: 'QQQJ',  name: 'Invesco NASDAQ Next Gen 100 ETF' },

  // ---------------------------------------------------------------------------
  // ESG
  // ---------------------------------------------------------------------------
  { symbol: 'ESGU',  name: 'iShares MSCI USA ESG Optimized ETF' },
  { symbol: 'ESGV',  name: 'Vanguard ESG US Stock ETF' },
];

/**
 * Search the static ETF list.
 * Priority: exact symbol match → symbol prefix → name prefix → name substring.
 * Case-insensitive. Returns up to `limit` results.
 */
export function searchEtfs(query: string, limit = 8): EtfEntry[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];

  const qLower = q.toLowerCase();

  const exactSymbol: EtfEntry[] = [];
  const prefixSymbol: EtfEntry[] = [];
  const prefixName: EtfEntry[] = [];
  const substringName: EtfEntry[] = [];

  for (const etf of ETF_LIST) {
    const symUpper = etf.symbol.toUpperCase();
    const nameLower = etf.name.toLowerCase();

    if (symUpper === q) {
      exactSymbol.push(etf);
    } else if (symUpper.startsWith(q)) {
      prefixSymbol.push(etf);
    } else if (nameLower.startsWith(qLower)) {
      prefixName.push(etf);
    } else if (nameLower.includes(qLower)) {
      substringName.push(etf);
    }
  }

  return [...exactSymbol, ...prefixSymbol, ...prefixName, ...substringName].slice(0, limit);
}
