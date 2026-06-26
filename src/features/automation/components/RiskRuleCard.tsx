// src/features/automation/components/RiskRuleCard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Form to edit one risk rule. Displays all numeric limits + enforce/active
// toggles. Uses ui/ inputs + ds/Card pattern from SettingsShell.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AccountPicker } from './AccountPicker';
import type { AutomationRiskRule } from '../lib/automationTypes';

interface RiskRuleCardProps {
  rule: AutomationRiskRule;
  onSave: (updated: Omit<AutomationRiskRule, 'user_id' | 'created_at' | 'updated_at'>) => void;
  onDelete: (id: string) => void;
  isSaving?: boolean;
}

type NumericField =
  | 'daily_loss_limit_usd'
  | 'max_contracts'
  | 'max_position_usd'
  | 'max_trades_per_day'
  | 'tilt_loss_streak'
  | 'tilt_cooldown_minutes';

const FIELD_LABELS: Record<NumericField, string> = {
  daily_loss_limit_usd: 'Daily loss limit ($)',
  max_contracts: 'Max open contracts',
  max_position_usd: 'Max position size ($)',
  max_trades_per_day: 'Max trades per day',
  tilt_loss_streak: 'Tilt: consecutive losses',
  tilt_cooldown_minutes: 'Tilt cooldown (minutes)',
};

export function RiskRuleCard({ rule, onSave, onDelete, isSaving }: RiskRuleCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Local form state mirroring the rule
  const [label, setLabel] = useState(rule.label);
  const [connectionId, setConnectionId] = useState<string | null>(rule.broker_connection_id);
  const [enforce, setEnforce] = useState(rule.enforce);
  const [isActive, setIsActive] = useState(rule.is_active);
  const [numerics, setNumerics] = useState<Record<NumericField, string>>({
    daily_loss_limit_usd: rule.daily_loss_limit_usd?.toString() ?? '',
    max_contracts: rule.max_contracts?.toString() ?? '',
    max_position_usd: rule.max_position_usd?.toString() ?? '',
    max_trades_per_day: rule.max_trades_per_day?.toString() ?? '',
    tilt_loss_streak: rule.tilt_loss_streak?.toString() ?? '',
    tilt_cooldown_minutes: rule.tilt_cooldown_minutes?.toString() ?? '',
  });

  const parseNum = (v: string): number | null => {
    const n = parseFloat(v);
    return isNaN(n) || v.trim() === '' ? null : n;
  };

  const handleSave = () => {
    onSave({
      id: rule.id,
      broker_connection_id: connectionId,
      label: label.trim() || 'Unnamed rule',
      enforce,
      is_active: isActive,
      daily_loss_limit_usd: parseNum(numerics.daily_loss_limit_usd),
      max_contracts: parseNum(numerics.max_contracts),
      max_position_usd: parseNum(numerics.max_position_usd),
      max_trades_per_day: parseNum(numerics.max_trades_per_day),
      tilt_loss_streak: parseNum(numerics.tilt_loss_streak),
      tilt_cooldown_minutes: parseNum(numerics.tilt_cooldown_minutes),
    });
  };

  return (
    <Card padding="compact" className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Checkbox
            checked={isActive}
            onCheckedChange={(v) => setIsActive(Boolean(v))}
            aria-label="Rule active"
          />
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-7 text-sm font-medium bg-transparent border-transparent hover:border-zinc-700 focus:border-zinc-600 px-1 min-w-0 w-40"
            placeholder="Rule name"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label={expanded ? 'Collapse rule' : 'Expand rule'}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onDelete(rule.id)}
            className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
            aria-label="Delete rule"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scope + quick summary */}
      {!expanded && (
        <p className="text-xs text-zinc-500 pl-6">
          {connectionId ? 'Account-scoped' : 'Global'} ·{' '}
          {Object.entries(numerics)
            .filter(([, v]) => v !== '')
            .map(([k]) => FIELD_LABELS[k as NumericField])
            .join(', ') || 'No limits set'}
        </p>
      )}

      {/* Expanded form */}
      {expanded && (
        <div className="pl-6 space-y-4">
          {/* Account scope */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Account scope</Label>
            <AccountPicker
              value={connectionId}
              onChange={setConnectionId}
              includeGlobal
              className="h-8 text-sm"
            />
          </div>

          {/* Numeric limits grid */}
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(FIELD_LABELS) as NumericField[]).map((field) => (
              <div key={field} className="space-y-1">
                <Label htmlFor={`${rule.id}-${field}`} className="text-xs text-zinc-400">
                  {FIELD_LABELS[field]}
                </Label>
                <Input
                  id={`${rule.id}-${field}`}
                  type="number"
                  min={0}
                  step={field.endsWith('_usd') ? '0.01' : '1'}
                  value={numerics[field]}
                  onChange={(e) =>
                    setNumerics((prev) => ({ ...prev, [field]: e.target.value }))
                  }
                  placeholder="—"
                  className="h-7 text-sm"
                />
              </div>
            ))}
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <Checkbox
                checked={enforce}
                onCheckedChange={(v) => setEnforce(Boolean(v))}
              />
              Enforce (desktop agent will pause on breach)
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="goldOutline"
              size="compact"
              showArrow={false}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : 'Save rule'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
