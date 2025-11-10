/**
 * SnapTrade Configuration
 * Central configuration for SnapTrade API integration
 */

export const SNAPTRADE_CONFIG = {
  // API Credentials
  clientId: import.meta.env.VITE_SNAPTRADE_CLIENT_ID || '',
  consumerKey: import.meta.env.VITE_SNAPTRADE_CONSUMER_KEY || '',
  
  // API Base URL
  baseUrl: 'https://api.snaptrade.com/api/v1',
  
  // Endpoints
  endpoints: {
    // Authentication
    registerUser: '/snapTrade/registerUser',
    deleteUser: '/snapTrade/deleteUser',
    listUsers: '/snapTrade/listUsers',
    
    // Connections
    getAuthorizationUrl: '/snapTrade/login',
    listConnections: '/connections',
    deleteConnection: '/connections/{connectionId}',
    refreshConnection: '/connections/{connectionId}/refresh',
    
    // Accounts
    listAccounts: '/accounts',
    getAccountDetails: '/accounts/{accountId}',
    getAccountBalances: '/accounts/{accountId}/balances',
    
    // Holdings & Positions
    getHoldings: '/accounts/{accountId}/positions',
    getAllHoldings: '/holdings',
    
    // Orders
    placeOrder: '/accounts/{accountId}/orders',
    getOrders: '/accounts/{accountId}/orders',
    cancelOrder: '/accounts/{accountId}/orders/{orderId}',
    
    // Activities & Transactions
    getActivities: '/activities',
    getTransactions: '/accounts/{accountId}/transactions',
    
    // Brokerages
    listBrokerages: '/brokerages',
    getBrokerageAuth: '/brokerages/{brokerageId}/authorization',
    
    // Performance
    getPerformance: '/performance/custom',
  },
  
  // Request timeout (ms)
  timeout: 30000,
  
  // Retry configuration
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
  
  // Cache configuration
  cache: {
    enabled: true,
    ttl: {
      accounts: 300000, // 5 minutes
      holdings: 60000,  // 1 minute
      balances: 60000,  // 1 minute
      brokerages: 3600000, // 1 hour
    },
  },
} as const;

// Type definitions
export type SnapTradeEndpoint = keyof typeof SNAPTRADE_CONFIG.endpoints;