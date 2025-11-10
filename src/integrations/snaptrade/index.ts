/**
 * SnapTrade Integration - Main Export File
 * Import everything you need from here
 */

// Configuration
export { SNAPTRADE_CONFIG } from './snaptradeConfig';
export type { SnapTradeEndpoint } from './snaptradeConfig';

// HTTP Client
export { snaptradeClient } from './snaptradeClient';
export type { SnapTradeError, RequestOptions } from './snaptradeClient';

// Service Layer
export { snaptradeService, SnapTradeService } from './snaptradeService';

// Types
export type {
  // User Management
  SnapTradeUser,
  RegisterUserRequest,
  SnapTradeCredentials,
  
  // Connections
  BrokerageConnection,
  AuthorizationUrl,
  GetAuthUrlRequest,
  ConnectionStatus,
  
  // Brokerages
  Brokerage,
  BrokerageAuthType,
  
  // Accounts
  Account,
  AccountBalance,
  Balance,
  Currency,
  SyncStatus,
  AccountType,
  
  // Holdings & Positions
  Position,
  AccountHoldings,
  Security,
  Exchange,
  SecurityType,
  FigiInstrument,
  
  // Orders & Trading
  Order,
  PlaceOrderRequest,
  UniversalSymbol,
  NotionalValue,
  OrderAction,
  OrderType,
  TimeInForce,
  OrderStatus,
  
  // Activities
  Activity,
  Transaction,
  ActivityType,
  TransactionType,
  
  // Performance
  PerformanceCustom,
  PerformanceTimePeriod,
  GetPerformanceRequest,
  
  // API Responses
  SnapTradeResponse,
  PaginatedResponse,
} from './snaptradeTypes';

// React Hooks
export {
  useSnapTradeUser,
  useSnapTradeConnections,
  useSnapTradeAccounts,
  useSnapTradeHoldings,
  useSnapTradeOrders,
  useSnapTradeActivities,
  useSnapTradePerformance,
  useSnapTradeBrokerages,
} from './useSnapTrade';

// Supabase Integration
export {
  snaptradeSupabaseService,
  SnapTradeSupabaseService,
  initializeSnapTradeForUser,
  getOrCreateSnapTradeCredentials,
  removeSnapTradeIntegration,
} from './snaptradeSupabase';

// UI Components
export {
  BrokerageConnectionCard,
  AccountCard,
  ConnectBrokerageButton,
  ConnectionsDashboard,
  AccountsOverview,
} from './SnapTradeComponents';

// Complete Page
export { default as SnapTradeIntegrationPage } from './SnapTradeIntegrationPage';