/**
 * EventRadar — renders upcoming macro/earnings events that affect the user's book.
 *
 * Each item surfaces as a sub-card matching the QuoteCard / NarrativeCard look
 * from SynthesisBriefNarrative: dark border, near-black bg, gold accents.
 *
 * Design system constraints:
 *  - No green; positive = white (text-ink-primary / gold)
 *  - Tailwind DS tokens only: bg-surface-1 → bg-black/24, border-gold-primary/12, etc.
 *  - Motion ≤ 400ms
 *  - All strings English-only
 */

import type { EventRadarItem } from '@/services/copilotSynthesisBriefApi';
import { ToneBadge } from './ToneBadge';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Small monospace chip used for ticker symbols. */
function TickerChip({ symbol }: { symbol: string }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-gold-primary/18 bg-gold-primary/[0.06] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-ink-secondary tracking-[0.05em]">
      {symbol}
    </span>
  );
}

/** A single event sub-card. */
function EventCard({ item }: { item: EventRadarItem }) {
  return (
    <article className="rounded-[7px] border border-gold-primary/12 bg-black/24 p-4">
      {/* Header row: title + when chip + crowd sentiment badge */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-ink-primary leading-tight">{item.title}</p>
          {item.when && (
            <span className="flex-none rounded-sm border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-ink-tertiary tracking-[0.04em]">
              {item.when}
            </span>
          )}
        </div>
        {item.crowdSentiment && (
          <ToneBadge tone={item.crowdSentiment.tone} className="flex-none">
            {item.crowdSentiment.label}
          </ToneBadge>
        )}
      </div>

      {/* Why it matters */}
      <p className="mt-2 text-[12px] leading-[1.65] text-ink-secondary">{item.whyItMatters}</p>

      {/* Consensus (muted) */}
      {item.consensus && (
        <p className="mt-1.5 text-[11px] text-ink-tertiary">
          <span className="text-gold-primary/60">Consensus:</span> {item.consensus}
        </p>
      )}

      {/* Affected symbols */}
      {item.affectedSymbols && item.affectedSymbols.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {item.affectedSymbols.map((sym) => (
            <TickerChip key={sym} symbol={sym} />
          ))}
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <article className="rounded-[7px] border border-gold-primary/08 bg-black/16 p-4">
      <p className="text-[12px] text-ink-tertiary">
        No major scheduled events affecting your book right now.
      </p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface EventRadarProps {
  items: EventRadarItem[];
}

export function EventRadar({ items }: EventRadarProps) {
  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <EventCard key={item.id} item={item} />
      ))}
    </div>
  );
}

export default EventRadar;
