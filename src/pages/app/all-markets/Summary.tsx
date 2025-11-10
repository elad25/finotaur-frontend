// src/pages/app/all-markets/Summary.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SummaryOverviewEmbed from "@/pages/app/all-markets/SummaryOverviewEmbed";
import { useFundamentals } from "@/hooks/useFundamentals";
import {
  KPIGrid,
  TrendsPanel,
  ValuationPanel,
  HealthTable,
  IndustryComparison,
  DCFBox,
} from "@/components/fundamentals";

type TabKey = "overview" | "fundamentals" | "financials" | "news";

function getQueryParam(name: string) {
  if (typeof window === "undefined") return "";
  const sp = new URLSearchParams(window.location.search);
  return (sp.get(name) || "").trim();
}

function setQueryParam(next: Record<string, string | undefined>) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  Object.entries(next).forEach(([k, v]) => {
    if (v == null || v === "") url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  });
  window.history.pushState({}, "", url.toString());
}

export default function AllMarketsSummary() {
  const symbol = useMemo(
    () => (getQueryParam("symbol") || "").toUpperCase(),
    []
  );

  const initialTab = useMemo<TabKey>(() => {
    const t = (getQueryParam("tab") || "overview").toLowerCase();
    return (["overview", "fundamentals", "financials", "news"].includes(t)
      ? t
      : "overview") as TabKey;
  }, []);

  const [tab, setTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (symbol) {
      try {
        localStorage.setItem("finotaur.summary.symbol", symbol);
      } catch {}
    }
  }, [symbol]);

  useEffect(() => {
    setQueryParam({ tab, symbol: symbol || undefined });
  }, [tab, symbol]);

  const companyLabel = symbol ? `${symbol}` : "—";
  const onTabClick = useCallback((key: TabKey) => setTab(key), []);

  // fundamentals hook
  const f: any = useFundamentals(symbol || "AAPL", "TTM", 10);
  const data = f?.data;
  const error = f?.error;
  const loading = f?.isLoading ?? f?.loading ?? false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{companyLabel}</h1>
          <div className="text-zinc-500 text-sm">— —</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2">
        {([
          ["overview", "Overview"],
          ["fundamentals", "Fundamentals"],
          ["financials", "Financials"],
          ["news", "News"],
        ] as [TabKey, string][]).map(([key, label]) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => onTabClick(key)}
              className={[
                "px-4 py-2 rounded-full text-sm transition",
                active
                  ? "bg-[#C9A646]/25 text-[#E8E0C6] border border-[#C9A646]/40 shadow-sm"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800/80 border border-zinc-800",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* === OVERVIEW === */}
      {tab === "overview" && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-400">
                Quick snapshot for{" "}
                <b className="text-zinc-200">{companyLabel}</b>. (Price & change
                above. More metrics will plug-in as APIs are finalized.)
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent News</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-400">
                News feed integration pending per data-source.
              </CardContent>
            </Card>
          </div>

          {symbol ? <SummaryOverviewEmbed /> : null}
        </>
      )}

      {/* === FUNDAMENTALS === */}
      {tab === "fundamentals" && (
        <div className="space-y-6">
          {loading && (
            <div className="p-4 text-neutral-400 text-sm">
              Loading fundamentals…
            </div>
          )}
          {error && (
            <div className="p-4 text-red-400 text-sm">
              Error: {error?.message || "failed to load"}
            </div>
          )}
          {!loading && !error && !data && (
            <div className="p-4 text-neutral-400 text-sm">
              No fundamentals available.
            </div>
          )}
          {!loading && !error && data && (
            <>
              {/* Top Insight Row */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[300px] rounded-xl bg-neutral-900/60 border border-neutral-800 p-3">
                  <div className="text-xs text-neutral-400 mb-1">AI Insight</div>
                  <div className="text-neutral-100">
                    {data?.insight ?? "—"}
                  </div>
                </div>
                <DCFBox data={data} />
              </div>

              {/* KPI Snapshot */}
              <KPIGrid data={data} />

              {/* Trends */}
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
                  {`${data.context.name} operates within ${
                    data?.context?.sector ?? "—"
                  } / ${data?.context?.industry ?? "—"}.`}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* === FINANCIALS === */}
      {tab === "financials" && (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Financials</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-400">
              Structured statements (Income / Balance / Cash Flow) — compact &
              scrollable.{" "}
              <span className="text-[#C9A646]">Coming up next.</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* === NEWS === */}
      {tab === "news" && (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>News</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-400">
              Symbol-specific news feed and summaries.{" "}
              <span className="text-[#C9A646]">Coming soon.</span>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
