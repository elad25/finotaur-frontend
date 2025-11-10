import React, { useEffect, useMemo, useRef, useState } from "react";
import { useJournalStore } from "@/state/journalStore";
import { AssetClass, Direction, computeRR, detectAssetClass, formatNumber, inferDirection, rrColor } from "@/utils/smartCalc";

function useDebounced<T>(value:T, delay=150){
  const [v, setV] = useState(value);
  useEffect(()=>{
    const t = setTimeout(()=>setV(value), delay);
    return ()=>clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function PriceLogicInline(){
  const st = useJournalStore();
  const entry = Number(st.entryPrice||0);
  const sl    = Number(st.stopPrice||0);
  const tp    = Number(st.exitPrice||0);
  const qty   = Number(st.quantity||0);
  const fees  = Number(st.fees||0);
  const mult  = Number((st.multiplier==null?1:st.multiplier)||1);
  const symbol= st.symbol as string|undefined;
  const assetClass: AssetClass | undefined = (st.assetClass as any) || detectAssetClass(symbol);

  const dEntry = useDebounced(entry); const dSL = useDebounced(sl); const dTP = useDebounced(tp);
  const dQty = useDebounced(qty); const dFees = useDebounced(fees); const dMult = useDebounced(mult);

  const side = useMemo<Direction>(()=> inferDirection(dEntry, dSL, dTP), [dEntry, dSL, dTP]);

  const res = useMemo(()=> computeRR({
    entry:dEntry, sl:dSL, tp:dTP, qty:dQty, fees:dFees, multiplier:dMult, side, assetClass
  }), [dEntry, dSL, dTP, dQty, dFees, dMult, side, assetClass]);

  // reflect side to store (read-only badge elsewhere)
  useEffect(()=>{ st.setSide && st.setSide(res.side as any); }, [res.side]);

  const conflict = res.conflict || !isFinite(res.rr) || res.rr<=0;

  return (
    <div className="mt-2 text-xs">
      <div className={`flex flex-wrap items-center gap-2 ${conflict ? "text-red-300" : "text-zinc-400"}`}>
        <span>R:R</span>
        <span className={`font-semibold ${rrColor(res.rr)}`}>{formatNumber(res.rr, 2)}</span>
        <span className="mx-1 text-zinc-500">•</span>
        <span>Risk</span>
        <span className="text-zinc-200">${formatNumber(res.riskUSD)}</span>
        <span className="text-zinc-500">(pts {formatNumber(res.riskPts)})</span>
        <span className="mx-1 text-zinc-500">•</span>
        <span>Reward</span>
        <span className="text-zinc-200">${formatNumber(res.rewardUSD)}</span>
        <span className="text-zinc-500">(pts {formatNumber(res.rewardPts)})</span>
        {conflict && <span className="ml-2">• Check TP/SL vs Entry</span>}
      </div>
    </div>
  );
}
