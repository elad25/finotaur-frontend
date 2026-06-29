// src/components/mentorship/RoomFeed.tsx
// Community Feed for a mentor space.
//
// Layout:
//   1. Composer card — textarea + optional trade chip + Post button.
//   2. Feed list — DataState wrapper → PostCard per post.
//      PostCard: monogram + author + time | body | trade card (optional) |
//               reaction bar | comment thread (expandable).
//
// P&L tokens: text-num-positive / text-num-negative (white / red) per DS.
// Formatting: U+2212 (−) for negative, same approach as RoomLeaderboard.

import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical, MessageSquare, X } from 'lucide-react';
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
  useSpaceFeed,
  useCreatePost,
  useDeletePost,
  usePostComments,
  useAddComment,
  useToggleReaction,
  useMyRecentClosedTrades,
  type FeedPost,
  type FeedComment,
  type RecentClosedTrade,
} from '@/features/mentor/hooks/useSpaceFeed';

// ── Props ──────────────────────────────────────────────────────────────────────

interface RoomFeedProps {
  spaceId: string;
  isManager: boolean;
}

// ── Formatters ─────────────────────────────────────────────────────────────────

/** Dollar P&L with U+2212 for negative — matches RoomLeaderboard exactly. */
function formatPnl(value: number): string {
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value < 0) return `−$${abs}`; // U+2212 mathematical minus
  return `$${abs}`;
}

/** Relative time label — "2m ago", "3h ago", "5d ago". */
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

/** Short date label for trade: "Jun 20". */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Monogram avatar — matches RoomLeaderboard ──────────────────────────────────

function MonogramAvatar({ name }: { name: string }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center shrink-0',
        'h-8 w-8 rounded-full',
        'bg-surface-2 border-[0.5px] border-border-ds-subtle',
        'text-ink-secondary text-[12px] font-semibold',
      )}
    >
      {initial}
    </div>
  );
}

// ── Compact trade card (inside a post) ─────────────────────────────────────────

interface TradeChipProps {
  symbol: string;
  side: string;
  pnl: number | null;
  closeAt: string;
  tradeId: string;
}

function AttachedTradeCard({ symbol, side, pnl, closeAt, tradeId }: TradeChipProps) {
  const isNegative = pnl !== null && pnl < 0;
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-ds-3',
        'rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-2',
        'px-ds-4 py-ds-3',
      )}
    >
      <div className="flex items-center gap-ds-2 min-w-0">
        <span className="font-sans text-[13px] font-semibold text-ink-primary truncate">
          {symbol}
        </span>
        <span className="font-sans text-[11px] font-medium uppercase tracking-[0.5px] text-ink-tertiary shrink-0">
          {side}
        </span>
        {pnl !== null && (
          <span
            className={cn(
              'font-sans tabular-nums text-[13px] font-medium shrink-0',
              isNegative ? 'text-num-negative' : 'text-num-neutral',
            )}
          >
            {formatPnl(pnl)}
          </span>
        )}
        <span className="font-sans text-[11px] text-ink-tertiary shrink-0">
          {shortDate(closeAt)}
        </span>
      </div>
      <Link
        to={`/app/journal/${tradeId}`}
        className={cn(
          'font-sans text-[11px] font-medium shrink-0',
          'text-gold-muted hover:text-gold-primary',
          'transition-colors duration-base ease-out',
        )}
      >
        Journal →
      </Link>
    </div>
  );
}

// ── Post-level reaction handler ────────────────────────────────────────────────

interface PostReactionHandlerProps {
  post: FeedPost;
  spaceId: string;
}

function PostReactionHandler({ post, spaceId }: PostReactionHandlerProps) {
  const toggleReaction = useToggleReaction();

  const handleEmoji = (emoji: string) => {
    toggleReaction.mutate(
      { postId: post.id, spaceId, emoji },
      {
        onError: () => {
          toast({ title: 'Failed to react. Please try again.' });
        },
      },
    );
  };

  return (
    <ReactionBar
      reactions={post.reactions}
      myReaction={post.my_reaction}
      onReact={handleEmoji}
      disabled={toggleReaction.isPending}
    />
  );
}

// ── Comment thread ─────────────────────────────────────────────────────────────

interface CommentThreadProps {
  post: FeedPost;
  spaceId: string;
  currentUserId: string;
}

