// src/components/ai-copilot/ChatInterface.tsx
// =====================================================
// 💬 CHAT INTERFACE - Premium Gold Design v2.0
// =====================================================

import React, { useRef, useEffect, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, AlertCircle, X, Sparkles } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { SuggestedQuestions } from './SuggestedQuestions';
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
}

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
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
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
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
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
          <EmptyState onSelectQuestion={handleSuggestedQuestion} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
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
            <div className="max-w-3xl mx-auto p-4 rounded-xl flex items-center justify-between"
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

      {/* Input Area */}
      <div className="p-4"
        style={{
          background: 'linear-gradient(180deg, transparent, rgba(13,11,8,0.95))',
          borderTop: '1px solid rgba(201,166,70,0.1)',
        }}>
        <div className="max-w-3xl mx-auto">
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
            {/* Glow effect */}
            <div className={cn(
              "absolute -inset-1 rounded-2xl transition-opacity duration-500",
              isFocused ? "opacity-100" : "opacity-0"
            )} style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.2), rgba(244,217,123,0.05))',
              filter: 'blur(12px)',
            }} />
            
            <div className={cn(
              "relative rounded-xl transition-all duration-300",
              isFocused 
                ? "border-[#C9A646]/50" 
                : "border-[#C9A646]/20 hover:border-[#C9A646]/30"
            )} style={{
              background: 'linear-gradient(135deg, rgba(13,11,8,0.95), rgba(21,18,16,0.95))',
              border: `1px solid ${isFocused ? 'rgba(201,166,70,0.5)' : 'rgba(201,166,70,0.2)'}`,
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Ask about market analysis, trade ideas, reports..."
                disabled={isLoading}
                rows={1}
                className="w-full bg-transparent py-4 pl-5 pr-14 text-white placeholder-[#6B6B6B] focus:outline-none resize-none min-h-[56px] max-h-[200px]"
                style={{ scrollbarWidth: 'thin' }}
              />
              
              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "absolute right-3 bottom-3 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                  input.trim() && !isLoading
                    ? "opacity-100 scale-100"
                    : "opacity-50 scale-95"
                )}
                style={{
                  background: input.trim() && !isLoading
                    ? 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)'
                    : 'rgba(201,166,70,0.2)',
                  boxShadow: input.trim() && !isLoading
                    ? '0 4px 20px rgba(201,166,70,0.4)'
                    : 'none',
                }}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 text-black animate-spin" />
                ) : (
                  <Send className="h-5 w-5 text-black" />
                )}
              </button>
            </div>
          </div>
          
          {/* Disclaimer */}
          <p className="text-[10px] text-[#6B6B6B] mt-3 text-center">
            AI responses are based on FINOTAUR reports. Not financial advice.
          </p>
        </div>
      </div>
    </div>
  );
});

// =====================================================
// Empty State Component
// =====================================================

function EmptyState({ onSelectQuestion }: { onSelectQuestion: (q: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full py-12 px-4"
    >
      {/* Logo */}
      <div className="relative mb-8">
        {/* Glow */}
        <div className="absolute inset-0 rounded-full blur-2xl"
          style={{ background: 'rgba(201,166,70,0.2)' }} />
        
        <div className="relative w-24 h-24 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(201,166,70,0.2), rgba(201,166,70,0.05))',
            border: '2px solid rgba(201,166,70,0.3)',
            boxShadow: '0 8px 32px rgba(201,166,70,0.2)',
          }}>
          <svg
            viewBox="0 0 24 24"
            className="w-12 h-12 text-[#C9A646]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>
      
      {/* Title */}
      <h2 className="text-2xl md:text-3xl font-bold mb-3 text-center">
        <span className="text-white">FINOTAUR </span>
        <span style={{
          background: 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>AI Assistant</span>
      </h2>
      
      <p className="text-[#8B8B8B] text-center max-w-md mb-10 leading-relaxed">
        Ask me anything about market analysis, trade ideas, sector trends, 
        or insights from our institutional-grade reports.
      </p>
      
      {/* Suggested Questions */}
      <SuggestedQuestions onSelect={onSelectQuestion} />
    </motion.div>
  );
}

export default ChatInterface;