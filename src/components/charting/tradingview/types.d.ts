// Minimal shim for the TradingView Charting Library global (loaded at runtime from /charting_library/).
// The full official typings ship inside the library bundle; replace this shim once installed.

export interface TVBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TVLibrarySymbolInfo {
  name: string;
  ticker?: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  exchange: string;
  listed_exchange: string;
  format: 'price';
  pricescale: number;
  minmov: number;
  has_intraday: boolean;
  has_daily: boolean;
  supported_resolutions: string[];
  volume_precision?: number;
  data_status?: string;
}

export type TVResolution = string;

export interface TVPeriodParams {
  from: number;
  to: number;
  firstDataRequest: boolean;
  countBack?: number;
}

export interface TVDatafeed {
  onReady(cb: (config: any) => void): void;
  searchSymbols(
    input: string,
    exchange: string,
    type: string,
    onResult: (items: any[]) => void,
  ): void;
  resolveSymbol(
    symbolName: string,
    onResolve: (info: TVLibrarySymbolInfo) => void,
    onError: (reason: string) => void,
  ): void;
  getBars(
    symbolInfo: TVLibrarySymbolInfo,
    resolution: TVResolution,
    periodParams: TVPeriodParams,
    onResult: (bars: TVBar[], meta: { noData: boolean }) => void,
    onError: (reason: string) => void,
  ): void;
  subscribeBars(
    symbolInfo: TVLibrarySymbolInfo,
    resolution: TVResolution,
    onTick: (bar: TVBar) => void,
    guid: string,
    onResetCacheNeededCallback: () => void,
  ): void;
  unsubscribeBars(guid: string): void;
}

export interface TVSaveLoadAdapter {
  getAllCharts(): Promise<any[]>;
  removeChart(id: string | number): Promise<void>;
  saveChart(chartData: any): Promise<string>;
  getChartContent(id: string | number): Promise<string>;
  getAllStudyTemplates?(): Promise<any[]>;
  removeStudyTemplate?(t: any): Promise<void>;
  saveStudyTemplate?(t: any): Promise<void>;
  getStudyTemplateContent?(t: any): Promise<string>;
  getDrawingTemplates?(): Promise<string[]>;
  loadDrawingTemplate?(toolName: string, templateName: string): Promise<string>;
  saveDrawingTemplate?(
    toolName: string,
    templateName: string,
    content: string,
  ): Promise<void>;
  removeDrawingTemplate?(toolName: string, templateName: string): Promise<void>;
}

declare global {
  interface Window {
    TradingView?: { widget: new (options: any) => any };
  }
}

export {};
