/**
 * CompanyResearchCenter — full-page SEC filings research surface.
 *
 * Replaces the old "Reports & PDFs" PageTemplate. Two-column layout:
 *   left  → search, popular pills, tab bar, results grid/list
 *   right → sticky AI Report Summary rail (placeholder metrics)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  FileText,
  LayoutGrid,
  List,
  Search,
  Sparkles,
} from 'lucide-react';

import { buildFilingUrl } from '@/lib/filingUrl';
import { getJsonSmart } from '@/lib/http';
import { Button } from '@/components/ds/Button';
import { SectionSpinner } from '@/components/ds/Spinner';
import { useFinoChat } from '@/contexts/FinoChatContext';
import StockLogo from './StockLogo';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Filing {
  form: string;
  filingDate: string;
  reportDate?: string;
  accessionNumber: string;
  primaryDocument: string;
  filingUrl?: string;
}

interface RecentEntry {
  t: string;
  n: string;
}

interface Suggestion {
  symbol: string;
  name?: string;
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const POPULAR: RecentEntry[] = [
  { t: 'AAPL', n: 'Apple Inc.' },
  { t: 'MSFT', n: 'Microsoft Corp.' },
  { t: 'NVDA', n: 'NVIDIA Corp.' },
  { t: 'AMZN', n: 'Amazon.com Inc.' },
  { t: 'META', n: 'Meta Platforms' },
  { t: 'GOOGL', n: 'Alphabet Inc.' },
  { t: 'TSLA', n: 'Tesla, Inc.' },
];

const TABS = [
  { id: 'all', label: 'All', sub: '' },
  { id: '10-K', label: '10-K', sub: 'Annual Reports' },
  { id: '10-Q', label: '10-Q', sub: 'Quarterly Reports' },
] as const;

type TabId = (typeof TABS)[number]['id'];
type ViewMode = 'grid' | 'list';
type SortMode = 'latest' | 'oldest';

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function yearOf(d?: string): string {
  if (!d) return '';
  const y = new Date(d).getFullYear();
  return isNaN(y) ? '' : String(y);
}

function quarterOf(d?: string): number {
  if (!d) return 1;
  const m = new Date(d).getMonth(); // 0-based
  return Math.floor(m / 3) + 1;
}

function fmtDate(d?: string): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Only full periodic reports are surfaced: annual (10-K) + quarterly (10-Q).
// 8-K "current reports" are interim mid-quarter event filings, and the feed also
// returns Form 4 / SD / 144 noise — all excluded so only real reports show.
const REPORT_FORMS = ['10-K', '10-Q'] as const;

/** Strip amendment suffix so "10-K/A" maps to "10-K". */
function baseForm(form: string): string {
  return form.replace(/\/A$/i, '').toUpperCase();
}

function isReportForm(form: string): boolean {
  return (REPORT_FORMS as readonly string[]).includes(baseForm(form));
}

interface ReportMeta {
  title: string;
  period: string;
  desc: string;
  dateLabel: string;
}

function reportMeta(form: string, reportDate?: string): ReportMeta {
  switch (baseForm(form)) {
    case '10-K':
      return {
        title: 'Annual Report',
        period: `Fiscal Year ${yearOf(reportDate)}`,
        desc: 'Complete annual report including audited financial statements and disclosures.',
        dateLabel: 'Period Ended',
      };
    case '10-Q':
      return {
        title: 'Quarterly Report',
        period: `Q${quarterOf(reportDate)} ${yearOf(reportDate)}`,
        desc: 'Quarterly report including financial statements and management discussion.',
        dateLabel: 'Period Ended',
      };
    default:
      return {
        title: form,
        period: 'Filing',
        desc: 'SEC filing document.',
        dateLabel: 'Report Date',
      };
  }
}

// ---------------------------------------------------------------------------
// ReportCard (grid variant)
// ---------------------------------------------------------------------------

interface ReportCardProps {
  filing: Filing;
  ticker: string;
  companyName: string;
  view: ViewMode;
}

