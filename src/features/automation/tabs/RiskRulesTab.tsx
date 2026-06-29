// src/features/automation/tabs/RiskRulesTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Risk Monitor panel (today's alerts) + list of editable risk rules.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ds/Button';
import { DataState } from '@/components/ds/DataState';
import { RiskMonitorPanel } from '../components/RiskMonitorPanel';
import { RiskRuleCard } from '../components/RiskRuleCard';
import { useRiskMonitor } from '../hooks/useRiskMonitor';
import { useRiskRules } from '../hooks/useRiskRules';
import type { AutomationRiskRule } from '../lib/automationTypes';

// Blank rule skeleton used when "Add rule" is clicked.
function newRuleDefaults(userId: string): AutomationRiskRule {
  const now = new Date().toISOString();
  return {
    id: `new-${Date.now()}`, // placeholder — replaced by DB on insert
    user_id: userId,
    broker_connection_id: null,
    account_id: null,
    account_name: null,
    label: 'New rule',
    // Loss limits
    daily_loss_limit_usd: null,
    max_loss_per_trade_usd: null,
    max_weekly_loss_usd: null,
    // Profit targets
    trade_profit_target_usd: null,
    daily_profit_target_usd: null,
    weekly_profit_target_usd: null,
    // Position / volume limits
    max_contracts: null,
    max_position_size: null,
    max_position_usd: null,
    max_trades_per_day: null,
    // Tilt protection
    tilt_loss_streak: null,
    tilt_cooldown_minutes: null,
    // Breach action
    risk_breach_action: 'pause_copies',
    enforce: false,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
}

export default function RiskRulesTab() {
  const { alerts, isLoading: monitorLoading, isError: monitorError } = useRiskMonitor();
  const { rules, isLoading, isError, error, refetch, upsertRule, deleteRule } = useRiskRules();

  const [savingId, setSavingId] = useState<string | null>(null);
  // Locally-staged new rules (not yet persisted) keyed by placeholder id
  const [pendingNew, setPendingNew] = useState<AutomationRiskRule[]>([]);

  const handleAddRule = () => {
    // We don't know the userId here but upsertRule will add it server-side
    // so we pass a placeholder — it's only used for display until save.
    setPendingNew((prev) => [...prev, newRuleDefaults('')]);
  };

  const handleSave = async (updated: Omit<AutomationRiskRule, 'user_id' | 'created_at' | 'updated_at'>) => {
    const isPending = pendingNew.some((r) => r.id === updated.id);
    const { id, ...rest } = updated;
    setSavingId(id);
    // For pending (new) rules omit the placeholder id so the DB generates a real UUID.
    const payload = isPending ? rest : { ...rest, id };
    const result = await upsertRule(payload as Parameters<typeof upsertRule>[0]);
    setSavingId(null);
    if (result.success && isPending) {
      setPendingNew((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleDelete = async (id: string) => {
    // If it's a pending-new rule, just remove from local state
    if (pendingNew.some((r) => r.id === id)) {
      setPendingNew((prev) => prev.filter((r) => r.id !== id));
      return;
    }
    await deleteRule(id);
  };

  const allRules = [...rules, ...pendingNew];

  return (
    <div className="space-y-6">
      {/* Live monitor */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
          Today's Risk Status
        </h2>
        {monitorLoading || monitorError ? (
          <DataState
            isLoading={monitorLoading}
            isError={monitorError}
            data={undefined}
            onRetry={refetch}
          >
            {() => null}
          </DataState>
        ) : (
          <RiskMonitorPanel alerts={alerts} hideOk />
        )}
      </section>

      {/* Rules list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            Risk Rules
          </h2>
          <Button
            variant="goldOutline"
            size="compact"
            showArrow={false}
            onClick={handleAddRule}
          >
            <Plus className="h-3.5 w-3.5" />
            Add rule
          </Button>
        </div>

        <DataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          data={allRules}
          onRetry={refetch}
          empty={
            <p className="text-sm text-zinc-500 py-6 text-center">
              No risk rules yet. Click "Add rule" to create one.
            </p>
          }
        >
          {(data) => (
            <div className="space-y-3">
              {data.map((rule) => (
                <RiskRuleCard
                  key={rule.id}
                  rule={rule}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  isSaving={savingId === rule.id}
                />
              ))}
            </div>
          )}
        </DataState>
      </section>
    </div>
  );
}
