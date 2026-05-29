/**
 * RuleBuilder — create or edit a single AutoTagRule.
 *
 * Props:
 *  - initial: optional partial rule to pre-populate (edit mode)
 *  - onSave(tag, conditions): called when user clicks Save
 *  - onCancel?: optional cancel handler
 *
 * Condition rows are AND-logic. Each row renders a ConditionEditor.
 * Save is disabled until tag name is non-empty and at least one condition exists.
 */

import { useState } from 'react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import ConditionEditor from '@/components/journal/autotag/ConditionEditor';
import type { AutoTagCondition, AutoTagRule } from '@/lib/journal/autotag';
import { Plus, Check, X, Tag } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyCondition(): AutoTagCondition {
  return { field: 'session', op: 'eq', value: 'london' };
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface RuleBuilderProps {
  initial?: Partial<AutoTagRule>;
  onSave: (tag: string, conditions: AutoTagCondition[]) => void;
  onCancel?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RuleBuilder({ initial, onSave, onCancel }: RuleBuilderProps) {
  const [tag, setTag] = useState<string>(initial?.tag ?? '');
  const [conditions, setConditions] = useState<AutoTagCondition[]>(
    initial?.conditions && initial.conditions.length > 0
      ? initial.conditions
      : [emptyCondition()],
  );

  function addCondition() {
    setConditions(prev => [...prev, emptyCondition()]);
  }

  function updateCondition(idx: number, updated: AutoTagCondition) {
    setConditions(prev => prev.map((c, i) => (i === idx ? updated : c)));
  }

  function removeCondition(idx: number) {
    setConditions(prev => prev.filter((_, i) => i !== idx));
  }

  function handleSave() {
    const trimmed = tag.trim();
    if (!trimmed || conditions.length === 0) return;
    onSave(trimmed, conditions);
  }

  const isValid = tag.trim().length > 0 && conditions.length > 0;
  const isEditing = !!initial?.tag;

  return (
    <Card padding="compact" variant="featured" className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Tag size={14} className="text-gold-primary" />
        <span className="text-sm font-semibold text-ink-primary">
          {isEditing ? 'Edit rule' : 'New rule'}
        </span>
      </div>

      {/* Tag name input */}
      <div className="space-y-1">
        <label className="text-xs text-ink-tertiary">Tag name</label>
        <input
          type="text"
          value={tag}
          onChange={e => setTag(e.target.value)}
          placeholder="e.g. london-long"
          className="w-full rounded-md border border-border-ds-subtle bg-surface-1 px-3 py-1.5 text-sm text-ink-primary focus:outline-none focus:ring-1 focus:ring-gold-primary transition-colors"
        />
      </div>

      {/* Conditions list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-ink-tertiary">
            Conditions — ALL must match (AND)
          </label>
          <button
            type="button"
            onClick={addCondition}
            className="flex items-center gap-1 text-xs text-gold-primary hover:text-gold-primary/80 transition-colors"
          >
            <Plus size={12} /> Add condition
          </button>
        </div>

        {conditions.map((cond, idx) => (
          <ConditionEditor
            key={idx}
            condition={cond}
            onChange={updated => updateCondition(idx, updated)}
            onRemove={() => removeCondition(idx)}
          />
        ))}

        {conditions.length === 0 && (
          <p className="text-xs text-ink-tertiary italic">Add at least one condition.</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="gold"
          size="compact"
          showArrow={false}
          disabled={!isValid}
          onClick={handleSave}
        >
          <Check size={13} /> Save rule
        </Button>
        {onCancel && (
          <Button variant="goldOutline" size="compact" onClick={onCancel}>
            <X size={13} /> Cancel
          </Button>
        )}
      </div>
    </Card>
  );
}
