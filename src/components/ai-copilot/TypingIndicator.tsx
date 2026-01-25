// src/components/ai-copilot/TypingIndicator.tsx
// Typing/Loading indicator for AI responses

import React from 'react';
import { Bot } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-in fade-in-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        <Bot className="h-4 w-4" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" />
        </div>
      </div>
    </div>
  );
}
