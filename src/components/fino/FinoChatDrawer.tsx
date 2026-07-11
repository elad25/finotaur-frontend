// src/components/fino/FinoChatDrawer.tsx
// =====================================================
// FINO AI — a standalone side-drawer chat.
// Opened from the SubNav "FINO AI" button (via FinoChatContext).
// This is SEPARATE from the Support widget. It reuses the same AI chat
// engine the retired /app/ai/assistant page used (useAICopilot + ChatInterface).
//
// v2026-07: FINO is TIERED. Every tier can chat; the persona, suggested
// prompts, locked-capability teasers and upgrade targets scale with the
// user's plan (see src/lib/fino-tiers.ts). Quotas stay server-enforced.
// =====================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { X, Plus, Sparkles, Lock, Loader2, Crown } from 'lucide-react';
import { ChatInterface } from '@/components/ai-copilot/ChatInterface';
import { useAICopilot } from '@/hooks/useAICopilot';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';
import { useUserProfile } from '@/hooks/useUserProfile';
import { FINO_TIERS, FINO_TIER_QUOTAS, resolveFinoTier } from '@/lib/fino-tiers';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AiToolErrorFallback } from '@/components/common/AiToolErrorFallback';
import { useFinoChat } from '@/contexts/FinoChatContext';
import type { FinoPageData } from '@/contexts/FinoChatContext';
import FinoAvatar from '@/components/fino/FinoAvatar';
import FinoQuotaRing from '@/components/fino/FinoQuotaRing';
import FinoInstantAnswerCard from '@/components/fino/FinoInstantAnswerCard';
import { FinoActionBar } from '@/components/fino/FinoActionBar';
import FinoTradeConfirmCard from '@/components/fino/FinoTradeConfirmCard';
import { aiCopilotApi } from '@/services/aiCopilotApi';
import type { TradeExtraction } from '@/services/aiCopilotApi';
import { compressImageFile } from '@/lib/fino/screenshotTrade';
import { useTrades } from '@/hooks/useTradesData';
import {
  matchInstantQuestion,
  computeInstantAnswer,
  type InstantAnswer,
} from '@/lib/finoInstantAnswers';

// Feature flag — gates the screenshot → trade extraction surface (📎 button,
// paste-to-extract, spinner/error/review cards). Defaults OFF.
// Set VITE_ENABLE_FINO_DETECTIVE=true in .env.local to enable locally.
const FINO_DETECTIVE_ENABLED = import.meta.env.VITE_ENABLE_FINO_DETECTIVE === 'true';

// Suggestion chips are tier-aware — see FINO_TIERS in src/lib/fino-tiers.ts.

