// src/pages/app/etfs/Directory.tsx
// =====================================================
// ETF SECTION — Directory
// =====================================================
// Route: /app/etfs/directory
// Searchable, paginated table of ETFs from fetchETFList.
// =====================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { fetchETFList } from '@/services/etf-analyzer.api';
import type { EtfListItem } from '@/types/etf.types';
import { EtfTable } from './EtfTable';

const PAGE_SIZE = 50;
const DEBOUNCE_MS = 350;

export default function ETFDirectory() {
  const [query, setQuery]           = useState('');
  const [etfs, setEtfs]             = useState<EtfListItem[]>([]);
  const [total, setTotal]           = useState(0);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading]       = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (search: string, cursor?: number) => {
    const isAppend = cursor !== undefined;
    if (isAppend) setLoadingMore(true);
    else { setLoading(true); setEtfs([]); }
    setError(null);

    try {
      const result = await fetchETFList({ search, limit: PAGE_SIZE, cursor });
      setEtfs((prev) => (isAppend ? [...prev, ...result.etfs] : result.etfs));
      setTotal(result.total);
      setNextCursor(result.nextCursor);
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

  // Debounced search
  function handleSearch(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(value), DEBOUNCE_MS);
  }

  function handleLoadMore() {
    if (nextCursor === null) return;
    load(query, nextCursor);
  }

  return (
    <div className="mx-auto max-w-[900px] py-ds-7 px-ds-4 flex flex-col gap-ds-5">
      {/* Header */}
      <div className="space-y-ds-1">
        <span className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted">
          ETF Research
        </span>
        <h1 className="text-h2 font-medium text-ink-primary">ETF Directory</h1>
        <p className="text-body text-ink-secondary">
          Browse all listed ETFs. Click any row to open its full analysis.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-ds-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-tertiary pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search ticker or name…"
          className="w-full rounded-[8px] border border-border-ds-subtle bg-surface-1 py-ds-3 pl-10 pr-ds-4 text-sm text-ink-primary placeholder:text-ink-muted transition-colors focus:border-border-ds-default focus:outline-none"
          spellCheck={false}
        />
      </div>

      {/* Results */}
      <Card padding="default">
        {error ? (
          <p className="text-sm text-[#E24B4A] py-4">{error}</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-ds-3">
              <span className="text-[11px] text-ink-tertiary uppercase tracking-wider">
                {loading ? 'Loading…' : `${total.toLocaleString()} ETFs`}
              </span>
            </div>

            <EtfTable etfs={etfs} loading={loading} />

            {nextCursor !== null && (
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
