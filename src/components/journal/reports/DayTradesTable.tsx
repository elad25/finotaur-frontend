import { Trade } from "@/types/database.types";

interface DayTradesTableProps {
  trades: Trade[];
  isLoading: boolean;
}

function tradePnl(t: Trade): number {
  return t.pnl ?? 0;
}

function fmtTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function fmtPnl(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(2);
}

export default function DayTradesTable({ trades, isLoading }: DayTradesTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-yellow-200/15 bg-[#141414] overflow-hidden">
        <div className="divide-y divide-yellow-200/5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse h-10 bg-yellow-200/5 mx-4 my-2 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="rounded-2xl border border-yellow-200/15 bg-[#141414] p-8">
        <p className="text-zinc-400 text-center py-8">
          No trades on this day. Either you didn&apos;t trade, or import is pending.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-yellow-200/15 bg-[#141414] overflow-x-auto">
      <table className="w-full min-w-[500px]">
        <thead>
          <tr className="border-b border-yellow-200/10">
            {["Time", "Symbol", "Side", "Net P&L", "R-Multiple"].map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-yellow-200/70 font-medium"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const pnl = tradePnl(t);
            const rMultiple = t.metrics?.actual_r;
            return (
              <tr
                key={t.id}
                className="border-b border-yellow-200/5 text-zinc-200 text-sm hover:bg-yellow-200/5 transition-colors"
              >
                <td className="px-4 py-3">{fmtTime(t.open_at)}</td>
                <td className="px-4 py-3 font-medium">{t.symbol}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      t.side === "LONG"
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }
                  >
                    {t.side}
                  </span>
                </td>
                <td
                  className={
                    "px-4 py-3 font-medium " +
                    (pnl > 0
                      ? "text-emerald-400"
                      : pnl < 0
                      ? "text-rose-400"
                      : "text-zinc-400")
                  }
                >
                  {fmtPnl(pnl)}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {rMultiple !== undefined && rMultiple !== null
                    ? `${rMultiple.toFixed(2)}R`
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
