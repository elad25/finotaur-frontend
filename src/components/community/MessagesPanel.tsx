// src/components/community/MessagesPanel.tsx
// Two-pane 1:1 Direct Messaging UI for the global community.
// Left pane: conversation list. Right pane: message thread + composer.

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { DataState } from '@/components/ds/DataState';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';
import {
  useMyConversations,
  useDirectMessages,
  useSendDirectMessage,
  useOpenConversation,
  type Conversation,
} from '@/hooks/useDirectMessages';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ── Monogram avatar ────────────────────────────────────────────────────────────

function MonogramAvatar({ name }: { name: string }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center shrink-0',
        'h-8 w-8 rounded-full text-[12px]',
        'bg-surface-2 border-[0.5px] border-border-ds-subtle',
        'text-ink-secondary font-semibold',
      )}
    >
      {initial}
    </div>
  );
}

// ── Conversation row ───────────────────────────────────────────────────────────

function ConversationRow({
  conv,
  isActive,
  onClick,
}: {
  conv: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-ds-3 px-ds-3 py-[10px] text-left',
        'transition-colors duration-base ease-out',
        isActive
          ? 'bg-[rgba(201,166,70,0.08)] border-l-2 border-gold-primary'
          : 'hover:bg-surface-2 border-l-2 border-transparent',
      )}
    >
      <MonogramAvatar name={conv.other_name} />
      <div className="flex-1 min-w-0 flex flex-col gap-[1px]">
        <div className="flex items-center justify-between gap-ds-2">
          <span className="font-sans text-[13px] font-semibold text-ink-primary truncate">
            {conv.other_name}
          </span>
          {conv.unread > 0 && (
            <span
              className={cn(
                'shrink-0 flex items-center justify-center',
                'h-[18px] min-w-[18px] px-[5px] rounded-full',
                'bg-gold-primary text-[10px] font-semibold text-black',
              )}
            >
              {conv.unread > 99 ? '99+' : conv.unread}
            </span>
          )}
        </div>
        {conv.last_body && (
          <span className="font-sans text-[12px] text-ink-tertiary truncate">
            {conv.last_body}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Thread pane ────────────────────────────────────────────────────────────────

const COMPOSER_INPUT = cn(
  'flex-1 rounded-[8px] px-ds-4 py-[10px]',
  'bg-surface-1 border-[0.5px] border-border-ds-default',
  'text-[14px] text-ink-primary font-sans',
  'placeholder:text-ink-muted',
  'outline-none resize-none',
  'transition-colors duration-base ease-out',
  'focus:border-gold-primary focus:ring-[3px] focus:ring-gold-primary/15',
  'disabled:opacity-50',
  'leading-[1.5]',
);

function ThreadPane({
  conversationId,
  currentUserId,
}: {
  conversationId: string;
  currentUserId: string;
}) {
  const { messages, isLoading, isError, error, refetch } = useDirectMessages(conversationId);
  const sendMessage = useSendDirectMessage();
  const [body, setBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed || sendMessage.isPending) return;
    setBody('');
    sendMessage.mutate({ conversationId, body: trimmed });
  }, [body, conversationId, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message scroll area */}
      <div className="flex-1 overflow-y-auto px-ds-4 py-ds-4 flex flex-col gap-ds-3">
        <DataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          data={messages}
          onRetry={refetch}
          empty={
            <div className="flex-1 flex items-center justify-center py-ds-9">
              <p className="font-sans text-[13px] text-ink-tertiary">
                No messages yet. Start the conversation.
              </p>
            </div>
          }
        >
          {(data) => (
            <>
              {data.map((msg) => {
                const isOwn = msg.sender_id === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex flex-col gap-[3px] max-w-[75%]',
                      isOwn ? 'self-end items-end' : 'self-start items-start',
                    )}
                  >
                    <span className="font-sans text-[11px] text-ink-tertiary px-[2px]">
                      {formatTime(msg.created_at)}
                    </span>
                    <div
                      className={cn(
                        'rounded-[10px] px-ds-4 py-[8px]',
                        'font-sans text-[14px] leading-[1.5] break-words whitespace-pre-wrap',
                        isOwn
                          ? 'bg-[rgba(201,166,70,0.18)] border-[0.5px] border-[#C9A646]/40 text-ink-primary'
                          : 'bg-surface-2 border-[0.5px] border-border-ds-subtle text-ink-primary',
                      )}
                    >
                      {msg.body}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </DataState>
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* Composer */}
      <div className="px-ds-4 py-ds-3 border-t border-border-ds-subtle flex items-end gap-ds-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message…  (Enter to send, Shift+Enter for newline)"
          rows={1}
          className={COMPOSER_INPUT}
          disabled={sendMessage.isPending}
          aria-label="Message composer"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!body.trim() || sendMessage.isPending}
          aria-label="Send message"
          className={cn(
            'shrink-0 flex items-center justify-center',
            'h-[40px] w-[40px] rounded-[8px]',
            'bg-gradient-gold text-ink-on-gold',
            'transition-opacity duration-base ease-out',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          <Send size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ── Empty right pane ───────────────────────────────────────────────────────────

function NoConversationSelected() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-ds-3 text-center px-ds-6">
      <MessageSquare size={32} className="text-ink-muted" aria-hidden="true" />
      <p className="font-sans text-[14px] text-ink-tertiary">
        Select a conversation to start messaging.
      </p>
    </div>
  );
}

// ── MessagesPanel ──────────────────────────────────────────────────────────────

export interface MessagesPanelProps {
  initialUserId?: string;
}

export function MessagesPanel({ initialUserId }: MessagesPanelProps) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';

  const { conversations, isLoading, isError, error, refetch } = useMyConversations();
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);

  const openConversation = useOpenConversation();
  // Track which initialUserId we've already opened to avoid repeated calls.
  const openedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!initialUserId || initialUserId === openedForRef.current) return;
    openedForRef.current = initialUserId;
    openConversation.mutateAsync(initialUserId).then((conversationId) => {
      setActiveConversationId(conversationId);
    });
    // intentionally not listing openConversation in deps — mutateAsync is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserId]);

  return (
    <div className="flex h-full">
      {/* ── Left pane: conversation list ── */}
      <div className="w-72 shrink-0 flex flex-col border-r border-border-ds-subtle">
        <div className="shrink-0 px-ds-4 py-ds-3 border-b border-border-ds-subtle">
          <h2 className="font-sans text-[13px] font-semibold text-ink-primary">
            Direct Messages
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          <DataState
            isLoading={isLoading}
            isError={isError}
            error={error}
            data={conversations}
            onRetry={refetch}
            empty={
              <p className="py-ds-6 text-center font-sans text-[13px] text-ink-tertiary px-ds-4">
                No conversations yet.
              </p>
            }
          >
            {(data) => (
              <div className="flex flex-col divide-y divide-border-ds-subtle">
                {data.map((conv) => (
                  <ConversationRow
                    key={conv.conversation_id}
                    conv={conv}
                    isActive={activeConversationId === conv.conversation_id}
                    onClick={() => setActiveConversationId(conv.conversation_id)}
                  />
                ))}
              </div>
            )}
          </DataState>
        </div>
      </div>

      {/* ── Right pane: thread ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeConversationId ? (
          <ThreadPane
            conversationId={activeConversationId}
            currentUserId={currentUserId}
          />
        ) : (
          <NoConversationSelected />
        )}
      </div>
    </div>
  );
}

export default MessagesPanel;
