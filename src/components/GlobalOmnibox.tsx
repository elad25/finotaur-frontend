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
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, X, TrendingUp, ArrowRight, Command, Globe } from 'lucide-react';
import { classifyIntent, matchRoutes, type RouteTarget } from '@/lib/omniboxIntent';
import { useFinoChat } from '@/contexts/FinoChatContext';
import { useSymbolSuggest, type SuggestItem } from '@/components/Search/useSymbolSuggest';
import { classifyEquity } from '@/lib/symbolCategories';
import { searchCrypto, CRYPTO_COINS } from '@/data/cryptoCoins';
import { searchForex, FOREX_PAIRS } from '@/data/forexPairs';
import { searchIndices, INDICES } from '@/data/indices';
import { searchBonds, TREASURY_YIELDS } from '@/data/treasuryYields';
import { POPULAR_STOCKS, POPULAR_ETFS } from '@/data/popularSymbols';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AssetTab =
  | 'All'
  | 'Stocks'
  | 'Funds'
  | 'Futures'
  | 'Forex'
  | 'Crypto'
  | 'Indices'
  | 'Bonds'
  | 'Economy'
  | 'Options';

const ASSET_TABS: AssetTab[] = [
  'All',
  'Stocks',
  'Funds',
  'Futures',
  'Forex',
  'Crypto',
  'Indices',
  'Bonds',
  'Economy',
  'Options',
];

// Map tab → assetType values that match it
const TAB_FILTER: Record<AssetTab, SuggestItem['assetType'][]> = {
  All:     [],
  Stocks:  ['stock'],
  Funds:   ['etf'],          // Funds = ETFs (+ mutual funds when available)
  Futures: ['futures'],
  Forex:   ['fx'],
  Crypto:  ['crypto'],
  Indices: ['index'],
  Bonds:   ['bond'],
  Economy: ['unknown'],      // no dedicated assetType yet; renders empty gracefully
  Options: ['unknown'],      // no dedicated assetType yet; renders empty gracefully
};

interface OmniboxResult {
  id: string;
  icon: ReactNode;
  primary: string;
  secondary?: string;
  action: () => void;
}

// SuggestItem extended with an optional CoinGecko id for crypto routing.
type EnrichedItem = SuggestItem & { coinId?: string };

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
  coinId?: string,
): string {
  if (assetType === 'etf') return `/app/etfs/${sym}/overview`;
  if (assetType === 'crypto') return coinId ? `/app/crypto/coin/${coinId}` : '/app/crypto/overview';
  if (assetType === 'fx') return `/app/forex/pair/${sym}`;
  if (assetType === 'futures') return '/app/futures/overview';
  if (assetType === 'bond') return '/app/macro/rates';
  // stock / index / unknown / undefined → Stock Analyzer
  return `/app/ai/stock-analyzer?symbol=${sym}`;
}

// ---------------------------------------------------------------------------
// Asset-type styles — used by both the monogram icon and the right-side label
// ---------------------------------------------------------------------------

const ASSET_STYLES: Record<string, { circle: string; text: string; label: string }> = {
  etf:     { circle: '#1E6A9E', text: '#38BDF8', label: 'ETF' },
  stock:   { circle: '#7A5C1A', text: '#C9A646', label: 'Stock' },
  crypto:  { circle: '#5B2A8A', text: '#A855F7', label: 'Crypto' },
  fx:      { circle: '#1A6B50', text: '#34D399', label: 'FX' },
  futures: { circle: '#7A3D0E', text: '#FB923C', label: 'Futures' },
  index:   { circle: '#2E3A4A', text: '#94A3B8', label: 'Index' },
  bond:    { circle: '#1A3A2A', text: '#4ADE80', label: 'Bond' },
  unknown: { circle: '#2A2A2A', text: '#666',    label: 'Asset' },
};

// ---------------------------------------------------------------------------
// Monogram avatar — round colored circle with 1-2 letter ticker initials
// ---------------------------------------------------------------------------

