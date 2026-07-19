// src/pages/app/journal/backtest/components/StrategyV2Summary.tsx
// ============================================================================
// STRATEGY V2 SUMMARY — human-readable, READ-ONLY review of the current
// StrategyDefinitionV2 (generated/refined by the Strategy AI NL flow).
// Rendered by AutoBacktest.tsx between the NL card and the Run action.
// ============================================================================

import { toast } from 'sonner';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { useAutoBacktestStore } from '@/store/useAutoBacktestStore';
import type { StrategyDefinitionV2 } from '@/core/auto/v2/types';
import { describeExits, describeFilters, describePhase, describeStop } from '../lib/describeCondition';

interface StrategyV2SummaryProps {
  definition: StrategyDefinitionV2;
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border-[0.5px] border-border-ds-default bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink-secondary">
      {label}
    </span>
  );
}

function formatTargetChip(definition: StrategyDefinitionV2): string {
  const { target } = definition.exits;
  if (!target) return 'No fixed target';
  switch (target.basis) {
    case 'rMultiple':
      return `${target.value ?? '?'}R target`;
    case 'fixedPct':
      return `${target.value ?? '?'}% target`;
    case 'level':
      return 'Level target';
    default:
      return 'Target not configured';
  }
}

function formatRiskChip(definition: StrategyDefinitionV2): string {
  const { risk } = definition;
  return risk.sizingMode === 'fixed-contracts'
    ? `${risk.contracts ?? 1} contract(s)`
    : `${risk.riskPerTradePct}% risk/trade`;
}

export function StrategyV2Summary({ definition }: StrategyV2SummaryProps) {
  const from = useAutoBacktestStore((s) => s.from);
  const to = useAutoBacktestStore((s) => s.to);
  const saveStrategyV2AsTemplate = useAutoBacktestStore((s) => s.saveStrategyV2AsTemplate);

  const dateRangeLabel = `${new Date(from).toLocaleDateString()} – ${new Date(to).toLocaleDateString()}`;
  const sessionLabel = definition.filters.session?.enabled
    ? definition.filters.session.windows.map((w) => `${w.start}-${w.end}`).join(', ') || 'Session filter'
    : 'Full session (24h)';

  async function handleSaveAsTemplate() {
    try {
      await saveStrategyV2AsTemplate();
      toast.success(`Saved template "${definition.name}"`);
    } catch {
      toast.error('Failed to save template');
    }
  }

  return (
    <Card padding="default">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gold-primary">Strategy review</h3>
          <p className="mt-1 truncate text-xs text-ink-tertiary">{definition.name}</p>
        </div>
        <Button
          variant="goldOutline"
          size="sm"
          onClick={handleSaveAsTemplate}
          className="shrink-0"
        >
          Save as template
        </Button>
      </div>

      {/* Chips row — TradeZella-style compact tags */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Chip label={definition.direction} />
        <Chip label={`${definition.instrument.symbol} · ${definition.timeframes.execution}`} />
        <Chip label={sessionLabel} />
        <Chip label={dateRangeLabel} />
        <Chip label={formatRiskChip(definition)} />
        <Chip label={formatTargetChip(definition)} />
      </div>

      {/* Phases */}
      <div className="mb-3 flex flex-col gap-1.5">
        {definition.phases.map((phase, i) => (
          <p key={phase.id} className="text-sm leading-relaxed text-ink-primary">
            {describePhase(phase, i)}
          </p>
        ))}
      </div>

      {/* Stop / exits / filters */}
      <div className="flex flex-col gap-1 border-t-[0.5px] border-border-ds-subtle pt-3 text-xs text-ink-secondary">
        <p>{describeStop(definition.stop)}</p>
        <p>{describeExits(definition.exits)}</p>
        <p>{describeFilters(definition.filters)}</p>
      </div>

      {/* Edit as JSON — read-only for now */}
      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-medium text-ink-tertiary hover:text-ink-primary">
          Edit as JSON
        </summary>
        <pre className="mt-2 max-h-96 overflow-auto rounded-lg border-[0.5px] border-border-ds-default bg-surface-1 p-3 text-[11px] text-ink-secondary">
          {JSON.stringify(definition, null, 2)}
        </pre>
      </details>
    </Card>
  );
}

export default StrategyV2Summary;
