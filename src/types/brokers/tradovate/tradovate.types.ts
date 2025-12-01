// src/types/brokers/tradovate/tradovate.types.ts
// 🎯 V3.0 - Complete types with API URLs (NO DUPLICATES)

// ============================================================================
// ENVIRONMENT & API URLS
// ============================================================================

export type TradovateEnvironment = 'demo' | 'live';

export interface TradovateApiUrls {
  demo: string;
  live: string;
}

export const TRADOVATE_API_URLS: TradovateApiUrls = {
  demo: 'https://demo.tradovateapi.com/v1',
  live: 'https://live.tradovateapi.com/v1'
};

export const TRADOVATE_WS_URLS: TradovateApiUrls = {
  demo: 'wss://demo.tradovateapi.com/v1/websocket',
  live: 'wss://live.tradovateapi.com/v1/websocket'
};

export const TRADOVATE_MD_WS_URLS: TradovateApiUrls = {
  demo: 'wss://md.tradovateapi.com/v1/websocket',
  live: 'wss://md.tradovateapi.com/v1/websocket'
};

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface TradovateCredentials {
  username: string;
  password: string;
  deviceId?: string;
  cid?: number;      // Client ID (optional for some accounts)
  sec?: string;      // Secret (optional for some accounts)
}

export interface TradovateAuthResponse {
  // Core auth fields
  accessToken: string;
  mdAccessToken?: string;       // Market data access token
  expirationTime: string;
  passwordExpirationTime: string;
  
  // User info
  userId: number;
  userName: string;
  name: string;
  userStatus: 'Active' | 'Inactive' | 'Locked' | 'Closed';
  userType: string;
  
  // Permissions (p_ fields)
  p_a_l: string;   // Account list permission
  p_t: string;     // Trade permission
  p_m: string;     // Market data permission
  p_d: string;     // DOM permission
  p_r: string;     // Research permission
  p_s: string;     // Sim trading permission
  p_s_l: string;   // Sim trading list permission
  p_w: string;     // Web trading permission
  p_w_l: string;   // Web trading list permission
  
  // MFA Support
  mfaRequired?: boolean;
  mfaToken?: string;
  mfaChallengeType?: 'email' | 'sms' | 'totp';
  
  // Error handling
  errorText?: string;
  errorCode?: string;
}

export interface TradovateMfaRequest {
  mfaToken: string;
  code: string;
  deviceId: string;
}

// ============================================================================
// ACCOUNT TYPES
// ============================================================================

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
  
  // Additional fields
  nickname?: string;
  readonly?: boolean;
  disabled?: boolean;
}

export interface TradovateAccountRiskStatus {
  id: number;
  accountId: number;
  adminAction: string;
  adminTimestamp: string;
  autoLiqStatus: string;
  disabled: boolean;
  marginCallDisabled: boolean;
  userTriggeredAutoLiq: boolean;
}

// ============================================================================
// POSITION TYPES
// ============================================================================

export interface TradovatePosition {
  id: number;
  accountId: number;
  contractId: number;
  timestamp: string;
  
  // Position data
  netPos: number;
  netPrice: number;
  bought: number;
  boughtValue: number;
  sold: number;
  soldValue: number;
  prevPos: number;
  prevPrice: number;
  
  // P&L fields (when available)
  openPL?: number;
  realizedPL?: number;
  
  // Margin info
  marginUsed?: number;
}

// ============================================================================
// CONTRACT & PRODUCT TYPES
// ============================================================================

export interface TradovateContract {
  id: number;
  name: string;
  contractMaturityId: number;
  status: 'Trading' | 'Expired' | 'Suspended';
  timestamp: string;
  productId: number;
  
  // Additional fields
  providerTickerCode?: string;
  isFront?: boolean;
  firstIntentDate?: string;
  lastTradingDate?: string;
}

export interface TradovateContractMaturity {
  id: number;
  productId: number;
  expirationDate: string;
  expirationMonth: number;
  expirationYear: number;
  isFront: boolean;
}

export interface TradovateProduct {
  id: number;
  name: string;
  description: string;
  exchangeId: number;
  productType: 'Futures' | 'Options' | 'CommonStock';
  months: string;        // e.g., "HMUZ" for quarterly
  priceFormat: string;
  priceFormatType: string;
  tickSize: number;
  valuePerPoint: number; // This is the multiplier!
  currency: string;
  
  // Additional fields
  status?: 'Active' | 'Inactive';
  riskDiscountContractGroupId?: number;
  allowProviderContractInfo?: boolean;
  
  // Trading hours
  marketOpenTime?: string;
  marketCloseTime?: string;
  
  // Margin info
  initialMargin?: number;
  maintenanceMargin?: number;
}

export interface TradovateExchange {
  id: number;
  name: string;
  timezone: string;
}

// ============================================================================
// FILL (TRADE) TYPES
// ============================================================================

export interface TradovateFill {
  id: number;
  orderId: number;
  contractId: number;
  timestamp: string;
  tradeDate: TradovateTradeDate;
  action: 'Buy' | 'Sell';
  qty: number;
  price: number;
  active: boolean;
  finallyPaired: boolean;
  
