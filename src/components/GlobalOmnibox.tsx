// src/components/GlobalOmnibox.tsx
// =====================================================
// GLOBAL COMMAND OMNIBOX — Phase 4 (Koyfin-style)
// Desktop: prominent trigger bar → centered modal overlay
// Mobile:  icon → full-screen overlay
// =====================================================
// Features:
//  - ⌘K / Ctrl+K to focus/open
//  - Esc closes and blurs
//  - ↑/↓ to navigate, Enter to run
//  - Live suggestions via useSymbolSuggest (debounced 150ms)
//  - Asset-class tabs: All / Equities / ETFs / Mutual Funds /
//    Indices / Forex / Crypto / Futures
//  - Rich rows: flag + ticker + exchange/name + type badge
//  - ETF → /app/etfs/:sym/overview, else → Stock Analyzer
//  - Question intent → Ask Fino (top + bottom fallback)
//  - Empty state: example chips + recently-viewed
//  - Mobile: collapses to icon that opens full-width overlay
//  - SSR-safe: all window/document/localStorage access gated
// =====================================================

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, X, TrendingUp, ArrowRight, Command } from 'lucide-react';
import { classifyIntent, matchRoutes, type RouteTarget } from '@/lib/omniboxIntent';
import { useFinoChat } from '@/contexts/FinoChatContext';
import { useSymbolSuggest, type SuggestItem } from '@/components/Search/useSymbolSuggest';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AssetTab =
  | 'All'
  | 'Equities'
  | 'ETFs'
  | 'Mutual Funds'
  | 'Indices'
  | 'Forex'
  | 'Crypto'
  | 'Futures';

const ASSET_TABS: AssetTab[] = [
  'All',
  'Equities',
  'ETFs',
  'Mutual Funds',
  'Indices',
  'Forex',
  'Crypto',
  'Futures',
];

// Map tab → assetType values that match it
const TAB_FILTER: Record<AssetTab, SuggestItem['assetType'][]> = {
  All:           [],
  Equities:      ['stock'],
  ETFs:          ['etf'],
  'Mutual Funds':['unknown'], // no dedicated assetType yet; show nothing gracefully
  Indices:       ['index'],
  Forex:         ['fx'],
  Crypto:        ['crypto'],
  Futures:       ['futures'],
};

interface OmniboxResult {
  id: string;
  icon: ReactNode;
  primary: string;
  secondary?: string;
  action: () => void;
}

// ---------------------------------------------------------------------------
// SSR-safe localStorage helpers
// ---------------------------------------------------------------------------

const RECENTLY_VIEWED_KEY = 'fino_omnibox_recent';
const MAX_RECENT = 5;

function getRecentlyViewed(): Array<{ symbol: string; label: string }> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    return raw ? (JSON.parse(raw) as Array<{ symbol: string; label: string }>) : [];
  } catch {
    return [];
  }
}

function saveRecentTicker(symbol: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getRecentlyViewed().filter((r) => r.symbol !== symbol);
    const updated = [{ symbol, label: symbol }, ...existing].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Routing helper — returns the correct path for a suggest result
// ---------------------------------------------------------------------------

function routeForSuggest(
  sym: string,
  assetType: SuggestItem['assetType'],
): string {
  if (assetType === 'etf') return `/app/etfs/${sym}/overview`;
  if (assetType === 'crypto') return '/app/crypto/overview';
  if (assetType === 'fx') return '/app/forex/overview';
  if (assetType === 'futures') return '/app/futures/overview';
  // stock / index / unknown / undefined → Stock Analyzer
  return `/app/ai/stock-analyzer?symbol=${sym}`;
}

// ---------------------------------------------------------------------------
// Asset-type badge chip
// ---------------------------------------------------------------------------

const BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  etf:     { bg: 'rgba(56,189,248,0.12)', text: '#38BDF8', label: 'ETF' },
  stock:   { bg: 'rgba(201,166,70,0.10)', text: '#C9A646', label: 'Equity' },
  crypto:  { bg: 'rgba(168,85,247,0.12)', text: '#A855F7', label: 'Crypto' },
  fx:      { bg: 'rgba(52,211,153,0.12)', text: '#34D399', label: 'FX' },
  futures: { bg: 'rgba(251,146,60,0.12)', text: '#FB923C', label: 'Futures' },
  index:   { bg: 'rgba(148,163,184,0.12)', text: '#94A3B8', label: 'Index' },
  unknown: { bg: 'rgba(100,100,100,0.10)', text: '#666', label: 'Asset' },
};

