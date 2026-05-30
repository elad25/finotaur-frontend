/**
 * RulesList — displays all AutoTagRules in a list.
 *
 * Each row shows:
 *  - Tag chip
 *  - Human-readable condition summary ("session = newyork AND side = LONG")
 *  - Active toggle
 *  - Edit + Delete buttons
 *
 * Empty state rendered when rules array is empty.
 */

import { Card } from '@/components/ds/Card';
import type { AutoTagCondition, AutoTagRule } from '@/lib/journal/autotag';
import { Tag, ToggleLeft, ToggleRight, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Condition → human-readable text ─────────────────────────────────────────

const FIELD_LABELS: Record<AutoTagCondition['field'], string> = {
  session: 'session',
  side: 'side',
  symbol: 'symbol',
  outcome: 'outcome',
  pnl: 'PnL',
  rr: 'R-multiple',
};

const OP_LABELS: Record<AutoTagCondition['op'], string> = {
  eq: '=',
  neq: '≠',
  gt: '>',
  lt: '<',
  contains: 'contains',
};

/** Converts an array of conditions into a readable summary string. */
export function conditionSummary(conditions: AutoTagCondition[]): string {
  if (conditions.length === 0) return 'No conditions';
  return conditions
    .map(c => `${FIELD_LABELS[c.field]} ${OP_LABELS[c.op]} ${c.value}`)
    .join(' AND ');
}

// ─── Single rule row ──────────────────────────────────────────────────────────

interface RuleRowProps {
  rule: AutoTagRule;
  matchCount?: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

function RuleRow({ rule, matchCount, onEdit, onDelete, onToggle }: RuleRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors',
        rule.isActive
          ? 'border-border-ds-subtle bg-surface-1'
          : 'border-border-ds-subtle/40 bg-surface-1/50 opacity-60',
      )}
    >
      {/* Tag chip */}
      <span className="flex items-center gap-1 rounded-full bg-gold-primary/10 border border-gold-border px-2 py-0.5 text-xs font-semibold text-gold-primary whitespace-nowrap">
        <Tag size={11} />
        {rule.tag}
      </span>

      {/* Conditions summary */}
      <span className="text-xs text-ink-tertiary truncate flex-1 min-w-0">
        {conditionSummary(rule.conditions)}
      </span>

      {/* Match count — optional */}
      {matchCount !== undefined && (
        <span className="text-xs text-ink-secondary tabular-nums shrink-0">
          {matchCount} match
        </span>
      )}

      {/* Active toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="text-ink-tertiary hover:text-gold-primary transition-colors"
        title={rule.isActive ? 'Deactivate rule' : 'Activate rule'}
      >
        {rule.isActive ? (
          <ToggleRight size={18} className="text-gold-primary" />
        ) : (
          <ToggleLeft size={18} />
        )}
      </button>

      {/* Edit */}
      <button
        type="button"
        onClick={onEdit}
        className="text-ink-tertiary hover:text-ink-primary transition-colors"
        title="Edit rule"
      >
        <Pencil size={14} />
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        className="text-ink-tertiary hover:text-red-400 transition-colors"
        title="Delete rule"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface RulesListProps {
  rules: AutoTagRule[];
  /** Optional per-rule match counts keyed by rule.id. */
  matchCounts?: Record<string, number>;
  onEdit: (rule: AutoTagRule) => void;
  onDelete: (rule: AutoTagRule) => void;
  onToggle: (rule: AutoTagRule) => void;
}

// ─── List component ───────────────────────────────────────────────────────────

export default function RulesList({
  rules,
  matchCounts,
  onEdit,
  onDelete,
  onToggle,
}: RulesListProps) {
  if (rules.length === 0) {
    return (
      <p className="text-xs text-ink-tertiary">
        No rules yet. Create one to start auto-tagging.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rules.map(rule => (
        <RuleRow
          key={rule.id}
          rule={rule}
          matchCount={matchCounts?.[rule.id]}
          onEdit={() => onEdit(rule)}
          onDelete={() => onDelete(rule)}
          onToggle={() => onToggle(rule)}
        />
      ))}
    </div>
  );
}
