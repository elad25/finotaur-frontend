import { useEffect, useId, useRef } from 'react';

export interface TVChartContainerProps {
  symbol: string;
  interval: string | number;
  autosize?: boolean;
  theme?: 'light' | 'dark';
  allowSymbolChange?: boolean;
  hideTopToolbar?: boolean;
  hideSideToolbar?: boolean;
}

export function TVChartContainer({
  symbol,
  interval,
  autosize = true,
  theme = 'dark',
  allowSymbolChange = true,
  hideTopToolbar = false,
  hideSideToolbar = false,
}: TVChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  // Stable per-instance id so two charts on the same page don't collide.
  const reactId = useId();
  const containerId = `tv_chart_${reactId.replace(/[:]/g, '_')}`;

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    script.onload = () => {
      if (typeof window.TradingView !== 'undefined' && containerRef.current) {
        widgetRef.current = new window.TradingView.widget({
          autosize: autosize,
          symbol: symbol,
          interval: interval.toString(),
          timezone: 'Etc/UTC',
          theme: theme,
          style: '1',
          locale: 'en',
          toolbar_bg: theme === 'dark' ? '#131722' : '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: allowSymbolChange,
          container_id: containerId,
          hide_side_toolbar: hideSideToolbar,
          withdateranges: true,
          hide_top_toolbar: hideTopToolbar,
          save_image: false,
          studies: [],
          disabled_features: [],
          enabled_features: [],
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      if (widgetRef.current && widgetRef.current.remove) {
        try {
          widgetRef.current.remove();
        } catch {
          // Widget may have already torn down; ignore.
        }
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [symbol, interval, autosize, theme, allowSymbolChange, hideTopToolbar, hideSideToolbar, containerId]);

  return (
    <div className="tradingview-widget-container h-full w-full">
      <div id={containerId} ref={containerRef} className="h-full w-full" />
    </div>
  );
}

// TypeScript declaration
declare global {
  interface Window {
    TradingView: any;
  }
}