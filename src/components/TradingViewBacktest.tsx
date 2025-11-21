import { useEffect, useRef } from 'react';

interface TradingViewBacktestProps {
  symbol?: string;
  interval?: string;
  theme?: 'light' | 'dark';
}

export function TradingViewBacktest({ 
  symbol = 'BTCUSD',
  interval = '1D',
  theme = 'dark'
}: TradingViewBacktestProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof window.TradingView !== 'undefined') {
        new window.TradingView.widget({
          autosize: true,
          symbol: symbol,
          interval: interval,
          timezone: 'Etc/UTC',
          theme: theme,
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: 'tradingview_backtest',
          hide_side_toolbar: false,
          studies: [],
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [symbol, interval, theme]);

  return (
    <div className="tradingview-widget-container h-full w-full">
      <div id="tradingview_backtest" ref={containerRef} className="h-full w-full" />
    </div>
  );
}

// TypeScript declaration for TradingView
declare global {
  interface Window {
    TradingView: any;
  }
}