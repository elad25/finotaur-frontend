
import React from "react";
import PriceChart from "../../components/overview/PriceChart";
import SnapshotCards from "../../components/overview/SnapshotCards";
import AnalystSentiment from "../../components/overview/AnalystSentiment";
import NewsPreview from "../../components/overview/NewsPreview";
import CompanyOverviewCard from "../../components/overview/CompanyOverview";
import { useOverviewData } from "../../hooks/useOverviewData";

type Props = { symbol: string };

export default function OverviewTab({ symbol }: Props) {
  const { loading, error, price, events, analyst, profile, snapshot, news } = useOverviewData(symbol);

  return (
    <div className="max-w-[1200px] mx-auto px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold text-gray-100">{symbol}</div>
          <div className="text-sm italic text-gray-400">Mini AI: {profile?.name ? `${profile.name} remains a market leader…` : "Summary will appear once data loads."}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl text-yellow-400">{snapshot?.price ? `$${snapshot.price.toFixed(2)}` : "—"}</div>
          <div className={`text-sm ${((snapshot?.changePct ?? 0) >= 0) ? "text-green-400" : "text-red-400"}`}>
            {snapshot?.changePct !== undefined ? `${snapshot.changePct?.toFixed(2)}%` : "—"}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl bg-[#111318] border border-[#1d1f24] p-4">
        <div className="text-gray-200 font-medium mb-2">Price</div>
        <PriceChart data={price} filings={events.filings} />
      </div>

      {/* Snapshot cards */}
      <SnapshotCards
        marketCap={snapshot.marketCap}
        peTTM={snapshot.peTTM}
        peFwd={snapshot.peFwd}
        beta={snapshot.beta}
        dividendYield={snapshot.dividendYield}
        avgVolume={snapshot.avgVolume}
        fiftyTwoWkLow={snapshot.fiftyTwoWkLow}
        fiftyTwoWkHigh={snapshot.fiftyTwoWkHigh}
        price={snapshot.price}
      />

      {/* Analyst + News + Company */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalystSentiment
          buy={analyst.buy}
          hold={analyst.hold}
          sell={analyst.sell}
          targetAvg={analyst.targetAvg}
          targetHigh={analyst.targetHigh}
          targetLow={analyst.targetLow}
        />
        <NewsPreview items={news} />
      </div>

      <CompanyOverviewCard name={profile?.name} description={profile?.description} />

      {error && <div className="text-sm text-red-400">{error}</div>}
      {loading && <div className="text-sm text-gray-400">Loading…</div>}
    </div>
  );
}
