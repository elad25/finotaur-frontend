// src/components/GlobalOmnibox.tsx
// =====================================================
// GLOBAL COMMAND OMNIBOX — Phase 3
// A smart search/command bar for the TopNav.
// =====================================================
// Features:
//  - ⌘K / Ctrl+K to focus/open
//  - Esc closes and blurs
//  - ↑/↓ to navigate, Enter to run
//  - Intent routing: ticker → Stock Analyzer, question → Fino, topic → nav
//  - Empty state: hint + example chips + optional recently viewed
//  - Mobile: collapses to icon that opens full-width overlay
//  - SSR-safe: all window/document/localStorage access gated
// =====================================================

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, X, TrendingUp, ArrowRight, Command } from 'lucide-react';
import { classifyIntent, matchRoutes, type RouteTarget } from '@/lib/omniboxIntent';
import { useFinoChat } from '@/contexts/FinoChatContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OmniboxResult {
  id: string;
  icon: React.ReactNode;
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
// ResultItem
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
// ResultGroup — renders a named group only when it has items
// ---------------------------------------------------------------------------

interface GroupEntry {
  groupLabel: string;
  results: OmniboxResult[];
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function GlobalOmnibox() {
  const navigate = useNavigate();
  const location = useLocation();
  const { open: openFino } = useFinoChat();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // Build result list from current query
  // -------------------------------------------------------------------------

  const buildResults = useCallback(
    (input: string): OmniboxResult[] => {
      const trimmed = input.trim();
      const intent = classifyIntent(trimmed);

      const results: OmniboxResult[] = [];

      if (!trimmed) {
        // Empty state: recently viewed tickers
        const recent = getRecentlyViewed();
        recent.forEach((r) => {
          results.push({
            id: `recent-${r.symbol}`,
            icon: <TrendingUp className="h-4 w-4" />,
            primary: `Analyze ${r.symbol}`,
            secondary: 'Recently viewed',
            action: () => {
              saveRecentTicker(r.symbol);
              navigate(`/app/ai/stock-analyzer?symbol=${r.symbol}`);
              close_();
            },
          });
        });
        return results;
      }

      if (intent === 'ticker') {
        const sym = trimmed.toUpperCase();

        // Primary: analyze
        results.push({
          id: 'ticker-analyze',
          icon: <TrendingUp className="h-4 w-4" />,
          primary: `Analyze ${sym}`,
          secondary: 'Open in AI Stock Analyzer',
          action: () => {
            saveRecentTicker(sym);
            navigate(`/app/ai/stock-analyzer?symbol=${sym}`);
            close_();
          },
        });

        // Secondary: Ask Fino about it
        results.push({
          id: 'ticker-fino',
          icon: <img src="/fino-avatar.png" alt="" className="h-4 w-4 rounded-full object-cover" />,
          primary: `Ask Fino about ${sym}`,
          secondary: 'Open AI chat',
          action: () => {
            openFino({ path: location.pathname, ticker: sym, label: 'Ask Fino', query: `Tell me about ${sym}` });
            close_();
          },
        });
      } else if (intent === 'question') {
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

        // Also offer alphabetic ticker analysis if looks like a symbol embedded
        const words = trimmed.split(/\s+/);
        const possibleTicker = words.find((w) => /^[A-Z]{1,5}$/.test(w));
        if (possibleTicker) {
          results.push({
            id: 'question-ticker',
            icon: <TrendingUp className="h-4 w-4" />,
            primary: `Analyze ${possibleTicker}`,
            secondary: 'Open in AI Stock Analyzer',
            action: () => {
              saveRecentTicker(possibleTicker);
              navigate(`/app/ai/stock-analyzer?symbol=${possibleTicker}`);
              close_();
            },
          });
        }
      } else {
        // Topic: navigate to matched routes, grouped
        const matched = matchRoutes(trimmed);
        if (matched.length > 0) {
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

        // Always offer Ask Fino as a fallback for topics
        results.push({
          id: 'topic-fino',
          icon: <img src="/fino-avatar.png" alt="" className="h-4 w-4 rounded-full object-cover" />,
          primary: `Ask Fino about "${trimmed.length > 40 ? trimmed.slice(0, 40) + '…' : trimmed}"`,
          secondary: 'Open AI chat',
          action: () => {
            openFino({ path: location.pathname, label: 'Ask Fino', query: trimmed });
            close_();
          },
        });

        // If the input is purely alphabetic, also offer direct ticker analysis
        if (/^[A-Za-z]+$/.test(trimmed)) {
          const sym = trimmed.toUpperCase();
          results.push({
            id: 'topic-ticker',
            icon: <TrendingUp className="h-4 w-4" />,
            primary: `Analyze ${sym} as a ticker`,
            secondary: 'Open in AI Stock Analyzer',
            action: () => {
              saveRecentTicker(sym);
              navigate(`/app/ai/stock-analyzer?symbol=${sym}`);
              close_();
            },
          });
        }
      }

      return results;
    },
    [navigate, location.pathname, openFino],
  );

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const results = buildResults(query);

  // Group results for rendering (secondary acts as group name for route results)
  const groupedSections = (() => {
    // For non-topic intents there's only one logical group; we skip headers.
    const intent = classifyIntent(query.trim());
    if (intent !== 'topic' || !query.trim()) return null;

    const groups: Record<string, OmniboxResult[]> = {};
    results.forEach((r) => {
      const g = r.secondary || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(r);
    });
    return Object.entries(groups).map(([groupLabel, items]): GroupEntry => ({ groupLabel, results: items }));
  })();

  // Flat list of all results in render order (for keyboard nav)
  const flatResults = groupedSections
    ? groupedSections.flatMap((g) => g.results)
    : results;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function close_() {
    setIsOpen(false);
    setQuery('');
    setHighlightIndex(0);
    inputRef.current?.blur();
  }

  function openOmnibox() {
    setIsOpen(true);
    // Defer focus so the input is rendered/visible first
    setTimeout(() => inputRef.current?.focus(), 0);
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

  // Close on outside click
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close_();
      }
    };

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
      setHighlightIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = flatResults[highlightIndex] ?? flatResults[0];
      target?.action();
    }
  };

  // Reset highlight when results change
  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  // -------------------------------------------------------------------------
  // Empty-state example chips
  // -------------------------------------------------------------------------

  const EXAMPLE_CHIPS = ['NVDA', 'TSLA', 'AAPL', 'SPY'];

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  // Running index for keyboard highlight tracking across groups
  let runningIdx = 0;

  function renderResults() {
    if (!query.trim()) {
      // Empty state
      const recent = getRecentlyViewed();
      return (
        <div className="p-3 space-y-3">
          <p className="text-xs text-[#555] leading-relaxed px-1">
            Type a ticker (e.g. NVDA) to analyze with AI, or ask Fino a question
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_CHIPS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => {
                  setQuery(sym);
                  // immediately run
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
              {recent.map((r, i) => {
                const idx = i;
                return (
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
                    highlighted={highlightIndex === idx}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onClick={() => {
                      saveRecentTicker(r.symbol);
                      navigate(`/app/ai/stock-analyzer?symbol=${r.symbol}`);
                      close_();
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (flatResults.length === 0) {
      return (
        <div className="p-4 text-center text-xs text-[#555]">
          No results for "{query}"
        </div>
      );
    }

    if (groupedSections) {
      // Grouped rendering (topic intent)
      return (
        <div className="p-2">
          {groupedSections.map((group) => (
            <div key={group.groupLabel}>
              <GroupHeader label={group.groupLabel} />
              {group.results.map((r) => {
                const idx = runningIdx++;
                return (
                  <ResultItem
                    key={r.id}
                    result={r}
                    highlighted={highlightIndex === idx}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onClick={r.action}
                  />
                );
              })}
            </div>
          ))}
        </div>
      );
    }

    // Flat rendering (ticker / question intent)
    return (
      <div className="p-2">
        {flatResults.map((r, idx) => (
          <ResultItem
            key={r.id}
            result={r}
            highlighted={highlightIndex === idx}
            onMouseEnter={() => setHighlightIndex(idx)}
            onClick={r.action}
          />
        ))}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      {/*
        ── Desktop: luxurious centered command bar ─────────────────────────
        Width is fixed via the parent wrapper in TopNav (max-w-xl/2xl).
        We fill that wrapper 100% so the bar spans it edge-to-edge.
        The JS-animated width has been removed; CSS handles all transitions.
      */}
      <div
        ref={containerRef}
        className="relative hidden md:block w-full"
      >
        {/* ── Input trigger ── */}
        <div
          className="omnibox-trigger relative flex items-center w-full rounded-xl transition-all duration-200"
          style={{
            height: 42,
            background: '#111111',
            border: isOpen
              ? '1px solid rgba(201,166,70,0.40)'
              : '1px solid rgba(201,166,70,0.18)',
            boxShadow: isOpen
              ? '0 0 0 3px rgba(201,166,70,0.08), 0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,166,70,0.04)'
              : '0 0 0 1px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)',
          }}
          onMouseEnter={(e) => {
            if (!isOpen) {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(201,166,70,0.30)';
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 0 0 1px rgba(0,0,0,0.3), 0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.02)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isOpen) {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(201,166,70,0.18)';
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 0 0 1px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)';
            }
          }}
        >
          {/* Search icon — muted gold */}
          <Search
            className="absolute left-3.5 h-4 w-4 flex-shrink-0 pointer-events-none"
            style={{ color: isOpen ? 'rgba(201,166,70,0.7)' : 'rgba(201,166,70,0.40)' }}
          />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search ticker, company, or ask Fino…"
            className="w-full bg-transparent pl-10 pr-20 text-sm text-[#E8E8E8] outline-none"
            style={{
              caretColor: '#C9A646',
            }}
            // placeholder color applied via global CSS in index.css / globals.css;
            // inline fallback via the class below
            autoComplete="off"
            spellCheck={false}
          />

          {/* Right side: clear button OR ⌘K kbd chip */}
          <div className="absolute right-3 flex items-center">
            {query ? (
              <button
                type="button"
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className="flex items-center justify-center h-5 w-5 rounded transition-colors"
                style={{ color: 'rgba(160,160,160,0.6)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#F4F4F4'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(160,160,160,0.6)'; }}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              /* ⌘K pill — tasteful bordered kbd chip */
              <span
                className="flex items-center gap-0.5 select-none"
                style={{
                  padding: '2px 6px',
                  borderRadius: 5,
                  border: '1px solid rgba(201,166,70,0.20)',
                  background: 'rgba(201,166,70,0.05)',
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
            )}
          </div>
        </div>

        {/* ── Dropdown / results panel ── */}
        {isOpen && (
          <div
            className="absolute left-0 right-0 top-full mt-2 rounded-xl z-[200]"
            style={{
              background: '#0D0D0D',
              border: '1px solid rgba(201,166,70,0.18)',
              boxShadow:
                '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,166,70,0.04), inset 0 1px 0 rgba(201,166,70,0.03)',
              maxHeight: 420,
              overflowY: 'auto',
            }}
          >
            {renderResults()}
          </div>
        )}
      </div>

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
            style={{ background: '#0A0A0A', maxHeight: '85vh', marginTop: 0 }}
          >
            {/* Mobile input bar */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ borderColor: 'rgba(201,166,70,0.12)' }}
            >
              <Search className="h-4 w-4 text-[#555] flex-shrink-0" />
              <input
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
              {renderResults()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default GlobalOmnibox;
