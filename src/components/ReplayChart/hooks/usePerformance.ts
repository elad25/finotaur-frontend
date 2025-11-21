// hooks/usePerformance.ts
import { useEffect, useState, useRef } from 'react';
import { PerformanceMetrics } from '../types';
import { PerformanceMonitor } from '../utils/performance';

export interface UsePerformanceOptions {
  enabled?: boolean;
  onWarning?: (warning: string) => void;
}

export interface UsePerformanceReturn {
  metrics: PerformanceMetrics;
  fps: number;
  renderTime: number;
  memoryUsage: number;
  warnings: string[];
}

/**
 * ===================================
 * USE PERFORMANCE HOOK
 * Monitors performance metrics
 * ===================================
 */
export const usePerformance = (options: UsePerformanceOptions = {}): UsePerformanceReturn => {
  const { enabled = true, onWarning } = options;

  const monitorRef = useRef<PerformanceMonitor | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    renderTime: 0,
    memoryUsage: 0,
    warnings: [],
    timestamp: Date.now(),
  });

  useEffect(() => {
    if (!enabled) return;

    monitorRef.current = new PerformanceMonitor();
    monitorRef.current.start();

    // Update metrics every second
    const intervalId = setInterval(() => {
      if (monitorRef.current) {
        monitorRef.current.updateMemoryUsage();
        const newMetrics = monitorRef.current.getMetrics();
        setMetrics(newMetrics);

        // Trigger warnings
        if (onWarning && newMetrics.warnings.length > 0) {
          newMetrics.warnings.forEach(warning => onWarning(warning));
        }
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
      monitorRef.current?.stop();
    };
  }, [enabled, onWarning]);

  return {
    metrics,
    fps: metrics.fps,
    renderTime: metrics.renderTime,
    memoryUsage: metrics.memoryUsage || 0,
    warnings: metrics.warnings,
  };
};