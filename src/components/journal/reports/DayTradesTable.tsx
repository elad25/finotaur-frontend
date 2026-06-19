import type { Trade } from "@/hooks/useTradesData";
import { Card } from "@/components/ds/Card";
import { Change } from "@/components/ds/NumberDisplay";

interface DayTradesTableProps {
  trades: Trade[];
  isLoading: boolean;
}

function fmtTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function DayTradesTable({ trades, isLoading }: DayTradesTableProps) {
  if (isLoading) {
    return (
      <Card padding="compact">
        <div className="space-y-2 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 rounded bg-white/[0.04]" />
          ))}
        </div>
      </Card>
    );
  }

  if (trades.length === 0) {
    return (
      <Card padding="compact">
        <p className="text-ink-tertiary text-center py-8 text-sm">
          No trades on this day. Either you didn&apos;t trade, or import is pending.
        </p>
      </Card>
    );
  }

  return (
    <Card padding="compact" className="overflow-x-auto">
      <table className="w-full min-w-[500px] text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {["Time", "Symbol", "Side", "Net P&L", "R-Multiple"].map((col) => (
              <th
                key={col}
                className="px-3 py-2 text-left text-xs font-medium text-ink-tertiary"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const pnl = t.pnl ?? 0;
            const rMultiple = t.metrics?.actual_r ?? t.actual_r;
            return (
              <tr
                key={t.id}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-3 py-2.5 text-ink-secondary">{fmtTime(t.open_at)}</td>
                <td className="px-3 py-2.5 font-medium text-ink-primary">{t.symbol}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={
                      t.side === "LONG" ? "text-[#4AD295]" : "text-[#E24B4A]"
                    }
                  >
                    {t.side}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Change value={pnl} format="currency" decimals={2} />
                </td>
                <td className="px-3 py-2.5 text-ink-secondary">
                  {t.risk_class === 'risk_free' ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Risk-Free
                    </span>
                  ) : rMultiple !== undefined && rMultiple !== null
                    ? `${rMultiple >= 0 ? "+" : ""}${rMultiple.toFixed(2)}R`
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
