// src/components/markets/FallbackAreaChart.tsx
import React, { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";

type Props = { symbol: string; height?: number };
export const FallbackAreaChart: React.FC<Props> = ({ symbol, height=780 }) => {
  const ref = useRef<HTMLDivElement|null>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const chart: any = createChart(el, {
      width: el.clientWidth || 600,
      height,
      layout: { background: { type: ColorType.Solid, color: "#0b0b0b" }, textColor: "#D1D4DC" },
      grid: { horzLines: { color: "#222" }, vertLines: { color: "#222" } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });
    const series = chart.addAreaSeries({ lineWidth: 2, priceLineVisible: false });
    let alive = true;
    const load = () => fetch("/api/chart?symbol="+encodeURIComponent(symbol))
      .then(r=>r.json()).then((rows)=>{ if(!alive) return; series.setData(rows); })
      .catch(()=>{});
    load();
    const iv = setInterval(load, 5000); // refresh
    const resize = () => chart.applyOptions({ width: el.clientWidth || 600, height });
    window.addEventListener("resize", resize);
    setTimeout(resize,0);
    return () => { alive=false; clearInterval(iv); window.removeEventListener("resize", resize); try{chart.remove?.();}catch{} };
  }, [symbol, height]);
  return <div ref={ref} className="w-full" style={{height}} />;
};
