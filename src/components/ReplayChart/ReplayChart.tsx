// ReplayChart.tsx - COMPLETE UPDATED VERSION WITH ALL FIXES
import React, { 
  forwardRef, 
  useImperativeHandle, 
  useState, 
  useRef, 
  useEffect,
  useCallback,
  useMemo 
} from 'react';
import { 
  Theme, 
  TimeframeConfig, 
  Timeframe,
  ReplayMode, 
  ReplaySpeed, 
  Position, 
  Drawing, 
  CandlestickData, 
  CandleStyle,
  PositionSide,
  OrderTypeUI,
  positionSideToSide,
  orderTypeUIToEnum,
  Side,
  OrderType,
  OrderStatus,
  Order,
} from './types';
import { TIMEFRAMES } from './constants';
import { dataManager } from './data';
import { PaperTradingEngine } from './trading';
import { 
  useChart, 
  useReplay, 
  useDrawings, 
  useKeyboard, 
  usePerformance,
  useCrosshair 
} from './hooks';
import { ChartCore } from './core';
import { DrawingLayer } from './drawings';
import { ReplayControls } from './replay';
import { SymbolSearch } from './symbols';
import {
  TopToolbar,
  DrawingToolbar,
  LoadingOverlay,
  ErrorBoundary,
  PositionsPanel,
} from './ui';
import {
  OrderTicket,
} from './trading';
import { cn } from '@/lib/utils';

// ===================================
// TYPES
// ===================================

export interface ReplayChartProps {
  symbol?: string;
  timeframe?: TimeframeConfig | string;
  theme?: Theme;
  enablePaperTrading?: boolean;
  enableDrawings?: boolean;
  initialBalance?: number;
  leverage?: number;
  className?: string;
  onSymbolChange?: (symbol: string) => void;
  onTimeframeChange?: (timeframe: TimeframeConfig) => void;
  onDataLoad?: (data: CandlestickData[]) => void;
  onError?: (error: Error) => void;
}

export interface ReplayChartRef {
  // Data
  loadData: (symbol: string, timeframe: Timeframe | TimeframeConfig) => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Replay
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: ReplaySpeed) => void;
  
  // Trading
  openPosition: (side: 'long' | 'short', quantity: number) => void;
  closePosition: (id: string) => void;
  closeAllPositions: () => void;
  getPositions: () => Position[];
  getStats: () => any;
  
  // Drawings
  clearDrawings: () => void;
  exportDrawings: () => Drawing[];
  importDrawings: (drawings: Drawing[]) => void;
  
  // Cut Point
  setCutPoint: (index: number) => void;
  clearCutPoint: () => void;
}

// ===================================
// MAIN COMPONENT
// ===================================

