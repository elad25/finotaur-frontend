import { useMemo } from "react";
import type { Trade } from "@/hooks/useTradesData";
import { Card } from "@/components/ds/Card";
import { Change } from "@/components/ds/NumberDisplay";
import { computeReportMetrics } from "@/lib/journal/reportMetrics";

interface DayKpiStripProps {
  trades: Trade[];
  isLoading: boolean;
}

export default function DayKpiStrip({ trades, isLoading }: DayKpiStripProps) {
  // Hooks must run unconditionally — before any early return
  const metrics = useMemo(() => computeReportMetrics(trades), [trades]);

  // best/worst are not in computeReportMetrics — compute locally
  const pnls = useMemo(() => trades.map((t) => t.pnl ?? 0), [trades]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/[0.04] animate-pulse h-24 rounded-[12px]" />
        ))}
      </div>
    );
  }

  const { tradeCount, netPnl, winRatePct } = metrics;

  const best  = tradeCount > 0 ? Math.max(...pnls) : null;
  const worst = tradeCount > 0 ? Math.min(...pnls) : null;

  const winPctColour =
    winRatePct >= 50 ? "text-[#4AD295]" : winRatePct >= 40 ? "text-[#C9A646]" : "text-[#E24B4A]";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Trades */}
      <Card padding="compact">
        <p className="text-[11px] uppercase tracking-wider text-ink-tertiary mb-2">Trades</p>
        <p className="text-2xl font-semibold text-ink-primary">{tradeCount}</p>
      </Card>

      {/* Net P&L */}
      <Card padding="compact">
        <p className="text-[11px] uppercase tracking-wider text-ink-tertiary mb-2">Net P&amp;L</p>
        <div className="text-2xl font-semibold">
          <Change value={netPnl} format="currency" decimals={2} />
        </div>
      </Card>

      {/* Win Rate */}
      <Card padding="compact">
        <p className="text-[11px] uppercase tracking-wider text-ink-tertiary mb-2">Win Rate</p>
        <p className={`text-2xl font-semibold ${winPctColour}`}>
          {tradeCount > 0 ? `${winRatePct.toFixed(0)}%` : "—"}
        </p>
      </Card>

      {/* Best / Worst */}
      <Card padding="compact">
        <p className="text-[11px] uppercase tracking-wider text-ink-tertiary mb-2">Best / Worst</p>
        <div className="text-lg font-semibold">
          {best !== null
            ? <Change value={best} format="currency" decimals={2} />
            : <span className="text-ink-tertiary">—</span>
          }
        </div>
        <div className="text-lg font-semibold">
          {worst !== null
            ? <Change value={worst} format="currency" decimals={2} />
            : <span className="text-ink-tertiary">—</span>
          }
        </div>
      </Card>
    </div>
  );
}
