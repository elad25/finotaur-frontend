export interface FuturesContract {
  symbol: string;
  name: string;
  group: 'Equity Index' | 'Rates' | 'FX' | 'Energy' | 'Metals' | 'Agriculture';
  exchange: string;
  contractSize: string;
  tickSize: string;
  tickValue: number;
  micro?: string;
  mainUse: string;
  riskNote: string;
}

export const futuresContracts: FuturesContract[] = [
  {
    symbol: 'ES',
    name: 'E-mini S&P 500',
    group: 'Equity Index',
    exchange: 'CME',
    contractSize: '$50 x S&P 500 index',
    tickSize: '0.25 index points',
    tickValue: 12.5,
    micro: 'MES',
    mainUse: 'Large-cap US equity beta',
    riskNote: 'High liquidity, event-sensitive around CPI, FOMC, NFP, and cash open.',
  },
  {
    symbol: 'NQ',
    name: 'E-mini Nasdaq-100',
    group: 'Equity Index',
    exchange: 'CME',
    contractSize: '$20 x Nasdaq-100 index',
    tickSize: '0.25 index points',
    tickValue: 5,
    micro: 'MNQ',
    mainUse: 'Growth and mega-cap tech beta',
    riskNote: 'Usually faster than ES; smaller index moves can still create wide dollar swings.',
  },
  {
    symbol: 'RTY',
    name: 'E-mini Russell 2000',
    group: 'Equity Index',
    exchange: 'CME',
    contractSize: '$50 x Russell 2000 index',
    tickSize: '0.10 index points',
    tickValue: 5,
    micro: 'M2K',
    mainUse: 'Small-cap and domestic-cycle beta',
    riskNote: 'Liquidity thins outside US hours; watch rates and regional-bank headlines.',
  },
  {
    symbol: 'YM',
    name: 'E-mini Dow',
    group: 'Equity Index',
    exchange: 'CBOT',
    contractSize: '$5 x Dow Jones Industrial Average',
    tickSize: '1 index point',
    tickValue: 5,
    micro: 'MYM',
    mainUse: 'Blue-chip industrial beta',
    riskNote: 'Lower point granularity, but headline gaps still matter around macro releases.',
  },
  {
    symbol: 'ZN',
    name: '10-Year Treasury Note',
    group: 'Rates',
    exchange: 'CBOT',
    contractSize: '$100,000 face value',
    tickSize: '1/64 of a point',
    tickValue: 15.625,
    mainUse: 'US duration and yield expectations',
    riskNote: 'Quotes use bond fractions; traders must convert ticks carefully before sizing.',
  },
  {
    symbol: '6E',
    name: 'Euro FX',
    group: 'FX',
    exchange: 'CME',
    contractSize: 'EUR 125,000',
    tickSize: '0.00005 USD per EUR',
    tickValue: 6.25,
    micro: 'M6E',
    mainUse: 'EUR/USD exposure through futures',
    riskNote: 'Central-bank language and dollar liquidity drive most large moves.',
  },
  {
    symbol: 'CL',
    name: 'WTI Crude Oil',
    group: 'Energy',
    exchange: 'NYMEX',
    contractSize: '1,000 barrels',
    tickSize: '$0.01 per barrel',
    tickValue: 10,
    micro: 'MCL',
    mainUse: 'US crude oil exposure',
    riskNote: 'Inventory data, OPEC headlines, and rollover can dominate intraday structure.',
  },
  {
    symbol: 'GC',
    name: 'Gold',
    group: 'Metals',
    exchange: 'COMEX',
    contractSize: '100 troy ounces',
    tickSize: '$0.10 per ounce',
    tickValue: 10,
    micro: 'MGC',
    mainUse: 'Real-yield, dollar, and safe-haven exposure',
    riskNote: 'Sensitive to real yields and USD; watch liquidity during Asia/Europe handoff.',
  },
  {
    symbol: 'SI',
    name: 'Silver',
    group: 'Metals',
    exchange: 'COMEX',
    contractSize: '5,000 troy ounces',
    tickSize: '$0.005 per ounce',
    tickValue: 25,
    micro: 'SIL',
    mainUse: 'Precious/industrial metal hybrid',
    riskNote: 'Bigger tick value and thinner liquidity make sizing discipline critical.',
  },
  {
    symbol: 'ZS',
    name: 'Soybeans',
    group: 'Agriculture',
    exchange: 'CBOT',
    contractSize: '5,000 bushels',
    tickSize: '0.25 cents per bushel',
    tickValue: 12.5,
    mainUse: 'Crop, weather, and export-demand exposure',
    riskNote: 'Seasonal reports and weather shifts can gap the market outside equity hours.',
  },
];

export const marketGroups = [
  {
    title: 'Equity Index',
    focus: 'ES, NQ, RTY, YM',
    driver: 'Risk appetite, rates, earnings breadth, volatility regime.',
  },
  {
    title: 'Rates',
    focus: 'ZN, ZB, ZF, GE',
    driver: 'Fed path, Treasury supply, inflation surprises, growth risk.',
  },
  {
    title: 'FX Futures',
    focus: '6E, 6J, 6B, 6A, 6C',
    driver: 'Rate differentials, dollar liquidity, central-bank divergence.',
  },
  {
    title: 'Energy',
    focus: 'CL, NG, RB, HO',
    driver: 'Inventories, OPEC policy, refining spreads, geopolitics.',
  },
  {
    title: 'Metals',
    focus: 'GC, SI, HG, PL',
    driver: 'Real yields, USD, industrial demand, risk hedging.',
  },
  {
    title: 'Agriculture',
    focus: 'ZS, ZW, ZC, LE, HE',
    driver: 'Weather, crop reports, exports, storage and seasonal demand.',
  },
];

export const curvePlaybooks = [
  {
    title: 'Contango',
    shape: 'Later contracts trade above front contracts.',
    read: 'Often reflects storage, financing, insurance, or abundant near-term supply.',
    watch: 'Energy and metals traders watch whether contango steepens or collapses.',
  },
  {
    title: 'Backwardation',
    shape: 'Front contracts trade above later contracts.',
    read: 'Often signals tight nearby supply or high convenience yield.',
    watch: 'A strong backwardation can pressure short carry trades and reward long rolls.',
  },
  {
    title: 'Calendar Spread',
    shape: 'Long one delivery month, short another.',
    read: 'Isolates term-structure change instead of outright market direction.',
    watch: 'Useful when the question is supply timing, not bullish vs bearish price.',
  },
  {
    title: 'Rollover Risk',
    shape: 'Liquidity migrates from expiring month to next active month.',
    read: 'Charts and volume can become misleading if the active contract changes.',
    watch: 'Avoid treating a rollover gap as a clean technical breakout.',
  },
];

export const positioningFramework = [
  {
    label: 'Commercials',
    role: 'Hedgers tied to real production or consumption.',
    interpretation: 'Often contrarian at extremes, but not a precise timing signal.',
  },
  {
    label: 'Managed Money',
    role: 'Trend-following funds, CTAs, and macro funds.',
    interpretation: 'Crowded positions can accelerate trends and reversals.',
  },
  {
    label: 'Dealers / Other Reportables',
    role: 'Liquidity providers and larger non-commercial participants.',
    interpretation: 'Useful for understanding who absorbs risk when trends extend.',
  },
];

export const regimeChecklist = [
  'Which contract is the active front month?',
  'Is the move directional, curve-driven, or rollover-driven?',
  'Is today a macro-release session or a normal liquidity session?',
  'Does the tick value fit the planned stop distance?',
  'Is positioning crowded enough to make squeezes more likely?',
];

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}