export const ReplayChart = forwardRef<ReplayChartRef, ReplayChartProps>((
  {
    symbol: initialSymbol = 'BTCUSDT',
    timeframe: initialTimeframe = '1h',
    theme = 'dark',
    enablePaperTrading = true,
    enableDrawings = true,
    initialBalance = 10000,
    leverage = 1,
    className = '',
    onSymbolChange,
    onTimeframeChange,
    onDataLoad,
    onError,
  },
  ref
) => {
  // ===================================
  // STATE
  // ===================================

  const [symbol, setSymbol] = useState(initialSymbol);
  
  const [timeframe, setTimeframe] = useState<TimeframeConfig>(() => {
    if (typeof initialTimeframe === 'string') {
      return TIMEFRAMES.find(tf => tf.value === initialTimeframe) || TIMEFRAMES[5];
    }
    return initialTimeframe;
  });
  
  const [allData, setAllData] = useState<CandlestickData[]>([]);
  const [visibleData, setVisibleData] = useState<CandlestickData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cutPointIndex, setCutPointIndex] = useState<number | null>(null);
  const [chartType, setChartType] = useState<CandleStyle>('candles');
  const [showVolume, setShowVolume] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [showOrderTicket, setShowOrderTicket] = useState(false);
  const [showPositions, setShowPositions] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // ===================================
  // HOOKS
  // ===================================

  const { chart, renderer, handleChartReady } = useChart({ theme });

  const {
    currentIndex,
    isPlaying,
    speed,
    mode,
    progress,
    play,
    pause,
    toggle: togglePlay,
    reset: resetReplay,
    stepForward,
    stepBackward,
    jumpToStart,
    jumpToEnd,
    jumpToPercentage,
    jumpToIndex,
    setSpeed,
    speedUp,
    speedDown,
    toggleMode,
    setMode,
    setCutPoint: replayCutPoint,
    clearCutPoint: replayClearCutPoint,
  } = useReplay({
    allData,
    cutPointIndex,
    onReplayEnd: () => {
      console.log('🎬 Replay ended');
    },
    onCutPointReached: () => {
      console.log('✂️ Cut point reached');
    },
  });

  const {
    drawings,
    activeDrawing,
    selectedDrawing,
    currentTool,
    canUndo,
    canRedo,
    setCurrentTool,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
    selectDrawing,
    deselectAll,
    deleteSelected,
    deleteAll,
    lockSelected,
    toggleVisibility,
    undo,
    redo,
  } = useDrawings({
    symbol,
    theme,
    autoSave: true,
  });

  const { 
    time,
    price,
    open,
    high,
    low,
    close,
    volume,
    handleCrosshairMove,
    reset: resetCrosshair,
  } = useCrosshair();

  const { fps, renderTime, memoryUsage } = usePerformance({
    enabled: process.env.NODE_ENV === 'development',
  });

  const tradingEngineRef = useRef<PaperTradingEngine>(
    new PaperTradingEngine(initialBalance, leverage)
  );

  const [positions, setPositions] = useState<Position[]>([]);

  // ===================================
  // KEYBOARD SHORTCUTS
  // ===================================

  useKeyboard({
    onTogglePlay: togglePlay,
    onStepForward: stepForward,
    onStepBackward: stepBackward,
    onSpeedUp: speedUp,
    onSpeedDown: speedDown,
    onSelectCursor: () => setCurrentTool('cursor'),
    onSelectCrosshair: () => setCurrentTool('cross'),
    onSelectTrendline: () => setCurrentTool('trendline'),
    onSelectHorizontal: () => setCurrentTool('horizontal'),
    onSelectVertical: () => setCurrentTool('vertical'),
    onSelectRay: () => setCurrentTool('ray'),
    onSelectFibonacci: () => setCurrentTool('fibonacci'),
    onDeleteSelected: deleteSelected,
    onCancel: () => {
      cancelDrawing();
      deselectAll();
      setShowOrderTicket(false);
    },
    onUndo: undo,
    onRedo: redo,
    onOpenBuyOrder: () => enablePaperTrading && setShowOrderTicket(true),
    onOpenSellOrder: () => enablePaperTrading && setShowOrderTicket(true),
    onCloseAllPositions: () => {
      if (enablePaperTrading && currentIndex !== null) {
        const currentPrice = allData[currentIndex]?.close || 0;
        tradingEngineRef.current.closeAllPositions(
          currentPrice,
          allData[currentIndex]?.time as number
        );
        setPositions(tradingEngineRef.current.getPositions());
      }
    },
  });

  // ===================================
  // DATA LOADING
  // ===================================

  const loadData = useCallback(async (sym: string, tf: Timeframe | TimeframeConfig) => {
    const timeframeConfig: TimeframeConfig = typeof tf === 'string'
      ? TIMEFRAMES.find(t => t.value === tf) || TIMEFRAMES[5]
      : tf;
    
    console.log(`🔄 Loading data: ${sym} ${timeframeConfig.label}`);
    
    setIsLoading(true);
    setError(null);

    try {
      const data = await dataManager.fetchData(sym, timeframeConfig.value, {
        limit: 5000,
      });

      console.log(`✅ Data loaded: ${data.length} candles`);

      setAllData(data);
      setSymbol(sym);
      setTimeframe(timeframeConfig);
      setCutPointIndex(null);
      replayClearCutPoint();

      if (mode === 'live') {
        console.log('🎬 Switching to replay mode');
        setMode('replay');
      }

      resetReplay();
      resetCrosshair();

      if (onDataLoad) {
        onDataLoad(data);
      }

      if (onSymbolChange && sym !== symbol) {
        onSymbolChange(sym);
      }

      if (onTimeframeChange && timeframeConfig.value !== timeframe.value) {
        onTimeframeChange(timeframeConfig);
      }
    } catch (err) {
      const error = err as Error;
      console.error('❌ Data loading error:', error);
      setError(error);
      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onDataLoad, onSymbolChange, onTimeframeChange, onError, mode, resetReplay, symbol, timeframe, setMode, replayClearCutPoint, resetCrosshair]);

  // Load initial data
  useEffect(() => {
    console.log('📊 Initial mount - loading data');
    loadData(symbol, timeframe);
  }, []);

  // Handle prop changes
  useEffect(() => {
    const initialTfConfig = typeof initialTimeframe === 'string'
      ? TIMEFRAMES.find(tf => tf.value === initialTimeframe) || TIMEFRAMES[5]
      : initialTimeframe;
    
    if (initialSymbol !== symbol || initialTfConfig.value !== timeframe.value) {
      console.log('🔄 Props changed - reloading data');
      loadData(initialSymbol, initialTfConfig);
    }
  }, [initialSymbol, initialTimeframe]);

  // ===================================
  // DATA SLICING (REPLAY) WITH CUT POINT
  // ===================================

  useEffect(() => {
    if (mode === 'live') {
      const dataToShow = cutPointIndex !== null 
        ? allData.slice(0, cutPointIndex + 1)
        : allData;
      
      setVisibleData(dataToShow);
      
      if (renderer) {
        console.log(`🎨 Setting visible data (live mode): ${dataToShow.length} candles`);
        renderer.setData(dataToShow);
      }
    } else if (mode === 'replay' && currentIndex !== null) {
      const maxIndex = cutPointIndex !== null 
        ? Math.min(currentIndex, cutPointIndex)
        : currentIndex;
      
      const slicedData = allData.slice(0, maxIndex + 1);
      setVisibleData(slicedData);
      
      if (renderer) {
        renderer.setData(slicedData);
      }

      if (enablePaperTrading && allData[maxIndex]) {
        tradingEngineRef.current.updatePositions(allData[maxIndex]);
        setPositions(tradingEngineRef.current.getPositions());
      }
    }
  }, [mode, currentIndex, allData, renderer, enablePaperTrading, cutPointIndex]);

  // ===================================
  // CUT POINT HANDLERS
  // ===================================

  const handleSetCutPoint = useCallback((index: number) => {
    console.log(`✂️ Setting cut point at candle #${index + 1}`);
    setCutPointIndex(index);
    replayCutPoint(index);
    
    if (mode === 'live') {
      setMode('replay');
    }
    
    if (currentIndex !== null && currentIndex > index) {
      jumpToIndex(index);
    }
  }, [mode, currentIndex, setMode, jumpToIndex, replayCutPoint]);

  const handleClearCutPoint = useCallback(() => {
    console.log('✂️ Clearing cut point');
    setCutPointIndex(null);
    replayClearCutPoint();
  }, [replayClearCutPoint]);

  // ===================================
  // CHART INTERACTIONS
  // ===================================

  const handleChartClick = useCallback((event: any) => {
    if (!enableDrawings) return;

    const point = {
      time: event.time,
      price: event.price,
    };

    if (currentTool !== 'cursor' && currentTool !== 'cross') {
      if (!activeDrawing) {
        startDrawing(point);
      } else {
        updateDrawing(point);
      }
    } else if (currentTool === 'cursor') {
      selectDrawing({ x: event.x, y: event.y });
    }
  }, [
    enableDrawings,
    currentTool,
    activeDrawing,
    startDrawing,
    updateDrawing,
    selectDrawing,
  ]);

  // ===================================
  // ✅ CHART TYPE CHANGE HANDLER
  // ===================================

  const handleChartTypeChange = useCallback((type: CandleStyle) => {
    console.log(`📊 Chart type changed to: ${type}`);
    setChartType(type);
    
    if (renderer) {
      renderer.setCandleStyle(type, theme);
    } else {
      console.warn('⚠️ Renderer not ready for chart type change');
    }
  }, [renderer, theme]);

  // ===================================
  // TRADING ACTIONS
  // ===================================

  const handleOpenOrder = useCallback((order: {
    side: PositionSide;
    type: OrderTypeUI;
    quantity: number;
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => {
    if (!enablePaperTrading || currentIndex === null) return;

    const currentCandle = allData[currentIndex];
    if (!currentCandle) return;

    const sideEnum = positionSideToSide(order.side);
    const orderTypeEnum = orderTypeUIToEnum(order.type);

    const entryPrice = order.type === 'market' 
      ? currentCandle.close 
      : (order.price || currentCandle.close);

    const orderObj: Order = {
      orderId: `ORDER-${Date.now()}`,
      symbol,
      side: sideEnum,
      orderType: orderTypeEnum,
      size: order.quantity,
      price: entryPrice,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
      status: OrderStatus.PENDING,
      timestamp: currentCandle.time as number,
    };

    if (orderTypeEnum === OrderType.MARKET) {
      tradingEngineRef.current.executeMarketOrder(orderObj, currentCandle);
    } else if (orderTypeEnum === OrderType.LIMIT) {
      tradingEngineRef.current.placeLimitOrder(orderObj);
    }

    setPositions(tradingEngineRef.current.getPositions());
  }, [enablePaperTrading, currentIndex, allData, symbol]);

  const handleClosePosition = useCallback((id: string) => {
    if (!enablePaperTrading || currentIndex === null) return;

    const currentCandle = allData[currentIndex];
    if (!currentCandle) return;

    tradingEngineRef.current.closePosition(
      id,
      currentCandle.close,
      currentCandle.time as number
    );

    setPositions(tradingEngineRef.current.getPositions());
  }, [enablePaperTrading, currentIndex, allData]);

  // ===================================
  // IMPERATIVE HANDLE (REF)
  // ===================================

  useImperativeHandle(ref, () => ({
    loadData,
    refreshData: () => loadData(symbol, timeframe),
    play,
    pause,
    reset: resetReplay,
    setSpeed,
    openPosition: (side, quantity) => {
      handleOpenOrder({
        side,
        type: 'market',
        quantity,
      });
    },
    closePosition: handleClosePosition,
    closeAllPositions: () => {
      if (currentIndex !== null) {
        const currentPrice = allData[currentIndex]?.close || 0;
        tradingEngineRef.current.closeAllPositions(
          currentPrice,
          allData[currentIndex]?.time as number
        );
        setPositions(tradingEngineRef.current.getPositions());
      }
    },
    getPositions: () => tradingEngineRef.current.getPositions(),
    getStats: () => tradingEngineRef.current.getStats(),
    clearDrawings: deleteAll,
    exportDrawings: () => drawings,
    importDrawings: (drw) => {
      // TODO: Implement import
    },
    setCutPoint: handleSetCutPoint,
    clearCutPoint: handleClearCutPoint,
  }), [
    loadData,
    symbol,
    timeframe,
    play,
    pause,
    resetReplay,
    setSpeed,
    handleOpenOrder,
    handleClosePosition,
    currentIndex,
    allData,
    deleteAll,
    drawings,
    handleSetCutPoint,
    handleClearCutPoint,
  ]);

  // ===================================
  // OHLC CALCULATION
  // ===================================

  const currentCandle = useMemo(() => 
    currentIndex !== null 
      ? allData[currentIndex] 
      : allData[allData.length - 1]
  , [currentIndex, allData]);

  const ohlc = useMemo(() => {
    if (open !== null && high !== null && low !== null && close !== null) {
      return {
        open,
        high,
        low,
        close,
        change: close - open,
        changePercent: ((close - open) / open) * 100,
        time: time ?? undefined,
        volume,
      };
    }
    
    if (currentCandle) {
      return {
        open: currentCandle.open,
        high: currentCandle.high,
        low: currentCandle.low,
        close: currentCandle.close,
        change: currentCandle.close - currentCandle.open,
        changePercent: ((currentCandle.close - currentCandle.open) / currentCandle.open) * 100,
        time: currentCandle.time as number,
        volume: currentCandle.volume,
      };
    }
    
    return undefined;
  }, [open, high, low, close, time, volume, currentCandle]);

  // ===================================
  // RENDER
  // ===================================

  return (
    <ErrorBoundary theme={theme}>
      <div
        ref={containerRef}
        className={cn(
          'relative w-full h-full overflow-hidden',
          theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-white',
          className
        )}
      >
        {/* ✅ Top Toolbar - WITH CHART TYPE HANDLER */}
        <TopToolbar
          symbol={symbol}
          timeframe={timeframe}
          theme={theme}
          chartType={chartType}
          showVolume={showVolume}
          isFullscreen={isFullscreen}
          onSymbolClick={() => setShowSymbolSearch(true)}
          onTimeframeChange={(tf) => {
            console.log(`⏱️ Timeframe changed to: ${tf.label}`);
            loadData(symbol, tf);
          }}
          onChartTypeChange={handleChartTypeChange}
          onVolumeToggle={() => setShowVolume(!showVolume)}
          onFullscreenToggle={() => setIsFullscreen(!isFullscreen)}
          onScreenshot={() => {
            console.log('📸 Screenshot clicked');
          }}
          ohlc={ohlc}
        />

        {/* Chart Area */}
        <div className="absolute inset-0 top-14 bottom-16">
          <ChartCore
            theme={theme}
            onChartReady={handleChartReady}
            onCrosshairMove={handleCrosshairMove}
            onClick={handleChartClick}
          />

          {/* Drawing Layer */}
          {enableDrawings && chart && (
            <DrawingLayer
              drawings={drawings}
              activeDrawing={activeDrawing}
              chart={chart}
              candlestickSeries={renderer?.getCandlestickSeries() || null}
              containerRef={containerRef}
              theme={theme}
            />
          )}

          {/* Drawing Toolbar */}
          {enableDrawings && (
            <DrawingToolbar
              currentTool={currentTool}
              hasSelection={!!selectedDrawing}
              isSelectionLocked={selectedDrawing?.locked || false}
              canUndo={canUndo}
              canRedo={canRedo}
              theme={theme}
              onToolSelect={setCurrentTool}
              onDeleteSelected={deleteSelected}
              onUndo={undo}
              onRedo={redo}
              onLockToggle={lockSelected}
              onVisibilityToggle={toggleVisibility}
            />
          )}

          {/* Positions Panel */}
          {enablePaperTrading && showPositions && positions.length > 0 && (
            <PositionsPanel
              positions={positions}
              theme={theme}
              onClose={() => setShowPositions(false)}
              onClosePosition={handleClosePosition}
            />
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <LoadingOverlay
              message={`Loading ${symbol} ${timeframe.label}...`}
              theme={theme}
            />
          )}
        </div>

        {/* ✅ Replay Controls - WITHOUT STATS */}
        <ReplayControls
          isPlaying={isPlaying}
          speed={speed}
          currentIndex={currentIndex || 0}
          totalCandles={cutPointIndex !== null ? cutPointIndex + 1 : allData.length}
          progress={progress}
          cutPointIndex={cutPointIndex}
          onPlay={play}
          onPause={pause}
          onStepForward={stepForward}
          onStepBackward={stepBackward}
          onJumpToStart={jumpToStart}
          onJumpToEnd={cutPointIndex !== null 
            ? () => jumpToIndex(cutPointIndex) 
            : jumpToEnd
          }
          onSpeedChange={setSpeed}
          onProgressChange={jumpToPercentage}
          onSetCutPoint={handleSetCutPoint}
          onClearCutPoint={handleClearCutPoint}
          theme={theme}
        />

        {/* Symbol Search Modal */}
        {showSymbolSearch && (
          <SymbolSearch
            isOpen={showSymbolSearch}
            currentSymbol={symbol}
            theme={theme}
            onSelect={(sym) => {
              console.log(`🔍 Symbol selected: ${sym}`);
              loadData(sym, timeframe);
              setShowSymbolSearch(false);
            }}
            onClose={() => setShowSymbolSearch(false)}
          />
        )}

        {/* Order Ticket Modal */}
        {enablePaperTrading && showOrderTicket && currentCandle && (
          <OrderTicket
            symbol={symbol}
            currentPrice={currentCandle.close}
            theme={theme}
            onSubmit={handleOpenOrder}
            onClose={() => setShowOrderTicket(false)}
          />
        )}

        {/* Performance Monitor (Dev Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute bottom-20 left-4 text-xs font-mono text-white/50 space-y-1 bg-black/50 p-2 rounded">
            <div>FPS: {fps}</div>
            <div>Render: {renderTime.toFixed(2)}ms</div>
            <div>Memory: {memoryUsage.toFixed(0)}MB</div>
            <div>Candles: {allData.length}</div>
            <div>Mode: {mode}</div>
            <div>Index: {currentIndex ?? 'null'}</div>
            {cutPointIndex !== null && (
              <div className="text-[#C9A646]">✂️ Cut: #{cutPointIndex + 1}</div>
            )}
            {ohlc && (
              <div className="text-green-400">
                OHLC: {ohlc.open.toFixed(2)} / {ohlc.close.toFixed(2)}
              </div>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
});

ReplayChart.displayName = 'ReplayChart';