// src/types/community.ts
// Shared TypeScript types for the Global Community feature.
// Shapes match the return types of the SECURITY DEFINER RPCs — never cast
// these against direct table reads.
//
// IMPORTANT: redacted trade fields (trade_pnl, trade_size, trade_entry,
// trade_exit) come back NULL from list_global_feed when hidden. The UI must
// treat NULL as "hidden", not "zero".

import type { ReactionAggregate } from '@/constants/feedReactions';

// ── Feed ─────────────────────────────────────────────────────────────────────

/** Row returned by list_global_feed(p_before, p_limit). */
export interface GlobalFeedItem {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
  body: string;
  attached_trade_id: string | null;
  trade_symbol: string | null;
  trade_side: string | null;
  /** NULL when hide_pnl is true — treat as "hidden", not zero. */
  trade_pnl: number | null;
  /** NULL when reveal_size is false — treat as "hidden", not zero. */
  trade_size: number | null;
  trade_setup: string | null;
  /** NULL when show_setup_only is true — treat as "hidden", not zero. */
  trade_entry: number | null;
  /** NULL when show_setup_only is true — treat as "hidden", not zero. */
  trade_exit: number | null;
  trade_open_at: string | null;
  trade_close_at: string | null;
  hide_pnl: boolean;
  show_setup_only: boolean;
  reveal_size: boolean;
  pinned: boolean;
  created_at: string;
  comment_count: number;
  reaction_count: number;
  reactions: ReactionAggregate[];
  /** The caller's current reaction emoji, or null if none. */
  my_reaction: string | null;
  /** The trader's self-tagged emotion for the attached trade; NULL when not tagged. */
  trade_emotion: string | null;
  /** Strategy name linked to the attached trade; NULL when no strategy. */
  trade_strategy_name: string | null;
  /** Strategy category (ICT / Price Action / …); NULL when uncategorised. */
  trade_strategy_category: string | null;
  /** R multiple of the attached trade; NULL when hidden or unavailable. */
  trade_r: number | null;
  /** Author's membership tier (platform_plan): free | core | finotaur | enterprise. */
  author_tier: string | null;
  /** Author's consistency tier from WR + Profit Factor; NULL below sample threshold. */
  author_consistency_tier: ConsistencyTier | null;
  /** Author's all-time win rate (0..1); NULL when no closed trades. */
  author_win_rate: number | null;
  /** Author's all-time profit factor (gross win / gross loss); NULL when no losses or no trades. */
  author_profit_factor: number | null;
  /** false = render the no-chart branded business card instead of the chart. */
  show_chart: boolean;
}

// ── Feed filters & tags ────────────────────────────────────────────────────────

/** Consistency reputation tier, derived server-side from win rate + profit factor. */
export type ConsistencyTier = 'rising' | 'pro' | 'elite';

/** Active filter selection for the feed (each null = no filter on that dimension). */
export interface FeedFilters {
  symbol?: string | null;
  strategyCategory?: string | null;
  outcome?: 'win' | 'loss' | null;
  tier?: string | null;
}

/** Facet dimension keys returned by feed_tag_facets(). */
export type FeedFacetKind = 'symbol' | 'strategy_category' | 'outcome' | 'tier';

/** Row returned by feed_tag_facets() — one tag value + its post count. */
export interface FeedFacet {
  facet: FeedFacetKind;
  value: string;
  label: string;
  count: number;
}

/** Row returned by community_consistency_leaderboard(p_period, p_limit). */
export interface ConsistencyLeaderboardRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  win_rate: number | null; // 0..1
  profit_factor: number | null;
  consistency_score: number | null;
  tier: ConsistencyTier | null;
  trade_count: number;
  rank: number;
}

/** Row returned by list_global_comments(p_post, p_limit). */
export interface GlobalComment {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

/** Period options accepted by global_leaderboard and global_discipline_leaderboard. */
export type GlobalPeriod = 'all' | 'this_month' | 'this_year';

/** Metric tabs accepted by global_leaderboard. */
export type GlobalLeaderboardMetric = 'net_pnl' | 'win_rate' | 'trade_count';

/** Row returned by global_leaderboard(p_period, p_metric). */
export interface GlobalLeaderboardRow {
  user_id: string;
  display_name: string;
  net_pnl: number;
  win_rate: number; // 0..1
  trade_count: number;
  rank: number;
}

/** Row returned by global_discipline_leaderboard(p_period). */
export interface DisciplineLeaderboardRow {
  user_id: string;
  display_name: string;
  discipline_score: number;
  emotional_rate: number; // 0..1
  trade_count: number;
  rank: number;
}

// UserDisciplineScore moved to @/features/shared/types/discipline — re-exported
// here for backward compat with floor-internal callers (SharedTradeCard, etc.).
export type { UserDisciplineScore } from '@/features/shared/types/discipline';

// SharedNote / NoteRevision relocated to @/features/mentor/types/mentorship
// (they are mentor-owned types; having them here created a mentor->floor cycle).

// ── Trade Sharing ─────────────────────────────────────────────────────────────

/**
 * Destination for share_trade(). Maps to elements of p_destinations jsonb array.
 * - { scope: 'global' }            — share to the global community feed
 * - { scope: 'community', room_id} — share to a mentor space community tab
 * - { scope: 'mentor', room_id, target_mentor_id } — share to a specific mentor's review queue
 */
export type ShareDestination =
  | { scope: 'global' }
  | { scope: 'community'; room_id: string }
  | { scope: 'mentor'; room_id: string; target_mentor_id: string };

/** Privacy controls passed to share_trade() and create_global_post(). */
export interface SharePrivacy {
  hidePnl: boolean;
  showSetupOnly: boolean;
  revealSize: boolean;
  /** Optional caption; only used when sharing (not when creating standalone posts). */
  caption?: string;
  /** Strategy category — REQUIRED when sharing to the global feed (server-enforced). */
  strategyCategory?: string | null;
  /** false = share without the chart, as a branded business card. */
  showChart?: boolean;
}
