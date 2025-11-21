// ============================================================================
// UDF CLIENT - TradingView Data Feed Client
// ============================================================================

import type { UDFHistoryRequest, UDFHistoryResponse } from '../../types';

const UDF_SERVER_URL = import.meta.env.VITE_UDF_SERVER_URL || 'http://localhost:3001';

/**
 * UDF Client for fetching historical data
 */
export const udfClient = {
  /**
   * Get historical OHLCV data
   */
  async getHistory(params: UDFHistoryRequest): Promise<UDFHistoryResponse> {
    const { symbol, resolution, from, to } = params;
    
    const url = `${UDF_SERVER_URL}/history?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data as UDFHistoryResponse;
    } catch (error) {
      console.error('UDF Client error:', error);
      throw error;
    }
  },
  
  /**
   * Get symbol info
   */
  async getSymbolInfo(symbol: string): Promise<any> {
    const url = `${UDF_SERVER_URL}/symbols?symbol=${symbol}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Symbol info error:', error);
      throw error;
    }
  },
  
  /**
   * Search symbols
   */
  async searchSymbols(query: string): Promise<any[]> {
    const url = `${UDF_SERVER_URL}/search?query=${query}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  },
  
  /**
   * Get server time
   */
  async getTime(): Promise<number> {
    const url = `${UDF_SERVER_URL}/time`;
    
    try {
      const response = await fetch(url);
      const time = await response.text();
      return parseInt(time, 10);
    } catch (error) {
      console.error('Get time error:', error);
      return Math.floor(Date.now() / 1000);
    }
  }
};

export default udfClient;