function MonogramIcon({ symbol, assetType }: { symbol: string; assetType?: SuggestItem['assetType'] }) {
  const key = assetType ?? 'unknown';
  const style = ASSET_STYLES[key] ?? ASSET_STYLES.unknown;
  // Show first 2 chars of symbol, uppercase
  const initials = symbol.slice(0, 2).toUpperCase();
  return (
    <span
      className="flex-shrink-0 flex items-center justify-center rounded-full text-[10px] font-bold text-white leading-none"
      style={{ width: 28, height: 28, background: style.circle, letterSpacing: '0.02em' }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Rich suggest row — TradingView style:
//   [monogram] | [bold SYMBOL / muted name] | [type label · exchange · globe]
// ---------------------------------------------------------------------------

interface SuggestRowProps {
  item: EnrichedItem;
  highlighted: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}

function SuggestRow({ item, highlighted, onMouseEnter, onClick }: SuggestRowProps) {
  const key = item.assetType ?? 'unknown';
  const assetStyle = ASSET_STYLES[key] ?? ASSET_STYLES.unknown;

  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${
        highlighted
          ? 'bg-[#C9A646]/10 text-[#F4F4F4]'
          : 'text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-[#F4F4F4]'
      }`}
    >
      {/* Leading round monogram */}
      <MonogramIcon symbol={item.symbol} assetType={item.assetType} />

      {/* Middle: bold symbol + muted name */}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-[#F0F0F0] tracking-wide leading-snug">
          {item.symbol}
        </span>
        {item.name && (
          <span className="block text-xs text-[#666] truncate leading-tight">{item.name}</span>
        )}
      </span>

      {/* Right: muted type label + exchange code + small globe icon */}
      <span className="flex-shrink-0 flex flex-col items-end gap-0.5">
        <span
          className="text-[10px] font-semibold uppercase"
          style={{ color: assetStyle.text, letterSpacing: '0.04em' }}
        >
          {assetStyle.label}
        </span>
        {item.exchange && (
          <span className="flex items-center gap-1">
            <span className="text-[10px] text-[#4A4A4A] uppercase">{item.exchange}</span>
            <Globe className="h-2.5 w-2.5 text-[#3A3A3A]" />
          </span>
        )}
      </span>
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
      className="flex items-center gap-1 px-3 pt-2 pb-2 overflow-x-auto scrollbar-hide border-b"
      style={{ borderColor: 'rgba(201,166,70,0.10)' }}
    >
      {ASSET_TABS.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className="flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap"
            style={
              isActive
                ? {
                    background: '#C9A646',
                    color: '#0D0D0D',
                    border: '1px solid #C9A646',
                    boxShadow: '0 0 8px rgba(201,166,70,0.25)',
                  }
                : {
                    background: 'transparent',
                    color: '#555',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }
            }
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color = '#A0A0A0';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,166,70,0.25)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color = '#555';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
              }
            }}
          >
            {tab}
          </button>
        );
      })}
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
  // Enrich suggestions: re-classify equities (ETF detection) + inject crypto
  // -------------------------------------------------------------------------

  const enrichedSuggestions: EnrichedItem[] = useMemo(() => {
    // Re-classify equities: backend hardcodes 'stock'; tag known ETFs as 'etf'.
    const equities: EnrichedItem[] = suggestState.data.map((it) => ({
      ...it,
      assetType: classifyEquity(it.symbol),
    }));
    // Inject crypto matches from the bundled static list (backend returns none).
    const cryptos: EnrichedItem[] = debouncedQuery.trim()
      ? searchCrypto(debouncedQuery, 6).map((c) => ({
          symbol: c.symbol,
          name: c.name,
          assetType: 'crypto' as const,
          coinId: c.coinId,
        }))
      : [];
    // Inject forex matches from the bundled static list.
    const fx: EnrichedItem[] = debouncedQuery.trim()
      ? searchForex(debouncedQuery, 6).map((p) => ({
          symbol: p.symbol,
          name: p.name,
          assetType: 'fx' as const,
        }))
      : [];
    // Inject indices matches from the bundled static list.
    const idx: EnrichedItem[] = debouncedQuery.trim()
      ? searchIndices(debouncedQuery, 6).map((i) => ({
          symbol: i.symbol,
          name: i.name,
          assetType: 'index' as const,
        }))
      : [];
    // Inject bond matches from the bundled static list.
    const bonds: EnrichedItem[] = debouncedQuery.trim()
      ? searchBonds(debouncedQuery, 6).map((b) => ({
          symbol: b.symbol,
          name: b.name,
          assetType: 'bond' as const,
        }))
      : [];
    // De-dupe: if a symbol already appears among equities, keep the equity entry.
    const equitySymbols = new Set(equities.map((e) => e.symbol.toUpperCase()));
    const dedupedCryptos = cryptos.filter(
      (c) => !equitySymbols.has(c.symbol.toUpperCase()),
    );
    const dedupedFx = fx.filter((f) => !equitySymbols.has(f.symbol.toUpperCase()));
    const dedupedIdx = idx.filter((i) => !equitySymbols.has(i.symbol.toUpperCase()));
    const dedupedBonds = bonds.filter((b) => !equitySymbols.has(b.symbol.toUpperCase()));
    return [...equities, ...dedupedCryptos, ...dedupedFx, ...dedupedIdx, ...dedupedBonds];
  }, [suggestState.data, debouncedQuery]);

  // -------------------------------------------------------------------------
  // Filter enriched suggestions by active tab
  // -------------------------------------------------------------------------

  const filteredSuggestions: EnrichedItem[] = (() => {
    if (!debouncedQuery.trim()) return [];
    const filters = TAB_FILTER[activeTab];
    if (filters.length === 0) return enrichedSuggestions; // All tab
    return enrichedSuggestions.filter((item) =>
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
    | { kind: 'suggest'; data: EnrichedItem };

  const flatItems: FlatItem[] = (() => {
    if (!query.trim()) {
      // Empty state: keyboard-nav over popular items (or recently-viewed for All tab)
      if (activeTab === 'All') {
        // Include recently-viewed entries so ↑/↓/Enter work on them
        const recent = getRecentlyViewed();
        return recent.map((r) => ({
          kind: 'result' as const,
          data: {
            id: `recent-${r.symbol}`,
            icon: <TrendingUp className="h-4 w-4" />,
            primary: `Analyze ${r.symbol}`,
            action: () => {
              saveRecentTicker(r.symbol);
              navigate(`/app/ai/stock-analyzer?symbol=${r.symbol}`);
              close_();
            },
          },
        }));
      }
      // Non-All tab: popular items for keyboard nav
      return popularForTab(activeTab).map((s) => ({ kind: 'suggest' as const, data: s }));
    }

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
      navigate(routeForSuggest(sym, item.data.assetType, item.data.coinId));
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
  // Popular items per tab — shown in the empty state when a non-All tab is active
  // -------------------------------------------------------------------------

  function popularForTab(tab: AssetTab): EnrichedItem[] {
    switch (tab) {
      case 'Stocks':
        return POPULAR_STOCKS.map((e) => ({
          symbol: e.symbol,
          name: e.name,
          assetType: 'stock' as const,
        }));
      case 'Funds':
        return POPULAR_ETFS.map((e) => ({
          symbol: e.symbol,
          name: e.name,
          assetType: 'etf' as const,
        }));
      case 'Crypto':
        return CRYPTO_COINS.slice(0, 8).map((c) => ({
          symbol: c.symbol,
          name: c.name,
          assetType: 'crypto' as const,
          coinId: c.coinId,
        }));
      case 'Forex':
        return FOREX_PAIRS.slice(0, 8).map((p) => ({
          symbol: p.symbol,
          name: p.name,
          assetType: 'fx' as const,
        }));
      case 'Indices':
        return INDICES.slice(0, 8).map((i) => ({
          symbol: i.symbol,
          name: i.name,
          assetType: 'index' as const,
        }));
      case 'Bonds':
        return TREASURY_YIELDS.map((b) => ({
          symbol: b.symbol,
          name: b.name,
          assetType: 'bond' as const,
        }));
      default:
        // All, Futures, Economy, Options — no curated popular list
        return [];
    }
  }

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
    const isEmptyQuery = !query.trim();

    // TabBar is always rendered (both empty and has-query states)
    const tabBar = <TabBar activeTab={activeTab} onChange={setActiveTab} />;

    if (isEmptyQuery) {
      // Empty state — show TabBar + content that depends on the active tab
      if (activeTab === 'All') {
        const recent = getRecentlyViewed();
        return (
          <>
            {tabBar}
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
          </>
        );
      }

      // Non-All tab in empty state — show popular list for this category
      const popular = popularForTab(activeTab);
      return (
        <>
          {tabBar}
          <div className="p-2">
            {popular.length > 0 ? (
              <>
                <GroupHeader label={`Popular ${activeTab}`} />
                {popular.map((item, idx) =>
                  renderItemAt({ kind: 'suggest', data: item }, idx),
                )}
              </>
            ) : (
              <div className="py-6 text-center text-xs text-[#555]">
                No symbols available in {activeTab} yet
              </div>
            )}
          </div>
        </>
      );
    }

    // Has query — show tabs + results
    const showLoadingDots =
      suggestState.status === 'loading' && filteredSuggestions.length === 0;

    return (
      <>
        {tabBar}

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
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            paddingTop: '13vh',
          }}
          aria-modal="true"
          role="dialog"
          aria-label="Symbol search"
        >
          {/* Modal panel */}
          <div
            ref={modalPanelRef}
            className="flex flex-col rounded-xl overflow-hidden"
            style={{
              width: 'min(860px, 94vw)',
              maxHeight: '78vh',
              background: '#0D0D0D',
              border: '1px solid rgba(201,166,70,0.22)',
              boxShadow:
                '0 32px 80px rgba(0,0,0,0.80), 0 0 0 1px rgba(201,166,70,0.06), inset 0 1px 0 rgba(201,166,70,0.04)',
            }}
          >
            {/* ── Modal header: title + big input + clear + close ── */}
            <div
              className="flex flex-col border-b"
              style={{ borderColor: 'rgba(201,166,70,0.12)' }}
            >
              {/* Title row */}
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(201,166,70,0.55)', letterSpacing: '0.1em' }}>
                  Symbol search
                </span>
                <button
                  type="button"
                  onClick={close_}
                  className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-md transition-colors"
                  style={{ color: 'rgba(160,160,160,0.45)', background: 'rgba(255,255,255,0.04)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = '#F4F4F4';
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(160,160,160,0.45)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                  }}
                  aria-label="Close search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Input row */}
              <div className="flex items-center gap-3 px-4 pb-3">
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
              </div>
            </div>

            {/* ── Modal results (scrollable) ── */}
            <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(78vh - 56px - 36px)' }}>
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
          style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
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
