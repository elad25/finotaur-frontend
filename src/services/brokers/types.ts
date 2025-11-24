// Shared interfaces for all brokers
export interface BrokerCredentials {
  brokerId: string;
  apiKey: string;
  apiSecret?: string;
  accessToken?: string;
  environment: 'demo' | 'live';
}

export interface BrokerTrade {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  entryTime: Date;
  exitTime?: Date;
  pnl?: number;
  commission?: number;
}

export interface IBrokerService {
  connect(credentials: BrokerCredentials): Promise<boolean>;
  disconnect(): Promise<void>;
  fetchTrades(startDate: Date, endDate: Date): Promise<BrokerTrade[]>;
  syncTrades(): Promise<void>;
  isConnected(): boolean;
}