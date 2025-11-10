// src/hooks/usePerformanceMonitor.ts
// ============================================
// Performance Monitoring Hook
// ============================================
// Tracks component render times and API call performance
// Useful for production monitoring and optimization

import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  timestamp: number;
}

export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>(performance.now());
  const renderCount = useRef<number>(0);

  useEffect(() => {
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;
    renderCount.current++;

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ [${componentName}] Render #${renderCount.current}: ${renderTime.toFixed(2)}ms`);
    }

    // Send to analytics in production (e.g., Sentry, Datadog)
    if (process.env.NODE_ENV === 'production' && renderTime > 100) {
      // Only track slow renders (>100ms)
      logPerformanceMetric({
        componentName,
        renderTime,
        timestamp: Date.now(),
      });
    }

    // Reset for next render
    renderStartTime.current = performance.now();
  });

  return {
    renderCount: renderCount.current,
  };
}

function logPerformanceMetric(metrics: PerformanceMetrics) {
  // Send to your analytics service
  // Example: Sentry
  // Sentry.captureMessage('Slow Component Render', {
  //   level: 'warning',
  //   extra: metrics,
  // });

  // Example: Custom API
  // fetch('/api/analytics/performance', {
  //   method: 'POST',
  //   body: JSON.stringify(metrics),
  // });

  console.warn('⚠️ Slow render detected:', metrics);
}

// ============================================
// API Call Performance Monitor
// ============================================
export function useApiPerformanceMonitor() {
  const startTime = useRef<number>(0);

  const startTracking = (apiName: string) => {
    startTime.current = performance.now();
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 [API] ${apiName} - Started`);
    }
  };

  const endTracking = (apiName: string, success: boolean = true) => {
    const endTime = performance.now();
    const duration = endTime - startTime.current;

    if (process.env.NODE_ENV === 'development') {
      const emoji = success ? '✅' : '❌';
      console.log(`${emoji} [API] ${apiName} - ${duration.toFixed(2)}ms`);
    }

    // Log slow API calls in production
    if (process.env.NODE_ENV === 'production' && duration > 1000) {
      console.warn(`⚠️ Slow API call: ${apiName} took ${duration.toFixed(2)}ms`);
    }
  };

  return { startTracking, endTracking };
}

// ============================================
// Memory Monitor
// ============================================
export function useMemoryMonitor(componentName: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
      const memory = (performance as any).memory;
      console.log(`💾 [${componentName}] Memory:`, {
        used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
      });
    }
  }, [componentName]);
}

// ============================================
// Usage Examples:
// ============================================
/*

// 1. Component Render Tracking
function MyComponent() {
  usePerformanceMonitor('MyComponent');
  
  return <div>Content</div>;
}

// 2. API Call Tracking
function MyComponent() {
  const { startTracking, endTracking } = useApiPerformanceMonitor();
  
  const fetchData = async () => {
    startTracking('getAdminStats');
    try {
      const data = await getAdminStats();
      endTracking('getAdminStats', true);
      return data;
    } catch (error) {
      endTracking('getAdminStats', false);
      throw error;
    }
  };
  
  return <div>Content</div>;
}

// 3. Memory Tracking
function MyComponent() {
  useMemoryMonitor('MyComponent');
  
  return <div>Content</div>;
}

*/