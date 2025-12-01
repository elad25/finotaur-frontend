/**
 * SnapTrade TypeScript Type Definitions
 * Complete type definitions for SnapTrade API
 */

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export interface SnapTradeUser {
  userId: string;
  userSecret: string;
  createdDate?: string;
}

export interface RegisterUserRequest {
  userId: string;
  rsaPublicKey?: string;
}

// ============================================================================
// CONNECTIONS & AUTHORIZATION
// ============================================================================

export interface BrokerageConnection {
  id: string;
  brokerage: Brokerage;
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  createdDate: string;
  lastSyncDate?: string;
  error?: string;
}

export interface AuthorizationUrl {
  redirectURI: string;
  sessionId?: string;
}

export interface GetAuthUrlRequest {
  userId: string;
  userSecret: string;
  broker: string;
  immediateRedirect?: boolean;
  customRedirect?: string;
  reconnect?: string;
  connectionType?: 'read' | 'trade';
  connectionPortalVersion?: 'v2' | 'v3' | 'v4';
}

// ============================================================================
// BROKERAGES
// ============================================================================

export interface Brokerage {
  id: string;
  name: string;
  slug: string;
  displayName: string;
  description?: string;
  logoUrl?: string;
  enabled: boolean;
  maintenanceMode: boolean;
  allowsFractionalUnits: boolean;
  allowsTrading: boolean;
  hasReporting: boolean;
  isRealTimeConnection: boolean;
  authType?: 'OAUTH' | 'SCRAPE' | 'OAUTH_PIN';
}

export interface BrokerageAuthType {
  type: string;
  authUrl?: string;
}

// ============================================================================
// ACCOUNTS
// ============================================================================

export interface Account {
  id: string;
  brokerage_authorization?: string;
  portfolioGroup?: string;
  name: string;
  number: string;
  institutionName: string;
  type?: AccountType;
  balance?: AccountBalance;
  meta?: Record<string, any>;
  createdDate?: string;
  syncStatus?: SyncStatus;
}

export interface AccountBalance {
  total?: Balance;
  cash?: Balance;
  securities?: Balance;
}

export interface Balance {
  amount?: number;
  currency?: Currency;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
}

export interface SyncStatus {
  lastSuccessfulSync?: string;
  firstSync?: string;
  lastSync?: string;
  status?: 'SYNCING' | 'SYNCED' | 'ERROR';
}

export type AccountType = 
  | 'CASH'
  | 'MARGIN'
  | 'TFSA'
  | 'RRSP'
  | 'RRIF'
  | 'RESP'
  | 'LIRA'
  | 'LRSP'
  | 'LRIF'
  | 'RIF'
  | 'IRA'
  | 'ROTH_IRA'
  | '401K'
  | 'TRUST'
  | 'INVESTMENT'
  | 'PENSION'
  | 'FIXED_ANNUITY';

// ============================================================================
// HOLDINGS & POSITIONS
// ============================================================================

export interface Position {
  symbol: Security;
  units: number;
  price?: number;
  open_pnl?: number;
  fractional_units?: number;
  average_purchase_price?: number;
}

export interface AccountHoldings {
  account: Account;
  positions: Position[];
}

export interface Security {
  id: string;
  symbol: string;
  raw_symbol?: string;
  description?: string;
  currency: Currency;
  exchange?: Exchange;
  type: SecurityType;
  is_quotable?: boolean;
  figi_code?: string;
  figi_instrument?: FigiInstrument;
}

export interface Exchange {
  id: string;
  code: string;
  mic_code?: string;
  name: string;
  timezone?: string;
  start_time?: string;
  close_time?: string;
  suffix?: string;
}

export type SecurityType = 
  | 'cs'  // Common Stock
  | 'et'  // ETF
  | 'ps'  // Preferred Stock
  | 'mf'  // Mutual Fund
  | 'bond'
  | 'option'
  | 'future'
  | 'forex'
  | 'crypto'
  | 'index';

export interface FigiInstrument {
  figi_code?: string;
  figi_share_class?: string;
}

// ============================================================================
// ORDERS & TRADING
// ============================================================================

