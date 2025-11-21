// hooks/useCrosshair.ts - COMPLETE FIXED VERSION
import { useState, useCallback } from 'react';
import { CrosshairMoveEvent } from '../types';

export interface UseCrosshairReturn {
  time: number | null;
  price: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  handleCrosshairMove: (event: CrosshairMoveEvent) => void;
  reset: () => void;
}

/**
 * ===================================
 * USE CROSSHAIR HOOK - FIXED
 * Manages crosshair data with proper OHLC extraction
 * ===================================
 */
export const useCrosshair = (): UseCrosshairReturn => {
  const [time, setTime] = useState<number | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [high, setHigh] = useState<number | null>(null);
  const [low, setLow] = useState<number | null>(null);
  const [close, setClose] = useState<number | null>(null);
  const [volume, setVolume] = useState<number | null>(null);

  const handleCrosshairMove = useCallback((event: CrosshairMoveEvent) => {
    // Reset if no event or no time
    if (!event || event.time === null) {
      setTime(null);
      setPrice(null);
      setOpen(null);
      setHigh(null);
      setLow(null);
      setClose(null);
      setVolume(null);
      return;
    }

    // Set time and price
    setTime(event.time);
    setPrice(event.price);

    // ✅ FIX: Extract OHLC from seriesData
    // lightweight-charts returns a Map<ISeriesApi, any>
    if (event.seriesData && event.seriesData.size > 0) {
      try {
        // Get first (and usually only) series data
        const seriesDataArray = Array.from(event.seriesData.values());
        const candleData = seriesDataArray[0];

        if (candleData && typeof candleData === 'object') {
          // Type assertion for candle data
          const candle = candleData as {
            time?: number;
            open?: number;
            high?: number;
            low?: number;
            close?: number;
            volume?: number;
          };

          setOpen(candle.open ?? null);
          setHigh(candle.high ?? null);
          setLow(candle.low ?? null);
          setClose(candle.close ?? null);
          setVolume(candle.volume ?? null);
        }
      } catch (error) {
        console.warn('Failed to extract OHLC from crosshair event:', error);
      }
    }
  }, []);

  const reset = useCallback(() => {
    setTime(null);
    setPrice(null);
    setOpen(null);
    setHigh(null);
    setLow(null);
    setClose(null);
    setVolume(null);
  }, []);

  return {
    time,
    price,
    open,
    high,
    low,
    close,
    volume,
    handleCrosshairMove,
    reset,
  };
};