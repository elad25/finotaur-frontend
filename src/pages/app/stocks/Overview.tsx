import React, { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import PriceChartLite from "@/components/overview/PriceChartLite";
import SnapshotCards from "@/components/overview/SnapshotCards";
import AnalystConsensus from "@/components/overview/AnalystConsensus";
import NewsPreview from "@/components/overview/NewsPreview";
import CompanyOverview from "@/components/overview/CompanyOverview";
import SecFilings from "@/components/overview/SecFilings";

export default function OverviewPage(){
  const { symbol: paramSymbol } = useParams();
  const [sp] = useSearchParams();
  const symbol = useMemo(()=>{
    const s = (paramSymbol || sp.get("symbol") || sp.get("ticker") || "").trim();
    return s ? s.toUpperCase() : "";
  },[paramSymbol, sp]);

  if (!symbol) return null;

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
