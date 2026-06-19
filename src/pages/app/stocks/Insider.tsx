/**
 * Stocks › Insider & Institutional Holdings page
 *
 * ═══════════════════════════════════════════════════════════════════════
 * DATA PROVENANCE — all fields rendered here are redistribution-safe.
 *
 * 1. INSIDER TRANSACTIONS  (Section: "Insider Transactions")
 *    Source: /api/company-intel/insider/:ticker
 *    Populated by: insiderTracker.js → SEC EDGAR data.sec.gov (public domain)
 *    Fields used: insider_name, insider_title, transaction_type, shares,
 *                 price_per_share, total_value, transaction_date
 *    ✅ SAFE — SEC EDGAR is public domain.
 *
 * 2. FORM 4 FILINGS LIST  (Section: "Recent Form 4 Filings")
 *    Source: /api/company-intel/insider/:ticker/filings
 *    Server-side fetch avoids browser CORS block on efts.sec.gov.
 *    Fields: ticker, accession_number, filed_date, primary_document,
 *            xml_url, filing_url
 *    ✅ SAFE — SEC EDGAR public domain.
 *
 * 3. INSTITUTIONAL 13F HOLDINGS  (Section: "Institutional Holders — 13F")
 *    Source: /api/company-intel/institutional/:ticker
 *      → thirteenFParser.js → SEC EDGAR data.sec.gov/submissions/ (public domain)
 *      → Stored in Supabase tables: fund_positions, institutional_holders
 *    Fields: fund_name, fund_manager, shares, value, percent_of_portfolio,
 *            shares_change, shares_change_percent, is_new_position,
 *            is_closed_position, report_date
 *    ✅ SAFE — All fields originate from SEC EDGAR 13F filings (public domain).
 *    ⚠️  Requires COMPANY_INTEL_ENABLED=true on finotaur-server.
 *        Renders honest "Coming Soon" if endpoint is disabled or returns empty.
 *
 * NOT SHOWN (restricted sources):
 *   - Raw stock price / quote values (Polygon/FMP prohibition)
 *   - Per-stock analyst price targets (raw redistribution)
 * ═══════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { StocksInsiderSkeletonPage } from '@/components/skeletons/StocksInsiderSkeleton';
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
  Clock,
  ExternalLink,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────────
// Design tokens (match Flow Scanner / dark glass aesthetic)
// ──────────────────────────────────────────────────────────────────────────────

const T = {
  gold:      "#C9A646",
  bullish:   "#22C55E",
  bearish:   "#EF4444",
  neutral:   "#8B8B8B",
  purple:    "#A855F7",
  blue:      "#3B82F6",
  teal:      "#14B8A6",
  bg:        "rgba(255,255,255,0.018)",
  border:    "rgba(255,255,255,0.07)",
  mutedText: "#6B6B6B",
  cardHover: "rgba(255,255,255,0.025)",
} as const;

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

/** Raw transaction row from /api/company-intel/insider/:ticker */
interface InsiderTransaction {
  ticker: string;
  cik: string;
  insider_name: string;
  insider_cik: string | null;
  insider_title: string | null;
  is_director: boolean;
  is_officer: boolean;
  is_ten_percent_owner: boolean;
  transaction_type: string; // 'P' = purchase, 'S' = sale, 'A' = award, etc.
  transaction_code: string;
  acquisition_disposition: string;
  shares: number;
  price_per_share: number | null;
  total_value: number | null;
  shares_owned_after: number | null;
  ownership_type: string;
  transaction_date: string;
  filed_date: string;
  accession_number: string;
  filing_url: string;
}

/** Shape returned by /api/company-intel/insider/:ticker */
interface InsiderSummaryData {
  ticker: string;
  period_days: number;
  total_transactions: number;
  buys: { count: number; shares: number; value: number };
  sells: { count: number; shares: number; value: number };
  net_shares: number;
  net_value: number;
  sentiment: "bullish" | "bearish" | "neutral";
  recent_transactions: InsiderTransaction[];
}

