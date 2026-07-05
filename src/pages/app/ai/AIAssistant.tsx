// src/pages/app/ai/AIAssistant.tsx
// =====================================================
// 🤖 FINOTAUR AI ASSISTANT - Premium Gold Design v2.0
// =====================================================
// Unified design with Stock Analyzer, Options Intelligence & Flow Scanner
// =====================================================

import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePlatformAccess } from '@/hooks/usePlatformAccess';
import { UpgradeGate } from '@/components/access/UpgradeGate';
import { Plus, Sparkles } from 'lucide-react';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';
import { AiAssistantSkeletonPage } from '@/components/skeletons/AiAssistantSkeleton';
import { ChatInterface } from '@/components/ai-copilot/ChatInterface';
import { UsageBanner } from '@/components/ai-copilot/UsageBanner';
import { useAICopilot } from '@/hooks/useAICopilot';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AiToolErrorFallback } from '@/components/common/AiToolErrorFallback';

export default function AIAssistant() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationId = searchParams.get('conversation');

  const { canAccessPage, plan, loading: accessLoading } = usePlatformAccess();
  const access = canAccessPage('ai_assistant');
  
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    usage,
    currentConversation,
    sendMessage,
    startNewConversation,
    loadConversation,
    clearError,
  } = useAICopilot(conversationId);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);
  
  // ✅ Early return AFTER all hooks
  if (accessLoading) {
    return <AiAssistantSkeletonPage />;
  }

  if (!access.hasAccess) {
    return (
      <UpgradeGate
        feature="AI Assistant"
        reason={access.reason}
        message={access.message}
        upgradeTarget={access.upgradeTarget}
        upgradeDisplayName={access.upgradeDisplayName}
        upgradePrice={access.upgradePrice}
        currentPlan={plan === 'platform_finotaur' ? 'finotaur' : plan === 'platform_enterprise' ? 'enterprise' : plan === 'platform_investor' ? 'investor' : 'free'}
      />
    );
  }
  
  const handleNewConversation = () => {
    startNewConversation();
    setSearchParams({});
  };
  
  const handleSendMessage = async (message: string) => {
    const newConversationId = await sendMessage(message);
    if (newConversationId && !conversationId) {
      setSearchParams({ conversation: newConversationId });
    }
  };

  return (
    <ErrorBoundary boundary="ai-assistant" fallback={<AiToolErrorFallback />}>
    <div className="relative flex h-[calc(100vh-4rem)] overflow-hidden bg-surface-base">
      {/* Main Chat Area */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="relative border-b border-border-ds-subtle bg-surface-base px-6 py-4">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <span className="text-ink-primary">FINOTAUR</span>
                  <span className="text-gold-primary">AI</span>
                  <Sparkles className="h-4 w-4 text-gold-primary" />
                </h1>
                <p className="text-xs text-ink-tertiary">
                  {currentConversation?.title || 'New Conversation'}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleNewConversation}
              className="hidden items-center gap-2 rounded-[12px] border border-border-ds-subtle bg-surface-1 px-ds-4 py-ds-2 text-sm font-medium text-ink-secondary transition-colors duration-base hover:border-gold-border hover:text-gold-primary sm:flex"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </button>
          </div>
        </header>
        
        {/* Usage Banner */}
        {usage && (usage.user_tier === 'FREE' || usage.user_tier === 'BASIC') && (
          <UsageBanner usage={usage} />
        )}
        
        {/* Chat Interface */}
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          isStreaming={isStreaming}
          error={error}
          onSendMessage={handleSendMessage}
          onClearError={clearError}
          limitReached={usage?.limit_reached || false}
          questionsRemaining={usage?.questions_remaining ?? 999}
          userTier={(usage?.user_tier as 'FREE' | 'BASIC' | 'PREMIUM') ?? 'FREE'}
          questionsUsed={usage?.questions_today}
          dailyLimit={usage?.daily_limit}
        />
      </div>
    </div>
    </ErrorBoundary>
  );
}
