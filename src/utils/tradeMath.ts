export type Side = "LONG" | "SHORT";

export function inferSide(entry?: number, exit?: number): Side | undefined {
  if (typeof entry !== "number" || typeof exit !== "number") return undefined;
  if (isNaN(entry) || isNaN(exit)) return undefined;
  return exit > entry ? "LONG" : "SHORT";
}

export function computeRiskReward(params: {
  side?: Side,
  entry?: number,
  stop?: number,
  tp?: number,
  qty?: number,
}) {
  const side = (params.side || inferSide(params.entry, params.tp)) || "LONG";
  const sgn = side === "LONG" ? 1 : -1;
  const entry = Number(params.entry ?? 0);
  const stop = Number(params.stop ?? 0);
  const tp   = Number(params.tp   ?? 0);
  const qty  = Number(params.qty  ?? 0);

  const risk = Math.max(0, (entry - stop) * qty * sgn);
  const reward = Math.max(0, (tp - entry) * qty * sgn);
  const rr = reward && risk ? reward / Math.abs(risk) : 0;

  // Profit/Loss in R units once TP present
  let resultR: number | null = null;
  if (qty && entry && stop && tp) {
    const perUnitRisk = Math.abs(entry - stop);
    if (perUnitRisk > 0) {
      const perUnitPnL = (tp - entry) * sgn;
      resultR = perUnitPnL / perUnitRisk;
    }
  }
  return { side, risk: Math.abs(risk), reward: Math.abs(reward), rr, resultR };
}

export function rrTone(rr:number) {
  if (rr >= 2) return "text-emerald-400";
  if (rr >= 1) return "text-yellow-300";
  return "text-red-400";
}
