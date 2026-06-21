// src/components/mentorship/MessageList.tsx
// Center panel: message bubbles + composer.
// - Own messages align right; others align left.
// - If canPost is false (student reading an announcement channel), the composer
//   is hidden and a subtle hint is shown instead.
// - Auto-scrolls to newest message on data change.

import { useRef, useEffect, useState, useCallback } from 'react';
import { Send } from 'lucide-react';
import type { ChannelType, SpaceMember } from '@/types/mentorship';
import { useSpaceMessages, usePostMessage } from '@/hooks/useSpaceMessages';
import { mapSpaceError } from '@/hooks/useMentorshipSpaces';
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
}

// ── Component ────────────────────────────────────────────────────────────────

export function MessageList({
  channelId,
  channelType,
  canPost,
  currentUserId,
  members,
}: MessageListProps) {
  const { messages, isLoading } = useSpaceMessages(channelId);
  const { mutateAsync: postMessage, isPending: isSending } = usePostMessage();

  const [body, setBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

            return (
              <div
                key={msg.id}
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
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    'rounded-[10px] px-ds-4 py-[8px]',
                    'text-[14px] leading-[1.5]',
                    isOwn
                      ? 'bg-gradient-gold text-ink-on-gold font-medium'
                      : 'bg-surface-2 border-[0.5px] border-border-ds-subtle text-ink-primary',
                  )}
                >
                  {msg.body}
                </div>
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
