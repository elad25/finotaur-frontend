// src/pages/app/journal/finotaur-ai/FinotaurAI.tsx
// Page orchestrator for /app/journal/finotaur-ai.
// Decision tree: Free → UpsellGate (no API), 0-trades → EmptyState, happy path → wide CoachChatPanel
// (score header + briefing-as-suggestions live inside the chat).
// Mentor View: bypasses premium gate, reads student data read-only, hides all write affordances.

import * as React from 'react';
import { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useFinotaurScore } from './hooks/useFinotaurScore';
import { useBriefing } from './hooks/useBriefing';
import { useMentorChatHistory } from './hooks/useMentorChatHistory';
import { EmptyState } from './components/EmptyState';
import { UpsellGate } from './components/UpsellGate';
import CoachChatPanel from './components/CoachChatPanel';
import { ConversationHistorySidebar } from './components/ConversationHistorySidebar';
import { useFinotaurChat } from './hooks/useFinotaurChat';
import { DailyLimitBanner } from './components/DailyLimitBanner';
import { useUsage } from './hooks/useUsage';
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

  // Mentor View detection: when isMentorView is true, effectiveUserId is the student's id.
  // useEffectiveUser composes MentorView > Impersonation > Session.
  const { id: effectiveUserId, isMentorView } = useEffectiveUser();

  // isPremium covers: admin, lifetime, premium plan, platform bundle.
  // Free users see UpsellGate without any API calls to journal-ai.
  // Mentor View bypasses the premium gate — the mentor is viewing, not subscribing.
  const isPremium: boolean = isMentorView ? true : (subscription.isPremium ?? false);

  // In mentor view we pass effectiveUserId (the student's id) as overrideUserId,
  // which causes the hooks to read directly from Supabase via RLS rather than
  // the server API (which uses the mentor's own session).
  const overrideUserId: string | undefined = isMentorView ? effectiveUserId : undefined;

  // Only fetch score/briefing when premium (or mentor). enabled=false means zero network cost.
  const {
    data: score,
    isLoading,
  } = useFinotaurScore(30, isPremium, overrideUserId);

  const briefingQuery = useBriefing(isPremium, overrideUserId);

  // In mentor view: disable usage tracking — the mentor is not the rate-limited user.
  const usageQuery = useUsage(isMentorView ? false : isPremium);

  // Lift chat hook to page level so the sidebar and chat panel share state.
  // React requires hooks to be called unconditionally.
  const chat = useFinotaurChat();

  // Mentor chat history: load the student's most-recent conversation read-only.
  // Enabled only in mentor view. Uses effectiveUserId (student's id).
  const mentorHistory = useMentorChatHistory(effectiveUserId, isMentorView);

  const [prefillRequest, setPrefillRequest] = useState<string | null>(null);

  // In mentor view: "Discuss" would open the mentor's own chat, not the student's.
  // We keep onDiscuss wired for the owner path only.
  const handleDiscuss = isMentorView
    ? undefined
    : (insight: Insight) => {
        setPrefillRequest(`Tell me more about: ${insight.title ?? insight.body ?? insight.id}`);
      };

  // Subscription not resolved yet (skip during mentor view — no gate needed)
  if (!isMentorView && subscription.isLoading) {
    return <PageLoader />;
  }

  // Free users (non-mentor): UpsellGate, no API calls
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
        {/* Daily limit banner — suppressed in mentor view (mentor has no usage counter) */}
        {!isMentorView && <DailyLimitBanner usage={usageQuery.data ?? null} />}

        {/* Two-column layout on large screens: history sidebar | wide chat.
            The FINOTAUR score (header) and the daily briefing (as tappable
            starter suggestions) now live INSIDE the chat panel. */}
        <div className="mt-ds-4 grid grid-cols-1 gap-ds-6 lg:grid-cols-[220px_1fr]">
          {/* Conversation history sidebar — hidden in mentor view (student owns convos) */}
          {!isMentorView && (
            <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-ds-6 lg:self-start lg:max-h-[calc(100vh-120px)]">
              <ConversationHistorySidebar
                activeConversationId={chat.conversationId}
                onSelect={(id) => void chat.loadConversation(id)}
                onNew={() => chat.newConversation()}
              />
            </aside>
          )}
          {/* Spacer column placeholder in mentor view so grid alignment holds */}
          {isMentorView && <div className="hidden lg:block" aria-hidden="true" />}

          {/* Wide chat panel — score header + briefing-as-suggestions live inside it */}
          <aside className="lg:sticky lg:top-ds-6 lg:self-start lg:h-[calc(100vh-120px)]">
            <CoachChatPanel
              prefillRequest={isMentorView ? null : prefillRequest}
              chatInstance={chat}
              isReadOnly={isMentorView}
              messagesOverride={isMentorView ? mentorHistory.messages : undefined}
              score={score ?? null}
              briefing={briefingQuery.data?.briefing ?? null}
              onDiscuss={handleDiscuss}
            />
          </aside>
        </div>
      </ErrorBoundary>
    </PageShell>
  );
}
