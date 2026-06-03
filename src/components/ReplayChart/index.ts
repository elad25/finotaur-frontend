// index.ts
// (ReplayChart standalone immersive shell removed — superseded by
//  BacktestChart + BacktestReplayChart. Drawing engine under
//  drawings/ hooks/ ui/ is still consumed via full-path imports.)

// Re-export types for convenience
export type {
  Theme,
  Timeframe,
  Position,
  Drawing,
  DrawingType,
  ReplayMode,
  ReplaySpeed,
  BacktestStatistics, // ✅ FIX: היה BacktestStats
} from './types';