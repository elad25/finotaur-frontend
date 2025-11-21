// contexts/BacktestContext.tsx - FIXED VERSION
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CandlestickData, Position, ReplaySpeed, CandleStyle, TimeframeConfig } from '../types';

// Symbol interface
export interface Symbol {
  symbol: string;
  name: string;
  category: 'crypto' | 'stocks' | 'forex' | 'futures' | 'indices';
  exchange: string;
  logo?: string;
  baseAsset?: string;
  quoteAsset?: string;
  description?: string;
}

// ✅ REMOVED local Timeframe interface - using TimeframeConfig from types

interface BacktestState {
  // Symbol & Market Data
  symbol: Symbol;
  timeframe: TimeframeConfig; // ✅ CHANGED
  chartType: CandleStyle;
  allCandles: CandlestickData[];
  
  // Replay State
  currentIndex: number | null;
  isPlaying: boolean;
  speed: ReplaySpeed;
  cutPointIndex: number | null;
  
  // Trading State
  positions: Position[];
  
  // UI State
  showSymbolSearch: boolean;
  soundEnabled: boolean;
  
  // Crosshair State
  hoveredCandle: CandlestickData | null;
}

interface BacktestActions {
  // Data Loading
  setSymbol: (symbol: Symbol) => void;
  setTimeframe: (timeframe: TimeframeConfig) => void; // ✅ CHANGED
  setChartType: (type: CandleStyle) => void;
  setAllCandles: (candles: CandlestickData[]) => void;
  
  // Replay Controls
  setCurrentIndex: (index: number | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setSpeed: (speed: ReplaySpeed) => void;
  setCutPointIndex: (index: number | null) => void;
  play: () => void;
  pause: () => void;
  
  // Crosshair
  updateHoveredCandle: (candle: CandlestickData | null) => void;
  
  // Trading
  setPositions: (positions: Position[]) => void;
  
  // UI
  toggleSymbolSearch: () => void;
  toggleSound: () => void;
}

type BacktestContextType = BacktestState & BacktestActions;

const BacktestContext = createContext<BacktestContextType | undefined>(undefined);

export const BacktestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State
  const [symbol, setSymbol] = useState<Symbol>({
    symbol: 'BTCUSDT',
    name: 'Bitcoin / Tether',
    category: 'crypto',
    exchange: 'Binance',
  });
  
  const [timeframe, setTimeframe] = useState<TimeframeConfig>({
    value: '1h',
    label: '1 hour',
    seconds: 3600,
    minutes: 60,
    limit: 1000,
    binanceInterval: '1h',
  });
  
  const [chartType, setChartType] = useState<CandleStyle>('candles');
  const [allCandles, setAllCandles] = useState<CandlestickData[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const [cutPointIndex, setCutPointIndex] = useState<number | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hoveredCandle, setHoveredCandle] = useState<CandlestickData | null>(null);

  // Actions
  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggleSymbolSearch = useCallback(() => setShowSymbolSearch(prev => !prev), []);
  const toggleSound = useCallback(() => setSoundEnabled(prev => !prev), []);
  const updateHoveredCandle = useCallback((candle: CandlestickData | null) => {
    setHoveredCandle(candle);
  }, []);

  const value: BacktestContextType = {
    // State
    symbol,
    timeframe,
    chartType,
    allCandles,
    currentIndex,
    isPlaying,
    speed,
    cutPointIndex,
    positions,
    showSymbolSearch,
    soundEnabled,
    hoveredCandle,
    
    // Actions
    setSymbol,
    setTimeframe,
    setChartType,
    setAllCandles,
    setCurrentIndex,
    setIsPlaying,
    setSpeed,
    setCutPointIndex,
    play,
    pause,
    updateHoveredCandle,
    setPositions,
    toggleSymbolSearch,
    toggleSound,
  };

  return (
    <BacktestContext.Provider value={value}>
      {children}
    </BacktestContext.Provider>
  );
};

export const useBacktest = () => {
  const context = useContext(BacktestContext);
  if (!context) {
    throw new Error('useBacktest must be used within BacktestProvider');
  }
  return context;
};