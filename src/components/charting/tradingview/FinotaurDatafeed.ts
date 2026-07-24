import type { ChartDataSource } from '../types';
import type {
  TVBar,
  TVDatafeed,
  TVLibrarySymbolInfo,
  TVPeriodParams,
  TVResolution,
} from './types.d';
import { resolutionToInterval } from './resolutionMap';

const SUPPORTED_RESOLUTIONS = ['1', '2', '5', '15', '30', '60', '240', '1D', '1W', '1M'];

interface FinotaurDatafeedOptions {
  exchange?: string;
}

/** Active bar subscriptions keyed by guid (historical/replay mode only; live streaming is TODO). */
type SubscriptionMap = Map<string, { symbolName: string; resolution: TVResolution }>;

/**
 * Bridges our ChartDataSource to the TradingView Datafeed API.
 *
 * - Bar fetches are delegated to the injected `ChartDataSource.getBars`.
 * - Time conversion: ChartDataSource uses Unix seconds; TradingView expects milliseconds.
 * - Live streaming is a TODO — subscribe/unsubscribe are tracked but no-op.
 */
export class FinotaurDatafeed implements TVDatafeed {
  private readonly source: ChartDataSource;
  private readonly exchange: string;
  private readonly subscriptions: SubscriptionMap = new Map();

  constructor(source: ChartDataSource, opts?: FinotaurDatafeedOptions) {
    this.source = source;
    this.exchange = opts?.exchange ?? 'FINOTAUR';
  }

  onReady(cb: (config: any) => void): void {
    setTimeout(() => {
      cb({
        supported_resolutions: SUPPORTED_RESOLUTIONS,
        supports_marks: false,
        supports_timescale_marks: false,
        supports_time: true,
      });
    }, 0);
  }

  searchSymbols(
    _input: string,
    _exchange: string,
    _type: string,
    onResult: (items: any[]) => void,
  ): void {
    // TODO: proxy /api/symbols/suggest for search results
    onResult([]);
  }

  resolveSymbol(
    symbolName: string,
    onResolve: (info: TVLibrarySymbolInfo) => void,
    _onError: (reason: string) => void,
  ): void {
    const symbolInfo: TVLibrarySymbolInfo = {
      name: symbolName,
      ticker: symbolName,
      description: symbolName,
      type: 'crypto',
      session: '24x7',
      timezone: 'Etc/UTC',
      exchange: this.exchange,
      listed_exchange: this.exchange,
      format: 'price',
      pricescale: 100,
      minmov: 1,
      has_intraday: true,
      has_daily: true,
      supported_resolutions: SUPPORTED_RESOLUTIONS,
      volume_precision: 2,
      data_status: 'streaming',
    };
    setTimeout(() => onResolve(symbolInfo), 0);
  }

  getBars(
    symbolInfo: TVLibrarySymbolInfo,
    resolution: TVResolution,
    periodParams: TVPeriodParams,
    onResult: (bars: TVBar[], meta: { noData: boolean }) => void,
    onError: (reason: string) => void,
  ): void {
    const interval = resolutionToInterval(resolution);

    this.source
      .getBars(
        symbolInfo.name,
        interval,
        periodParams.from as any,
        periodParams.to as any,
      )
      .then((bars) => {
        const tvBars: TVBar[] = bars.map((bar) => ({
          time: (bar.time as number) * 1000,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          ...(bar.volume !== undefined ? { volume: bar.volume } : {}),
        }));
        onResult(tvBars, { noData: tvBars.length === 0 });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        onError(message);
      });
  }

  subscribeBars(
    symbolInfo: TVLibrarySymbolInfo,
    resolution: TVResolution,
    _onTick: (bar: TVBar) => void,
    guid: string,
    _onResetCacheNeededCallback: () => void,
  ): void {
    // TODO: wire live streaming when a real-time data source is available
    this.subscriptions.set(guid, { symbolName: symbolInfo.name, resolution });
  }

  unsubscribeBars(guid: string): void {
    this.subscriptions.delete(guid);
  }
}
