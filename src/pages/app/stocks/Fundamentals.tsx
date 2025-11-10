import React from "react";
import { useParams } from "react-router-dom";
import { useFundamentals } from "@/hooks/useFundamentals";
import {
  KPIGrid,
  TrendsPanel,
  ValuationPanel,
  HealthTable,
  IndustryComparison,
  DCFBox,
} from "@/components/fundamentals";

export default function Fundamentals() {
  const { symbol: symbolParam } = useParams();
  const symbol = symbolParam || "AAPL";

  const f: any = useFundamentals(symbol, "TTM", 10);
  const data = f?.data;
  const error = f?.error;
  const loading = f?.isLoading ?? f?.loading ?? false;

  if (loading) return <div className="p-4 text-neutral-400 text-sm">Loading fundamentals…</div>;
  if (error) return <div className="p-4 text-red-400 text-sm">Error: {error?.message || "failed to load"}</div>;
  if (!data) return <div className="p-4 text-neutral-400 text-sm">No fundamentals available.</div>;

  return (
    <div className="space-y-6">
      {/* Top Insight Row */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[300px] rounded-xl bg-neutral-900/60 border border-neutral-800 p-3">
          <div className="text-xs text-neutral-400 mb-1">AI Insight</div>
          <div className="text-neutral-100">{data?.insight ?? "—"}</div>
        </div>
        <DCFBox data={data} />
      </div>

      {/* KPI Snapshot */}
      <KPIGrid data={data} />

      {/* Trends (now reading from data.series internally) */}
      <TrendsPanel data={data} />

      {/* Valuation + Health + Peers */}
      <div className="grid md:grid-cols-3 gap-3">
        <ValuationPanel data={data} />
        <HealthTable data={data} />
        <IndustryComparison data={data} />
      </div>

      {/* Company Context */}
      {!!data?.context?.name && (
        <div className="text-xs text-neutral-500">
          {`${data.context.name} operates within ${data?.context?.sector ?? "—"} / ${data?.context?.industry ?? "—"}.`}
        </div>
      )}
    </div>
  );
}
