// core/ChartRenderer.ts - COMPLETE WITH CHART TYPE SUPPORT
import { 
  IChartApi, 
  ISeriesApi, 
  CandlestickData,
  LineData,
  HistogramData,
} from 'lightweight-charts';
import { CandleStyle, Theme } from '../types';
import { rafBatchRenderer } from '../utils/performance';

export class ChartRenderer {
  private chart: IChartApi;
  private candlestickSeries: ISeriesApi<'Candlestick'> | null = null;
  private lineSeries: ISeriesApi<'Line'> | null = null;
  private areaSeries: ISeriesApi<'Area'> | null = null;
  private barSeries: ISeriesApi<'Bar'> | null = null;
  private indicatorSeries: Map<string, ISeriesApi<any>> = new Map();
  private currentStyle: CandleStyle = 'candles';
  private currentData: CandlestickData[] = [];
  private isDestroyed = false;
  private theme: Theme;

  constructor(chart: IChartApi, candlestickSeries: ISeriesApi<'Candlestick'>, theme: Theme) {
    this.chart = chart;
    this.candlestickSeries = candlestickSeries;
    this.theme = theme;
    console.log('🎨 ChartRenderer initialized');
  }

  // ===================================
  // CHART STYLE MANAGEMENT
  // ===================================

  /**
   * Change chart style
   */
  setCandleStyle(style: CandleStyle, theme: Theme): void {
    console.log(`📊 Switching chart style: ${this.currentStyle} → ${style}`);
    
    if (this.currentStyle === style && this.theme === theme) {
      console.log('⚠️ Same style, skipping');
      return;
    }

    this.currentStyle = style;
    this.theme = theme;

    // Remove all existing series
    this.removeAllMainSeries();

    // Create new series based on style
    this.createSeriesForStyle(style, theme);

    // Restore data if available
    if (this.currentData.length > 0) {
      this.setDataToCurrentSeries(this.currentData);
    }

    console.log(`✅ Chart style changed to: ${style}`);
  }

  private createSeriesForStyle(style: CandleStyle, theme: Theme): void {
    const isDark = theme === 'dark';
    const upColor = isDark ? '#10b981' : '#16a34a';
    const downColor = isDark ? '#ef4444' : '#dc2626';
    const lineColor = isDark ? '#C9A646' : '#3b82f6';

    switch (style) {
      case 'candles':
        this.candlestickSeries = this.chart.addCandlestickSeries({
          upColor,
          downColor,
          borderVisible: false,
          wickUpColor: upColor,
          wickDownColor: downColor,
        });
        break;

      case 'hollow':
        this.candlestickSeries = this.chart.addCandlestickSeries({
          upColor: 'transparent',
          downColor: downColor,
          borderUpColor: upColor,
          borderDownColor: downColor,
          borderVisible: true,
          wickUpColor: upColor,
          wickDownColor: downColor,
        });
        break;

      case 'bars':
        this.barSeries = this.chart.addBarSeries({
          upColor,
          downColor,
        });
        break;

      case 'line':
        this.lineSeries = this.chart.addLineSeries({
          color: lineColor,
          lineWidth: 2,
          lastValueVisible: true,
          priceLineVisible: true,
        });
        break;

      case 'area':
        this.areaSeries = this.chart.addAreaSeries({
          topColor: isDark ? 'rgba(201, 166, 70, 0.4)' : 'rgba(59, 130, 246, 0.4)',
          bottomColor: isDark ? 'rgba(201, 166, 70, 0.0)' : 'rgba(59, 130, 246, 0.0)',
          lineColor: lineColor,
          lineWidth: 2,
          lastValueVisible: true,
          priceLineVisible: true,
        });
        break;

      case 'heikin-ashi':
        // For now, use candles (TODO: implement HA calculation)
        this.candlestickSeries = this.chart.addCandlestickSeries({
          upColor,
          downColor,
          borderVisible: false,
          wickUpColor: upColor,
          wickDownColor: downColor,
        });
        break;
    }
  }

  private removeAllMainSeries(): void {
    if (this.candlestickSeries) {
      this.chart.removeSeries(this.candlestickSeries);
      this.candlestickSeries = null;
    }
    if (this.lineSeries) {
      this.chart.removeSeries(this.lineSeries);
      this.lineSeries = null;
    }
    if (this.areaSeries) {
      this.chart.removeSeries(this.areaSeries);
      this.areaSeries = null;
    }
    if (this.barSeries) {
      this.chart.removeSeries(this.barSeries);
      this.barSeries = null;
    }
  }

