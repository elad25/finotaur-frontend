// src/features/shared/utils/spaceError.ts
// Shared error-mapping utility for Postgres/Supabase RPC errors originating
// from mentor-space operations (create_global_post, share_trade, etc.).
// Lives in shared/ so both floor hooks (useGlobalFeed, useShareTrade) and
// mentor hooks can import it without creating a cross-feature cycle.

/** Maps a Postgres/Supabase RPC error to a user-facing English message. */
export function mapSpaceError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (message.includes('not_premium'))
    return 'A Trader (FINOTAUR) plan is required to create a Room.';
  if (message.includes('requires_paid_plan'))
    return 'Community publishing requires a paid plan. Upgrade to share trades and post.';
  if (message.includes('slug_taken')) return 'That space URL is already taken.';
  if (message.includes('access_denied')) return 'You do not have access to do that.';
  if (message.includes('invite_not_found')) return 'Invite not found.';
  if (message.includes('invite_used')) return 'This invite has already been used.';
  if (message.includes('invite_expired')) return 'This invite has expired.';
  if (message.includes('not_authorized_announcement'))
    return 'Only the room owner can post in announcement channels.';
  if (message.includes('invalid_channel_type')) return 'Invalid channel type.';
  if (message.includes('empty_channel_name')) return "Channel name can't be empty.";
  if (message.includes('cannot_delete_dm'))
    return "Direct message channels can't be deleted here.";
  if (message.includes('cannot_delete_last_channel'))
    return 'A room must keep at least one channel.';
  if (message.includes('cannot_modify_dm'))
    return "Direct message channels can't be renamed.";
  if (message.includes('channel_not_found')) return 'Channel not found.';
  if (message.includes('cannot_remove_owner')) return "You can't remove the space owner.";
  if (message.includes('cannot_delete_space')) return 'Only the room owner can delete this room.';
  if (message.includes('cannot_leave_as_owner')) return 'Owners cannot leave — delete the room instead.';
  if (message.includes('empty_message')) return 'Message cannot be empty.';
  if (message.includes('not_connected')) return "You're not connected to this member.";
  if (message.includes('invalid_role')) return 'Invalid role specified.';
  if (message.includes('trade_not_broker_verified'))
    return 'Only broker-verified trades can be shared to the Global Feed. Connect a broker to share real fills.';
  return 'Something went wrong. Please try again.';
}
