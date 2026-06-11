// SynthesisBriefPersonalTwist.tsx
// Phase 2: Per-user personalized banner for the weekly synthesis brief.
// Shows personal commentary when available, BrokerConnectCard when degenerate,
// or a skeleton while loading.

import type { PersonalizedBriefPayload } from '@/services/copilotSynthesisBriefApi';
import { BrokerConnectCard } from './BrokerConnectCard';

interface Props {
  personal: PersonalizedBriefPayload | null;
  personalLoading: boolean;
  degenerate?: boolean;
  onConnectBroker?: () => void;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function PersonalTwistSkeleton() {
  return (
    <div
      aria-busy="true"
      className="animate-pulse overflow-hidden rounded-[8px] border border-gold-primary/14 bg-[#060604]/90"
    >
      <div className="border-b border-gold-primary/10 bg-[#060604] px-4 py-2.5">
        <div className="h-3 w-40 rounded bg-white/[0.07]" />
      </div>
      <div className="space-y-2.5 px-4 py-4">
        <div className="h-3 rounded bg-white/[0.05]" />
        <div className="h-3 w-11/12 rounded bg-white/[0.05]" />
        <div className="h-3 w-9/12 rounded bg-white/[0.05]" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Commentary card
// ---------------------------------------------------------------------------

function PersonalCommentaryCard({
  commentary,
  expiresAt,
}: {
  commentary: string;
  expiresAt?: string;
}) {
  // Derive "last refreshed" timestamp from expiresAt - 24h
  let refreshedLabel = '';
  if (expiresAt) {
    try {
      const refreshed = new Date(new Date(expiresAt).getTime() - 24 * 60 * 60 * 1000);
      refreshedLabel = refreshed.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      // ignore parse errors
    }
  }

  return (
    <section
      aria-label="Personalized for you"
      className="overflow-hidden rounded-[8px] border border-gold-primary/20 bg-[#060604]/90 shadow-[0_0_28px_rgba(201,166,70,0.07)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-gold-primary/14 bg-[#080705] px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gold-primary">
          Personalized for you
        </p>
        {refreshedLabel && (
          <p className="text-[10px] text-ink-tertiary">
            Updated based on your portfolio, last refreshed {refreshedLabel}
          </p>
        )}
      </div>

      {/* Body — new briefs arrive as "• " bullet lines; older cached ones as paragraphs */}
      <div className="px-4 py-4">
        {commentary.includes('•') ? (
          <ul className="space-y-2">
            {commentary
              .split('\n')
              .map((line) => line.replace(/^\s*•\s*/, '').trim())
              .filter(Boolean)
              .map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] leading-[1.6] text-ink-secondary">
                  <span className="mt-[5px] h-[5px] w-[5px] shrink-0 rounded-full bg-gold-primary/70" />
                  <span>{line}</span>
                </li>
              ))}
          </ul>
        ) : (
          commentary.split('\n\n').map((paragraph, i) => (
            <p
              key={i}
              className={`text-[12px] leading-[1.75] text-ink-secondary ${i > 0 ? 'mt-3' : ''}`}
            >
              {paragraph}
            </p>
          ))
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function SynthesisBriefPersonalTwist({
  personal,
  personalLoading,
  degenerate,
  onConnectBroker,
}: Props) {
  // While loading: show skeleton
  if (personalLoading) {
    return <PersonalTwistSkeleton />;
  }

  // After loading, nothing returned (e.g. fetch error or no brief yet): render nothing
  if (personal == null) {
    return null;
  }

  // Degenerate: no broker, no positions, no trader type — prompt to connect
  if (degenerate === true || personal.degenerate === true) {
    return (
      <div>
        <BrokerConnectCard />
      </div>
    );
  }

  // No commentary yet (e.g. upstream error during personalization): render nothing
  if (!personal.personalCommentary) {
    return null;
  }

  return (
    <PersonalCommentaryCard
      commentary={personal.personalCommentary}
      expiresAt={personal.expiresAt}
    />
  );
}
