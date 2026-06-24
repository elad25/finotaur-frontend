// src/components/community/MessagesPanel.tsx
// Two-pane 1:1 Direct Messaging UI.
// Left pane: pending requests + conversation list + New DM button.
// Right pane: message thread + composer.

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageSquare, Plus, X, Check, Search, UserCircle } from 'lucide-react';
import { DataState } from '@/components/ds/DataState';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';
import {
  useMyConversations,
  useDirectMessages,
  useSendDirectMessage,
  useOpenConversation,
  useDmRequests,
  useSendDmRequest,
  useAcceptDmRequest,
  useDeclineDmRequest,
  useSearchFloorUsers,
  useMarkConversationRead,
  type Conversation,
  type DmRequest,
  type FloorUserResult,
} from '@/hooks/useDirectMessages';
import { useDebounce } from '@/hooks/useDebounce';

// ── Avatar component ────────────────────────────────────────────────────────────

function FloorAvatar({
  username,
  avatarUrl,
  size = 40,
}: {
  username: string;
  avatarUrl: string | null;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const initial = (username || '?').replace(/[^a-zA-Z0-9]/g, '').charAt(0).toUpperCase() || '?';
  const showImg = !!avatarUrl && !imgError;
  const px = `${size}px`;
  const fontSize = size >= 40 ? '14px' : '11px';

  return (
    <div
      aria-hidden="true"
      className="shrink-0 rounded-full flex items-center justify-center overflow-hidden"
      style={{
        width: px,
        height: px,
        background: showImg ? 'transparent' : 'linear-gradient(135deg, #C9A646 0%, #E8C766 100%)',
        border: '1.5px solid rgba(201,166,70,0.35)',
        flexShrink: 0,
      }}
    >
      {showImg ? (
        <img
          src={avatarUrl}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="font-bold select-none" style={{ color: '#0A0A0A', fontSize }}>{initial}</span>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// ── New DM search modal ─────────────────────────────────────────────────────────

function NewDmModal({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: () => void;
}) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const { results, isLoading } = useSearchFloorUsers(debouncedQuery);
  const sendRequest = useSendDmRequest();
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (user: FloorUserResult) => {
    setError(null);
    try {
      await sendRequest.mutateAsync(user.user_id);
      setSentTo((prev) => new Set(prev).add(user.user_id));
      onSent();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('conversation_exists')) {
        setError(`You already have a conversation with @${user.username}.`);
      } else {
        setError('Failed to send request. Please try again.');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[16px] flex flex-col overflow-hidden"
        style={{ background: '#111', border: '1px solid rgba(201,166,70,0.25)', maxHeight: '70vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-ds-subtle">
          <span className="text-[15px] font-semibold text-ink-primary">New Message</span>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={14} className="text-ink-tertiary" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border-ds-subtle">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by @username…"
              className="w-full rounded-[8px] pl-9 pr-3 py-2 text-[13px] text-ink-primary placeholder:text-ink-muted outline-none focus:ring-1 focus:ring-gold-primary/50"
              style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {debouncedQuery.trim().length < 2 ? (
            <p className="py-8 text-center text-[13px] text-ink-tertiary">
              Type at least 2 characters to search.
            </p>
          ) : isLoading ? (
            <p className="py-8 text-center text-[13px] text-ink-tertiary">Searching…</p>
          ) : results.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-tertiary">No users found.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border-ds-subtle">
              {results.map((u) => {
                const already = sentTo.has(u.user_id);
                return (
                  <div key={u.user_id} className="flex items-center gap-3 px-4 py-3">
                    <FloorAvatar username={u.username} avatarUrl={u.avatar_url} />
                    <span className="flex-1 text-[13px] font-medium text-ink-primary">
                      @{u.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSend(u)}
                      disabled={already || sendRequest.isPending}
                      className="rounded-[8px] px-3 py-1.5 text-[12px] font-semibold transition-all disabled:opacity-50"
                      style={
                        already
                          ? { background: 'rgba(74,222,128,0.15)', color: '#4ade80' }
                          : { background: 'linear-gradient(135deg, #C9A646 0%, #E8C766 100%)', color: '#0A0A0A' }
                      }
                    >
                      {already ? 'Sent ✓' : 'Send request'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {error && (
            <p className="px-4 pb-3 text-[12px]" style={{ color: '#f87171' }}>{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pending request row ─────────────────────────────────────────────────────────

function RequestRow({
  req,
  onAccepted,
}: {
  req: DmRequest;
  onAccepted: (conversationId: string) => void;
}) {
  const accept = useAcceptDmRequest();
  const decline = useDeclineDmRequest();

  const handleAccept = async () => {
    const convId = await accept.mutateAsync(req.request_id);
    onAccepted(convId);
  };

  return (
    <div className="flex items-center gap-3 px-3 py-[10px]">
      <FloorAvatar username={req.username || '?'} avatarUrl={req.avatar_url} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-ink-primary truncate">@{req.username}</p>
        <p className="text-[11px] text-ink-tertiary">Wants to message you</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleAccept}
          disabled={accept.isPending}
          aria-label="Accept"
          className="h-7 w-7 flex items-center justify-center rounded-full transition-colors disabled:opacity-50"
          style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)' }}
        >
          <Check size={13} style={{ color: '#4ade80' }} />
        </button>
        <button
          type="button"
          onClick={() => decline.mutate(req.request_id)}
          disabled={decline.isPending}
          aria-label="Decline"
          className="h-7 w-7 flex items-center justify-center rounded-full transition-colors disabled:opacity-50"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <X size={13} style={{ color: '#f87171' }} />
        </button>
      </div>
    </div>
  );
}

// ── Conversation row ────────────────────────────────────────────────────────────

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
        'w-full flex items-center gap-3 px-3 py-[10px] text-left',
        'transition-colors duration-base ease-out',
        isActive
          ? 'bg-[rgba(201,166,70,0.08)] border-l-2 border-gold-primary'
          : 'hover:bg-surface-2 border-l-2 border-transparent',
      )}
    >
      <FloorAvatar username={conv.other_username || '?'} avatarUrl={conv.other_avatar} />
      <div className="flex-1 min-w-0 flex flex-col gap-[1px]">
        <div className="flex items-center justify-between gap-2">
          <span className="font-sans text-[13px] font-semibold text-ink-primary truncate">
            @{conv.other_username}
          </span>
          {conv.unread > 0 && (
            <span
              className="shrink-0 flex items-center justify-center h-[18px] min-w-[18px] px-[5px] rounded-full bg-gold-primary text-[10px] font-semibold text-black"
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

// ── Thread pane ─────────────────────────────────────────────────────────────────

const COMPOSER_INPUT = cn(
  'flex-1 rounded-[8px] px-4 py-[10px]',
  'bg-surface-1 border-[0.5px] border-border-ds-default',
  'text-[14px] text-ink-primary font-sans',
  'placeholder:text-ink-muted',
  'outline-none resize-none',
  'transition-colors duration-base ease-out',
  'focus:border-gold-primary focus:ring-[3px] focus:ring-gold-primary/15',
  'disabled:opacity-50 leading-[1.5]',
);

function ThreadPane({
  conversationId,
  conv,
  currentUserId,
}: {
  conversationId: string;
  conv: Conversation | undefined;
  currentUserId: string;
}) {
  const { messages, isLoading, isError, error, refetch } = useDirectMessages(conversationId);
  const sendMessage = useSendDirectMessage();
  const markRead = useMarkConversationRead();
  const [body, setBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when opening
  useEffect(() => {
    markRead.mutate(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

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
      {/* Thread header */}
      {conv && (
        <div
          className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border-ds-subtle"
        >
          <FloorAvatar username={conv.other_username || '?'} avatarUrl={conv.other_avatar} size={44} />
          <span className="text-[14px] font-semibold text-ink-primary">@{conv.other_username}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <DataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          data={messages}
          onRetry={refetch}
          empty={
            <div className="flex-1 flex items-center justify-center py-12">
              <p className="text-[13px] text-ink-tertiary">
                No messages yet. Say hello!
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
                    <span className="text-[11px] text-ink-tertiary px-[2px]">
                      {formatTime(msg.created_at)}
                    </span>
                    <div
                      className={cn(
                        'rounded-[10px] px-4 py-2',
                        'text-[14px] leading-[1.5] break-words whitespace-pre-wrap',
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
      <div className="px-4 py-3 border-t border-border-ds-subtle flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message… (Enter to send)"
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

// ── Empty right pane ────────────────────────────────────────────────────────────

function NoConversationSelected() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
      <MessageSquare size={32} className="text-ink-muted" aria-hidden="true" />
      <p className="text-[14px] text-ink-tertiary">
        Select a conversation to start messaging.
      </p>
    </div>
  );
}

// ── MessagesPanel ───────────────────────────────────────────────────────────────

export interface MessagesPanelProps {
  initialUserId?: string;
}

export function MessagesPanel({ initialUserId }: MessagesPanelProps) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';

  const { conversations, isLoading, isError, error, refetch } = useMyConversations();
  const { requests } = useDmRequests();
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [showNewDm, setShowNewDm] = useState(false);

  const openConversation = useOpenConversation();
  const openedForRef = useRef<string | null>(null);

  // Open conversation when navigated via ?dm=userId
  useEffect(() => {
    if (!initialUserId || initialUserId === openedForRef.current) return;
    openedForRef.current = initialUserId;
    openConversation.mutateAsync(initialUserId).then((convId) => {
      if (convId) setActiveConversationId(convId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserId]);

  const activeConv = conversations.find((c) => c.conversation_id === activeConversationId);

  return (
    <>
      <div className="flex h-full">
        {/* ── Left pane ── */}
        <div className="w-72 shrink-0 flex flex-col border-r border-border-ds-subtle">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border-ds-subtle">
            <h2 className="text-[13px] font-semibold text-ink-primary">Direct Messages</h2>
            <button
              type="button"
              onClick={() => setShowNewDm(true)}
              aria-label="New message"
              className="h-7 w-7 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
              style={{ border: '1px solid rgba(201,166,70,0.3)' }}
            >
              <Plus size={13} style={{ color: '#C9A646' }} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Pending requests */}
            {requests.length > 0 && (
              <div>
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                  Requests ({requests.length})
                </p>
                <div className="flex flex-col divide-y divide-border-ds-subtle">
                  {requests.map((req) => (
                    <RequestRow
                      key={req.request_id}
                      req={req}
                      onAccepted={(convId) => setActiveConversationId(convId)}
                    />
                  ))}
                </div>
                <div className="mx-4 my-2 border-t border-border-ds-subtle" />
              </div>
            )}

            {/* Conversation list */}
            <DataState
              isLoading={isLoading}
              isError={isError}
              error={error}
              data={conversations}
              onRetry={refetch}
              empty={
                <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
                  <UserCircle size={28} className="text-ink-muted" />
                  <p className="text-[13px] text-ink-tertiary">
                    No conversations yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowNewDm(true)}
                    className="mt-1 text-[12px] font-semibold"
                    style={{ color: '#C9A646' }}
                  >
                    Start one →
                  </button>
                </div>
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

        {/* ── Right pane ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeConversationId ? (
            <ThreadPane
              conversationId={activeConversationId}
              conv={activeConv}
              currentUserId={currentUserId}
            />
          ) : (
            <NoConversationSelected />
          )}
        </div>
      </div>

      {/* New DM modal */}
      {showNewDm && (
        <NewDmModal
          onClose={() => setShowNewDm(false)}
          onSent={() => setShowNewDm(false)}
        />
      )}
    </>
  );
}

export default MessagesPanel;
