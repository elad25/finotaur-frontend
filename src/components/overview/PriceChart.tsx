
// src/components/overview/PriceChart.tsx
import React from "react";
import { fetchJSON, getSymbolFromContext, PricePoint } from "./api";

type Props = { symbol?: string; range?: "1D"|"1W"|"1M"|"6M"|"1Y"|"5Y" };

const PriceChart: React.FC<Props> = ({ symbol, range="6M" }) => {
  const sym = (symbol || getSymbolFromContext()).toUpperCase();
  const [points, setPoints] = React.useState<PricePoint[]>([]);

  React.useEffect(() => {
    let mounted = true;
    fetchJSON<{ points: PricePoint[] }>(`/api/prices/history?symbol=${encodeURIComponent(sym)}&range=${range}`)
      .then((r) => { if (mounted) setPoints(r.points || []); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [sym, range]);

  if (!points.length) return <div className="h-[260px]" />;

  // Build SVG path (smooth-ish polyline)
  const W = 1000, H = 260, pad = 8;
  const xs = points.map(p => p.t);
  const ys = points.map(p => p.value ?? p.c ?? 0);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scaleX = (x:number) => pad + ( (x - minX) / (maxX - minX || 1) ) * (W - pad*2);
  const scaleY = (y:number) => pad + (1 - ( (y - minY) / (maxY - minY || 1) )) * (H - pad*2);
  const d = points.map((p,i) => `${i?"L":"M"}${scaleX(p.t)},${scaleY(p.value ?? p.c ?? 0)}`).join(" ");

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[260px]">
        <path d={d} fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      {/* No tooltip text, per requirement; continuous line only */}
    </div>
  );
};

export default PriceChart;
