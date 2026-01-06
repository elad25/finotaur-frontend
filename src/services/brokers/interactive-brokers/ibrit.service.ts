// src/services/brokers/interactive-brokers/ibrit.service.ts
// 🏦 Interactive Brokers IBRIT (Reporting Integration) Service
// Based on official IB documentation and email from reportingintegration@interactivebrokers.com

import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface IBRITCredentials {
  token: string;      // Unique per mutual client
  queryId: string;    // Unique per mutual client
  serviceCode: string; // Provided by IB for Finotaur (e.g., "Finotaur-ws")
}

export interface IBRITConfig {
  userId: string;
  credentials: IBRITCredentials;
}

// File types available from IBRIT
export type IBRITFileType = 
  | 'Activity'    // Trade activity, transfers, corporate actions, interest, dividends, fees
  | 'Position'    // Open positions including cash and accrual balances
  | 'Account'     // General account info (Account ID, Title, etc.)
  | 'Security'    // Detailed security information
  | 'CashReport'  // Cash balances (total, securities segment, futures segment)
  | 'PL'          // Mark-to-market and realized/unrealized P&L
  | 'NAV';        // Net Asset Value by asset class

// Error codes from IBRIT
export enum IBRITErrorCode {
  MISSING_PARAMS = 1050,       // Required parameters are missing
  INVALID_TOKEN_OR_QUERY = 1052, // Token or query ID is invalid
  INVALID_SERVICE_CODE = 1053,  // Service code is invalid
  SERVICE_NOT_ENABLED = 1054,   // Service code is not enabled for web service
  FUTURE_DATE = 1055,           // Date is in the future
  INVALID_DATE_FORMAT = 1056,   // Date format is invalid
  NO_STATEMENT = 1010,          // No statement/file available for account/date selected
}

// Activity record from IBRIT Activity file
export interface IBRITActivityRecord {
  AccountId: string;
  AcctAlias: string;
  Model: string;
  CurrencyPrimary: string;
  AssetClass: string;
  Symbol: string;
  Description: string;
  Conid: string;
  SecurityID: string;
  SecurityIDType: string;
  CUSIP: string;
  ISIN: string;
  ListingExchange: string;
  UnderlyingConid: string;
  UnderlyingSymbol: string;
  UnderlyingSecurityID: string;
  UnderlyingListingExchange: string;
  Issuer: string;
  Multiplier: string;
  Strike: string;
  Expiry: string;
  TrdType: string;
  PutCall: string;
  ReportDate: string;
  SettleDate: string;
  TradeDate: string;
  TradeTime: string;
  TransactionType: string;
  Exchange: string;
  Quantity: string;
  TradePrice: string;
  TradeMoney: string;
  Proceeds: string;
  Taxes: string;
  IBCommission: string;
  IBCommissionCurrency: string;
  NetCash: string;
  ClosePrice: string;
  Notes: string;
  Cost: string;
  FifoPnlRealized: string;
  MtmPnl: string;
  OrigTradePrice: string;
  OrigTradeDate: string;
  OrigTradeID: string;
  OrigOrderID: string;
  ClearingFirmID: string;
  TransactionID: string;
  BuySell: string;
  IBOrderID: string;
  IBExecID: string;
  BrokerageOrderID: string;
  OrderReference: string;
  VolatilityOrderLink: string;
  ExchOrderId: string;
  ExtExecID: string;
  OrderTime: string;
  OpenDateTime: string;
  HoldingPeriodDateTime: string;
  WhenRealized: string;
  WhenReopened: string;
  LevelOfDetail: string;
  ChangeInPrice: string;
  ChangeInQuantity: string;
  OrderType: string;
  TraderID: string;
  IsAPIOrder: string;
}

// Position record from IBRIT Position file
export interface IBRITPositionRecord {
  AccountId: string;
  AcctAlias: string;
  Model: string;
  CurrencyPrimary: string;
  AssetClass: string;
  Symbol: string;
  Description: string;
  Conid: string;
  SecurityID: string;
  SecurityIDType: string;
  CUSIP: string;
  ISIN: string;
  ListingExchange: string;
  UnderlyingConid: string;
  UnderlyingSymbol: string;
  UnderlyingSecurityID: string;
  UnderlyingListingExchange: string;
  Multiplier: string;
  Strike: string;
  Expiry: string;
  PutCall: string;
  ReportDate: string;
  Quantity: string;
  MarkPrice: string;
  PositionValue: string;
  OpenPrice: string;
  CostBasisPrice: string;
  CostBasisMoney: string;
  PercentOfNAV: string;
  FifoPnlUnrealized: string;
  Side: string;
  LevelOfDetail: string;
  OpenDateTime: string;
  HoldingPeriodDateTime: string;
  Vest: string;
  Code: string;
  OriginatingOrderID: string;
  OriginatingTransactionID: string;
  AccruedInt: string;
}

