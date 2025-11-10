// src/components/markets/SmartChart.tsx
import React from "react";
import { TvWidget } from "./TvWidget";
import { LiveCryptoAreaChart } from "./LiveCryptoAreaChart";
import { FallbackAreaChart } from "./FallbackAreaChart";

type Props = { symbol: string; height?: number };

const useFallback = (sym: string) => {
  if (sym.startsWith("BINANCE:")) return "crypto";
  if (sym === "TVC:DXY") return "fallback"; // TV widget sometimes restricted; use our feed
  return "tv";
};

export const SmartChart: React.FC<Props> = ({ symbol, height=820 }) => {
  const mode = useFallback(symbol);
  if (mode === "crypto") return <LiveCryptoAreaChart symbol={symbol.replace("BINANCE:","")} height={height} />;
  if (mode === "fallback") return <FallbackAreaChart symbol={symbol} height={height} />;
  return <TvWidget symbol={symbol} interval="60" height={height} />;
};
