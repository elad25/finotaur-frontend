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
