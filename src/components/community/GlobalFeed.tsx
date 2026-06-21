// src/components/community/GlobalFeed.tsx
// Global community feed — composer at top + paginated SharedTradeCard list.
//
// Hooks: useGlobalFeed (first page only — cursor pagination is additive),
//        useCreateGlobalPost.
// Pattern: mirrors RoomFeed layout — DataState wrapper, divided list.

import { useState } from 'react';
import { X } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { DataState } from '@/components/ds/DataState';
import { Skeleton } from '@/components/ds/Skeleton';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useGlobalFeed, useCreateGlobalPost } from '@/hooks/useGlobalFeed';
import { SharedTradeCard } from '@/components/community/SharedTradeCard';
import type { GlobalFeedItem } from '@/types/community';

// ── Feed skeleton ──────────────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-border-ds-subtle" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="p-ds-4">
          <div className="flex flex-col gap-ds-3">
            {/* Header row */}
            <div className="flex items-center gap-ds-2">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex flex-col gap-[4px]">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-14" />
              </div>
            </div>
            {/* Body */}
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            {/* Reaction bar */}
            <div className="flex gap-[6px]">
              <Skeleton className="h-6 w-12 rounded-[6px]" />
              <Skeleton className="h-6 w-12 rounded-[6px]" />
              <Skeleton className="h-6 w-12 rounded-[6px]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Global composer ────────────────────────────────────────────────────────────

function GlobalComposer() {
  const [body, setBody] = useState('');
  const createPost = useCreateGlobalPost();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    createPost.mutate(
      { body: trimmed },
      {
        onSuccess: () => setBody(''),
        onError: (err) => {
          toast({ title: err.message ?? 'Failed to post. Please try again.' });
        },
      },
    );
  }

  return (
    <Card variant="default" padding="default">
      <form onSubmit={handleSubmit} className="flex flex-col gap-ds-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share a trade recap or insight with the community…"
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

        {/* Footer */}
        <div className="flex items-center justify-between gap-ds-3">
          {/* Character count hint */}
          <span className="font-sans text-[11px] text-ink-muted">
            {body.length > 0 ? `${body.length} / 2000` : ''}
          </span>

          <div className="flex items-center gap-ds-2">
            {body.length > 0 && (
              <button
                type="button"
                onClick={() => setBody('')}
                className={cn(
                  'p-[4px] rounded-[6px]',
                  'text-ink-tertiary hover:text-ink-secondary',
                  'transition-colors duration-base ease-out',
                )}
                aria-label="Clear"
              >
                <X size={12} aria-hidden="true" />
              </button>
            )}
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
        </div>
      </form>
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function GlobalFeed() {
  const { posts, isLoading, isError, error, refetch } = useGlobalFeed();

  return (
    <div className="flex flex-col gap-ds-4 px-ds-5 py-ds-5">
      {/* Section heading */}
      <h2 className="font-sans text-[15px] font-semibold text-ink-primary">
        Community Feed
      </h2>

      {/* Composer */}
      <GlobalComposer />

      {/* Feed list */}
      <div className="rounded-[12px] border-[0.5px] border-border-ds-subtle overflow-hidden">
        <DataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          data={posts}
          onRetry={refetch}
          loading={<FeedSkeleton />}
          empty={
            <p className="py-ds-9 text-center font-sans text-[13px] text-ink-tertiary">
              No shared trades yet — be the first to post a recap.
            </p>
          }
        >
          {(data: GlobalFeedItem[]) => (
            <div className="flex flex-col divide-y divide-border-ds-subtle">
              {data.map((item) => (
                <div key={item.id} className="p-ds-4">
                  <SharedTradeCard item={item} />
                </div>
              ))}
            </div>
          )}
        </DataState>
      </div>
    </div>
  );
}
