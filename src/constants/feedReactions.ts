// Canonical reaction emoji set. MUST stay in sync with the DB table
// public.feed_reaction_emojis (same 64 glyphs, same order). Server validates
// reactions against that table; this list drives the picker UI.
export const FEED_REACTION_EMOJIS: string[] = [
  '👍','👎','🔥','💯','👏','🙌','🤝','🫡','👌','🤌',
  '💪','✊','✅','🎯','⚡','✨','⭐','🏆','🎉','🥳',
  '❤️','🩷','🧡','💛','💚','💙','💜','🖤','💔','🥰',
  '😍','😎','🤩','🤗','😂','🤣','😭','😅','🙂','😉',
  '😏','😜','🤪','😬','😮','😱','🤯','👀','🧐','🤔',
  '🤨','🫣','🙏','😢','😡','💀','🐂','🐻','📈','📉',
  '💰','💸','🚀','🍀',
];

export interface ReactionAggregate { emoji: string; count: number; }
