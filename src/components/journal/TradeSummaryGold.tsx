import React, { useMemo } from "react";
import { useJournalStore } from "@/state/journalStore";
import { AssetClass, computeRR, detectAssetClass, formatNumber, inferDirection, rrColor } from "@/utils/smartCalc";

export default function TradeSummaryGold(){
  const st = useJournalStore();
  const entry = Number(st.entryPrice||0);
  const sl    = Number(st.stopPrice||0);
  const tp    = Number(st.exitPrice||0);
  const qty   = Number(st.quantity||0);
  const fees  = Number(st.fees||0);
  const mult  = Number((st.multiplier==null?1:st.multiplier)||1);
  const assetClass: AssetClass | undefined = (st.assetClass as any) || detectAssetClass(st.symbol);

  const side = inferDirection(entry, sl, tp);
  const res = useMemo(()=> computeRR({entry, sl, tp, qty, fees, multiplier:mult, side, assetClass}), [entry, sl, tp, qty, fees, mult, side, assetClass]);

  return (
    <div className="mt-6 rounded-2xl border border-yellow-200/15 bg-black/30 p-4 text-sm text-zinc-300">
      <div className="font-medium text-[#C9A646] uppercase tracking-wide mb-2">Trade Summary</div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <div>Direction <span className={res.side==="LONG" ? "text-emerald-400" : res.side==="SHORT" ? "text-red-400" : "text-zinc-300"}>{res.side}</span></div>
        <div>R:R <span className={`font-semibold ${rrColor(res.rr)}`}>{formatNumber(res.rr,2)}</span></div>
        <div>Risk $ <span className="text-zinc-100">${formatNumber(res.riskUSD)}</span></div>
        <div>Reward $ <span className="text-zinc-100">${formatNumber(res.rewardUSD)}</span></div>
        <div>Risk pts <span className="text-zinc-100">{formatNumber(res.riskPts)}</span></div>
        <div>Reward pts <span className="text-zinc-100">{formatNumber(res.rewardPts)}</span></div>
        <div>Qty <span className="text-zinc-100">{formatNumber(qty,0)}</span></div>
        <div>Multiplier <span className="text-zinc-100">{formatNumber(mult,2)}</span></div>
        <div>Fees <span className="text-zinc-100">${formatNumber(fees)}</span></div>
        <div>Asset <span className="text-zinc-100">{assetClass || "—"}</span></div>
      </div>
    </div>
  );
}
