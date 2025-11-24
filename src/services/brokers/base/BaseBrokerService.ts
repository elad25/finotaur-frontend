// Abstract base class that all brokers extend
export abstract class BaseBrokerService implements IBrokerService {
  protected credentials?: BrokerCredentials;
  protected connected: boolean = false;
  
  abstract connect(credentials: BrokerCredentials): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract fetchTrades(startDate: Date, endDate: Date): Promise<BrokerTrade[]>;
  
  async syncTrades(): Promise<void> {
    // Common sync logic for all brokers
    const trades = await this.fetchTrades(/* dates */);
    await this.saveTradesToSupabase(trades);
  }
  
  protected async saveTradesToSupabase(trades: BrokerTrade[]): Promise<void> {
    // Shared logic
  }
  
  isConnected(): boolean {
    return this.connected;
  }
}