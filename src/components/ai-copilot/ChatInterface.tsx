// src/components/ai-copilot/ChatInterface.tsx
// =====================================================
// 💬 CHAT INTERFACE - Premium Gold Design v2.0
// =====================================================

import React, { useRef, useEffect, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Loader2,
  AlertCircle,
  X,
  TrendingUp,
  BarChart3,
  Bitcoin,
  Shield,
  Building2,
  LineChart,
  Paperclip,
  LucideIcon,
} from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { UpgradeLimitModal } from './UpgradeLimitModal';
import { Message } from '@/hooks/useAICopilot';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  onSendMessage: (message: string) => Promise<void>;
  onClearError: () => void;
  limitReached?: boolean;
  questionsRemaining?: number;
  userTier?: 'FREE' | 'BASIC' | 'PREMIUM';
  questionsUsed?: number;
  dailyLimit?: number;
  emptyTitle?: React.ReactNode;
  emptyDescription?: string;
  promptRows?: PromptChip[][];
  placeholder?: string;
  disclaimer?: string;
  /** Controls where suggestion chips appear.
   *  'center'     — default: marquee rows in the empty-state area (existing behavior).
   *  'aboveInput' — compact pill bubbles placed directly above the input bar;
   *                 chips vanish once the conversation has messages. */
  promptPlacement?: 'center' | 'aboveInput';
  /**
   * Optional callback invoked when the user selects or pastes an image file.
   * When provided, a Paperclip upload button is shown in the composer row.
   * When absent, no upload affordance is rendered (backward compatible).
   */
  onImageSelected?: (file: File) => void;
}

interface PromptChip {
  icon: LucideIcon;
  question: string;
}

const PROMPT_ROWS: PromptChip[][] = [
  [
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

export const ChatInterface = memo(function ChatInterface({
  messages,
  isLoading,
  isStreaming,
  error,
  onSendMessage,
  onClearError,
  limitReached = false,
  questionsRemaining = 999,
  userTier = 'FREE',
  questionsUsed = 0,
  dailyLimit = 5,
  emptyTitle = <>FINOTAUR <span className="text-gold-primary">AI Assistant</span></>,
  emptyDescription = 'Ask a market question to begin.',
  promptRows = PROMPT_ROWS,
  placeholder = 'Ask about market analysis, trade ideas, reports...',
  disclaimer = 'AI responses are based on FINOTAUR reports. Not financial advice.',
  promptPlacement = 'center',
  onImageSelected,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const handleSend = async () => {
    const message = input.trim();
    if (!message || isLoading) return;
    
    if (limitReached) {
      setShowUpgradeModal(true);
      return;
    }
    
    setInput('');
    await onSendMessage(message);
  };

  const handleSuggestedQuestion = async (question: string) => {
    if (isLoading) return;

    if (limitReached) {
      setShowUpgradeModal(true);
      return;
    }

    setInput('');
    await onSendMessage(question);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Image upload via hidden file input
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageSelected) {
      onImageSelected(file);
    }
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  // Image paste from clipboard
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onImageSelected) return;
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        e.preventDefault();
        onImageSelected(file);
      }
    }
  };
  
  const showEmptyState = messages.length === 0 && !isLoading;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6"
        style={{ scrollBehavior: 'smooth' }}
      >
        {showEmptyState ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            promptRows={promptRows}
            onSelectQuestion={handleSuggestedQuestion}
            hideChips={promptPlacement === 'aboveInput'}
          />
        ) : (
          <div className="w-full space-y-6">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MessageBubble
                    message={message}
                    isLast={index === messages.length - 1}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isStreaming && <TypingIndicator />}
          </div>
        )}
      </div>
      
      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 pb-4"
          >
            <div className="flex w-full items-center justify-between rounded-xl p-4"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
              }}>
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-[#EF4444]" />
                <span className="text-sm text-[#EF4444]">{error}</span>
              </div>
              <button
                onClick={onClearError}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4 text-[#EF4444]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Upgrade Modal */}
      <UpgradeLimitModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={userTier}
        questionsUsed={questionsUsed}
        dailyLimit={dailyLimit}
      />

      {/* Above-input chip bubbles — only when promptPlacement === 'aboveInput' and conversation is empty */}
      {promptPlacement === 'aboveInput' && showEmptyState && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {promptRows.flat().slice(0, 6).map((chip) => {
            const Icon = chip.icon;
            return (
              <button
                key={chip.question}
                type="button"
                onClick={() => handleSuggestedQuestion(chip.question)}
                className="flex items-center gap-1 rounded-full border border-[#C9A646]/20 bg-[#C9A646]/5 px-2.5 py-1 text-[11px] text-ink-secondary transition-colors hover:bg-[#C9A646]/10 hover:text-ink-primary"
              >
                <Icon className="h-3 w-3 shrink-0" />
                {chip.question}
              </button>
            );
          })}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border-ds-subtle bg-surface-base p-4">
        <div className="w-full">
          {/* Low questions warning */}
          {questionsRemaining > 0 && questionsRemaining <= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 flex items-center justify-center gap-2"
            >
              <span className="w-2 h-2 bg-[#F59E0B] rounded-full animate-pulse" />
              <span className="text-xs text-[#F59E0B]">
                {questionsRemaining} question{questionsRemaining > 1 ? 's' : ''} remaining today
              </span>
            </motion.div>
          )}
          
          {/* Input Container */}
          <div className="relative">
            <div className={cn(
              "relative rounded-[12px] border bg-surface-1 transition-colors duration-base",
              isFocused 
                ? "border-gold-primary/50" 
                : "border-border-ds-subtle hover:border-gold-border"
            )}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                disabled={isLoading}
                rows={1}
                className={cn(
                  "min-h-[56px] max-h-[200px] w-full resize-none bg-transparent py-4 text-ink-primary placeholder:text-ink-muted focus:outline-none",
                  onImageSelected ? "pl-5 pr-[5.5rem]" : "pl-5 pr-14",
                )}
                style={{ scrollbarWidth: 'thin' }}
              />

              {/* Hidden file input for image upload */}
              {onImageSelected && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              )}

              {/* Paperclip upload button — only when onImageSelected is provided */}
              {onImageSelected && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  title="Upload screenshot"
                  className="absolute bottom-3 right-14 flex h-10 w-10 items-center justify-center rounded-[12px] text-ink-muted transition-colors hover:text-gold-primary disabled:opacity-40"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
              )}

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-[12px] transition-all duration-base",
                  input.trim() && !isLoading
                    ? "scale-100 bg-gradient-gold opacity-100 shadow-btn-gold"
                    : "scale-95 bg-gold-primary/20 opacity-50"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-ink-on-gold" />
                ) : (
                  <Send className="h-5 w-5 text-ink-on-gold" />
                )}
              </button>
            </div>
          </div>
          
          {/* Disclaimer */}
          <p className="mt-3 text-center text-[10px] text-ink-tertiary">
            {disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
});

