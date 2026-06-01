/**
 * Stocks › Sentiment page
 *
 * ═══════════════════════════════════════════════════════════════════════
 * DATA PROVENANCE — all fields rendered here are redistribution-safe.
 *
 * 1. INSIDER FLOW SIGNALS  (Section: "Insider Activity")
 *    Source: /api/flow/scanner → flow_scanner_cache table (Supabase)
 *    Populated by: flowScannerCron.js which calls SEC EDGAR EFTS + RSS
 *      - efts.sec.gov/LATEST/search-index?forms=4   (public domain)
 *      - sec.gov/cgi-bin/browse-edgar?type=4&output=atom  (public domain)
 *    Fields used: ticker, type (insider_buy/insider_sell/cluster_insider/
 *                 institutional_new/institutional_increase/institutional_exit),
 *                 direction, insiderName, insiderTitle, insiderShares,
 *                 form4Type, clusterCount, value, signal, time
 *    ✅ SAFE — SEC EDGAR is public domain; no raw Polygon/FMP/Yahoo price values
 *              are displayed. `value` is a pre-formatted string (e.g. "$2.1M")
 *              computed by the cron, not a raw quote redistribution.
 *
 * 2. SENTIMENT SCORE   (Section: "Composite Score")
 *    Source: Derived by this component from the filtered flow data above.
 *    Formula: (buyCount − sellCount) / totalCount × 100, clamped to −100..100
 *    ✅ SAFE — our own analytics, no third-party raw values.
 *
 * 3. MARKET SENTIMENT  (Section: "Market Backdrop")
 *    Source: /api/flow/scanner stats.marketSentiment
 *    Computed server-side in flowScannerCron.js: bullish when
 *    bullishCount > bearishCount × 1.5, else bearish/neutral.
 *    ✅ SAFE — our own derived metric, not a raw redistributed quote.
 *
 * 4. SEC EDGAR FORM 4 FEED  (Section: "Recent Form 4 Filings")
 *    Source: Direct browser fetch to https://efts.sec.gov (public domain API).
 *    Same API the server cron uses; called client-side for per-symbol recency.
 *    Fields: entity_name, file_date, period_of_report, form_type (all EDGAR)
 *    ✅ SAFE — SEC EDGAR public domain.
 *
 * NOT SHOWN (restricted sources):
 *   - Raw stock price / quote values (Polygon/FMP prohibition)
 *   - Per-stock news sentiment (Polygon /v2/reference/news — raw redistribution)
 *   - /api/analytics/sentiment (endpoint not mounted on server)
 * ═══════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Building2,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  AlertTriangle,
  RefreshCw,
  Activity,
} from "lucide-react";
import { useFlowData } from "@/pages/app/ai/flow-scanner/shared/useFlowData";
import type { FlowItem } from "@/pages/app/ai/flow-scanner/shared/types";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface EdgarForm4Entry {
  id: string;
  entityName: string;
  fileDate: string;
  periodOfReport: string | null;
  accessionNo: string;
  url: string;
}

interface Form4State {
  entries: EdgarForm4Entry[];
  loading: boolean;
  error: string | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Design tokens (match Flow Scanner / dark glass aesthetic)
// ──────────────────────────────────────────────────────────────────────────────

const T = {
  gold:     "#C9A646",
  bullish:  "#22C55E",
  bearish:  "#EF4444",
  neutral:  "#8B8B8B",
  purple:   "#A855F7",
  blue:     "#3B82F6",
  bg:       "rgba(255,255,255,0.018)",
  border:   "rgba(255,255,255,0.07)",
  mutedText:"#6B6B6B",
  cardHover:"rgba(255,255,255,0.025)",
} as const;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Format ISO date string → readable label */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Compute derived sentiment score from insider flow items. Range: −100 to +100. */
function computeInsiderScore(items: FlowItem[]): number {
  if (items.length === 0) return 0;
  const buys  = items.filter(i => i.type === "insider_buy" || i.type === "cluster_insider").length;
  const sells = items.filter(i => i.type === "insider_sell").length;
  const total = items.length;
  return Math.round(((buys - sells) / total) * 100);
}

