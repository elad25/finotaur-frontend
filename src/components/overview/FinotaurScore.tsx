
import React, { useEffect, useState } from "react";
import { getJSON } from "@/lib/api";

export default function FinotaurScore({ symbol }: { symbol: string }){
  const [score,setScore]=useState<number|null>(null);
  const [bd,setBd]=useState<any>(null);
  useEffect(()=>{
    let stop=false;
    getJSON<{score:number; breakdown:any}>(`/api/score?symbol=${encodeURIComponent(symbol)}`).then(d=>{ if(!stop){ setScore(d.score); setBd(d.breakdown); }}).catch(()=>{ setScore(null); setBd(null); });
    return ()=>{ stop=true };
  },[symbol]);
  return (
    <div className="rounded-2xl p-4 bg-[#0D0E10] border border-[#1b1d21]">
      <div className="text-base mb-2">Finotaur Score</div>
      <div className="text-4xl font-semibold">{score==null? '—' : score}</div>
      {bd && (
        <div className="text-xs text-gray-400 mt-2">
          1M: {(bd.r1*100).toFixed(1)}% • 6M: {(bd.r6*100).toFixed(1)}% • Vol(30d): {(bd.vol*100).toFixed(1)}% • News breadth: {bd.breadth}
        </div>
      )}
      <div className="text-xs text-gray-500 mt-2">0–100 composite from momentum (1M/6M), realized vol (lower=better), and news breadth.</div>
    </div>
  );
}
