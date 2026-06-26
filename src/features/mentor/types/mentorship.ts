// src/types/mentorship.ts
// Shared TypeScript types for the Mentor Space feature.
// Shapes match the return types of the SECURITY DEFINER RPCs defined in the
// mentorship migration — never cast these against direct table reads.

export type SpaceRole = 'owner' | 'co_mentor' | 'moderator' | 'student';

export type ChannelType = 'announcement' | 'chat' | 'dm';

/** Row returned by list_my_spaces() */
export interface SpaceListItem {
  space_id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  role: SpaceRole;
  member_count: number;
  owner_id: string;
}

/** Row returned by get_space(p_space) — single row wrapped in array by Postgres */
export interface SpaceDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  owner_id: string;
  my_role: SpaceRole;
  member_count: number;
}

/** Row returned by list_space_channels(p_space) */
export interface SpaceChannel {
  id: string;
  space_id: string;
  name: string;
  type: ChannelType;
  position: number;
  dm_a: string | null;
  dm_b: string | null;
  created_at: string;
}

/** Row returned by list_space_members(p_space) */
export interface SpaceMember {
  member_id: string;
  user_id: string;
  display_name: string | null;
  email: string;
  role: SpaceRole;
  status: string;
  journal_shared: boolean;
  joined_at: string;
}

/** Row returned by list_space_messages(p_channel) */
export interface SpaceMessage {
  id: string;
  channel_id: string;
  author_id: string;
  author_name: string | null;
  body: string;
  attachments: unknown[];
  pinned: boolean;
  created_at: string;
}

/** Row returned by create_space_invite(p_space, p_email?, p_role?) */
export interface SpaceInvite {
  id: string;
  space_id: string;
  token: string;
  email: string | null;
  role: SpaceRole;
  expires_at: string;
  used_at: string | null;
}

// ── Shared Note types ─────────────────────────────────────────────────────────

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

// ── Analytics / Leaderboard types ─────────────────────────────────────────────

/** Period options for space analytics and leaderboard RPCs. */
export type RoomPeriod = 'this_month' | 'this_year' | 'all';

/** Row returned by space_leaderboard(p_space, p_period) */
export interface LeaderboardRow {
  user_id: string;
  display_name: string | null;
  net_pnl: number;
  win_rate: number;  // 0..1
  trade_count: number;
  rank: number;
}

/** Single row returned by space_analytics_summary(p_space, p_period) — take [0] */
export interface AnalyticsSummary {
  space_net_pnl: number;
  avg_win_rate: number;  // 0..1
  member_count: number;
  needs_attention: number;
}

/** Row returned by space_member_performance(p_space, p_period) */
export interface MemberPerformanceRow {
  user_id: string;
  display_name: string | null;
  net_pnl: number;
  win_rate: number;  // 0..1
  trade_count: number;
  needs_attention: boolean;
}