interface InsiderSummaryState {
  data: InsiderSummaryData | null;
  loading: boolean;
  error: string | null;
}

/** Shape returned by /api/company-intel/institutional/:ticker */
interface FundPosition {
  fund_cik: string;
  ticker: string;
  cusip?: string;
  shares: number;
  value: number;
  percent_of_portfolio: number;
  report_date: string;
  shares_change: number | null;
  shares_change_percent: number | null;
  is_new_position: boolean;
  is_closed_position: boolean;
  fund_name: string;
  fund_manager: string | null;
}

interface InstitutionalOwnership {
  total_institutions?: number;
  total_shares?: number;
  total_value?: number;
  report_date?: string;
  /** True holder count from stock_institutional_ownership.holders_count */
  holders_count?: number | null;
  /** Quarter label from stock_institutional_ownership (e.g. "Q1 2026") */
  quarter?: string | null;
}

interface InstitutionalState {
  holders: FundPosition[];
  ownership: InstitutionalOwnership | null;
  loading: boolean;
  error: string | null;
  /** true when the endpoint replied 404 or the list is empty — show Coming Soon */
  notAvailable: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

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

function fmtShares(n: number | null | undefined): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function fmtValue(n: number | null | undefined): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook: Insider Summary — calls /api/company-intel/insider/:ticker
// Returns the summary + recent_transactions from the DB (server-side SEC fetch)
// ──────────────────────────────────────────────────────────────────────────────

function useInsiderSummary(symbol: string, refreshKey: number): InsiderSummaryState {
  const [state, setState] = useState<InsiderSummaryState>({
    data: null, loading: true, error: null,
  });

  useEffect(() => {
    if (!symbol) return;
    setState({ data: null, loading: true, error: null });

    fetch(`/api/company-intel/insider/${encodeURIComponent(symbol)}?daysBack=90`, {
      signal: AbortSignal.timeout(20_000),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText);
          setState({ data: null, loading: false, error: text });
          return;
        }
        const json = await res.json();
        setState({ data: json as InsiderSummaryData, loading: false, error: null });
      })
      .catch((err) => {
        setState({ data: null, loading: false, error: String(err?.message || err) });
      });
  }, [symbol, refreshKey]);

  return state;
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook: Form 4 Filings — calls /api/company-intel/insider/:ticker/filings
// Server-side avoids CORS block on efts.sec.gov
// ──────────────────────────────────────────────────────────────────────────────

function useForm4Filings(symbol: string, refreshKey: number): Form4State {
  const [state, setState] = useState<Form4State>({
    entries: [], loading: true, error: null,
  });

  useEffect(() => {
    if (!symbol) return;
    setState({ entries: [], loading: true, error: null });

    fetch(
      `/api/company-intel/insider/${encodeURIComponent(symbol)}/filings?daysBack=90&limit=20`,
      { signal: AbortSignal.timeout(20_000) },
    )
      .then(async (res) => {
        if (!res.ok) {
          setState({ entries: [], loading: false, error: "Could not load recent filings." });
          return;
        }
        const json = await res.json();
        // Map backend filing shape → EdgarForm4Entry for the existing render component
        const entries: EdgarForm4Entry[] = (json?.filings ?? []).map(
          (f: {
            cik: string;
            ticker: string;
            accession_number: string;
            filed_date: string;
            primary_document: string | null;
            xml_url: string | null;
            filing_url: string;
          }) => ({
            id: f.accession_number,
            entityName: f.ticker,
            fileDate: f.filed_date,
            periodOfReport: null, // not returned by this endpoint
            accessionNo: f.accession_number,
            url: f.filing_url,
          }),
        );
        setState({ entries, loading: false, error: null });
      })
      .catch(() => {
        setState({ entries: [], loading: false, error: "Could not load recent filings." });
      });
  }, [symbol, refreshKey]);

  return state;
}

