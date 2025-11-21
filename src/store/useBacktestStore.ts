// ============================================================================
// FINOTAUR BACKTEST STORE - Main Zustand State Management
// ============================================================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  Candle,
  Position,
  TradeDirection,
  Timeframe,
  PlaybackSpeed,
  BacktestStatistics,
  BacktestStore,
} from '../types';
import { PlaybackEngine } from '../core/engines/PlaybackEngine';
import { OrderExecutionEngine } from '../core/engines/OrderExecutionEngine';
import { StatisticsEngine } from '../core/engines/StatisticsEngine';
import { udfClient } from '../services/api/udfClient';
import { supabaseClient } from '../services/api/supabaseClient';
import { indexedDBService } from '../services/cache/indexedDBService';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  // Configuration
  symbol: 'BTC/USD',
  timeframe: '1D' as Timeframe,
  startDate: Date.now() - 180 * 24 * 60 * 60 * 1000, // 6 months ago
  endDate: Date.now(),
  initialBalance: 10000,
  
  // Playback
  isPlaying: false,
  speed: 1 as PlaybackSpeed,
  currentIndex: 0,
  totalCandles: 0,
  
  // Data
  candles: [] as Candle[],
  visibleCandles: [] as Candle[],
  
  // Positions & Orders
  activePosition: undefined as Position | undefined,
  closedPositions: [] as Position[],
  orders: [],
  
  // Account
  balance: 10000,
  equity: 10000,
  margin: 0,
  marginLevel: 0,
  
  // Statistics
  statistics: {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    breakEvenTrades: 0,
    winRate: 0,
    lossRate: 0,
    totalPnl: 0,
    totalPnlPercent: 0,
    grossProfit: 0,
    grossLoss: 0,
    netProfit: 0,
    avgWin: 0,
    avgLoss: 0,
    avgRR: 0,
    avgTradeDuration: 0,
    profitFactor: 0,
    expectancy: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    maxDrawdownPercent: 0,
    recoveryFactor: 0,
    maxConsecutiveWins: 0,
    maxConsecutiveLosses: 0,
    currentStreak: 0,
    largestWin: 0,
    largestLoss: 0,
    avgRiskAmount: 0,
    totalRiskTaken: 0,
    tradingDays: 0,
    avgTradesPerDay: 0,
    equityCurve: [],
    drawdownCurve: [],
  } as BacktestStatistics,
};

// ============================================================================
// ENGINES INITIALIZATION
// ============================================================================

let playbackEngine: PlaybackEngine;
let orderEngine: OrderExecutionEngine;
let statsEngine: StatisticsEngine;

// ============================================================================
// MAIN STORE
// ============================================================================