function CommentThread({ post, spaceId, currentUserId }: CommentThreadProps) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const addComment = useAddComment();
  const { comments, isLoading, isError, error, refetch } = usePostComments(
    open ? post.id : undefined,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    addComment.mutate(
      { postId: post.id, spaceId, body: trimmed },
      {
        onSuccess: () => setBody(''),
        onError: (err) => {
          toast({ title: err.message ?? 'Failed to add comment.' });
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-ds-2">
      {/* Toggle button */}
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
        {post.comment_count > 0 ? `${post.comment_count}` : 'Comment'}
      </button>

      {/* Expanded thread */}
      {open && (
        <div className="flex flex-col gap-ds-3 pl-ds-3 border-l-[0.5px] border-border-ds-subtle">
          {/* Comment list */}
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
                {list.map((c: FeedComment) => (
                  <CommentRow
                    key={c.id}
                    comment={c}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            )}
          </DataState>

          {/* Add comment input */}
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

/** Single comment row — author monogram + name + time + body. */
function CommentRow({
  comment,
  currentUserId: _currentUserId,
}: {
  comment: FeedComment;
  currentUserId: string;
}) {
  return (
    <div className="flex gap-ds-2">
      <MonogramAvatar name={comment.author_name} />
      <div className="flex flex-col gap-[2px] min-w-0">
        <div className="flex items-baseline gap-ds-2">
          <span className="font-sans text-[12px] font-medium text-ink-primary">
            {comment.author_name}
          </span>
          <span className="font-sans text-[11px] text-ink-tertiary">
            {relativeTime(comment.created_at)}
          </span>
        </div>
        <p className="font-sans text-[13px] text-ink-secondary leading-relaxed break-words">
          {comment.body}
        </p>
      </div>
    </div>
  );
}

// ── Delete kebab ───────────────────────────────────────────────────────────────

interface DeleteKebabProps {
  postId: string;
  spaceId: string;
}

function DeleteKebab({ postId, spaceId }: DeleteKebabProps) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deletePost = useDeletePost();

  const handleDelete = () => {
    setOpen(false);
    setConfirmOpen(false);
    deletePost.mutate(
      { postId, spaceId },
      {
        onError: () => {
          toast({ title: 'Failed to delete post. Please try again.' });
        },
      },
    );
  };

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

// ── Post card ──────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: FeedPost;
  spaceId: string;
  currentUserId: string;
  isManager: boolean;
}

function PostCard({ post, spaceId, currentUserId, isManager }: PostCardProps) {
  const canDelete = post.author_id === currentUserId || isManager;

  return (
    <Card variant="default" padding="default" className="flex flex-col gap-ds-3">
      {/* Header: monogram + author + time + delete */}
      <div className="flex items-start justify-between gap-ds-3">
        <div className="flex items-center gap-ds-2 min-w-0">
          <MonogramAvatar name={post.author_name} />
          <div className="flex flex-col gap-[1px] min-w-0">
            <span className="font-sans text-[13px] font-semibold text-ink-primary truncate">
              {post.author_name}
            </span>
            <span className="font-sans text-[11px] text-ink-tertiary">
              {relativeTime(post.created_at)}
              {post.pinned && (
                <span className="ml-[6px] text-gold-muted font-medium">· Pinned</span>
              )}
            </span>
          </div>
        </div>
        {canDelete && <DeleteKebab postId={post.id} spaceId={spaceId} />}
      </div>

      {/* Body */}
      <p className="font-sans text-[14px] text-ink-secondary leading-relaxed break-words whitespace-pre-wrap">
        {post.body}
      </p>

      {/* Attached trade */}
      {post.attached_trade_id && post.trade_symbol && (
        <AttachedTradeCard
          tradeId={post.attached_trade_id}
          symbol={post.trade_symbol}
          side={post.trade_side ?? ''}
          pnl={post.trade_pnl}
          closeAt={post.trade_close_at ?? post.created_at}
        />
      )}

      {/* Reaction bar */}
      <PostReactionHandler post={post} spaceId={spaceId} />

      {/* Comment thread */}
      <CommentThread post={post} spaceId={spaceId} currentUserId={currentUserId} />
    </Card>
  );
}

// ── Trade picker (dropdown inside composer) ────────────────────────────────────

interface TradePickerProps {
  onSelect: (trade: RecentClosedTrade) => void;
  onClose: () => void;
}

function TradePicker({ onSelect, onClose }: TradePickerProps) {
  const { trades, isLoading } = useMyRecentClosedTrades();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (!ref.current?.contains(e.relatedTarget as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <div
      ref={ref}
      tabIndex={-1}
      onBlur={handleBlur}
      className={cn(
        'absolute left-0 top-[calc(100%+4px)] z-20 w-full max-w-sm',
        'rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-glass',
        'backdrop-blur-glass shadow-lg',
        'max-h-[260px] overflow-y-auto',
      )}
    >
      {isLoading && (
        <p className="px-ds-4 py-ds-3 font-sans text-[12px] text-ink-tertiary">
          Loading trades…
        </p>
      )}
      {!isLoading && trades.length === 0 && (
        <p className="px-ds-4 py-ds-3 font-sans text-[12px] text-ink-tertiary">
          No recent closed trades.
        </p>
      )}
      {trades.map((t) => {
        const isNegative = t.pnl !== null && t.pnl < 0;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => { onSelect(t); onClose(); }}
            className={cn(
              'w-full flex items-center justify-between gap-ds-3',
              'px-ds-4 py-[9px]',
              'text-left',
              'border-b border-border-ds-subtle last:border-0',
              'hover:bg-surface-2 transition-colors duration-base ease-out',
            )}
          >
            <div className="flex items-center gap-ds-2 min-w-0">
              <span className="font-sans text-[13px] font-semibold text-ink-primary truncate">
                {t.symbol}
              </span>
              <span className="font-sans text-[11px] uppercase tracking-[0.5px] text-ink-tertiary shrink-0">
                {t.side}
              </span>
            </div>
            <div className="flex items-center gap-ds-2 shrink-0">
              {t.pnl !== null && (
                <span
                  className={cn(
                    'font-sans tabular-nums text-[12px] font-medium',
                    isNegative ? 'text-num-negative' : 'text-num-neutral',
                  )}
                >
                  {formatPnl(t.pnl)}
                </span>
              )}
              <span className="font-sans text-[11px] text-ink-tertiary">
                {shortDate(t.close_at)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Composer card ──────────────────────────────────────────────────────────────

interface ComposerProps {
  spaceId: string;
}

function Composer({ spaceId }: ComposerProps) {
  const [body, setBody] = useState('');
  const [attachedTrade, setAttachedTrade] = useState<RecentClosedTrade | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const createPost = useCreatePost();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    createPost.mutate(
      { spaceId, body: trimmed, tradeId: attachedTrade?.id },
      {
        onSuccess: () => {
          setBody('');
          setAttachedTrade(null);
        },
        onError: (err) => {
          toast({ title: err.message ?? 'Failed to post. Please try again.' });
        },
      },
    );
  };

  return (
    <Card variant="default" padding="default">
      <form onSubmit={handleSubmit} className="flex flex-col gap-ds-3">
        {/* Textarea */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share a recap or insight…"
          rows={3}
          maxLength={2000}
          className={cn(
            'w-full resize-none',
            'rounded-[8px] border-[0.5px] border-border-ds-subtle bg-surface-2',
            'px-ds-3 py-ds-3',
            'font-sans text-[14px] text-ink-primary placeholder:text-ink-muted leading-relaxed',
            'focus:outline-none focus:border-border-ds-default',
            'transition-colors duration-base ease-out',
          )}
        />

        {/* Attached trade chip */}
        {attachedTrade && (
          <div
            className={cn(
              'inline-flex items-center gap-ds-2 self-start',
              'rounded-[6px] border-[0.5px] border-gold-border bg-[rgba(201,166,70,0.08)]',
              'px-ds-3 py-[5px]',
            )}
          >
            <span className="font-sans text-[12px] font-semibold text-gold-primary">
              {attachedTrade.symbol}
            </span>
            {attachedTrade.pnl !== null && (
              <span
                className={cn(
                  'font-sans tabular-nums text-[12px] font-medium',
                  attachedTrade.pnl < 0 ? 'text-num-negative' : 'text-num-neutral',
                )}
              >
                {formatPnl(attachedTrade.pnl)}
              </span>
            )}
            <button
              type="button"
              onClick={() => setAttachedTrade(null)}
              className="text-ink-tertiary hover:text-ink-secondary transition-colors"
              aria-label="Remove attached trade"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Footer: attach button + post button */}
        <div className="flex items-center justify-between gap-ds-3">
          {/* Attach trade button + picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className={cn(
                'font-sans text-[12px] font-medium',
                'text-ink-tertiary hover:text-gold-primary',
                'transition-colors duration-base ease-out',
              )}
            >
              {attachedTrade ? '↩ Change trade' : '+ Attach a trade'}
            </button>
            {pickerOpen && (
              <TradePicker
                onSelect={setAttachedTrade}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>

          <Button
            type="submit"
            variant="goldOutline"
            size="compact"
            showArrow={false}
            disabled={!body.trim() || createPost.isPending}
          >
            {createPost.isPending ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RoomFeed({ spaceId, isManager }: RoomFeedProps) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';

  const { posts, isLoading, isError, error, refetch } = useSpaceFeed(spaceId);

  return (
    <div className="flex flex-col gap-ds-4 px-ds-5 py-ds-5">
      {/* Section heading */}
      <h2 className="font-sans text-[15px] font-semibold text-ink-primary">
        Community Feed
      </h2>

      {/* Composer */}
      <Composer spaceId={spaceId} />

      {/* Feed */}
      <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle overflow-hidden">
        <DataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          data={posts}
          onRetry={refetch}
          empty={
            <p className="py-ds-9 text-center font-sans text-[13px] text-ink-tertiary">
              No posts yet — share your first recap.
            </p>
          }
        >
          {(data) => (
            <div className="flex flex-col divide-y divide-border-ds-subtle">
              {data.map((post: FeedPost) => (
                <div key={post.id} className="p-ds-4">
                  <PostCard
                    post={post}
                    spaceId={spaceId}
                    currentUserId={currentUserId}
                    isManager={isManager}
                  />
                </div>
              ))}
            </div>
          )}
        </DataState>
      </div>
    </div>
  );
}
