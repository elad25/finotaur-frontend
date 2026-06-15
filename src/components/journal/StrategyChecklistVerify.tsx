/**
 * StrategyChecklistVerify — per-trade strategy adherence widget.
 *
 * Shows:
 *  1. Each checklist item from the linked strategy as an interactive toggle
 *     (or read-only check/x in readOnly mode).
 *  2. An adherence summary bar (n / total checks, gold progress).
 *  3. A compact Plan vs Actual block comparing strategy goals to trade actuals.
 */

import { Check, X } from 'lucide-react';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useStrategiesOptimized } from '@/hooks/useStrategies';
import type { ChecklistItem } from '@/components/journal/strategy/ChecklistEditor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StrategyChecklistVerifyProps {
  strategyId: string | null | undefined;
  /** = trade.checklist_results — null/undefined treated as {} */
  results: Record<string, boolean> | null | undefined;
  onChange: (results: Record<string, boolean>) => void;
  readOnly?: boolean;
  /** Actual trade metrics to compare against the strategy plan */
  actual?: {
    rr?: number | null;
    rMultiple?: number | null;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GOLD = '#C9A646';
const PANEL =
  'rounded-[10px] border border-white/[0.07] bg-[rgba(16,16,16,0.92)] p-4';

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toFixed(2);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StrategyChecklistVerify({
  strategyId,
  results,
  onChange,
  readOnly = false,
  actual,
}: StrategyChecklistVerifyProps) {
  const { id: userId } = useEffectiveUser();
  const { data: strategies = [] } = useStrategiesOptimized(userId ?? undefined);

  // Resolve strategy from the cached list — avoids an extra network round-trip.
  const strategy = strategyId
    ? strategies.find((s) => s.id === strategyId)
    : undefined;

  // No linked strategy
  if (!strategyId) {
    return (
      <p className="text-[12px] text-white/40 italic">
        No strategy linked — pick a setup to verify against it.
      </p>
    );
  }

  const safeResults: Record<string, boolean> = results ?? {};
  const checklist: ChecklistItem[] =
    strategy != null && Array.isArray(strategy.checklist)
      ? (strategy.checklist as ChecklistItem[])
      : [];

  const total = checklist.length;
  const checked = checklist.filter((item) => safeResults[item.id] === true).length;
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

  const planRR = strategy?.avgRRGoal ?? null;
  const planSL = strategy?.defaultStopLoss ?? null;
  const planTP = strategy?.defaultTakeProfit ?? null;

  const actualRR = actual?.rr ?? actual?.rMultiple ?? null;

  const hasPlanBlock = planRR != null || planSL != null || planTP != null;

  const handleToggle = (id: string) => {
    if (readOnly) return;
    const next = !safeResults[id];
    onChange({ ...safeResults, [id]: next });
  };

  return (
    <div className={PANEL}>
      {/* ---- Checklist items ---- */}
      {total === 0 ? (
        <p className="mb-3 text-[12px] text-white/40 italic">
          No checklist defined for this strategy yet.
        </p>
      ) : (
        <>
          {/* Adherence summary */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[11px] font-semibold tabular-nums" style={{ color: GOLD }}>
              {checked}/{total}
            </span>
            <span className="text-[11px] text-white/50">checks</span>
            <div className="relative ml-auto h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, background: GOLD }}
              />
            </div>
            <span className="text-[11px] tabular-nums text-white/40">{pct}%</span>
          </div>

          {/* Items */}
          <ul className="mb-3 space-y-1.5">
            {checklist.map((item) => {
              const isChecked = safeResults[item.id] === true;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleToggle(item.id)}
                    className={[
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left',
                      'transition-colors duration-100',
                      readOnly
                        ? 'cursor-default'
                        : 'cursor-pointer hover:bg-white/[0.04]',
                    ].join(' ')}
                    aria-pressed={isChecked}
                  >
                    {/* Check icon */}
                    <span
                      className={[
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded',
                        isChecked
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-white/[0.06] text-white/25',
                      ].join(' ')}
                    >
                      {isChecked ? (
                        <Check size={10} strokeWidth={2.5} />
                      ) : (
                        <X size={10} strokeWidth={2} />
                      )}
                    </span>
                    <span
                      className={[
                        'text-[12px] leading-snug',
                        isChecked ? 'text-white/80' : 'text-white/45',
                      ].join(' ')}
                    >
                      {item.label !== '' ? item.label : (
                        <em className="text-white/30">Untitled item</em>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* ---- Plan vs Actual ---- */}
      {hasPlanBlock && (
        <div className="border-t border-white/[0.06] pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">
            Plan vs Actual
          </p>
          <table className="w-full text-[11px]">
            <thead>
              <tr>
                <th className="pb-1 text-left font-medium text-white/30" />
                <th className="pb-1 text-right font-medium text-white/30">Plan</th>
                <th className="pb-1 text-right font-medium text-white/30">Actual</th>
              </tr>
            </thead>
            <tbody>
              {planRR != null && (
                <tr>
                  <td className="py-0.5 text-white/50">RR Goal</td>
                  <td className="py-0.5 text-right tabular-nums text-white/70">{fmt(planRR)}</td>
                  <td
                    className="py-0.5 text-right tabular-nums"
                    style={{
                      color:
                        actualRR == null
                          ? 'rgba(255,255,255,0.35)'
                          : actualRR >= planRR
                          ? '#34d399' /* emerald-400 */
                          : '#f87171' /* red-400 */,
                    }}
                  >
                    {fmt(actualRR)}
                  </td>
                </tr>
              )}
              {planSL != null && (
                <tr>
                  <td className="py-0.5 text-white/50">Stop Loss</td>
                  <td className="py-0.5 text-right tabular-nums text-white/70">{fmt(planSL)}</td>
                  <td className="py-0.5 text-right text-white/30">—</td>
                </tr>
              )}
              {planTP != null && (
                <tr>
                  <td className="py-0.5 text-white/50">Take Profit</td>
                  <td className="py-0.5 text-right tabular-nums text-white/70">{fmt(planTP)}</td>
                  <td className="py-0.5 text-right text-white/30">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
