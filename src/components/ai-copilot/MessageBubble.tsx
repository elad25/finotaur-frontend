// src/components/ai-copilot/MessageBubble.tsx
// =====================================================
// 💬 MESSAGE BUBBLE - Premium Gold Design v2.0
// =====================================================

import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { 
  User, Bot, ThumbsUp, ThumbsDown, Copy, Check,
  ExternalLink, FileText, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { Message, MessageSource } from '@/hooks/useAICopilot';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
}

export const MessageBubble = memo(function MessageBubble({ 
  message, 
  isLast = false 
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedback(type);
    toast.success('Thanks for your feedback!');
  };

  return (
    <div className={cn(
      "flex gap-4",
      isUser && "flex-row-reverse"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
        isUser 
          ? "bg-gradient-to-br from-[#C9A646]/20 to-[#C9A646]/5 border border-[#C9A646]/30"
          : "bg-white/5 border border-white/10"
      )}>
        {isUser ? (
          <User className="h-5 w-5 text-[#C9A646]" />
        ) : (
          <Bot className="h-5 w-5 text-[#8B8B8B]" />
        )}
      </div>
      
      {/* Message Content */}
      <div className={cn(
        "flex-1 max-w-[85%] space-y-3",
        isUser && "flex flex-col items-end"
      )}>
        {/* Message Bubble */}
        <div className={cn(
          "rounded-2xl px-5 py-4 relative overflow-hidden",
          isUser ? "rounded-tr-md" : "rounded-tl-md"
        )}
          style={isUser ? {
            background: 'linear-gradient(135deg, rgba(201,166,70,0.2), rgba(201,166,70,0.08))',
            border: '1px solid rgba(201,166,70,0.3)',
          } : {
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Accent line for assistant */}
          {isAssistant && (
            <div className="absolute top-0 left-0 w-full h-[2px]"
              style={{ background: 'linear-gradient(90deg, rgba(201,166,70,0.5), transparent)' }} />
          )}
          
          {isUser ? (
            <p className="text-[#E8DCC4] whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#C9A646] hover:text-[#F4D97B] transition-colors inline-flex items-center gap-1"
                    >
                      {children}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ),
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code 
                        className="bg-[#C9A646]/10 text-[#F4D97B] px-1.5 py-0.5 rounded text-sm font-mono" 
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code 
                        className={cn(
                          "block bg-black/30 p-4 rounded-xl overflow-x-auto text-sm font-mono border border-white/5",
                          className
                        )} 
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4 rounded-xl border border-white/10">
                      <table className="min-w-full">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#C9A646] uppercase tracking-wider"
                      style={{ background: 'rgba(201,166,70,0.1)' }}>
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-3 text-sm text-[#A0A0A0] border-t border-white/5">
                      {children}
                    </td>
                  ),
                  ul: ({ children }) => (
                    <ul className="space-y-2 my-3">
                      {children}
                    </ul>
                  ),
                  li: ({ children }) => (
                    <li className="flex items-start gap-2 text-[#A0A0A0]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C9A646] mt-2 flex-shrink-0" />
                      <span>{children}</span>
                    </li>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold text-white mb-3 mt-4">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-semibold text-white mb-2 mt-4">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold text-[#E8DCC4] mb-2 mt-3">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-[#A0A0A0] leading-relaxed mb-3">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-white font-semibold">{children}</strong>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-[#C9A646] pl-4 my-3 italic text-[#8B8B8B]">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
        {/* Sources */}
        {isAssistant && message.sources && message.sources.length > 0 && (
          <div className="w-full">
            <button
              onClick={() => setSourcesOpen(!sourcesOpen)}
              className="flex items-center gap-2 text-xs text-[#6B6B6B] hover:text-[#C9A646] transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
              {sourcesOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            
            {sourcesOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 space-y-2"
              >
                {message.sources.map((source, index) => (
                  <SourceCard key={index} source={source} />
                ))}
              </motion.div>
            )}
          </div>
        )}
        
        {/* Actions */}
        {isAssistant && (
          <div className="flex items-center gap-1">
            <ActionButton
              onClick={handleCopy}
              icon={copied ? Check : Copy}
              active={copied}
              activeColor="#22C55E"
            />
            <ActionButton
              onClick={() => handleFeedback('positive')}
              icon={ThumbsUp}
              active={feedback === 'positive'}
              activeColor="#22C55E"
            />
            <ActionButton
              onClick={() => handleFeedback('negative')}
              icon={ThumbsDown}
              active={feedback === 'negative'}
              activeColor="#EF4444"
            />
          </div>
        )}
      </div>
    </div>
  );
});

// =====================================================
// Action Button
// =====================================================

const ActionButton = memo(function ActionButton({
  onClick,
  icon: Icon,
  active,
  activeColor,
}: {
  onClick: () => void;
  icon: any;
  active: boolean;
  activeColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg hover:bg-white/5 transition-all"
    >
      <Icon 
        className="h-4 w-4 transition-colors" 
        style={{ color: active ? activeColor : '#6B6B6B' }}
      />
    </button>
  );
});

// =====================================================
// Source Card
// =====================================================

const SourceCard = memo(function SourceCard({ source }: { source: MessageSource }) {
  const reportTypeConfig: Record<string, { label: string; color: string }> = {
    ism: { label: 'ISM Report', color: '#3B82F6' },
    company: { label: 'Company Analysis', color: '#22C55E' },
    crypto: { label: 'Crypto Report', color: '#A855F7' },
    weekly: { label: 'Weekly Review', color: '#F59E0B' },
    daily: { label: 'Daily Brief', color: '#C9A646' },
  };
  
  const config = reportTypeConfig[source.report_type] || { label: source.report_type, color: '#8B8B8B' };

  return (
    <div className="p-4 rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded"
          style={{ background: `${config.color}15`, color: config.color }}>
          {config.label}
        </span>
        <span className="text-[10px] text-[#6B6B6B]">
          {source.report_date}
        </span>
        {source.section && (
          <>
            <span className="text-[#6B6B6B]">•</span>
            <span className="text-[10px] text-[#6B6B6B] capitalize">
              {source.section.replace('_', ' ')}
            </span>
          </>
        )}
      </div>
      
      {source.excerpt && (
        <p className="text-xs text-[#8B8B8B] line-clamp-2 mb-3 leading-relaxed">
          {source.excerpt}
        </p>
      )}
      
      {source.pdf_url && (
        <a
          href={source.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[#C9A646] hover:text-[#F4D97B] transition-colors"
        >
          View Report
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
});

export default MessageBubble;