import { useEffect, useRef } from 'react';

export interface TVChartContainerProps {
  symbol: string;
  interval: string | number;
  autosize?: boolean;
  theme?: 'light' | 'dark';
}

export function TVChartContainer({ 
  symbol,
  interval,
  autosize = true,
  theme = 'dark'
}: TVChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

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
          allow_symbol_change: true,
          container_id: 'tv_chart_container',
          hide_side_toolbar: false,
          withdateranges: true,
          hide_top_toolbar: false,
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
        widgetRef.current.remove();
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [symbol, interval, autosize, theme]);

  return (
    <div className="tradingview-widget-container h-full w-full">
      <div id="tv_chart_container" ref={containerRef} className="h-full w-full" />
    </div>
  );
}

// TypeScript declaration
declare global {
  interface Window {
    TradingView: any;
  }
}