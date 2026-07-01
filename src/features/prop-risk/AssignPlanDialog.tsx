// src/features/prop-risk/AssignPlanDialog.tsx
// ─────────────────────────────────────────────────────────────────
// Dialog for assigning a prop firm plan to an account.
// Lets the user pick firm → plan → phase (evaluation/funded),
// and shows a live preview of the selected plan's rules.
// ─────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ds/Button';
import { PROP_FIRM_CATALOG } from './propFirmCatalog';
import type { PropFirm, PropPlan } from './propFirmCatalog';

// ── Props ─────────────────────────────────────────────────────────

interface AssignPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountName: string;
  detectedFirmKey: string;
  currentFirmKey?: string;
  currentPlanKey?: string;
  currentPhase?: 'evaluation' | 'funded';
  onSave: (firmKey: string, planKey: string, phase: 'evaluation' | 'funded') => void;
}

// ── Helpers ───────────────────────────────────────────────────────

function fmt(v: number): string {
  return '$' + v.toLocaleString();
}

function firstFirm(preferredKey?: string): PropFirm {
  if (preferredKey) {
    const match = PROP_FIRM_CATALOG.find((f) => f.key === preferredKey);
    if (match) return match;
  }
  return PROP_FIRM_CATALOG[0];
}

// ── Rule preview ──────────────────────────────────────────────────

function PlanPreview({ firm, plan }: { firm: PropFirm; plan: PropPlan }) {
  const ddTypeLabel: Record<string, string> = {
    intraday_trailing: 'Intraday trailing',
    eod_trailing: 'EOD trailing',
    static: 'Static (fixed)',
  };
  const lockLabel: Record<string, string> = {
    none: 'Trails indefinitely',
    start: 'Locks at starting balance',
    start_plus: `Locks at starting balance + ${fmt(plan.lockValue)}`,
  };

  return (
    <div className="mt-3 rounded-lg bg-base-900/60 border border-border p-3 space-y-1.5 text-xs">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Account size</span>
        <span className="text-foreground font-medium">{fmt(plan.accountSize)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Profit target</span>
        <span className="text-green-400 font-medium">{fmt(plan.profitTarget)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Trailing DD amount</span>
        <span className="text-foreground font-medium">{fmt(plan.trailingAmount)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Drawdown type</span>
        <span className="text-foreground font-medium">{ddTypeLabel[plan.drawdownType] ?? plan.drawdownType}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Floor lock</span>
        <span className="text-foreground font-medium">{lockLabel[plan.lockType] ?? plan.lockType}</span>
      </div>
      {plan.dailyLossLimit != null ? (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Daily loss limit</span>
          <span className="text-yellow-400 font-medium">{fmt(plan.dailyLossLimit)}</span>
        </div>
      ) : (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Daily loss limit</span>
          <span className="text-muted-foreground italic">None</span>
        </div>
      )}
      {plan.consistencyPct != null && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Consistency rule</span>
          <span className="text-foreground font-medium">{plan.consistencyPct}%</span>
        </div>
      )}
      {plan.minTradingDays != null && plan.minTradingDays > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Min trading days</span>
          <span className="text-foreground font-medium">{plan.minTradingDays}</span>
        </div>
      )}
      {plan.verify && (
        <div className="mt-1 rounded bg-yellow-500/10 border border-yellow-500/30 px-2 py-1 text-yellow-400 text-[11px]">
          Numbers marked verify — confirm against the firm's live checkout before trading.
        </div>
      )}
      {!firm.tradovate && (
        <div className="mt-1 rounded bg-amber-500/10 border border-amber-500/30 px-2 py-1 text-amber-400 text-[11px]">
          {firm.label} is not native Tradovate — Tradovate balance data may not apply.
        </div>
      )}
      {firm.note && (
        <div className="mt-1 text-muted-foreground text-[11px] italic leading-relaxed">
          Note: {firm.note}
        </div>
      )}
    </div>
  );
}

// ── Dialog ────────────────────────────────────────────────────────

export function AssignPlanDialog({
  open,
  onOpenChange,
  accountName,
  detectedFirmKey,
  currentFirmKey,
  currentPlanKey,
  currentPhase,
  onSave,
}: AssignPlanDialogProps) {
  const initialFirm = firstFirm(currentFirmKey ?? detectedFirmKey);
  const [selectedFirmKey, setSelectedFirmKey] = useState<string>(initialFirm.key);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>(
    currentPlanKey ?? initialFirm.plans[0]?.key ?? '',
  );
  const [phase, setPhase] = useState<'evaluation' | 'funded'>(currentPhase ?? 'evaluation');

  // When the dialog opens, reset from current props
  useEffect(() => {
    if (open) {
      const firm = firstFirm(currentFirmKey ?? detectedFirmKey);
      setSelectedFirmKey(firm.key);
      const planKey = currentPlanKey ?? firm.plans[0]?.key ?? '';
      setSelectedPlanKey(planKey);
      setPhase(currentPhase ?? 'evaluation');
    }
  }, [open, currentFirmKey, currentPlanKey, currentPhase, detectedFirmKey]);

  // When firm changes, reset plan to first plan of new firm
  const handleFirmChange = (firmKey: string) => {
    setSelectedFirmKey(firmKey);
    const firm = PROP_FIRM_CATALOG.find((f) => f.key === firmKey);
    if (firm && firm.plans.length > 0) {
      setSelectedPlanKey(firm.plans[0].key);
    }
  };

  const selectedFirm = PROP_FIRM_CATALOG.find((f) => f.key === selectedFirmKey) ?? PROP_FIRM_CATALOG[0];
  const selectedPlan: PropPlan | undefined = selectedFirm.plans.find((p) => p.key === selectedPlanKey);

  const handleSave = () => {
    if (!selectedPlan) return;
    onSave(selectedFirm.key, selectedPlan.key, phase);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-base-900 border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Assign Prop Firm Plan — {accountName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Firm selector */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5 font-medium uppercase tracking-wide">
              Firm
            </label>
            <select
              value={selectedFirmKey}
              onChange={(e) => handleFirmChange(e.target.value)}
              className="w-full rounded-lg bg-base-800 border border-border text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/50"
            >
              {PROP_FIRM_CATALOG.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}{!f.tradovate ? ' (non-Tradovate)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Plan selector */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5 font-medium uppercase tracking-wide">
              Plan
            </label>
            <select
              value={selectedPlanKey}
              onChange={(e) => setSelectedPlanKey(e.target.value)}
              className="w-full rounded-lg bg-base-800 border border-border text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/50"
            >
              {selectedFirm.plans.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label} ({p.key})
                </option>
              ))}
            </select>
          </div>

          {/* Phase toggle */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5 font-medium uppercase tracking-wide">
              Phase
            </label>
            <div className="flex gap-2">
              {(['evaluation', 'funded'] as const).map((ph) => (
                <button
                  key={ph}
                  onClick={() => setPhase(ph)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    phase === ph
                      ? 'bg-gold/15 text-gold border border-gold/40'
                      : 'bg-base-800 text-muted-foreground border border-border hover:text-foreground'
                  }`}
                >
                  {ph.charAt(0).toUpperCase() + ph.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Plan preview */}
          {selectedPlan && <PlanPreview firm={selectedFirm} plan={selectedPlan} />}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-lg border border-border bg-base-800 text-sm text-muted-foreground py-2 hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <Button
              variant="gold"
              size="sm"
              showArrow={false}
              onClick={handleSave}
              disabled={!selectedPlan}
              className="flex-1"
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
