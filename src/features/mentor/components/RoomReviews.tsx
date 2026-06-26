// src/components/mentorship/RoomReviews.tsx
// 1:1 Trade Review UI for a mentor space.
//
// Members:  submit closed trades for mentor review → add comments → track status.
// Managers: see all submissions → change status (Under Review / Reviewed / Closed).
//
// Layout:
//   Header (title + "Request a review" CTA)
//   → Review cards (trade header + status badge + 3 stat tiles + comment thread)

import { useState } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, SendHorizonal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { DataState } from '@/components/ds/DataState';
import { useAuth } from '@/providers/AuthProvider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  useSpaceReviews,
  useReviewComments,
  useRequestReview,
  useAddReviewComment,
  useSetReviewStatus,
  useMyRecentClosedTrades,
} from '@/features/mentor/hooks/useSpaceReviews';
import { SharedNotePanel } from '@/features/mentor/components/SharedNotePanel';
import type {
  TradeReview,
  ReviewComment,
  ReviewStatus,
  ClosedTrade,
} from '@/features/mentor/hooks/useSpaceReviews';

// ── Props ─────────────────────────────────────────────────────────────────────

interface RoomReviewsProps {
  spaceId: string;
  isManager: boolean;
}

// ── Formatters (reused from RoomLeaderboard conventions) ──────────────────────

/** Formats a dollar amount using U+2212 for negative. */
function formatPnl(value: number): string {
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `−$${abs}` : `$${abs}`;
}

/** Returns short date string "Jun 21, 2026". */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ReviewStatus, string> = {
  under_review: 'Under Review',
  reviewed: 'Reviewed',
  closed: 'Closed',
};

function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-ds-2 py-[3px] rounded-[6px]',
        'font-sans text-[11px] font-semibold tracking-[0.5px]',
        status === 'under_review' && 'bg-[rgba(234,179,8,0.12)] text-[#eab308]',
        status === 'reviewed' && 'bg-[rgba(16,185,129,0.12)] text-[#10b981]',
        status === 'closed' && 'bg-surface-2 text-ink-tertiary',
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ── Status control (manager only) ─────────────────────────────────────────────

const NEXT_STATUSES: Record<ReviewStatus, { label: string; value: ReviewStatus }[]> = {
  under_review: [{ label: 'Mark Reviewed', value: 'reviewed' }],
  reviewed: [{ label: 'Close', value: 'closed' }],
  closed: [],
};

interface StatusControlProps {
  reviewId: string;
  spaceId: string;
  currentStatus: ReviewStatus;
}

