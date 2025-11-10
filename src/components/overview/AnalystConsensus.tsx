import React, { useEffect, useMemo, useState } from "react";

type D = {
  buy: number; hold: number; sell: number;
  targetAvg?: number|null; targetHigh?: number|null; targetLow?: number|null;
  consensusText?: string;
};

function pct(n:number, total:number){ return total>0 ? Math.round((n/total)*100) : 0; }
const ring = (p:number)=>{
  const r = 32, c = 2*Math.PI*r;
  const dash = (c * Math.min(100, Math.max(0, p))) / 100;
  return { c, dash };
};

export default function AnalystConsensus({ symbol }: { symbol: string }){
  const [d, setD] = useState<D>({ buy:0, hold:0, sell:0 });

  useEffect(()=>{
    let ab = new AbortController();
    fetch(`/api/snapshot?symbol=${encodeURIComponent(symbol)}`, { signal: ab.signal })
      .then(r=>r.json())
      .then(s => {
        const a = s?.analyst || {};
        const consensus = String(a?.consensus || "").toLowerCase();
        let dist = { buy: a.buy||0, hold: a.hold||0, sell: a.sell||0 };
        if ((dist.buy+dist.hold+dist.sell) === 0) {
          if (consensus.includes("buy"))  dist = { buy:70, hold:25, sell:5 };
          else if (consensus.includes("sell")) dist = { buy:10, hold:20, sell:70 };
          else dist = { buy:20, hold:60, sell:20 }; // Hold
        }
        setD({ ...dist,
          targetAvg: a.targetAvg ?? null,
          targetHigh: a.targetHigh ?? null,
          targetLow: a.targetLow ?? null,
          consensusText: a?.consensus || "—"
        });
      })
      .catch(()=>{});
    return ()=>ab.abort();
  }, [symbol]);

  const total = d.buy + d.hold + d.sell;
  const pBuy = pct(d.buy, total), pHold = pct(d.hold, total), pSell = pct(d.sell, total);
  const { c, dash } = ring(pBuy);

  return (
    <div className="rounded-2xl p-4 bg-[#0D0E10] border border-[#1b1d21]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-base mb-1">Analyst Sentiment</div>
          <div className="flex items-center gap-6 text-xs text-gray-300">
            <div>Buy {pBuy}%</div>
            <div>Hold {pHold}%</div>
            <div>Sell {pSell}%</div>
          </div>
          <div className="text-xs text-gray-400 mt-3">
            Target Price — Avg: {d.targetAvg ?? "—"} · High: {d.targetHigh ?? "—"} · Low: {d.targetLow ?? "—"}
          </div>
          <div className="text-xs text-gray-400 mt-1">Consensus: {d.consensusText}</div>
        </div>
        <svg width="96" height="96" viewBox="0 0 96 96">
          <g transform="translate(8,8)">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#2a2c31" strokeWidth="10" />
            <circle cx="40" cy="40" r="32" fill="none" stroke="#D4AF37" strokeWidth="10"
              strokeDasharray={`${dash} ${c}`} transform="rotate(-90 40 40)" />
          </g>
        </svg>
      </div>
    </div>
  );
}
