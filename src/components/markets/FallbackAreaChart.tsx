// src/components/markets/FallbackAreaChart.tsx
import React, { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { createChart, ColorType } from "lightweight-charts";

type Props = { symbol: string; height?: number };
export const FallbackAreaChart: React.FC<Props> = ({ symbol, height=780 }) => {
  const ref = useRef<HTMLDivElement|null>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  // Chart data — DXY/chart changes slowly, 30s cadence is live enough;
  // refetchIntervalInBackground:false pauses polling when the tab is hidden.
  const { data: chartRows } = useQuery<any[]>({
    queryKey: ["fallback-chart", symbol],
    queryFn: () =>
      fetch("/api/chart?symbol=" + encodeURIComponent(symbol))
        .then((r) => r.json())
        .catch(() => []),
    staleTime: 25_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  // Mount the lightweight-charts instance once
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chart: any = createChart(el, {
      width: el.clientWidth || 600,
      height,
      layout: { background: { type: ColorType.Solid, color: "#0b0b0b" }, textColor: "#D1D4DC" },
      grid: { horzLines: { color: "#222" }, vertLines: { color: "#222" } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });
    chartRef.current = chart;
    seriesRef.current = chart.addAreaSeries({ lineWidth: 2, priceLineVisible: false });
    const resize = () => chart.applyOptions({ width: el.clientWidth || 600, height });
    window.addEventListener("resize", resize);
    setTimeout(resize, 0);
    return () => {
      window.removeEventListener("resize", resize);
      try { chart.remove?.(); } catch {}
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol, height]);

  // Push fresh data into the series whenever React Query delivers it
  useEffect(() => {
    if (seriesRef.current && Array.isArray(chartRows) && chartRows.length) {
      seriesRef.current.setData(chartRows);
    }
  }, [chartRows]);

  return <div ref={ref} className="w-full" style={{height}} />;
};
