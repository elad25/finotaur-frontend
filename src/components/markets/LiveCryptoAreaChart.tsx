// src/components/markets/LiveCryptoAreaChart.tsx
import React, { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";

type Props = { symbol: string; interval?: "1m" | "3m" | "5m" | "15m" | "1h"; height?: number };
export const LiveCryptoAreaChart: React.FC<Props> = ({ symbol, interval="1m", height=780 }) => {
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
    fetch("https://api.binance.com/api/v3/klines?symbol="+symbol+"&interval="+interval+"&limit=500")
      .then(r=>r.json()).then(rows=>{
        const data = rows.map((r:any)=>({ time: r[0]/1000, value: parseFloat(r[4]) }));
        series.setData(data);
      }).catch(()=>{});
    const ws = new WebSocket("wss://stream.binance.com:9443/ws/"+symbol.toLowerCase()+"@kline_"+interval);
    ws.onmessage = (ev) => {
      try { const m = JSON.parse(ev.data); const k = m.k; series.update({ time: k.t/1000, value: parseFloat(k.c) }); } catch {}
    };
    const resize = () => chart.applyOptions({ width: el.clientWidth || 600, height });
    window.addEventListener("resize", resize);
    setTimeout(resize,0);
    return () => { window.removeEventListener("resize", resize); ws.close(); try{chart.remove?.();}catch{} };
  }, [symbol, interval, height]);
  return <div ref={ref} className="w-full" style={{height}} />;
};
