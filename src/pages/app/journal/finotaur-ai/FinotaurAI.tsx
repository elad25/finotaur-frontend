// src/pages/app/journal/finotaur-ai/FinotaurAI.tsx
// Page orchestrator for /app/journal/finotaur-ai.
// Decision tree: Free → UpsellGate (no API), 0-trades → EmptyState, error → ErrorCard, happy path → ScoreHero + BriefingHero.

import * as React from 'react';
import { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useFinotaurScore } from './hooks/useFinotaurScore';
import { useBriefing, useRefreshBriefing } from './hooks/useBriefing';
import { BriefingHero } from './components/BriefingHero';
import { ScoreHero } from './components/ScoreHero';
import { EmptyState } from './components/EmptyState';
import { UpsellGate } from './components/UpsellGate';
import CoachChatPanel from './components/CoachChatPanel';
import { DailyLimitBanner } from './components/DailyLimitBanner';
import { useUsage } from './hooks/useUsage';
import { Eyebrow } from '@/components/ds/Card';
import { BriefingApiError } from './services/finotaurAIApi';
import type { Insight } from './types';

// ---------------------------------------------------------------------------
// Page shell — wraps content with page-level padding/header
// ---------------------------------------------------------------------------
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-base">
      <div className="mx-auto max-w-7xl px-ds-6 py-ds-7">
        <header className="mb-ds-6 flex items-end justify-between">
          <div>
            <Eyebrow>AI COACH BRIEFING</Eyebrow>
            <h1 className="mt-ds-2 font-sans text-[32px] font-medium tracking-[-0.5px] text-ink-primary">
              FINOTAUR AI
            </h1>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page loader — subscription not resolved yet
// ---------------------------------------------------------------------------
function PageLoader() {
  return (
    <PageShell>
      <div className="font-sans text-body text-ink-tertiary">Loading…</div>
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function FinotaurAI() {
  const subscription = useSubscription();

  // isPremium covers: admin, lifetime, premium plan, platform bundle.
  // Free users see UpsellGate without any API calls to journal-ai.
  const isPremium: boolean = subscription.isPremium ?? false;

  // Only fetch score/briefing for premium users. enabled=false means zero network cost.
  const {
    data: score,
    isLoading,
    error,
    refetch,
  } = useFinotaurScore(30, isPremium);

  const briefingQuery = useBriefing(isPremium);
  const refreshMutation = useRefreshBriefing();
  const usageQuery = useUsage(isPremium);

  const refreshing429 =
    refreshMutation.error instanceof BriefingApiError &&
    refreshMutation.error.status === 429;

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const [prefillRequest, setPrefillRequest] = useState<string | null>(null);

  const handleDiscuss = (insight: Insight) => {
    setPrefillRequest(`Tell me more about: ${insight.title ?? insight.body ?? insight.id}`);
  };

  // Subscription not resolved yet
  if (subscription.isLoading) {
    return <PageLoader />;
  }

  // Free users: UpsellGate, no API calls
  if (!isPremium) {
    return (
      <PageShell>
        <UpsellGate />
      </PageShell>
    );
  }

  // Zero trades or null score (insufficient data path — score resolved, not loading)
  if (!isLoading && score !== undefined) {
    const noTrades =
      score === null ||
      score.score === null ||
      (score.total_trades !== undefined && score.total_trades === 0);
    if (noTrades) {
      return (
        <PageShell>
          <EmptyState />
        </PageShell>
      );
    }
  }

  return (
    <PageShell>
      <DailyLimitBanner usage={usageQuery.data ?? null} />
      <div className="mt-ds-4 grid grid-cols-1 gap-ds-6 lg:grid-cols-[1fr_380px]">
        <div>
          <ScoreHero
            score={score}
            isLoading={isLoading}
            error={error as Error | null}
            onRefresh={refetch}
          />
          <div className="mt-ds-6">
            <BriefingHero
              briefing={briefingQuery.data?.briefing ?? null}
              stale={briefingQuery.data?.stale ?? false}
              refreshing={briefingQuery.data?.refreshing ?? refreshMutation.isPending}
              generatedAt={briefingQuery.data?.generated_at ?? null}
              isLoading={briefingQuery.isLoading}
              error={briefingQuery.error as Error | null}
              onRefresh={handleRefresh}
              refreshing429={refreshing429}
              onDiscuss={handleDiscuss}
            />
          </div>
        </div>
        <aside className="lg:sticky lg:top-ds-6 lg:self-start">
          <CoachChatPanel prefillRequest={prefillRequest} />
        </aside>
      </div>
    </PageShell>
  );
}
