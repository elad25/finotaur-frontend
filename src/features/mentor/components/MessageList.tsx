// src/components/mentorship/MessageList.tsx
// Center panel: message bubbles + composer.
// - Own messages align right; others align left. Both render on a neutral gray
//   bubble (no gold) — distinguished by side + author label.
// - Room owners can click a message to pin/unpin it. A single pinned message per
//   channel surfaces in a bar at the top; clicking the bar scrolls to it.
// - If canPost is false (student reading an announcement channel), the composer
//   is hidden and a subtle hint is shown instead.
// - Auto-scrolls to newest message on data change.

import { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Pin, X } from 'lucide-react';
import type { ChannelType, SpaceMember, SpaceMessage } from '@/features/mentor/types/mentorship';
import { useSpaceMessages, usePostMessage, usePinMessage } from '@/features/mentor/hooks/useSpaceMessages';
import { mapSpaceError } from '@/features/mentor/hooks/useMentorshipSpaces';
import { SectionSpinner } from '@/components/ds/Spinner';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveName(
  authorId: string,
  authorName: string | null,
  members: SpaceMember[],
): string {
  if (authorName) return authorName;
  const m = members.find((x) => x.user_id === authorId);
  return m?.display_name || m?.email || 'Unknown';
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ── Empty state ───────────────────────────────────────────────────────────────

const EMPTY_COPY: Record<ChannelType, string> = {
  announcement: 'No announcements yet.',
  chat: 'No messages yet — say hello!',
  dm: 'No messages yet. Start the conversation.',
};

// ── Input className (reused from CreateSpaceDialog pattern) ───────────────────

const INPUT_BASE = cn(
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

// ── Props ────────────────────────────────────────────────────────────────────

export interface MessageListProps {
  channelId: string;
  channelType: ChannelType;
  canPost: boolean;
  currentUserId: string;
  members: SpaceMember[];
  isManager: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function MessageList({
  channelId,
  channelType,
  canPost,
  currentUserId,
  members,
  isManager,
}: MessageListProps) {
  const { messages, isLoading } = useSpaceMessages(channelId);
  const { mutateAsync: postMessage, isPending: isSending } = usePostMessage();
  const { mutateAsync: pinMessage } = usePinMessage();

  const [body, setBody] = useState('');
  const [actionMsgId, setActionMsgId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const pinnedMessage = messages.find((m) => m.pinned) ?? null;

  // Close any open per-message action menu when switching channels.
  useEffect(() => {
    setActionMsgId(null);
  }, [channelId]);

  // Auto-scroll to newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const scrollToMessage = useCallback((id: string) => {
    const el = messageRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashId(id);
    window.setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 1200);
  }, []);

  const handlePinToggle = useCallback(
    async (msg: SpaceMessage) => {
      setActionMsgId(null);
      try {
        await pinMessage({ messageId: msg.id, channelId, pinned: !msg.pinned });
      } catch (err) {
        toast({ title: 'Could not update pin', description: mapSpaceError(err) });
      }
    },
    [pinMessage, channelId],
  );

  const handleSend = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed || isSending) return;
    setBody('');
    try {
      await postMessage({ channelId, body: trimmed });
    } catch (err) {
      toast({ title: 'Could not send message', description: mapSpaceError(err) });
      // Restore draft so the user doesn't lose their text.
      setBody(trimmed);
    }
  }, [body, channelId, isSending, postMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <SectionSpinner />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Pinned message bar */}
      {pinnedMessage && (
        <button
          type="button"
          onClick={() => scrollToMessage(pinnedMessage.id)}
          className={cn(
            'flex items-center gap-ds-2 w-full text-left shrink-0',
            'px-ds-4 py-[8px] border-b border-border-ds-subtle',
            'bg-surface-1 hover:bg-surface-2 transition-colors duration-base ease-out',
          )}
        >
          <Pin size={13} className="shrink-0 text-gold-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium text-gold-primary">
              Pinned message
            </span>
            <span className="block text-[12px] text-ink-secondary truncate">
              {pinnedMessage.body}
            </span>
          </div>
          {isManager && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Unpin message"
              onClick={(e) => {
                e.stopPropagation();
                handlePinToggle(pinnedMessage);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePinToggle(pinnedMessage);
                }
              }}
              className="shrink-0 p-[4px] rounded-[6px] text-ink-tertiary hover:text-ink-primary hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <X size={14} aria-hidden="true" />
            </span>
          )}
        </button>
      )}

      {/* Message scroll area */}
      <div className="flex-1 overflow-y-auto px-ds-4 py-ds-4 flex flex-col gap-ds-3">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[13px] text-ink-tertiary">
              {EMPTY_COPY[channelType]}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.author_id === currentUserId;
            const name = resolveName(msg.author_id, msg.author_name, members);
            const showAction = isManager && actionMsgId === msg.id;

            return (
              <div
                key={msg.id}
                ref={(el) => {
                  if (el) messageRefs.current.set(msg.id, el);
                  else messageRefs.current.delete(msg.id);
                }}
                className={cn(
                  'flex flex-col gap-[3px] max-w-[75%]',
                  isOwn ? 'self-end items-end' : 'self-start items-start',
                )}
              >
                {/* Author + time */}
                <div className="flex items-baseline gap-ds-2 px-[2px]">
                  {!isOwn && (
                    <span className="text-[11px] font-medium text-ink-secondary">
                      {name}
                    </span>
                  )}
                  <span className="text-[11px] text-ink-tertiary">
                    {formatTime(msg.created_at)}
                  </span>
                  {msg.pinned && (
                    <span className="flex items-center gap-[2px] text-[10px] text-gold-primary">
                      <Pin size={9} aria-hidden="true" /> Pinned
                    </span>
                  )}
                </div>

                {/* Bubble */}
                <div
                  onClick={
                    isManager
                      ? () =>
                          setActionMsgId((cur) => (cur === msg.id ? null : msg.id))
                      : undefined
                  }
                  className={cn(
                    'rounded-[10px] px-ds-4 py-[8px]',
                    'text-[14px] leading-[1.5]',
                    'bg-surface-2 border-[0.5px] text-ink-primary',
                    'transition-all duration-base ease-out',
                    isOwn ? 'border-border-ds-default' : 'border-border-ds-subtle',
                    msg.pinned && 'border-gold-primary/40',
                    flashId === msg.id && 'ring-2 ring-gold-primary/50',
                    isManager && 'cursor-pointer',
                  )}
                >
                  {msg.body}
                </div>

                {/* Owner pin/unpin action */}
                {showAction && (
                  <button
                    type="button"
                    onClick={() => handlePinToggle(msg)}
                    className={cn(
                      'flex items-center gap-ds-2 mt-[2px] px-ds-3 py-[5px] rounded-[8px]',
                      'bg-surface-1 border-[0.5px] border-border-ds-default',
                      'text-[12px] text-ink-secondary hover:text-ink-primary hover:bg-surface-2',
                      'transition-colors duration-base ease-out',
                    )}
                  >
                    <Pin size={12} aria-hidden="true" />
                    {msg.pinned ? 'Unpin message' : 'Pin message'}
                  </button>
                )}
              </div>
            );
          })
        )}
        {/* Scroll anchor */}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* Composer */}
      {canPost ? (
        <div className="px-ds-4 py-ds-3 border-t border-border-ds-subtle flex items-end gap-ds-2">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message…  (Enter to send, Shift+Enter for newline)"
            rows={1}
            className={INPUT_BASE}
            disabled={isSending}
            aria-label="Message composer"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!body.trim() || isSending}
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
      ) : (
        <div className="px-ds-4 py-ds-3 border-t border-border-ds-subtle">
          <p className="text-[12px] text-ink-tertiary text-center">
            Only mentors can post here.
          </p>
        </div>
      )}
    </div>
  );
}
