import { BaseBrokerService } from '../base/BaseBrokerService';
import { NinjaTraderAPI } from './api';
import { mapNinjaTradeToStandard } from './mapper';
import { NT_ENDPOINTS } from './constants';

export class NinjaTraderService extends BaseBrokerService {
  private api: NinjaTraderAPI;
  
  constructor() {
    super();
    this.api = new NinjaTraderAPI();
  }
  
  async connect(credentials: BrokerCredentials): Promise<boolean> {
    try {
      await this.api.authenticate(credentials);
      this.credentials = credentials;
      this.connected = true;
      return true;
    } catch (error) {
      console.error('NT connection failed:', error);
      return false;
    }
  }
  
  async fetchTrades(startDate: Date, endDate: Date): Promise<BrokerTrade[]> {
    const ntTrades = await this.api.getTrades(startDate, endDate);
    return ntTrades.map(mapNinjaTradeToStandard);
  }
  
  async disconnect(): Promise<void> {
    this.connected = false;
    this.credentials = undefined;
  }
}