export const useBacktestStore = create<BacktestStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,
      
      // ========================================================================
      // PLAYBACK ACTIONS
      // ========================================================================
      
      startPlayback: () => {
        set((state) => {
          state.isPlaying = true;
        });
        
        if (!playbackEngine) {
          const state = get();
          playbackEngine = new PlaybackEngine({
            candles: state.candles,
            speed: state.speed,
            currentIndex: state.currentIndex,
            onTick: (candle, index) => {
              set((state) => {
                state.currentIndex = index;
                state.visibleCandles = state.candles.slice(0, index + 1);
                
                // Check SL/TP on new candle
                if (state.activePosition) {
                  const execution = orderEngine.checkStopLoss(
                    state.activePosition,
                    candle
                  );
                  
                  if (execution) {
                    state.activePosition = {
                      ...state.activePosition,
                      status: 'closed',
                      exitPrice: execution.price,
                      exitTime: candle.time,
                      exitReason: 'stop_loss',
                      realizedPnl: execution.pnl,
                      realizedPnlPercent: execution.pnlPercent,
                    };
                    state.closedPositions.push(state.activePosition);
                    state.balance += execution.pnl;
                    state.equity = state.balance;
                    state.activePosition = undefined;
                    
                    // Recalculate stats
                    get().calculateStatistics();
                    return;
                  }
                  
                  const tpExecution = orderEngine.checkTakeProfit(
                    state.activePosition,
                    candle
                  );
                  
                  if (tpExecution) {
                    state.activePosition = {
                      ...state.activePosition,
                      status: 'closed',
                      exitPrice: tpExecution.price,
                      exitTime: candle.time,
                      exitReason: 'take_profit',
                      realizedPnl: tpExecution.pnl,
                      realizedPnlPercent: tpExecution.pnlPercent,
                    };
                    state.closedPositions.push(state.activePosition);
                    state.balance += tpExecution.pnl;
                    state.equity = state.balance;
                    state.activePosition = undefined;
                    
                    // Recalculate stats
                    get().calculateStatistics();
                    return;
                  }
                  
                  // Update unrealized P&L
                  const unrealizedPnl = orderEngine.calculateUnrealizedPnL(
                    state.activePosition,
                    candle.close
                  );
                  state.activePosition.unrealizedPnl = unrealizedPnl.pnl;
                  state.activePosition.unrealizedPnlPercent = unrealizedPnl.pnlPercent;
                  state.equity = state.balance + unrealizedPnl.pnl;
                }
              });
              
              // Stop at end
              if (index >= get().candles.length - 1) {
                get().stopPlayback();
              }
            },
          });
        }
        
        playbackEngine.start();
      },
      
      stopPlayback: () => {
        set((state) => {
          state.isPlaying = false;
        });
        
        if (playbackEngine) {
          playbackEngine.stop();
        }
      },
      
      setSpeed: (speed: PlaybackSpeed) => {
        set((state) => {
          state.speed = speed;
        });
        
        if (playbackEngine) {
          playbackEngine.setSpeed(speed);
        }
      },
      
      stepForward: () => {
        const state = get();
        if (state.currentIndex < state.candles.length - 1) {
          const newIndex = state.currentIndex + 1;
          const candle = state.candles[newIndex];
          
          set((draft) => {
            draft.currentIndex = newIndex;
            draft.visibleCandles = draft.candles.slice(0, newIndex + 1);
            
            // Same SL/TP logic as playback
            if (draft.activePosition) {
              const execution = orderEngine.checkStopLoss(draft.activePosition, candle);
              if (execution) {
                draft.activePosition = {
                  ...draft.activePosition,
                  status: 'closed',
                  exitPrice: execution.price,
                  exitTime: candle.time,
                  exitReason: 'stop_loss',
                  realizedPnl: execution.pnl,
                  realizedPnlPercent: execution.pnlPercent,
                };
                draft.closedPositions.push(draft.activePosition);
                draft.balance += execution.pnl;
                draft.equity = draft.balance;
                draft.activePosition = undefined;
                get().calculateStatistics();
                return;
              }
              
              const tpExecution = orderEngine.checkTakeProfit(draft.activePosition, candle);
              if (tpExecution) {
                draft.activePosition = {
                  ...draft.activePosition,
                  status: 'closed',
                  exitPrice: tpExecution.price,
                  exitTime: candle.time,
                  exitReason: 'take_profit',
                  realizedPnl: tpExecution.pnl,
                  realizedPnlPercent: tpExecution.pnlPercent,
                };
                draft.closedPositions.push(draft.activePosition);
                draft.balance += tpExecution.pnl;
                draft.equity = draft.balance;
                draft.activePosition = undefined;
                get().calculateStatistics();
                return;
              }
              
              const unrealizedPnl = orderEngine.calculateUnrealizedPnL(
                draft.activePosition,
                candle.close
              );
              draft.activePosition.unrealizedPnl = unrealizedPnl.pnl;
              draft.activePosition.unrealizedPnlPercent = unrealizedPnl.pnlPercent;
              draft.equity = draft.balance + unrealizedPnl.pnl;
            }
          });
        }
      },
      
      stepBackward: () => {
        const state = get();
        if (state.currentIndex > 0) {
          set((draft) => {
            draft.currentIndex = draft.currentIndex - 1;
            draft.visibleCandles = draft.candles.slice(0, draft.currentIndex + 1);
          });
        }
      },
      
      jumpToCandle: (index: number) => {
        const state = get();
        if (index >= 0 && index < state.candles.length) {
          set((draft) => {
            draft.currentIndex = index;
            draft.visibleCandles = draft.candles.slice(0, index + 1);
          });
        }
      },
      
      // ========================================================================
      // TRADING ACTIONS
      // ========================================================================
      
      openPosition: ({ type, price, size, stopLoss, takeProfit }) => {
        const state = get();
        
        // Can't open if already have position
        if (state.activePosition) {
          console.error('Position already open');
          return;
        }
        
        // Validate balance
        if (size > state.balance) {
          console.error('Insufficient balance');
          return;
        }
        
        if (!orderEngine) {
          orderEngine = new OrderExecutionEngine();
        }
        
        const position: Position = {
          id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          symbol: state.symbol,
          type,
          entryPrice: price,
          entryTime: state.visibleCandles[state.visibleCandles.length - 1]?.time || Date.now() / 1000,
          size,
          stopLoss,
          takeProfit,
          status: 'open',
        };
        
        // Calculate R:R if both SL and TP set
        if (stopLoss && takeProfit) {
          const rr = orderEngine.calculateRiskReward(position);
          position.riskRewardRatio = rr.ratio;
          position.riskAmount = rr.risk;
          position.rewardAmount = rr.reward;
        }
        
        set((draft) => {
          draft.activePosition = position;
        });
      },
      
      closePosition: (reason) => {
        const state = get();
        
        if (!state.activePosition) {
          console.error('No active position');
          return;
        }
        
        const currentPrice = state.visibleCandles[state.visibleCandles.length - 1]?.close;
        if (!currentPrice) {
          console.error('No current price');
          return;
        }
        
        const pnl = orderEngine.calculateRealizedPnL(
          state.activePosition,
          currentPrice
        );
        
        set((draft) => {
          if (draft.activePosition) {
            draft.activePosition = {
              ...draft.activePosition,
              status: 'closed',
              exitPrice: currentPrice,
              exitTime: draft.visibleCandles[draft.visibleCandles.length - 1]?.time,
              exitReason: reason,
              realizedPnl: pnl.pnl,
              realizedPnlPercent: pnl.pnlPercent,
            };
            
            draft.closedPositions.push(draft.activePosition);
            draft.balance += pnl.pnl;
            draft.equity = draft.balance;
            draft.activePosition = undefined;
          }
        });
        
        get().calculateStatistics();
      },
      
      updateStopLoss: (price) => {
        set((draft) => {
          if (draft.activePosition) {
            draft.activePosition.stopLoss = price;
            
            // Recalculate R:R
            if (draft.activePosition.takeProfit) {
              const rr = orderEngine.calculateRiskReward(draft.activePosition);
              draft.activePosition.riskRewardRatio = rr.ratio;
              draft.activePosition.riskAmount = rr.risk;
              draft.activePosition.rewardAmount = rr.reward;
            }
          }
        });
      },
      
      updateTakeProfit: (price) => {
        set((draft) => {
          if (draft.activePosition) {
            draft.activePosition.takeProfit = price;
            
            // Recalculate R:R
            if (draft.activePosition.stopLoss) {
              const rr = orderEngine.calculateRiskReward(draft.activePosition);
              draft.activePosition.riskRewardRatio = rr.ratio;
              draft.activePosition.riskAmount = rr.risk;
              draft.activePosition.rewardAmount = rr.reward;
            }
          }
        });
      },
      
      // ========================================================================
      // DATA ACTIONS
      // ========================================================================
      
      loadCandles: async (symbol, timeframe, from, to) => {
        try {
          // Check cache first
          const cachedCandles = await indexedDBService.getCandles(
            symbol,
            timeframe,
            from,
            to
          );
          
          let candles: Candle[];
          
          if (cachedCandles && cachedCandles.length > 0) {
            console.log('Loaded from cache:', cachedCandles.length);
            candles = cachedCandles;
          } else {
            // Fetch from UDF server
            console.log('Fetching from server...');
            const response = await udfClient.getHistory({
              symbol,
              resolution: timeframe,
              from: Math.floor(from / 1000),
              to: Math.floor(to / 1000),
            });
            
            if (response.s === 'ok' && response.t && response.o) {
              candles = response.t.map((time, i) => ({
                time,
                open: response.o![i],
                high: response.h![i],
                low: response.l![i],
                close: response.c![i],
                volume: response.v![i],
              }));
              
              // Cache the candles
              await indexedDBService.storeCandles(symbol, timeframe, candles);
            } else {
              throw new Error('Failed to load candles');
            }
          }
          
          set((draft) => {
            draft.candles = candles;
            draft.totalCandles = candles.length;
            draft.currentIndex = 0;
            draft.visibleCandles = [candles[0]];
          });
        } catch (error) {
          console.error('Error loading candles:', error);
          throw error;
        }
      },
      
      setSymbol: (symbol) => {
        set((draft) => {
          draft.symbol = symbol;
        });
      },
      
      setTimeframe: (timeframe) => {
        set((draft) => {
          draft.timeframe = timeframe;
        });
      },
      
      // ========================================================================
      // STATISTICS ACTIONS
      // ========================================================================
      
      calculateStatistics: () => {
        const state = get();
        
        if (!statsEngine) {
          statsEngine = new StatisticsEngine();
        }
        
        const statistics = statsEngine.calculate(
          state.closedPositions,
          state.initialBalance,
          state.balance
        );
        
        set((draft) => {
          draft.statistics = statistics;
        });
      },
      
      resetBacktest: () => {
        if (playbackEngine) {
          playbackEngine.stop();
        }
        
        set((draft) => {
          Object.assign(draft, initialState);
        });
      },
      
      // ========================================================================
      // JOURNAL ACTIONS
      // ========================================================================
      
      saveToJournal: async (position) => {
        try {
          // TODO: Capture chart screenshot using TradingView API
          const screenshot = null;
          
          await supabaseClient.saveTrade({
            ...position,
            screenshotUrl: screenshot,
          });
          
          console.log('Trade saved to journal');
        } catch (error) {
          console.error('Error saving to journal:', error);
          throw error;
        }
      },
    })),
    {
      name: 'finotaur-backtest',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ============================================================================
// SELECTORS (for performance)
// ============================================================================

export const selectIsPlaying = (state: BacktestStore) => state.isPlaying;
export const selectCurrentCandle = (state: BacktestStore) => 
  state.visibleCandles[state.visibleCandles.length - 1];
export const selectActivePosition = (state: BacktestStore) => state.activePosition;
export const selectStatistics = (state: BacktestStore) => state.statistics;
export const selectBalance = (state: BacktestStore) => state.balance;
export const selectEquity = (state: BacktestStore) => state.equity;