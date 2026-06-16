// ============================================================
// src/pages/app/crypto/_shared/types.ts
// Crypto-specific TypeScript interfaces
// ============================================================

export interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number | null;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number | null;
  low_24h: number | null;
  price_change_24h: number | null;
  price_change_percentage_24h: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  market_cap_change_24h: number | null;
  market_cap_change_percentage_24h: number | null;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number | null;
  ath_date: string | null;
  atl: number;
  atl_change_percentage: number | null;
  sparkline_in_7d?: { price: number[] };
}

export interface GlobalMarketData {
  data: {
    active_cryptocurrencies: number;
    total_market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    market_cap_percentage: Record<string, number>;
    market_cap_change_percentage_24h_usd: number;
  };
}

export interface TrendingCoin {
  item: {
    id: string;
    coin_id: number;
    name: string;
    symbol: string;
    market_cap_rank: number;
    thumb: string;
    small: string;
    large: string;
    slug: string;
    price_btc: number;
    score: number;
  };
}

export interface FearGreedData {
  value: number;
  value_classification: string;
  timestamp: string;
}

export interface FundingRateData {
  symbol: string;
  fundingRate: number;
  fundingTime: number;
  markPrice?: number;
}

export interface CategoryData {
  id: string;
  name: string;
  market_cap: number;
  market_cap_change_24h: number | null;
  volume_24h: number;
  top_3_coins?: string[];
  updated_at?: string;
}

export interface ExchangeData {
  id: string;
  name: string;
  image: string;
  year_established: number | null;
  country: string | null;
  url: string;
  trust_score: number;
  trust_score_rank: number;
  trade_volume_24h_btc: number;
  trade_volume_24h_btc_normalized?: number;
}

export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalSignal {
  id: string;
  signal: 'bullish' | 'bearish' | 'neutral' | 'strong_bullish' | 'strong_bearish';
  label: string;
  value: string;
  description: string;
  icon: string;
}

// ── Whale Trades ─────────────────────────────────────────────
export type WhaleSide = 'buy' | 'sell';

export interface WhaleTrade {
  id: string;            // `${market}:${symbol}:${aggTradeId}`
  symbol: string;
  market: 'spot' | 'futures';
  side: WhaleSide;
  price: number;
  qty: number;
  notionalUsd: number;
  tier: string;          // 'large' | 'huge' | 'mega'
  thresholdUsd?: number;
  aggTradeId: number;
  tradedAt: string;      // ISO
}

export type WhaleStreamEvent = { type: 'trade'; data: WhaleTrade };

// ── Derivatives ──────────────────────────────────────────────
export interface DerivativeAsset {
  base: string;
  total_open_interest_usd: number;
  avg_funding_rate: number | null;
  total_volume_24h: number;
  market_count: number;
  liquidation_risk: 'extreme_long' | 'extreme_short' | 'moderate' | 'neutral' | null;
}

export interface DerivativesTotals {
  total_open_interest_usd: number;
  avg_funding_rate: number | null;
  total_volume_24h: number;
  asset_count: number;
}

export interface EstimatedLiquidations {
  /** Always true — signals this is a risk-tier proxy, not real liquidation data */
  estimated: true;
  note: string;
  methodology: string;
  elevated_long_squeeze_risk: string[];
  elevated_short_squeeze_risk: string[];
  moderate_risk: string[];
}

/** Shape returned by fetchDerivatives() (after unwrapping `.data`) */
export interface DerivativesPayload {
  assets: DerivativeAsset[];
  totals: DerivativesTotals;
  estimatedLiquidations: EstimatedLiquidations;
}

// ── Treasury ──────────────────────────────────────────────────
export interface TreasuryCompany {
  name: string;
  symbol: string;
  country: string | null;
  total_holdings: number | null;
  total_entry_value_usd: number | null;
  total_current_value_usd: number | null;
  percentage_of_total_supply: number | null;
}

export interface TreasuryAsset {
  total_holdings: number | null;
  total_value_usd: number | null;
  market_cap_dominance: number | null;
  companies: TreasuryCompany[];
}

/** Shape returned by fetchTreasury() (bare response, no outer `data` key) */
export interface TreasuryPayload {
  bitcoin: TreasuryAsset;
  ethereum: TreasuryAsset;
  ts: number;
}

// ── On-Chain ──────────────────────────────────────────────────
export interface DefiChain {
  name: string;
  tvl: number;
  tokenSymbol: string | null;
  cmcId: string | null;
  gecko_id: string | null;
}

export interface ProtocolFee {
  name: string;
  slug: string;
  fees_24h: number | null;
  revenue_24h: number | null;
  chains: string[];
  category: string | null;
}

export interface StablecoinSupplySummary {
  total_circulating_usd: number;
  change_24h_pct: number | null;
  top_count: number;
}

/** Shape returned by fetchOnChain() (after unwrapping `.data`) */
export interface OnChainPayload {
  chains: DefiChain[];
  fees: ProtocolFee[];
  stablecoinSupply: StablecoinSupplySummary;
  ts: number;
}

// ── Order Book Walls ──────────────────────────────────────────
export interface OrderWall {
  symbol: string;
  side: 'bid' | 'ask';
  price: number;
  qty: number;
  notionalUsd: number;
  distancePct: number | null;
  midPrice: number | null;
  capturedAt: string;
}

export interface SymbolWalls {
  symbol: string;
  midPrice: number | null;
  bids: OrderWall[];
  asks: OrderWall[];
}
