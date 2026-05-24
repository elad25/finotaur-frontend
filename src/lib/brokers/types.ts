// lib/brokers/types.ts
// Unified trade interface that all brokers map to

export type BrokerName =
  | 'interactive_brokers'
  | 'td_ameritrade'
  | 'alpaca'
  | 'tradingview'
  | 'mt4'
  | 'mt5'
  | 'ninja_trader'
  | 'tradovate'
  | 'manual';

export type BrokerStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'pending'
  | 'renewing'   // silent retry in progress — treated as connected visually
  | 'degraded'   // retry ongoing but degraded — yellow indicator
  | 'canceled';  // Whop subscription canceled — terminal; requires explicit user reconnect
export type BrokerEnvironment = 'live' | 'demo';

/**
 * Mirrors public.broker_connections (prod schema, post-F1.A).
 * Fields without a native column on broker_connections (vault_secret_id,
 * account_spec, access_token_hash) live inside `connection_data` jsonb.
 * Tokens themselves live in Supabase Vault (Tradovate pattern).
 */
export interface BrokerConnection {
  id: string;
  user_id: string;
  broker: BrokerName;
  status: BrokerStatus;
  is_active: boolean;
  purpose?: 'journal' | 'copier';    // M-001: NOT NULL in DB, default 'journal'; optional here for pre-migration rows
  account_id?: string | null;        // TEXT in DB; numeric for Tradovate; coerce as needed
  account_name?: string | null;
  environment?: BrokerEnvironment | string | null;
  connection_name?: string | null;   // user-given label (was tradovate_credentials.connection_label)
  connected_at?: string | null;
  disconnected_at?: string | null;
  last_sync_at?: string | null;
  last_successful_sync_at?: string | null;
  error_count?: number | null;
  last_error?: string | null;
  last_error_at?: string | null;
  token_expires_at?: string | null;
  connection_data?: BrokerConnectionData | null;  // jsonb
  created_at?: string | null;
  updated_at?: string | null;
}

/** Tradovate-specific shape stuffed into broker_connections.connection_data. */
export interface BrokerConnectionData {
  vault_secret_id?: string;
  account_spec?: string;
  access_token_hash?: string;
  // Future per-broker fields land here.
  [key: string]: unknown;
}

export interface BrokerTrade {
  // Broker-specific ID
  external_id: string;
  broker: BrokerName;
  
  // Trade data
  symbol: string;
  side: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price?: number;
  stop_price?: number;
  target_price?: number;
  quantity: number;
  fees: number;
  
  // Timestamps
  open_at: string;
  close_at?: string;
  
  // Optional metadata
  strategy?: string;
  notes?: string;
  
  // Asset type
  asset_type?: 'stock' | 'option' | 'future' | 'forex' | 'crypto';
  
  // For futures
  multiplier?: number;
  
  // For options
  option_type?: 'CALL' | 'PUT';
  strike_price?: number;
  expiration_date?: string;
}

export interface BrokerIntegrationConfig {
  broker: BrokerName;
  displayName: string;
  logo: string;
  color: string;
  features: {
    oauth: boolean;
    apiKey: boolean;
    webhook: boolean;
    fileImport: boolean;
    realtime: boolean;
  };
  status: 'available' | 'coming_soon' | 'beta';
  documentation?: string;
}

// Broker configurations
export const BROKER_CONFIGS: Record<BrokerName, BrokerIntegrationConfig> = {
  interactive_brokers: {
    broker: 'interactive_brokers',
    displayName: 'Interactive Brokers',
    logo: '/brokers/ibkr.png',
    color: '#0055AA',
    features: {
      oauth: true,
      apiKey: false,
      webhook: false,
      fileImport: true,
      realtime: true,
    },
    status: 'available',
    documentation: 'https://www.interactivebrokers.com/api/doc.html',
  },
  td_ameritrade: {
    broker: 'td_ameritrade',
    displayName: 'TD Ameritrade',
    logo: '/brokers/td.png',
    color: '#00AA00',
    features: {
      oauth: true,
      apiKey: false,
      webhook: false,
      fileImport: true,
      realtime: true,
    },
    status: 'coming_soon',
    documentation: 'https://developer.tdameritrade.com/',
  },
  alpaca: {
    broker: 'alpaca',
    displayName: 'Alpaca',
    logo: '/brokers/alpaca.png',
    color: '#FFC107',
    features: {
      oauth: false,
      apiKey: true,
      webhook: true,
      fileImport: false,
      realtime: true,
    },
    status: 'available',
    documentation: 'https://alpaca.markets/docs/',
  },
  tradingview: {
    broker: 'tradingview',
    displayName: 'TradingView',
    logo: '/brokers/tradingview-official.svg',
    color: '#2962FF',
    features: {
      oauth: false,
      apiKey: false,
      webhook: true,
      fileImport: false,
      realtime: true,
    },
    status: 'available',
    documentation: 'https://www.tradingview.com/support/solutions/43000529348/',
  },
  mt4: {
    broker: 'mt4',
    displayName: 'MetaTrader 4',
    logo: '/brokers/mt4.png',
    color: '#0080FF',
    features: {
      oauth: false,
      apiKey: true,
      webhook: true,
      fileImport: true,
      realtime: true,
    },
    status: 'coming_soon',
  },
  mt5: {
    broker: 'mt5',
    displayName: 'MetaTrader 5',
    logo: '/brokers/metatrader5-official.svg',
    color: '#0080FF',
    features: {
      oauth: false,
      apiKey: true,
      webhook: true,
      fileImport: true,
      realtime: true,
    },
    status: 'coming_soon',
  },
  ninja_trader: {
    broker: 'ninja_trader',
    displayName: 'NinjaTrader',
    logo: '/brokers/ninjatrader-official.svg',
    color: '#FF4200',
    features: {
      oauth: false,
      apiKey: true,
      webhook: true,
      fileImport: true,
      realtime: true,
    },
    status: 'available',
    documentation: 'https://ninjatrader.com/trading-platform/',
  },
  tradovate: {
    broker: 'tradovate',
    displayName: 'Tradovate',
    logo: '/brokers/tradovate.png',
    color: '#1F8FFF',
    features: {
      oauth: true,
      apiKey: false,
      webhook: false,
      fileImport: true,
      realtime: true,
    },
    status: 'available',
    documentation: 'https://api.tradovate.com/',
  },
  manual: {
    broker: 'manual',
    displayName: 'Manual Entry',
    logo: '/brokers/manual.png',
    color: '#C9A646',
    features: {
      oauth: false,
      apiKey: false,
      webhook: false,
      fileImport: true,
      realtime: false,
    },
    status: 'available',
  },
};

// Helper to check if broker is available
export function isBrokerAvailable(broker: BrokerName): boolean {
  return BROKER_CONFIGS[broker].status === 'available';
}

// Helper to check if broker supports feature
export function brokerSupportsFeature(
  broker: BrokerName,
  feature: keyof BrokerIntegrationConfig['features']
): boolean {
  return BROKER_CONFIGS[broker].features[feature];
}
