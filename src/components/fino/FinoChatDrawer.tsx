// src/components/fino/FinoChatDrawer.tsx
// =====================================================
// FINO AI — a standalone side-drawer chat.
// Opened from the SubNav "FINO AI" button (via FinoChatContext).
// This is SEPARATE from the Support widget. It reuses the same AI chat
// engine the retired /app/ai/assistant page used (useAICopilot + ChatInterface).
// =====================================================

import { useEffect, useState } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';
import { ChatInterface } from '@/components/ai-copilot/ChatInterface';
import { UsageBanner } from '@/components/ai-copilot/UsageBanner';
import { useAICopilot } from '@/hooks/useAICopilot';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';
import { UpgradeGate } from '@/components/access/UpgradeGate';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AiToolErrorFallback } from '@/components/common/AiToolErrorFallback';
import { useFinoChat } from '@/contexts/FinoChatContext';

const FINO_AVATAR = '/fino-avatar.png';

export default function FinoChatDrawer() {
  const { openSignal } = useFinoChat();
  const [isOpen, setIsOpen] = useState(false);

  // Open whenever something (the SubNav button) calls open().
  useEffect(() => {
    if (openSignal > 0) setIsOpen(true);
  }, [openSignal]);

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
        <FinoChatPanel onClose={() => setIsOpen(false)} />
      </aside>
    </div>
  );
}

function FinoChatPanel({ onClose }: { onClose: () => void }) {
  const { canAccessPage, plan, loading: accessLoading } = usePlatformAccess();
  const access = canAccessPage('ai_assistant');
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

  const iconBtn =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-border-ds-subtle text-ink-secondary transition-colors duration-base hover:border-gold-border hover:text-gold-primary';

  return (
    <ErrorBoundary boundary="fino-ai" fallback={<AiToolErrorFallback />}>
      <div className="flex h-full flex-col bg-surface-base">
        {/* Header */}
        <header className="flex flex-shrink-0 items-center justify-between border-b border-border-ds-subtle bg-surface-base px-5 py-4">
          <div className="flex items-center gap-3">
            <img
              src={FINO_AVATAR}
              alt=""
              aria-hidden="true"
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
            {access.hasAccess && !accessLoading && (
              <button onClick={startNewConversation} title="New chat" className={iconBtn}>
                <Plus className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} aria-label="Close" title="Close" className={iconBtn}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Body */}
        {accessLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#C9A646]" />
          </div>
        ) : !access.hasAccess ? (
          <div className="flex-1 overflow-y-auto">
            <UpgradeGate
              feature="FINO AI"
              reason={access.reason}
              message={access.message}
              upgradeTarget={access.upgradeTarget}
              upgradeDisplayName={access.upgradeDisplayName}
              upgradePrice={access.upgradePrice}
              currentPlan={
                plan === 'platform_core'
                  ? 'core'
                  : plan === 'platform_finotaur'
                  ? 'finotaur'
                  : plan === 'platform_enterprise'
                  ? 'enterprise'
                  : 'free'
              }
            />
          </div>
        ) : (
          <>
            {usage && (usage.user_tier === 'FREE' || usage.user_tier === 'BASIC') && (
              <UsageBanner usage={usage} />
            )}
            <div className="flex min-h-0 flex-1 flex-col">
              <ChatInterface
                messages={messages}
                isLoading={isLoading}
                isStreaming={isStreaming}
                error={error}
                onSendMessage={async (message: string) => {
                  await sendMessage(message);
                }}
                onClearError={clearError}
                limitReached={usage?.limit_reached || false}
                questionsRemaining={usage?.questions_remaining ?? 999}
                userTier={(usage?.user_tier as 'FREE' | 'BASIC' | 'PREMIUM') ?? 'FREE'}
                questionsUsed={usage?.questions_today}
                dailyLimit={usage?.daily_limit}
              />
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
