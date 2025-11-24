// src/types/brokers/tradovate/tradovate.types.ts

export interface TradovateCredentials {
  username: string;
  password: string;
  deviceId?: string;
  cid?: number;
  sec?: string;
}

export interface TradovateAuthResponse {
  accessToken: string;
  userId: number;
  userName: string;
  name: string;
  expirationTime: string;
  passwordExpirationTime: string;
  userStatus: string;
  userType: string;
  p_a_l: string;
  p_t: string;
  p_m: string;
  p_d: string;
  p_r: string;
  p_s: string;
  p_s_l: string;
  p_w: string;
  p_w_l: string;
}

export interface TradovateAccount {
  id: number;
  name: string;
  userId: number;
  accountType: 'Customer' | 'Demo';
  active: boolean;
  clearingHouseId: number;
  riskCategoryId: number;
  autoLiqProfileId: number;
  marginAccountType: string;
  legalStatus: string;
  archived: boolean;
  timestamp: string;
}

export interface TradovatePosition {
  id: number;
  accountId: number;
  contractId: number;
  timestamp: string;
  netPos: number;
  netPrice: number;
  bought: number;
  boughtValue: number;
  sold: number;
  soldValue: number;
  prevPos: number;
  prevPrice: number;
}

export interface TradovateContract {
  id: number;
  name: string;
  contractMaturityId: number;
  status: string;
  timestamp: string;
  productId: number;
  maturityDate: string;
}

export interface TradovateProduct {
  id: number;
  name: string;
  description: string;
  exchangeId: number;
  productType: 'Futures' | 'Options';
  months: string;
  priceFormat: string;
  priceFormatType: string;
  valuePerPoint: number;
  tickSize: number;
  currency: string;
}

export interface TradovateFill {
  id: number;
  orderId: number;
  contractId: number;
  timestamp: string;
  tradeDate: {
    year: number;
    month: number;
    day: number;
  };
  action: 'Buy' | 'Sell';
  qty: number;
  price: number;
  active: boolean;
  finallyPaired: boolean;
}

export interface TradovateOrder {
  id: number;
  accountId: number;
  contractId: number;
  timestamp: string;
  orderType: string;
  orderStatus: string;
  action: 'Buy' | 'Sell';
  ordQty: number;
  filledQty: number;
  remainingQty: number;
  avgFillPrice?: number;
}

export interface TradovateCashBalance {
  id: number;
  accountId: number;
  timestamp: string;
  tradeDate: {
    year: number;
    month: number;
    day: number;
  };
  currency: string;
  amount: number;
  realizedPnL: number;
  weekRealizedPnL: number;
  openPnL: number;
}

export interface TradovateMarginSnapshot {
  id: number;
  accountId: number;
  timestamp: string;
  tradeDate: {
    year: number;
    month: number;
    day: number;
  };
  initialMargin: number;
  maintenanceMargin: number;
  cashBalance: number;
  openPnL: number;
  marginExcess: number;
  marginBalance: number;
}

export interface TradovateWebSocketMessage {
  e: string; // event type
  d: any; // data
}

export interface TradovateError {
  errorCode?: string;
  errorText: string;
  s?: number; // status code
}

export type TradovateEventType = 
  | 'props'
  | 'quote'
  | 'dom'
  | 'chart'
  | 'fill'
  | 'order'
  | 'position'
  | 'cashBalance'
  | 'marginSnapshot';