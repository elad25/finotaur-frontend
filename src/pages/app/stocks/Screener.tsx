// ============================================================
// src/pages/app/stocks/Screener.tsx
// Stock Screener — top-level page with Stocks/Crypto toggle
// ============================================================

import { useState, useCallback } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { GlassCard, GlassTabs } from '@/pages/app/crypto/_shared/GlassUI';
import { useScreenerMeta, useStockScreener } from './_screener/hooks';
import { FilterPanel } from './_screener/FilterPanel';
import { ResultsTable } from './_screener/ResultsTable';
import { PRESETS } from './_screener/filters';
import type { Filters, SortState } from './_screener/types';
import { EMPTY_FILTERS } from './_screener/types';

// Crypto screener is rendered when the Crypto tab is active
import CryptoScreener from '../crypto/Screener';

const ASSET_TABS = [
  { id: 'stocks', label: '📈 Stocks' },
  { id: 'crypto', label: '🪙 Crypto' },
];

const DEFAULT_SORT: SortState = { sort: 'market_cap', dir: 'desc' };
const DEFAULT_LIMIT = 50;

// ── Stocks screener inner ─────────────────────────────────────
function StocksScreenerInner() {
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [activePreset, setActivePreset] = useState<string>('');

  const { data: meta } = useScreenerMeta();
  const { data, loading, error } = useStockScreener(filters, sort, page, DEFAULT_LIMIT);

  const handleFiltersChange = useCallback((next: Filters) => {
    setFilters(next);
    setPage(1);
    setActivePreset('');
  }, []);

  const handlePresetSelect = useCallback((id: string) => {
    if (!id) {
      setFilters({ ...EMPTY_FILTERS });
      setActivePreset('');
      setPage(1);
      return;
    }
    const preset = PRESETS.find(p => p.id === id);
    if (!preset) return;

    setFilters({ ...EMPTY_FILTERS, ...preset.filters });
    setActivePreset(id);
    setPage(1);
  }, []);

  const handleSort = useCallback((next: SortState) => {
    setSort(next);
    setPage(1);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <p className="text-[10px] text-white/20 font-mono">
          Data may be delayed · Powered by Polygon.io
        </p>
      </div>
      <GlassCard padding="sm">
        <FilterPanel
          filters={filters}
          activePreset={activePreset}
          meta={{
            sectors: meta?.sectors ?? [],
            exchanges: meta?.exchanges ?? [],
          }}
          onFiltersChange={handleFiltersChange}
          onPresetSelect={handlePresetSelect}
        />
      </GlassCard>

      <GlassCard padding="sm">
        <ResultsTable
          rows={data?.items ?? []}
          total={data?.total ?? 0}
          page={page}
          limit={DEFAULT_LIMIT}
          sort={sort}
          loading={loading}
          error={error}
          onSort={handleSort}
          onPage={setPage}
        />
      </GlassCard>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
// The asset toggle sits above the page chrome so each tab can render its own
// PageTemplate header (Stocks → "Screener", Crypto → the crypto scanner's own
// header) without nesting two headers.
export default function StocksScreener() {
  const [assetTab, setAssetTab] = useState<'stocks' | 'crypto'>('stocks');

  const selector = (
    <div className="px-4 pt-4 sm:px-6">
      <GlassTabs
        tabs={ASSET_TABS}
        active={assetTab}
        onChange={id => setAssetTab(id as 'stocks' | 'crypto')}
      />
    </div>
  );

  // Crypto tab → render the existing crypto screener standalone (it brings its
  // own PageTemplate + CoinGecko attribution; no Polygon credit here).
  if (assetTab === 'crypto') {
    return (
      <div>
        {selector}
        <CryptoScreener />
      </div>
    );
  }

  return (
    <div>
      {selector}
      <PageTemplate
        title="Screener"
        description="Filter and discover opportunities across US equities."
      >
        <StocksScreenerInner />
      </PageTemplate>
    </div>
  );
}
