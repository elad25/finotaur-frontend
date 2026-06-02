import React from "react";
import { PriceChartLite } from "./PriceChartLite";
import { LicensedDataPlaceholder } from "@/components/markets/LicensedDataPlaceholder";
import { AdminGateBadge } from "@/components/markets/AdminGateBadge";
import { useMarketGate } from "@/hooks/useMarketGate";

type Props = { symbol: string };

// Safe, minimal chart wrapper for the Overview tab.
// Uses PriceChartLite (lightweight-charts) with our brand gold line and no tooltip text.
// No manual width math, no ResizeObserver here — PriceChartLite manages sizing internally.
export default function OverviewPriceChart({ symbol }: Props) {
  const { gated, isAdmin } = useMarketGate();

  // Gate: raw Polygon price data — not licensed for redistribution.
  if (gated) return <LicensedDataPlaceholder minHeight={200} />;

  return (
    <div className="relative rounded-2xl bg-[#0F1114] p-4 border border-white/5">
      {isAdmin && <AdminGateBadge />}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-zinc-200 font-medium">Price</h3>
        <div className="text-xs text-zinc-400">Layers pending (Dividends/Earnings/SEC)</div>
      </div>
      <PriceChartLite symbol={symbol} />
    </div>
  );
}
