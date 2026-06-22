// src/components/community/GlobalFeed.tsx
// Global community feed — paginated SharedTradeCard list (trade_shares only).
//
// Hooks: useGlobalFeed (first page only — cursor pagination is additive).
// Pattern: mirrors RoomFeed layout — DataState wrapper, divided list.

import { useState } from 'react';
import { DataState } from '@/components/ds/DataState';
import { Skeleton } from '@/components/ds/Skeleton';
import { cn } from '@/lib/utils';
import { useGlobalFeed } from '@/hooks/useGlobalFeed';
import { SharedTradeCard } from '@/components/community/SharedTradeCard';
import { PostTradeDialog } from '@/components/community/PostTradeDialog';
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

// ── Main component ─────────────────────────────────────────────────────────────

export function GlobalFeed() {
  const { posts, isLoading, isError, error, refetch } = useGlobalFeed();
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <div className={cn('flex flex-col gap-ds-4 px-ds-5 py-ds-5')}>
      {/* Section heading + compose button */}
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-[15px] font-semibold text-ink-primary">
          Community Feed
        </h2>
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          aria-label="Share a trade"
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center',
            'bg-[#C9A646] hover:bg-[#C9A646]/85 text-black',
            'font-bold text-[18px] leading-none transition-colors duration-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A646]/50',
          )}
        >
          +
        </button>
      </div>

      <PostTradeDialog open={composerOpen} onOpenChange={setComposerOpen} />

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
              No shared trades yet — share a trade from your journal to be the first.
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
