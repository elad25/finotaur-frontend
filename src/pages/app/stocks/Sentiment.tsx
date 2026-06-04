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
import { Card, Eyebrow } from "@/components/ds/Card";

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
// Design tokens — ETF / DS gold-on-black
// Raw hex only where inline-style logic (dynamic opacity, gradient) requires it.
// Everything else uses DS Tailwind classes.
// ──────────────────────────────────────────────────────────────────────────────

const GOLD    = '#C9A646'; // --gold-primary
const RED     = '#E24B4A'; // --num-negative
const MUTED   = 'rgba(255,255,255,0.55)'; // ink-secondary hex equivalent

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

/** Score → label + DS hex accent (gold for bullish, red for bearish, muted for neutral) */
function scoreLabel(score: number): { label: string; hex: string; textClass: string } {
  if (score >= 60)  return { label: "Strong Bullish", hex: GOLD, textClass: 'text-gold-primary' };
  if (score >= 20)  return { label: "Bullish",        hex: GOLD, textClass: 'text-gold-primary' };
  if (score >= -20) return { label: "Neutral",        hex: MUTED, textClass: 'text-ink-secondary' };
  if (score >= -60) return { label: "Bearish",        hex: RED,  textClass: 'text-num-negative'  };
  return               { label: "Strong Bearish",  hex: RED,  textClass: 'text-num-negative'  };
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

/** Gauge bar: maps score −100..100 to a horizontal fill */
function SentimentGauge({ score }: { score: number }) {
  const pct = Math.round(((score + 100) / 200) * 100); // 0–100% width
  const { hex, textClass } = scoreLabel(score);

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs text-ink-muted">Bearish</span>
        <span className={`text-sm font-bold ${textClass}`}>{scoreLabel(score).label}</span>
        <span className="text-xs text-ink-muted">Bullish</span>
      </div>
      <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${RED}, ${hex})`,
          }}
        />
      </div>
      <div className="flex justify-center mt-1.5">
        <span className="text-xs text-ink-muted">
          Score: <span className="font-mono tabular-nums text-ink-primary font-semibold">{score > 0 ? `+${score}` : score}</span>
          <span className="ml-1 text-ink-tertiary"> / 100</span>
        </span>
      </div>
    </div>
  );
}

/** Market backdrop pill from flow scanner's computed market sentiment */
function MarketBackdropPill({ sentiment }: { sentiment: string }) {
  // bullish = gold, bearish = red, neutral = muted — no green/purple/blue
  const cfg =
    sentiment === "bullish" ? { hex: GOLD,  textClass: 'text-gold-primary',   Icon: TrendingUp,  label: "Bullish" } :
    sentiment === "bearish" ? { hex: RED,   textClass: 'text-num-negative',   Icon: TrendingDown, label: "Bearish" } :
                              { hex: MUTED, textClass: 'text-ink-secondary',  Icon: Minus,        label: "Neutral" };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs font-semibold ${cfg.textClass}`}
      style={{ background: `${cfg.hex}15`, border: `1px solid ${cfg.hex}30` }}
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
  // DS color mapping: cluster→gold, buy→gold, inst→muted-white, sell→red
  const accentHex =
    isCluster ? GOLD  :
    isBuy     ? GOLD  :
    isInst    ? MUTED : RED;

  // Form badge: open-market = gold, 10b5-1 = muted
  const formBadge =
    item.form4Type === "open_market" ? { label: "Open Market", hex: GOLD  } :
    item.form4Type === "10b5-1"      ? { label: "10b5-1 Plan", hex: MUTED } :
    null;

  return (
    <div
      className="relative rounded-[12px] p-4 transition-all duration-200 border-[0.5px] border-border-ds-subtle hover:border-border-ds-default bg-surface-1"
    >
      {/* accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[12px]"
        style={{ background: accentHex }}
      />

      <div className="pl-3 flex flex-wrap gap-x-6 gap-y-2 items-start">
        {/* Ticker + company */}
        <div className="min-w-[90px]">
          <div className="flex items-center gap-1.5">
            {isCluster && <Star className="h-3 w-3 fill-current text-gold-primary" />}
            <span className="text-base font-bold text-ink-primary">{item.ticker}</span>
          </div>
          <p className="text-[10px] text-ink-muted truncate max-w-[110px]">{item.company}</p>
        </div>

        {/* Insider / institution info */}
        <div className="flex-1 min-w-[130px]">
          {isCluster ? (
            <div className="flex items-center gap-1.5 mb-0.5">
              <AlertTriangle className="h-3 w-3 text-gold-primary" />
              <span className="text-xs font-bold text-gold-primary">
                {item.clusterCount} Insiders Buying
              </span>
            </div>
          ) : isInst ? (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-ink-muted" />
              <span className="text-xs font-semibold text-ink-primary truncate max-w-[160px]">
                {item.institutionName ?? "Institution"}
              </span>
            </div>
          ) : (
            <div>
              <div className="text-xs font-semibold text-ink-primary truncate max-w-[160px]">
                {item.insiderName ?? "Insider"}
              </div>
              <div className="text-[10px] text-ink-muted">{item.insiderTitle ?? ""}</div>
            </div>
          )}
        </div>

        {/* Type badge */}
        <div
          className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px] self-start mt-0.5"
          style={{ background: `${accentHex}18`, color: accentHex }}
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
          <div className="text-xs font-bold font-mono tabular-nums text-gold-primary">{item.value}</div>
          {item.insiderShares != null && (
            <div className="text-[10px] font-mono tabular-nums text-ink-muted">
              {item.insiderShares.toLocaleString()} sh
            </div>
          )}
        </div>

        {/* Form type */}
        {formBadge && (
          <div
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[6px] self-start mt-0.5 hidden sm:block"
            style={{ background: `${formBadge.hex}12`, color: formBadge.hex }}
          >
            {formBadge.label}
          </div>
        )}

        {/* Direction icon */}
        <div className="ml-auto self-center">
          {item.direction === "bullish"
            ? <ArrowUpRight className="h-4 w-4 text-gold-primary" />
            : item.direction === "bearish"
            ? <ArrowDownRight className="h-4 w-4 text-num-negative" />
            : <Minus className="h-4 w-4 text-ink-secondary" />}
        </div>
      </div>

      {/* Signal narrative */}
      {item.signal && (
        <div className="mt-2.5 pt-2.5 border-t border-border-ds-subtle pl-3">
          <p className="text-[11px] text-ink-muted line-clamp-2">{item.signal}</p>
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
      className="flex items-start justify-between gap-4 py-3 hover:bg-white/[0.02] rounded-[6px] px-2 transition-colors group"
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gold-primary" />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-ink-primary group-hover:text-gold-primary transition-colors truncate">
            {entry.entityName}
          </div>
          {entry.periodOfReport && (
            <div className="text-[10px] text-ink-muted">
              Period: {fmtDate(entry.periodOfReport)}
            </div>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-[6px] text-gold-primary"
          style={{ background: `${GOLD}15` }}
        >
          Form 4
        </div>
        <div className="text-[10px] text-ink-muted mt-0.5">{fmtDate(entry.fileDate)}</div>
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
  const { textClass: scoreLblClass } = scoreLabel(insiderScore);

  // Summary counts
  const buyCount    = insiderItems.filter(i => i.type === "insider_buy" || i.type === "cluster_insider").length;
  const sellCount   = insiderItems.filter(i => i.type === "insider_sell").length;
  const clusterBuys = insiderItems.filter(i => i.type === "cluster_insider").length;

  // Market-wide sentiment from flow scanner (our derived metric)
  const marketSentiment: string = stats?.marketSentiment ?? "neutral";

  // ── Loading / error ─────────────────────────────────────────────────────────
  if (flowLoading) {
    return (
      <div className="p-6 flex items-center gap-2 text-ink-muted text-sm">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading sentiment data…
      </div>
    );
  }

  if (flowError) {
    return (
      <div className="p-6 text-num-negative text-sm">
        Error loading sentiment data: {flowError}
      </div>
    );
  }

  // Stats grid rows — DS color mapping:
  // Insider Buys (bullish) → gold; Insider Sells (bearish) → red;
  // Cluster Buys (was purple) → gold; Institutional (was blue) → ink-secondary hex
  const statsGrid = [
    { label: "Insider Buys",  value: buyCount,                hex: GOLD,  Icon: TrendingUp  },
    { label: "Insider Sells", value: sellCount,               hex: RED,   Icon: TrendingDown },
    { label: "Cluster Buys",  value: clusterBuys,             hex: GOLD,  Icon: Star         },
    { label: "Institutional", value: institutionalItems.length, hex: MUTED, Icon: Building2  },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-ds-4 space-y-ds-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-ds-1">
          <Eyebrow>Stocks</Eyebrow>
          <h2 className="text-h3 font-medium text-ink-primary">Sentiment</h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            {symbol} · Insider &amp; institutional activity from SEC EDGAR filings
          </p>
        </div>
        <button
          onClick={refresh}
          className="text-[10px] text-ink-muted hover:text-ink-secondary flex items-center gap-1 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* ── Row 1: Composite score + Market backdrop ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-ds-4">

        {/* Insider Sentiment Score */}
        <Card padding="default">
          <Eyebrow className="mb-ds-3">Insider Sentiment Score</Eyebrow>
          <div className="text-center mb-ds-4">
            <div className={`text-5xl font-black tabular-nums font-mono ${scoreLblClass}`}>
              {insiderScore > 0 ? `+${insiderScore}` : insiderScore}
            </div>
            <div className={`text-sm font-semibold mt-1 ${scoreLblClass}`}>
              {scoreLabel(insiderScore).label}
            </div>
            <div className="text-[10px] text-ink-tertiary mt-0.5">
              Based on SEC Form 4 filings · EDGAR public domain
            </div>
          </div>
          <SentimentGauge score={insiderScore} />
        </Card>

        {/* Stats grid */}
        <Card padding="default">
          <Eyebrow className="mb-ds-3">Insider Activity Summary</Eyebrow>
          <div className="grid grid-cols-2 gap-3">
            {statsGrid.map(({ label, value, hex, Icon }) => (
              <div
                key={label}
                className="rounded-[6px] p-3 text-center"
                style={{ background: `${hex}08`, border: `1px solid ${hex}20` }}
              >
                <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: hex }} />
                <div className="text-xl font-bold font-mono tabular-nums" style={{ color: hex }}>{value}</div>
                <div className="text-[10px] text-ink-muted mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Market backdrop */}
          <div className="mt-3 pt-3 border-t border-border-ds-subtle flex items-center justify-between">
            <span className="text-[10px] text-ink-muted uppercase tracking-wider">
              Market Flow Sentiment
            </span>
            <MarketBackdropPill sentiment={marketSentiment} />
          </div>
        </Card>
      </div>

      {/* ── Row 2: Flow scanner signals for this symbol ─────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-ds-3">
          <Users className="h-4 w-4 text-gold-primary" />
          <span className="text-sm font-semibold text-ink-primary">
            Insider &amp; Institutional Signals
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-[6px] font-semibold text-gold-primary"
            style={{ background: `${GOLD}18` }}
          >
            {allSignals.length}
          </span>
          <span className="text-[10px] text-ink-muted ml-auto">
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
          <Card padding="default">
            <div className="py-10 text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 text-ink-muted" />
              <p className="text-sm text-ink-secondary">
                No recent insider or institutional signals for <strong className="text-ink-primary">{symbol}</strong>.
              </p>
              <p className="text-[11px] text-ink-muted mt-1">
                Flow scanner covers ~50 high-liquidity tickers. New Form 4 filings are ingested every 15 minutes.
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* ── Row 3: Direct EDGAR Form 4 feed (90 days, per-symbol) ────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-ds-3">
          <FileText className="h-4 w-4 text-gold-primary" />
          <span className="text-sm font-semibold text-ink-primary">
            Recent Form 4 Filings
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-[6px] font-semibold text-gold-primary"
            style={{ background: `${GOLD}18` }}
          >
            90 days
          </span>
          <span className="text-[10px] text-ink-muted ml-auto">
            Source: EDGAR EFTS · public domain
          </span>
        </div>

        <Card padding="default">
          {edgarState.loading ? (
            <div className="flex items-center gap-2 py-6 text-ink-muted text-xs">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Fetching SEC EDGAR…
            </div>
          ) : edgarState.error ? (
            <div className="py-6 text-center">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-gold-primary" />
              <p className="text-xs text-ink-muted">
                Could not reach SEC EDGAR: {edgarState.error}
              </p>
              <a
                href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${symbol}&type=4&dateb=&owner=include&count=20`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline mt-1 inline-block text-gold-primary"
              >
                View on EDGAR →
              </a>
            </div>
          ) : edgarState.entries.length > 0 ? (
            <div className="divide-y divide-border-ds-subtle">
              {edgarState.entries.map(entry => (
                <EdgarFilingRow key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-ink-muted" />
              <p className="text-sm text-ink-secondary">
                No Form 4 filings found for <strong className="text-ink-primary">{symbol}</strong> in the last 90 days.
              </p>
              <a
                href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${symbol}&type=4&dateb=&owner=include&count=20`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline mt-2 inline-block text-gold-primary"
              >
                Search EDGAR directly →
              </a>
            </div>
          )}
        </Card>
      </div>

      {/* ── Footer disclaimer ──────────────────────────────────────────────── */}
      <div className="text-[10px] text-ink-muted rounded-[6px] px-3 py-2 border border-border-ds-subtle bg-surface-1">
        <strong className="text-ink-secondary">Data source:</strong> SEC EDGAR (public domain).
        Insider score and market sentiment are analytics derived by FINOTAUR from Form 4 filings.
        No raw price values from third-party vendors are displayed on this page.
        Form 4 data reflects reported officer/director transactions; not investment advice.
      </div>
    </div>
  );
}
