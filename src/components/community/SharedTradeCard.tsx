// src/components/community/SharedTradeCard.tsx
// Renders one GlobalFeedItem from the global community feed.
//
// CRITICAL redaction rule: trade_pnl / trade_size / trade_entry / trade_exit
// come back NULL when the author chose to hide them. Render "•••" (Hidden) —
// NEVER 0 or "$0". Symbol, side, setup, and close_at are always shown.
//
// Reactions: lucide ArrowBigUp / ArrowBigDown / Repeat2 (not emoji) per spec.
// my_reaction from the feed item highlights the matching button in gold.
// Comments expand inline via useGlobalPostComments + useAddGlobalComment.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowBigUp, ArrowBigDown, Repeat2, MessageSquare, MoreVertical, Send } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { DataState } from '@/components/ds/DataState';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';
import {
  useToggleGlobalReaction,
  useDeleteGlobalPost,
  useGlobalPostComments,
  useAddGlobalComment,
  type GlobalReactionKind,
} from '@/hooks/useGlobalFeed';
import { useUserDisciplineScore } from '@/hooks/useUserDisciplineScore';
import type { GlobalFeedItem, GlobalComment } from '@/types/community';

// ── Formatters ─────────────────────────────────────────────────────────────────

/** Dollar value with U+2212 for negative — matches RoomLeaderboard exactly. */
function formatPnl(value: number): string {
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value < 0) return `−$${abs}`; // U+2212 mathematical minus
  return `$${abs}`;
}

/** Relative time — "2m ago", "3h ago", "5d ago". */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Short date: "Jun 20". */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Title-cases a single word or short phrase: "revenge" → "Revenge". */
function titleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ── Monogram avatar — matches RoomFeed / RoomLeaderboard exactly ───────────────

function MonogramAvatar({ name, size = 8 }: { name: string; size?: 7 | 8 }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center shrink-0',
        size === 7 ? 'h-7 w-7 text-[11px]' : 'h-8 w-8 text-[12px]',
        'rounded-full',
        'bg-surface-2 border-[0.5px] border-border-ds-subtle',
        'text-ink-secondary font-semibold',
      )}
    >
      {initial}
    </div>
  );
}

// ── Attached trade card ────────────────────────────────────────────────────────

interface AttachedTradeCardProps {
  item: GlobalFeedItem;
}

function AttachedTradeCard({ item }: AttachedTradeCardProps) {
  const { trade_symbol, trade_side, trade_pnl, trade_entry, trade_exit, trade_size, trade_setup, trade_close_at, hide_pnl, show_setup_only, reveal_size } = item;

  if (!trade_symbol) return null;

  const isNegative = trade_pnl !== null && trade_pnl < 0;

  return (
    <div
      className={cn(
        'rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-2',
        'px-ds-4 py-ds-3',
        'flex flex-col gap-ds-2',
      )}
    >
      {/* Top row: symbol + side + P&L */}
      <div className="flex items-center justify-between gap-ds-3 flex-wrap">
        <div className="flex items-center gap-ds-2 min-w-0">
          <span className="font-sans text-[13px] font-semibold text-ink-primary">
            {trade_symbol}
          </span>
          {trade_side && (
            <span className="font-sans text-[11px] font-medium uppercase tracking-[0.5px] text-ink-tertiary shrink-0">
              {trade_side}
            </span>
          )}
          {trade_close_at && (
            <span className="font-sans text-[11px] text-ink-tertiary shrink-0">
              {shortDate(trade_close_at)}
            </span>
          )}
        </div>

        {/* P&L — Hidden placeholder when null */}
        {hide_pnl || trade_pnl === null ? (
          <span className="font-sans tabular-nums text-[13px] font-medium text-ink-muted select-none" aria-label="P&L hidden">
            •••
          </span>
        ) : (
          <span
            className={cn(
              'font-sans tabular-nums text-[13px] font-medium shrink-0',
              isNegative ? 'text-num-negative' : 'text-num-neutral',
            )}
          >
            {formatPnl(trade_pnl)}
          </span>
        )}
      </div>

      {/* Secondary row: setup + entry/exit + size */}
      <div className="flex items-center gap-ds-3 flex-wrap">
        {trade_setup && (
          <span className="font-sans text-[11px] font-medium text-ink-secondary bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[4px] px-ds-2 py-[2px]">
            {trade_setup}
          </span>
        )}

        {show_setup_only || trade_entry === null ? (
          <span className="font-sans text-[11px] text-ink-muted select-none" aria-label="Entry hidden">
            Entry •••
          </span>
        ) : (
          <span className="font-sans tabular-nums text-[11px] text-ink-tertiary">
            {formatPnl(trade_entry)}
          </span>
        )}

        {show_setup_only || trade_exit === null ? (
          <span className="font-sans text-[11px] text-ink-muted select-none" aria-label="Exit hidden">
            Exit •••
          </span>
        ) : (
          <span className="font-sans tabular-nums text-[11px] text-ink-tertiary">
            {formatPnl(trade_exit)}
          </span>
        )}

        {!reveal_size || trade_size === null ? (
          <span className="font-sans text-[11px] text-ink-muted select-none" aria-label="Size hidden">
            Size •••
          </span>
        ) : (
          <span className="font-sans tabular-nums text-[11px] text-ink-tertiary">
            {trade_size} contracts
          </span>
        )}
      </div>
    </div>
  );
}

