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
  | 'manual';

export type BrokerStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface BrokerConnection {
  id: string;
  user_id: string;
  broker: BrokerName;
  status: BrokerStatus;
  account_id?: string;
  account_name?: string;
  connected_at: string;
  last_sync_at?: string;
  error_message?: string;
  // Encrypted OAuth tokens (never expose to frontend)
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
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
    logo: '/brokers/ib.png',
    color: '#0055AA',
    features: {
      oauth: true,
      apiKey: false,
      webhook: false,
      fileImport: true,
      realtime: true,
    },
    status: 'beta',
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
    logo: '/brokers/tv.png',
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
    logo: '/brokers/mt5.png',
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
    logo: '/brokers/ninja.png',
    color: '#FF6600',
    features: {
      oauth: false,
      apiKey: true,
      webhook: true,
      fileImport: true,
      realtime: true,
    },
    status: 'coming_soon',
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