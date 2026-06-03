// ============================================================
// src/pages/app/stocks/_screener/FilterPanel.tsx
// Preset pills + 4 collapsible filter groups
// ============================================================

import { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { PRESETS, FILTER_DEFS, FILTER_GROUPS } from './filters';
import type { FilterDef, FilterGroup as FilterGroupId } from './filters';
import type { Filters } from './types';
import { EMPTY_FILTERS } from './types';

// ── Shared input style (mirrors crypto Screener) ──────────────
const INPUT_CLS =
  'w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-cyan-500/30 font-mono placeholder-white/20';

const LABEL_CLS = 'text-[10px] text-white/30 uppercase block mb-1 font-medium tracking-wider';

// ── Numeric Min/Max pair ──────────────────────────────────────
const NumericPair = memo(function NumericPair({
  def,
  filters,
  onChange,
}: {
  def: Extract<FilterDef, { type: 'numeric' }>;
  filters: Filters;
  onChange: (key: keyof Filters, val: string) => void;
}) {
  const minKey = `${def.key}Min` as keyof Filters;
  const maxKey = `${def.key}Max` as keyof Filters;
  const unitLabel = def.unit ? ` (${def.unit})` : '';

  return (
    <div>
      <label className={LABEL_CLS}>
        {def.label}{unitLabel}
      </label>
      <div className="flex gap-1">
        <input
          type="number"
          value={filters[minKey] as string}
          onChange={e => onChange(minKey, e.target.value)}
          placeholder={def.minPlaceholder ?? 'Min'}
          className={INPUT_CLS}
        />
        <input
          type="number"
          value={filters[maxKey] as string}
          onChange={e => onChange(maxKey, e.target.value)}
          placeholder={def.maxPlaceholder ?? 'Max'}
          className={INPUT_CLS}
        />
      </div>
    </div>
  );
});

// ── SMA 3-state segmented control ────────────────────────────
const SmaSegment = memo(function SmaSegment({
  def,
  filters,
  onChange,
}: {
  def: Extract<FilterDef, { type: 'sma' }>;
  filters: Filters;
  onChange: (key: keyof Filters, val: string) => void;
}) {
  const options: Array<{ val: 'any' | 'above' | 'below'; label: string }> = [
    { val: 'any', label: 'Any' },
    { val: 'above', label: 'Above' },
    { val: 'below', label: 'Below' },
  ];
  const current = filters[def.key] as string;

  return (
    <div>
      <label className={LABEL_CLS}>{def.label}</label>
      <div className="inline-flex items-center rounded-lg bg-white/[0.04] border border-white/[0.06] p-0.5 w-full">
        {options.map(o => (
          <button
            key={o.val}
            onClick={() => onChange(def.key, o.val)}
            className={cn(
              'flex-1 py-1 rounded-md text-[10px] font-medium transition-all duration-150',
              current === o.val
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-white/30 hover:text-white/60',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
});

// ── Multi-select chips (sector / exchange) ────────────────────
const MultiSelect = memo(function MultiSelect({
  def,
  options,
  filters,
  onChange,
}: {
  def: Extract<FilterDef, { type: 'multiselect' }>;
  options: string[];
  filters: Filters;
  onChange: (key: keyof Filters, val: string[]) => void;
}) {
  const selected: string[] = filters[def.key] as string[];

  const toggle = useCallback(
    (opt: string) => {
      const next = selected.includes(opt)
        ? selected.filter(s => s !== opt)
        : [...selected, opt];
      onChange(def.key, next);
    },
    [def.key, selected, onChange],
  );

  if (!options.length) return null;

  return (
    <div className="col-span-full">
      <label className={LABEL_CLS}>{def.label}</label>
      <div className="flex flex-wrap gap-1 mt-1 max-h-24 overflow-y-auto pr-1">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={cn(
              'px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all duration-150',
              selected.includes(opt)
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70',
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
});

// ── Collapsible group ─────────────────────────────────────────
const FilterGroup = memo(function FilterGroupComponent({
  groupId,
  filters,
  meta,
  onChange,
}: {
  groupId: FilterGroupId;
  filters: Filters;
  meta: { sectors: string[]; exchanges: string[] };
  onChange: (key: keyof Filters, val: string | string[]) => void;
}) {
  const [open, setOpen] = useState(groupId === 'descriptive');
  const groupMeta = FILTER_GROUPS.find(g => g.id === groupId)!;
  const defs = FILTER_DEFS.filter(d => d.group === groupId);

  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
      >
        <span className="text-xs font-medium text-white/70">
          {groupMeta.icon} {groupMeta.label}
        </span>
        <span className={cn('text-white/30 text-xs transition-transform duration-200', open && 'rotate-180')}>
          ▼
        </span>
      </button>

      {open && (
        <div className="px-3 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {defs.map(def => {
            if (def.type === 'multiselect') {
              return (
                <MultiSelect
                  key={def.key}
                  def={def}
                  options={def.key === 'sector' ? meta.sectors : meta.exchanges}
                  filters={filters}
                  onChange={(k, v) => onChange(k, v as string[])}
                />
              );
            }
            if (def.type === 'sma') {
              return (
                <SmaSegment
                  key={def.key}
                  def={def}
                  filters={filters}
                  onChange={(k, v) => onChange(k, v)}
                />
              );
            }
            return (
              <NumericPair
                key={def.key}
                def={def}
                filters={filters}
                onChange={(k, v) => onChange(k, v)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

// ── Main FilterPanel ──────────────────────────────────────────
interface FilterPanelProps {
  filters: Filters;
  activePreset: string | null;
  meta: { sectors: string[]; exchanges: string[] };
  onFiltersChange: (next: Filters) => void;
  onPresetSelect: (id: string) => void;
}

export const FilterPanel = memo(function FilterPanel({
  filters,
  activePreset,
  meta,
  onFiltersChange,
  onPresetSelect,
}: FilterPanelProps) {
  const handleChange = useCallback(
    (key: keyof Filters, val: string | string[]) => {
      onFiltersChange({ ...filters, [key]: val });
    },
    [filters, onFiltersChange],
  );

  const handleReset = useCallback(() => {
    onFiltersChange({ ...EMPTY_FILTERS });
    onPresetSelect('');
  }, [onFiltersChange, onPresetSelect]);

  return (
    <div className="space-y-3">
      {/* Preset pills */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => onPresetSelect(p.id)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
              activePreset === p.id
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70',
            )}
          >
            {p.icon} {p.label}
          </button>
        ))}
        <button
          onClick={handleReset}
          className="ml-auto px-3 py-1.5 rounded-xl text-xs font-medium border border-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Collapsible filter groups */}
      <div className="space-y-2">
        {FILTER_GROUPS.map(g => (
          <FilterGroup
            key={g.id}
            groupId={g.id}
            filters={filters}
            meta={meta}
            onChange={handleChange}
          />
        ))}
      </div>
    </div>
  );
});