// =====================================================
// Empty State Component
// =====================================================

function EmptyState({
  title,
  description,
  promptRows,
  onSelectQuestion,
  hideChips = false,
}: {
  title: React.ReactNode;
  description: string;
  promptRows: PromptChip[][];
  onSelectQuestion: (question: string) => void;
  /** When true, the marquee chip rows are suppressed (chips rendered elsewhere). */
  hideChips?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full flex-col items-center justify-center px-4 py-12"
    >
      <h2 className="mb-ds-2 text-center text-xl font-semibold text-ink-primary">
        {title}
      </h2>
      <p className="max-w-sm text-center text-sm leading-relaxed text-ink-secondary">
        {description}
      </p>
      {!hideChips && (
        <PromptMarquee promptRows={promptRows} onSelectQuestion={onSelectQuestion} />
      )}
    </motion.div>
  );
}

function PromptMarquee({
  promptRows,
  onSelectQuestion,
}: {
  promptRows: PromptChip[][];
  onSelectQuestion: (question: string) => void;
}) {
  return (
    <div className="mt-8 w-full max-w-5xl overflow-hidden rounded-[12px] border border-border-ds-subtle bg-black py-4">
      <div
        className="space-y-3 overflow-hidden"
        style={{
          maskImage: 'linear-gradient(90deg, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, black 10%, black 90%, transparent)',
        }}
      >
        {promptRows.map((row, index) => (
          <motion.div
            key={index}
            className="flex w-max gap-3 px-3"
            animate={{ x: index % 2 === 0 ? ['0%', '-50%'] : ['-50%', '0%'] }}
            transition={{
              duration: index % 2 === 0 ? 26 : 30,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {[...row, ...row].map((item, itemIndex) => {
              const Icon = item.icon;

              return (
                <button
                  key={`${item.question}-${itemIndex}`}
                  type="button"
                  onClick={() => onSelectQuestion(item.question)}
                  className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-border-ds-subtle bg-black px-4 text-sm text-ink-secondary transition-colors duration-base hover:border-gold-border hover:text-gold-primary"
                >
                  <Icon className="h-4 w-4 text-gold-primary/70" />
                  <span>{item.question}</span>
                </button>
              );
            })}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default ChatInterface;
