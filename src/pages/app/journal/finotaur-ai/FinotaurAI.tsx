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
import { ConversationHistorySidebar } from './components/ConversationHistorySidebar';
import { useFinotaurChat } from './hooks/useFinotaurChat';
import { DailyLimitBanner } from './components/DailyLimitBanner';
import { useUsage } from './hooks/useUsage';
import { BriefingApiError } from './services/finotaurAIApi';
import type { Insight } from './types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AiToolErrorFallback } from '@/components/common/AiToolErrorFallback';

// ---------------------------------------------------------------------------
// Page shell — wraps content with page-level padding/header
// ---------------------------------------------------------------------------
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-base">
      <div className="mx-auto max-w-7xl px-ds-6 py-ds-7">
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

  // Lift chat hook to page level so the sidebar and chat panel share state.
  // Only instantiated in the premium branch (sidebar is not rendered for free users),
  // but React requires hooks to be called unconditionally.
  const chat = useFinotaurChat();

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
      <ErrorBoundary boundary="journal-finotaur-ai" fallback={<AiToolErrorFallback />}>
        <DailyLimitBanner usage={usageQuery.data ?? null} />
        {/* Three-column layout on large screens: history sidebar | main content | chat panel */}
        <div className="mt-ds-4 grid grid-cols-1 gap-ds-6 lg:grid-cols-[220px_1fr_380px]">
          {/* Conversation history sidebar — desktop only */}
          <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-ds-6 lg:self-start lg:max-h-[calc(100vh-120px)]">
            <ConversationHistorySidebar
              activeConversationId={chat.conversationId}
              onSelect={(id) => void chat.loadConversation(id)}
              onNew={() => chat.newConversation()}
            />
          </aside>

          {/* Main briefing content */}
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

          {/* Chat panel — receives the shared hook instance */}
          <aside className="lg:sticky lg:top-ds-6 lg:self-start">
            <CoachChatPanel prefillRequest={prefillRequest} chatInstance={chat} />
          </aside>
        </div>
      </ErrorBoundary>
    </PageShell>
  );
}
