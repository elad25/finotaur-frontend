// src/features/automation/components/CopierRouteCard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Edit a single copier route: source account, targets (with scale, max
// contracts, cross_to_micro), symbol filter, opens/closes/reverse toggles.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AccountPicker } from './AccountPicker';
import type {
  CopierRoute,
  CopierRouteTargetInput,
  SelectedAccount,
} from '../lib/automationTypes';

export interface CopierRouteCardProps {
  route: CopierRoute;
  onSave: (params: {
    routeId: string;
    sourceAccountId: string;
    sourceAccountName: string;
    sourceBroker: string | null;
    sourceEnvironment: string | null;
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

interface LocalTarget {
  destinationAccountId: string;
  destinationAccountName: string;
  destinationBroker: string | null;
  destinationEnvironment: string | null;
  scaleRatio: string;    // string for controlled input
  maxContracts: string;  // string for controlled input
  crossToMicro: boolean;
  isActive: boolean;
}

function buildLocalTargets(route: CopierRoute): LocalTarget[] {
  return (route.automation_copier_route_targets ?? []).map((t) => ({
    destinationAccountId: t.destination_account_id,
    destinationAccountName: t.destination_account_name,
    destinationBroker: t.destination_broker ?? null,
    destinationEnvironment: t.destination_environment ?? null,
    scaleRatio: t.scale_ratio?.toString() ?? '1',
    maxContracts: t.max_contracts?.toString() ?? '',
    crossToMicro: t.cross_to_micro ?? false,
    isActive: t.is_active,
  }));
}

export function CopierRouteCard({ route, onSave, onDelete, isSaving }: CopierRouteCardProps) {
  const [expanded, setExpanded] = useState(false);

  const [label, setLabel] = useState(route.label);
  const [sourceAccountId, setSourceAccountId] = useState(route.source_account_id);
  const [sourceAccountName, setSourceAccountName] = useState(route.source_account_name);
  const [sourceBroker, setSourceBroker] = useState<string | null>(route.source_broker ?? null);
  const [sourceEnvironment, setSourceEnvironment] = useState<string | null>(
    route.source_environment ?? null,
  );
  const [symbolFilter, setSymbolFilter] = useState(route.symbol_filter?.join(', ') ?? '');
  const [copyOpens, setCopyOpens] = useState(route.copy_opens);
  const [copyCloses, setCopyCloses] = useState(route.copy_closes);
  const [reverse, setReverse] = useState(route.reverse);
  const [isActive, setIsActive] = useState(route.is_active);
  const [targets, setTargets] = useState<LocalTarget[]>(() => buildLocalTargets(route));

  const handleSourceChange = (account: SelectedAccount | null) => {
    setSourceAccountId(account?.account_id ?? '');
    setSourceAccountName(account?.account_name ?? '');
    setSourceBroker(account?.broker ?? null);
    setSourceEnvironment(account?.environment ?? null);
  };

  const handleTargetAccountChange = (idx: number, account: SelectedAccount | null) => {
    setTargets((prev) =>
      prev.map((t, i) =>
        i === idx
          ? {
              ...t,
              destinationAccountId: account?.account_id ?? '',
              destinationAccountName: account?.account_name ?? '',
              destinationBroker: account?.broker ?? null,
              destinationEnvironment: account?.environment ?? null,
            }
          : t,
      ),
    );
  };

  const addTarget = () => {
    setTargets((prev) => [
      ...prev,
      {
        destinationAccountId: '',
        destinationAccountName: '',
        destinationBroker: null,
        destinationEnvironment: null,
        scaleRatio: '1',
        maxContracts: '',
        crossToMicro: false,
        isActive: true,
      },
    ]);
  };

  const removeTarget = (idx: number) => {
    setTargets((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTarget = (idx: number, patch: Partial<LocalTarget>) => {
    setTargets((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };

  const handleSave = () => {
    const symbols = symbolFilter
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const parsedTargets: CopierRouteTargetInput[] = targets
      .filter((t) => t.destinationAccountId)
      .map((t) => ({
        destination_account_id: t.destinationAccountId,
        destination_account_name: t.destinationAccountName,
        destination_broker: t.destinationBroker,
        destination_environment: t.destinationEnvironment,
        scale_ratio: parseFloat(t.scaleRatio) || 1,
        max_contracts: t.maxContracts ? parseInt(t.maxContracts, 10) : null,
        cross_to_micro: t.crossToMicro,
        is_active: t.isActive,
      }));

    onSave({
      routeId: route.id,
      sourceAccountId,
      sourceAccountName,
      sourceBroker,
      sourceEnvironment,
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
          {sourceAccountName || 'No source'} · {targetCount} destination{targetCount !== 1 ? 's' : ''} ·{' '}
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
            <AccountPicker
              value={sourceAccountId || null}
              onChange={handleSourceChange}
              includeGlobal={false}
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
          <div className="space-y-3">
            <Label className="text-xs text-zinc-400">Destination accounts (copy TO)</Label>
            {targets.map((target, idx) => (
              <div key={idx} className="space-y-1.5 rounded-md border border-zinc-800 p-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <AccountPicker
                      value={target.destinationAccountId || null}
                      onChange={(acc) => handleTargetAccountChange(idx, acc)}
                      includeGlobal={false}
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
                {/* Cross-to-micro toggle */}
                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer pl-0.5">
                  <Checkbox
                    checked={target.crossToMicro}
                    onCheckedChange={(v) => updateTarget(idx, { crossToMicro: Boolean(v) })}
                  />
                  Cross to micro (e.g. NQ → MNQ)
                </label>
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

          {/* Save */}
          <div className="pt-1">
            <Button
              variant="goldOutline"
              size="compact"
              showArrow={false}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : 'Save route'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
