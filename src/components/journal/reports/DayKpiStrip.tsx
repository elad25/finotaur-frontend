import type { ReactNode } from "react";
import { Trade } from "@/types/database.types";

interface DayKpiStripProps {
  trades: Trade[];
  isLoading: boolean;
}

function tradePnl(t: Trade): number {
  return t.pnl ?? 0;
}

function fmt(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(2);
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(0) + "%";
}

export default function DayKpiStrip({ trades, isLoading }: DayKpiStripProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-yellow-200/5 animate-pulse h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  const total = trades.length;
  const netPnl = trades.reduce((acc, t) => acc + tradePnl(t), 0);
  const winners = trades.filter((t) => tradePnl(t) > 0).length;
  const winRate = total > 0 ? winners / total : 0;

  const pnls = trades.map(tradePnl);
  const best = total > 0 ? Math.max(...pnls) : null;
  const worst = total > 0 ? Math.min(...pnls) : null;

  const card = (label: string, children: ReactNode) => (
    <div className="rounded-2xl border border-yellow-200/15 bg-[#141414] p-4">
      <p className="text-[11px] uppercase tracking-wider text-yellow-200/70 mb-2">{label}</p>
      {children}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {card(
        "Trades",
        <p className="text-2xl font-semibold text-yellow-100">{total}</p>
      )}

      {card(
        "Net P&L",
        <p
          className={
            "text-2xl font-semibold " +
            (netPnl > 0 ? "text-emerald-400" : netPnl < 0 ? "text-rose-400" : "text-yellow-100")
          }
        >
          {fmt(netPnl)}
        </p>
      )}

      {card(
        "Win Rate",
        <p className="text-2xl font-semibold text-yellow-100">
          {total > 0 ? fmtPct(winRate) : "—"}
        </p>
      )}

      {card(
        "Best / Worst",
        <div>
          <p className="text-lg font-semibold text-emerald-400">
            {best !== null ? fmt(best) : "—"}
          </p>
          <p className="text-lg font-semibold text-rose-400">
            {worst !== null ? fmt(worst) : "—"}
          </p>
        </div>
      )}
    </div>
  );
}
