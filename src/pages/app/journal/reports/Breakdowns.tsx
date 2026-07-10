/**
 * JournalReportsBreakdowns — detailed performance breakdowns.
 * Tabs: Day & Time | Risk | Tags | Asset Class | Symbols | Strategy |
 *       Duration | Price Range | Month | Combinations (flexible cross-analysis)
 *
 * All grouping / matrix / summary-card logic lives in
 * `@/lib/journal/breakdownDimensions.ts` (pure, unit-tested). This file is
 * presentational only.
 */

import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useTrades } from '@/hooks/useTradesData';
import type { Trade } from '@/hooks/useTradesData';
import { Card } from '@/components/ds/Card';
import { Change } from '@/components/ds/NumberDisplay';
import type { BreakdownRow } from '@/lib/journal/breakdownKit';
import {
  groupByDow,
  groupByHour,
  groupBySession,
  groupByRBucket,
  groupByRiskUsd,
  groupByTag,
  groupByAssetClass,
  groupBySymbol,
  groupByStrategy,
  groupByDuration,
  groupByPriceRange,
  groupByMonth,
  topBottomByNetPnl,
  computeDimensionSummary,
  buildMatrix,
  MATRIX_DIMENSIONS,
  type DimAccessor,
  type DimensionSummary,
} from '@/lib/journal/breakdownDimensions';

// ---------------------------------------------------------------------------
// Sort types
// ---------------------------------------------------------------------------

type SortCol = 'label' | 'count' | 'winRate' | 'netPnl' | 'avgPnl' | 'avgR';
type SortDir = 'asc' | 'desc';

interface SortState { col: SortCol; dir: SortDir }

function sortRows(rows: BreakdownRow[], sort: SortState): BreakdownRow[] {
  return [...rows].sort((a, b) => {
    let av: number, bv: number;
    switch (sort.col) {
      case 'label':
        return sort.dir === 'asc'
          ? a.label.localeCompare(b.label)
          : b.label.localeCompare(a.label);
      case 'count':   av = a.count;   bv = b.count;   break;
      case 'winRate': av = a.count > 0 ? a.wins / a.count : 0;
                      bv = b.count > 0 ? b.wins / b.count : 0; break;
      case 'netPnl':  av = a.netPnl;  bv = b.netPnl;  break;
      case 'avgPnl':  av = a.count > 0 ? a.netPnl / a.count : 0;
                      bv = b.count > 0 ? b.netPnl / b.count : 0; break;
      case 'avgR':    av = a.rCount > 0 ? a.totalR / a.rCount : -Infinity;
                      bv = b.rCount > 0 ? b.totalR / b.rCount : -Infinity; break;
      default:        av = 0; bv = 0;
    }
    return sort.dir === 'desc' ? bv - av : av - bv;
  });
}

// ---------------------------------------------------------------------------
// BreakdownTable — shared internal sub-component
// ---------------------------------------------------------------------------

interface BreakdownTableProps {
  rows: BreakdownRow[];
  /** Override initial sort. Defaults to netPnl desc. */
  defaultSort?: SortState;
  /** Show "Avg R" column. Defaults true. */
  showAvgR?: boolean;
}

const SortIcon: React.FC<{ col: SortCol; active: SortState }> = ({ col, active }) => {
  if (active.col !== col) return <ChevronsUpDown className="inline ml-1 h-3 w-3 opacity-30" />;
  return active.dir === 'desc'
    ? <ChevronDown className="inline ml-1 h-3 w-3 text-[#C9A646]" />
    : <ChevronUp   className="inline ml-1 h-3 w-3 text-[#C9A646]" />;
};

