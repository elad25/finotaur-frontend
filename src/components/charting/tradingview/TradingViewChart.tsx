import { useEffect, useRef } from 'react';
import type { ChartDataSource, Interval } from '../types';
import { intervalToResolution } from './resolutionMap';
import { FinotaurDatafeed } from './FinotaurDatafeed';
import { SupabaseSaveLoadAdapter } from './supabaseSaveLoad';
import {
  FINOTAUR_DISABLED_FEATURES,
  FINOTAUR_ENABLED_FEATURES,
} from './featuresets';

export interface TradingViewChartProps {
  symbol: string;
  interval: Interval;
  dataSource: ChartDataSource;
  userId?: string;
  theme?: 'dark' | 'light';
}

/**
 * TradingViewChart — feature-flagged wrapper around the TradingView Charting Library widget.
 *
 * Guards:
 *  1. VITE_TRADINGVIEW_CHARTS env flag must equal "true".
 *  2. window.TradingView must be present (library loaded from /charting_library/).
 *  3. SSR-safe (typeof window check).
 *
 * If any guard fails, renders a graceful placeholder — never throws.
 * All strings are English-only (iron rule).
 */
export function TradingViewChart({
  symbol,
  interval,
  dataSource,
  userId,
  theme = 'dark',
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Holds the widget instance so we can call remove() on cleanup.
  // Using `any` here because the official types ship inside the library bundle.
  const widgetRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const enabled = import.meta.env.VITE_TRADINGVIEW_CHARTS === 'true';
  const libraryAvailable =
    typeof window !== 'undefined' && typeof window.TradingView !== 'undefined';

  useEffect(() => {
    if (!enabled || !libraryAvailable || !containerRef.current) return;
    if (!window.TradingView) return;

    const datafeed = new FinotaurDatafeed(dataSource);
    const saveLoadAdapter = userId
      ? new SupabaseSaveLoadAdapter({ userId })
      : undefined;

    try {
      widgetRef.current = new window.TradingView.widget({
        container: containerRef.current,
        library_path: '/charting_library/',
        symbol,
        interval: intervalToResolution(interval),
        datafeed,
        save_load_adapter: saveLoadAdapter,
        theme: theme ?? 'dark',
        locale: 'en',
        autosize: true,
        disabled_features: FINOTAUR_DISABLED_FEATURES,
        enabled_features: FINOTAUR_ENABLED_FEATURES,
        custom_css_url: '/charting_finotaur.css',
      });
    } catch (err) {
      // Library not ready or misconfigured — log and degrade gracefully.
      console.error('[TradingViewChart] Failed to initialize widget:', err);
    }

    return () => {
      try {
        widgetRef.current?.remove?.();
      } catch {
        // Ignore errors during cleanup (library may already have cleaned up).
      }
      widgetRef.current = null;
    };
    // Re-run when the core chart identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval, theme, userId, enabled, libraryAvailable]);

  if (!enabled || !libraryAvailable) {
    return (
      <div
        className="flex items-center justify-center w-full h-full rounded-md bg-neutral-900 border border-neutral-700"
        style={{ minHeight: 320 }}
      >
        <p className="text-sm text-neutral-400">
          TradingView chart not available (library not installed).
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}

export default TradingViewChart;
