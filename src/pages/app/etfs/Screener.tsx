// src/pages/app/etfs/Screener.tsx
// =====================================================
// ETF SECTION — Screener
// =====================================================
// Route: /app/etfs/screener
// Active filters: text search, Exchange dropdown.
// Disabled/coming-soon filters: Sector, Country,
//   Expense Ratio, AUM — shown disabled with tooltip.
// =====================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Filter } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { fetchETFList } from '@/services/etf-analyzer.api';
import type { EtfListItem } from '@/types/etf.types';
import { EtfTable } from './EtfTable';

const PAGE_SIZE = 50;
const DEBOUNCE_MS = 350;

// Tooltip wrapper for disabled filter controls
function ComingSoonBadge() {
  return (
    <span className="ml-ds-2 rounded-[4px] bg-surface-3 border border-border-ds-subtle px-1.5 py-0.5 text-[10px] font-medium text-ink-tertiary tracking-wide">
      Coming soon
    </span>
  );
}

interface DisabledFieldProps {
  label: string;
  placeholder: string;
  type?: 'input' | 'select';
}

function DisabledField({ label, placeholder, type = 'input' }: DisabledFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center text-[11px] font-medium uppercase tracking-wider text-ink-tertiary">
        {label}
        <ComingSoonBadge />
      </label>
      {type === 'select' ? (
        <select
          disabled
          className="rounded-[8px] border border-border-ds-subtle bg-surface-1 py-ds-3 px-ds-3 text-sm text-ink-muted opacity-50 cursor-not-allowed"
          title="Available soon — pending data source"
        >
          <option>{placeholder}</option>
        </select>
      ) : (
        <input
          type="text"
          disabled
          placeholder={placeholder}
          className="rounded-[8px] border border-border-ds-subtle bg-surface-1 py-ds-3 px-ds-3 text-sm text-ink-muted opacity-50 cursor-not-allowed"
          title="Available soon — pending data source"
        />
      )}
    </div>
  );
}

export default function ETFScreener() {
  const [query, setQuery]               = useState('');
  const [exchange, setExchange]         = useState('');
  const [exchanges, setExchanges]       = useState<string[]>([]);
  const [etfs, setEtfs]                 = useState<EtfListItem[]>([]);
  const [total, setTotal]               = useState(0);
  const [nextCursor, setNextCursor]     = useState<number | null>(null);
  const [loading, setLoading]           = useState(false);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (search: string, cursor?: number) => {
    const isAppend = cursor !== undefined;
    if (isAppend) setLoadingMore(true);
    else { setLoading(true); setEtfs([]); }
    setError(null);

    try {
      const result = await fetchETFList({ search, limit: PAGE_SIZE, cursor });
      const allEtfs = isAppend ? [] : result.etfs; // We'll filter below
      const fetched = result.etfs;

      // Derive available exchanges from results (first page only)
      if (!isAppend) {
        const exSet = new Set<string>();
        fetched.forEach((e) => { if (e.primaryExchange) exSet.add(e.primaryExchange); });
        setExchanges(Array.from(exSet).sort());
      }

      setEtfs((prev) => (isAppend ? [...prev, ...fetched] : fetched));
      setTotal(result.total);
      setNextCursor(result.nextCursor);
      void allEtfs; // suppress unused var
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ETF list.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    load('');
  }, [load]);

  function handleSearch(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(value), DEBOUNCE_MS);
  }

  function handleExchangeChange(value: string) {
    setExchange(value);
    // Exchange filter is client-side on loaded data (server doesn't accept exchange param yet)
  }

  function handleLoadMore() {
    if (nextCursor === null) return;
    load(query, nextCursor);
  }

  // Client-side exchange filter applied on top of server search results
  const filtered = exchange
    ? etfs.filter((e) => e.primaryExchange === exchange)
    : etfs;

  return (
    <div className="mx-auto max-w-[960px] py-ds-7 px-ds-4 flex flex-col gap-ds-5">
      {/* Header */}
      <div className="space-y-ds-1">
        <span className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
          ETF Research
        </span>
        <h1 className="text-h2 font-medium text-ink-primary">ETF Screener</h1>
        <p className="text-body text-ink-secondary">
          Filter ETFs by exchange and name. Additional filters coming soon.
        </p>
      </div>

      {/* Filter panel */}
      <Card padding="default">
        <div className="flex items-center gap-ds-2 mb-ds-4">
          <Filter className="h-4 w-4 text-ink-tertiary" aria-hidden="true" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-ink-tertiary">Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-ds-4">
          {/* Active: text search */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-ink-tertiary">
              Ticker / Name
            </label>
            <div className="relative">
              <Search
                className="absolute left-ds-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-tertiary pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="e.g. SPY, Vanguard…"
                className="w-full rounded-[8px] border border-border-ds-subtle bg-surface-1 py-ds-3 pl-10 pr-ds-4 text-sm text-ink-primary placeholder:text-ink-muted transition-colors focus:border-border-ds-default focus:outline-none"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Active: Exchange dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-ink-tertiary">
              Exchange
            </label>
            <select
              value={exchange}
              onChange={(e) => handleExchangeChange(e.target.value)}
              className="rounded-[8px] border border-border-ds-subtle bg-surface-1 py-ds-3 px-ds-3 text-sm text-ink-primary transition-colors focus:border-border-ds-default focus:outline-none"
            >
              <option value="">All Exchanges</option>
              {exchanges.map((ex) => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>

          {/* Disabled: Sector */}
          <DisabledField label="Sector" placeholder="All Sectors" type="select" />

          {/* Disabled: Country */}
          <DisabledField label="Country" placeholder="All Countries" type="select" />

          {/* Disabled: Expense Ratio */}
          <DisabledField label="Max Expense Ratio (%)" placeholder="e.g. 0.50" />

          {/* Disabled: AUM */}
          <DisabledField label="Min AUM ($)" placeholder="e.g. 1,000,000" />
        </div>
      </Card>

      {/* Results */}
      <Card padding="default">
        {error ? (
          <p className="text-sm text-[#E24B4A] py-4">{error}</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-ds-3">
              <span className="text-[11px] text-ink-tertiary uppercase tracking-wider">
                {loading
                  ? 'Loading…'
                  : exchange
                    ? `${filtered.length.toLocaleString()} ETFs (filtered by exchange)`
                    : `${total.toLocaleString()} ETFs`}
              </span>
            </div>

            <EtfTable etfs={filtered} loading={loading} />

            {nextCursor !== null && !exchange && (
              <div className="mt-ds-4 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-[8px] border border-border-ds-subtle bg-surface-2 px-ds-5 py-ds-2 text-sm text-ink-secondary transition-colors hover:border-border-ds-default hover:text-ink-primary disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
