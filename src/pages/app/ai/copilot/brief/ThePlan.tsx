/**
 * ThePlan — numbered action list for the "AI Game Plan" module.
 *
 * Renders up to 3 prioritized PlanAction items.
 * Each row: big gold rank numeral, bold action text, muted rationale,
 * optional sizing chip, optional ticker chips.
 *
 * Design system constraints:
 *  - No green; positive = white / gold
 *  - Tailwind DS tokens only
 *  - All strings English-only
 */

import type { PlanAction } from '@/services/copilotSynthesisBriefApi';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Small sizing guidance chip (e.g. "2% of portfolio"). */
function SizingChip({ sizing }: { sizing: string }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-gold-primary/18 bg-gold-primary/[0.06] px-1.5 py-0.5 text-[9px] font-medium text-gold-primary tracking-[0.04em]">
      {sizing}
    </span>
  );
}

/** Small monospace ticker chip. */
function TickerChip({ symbol }: { symbol: string }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-ink-secondary tracking-[0.05em]">
      {symbol}
    </span>
  );
}

function ActionRow({ action }: { action: PlanAction }) {
  return (
    <li className="flex gap-4 py-3 border-b border-gold-primary/10 last:border-b-0">
      {/* Gold rank numeral */}
      <span
        className="flex-none mt-0.5 font-mono text-2xl font-bold tabular-nums leading-none bg-gradient-to-b from-gold-bright via-gold-primary to-gold-deep bg-clip-text text-transparent"
        aria-label={`Action ${action.rank}`}
      >
        {action.rank}
      </span>

      {/* Body */}
      <div className="min-w-0 flex-1">
        {/* Action headline */}
        <p className="text-sm font-semibold text-ink-primary leading-tight">{action.action}</p>

        {/* Rationale — prefixed with "Given" if not already */}
        <p className="mt-1 text-[12px] leading-[1.6] text-ink-secondary">
          {action.rationale.startsWith('Given') ? action.rationale : `Given ${action.rationale}`}
        </p>

        {/* Chips row: sizing + tickers */}
        {((action.sizing) || (action.symbols && action.symbols.length > 0)) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {action.sizing && <SizingChip sizing={action.sizing} />}
            {action.symbols?.map((sym) => (
              <TickerChip key={sym} symbol={sym} />
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <p className="text-[12px] text-ink-tertiary py-2">
      No high-conviction actions for today — hold steady.
    </p>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface ThePlanProps {
  actions: PlanAction[];
}

export function ThePlan({ actions }: ThePlanProps) {
  if (actions.length === 0) {
    return <EmptyState />;
  }

  return (
    <ol aria-label="Prioritized actions" className="list-none m-0 p-0 divide-y divide-gold-primary/10">
      {actions.map((action) => (
        <ActionRow key={action.rank} action={action} />
      ))}
    </ol>
  );
}

export default ThePlan;
