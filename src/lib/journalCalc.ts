import type { Side } from "@/state/journalStore";

/** 
 * Profit uses entry→exit; Risk uses entry→stop. 
 * Fees subtracted once from profit.
 */
export function computeRR(entry: number, exit: number, stop: number, size: number, side: Side, fees: number) {
  const priceMove = (side === "Long") ? (exit - entry) : (entry - exit);
  const profit = priceMove * size - (fees || 0);

  const stopMove = Math.abs(entry - stop);
  const risk = stopMove * size;

  const rr = risk > 0 ? (profit / risk) : 0;
  return {
    profit: round(profit),
    risk: round(risk),
    rr: Number.isFinite(rr) ? round(rr) : 0,
  };
}

function round(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
