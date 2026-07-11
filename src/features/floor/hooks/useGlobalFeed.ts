// src/hooks/useGlobalFeed.ts
// TanStack Query hooks for the Global Community Feed (posts, comments, reactions).
//
// All data access goes through SECURITY DEFINER Postgres RPCs:
//   - list_global_feed(p_before?, p_limit?)
//   - create_global_post(p_body, p_trade_id?, p_hide_pnl?, p_show_setup_only?, p_reveal_size?)
//   - delete_global_post(p_post)
//   - add_global_comment(p_post, p_body)
//   - list_global_comments(p_post, p_limit?)
//   - toggle_global_reaction(p_post, p_emoji)
//
// Pagination: cursor-based via p_before (ISO timestamp of the oldest item in
// the current page). Each page fetches with p_before = created_at of the last
// item of the previous page. First page uses p_before = null.

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { mapSpaceError } from '@/features/shared/utils/spaceError';
import type {
  GlobalFeedItem,
  GlobalComment,
  SharePrivacy,
  FeedFilters,
  FeedFacet,
  ConsistencyLeaderboardRow,
} from '@/features/floor/types/community';

// ================================================
// QUERY KEYS
// ================================================

const feedKeys = {
  feed: (filters: FeedFilters) =>
    [
      'global-feed',
      'list',
      filters.symbol ?? null,
      filters.strategyCategory ?? null,
      filters.outcome ?? null,
      filters.tier ?? null,
    ] as const,
  comments: (postId: string) => ['global-feed', 'comments', postId] as const,
  facets: () => ['global-feed', 'facets'] as const,
  consistencyBoard: (period: string) => ['global-feed', 'consistency-board', period] as const,
};

// ================================================
// QUERIES
// ================================================

const FEED_PAGE_SIZE = 20;

/**
 * Infinite-scroll hook for the global community feed.
 *
 * Each page is fetched with p_before = created_at of the last item of the
 * previous page (null for the first page). getNextPageParam returns undefined
 * when fewer than FEED_PAGE_SIZE items are returned, signalling end of feed.
 *
 * Return shape (backwards-compatible):
 *   posts            — flattened array of all loaded GlobalFeedItems
 *   isLoading        — true only on the very first fetch
 *   isError          — true if any page fetch errored
 *   error            — Error | null
 *   refetch          — refetches all loaded pages
 *   fetchNextPage    — load the next page
 *   hasNextPage      — true when more items may exist
 *   isFetchingNextPage — true while a next-page request is in-flight
 */
export function useGlobalFeed(filters: FeedFilters = {}): {
  posts: GlobalFeedItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
} {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<GlobalFeedItem[], Error>({
    queryKey: feedKeys.feed(filters),
    staleTime: 15_000,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const cursor = (pageParam as string | null) ?? null;
      const { data, error } = await supabase.rpc('list_global_feed', {
        p_before: cursor,
        p_limit: FEED_PAGE_SIZE,
        p_symbol: filters.symbol ?? null,
        p_strategy_category: filters.strategyCategory ?? null,
        p_outcome: filters.outcome ?? null,
        p_tier: filters.tier ?? null,
      });
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
        ...row,
        reaction_count: (row.reaction_count as number) ?? 0,
        reactions: (row.reactions as GlobalFeedItem['reactions']) ?? [],
        my_reaction: (row.my_reaction as string | null) ?? null,
        show_chart: (row.show_chart as boolean) ?? true,
      })) as GlobalFeedItem[];
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < FEED_PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1].created_at;
    },
  });

  // Flatten all pages into a single ordered array
  const posts = data?.pages.flat() ?? [];

  return {
    posts,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
  };
}

/** Lists comments for a single global post. */
export function useGlobalPostComments(postId?: string): {
  comments: GlobalComment[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<GlobalComment[], Error>({
    queryKey: feedKeys.comments(postId ?? ''),
    enabled: !!postId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_global_comments', {
        p_post: postId,
        p_limit: 50,
      });
      if (error) throw error;
      return (data ?? []) as GlobalComment[];
    },
  });

  return { comments: data, isLoading, isError, error, refetch };
}

