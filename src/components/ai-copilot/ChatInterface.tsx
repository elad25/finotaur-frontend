// src/components/ai-copilot/ChatInterface.tsx
// FINOTAUR AI Copilot - Chat Interface Component

import React, { useRef, useEffect, useState } from 'react';
import { Send, Loader2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { SuggestedQuestions } from './SuggestedQuestions';
import { Message } from '@/hooks/useAICopilot';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  onSendMessage: (message: string) => Promise<void>;
  onClearError: () => void;
  disabled?: boolean;
}

export function ChatInterface({
  messages,
  isLoading,
  isStreaming,
  error,
  onSendMessage,
  onClearError,
  disabled = false,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  // Handle send
  const handleSend = async () => {
    const message = input.trim();
    if (!message || isLoading || disabled) return;
    
    setInput('');
    await onSendMessage(message);
  };
  
  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Handle suggested question click
  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };
  
  const showEmptyState = messages.length === 0 && !isLoading;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages Area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {showEmptyState ? (
          <EmptyState onSelectQuestion={handleSuggestedQuestion} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id || index}
                message={message}
                isLast={index === messages.length - 1}
              />
            ))}
            
            {isStreaming && <TypingIndicator />}
          </div>
        )}
      </ScrollArea>
      
      {/* Error Alert */}
      {error && (
        <div className="px-4 pb-2">
          <Alert variant="destructive" className="max-w-3xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="ghost" size="icon" onClick={onClearError}>
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {/* Input Area */}
      <div className="p-4 border-t bg-card/50">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? "Daily limit reached. Upgrade for unlimited access." : "Ask about market analysis, trade ideas, reports..."}
              disabled={isLoading || disabled}
              className={cn(
                "min-h-[52px] max-h-[200px] resize-none pr-12",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || disabled}
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2 text-center">
            AI responses are based on FINOTAUR reports. Not financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ onSelectQuestion }: { onSelectQuestion: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <svg
          viewBox="0 0 24 24"
          className="w-10 h-10 text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      
      <h2 className="text-2xl font-bold mb-2">FINOTAUR AI Assistant</h2>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Ask me anything about market analysis, trade ideas, sector trends, 
        or insights from our reports.
      </p>
      
      <SuggestedQuestions onSelect={onSelectQuestion} />
    </div>
  );
}
