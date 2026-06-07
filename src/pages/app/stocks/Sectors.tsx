// src/pages/app/stocks/Sectors.tsx
// Market Sectors — factual data-only view. No AI text, no buy/sell signals.
// Two views: Table (default, sortable) + Heatmap (tiled by timeframe return).

import React, { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionSpinner } from '@/components/ds/Spinner';
import { useSectorsAll, type Sector, type SectorVsMarketEntry } from '@/hooks/stocks/useSectors';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Period = '1D' | '1W' | '1M' | 'YTD' | '1Y';

/** Extract the sectorReturn for a given period from vsMarket array. */
function perfFor(sector: Sector, period: Period): number | null {
  if (!sector.vsMarket) return null;
  const entry = sector.vsMarket.find((v: SectorVsMarketEntry) => v.period === period);
  return entry?.sectorReturn ?? null;
}

/** Format a percentage with U+2212 for negatives, or "—" if null. */
function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—';
  const sign = n >= 0 ? '+' : '−';
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

/** Format a price number. */
function fmtPrice(v: number | string | null | undefined): string {
  if (v == null) return '—';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '—';
  return `$${n.toFixed(2)}`;
}

/** Compact volume: e.g. 219800000 → "219.8M" */
function fmtVolume(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/** Background style for heatmap/cell tinting. null pct → transparent.
 *  Approved green-for-gains exception (Elad, 2026-06-07) — classic stock coloring. */
function heatColor(pct: number | null): React.CSSProperties {
  if (pct == null) return {};
  if (pct > 0) {
    const alpha = Math.min(0.06 + Math.abs(pct) / 40, 0.32);
    return { backgroundColor: `rgba(16,185,129,${alpha.toFixed(3)})` };
  }
  if (pct < 0) {
    const alpha = Math.min(0.06 + Math.abs(pct) / 40, 0.32);
    return { backgroundColor: `rgba(226,75,74,${alpha.toFixed(3)})` };
  }
  return {};
}

/** Tailwind color class for a number: positive → green, negative → red.
 *  Green is an approved exception for the Sectors pages only (classic stock coloring). */
function numColor(n: number | null | undefined): string {
  if (n == null) return 'text-ink-secondary';
  return n >= 0 ? 'text-emerald-400' : 'text-num-negative';
}

// ─── Leaders / Laggards strip ─────────────────────────────────────────────────

const LeadersStrip = memo(function LeadersStrip({ sectors }: { sectors: Sector[] }) {
  const sorted = [...sectors].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
  const top = sorted.slice(0, 3);
  const bottom = sorted.slice(-3).reverse();

  function Chip({ sector, isLeader }: { sector: Sector; isLeader: boolean }) {
    const pct = sector.changePercent;
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono tabular-nums border"
        style={isLeader
          ? { borderColor: 'rgba(16,185,129,0.35)', backgroundColor: 'rgba(16,185,129,0.08)' }
          : { borderColor: 'rgba(226,75,74,0.35)', backgroundColor: 'rgba(226,75,74,0.08)' }
        }
      >
        <span className="text-ink-secondary truncate max-w-[80px]">{sector.name}</span>
        <span className={numColor(pct)}>{fmtPct(pct)}</span>
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <span className="text-[10px] uppercase tracking-widest text-ink-secondary">Leaders</span>
      {top.map((s) => <Chip key={s.id} sector={s} isLeader />)}
      <span className="mx-1 text-ink-secondary opacity-30">|</span>
      <span className="text-[10px] uppercase tracking-widest text-ink-secondary">Laggards</span>
      {bottom.map((s) => <Chip key={s.id} sector={s} isLeader={false} />)}
    </div>
  );
});

// ─── Table view ───────────────────────────────────────────────────────────────

type SortKey = 'name' | 'price' | '1D' | '1W' | '1M' | 'YTD' | '1Y' | 'spWeight' | 'beta';
type SortDir = 'asc' | 'desc';

const PERIODS: Period[] = ['1D', '1W', '1M', 'YTD', '1Y'];

const COL_LABELS: Record<SortKey, string> = {
  name: 'Sector',
  price: 'Price',
  '1D': '1D%',
  '1W': '1W%',
  '1M': '1M%',
  YTD: 'YTD%',
  '1Y': '1Y%',
  spWeight: 'S&P Wt',
  beta: 'Beta',
};

function sectorSortValue(s: Sector, key: SortKey): number | string {
  if (key === 'name') return s.name;
  if (key === 'price') {
    const n = typeof s.price === 'string' ? parseFloat(s.price) : (s.price ?? 0);
    return isNaN(n as number) ? 0 : n;
  }
  if (key === 'spWeight') return s.spWeight ?? -Infinity;
  if (key === 'beta') return s.beta ?? -Infinity;
  // Period keys
  return perfFor(s, key as Period) ?? -Infinity;
}

const SectorsTable = memo(function SectorsTable({ sectors }: { sectors: Sector[] }) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('1D');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }, [sortKey]);

  const sorted = [...sectors].sort((a, b) => {
    const av = sectorSortValue(a, sortKey);
    const bv = sectorSortValue(b, sortKey);
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    const an = av as number;
    const bn = bv as number;
    return sortDir === 'asc' ? an - bn : bn - an;
  });

  function ThBtn({ k, label }: { k: SortKey; label: string }) {
    const active = sortKey === k;
    return (
      <th
        className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-ink-secondary cursor-pointer select-none whitespace-nowrap hover:text-gold-primary transition-colors"
        onClick={() => toggleSort(k)}
      >
        <span className={active ? 'text-gold-primary' : ''}>
          {label}
          {active && <span className="ml-0.5 opacity-70">{sortDir === 'desc' ? '↓' : '↑'}</span>}
        </span>
      </th>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[12px] border border-border-ds-subtle bg-surface-1">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-border-ds-subtle">
            <ThBtn k="name" label="Sector" />
            <ThBtn k="price" label="Price" />
            {PERIODS.map((p) => <ThBtn key={p} k={p} label={`${p}%`} />)}
            <ThBtn k="spWeight" label="S&P Wt" />
            <ThBtn k="beta" label="Beta" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((sector) => (
            <tr
              key={sector.id}
              onClick={() => navigate(`/app/stocks/sectors/${sector.id}`)}
              className="border-b border-border-ds-subtle last:border-0 cursor-pointer hover:bg-surface-base transition-colors group"
            >
              {/* Sector name + ticker */}
              <td className="px-3 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-ink-primary truncate group-hover:text-gold-primary transition-colors">
                    {sector.name}
                  </span>
                  <span className="flex-shrink-0 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-border-ds-subtle text-ink-secondary">
                    {sector.ticker}
                  </span>
                </div>
              </td>
              {/* Price */}
              <td className="px-3 py-3 font-mono tabular-nums text-ink-primary">
                {fmtPrice(sector.price)}
              </td>
              {/* Period % columns */}
              {PERIODS.map((p) => {
                const val = perfFor(sector, p);
                return (
                  <td
                    key={p}
                    className={`px-3 py-3 font-mono tabular-nums ${numColor(val)}`}
                    style={heatColor(val)}
                  >
                    {fmtPct(val)}
                  </td>
                );
              })}
              {/* S&P Weight */}
              <td className="px-3 py-3 font-mono tabular-nums text-ink-secondary">
                {sector.spWeight != null ? `${sector.spWeight.toFixed(1)}%` : '—'}
              </td>
              {/* Beta */}
              <td className="px-3 py-3 font-mono tabular-nums text-ink-secondary">
                {sector.beta != null ? sector.beta.toFixed(2) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

// ─── Heatmap view ─────────────────────────────────────────────────────────────

const SectorsHeatmap = memo(function SectorsHeatmap({ sectors }: { sectors: Sector[] }) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('1D');

  return (
    <div>
      {/* Timeframe selector */}
      <div className="flex items-center gap-2 mb-4">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
              period === p
                ? 'bg-gold-primary/15 text-gold-primary border border-gold-border'
                : 'text-ink-secondary hover:text-ink-primary border border-transparent'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Tiles grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-ds-3">
        {sectors.map((sector) => {
          const val = perfFor(sector, period);
          return (
            <button
              key={sector.id}
              onClick={() => navigate(`/app/stocks/sectors/${sector.id}`)}
              className="text-left rounded-[12px] p-ds-4 border border-border-ds-subtle bg-surface-1 hover:border-gold-border transition-all group min-w-0"
              style={val != null ? heatColor(val) : { backgroundColor: 'var(--surface-1, #111)' }}
            >
              <div className="text-xs text-ink-secondary mb-1 truncate">{sector.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink-secondary mb-2">
                {sector.ticker}
              </div>
              <div className={`text-xl font-bold font-mono tabular-nums ${numColor(val)}`}>
                {fmtPct(val)}
              </div>
              {sector.spWeight != null && (
                <div className="text-[10px] text-ink-secondary mt-1 font-mono">
                  {sector.spWeight.toFixed(1)}% of S&amp;P
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = 'table' | 'heatmap';

const StocksSectors = memo(function StocksSectors() {
  const [view, setView] = useState<ViewMode>('table');
  const { data: sectors, isLoading, error } = useSectorsAll();

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header: centered title + view toggle pinned right */}
      <div className="relative flex items-center justify-center pb-3">
        <h1 className="text-3xl font-bold text-ink-primary text-center">Market Sectors</h1>
        {/* View toggle (pinned right) */}
          <div className="absolute right-0 flex items-center gap-1 p-0.5 rounded-lg border border-border-ds-subtle bg-surface-1">
            {(['table', 'heatmap'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                  view === v
                    ? 'bg-gold-primary/15 text-gold-primary'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {v === 'table' ? 'Table' : 'Heatmap'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading && <SectionSpinner />}

        {error && !isLoading && (
          <p className="text-num-negative text-sm py-8 text-center">
            Sector data unavailable — please try again later.
          </p>
        )}

        {!isLoading && !error && sectors && sectors.length > 0 && (
          <>
            {/* Leaders / Laggards strip */}
            <LeadersStrip sectors={sectors} />

            {/* Main view */}
            {view === 'table' ? (
              <SectorsTable sectors={sectors} />
            ) : (
              <SectorsHeatmap sectors={sectors} />
            )}
          </>
        )}

        {!isLoading && !error && sectors && sectors.length === 0 && (
          <p className="text-ink-secondary text-sm py-8 text-center">No sector data available.</p>
        )}
      </div>
  );
});

export default StocksSectors;