  // Additional fields
  accountId?: number;
  commandId?: number;
  fillPair?: number;     // ID of the paired fill
  executionType?: 'Fill' | 'PartialFill';
  
  // Fee information
  filledQty?: number;
  commission?: number;
  exchangeFee?: number;
  nfaFee?: number;
  clearingFee?: number;
}

export interface TradovateTradeDate {
  year: number;
  month: number;
  day: number;
}

// ============================================================================
// ORDER TYPES
// ============================================================================

export interface TradovateOrder {
  id: number;
  accountId: number;
  contractId: number;
  timestamp: string;
  
  // Order details
  orderType: TradovateOrderType;
  orderStatus: TradovateOrderStatus;
  action: 'Buy' | 'Sell';
  
  // Quantities
  ordQty: number;
  filledQty: number;
  remainingQty: number;
  
  // Prices
  avgFillPrice?: number;
  price?: number;          // Limit price
  stopPrice?: number;      // Stop trigger price
  
  // Additional fields
  commandId?: number;
  text?: string;           // Order text/label
  activationTime?: string;
  expirationTime?: string;
  
  // Bracket order info
  ocoId?: number;
  parentId?: number;
  linkedId?: number;
  
  // Flags
  isAutomated?: boolean;
  isLiquidation?: boolean;
  
  // Execution report
  execInst?: string;
  timeInForce?: TradovateTimeInForce;
}

export type TradovateOrderType = 
  | 'Market'
  | 'Limit'
  | 'Stop'
  | 'StopLimit'
  | 'TrailingStop'
  | 'TrailingStopLimit'
  | 'MIT';

export type TradovateOrderStatus = 
  | 'PendingNew'
  | 'Accepted'
  | 'Working'
  | 'Filled'
  | 'Cancelled'
  | 'Expired'
  | 'Rejected'
  | 'PendingReplace'
  | 'PendingCancel';

export type TradovateTimeInForce = 
  | 'Day'
  | 'GTC'        // Good til cancelled
  | 'GTD'        // Good til date
  | 'IOC'        // Immediate or cancel
  | 'FOK';       // Fill or kill

// ============================================================================
// CASH BALANCE TYPES
// ============================================================================

export interface TradovateCashBalance {
  id: number;
  accountId: number;
  timestamp: string;
  tradeDate: TradovateTradeDate;
  currency: string;
  amount: number;           // Account balance
  realizedPnL: number;      // Today's realized P&L
  weekRealizedPnL: number;  // Week's realized P&L
  openPnL: number;          // Unrealized P&L
  
  // Additional fields
  todayPnL?: number;
  prevDayBalance?: number;
}

// ============================================================================
// MARGIN TYPES
// ============================================================================

export interface TradovateMarginSnapshot {
  id: number;
  accountId: number;
  timestamp: string;
  tradeDate: TradovateTradeDate;
  
  // Margin amounts
  initialMargin: number;
  maintenanceMargin: number;
  
  // Balances
  cashBalance: number;
  openPnL: number;
  marginExcess: number;      // Available margin
  marginBalance: number;
  
  // Additional fields
  riskLevel?: 'Normal' | 'Warning' | 'Critical';
  liquidationPrice?: number;
  
  // Buying power
  buyingPower?: number;
  netLiq?: number;           // Net liquidation value
}

// ============================================================================
// WEBSOCKET TYPES
// ============================================================================

export interface TradovateWebSocketMessage {
  e: string;    // Event type
  d: any;       // Data payload
  i?: number;   // Message ID
  s?: number;   // Status code
}

export type TradovateEventType = 
  | 'props'          // Property updates
  | 'quote'          // Market quotes
  | 'dom'            // Depth of market
  | 'chart'          // Chart data
  | 'fill'           // Fill notifications
  | 'order'          // Order updates
  | 'position'       // Position changes
  | 'cashBalance'    // Cash balance updates
  | 'marginSnapshot' // Margin updates
  | 'clock'          // Server time
  | 'userSync';      // User data sync

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface TradovateError {
  errorCode?: string;
  errorText: string;
  s?: number;          // Status code
  i?: number;          // Request ID
  
  // Additional error info
  fieldName?: string;  // Which field caused the error
  details?: string;    // Additional details
}

// Common error codes
export enum TradovateErrorCode {
  INVALID_CREDENTIALS = 'InvalidCredentials',
  MFA_REQUIRED = 'MfaRequired',
  SESSION_EXPIRED = 'SessionExpired',
  RATE_LIMITED = 'RateLimited',
  MAINTENANCE = 'Maintenance',
  ACCOUNT_LOCKED = 'AccountLocked',
  INSUFFICIENT_MARGIN = 'InsufficientMargin',
  POSITION_LIMIT = 'PositionLimit',
  ORDER_REJECTED = 'OrderRejected',
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface TradovateApiResponse<T> {
  data: T;
  status: number;
  requestId?: string;
}

export interface TradovateListResponse<T> {
  items: T[];
  count: number;
  hasMore: boolean;
}