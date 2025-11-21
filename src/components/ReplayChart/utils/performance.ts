// utils/performance.ts - COMPLETE FIXED VERSION
import { PERFORMANCE_BUDGET, THROTTLE_MS, DEBOUNCE_MS } from '../constants';
import { PerformanceMetrics } from '../types';

/**
 * ===================================
 * THROTTLE WITH RAF
 * ===================================
 */
export const throttleRAF = <T extends (...args: any[]) => any>(
  callback: T
): ((...args: Parameters<T>) => void) => {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    lastArgs = args;

    if (rafId !== null) return;

    rafId = requestAnimationFrame(() => {
      if (lastArgs) {
        callback(...lastArgs);
        lastArgs = null;
      }
      rafId = null;
    });
  };
};

/**
 * ===================================
 * THROTTLE WITH TIMING
 * ===================================
 */
export const throttle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      callback(...args);
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        callback(...args);
        timeoutId = null;
      }, delay - (now - lastCall));
    }
  };
};

/**
 * ===================================
 * DEBOUNCE
 * ===================================
 */
export const debounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      callback(...args);
      timeoutId = null;
    }, delay);
  };
};

/**
 * ===================================
 * FPS MONITOR
 * ===================================
 */
export class FPSMonitor {
  private frames = 0;
  private lastTime = performance.now();
  private fps = 60;
  private rafId: number | null = null;
  private onUpdate?: (fps: number) => void;

  start(onUpdate?: (fps: number) => void): void {
    this.onUpdate = onUpdate;
    this.tick();
  }

  private tick = (): void => {
    this.frames++;
    const now = performance.now();

    if (now >= this.lastTime + 1000) {
      this.fps = Math.round((this.frames * 1000) / (now - this.lastTime));
      this.frames = 0;
      this.lastTime = now;

      if (this.onUpdate) {
        this.onUpdate(this.fps);
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  getFPS(): number {
    return this.fps;
  }
}

/**
 * ===================================
 * PERFORMANCE BUDGET CHECKER
 * ===================================
 */
export const withPerformanceBudget = <T extends (...args: any[]) => any>(
  fn: T,
  budgetMs: number,
  name: string
): T => {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    const result = fn(...args);
    const duration = performance.now() - start;

    if (duration > budgetMs) {
      console.warn(
        `⚠️ Performance budget exceeded for ${name}:`,
        `${duration.toFixed(2)}ms (budget: ${budgetMs}ms)`
      );
    }

    return result;
  }) as T;
};

/**
 * ===================================
 * ASYNC PERFORMANCE CHECKER
 * ===================================
 */
export const withAsyncPerformanceBudget = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  budgetMs: number,
  name: string
): T => {
  return (async (...args: Parameters<T>) => {
    const start = performance.now();
    const result = await fn(...args);
    const duration = performance.now() - start;

    if (duration > budgetMs) {
      console.warn(
        `⚠️ Performance budget exceeded for ${name}:`,
        `${duration.toFixed(2)}ms (budget: ${budgetMs}ms)`
      );
    }

    return result;
  }) as T;
};

/**
 * ===================================
 * RAF BATCH RENDERER
 * ===================================
 */
export class RAFBatchRenderer {
  private tasks: Set<() => void> = new Set();
  private rafId: number | null = null;

  schedule(task: () => void): void {
    this.tasks.add(task);

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.flush);
    }
  }

  private flush = (): void => {
    const tasks = Array.from(this.tasks);
    this.tasks.clear();
    this.rafId = null;

    tasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('RAF batch task error:', error);
      }
    });
  };

  clear(): void {
    this.tasks.clear();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

/**
 * ===================================
 * PERFORMANCE MONITOR - ✅ FIXED
 * ===================================
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 60,
    renderTime: 0,
    memoryUsage: 0,
    dataPoints: 0, // ✅ ADDED
    warnings: [],
    timestamp: Date.now(),
  };

  private fpsMonitor = new FPSMonitor();
  private renderTimes: number[] = [];
  private maxRenderSamples = 60;

  start(): void {
    this.fpsMonitor.start(fps => {
      this.metrics.fps = fps;
      this.checkPerformance();
    });
  }

  recordRenderTime(duration: number): void {
    this.renderTimes.push(duration);

    if (this.renderTimes.length > this.maxRenderSamples) {
      this.renderTimes.shift();
    }

    this.metrics.renderTime = 
      this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
  }

  updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
    }
  }

  updateDataPoints(count: number): void {
    this.metrics.dataPoints = count;
  }

  private checkPerformance(): void {
    const warnings: string[] = [];

    // Check FPS
    if (this.metrics.fps < 30) {
      warnings.push(`Low FPS: ${this.metrics.fps}`);
    }

    // Check render time
    if (this.metrics.renderTime > PERFORMANCE_BUDGET.renderMs) {
      warnings.push(
        `Slow render: ${this.metrics.renderTime.toFixed(2)}ms`
      );
    }

    // Check memory
    if (this.metrics.memoryUsage && this.metrics.memoryUsage > PERFORMANCE_BUDGET.maxMemoryMB) {
      warnings.push(
        `High memory: ${this.metrics.memoryUsage.toFixed(2)}MB`
      );
    }

    // Check data points
    if (this.metrics.dataPoints > PERFORMANCE_BUDGET.maxDataPoints) {
      warnings.push(
        `Too many data points: ${this.metrics.dataPoints}`
      );
    }

    this.metrics.warnings = warnings;
    this.metrics.timestamp = Date.now();
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  stop(): void {
    this.fpsMonitor.stop();
  }
}

/**
 * ===================================
 * IDLE CALLBACK
 * ===================================
 */
export const requestIdleCallback = (
  callback: () => void,
  options?: { timeout?: number }
): number => {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }

  // Fallback
  return setTimeout(callback, 1) as any;
};

export const cancelIdleCallback = (id: number): void => {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
};

/**
 * ===================================
 * MEMORY MONITOR
 * ===================================
 */
export const getMemoryUsage = (): number | null => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return memory.usedJSHeapSize / (1024 * 1024); // MB
  }
  return null;
};

/**
 * ===================================
 * SINGLETON INSTANCES
 * ===================================
 */
export const rafBatchRenderer = new RAFBatchRenderer();
export const performanceMonitor = new PerformanceMonitor();