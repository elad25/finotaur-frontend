// src/components/markets/LiveCryptoChart.tsx
import React, { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";

type Props = {
  symbol?: string;   // e.g., "BTCUSDT"
  interval?: "1m" | "3m" | "5m" | "15m" | "1h" | "4h";
  height?: number;
};

export const LiveCryptoChart: React.FC<Props> = ({
  symbol = "BTCUSDT",
  interval = "1m",
  height = 360,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const width = el.clientWidth || 600;

    // cast ל-any כדי לעקוף חוסר התאמה בטייפים
    const chart: any = createChart(el, {
      width,
      height,
      layout: { background: { type: ColorType.Solid, color: "#0b0b0b" }, textColor: "#D1D4DC" },
      grid: { horzLines: { color: "#222" }, vertLines: { color: "#222" } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });

    // guard: אם משום מה אין את הפונקציה, נצא בנעימה
    if (typeof chart.addCandlestickSeries !== "function") {
      console.error("Lightweight Charts not loaded correctly. Missing addCandlestickSeries().");
      try { chart.remove?.(); } catch {}
      return;
    }

    const series = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderDownColor: "#ef5350",
      borderUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      wickUpColor: "#26a69a",
    });

    // Seed history (ללא backticks כדי למנוע בעיות SWC)
    const seedUrl =
      "https://api.binance.com/api/v3/klines?symbol=" +
      symbol +
      "&interval=" +
      interval +
      "&limit=300";

    fetch(seedUrl)
      .then((r) => r.json())
      .then((rows) => {
        const data = rows.map((r: any) => ({
          time: r[0] / 1000,
          open: parseFloat(r[1]),
          high: parseFloat(r[2]),
          low: parseFloat(r[3]),
          close: parseFloat(r[4]),
        }));
        series.setData(data);
      })
      .catch((e) => console.warn("Seed fetch failed:", e));

    const wsUrl =
      "wss://stream.binance.com:9443/ws/" +
      symbol.toLowerCase() +
      "@kline_" +
      interval;

    const ws = new WebSocket(wsUrl);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const k = msg.k;
        series.update({
          time: k.t / 1000,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
        });
      } catch (e) {
        console.warn("WS parse error:", e);
      }
    };

    const resize = () => {
      const w = el.clientWidth || width;
      chart.applyOptions({ width: w, height });
    };
    window.addEventListener("resize", resize);
    setTimeout(resize, 0);

    return () => {
      window.removeEventListener("resize", resize);
      ws.close();
      try { chart.remove?.(); } catch {}
    };
  }, [symbol, interval, height]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
};
