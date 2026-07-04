// ============================================================
// src/pages/app/stocks/_insiders/HoldingsTable.tsx
// Sortable holdings table for manager detail — screener style
// ============================================================

import { memo, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCompact } from '@/pages/app/crypto/_shared/formatters';
import { SectionSpinner } from '@/components/ds/Spinner';
import type { Holding, ChangeType } from './hooks';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────
type SortKey = 'ticker' | 'issuerName' | 'pctOfPortfolio' | 'valueUsd' | 'shares' | 'changeShares';
type SortDir = 'asc' | 'desc';

interface SortState { sort: SortKey; dir: SortDir; }

// ── Helpers ───────────────────────────────────────────────────
function fmtShares(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

function changeLabel(type: ChangeType): string {
  switch (type) {
    case 'new': return 'NEW';
    case 'added': return 'ADDED';
    case 'reduced': return 'REDUCED';
    case 'sold_out': return 'EXITED';
    default: return '—';
  }
}

function changeBadgeClass(type: ChangeType): string {
  switch (type) {
    case 'new': return 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20';
    case 'added': return 'bg-emerald-400/8 text-emerald-400/70 border-emerald-400/15';
    case 'reduced': return 'bg-amber-400/10 text-amber-400 border-amber-400/20';
    case 'sold_out': return 'bg-red-400/10 text-red-400 border-red-400/20';
    default: return 'bg-white/[0.03] text-white/25 border-white/[0.06]';
  }
}

// ── Tab definition ────────────────────────────────────────────
type TabId = 'all' | 'new' | 'added' | 'reduced' | 'sold_out';
interface Tab { id: TabId; label: string; }
const TABS: Tab[] = [
  { id: 'all', label: 'All Holdings' },
  { id: 'new', label: 'New Buys' },
  { id: 'added', label: 'Added' },
  { id: 'reduced', label: 'Reduced' },
  { id: 'sold_out', label: 'Sold Out' },
];

function filterByTab(holdings: Holding[], tab: TabId): Holding[] {
  if (tab === 'all') return holdings;
  return holdings.filter(h => h.changeType === tab);
}

// ── Column definitions ────────────────────────────────────────
interface ColDef {
  key: SortKey | '_change_badge';
  label: string;
  sortKey?: SortKey;
  align: 'left' | 'right';
  hidden?: string;
  render: (row: Holding) => ReactNode;
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
        <div className="text-[10px] text-white/30 truncate max-w-[120px]">{row.issuerName}</div>
      </div>
    ),
  },
  {
    key: 'pctOfPortfolio',
    label: '% of Portfolio',
    sortKey: 'pctOfPortfolio',
    align: 'right',
    render: row => (
      <div className="flex items-center justify-end gap-2">
        <div className="hidden sm:block w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-cyan-500/40"
            style={{ width: `${Math.min(100, row.pctOfPortfolio * 5)}%` }}
          />
        </div>
        <span className="text-white/70 font-mono text-xs">
          {row.pctOfPortfolio.toFixed(2)}%
        </span>
      </div>
    ),
  },
  {
    key: 'valueUsd',
    label: 'Value',
    sortKey: 'valueUsd',
    align: 'right',
    hidden: 'hidden md:table-cell',
    render: row => (
      <span className="text-white/50 font-mono text-xs">{formatCompact(row.valueUsd)}</span>
    ),
  },
  {
    key: 'shares',
    label: 'Shares',
    sortKey: 'shares',
    align: 'right',
    hidden: 'hidden md:table-cell',
    render: row => (
      <span className="text-white/50 font-mono text-xs">{fmtShares(row.shares)}</span>
    ),
  },
  {
    key: 'changeShares',
    label: 'Change',
    sortKey: 'changeShares',
    align: 'right',
    hidden: 'hidden lg:table-cell',
    render: row => {
      if (row.changeType === 'new' || row.changeType === 'sold_out') return <span className="text-white/25 font-mono text-xs">—</span>;
      const sign = row.changeShares >= 0 ? '+' : '';
      const color = row.changeShares >= 0 ? 'text-emerald-400' : 'text-red-400';
      return (
        <span className={cn('font-mono text-xs', color)}>
          {sign}{fmtShares(row.changeShares)}
        </span>
      );
    },
  },
  {
    key: '_change_badge',
    label: 'Type',
    align: 'left',
    hidden: 'hidden sm:table-cell',
    render: row => (
      <span
        className={cn(
          'inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md border font-semibold',
          changeBadgeClass(row.changeType),
        )}
      >
        {changeLabel(row.changeType)}
      </span>
    ),
  },
];

