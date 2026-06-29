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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AccountPicker } from './AccountPicker';
import type { AutomationRiskRule, RiskBreachAction, SelectedAccount } from '../lib/automationTypes';

interface RiskRuleCardProps {
  rule: AutomationRiskRule;
  onSave: (updated: Omit<AutomationRiskRule, 'user_id' | 'created_at' | 'updated_at'>) => void;
  onDelete: (id: string) => void;
  isSaving?: boolean;
}

// ── Numeric field groups ──────────────────────────────────────────────────────

type LossField =
  | 'daily_loss_limit_usd'
  | 'max_loss_per_trade_usd'
  | 'max_weekly_loss_usd';

type ProfitField =
  | 'daily_profit_target_usd'
  | 'weekly_profit_target_usd'
  | 'trade_profit_target_usd';

type PositionField =
  | 'max_contracts'
  | 'max_position_size'
  | 'max_position_usd'
  | 'max_trades_per_day';

type TiltField =
  | 'tilt_loss_streak'
  | 'tilt_cooldown_minutes';

type NumericField = LossField | ProfitField | PositionField | TiltField;

const LOSS_FIELDS: LossField[] = [
  'daily_loss_limit_usd',
  'max_loss_per_trade_usd',
  'max_weekly_loss_usd',
];

const PROFIT_FIELDS: ProfitField[] = [
  'daily_profit_target_usd',
  'weekly_profit_target_usd',
  'trade_profit_target_usd',
];

const POSITION_FIELDS: PositionField[] = [
  'max_contracts',
  'max_position_size',
  'max_position_usd',
  'max_trades_per_day',
];

const TILT_FIELDS: TiltField[] = [
  'tilt_loss_streak',
  'tilt_cooldown_minutes',
];

const FIELD_LABELS: Record<NumericField, string> = {
  daily_loss_limit_usd: 'Daily loss limit ($)',
  max_loss_per_trade_usd: 'Max loss per trade ($)',
  max_weekly_loss_usd: 'Weekly loss limit ($)',
  daily_profit_target_usd: 'Daily profit target ($)',
  weekly_profit_target_usd: 'Weekly profit target ($)',
  trade_profit_target_usd: 'Per-trade profit target ($)',
  max_contracts: 'Max open contracts (per instrument)',
  max_position_size: 'Max total open contracts (account)',
  max_position_usd: 'Max position size ($)',
  max_trades_per_day: 'Max trades per day',
  tilt_loss_streak: 'Tilt: consecutive losses',
  tilt_cooldown_minutes: 'Tilt cooldown (minutes)',
};

const BREACH_ACTION_LABELS: Record<RiskBreachAction, string> = {
  pause_copies: 'Pause copies',
  stop_copies: 'Stop copier',
  close_lock: 'Flatten & lock',
};

const BREACH_ACTION_HELPER: Record<RiskBreachAction, string> = {
  pause_copies: 'Temporarily stop copying new orders until the period resets.',
  stop_copies: 'Stop the copier entirely until manually resumed.',
  close_lock: 'Flatten all positions and lock the account until period reset.',
};

// ── Helper ────────────────────────────────────────────────────────────────────

function parseNum(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) || v.trim() === '' ? null : n;
}

function initNumerics(rule: AutomationRiskRule): Record<NumericField, string> {
  return {
    daily_loss_limit_usd: rule.daily_loss_limit_usd?.toString() ?? '',
    max_loss_per_trade_usd: rule.max_loss_per_trade_usd?.toString() ?? '',
    max_weekly_loss_usd: rule.max_weekly_loss_usd?.toString() ?? '',
    daily_profit_target_usd: rule.daily_profit_target_usd?.toString() ?? '',
    weekly_profit_target_usd: rule.weekly_profit_target_usd?.toString() ?? '',
    trade_profit_target_usd: rule.trade_profit_target_usd?.toString() ?? '',
    max_contracts: rule.max_contracts?.toString() ?? '',
    max_position_size: rule.max_position_size?.toString() ?? '',
    max_position_usd: rule.max_position_usd?.toString() ?? '',
    max_trades_per_day: rule.max_trades_per_day?.toString() ?? '',
    tilt_loss_streak: rule.tilt_loss_streak?.toString() ?? '',
    tilt_cooldown_minutes: rule.tilt_cooldown_minutes?.toString() ?? '',
  };
}

// ── Sub-component: labeled numeric input ──────────────────────────────────────