// ============================================================================
// IBRIT SERVICE CLASS
// ============================================================================

class IBRITService {
  private baseUrl = 'https://ndcdyn.interactivebrokers.com/Reporting/IBRITService';
  
  // Finotaur's service code (to be provided by IB after setup)
  // This will be the same for all Finotaur users
  private serviceCode = 'Finotaur-ws'; // Replace with actual code from IB

  // ============================================================================
  // CORE API METHODS
  // ============================================================================

  /**
   * Fetch data from IBRIT Web Service
   */
  async fetchReport(
    credentials: IBRITCredentials,
    reportDate: Date
  ): Promise<string> {
    const dateStr = this.formatDate(reportDate);
    
    const url = new URL(this.baseUrl);
    url.searchParams.set('t', credentials.token);
    url.searchParams.set('q', credentials.queryId);
    url.searchParams.set('rd', dateStr);
    url.searchParams.set('s', credentials.serviceCode || this.serviceCode);

    console.log(`📡 Fetching IBRIT report for date: ${dateStr}`);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'text/csv, text/plain, */*',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`IBRIT API error: ${response.status} - ${errorText}`);
      }

      const data = await response.text();
      
      // Check for error codes in response
      this.checkForErrors(data);
      
      return data;
    } catch (error: any) {
      console.error('❌ IBRIT fetch error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Fetch Activity report (trades, transfers, etc.)
   */
  async fetchActivity(
    credentials: IBRITCredentials,
    reportDate: Date
  ): Promise<IBRITActivityRecord[]> {
    const rawData = await this.fetchReport(credentials, reportDate);
    return this.parseActivityCSV(rawData);
  }

  /**
   * Fetch Positions report
   */
  async fetchPositions(
    credentials: IBRITCredentials,
    reportDate: Date
  ): Promise<IBRITPositionRecord[]> {
    const rawData = await this.fetchReport(credentials, reportDate);
    return this.parsePositionCSV(rawData);
  }

  /**
   * Fetch trades for a date range
   */
  async fetchTradesForDateRange(
    credentials: IBRITCredentials,
    startDate: Date,
    endDate: Date
  ): Promise<IBRITActivityRecord[]> {
    const allTrades: IBRITActivityRecord[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      try {
        console.log(`📅 Fetching trades for ${this.formatDate(currentDate)}`);
        const trades = await this.fetchActivity(credentials, new Date(currentDate));
        
        // Filter to only trade transactions
        const tradeRecords = trades.filter(t => 
          t.TransactionType === 'Trade' || 
          t.TransactionType === 'TradeCancel' ||
          t.LevelOfDetail === 'EXECUTION'
        );
        
        allTrades.push(...tradeRecords);
      } catch (error: any) {
        // Skip if no data for this date (error 1010)
        if (!error.message?.includes('1010')) {
          console.warn(`⚠️ Error fetching ${this.formatDate(currentDate)}:`, error.message);
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`✅ Fetched ${allTrades.length} trades from ${this.formatDate(startDate)} to ${this.formatDate(endDate)}`);
    return allTrades;
  }

  // ============================================================================
  // PARSING METHODS
  // ============================================================================

  private parseActivityCSV(csvData: string): IBRITActivityRecord[] {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) return [];

    // Find the Activity section header
    const headerIndex = lines.findIndex(line => 
      line.startsWith('AccountId') || line.includes('Activity')
    );
    
    if (headerIndex === -1) return [];

    const headers = this.parseCSVLine(lines[headerIndex]);
    const records: IBRITActivityRecord[] = [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('Header') || line.startsWith('Trailer')) continue;

      const values = this.parseCSVLine(line);
      if (values.length < headers.length) continue;

      const record: any = {};
      headers.forEach((header, index) => {
        record[header.trim()] = values[index]?.trim() || '';
      });

      records.push(record as IBRITActivityRecord);
    }

    return records;
  }

  private parsePositionCSV(csvData: string): IBRITPositionRecord[] {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) return [];

    const headerIndex = lines.findIndex(line => 
      line.startsWith('AccountId') || line.includes('Position')
    );
    
    if (headerIndex === -1) return [];

    const headers = this.parseCSVLine(lines[headerIndex]);
    const records: IBRITPositionRecord[] = [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('Header') || line.startsWith('Trailer')) continue;

      const values = this.parseCSVLine(line);
      if (values.length < headers.length) continue;

      const record: any = {};
      headers.forEach((header, index) => {
        record[header.trim()] = values[index]?.trim() || '';
      });

      records.push(record as IBRITPositionRecord);
    }

    return records;
  }

  private parseCSVLine(line: string): string[] {
    // Handle both pipe-delimited and comma-delimited formats
    const delimiter = line.includes('|') ? '|' : ',';
    return line.split(delimiter);
  }

  // ============================================================================
  // CONVERSION TO FINOTAUR TRADES
  // ============================================================================

  /**
   * Convert IBRIT Activity record to Finotaur trade format
   */
  convertToFinotaurTrade(
    record: IBRITActivityRecord,
    userId: string,
    connectionId: string
  ): any {
    const quantity = Math.abs(parseFloat(record.Quantity) || 0);
    const price = parseFloat(record.TradePrice) || 0;
    const commission = Math.abs(parseFloat(record.IBCommission) || 0);
    const pnl = parseFloat(record.FifoPnlRealized) || null;

    // Determine side
    const side = record.BuySell?.toLowerCase() === 'buy' || 
                 parseFloat(record.Quantity) > 0 ? 'long' : 'short';

    // Determine asset class
    const assetClass = this.mapAssetClass(record.AssetClass);

    // Parse timestamps
    const tradeDateTime = this.parseIBDateTime(record.TradeDate, record.TradeTime);

    return {
      user_id: userId,
      symbol: record.Symbol,
      asset_class: assetClass,
      side,
      quantity,
      entry_price: price,
      exit_price: pnl !== null ? price : null, // Set if trade is closed
      fees: commission,
      fees_mode: 'auto',
      open_at: tradeDateTime,
      close_at: pnl !== null ? tradeDateTime : null,
      pnl: pnl,
      broker: 'interactive_brokers',
      broker_connection_id: connectionId,
      external_id: record.TransactionID || record.IBExecID,
      broker_trade_id: record.IBOrderID,
      broker_order_id: record.BrokerageOrderID || record.IBOrderID,
      execution_id: record.IBExecID,
      contract_id: record.Conid,
      underlying_symbol: record.UnderlyingSymbol || null,
      multiplier: parseFloat(record.Multiplier) || 1,
      import_source: 'ibrit',
      synced_at: new Date().toISOString(),
      raw_data: record,
    };
  }

  private mapAssetClass(ibAssetClass: string): string {
    const mapping: Record<string, string> = {
      'STK': 'stocks',
      'OPT': 'options',
      'FUT': 'futures',
      'FOP': 'options', // Futures options
      'WAR': 'stocks', // Warrants
      'CASH': 'forex',
      'CFD': 'cfd',
      'BOND': 'bonds',
      'CMDTY': 'commodities',
      'CRYPTO': 'crypto',
    };

    return mapping[ibAssetClass] || 'stocks';
  }

  private parseIBDateTime(date: string, time?: string): string {
    // IB format: YYYYMMDD or YYYY-MM-DD
    let dateStr = date;
    if (date.length === 8 && !date.includes('-')) {
      dateStr = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    }

    // Time format: HHMMSS or HH:MM:SS
    let timeStr = '00:00:00';
    if (time) {
      if (time.length === 6 && !time.includes(':')) {
        timeStr = `${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`;
      } else {
        timeStr = time;
      }
    }

    return new Date(`${dateStr}T${timeStr}Z`).toISOString();
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  private checkForErrors(response: string): void {
    const errorCodes = Object.values(IBRITErrorCode).filter(v => typeof v === 'number');
    
    for (const code of errorCodes) {
      if (response.includes(`${code}`)) {
        throw new Error(this.getErrorMessage(code as IBRITErrorCode));
      }
    }
  }

  private getErrorMessage(code: IBRITErrorCode): string {
    const messages: Record<IBRITErrorCode, string> = {
      [IBRITErrorCode.MISSING_PARAMS]: 'Required parameters are missing',
      [IBRITErrorCode.INVALID_TOKEN_OR_QUERY]: 'Token or query ID is invalid',
      [IBRITErrorCode.INVALID_SERVICE_CODE]: 'Service code is invalid',
      [IBRITErrorCode.SERVICE_NOT_ENABLED]: 'Service is not enabled for web service',
      [IBRITErrorCode.FUTURE_DATE]: 'Requested date is in the future',
      [IBRITErrorCode.INVALID_DATE_FORMAT]: 'Date format is invalid (expected YYYYMMDD)',
      [IBRITErrorCode.NO_STATEMENT]: 'No statement available for this account/date',
    };

    return `IBRIT Error ${code}: ${messages[code] || 'Unknown error'}`;
  }

  private handleError(error: any): Error {
    if (error.message?.includes('IBRIT Error')) {
      return error;
    }

    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      return new Error('Network error: Unable to connect to IB IBRIT service');
    }

    return new Error(`IBRIT Error: ${error.message || 'Unknown error occurred'}`);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Validate IBRIT credentials
   */
  async validateCredentials(credentials: IBRITCredentials): Promise<boolean> {
    try {
      // Try to fetch yesterday's report as a validation
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await this.fetchReport(credentials, yesterday);
      return true;
    } catch (error: any) {
      // If error is "no statement", credentials are valid but no data
      if (error.message?.includes('1010')) {
        return true;
      }
      return false;
    }
  }
}

export const ibritService = new IBRITService();