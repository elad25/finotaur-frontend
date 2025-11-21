// hooks/useBacktestData.ts - COMPLETE FIXED VERSION
import { useState } from 'react';
import { useBacktest } from '../contexts/BacktestContext';
import { dataManager } from '../data';
import type { TimeframeConfig } from '../types';

export const useBacktestData = (chartRenderer: any) => {
  const { symbol, pause, setAllCandles, setTimeframe, setCurrentIndex } = useBacktest();
  const [isLoading, setIsLoading] = useState(false);

  const changeTimeframe = async (newTimeframe: TimeframeConfig) => {
    try {
      pause();
      setIsLoading(true);
      
      // ✅ FIXED: Extract string value from TimeframeConfig
      const candles = await dataManager.fetchData(
        symbol.symbol, 
        newTimeframe.value,  // ← Use .value to get string
        { limit: 5000 }
      );
      
      setAllCandles(candles);
      setTimeframe(newTimeframe); // ← Pass entire object to context
      setCurrentIndex(0);
      
      if (chartRenderer) {
        chartRenderer.setData(candles);
        chartRenderer.fitContent();
      }
      
      console.log(`✅ Loaded ${candles.length} candles for ${newTimeframe.label}`);
    } catch (error) {
      console.error('Failed to load timeframe:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { changeTimeframe, isLoading };
};