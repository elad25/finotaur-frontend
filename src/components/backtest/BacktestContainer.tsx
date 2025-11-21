// ============================================================================
// BACKTEST CONTAINER - Main Component
// Complete TradingView-Level Backtesting Interface
// ============================================================================

import React, { useEffect, useState } from 'react';
import { TVChartContainer } from './TVChartContainer';
import { useBacktestStore, selectIsPlaying, selectActivePosition, selectStatistics } from '../../store/useBacktestStore';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Save,
  Calendar,
  BarChart3,
  Activity,
  DollarSign,
  Target,
  TrendingDown as ArrowDown,
} from 'lucide-react';
import type { PlaybackSpeed, Timeframe } from '../../types';

export const BacktestContainer: React.FC = () => {
  const {
    symbol,
    timeframe,
    isPlaying,
    speed,
    currentIndex,
    totalCandles,
    balance,
    equity,
    activePosition,
    closedPositions,
    statistics,
    visibleCandles,
    // Actions
    startPlayback,
    stopPlayback,
    setSpeed,
    stepForward,
    stepBackward,
    jumpToCandle,
    openPosition,
    closePosition,
    updateStopLoss,
    updateTakeProfit,
    resetBacktest,
    loadCandles,
    setSymbol,
    setTimeframe,
  } = useBacktestStore();
  
  const [positionSize, setPositionSize] = useState(1);
  const [slInput, setSlInput] = useState('');
  const [tpInput, setTpInput] = useState('');
  
  // Load initial data
  useEffect(() => {
    const to = Date.now();
    const from = to - (180 * 24 * 60 * 60 * 1000); // 6 months
    loadCandles(symbol, timeframe, from, to);
  }, [symbol, timeframe]);
  
  // Update SL/TP inputs when position changes
  useEffect(() => {
    if (activePosition) {
      setSlInput(activePosition.stopLoss?.toString() || '');
      setTpInput(activePosition.takeProfit?.toString() || '');
    } else {
      setSlInput('');
      setTpInput('');
    }
  }, [activePosition]);
  
  const currentCandle = visibleCandles[visibleCandles.length - 1];
  const currentPrice = currentCandle?.close || 0;
  
  const handleOpenLong = () => {
    if (!currentPrice) return;
    openPosition({
      type: 'long',
      price: currentPrice,
      size: positionSize,
      stopLoss: slInput ? parseFloat(slInput) : undefined,
      takeProfit: tpInput ? parseFloat(tpInput) : undefined,
    });
  };
  
  const handleOpenShort = () => {
    if (!currentPrice) return;
    openPosition({
      type: 'short',
      price: currentPrice,
      size: positionSize,
      stopLoss: slInput ? parseFloat(slInput) : undefined,
      takeProfit: tpInput ? parseFloat(tpInput) : undefined,
    });
  };
  
  const handleUpdateSL = () => {
    if (slInput && activePosition) {
      updateStopLoss(parseFloat(slInput));
    }
  };
  
  const handleUpdateTP = () => {
    if (tpInput && activePosition) {
      updateTakeProfit(parseFloat(tpInput));
    }
  };
  
  const progress = totalCandles > 0 ? (currentIndex / totalCandles) * 100 : 0;
  
  return (
    <div className="h-screen bg-[#0A0A0A] text-[#F4F4F4] flex flex-col">
      {/* Top Header */}
      <div className="bg-[#131722] border-b border-[#2B2B43] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-bold text-[#C9A646] flex items-center gap-2">
              <Activity size={24} />
              Finotaur Backtest Engine
            </h1>
            <p className="text-xs text-[#787B86] mt-0.5">
              {symbol} · {timeframe} · Historical Replay Mode
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-[#787B86]" />
            <span className="text-[#787B86]">Candle</span>
            <span className="text-[#C9A646] font-semibold">{currentIndex + 1}</span>
            <span className="text-[#787B86]">/ {totalCandles}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-[#1E222D] rounded px-4 py-2">
            <div className="text-[#787B86] text-xs mb-0.5">Balance</div>
            <div className={`text-lg font-bold ${balance >= 10000 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
              ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          
          <div className="bg-[#1E222D] rounded px-4 py-2">
            <div className="text-[#787B86] text-xs mb-0.5">Total P&L</div>
            <div className={`text-lg font-bold ${statistics.totalPnl >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
              {statistics.totalPnl >= 0 ? '+' : ''}${statistics.totalPnl.toFixed(2)}
            </div>
          </div>
          
          <div className="bg-[#1E222D] rounded px-4 py-2">
            <div className="text-[#787B86] text-xs mb-0.5">Win Rate</div>
            <div className={`text-lg font-bold ${statistics.winRate >= 50 ? 'text-[#26a69a]' : 'text-[#787B86]'}`}>
              {statistics.winRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 bg-[#131722] border-r border-[#2B2B43] p-4 overflow-y-auto">
          {/* Playback Controls */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#C9A646] mb-3 flex items-center gap-2">
              <Play size={16} />
              Playback Controls
            </h3>
            
            <div className="flex gap-2 mb-3">
              <button
                onClick={isPlaying ? stopPlayback : startPlayback}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded font-medium transition-colors ${
                  isPlaying 
                    ? 'bg-[#ef5350] hover:bg-[#d84644] text-white' 
                    : 'bg-[#2962FF] hover:bg-[#1E53E5] text-white'
                }`}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              
              <button
                onClick={stepBackward}
                className="bg-[#1E222D] hover:bg-[#2A2E39] p-2.5 rounded transition-colors"
                disabled={currentIndex === 0}
              >
                <SkipBack size={18} />
              </button>
              
              <button
                onClick={stepForward}
                className="bg-[#1E222D] hover:bg-[#2A2E39] p-2.5 rounded transition-colors"
                disabled={currentIndex >= totalCandles - 1}
              >
                <SkipForward size={18} />
              </button>
              
              <button
                onClick={resetBacktest}
                className="bg-[#1E222D] hover:bg-[#2A2E39] p-2.5 rounded transition-colors"
              >
                <RotateCcw size={18} />
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-[#787B86] mb-1">
                <span>Progress</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-[#1E222D] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#C9A646] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            {/* Speed Controls */}
            <div className="space-y-2">
              <div className="text-xs text-[#787B86]">Playback Speed</div>
              <div className="grid grid-cols-4 gap-2">
                {([0.5, 1, 2, 5] as PlaybackSpeed[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`py-1.5 rounded text-sm font-medium transition-colors ${
                      speed === s 
                        ? 'bg-[#C9A646] text-[#0A0A0A]' 
                        : 'bg-[#1E222D] hover:bg-[#2A2E39] text-[#D1D4DC]'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([10, 'max'] as PlaybackSpeed[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`py-1.5 rounded text-sm font-medium transition-colors ${
                      speed === s 
                        ? 'bg-[#C9A646] text-[#0A0A0A]' 
                        : 'bg-[#1E222D] hover:bg-[#2A2E39] text-[#D1D4DC]'
                    }`}
                  >
                    {s === 'max' ? 'MAX' : `${s}x`}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Trading Controls */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#C9A646] mb-3 flex items-center gap-2">
              <TrendingUp size={16} />
              Trading
            </h3>
            
            <div className="space-y-2">
              <button
                onClick={handleOpenLong}
                disabled={!!activePosition}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded font-semibold transition-colors ${
                  activePosition 
                    ? 'bg-[#1E222D] text-[#434651] cursor-not-allowed' 
                    : 'bg-[#26a69a] hover:bg-[#1f8a7e] text-white'
                }`}
              >
                <TrendingUp size={20} />
                BUY / LONG
              </button>
              
              <button
                onClick={handleOpenShort}
                disabled={!!activePosition}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded font-semibold transition-colors ${
                  activePosition 
                    ? 'bg-[#1E222D] text-[#434651] cursor-not-allowed' 
                    : 'bg-[#ef5350] hover:bg-[#d84644] text-white'
                }`}
              >
                <TrendingDown size={20} />
                SELL / SHORT
              </button>
              
              {activePosition && (
                <button
                  onClick={() => closePosition('manual')}
                  className="w-full py-3 bg-[#C9A646] hover:bg-[#B89536] text-[#0A0A0A] rounded font-semibold transition-colors"
                >
                  Close Position
                </button>
              )}
            </div>
            
            {/* Position Size */}
            <div className="mt-4">
              <label className="text-xs text-[#787B86] mb-2 block">Position Size</label>
              <input
                type="number"
                value={positionSize}
                onChange={(e) => setPositionSize(Number(e.target.value))}
                className="w-full bg-[#1E222D] border border-[#2B2B43] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#C9A646]"
                min="0.01"
                step="0.1"
              />
            </div>
            
            {/* SL/TP Inputs */}
            <div className="mt-4 space-y-2">
              <div>
                <label className="text-xs text-[#787B86] mb-1 block">Stop Loss</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={slInput}
                    onChange={(e) => setSlInput(e.target.value)}
                    placeholder="Set SL"
                    className="flex-1 bg-[#1E222D] border border-[#2B2B43] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#ef5350]"
                    step="0.01"
                  />
                  {activePosition && (
                    <button
                      onClick={handleUpdateSL}
                      className="px-3 py-2 bg-[#ef5350] hover:bg-[#d84644] text-white rounded text-xs font-semibold"
                    >
                      Set
                    </button>
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-xs text-[#787B86] mb-1 block">Take Profit</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={tpInput}
                    onChange={(e) => setTpInput(e.target.value)}
                    placeholder="Set TP"
                    className="flex-1 bg-[#1E222D] border border-[#2B2B43] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#26a69a]"
                    step="0.01"
                  />
                  {activePosition && (
                    <button
                      onClick={handleUpdateTP}
                      className="px-3 py-2 bg-[#26a69a] hover:bg-[#1f8a7e] text-white rounded text-xs font-semibold"
                    >
                      Set
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Active Position */}
          {activePosition && (
            <div className="mb-6 bg-[#1E222D] border border-[#C9A646] rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className={`px-3 py-1 rounded font-semibold text-sm ${
                  activePosition.type === 'long' ? 'bg-[#26a69a] text-white' : 'bg-[#ef5350] text-white'
                }`}>
                  {activePosition.type.toUpperCase()} POSITION
                </div>
                {activePosition.riskRewardRatio && (
                  <div className="text-[#C9A646] font-semibold text-sm flex items-center gap-1">
                    <Target size={14} />
                    R:R 1:{activePosition.riskRewardRatio.toFixed(2)}
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-[#787B86] mb-1">Entry Price</div>
                  <div className="text-lg font-bold">${activePosition.entryPrice.toFixed(2)}</div>
                </div>
                
                <div className="pt-3 border-t border-[#2B2B43]">
                  <div className="text-xs text-[#787B86] mb-1">Current P&L</div>
                  <div className={`text-2xl font-bold ${
                    (activePosition.unrealizedPnl || 0) >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'
                  }`}>
                    {(activePosition.unrealizedPnl || 0) >= 0 ? '+' : ''}${(activePosition.unrealizedPnl || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-[#787B86] mt-1">
                    {(activePosition.unrealizedPnlPercent || 0) >= 0 ? '+' : ''}{(activePosition.unrealizedPnlPercent || 0).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Statistics */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#C9A646] mb-3 flex items-center gap-2">
              <BarChart3 size={16} />
              Statistics
            </h3>
            
            <div className="bg-[#1E222D] rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#787B86]">Total Trades</span>
                <span className="font-semibold">{statistics.totalTrades}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#787B86]">Winning Trades</span>
                <span className="font-semibold text-[#26a69a]">{statistics.winningTrades}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#787B86]">Win Rate</span>
                <span className={`font-semibold ${statistics.winRate >= 50 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                  {statistics.winRate.toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#787B86]">Avg R:R</span>
                <span className="font-semibold text-[#C9A646]">
                  {statistics.avgRR > 0 ? `1:${statistics.avgRR.toFixed(2)}` : '-'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#787B86]">Profit Factor</span>
                <span className="font-semibold text-[#C9A646]">
                  {statistics.profitFactor.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-[#2B2B43]">
                <span className="text-xs text-[#787B86]">Net P&L</span>
                <span className={`font-bold ${statistics.netProfit >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                  {statistics.netProfit >= 0 ? '+' : ''}${statistics.netProfit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Save Button */}
          <button className="w-full bg-[#C9A646] hover:bg-[#B89536] text-[#0A0A0A] py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
            <Save size={18} />
            Save Session to Journal
          </button>
        </div>
        
        {/* Center - Chart */}
        <div className="flex-1 flex flex-col bg-[#131722]">
          {/* Chart Toolbar */}
          <div className="bg-[#131722] border-b border-[#2B2B43] px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {currentCandle && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-[#787B86]">O</span>
                  <span className="text-[#D1D4DC]">{currentCandle.open.toFixed(2)}</span>
                  <span className="text-[#787B86]">H</span>
                  <span className="text-[#26a69a]">{currentCandle.high.toFixed(2)}</span>
                  <span className="text-[#787B86]">L</span>
                  <span className="text-[#ef5350]">{currentCandle.low.toFixed(2)}</span>
                  <span className="text-[#787B86]">C</span>
                  <span className={`font-semibold ${
                    currentCandle.close >= currentCandle.open ? 'text-[#26a69a]' : 'text-[#ef5350]'
                  }`}>
                    {currentCandle.close.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* TradingView Chart */}
          <div className="flex-1">
            <TVChartContainer
              symbol={symbol}
              interval={timeframe as any}
              autosize
            />
          </div>
        </div>
        
        {/* Right Sidebar - Trade History */}
        <div className="w-80 bg-[#131722] border-l border-[#2B2B43] p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-[#C9A646] mb-4 flex items-center gap-2">
            <BarChart3 size={16} />
            Trade History ({closedPositions.length})
          </h3>
          
          <div className="space-y-2">
            {closedPositions.length === 0 ? (
              <div className="text-center text-[#787B86] py-12 text-sm">
                No trades yet.<br/>Start backtesting!
              </div>
            ) : (
              closedPositions.slice().reverse().map((trade, index) => (
                <div 
                  key={trade.id}
                  className="bg-[#1E222D] hover:bg-[#2A2E39] border border-[#2B2B43] rounded-lg p-3 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        trade.type === 'long' ? 'bg-[#26a69a]' : 'bg-[#ef5350]'
                      }`} />
                      <span className="text-xs font-semibold text-[#787B86]">
                        #{closedPositions.length - index}
                      </span>
                      <span className={`text-xs font-semibold ${
                        trade.type === 'long' ? 'text-[#26a69a]' : 'text-[#ef5350]'
                      }`}>
                        {trade.type.toUpperCase()}
                      </span>
                    </div>
                    <div className={`text-sm font-bold ${
                      (trade.realizedPnl || 0) >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'
                    }`}>
                      {(trade.realizedPnl || 0) >= 0 ? '+' : ''}${trade.realizedPnl?.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#787B86]">Entry:</span>
                      <span className="ml-1 text-[#D1D4DC]">${trade.entryPrice.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[#787B86]">Exit:</span>
                      <span className="ml-1 text-[#D1D4DC]">${trade.exitPrice?.toFixed(2)}</span>
                    </div>
                    {trade.riskRewardRatio && (
                      <div className="col-span-2">
                        <span className="text-[#787B86]">R:R:</span>
                        <span className="ml-1 text-[#C9A646] font-medium">1:{trade.riskRewardRatio.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-[#787B86]">Return:</span>
                      <span className={`ml-1 font-medium ${
                        (trade.realizedPnlPercent || 0) >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'
                      }`}>
                        {(trade.realizedPnlPercent || 0) >= 0 ? '+' : ''}{trade.realizedPnlPercent?.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BacktestContainer;