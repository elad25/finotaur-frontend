import React, { useMemo } from "react";
import { useJournalStore } from "@/state/journalStore";

/**
 * Shows Potential R:R (Entry vs TP) and Actual R:R (Entry vs Exit), both relative to Stop.
 */
export default function RRBadges(){
  const st: any = useJournalStore();
  const entry = st.entry ?? st.entryPrice;
  const stop  = st.stop ?? st.stopLoss;
  const tp    = st.tp ?? st.takeProfit;
  const exit  = st.exit ?? st.exitPrice;

  const side: "LONG" | "SHORT" | undefined = st.side || st.get?.("side");

  const [potentialRR, actualRR] = useMemo(() => {
    const e = Number(entry), s = Number(stop), t = Number(tp), x = Number(exit);
    if (!isFinite(e) || !isFinite(s)) return [null, null];
    const isLong = (typeof side === "string" ? side.toUpperCase() === "LONG" : (t ?? 0) > e);
    const risk = Math.abs(e - s);
    const potReward = isFinite(t) ? Math.abs((isLong ? t - e : e - t)) : NaN;
    const actReward = isFinite(x) ? Math.abs((isLong ? x - e : e - x)) : NaN;
    const prr = risk > 0 && isFinite(potReward) ? (potReward / risk) : null;
    const arr = risk > 0 && isFinite(actReward) ? (actReward / risk) : null;
    return [prr, arr];
  }, [entry, stop, tp, exit, side]);

  const Badge = ({label, value}:{label:string, value:number|null}) => (
    <div className="px-3 py-1 rounded-lg border border-yellow-300/25 bg-yellow-900/10 text-yellow-100 text-sm">
      <span className="opacity-80">{label}:</span>{" "}
      <span className="font-semibold">{value ? `1:${value.toFixed(2)}` : "—"}</span>
    </div>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge label="Potential R:R" value={potentialRR as any} />
      <Badge label="Actual R:R" value={actualRR as any} />
    </div>
  );
}
