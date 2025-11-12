// src/integrations/snaptrade/index.ts
// Main export file for SnapTrade integration
// ייבוא הכל מכאן במקום מכל קובץ בנפרד

// ============================================================================
// SERVICES
// ============================================================================
export { snaptradeService, SnapTradeService } from './snaptradeService';
export { snaptradeSupabaseService, SnapTradeSupabaseService } from './snaptradeSupabase';
export { snaptradeTradeSync } from './snaptradeTradeSync';
export { snaptradeClient } from './snaptradeClient';

// ============================================================================
// TYPES
// ============================================================================
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
  SnapTradeError,
  PaginatedResponse,
} from './snaptradeTypes';

// ============================================================================
// REACT HOOKS
// ============================================================================
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

// ============================================================================
// UI COMPONENTS
// ============================================================================
export {
  BrokerageConnectionCard,
  AccountCard,
  ConnectBrokerageButton,
  ConnectionsDashboard,
  AccountsOverview,
} from './SnapTradeComponents';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
export {
  initializeSnapTradeForUser,
  getOrCreateSnapTradeCredentials,
  removeSnapTradeIntegration,
} from './snaptradeSupabase';

export {
  syncTradesFromSnapTrade,
  setupAutomaticSync,
  handleManualSync,
} from './snaptradeTradeSync';