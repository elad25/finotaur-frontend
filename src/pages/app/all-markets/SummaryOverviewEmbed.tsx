import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import PriceChartLite from "@/components/overview/PriceChartLite";
import SnapshotCards from "@/components/overview/SnapshotCards";
import AnalystConsensus from "@/components/overview/AnalystConsensus";
import NewsPreview from "@/components/overview/NewsPreview";
import CompanyOverview from "@/components/overview/CompanyOverview";
import SecFilings from "@/components/overview/SecFilings";

type Props = { symbol?: string };

export default function SummaryOverviewEmbed(props: Props) {
  const [sp] = useSearchParams();
  const symbol = useMemo(() => {
    const s = (props.symbol || sp.get("symbol") || sp.get("ticker") || "").trim();
    return s ? s.toUpperCase() : "";
  }, [props.symbol, sp]);

  if (!symbol) {
    return (
      <div className="max-w-[1200px] mx-auto px-2 md:px-4 animate-pulse">
        <div className="h-[260px] rounded-2xl bg-[#101216] mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {Array.from({length:4}).map((_,i)=>(<div key={i} className="h-[88px] rounded-2xl bg-[#101216]" />))}
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="h-[220px] rounded-2xl bg-[#101216]" />
          <div className="h-[220px] rounded-2xl bg-[#101216]" />
        </div>
        <div className="h-[260px] rounded-2xl bg-[#101216] mt-6" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-2 md:px-4">
      <div className="mb-4"><PriceChartLite symbol={symbol} /></div>
      <div className="mb-6"><SnapshotCards symbol={symbol} /></div>
      <div className="mb-6"><AnalystConsensus symbol={symbol} /></div>
      <div className="grid md:grid-cols-2 gap-4">
        <NewsPreview symbol={symbol} />
        <CompanyOverview symbol={symbol} />
      </div>
      <div className="mt-6"><SecFilings symbol={symbol} /></div>
    </div>
  );
}
