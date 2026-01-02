// src/components/overview/PriceChartLite.tsx
// =====================================================
// FINOTAUR PRICE CHART - v2.0.0
// =====================================================
// 🔥 v2.0.0 IMPROVEMENTS:
// - Added Y-axis price labels on the right side
// - Added X-axis date labels at the bottom
// - Improved grid lines
// - Gold theme consistency
// =====================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getJSON } from "@/lib/api";

type Pt = { t: number; close: number };
type Ev = { t: number; type: "dividend"|"earnings"|"filing"; label: string };

const TF_TO_INTERVAL: Record<string, string> = { "1D":"2min","1W":"5min","1M":"4h","6M":"day","1Y":"day","5Y":"day" };
const TF_DEFAULT = "1M";

function bisectLeftByT(arr: Pt[], x: number){ let lo=0,hi=arr.length; while(lo<hi){const mid=(lo+hi)>>1; if(arr[mid].t<x) lo=mid+1; else hi=mid;} return lo; }

function useResize(ref: React.RefObject<HTMLDivElement>) {
  const [w, setW] = useState(800);
  useEffect(()=>{
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(()=>{
      const r = el.getBoundingClientRect();
      setW(Math.max(320, r.width));
    });
    ro.observe(el);
    return ()=>ro.disconnect();
  },[ref]);
  return w;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Calculate nice tick values for Y-axis
// ═══════════════════════════════════════════════════════════════
function calculateYTicks(min: number, max: number, tickCount: number = 5): number[] {
  const range = max - min;
  if (range === 0) return [min];
  
  // Find a "nice" step value
  const roughStep = range / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;
  
  let niceStep: number;
  if (normalized <= 1) niceStep = 1 * magnitude;
  else if (normalized <= 2) niceStep = 2 * magnitude;
  else if (normalized <= 2.5) niceStep = 2.5 * magnitude;
  else if (normalized <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;
  
  const ticks: number[] = [];
  const start = Math.floor(min / niceStep) * niceStep;
  
  for (let tick = start; tick <= max + niceStep * 0.1; tick += niceStep) {
    if (tick >= min - niceStep * 0.1) {
      ticks.push(tick);
    }
  }
  
  return ticks;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Format price for display
// ═══════════════════════════════════════════════════════════════
function formatPrice(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  if (value >= 100) {
    return value.toFixed(1);
  }
  return value.toFixed(2);
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Format date for X-axis based on timeframe
// ═══════════════════════════════════════════════════════════════
function formatDateLabel(timestamp: number, tf: string): string {
  const date = new Date(timestamp);
  
  switch (tf) {
    case "1D":
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    case "1W":
      return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
    case "1M":
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    case "6M":
    case "1Y":
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    case "5Y":
      return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    default:
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

function PriceChartLite({ symbol }: { symbol: string }){
  const [tf,setTf]=useState<string>(TF_DEFAULT);
  const [data,setData]=useState<Pt[]>([]);
  const [events,setEvents]=useState<Ev[]>([]);
  const [err,setErr]=useState<string|null>(null);
  const [hover,setHover]=useState<{p:Pt, ev?:Ev, idx: number}|null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = useResize(wrapRef);
  
  // Dimensions with space for axes
  const w = width;
  const h = 280; // Increased height for X-axis labels
  const padLeft = 12;
  const padRight = 65; // Space for Y-axis labels on right
  const padTop = 20;
  const padBottom = 35; // Space for X-axis labels

  useEffect(()=>{
    let stop=false; setErr(null); setData([]); setEvents([]);
    const interval = TF_TO_INTERVAL[tf] || "day";
    getJSON<Pt[]>(`/api/price?symbol=${encodeURIComponent(symbol)}&interval=${interval}&closes=1`)
      .then(d=>!stop&&setData(d)).catch(e=>!stop&&setErr(String(e?.message||e)));
    getJSON<Ev[]>(`/api/events?symbol=${encodeURIComponent(symbol)}&types=dividends,earnings,filings`)
      .then(d=>!stop&&setEvents(d)).catch(()=>{});
    return ()=>{ stop=true };
  },[symbol,tf]);

  // Calculate Y-axis bounds and ticks
  const { minY, maxY, yTicks } = useMemo(() => {
    if (!data.length) return { minY: 0, maxY: 100, yTicks: [] };
    
    const prices = data.map(x => x.close);
    const dataMin = Math.min(...prices);
    const dataMax = Math.max(...prices);
    
    // Add 5% padding
    const padding = (dataMax - dataMin) * 0.05;
    const min = dataMin - padding;
    const max = dataMax + padding;
    
    const ticks = calculateYTicks(min, max, 5);
    
    return { 
      minY: Math.min(min, ticks[0] || min), 
      maxY: Math.max(max, ticks[ticks.length - 1] || max), 
      yTicks: ticks 
    };
  }, [data]);

  // Calculate X-axis labels
  const xLabels = useMemo(() => {
    if (data.length < 2) return [];
    
    const labelCount = Math.min(6, Math.floor(w / 100)); // Responsive label count
    const step = Math.floor(data.length / labelCount);
    const labels: { idx: number; label: string }[] = [];
    
    for (let i = 0; i < data.length; i += step) {
      if (labels.length < labelCount) {
        labels.push({
          idx: i,
          label: formatDateLabel(data[i].t, tf)
        });
      }
    }
    
    // Always include last point
    if (labels.length > 0 && labels[labels.length - 1].idx !== data.length - 1) {
      labels.push({
        idx: data.length - 1,
        label: formatDateLabel(data[data.length - 1].t, tf)
      });
    }
    
    return labels;
  }, [data, tf, w]);

  // Scale functions
  const xScale = (i: number) => padLeft + (i / Math.max(1, data.length - 1)) * (w - padLeft - padRight);
  const yScale = (v: number) => padTop + ((maxY - v) / (maxY - minY)) * (h - padTop - padBottom);

  // Get current price info
  const currentPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const firstPrice = data.length > 0 ? data[0].close : 0;
  const priceChange = currentPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  function nearestEvent(t: number) {
    if (!events.length) return undefined;
    let best: Ev | undefined;
    let bestD = Infinity;
    for (const e of events) {
      const d = Math.abs(e.t - t);
      if (d < bestD && d < 1000 * 60 * 60 * 12) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  return (
    <div ref={wrapRef} className="rounded-2xl p-4 bg-[#0D0E10] border border-[#1b1d21] w-full">
      {/* Header with price info */}
      <div className="flex items-center justify-between mb-3">
        {/* Timeframe buttons */}
        <div className="flex gap-1">
          {["1D", "1W", "1M", "6M", "1Y", "5Y"].map(k => (
            <button
              key={k}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                tf === k
                  ? 'bg-[#C9A646]/20 text-[#C9A646] border border-[#C9A646]/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
              onClick={() => setTf(k)}
            >
              {k}
            </button>
          ))}
        </div>
        
        {/* Price change indicator */}
        {data.length > 1 && (
          <div className={`text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
          </div>
        )}
      </div>

      {/* Loading state */}
      {!data.length && !err && (
        <div className="h-[280px] animate-pulse text-gray-500 text-sm flex items-center justify-center">
          Loading chart…
        </div>
      )}

      {/* Error state */}
      {err && <div className="text-red-400 text-xs py-4">Error: {err}</div>}

      {/* Chart */}
      {data.length > 1 && (
        <svg width={w} height={h} className="overflow-visible">
          <defs>
            <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* ═══════════════════════════════════════════════════════════
              GRID LINES (horizontal)
          ═══════════════════════════════════════════════════════════ */}
          <g>
            {yTicks.map((tick, i) => (
              <line
                key={i}
                x1={padLeft}
                x2={w - padRight}
                y1={yScale(tick)}
                y2={yScale(tick)}
                stroke="#27272a"
                strokeDasharray="2,4"
              />
            ))}
          </g>

          {/* ═══════════════════════════════════════════════════════════
              Y-AXIS LABELS (right side)
          ═══════════════════════════════════════════════════════════ */}
          <g>
            {yTicks.map((tick, i) => (
              <g key={i}>
                {/* Tick line */}
                <line
                  x1={w - padRight}
                  x2={w - padRight + 4}
                  y1={yScale(tick)}
                  y2={yScale(tick)}
                  stroke="#3f3f46"
                />
                {/* Price label */}
                <text
                  x={w - padRight + 8}
                  y={yScale(tick) + 4}
                  fontSize="10"
                  fill="#71717a"
                  fontFamily="system-ui"
                >
                  ${formatPrice(tick)}
                </text>
              </g>
            ))}
            
            {/* Current price highlight */}
            {currentPrice > 0 && (
              <g>
                <line
                  x1={padLeft}
                  x2={w - padRight}
                  y1={yScale(currentPrice)}
                  y2={yScale(currentPrice)}
                  stroke="#C9A646"
                  strokeDasharray="4,4"
                  strokeOpacity="0.5"
                />
                <rect
                  x={w - padRight + 2}
                  y={yScale(currentPrice) - 9}
                  width="58"
                  height="18"
                  rx="3"
                  fill="#C9A646"
                />
                <text
                  x={w - padRight + 6}
                  y={yScale(currentPrice) + 4}
                  fontSize="10"
                  fill="#000"
                  fontWeight="600"
                  fontFamily="system-ui"
                >
                  ${formatPrice(currentPrice)}
                </text>
              </g>
            )}
          </g>

          {/* ═══════════════════════════════════════════════════════════
              X-AXIS LABELS (bottom)
          ═══════════════════════════════════════════════════════════ */}
          <g>
            {/* X-axis line */}
            <line
              x1={padLeft}
              x2={w - padRight}
              y1={h - padBottom}
              y2={h - padBottom}
              stroke="#27272a"
            />
            
            {/* Date labels */}
            {xLabels.map(({ idx, label }, i) => (
              <g key={i}>
                {/* Tick mark */}
                <line
                  x1={xScale(idx)}
                  x2={xScale(idx)}
                  y1={h - padBottom}
                  y2={h - padBottom + 4}
                  stroke="#3f3f46"
                />
                {/* Label */}
                <text
                  x={xScale(idx)}
                  y={h - padBottom + 18}
                  fontSize="10"
                  fill="#71717a"
                  textAnchor="middle"
                  fontFamily="system-ui"
                >
                  {label}
                </text>
              </g>
            ))}
          </g>

          {/* ═══════════════════════════════════════════════════════════
              AREA FILL
          ═══════════════════════════════════════════════════════════ */}
          <path
            d={
              `M ${xScale(0)} ${h - padBottom} ` +
              data.map((p, i) => `L ${xScale(i)} ${yScale(p.close)}`).join(' ') +
              ` L ${xScale(data.length - 1)} ${h - padBottom} Z`
            }
            fill="url(#goldArea)"
            stroke="none"
          />

          {/* ═══════════════════════════════════════════════════════════
              LINE
          ═══════════════════════════════════════════════════════════ */}
          <path
            d={
              `M ${xScale(0)} ${yScale(data[0].close)} ` +
              data.slice(1).map((p, i) => `L ${xScale(i + 1)} ${yScale(p.close)}`).join(' ')
            }
            fill="none"
            stroke="#D4AF37"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ═══════════════════════════════════════════════════════════
              EVENT MARKERS (dividends, earnings, etc.)
          ═══════════════════════════════════════════════════════════ */}
          {events.map((ev, i) => {
            const idx = bisectLeftByT(data, ev.t);
            if (idx < 0 || idx >= data.length) return null;
            const x = xScale(idx);
            const y = yScale(data[idx].close);
            
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="5" fill="#3b82f6" fillOpacity="0.3" stroke="#3b82f6" />
                <text
                  x={x}
                  y={y - 10}
                  fontSize="9"
                  fill="#60a5fa"
                  textAnchor="middle"
                  fontWeight="500"
                >
                  {ev.type === 'dividend' ? 'D' : ev.type === 'earnings' ? 'E' : 'F'}
                </text>
              </g>
            );
          })}

          {/* ═══════════════════════════════════════════════════════════
              HOVER INTERACTION
          ═══════════════════════════════════════════════════════════ */}
          <rect
            x={padLeft}
            y={padTop}
            width={w - padLeft - padRight}
            height={h - padTop - padBottom}
            fill="transparent"
            pointerEvents="all"
            onMouseMove={(e) => {
              const rect = (e.target as SVGRectElement).getBoundingClientRect();
              const x = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, x / (w - padLeft - padRight)));
              const idx = Math.round(ratio * (data.length - 1));
              const p = data[idx];
              if (!p) return setHover(null);
              const ev = nearestEvent(p.t);
              setHover({ p, ev, idx });
            }}
            onMouseLeave={() => setHover(null)}
          />

          {/* Hover tooltip */}
          {hover && (
            <g>
              {/* Vertical line */}
              <line
                x1={xScale(hover.idx)}
                x2={xScale(hover.idx)}
                y1={padTop}
                y2={h - padBottom}
                stroke="#71717a"
                strokeDasharray="3,3"
              />
              
              {/* Dot on line */}
              <circle
                cx={xScale(hover.idx)}
                cy={yScale(hover.p.close)}
                r="5"
                fill="#D4AF37"
                stroke="#0D0E10"
                strokeWidth="2"
              />
              
              {/* Tooltip box */}
              <g transform={`translate(${Math.min(Math.max(xScale(hover.idx) + 12, padLeft + 10), w - padRight - 130)}, ${padTop + 10})`}>
                <rect
                  x="0"
                  y="0"
                  width="120"
                  height={hover.ev ? 58 : 42}
                  rx="6"
                  fill="#18181b"
                  stroke="#27272a"
                />
                <text x="8" y="16" fontSize="12" fill="#fff" fontWeight="600" fontFamily="system-ui">
                  ${hover.p.close.toFixed(2)}
                </text>
                <text x="8" y="32" fontSize="10" fill="#71717a" fontFamily="system-ui">
                  {new Date(hover.p.t).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </text>
                {hover.ev && (
                  <text x="8" y="50" fontSize="10" fill="#D4AF37" fontFamily="system-ui">
                    {hover.ev.label}
                  </text>
                )}
              </g>
            </g>
          )}
        </svg>
      )}
    </div>
  );
}

export default PriceChartLite;
export { PriceChartLite };