// ── Reaction bar ───────────────────────────────────────────────────────────────

interface ReactionBarProps {
  item: GlobalFeedItem;
}

function ReactionBar({ item }: ReactionBarProps) {
  const toggleReaction = useToggleGlobalReaction();

  function handleReaction(kind: GlobalReactionKind) {
    toggleReaction.mutate(
      { postId: item.id, kind },
      {
        onError: () => {
          toast({ title: 'Failed to react. Please try again.' });
        },
      },
    );
  }

  const reactions: { kind: GlobalReactionKind; Icon: React.ElementType; count: number; label: string }[] = [
    { kind: 'up', Icon: ArrowBigUp, count: item.up_count, label: 'Upvote' },
    { kind: 'down', Icon: ArrowBigDown, count: item.down_count, label: 'Downvote' },
    { kind: 'repost', Icon: Repeat2, count: item.repost_count, label: 'Repost' },
  ];

  return (
    <div className="flex items-center gap-[6px]">
      {reactions.map(({ kind, Icon, count, label }) => {
        const isActive = item.my_reaction === kind;
        return (
          <button
            key={kind}
            type="button"
            onClick={() => handleReaction(kind)}
            disabled={toggleReaction.isPending}
            aria-label={label}
            aria-pressed={isActive}
            className={cn(
              'flex items-center gap-[4px] px-[8px] py-[5px] rounded-[6px]',
              'font-sans text-[12px] font-medium',
              'border-[0.5px] transition-colors duration-base ease-out',
              'disabled:opacity-50 disabled:pointer-events-none',
              isActive
                ? 'bg-[rgba(201,166,70,0.12)] border-gold-border text-gold-primary'
                : 'bg-surface-2 border-border-ds-subtle text-ink-tertiary hover:border-border-ds-default hover:text-ink-secondary',
            )}
          >
            <Icon size={13} aria-hidden="true" />
            {count > 0 && (
              <span className="tabular-nums">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Comment thread ─────────────────────────────────────────────────────────────

interface CommentThreadProps {
  item: GlobalFeedItem;
}

function CommentThread({ item }: CommentThreadProps) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const addComment = useAddGlobalComment();
  const { comments, isLoading, isError, error, refetch } = useGlobalPostComments(
    open ? item.id : undefined,
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    addComment.mutate(
      { postId: item.id, body: trimmed },
      {
        onSuccess: () => setBody(''),
        onError: (err) => {
          toast({ title: err.message ?? 'Failed to add comment.' });
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-ds-2">
      {/* Toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-[5px]',
          'font-sans text-[12px] font-medium',
          'text-ink-tertiary hover:text-ink-secondary',
          'transition-colors duration-base ease-out',
        )}
      >
        <MessageSquare size={13} aria-hidden="true" />
        {item.comment_count > 0 ? `${item.comment_count}` : 'Comment'}
      </button>

      {/* Expanded thread */}
      {open && (
        <div className="flex flex-col gap-ds-3 pl-ds-3 border-l-[0.5px] border-border-ds-subtle">
          <DataState
            isLoading={isLoading}
            isError={isError}
            error={error}
            data={comments}
            onRetry={refetch}
            empty={
              <p className="font-sans text-[12px] text-ink-tertiary">
                No comments yet.
              </p>
            }
          >
            {(list) => (
              <div className="flex flex-col gap-ds-3">
                {list.map((c: GlobalComment) => (
                  <div key={c.id} className="flex gap-ds-2">
                    <MonogramAvatar name={c.author_name} size={7} />
                    <div className="flex flex-col gap-[2px] min-w-0">
                      <div className="flex items-baseline gap-ds-2">
                        <span className="font-sans text-[12px] font-medium text-ink-primary">
                          {c.author_name}
                        </span>
                        <span className="font-sans text-[11px] text-ink-tertiary">
                          {relativeTime(c.created_at)}
                        </span>
                      </div>
                      <p className="font-sans text-[13px] text-ink-secondary leading-relaxed break-words">
                        {c.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DataState>

          {/* Add comment */}
          <form onSubmit={handleSubmit} className="flex items-center gap-ds-2">
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment…"
              maxLength={500}
              className={cn(
                'flex-1 min-w-0',
                'rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-2',
                'px-ds-3 py-[7px]',
                'font-sans text-[13px] text-ink-primary placeholder:text-ink-muted',
                'focus:outline-none focus:border-border-ds-default',
                'transition-colors duration-base ease-out',
              )}
            />
            <Button
              type="submit"
              variant="goldOutline"
              size="compact"
              showArrow={false}
              disabled={!body.trim() || addComment.isPending}
            >
              Post
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Delete kebab ───────────────────────────────────────────────────────────────

interface DeleteKebabProps {
  postId: string;
}

function DeleteKebab({ postId }: DeleteKebabProps) {
  const [open, setOpen] = useState(false);
  const deletePost = useDeleteGlobalPost();

  function handleDelete() {
    if (!confirm('Delete this post?')) return;
    setOpen(false);
    deletePost.mutate(
      { postId },
      {
        onError: () => {
          toast({ title: 'Failed to delete post. Please try again.' });
        },
      },
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'p-[4px] rounded-[6px]',
          'text-ink-tertiary hover:text-ink-secondary',
          'transition-colors duration-base ease-out',
        )}
        aria-label="Post options"
      >
        <MoreVertical size={14} aria-hidden="true" />
      </button>
      {open && (
        <div
          className={cn(
            'absolute right-0 top-6 z-10 w-[120px]',
            'rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-glass',
            'backdrop-blur-glass py-[4px]',
            'shadow-md',
          )}
        >
          <button
            type="button"
            onClick={handleDelete}
            disabled={deletePost.isPending}
            className={cn(
              'w-full text-left px-ds-3 py-[7px]',
              'font-sans text-[13px] text-status-error',
              'hover:bg-surface-2 transition-colors duration-base ease-out',
              'disabled:opacity-50',
            )}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main SharedTradeCard ───────────────────────────────────────────────────────

export interface SharedTradeCardProps {
  item: GlobalFeedItem;
}

export function SharedTradeCard({ item }: SharedTradeCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentUserId = user?.id ?? '';
  const canDelete = item.author_id === currentUserId;
  const canMessage = !!item.author_id && item.author_id !== currentUserId;

  // Behavioral score for the post author — loaded async, renders nothing until ready.
  const { score } = useUserDisciplineScore(item.author_id);
  const showBehavioralBadge = score != null && score.trade_count > 0;

  return (
    <Card variant="default" padding="default" className="flex flex-col gap-ds-3">
      {/* Header: monogram + author + time + delete */}
      <div className="flex items-start justify-between gap-ds-3">
        <div className="flex items-center gap-ds-2 min-w-0">
          <MonogramAvatar name={item.author_name} />
          <div className="flex flex-col gap-[1px] min-w-0">
            <span className="font-sans text-[13px] font-semibold text-ink-primary truncate">
              {item.author_name}
            </span>
            <span className="font-sans text-[11px] text-ink-tertiary">
              {relativeTime(item.created_at)}
              {item.pinned && (
                <span className="ml-[6px] text-gold-muted font-medium">· Pinned</span>
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-[4px] shrink-0">
          {canMessage && (
            <button
              type="button"
              onClick={() => navigate(`/app/floor/community?dm=${item.author_id}`)}
              aria-label={`Message ${item.author_name}`}
              className={cn(
                'p-[5px] rounded-[6px]',
                'text-ink-tertiary hover:text-ink-secondary',
                'transition-colors duration-base ease-out',
              )}
            >
              <Send size={13} aria-hidden="true" />
            </button>
          )}
          {canDelete && <DeleteKebab postId={item.id} />}
        </div>
      </div>

      {/* Trader Model tags — emotion chip + author behavioral badge */}
      {(item.trade_emotion || showBehavioralBadge) && (
        <div className="flex items-center gap-[6px] flex-wrap">
          {item.trade_emotion && (
            <span
              className={cn(
                'inline-flex items-center',
                'rounded-[4px] border-[0.5px] border-border-ds-subtle bg-surface-2',
                'px-[6px] py-[2px]',
                'font-sans text-[11px] font-medium text-ink-secondary',
              )}
            >
              {titleCase(item.trade_emotion)}
            </span>
          )}
          {showBehavioralBadge && (
            <span
              className={cn(
                'inline-flex items-center gap-[5px]',
                'rounded-[4px] border-[0.5px] border-border-ds-subtle bg-surface-2',
                'px-[6px] py-[2px]',
                'font-sans text-[11px] text-ink-tertiary',
              )}
            >
              <span>Discipline {Math.round(score!.discipline_score)}</span>
              <span className="text-border-ds-subtle">·</span>
              <span>Emotion {Math.round(score!.emotional_rate * 100)}%</span>
            </span>
          )}
        </div>
      )}

      {/* Caption / body */}
      {item.body && (
        <p className="font-sans text-[14px] text-ink-secondary leading-relaxed break-words whitespace-pre-wrap">
          {item.body}
        </p>
      )}

      {/* Attached trade — only when a trade is linked */}
      {item.attached_trade_id && <AttachedTradeCard item={item} />}

      {/* Reaction bar */}
      <ReactionBar item={item} />

      {/* Comment thread */}
      <CommentThread item={item} />
    </Card>
  );
}
