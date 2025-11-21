// ==================== BINANCE DATA SERVICE ====================
// Fetch real market data from Binance API

export interface BinanceCandle {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteVolume: string;
  trades: number;
  takerBuyBaseVolume: string;
  takerBuyQuoteVolume: string;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w';

export class BinanceDataService {
  private baseUrl = 'https://api.binance.com/api/v3';
  private futuresUrl = 'https://fapi.binance.com/fapi/v1';

  /**
   * Fetch historical klines/candlesticks data
   * @param symbol - Trading pair (e.g., 'BTCUSDT')
   * @param interval - Timeframe (e.g., '1d', '1h', '15m')
   * @param limit - Number of candles to fetch (max 1000)
   * @param startTime - Optional start time in ms
   * @param endTime - Optional end time in ms
   * @param futures - Use futures endpoint (default: false)
   */
  async fetchKlines(
    symbol: string,
    interval: Timeframe,
    limit: number = 500,
    startTime?: number,
    endTime?: number,
    futures: boolean = false
  ): Promise<CandleData[]> {
    try {
      const baseUrl = futures ? this.futuresUrl : this.baseUrl;
      const endpoint = `${baseUrl}/klines`;
      
      const params = new URLSearchParams({
        symbol: symbol.toUpperCase(),
        interval,
        limit: limit.toString(),
      });

      if (startTime) params.append('startTime', startTime.toString());
      if (endTime) params.append('endTime', endTime.toString());

      const response = await fetch(`${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.statusText}`);
      }

      const data: BinanceCandle[] = await response.json();
      
      return data.map(candle => ({
        time: Math.floor(candle.openTime / 1000), // Convert to seconds
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume),
      }));
    } catch (error) {
      console.error('Error fetching Binance data:', error);
      throw error;
    }
  }

  /**
   * Fetch multiple pages of historical data
   * Useful for getting more than 1000 candles
   */
  async fetchHistoricalData(
    symbol: string,
    interval: Timeframe,
    totalCandles: number,
    futures: boolean = false
  ): Promise<CandleData[]> {
    const allCandles: CandleData[] = [];
    const maxLimit = 1000;
    let endTime = Date.now();

    while (allCandles.length < totalCandles) {
      const remaining = totalCandles - allCandles.length;
      const limit = Math.min(remaining, maxLimit);

      const candles = await this.fetchKlines(
        symbol,
        interval,
        limit,
        undefined,
        endTime,
        futures
      );

      if (candles.length === 0) break;

      allCandles.unshift(...candles);
      endTime = candles[0].time * 1000 - 1; // Move back in time

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    return allCandles.slice(-totalCandles);
  }

  /**
   * Get current price for a symbol
   */
  async getCurrentPrice(symbol: string, futures: boolean = false): Promise<number> {
    try {
      const baseUrl = futures ? this.futuresUrl : this.baseUrl;
      const endpoint = `${baseUrl}/ticker/price`;
      
      const params = new URLSearchParams({
        symbol: symbol.toUpperCase(),
      });

      const response = await fetch(`${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.statusText}`);
      }

      const data = await response.json();
      return parseFloat(data.price);
    } catch (error) {
      console.error('Error fetching current price:', error);
      throw error;
    }
  }

  /**
   * Get exchange info for a symbol
   */
  async getSymbolInfo(symbol: string, futures: boolean = false) {
    try {
      const baseUrl = futures ? this.futuresUrl : this.baseUrl;
      const endpoint = `${baseUrl}/exchangeInfo`;
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.statusText}`);
      }

      const data = await response.json();
      const symbolInfo = data.symbols.find((s: any) => s.symbol === symbol.toUpperCase());
      
      return symbolInfo;
    } catch (error) {
      console.error('Error fetching symbol info:', error);
      throw error;
    }
  }

  /**
   * Get list of all trading pairs
   */
  async getAllSymbols(futures: boolean = false): Promise<string[]> {
    try {
      const baseUrl = futures ? this.futuresUrl : this.baseUrl;
      const endpoint = `${baseUrl}/exchangeInfo`;
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.symbols.map((s: any) => s.symbol);
    } catch (error) {
      console.error('Error fetching symbols:', error);
      throw error;
    }
  }

  /**
   * Calculate timeframe duration in milliseconds
   */
  getTimeframeDuration(interval: Timeframe): number {
    const durations: Record<Timeframe, number> = {
      '1m': 60 * 1000,
      '3m': 3 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '8h': 8 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
    };

    return durations[interval] || durations['1d'];
  }
}

// Export singleton instance
export const binanceService = new BinanceDataService();