// ──────────────────────────────────────────────────────────────────────────────
// Institutional 13F hook  — calls /api/company-intel/institutional/:ticker
// Populated by thirteenFParser.js from SEC EDGAR data.sec.gov (public domain)
// ──────────────────────────────────────────────────────────────────────────────

function useInstitutionalHoldings(symbol: string): InstitutionalState {
  const [state, setState] = useState<InstitutionalState>({
    holders: [], ownership: null, loading: true, error: null, notAvailable: false,
  });

  useEffect(() => {
    if (!symbol) return;
    setState({ holders: [], ownership: null, loading: true, error: null, notAvailable: false });

    fetch(`/api/company-intel/institutional/${encodeURIComponent(symbol)}?limit=20`, {
      signal: AbortSignal.timeout(15_000),
    })
      .then(async (res) => {
        if (res.status === 404) {
          setState({ holders: [], ownership: null, loading: false, error: null, notAvailable: true });
          return;
        }
        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText);
          setState({ holders: [], ownership: null, loading: false, error: text, notAvailable: false });
          return;
        }
        const data = await res.json();
        const holders: FundPosition[] = data?.top_holders ?? [];
        setState({
          holders,
          ownership: data?.ownership ?? null,
          loading: false,
          error: null,
          notAvailable: holders.length === 0,
        });
      })
      .catch((err) => {
        // Network error or endpoint not mounted — show Coming Soon rather than error
        const msg: string = String(err?.message || err);
        const isUnavailable = msg.includes("Failed to fetch") || msg.includes("404");
        setState({
          holders: [],
          ownership: null,
          loading: false,
          error: isUnavailable ? null : msg,
          notAvailable: isUnavailable,
        });
      });
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

/** Single insider transaction row sourced from /api/company-intel/insider/:ticker */
function InsiderTransactionRow({ txn }: { txn: InsiderTransaction }) {
  const isBuy   = txn.transaction_type === "P";
  const isSell  = txn.transaction_type === "S";
  const accent  = isBuy ? T.bullish : isSell ? T.bearish : T.neutral;

  const typeLabel =
    isBuy  ? "Purchase" :
    isSell ? "Sale"     :
    txn.transaction_type === "A" ? "Award"    :
    txn.transaction_type === "M" ? "Exercise" :
    txn.transaction_type === "G" ? "Gift"     :
    "Other";

  return (
    <div
      className="relative rounded-xl p-4 transition-all duration-200"
      style={{ background: T.bg, border: `1px solid ${accent}20` }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: accent }}
      />

      <div className="pl-3 flex flex-wrap gap-x-5 gap-y-2 items-start">
        {/* Type badge */}
        <div
          className="text-[10px] font-semibold px-2 py-0.5 rounded-lg self-start mt-0.5 shrink-0"
          style={{ background: `${accent}18`, color: accent }}
        >
          {typeLabel}
        </div>

        {/* Insider info */}
        <div className="flex-1 min-w-[130px]">
          <div className="text-xs font-semibold text-white truncate max-w-[200px]">
            {txn.insider_name}
          </div>
          {txn.insider_title && (
            <div className="text-[10px] text-neutral-500">{txn.insider_title}</div>
          )}
        </div>

        {/* Value + shares */}
        <div className="text-right shrink-0">
          <div className="text-xs font-bold" style={{ color: T.gold }}>
            {fmtValue(txn.total_value)}
          </div>
          <div className="text-[10px] text-neutral-500">
            {fmtShares(txn.shares)} sh
          </div>
        </div>

        {/* Price per share */}
        {txn.price_per_share != null && (
          <div className="text-right shrink-0">
            <div className="text-xs text-neutral-300">
              @{fmtValue(txn.price_per_share)}
            </div>
            <div className="text-[10px] text-neutral-600">per share</div>
          </div>
        )}

        {/* Direction arrow */}
        <div className="ml-auto self-center shrink-0">
          {isBuy
            ? <ArrowUpRight   className="h-4 w-4" style={{ color: T.bullish }} />
            : isSell
            ? <ArrowDownRight className="h-4 w-4" style={{ color: T.bearish }} />
            : <Minus          className="h-4 w-4" style={{ color: T.neutral  }} />}
        </div>
      </div>

      {/* Date row */}
      <div className="mt-2 pl-3 flex flex-wrap gap-x-4 gap-y-1 items-center">
        <div className="flex items-center gap-1 text-[10px] text-neutral-600">
          <Clock className="h-3 w-3" />
          {fmtDate(txn.transaction_date)}
        </div>
        {txn.filing_url && (
          <a
            href={txn.filing_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-[10px] hover:underline transition-colors"
            style={{ color: T.gold }}
          >
            SEC filing
            <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
          </a>
        )}
      </div>
    </div>
  );
}

/** Single EDGAR Form 4 filing row */
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
      <div className="text-right shrink-0 flex items-center gap-2">
        <div>
          <div
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: `${T.gold}15`, color: T.gold }}
          >
            Form 4
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">{fmtDate(entry.fileDate)}</div>
        </div>
        <ExternalLink className="h-3 w-3 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
      </div>
    </a>
  );
}

