// ==================== POLYGON DATA SERVICE ====================
// Fetch real market data from Polygon.io API
// Supports: Stocks, Crypto, Forex

export interface PolygonBar {
  t: number;  // timestamp
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
  vw?: number; // volume weighted average
  n?: number;  // number of transactions
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type PolygonTimespan = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export class PolygonDataService {
  private baseUrl = 'https://api.polygon.io';
  private apiKey: string;

  constructor(apiKey?: string) {
    // Get API key from environment or parameter
    this.apiKey = apiKey || import.meta.env.VITE_POLYGON_API_KEY || '';
  }

  /**
   * Fetch aggregated bars (candles)
   * @param ticker - Stock ticker (e.g., 'AAPL', 'X:BTCUSD', 'C:EURUSD')
   * @param multiplier - Size of timespan multiplier
   * @param timespan - Size of time window
   * @param from - Start date (YYYY-MM-DD)
   * @param to - End date (YYYY-MM-DD)
   * @param limit - Limit number of results (max 50000)
   */
  async fetchAggregates(
    ticker: string,
    multiplier: number,
    timespan: PolygonTimespan,
    from: string,
    to: string,
    limit: number = 5000
  ): Promise<CandleData[]> {
    try {
      const endpoint = `${this.baseUrl}/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${to}`;
      
      const params = new URLSearchParams({
        adjusted: 'true',
        sort: 'asc',
        limit: limit.toString(),
        apiKey: this.apiKey,
      });

      const response = await fetch(`${endpoint}?${params}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Polygon API error: ${error.error || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        console.warn('No data returned from Polygon');
        return [];
      }

      return data.results.map((bar: PolygonBar) => ({
        time: Math.floor(bar.t / 1000), // Convert ms to seconds
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
      }));
    } catch (error) {
      console.error('Error fetching Polygon data:', error);
      throw error;
    }
  }

  /**
   * Fetch stock data
   * @param ticker - Stock symbol (e.g., 'AAPL', 'TSLA')
   * @param interval - Timeframe ('1min', '5min', '1hour', '1day')
   * @param days - Number of days to fetch
   */
  async fetchStockData(
    ticker: string,
    interval: string = '1day',
    days: number = 365
  ): Promise<CandleData[]> {
    const { multiplier, timespan } = this.parseInterval(interval);
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    return this.fetchAggregates(
      ticker,
      multiplier,
      timespan,
      this.formatDate(from),
      this.formatDate(to)
    );
  }

  /**
   * Fetch crypto data
   * @param pair - Crypto pair (e.g., 'BTC', 'ETH') - will auto-format to X:BTCUSD
   * @param interval - Timeframe
   * @param days - Number of days to fetch
   */
  async fetchCryptoData(
    pair: string,
    interval: string = '1hour',
    days: number = 90
  ): Promise<CandleData[]> {
    // Format crypto ticker for Polygon
    const ticker = pair.includes(':') ? pair : `X:${pair.toUpperCase()}USD`;
    
    const { multiplier, timespan } = this.parseInterval(interval);
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    return this.fetchAggregates(
      ticker,
      multiplier,
      timespan,
      this.formatDate(from),
      this.formatDate(to)
    );
  }

  /**
   * Fetch forex data
   * @param pair - Forex pair (e.g., 'EUR', 'GBP') - will auto-format to C:EURUSD
   * @param interval - Timeframe
   * @param days - Number of days to fetch
   */
  async fetchForexData(
    pair: string,
    interval: string = '1hour',
    days: number = 90
  ): Promise<CandleData[]> {
    // Format forex ticker for Polygon
    const ticker = pair.includes(':') ? pair : `C:${pair.toUpperCase()}USD`;
    
    const { multiplier, timespan } = this.parseInterval(interval);
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    return this.fetchAggregates(
      ticker,
      multiplier,
      timespan,
      this.formatDate(from),
      this.formatDate(to)
    );
  }

  /**
   * Get current price for a ticker
   */
  async getCurrentPrice(ticker: string): Promise<number | null> {
    try {
      const endpoint = `${this.baseUrl}/v2/last/trade/${ticker}`;
      
      const params = new URLSearchParams({
        apiKey: this.apiKey,
      });

      const response = await fetch(`${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Polygon API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results?.p || null;
    } catch (error) {
      console.error('Error fetching current price:', error);
      return null;
    }
  }

  /**
   * Search for tickers
   */
  async searchTickers(query: string, type?: 'stocks' | 'crypto' | 'fx'): Promise<any[]> {
    try {
      const endpoint = `${this.baseUrl}/v3/reference/tickers`;
      
      const params = new URLSearchParams({
        search: query,
        active: 'true',
        limit: '100',
        apiKey: this.apiKey,
      });

      if (type) {
        const marketMap = {
          stocks: 'stocks',
          crypto: 'crypto',
          fx: 'fx',
        };
        params.append('market', marketMap[type]);
      }

      const response = await fetch(`${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Polygon API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error searching tickers:', error);
      return [];
    }
  }

  /**
   * Parse interval string to Polygon format
   * Examples: '1min', '5min', '1hour', '1day'
   */
  private parseInterval(interval: string): { multiplier: number; timespan: PolygonTimespan } {
    const match = interval.match(/^(\d+)(min|hour|day|week|month)$/);
    
    if (!match) {
      // Default to 1 day
      return { multiplier: 1, timespan: 'day' };
    }

    const multiplier = parseInt(match[1]);
    let timespan: PolygonTimespan;

    switch (match[2]) {
      case 'min':
        timespan = 'minute';
        break;
      case 'hour':
        timespan = 'hour';
        break;
      case 'day':
        timespan = 'day';
        break;
      case 'week':
        timespan = 'week';
        break;
      case 'month':
        timespan = 'month';
        break;
      default:
        timespan = 'day';
    }

    return { multiplier, timespan };
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Check if API key is set
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }
}

// Export singleton instance
export const polygonService = new PolygonDataService();