/** Score → label + color */
function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 60)  return { label: "Strong Bullish", color: T.bullish };
  if (score >= 20)  return { label: "Bullish",        color: T.bullish };
  if (score >= -20) return { label: "Neutral",        color: T.neutral  };
  if (score >= -60) return { label: "Bearish",        color: T.bearish  };
  return               { label: "Strong Bearish",  color: T.bearish  };
}

// ──────────────────────────────────────────────────────────────────────────────
// EDGAR Form 4 hook (direct public-domain API, no auth required)
// Source: https://efts.sec.gov/LATEST/search-index?q=%22{ticker}%22&forms=4
// ──────────────────────────────────────────────────────────────────────────────

const FORM4_CACHE: Record<string, { entries: EdgarForm4Entry[]; ts: number }> = {};
const FORM4_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchEdgarForm4(symbol: string): Promise<EdgarForm4Entry[]> {
  const cached = FORM4_CACHE[symbol];
  if (cached && Date.now() - cached.ts < FORM4_TTL) return cached.entries;

  const url =
    `https://efts.sec.gov/LATEST/search-index` +
    `?q=%22${encodeURIComponent(symbol)}%22&forms=4&dateRange=custom` +
    `&startdt=${new Date(Date.now() - 90 * 86400_000).toISOString().split("T")[0]}` +
    `&enddt=${new Date().toISOString().split("T")[0]}` +
    `&_source=period_of_report,entity_name,file_date,period_of_report,accession_no`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Finotaur/1.0 (contact@finotaur.com)",
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`EDGAR EFTS ${res.status}`);

  const data = await res.json();
  const hits: Array<{ _id: string; _source: Record<string, string> }> =
    data?.hits?.hits || [];

  const entries: EdgarForm4Entry[] = hits.slice(0, 20).map((h) => {
    const s = h._source || {};
    const accNo: string = (s.accession_no || h._id || "").replace(/\//g, "");
    const cikMatch = h._id.match(/\/(\d+)\//);
    const cik = cikMatch ? cikMatch[1] : "";
    return {
      id:             h._id,
      entityName:     s.entity_name || symbol,
      fileDate:       s.file_date   || "",
      periodOfReport: s.period_of_report || null,
      accessionNo:    accNo,
      url:
        cik && accNo
          ? `https://www.sec.gov/Archives/edgar/data/${cik}/${accNo.replace(/-/g, "")}/${accNo}.txt`
          : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${symbol}&type=4&dateb=&owner=include&count=20`,
    };
  });

  FORM4_CACHE[symbol] = { entries, ts: Date.now() };
  return entries;
}

function useEdgarForm4(symbol: string): Form4State {
  const [state, setState] = useState<Form4State>({
    entries: [], loading: true, error: null,
  });

  useEffect(() => {
    if (!symbol) return;
    setState({ entries: [], loading: true, error: null });
    fetchEdgarForm4(symbol)
      .then(entries => setState({ entries, loading: false, error: null }))
      .catch(err  => setState({ entries: [], loading: false, error: String(err?.message || err) }));
  }, [symbol]);

  return state;
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
      style={{ background: T.bg, border: `1px solid ${T.border}` }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mb-3">
      {children}
    </div>
  );
}

/** Gauge bar: maps score −100..100 to a horizontal fill */
function SentimentGauge({ score }: { score: number }) {
  const pct = Math.round(((score + 100) / 200) * 100); // 0–100% width
  const { label, color } = scoreLabel(score);

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs text-neutral-400">Bearish</span>
        <span className="text-sm font-bold" style={{ color }}>{label}</span>
        <span className="text-xs text-neutral-400">Bullish</span>
      </div>
      <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${T.bearish}, ${color})`,
          }}
        />
      </div>
      <div className="flex justify-center mt-1.5">
        <span className="text-xs text-neutral-500">
          Score: <span className="text-neutral-200 font-semibold">{score > 0 ? `+${score}` : score}</span>
          <span className="ml-1 text-neutral-600"> / 100</span>
        </span>
      </div>
    </div>
  );
}

/** Market backdrop pill from flow scanner's computed market sentiment */
function MarketBackdropPill({ sentiment }: { sentiment: string }) {
  const cfg =
    sentiment === "bullish" ? { color: T.bullish, Icon: TrendingUp,   label: "Bullish" } :
    sentiment === "bearish" ? { color: T.bearish, Icon: TrendingDown,  label: "Bearish" } :
                              { color: T.neutral, Icon: Minus,         label: "Neutral" };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}
    >
      <cfg.Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

/** Single insider flow card (SEC EDGAR Form 4 — public domain) */
function InsiderCard({ item }: { item: FlowItem }) {
  const isCluster = item.type === "cluster_insider";
  const isBuy     = item.type === "insider_buy" || isCluster;
  const isInst    = item.type.startsWith("institutional");
  const accent    =
    isCluster ? T.purple :
    isBuy     ? T.bullish :
    isInst    ? T.blue   : T.bearish;

  const formBadge =
    item.form4Type === "open_market" ? { label: "Open Market", color: T.bullish } :
    item.form4Type === "10b5-1"      ? { label: "10b5-1 Plan", color: T.neutral  } :
    null;

  return (
    <div
      className="relative rounded-xl p-4 transition-all duration-200"
      style={{ background: T.bg, border: `1px solid ${accent}20` }}
    >
      {/* accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: accent }}
      />

      <div className="pl-3 flex flex-wrap gap-x-6 gap-y-2 items-start">
        {/* Ticker + company */}
        <div className="min-w-[90px]">
          <div className="flex items-center gap-1.5">
            {isCluster && <Star className="h-3 w-3 fill-current" style={{ color: T.purple }} />}
            <span className="text-base font-bold text-white">{item.ticker}</span>
          </div>
          <p className="text-[10px] text-neutral-500 truncate max-w-[110px]">{item.company}</p>
        </div>

        {/* Insider / institution info */}
        <div className="flex-1 min-w-[130px]">
          {isCluster ? (
            <div className="flex items-center gap-1.5 mb-0.5">
              <AlertTriangle className="h-3 w-3" style={{ color: T.purple }} />
              <span className="text-xs font-bold" style={{ color: T.purple }}>
                {item.clusterCount} Insiders Buying
              </span>
            </div>
          ) : isInst ? (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-neutral-500" />
              <span className="text-xs font-semibold text-white truncate max-w-[160px]">
                {item.institutionName ?? "Institution"}
              </span>
            </div>
          ) : (
            <div>
              <div className="text-xs font-semibold text-white truncate max-w-[160px]">
                {item.insiderName ?? "Insider"}
              </div>
              <div className="text-[10px] text-neutral-500">{item.insiderTitle ?? ""}</div>
            </div>
          )}
        </div>

        {/* Type badge */}
        <div
          className="text-[10px] font-semibold px-2 py-0.5 rounded-lg self-start mt-0.5"
          style={{ background: `${accent}18`, color: accent }}
        >
          {isCluster
            ? "Cluster Buy"
            : item.type === "insider_buy"
            ? "Insider Buy"
            : item.type === "insider_sell"
            ? "Insider Sell"
            : item.type === "institutional_new"
            ? "New Position"
            : item.type === "institutional_increase"
            ? "Added"
            : item.type === "institutional_exit"
            ? "Full Exit"
            : item.type}
        </div>

        {/* Value + shares */}
        <div className="text-right">
          <div className="text-xs font-bold" style={{ color: T.gold }}>{item.value}</div>
          {item.insiderShares != null && (
            <div className="text-[10px] text-neutral-500">
              {item.insiderShares.toLocaleString()} sh
            </div>
          )}
        </div>

        {/* Form type */}
        {formBadge && (
          <div
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded self-start mt-0.5 hidden sm:block"
            style={{ background: `${formBadge.color}12`, color: formBadge.color }}
          >
            {formBadge.label}
          </div>
        )}

        {/* Direction icon */}
        <div className="ml-auto self-center">
          {item.direction === "bullish"
            ? <ArrowUpRight className="h-4 w-4" style={{ color: T.bullish }} />
            : item.direction === "bearish"
            ? <ArrowDownRight className="h-4 w-4" style={{ color: T.bearish }} />
            : <Minus className="h-4 w-4" style={{ color: T.neutral }} />}
        </div>
      </div>

      {/* Signal narrative */}
      {item.signal && (
        <div className="mt-2.5 pt-2.5 border-t border-white/[0.04] pl-3">
          <p className="text-[11px] text-neutral-500 line-clamp-2">{item.signal}</p>
        </div>
      )}
    </div>
  );
}

/** Single EDGAR Form 4 filing row (direct SEC data) */
function EdgarFilingRow({ entry }: { entry: EdgarForm4Entry }) {
  return (
    <a
      href={entry.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start justify-between gap-4 py-3 hover:bg-white/[0.02] rounded-lg px-2 transition-colors group"
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: T.gold }} />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-white group-hover:text-[#C9A646] transition-colors truncate">
            {entry.entityName}
          </div>
          {entry.periodOfReport && (
            <div className="text-[10px] text-neutral-500">
              Period: {fmtDate(entry.periodOfReport)}
            </div>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div
          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: `${T.gold}15`, color: T.gold }}
        >
          Form 4
        </div>
        <div className="text-[10px] text-neutral-500 mt-0.5">{fmtDate(entry.fileDate)}</div>
      </div>
    </a>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────────────────────────────────────

export default function StocksSentiment() {
  // Symbol from URL param or default — mirrors Fundamentals.tsx / Valuation.tsx pattern
  const { symbol: symbolParam } = useParams<{ symbol?: string }>();
  const symbol = (symbolParam || "AAPL").toUpperCase();

  // ── Data sources ────────────────────────────────────────────────────────────
  // 1. Flow scanner (SEC EDGAR + derived)
  const { flowData, stats, isLoading: flowLoading, error: flowError, refresh } = useFlowData();

  // 2. Direct EDGAR Form 4 for this symbol (per-symbol recency)
  const edgarState = useEdgarForm4(symbol);

  // ── Derived / filtered data ─────────────────────────────────────────────────
  const symbolFlow = useMemo(
    () => flowData.filter(i => i.ticker === symbol),
    [flowData, symbol],
  );

  const insiderItems = useMemo(
    () =>
      symbolFlow.filter(i =>
        ["insider_buy", "insider_sell", "cluster_insider"].includes(i.type),
      ),
    [symbolFlow],
  );

  const institutionalItems = useMemo(
    () =>
      symbolFlow.filter(i =>
        ["institutional_new", "institutional_increase", "institutional_exit"].includes(i.type),
      ),
    [symbolFlow],
  );

  const allSignals = useMemo(
    () => [...insiderItems, ...institutionalItems],
    [insiderItems, institutionalItems],
  );

  // Insider sentiment score: our own computation, SEC-derived inputs
  const insiderScore = useMemo(() => computeInsiderScore(insiderItems), [insiderItems]);
  const { label: scoreLbl, color: scoreColor } = scoreLabel(insiderScore);

  // Summary counts
  const buyCount    = insiderItems.filter(i => i.type === "insider_buy" || i.type === "cluster_insider").length;
  const sellCount   = insiderItems.filter(i => i.type === "insider_sell").length;
  const clusterBuys = insiderItems.filter(i => i.type === "cluster_insider").length;

  // Market-wide sentiment from flow scanner (our derived metric)
  const marketSentiment: string = stats?.marketSentiment ?? "neutral";

  // ── Loading / error ─────────────────────────────────────────────────────────
  if (flowLoading) {
    return (
      <div className="p-6 flex items-center gap-2 text-neutral-500 text-sm">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading sentiment data…
      </div>
    );
  }

  if (flowError) {
    return (
      <div className="p-6 text-red-400 text-sm">
        Error loading sentiment data: {flowError}
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-100">Sentiment</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {symbol} · Insider & institutional activity from SEC EDGAR filings
          </p>
        </div>
        <button
          onClick={refresh}
          className="text-[10px] text-neutral-500 hover:text-neutral-300 flex items-center gap-1 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* ── Row 1: Composite score + Market backdrop ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Insider Sentiment Score */}
        <Card>
          <SectionLabel>Insider Sentiment Score</SectionLabel>
          <div className="text-center mb-4">
            <div
              className="text-5xl font-black tabular-nums"
              style={{ color: scoreColor }}
            >
              {insiderScore > 0 ? `+${insiderScore}` : insiderScore}
            </div>
            <div className="text-sm font-semibold mt-1" style={{ color: scoreColor }}>
              {scoreLbl}
            </div>
            <div className="text-[10px] text-neutral-600 mt-0.5">
              Based on SEC Form 4 filings · EDGAR public domain
            </div>
          </div>
          <SentimentGauge score={insiderScore} />
        </Card>

        {/* Stats grid */}
        <Card>
          <SectionLabel>Insider Activity Summary</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Insider Buys",     value: buyCount,       color: T.bullish, Icon: TrendingUp   },
              { label: "Insider Sells",    value: sellCount,      color: T.bearish, Icon: TrendingDown  },
              { label: "Cluster Buys",     value: clusterBuys,    color: T.purple,  Icon: Star         },
              { label: "Institutional",    value: institutionalItems.length, color: T.blue, Icon: Building2 },
            ].map(({ label, value, color, Icon }) => (
              <div
                key={label}
                className="rounded-lg p-3 text-center"
                style={{ background: `${color}08`, border: `1px solid ${color}20` }}
              >
                <Icon className="h-4 w-4 mx-auto mb-1" style={{ color }} />
                <div className="text-xl font-bold" style={{ color }}>{value}</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Market backdrop */}
          <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
              Market Flow Sentiment
            </span>
            <MarketBackdropPill sentiment={marketSentiment} />
          </div>
        </Card>
      </div>

      {/* ── Row 2: Flow scanner signals for this symbol ─────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4" style={{ color: T.purple }} />
          <span className="text-sm font-semibold text-white">
            Insider &amp; Institutional Signals
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: `${T.purple}18`, color: T.purple }}
          >
            {allSignals.length}
          </span>
          <span className="text-[10px] text-neutral-600 ml-auto">
            Source: SEC EDGAR Form 4 via Flow Scanner
          </span>
        </div>

        {allSignals.length > 0 ? (
          <div className="space-y-2.5">
            {allSignals.map(item => (
              <InsiderCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Card>
            <div className="py-10 text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 text-neutral-700" />
              <p className="text-sm text-neutral-500">
                No recent insider or institutional signals for <strong className="text-neutral-300">{symbol}</strong>.
              </p>
              <p className="text-[11px] text-neutral-600 mt-1">
                Flow scanner covers ~50 high-liquidity tickers. New Form 4 filings are ingested every 15 minutes.
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* ── Row 3: Direct EDGAR Form 4 feed (90 days, per-symbol) ────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4" style={{ color: T.gold }} />
          <span className="text-sm font-semibold text-white">
            Recent Form 4 Filings
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: `${T.gold}18`, color: T.gold }}
          >
            90 days
          </span>
          <span className="text-[10px] text-neutral-600 ml-auto">
            Source: EDGAR EFTS · public domain
          </span>
        </div>

        <Card>
          {edgarState.loading ? (
            <div className="flex items-center gap-2 py-6 text-neutral-500 text-xs">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Fetching SEC EDGAR…
            </div>
          ) : edgarState.error ? (
            <div className="py-6 text-center">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
              <p className="text-xs text-neutral-500">
                Could not reach SEC EDGAR: {edgarState.error}
              </p>
              <a
                href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${symbol}&type=4&dateb=&owner=include&count=20`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline mt-1 inline-block"
                style={{ color: T.gold }}
              >
                View on EDGAR →
              </a>
            </div>
          ) : edgarState.entries.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {edgarState.entries.map(entry => (
                <EdgarFilingRow key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-neutral-700" />
              <p className="text-sm text-neutral-500">
                No Form 4 filings found for <strong className="text-neutral-300">{symbol}</strong> in the last 90 days.
              </p>
              <a
                href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${symbol}&type=4&dateb=&owner=include&count=20`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline mt-2 inline-block"
                style={{ color: T.gold }}
              >
                Search EDGAR directly →
              </a>
            </div>
          )}
        </Card>
      </div>

      {/* ── Footer disclaimer ──────────────────────────────────────────────── */}
      <div
        className="text-[10px] text-neutral-600 rounded-lg px-3 py-2 border"
        style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}
      >
        <strong className="text-neutral-500">Data source:</strong> SEC EDGAR (public domain).
        Insider score and market sentiment are analytics derived by FINOTAUR from Form 4 filings.
        No raw price values from third-party vendors are displayed on this page.
        Form 4 data reflects reported officer/director transactions; not investment advice.
      </div>
    </div>
  );
}
