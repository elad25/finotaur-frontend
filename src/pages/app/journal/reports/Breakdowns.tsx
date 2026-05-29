/**
 * JournalReportsBreakdowns — detailed performance breakdowns.
 * Tabs: Day & Time | Risk | Tags
 */

import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useTrades } from '@/hooks/useTradesData';
import type { Trade } from '@/hooks/useTradesData';
import { Card } from '@/components/ds/Card';
import { Change } from '@/components/ds/NumberDisplay';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Reorder Mon-Sun for display (trading week)
const TRADING_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon=1 … Sun=0

const R_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: '< −2R',    min: -Infinity, max: -2 },
  { label: '−2R to −1R', min: -2,       max: -1 },
  { label: '−1R to 0R',  min: -1,       max: 0  },
  { label: '0R to 1R',   min: 0,        max: 1  },
  { label: '1R to 2R',   min: 1,        max: 2  },
  { label: '> 2R',        min: 2,        max: Infinity },
];

// ---------------------------------------------------------------------------
// Internal row type
// ---------------------------------------------------------------------------

interface BreakdownRow {
  label: string;
  count: number;
  wins: number;
  netPnl: number;
  /** Sum of R values for averaging */
  totalR: number;
  rCount: number;
}

function emptyRow(label: string): BreakdownRow {
  return { label, count: 0, wins: 0, netPnl: 0, totalR: 0, rCount: 0 };
}

function accumulateTrade(row: BreakdownRow, t: Trade): void {
  row.count += 1;
  if ((t.pnl ?? 0) > 0) row.wins += 1;
  row.netPnl += t.pnl ?? 0;
  const r = t.actual_user_r ?? t.actual_r ?? t.rr;
  if (r != null) { row.totalR += r; row.rCount += 1; }
}

// ---------------------------------------------------------------------------
// Grouping helpers
// ---------------------------------------------------------------------------

function groupByDow(trades: Trade[]): BreakdownRow[] {
  const map = new Map<number, BreakdownRow>(
    TRADING_DAYS.map(d => [d, emptyRow(DAY_NAMES[d])])
  );
  for (const t of trades) {
    const dow = dayjs(t.open_at).day(); // 0=Sun..6=Sat
    const row = map.get(dow);
    if (row) accumulateTrade(row, t);
  }
  return TRADING_DAYS.map(d => map.get(d)!);
}

function groupByHour(trades: Trade[]): BreakdownRow[] {
  const map = new Map<number, BreakdownRow>();
  for (const t of trades) {
    const h = dayjs(t.open_at).hour();
    if (!map.has(h)) map.set(h, emptyRow(`${String(h).padStart(2, '0')}:00`));
    accumulateTrade(map.get(h)!, t);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([, row]) => row);
}

function groupBySession(trades: Trade[]): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  for (const t of trades) {
    const key = t.session ?? '(unset)';
    if (!map.has(key)) map.set(key, emptyRow(key));
    accumulateTrade(map.get(key)!, t);
  }
  return Array.from(map.values()).sort((a, b) => b.netPnl - a.netPnl);
}

function groupByRBucket(trades: Trade[]): BreakdownRow[] {
  const rows = R_BUCKETS.map(b => emptyRow(b.label));
  for (const t of trades) {
    const r = t.actual_user_r ?? t.actual_r ?? t.rr ?? 0;
    const idx = R_BUCKETS.findIndex(b => r >= b.min && r < b.max);
    if (idx !== -1) accumulateTrade(rows[idx], t);
  }
  return rows;
}

function groupByRiskUsd(trades: Trade[]): BreakdownRow[] {
  const RISK_BUCKETS = [
    { label: '< $50',      min: 0,   max: 50   },
    { label: '$50–$100',   min: 50,  max: 100  },
    { label: '$100–$200',  min: 100, max: 200  },
    { label: '$200–$500',  min: 200, max: 500  },
    { label: '> $500',     min: 500, max: Infinity },
  ];
  const rows = RISK_BUCKETS.map(b => emptyRow(b.label));
  const withRisk = trades.filter(t => t.risk_usd != null && t.risk_usd > 0);
  for (const t of withRisk) {
    const risk = t.risk_usd!;
    const idx = RISK_BUCKETS.findIndex(b => risk >= b.min && risk < b.max);
    if (idx !== -1) accumulateTrade(rows[idx], t);
  }
  return rows;
}