function NumericInput({
  id,
  field,
  value,
  onChange,
  note,
}: {
  id: string;
  field: NumericField;
  value: string;
  onChange: (v: string) => void;
  note?: string;
}) {
  const isUsd = field.endsWith('_usd');
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-zinc-400">
        {FIELD_LABELS[field]}
      </Label>
      <Input
        id={id}
        type="number"
        min={0}
        step={isUsd ? '0.01' : '1'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="h-7 text-sm"
      />
      {note && <p className="text-[10px] text-zinc-500 leading-snug">{note}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RiskRuleCard({ rule, onSave, onDelete, isSaving }: RiskRuleCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Label + toggles
  const [label, setLabel] = useState(rule.label);
  const [enforce, setEnforce] = useState(rule.enforce);
  const [isActive, setIsActive] = useState(rule.is_active);

  // Account identity (replaces legacy broker_connection_id scoping)
  const [accountId, setAccountId] = useState<string | null>(rule.account_id ?? null);
  const [accountName, setAccountName] = useState<string | null>(rule.account_name ?? null);

  // Breach action
  const [breachAction, setBreachAction] = useState<RiskBreachAction>(
    rule.risk_breach_action ?? 'pause_copies',
  );

  // All numeric fields as display strings
  const [numerics, setNumerics] = useState<Record<NumericField, string>>(() =>
    initNumerics(rule),
  );

  const setNumeric = (field: NumericField) => (v: string) =>
    setNumerics((prev) => ({ ...prev, [field]: v }));

  const handleAccountChange = (acc: SelectedAccount | null) => {
    setAccountId(acc?.account_id ?? null);
    setAccountName(acc?.account_name ?? null);
  };

  const handleSave = () => {
    onSave({
      id: rule.id,
      // Keep broker_connection_id null for account-based rules going forward.
      // Existing rows that had a value keep it via the rule object — we don't
      // overwrite with null here to avoid silent data loss on pre-existing rows.
      broker_connection_id: rule.broker_connection_id,
      account_id: accountId,
      account_name: accountName,
      label: label.trim() || 'Unnamed rule',
      enforce,
      is_active: isActive,
      risk_breach_action: breachAction,
      // Loss limits
      daily_loss_limit_usd: parseNum(numerics.daily_loss_limit_usd),
      max_loss_per_trade_usd: parseNum(numerics.max_loss_per_trade_usd),
      max_weekly_loss_usd: parseNum(numerics.max_weekly_loss_usd),
      // Profit targets
      trade_profit_target_usd: parseNum(numerics.trade_profit_target_usd),
      daily_profit_target_usd: parseNum(numerics.daily_profit_target_usd),
      weekly_profit_target_usd: parseNum(numerics.weekly_profit_target_usd),
      // Position / volume limits
      max_contracts: parseNum(numerics.max_contracts),
      max_position_size: parseNum(numerics.max_position_size),
      max_position_usd: parseNum(numerics.max_position_usd),
      max_trades_per_day: parseNum(numerics.max_trades_per_day),
      // Tilt protection
      tilt_loss_streak: parseNum(numerics.tilt_loss_streak),
      tilt_cooldown_minutes: parseNum(numerics.tilt_cooldown_minutes),
    });
  };

  const activeFieldCount = Object.values(numerics).filter((v) => v !== '').length;

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
          {accountName ? `Account: ${accountName}` : 'Global'} ·{' '}
          {activeFieldCount > 0 ? `${activeFieldCount} limit${activeFieldCount !== 1 ? 's' : ''} set` : 'No limits set'}
        </p>
      )}

      {/* Expanded form */}
      {expanded && (
        <div className="pl-6 space-y-5">

          {/* Account scope */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Account scope</Label>
            <AccountPicker
              value={accountId}
              onChange={handleAccountChange}
              allowGlobal
              className="h-8 text-sm"
            />
            <p className="text-[10px] text-zinc-500">
              The NT8 agent matches rules by account name. "Global" applies to all accounts.
            </p>
          </div>

          {/* Loss limits */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Loss limits</p>
            <div className="grid grid-cols-2 gap-3">
              {LOSS_FIELDS.map((field) => (
                <NumericInput
                  key={field}
                  id={`${rule.id}-${field}`}
                  field={field}
                  value={numerics[field]}
                  onChange={setNumeric(field)}
                />
              ))}
            </div>
          </div>

          {/* Profit targets */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Profit targets</p>
            <div className="grid grid-cols-2 gap-3">
              {PROFIT_FIELDS.map((field) => (
                <NumericInput
                  key={field}
                  id={`${rule.id}-${field}`}
                  field={field}
                  value={numerics[field]}
                  onChange={setNumeric(field)}
                  note={
                    field === 'trade_profit_target_usd'
                      ? 'Requires per-position P&L — currently not enforced by the agent.'
                      : undefined
                  }
                />
              ))}
            </div>
          </div>

          {/* Position & volume limits */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Position & volume limits</p>
            <div className="grid grid-cols-2 gap-3">
              {POSITION_FIELDS.map((field) => (
                <NumericInput
                  key={field}
                  id={`${rule.id}-${field}`}
                  field={field}
                  value={numerics[field]}
                  onChange={setNumeric(field)}
                />
              ))}
            </div>
          </div>

          {/* Tilt protection */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Tilt protection</p>
            <div className="grid grid-cols-2 gap-3">
              {TILT_FIELDS.map((field) => (
                <NumericInput
                  key={field}
                  id={`${rule.id}-${field}`}
                  field={field}
                  value={numerics[field]}
                  onChange={setNumeric(field)}
                />
              ))}
            </div>
          </div>

          {/* Breach action */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">On breach</Label>
            <Select
              value={breachAction}
              onValueChange={(v) => setBreachAction(v as RiskBreachAction)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(BREACH_ACTION_LABELS) as RiskBreachAction[]).map((action) => (
                  <SelectItem key={action} value={action}>
                    {BREACH_ACTION_LABELS[action]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-zinc-500">{BREACH_ACTION_HELPER[breachAction]}</p>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <Checkbox
                checked={enforce}
                onCheckedChange={(v) => setEnforce(Boolean(v))}
              />
              Enforce (desktop agent will act on breach)
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
