// src/components/fino/FinoChatDrawer.tsx
// =====================================================
// FINO AI — a standalone side-drawer chat.
// Opened from the SubNav "FINO AI" button (via FinoChatContext).
// This is SEPARATE from the Support widget. It reuses the same AI chat
// engine the retired /app/ai/assistant page used (useAICopilot + ChatInterface).
// =====================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Plus, Sparkles, Sun, TrendingUp, BarChart3, Bitcoin, Shield, Building2, LineChart, Loader2 } from 'lucide-react';
import { ChatInterface } from '@/components/ai-copilot/ChatInterface';
import { UsageBanner } from '@/components/ai-copilot/UsageBanner';
import { useAICopilot } from '@/hooks/useAICopilot';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AiToolErrorFallback } from '@/components/common/AiToolErrorFallback';
import { useFinoChat } from '@/contexts/FinoChatContext';
import type { FinoPageData } from '@/contexts/FinoChatContext';
import FinoAvatar from '@/components/fino/FinoAvatar';
import FinoSessionReviewCard from '@/components/fino/FinoSessionReviewCard';
import { FinoActionBar } from '@/components/fino/FinoActionBar';
import FinoTradeConfirmCard from '@/components/fino/FinoTradeConfirmCard';
import { aiCopilotApi } from '@/services/aiCopilotApi';
import type { TradeExtraction } from '@/services/aiCopilotApi';
import { compressImageFile } from '@/lib/fino/screenshotTrade';
import type { LucideIcon } from 'lucide-react';

// Feature flag — gates the screenshot → trade extraction surface (📎 button,
// paste-to-extract, spinner/error/review cards). Defaults OFF.
// Set VITE_ENABLE_FINO_DETECTIVE=true in .env.local to enable locally.
const FINO_DETECTIVE_ENABLED = import.meta.env.VITE_ENABLE_FINO_DETECTIVE === 'true';

// Suggestion chips shown in the FINO drawer's empty state.
// Morning briefing chip is prepended so it surfaces first.
const FINO_PROMPT_ROWS: { icon: LucideIcon; question: string }[][] = [
  [
    { icon: Sun, question: 'Give me today\'s morning briefing' },
    { icon: TrendingUp, question: 'What are the latest trade ideas?' },
    { icon: BarChart3, question: 'Which sectors should I favor this week?' },
    { icon: Bitcoin, question: 'What is the current crypto regime?' },
    { icon: Shield, question: 'What risks should I watch right now?' },
  ],
  [
    { icon: Building2, question: 'Summarize the latest company analysis' },
    { icon: LineChart, question: 'What is the macro outlook?' },
    { icon: TrendingUp, question: 'Where is momentum improving?' },
    { icon: Shield, question: 'What could invalidate this setup?' },
  ],
];

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
      const isUpgrade = code === 'upgrade_required' || status === 403;
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
        {/* Header */}
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
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-bold">
                <span className="text-ink-primary">FINO</span>
                <span className="text-gold-primary">AI</span>
                <Sparkles className="h-3.5 w-3.5 text-gold-primary" />
              </h2>
              <p className="text-[11px] text-ink-tertiary">Your Finotaur AI assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={startNewConversation} title="New chat" className={iconBtn}>
              <Plus className="h-4 w-4" />
            </button>
            <button onClick={onClose} aria-label="Close" title="Close" className={iconBtn}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Body — open to all users; soft cap enforced server-side + UsageBanner */}
        <>
          {usage && (usage.user_tier === 'FREE' || usage.user_tier === 'BASIC') && (
            <UsageBanner usage={usage} />
          )}
          {/* Session Review card — sits above the chat thread, never throws */}
          <FinoSessionReviewCard />
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

          <div className="flex min-h-0 flex-1 flex-col">
            <ChatInterface
              messages={messages}
              isLoading={isLoading}
              isStreaming={isStreaming}
              error={error}
              onSendMessage={async (message: string) => {
                await sendMessage(message, buildFinoContext(getPageData));
              }}
              onClearError={clearError}
              limitReached={usage?.limit_reached || false}
              questionsRemaining={usage?.questions_remaining ?? 999}
              userTier={(usage?.user_tier as 'FREE' | 'BASIC' | 'PREMIUM') ?? 'FREE'}
              questionsUsed={usage?.questions_today}
              dailyLimit={usage?.daily_limit}
              promptRows={FINO_PROMPT_ROWS}
              promptPlacement="aboveInput"
              onImageSelected={FINO_DETECTIVE_ENABLED ? handleImageSelected : undefined}
              openFilePickerRef={FINO_DETECTIVE_ENABLED ? filePickerTriggerRef : undefined}
            />
          </div>
        </>
      </div>
    </ErrorBoundary>
  );
}
