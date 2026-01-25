// src/components/ai-copilot/MessageBubble.tsx
// FINOTAUR AI Copilot - Message Bubble Component

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  User, 
  Bot, 
  ThumbsUp, 
  ThumbsDown, 
  Copy, 
  Check,
  ExternalLink,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Message, MessageSource } from '@/hooks/useAICopilot';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
}

export function MessageBubble({ message, isLast = false }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  
  // Copy message content
  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Handle feedback
  const handleFeedback = (type: 'positive' | 'negative') => {
    // TODO: Implement feedback API call
    toast.success(`Thanks for your feedback!`);
  };

  return (
    <div
      className={cn(
        "flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      
      {/* Message Content */}
      <div
        className={cn(
          "flex-1 max-w-[85%] space-y-2",
          isUser && "flex flex-col items-end"
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser 
              ? "bg-primary text-primary-foreground rounded-tr-sm" 
              : "bg-muted rounded-tl-sm"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom link rendering
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {children}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ),
                  // Custom code block
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-background/50 px-1.5 py-0.5 rounded text-sm" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className={cn("block bg-background/50 p-3 rounded-lg overflow-x-auto", className)} {...props}>
                        {children}
                      </code>
                    );
                  },
                  // Custom table
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border-collapse">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-border px-3 py-2 bg-muted/50 text-left font-semibold">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-border px-3 py-2">
                      {children}
                    </td>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
        {/* Sources (for assistant messages) */}
        {isAssistant && message.sources && message.sources.length > 0 && (
          <Collapsible open={sourcesOpen} onOpenChange={setSourcesOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                <FileText className="h-3 w-3 mr-1" />
                {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
                {sourcesOpen ? (
                  <ChevronUp className="h-3 w-3 ml-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 ml-1" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="space-y-2">
                {message.sources.map((source, index) => (
                  <SourceCard key={index} source={source} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Actions (for assistant messages) */}
        {isAssistant && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleFeedback('positive')}
            >
              <ThumbsUp className="h-3 w-3 text-muted-foreground hover:text-green-500" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleFeedback('negative')}
            >
              <ThumbsDown className="h-3 w-3 text-muted-foreground hover:text-red-500" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Source Card Component
function SourceCard({ source }: { source: MessageSource }) {
  const reportTypeLabels: Record<string, string> = {
    ism: 'ISM Report',
    company: 'Company Analysis',
    crypto: 'Crypto Report',
    weekly: 'Weekly Review',
    daily: 'Daily Brief',
  };
  
  const reportTypeColors: Record<string, string> = {
    ism: 'bg-blue-500/10 text-blue-500',
    company: 'bg-green-500/10 text-green-500',
    crypto: 'bg-purple-500/10 text-purple-500',
    weekly: 'bg-orange-500/10 text-orange-500',
    daily: 'bg-yellow-500/10 text-yellow-500',
  };

  return (
    <div className="p-3 rounded-lg bg-background/50 border text-sm">
      <div className="flex items-center gap-2 mb-2">
        <Badge 
          variant="secondary" 
          className={cn("text-xs", reportTypeColors[source.report_type] || '')}
        >
          {reportTypeLabels[source.report_type] || source.report_type}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {source.report_date}
        </span>
        {source.section && (
          <span className="text-xs text-muted-foreground">
            • {source.section.replace('_', ' ')}
          </span>
        )}
      </div>
      
      {source.excerpt && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {source.excerpt}
        </p>
      )}
      
      {source.pdf_url && (
        <a
          href={source.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          View Report
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
