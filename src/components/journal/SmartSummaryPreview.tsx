import React, { useMemo } from "react";
import { useJournalStore } from "@/state/journalStore";
import { computeRiskReward, rrTone } from "@/utils/tradeMath";

export default function SmartSummaryPreview(){
  const st = useJournalStore();
  const { side, rr, risk, reward, resultR } = useMemo(()=> computeRiskReward({
    side: st.side as any,
    entry: Number(st.entryPrice||0),
    stop: Number(st.stopPrice||0),
    tp: Number(st.exitPrice||0),
    qty: Number(st.quantity||0),
  }), [st.side, st.entryPrice, st.stopPrice, st.exitPrice, st.quantity]);

  return (
    <div className="mt-8 rounded-2xl border border-yellow-200/15 bg-black/30 p-4 text-sm text-zinc-300">
      <div className="font-medium text-[#C9A646] uppercase tracking-wide mb-2">Trade Summary Preview</div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <div>R:R <span className={`font-semibold ${rrTone(rr)}`}>{rr.toFixed(2)}</span></div>
        <div>Risk <span className="text-zinc-100">${risk.toFixed(2)}</span></div>
        <div>Reward <span className="text-zinc-100">${reward.toFixed(2)}</span></div>
        <div>Session <span className="text-zinc-100">{st.session || "—"}</span></div>
        <div>Strategy <span className="text-zinc-100">{Array.isArray(st.strategy)? st.strategy.join(", ") : (st.strategy || "—")}</span></div>
        <div>Direction <span className={side === "LONG" ? "text-emerald-400" : "text-red-400"}>{side}</span></div>
        <div>Fees <span className="text-zinc-100">${Number(st.fees||0).toFixed(2)}</span></div>
        {typeof resultR === "number" && <div>Result <span className={`font-semibold ${rrTone(resultR)}`}>{resultR>=0?`+${resultR.toFixed(2)}R`:`${resultR.toFixed(2)}R`}</span></div>}
      </div>
    </div>
  );
}
