// ============================================================
// src/pages/app/stocks/_screener/ResultsTable.tsx
// Sortable, paginated results table for the stocks screener
// ============================================================

import { memo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { GlassTableSkeleton, EmptyState } from '@/pages/app/crypto/_shared/GlassUI';
import { formatPrice, formatPercent, formatCompact, getPriceColor } from '@/pages/app/crypto/_shared/formatters';
import type { ScreenerRow } from './types';
import type { SortState } from './types';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────
function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(decimals);
}

function fmtX(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toFixed(1)}x`;
}

function fmtPct(n: number | null | undefined): string {
  return formatPercent(n);
}

// RSI color bands: oversold <30 green, overbought >70 amber, else normal
function getRsiColor(rsi: number | null): string {
  if (rsi == null) return 'text-white/30';
  if (rsi <= 30) return 'text-emerald-400';
  if (rsi >= 70) return 'text-amber-400';
  return 'text-white/60';
}

// ── Column definitions ────────────────────────────────────────
interface ColDef {
  key: string;
  label: string;
  sortKey: string;
  align: 'left' | 'right';
  /** tailwind responsive hidden class, e.g. 'hidden md:table-cell' */
  hidden?: string;
  render: (row: ScreenerRow) => ReactNode;
}

const COLUMNS: ColDef[] = [
  {
    key: 'ticker',
    label: 'Ticker',
    sortKey: 'ticker',
    align: 'left',
    render: row => (
      <div>
        <span className="text-white/90 font-semibold text-xs">{row.ticker}</span>
        <div className="text-[10px] text-white/30 truncate max-w-[120px]">{row.name}</div>
      </div>
    ),
  },
  {
    key: 'price',
    label: 'Price',
    sortKey: 'price',
    align: 'right',
    render: row => (
      <span className="text-white/80 font-mono text-xs">{formatPrice(row.price)}</span>
    ),
  },
  {
    key: 'change_1d_pct',
    label: 'Chg%',
    sortKey: 'change_1d_pct',
    align: 'right',
    render: row => (
      <span className={cn('font-mono text-xs', getPriceColor(row.change_1d_pct))}>
        {fmtPct(row.change_1d_pct)}
      </span>
    ),
  },
  {
    key: 'market_cap',
    label: 'Mkt Cap',
    sortKey: 'market_cap',
    align: 'right',
    hidden: 'hidden md:table-cell',
    render: row => (
      <span className="text-white/50 font-mono text-xs">{formatCompact(row.market_cap)}</span>
    ),
  },
  {
    key: 'pe',
    label: 'P/E',
    sortKey: 'pe',
    align: 'right',
    hidden: 'hidden md:table-cell',
    render: row => (
      <span className="text-white/50 font-mono text-xs">{fmt(row.pe, 1)}</span>
    ),
  },
  {
    key: 'dividend_yield',
    label: 'Div%',
    sortKey: 'dividend_yield',
    align: 'right',
    hidden: 'hidden lg:table-cell',
    render: row => (
      <span className="text-white/50 font-mono text-xs">
        {row.dividend_yield != null && Number.isFinite(row.dividend_yield)
          ? `${row.dividend_yield.toFixed(2)}%`
          : '—'}
      </span>
    ),
  },
  {
    key: 'roe',
    label: 'ROE',
    sortKey: 'roe',
    align: 'right',
    hidden: 'hidden lg:table-cell',
    render: row => (
      <span className={cn('font-mono text-xs', row.roe != null && row.roe >= 15 ? 'text-emerald-400' : 'text-white/40')}>
        {fmtPct(row.roe)}
      </span>
    ),
  },
  {
    key: 'rsi_14',
    label: 'RSI',
    sortKey: 'rsi_14',
    align: 'right',
    hidden: 'hidden lg:table-cell',
    render: row => (
      <span className={cn('font-mono text-xs', getRsiColor(row.rsi_14))}>
        {fmt(row.rsi_14, 1)}
      </span>
    ),
  },
  {
    key: 'perf_1y_pct',
    label: 'Perf 1Y',
    sortKey: 'perf_1y_pct',
    align: 'right',
    hidden: 'hidden lg:table-cell',
    render: row => (
      <span className={cn('font-mono text-xs', getPriceColor(row.perf_1y_pct))}>
        {fmtPct(row.perf_1y_pct)}
      </span>
    ),
  },
  {
    key: 'beta',
    label: 'Beta',
    sortKey: 'beta',
    align: 'right',
    hidden: 'hidden xl:table-cell',
    render: row => (
      <span className="text-white/30 font-mono text-xs">{fmtX(row.beta)}</span>
    ),
  },
  {
    key: 'sector',
    label: 'Sector',
    sortKey: 'sector',
    align: 'left',
    hidden: 'hidden xl:table-cell',
    render: row => (
      <span className="text-white/30 text-xs truncate max-w-[100px] block">{row.sector || '—'}</span>
    ),
  },
];

// ── Sort header cell ──────────────────────────────────────────
const SortTh = memo(function SortTh({
  col,
  sort,
  onSort,
}: {
  col: ColDef;
  sort: SortState;
  onSort: (s: SortState) => void;
}) {
  const active = sort.sort === col.sortKey;

  const handleClick = useCallback(() => {
    if (active) {
      onSort({ sort: col.sortKey, dir: sort.dir === 'desc' ? 'asc' : 'desc' });
    } else {
      onSort({ sort: col.sortKey, dir: 'desc' });
    }
  }, [active, col.sortKey, sort.dir, onSort]);

  return (
    <th
      onClick={handleClick}
      className={cn(
        'py-2 px-2 text-[10px] uppercase tracking-wider font-medium cursor-pointer select-none whitespace-nowrap',
        col.align === 'right' ? 'text-right' : 'text-left',
        active ? 'text-cyan-400' : 'text-white/25 hover:text-white/50',
        col.hidden,
      )}
    >
      {col.label}
      {active && (
        <span className="ml-0.5 opacity-70">{sort.dir === 'desc' ? ' ↓' : ' ↑'}</span>
      )}
    </th>
  );
});

// ── Pagination ────────────────────────────────────────────────
const Pagination = memo(function Pagination({
  page,
  total,
  limit,
  onPage,
}: {
  page: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.04]">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded-lg text-xs border border-white/[0.08] text-white/50 disabled:opacity-30 hover:enabled:text-white/80 hover:enabled:border-white/20 transition-colors"
      >
        ← Prev
      </button>
      <span className="text-[11px] text-white/30 font-mono">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded-lg text-xs border border-white/[0.08] text-white/50 disabled:opacity-30 hover:enabled:text-white/80 hover:enabled:border-white/20 transition-colors"
      >
        Next →
      </button>
    </div>
  );
});

// ── Main ResultsTable ─────────────────────────────────────────
interface ResultsTableProps {
  rows: ScreenerRow[];
  total: number;
  page: number;
  limit: number;
  sort: SortState;
  loading: boolean;
  error: string | null;
  onSort: (s: SortState) => void;
  onPage: (p: number) => void;
}

export const ResultsTable = memo(function ResultsTable({
  rows,
  total,
  page,
  limit,
  sort,
  loading,
  error,
  onSort,
  onPage,
}: ResultsTableProps) {
  if (loading) return <GlassTableSkeleton rows={15} />;

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Failed to load results"
        description={error}
      />
    );
  }

  if (!rows.length) {
    return (
      <EmptyState
        icon="🔍"
        title="No stocks match"
        description="Try widening your filters or removing a preset."
      />
    );
  }

  return (
    <div className="space-y-2">
      {/* Match count */}
      <div className="text-[11px] text-white/30 px-1">
        {rows.length} of{' '}
        <span className="text-white/50 font-semibold">{total.toLocaleString('en-US')}</span>{' '}
        match
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.04]">
              {COLUMNS.map(col => (
                <SortTh key={col.key} col={col} sort={sort} onSort={onSort} />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.ticker}
                className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                {COLUMNS.map(col => (
                  <td
                    key={col.key}
                    className={cn(
                      'py-2 px-2',
                      col.align === 'right' ? 'text-right' : 'text-left',
                      col.hidden,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} limit={limit} onPage={onPage} />
    </div>
  );
});
