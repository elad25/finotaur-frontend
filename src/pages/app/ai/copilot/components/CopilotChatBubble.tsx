// src/pages/app/ai/copilot/components/CopilotChatBubble.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { ChatInterface } from '@/components/ai-copilot/ChatInterface';
import { useAICopilot } from '@/hooks/useAICopilot';
import { cn } from '@/lib/utils';

export function CopilotChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const copilot = useAICopilot();

  const handleSendMessage = async (message: string): Promise<void> => {
    await copilot.sendMessage(message);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'w-[400px] h-[600px] rounded-[16px] bg-surface-1 border border-border-ds-subtle',
              'shadow-2xl overflow-hidden flex flex-col',
              'origin-bottom-right'
            )}
          >
            {/* Window header */}
            <div className="px-ds-4 py-ds-3 border-b border-border-ds-subtle flex items-center justify-between shrink-0">
              <h2 className="text-sm font-bold tracking-tight text-ink-primary">
                AI <span className="text-gold-primary">Copilot</span>
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-ink-tertiary hover:text-ink-primary hover:bg-white/10 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chat body */}
            <div className="flex-1 min-h-0">
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
                dailyLimit={copilot.usage?.daily_limit}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB trigger button */}
      <motion.button
        onClick={() => setIsOpen(prev => !prev)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center',
          'bg-gradient-to-br from-gold-primary to-gold-primary/80',
          'shadow-glow-gold-resting',
          'transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary'
        )}
        aria-label={isOpen ? 'Close AI Copilot' : 'Open AI Copilot'}
      >
        <MessageCircle className="w-6 h-6 text-surface-base" />
      </motion.button>
    </div>
  );
}
