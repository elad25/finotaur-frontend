// index.ts
export { ReplayChart } from './ReplayChart';
export type { ReplayChartProps, ReplayChartRef } from './ReplayChart';

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