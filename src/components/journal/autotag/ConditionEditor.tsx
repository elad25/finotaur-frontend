/**
 * ConditionEditor — edit a single AutoTagCondition.
 *
 * Field dropdown → op dropdown (filtered to sensible ops per field) → value input.
 * Numeric fields (pnl/rr): gt/lt/eq ops, number input.
 * String fields (session/side/symbol/outcome): eq/neq/contains ops.
 *   - side: select LONG/SHORT
 *   - outcome: select WIN/LOSS/BE/OPEN
 *   - session: select asia/london/newyork
 *   - symbol: free-text input
 */

import type { AutoTagCondition } from '@/lib/journal/autotag';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

// ─── Metadata ────────────────────────────────────────────────────────────────

type FieldMeta = {
  label: string;
  kind: 'numeric' | 'enum' | 'text';
  ops: AutoTagCondition['op'][];
  enumValues?: string[];
};

const FIELD_META: Record<AutoTagCondition['field'], FieldMeta> = {
  pnl: {
    label: 'PnL ($)',
    kind: 'numeric',
    ops: ['gt', 'lt', 'eq'],
  },
  rr: {
    label: 'R-multiple',
    kind: 'numeric',
    ops: ['gt', 'lt', 'eq'],
  },
  side: {
    label: 'Side',
    kind: 'enum',
    ops: ['eq', 'neq'],
    enumValues: ['LONG', 'SHORT'],
  },
  outcome: {
    label: 'Outcome',
    kind: 'enum',
    ops: ['eq', 'neq'],
    enumValues: ['WIN', 'LOSS', 'BE', 'OPEN'],
  },
  session: {
    label: 'Session',
    kind: 'enum',
    ops: ['eq', 'neq', 'contains'],
    enumValues: ['asia', 'london', 'newyork'],
  },
  symbol: {
    label: 'Symbol',
    kind: 'text',
    ops: ['eq', 'neq', 'contains'],
  },
};

const OP_LABELS: Record<AutoTagCondition['op'], string> = {
  eq: '=',
  neq: '≠',
  gt: '>',
  lt: '<',
  contains: 'contains',
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface ConditionEditorProps {
  condition: AutoTagCondition;
  onChange: (updated: AutoTagCondition) => void;
  onRemove: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const inputBase =
  'rounded-md border border-border-ds-subtle bg-surface-1 px-2 py-1 text-xs text-ink-primary ' +
  'focus:outline-none focus:ring-1 focus:ring-gold-primary transition-colors';

// Native <option> elements ignore the parent's translucent bg and fall back to
// the OS default (white) when opened — producing white-on-white text. Force an
// opaque matte-black background with gold text for a luxe black-and-gold dropdown.
const optionClass = 'bg-[#0a0a0a] text-gold-primary';

export default function ConditionEditor({ condition, onChange, onRemove }: ConditionEditorProps) {
  const meta = FIELD_META[condition.field];

  function handleFieldChange(field: AutoTagCondition['field']) {
    const newMeta = FIELD_META[field];
    // Reset op to first available for the new field; reset value to empty string
    onChange({ field, op: newMeta.ops[0], value: newMeta.kind === 'numeric' ? 0 : '' });
  }

  function handleOpChange(op: AutoTagCondition['op']) {
    onChange({ ...condition, op });
  }

  function handleValueChange(raw: string) {
    const value = meta.kind === 'numeric' ? Number(raw) : raw;
    onChange({ ...condition, value });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Field */}
      <select
        value={condition.field}
        onChange={e => handleFieldChange(e.target.value as AutoTagCondition['field'])}
        className={cn(inputBase, 'w-32')}
      >
        {(Object.keys(FIELD_META) as AutoTagCondition['field'][]).map(f => (
          <option key={f} value={f} className={optionClass}>
            {FIELD_META[f].label}
          </option>
        ))}
      </select>

      {/* Operator */}
      <select
        value={condition.op}
        onChange={e => handleOpChange(e.target.value as AutoTagCondition['op'])}
        className={cn(inputBase, 'w-24')}
      >
        {meta.ops.map(op => (
          <option key={op} value={op} className={optionClass}>
            {OP_LABELS[op]}
          </option>
        ))}
      </select>

      {/* Value */}
      {meta.kind === 'numeric' ? (
        <input
          type="number"
          step="0.01"
          value={condition.value as number}
          onChange={e => handleValueChange(e.target.value)}
          className={cn(inputBase, 'w-24')}
          placeholder="0"
        />
      ) : meta.kind === 'enum' && meta.enumValues ? (
        <select
          value={condition.value as string}
          onChange={e => handleValueChange(e.target.value)}
          className={cn(inputBase, 'w-32')}
        >
          {meta.enumValues.map(v => (
            <option key={v} value={v} className={optionClass}>
              {v}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={condition.value as string}
          onChange={e => handleValueChange(e.target.value)}
          className={cn(inputBase, 'w-28')}
          placeholder="value"
        />
      )}

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-md p-1 text-ink-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
        title="Remove condition"
      >
        <X size={14} />
      </button>
    </div>
  );
}