export interface Order {
  id: string;
  symbol: string;
  universal_symbol?: UniversalSymbol;
  action: OrderAction;
  order_type: OrderType;
  time_in_force: TimeInForce;
  status: OrderStatus;
  quantity?: number;
  filled_quantity?: number;
  limit_price?: number;
  stop_price?: number;
  average_fill_price?: number;
  total_commission?: number;
  account: string;
  brokerage_order_id?: string;
  created_date?: string;
  updated_date?: string;
  rejection_reason?: string;
}

export interface PlaceOrderRequest {
  account_id: string;
  action: OrderAction;
  order_type: OrderType;
  time_in_force?: TimeInForce;
  universal_symbol: UniversalSymbol;
  quantity?: number;
  limit_price?: number;
  stop_price?: number;
  notional_value?: NotionalValue;
}

export interface UniversalSymbol {
  id: string;
  symbol: string;
  raw_symbol?: string;
  description?: string;
  currency: Currency;
  exchange?: Exchange;
  type: SecurityType;
  figi_code?: string;
}

export interface NotionalValue {
  amount?: number;
  currency?: string;
}

export type OrderAction = 'BUY' | 'SELL' | 'BUY_TO_COVER' | 'SELL_SHORT';

export type OrderType = 
  | 'Limit'
  | 'Market'
  | 'StopLimit'
  | 'Stop';

export type TimeInForce = 
  | 'Day'
  | 'FOK'  // Fill or Kill
  | 'GTC'  // Good Till Cancelled
  | 'GTD'  // Good Till Date
  | 'IOC'  // Immediate or Cancel
  | 'OPG'; // Market on Open

export type OrderStatus = 
  | 'PENDING'
  | 'ACCEPTED'
  | 'FAILED'
  | 'REJECTED'
  | 'EXECUTED'
  | 'PARTIAL_FILLED'
  | 'CANCELED'
  | 'EXPIRED';

// ============================================================================
// ACTIVITIES & TRANSACTIONS
// ============================================================================

export interface Activity {
  id: string;
  account: string;
  symbol?: Security;
  type: ActivityType;
  description?: string;
  status?: string;
  quantity?: number;
  price?: number;
  amount?: number;
  currency?: Currency;
  fee?: number;
  settlement_date?: string;
  trade_date?: string;
  created_date?: string;
}

export type ActivityType = 
  | 'BUY'
  | 'SELL'
  | 'DIVIDEND'
  | 'CONTRIBUTION'
  | 'WITHDRAWAL'
  | 'EXTERNAL_ASSET_TRANSFER_IN'
  | 'EXTERNAL_ASSET_TRANSFER_OUT'
  | 'INTERNAL_CASH_TRANSFER_IN'
  | 'INTERNAL_CASH_TRANSFER_OUT'
  | 'INTERNAL_SECURITIES_TRANSFER_IN'
  | 'INTERNAL_SECURITIES_TRANSFER_OUT'
  | 'INTEREST'
  | 'FEE'
  | 'TAX'
  | 'OPTION_ASSIGNMENT'
  | 'OPTION_EXERCISE'
  | 'OPTION_EXPIRATION';

export interface Transaction {
  id: string;
  account_id: string;
  amount: number;
  currency: string;
  type: TransactionType;
  description?: string;
  date: string;
  symbol?: string;
  option_type?: 'CALL' | 'PUT';
  option_strike_price?: number;
  option_expiry_date?: string;
}

export type TransactionType = ActivityType;

// ============================================================================
// PERFORMANCE & ANALYTICS
// ============================================================================

export interface PerformanceCustom {
  totalEquity: Balance[];
  totalReturn: number;
  totalReturnPercentage: number;
  contributions: Balance[];
  withdrawals: Balance[];
  dividends: Balance[];
  timePeriods: PerformanceTimePeriod[];
}

export interface PerformanceTimePeriod {
  startDate: string;
  endDate: string;
  totalReturn: number;
  totalReturnPercentage: number;
}

export interface GetPerformanceRequest {
  startDate: string;
  endDate: string;
  accounts?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  detailedMode?: boolean;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface SnapTradeResponse<T> {
  data?: T;
  error?: SnapTradeError;
}

export interface SnapTradeError {
  status: number;
  message: string;
  code?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  nextPage?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface SnapTradeCredentials {
  userId: string;
  userSecret: string;
}

export interface ConnectionStatus {
  connected: boolean;
  lastSync?: string;
  error?: string;
}