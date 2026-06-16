/**
 * Stocks › Valuation page
 *
 * DATA PROVENANCE — all fields rendered here come from /api/fundamentals/all,
 * which is backed by SEC EDGAR-derived financials + our own DCF computation.
 *
 * IMPORTANT — price data handling:
 *   data.trends.price / data.kpis price snapshot come from polygonPrevClose
 *   (Polygon.io), NOT from SEC EDGAR. SEC companyfacts contains no market price.
 *   Polygon's retail redistribution terms prohibit displaying raw price values
 *   to end-users. Therefore:
 *     - Raw Polygon price values are NOT rendered anywhere on this page.
 *     - The DCF intrinsic value (our own computation) IS rendered — safe.
 *     - The premium/discount % vs market IS rendered — it is a derived analytic,
 *       not a raw price redistribution.
 *     - Valuation multiples (P/E, P/B, etc.) ARE rendered — they are derived
 *       ratios computed server-side, not raw price values.
 *
 * Safe fields used (mapped to payload shape from fundamentals.all.ts):
 *   data.valuation.multiples[]   — PE, ForwardPE, PEG, PB, PS, EVEBITDA
 *                                   computed server-side from SEC filings + our price feed
 *   data.valuation.grades        — valuation/growth/profitability/health scores (our own)
 *   data.fairValue               — DCF fair value (our own dcf.ts computation, SEC inputs)
 *   data.assumptions             — WACC, ltGrowth, taxRate (our own DCF assumptions)
 *   data.trends.periods/eps/revenue/netIncome — SEC EDGAR time-series (price excluded)
 *   data.peers.tickers/metrics   — SEC-derived peer comparison
 *   data.kpis                    — SEC EDGAR-derived KPI snapshots
 *   data.context                 — sector / industry metadata (SEC SIC code)
 *   data.health                  — Altman Z, Piotroski F, interest coverage (SEC-derived)
 */

import React from "react";
import { useParams } from "react-router-dom";
import { FinoExplains } from '@/components/fino/FinoExplains';
import { StocksValuationSkeletonPage } from '@/components/skeletons/StocksValuationSkeleton';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import { useFundamentals } from "@/hooks/useFundamentals";
import { FinotaurSnowflake } from "@/components/stocks/FinotaurSnowflake";

// ---------------------------------------------------------------------------
// Types (local — matches fundamentals.all.ts composeMock output)
// ---------------------------------------------------------------------------

type Multiple = {
  metric: string;
  value: number | null;
  avg5y: number | null;
  sectorAvg: number | null;
  trend: "up" | "down" | "flat" | null;
};

type FairValue = {
  value: number | null;
  premiumPct: number | null;
  method: string;
};

type Grades = {
  valuation: number;
  growth: number;
  profitability: number;
  health: number;
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function fmtN(v: number | null | undefined, decimals = 1): string {
  if (v == null || isNaN(Number(v))) return "—";
  return Number(v).toFixed(decimals);
}

function fmtPct(v: number | null | undefined, decimals = 1): string {
  if (v == null || isNaN(Number(v))) return "—";
  return `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(decimals)}%`;
}

function fmtDollar(v: number | null | undefined): string {
  if (v == null || isNaN(Number(v))) return "—";
  return `$${Number(v).toFixed(2)}`;
}

function gradeColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
}

function gradeBg(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

function gradeLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Moderate";
  return "Weak";
}

// Maps metric code (from server) to a human label
const METRIC_LABELS: Record<string, string> = {
  PE: "P/E (TTM)",
  ForwardPE: "Forward P/E",
  PEG: "PEG Ratio",
  PB: "Price / Book",
  PS: "Price / Sales",
  EVEBITDA: "EV / EBITDA",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Card shell matching the Fundamentals page dark-glass aesthetic */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-neutral-900/60 border border-neutral-800 p-4 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-neutral-400 mb-3 font-semibold uppercase tracking-wide">{children}</div>;
}

// ---------------------------------------------------------------------------
// ValuationMultiplesTable
// Source: data.valuation.multiples[] — SEC-derived, safe for redistribution
// ---------------------------------------------------------------------------

