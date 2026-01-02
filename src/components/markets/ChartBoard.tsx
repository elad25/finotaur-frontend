// src/components/markets/ChartBoard.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  LineData,
  CrosshairMode,
  UTCTimestamp,
} from 'lightweight-charts';
import { WatchlistTable } from "./WatchlistTable";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type Props = {
  initialSymbol?: string;
};

interface StockInfo {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  country?: string;
  exchange?: string;
}

interface OHLCData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SMAValues {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
}

type Timeframe = 'D' | 'W' | 'M';

const FALLBACK = "AAPL";
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ═══════════════════════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchChartData(
  symbol: string, 
  timespan: 'day' | 'week' | 'month' = 'day',
  days: number = 365
): Promise<CandlestickData[]> {
  try {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    
    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];
    
    const response = await fetch(
      `${API_BASE_URL}/market-data/chart/${symbol}?from=${fromStr}&to=${toStr}&timespan=${timespan}&multiplier=1`
    );
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    if (!data.results || !Array.isArray(data.results)) return [];
    
    return data.results.map((bar: any) => ({
      time: (bar.t / 1000) as UTCTimestamp,
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
    }));
  } catch (error) {
    console.error('Failed to fetch chart data:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const generateVolumeData = (candleData: CandlestickData[]): HistogramData[] => {
  return candleData.map((candle: any) => ({
    time: candle.time,
    value: candle.volume || 0,
    color: candle.close >= candle.open ? 'rgba(38, 166, 154, 0.6)' : 'rgba(239, 83, 80, 0.6)',
  }));
};

const calculateSMA = (data: CandlestickData[], period: number): LineData[] => {
  const smaData: LineData[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    smaData.push({
      time: data[i].time,
      value: parseFloat((sum / period).toFixed(2)),
    });
  }
  return smaData;
};

const convertToWeekly = (dailyData: CandlestickData[]): CandlestickData[] => {
  const weeklyData: CandlestickData[] = [];
  let weekCandle: CandlestickData | null = null;
  
  dailyData.forEach((candle: any) => {
    const date = new Date((candle.time as number) * 1000);
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 1 || !weekCandle) {
      if (weekCandle) weeklyData.push(weekCandle);
      weekCandle = { ...candle };
    } else {
      weekCandle.high = Math.max(weekCandle.high, candle.high);
      weekCandle.low = Math.min(weekCandle.low, candle.low);
      weekCandle.close = candle.close;
    }
  });
  
  if (weekCandle) weeklyData.push(weekCandle);
  return weeklyData;
};

const convertToMonthly = (dailyData: CandlestickData[]): CandlestickData[] => {
  const monthlyData: CandlestickData[] = [];
  let monthCandle: CandlestickData | null = null;
  let currentMonth = -1;
  
  dailyData.forEach((candle: any) => {
    const date = new Date((candle.time as number) * 1000);
    const month = date.getMonth();
    
    if (month !== currentMonth || !monthCandle) {
      if (monthCandle) monthlyData.push(monthCandle);
      monthCandle = { ...candle };
      currentMonth = month;
    } else {
      monthCandle.high = Math.max(monthCandle.high, candle.high);
      monthCandle.low = Math.min(monthCandle.low, candle.low);
      monthCandle.close = candle.close;
    }
  });
  
  if (monthCandle) monthlyData.push(monthCandle);
  return monthlyData;
};

