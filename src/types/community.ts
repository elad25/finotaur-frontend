// src/types/community.ts
// Shared TypeScript types for the Global Community feature.
// Shapes match the return types of the SECURITY DEFINER RPCs — never cast
// these against direct table reads.
//
// IMPORTANT: redacted trade fields (trade_pnl, trade_size, trade_entry,
// trade_exit) come back NULL from list_global_feed when hidden. The UI must
// treat NULL as "hidden", not "zero".

// ── Feed ─────────────────────────────────────────────────────────────────────

/** Row returned by list_global_feed(p_before, p_limit). */
export interface GlobalFeedItem {
  id: string;
  author_id: string;
  author_name: string;
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
  up_count: number;
  down_count: number;
  repost_count: number;
  /** The caller's current reaction, or null if none. */
  my_reaction: 'up' | 'down' | 'repost' | null;
  /** The trader's self-tagged emotion for the attached trade; NULL when not tagged. */
  trade_emotion: string | null;
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

/** Row returned by user_discipline_score(p_user, p_period). Sub-indices 0..100; emotional_rate 0..1. */
export interface UserDisciplineScore {
  discipline_score: number;
  risk_consistency: number;
  process_adherence: number;
  behavioral_stability: number;
  outcome_consistency: number;
  emotional_rate: number;
  trade_count: number;
}

// ── Shared Note ───────────────────────────────────────────────────────────────

/** Row returned by get_shared_note(p_review) and update_shared_note(p_review, p_goal, p_body). */
export interface SharedNote {
  id: string;
  review_id: string;
  goal: string;
  body: string;
  updated_by: string;
  updated_at: string;
  created_at: string;
}

/** Row returned by list_note_revisions(p_review, p_limit). */
export interface NoteRevision {
  id: string;
  body: string;
  goal: string;
  edited_by: string;
  editor_name: string;
  created_at: string;
}

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
}
