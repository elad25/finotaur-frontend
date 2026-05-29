/**
 * JournalReportsCompare — side-by-side group comparison.
 * Group A vs Group B, each with their own TradeFilter.
 * Metrics computed via computeGroupStats. Save/load via useSavedComparisons.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { Save, Trash2, ChevronDown } from 'lucide-react';
import { useTrades } from '@/hooks/useTradesData';
import { filterTrades, type TradeFilter } from '@/lib/journal/tradeFilter';
import { computeGroupStats, type GroupStats } from '@/lib/journal/groupStats';
import { useSavedComparisons } from '@/hooks/useSavedComparisons';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Change } from '@/components/ds/NumberDisplay';

// ---------------------------------------------------------------------------
// FilterBuilder — compact filter form for one group
// ---------------------------------------------------------------------------

const KNOWN_SESSIONS = ['asia', 'london', 'newyork', 'overnight', 'premarket'];
const KNOWN_OUTCOMES = ['WIN', 'LOSS', 'BE', 'OPEN'] as const;

interface FilterBuilderProps {
  label: string;
  filter: TradeFilter;
  onChange: (f: TradeFilter) => void;
  /** Unique available tags derived from trades */
  allTags: string[];
}

const FilterBuilder: React.FC<FilterBuilderProps> = ({ label, filter, onChange, allTags }) => {
  const [symbolInput, setSymbolInput] = useState('');

  function patch(partial: Partial<TradeFilter>) {
    onChange({ ...filter, ...partial });
  }

  function toggleArray<T extends string>(
    arr: T[] | undefined,
    value: T,
    key: keyof TradeFilter
  ) {
    const current: T[] = (arr ?? []) as T[];
    const next: T[] = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    patch({ [key]: next.length > 0 ? next : undefined });
  }

  function addSymbol() {
    const syms = symbolInput
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);
    if (syms.length === 0) return;
    const existing = filter.symbols ?? [];
    patch({ symbols: [...new Set([...existing, ...syms])] });
    setSymbolInput('');
  }

  function removeSymbol(sym: string) {
    const next = (filter.symbols ?? []).filter(s => s !== sym);
    patch({ symbols: next.length > 0 ? next : undefined });
  }

  function clearFilter() {
    onChange({});
  }

  const inputClass =
    'w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-1.5 text-xs text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-[#C9A646]/50 transition-colors';

  const pillClass = (active: boolean) =>
    `px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer select-none transition-colors ${
      active
        ? 'bg-[#C9A646]/55 text-white'
        : 'bg-white/[0.04] text-ink-secondary hover:text-ink-primary'
    }`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-primary">{label}</h3>
        <button
          onClick={clearFilter}
          className="text-[10px] text-ink-tertiary hover:text-ink-secondary transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-ink-tertiary mb-1">From</label>
          <input
            type="date"
            value={filter.dateFrom ?? ''}
            onChange={e => patch({ dateFrom: e.target.value || undefined })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-[10px] text-ink-tertiary mb-1">To</label>
          <input
            type="date"
            value={filter.dateTo ?? ''}
            onChange={e => patch({ dateTo: e.target.value || undefined })}
            className={inputClass}
          />
        </div>
      </div>

      {/* Symbols */}
      <div>
        <label className="block text-[10px] text-ink-tertiary mb-1">Symbols</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={symbolInput}
            onChange={e => setSymbolInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSymbol()}
            placeholder="ES, NQ, ..."
            className={`${inputClass} flex-1`}
          />
          <button
            onClick={addSymbol}
            className="px-3 py-1.5 text-xs bg-white/[0.06] rounded-md text-ink-secondary hover:text-ink-primary transition-colors"
          >
            Add
          </button>
        </div>
        {(filter.symbols ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {filter.symbols!.map(sym => (
              <span
                key={sym}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#C9A646]/20 text-[#C9A646] text-[10px] rounded cursor-pointer hover:bg-[#C9A646]/30"
                onClick={() => removeSymbol(sym)}
              >
                {sym} ×
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Side */}
      <div>
        <label className="block text-[10px] text-ink-tertiary mb-1">Side</label>
        <div className="flex gap-1.5">
          {(['LONG', 'SHORT'] as const).map(side => (
            <button
              key={side}
              onClick={() => toggleArray(filter.sides, side, 'sides')}
              className={pillClass((filter.sides ?? []).includes(side))}
            >
              {side}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions */}
      <div>
        <label className="block text-[10px] text-ink-tertiary mb-1">Session</label>
        <div className="flex flex-wrap gap-1.5">
          {KNOWN_SESSIONS.map(s => (
            <button
              key={s}
              onClick={() => toggleArray(filter.sessions, s, 'sessions')}
              className={pillClass((filter.sessions ?? []).includes(s))}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Outcomes */}
      <div>
        <label className="block text-[10px] text-ink-tertiary mb-1">Outcome</label>
        <div className="flex flex-wrap gap-1.5">
          {KNOWN_OUTCOMES.map(o => (
            <button
              key={o}
              onClick={() => toggleArray(filter.outcomes, o, 'outcomes')}
              className={pillClass((filter.outcomes ?? []).includes(o))}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div>
          <label className="block text-[10px] text-ink-tertiary mb-1">Tags</label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleArray(filter.tags, tag, 'tags')}
                className={pillClass((filter.tags ?? []).includes(tag))}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Metrics comparison table
// ---------------------------------------------------------------------------

interface MetricRow {
  label: string;
  /** Render value for a group. Returns JSX. */
  render: (stats: GroupStats) => React.ReactNode;
  /**
   * Compare function: returns true if statsA has the "better" value.
   * null = no winner (e.g. identical).
   */
  better: (a: GroupStats, b: GroupStats) => 'A' | 'B' | null;
}

function buildMetricRows(): MetricRow[] {
  return [
    {
      label: 'Trade count',
      render: s => <span className="font-semibold text-ink-primary">{s.count}</span>,
      better: (a, b) => a.count > b.count ? 'A' : b.count > a.count ? 'B' : null,
    },
    {
      label: 'Win rate',
      render: s => (
        <span className={`font-semibold ${s.winRate >= 50 ? 'text-[#4AD295]' : 'text-[#E24B4A]'}`}>
          {s.winRate.toFixed(1)}%
        </span>
      ),
      better: (a, b) => a.winRate > b.winRate ? 'A' : b.winRate > a.winRate ? 'B' : null,
    },
    {
      label: 'Net P&L',
      render: s => s.count === 0
        ? <span className="text-ink-tertiary">—</span>
        : <Change value={s.netPnl} format="currency" decimals={2} className="font-semibold" />,
      better: (a, b) => a.netPnl > b.netPnl ? 'A' : b.netPnl > a.netPnl ? 'B' : null,
    },
    {
      label: 'Avg win',
      render: s => s.avgWin === 0
        ? <span className="text-ink-tertiary">—</span>
        : <Change value={s.avgWin} format="currency" decimals={2} />,
      better: (a, b) => a.avgWin > b.avgWin ? 'A' : b.avgWin > a.avgWin ? 'B' : null,
    },
    {
      label: 'Avg loss',
      render: s => s.avgLoss === 0
        ? <span className="text-ink-tertiary">—</span>
        : <Change value={s.avgLoss} format="currency" decimals={2} />,
      // smaller magnitude loss is better
      better: (a, b) => a.avgLoss > b.avgLoss ? 'A' : b.avgLoss > a.avgLoss ? 'B' : null,
    },
    {
      label: 'Profit factor',
      render: s => {
        if (s.count === 0) return <span className="text-ink-tertiary">—</span>;
        const pf = s.profitFactor;
        const text = pf === Infinity ? '∞' : pf.toFixed(2);
        return <span className={`font-semibold ${pf >= 1 ? 'text-[#4AD295]' : 'text-[#E24B4A]'}`}>{text}</span>;
      },
      better: (a, b) => {
        const pfA = isFinite(a.profitFactor) ? a.profitFactor : 999;
        const pfB = isFinite(b.profitFactor) ? b.profitFactor : 999;
        return pfA > pfB ? 'A' : pfB > pfA ? 'B' : null;
      },
    },
    {
      label: 'Avg R',
      render: s => s.avgR == null
        ? <span className="text-ink-tertiary">—</span>
        : <span className={`font-semibold ${s.avgR >= 0 ? 'text-[#4AD295]' : 'text-[#E24B4A]'}`}>{s.avgR >= 0 ? '+' : ''}{s.avgR.toFixed(2)}R</span>,
      better: (a, b) => {
        if (a.avgR == null && b.avgR == null) return null;
        if (a.avgR == null) return 'B';
        if (b.avgR == null) return 'A';
        return a.avgR > b.avgR ? 'A' : b.avgR > a.avgR ? 'B' : null;
      },
    },
    {
      label: 'Largest win',
      render: s => s.largestWin === 0
        ? <span className="text-ink-tertiary">—</span>
        : <Change value={s.largestWin} format="currency" decimals={2} />,
      better: (a, b) => a.largestWin > b.largestWin ? 'A' : b.largestWin > a.largestWin ? 'B' : null,
    },
    {
      label: 'Largest loss',
      render: s => s.largestLoss === 0
        ? <span className="text-ink-tertiary">—</span>
        : <Change value={s.largestLoss} format="currency" decimals={2} />,
      // less negative = better
      better: (a, b) => a.largestLoss > b.largestLoss ? 'A' : b.largestLoss > a.largestLoss ? 'B' : null,
    },
    {
      label: 'Expectancy',
      render: s => s.count === 0
        ? <span className="text-ink-tertiary">—</span>
        : <Change value={s.expectancy} format="currency" decimals={2} />,
      better: (a, b) => a.expectancy > b.expectancy ? 'A' : b.expectancy > a.expectancy ? 'B' : null,
    },
  ];
}

const METRIC_ROWS = buildMetricRows();

// ---------------------------------------------------------------------------
// Save/Load panel
// ---------------------------------------------------------------------------

interface SaveLoadProps {
  filterA: TradeFilter;
  filterB: TradeFilter;
  onLoad: (filterA: TradeFilter, filterB: TradeFilter) => void;
}

const SaveLoadPanel: React.FC<SaveLoadProps> = ({ filterA, filterB, onLoad }) => {
  const { comparisons, saveComparison, deleteComparison, isLoading } = useSavedComparisons();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    saveComparison(trimmed, filterA, filterB);
    setName('');
    setSaving(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Save */}
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Comparison name..."
          className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-1.5 text-xs text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-[#C9A646]/50 transition-colors w-44"
        />
        <Button
          variant="goldOutline"
          size="compact"
          showArrow={false}
          onClick={handleSave}
          disabled={!name.trim() || saving}
        >
          <Save className="h-3.5 w-3.5 mr-1" />
          Save
        </Button>
      </div>

      {/* Load dropdown */}
      {comparisons.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-md text-ink-secondary hover:text-ink-primary transition-colors"
          >
            Load saved <ChevronDown className="h-3 w-3" />
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-surface-1 border border-white/[0.1] rounded-lg shadow-xl z-50 overflow-hidden">
              {isLoading && <div className="px-3 py-2 text-xs text-ink-tertiary">Loading…</div>}
              {comparisons.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.04] transition-colors group"
                >
                  <button
                    onClick={() => { onLoad(c.groupA, c.groupB); setOpen(false); }}
                    className="text-xs text-ink-primary text-left flex-1 truncate"
                  >
                    {c.name}
                  </button>
                  <button
                    onClick={() => deleteComparison(c.id)}
                    className="ml-2 text-ink-tertiary hover:text-[#E24B4A] transition-colors opacity-0 group-hover:opacity-100"
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function JournalReportsCompare() {
  const { data: trades = [], isLoading } = useTrades();

  const [filterA, setFilterA] = useState<TradeFilter>({});
  const [filterB, setFilterB] = useState<TradeFilter>({});

  // Derive all tags from trades
  const allTags = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const t of trades) {
      for (const tag of t.tags ?? []) set.add(tag);
    }
    return Array.from(set).sort();
  }, [trades]);

  const groupA = useMemo(() => filterTrades(trades, filterA), [trades, filterA]);
  const groupB = useMemo(() => filterTrades(trades, filterB), [trades, filterB]);

  const statsA = useMemo(() => computeGroupStats(groupA), [groupA]);
  const statsB = useMemo(() => computeGroupStats(groupB), [groupB]);

  const handleLoad = useCallback((fa: TradeFilter, fb: TradeFilter) => {
    setFilterA(fa);
    setFilterB(fb);
  }, []);

  const neitherHasTrades = !isLoading && statsA.count === 0 && statsB.count === 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-2xl font-semibold text-ink-primary">Compare Groups</h2>
        <p className="text-sm text-ink-tertiary mt-1">
          Filter two groups of trades and compare their performance side by side.
        </p>
      </div>

      {/* Save/Load */}
      <SaveLoadPanel filterA={filterA} filterB={filterB} onLoad={handleLoad} />

      {/* Filter builders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card padding="compact">
          <FilterBuilder
            label="Group A"
            filter={filterA}
            onChange={setFilterA}
            allTags={allTags}
          />
          <p className="mt-3 text-[10px] text-ink-tertiary">
            {isLoading ? 'Loading…' : `${groupA.length} trade${groupA.length !== 1 ? 's' : ''} matched`}
          </p>
        </Card>

        <Card padding="compact">
          <FilterBuilder
            label="Group B"
            filter={filterB}
            onChange={setFilterB}
            allTags={allTags}
          />
          <p className="mt-3 text-[10px] text-ink-tertiary">
            {isLoading ? 'Loading…' : `${groupB.length} trade${groupB.length !== 1 ? 's' : ''} matched`}
          </p>
        </Card>
      </div>

      {/* Initial / empty guidance */}
      {neitherHasTrades && (
        <Card padding="spacious">
          <div className="text-center text-ink-tertiary text-sm py-6 space-y-2">
            <p className="font-medium text-ink-primary">No trades matched</p>
            <p>Use the filters above to select trades for Group A and Group B,<br />then compare their metrics below.</p>
          </div>
        </Card>
      )}

      {/* Comparison table */}
      {!neitherHasTrades && (
        <Card padding="compact">
          <h3 className="text-sm font-semibold text-ink-primary mb-4">Metrics Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-3 py-2 text-left text-xs font-medium text-ink-tertiary min-w-[140px]">
                    Metric
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#C9A646]">
                    Group A
                    <span className="ml-1 text-ink-tertiary font-normal">({statsA.count})</span>
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#A78BFA]">
                    Group B
                    <span className="ml-1 text-ink-tertiary font-normal">({statsB.count})</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {METRIC_ROWS.map(row => {
                  const winner = row.better(statsA, statsB);

                  return (
                    <tr
                      key={row.label}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-3 py-2.5 text-ink-secondary text-xs">{row.label}</td>
                      <td className={`px-3 py-2.5 ${winner === 'A' ? 'bg-[#C9A646]/[0.06]' : ''}`}>
                        <div className="flex items-center gap-1.5">
                          {row.render(statsA)}
                          {winner === 'A' && (
                            <span className="text-[9px] bg-[#C9A646]/20 text-[#C9A646] px-1 rounded font-semibold">BETTER</span>
                          )}
                        </div>
                      </td>
                      <td className={`px-3 py-2.5 ${winner === 'B' ? 'bg-[#A78BFA]/[0.06]' : ''}`}>
                        <div className="flex items-center gap-1.5">
                          {row.render(statsB)}
                          {winner === 'B' && (
                            <span className="text-[9px] bg-[#A78BFA]/20 text-[#A78BFA] px-1 rounded font-semibold">BETTER</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