function groupByTag(trades: Trade[]): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  for (const t of trades) {
    const tradeTags = t.tags && t.tags.length > 0 ? t.tags : ['(untagged)'];
    for (const tag of tradeTags) {
      if (!map.has(tag)) map.set(tag, emptyRow(tag));
      accumulateTrade(map.get(tag)!, t);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.netPnl - a.netPnl);
}

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
// Tab keys
// ---------------------------------------------------------------------------

type TabKey = 'dayTime' | 'risk' | 'tags';

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
// Main page component
// ---------------------------------------------------------------------------

export default function JournalReportsBreakdowns() {
  const { data: trades = [], isLoading } = useTrades();
  const [activeTab, setActiveTab] = useState<TabKey>('dayTime');

  const dowRows     = useMemo(() => groupByDow(trades),     [trades]);
  const hourRows    = useMemo(() => groupByHour(trades),    [trades]);
  const sessionRows = useMemo(() => groupBySession(trades), [trades]);
  const rRows       = useMemo(() => groupByRBucket(trades), [trades]);
  const riskUsdRows = useMemo(() => groupByRiskUsd(trades), [trades]);
  const tagRows     = useMemo(() => groupByTag(trades),     [trades]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'dayTime', label: 'Day & Time' },
    { key: 'risk',    label: 'Risk'       },
    { key: 'tags',    label: 'Tags'       },
  ];

  const hasRiskUsd = trades.some(t => t.risk_usd != null && t.risk_usd > 0);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-semibold text-ink-primary">Breakdowns</h2>
        <p className="text-sm text-ink-tertiary mt-1">
          Slice your trading performance by time, risk, and tags.
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
          <Card padding="compact">
            <h3 className="text-sm font-semibold text-ink-primary mb-4">By Day of Week</h3>
            {isLoading ? <Skeleton /> : <BreakdownTable rows={dowRows} />}
          </Card>

          <Card padding="compact">
            <h3 className="text-sm font-semibold text-ink-primary mb-4">By Hour of Day</h3>
            {isLoading ? <Skeleton /> : (
              hourRows.length === 0
                ? <div className="py-10 text-center text-sm text-ink-tertiary">No trades to display</div>
                : <BreakdownTable rows={hourRows} />
            )}
          </Card>

          <Card padding="compact">
            <h3 className="text-sm font-semibold text-ink-primary mb-4">By Session</h3>
            {isLoading ? <Skeleton /> : (
              sessionRows.length === 0
                ? <div className="py-10 text-center text-sm text-ink-tertiary">No trades to display</div>
                : <BreakdownTable rows={sessionRows} />
            )}
          </Card>
        </div>
      )}

      {/* RISK tab */}
      {activeTab === 'risk' && (
        <div className="space-y-6">
          <Card padding="compact">
            <h3 className="text-sm font-semibold text-ink-primary mb-4">By R-Multiple Bucket</h3>
            {isLoading ? <Skeleton /> : <BreakdownTable rows={rRows} showAvgR={false} />}
          </Card>

          {hasRiskUsd && (
            <Card padding="compact">
              <h3 className="text-sm font-semibold text-ink-primary mb-4">By Risk Size (USD)</h3>
              {isLoading ? <Skeleton /> : <BreakdownTable rows={riskUsdRows} />}
            </Card>
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
        <Card padding="compact">
          <h3 className="text-sm font-semibold text-ink-primary mb-4">By Tag</h3>
          {isLoading ? <Skeleton /> : (
            tagRows.length === 0
              ? <div className="py-10 text-center text-sm text-ink-tertiary">No trades to display</div>
              : <BreakdownTable rows={tagRows} />
          )}
        </Card>
      )}
    </div>
  );
}
