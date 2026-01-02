// src/components/markets/TvWidget.tsx
import React from "react";

type Props = { symbol: string; interval?: string; height?: number | string };

export const TvWidget: React.FC<Props> = ({ symbol, interval = "60", height = "100%" }) => {
  const overrides = {
    "mainSeriesProperties.candleStyle.upColor": "#26a69a",
    "mainSeriesProperties.candleStyle.downColor": "#ef5350",
    "mainSeriesProperties.candleStyle.borderUpColor": "#26a69a",
    "mainSeriesProperties.candleStyle.borderDownColor": "#ef5350",
    "mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
    "mainSeriesProperties.candleStyle.wickDownColor": "#ef5350",
  };

  const params = new URLSearchParams({
    symbol,
    interval,
    theme: "dark",
    style: "1",
    locale: "en",
    allow_symbol_change: "0",
    hideideas: "1",
    hide_legend: "1",
    hide_volume: "1",
    hide_side_toolbar: "1",
    withdateranges: "0",
    overrides: JSON.stringify(overrides),
  });
  const src = "https://s.tradingview.com/widgetembed/?" + params.toString();
  
  return (
    <iframe
      title={"tv-"+symbol}
      src={src}
      width="100%"
      height={height}
      frameBorder={0}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      style={{ borderRadius: 12, display: 'block' }}
    />
  );
};