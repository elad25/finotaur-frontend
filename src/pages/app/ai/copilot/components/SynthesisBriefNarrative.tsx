// SynthesisBriefNarrative.tsx
// Phase 1: Weekly Synthesis Brief — 4-card narrative + Key Risks panel.

import type { SynthesisBrief, GroundSentimentItem, KeyRisk } from '@/services/copilotSynthesisBriefApi';

interface Props {
  brief: SynthesisBrief | null;
  loading: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ClassificationBadge({ classification }: { classification: GroundSentimentItem['classification'] }) {
  if (!classification) return null;
  const isLeading = classification === 'leading';
  return (
    <span
      className={`ml-2 inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] ${
        isLeading
          ? 'border-status-info/30 bg-status-info/[0.07] text-status-info'
          : 'border-ink-tertiary/30 bg-white/[0.04] text-ink-tertiary'
      }`}
    >
      {isLeading ? 'Leading' : 'Lagging'}
    </span>
  );
}

function QuoteCard({ item }: { item: GroundSentimentItem }) {
  return (
    <blockquote className="rounded-[7px] border border-gold-primary/12 bg-black/24 p-4">
      <p className="text-[12px] leading-[1.65] text-ink-secondary">
        <span className="mr-1 text-gold-primary/60 font-serif text-xl leading-none">&ldquo;</span>
        {item.quote}
        <span className="ml-1 text-gold-primary/60 font-serif text-xl leading-none">&rdquo;</span>
      </p>
      {(item.attribution || item.source || item.classification) && (
        <footer className="mt-2 flex items-center gap-2 flex-wrap">
          {(item.attribution || item.source) && (
            <p className="text-[10px] text-ink-tertiary">
              {[item.attribution, item.source].filter(Boolean).join(' · ')}
            </p>
          )}
          {item.classification && (
            <ClassificationBadge classification={item.classification} />
          )}
        </footer>
      )}
    </blockquote>
  );
}

function NarrativeCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-[7px] border border-gold-primary/12 bg-black/24 p-4">
      <p className="text-sm font-semibold text-gold-primary">{title}</p>
      <div className="mt-2">{children}</div>
    </article>
  );
}

function SkeletonBlock() {
  return (
    <div className="animate-pulse rounded-[7px] border border-gold-primary/10 bg-black/18 p-4 space-y-2">
      <div className="h-3 w-1/4 rounded bg-white/[0.07]" />
      <div className="h-3 w-full rounded bg-white/[0.05]" />
      <div className="h-3 w-5/6 rounded bg-white/[0.05]" />
      <div className="h-3 w-4/6 rounded bg-white/[0.05]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function SynthesisBriefNarrative({ brief, loading, error }: Props) {
  // Silent error fallback — don't blow up the page
  if (error) return null;

  if (loading) {
    return (
      <section
        aria-label="Weekly Synthesis Narrative — loading"
        className="space-y-3"
      >
        <SkeletonBlock />
        <SkeletonBlock />
        <SkeletonBlock />
        <SkeletonBlock />
      </section>
    );
  }

  if (!brief) return null;

  const keyRisks: KeyRisk[] = brief.key_risks ?? [];
  const groundSentiment: GroundSentimentItem[] = brief.ground_sentiment ?? [];

  return (
    <section
      aria-label="Weekly Synthesis Narrative"
      className="grid gap-3 xl:grid-cols-[1.25fr_0.75fr]"
    >
      {/* Left — 4 narrative cards */}
      <div className="rounded-[8px] border border-gold-primary/16 bg-[#050505]/96 p-5">
        <div className="flex items-center gap-2 mb-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-tertiary">
            Weekly Synthesis Brief
          </p>
        </div>

        <div className="space-y-3">
          {/* Card 1 — Macro Thesis */}
          <NarrativeCard title="Macro Thesis">
            {brief.central_thesis && (
              <p className="mb-2 text-[13px] font-medium leading-[1.6] text-ink-primary">
                {brief.central_thesis}
              </p>
            )}
            {brief.macro_narrative && (
              <p className="text-sm leading-relaxed text-ink-secondary">
                {brief.macro_narrative}
              </p>
            )}
          </NarrativeCard>

          {/* Card 2 — Weekly Context */}
          <NarrativeCard title="Weekly Context">
            <p className="text-sm leading-relaxed text-ink-secondary">
              {brief.weekly_context}
            </p>
          </NarrativeCard>

          {/* Card 3 — This Week Tactical */}
          <NarrativeCard title="This Week Tactical">
            <p className="text-sm leading-relaxed text-ink-secondary">
              {brief.this_week_tactical}
            </p>
          </NarrativeCard>

          {/* Card 4 — Ground Sentiment */}
          <NarrativeCard title="Ground Sentiment">
            {groundSentiment.length === 0 ? (
              <p className="text-[12px] text-ink-tertiary">No ground sentiment data available.</p>
            ) : (
              <div className="space-y-2 mt-1">
                {groundSentiment.map((item, index) => (
                  <QuoteCard key={index} item={item} />
                ))}
              </div>
            )}
          </NarrativeCard>
        </div>
      </div>

      {/* Right — Key Risks panel */}
      <div className="rounded-[8px] border border-gold-primary/16 bg-[#050505]/96 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gold-primary mb-4">
          Key Risks
        </p>

        {keyRisks.length === 0 ? (
          <p className="text-[12px] text-ink-tertiary">No key risks identified.</p>
        ) : (
          <ul className="space-y-4">
            {keyRisks.map((risk, index) => (
              <li key={index} className="flex gap-3">
                {/* Bullet marker styled like DS */}
                <div className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-[4px] border border-num-negative/30 bg-num-negative/[0.07]">
                  <span className="h-1.5 w-1.5 rounded-full bg-num-negative/70" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium leading-[1.5] text-ink-primary">
                    {risk.risk}
                  </p>
                  {(risk.impact || risk.probability) && (
                    <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-ink-tertiary">
                      {risk.impact && (
                        <span>
                          Impact:{' '}
                          <span className="text-ink-secondary">{risk.impact}</span>
                        </span>
                      )}
                      {risk.probability && (
                        <span>
                          Prob:{' '}
                          <span className="text-ink-secondary">{risk.probability}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Metadata footer */}
        <div className="mt-6 border-t border-gold-primary/10 pt-4 space-y-1">
          <p className="text-[10px] text-ink-tertiary">
            Week of{' '}
            <span className="text-ink-secondary">
              {new Date(brief.week_start).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </p>
          <p className="text-[10px] text-ink-tertiary">
            Model: <span className="font-mono text-ink-secondary">{brief.model}</span>
          </p>
          {brief.qa_score != null && (
            <p className="text-[10px] text-ink-tertiary">
              QA Score:{' '}
              <span className="font-mono text-ink-secondary">{brief.qa_score}</span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
