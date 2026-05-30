// src/pages/app/journal/finotaur-ai/FinotaurAI.tsx
// Page orchestrator for /app/journal/finotaur-ai.
// Decision tree: Free → UpsellGate (no API), 0-trades → EmptyState, error → ErrorCard, happy path → ScoreHero + BriefingHero.
// Mentor mode (readOnly=true): bypasses premium gate and usage, shows student data read-only.

import * as React from 'react';
import { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useFinotaurScore } from './hooks/useFinotaurScore';
import { useBriefing, useRefreshBriefing } from './hooks/useBriefing';
import { useMentorChatHistory } from './hooks/useMentorChatHistory';
import { BriefingHero } from './components/BriefingHero';
import { ScoreHero } from './components/ScoreHero';
import { EmptyState } from './components/EmptyState';
import { UpsellGate } from './components/UpsellGate';
import CoachChatPanel from './components/CoachChatPanel';
import { DailyLimitBanner } from './components/DailyLimitBanner';
import { useUsage } from './hooks/useUsage';
import { BriefingApiError } from './services/finotaurAIApi';
import type { Insight } from './types';

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
// Props
// ---------------------------------------------------------------------------
interface FinotaurAIProps {
  /** Mentor mode: override the user whose data is displayed. */
  overrideUserId?: string;
  /** Mentor mode: hides all write actions (Refresh, Send chat). */
  readOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function FinotaurAI({ overrideUserId, readOnly }: FinotaurAIProps = {}) {
  const isMentorMode = readOnly === true;

  const subscription = useSubscription();

  // isPremium covers: admin, lifetime, premium plan, platform bundle.
  // Free users see UpsellGate without any API calls to journal-ai.
  // In mentor mode, bypass the subscription gate entirely — the mentor
  // views regardless of their own subscription tier.
  const isPremium: boolean = isMentorMode ? true : (subscription.isPremium ?? false);

  // Only fetch score/briefing for premium users (or always in mentor mode).
  // In mentor mode, pass overrideUserId so the hook fetches via RPC.
  const {
    data: score,
    isLoading,
    error,
    refetch,
  } = useFinotaurScore(30, isPremium, overrideUserId);

  // In mentor mode, pass overrideUserId so the hook reads from Supabase directly.
  const briefingQuery = useBriefing(isPremium, overrideUserId);

  // Refresh mutation is only used in owner mode. Instantiate unconditionally
  // (hook rules), but never call mutate in mentor mode.
  const refreshMutation = useRefreshBriefing();

  // Usage query is scoped to the authed user — useless in mentor mode.
  // enabled=false means zero network cost when overrideUserId is set.
  const usageQuery = useUsage(isPremium && !isMentorMode);

  // Mentor chat history — fetches student's conversation & messages read-only.
  const mentorChat = useMentorChatHistory(overrideUserId, isMentorMode);

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

  // Subscription not resolved yet (skip in mentor mode — we bypass the gate)
  if (!isMentorMode && subscription.isLoading) {
    return <PageLoader />;
  }

  // Free users: UpsellGate, no API calls (never shown in mentor mode)
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
      {/* Daily usage banner shown only for the authenticated owner, not in mentor mode */}
      {!isMentorMode && <DailyLimitBanner usage={usageQuery.data ?? null} />}
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
              refreshing={briefingQuery.data?.refreshing ?? (!isMentorMode && refreshMutation.isPending)}
              generatedAt={briefingQuery.data?.generated_at ?? null}
              isLoading={briefingQuery.isLoading}
              error={briefingQuery.error as Error | null}
              onRefresh={isMentorMode ? undefined : handleRefresh}
              refreshing429={isMentorMode ? false : refreshing429}
              onDiscuss={isMentorMode ? undefined : handleDiscuss}
              readOnly={readOnly}
            />
          </div>
        </div>
        <aside className="lg:sticky lg:top-ds-6 lg:self-start">
          <CoachChatPanel
            prefillRequest={isMentorMode ? undefined : prefillRequest}
            readOnly={readOnly}
            messages={isMentorMode ? mentorChat.messages : undefined}
          />
        </aside>
      </div>
    </PageShell>
  );
}
