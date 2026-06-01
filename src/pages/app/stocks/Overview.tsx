import React, { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import PriceChartLite from "@/components/overview/PriceChartLite";
import SnapshotCards from "@/components/overview/SnapshotCards";
import AnalystConsensus from "@/components/overview/AnalystConsensus";
import NewsPreview from "@/components/overview/NewsPreview";
import CompanyOverview from "@/components/overview/CompanyOverview";
import SecFilings from "@/components/overview/SecFilings";
import { FinotaurSnowflake } from "@/components/stocks/FinotaurSnowflake";
import { FinotaurScore } from "@/components/stocks/FinotaurScore";
import { useFundamentals } from "@/hooks/useFundamentals";
import { useFlowData } from "@/pages/app/ai/flow-scanner/shared/useFlowData";
import type { FlowItem } from "@/pages/app/ai/flow-scanner/shared/types";

export default function OverviewPage(){
  const { symbol: paramSymbol } = useParams();
  const [sp] = useSearchParams();
  const symbol = useMemo(()=>{
    const s = (paramSymbol || sp.get("symbol") || sp.get("ticker") || "").trim();
    return s ? s.toUpperCase() : "";
  },[paramSymbol, sp]);

  // Grades come from data.valuation.grades — our own SEC-derived analytics, safe.
  const { data: fundData } = useFundamentals(symbol);
  const grades = (fundData as any)?.valuation?.grades ?? null;

  // Insider score: same derivation as Sentiment.tsx — no duplicate API fetch.
  // useFlowData() is cached globally; subsequent callers share the same result.
  const { flowData } = useFlowData();
  const insiderScore = useMemo(() => {
    const items: FlowItem[] = flowData.filter(
      (i) => i.ticker === symbol &&
        (i.type === "insider_buy" || i.type === "insider_sell" || i.type === "cluster_insider"),
    );
    if (items.length === 0) return 0;
    const buys  = items.filter(i => i.type === "insider_buy" || i.type === "cluster_insider").length;
    const sells = items.filter(i => i.type === "insider_sell").length;
    return Math.round(((buys - sells) / items.length) * 100);
  }, [flowData, symbol]);

  if (!symbol) return null;

  return (
    <div className="max-w-[1200px] mx-auto px-2 md:px-4">
      <div className="mb-4"><PriceChartLite symbol={symbol} /></div>
      <div className="mb-6"><SnapshotCards symbol={symbol} /></div>

      {/* ── FINOTAUR Score — flagship 1–10 explainable hero metric ─────────── */}
      <div className="mb-4">
        <FinotaurScore
          grades={grades}
          insiderScore={insiderScore}
          symbol={symbol}
          variant="card"
        />
      </div>

      {/* Finotaur Snowflake — one-glance fundamental health summary */}
      <div className="mb-6 flex flex-col sm:flex-row items-start gap-4 rounded-xl bg-neutral-900/60 border border-neutral-800 p-4">
        <FinotaurSnowflake
          grades={grades}
          symbol={symbol}
          size={180}
          className="shrink-0"
        />
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
            Fundamental Health
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {[
              { key: "valuation",    label: "Value" },
              { key: "growth",       label: "Growth" },
              { key: "profitability",label: "Profitability" },
              { key: "health",       label: "Financial Health" },
            ].map(({ key, label }) => {
              const score: number | null = grades?.[key] ?? null;
              const color =
                score == null ? "text-neutral-500"
                : score >= 70  ? "text-emerald-400"
                : score >= 45  ? "text-yellow-400"
                : "text-red-400";
              return (
                <div key={key} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-neutral-400">{label}</span>
                  <span className={`font-semibold ${color}`}>
                    {score != null ? `${score}/100` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-[10px] text-neutral-600">
            Scores derived from SEC EDGAR filings. Not raw price data.
          </div>
        </div>
      </div>

      <div className="mb-6"><AnalystConsensus symbol={symbol} /></div>
      <div className="grid md:grid-cols-2 gap-4">
        <NewsPreview symbol={symbol} />
        <CompanyOverview symbol={symbol} />
      </div>
      <div className="mt-6"><SecFilings symbol={symbol} /></div>
    </div>
  );
}