  private setDataToCurrentSeries(data: CandlestickData[]): void {
    if (this.candlestickSeries) {
      this.candlestickSeries.setData(data);
    } else if (this.barSeries) {
      this.barSeries.setData(data);
    } else if (this.lineSeries) {
      const lineData: LineData[] = data.map(c => ({
        time: c.time,
        value: c.close,
      }));
      this.lineSeries.setData(lineData);
    } else if (this.areaSeries) {
      const areaData: LineData[] = data.map(c => ({
        time: c.time,
        value: c.close,
      }));
      this.areaSeries.setData(areaData);
    }
  }

  // ===================================
  // DATA UPDATES
  // ===================================

  setData(data: CandlestickData[]): void {
    if (this.isDestroyed) {
      console.warn('⚠️ ChartRenderer is destroyed, cannot set data');
      return;
    }

    console.log(`🎨 ChartRenderer.setData: ${data.length} candles`);

    if (data.length === 0) {
      console.warn('⚠️ Attempting to set empty data array');
      return;
    }

    // Store current data
    this.currentData = data;

    // Log first and last candle for debugging
    console.log('📊 First candle:', data[0]);
    console.log('📊 Last candle:', data[data.length - 1]);

    rafBatchRenderer.schedule(() => {
      if (!this.isDestroyed) {
        try {
          this.setDataToCurrentSeries(data);
          console.log('✅ Data set successfully');
          
          // Auto-fit content
          this.chart.timeScale().fitContent();
        } catch (error) {
          console.error('❌ Failed to set data:', error);
        }
      }
    });
  }

  updateCandle(candle: CandlestickData): void {
    if (this.isDestroyed) return;

    rafBatchRenderer.schedule(() => {
      if (!this.isDestroyed) {
        if (this.candlestickSeries) {
          this.candlestickSeries.update(candle);
        } else if (this.barSeries) {
          this.barSeries.update(candle);
        } else if (this.lineSeries) {
          this.lineSeries.update({ time: candle.time, value: candle.close });
        } else if (this.areaSeries) {
          this.areaSeries.update({ time: candle.time, value: candle.close });
        }
      }
    });
  }

  // ===================================
  // INDICATOR SERIES
  // ===================================

  addIndicatorSeries(
    id: string,
    type: 'Line' | 'Histogram' | 'Area',
    options?: any
  ): ISeriesApi<any> {
    if (this.indicatorSeries.has(id)) {
      return this.indicatorSeries.get(id)!;
    }

    let series: ISeriesApi<any>;

    switch (type) {
      case 'Line':
        series = this.chart.addLineSeries(options);
        break;
      case 'Histogram':
        series = this.chart.addHistogramSeries(options);
        break;
      case 'Area':
        series = this.chart.addAreaSeries(options);
        break;
      default:
        series = this.chart.addLineSeries(options);
    }

    this.indicatorSeries.set(id, series);
    return series;
  }

  removeIndicatorSeries(id: string): void {
    const series = this.indicatorSeries.get(id);
    if (series) {
      this.chart.removeSeries(series);
      this.indicatorSeries.delete(id);
    }
  }

  clearIndicators(): void {
    this.indicatorSeries.forEach(series => {
      this.chart.removeSeries(series);
    });
    this.indicatorSeries.clear();
  }

  // ===================================
  // MARKERS
  // ===================================

  setMarkers(markers: any[]): void {
    if (this.isDestroyed) return;

    rafBatchRenderer.schedule(() => {
      if (!this.isDestroyed && this.candlestickSeries) {
        this.candlestickSeries.setMarkers(markers);
      }
    });
  }

  // ===================================
  // VIEWPORT
  // ===================================

  fitContent(): void {
    if (this.isDestroyed) return;

    rafBatchRenderer.schedule(() => {
      if (!this.isDestroyed) {
        this.chart.timeScale().fitContent();
      }
    });
  }

  // ===================================
  // GETTERS
  // ===================================

  getChart(): IChartApi {
    return this.chart;
  }

  getCandlestickSeries(): ISeriesApi<'Candlestick'> | null {
    return this.candlestickSeries;
  }

  getCurrentStyle(): CandleStyle {
    return this.currentStyle;
  }

  getCurrentData(): CandlestickData[] {
    return [...this.currentData];
  }

  // ===================================
  // LIFECYCLE
  // ===================================

  destroy(): void {
    console.log('🗑️ Destroying ChartRenderer');
    this.isDestroyed = true;
    this.removeAllMainSeries();
    this.clearIndicators();
    rafBatchRenderer.clear();
  }
}