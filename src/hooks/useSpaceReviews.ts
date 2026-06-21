// src/hooks/useSpaceReviews.ts
// React Query hooks for 1:1 Trade Review operations in a mentor space.
//
// All data access goes through SECURITY DEFINER Postgres RPCs that enforce
// per-caller visibility (members see only their own; managers see all):
//   - list_reviews(p_space, p_limit?)
//   - request_trade_review(p_space, p_trade)
//   - list_review_comments(p_review)
//   - add_review_comment(p_review, p_body)
//   - set_review_status(p_review, p_status)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

// ================================================
// INLINE TYPES
// ================================================

export type ReviewStatus = 'under_review' | 'reviewed' | 'closed';

export interface TradeReview {
  id: string;
  requester_id: string;
  requester_name: string;
  status: ReviewStatus;
  trade_id: string;
  trade_symbol: string;
  trade_side: string;
  trade_pnl: number;
  trade_r: number | null;
  trade_close_at: string;
  comment_count: number;
  created_at: string;
}

export interface ReviewComment {
  id: string;
  author_id: string;
  author_name: string;
  author_is_mentor: boolean;
  body: string;
  created_at: string;
}

/** Lightweight closed trade row returned directly from the trades table. */
export interface ClosedTrade {
  id: string;
  symbol: string;
  side: string;
  pnl: number | null;
  close_at: string;
  actual_r: number | null;
}

// ================================================
// QUERY KEYS
// ================================================

const keys = {
  reviews: (spaceId: string) => ['reviews', spaceId] as const,
  comments: (reviewId: string) => ['review-comments', reviewId] as const,
  myRecentTrades: ['myRecentClosedTrades'] as const,
};

// ================================================
// QUERIES
// ================================================

/** Lists all reviews in a space (visibility enforced server-side). */
export function useSpaceReviews(spaceId?: string): {
  reviews: TradeReview[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data = [], isLoading, isError, error, refetch } = useQuery<TradeReview[], Error>({
    queryKey: keys.reviews(spaceId ?? ''),
    enabled: !!spaceId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_reviews', {
        p_space: spaceId,
      });
      if (error) throw error;
      return (data ?? []) as TradeReview[];
    },
  });
  return { reviews: data, isLoading, isError, error, refetch };
}

/** Lists comments for a single review. */
export function useReviewComments(reviewId?: string): {
  comments: ReviewComment[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} {
  const { data = [], isLoading, isError, error } = useQuery<ReviewComment[], Error>({
    queryKey: keys.comments(reviewId ?? ''),
    enabled: !!reviewId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_review_comments', {
        p_review: reviewId,
      });
      if (error) throw error;
      return (data ?? []) as ReviewComment[];
    },
  });
  return { comments: data, isLoading, isError, error };
}

/** Fetches the current user's 25 most-recent closed trades for the request dialog. */
export function useMyRecentClosedTrades(): {
  trades: ClosedTrade[];
  isLoading: boolean;
  error: Error | null;
} {
  const { user } = useAuth();
  const userId = user?.id;

  const { data = [], isLoading, error } = useQuery<ClosedTrade[], Error>({
    queryKey: [...keys.myRecentTrades, userId],
    enabled: !!userId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('id,symbol,side,pnl,close_at,actual_r')
        .eq('user_id', userId as string)
        .not('close_at', 'is', null)
        .is('deleted_at', null)
        .order('close_at', { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as ClosedTrade[];
    },
  });
  return { trades: data, isLoading, error };
}

// ================================================
// MUTATIONS
// ================================================

interface RequestReviewInput {
  spaceId: string;
  tradeId: string;
}

/** Submits a trade for mentor review and returns the created review. */
export function useRequestReview() {
  const qc = useQueryClient();
  return useMutation<TradeReview, Error, RequestReviewInput>({
    mutationFn: async ({ spaceId, tradeId }) => {
      const { data, error } = await supabase.rpc('request_trade_review', {
        p_space: spaceId,
        p_trade: tradeId,
      });
      if (error) throw error;
      return data as TradeReview;
    },
    onSuccess: (_data, { spaceId }) => {
      qc.invalidateQueries({ queryKey: keys.reviews(spaceId) });
    },
  });
}

interface AddCommentInput {
  reviewId: string;
  spaceId: string;
  body: string;
}

/** Adds a comment to a review thread. */
export function useAddReviewComment() {
  const qc = useQueryClient();
  return useMutation<ReviewComment, Error, AddCommentInput>({
    mutationFn: async ({ reviewId, body }) => {
      const { data, error } = await supabase.rpc('add_review_comment', {
        p_review: reviewId,
        p_body: body,
      });
      if (error) throw error;
      return data as ReviewComment;
    },
    onSuccess: (_data, { reviewId, spaceId }) => {
      qc.invalidateQueries({ queryKey: keys.comments(reviewId) });
      qc.invalidateQueries({ queryKey: keys.reviews(spaceId) });
    },
  });
}

interface SetStatusInput {
  reviewId: string;
  spaceId: string;
  status: ReviewStatus;
}

/** Updates a review's status (manager only — enforced server-side). */
export function useSetReviewStatus() {
  const qc = useQueryClient();
  return useMutation<void, Error, SetStatusInput>({
    mutationFn: async ({ reviewId, status }) => {
      const { error } = await supabase.rpc('set_review_status', {
        p_review: reviewId,
        p_status: status,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { spaceId }) => {
      qc.invalidateQueries({ queryKey: keys.reviews(spaceId) });
    },
  });
}