/** Single institutional 13F holder row */
function InstitutionalHolderRow({ position }: { position: FundPosition }) {
  const changeColor =
    position.is_new_position   ? T.bullish :
    position.is_closed_position ? T.bearish :
    (position.shares_change ?? 0) > 0  ? T.bullish :
    (position.shares_change ?? 0) < 0  ? T.bearish  : T.neutral;

  const changeBadge =
    position.is_new_position    ? { label: "New Position", color: T.bullish } :
    position.is_closed_position ? { label: "Exited",       color: T.bearish } :
    (position.shares_change ?? 0) > 0  ? { label: "Added",  color: T.bullish } :
    (position.shares_change ?? 0) < 0  ? { label: "Trimmed", color: T.bearish } :
    null;

  return (
    <div
      className="flex flex-wrap gap-x-5 gap-y-2 items-center py-3 px-2 rounded-lg hover:bg-white/[0.02] transition-colors"
      style={{ borderBottom: `1px solid ${T.border}` }}
    >
      {/* Fund name */}
      <div className="flex-1 min-w-[160px]">
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
          <span className="text-xs font-semibold text-white truncate max-w-[180px]">
            {position.fund_name}
          </span>
        </div>
        {position.fund_manager && (
          <div className="text-[10px] text-neutral-500 pl-5">{position.fund_manager}</div>
        )}
      </div>

      {/* Value */}
      <div className="text-right min-w-[70px]">
        <div className="text-xs font-bold" style={{ color: T.gold }}>
          {fmtValue(position.value)}
        </div>
        <div className="text-[10px] text-neutral-500">
          {fmtShares(position.shares)} sh
        </div>
      </div>

      {/* Portfolio % */}
      <div className="text-right min-w-[50px]">
        <div className="text-xs text-neutral-300">
          {position.percent_of_portfolio != null
            ? `${position.percent_of_portfolio.toFixed(1)}%`
            : "—"}
        </div>
        <div className="text-[10px] text-neutral-600">of fund</div>
      </div>

      {/* Change badge */}
      {changeBadge && (
        <div
          className="text-[10px] font-semibold px-2 py-0.5 rounded-lg shrink-0"
          style={{ background: `${changeBadge.color}15`, color: changeBadge.color }}
        >
          {changeBadge.label}
          {!position.is_new_position && !position.is_closed_position && position.shares_change != null && (
            <span className="ml-1 opacity-80">
              ({position.shares_change > 0 ? "+" : ""}{fmtShares(position.shares_change)} sh)
            </span>
          )}
        </div>
      )}

      {/* Arrow */}
      <div className="ml-auto shrink-0">
        {position.is_new_position || (position.shares_change ?? 0) > 0
          ? <ArrowUpRight   className="h-4 w-4" style={{ color: changeColor }} />
          : position.is_closed_position || (position.shares_change ?? 0) < 0
          ? <ArrowDownRight className="h-4 w-4" style={{ color: changeColor }} />
          : <Minus          className="h-4 w-4" style={{ color: T.neutral  }} />}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────────────────────────────────────

export default function StocksInsider() {
  const { symbol: symbolParam } = useParams<{ symbol?: string }>();
  const symbol = (symbolParam || "AAPL").toUpperCase();

  // Bump this counter to re-trigger all backend hooks simultaneously
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // ── Data ────────────────────────────────────────────────────────────────────
  const insiderState       = useInsiderSummary(symbol, refreshKey);
  const edgarState         = useForm4Filings(symbol, refreshKey);
  const institutionalState = useInstitutionalHoldings(symbol);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const summary    = insiderState.data;
  const buyCount   = summary?.buys.count  ?? 0;
  const sellCount  = summary?.sells.count ?? 0;

  /**
   * Cluster Buys: number of distinct insiders with a 'P' transaction when
   * there are >=2 distinct buyers (i.e., count them all or 0 if only 1 buyer).
   */
  const clusterCount = useMemo(() => {
    const txns = summary?.recent_transactions ?? [];
    const buyers = new Set(
      txns.filter(t => t.transaction_type === "P").map(t => t.insider_name),
    );
    return buyers.size >= 2 ? buyers.size : 0;
  }, [summary]);

  const reportDate = institutionalState.holders[0]?.report_date ?? null;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (insiderState.loading) {
    return <StocksInsiderSkeletonPage />;
  }

  if (insiderState.error) {
    return (
      <div className="p-6 text-red-400 text-sm">
        Error loading insider data: {insiderState.error}
      </div>
    );
  }

  const recentTransactions = summary?.recent_transactions ?? [];
  const totalTransactions  = summary?.total_transactions ?? 0;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-100">Insider &amp; Institutional</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {symbol} · SEC Form 4 transactions &amp; 13F institutional holdings
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

      {/* ── Row 1: Summary stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Insider Buys",   value: buyCount,     color: T.bullish, Icon: TrendingUp   },
          { label: "Insider Sells",  value: sellCount,    color: T.bearish, Icon: TrendingDown  },
          { label: "Cluster Buys",   value: clusterCount, color: T.purple,  Icon: Star         },
          { label: "13F Holders",    value: institutionalState.loading ? "…" : (institutionalState.ownership?.holders_count ?? institutionalState.holders.length), color: T.teal, Icon: Building2 },
        ].map(({ label, value, color, Icon }) => (
          <div
            key={label}
            className="rounded-xl p-4 text-center"
            style={{ background: T.bg, border: `1px solid ${color}20` }}
          >
            <Icon className="h-4 w-4 mx-auto mb-1.5" style={{ color }} />
            <div className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — INSIDER TRANSACTIONS (SEC Form 4, public domain)         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4" style={{ color: T.purple }} />
          <span className="text-sm font-semibold text-white">Insider Transactions</span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: `${T.purple}18`, color: T.purple }}
          >
            {totalTransactions}
          </span>
          <span className="text-[10px] text-neutral-600 ml-auto">
            Source: SEC EDGAR Form 4 · public domain
          </span>
        </div>

        {totalTransactions === 0 ? (
          <Card>
            <div className="py-10 text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 text-neutral-700" />
              <p className="text-sm text-neutral-500">
                No insider transactions for <strong className="text-neutral-300">{symbol}</strong> in the last 90 days.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {recentTransactions.map((txn, idx) => (
              <InsiderTransactionRow
                key={`${txn.accession_number}-${txn.insider_cik}-${txn.transaction_date}-${idx}`}
                txn={txn}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Form 4 filings (backend-proxied, 90 days) ────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4" style={{ color: T.gold }} />
          <span className="text-sm font-semibold text-white">Recent Form 4 Filings</span>
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
              Loading Form 4 filings…
            </div>
          ) : edgarState.error ? (
            <div className="py-6 text-center">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
              <p className="text-xs text-neutral-500">
                {edgarState.error}
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

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2 — INSTITUTIONAL HOLDERS 13F (SEC EDGAR, public domain)     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="h-4 w-4" style={{ color: T.teal }} />
          <span className="text-sm font-semibold text-white">Institutional Holders — 13F</span>
          {reportDate && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: `${T.teal}18`, color: T.teal }}
            >
              Q filing: {fmtDate(reportDate)}
            </span>
          )}
          {institutionalState.ownership?.quarter && (
            <span className="text-[10px] text-neutral-500">
              13F · as of {institutionalState.ownership.quarter}
            </span>
          )}
          <span className="text-[10px] text-neutral-600 ml-auto">
            Source: SEC EDGAR 13F · public domain
          </span>
        </div>

        {institutionalState.loading ? (
          <Card>
            <div className="flex items-center gap-2 py-8 text-neutral-500 text-xs">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Loading 13F holdings…
            </div>
          </Card>
        ) : institutionalState.error ? (
          <Card>
            <div className="py-6 text-center">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
              <p className="text-xs text-neutral-500">
                Could not load institutional data: {institutionalState.error}
              </p>
            </div>
          </Card>
        ) : institutionalState.notAvailable ? (
          /* ── Coming Soon state — honest, never fabricates data ── */
          <Card>
            <div className="py-10 text-center">
              <Building2 className="h-10 w-10 mx-auto mb-3 text-neutral-700" />
              <p className="text-sm font-semibold text-neutral-300 mb-1">
                13F Institutional Data — Coming Soon
              </p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Institutional holdings for <strong className="text-neutral-300">{symbol}</strong> from
                SEC 13F filings are not yet loaded. The data pipeline (SEC EDGAR → fund_positions table)
                requires the server-side cron to run for this ticker.
              </p>
              <div className="mt-4 flex flex-col gap-1 items-center">
                <span className="text-[10px] text-neutral-600">
                  Data source when live: SEC EDGAR 13F filings (public domain)
                </span>
                <span className="text-[10px] text-neutral-600">
                  Tracked funds: Berkshire, Bridgewater, Renaissance, Citadel, Soros, and 10 others
                </span>
              </div>
              <a
                href={`https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(symbol)}%22&forms=13F-HR`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs underline"
                style={{ color: T.teal }}
              >
                Search 13F filings on EDGAR
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </Card>
        ) : (
          /* ── Live institutional holders table ── */
          <Card className="overflow-hidden">
            {institutionalState.ownership && (
              <div className="grid grid-cols-3 gap-3 mb-4 pb-4" style={{ borderBottom: `1px solid ${T.border}` }}>
                {[
                  { label: "Total Institutions",      value: institutionalState.ownership.total_institutions?.toLocaleString() ?? "—" },
                  { label: "Total Shares (13F)",       value: fmtShares(institutionalState.ownership.total_shares ?? null) },
                  { label: "Total Value (13F)",        value: fmtValue(institutionalState.ownership.total_value ?? null) },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <div className="text-sm font-bold text-neutral-200">{value}</div>
                    <div className="text-[10px] text-neutral-500">{label}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-0">
              {institutionalState.holders.map((pos) => (
                <InstitutionalHolderRow key={`${pos.fund_cik}-${pos.report_date}`} position={pos} />
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ── Footer disclaimer ──────────────────────────────────────────────── */}
      <div
        className="text-[10px] text-neutral-600 rounded-lg px-3 py-2 border"
        style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}
      >
        <strong className="text-neutral-500">Data source:</strong> SEC EDGAR (public domain).
        Form 4 insider transactions are reported by officers and directors within 2 business days of the transaction.
        13F institutional holdings are disclosed quarterly (within 45 days of quarter end) by institutions managing
        &gt;$100M in US equities. No raw price values from third-party vendors are displayed.
        Not investment advice.
      </div>

    </div>
  );
}
