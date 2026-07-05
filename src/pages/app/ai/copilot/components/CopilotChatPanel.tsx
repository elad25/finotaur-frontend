// src/pages/app/ai/copilot/components/CopilotChatPanel.tsx
import { ChatInterface } from '@/components/ai-copilot/ChatInterface';
import { useAICopilot } from '@/hooks/useAICopilot';

export function CopilotChatPanel() {
  const copilot = useAICopilot();

  // ChatInterface expects (message: string) => Promise<void>;
  // useAICopilot.sendMessage returns Promise<string | null>. Wrap to align types.
  const handleSendMessage = async (message: string): Promise<void> => {
    await copilot.sendMessage(message);
  };

  return (
    <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="px-ds-4 py-ds-4 border-b border-border-ds-subtle">
        <h2 className="text-sm font-semibold text-ink-primary">
          AI <span className="text-gold-primary">Copilot</span>
        </h2>
        <p className="text-xs text-ink-tertiary mt-0.5">Ask anything about your portfolio</p>
      </div>
      <ChatInterface
        messages={copilot.messages}
        isLoading={copilot.isLoading}
        isStreaming={copilot.isStreaming}
        error={copilot.error}
        onSendMessage={handleSendMessage}
        onClearError={copilot.clearError}
        limitReached={copilot.usage?.limit_reached}
        questionsRemaining={copilot.usage?.questions_remaining}
        questionsUsed={copilot.usage?.questions_today}
        dailyLimit={copilot.usage?.unlimited ? undefined : (copilot.usage?.daily_limit ?? undefined)}
      />
    </div>
  );
}