// ── Sort header ───────────────────────────────────────────────
const SortTh = memo(function SortTh({
  col,
  sort,
  onSort,
}: {
  col: ColDef;
  sort: SortState;
  onSort: (s: SortState) => void;
}) {
  if (!col.sortKey) {
    return (
      <th
        className={cn(
          'py-2 px-2 text-[10px] uppercase tracking-wider font-medium whitespace-nowrap',
          col.align === 'right' ? 'text-right' : 'text-left',
          'text-white/25',
          col.hidden,
        )}
      >
        {col.label}
      </th>
    );
  }

  const active = sort.sort === col.sortKey;

  const handleClick = useCallback(() => {
    if (active) {
      onSort({ sort: col.sortKey!, dir: sort.dir === 'desc' ? 'asc' : 'desc' });
    } else {
      onSort({ sort: col.sortKey!, dir: 'desc' });
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

// ── HoldingsTable ─────────────────────────────────────────────
interface HoldingsTableProps {
  holdings: Holding[];
  loading: boolean;
  error: string | null;
}

export const HoldingsTable = memo(function HoldingsTable({
  holdings,
  loading,
  error,
}: HoldingsTableProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [sort, setSort] = useState<SortState>({ sort: 'pctOfPortfolio', dir: 'desc' });

  const handleSort = useCallback((s: SortState) => setSort(s), []);

  // Filter first, then sort
  const filtered = filterByTab(holdings, activeTab);

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sort.sort] as number | string;
    const bVal = b[sort.sort] as number | string;
    const mul = sort.dir === 'desc' ? -1 : 1;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return mul * aVal.localeCompare(bVal);
    }
    return mul * ((aVal as number) - (bVal as number));
  });

  // Tab counts
  const counts: Record<TabId, number> = {
    all: holdings.length,
    new: holdings.filter(h => h.changeType === 'new').length,
    added: holdings.filter(h => h.changeType === 'added').length,
    reduced: holdings.filter(h => h.changeType === 'reduced').length,
    sold_out: holdings.filter(h => h.changeType === 'sold_out').length,
  };

  if (loading) return <SectionSpinner />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <p className="text-[11px] text-white/25">Failed to load holdings</p>
        <button
          onClick={() => window.location.reload()}
          className="text-[11px] text-white/40 border border-white/[0.08] rounded-lg px-3 py-1.5 hover:text-white/60 hover:border-white/[0.15] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!holdings.length) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[11px] text-white/25">
          Institutional data is being prepared. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs whitespace-nowrap transition-all duration-150',
              activeTab === tab.id
                ? 'border border-white/[0.12] bg-white/[0.08] text-white font-semibold'
                : 'text-white/35 hover:text-white/70',
            )}
          >
            {tab.label}
            {counts[tab.id] > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[9px] font-mono',
                  activeTab === tab.id ? 'bg-white/10 text-white/70' : 'bg-white/[0.04] text-white/25',
                )}
              >
                {counts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <p className="text-center text-[11px] text-white/20 py-8">No holdings in this category.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {COLUMNS.map(col => (
                  <SortTh key={col.key} col={col} sort={sort} onSort={handleSort} />
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => (
                <tr
                  key={row.ticker + row.cusip}
                  onClick={() => navigate(`/app/ai/stock-analyzer?symbol=${row.ticker}`)}
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
      )}
    </div>
  );
});
