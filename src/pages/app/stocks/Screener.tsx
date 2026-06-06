// ============================================================
// src/pages/app/stocks/Screener.tsx
// Stock Screener - top-level page with Stocks/Crypto toggle
// ============================================================

import { useCallback, useState } from 'react';
import { GlassCard } from '@/pages/app/crypto/_shared/GlassUI';
import { useScreenerMeta, useStockScreener } from './_screener/hooks';
import { FilterPanel } from './_screener/FilterPanel';
import { ResultsTable } from './_screener/ResultsTable';
import type { Filters, SortState } from './_screener/types';
import { EMPTY_FILTERS } from './_screener/types';

import CryptoScreener from '../crypto/Screener';

const DEFAULT_SORT: SortState = { sort: 'market_cap', dir: 'desc' };
const DEFAULT_LIMIT = 50;

function AssetSwitch({
  active,
  onChange,
}: {
  active: 'stocks' | 'crypto';
  onChange: (id: 'stocks' | 'crypto') => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
      {(['stocks', 'crypto'] as const).map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={[
            'min-w-24 rounded-[12px] px-4 py-2 text-xs font-semibold transition-all duration-150',
            active === tab
              ? 'border border-white/[0.12] bg-white/[0.08] text-white'
              : 'text-white/35 hover:text-white/70',
          ].join(' ')}
        >
          {tab === 'stocks' ? 'Stocks' : 'Crypto'}
        </button>
      ))}
    </div>
  );
}

function StocksScreenerInner({
  activeAsset,
  onAssetChange,
}: {
  activeAsset: 'stocks' | 'crypto';
  onAssetChange: (id: 'stocks' | 'crypto') => void;
}) {
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(1);

  const { data: meta } = useScreenerMeta();
  const { data, loading, error } = useStockScreener(filters, sort, page, DEFAULT_LIMIT);

  const handleFiltersChange = useCallback((next: Filters) => {
    setFilters(next);
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
          Data may be delayed - Powered by Polygon.io
        </p>
      </div>

      <GlassCard padding="sm">
        <FilterPanel
          filters={filters}
          meta={{
            sectors: meta?.sectors ?? [],
            exchanges: meta?.exchanges ?? [],
          }}
          onFiltersChange={handleFiltersChange}
          activeAsset={activeAsset}
          onAssetChange={onAssetChange}
          showAssetTabs={false}
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

export default function StocksScreener() {
  const [assetTab, setAssetTab] = useState<'stocks' | 'crypto'>('stocks');

  return (
    <div className="space-y-3 px-4 py-4 sm:px-6">
      <AssetSwitch active={assetTab} onChange={setAssetTab} />

      {assetTab === 'stocks' ? (
        <StocksScreenerInner
          activeAsset={assetTab}
          onAssetChange={id => setAssetTab(id)}
        />
      ) : (
        <CryptoScreener embedded />
      )}
    </div>
  );
}