const BreakdownTable: React.FC<BreakdownTableProps> = ({
  rows,
  defaultSort = { col: 'netPnl', dir: 'desc' },
  showAvgR = true,
}) => {
  const [sort, setSort] = useState<SortState>(defaultSort);

  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort]);

  function toggle(col: SortCol) {
    setSort(prev =>
      prev.col === col
        ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { col, dir: 'desc' }
    );
  }

  const Th: React.FC<{ col: SortCol; label: string; className?: string }> = ({ col, label, className = '' }) => (
    <th
      className={`px-3 py-2 text-left text-xs font-medium text-ink-tertiary cursor-pointer select-none hover:text-[#C9A646] transition-colors ${className}`}
      onClick={() => toggle(col)}
    >
      {label}<SortIcon col={col} active={sort} />
    </th>
  );

  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-ink-tertiary">
        No trades to display
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <Th col="label"   label="Group"   className="min-w-[140px]" />
            <Th col="count"   label="Trades"  />
            <Th col="winRate" label="Win %"   />
            <Th col="netPnl"  label="Net P&L" />
            <Th col="avgPnl"  label="Avg P&L" />
            {showAvgR && <Th col="avgR" label="Avg R" />}
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => {
            const winPct  = row.count > 0 ? (row.wins / row.count) * 100 : 0;
            const avgPnl  = row.count > 0 ? row.netPnl / row.count : 0;
            const avgR    = row.rCount > 0 ? row.totalR / row.rCount : null;

            return (
              <tr key={row.label} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-3 py-2.5 font-medium text-ink-primary">{row.label}</td>
                <td className="px-3 py-2.5 text-ink-secondary">{row.count}</td>
                <td className={`px-3 py-2.5 font-medium ${winPct >= 50 ? 'text-[#4AD295]' : winPct >= 40 ? 'text-[#C9A646]' : 'text-[#E24B4A]'}`}>
                  {winPct.toFixed(1)}%
                </td>
                <td className="px-3 py-2.5">
                  <Change value={row.netPnl} format="currency" decimals={2} />
                </td>
                <td className="px-3 py-2.5">
                  <Change value={avgPnl} format="currency" decimals={2} />
                </td>
                {showAvgR && (
                  <td className="px-3 py-2.5 text-ink-secondary">
                    {avgR != null ? `${avgR >= 0 ? '+' : ''}${avgR.toFixed(2)}R` : '—'}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ---------------------------------------------------------------------------
// DimensionSummaryCards — Best / Worst / Most Active, TradeZella-style
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  row: BreakdownRow | null;
  metric?: 'netPnl' | 'count';
}

const StatCard: React.FC<StatCardProps> = ({ label, row, metric = 'netPnl' }) => (
  <Card padding="compact" className="flex flex-col gap-1 min-w-0">
    <span className="text-[11px] font-medium tracking-[0.8px] uppercase text-ink-tertiary">
      {label}
    </span>
    {row ? (
      <>
        <span className="text-sm font-semibold text-ink-primary truncate">{row.label}</span>
        <span className="text-xs text-ink-secondary">
          {metric === 'count' ? (
            `${row.count} trade${row.count === 1 ? '' : 's'}`
          ) : (
            <Change value={row.netPnl} format="currency" decimals={2} showSign />
          )}
        </span>
      </>
    ) : (
      <span className="text-xs text-ink-tertiary">Not enough data (min 3 trades)</span>
    )}
  </Card>
);

const DimensionSummaryCards: React.FC<{ summary: DimensionSummary }> = ({ summary }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
    <StatCard label="Best" row={summary.best} />
    <StatCard label="Worst" row={summary.worst} />
    <StatCard label="Most Active" row={summary.mostActive} metric="count" />
  </div>
);

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

const Skeleton: React.FC = () => (
  <div className="space-y-2 animate-pulse">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="h-8 rounded bg-white/[0.04]" />
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// DimensionSection — Card + summary cards + table, one shared shape for
// every "By X" panel so each tab isn't hand-rolling the same boilerplate.
// ---------------------------------------------------------------------------

interface DimensionSectionProps {
  title: string;
  rows: BreakdownRow[];
  isLoading: boolean;
  showAvgR?: boolean;
  defaultSort?: SortState;
  /** Extra content rendered below the table (e.g. Top10/Bottom10 quick views). */
  footer?: React.ReactNode;
}

const DimensionSection: React.FC<DimensionSectionProps> = ({
  title, rows, isLoading, showAvgR = true, defaultSort, footer,
}) => {
  const summary = useMemo(() => computeDimensionSummary(rows), [rows]);

  return (
    <Card padding="compact">
      <h3 className="text-sm font-semibold text-ink-primary mb-4">{title}</h3>
      {isLoading ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-tertiary">No trades to display</div>
      ) : (
        <>
          <DimensionSummaryCards summary={summary} />
          <BreakdownTable rows={rows} showAvgR={showAvgR} defaultSort={defaultSort} />
          {footer}
        </>
      )}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// CombinationMatrix sub-component
// ---------------------------------------------------------------------------

interface CombinationMatrixProps {
  trades: Trade[];
  rowAccessor: DimAccessor;
  colAccessor: DimAccessor;
  rowLabel: string;
  colLabel: string;
}

const CombinationMatrix: React.FC<CombinationMatrixProps> = ({
  trades,
  rowAccessor,
  colAccessor,
  rowLabel,
  colLabel,
}) => {
  const { rowKeys, colKeys, cells, bestCell, capped } = useMemo(
    () => buildMatrix(trades, rowAccessor, colAccessor),
    [trades, rowAccessor, colAccessor],
  );

  if (trades.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-ink-tertiary">
        No trades to display
      </div>
    );
  }

  return (
    <div>
      {capped && (
        <div className="mb-3 px-1 text-xs text-ink-tertiary">
          This matrix is large — each axis is capped to the top 20 groups by trade count.
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {/* top-left corner */}
              <th className="px-3 py-2 text-left text-xs font-medium text-ink-tertiary min-w-[120px]">
                {rowLabel} ↓ / {colLabel} →
              </th>
              {colKeys.map(ck => (
                <th
                  key={ck}
                  className="px-3 py-2 text-center text-xs font-medium text-ink-tertiary min-w-[110px]"
                >
                  {ck}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowKeys.map(rk => (
              <tr key={rk} className="border-b border-white/[0.03]">
                <td className="px-3 py-2.5 font-medium text-ink-primary whitespace-nowrap">
                  {rk}
                </td>
                {colKeys.map(ck => {
                  const row = cells.get(`${rk}||${ck}`);
                  const isBest =
                    bestCell?.rowKey === rk && bestCell?.colKey === ck;

                  if (!row || row.count === 0) {
                    return (
                      <td
                        key={ck}
                        className="px-3 py-2.5 text-center text-ink-tertiary"
                      >
                        ·
                      </td>
                    );
                  }

                  const winPct = row.count > 0 ? (row.wins / row.count) * 100 : 0;
                  const avgR   = row.rCount > 0 ? row.totalR / row.rCount : null;
                  const bgClass =
                    row.netPnl > 0
                      ? 'bg-[#4AD295]/10'
                      : row.netPnl < 0
                        ? 'bg-[#E24B4A]/10'
                        : '';

                  return (
                    <td
                      key={ck}
                      className={`px-3 py-2.5 text-center align-top ${bgClass} ${
                        isBest ? 'ring-1 ring-[#C9A646] rounded' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <Change value={row.netPnl} format="currency" decimals={2} />
                        <span className="text-[10px] text-ink-tertiary whitespace-nowrap">
                          {winPct.toFixed(1)}%&nbsp;·&nbsp;{row.count}t&nbsp;·&nbsp;
                          {avgR != null ? `${avgR.toFixed(2)}R` : '—'}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bestCell && (
        <div className="mt-3 px-1 text-xs text-ink-secondary flex items-center gap-1.5">
          <span className="text-[#C9A646] font-medium">Best:</span>
          <span className="text-ink-primary font-medium">{bestCell.rowKey}</span>
          <span className="text-ink-tertiary">×</span>
          <span className="text-ink-primary font-medium">{bestCell.colKey}</span>
          <span className="text-ink-tertiary">—</span>
          <Change value={bestCell.row.netPnl} format="currency" decimals={2} />
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tab keys
// ---------------------------------------------------------------------------

type TabKey =
  | 'dayTime' | 'risk' | 'tags' | 'assetClass'
  | 'symbols' | 'strategy' | 'duration' | 'priceRange' | 'month'
  | 'combos';

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function JournalReportsBreakdowns() {
  const { data: trades = [], isLoading } = useTrades();
  const [activeTab, setActiveTab] = useState<TabKey>('dayTime');

  const dowRows        = useMemo(() => groupByDow(trades),         [trades]);
  const hourRows       = useMemo(() => groupByHour(trades),        [trades]);
  const sessionRows    = useMemo(() => groupBySession(trades),     [trades]);
  const rRows          = useMemo(() => groupByRBucket(trades),     [trades]);
  const riskUsdRows    = useMemo(() => groupByRiskUsd(trades),     [trades]);
  const tagRows        = useMemo(() => groupByTag(trades),         [trades]);
  const assetClassRows = useMemo(() => groupByAssetClass(trades),  [trades]);
  const symbolRows     = useMemo(() => groupBySymbol(trades),      [trades]);
  const strategyRows   = useMemo(() => groupByStrategy(trades),    [trades]);
  const durationRows   = useMemo(() => groupByDuration(trades),    [trades]);
  const priceRangeRows = useMemo(() => groupByPriceRange(trades),  [trades]);
  const monthRows      = useMemo(() => groupByMonth(trades),       [trades]);

  const symbolTopBottom = useMemo(() => topBottomByNetPnl(symbolRows, 10), [symbolRows]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'dayTime',    label: 'Day & Time'   },
    { key: 'risk',       label: 'Risk'         },
    { key: 'tags',       label: 'Tags'         },
    { key: 'assetClass', label: 'Asset Class'  },
    { key: 'symbols',    label: 'Symbols'      },
    { key: 'strategy',   label: 'Strategy'     },
    { key: 'duration',   label: 'Duration'     },
    { key: 'priceRange', label: 'Price Range'  },
    { key: 'month',      label: 'Month'        },
    { key: 'combos',     label: 'Combinations' },
  ];

  const hasRiskUsd = trades.some(t => t.risk_usd != null && t.risk_usd > 0);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-semibold text-ink-primary">Breakdowns</h2>
        <p className="text-sm text-ink-tertiary mt-1">
          Slice your trading performance by time, risk, symbols, strategy, and more.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-[#C9A646]/55 text-white shadow-[0_0_18px_rgba(201,166,70,0.18)]'
                : 'bg-white/[0.045] text-ink-secondary hover:text-ink-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* DAY & TIME tab */}
      {activeTab === 'dayTime' && (
        <div className="space-y-6">
          <DimensionSection title="By Day of Week" rows={dowRows} isLoading={isLoading} />
          <DimensionSection title="By Hour of Day" rows={hourRows} isLoading={isLoading} />
          <DimensionSection title="By Session" rows={sessionRows} isLoading={isLoading} />
        </div>
      )}

      {/* RISK tab */}
      {activeTab === 'risk' && (
        <div className="space-y-6">
          <DimensionSection
            title="By R-Multiple Bucket"
            rows={rRows}
            isLoading={isLoading}
            showAvgR={false}
          />

          {hasRiskUsd && (
            <DimensionSection title="By Risk Size (USD)" rows={riskUsdRows} isLoading={isLoading} />
          )}

          {!hasRiskUsd && !isLoading && (
            <Card padding="compact">
              <div className="py-8 text-center text-sm text-ink-tertiary">
                No risk-USD data found. Add risk amounts to your trades to see this breakdown.
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAGS tab */}
      {activeTab === 'tags' && (
        <DimensionSection title="By Tag" rows={tagRows} isLoading={isLoading} />
      )}

      {/* ASSET CLASS tab */}
      {activeTab === 'assetClass' && (
        <DimensionSection
          title="By Asset Class"
          rows={assetClassRows}
          isLoading={isLoading}
          defaultSort={{ col: 'count', dir: 'desc' }}
        />
      )}

      {/* SYMBOLS tab */}
      {activeTab === 'symbols' && (
        <DimensionSection
          title="By Symbol"
          rows={symbolRows}
          isLoading={isLoading}
          footer={
            !isLoading && symbolRows.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                <div>
                  <h4 className="text-xs font-semibold text-ink-secondary mb-2">Top 10 by Net P&L</h4>
                  <BreakdownTable rows={symbolTopBottom.top} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-ink-secondary mb-2">Bottom 10 by Net P&L</h4>
                  <BreakdownTable rows={symbolTopBottom.bottom} />
                </div>
              </div>
            )
          }
        />
      )}

      {/* STRATEGY tab */}
      {activeTab === 'strategy' && (
        <DimensionSection title="By Strategy" rows={strategyRows} isLoading={isLoading} />
      )}

      {/* DURATION tab */}
      {activeTab === 'duration' && (
        <DimensionSection
          title="By Trade Duration"
          rows={durationRows}
          isLoading={isLoading}
          defaultSort={{ col: 'label', dir: 'asc' }}
        />
      )}

      {/* PRICE RANGE tab */}
      {activeTab === 'priceRange' && (
        <DimensionSection
          title="By Price Range"
          rows={priceRangeRows}
          isLoading={isLoading}
          defaultSort={{ col: 'label', dir: 'asc' }}
        />
      )}

      {/* MONTH tab */}
      {activeTab === 'month' && (
        <DimensionSection
          title="By Month"
          rows={monthRows}
          isLoading={isLoading}
          defaultSort={{ col: 'label', dir: 'asc' }}
        />
      )}

      {/* COMBINATIONS tab */}
      {activeTab === 'combos' && (
        <CombosPanel trades={trades} isLoading={isLoading} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CombosPanel — flexible Primary × Secondary cross-analysis, with the 3
// original fixed combos kept as one-click presets.
// ---------------------------------------------------------------------------

const PRESETS: { key: string; label: string; rowId: string; colId: string }[] = [
  { key: 'strategy-session', label: 'Strategy × Session', rowId: 'strategy',   colId: 'session'    },
  { key: 'asset-session',    label: 'Asset × Session',    rowId: 'assetClass', colId: 'session'    },
  { key: 'strategy-asset',   label: 'Strategy × Asset',   rowId: 'strategy',   colId: 'assetClass' },
];

const DEFAULT_ROW_DIM = 'strategy';
const DEFAULT_COL_DIM = 'session';

interface DimensionSelectProps {
  label: string;
  value: string;
  onChange: (id: string) => void;
}

const DimensionSelect: React.FC<DimensionSelectProps> = ({ label, value, onChange }) => (
  <label className="flex items-center gap-2 text-xs text-ink-tertiary">
    {label}
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded-md bg-white/[0.045] border border-white/[0.08] px-2.5 py-1.5 text-xs text-ink-secondary focus:outline-none focus:border-[#C9A646]/60 cursor-pointer"
    >
      {MATRIX_DIMENSIONS.map(d => (
        <option key={d.id} value={d.id}>{d.label}</option>
      ))}
    </select>
  </label>
);

const CombosPanel: React.FC<{ trades: Trade[]; isLoading: boolean }> = ({ trades, isLoading }) => {
  const [rowDimId, setRowDimId] = useState(DEFAULT_ROW_DIM);
  const [colDimId, setColDimId] = useState(DEFAULT_COL_DIM);

  const rowDef = MATRIX_DIMENSIONS.find(d => d.id === rowDimId) ?? MATRIX_DIMENSIONS[0];
  const colDef = MATRIX_DIMENSIONS.find(d => d.id === colDimId) ?? MATRIX_DIMENSIONS[0];

  const rowAccessor = useMemo(() => rowDef.getAccessor(trades), [rowDef, trades]);
  const colAccessor = useMemo(() => colDef.getAccessor(trades), [colDef, trades]);

  return (
    <Card padding="compact">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-ink-primary">Cross-Analysis Matrix</h3>
        <div className="flex gap-1.5 flex-wrap">
          {PRESETS.map(opt => (
            <button
              key={opt.key}
              onClick={() => { setRowDimId(opt.rowId); setColDimId(opt.colId); }}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                rowDimId === opt.rowId && colDimId === opt.colId
                  ? 'bg-[#C9A646]/55 text-white shadow-[0_0_18px_rgba(201,166,70,0.18)]'
                  : 'bg-white/[0.045] text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <DimensionSelect label="Primary" value={rowDimId} onChange={setRowDimId} />
        <span className="text-ink-tertiary text-xs">×</span>
        <DimensionSelect label="Secondary" value={colDimId} onChange={setColDimId} />
      </div>

      {isLoading ? (
        <Skeleton />
      ) : (
        <CombinationMatrix
          trades={trades}
          rowAccessor={rowAccessor}
          colAccessor={colAccessor}
          rowLabel={rowDef.label}
          colLabel={colDef.label}
        />
      )}
    </Card>
  );
};