function StatusControl({ reviewId, spaceId, currentStatus }: StatusControlProps) {
  const { mutate, isPending } = useSetReviewStatus();
  const actions = NEXT_STATUSES[currentStatus];
  if (actions.length === 0) return null;

  return (
    <div className="flex items-center gap-ds-2">
      {actions.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          disabled={isPending}
          onClick={() =>
            mutate(
              { reviewId, spaceId, status: value },
              {
                onError: () =>
                  toast({ title: 'Failed to update status. Please try again.' }),
              },
            )
          }
          className={cn(
            'px-ds-3 py-[5px] rounded-[6px]',
            'font-sans text-[12px] font-medium',
            'border-[0.5px] border-border-ds-default text-ink-secondary',
            'hover:border-border-ds-strong hover:text-ink-primary',
            'transition-colors duration-base ease-out',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Comment bubble ────────────────────────────────────────────────────────────

function CommentBubble({
  comment,
  isOwn,
}: {
  comment: ReviewComment;
  isOwn: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-[3px] max-w-[80%]',
        isOwn ? 'self-end items-end' : 'self-start items-start',
      )}
    >
      {/* author row */}
      <div className="flex items-center gap-ds-1">
        <span className="font-sans text-[11px] text-ink-tertiary">
          {comment.author_name}
        </span>
        {comment.author_is_mentor && (
          <span className="inline-flex items-center px-[5px] py-[1px] rounded-[4px] bg-[rgba(201,166,70,0.12)] text-gold-muted font-sans text-[10px] font-semibold tracking-[0.4px]">
            Mentor
          </span>
        )}
      </div>

      {/* bubble */}
      <div
        className={cn(
          'px-ds-3 py-[8px] rounded-[10px]',
          'font-sans text-[13px] leading-snug',
          isOwn
            ? 'bg-[rgba(201,166,70,0.10)] text-ink-primary'
            : 'bg-surface-2 text-ink-primary',
        )}
      >
        {comment.body}
      </div>

      {/* timestamp */}
      <span className="font-sans text-[10px] text-ink-tertiary">
        {formatDate(comment.created_at)}
      </span>
    </div>
  );
}

// ── Comment thread ─────────────────────────────────────────────────────────────

interface CommentThreadProps {
  reviewId: string;
  spaceId: string;
  currentUserId: string;
}

function CommentThread({ reviewId, spaceId, currentUserId }: CommentThreadProps) {
  const [body, setBody] = useState('');
  const { comments, isLoading, isError, error } = useReviewComments(reviewId);
  const { mutate: addComment, isPending } = useAddReviewComment();

  function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;
    addComment(
      { reviewId, spaceId, body: trimmed },
      {
        onSuccess: () => setBody(''),
        onError: () => toast({ title: 'Failed to send comment. Please try again.' }),
      },
    );
  }

  return (
    <div className="flex flex-col gap-ds-3 mt-ds-2 pt-ds-3 border-t border-border-ds-subtle">
      {/* thread */}
      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={comments}
        empty={
          <p className="font-sans text-[12px] text-ink-tertiary py-ds-2 text-center">
            No comments yet. Be the first to add context.
          </p>
        }
      >
        {(data) => (
          <div className="flex flex-col gap-ds-2">
            {data.map((c) => (
              <CommentBubble
                key={c.id}
                comment={c}
                isOwn={c.author_id === currentUserId}
              />
            ))}
          </div>
        )}
      </DataState>

      {/* input row */}
      <div className="flex items-center gap-ds-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Add a comment…"
          className={cn(
            'flex-1 min-w-0 px-ds-3 py-[8px] rounded-[8px]',
            'bg-surface-2 border-[0.5px] border-border-ds-subtle',
            'font-sans text-[13px] text-ink-primary placeholder:text-ink-muted',
            'focus:outline-none focus:border-border-ds-default',
            'transition-colors duration-base ease-out',
          )}
        />
        <button
          type="button"
          disabled={isPending || !body.trim()}
          onClick={handleSend}
          aria-label="Send comment"
          className={cn(
            'flex items-center justify-center h-[34px] w-[34px] rounded-[8px]',
            'bg-surface-2 border-[0.5px] border-border-ds-subtle',
            'text-ink-secondary hover:text-ink-primary hover:border-border-ds-default',
            'transition-colors duration-base ease-out',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          <SendHorizonal size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ── Review card ───────────────────────────────────────────────────────────────

interface ReviewCardProps {
  review: TradeReview;
  spaceId: string;
  isManager: boolean;
  currentUserId: string;
}

function ReviewCard({ review, spaceId, isManager, currentUserId }: ReviewCardProps) {
  const [threadOpen, setThreadOpen] = useState(false);
  const isNegativePnl = review.trade_pnl < 0;

  return (
    <Card variant="default" padding="compact">
      {/* trade header row */}
      <div className="flex items-start justify-between gap-ds-3">
        <div className="flex flex-col gap-[2px] min-w-0">
          <div className="flex items-center gap-ds-2 flex-wrap">
            <span className="font-sans text-[15px] font-semibold text-ink-primary">
              {review.trade_symbol}
            </span>
            <span className="font-sans text-[12px] text-ink-tertiary uppercase tracking-[0.5px]">
              {review.trade_side}
            </span>
            <StatusBadge status={review.status} />
          </div>
          <span className="font-sans text-[12px] text-ink-tertiary">
            Closed {formatDate(review.trade_close_at)}
          </span>
        </div>

        {/* manager status control */}
        {isManager && (
          <div className="shrink-0">
            <StatusControl
              reviewId={review.id}
              spaceId={spaceId}
              currentStatus={review.status}
            />
          </div>
        )}
      </div>

      {/* 3 stat tiles */}
      <div className="grid grid-cols-3 gap-ds-3 mt-ds-3">
        {/* P&L */}
        <div className="flex flex-col gap-[2px] px-ds-3 py-ds-2 rounded-[8px] bg-surface-2">
          <span className="font-sans text-[10px] font-medium tracking-[1px] uppercase text-ink-tertiary">
            P&amp;L
          </span>
          <span
            className={cn(
              'font-sans tabular-nums text-[14px] font-semibold',
              isNegativePnl ? 'text-num-negative' : 'text-num-neutral',
            )}
          >
            {formatPnl(review.trade_pnl)}
          </span>
        </div>

        {/* R Multiple */}
        <div className="flex flex-col gap-[2px] px-ds-3 py-ds-2 rounded-[8px] bg-surface-2">
          <span className="font-sans text-[10px] font-medium tracking-[1px] uppercase text-ink-tertiary">
            R Multiple
          </span>
          <span className="font-sans tabular-nums text-[14px] font-semibold text-num-neutral">
            {review.trade_r != null ? `${review.trade_r.toFixed(2)}R` : '—'}
          </span>
        </div>

        {/* Submitted by */}
        <div className="flex flex-col gap-[2px] px-ds-3 py-ds-2 rounded-[8px] bg-surface-2">
          <span className="font-sans text-[10px] font-medium tracking-[1px] uppercase text-ink-tertiary">
            Submitted by
          </span>
          <span className="font-sans text-[13px] font-medium text-ink-secondary truncate">
            {review.requester_name}
          </span>
        </div>
      </div>

      {/* thread toggle */}
      <button
        type="button"
        onClick={() => setThreadOpen((prev) => !prev)}
        className={cn(
          'mt-ds-3 flex items-center gap-ds-1',
          'font-sans text-[12px] text-ink-tertiary hover:text-ink-secondary',
          'transition-colors duration-base ease-out',
        )}
      >
        <MessageSquare size={13} aria-hidden="true" />
        <span>
          {review.comment_count === 0
            ? 'Comments'
            : `${review.comment_count} comment${review.comment_count === 1 ? '' : 's'}`}
        </span>
        {threadOpen ? (
          <ChevronUp size={12} aria-hidden="true" />
        ) : (
          <ChevronDown size={12} aria-hidden="true" />
        )}
      </button>

      {/* inline thread */}
      {threadOpen && (
        <>
          <CommentThread
            reviewId={review.id}
            spaceId={spaceId}
            currentUserId={currentUserId}
          />

          {/* Shared living note — co-edited by mentor and student in real-time */}
          <div className="mt-ds-3">
            <SharedNotePanel reviewId={review.id} />
          </div>
        </>
      )}
    </Card>
  );
}

// ── Request review dialog ─────────────────────────────────────────────────────

interface RequestDialogProps {
  spaceId: string;
  open: boolean;
  onClose: () => void;
}

function RequestReviewDialog({ spaceId, open, onClose }: RequestDialogProps) {
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const { trades, isLoading, error } = useMyRecentClosedTrades();
  const { mutate: requestReview, isPending } = useRequestReview();

  function handleSubmit() {
    if (!selectedTradeId) return;
    requestReview(
      { spaceId, tradeId: selectedTradeId },
      {
        onSuccess: () => {
          toast({ title: 'Trade submitted for review.' });
          setSelectedTradeId(null);
          onClose();
        },
        onError: () => {
          toast({ title: 'Failed to submit trade. Please try again.' });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          'w-full max-w-md',
          'bg-[#111111] border-[0.5px] border-border-ds-subtle',
          'rounded-[16px] p-ds-5',
        )}
      >
        <DialogHeader>
          <DialogTitle className="font-sans text-[16px] font-semibold text-ink-primary">
            Request a trade review
          </DialogTitle>
        </DialogHeader>

        <p className="font-sans text-[13px] text-ink-secondary mt-ds-1">
          Pick a closed trade to submit for mentor feedback.
        </p>

        <div className="mt-ds-3 flex flex-col gap-ds-2 max-h-[320px] overflow-y-auto">
          <DataState
            isLoading={isLoading}
            isError={!!error}
            error={error}
            data={trades}
            empty={
              <p className="font-sans text-[13px] text-ink-tertiary text-center py-ds-6">
                No closed trades found. Execute and close a trade first.
              </p>
            }
          >
            {(data) =>
              data.map((trade: ClosedTrade) => {
                const isSelected = trade.id === selectedTradeId;
                const isNeg = (trade.pnl ?? 0) < 0;
                return (
                  <button
                    key={trade.id}
                    type="button"
                    onClick={() => setSelectedTradeId(isSelected ? null : trade.id)}
                    className={cn(
                      'w-full text-left flex items-center justify-between gap-ds-3',
                      'px-ds-3 py-ds-3 rounded-[10px]',
                      'border-[0.5px] transition-colors duration-base ease-out',
                      isSelected
                        ? 'bg-[rgba(201,166,70,0.06)] border-gold-border'
                        : 'bg-surface-2 border-border-ds-subtle hover:border-border-ds-default',
                    )}
                  >
                    <div className="flex flex-col gap-[2px] min-w-0">
                      <span className="font-sans text-[13px] font-semibold text-ink-primary">
                        {trade.symbol}
                        <span className="ml-ds-1 font-normal text-ink-tertiary text-[12px] uppercase">
                          {trade.side}
                        </span>
                      </span>
                      <span className="font-sans text-[11px] text-ink-tertiary">
                        {formatDate(trade.close_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-ds-3 shrink-0">
                      {trade.actual_r != null && (
                        <span className="font-sans tabular-nums text-[12px] text-ink-tertiary">
                          {trade.actual_r.toFixed(2)}R
                        </span>
                      )}
                      <span
                        className={cn(
                          'font-sans tabular-nums text-[13px] font-semibold',
                          isNeg ? 'text-num-negative' : 'text-num-neutral',
                        )}
                      >
                        {trade.pnl != null ? formatPnl(trade.pnl) : '—'}
                      </span>
                    </div>
                  </button>
                );
              })
            }
          </DataState>
        </div>

        <div className="mt-ds-4 flex items-center justify-end gap-ds-3">
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-[13px] text-ink-tertiary hover:text-ink-secondary transition-colors duration-base ease-out"
          >
            Cancel
          </button>
          <Button
            variant="gold"
            size="compact"
            showArrow={false}
            disabled={!selectedTradeId || isPending}
            onClick={handleSubmit}
          >
            {isPending ? 'Submitting…' : 'Submit for review'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RoomReviews({ spaceId, isManager }: RoomReviewsProps) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';
  const [dialogOpen, setDialogOpen] = useState(false);
  const { reviews, isLoading, isError, error, refetch } = useSpaceReviews(spaceId);

  const emptyMessage = isManager
    ? 'No trades submitted for review yet.'
    : 'You haven\'t submitted any trades for review. Pick a trade to get mentor feedback.';

  return (
    <div className="flex flex-col gap-ds-4 px-ds-5 py-ds-5">
      {/* header */}
      <div className="flex items-center justify-between gap-ds-3">
        <h2 className="font-sans text-[15px] font-semibold text-ink-primary">
          Trade Reviews
        </h2>
        {!isManager && (
          <Button
            variant="goldOutline"
            size="compact"
            showArrow={false}
            onClick={() => setDialogOpen(true)}
          >
            Request a review
          </Button>
        )}
      </div>

      {/* reviews list */}
      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={reviews}
        onRetry={refetch}
        empty={
          <p className="font-sans text-[13px] text-ink-tertiary text-center py-ds-9">
            {emptyMessage}
          </p>
        }
      >
        {(data) => (
          <div className="flex flex-col gap-ds-3">
            {data.map((review: TradeReview) => (
              <ReviewCard
                key={review.id}
                review={review}
                spaceId={spaceId}
                isManager={isManager}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </DataState>

      {/* request dialog */}
      <RequestReviewDialog
        spaceId={spaceId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
