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
import { MessageSquare, MoreVertical, Send } from 'lucide-react';
import { ReactionBar } from '@/components/feed/ReactionBar';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DataState } from '@/components/ds/DataState';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';
import {
  useToggleGlobalReaction,
  useDeleteGlobalPost,
  useGlobalPostComments,
  useAddGlobalComment,
} from '@/features/floor/hooks/useGlobalFeed';
import { TradeChart } from '@/components/journal/TradeChart';
import { TradeBusinessCard } from '@/features/floor/components/TradeBusinessCard';
import type {
  GlobalFeedItem,
  GlobalComment,
  ConsistencyTier,
} from '@/features/floor/types/community';

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

// ── Author reputation badges ─────────────────────────────────────────────────────

/** Paid membership tiers worth surfacing as a chip (free → no chip). */
const MEMBERSHIP_LABELS: Record<string, string> = {
  core: 'Core',
  finotaur: 'Finotaur',
  enterprise: 'Enterprise',
};

const CONSISTENCY_LABELS: Record<ConsistencyTier, string> = {
  rising: 'Rising',
  pro: 'Pro',
  elite: 'Elite',
};

/** Membership tier + consistency reputation, both sourced from the feed item. */
function AuthorBadges({ item }: { item: GlobalFeedItem }) {
  const membership = item.author_tier ? MEMBERSHIP_LABELS[item.author_tier] : undefined;
  const consistency = item.author_consistency_tier
    ? CONSISTENCY_LABELS[item.author_consistency_tier]
    : undefined;

  if (!membership && !consistency) return null;

  return (
    <div className="flex items-center gap-[6px] flex-wrap">
      {membership && (
        <span className="inline-flex items-center rounded-full border-[0.5px] border-gold-border px-[8px] py-[2px] font-sans text-[10px] font-medium uppercase tracking-[0.06em] text-gold-primary">
          {membership}
        </span>
      )}
      {consistency && (
        <span
          className={cn(
            'inline-flex items-center gap-[5px] rounded-full px-[8px] py-[2px]',
            'font-sans text-[10px] font-medium',
            item.author_consistency_tier === 'elite'
              ? 'bg-gradient-gold text-surface-base'
              : 'bg-surface-2 border-[0.5px] border-border-ds-subtle text-ink-secondary',
          )}
        >
          <span className="uppercase tracking-[0.06em]">{consistency}</span>
          {item.author_win_rate != null && (
            <span className="font-mono tabular-nums">
              {Math.round(item.author_win_rate * 100)}% WR
            </span>
          )}
          {item.author_profit_factor != null && (
            <span className="font-mono tabular-nums opacity-80">
              {item.author_profit_factor.toFixed(1)} PF
            </span>
          )}
        </span>
      )}
    </div>
  );
}

// ── Author avatar — floor image with scale-zoom, fallback to monogram ──────────

function AuthorAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const [imgError, setImgError] = useState(false);
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const showImg = !!avatarUrl && !imgError;
  return (
    <div
      aria-hidden="true"
      className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center overflow-hidden"
      style={{
        background: showImg ? 'transparent' : undefined,
        flexShrink: 0,
      }}
    >
      {showImg ? (
        <img
          src={avatarUrl}
          alt=""
          className="w-full h-full object-cover scale-[1.6]"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center rounded-full text-[12px] font-semibold"
          style={{
            background: 'var(--surface-2, #1a1a1a)',
            border: '0.5px solid var(--border-ds-subtle, rgba(255,255,255,0.08))',
            color: 'var(--ink-secondary, #aaa)',
          }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}

// ── Attached trade card ────────────────────────────────────────────────────────

interface AttachedTradeCardProps {
  item: GlobalFeedItem;
}

function AttachedTradeCard({ item }: AttachedTradeCardProps) {
  const { trade_symbol, trade_side, trade_pnl, trade_entry, trade_exit, trade_size, trade_setup, trade_open_at, trade_close_at, hide_pnl, show_setup_only, reveal_size, trade_strategy_category, trade_r } = item;
  if (!trade_symbol) return null;

  const isNegative = trade_pnl !== null && trade_pnl < 0;
  const rIsNegative = trade_r !== null && trade_r < 0;

  const chartTrade = (trade_symbol && trade_open_at) ? {
    symbol: trade_symbol,
    side: (trade_side === 'SHORT' ? 'SHORT' : 'LONG') as 'LONG' | 'SHORT',
    entry_price: trade_entry ?? 0,
    exit_price: trade_exit,
    open_at: trade_open_at,
    close_at: trade_close_at,
    pnl: trade_pnl,
  } : null;

  return (
    <div
      className={cn(
        'rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-2',
        'overflow-hidden',
        'flex flex-col gap-ds-2',
      )}
    >
      {/* Chart — natural TradeChart render, clipped to a fixed height */}
      {chartTrade && (
        <div style={{ overflow: 'hidden' }}>
          <TradeChart trade={chartTrade} />
        </div>
      )}

      <div className="px-ds-4 pb-ds-3 flex flex-col gap-ds-2">
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

        {/* R multiple + P&L (R hidden alongside P&L) */}
        <div className="flex items-center gap-ds-2 shrink-0">
          {trade_r !== null && (
            <span
              className={cn(
                'font-mono tabular-nums text-[12px] font-medium',
                rIsNegative ? 'text-num-negative' : 'text-num-neutral',
              )}
            >
              {rIsNegative ? '−' : '+'}
              {Math.abs(trade_r).toFixed(1)}R
            </span>
          )}
          {hide_pnl || trade_pnl === null ? (
            <span className="font-sans tabular-nums text-[13px] font-medium text-ink-muted select-none" aria-label="P&L hidden">
              •••
            </span>
          ) : (
            <span
              className={cn(
                'font-sans tabular-nums text-[13px] font-medium',
                isNegative ? 'text-num-negative' : 'text-num-neutral',
              )}
            >
              {formatPnl(trade_pnl)}
            </span>
          )}
        </div>
      </div>

      {/* Secondary row: setup + entry/exit + size */}
      <div className="flex items-center gap-ds-3 flex-wrap">
        {trade_setup && (
          <span className="font-sans text-[11px] font-medium text-ink-secondary bg-surface-1 border-[0.5px] border-border-ds-subtle rounded-[4px] px-ds-2 py-[2px]">
            {trade_setup}
          </span>
        )}

        {trade_strategy_category && (
          <span className="font-sans text-[11px] font-medium text-gold-primary bg-[rgba(201,166,70,0.10)] border-[0.5px] border-gold-border rounded-[4px] px-ds-2 py-[2px]">
            {trade_strategy_category}
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
    </div>
  );
}

// ── Reaction bar ───────────────────────────────────────────────────────────────

interface LocalReactionBarProps {
  item: GlobalFeedItem;
}

function LocalReactionBar({ item }: LocalReactionBarProps) {
  const toggleReaction = useToggleGlobalReaction();

  function handleReaction(emoji: string) {
    toggleReaction.mutate(
      { postId: item.id, emoji },
      {
        onError: () => {
          toast({ title: 'Failed to react. Please try again.' });
        },
      },
    );
  }

  return (
    <ReactionBar
      reactions={item.reactions}
      myReaction={item.my_reaction}
      onReact={handleReaction}
      disabled={toggleReaction.isPending}
    />
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
                    <AuthorAvatar name={c.author_name} avatarUrl={null} />
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deletePost = useDeleteGlobalPost();

  function handleDelete() {
    setOpen(false);
    setConfirmOpen(false);
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
            onClick={() => { setOpen(false); setConfirmOpen(true); }}
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

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Delete post?</DialogTitle>
            <DialogDescription>
              This can't be undone. The post will be removed from the feed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deletePost.isPending}
              onClick={handleDelete}
            >
              {deletePost.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

  return (
    <Card variant="default" padding="default" className="flex flex-col gap-ds-3">
      {/* Header: monogram + author + time + delete */}
      <div className="flex items-start justify-between gap-ds-3">
        <div className="flex items-center gap-ds-2 min-w-0">
          <AuthorAvatar name={item.author_name} avatarUrl={item.author_avatar_url} />
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
              onClick={() => navigate(`/app/floor/dm?dm=${item.author_id}`)}
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

      {/* Author reputation — membership tier + consistency (WR + profit factor) */}
      <AuthorBadges item={item} />

      {/* Caption / body */}
      {item.body && (
        <p className="font-sans text-[14px] text-ink-secondary leading-relaxed break-words whitespace-pre-wrap">
          {item.body}
        </p>
      )}

      {/* Attached trade — only when a trade is linked.
          show_chart === false (explicit) → branded no-chart business card;
          undefined/true → existing chart+data card (default behavior). */}
      {item.attached_trade_id && (
        item.show_chart === false ? (
          <TradeBusinessCard item={item} />
        ) : (
          <AttachedTradeCard item={item} />
        )
      )}

      {/* Reaction bar */}
      <LocalReactionBar item={item} />

      {/* Comment thread */}
      <CommentThread item={item} />
    </Card>
  );
}
