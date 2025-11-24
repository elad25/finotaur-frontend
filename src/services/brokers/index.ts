// Central export point
export { NinjaTraderService } from './ninjatrader/NinjaTraderService';
export { TradeovateService } from './tradeovate/TradeovateService';
export { SnapTradeService } from './snaptrade/SnapTradeService';

export type BrokerType = 'ninjatrader' | 'tradeovate' | 'snaptrade';

// Factory pattern for creating broker instances
export class BrokerFactory {
  static create(type: BrokerType): IBrokerService {
    switch (type) {
      case 'ninjatrader':
        return new NinjaTraderService();
      case 'tradeovate':
        return new TradeovateService();
      case 'snaptrade':
        return new SnapTradeService();
      default:
        throw new Error(`Unknown broker type: ${type}`);
    }
  }
}