function ReportCard({ filing, ticker, companyName, view }: ReportCardProps) {
  const meta = reportMeta(filing.form, filing.reportDate);
  const url = filing.filingUrl ?? '#';

  if (view === 'list') {
    return (
      <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 px-ds-4 py-3 flex items-center gap-ds-4 hover:border-gold-border transition-colors flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <StockLogo ticker={ticker} size={32} />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink-primary truncate leading-tight">{companyName}</p>
            <p className="text-[11px] text-ink-secondary leading-tight">{ticker}</p>
          </div>
        </div>
        <span className="rounded-md border border-gold-border bg-gold-primary/5 px-2 py-0.5 text-[11px] font-semibold text-gold-primary shrink-0">
          {filing.form}
        </span>
        <div className="hidden sm:block min-w-[140px]">
          <p className="text-[13px] font-semibold text-ink-primary leading-tight">{meta.title}</p>
          <p className="text-[11px] text-ink-secondary">{meta.period}</p>
        </div>
        <div className="hidden md:flex gap-ds-4 text-[11px] font-mono tabular-nums">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-ink-secondary">Filed</p>
            <p className="text-ink-primary">{fmtDate(filing.filingDate)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-ink-secondary">{meta.dateLabel}</p>
            <p className="text-ink-primary">{fmtDate(filing.reportDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href={url} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" showArrow={false}>
              View
            </Button>
          </a>
          <a href={url} target="_blank" rel="noreferrer">
            <Button variant="gold" size="sm" showArrow={false}>
              <Download size={13} />
              Download
            </Button>
          </a>
        </div>
      </div>
    );
  }

  // Grid variant
  return (
    <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-4 flex flex-col gap-ds-3 hover:border-gold-border transition-colors">
      {/* top row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <StockLogo ticker={ticker} size={34} />
          <div>
            <p className="text-[14px] font-semibold text-ink-primary leading-tight">{companyName}</p>
            <p className="text-[12px] text-ink-secondary leading-tight">{ticker}</p>
          </div>
        </div>
        <span className="rounded-md border border-gold-border bg-gold-primary/5 px-2 py-0.5 text-[11px] font-semibold text-gold-primary shrink-0">
          {filing.form}
        </span>
      </div>

      {/* title + period + desc */}
      <div>
        <p className="text-[14px] font-semibold text-ink-primary">{meta.title}</p>
        <p className="text-[12px] text-ink-secondary">{meta.period}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">{meta.desc}</p>
      </div>

      {/* metadata */}
      <div className="grid grid-cols-2 gap-2 border-t border-border-ds-subtle pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ink-secondary">Filing Date</p>
          <p className="text-[12px] font-mono tabular-nums text-ink-primary">{fmtDate(filing.filingDate)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ink-secondary">{meta.dateLabel}</p>
          <p className="text-[12px] font-mono tabular-nums text-ink-primary">{fmtDate(filing.reportDate)}</p>
        </div>
      </div>

      {/* buttons */}
      <div className="flex items-center gap-2 pt-1">
        <a href={url} target="_blank" rel="noreferrer" className="flex-1">
          <Button variant="outline" size="sm" showArrow={false} className="w-full">
            <FileText size={13} />
            View
          </Button>
        </a>
        <a href={url} target="_blank" rel="noreferrer" className="flex-1">
          <Button variant="gold" size="sm" showArrow={false} className="w-full">
            <Download size={13} />
            Download PDF
          </Button>
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CompanyResearchCenter() {
  const location = useLocation();
  const navigate = useNavigate();
  const { open: openFino } = useFinoChat();

  // Core state
  const [ticker, setTicker] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [cik, setCik] = useState('');
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [openSuggest, setOpenSuggest] = useState(false);

  // Filters / display
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [view, setView] = useState<ViewMode>('grid');
  const [sort, setSort] = useState<SortMode>('latest');
  const [shown, setShown] = useState(12);
  const [sortOpen, setSortOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Load filings
  // ---------------------------------------------------------------------------

  const load = useCallback(
    async (sym: string, name?: string) => {
      const upper = sym.trim().toUpperCase();
      if (!upper) return;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      setError(null);
      setShown(12);

      // Optimistically update ticker + name
      const resolved =
        name ||
        POPULAR.find((p) => p.t === upper)?.n ||
        upper;
      setTicker(upper);
      setCompanyName(resolved);

      try {
        // Full periodic reports only — quarterly (10-Q) + annual (10-K).
        // 8-K "current reports" are interim, mid-quarter event filings (not a
        // periodic financial report), so they are intentionally excluded.
        // forms+limit are honoured server-side (it scans the ~1000 most recent
        // SEC filings; without forms it returns mostly Form 4/8-K noise).
        const json = await getJsonSmart(
          `/api/sec/filings?symbol=${encodeURIComponent(upper)}&forms=10-Q,10-K&limit=24`,
          { signal: ac.signal },
        );

        const newCik: string = json?.cik || '';
        setCik(newCik);

        const resolvedName =
          name ||
          json?.companyName ||
          POPULAR.find((p) => p.t === upper)?.n ||
          upper;
        setCompanyName(resolvedName);

        const rows: Filing[] = (json?.filings ?? [])
          .filter((f: Filing) => isReportForm(f.form))
          .map((f: Filing) => ({
            ...f,
            filingUrl:
              f.filingUrl ||
              (newCik && f.accessionNumber && f.primaryDocument
                ? buildFilingUrl(newCik, f.accessionNumber, f.primaryDocument)
                : undefined),
          }));

        rows.sort((a, b) => (a.filingDate < b.filingDate ? 1 : -1));
        setFilings(rows);
      } catch (e: unknown) {
        if ((e as { name?: string }).name === 'AbortError') return;
        setError((e as Error)?.message ?? 'Request failed');
        setFilings([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    },
    [],
  );

  // No default ticker — the page opens on an empty state until the user picks
  // a company from search suggestions.

  // ---------------------------------------------------------------------------
  // Suggestions debounce
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    if (!query || query.length < 1) {
      setSuggestions([]);
      setOpenSuggest(false);
      return;
    }
    debRef.current = setTimeout(async () => {
      try {
        // /api/symbols/suggest matches by ticker prefix AND company name and is
        // live in production (the older /api/sec/tickers route 404s on prod).
        const data = await getJsonSmart(
          `/api/symbols/suggest?q=${encodeURIComponent(query)}`,
        );
        const items: Suggestion[] = Array.isArray(data?.items) ? data.items : [];
        setSuggestions(items);
        setOpenSuggest(items.length > 0);
      } catch {
        setSuggestions([]);
        setOpenSuggest(false);
      }
    }, 160);
    return () => {
      if (debRef.current) clearTimeout(debRef.current);
    };
  }, [query]);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const filtered = filings.filter(
    (f) => activeTab === 'all' || baseForm(f.form) === activeTab,
  );
  const sorted =
    sort === 'latest'
      ? filtered
      : [...filtered].sort((a, b) => (a.filingDate > b.filingDate ? 1 : -1));
  const visible = sorted.slice(0, shown);
  const hasMore = sorted.length > shown;

  const latest = filings[0];
  const latestFilingLabel = latest
    ? (() => {
        const m = reportMeta(latest.form, latest.reportDate);
        return `${latest.form} ${m.period.replace('Fiscal Year', 'FY')}`;
      })()
    : '—';
  const latestFilingDate = latest?.filingDate;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="animate-fade-in space-y-ds-5 pt-ds-4">
      {/* ------------------------------------------------------------------ */}
      {/* A. Header row — title centered; collapsible "Fino Explains" panel    */}
      {/*    pinned to the right at the same height as the title (lg+).        */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative">
        <div className="text-center">
          <h1 className="text-[28px] md:text-[30px] font-bold tracking-tight text-ink-primary">
            Company Research Center
          </h1>
        </div>

        {!ticker && (
          <aside className="mt-ds-4 lg:absolute lg:right-0 lg:top-0 lg:z-10 lg:mt-0 lg:w-[340px]">
            <details className="group rounded-[12px] border border-gold-border bg-surface-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-ds-4 py-ds-2 [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/fino-avatar.png"
                    alt="Fino"
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-gold-border"
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gold-primary">
                    Fino Explains
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  className="text-gold-primary transition-transform duration-200 group-open:rotate-180"
                />
              </summary>

              <div className="flex flex-col gap-ds-3 px-ds-4 pb-ds-4">
                <p className="text-[15px] font-semibold leading-tight text-ink-primary">
                  What is the Company Research Center?
                </p>
                <p className="text-[13px] leading-relaxed text-ink-secondary">
                  Here you can search any ticker you want and pull every quarterly (10-Q)
                  and annual (10-K) report for U.S. stocks — sourced straight from official
                  SEC filings. Just type a company name, ticker, or CIK above to get started.
                </p>
              </div>
            </details>
          </aside>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* B. Search bar                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative w-full max-w-[560px] mx-auto mt-ds-5">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-secondary pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const first = suggestions[0];
              if (first) {
                setQuery(first.symbol);
                setOpenSuggest(false);
                load(first.symbol, first.name);
              } else if (query.trim()) {
                setOpenSuggest(false);
                load(query.trim());
              }
            }
            if (e.key === 'Escape') setOpenSuggest(false);
          }}
          onFocus={() => suggestions.length > 0 && setOpenSuggest(true)}
          onBlur={() => setTimeout(() => setOpenSuggest(false), 150)}
          placeholder="Search Company, Ticker or CIK..."
          className="h-12 w-full rounded-[12px] border border-border-ds-subtle bg-surface-1 pl-11 pr-4 text-[14px] text-ink-primary placeholder:text-ink-secondary outline-none focus:border-gold-border transition-colors"
        />

        {openSuggest && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-[12px] border border-border-ds-subtle bg-surface-1 shadow-xl overflow-hidden">
            {suggestions.slice(0, 8).map((s) => (
              <button
                key={s.symbol}
                onMouseDown={() => {
                  setQuery(s.symbol);
                  setOpenSuggest(false);
                  load(s.symbol, s.name);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors"
              >
                <StockLogo ticker={s.symbol} size={24} />
                <span className="font-semibold text-[13px] text-ink-primary">{s.symbol}</span>
                <span className="text-[12px] text-ink-secondary truncate">{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!ticker ? (
        /* Empty state — no company selected yet */
        <div className="flex flex-col items-center justify-center py-ds-9 text-center">
          <FileText size={34} className="mb-ds-3 text-ink-secondary/40" />
          <p className="text-[15px] font-medium text-ink-primary">Search for a company</p>
          <p className="mt-1.5 max-w-[340px] text-[13px] text-ink-secondary">
            Find quarterly and annual reports by company name, ticker, or CIK.
          </p>
        </div>
      ) : (
        <>
      {/* ------------------------------------------------------------------ */}
      {/* C. Tab bar (centered)                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-ds-5 border-b border-border-ds-subtle">
        <div className="flex justify-center gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setShown(12);
              }}
              className="relative flex flex-col items-start pb-3 pt-1"
            >
              <span
                className={`text-[13px] font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-ink-primary'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {tab.label}
              </span>
              {tab.sub && (
                <span className="text-[10px] text-ink-secondary mt-0.5">{tab.sub}</span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-gold-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Two-column body: results (left) + AI rail (right)                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex gap-ds-5">
        {/* Left column */}
        <div className="flex-1 min-w-0">
          {/* E. Toolbar */}
          <div className="flex items-center justify-between mb-ds-4">
            <p className="text-[13px] text-ink-secondary">
              Showing results for{' '}
              <span className="text-ink-primary font-medium">"{ticker}"</span>
            </p>

            <div className="flex items-center gap-3">
              {/* View toggle */}
              <div className="inline-flex rounded-md border border-border-ds-subtle overflow-hidden">
                <button
                  onClick={() => setView('grid')}
                  className={`p-1.5 transition-colors ${
                    view === 'grid'
                      ? 'bg-white/[0.06] text-gold-primary'
                      : 'text-ink-secondary hover:text-ink-primary'
                  }`}
                  aria-label="Grid view"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`p-1.5 transition-colors ${
                    view === 'list'
                      ? 'bg-white/[0.06] text-gold-primary'
                      : 'text-ink-secondary hover:text-ink-primary'
                  }`}
                  aria-label="List view"
                >
                  <List size={16} />
                </button>
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <button
                  onClick={() => setSortOpen((o) => !o)}
                  className="flex items-center gap-1.5 rounded-md border border-border-ds-subtle px-2.5 py-1.5 text-[12px] text-ink-secondary hover:text-ink-primary transition-colors"
                >
                  Sort by:{' '}
                  <span className="text-ink-primary">
                    {sort === 'latest' ? 'Latest' : 'Oldest'}
                  </span>
                  <ChevronDown size={14} />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-1 z-20 rounded-[8px] border border-border-ds-subtle bg-surface-1 shadow-xl overflow-hidden min-w-[110px]">
                    {(['latest', 'oldest'] as SortMode[]).map((s) => (
                      <button
                        key={s}
                        onMouseDown={() => {
                          setSort(s);
                          setSortOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-[12px] hover:bg-white/[0.04] transition-colors capitalize ${
                          sort === s ? 'text-gold-primary' : 'text-ink-primary'
                        }`}
                      >
                        {s === 'latest' ? 'Latest' : 'Oldest'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* F. Results */}
          {loading ? (
            <SectionSpinner />
          ) : error ? (
            <p className="text-num-negative text-sm">{error}</p>
          ) : visible.length === 0 ? (
            <p className="text-ink-secondary text-sm text-center py-12">
              No filings found for this ticker.
            </p>
          ) : (
            <div
              className={
                view === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-ds-4'
                  : 'flex flex-col gap-ds-3'
              }
            >
              {visible.map((f, i) => (
                <ReportCard
                  key={`${f.accessionNumber}-${i}`}
                  filing={f}
                  ticker={ticker}
                  companyName={companyName}
                  view={view}
                />
              ))}
            </div>
          )}

          {/* G. View More */}
          {hasMore && !loading && (
            <div className="mt-ds-5 flex justify-center">
              <Button
                variant="outline"
                size="default"
                showArrow={false}
                onClick={() => setShown((s) => s + 12)}
              >
                View More Results
                <ChevronDown size={16} />
              </Button>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Right rail — AI Report Summary                                    */}
        {/* ---------------------------------------------------------------- */}
        <div className="hidden xl:block w-[320px] shrink-0">
          <div className="sticky top-4 self-start rounded-[12px] border border-gold-border bg-surface-1 p-ds-5 flex flex-col gap-ds-4">
            {/* Header */}
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-gold-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gold-primary">
                AI Report Summary
              </span>
            </div>

            {/* Company row */}
            <div className="flex items-center gap-2.5">
              <StockLogo ticker={ticker} size={36} />
              <div>
                <p className="text-[14px] font-semibold text-ink-primary leading-tight">
                  {companyName}
                </p>
                <p className="text-[12px] text-ink-secondary">{ticker}</p>
              </div>
            </div>

            {/* Last filing row (real data) — clicking opens the Stock Analyzer
                Earnings tab, which auto-analyzes the latest report. */}
            {latest ? (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/app/ai/stock-analyzer?symbol=${encodeURIComponent(ticker)}&tab=earnings`,
                  )
                }
                title="Analyze the latest filing in Stock Analyzer"
                className="group -mx-1 flex w-full items-center justify-between rounded-md px-1 py-0.5 text-left transition-colors hover:bg-white/[0.03]"
              >
                <span className="text-[12px] text-ink-secondary">Last Filing</span>
                <div className="flex items-center gap-1.5">
                  <div className="text-right">
                    <p className="text-[13px] font-medium text-ink-primary transition-colors group-hover:text-gold-primary">
                      {latestFilingLabel}
                    </p>
                    <p className="text-[11px] text-ink-secondary">{fmtDate(latestFilingDate)}</p>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-ink-secondary transition-all group-hover:translate-x-0.5 group-hover:text-gold-primary"
                  />
                </div>
              </button>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink-secondary">Last Filing</span>
                <div className="text-right">
                  <p className="text-[13px] font-medium text-ink-primary">{latestFilingLabel}</p>
                  <p className="text-[11px] text-ink-secondary">{fmtDate(latestFilingDate)}</p>
                </div>
              </div>
            )}

            <div className="h-px bg-border-ds-subtle" />

            {/* PLACEHOLDER metrics — wire to real AI summary endpoint later */}
            <div className="flex flex-col gap-2.5">
              {/* Revenue */}
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink-secondary">Revenue (YoY)</span>
                {/* ONE-TIME GREEN EXCEPTION: approved by Elad 2026-06-07 for this AI panel only.
                    FINOTAUR DS normally forbids green — do NOT copy this pattern elsewhere. */}
                <div className="flex items-center gap-1 font-mono tabular-nums text-[13px] font-semibold text-emerald-400">
                  <ChevronUp size={13} />
                  +18.2%
                </div>
              </div>
              {/* EPS */}
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink-secondary">EPS (YoY)</span>
                <div className="flex items-center gap-1 font-mono tabular-nums text-[13px] font-semibold text-emerald-400">
                  <ChevronUp size={13} />
                  +24.1%
                </div>
              </div>
              {/* Net Income */}
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink-secondary">Net Income (YoY)</span>
                <div className="flex items-center gap-1 font-mono tabular-nums text-[13px] font-semibold text-emerald-400">
                  <ChevronUp size={13} />
                  +21.3%
                </div>
              </div>
            </div>

            <div className="h-px bg-border-ds-subtle" />

            {/* Guidance + Risk */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink-secondary">Guidance</span>
                {/* Same approved green exception */}
                <span className="text-[13px] font-medium text-emerald-400">Positive</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink-secondary">Risk Level</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium text-ink-primary">Medium</span>
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                </div>
              </div>
            </div>

            {/* Ask Fino button */}
            <Button
              variant="gold"
              size="default"
              className="w-full"
              showArrow={false}
              onClick={() =>
                openFino({
                  path: location.pathname,
                  label: 'Ask Fino',
                  query: `Summarize the latest ${ticker} SEC filings and what they mean.`,
                })
              }
            >
              <Sparkles size={14} />
              Ask Fino about {ticker}
            </Button>

            {/* Disclaimer */}
            <p className="text-[10px] text-ink-secondary text-center leading-relaxed">
              AI summary is for informational purposes only and not financial advice.
            </p>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

export default CompanyResearchCenter;
