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
 *
 * Dropdowns use Radix Select (not native <select>) so the popup is fully
 * styleable — a matte-black surface with gold hover/selected states, instead of
 * the OS-default white list with a jarring blue highlight that native selects
 * force on Windows.
 */

import * as SelectPrimitive from '@radix-ui/react-select';
import type { AutoTagCondition } from '@/lib/journal/autotag';
import { cn } from '@/lib/utils';
import { X, ChevronDown, Check } from 'lucide-react';

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

// ─── Shared styling ──────────────────────────────────────────────────────────

// Free-text / number inputs keep the native control; [color-scheme:dark] keeps
// the number spinners on-theme.
const textInputClass =
  'rounded-md border border-border-ds-subtle bg-surface-1 px-2 py-1 text-xs text-ink-primary ' +
  '[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-gold-primary transition-colors';

// ─── Luxe black-and-gold dropdown (Radix-powered) ────────────────────────────

interface LuxOption {
  value: string;
  label: string;
}

function LuxSelect({
  value,
  onValueChange,
  options,
  triggerClassName,
  ariaLabel,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: LuxOption[];
  triggerClassName?: string;
  ariaLabel?: string;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center justify-between gap-1.5 rounded-md border border-border-ds-subtle',
          'bg-surface-1 px-2.5 py-1 text-xs text-ink-primary outline-none transition-colors',
          'hover:border-gold-primary/40',
          'focus:ring-1 focus:ring-gold-primary',
          'data-[state=open]:border-gold-primary/60 data-[state=open]:ring-1 data-[state=open]:ring-gold-primary/30',
          triggerClassName,
        )}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-3 w-3 shrink-0 text-ink-tertiary transition-transform duration-200 data-[state=open]:rotate-180" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'z-50 overflow-hidden rounded-lg border border-gold-primary/20',
            'bg-[#0a0a0a] p-1 shadow-xl shadow-black/60',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          )}
        >
          <SelectPrimitive.Viewport className="min-w-[var(--radix-select-trigger-width)]">
            {options.map(opt => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  'relative flex cursor-pointer select-none items-center justify-between gap-3',
                  'rounded-md px-2.5 py-1.5 text-xs text-ink-secondary outline-none transition-colors',
                  'data-[highlighted]:bg-gold-primary/10 data-[highlighted]:text-gold-primary',
                  'data-[state=checked]:text-gold-primary data-[state=checked]:font-medium',
                )}
              >
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check className="h-3 w-3 text-gold-primary" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ConditionEditorProps {
  condition: AutoTagCondition;
  onChange: (updated: AutoTagCondition) => void;
  onRemove: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ConditionEditor({ condition, onChange, onRemove }: ConditionEditorProps) {
  const meta = FIELD_META[condition.field];

  function handleFieldChange(field: AutoTagCondition['field']) {
    const newMeta = FIELD_META[field];
    // Reset op to first available; seed value with a valid default for the kind
    // (enum → first option, so the Radix Select always shows a selected value).
    const defaultValue =
      newMeta.kind === 'numeric'
        ? 0
        : newMeta.kind === 'enum' && newMeta.enumValues
          ? newMeta.enumValues[0]
          : '';
    onChange({ field, op: newMeta.ops[0], value: defaultValue });
  }

  function handleOpChange(op: AutoTagCondition['op']) {
    onChange({ ...condition, op });
  }

  function handleValueChange(raw: string) {
    const value = meta.kind === 'numeric' ? Number(raw) : raw;
    onChange({ ...condition, value });
  }

  const fieldOptions: LuxOption[] = (Object.keys(FIELD_META) as AutoTagCondition['field'][]).map(
    f => ({ value: f, label: FIELD_META[f].label }),
  );
  const opOptions: LuxOption[] = meta.ops.map(op => ({ value: op, label: OP_LABELS[op] }));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Field */}
      <LuxSelect
        ariaLabel="Condition field"
        value={condition.field}
        onValueChange={v => handleFieldChange(v as AutoTagCondition['field'])}
        options={fieldOptions}
        triggerClassName="w-32"
      />

      {/* Operator */}
      <LuxSelect
        ariaLabel="Condition operator"
        value={condition.op}
        onValueChange={v => handleOpChange(v as AutoTagCondition['op'])}
        options={opOptions}
        triggerClassName="w-24"
      />

      {/* Value */}
      {meta.kind === 'numeric' ? (
        <input
          type="number"
          step="0.01"
          value={condition.value as number}
          onChange={e => handleValueChange(e.target.value)}
          className={cn(textInputClass, 'w-24')}
          placeholder="0"
        />
      ) : meta.kind === 'enum' && meta.enumValues ? (
        <LuxSelect
          ariaLabel="Condition value"
          value={condition.value as string}
          onValueChange={handleValueChange}
          options={meta.enumValues.map(v => ({ value: v, label: v }))}
          triggerClassName="w-32"
        />
      ) : (
        <input
          type="text"
          value={condition.value as string}
          onChange={e => handleValueChange(e.target.value)}
          className={cn(textInputClass, 'w-28')}
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
