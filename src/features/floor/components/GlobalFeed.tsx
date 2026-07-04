// src/components/community/GlobalFeed.tsx
// Global community feed — Facebook-style inline composer + infinite scroll list.
//
// Composer card: avatar (from FloorProfile) + "Share a trade…" pill → opens
// PostTradeDialog. Pencil icon opens FloorProfileDialog for avatar/nickname edits.
//
// Infinite scroll: IntersectionObserver sentinel at list bottom calls
// fetchNextPage() when visible and hasNextPage is true.

import { useEffect, useRef, useState } from 'react';
import { UserCog, ShieldCheck } from 'lucide-react';
import { DataState } from '@/components/ds/DataState';
import { Skeleton } from '@/components/ds/Skeleton';
import { cn } from '@/lib/utils';
import {
  useGlobalFeed,
  useFeedFacets,
  useConsistencyLeaderboard,
} from '@/features/floor/hooks/useGlobalFeed';
import { useFloorProfile } from '@/features/floor/hooks/useFloorProfile';
import { SharedTradeCard } from '@/features/floor/components/SharedTradeCard';
import { FeedTagRail } from '@/features/floor/components/FeedTagRail';
import { PostTradeDialog } from '@/features/floor/components/PostTradeDialog';
import { FloorProfileDialog } from '@/features/floor/components/FloorProfileDialog';
import type {
  GlobalFeedItem,
  FeedFilters,
  FeedFacetKind,
} from '@/features/floor/types/community';

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

// ── Composer avatar ────────────────────────────────────────────────────────────

function ComposerAvatar({
  avatarUrl,
  username,
}: {
  avatarUrl: string | null;
  username: string | null;
}) {
  const [imgError, setImgError] = useState(false);

  const initials = (username ?? '?')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase() || '?';

  const showImage = !!avatarUrl && !imgError;

  return (
    <div
      className="h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
      style={{
        background: showImage
          ? 'transparent'
          : 'linear-gradient(135deg, #C9A646 0%, #E8C766 100%)',
        border: showImage ? 'none' : '1.5px solid rgba(201,166,70,0.35)',
      }}
    >
      {showImage ? (
        <img
          src={avatarUrl}
          alt="Your avatar"
          className="h-full w-full object-cover scale-[1.6]"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className="text-sm font-bold select-none"
          style={{ color: '#0A0A0A' }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

// ── Inline composer card ───────────────────────────────────────────────────────

interface ComposerCardProps {
  onOpenComposer: () => void;
  onOpenProfile: () => void;
}

function ComposerCard({ onOpenComposer, onOpenProfile }: ComposerCardProps) {
  const { profile } = useFloorProfile();

  return (
    <div
      className="flex items-center gap-3 px-3 py-3 rounded-[14px]"
      style={{
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Avatar */}
      <ComposerAvatar
        avatarUrl={profile?.avatar_url ?? null}
        username={profile?.floor_username ?? null}
      />

      {/* Prompt pill */}
      <button
        type="button"
        onClick={onOpenComposer}
        aria-label="Share a trade"
        className={cn(
          'flex-1 text-left rounded-full px-4 py-2 text-sm transition-colors duration-100',
          'hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A646]/50',
        )}
        style={{
          background: '#1a1a1a',
          color: '#555',
          border: '1px solid rgba(255,255,255,0.06)',
          cursor: 'pointer',
        }}
      >
        Share a trade…
      </button>

      {/* Edit profile icon button */}
      <button
        type="button"
        onClick={onOpenProfile}
        aria-label="Edit Floor profile"
        title="Edit profile"
        className={cn(
          'h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0',
          'transition-colors duration-100',
          'hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A646]/50',
        )}
        style={{ color: '#666' }}
      >
        <UserCog className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Next-page loading row ──────────────────────────────────────────────────────

function LoadingMore() {
  return (
    <div className="flex items-center justify-center py-4 gap-2">
      <span
        className="h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.3s]"
        style={{ background: '#C9A646' }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.15s]"
        style={{ background: '#C9A646' }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full animate-bounce"
        style={{ background: '#C9A646' }}
      />
    </div>
  );
}

// ── Verified-only notice ───────────────────────────────────────────────────────

function VerifiedOnlyNotice() {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-[12px]"
      style={{
        background: 'rgba(201,166,70,0.06)',
        border: '1px solid rgba(201,166,70,0.22)',
      }}
    >
      <ShieldCheck
        className="h-[18px] w-[18px] flex-shrink-0 mt-[1px]"
        style={{ color: '#C9A646' }}
      />
      <p className="font-sans text-[12.5px] leading-relaxed text-ink-secondary">
        <span className="font-semibold text-ink-primary">Verified trades only.</span>{' '}
        Everything on the feed is pulled straight from a connected broker — real
        fills, real results. You can’t post screenshots or trades that weren’t
        actually executed through your broker.
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function GlobalFeed() {
  const [filters, setFilters] = useState<FeedFilters>({});

  const {
    posts,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGlobalFeed(filters);

  const { facets } = useFeedFacets();
  const { rows: leaderboard } = useConsistencyLeaderboard('week', 5);

  const [composerOpen, setComposerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Single-select per dimension; clicking the active chip clears that dimension.
  function toggleFilter(kind: FeedFacetKind, value: string) {
    setFilters((prev) => {
      const field = (
        {
          symbol: 'symbol',
          strategy_category: 'strategyCategory',
          outcome: 'outcome',
          tier: 'tier',
        } as const
      )[kind];
      const next = { ...prev };
      if (next[field] === value) {
        next[field] = null;
      } else {
        next[field] = value as never;
      }
      return next;
    });
  }

  // ── Infinite scroll sentinel ────────────────────────
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className={cn('flex flex-col gap-ds-5 px-ds-5 py-ds-5')}>
      {/* Section heading — eyebrow + large title */}
      <div className="flex flex-col gap-[2px]">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-primary">
          The Floor
        </span>
        <h1 className="font-sans text-[30px] font-bold leading-tight text-ink-primary">
          Community Feed
        </h1>
        <p className="font-sans text-[13px] text-ink-tertiary">
          Live trade shares from the FINOTAUR community
        </p>
      </div>

      <PostTradeDialog open={composerOpen} onOpenChange={setComposerOpen} />
      <FloorProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />

      {/* Two-column layout: feed (left) + tag rail (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-ds-4 items-start">
        {/* Main column */}
        <div className="flex flex-col gap-ds-4 min-w-0">
          {/* Inline composer card */}
          <ComposerCard
            onOpenComposer={() => setComposerOpen(true)}
            onOpenProfile={() => setProfileOpen(true)}
          />

          {/* Verified-only notice */}
          <VerifiedOnlyNotice />

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

                  {/* Next-page loading indicator */}
                  {isFetchingNextPage && <LoadingMore />}

                  {/* IntersectionObserver sentinel — sits below the last card */}
                  <div ref={sentinelRef} aria-hidden="true" />
                </div>
              )}
            </DataState>
          </div>
        </div>

        {/* Right rail — sticky on large screens */}
        <div className="hidden lg:block lg:sticky lg:top-ds-4">
          <FeedTagRail
            facets={facets}
            filters={filters}
            onToggle={toggleFilter}
            onClearAll={() => setFilters({})}
            leaderboard={leaderboard}
          />
        </div>
      </div>
    </div>
  );
}