// Human-readable label for the current route, so FINO knows which screen the
// user is on. First matching pattern wins; falls back to the title-cased path.
const FINO_PAGE_LABELS: Array<[RegExp, string]> = [
  [/^\/app\/journal\/trades/, 'Journal · My Trades'],
  [/^\/app\/journal\/trade\//, 'Journal · Trade Detail'],
  [/^\/app\/journal\/performance/, 'Journal · Performance'],
  [/^\/app\/journal\/calendar/, 'Journal · Calendar'],
  [/^\/app\/journal/, 'Journal'],
  [/^\/app\/ai\/stock-analyzer/, 'AI · Stock Analyzer'],
  [/^\/app\/ai/, 'AI Arena'],
  [/^\/app\/dashboard/, 'Dashboard'],
];

function deriveFinoLabel(path: string): string {
  for (const [re, label] of FINO_PAGE_LABELS) if (re.test(path)) return label;
  const seg = path.split('/').filter(Boolean).pop() ?? 'app';
  return seg.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Page-aware context FINO always sends with each message: where the user is
// (live route + label) plus any page-specific data a screen has registered.
function buildFinoContext(getPageData: () => FinoPageData | null) {
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  return { path, label: deriveFinoLabel(path), data: getPageData() ?? undefined };
}

export default function FinoChatDrawer() {
  const { openSignal, consumeOpenContext } = useFinoChat();
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | null>(null);

  // Open whenever something (the SubNav button) calls open().
  // Consume the open context exactly once per signal so the query is not re-sent on re-renders.
  useEffect(() => {
    if (openSignal > 0) {
      const ctx = consumeOpenContext();
      setIsOpen(true);
      setInitialQuery(typeof ctx?.query === 'string' && ctx.query.trim() ? ctx.query : null);
    }
  }, [openSignal, consumeOpenContext]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Mount the chat engine only while open (avoids global usage/API calls).
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex justify-end">
      <button
        type="button"
        aria-label="Close FINO AI"
        onClick={() => setIsOpen(false)}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      />
      <aside className="relative z-10 flex h-full w-full max-w-[460px] flex-col border-l border-[#C9A646]/20 bg-surface-base shadow-2xl animate-in slide-in-from-right duration-200">
        <FinoChatPanel onClose={() => setIsOpen(false)} initialQuery={initialQuery} />
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extraction state for the screenshot → trade flow
// ---------------------------------------------------------------------------

type ExtractionState =
  | { phase: 'idle' }
  | { phase: 'extracting' }
  | { phase: 'review'; extraction: TradeExtraction; file: File; mediaType: string }
  // kind 'upgrade' → tier gate (gold upsell banner, persists); 'error' → genuine failure (red, auto-dismiss)
  | { phase: 'error'; message: string; kind: 'upgrade' | 'error' };

function FinoChatPanel({
  onClose,
  initialQuery,
}: {
  onClose: () => void;
  initialQuery?: string | null;
}) {
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    usage,
    sendMessage,
    startNewConversation,
    clearError,
  } = useAICopilot();
  const { getPageData } = useFinoChat();
  const navigate = useNavigate();

  // Tier-aware FINO persona: prompts, teasers and upgrade targets per plan.
  // Journal-premium ("Trader") users on a free platform plan get the coach
  // persona — same `hasActiveSubscription` signal used across the app
  // (see useUserProfile.ts), not a separate fetch.
  const { plan } = usePlatformAccess();
  const { profile: journalProfile } = useUserProfile();
  const finoTierKey = resolveFinoTier(plan, journalProfile);
  const finoTier = FINO_TIERS[finoTierKey];

  // Remaining-questions pill: prefer the server-reported daily_limit (finite,
  // positive number); otherwise fall back to the client-side quota map.
  // null → tier is unlimited, pill renders nothing. `usage.unlimited` is the
  // authoritative signal from the server and always wins over FINO_TIER_QUOTAS.
  const serverLimit =
    usage && Number.isFinite(usage.daily_limit) && (usage.daily_limit as number) > 0
      ? usage.daily_limit
      : null;
  const quotaLimit = usage?.unlimited ? null : (serverLimit ?? FINO_TIER_QUOTAS[finoTierKey]);
  const questionsUsedDisplay = usage?.questions_today ?? 0;

  // Instant Answers — a small set of high-frequency journal questions are
  // answered from the trader's own trades (client-side, zero AI cost)
  // instead of hitting the AI. Drawer-scoped fetch (panel only mounts while
  // the drawer is open). See src/lib/finoInstantAnswers.ts.
  const { data: trades } = useTrades();
  const [instantAnswer, setInstantAnswer] = useState<InstantAnswer | null>(null);

  // Screenshot → trade extraction state
  const [extractionState, setExtractionState] = useState<ExtractionState>({ phase: 'idle' });

  // Imperative ref populated by ChatInterface — lets us open the file picker from here.
  const filePickerTriggerRef = useRef<(() => void) | null>(null);

  // Auto-submit the initial query once per unique query string.
  // Guards against double-send (StrictMode double-mount) via lastSentRef.
  const lastSentRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialQuery) return;
    if (lastSentRef.current === initialQuery) return;
    lastSentRef.current = initialQuery;
    void sendMessage(initialQuery, buildFinoContext(getPageData));
  }, [initialQuery, sendMessage, getPageData]);

  // Called by ChatInterface when user selects or pastes an image
  const handleImageSelected = useCallback(async (file: File) => {
    setExtractionState({ phase: 'extracting' });
    try {
      const { imageBase64, mediaType } = await compressImageFile(file);
      const { extraction } = await aiCopilotApi.extractTradeFromImage(
        imageBase64,
        mediaType,
      );
      setExtractionState({ phase: 'review', extraction, file, mediaType });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to analyze screenshot';
      const code = (err as { code?: string })?.code;
      const status = (err as { status?: number })?.status;
      // 'upgrade_required' (403) = tier gate; 'daily_limit_reached' (429) =
      // the free-tier screenshot-extraction daily cap — both get the same
      // persistent gold upgrade banner (never the transient red error).
      const isUpgrade =
        code === 'upgrade_required' || code === 'daily_limit_reached' || status === 403;
      setExtractionState({
        phase: 'error',
        message,
        kind: isUpgrade ? 'upgrade' : 'error',
      });
      // Auto-dismiss genuine errors after 5 s; keep the upgrade prompt until the user acts.
      if (!isUpgrade) {
        setTimeout(() => setExtractionState({ phase: 'idle' }), 5_000);
      }
    }
  }, []);

  const resetExtraction = useCallback(() => {
    setExtractionState({ phase: 'idle' });
  }, []);

  // Try the compute-first Instant Answer path before falling back to the AI.
  // Only intercepts exact matches against INSTANT_QUESTIONS with enough
  // trade history to compute a real answer — everything else goes to FINO.
  const handleSend = useCallback(
    async (message: string) => {
      const key = matchInstantQuestion(message);
      if (key) {
        const ans = computeInstantAnswer(key, trades ?? []);
        if (ans) {
          setInstantAnswer(ans);
          return;
        }
      }
      await sendMessage(message, buildFinoContext(getPageData));
    },
    [trades, sendMessage, getPageData],
  );

  const handleNewConversation = useCallback(() => {
    setInstantAnswer(null);
    startNewConversation();
  }, [startNewConversation]);

  // Listen for action events emitted by the SSE stream (via aiCopilotApi case 'action').
  // When the backend requests a screenshot upload, open the existing file picker.
  useEffect(() => {
    const handleFinoAction = (e: Event) => {
      if (!FINO_DETECTIVE_ENABLED) return;
      const detail = (e as CustomEvent<{ action: string }>).detail;
      if (detail?.action === 'screenshot_trade') {
        filePickerTriggerRef.current?.();
      }
    };
    window.addEventListener('fino:action', handleFinoAction);
    return () => window.removeEventListener('fino:action', handleFinoAction);
  }, []);

  const iconBtn =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-border-ds-subtle text-ink-secondary transition-colors duration-base hover:border-gold-border hover:text-gold-primary';

  return (
    <ErrorBoundary boundary="fino-ai" fallback={<AiToolErrorFallback />}>
      <div className="flex h-full flex-col bg-surface-base">
        {/* Header — compact: avatar + name + quota ring, no tagline/badge row */}
        <header className="flex flex-shrink-0 items-center justify-between border-b border-border-ds-subtle bg-surface-base px-5 py-4">
          <div className="flex items-center gap-3">
            <FinoAvatar
              thinking={isLoading || isStreaming}
              assistantCount={
                messages.filter((m) => m.role === 'assistant' && m.content?.trim()).length
              }
              size={36}
              className="h-9 w-9 rounded-full border border-[#C9A646]/40 object-cover"
            />
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <span className="text-ink-primary">FINO</span>
              <FinoQuotaRing used={questionsUsedDisplay} limit={quotaLimit} />
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {finoTier.upgrade && (
              <Link
                to="/app/upgrade"
                title={finoTier.upgrade.sublabel}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-black"
                style={{ background: 'linear-gradient(135deg,#C9A646,#F4D97B)' }}
              >
                <Crown className="h-3 w-3" />
                Upgrade
              </Link>
            )}
            <button onClick={handleNewConversation} title="New chat" className={iconBtn}>
              <Plus className="h-4 w-4" />
            </button>
            <button onClick={onClose} aria-label="Close" title="Close" className={iconBtn}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Body — open to all users; soft cap enforced server-side */}
        <>
          {/* Tier teaser — what FINO can also do on higher plans. Only while the
              conversation is empty AND no screenshot extraction is in
              progress, so it never competes with answers or the extraction
              flow (confirm card, upgrade banner, etc.). */}
          {finoTier.locked.length > 0 &&
            messages.length === 0 &&
            extractionState.phase === 'idle' && (
            <div className="flex-shrink-0 border-b border-border-ds-subtle px-4 py-2.5">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
                FINO can also…
              </p>
              <div className="flex flex-wrap gap-1.5">
                {finoTier.locked.map((cap) => {
                  const CapIcon = cap.icon;
                  return (
                    <button
                      key={cap.label}
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate('/app/upgrade');
                      }}
                      title={`Unlocks with ${cap.unlockedAt}`}
                      className="group flex items-center gap-1.5 rounded-full border border-border-ds-subtle bg-surface-1 px-2.5 py-1 text-[11px] text-ink-secondary transition-colors duration-base hover:border-[#C9A646]/40 hover:text-gold-primary"
                    >
                      <Lock className="h-3 w-3 text-ink-tertiary group-hover:text-gold-primary" />
                      <CapIcon className="h-3 w-3" />
                      <span>{cap.label}</span>
                      <span className="rounded-full bg-[#C9A646]/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-gold-primary">
                        {cap.unlockedAt}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {/* Session review card, action bar, extraction indicators and the
              extraction confirm card all render INSIDE ChatInterface's
              scrollable messages region (via `beforeMessages` below) — not
              as fixed siblings above it. Previously they sat outside the
              scroll container in a plain flex column with no overflow
              handling, so once their combined height (chips + review card +
              action bar + confirm card) exceeded the drawer's height, the
              overflow was simply clipped with no way to scroll to it. */}
          <div className="flex min-h-0 flex-1 flex-col">
            <ChatInterface
              messages={messages}
              isLoading={isLoading}
              isStreaming={isStreaming}
              error={error}
              onSendMessage={handleSend}
              onClearError={clearError}
              limitReached={(!usage?.unlimited && usage?.limit_reached) || false}
              questionsRemaining={usage?.unlimited ? 999 : (usage?.questions_remaining ?? 999)}
              userTier={(usage?.user_tier as 'FREE' | 'BASIC' | 'PREMIUM') ?? 'FREE'}
              questionsUsed={usage?.questions_today}
              dailyLimit={usage?.unlimited ? undefined : (usage?.daily_limit ?? undefined)}
              promptRows={finoTier.promptRows}
              promptPlacement="aboveInput"
              // Hide the suggestion pills the moment a screenshot is sent —
              // the extraction flow (spinner → confirm card → upgrade/error)
              // has no chat message yet, so the message-based auto-hide can't
              // fire. Any non-idle extraction phase suppresses the chips.
              suppressPrompts={extractionState.phase !== 'idle'}
              onImageSelected={FINO_DETECTIVE_ENABLED ? handleImageSelected : undefined}
              openFilePickerRef={FINO_DETECTIVE_ENABLED ? filePickerTriggerRef : undefined}
              beforeMessages={
                <div className="-mx-4">
                  {/* Instant Answer — compute-first, zero-cost response to a
                      matched high-frequency question. "Ask FINO why" spends
                      1 AI question and falls through to the normal chat. */}
                  {instantAnswer && (
                    <FinoInstantAnswerCard
                      answer={instantAnswer}
                      onDismiss={() => setInstantAnswer(null)}
                      onAskFino={(q) => {
                        setInstantAnswer(null);
                        void sendMessage(q, buildFinoContext(getPageData));
                      }}
                    />
                  )}

                  {/* Action approval bar — shown when the SSE stream emits a type:'action' event */}
                  <FinoActionBar />

                  {/* Screenshot extraction indicators — mounted near FinoActionBar */}
                  {FINO_DETECTIVE_ENABLED && extractionState.phase === 'extracting' && (
                    <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-[#C9A646]/20 bg-[#0D0C0A] px-3 py-2">
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#C9A646]" />
                      <span className="text-[11px] text-[#C9A646]">Analyzing screenshot…</span>
                    </div>
                  )}

                  {/* Tier gate — friendly gold upsell, persists until the user acts */}
                  {FINO_DETECTIVE_ENABLED &&
                    extractionState.phase === 'error' &&
                    extractionState.kind === 'upgrade' && (
                      <div className="mx-4 mb-2 flex items-start gap-2.5 rounded-lg border border-[#C9A646]/30 bg-[#C9A646]/10 px-3 py-2.5">
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A646]" />
                        <div className="flex-1">
                          <p className="text-[11px] leading-snug text-[#E8D9A8]">{extractionState.message}</p>
                          <button
                            type="button"
                            onClick={() => {
                              window.location.href = '/app/upgrade';
                            }}
                            className="mt-1.5 inline-flex items-center rounded-md bg-[#C9A646] px-2.5 py-1 text-[11px] font-semibold text-black transition-colors hover:bg-[#d8b65a]"
                          >
                            Upgrade
                          </button>
                        </div>
                        <button
                          type="button"
                          aria-label="Dismiss"
                          onClick={resetExtraction}
                          className="text-[#C9A646]/60 transition-colors hover:text-[#C9A646]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                  {/* Genuine extraction failure — red, auto-dismisses */}
                  {FINO_DETECTIVE_ENABLED &&
                    extractionState.phase === 'error' &&
                    extractionState.kind === 'error' && (
                      <div className="mx-4 mb-2 rounded-lg border border-red-500/20 bg-red-950/30 px-3 py-2">
                        <span className="text-[11px] text-red-400">{extractionState.message}</span>
                      </div>
                    )}

                  {FINO_DETECTIVE_ENABLED && extractionState.phase === 'review' && (
                    <FinoTradeConfirmCard
                      extraction={extractionState.extraction}
                      file={extractionState.file}
                      onClose={resetExtraction}
                    />
                  )}
                </div>
              }
            />
          </div>
        </>
      </div>
    </ErrorBoundary>
  );
}