/** Tag facets (instrument / strategy category / outcome / tier) with post counts. */
export function useFeedFacets(): {
  facets: FeedFacet[];
  isLoading: boolean;
} {
  const { data = [], isLoading } = useQuery<FeedFacet[], Error>({
    queryKey: feedKeys.facets(),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('feed_tag_facets');
      if (error) throw error;
      return (data ?? []) as FeedFacet[];
    },
  });
  return { facets: data, isLoading };
}

/** Top traders by consistency (WR + profit factor) — never ranked by net P&L. */
export function useConsistencyLeaderboard(
  period: 'all' | 'week' | 'month' = 'week',
  limit = 5,
): {
  rows: ConsistencyLeaderboardRow[];
  isLoading: boolean;
} {
  const { data = [], isLoading } = useQuery<ConsistencyLeaderboardRow[], Error>({
    queryKey: feedKeys.consistencyBoard(period),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('community_consistency_leaderboard', {
        p_period: period,
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as ConsistencyLeaderboardRow[];
    },
  });
  return { rows: data, isLoading };
}

// ================================================
// MUTATIONS
// ================================================

interface CreateGlobalPostInput {
  body: string;
  tradeId?: string;
  privacy?: Pick<SharePrivacy, 'hidePnl' | 'showSetupOnly' | 'revealSize'>;
}

/** Creates a new global community post. Invalidates the feed on success. */
export function useCreateGlobalPost() {
  const qc = useQueryClient();
  return useMutation<GlobalFeedItem, Error, CreateGlobalPostInput>({
    mutationFn: async ({ body, tradeId, privacy }) => {
      const { data, error } = await supabase.rpc('create_global_post', {
        p_body: body,
        p_trade_id: tradeId ?? null,
        p_hide_pnl: privacy?.hidePnl ?? false,
        p_show_setup_only: privacy?.showSetupOnly ?? false,
        p_reveal_size: privacy?.revealSize ?? false,
      });
      if (error) throw new Error(mapSpaceError(error));
      return data as GlobalFeedItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['global-feed', 'list'] });
    },
  });
}

interface DeleteGlobalPostInput {
  postId: string;
}

/** Deletes a global post (author-only, enforced server-side). Invalidates the feed. */
export function useDeleteGlobalPost() {
  const qc = useQueryClient();
  return useMutation<void, Error, DeleteGlobalPostInput>({
    mutationFn: async ({ postId }) => {
      const { error } = await supabase.rpc('delete_global_post', { p_post: postId });
      if (error) throw new Error(mapSpaceError(error));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['global-feed', 'list'] });
    },
  });
}

interface AddGlobalCommentInput {
  postId: string;
  body: string;
}

/**
 * Adds a comment to a global post.
 * Invalidates both the comment list and the feed (to refresh comment_count).
 */
export function useAddGlobalComment() {
  const qc = useQueryClient();
  return useMutation<GlobalComment, Error, AddGlobalCommentInput>({
    mutationFn: async ({ postId, body }) => {
      const { data, error } = await supabase.rpc('add_global_comment', {
        p_post: postId,
        p_body: body,
      });
      if (error) throw new Error(mapSpaceError(error));
      return data as GlobalComment;
    },
    onSuccess: (_data, { postId }) => {
      qc.invalidateQueries({ queryKey: feedKeys.comments(postId) });
      qc.invalidateQueries({ queryKey: ['global-feed', 'list'] });
    },
  });
}

interface ToggleGlobalReactionInput {
  postId: string;
  emoji: string;
}

/** Toggles an emoji reaction on a global post. Invalidates the feed. */
export function useToggleGlobalReaction() {
  const qc = useQueryClient();
  return useMutation<void, Error, ToggleGlobalReactionInput>({
    mutationFn: async ({ postId, emoji }) => {
      const { error } = await supabase.rpc('toggle_global_reaction', {
        p_post: postId,
        p_emoji: emoji,
      });
      if (error) throw new Error(mapSpaceError(error));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['global-feed', 'list'] });
    },
  });
}