function ValuationMultiplesTable({ multiples }: { multiples: Multiple[] }) {
  if (!multiples.length) {
    return <div className="text-xs text-neutral-500 p-3">No multiples data available.</div>;
  }

  return (
    <div className="divide-y divide-neutral-800">
      <div className="grid grid-cols-4 text-[10px] text-neutral-500 pb-2 px-1">
        <span>Metric</span>
        <span className="text-right">Current</span>
        <span className="text-right">5Y Avg</span>
        <span className="text-right">Sector</span>
      </div>
      {multiples.map((m) => {
        const label = METRIC_LABELS[m.metric] ?? m.metric;
        const vs5y =
          m.value != null && m.avg5y != null && m.avg5y !== 0
            ? ((m.value - m.avg5y) / Math.abs(m.avg5y)) * 100
            : null;
        return (
          <div key={m.metric} className="grid grid-cols-4 items-center py-2 px-1 text-sm">
            <span className="text-neutral-300">{label}</span>
            <span className="text-right text-neutral-100 font-medium">
              {m.value != null ? `${fmtN(m.value)}x` : "—"}
            </span>
            <span className="text-right text-neutral-400">
              {m.avg5y != null ? `${fmtN(m.avg5y)}x` : "—"}
            </span>
            <span
              className={`text-right text-xs font-medium ${
                vs5y == null
                  ? "text-neutral-500"
                  : vs5y > 15
                  ? "text-red-400"
                  : vs5y > 0
                  ? "text-yellow-400"
                  : "text-emerald-400"
              }`}
            >
              {vs5y != null ? fmtPct(vs5y, 0) : m.sectorAvg != null ? `${fmtN(m.sectorAvg)}x` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MultiplesVsPeersChart
// Source: data.valuation.multiples[].sectorAvg — SEC-derived, safe
// ---------------------------------------------------------------------------

function MultiplesVsPeersChart({ multiples }: { multiples: Multiple[] }) {
  const chartData = multiples
    .filter((m) => m.value != null)
    .map((m) => ({
      name: METRIC_LABELS[m.metric] ?? m.metric,
      current: m.value,
      sector: m.sectorAvg,
      avg5y: m.avg5y,
    }));

  if (!chartData.length) return null;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 9, fill: "#737373" }}
          angle={-30}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 9, fill: "#737373" }} />
        <Tooltip
          contentStyle={{ background: "#171717", border: "1px solid #404040", fontSize: 11 }}
        />
        <Bar dataKey="current" name="Current" fill="#C9A646" radius={[3, 3, 0, 0]} />
        <Bar dataKey="sector" name="Sector Avg" fill="#3f3f46" radius={[3, 3, 0, 0]} />
        <Bar dataKey="avg5y" name="5Y Avg" fill="#525252" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// DCFFairValueBox
// Source: data.fairValue (our own DCF computation using SEC inputs) — safe
// ---------------------------------------------------------------------------

function DCFFairValueBox({
  fairValue,
  assumptions,
}: {
  fairValue: FairValue;
  assumptions: { wacc: number; ltGrowth: number; taxRate: number };
}) {
  const fv = fairValue.value;
  const premium = fairValue.premiumPct; // positive = current > fair (expensive)
  const isExpensive = premium != null && premium > 0;

  return (
    <div className="space-y-4">
      {/* Fair value headline */}
      <div className="text-center py-4 px-2 rounded-xl bg-neutral-800/60 border border-neutral-700/50">
        <div className="text-xs text-neutral-400 mb-1">DCF Intrinsic Value</div>
        <div className="text-3xl font-bold text-neutral-100">{fmtDollar(fv)}</div>
        {premium != null && (
          <div
            className={`mt-1 text-sm font-medium ${
              isExpensive ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {isExpensive ? "▲" : "▼"} {Math.abs(premium).toFixed(1)}% vs current price
          </div>
        )}
        <div className="text-[10px] text-neutral-500 mt-1">
          Method: {fairValue.method ?? "DCF"} · Source: SEC filings
        </div>
      </div>

      {/* DCF assumptions */}
      <div>
        <div className="text-[10px] text-neutral-500 mb-2 uppercase tracking-wide">
          DCF Assumptions
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "WACC", value: `${assumptions.wacc}%` },
            { label: "Terminal Growth", value: `${assumptions.ltGrowth}%` },
            { label: "Tax Rate", value: `${assumptions.taxRate}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-neutral-800/60 rounded-lg p-2 text-center">
              <div className="text-[10px] text-neutral-500">{label}</div>
              <div className="text-sm font-semibold text-neutral-200">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GradeScorecard
// Source: data.valuation.grades — our own computed scores, safe
// ---------------------------------------------------------------------------

function GradeScorecard({ grades }: { grades: Grades }) {
  const items: Array<{ key: keyof Grades; label: string }> = [
    { key: "valuation", label: "Valuation" },
    { key: "growth", label: "Growth" },
    { key: "profitability", label: "Profitability" },
    { key: "health", label: "Financial Health" },
  ];

  return (
    <div className="space-y-3">
      {items.map(({ key, label }) => {
        const score = grades[key] ?? 0;
        return (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-400">{label}</span>
              <span className={`font-semibold ${gradeColor(score)}`}>
                {score}/100 · {gradeLabel(score)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${gradeBg(score)}`}
                style={{ width: `${Math.min(score, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EpsTrendChart
// Source: data.trends.eps / data.trends.periods — SEC EDGAR, safe.
// NOTE: price series intentionally excluded — data.trends.price is Polygon-sourced
// and may not be redistributed as raw values (Polygon retail redistribution terms).
// ---------------------------------------------------------------------------

function EpsTrendChart({
  periods,
  eps,
}: {
  periods: string[];
  eps: number[];
}) {
  const combined = periods
    .map((p, i) => ({
      period: p,
      eps: eps[i] ?? null,
    }))
    .filter((d) => d.eps != null);

  if (!combined.length) {
    return <div className="text-xs text-neutral-500 p-4 text-center">No EPS trend data.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={combined} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#737373" }} />
        <YAxis tick={{ fontSize: 9, fill: "#737373" }} />
        <Tooltip
          contentStyle={{ background: "#171717", border: "1px solid #404040", fontSize: 11 }}
        />
        <Line
          type="monotone"
          dataKey="eps"
          stroke="#C9A646"
          strokeWidth={2}
          dot={false}
          name="EPS ($)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// PeerComparisonTable
// Source: data.peers.tickers / data.peers.metrics — SEC-derived, safe
// ---------------------------------------------------------------------------

function PeerComparisonTable({
  symbol,
  tickers,
  metrics,
}: {
  symbol: string;
  tickers: string[];
  metrics: Record<string, Record<string, number>>;
}) {
  const metricKeys = Object.keys(metrics);
  if (!tickers.length || !metricKeys.length) {
    return <div className="text-xs text-neutral-500 p-3">No peer comparison data.</div>;
  }

  const allTickers = [symbol, ...tickers.filter((t) => t !== symbol)];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-neutral-800">
            <th className="text-left py-2 px-2 text-neutral-500 font-medium">Ticker</th>
            {metricKeys.map((mk) => (
              <th key={mk} className="text-right py-2 px-2 text-neutral-500 font-medium">
                {mk}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allTickers.map((ticker) => (
            <tr
              key={ticker}
              className={`border-b border-neutral-800/50 ${
                ticker === symbol ? "bg-neutral-800/40" : "hover:bg-neutral-800/20"
              }`}
            >
              <td
                className={`py-2 px-2 font-bold ${
                  ticker === symbol ? "text-[#C9A646]" : "text-neutral-300"
                }`}
              >
                {ticker}
                {ticker === symbol && (
                  <span className="ml-1 text-[9px] text-neutral-500 font-normal">you</span>
                )}
              </td>
              {metricKeys.map((mk) => {
                const val = metrics[mk]?.[ticker];
                return (
                  <td
                    key={mk}
                    className={`py-2 px-2 text-right ${
                      ticker === symbol ? "text-neutral-100 font-semibold" : "text-neutral-400"
                    }`}
                  >
                    {val != null ? fmtN(val, 1) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RevenueEarningsChart
// Source: data.trends.periods/revenue/netIncome — SEC EDGAR, safe
// ---------------------------------------------------------------------------

function RevenueEarningsChart({
  periods,
  revenue,
  netIncome,
}: {
  periods: string[];
  revenue: number[];
  netIncome: number[];
}) {
  const data = periods
    .map((p, i) => ({
      period: p,
      revenue: revenue[i] != null ? +(revenue[i] / 1e9).toFixed(2) : null,
      netIncome: netIncome[i] != null ? +(netIncome[i] / 1e9).toFixed(2) : null,
    }))
    .filter((d) => d.revenue != null || d.netIncome != null);

  if (!data.length) {
    return <div className="text-xs text-neutral-500 p-4 text-center">No revenue/earnings trend data.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#737373" }} />
        <YAxis tick={{ fontSize: 9, fill: "#737373" }} unit="B" />
        <Tooltip
          contentStyle={{ background: "#171717", border: "1px solid #404040", fontSize: 11 }}
          formatter={(v: number) => [`$${v}B`]}
        />
        <ReferenceLine y={0} stroke="#525252" />
        <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.7} />
        <Bar dataKey="netIncome" name="Net Income" fill="#22c55e" radius={[3, 3, 0, 0]} opacity={0.8}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={(entry.netIncome ?? 0) < 0 ? "#ef4444" : "#22c55e"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function StocksValuation() {
  const { symbol: symbolParam } = useParams<{ symbol?: string }>();
  const symbol = symbolParam?.toUpperCase() || "AAPL";

  const f = useFundamentals(symbol, "TTM", 10);
  const data = f?.data as any;
  const error = f?.error;
  const loading = f?.isLoading ?? false;

  // ---- Loading / error states (match Fundamentals.tsx pattern) ----
  if (loading) {
    return <StocksValuationSkeletonPage />;
  }
  if (error) {
    return (
      <div className="p-4 text-red-400 text-sm">
        Error loading valuation data: {error?.message || "unknown error"}
      </div>
    );
  }
  if (!data) {
    return <div className="p-4 text-neutral-400 text-sm">No valuation data available.</div>;
  }

  // ---- Extract safe fields from payload (all SEC/own-computation provenance) ----
  const multiples: Multiple[] = Array.isArray(data?.valuation?.multiples)
    ? data.valuation.multiples
    : [];
  const grades: Grades = data?.valuation?.grades ?? {
    valuation: 0,
    growth: 0,
    profitability: 0,
    health: 0,
  };
  const fairValue: FairValue = data?.fairValue ?? { value: null, premiumPct: null, method: "DCF" };
  const assumptions = data?.assumptions ?? { wacc: 9.0, ltGrowth: 2.5, taxRate: 18.0 };
  const trends = data?.trends ?? {};
  const periods: string[] = trends.periods ?? [];
  const trendEps: number[] = trends.eps ?? [];
  const trendRevenue: number[] = trends.revenue ?? [];
  const trendNetIncome: number[] = trends.netIncome ?? [];
  const peerTickers: string[] = data?.peers?.tickers ?? [];
  const peerMetrics: Record<string, Record<string, number>> = data?.peers?.metrics ?? {};
  // NOTE: data.trends.price is Polygon-sourced and is intentionally not extracted here.
  // Raw Polygon price values are not rendered per redistribution licensing terms.
  const context = data?.context ?? {};

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="relative">
        <h2 className="text-lg font-semibold text-neutral-100">
          Valuation Analysis
          {context.sector && (
            <span className="ml-2 text-xs text-neutral-500 font-normal">
              {symbol} · {context.sector}
            </span>
          )}
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Data source: SEC EDGAR financials + internal DCF model. Redistribution-safe.
        </p>
        <FinoExplains
          title="What is the Valuation tool?"
          className="mt-ds-3 ml-auto w-fit"
        >
          Find out what a stock is really worth. It runs a discounted-cash-flow (DCF) estimate
          of intrinsic value, compares the company's multiples against its peers, and scores how
          cheap or expensive it looks today.
        </FinoExplains>
      </div>

      {/* Row 1: DCF Fair Value + Grade Scorecard */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <SectionTitle>DCF Intrinsic Value</SectionTitle>
          <DCFFairValueBox
            fairValue={fairValue}
            assumptions={assumptions}
          />
        </Card>

        <Card>
          <SectionTitle>Composite Grade Scorecard</SectionTitle>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <FinotaurSnowflake
              grades={grades}
              symbol={symbol}
              size={180}
              className="shrink-0"
            />
            <div className="flex-1 w-full">
              <GradeScorecard grades={grades} />
            </div>
          </div>
          <div className="mt-4 text-[10px] text-neutral-600">
            Scores computed from SEC-derived fundamentals. 100 = best in sector.
          </div>
        </Card>
      </div>

      {/* Row 2: Multiples table + bar chart */}
      <Card>
        <SectionTitle>Valuation Multiples vs 5-Year Average vs Sector</SectionTitle>
        <div className="grid md:grid-cols-2 gap-6">
          <ValuationMultiplesTable multiples={multiples} />
          <div>
            <div className="text-[10px] text-neutral-500 mb-2">
              Current (gold) · Sector Avg (dark) · 5Y Avg (gray)
            </div>
            <MultiplesVsPeersChart multiples={multiples} />
          </div>
        </div>
      </Card>

      {/* Row 3: Revenue/Earnings trend + EPS trend */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Revenue vs Net Income (SEC filings)</SectionTitle>
          <RevenueEarningsChart
            periods={periods}
            revenue={trendRevenue}
            netIncome={trendNetIncome}
          />
          <div className="text-[10px] text-neutral-600 mt-2">
            Historical data from SEC EDGAR annual/quarterly filings.
          </div>
        </Card>

        <Card>
          <SectionTitle>EPS Trend (SEC filings)</SectionTitle>
          <EpsTrendChart periods={periods} eps={trendEps} />
          <div className="text-[10px] text-neutral-600 mt-2">
            Earnings per share from SEC EDGAR annual/quarterly filings.
          </div>
        </Card>
      </div>

      {/* Row 4: Peer comparison */}
      {peerTickers.length > 0 && (
        <Card>
          <SectionTitle>Peer Comparison (SEC-derived metrics)</SectionTitle>
          <PeerComparisonTable
            symbol={symbol}
            tickers={peerTickers}
            metrics={peerMetrics}
          />
        </Card>
      )}

      {/* Company context footer */}
      {context.sector && (
        <div className="text-xs text-neutral-600">
          {symbol} · {context.sector} / {context.industry ?? "—"} · SIC {context.sic ?? "—"}
        </div>
      )}
    </div>
  );
}
