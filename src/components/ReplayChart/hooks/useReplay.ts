// hooks/useReplay.ts - COMPLETE FIXED VERSION
import { useState, useEffect, useCallback, useRef } from 'react';
import { CandlestickData } from 'lightweight-charts';
import { ReplaySpeed, ReplayMode } from '../types';
import { ReplayEngine } from '../replay/ReplayEngine';

export interface UseReplayOptions {
  allData: CandlestickData[];
  cutPointIndex?: number | null; // ✅ ADDED
  onReplayEnd?: () => void;
  onIndexChange?: (index: number) => void;
  onModeChange?: (mode: ReplayMode) => void;
  onCutPointReached?: () => void; // ✅ ADDED
}

export interface UseReplayReturn {
  currentIndex: number | null;
  isPlaying: boolean;
  speed: ReplaySpeed;
  mode: ReplayMode;
  progress: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  stop: () => void;
  reset: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  jumpToIndex: (index: number) => void;
  jumpToStart: () => void;
  jumpToEnd: () => void;
  jumpToPercentage: (percentage: number) => void;
  setSpeed: (speed: ReplaySpeed) => void;
  speedUp: () => void;
  speedDown: () => void;
  toggleMode: () => void;
  setMode: (mode: ReplayMode) => void;
  setAutoScroll: (enabled: boolean) => void;
  setCutPoint: (index: number | null) => void; // ✅ ADDED
  clearCutPoint: () => void; // ✅ ADDED
}

/**
 * ===================================
 * USE REPLAY HOOK - FIXED
 * Now supports cut point management
 * ===================================
 */
export const useReplay = ({
  allData,
  cutPointIndex,
  onReplayEnd,
  onIndexChange,
  onModeChange,
  onCutPointReached,
}: UseReplayOptions): UseReplayReturn => {
  const engineRef = useRef<ReplayEngine | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState<ReplaySpeed>(1);
  const [mode, setModeState] = useState<ReplayMode>('live');
  const [progress, setProgress] = useState(0);

  // Initialize engine
  useEffect(() => {
    engineRef.current = new ReplayEngine({
      totalCandles: allData.length,
      cutPointIndex: cutPointIndex ?? null, // ✅ ADDED
      callbacks: {
        onIndexChange: (index) => {
          setCurrentIndex(index);
          setProgress(engineRef.current?.getProgress() || 0);
          onIndexChange?.(index);
        },
        onPlay: () => setIsPlaying(true),
        onPause: () => setIsPlaying(false),
        onEnd: onReplayEnd,
        onModeChange: (newMode) => {
          setModeState(newMode);
          onModeChange?.(newMode);
        },
        onCutPointReached: onCutPointReached, // ✅ ADDED
      },
    });

    return () => {
      engineRef.current?.destroy();
    };
  }, [allData.length, onReplayEnd, onIndexChange, onModeChange, onCutPointReached]);

  // Update data length when data changes
  useEffect(() => {
    engineRef.current?.setTotalCandles(allData.length);
  }, [allData.length]);

  // ✅ NEW: Update cut point when it changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setCutPoint(cutPointIndex ?? null);
    }
  }, [cutPointIndex]);

  // Sync speed state
  useEffect(() => {
    if (engineRef.current) {
      const engineSpeed = engineRef.current.getSpeed();
      if (engineSpeed !== speed) {
        setSpeedState(engineSpeed);
      }
    }
  }, [speed]);

  const play = useCallback(() => {
    engineRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    engineRef.current?.toggle();
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    engineRef.current?.reset();
    setProgress(0);
  }, []);

  const stepForward = useCallback(() => {
    engineRef.current?.stepForward();
  }, []);

  const stepBackward = useCallback(() => {
    engineRef.current?.stepBackward();
  }, []);

  const jumpToIndex = useCallback((index: number) => {
    engineRef.current?.jumpToIndex(index);
  }, []);

  const jumpToStart = useCallback(() => {
    engineRef.current?.jumpToStart();
  }, []);

  const jumpToEnd = useCallback(() => {
    engineRef.current?.jumpToEnd();
  }, []);

  const jumpToPercentage = useCallback((percentage: number) => {
    engineRef.current?.jumpToPercentage(percentage);
  }, []);

  const setSpeed = useCallback((newSpeed: ReplaySpeed) => {
    engineRef.current?.setSpeed(newSpeed);
    setSpeedState(newSpeed);
  }, []);

  const speedUp = useCallback(() => {
    engineRef.current?.speedUp();
    setSpeedState(engineRef.current?.getSpeed() || 1);
  }, []);

  const speedDown = useCallback(() => {
    engineRef.current?.speedDown();
    setSpeedState(engineRef.current?.getSpeed() || 1);
  }, []);

  const toggleMode = useCallback(() => {
    engineRef.current?.toggleMode();
  }, []);

  const setMode = useCallback((newMode: ReplayMode) => {
    engineRef.current?.setMode(newMode);
  }, []);

  const setAutoScroll = useCallback((enabled: boolean) => {
    engineRef.current?.setAutoScroll(enabled);
  }, []);

  // ✅ NEW: Cut point management
  const setCutPoint = useCallback((index: number | null) => {
    engineRef.current?.setCutPoint(index);
  }, []);

  const clearCutPoint = useCallback(() => {
    engineRef.current?.clearCutPoint();
  }, []);

  return {
    currentIndex,
    isPlaying,
    speed,
    mode,
    progress,
    play,
    pause,
    toggle,
    stop,
    reset,
    stepForward,
    stepBackward,
    jumpToIndex,
    jumpToStart,
    jumpToEnd,
    jumpToPercentage,
    setSpeed,
    speedUp,
    speedDown,
    toggleMode,
    setMode,
    setAutoScroll,
    setCutPoint,
    clearCutPoint,
  };
};