function TypeBadge({ assetType }: { assetType?: SuggestItem['assetType'] }) {
  const key = assetType ?? 'unknown';
  const style = BADGE_STYLES[key] ?? BADGE_STYLES.unknown;
  return (
    <span
      className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: style.bg, color: style.text, letterSpacing: '0.04em' }}
    >
      {style.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Exchange flag
// ---------------------------------------------------------------------------

function ExchangeFlag({ exchange }: { exchange?: string }) {
  if (!exchange) return null;
  const upper = exchange.toUpperCase();
  if (upper === 'US' || upper === 'NYSE' || upper === 'NASDAQ' || upper === 'AMEX') {
    return <span className="flex-shrink-0 text-base leading-none" aria-label="US market">🇺🇸</span>;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Rich suggest row
// ---------------------------------------------------------------------------

interface SuggestRowProps {
  item: SuggestItem;
  highlighted: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}

function SuggestRow({ item, highlighted, onMouseEnter, onClick }: SuggestRowProps) {
  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-md transition-colors ${
        highlighted
          ? 'bg-[#C9A646]/10 text-[#F4F4F4]'
          : 'text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-[#F4F4F4]'
      }`}
    >
      <ExchangeFlag exchange={item.exchange} />
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-[#F0F0F0] tracking-wide">{item.symbol}</span>
          {item.exchange && (
            <span className="text-[10px] text-[#555] font-normal uppercase">{item.exchange}</span>
          )}
        </span>
        {item.name && (
          <span className="block text-xs text-[#666] truncate leading-tight">{item.name}</span>
        )}
      </span>
      <TypeBadge assetType={item.assetType} />
      {highlighted && <ArrowRight className="flex-shrink-0 h-3.5 w-3.5 text-[#C9A646]/60 ml-1" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Generic ResultItem (for Ask-Fino + route results + recently-viewed)
// ---------------------------------------------------------------------------

interface ResultItemProps {
  result: OmniboxResult;
  highlighted: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}

function ResultItem({ result, highlighted, onMouseEnter, onClick }: ResultItemProps) {
  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-md transition-colors ${
        highlighted
          ? 'bg-[#C9A646]/10 text-[#F4F4F4]'
          : 'text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-[#F4F4F4]'
      }`}
    >
      <span className={`flex-shrink-0 ${highlighted ? 'text-[#C9A646]' : 'text-[#555]'}`}>
        {result.icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium truncate">{result.primary}</span>
        {result.secondary && (
          <span className="block text-xs text-[#666] truncate">{result.secondary}</span>
        )}
      </span>
      {highlighted && <ArrowRight className="flex-shrink-0 h-3.5 w-3.5 text-[#C9A646]/60" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// GroupHeader
// ---------------------------------------------------------------------------

function GroupHeader({ label }: { label: string }) {
  return (
    <div className="px-3 pt-3 pb-1">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-[#555]">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asset-class tab bar
// ---------------------------------------------------------------------------

interface TabBarProps {
  activeTab: AssetTab;
  onChange: (tab: AssetTab) => void;
}

function TabBar({ activeTab, onChange }: TabBarProps) {
  return (
    <div
      className="flex items-center gap-0.5 px-2 pt-2 pb-1 overflow-x-auto scrollbar-hide border-b"
      style={{ borderColor: 'rgba(201,166,70,0.10)' }}
    >
      {ASSET_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className="flex-shrink-0 px-2.5 py-1 rounded text-xs font-medium transition-all"
          style={
            activeTab === tab
              ? {
                  background: 'rgba(201,166,70,0.15)',
                  color: '#C9A646',
                  border: '1px solid rgba(201,166,70,0.30)',
                }
              : {
                  background: 'transparent',
                  color: '#666',
                  border: '1px solid transparent',
                }
          }
          onMouseEnter={(e) => {
            if (activeTab !== tab) {
              (e.currentTarget as HTMLButtonElement).style.color = '#A0A0A0';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== tab) {
              (e.currentTarget as HTMLButtonElement).style.color = '#666';
            }
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function GlobalOmnibox() {
  const navigate = useNavigate();
  const location = useLocation();
  const { open: openFino } = useFinoChat();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<AssetTab>('All');

  // Modal input ref (desktop modal) and mobile input ref
  const modalInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  // Modal panel ref for click-outside detection
  const modalPanelRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // Debounce query → debouncedQuery (150ms)
  // -------------------------------------------------------------------------

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  // -------------------------------------------------------------------------
  // Live suggestions from API
  // -------------------------------------------------------------------------

  const suggestState = useSymbolSuggest(debouncedQuery);

  // -------------------------------------------------------------------------
  // Filter suggestions by active tab
  // -------------------------------------------------------------------------

  const filteredSuggestions: SuggestItem[] = (() => {
    if (!debouncedQuery.trim()) return [];
    const filters = TAB_FILTER[activeTab];
    if (filters.length === 0) return suggestState.data; // All tab
    return suggestState.data.filter((item) =>
      filters.includes(item.assetType ?? 'unknown'),
    );
  })();

  // -------------------------------------------------------------------------
  // Intent classification (for question handling + fallback results)
  // -------------------------------------------------------------------------

  const intent = classifyIntent(query.trim());
  const isQuestion = intent === 'question';

  // -------------------------------------------------------------------------
  // Build non-suggest results (Ask-Fino + route matches)
  // -------------------------------------------------------------------------

  const buildAuxResults = useCallback(
    (input: string): OmniboxResult[] => {
      const trimmed = input.trim();
      if (!trimmed) return [];

      const results: OmniboxResult[] = [];
      const currentIntent = classifyIntent(trimmed);

      if (currentIntent === 'question') {
        // Ask Fino top result
        results.push({
          id: 'question-fino',
          icon: <img src="/fino-avatar.png" alt="" className="h-4 w-4 rounded-full object-cover" />,
          primary: `Ask Fino: "${trimmed.length > 60 ? trimmed.slice(0, 60) + '…' : trimmed}"`,
          secondary: 'Open AI chat',
          action: () => {
            openFino({ path: location.pathname, label: 'Ask Fino', query: trimmed });
            close_();
          },
        });
        return results;
      }

      if (currentIntent === 'topic') {
        const matched = matchRoutes(trimmed);
        matched.forEach((r: RouteTarget) => {
          results.push({
            id: `route-${r.path}`,
            icon: <ArrowRight className="h-4 w-4" />,
            primary: r.label,
            secondary: r.group,
            action: () => {
              navigate(r.path);
              close_();
            },
          });
        });
      }

      return results;
    },
    [navigate, location.pathname, openFino],
  );

  // Ask-Fino fallback row (always at the bottom when there is a query)
  const finoFallbackRow: OmniboxResult | null = query.trim()
    ? {
        id: 'fino-fallback',
        icon: (
          <img src="/fino-avatar.png" alt="" className="h-4 w-4 rounded-full object-cover" />
        ),
        primary: `Ask Fino about "${query.trim().length > 40 ? query.trim().slice(0, 40) + '…' : query.trim()}"`,
        secondary: 'Open AI chat',
        action: () => {
          openFino({ path: location.pathname, label: 'Ask Fino', query: query.trim() });
          close_();
        },
      }
    : null;

  const auxResults = buildAuxResults(query);

  // -------------------------------------------------------------------------
  // Flat list of all items in render order (for keyboard nav)
  //   - If question: [fino-top, ...filteredSuggestions, fino-fallback]
  //   - Else: [...auxResults, ...filteredSuggestions, fino-fallback]
  // -------------------------------------------------------------------------

  type FlatItem =
    | { kind: 'result'; data: OmniboxResult }
    | { kind: 'suggest'; data: SuggestItem };

  const flatItems: FlatItem[] = (() => {
    if (!query.trim()) return [];

    const items: FlatItem[] = [];

    if (isQuestion) {
      // Ask-Fino top
      if (auxResults[0]) items.push({ kind: 'result', data: auxResults[0] });
    } else {
      // Route matches at top
      auxResults.forEach((r) => items.push({ kind: 'result', data: r }));
    }

    // Live suggestions (filtered by tab)
    filteredSuggestions.forEach((s) => items.push({ kind: 'suggest', data: s }));

    // Ask-Fino fallback at bottom
    if (finoFallbackRow && !isQuestion) {
      items.push({ kind: 'result', data: finoFallbackRow });
    }

    return items;
  })();

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function close_() {
    setIsOpen(false);
    setQuery('');
    setDebouncedQuery('');
    setHighlightIndex(0);
    setActiveTab('All');
  }

  function openOmnibox() {
    setIsOpen(true);
    // Auto-focus the appropriate input after the overlay renders
    setTimeout(() => {
      modalInputRef.current?.focus();
      mobileInputRef.current?.focus();
    }, 0);
  }

  function runItem(item: FlatItem) {
    if (item.kind === 'result') {
      item.data.action();
    } else {
      const sym = item.data.symbol;
      saveRecentTicker(sym);
      navigate(routeForSuggest(sym, item.data.assetType));
      close_();
    }
  }

  // -------------------------------------------------------------------------
  // Global keyboard shortcut: ⌘K / Ctrl+K
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          close_();
        } else {
          openOmnibox();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Close modal on click outside the panel (desktop)
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const handler = (e: MouseEvent) => {
      if (modalPanelRef.current && !modalPanelRef.current.contains(e.target as Node)) {
        close_();
      }
    };

    // Use capture so we intercept before any inner handlers
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // -------------------------------------------------------------------------
  // Input keyboard nav
  // -------------------------------------------------------------------------

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      close_();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = flatItems[highlightIndex] ?? flatItems[0];
      if (target) runItem(target);
    }
  };

  // Reset highlight when query / tab changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [query, activeTab]);

  // Reset tab when query clears
  useEffect(() => {
    if (!query.trim()) setActiveTab('All');
  }, [query]);

  // -------------------------------------------------------------------------
  // Example chips
  // -------------------------------------------------------------------------

  const EXAMPLE_CHIPS = ['NVDA', 'TSLA', 'AAPL', 'SPY'];

  // -------------------------------------------------------------------------
  // Render helpers — shared between desktop modal and mobile overlay
  // -------------------------------------------------------------------------

  function renderItemAt(item: FlatItem, idx: number) {
    if (item.kind === 'result') {
      return (
        <ResultItem
          key={item.data.id}
          result={item.data}
          highlighted={highlightIndex === idx}
          onMouseEnter={() => setHighlightIndex(idx)}
          onClick={item.data.action}
        />
      );
    }
    // suggest
    return (
      <SuggestRow
        key={item.data.symbol}
        item={item.data}
        highlighted={highlightIndex === idx}
        onMouseEnter={() => setHighlightIndex(idx)}
        onClick={() => runItem(item)}
      />
    );
  }

  function renderModalBody() {
    if (!query.trim()) {
      // Empty state
      const recent = getRecentlyViewed();
      return (
        <div className="p-3 space-y-3">
          <p className="text-xs text-[#555] leading-relaxed px-1">
            Type a ticker (e.g. NVDA) to search, or ask Fino a question
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_CHIPS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => {
                  setQuery(sym);
                  saveRecentTicker(sym);
                  navigate(`/app/ai/stock-analyzer?symbol=${sym}`);
                  close_();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                style={{
                  background: 'rgba(201,166,70,0.06)',
                  borderColor: 'rgba(201,166,70,0.2)',
                  color: '#C9A646',
                }}
              >
                <TrendingUp className="h-3 w-3" />
                {sym}
              </button>
            ))}
          </div>
          {recent.length > 0 && (
            <div>
              <GroupHeader label="Recently viewed" />
              {recent.map((r, i) => (
                <ResultItem
                  key={r.symbol}
                  result={{
                    id: `recent-${r.symbol}`,
                    icon: <TrendingUp className="h-4 w-4" />,
                    primary: `Analyze ${r.symbol}`,
                    action: () => {
                      saveRecentTicker(r.symbol);
                      navigate(`/app/ai/stock-analyzer?symbol=${r.symbol}`);
                      close_();
                    },
                  }}
                  highlighted={highlightIndex === i}
                  onMouseEnter={() => setHighlightIndex(i)}
                  onClick={() => {
                    saveRecentTicker(r.symbol);
                    navigate(`/app/ai/stock-analyzer?symbol=${r.symbol}`);
                    close_();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // Has query — show tabs + results
    const showLoadingDots =
      suggestState.status === 'loading' && filteredSuggestions.length === 0;

    return (
      <>
        <TabBar activeTab={activeTab} onChange={setActiveTab} />

        <div className="p-2">
          {flatItems.length === 0 && !showLoadingDots && (
            <div className="py-6 text-center text-xs text-[#555]">
              {activeTab === 'All'
                ? `No results for "${query}"`
                : `No matches in ${activeTab}`}
            </div>
          )}

          {showLoadingDots && (
            <div className="py-4 text-center text-xs text-[#444]">Searching…</div>
          )}

          {flatItems.map((item, idx) => renderItemAt(item, idx))}
        </div>
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      {/*
        ── Desktop: trigger bar (button) ───────────────────────────────────
        Clicking/focusing this opens the centered modal overlay.
        The bar itself is NOT an input — it's a styled button trigger.
      */}
      <div className="relative hidden md:block w-full">
        <button
          type="button"
          onClick={openOmnibox}
          aria-label="Open search"
          aria-haspopup="dialog"
          className="omnibox-trigger relative flex items-center w-full rounded-xl transition-all duration-200 text-left"
          style={{
            height: 48,
            background: '#111111',
            border: isOpen
              ? '1px solid rgba(201,166,70,0.55)'
              : '1px solid rgba(201,166,70,0.24)',
            boxShadow: isOpen
              ? '0 0 0 3px rgba(201,166,70,0.10), 0 2px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,166,70,0.06)'
              : '0 0 0 1px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)',
          }}
          onMouseEnter={(e) => {
            if (!isOpen) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,166,70,0.38)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 0 0 1px rgba(0,0,0,0.3), 0 2px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.02)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isOpen) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,166,70,0.24)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 0 0 1px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)';
            }
          }}
        >
          {/* Search icon — muted gold */}
          <Search
            className="absolute left-3.5 flex-shrink-0 pointer-events-none"
            style={{
              width: 18,
              height: 18,
              color: 'rgba(201,166,70,0.45)',
            }}
          />

          {/* Placeholder text */}
          <span
            className="pl-11 pr-20 text-[15px] select-none"
            style={{ color: 'rgba(160,160,160,0.55)' }}
          >
            Search ticker, company, or ask Fino…
          </span>

          {/* ⌘K kbd chip */}
          <div className="absolute right-3 flex items-center">
            <span
              className="flex items-center gap-0.5 select-none"
              style={{
                padding: '2px 6px',
                borderRadius: 5,
                border: '1px solid rgba(201,166,70,0.22)',
                background: 'rgba(201,166,70,0.06)',
                color: 'rgba(201,166,70,0.50)',
                fontSize: 10,
                fontFamily: 'ui-monospace, monospace',
                letterSpacing: '0.03em',
                lineHeight: 1,
              }}
            >
              <Command className="h-2.5 w-2.5" />
              K
            </span>
          </div>
        </button>
      </div>

      {/*
        ── Desktop: centered modal overlay ─────────────────────────────────
        Fixed backdrop + centered panel. Command-palette style.
      */}
      {isOpen && (
        <div
          className="hidden md:flex fixed inset-0 z-[300] items-start justify-center"
          style={{ background: 'rgba(0,0,0,0.60)', paddingTop: '13vh' }}
          aria-modal="true"
          role="dialog"
          aria-label="Search"
        >
          {/* Modal panel */}
          <div
            ref={modalPanelRef}
            className="flex flex-col rounded-xl overflow-hidden"
            style={{
              width: 'min(720px, 92vw)',
              maxHeight: '72vh',
              background: '#0D0D0D',
              border: '1px solid rgba(201,166,70,0.22)',
              boxShadow:
                '0 32px 80px rgba(0,0,0,0.80), 0 0 0 1px rgba(201,166,70,0.06), inset 0 1px 0 rgba(201,166,70,0.04)',
            }}
          >
            {/* ── Modal header: big input + close button ── */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ borderColor: 'rgba(201,166,70,0.12)' }}
            >
              <Search
                className="flex-shrink-0"
                style={{ width: 20, height: 20, color: 'rgba(201,166,70,0.65)' }}
              />
              <input
                ref={modalInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search ticker, company, or ask Fino…"
                className="flex-1 bg-transparent text-[16px] text-[#E8E8E8] placeholder:text-[#444] outline-none"
                style={{ caretColor: '#C9A646' }}
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); modalInputRef.current?.focus(); }}
                  className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded transition-colors"
                  style={{ color: 'rgba(160,160,160,0.5)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#F4F4F4'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(160,160,160,0.5)'; }}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={close_}
                className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-md transition-colors ml-1"
                style={{ color: 'rgba(160,160,160,0.5)', background: 'rgba(255,255,255,0.04)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = '#F4F4F4';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(160,160,160,0.5)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                }}
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── Modal results (scrollable) ── */}
            <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(72vh - 56px - 36px)' }}>
              {renderModalBody()}
            </div>

            {/* ── Modal footer: keyboard hint ── */}
            <div
              className="flex items-center justify-center gap-4 px-4 py-2 border-t"
              style={{ borderColor: 'rgba(201,166,70,0.08)', background: 'rgba(0,0,0,0.3)' }}
            >
              <span className="text-[11px]" style={{ color: 'rgba(100,100,100,0.9)' }}>
                <kbd
                  className="font-mono"
                  style={{
                    padding: '1px 4px',
                    borderRadius: 3,
                    border: '1px solid rgba(100,100,100,0.3)',
                    background: 'rgba(255,255,255,0.04)',
                    fontSize: 10,
                  }}
                >↑↓</kbd>
                {' '}navigate
              </span>
              <span className="text-[11px]" style={{ color: 'rgba(100,100,100,0.9)' }}>
                <kbd
                  className="font-mono"
                  style={{
                    padding: '1px 5px',
                    borderRadius: 3,
                    border: '1px solid rgba(100,100,100,0.3)',
                    background: 'rgba(255,255,255,0.04)',
                    fontSize: 10,
                  }}
                >↵</kbd>
                {' '}open
              </span>
              <span className="text-[11px]" style={{ color: 'rgba(100,100,100,0.9)' }}>
                <kbd
                  className="font-mono"
                  style={{
                    padding: '1px 5px',
                    borderRadius: 3,
                    border: '1px solid rgba(100,100,100,0.3)',
                    background: 'rgba(255,255,255,0.04)',
                    fontSize: 10,
                  }}
                >Esc</kbd>
                {' '}close
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile: icon button that opens full-width overlay ───────────── */}
      <button
        type="button"
        onClick={openOmnibox}
        className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg text-[#A0A0A0] hover:text-[#F4F4F4] hover:bg-[#1A1A1A] transition-colors"
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </button>

      {/* ── Mobile full-width overlay ────────────────────────────────────── */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-[300] flex flex-col"
          style={{ background: 'rgba(0,0,0,0.85)' }}
        >
          <div
            className="flex flex-col flex-1 overflow-hidden"
            style={{ background: '#0A0A0A', maxHeight: '90vh', marginTop: 0 }}
          >
            {/* Mobile input bar */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ borderColor: 'rgba(201,166,70,0.12)' }}
            >
              <Search className="h-4 w-4 text-[#555] flex-shrink-0" />
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search ticker, company or ask Fino..."
                className="flex-1 bg-transparent text-sm text-[#F4F4F4] placeholder:text-[#555] outline-none"
                autoComplete="off"
                spellCheck={false}
                autoFocus
              />
              <button
                type="button"
                onClick={close_}
                className="flex-shrink-0 text-[#555] hover:text-[#F4F4F4] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile results */}
            <div className="overflow-y-auto flex-1">
              {renderModalBody()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default GlobalOmnibox;