const formatVolume = (vol: number): string => {
  if (vol >= 1000000000) return (vol / 1000000000).toFixed(2) + 'B';
  if (vol >= 1000000) return (vol / 1000000).toFixed(2) + 'M';
  if (vol >= 1000) return (vol / 1000).toFixed(2) + 'K';
  return vol.toString();
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHARTBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const ChartBoard: React.FC<Props> = ({ initialSymbol }) => {
  const [symbol, setSymbol] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("finotaur.activeSymbol");
      return (initialSymbol && initialSymbol.length > 0) ? initialSymbol : (saved || FALLBACK);
    } catch {
      return (initialSymbol && initialSymbol.length > 0) ? initialSymbol : FALLBACK;
    }
  });

  const [stockInfo, setStockInfo] = useState<StockInfo>({ symbol: FALLBACK, name: FALLBACK });
  const [isLoading, setIsLoading] = useState(true);

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const sma20Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const sma50Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const sma200Ref = useRef<ISeriesApi<'Line'> | null>(null);
  
  // Chart state
  const [timeframe, setTimeframe] = useState<Timeframe>('D');
  const [currentOHLC, setCurrentOHLC] = useState<OHLCData | null>(null);
  const [smaValues, setSmaValues] = useState<SMAValues>({ sma20: null, sma50: null, sma200: null });
  const [lastPrice, setLastPrice] = useState<{ price: number; change: number; changePercent: number } | null>(null);
  const [lastCloseDate, setLastCloseDate] = useState<string>('');
  const [isChartReady, setIsChartReady] = useState(false);
  
  // Data refs
  const dailyDataRef = useRef<CandlestickData[]>([]);
  const volumeDataRef = useRef<HistogramData[]>([]);
  const sma20DataRef = useRef<LineData[]>([]);
  const sma50DataRef = useRef<LineData[]>([]);
  const sma200DataRef = useRef<LineData[]>([]);

  // Load data from API
  const loadChartData = useCallback(async (sym: string) => {
    setIsLoading(true);
    
    try {
      const chartData = await fetchChartData(sym, 'day', 365);
      
      if (chartData.length === 0) {
        setIsLoading(false);
        return;
      }
      
      dailyDataRef.current = chartData;
      volumeDataRef.current = generateVolumeData(chartData);
      sma20DataRef.current = calculateSMA(chartData, 20);
      sma50DataRef.current = calculateSMA(chartData, 50);
      sma200DataRef.current = calculateSMA(chartData, 200);
      
      setStockInfo({ symbol: sym, name: sym });
      
      if (chartData.length >= 2) {
        const lastCandle = chartData[chartData.length - 1];
        const prevCandle = chartData[chartData.length - 2];
        const change = lastCandle.close - prevCandle.close;
        const changePercent = (change / prevCandle.close) * 100;
        
        setLastPrice({ price: lastCandle.close, change, changePercent });
        
        const date = new Date((lastCandle.time as number) * 1000);
        setLastCloseDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · 04:00PM ET');
        
        const lastVolume = volumeDataRef.current[volumeDataRef.current.length - 1];
        setCurrentOHLC({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          open: lastCandle.open,
          high: lastCandle.high,
          low: lastCandle.low,
          close: lastCandle.close,
          volume: lastVolume?.value ?? 0,
        });
        
        setSmaValues({
          sma20: sma20DataRef.current[sma20DataRef.current.length - 1]?.value ?? null,
          sma50: sma50DataRef.current[sma50DataRef.current.length - 1]?.value ?? null,
          sma200: sma200DataRef.current[sma200DataRef.current.length - 1]?.value ?? null,
        });
      }
      
      if (candleSeriesRef.current && volumeSeriesRef.current) {
        candleSeriesRef.current.setData(chartData);
        volumeSeriesRef.current.setData(volumeDataRef.current);
        sma20Ref.current?.setData(sma20DataRef.current);
        sma50Ref.current?.setData(sma50DataRef.current);
        sma200Ref.current?.setData(sma200DataRef.current);
        chartRef.current?.timeScale().fitContent();
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading chart data:', err);
      setIsLoading(false);
    }
  }, []);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { color: '#131722' },
        textColor: '#b2b5be',
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#758696', width: 1, style: 2, labelBackgroundColor: '#2a2e39' },
        horzLine: { color: '#758696', width: 1, style: 2, labelBackgroundColor: '#2a2e39' },
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 8,
      },
      localization: { locale: 'en-US' },
      handleScroll: { vertTouchDrag: false },
    });
    
    chartRef.current = chart;
    
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    candleSeriesRef.current = candleSeries;
    
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;
    
    const sma20Series = chart.addLineSeries({
      color: '#e040fb',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    sma20Ref.current = sma20Series;
    
    const sma50Series = chart.addLineSeries({
      color: '#00bcd4',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    sma50Ref.current = sma50Series;
    
    const sma200Series = chart.addLineSeries({
      color: '#ff9800',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    sma200Ref.current = sma200Series;
    
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        const data = dailyDataRef.current;
        if (data.length > 0) {
          const lastBar = data[data.length - 1] as any;
          const date = new Date((lastBar.time as number) * 1000);
          const lastVolume = volumeDataRef.current[volumeDataRef.current.length - 1];
          setCurrentOHLC({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            open: lastBar.open, high: lastBar.high, low: lastBar.low, close: lastBar.close,
            volume: lastVolume?.value ?? 0,
          });
        }
        if (sma20DataRef.current.length > 0) {
          setSmaValues({
            sma20: sma20DataRef.current[sma20DataRef.current.length - 1]?.value ?? null,
            sma50: sma50DataRef.current[sma50DataRef.current.length - 1]?.value ?? null,
            sma200: sma200DataRef.current[sma200DataRef.current.length - 1]?.value ?? null,
          });
        }
        return;
      }
      
      const candleData = param.seriesData.get(candleSeries) as CandlestickData;
      const volumeData = param.seriesData.get(volumeSeries) as HistogramData;
      
      if (candleData) {
        const date = new Date((param.time as number) * 1000);
        setCurrentOHLC({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          open: candleData.open, high: candleData.high, low: candleData.low, close: candleData.close,
          volume: volumeData?.value ?? 0,
        });
      }
      
      setSmaValues({
        sma20: (param.seriesData.get(sma20Series) as LineData)?.value ?? null,
        sma50: (param.seriesData.get(sma50Series) as LineData)?.value ?? null,
        sma200: (param.seriesData.get(sma200Series) as LineData)?.value ?? null,
      });
    });
    
    setIsChartReady(true);
    
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Load data when symbol changes
  useEffect(() => {
    if (isChartReady && symbol) {
      loadChartData(symbol);
    }
  }, [symbol, isChartReady, loadChartData]);

  // Update data when timeframe changes
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !isChartReady || dailyDataRef.current.length === 0) return;
    
    let data: CandlestickData[];
    switch (timeframe) {
      case 'W': data = convertToWeekly(dailyDataRef.current); break;
      case 'M': data = convertToMonthly(dailyDataRef.current); break;
      default: data = dailyDataRef.current;
    }
    
    const volumeData = generateVolumeData(data);
    const sma20Data = calculateSMA(data, 20);
    const sma50Data = calculateSMA(data, 50);
    const sma200Data = calculateSMA(data, 200);
    
    candleSeriesRef.current.setData(data);
    volumeSeriesRef.current.setData(volumeData);
    sma20Ref.current?.setData(sma20Data);
    sma50Ref.current?.setData(sma50Data);
    sma200Ref.current?.setData(sma200Data);
    
    if (data.length > 0) {
      const lastBar = data[data.length - 1] as any;
      const date = new Date((lastBar.time as number) * 1000);
      setCurrentOHLC({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        open: lastBar.open, high: lastBar.high, low: lastBar.low, close: lastBar.close,
        volume: volumeData[volumeData.length - 1]?.value ?? 0,
      });
      setSmaValues({
        sma20: sma20Data[sma20Data.length - 1]?.value ?? null,
        sma50: sma50Data[sma50Data.length - 1]?.value ?? null,
        sma200: sma200Data[sma200Data.length - 1]?.value ?? null,
      });
    }
    
    chartRef.current?.timeScale().fitContent();
  }, [timeframe, isChartReady]);

  const onSymbolChange = useCallback((sym: string) => {
    setSymbol(sym);
    try { localStorage.setItem("finotaur.activeSymbol", sym); } catch {}
  }, []);

  const isPositive = lastPrice ? lastPrice.change >= 0 : true;

  return (
    <div className="flex gap-4 h-full w-full p-4">
      {/* ═══════════════════════════════════════════════════════════════════════
          CHART SECTION - 70% width
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="w-[70%] h-full flex flex-col bg-[#131722] rounded-lg overflow-hidden border border-[#2a2e39]">
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-[#2a2e39]">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{stockInfo.symbol}</span>
              <span className="text-lg text-[#2962ff] font-medium">{stockInfo.name}</span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-[10px] text-[#787b86] uppercase">{lastCloseDate || 'Loading...'}</div>
            <div className="flex items-baseline justify-end gap-2 mt-0.5">
              {isLoading ? (
                <span className="text-xl text-[#787b86]">Loading...</span>
              ) : (
                <>
                  <span className="text-3xl font-semibold text-white tabular-nums">
                    {lastPrice?.price.toFixed(2) ?? '—'}
                  </span>
                  <div className="flex flex-col items-end text-sm">
                    <span className={`font-medium tabular-nums ${isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                      {isPositive ? '+' : ''}{lastPrice?.change.toFixed(2) ?? '—'}
                    </span>
                    <span className={`font-medium tabular-nums ${isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                      {isPositive ? '+' : ''}{lastPrice?.changePercent.toFixed(2) ?? '—'}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2e39] bg-[#1e222d]">
          <div className="flex items-center gap-4 text-sm">
            {currentOHLC && (
              <>
                <span className="text-[#787b86] font-medium">{currentOHLC.date}</span>
                <div className="flex items-center gap-3 text-[#787b86]">
                  <span>O<span className="text-white ml-1 tabular-nums">{currentOHLC.open.toFixed(2)}</span></span>
                  <span>H<span className="text-white ml-1 tabular-nums">{currentOHLC.high.toFixed(2)}</span></span>
                  <span>L<span className="text-white ml-1 tabular-nums">{currentOHLC.low.toFixed(2)}</span></span>
                  <span>C<span className="text-white ml-1 tabular-nums">{currentOHLC.close.toFixed(2)}</span></span>
                  <span>Vol<span className="text-white ml-1 tabular-nums">{formatVolume(currentOHLC.volume)}</span></span>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {(['D', 'W', 'M'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  timeframe === tf
                    ? 'bg-[#2962ff] text-white'
                    : 'text-[#787b86] hover:text-white hover:bg-[#2a2e39]'
                }`}
              >
                {tf === 'D' ? 'Daily' : tf === 'W' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>

        {/* SMA Legend */}
        <div className="flex items-center gap-5 px-4 py-1.5 text-xs bg-[#131722] border-b border-[#2a2e39]">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-[#e040fb]"></div>
            <span className="text-[#e040fb]">SMA 20</span>
            <span className="text-[#e040fb] tabular-nums font-medium">{smaValues.sma20?.toFixed(2) ?? '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-[#00bcd4]"></div>
            <span className="text-[#00bcd4]">SMA 50</span>
            <span className="text-[#00bcd4] tabular-nums font-medium">{smaValues.sma50?.toFixed(2) ?? '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-[#ff9800]"></div>
            <span className="text-[#ff9800]">SMA 200</span>
            <span className="text-[#ff9800] tabular-nums font-medium">{smaValues.sma200?.toFixed(2) ?? '—'}</span>
          </div>
        </div>

        {/* Chart Container */}
        <div ref={chartContainerRef} className="flex-1 w-full relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#131722]/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-[#2962ff] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[#787b86] text-sm">Loading {symbol}...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          WATCHLIST SECTION - 30% width
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="w-[30%] h-full flex flex-col bg-[#131722] rounded-lg border border-[#2a2e39] overflow-hidden">
        {/* Watchlist Header */}
        <div className="px-4 py-3 border-b border-[#2a2e39] bg-[#1e222d]">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Watchlist</h3>
        </div>
        
        {/* Watchlist Content */}
        <div className="flex-1 overflow-auto">
          <WatchlistTable value={symbol} onChange={onSymbolChange} />
        </div>
      </div>
    </div>
  );
};

export default ChartBoard;