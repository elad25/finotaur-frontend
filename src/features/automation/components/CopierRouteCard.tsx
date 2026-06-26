// src/features/automation/components/CopierRouteCard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Edit a single copier route: source account, targets (with scale + max
// contracts), symbol filter, opens/closes/reverse toggles.
//
// Uses JournalAccountPicker so source and destination lists match the journal's
// account universe (usePortfolios), not the coarser broker_connections list.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { JournalAccountPicker } from './JournalAccountPicker';
import type {
  CopierRoute,
  CopierRouteTargetInput,
  JournalAccount,
} from '../lib/automationTypes';

// ── Types ──────────────────────────────────────────────────────────────────

/** Props exposed to CopierRoutesTab. */
interface CopierRouteCardProps {
  route: CopierRoute;
  onSave: (params: {
    routeId: string;
    sourceAccount: JournalAccount;
    label: string;
    symbolFilter: string[];
    copyOpens: boolean;
    copyCloses: boolean;
    reverse: boolean;
    isActive: boolean;
    targets: CopierRouteTargetInput[];
  }) => void;
  onDelete: (routeId: string) => void;
  isSaving?: boolean;
}

/** Internal per-target state — strings for controlled <input> values. */
interface LocalTarget {
  account: JournalAccount | null;
  scaleRatio: string;    // string for controlled input
  maxContracts: string;  // string for controlled input
  isActive: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildLocalTargets(route: CopierRoute): LocalTarget[] {
  return (route.automation_copier_route_targets ?? []).map((t) => ({
    account: {
      account_id: t.destination_account_id,
      account_name: t.destination_account_name,
      broker: t.destination_broker,
      environment: t.destination_environment,
    },
    scaleRatio: t.scale_ratio?.toString() ?? '1',
    maxContracts: t.max_contracts?.toString() ?? '',
    isActive: t.is_active,
  }));
}

/** Extract the source JournalAccount from an existing route (may be partial on first render). */
function buildSourceAccount(route: CopierRoute): JournalAccount | null {
  if (!route.source_account_id) return null;
  return {
    account_id: route.source_account_id,
    account_name: route.source_account_name,
    broker: route.source_broker,
    environment: route.source_environment,
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export function CopierRouteCard({ route, onSave, onDelete, isSaving }: CopierRouteCardProps) {
  const [expanded, setExpanded] = useState(false);

  const [label, setLabel] = useState(route.label);
  const [sourceAccount, setSourceAccount] = useState<JournalAccount | null>(
    () => buildSourceAccount(route),
  );
  const [symbolFilter, setSymbolFilter] = useState(route.symbol_filter?.join(', ') ?? '');
  const [copyOpens, setCopyOpens] = useState(route.copy_opens);
  const [copyCloses, setCopyCloses] = useState(route.copy_closes);
  const [reverse, setReverse] = useState(route.reverse);
  const [isActive, setIsActive] = useState(route.is_active);
  const [targets, setTargets] = useState<LocalTarget[]>(() => buildLocalTargets(route));

  const addTarget = () => {
    setTargets((prev) => [
      ...prev,
      { account: null, scaleRatio: '1', maxContracts: '', isActive: true },
    ]);
  };

  const removeTarget = (idx: number) => {
    setTargets((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTarget = (idx: number, patch: Partial<LocalTarget>) => {
    setTargets((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };

  const handleSave = () => {
    if (!sourceAccount) return; // guard: source required

    const symbols = symbolFilter
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const parsedTargets: CopierRouteTargetInput[] = targets
      .filter((t) => t.account != null)
      // Guard: prevent target equal to source
      .filter((t) => t.account!.account_id !== sourceAccount.account_id)
      .map((t) => ({
        destination_account_id: t.account!.account_id,
        destination_account_name: t.account!.account_name,
        destination_broker: t.account!.broker,
        destination_environment: t.account!.environment,
        scale_ratio: parseFloat(t.scaleRatio) || 1,
        max_contracts: t.maxContracts ? parseInt(t.maxContracts, 10) : null,
        is_active: t.isActive,
      }));

    onSave({
      routeId: route.id,
      sourceAccount,
      label: label.trim() || 'Unnamed route',
      symbolFilter: symbols,
      copyOpens,
      copyCloses,
      reverse,
      isActive,
      targets: parsedTargets,
    });
  };

  const targetCount = targets.length;
  const sourceLabel = sourceAccount
    ? `${sourceAccount.account_name}${sourceAccount.environment ? ` (${sourceAccount.environment})` : ''}`
    : 'No source selected';

  return (
    <Card padding="compact" className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Checkbox
            checked={isActive}
            onCheckedChange={(v) => setIsActive(Boolean(v))}
            aria-label="Route active"
          />
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-7 text-sm font-medium bg-transparent border-transparent hover:border-zinc-700 focus:border-zinc-600 px-1 w-40 min-w-0"
            placeholder="Route name"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label={expanded ? 'Collapse route' : 'Expand route'}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onDelete(route.id)}
            className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
            aria-label="Delete route"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!expanded && (
        <p className="text-xs text-zinc-500 pl-6">
          {sourceLabel} · {targetCount} destination{targetCount !== 1 ? 's' : ''} ·{' '}
          {[copyOpens && 'opens', copyCloses && 'closes', reverse && 'reversed']
            .filter(Boolean)
            .join(', ') || 'no copy settings'}
        </p>
      )}

      {expanded && (
        <div className="pl-6 space-y-5">
          {/* Source */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Source account (copy FROM)</Label>
            <JournalAccountPicker
              value={sourceAccount?.account_id ?? null}
              onChange={setSourceAccount}
              placeholder="Select source account"
              className="h-8 text-sm"
            />
          </div>

          {/* Symbol filter */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">
              Symbol filter (comma-separated, empty = all)
            </Label>
            <Input
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              placeholder="ES, NQ, MES"
              className="h-7 text-sm"
            />
          </div>

          {/* Copy toggles */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <Checkbox checked={copyOpens} onCheckedChange={(v) => setCopyOpens(Boolean(v))} />
              Copy opens
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <Checkbox checked={copyCloses} onCheckedChange={(v) => setCopyCloses(Boolean(v))} />
              Copy closes
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <Checkbox checked={reverse} onCheckedChange={(v) => setReverse(Boolean(v))} />
              Reverse direction
            </label>
          </div>

          {/* Targets */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Destination accounts (copy TO)</Label>
            {targets.map((target, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <JournalAccountPicker
                    value={target.account?.account_id ?? null}
                    onChange={(acct) => updateTarget(idx, { account: acct })}
                    placeholder="Destination"
                    className="h-7 text-sm col-span-1"
                  />
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={target.scaleRatio}
                    onChange={(e) => updateTarget(idx, { scaleRatio: e.target.value })}
                    placeholder="Scale (1 = 100%)"
                    className="h-7 text-sm"
                  />
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={target.maxContracts}
                    onChange={(e) => updateTarget(idx, { maxContracts: e.target.value })}
                    placeholder="Max contracts"
                    className="h-7 text-sm"
                  />
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <Checkbox
                    checked={target.isActive}
                    onCheckedChange={(v) => updateTarget(idx, { isActive: Boolean(v) })}
                    aria-label="Target active"
                  />
                  <button
                    type="button"
                    onClick={() => removeTarget(idx)}
                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                    aria-label="Remove target"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addTarget}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add destination
            </button>
          </div>

          {/* Save — disabled when no source selected */}
          <div className="pt-1 flex items-center gap-3">
            <Button
              variant="goldOutline"
              size="compact"
              showArrow={false}
              onClick={handleSave}
              disabled={isSaving || !sourceAccount}
            >
              {isSaving ? 'Saving…' : 'Save route'}
            </Button>
            {!sourceAccount && (
              <span className="text-xs text-amber-400">Select a source account to save</span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
