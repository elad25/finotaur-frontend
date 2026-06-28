// src/components/feed/ReactionBar.tsx
// Shared reaction bar used by both the Rooms feed (RoomFeed) and the Global feed
// (SharedTradeCard). Renders existing reaction chips + an emoji picker trigger.
//
// Props are purely presentational — no data fetching.

import { useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { FEED_REACTION_EMOJIS, type ReactionAggregate } from '@/constants/feedReactions';

export interface ReactionBarProps {
  reactions: ReactionAggregate[];
  myReaction: string | null;
  onReact: (emoji: string) => void;
  disabled?: boolean;
}

export function ReactionBar({ reactions, myReaction, onReact, disabled = false }: ReactionBarProps) {
  const [open, setOpen] = useState(false);

  function handleChipClick(emoji: string) {
    if (disabled) return;
    onReact(emoji);
  }

  function handlePickerEmoji(emoji: string) {
    if (disabled) return;
    onReact(emoji);
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-[6px] flex-wrap">
      {/* Existing reaction chips */}
      {reactions.map(({ emoji, count }) => {
        const isActive = emoji === myReaction;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => handleChipClick(emoji)}
            disabled={disabled}
            aria-label={`React with ${emoji}`}
            aria-pressed={isActive}
            className={cn(
              'flex items-center gap-[3px] px-[8px] py-[4px] rounded-[6px]',
              'font-sans text-[12px]',
              'border-[0.5px] transition-colors duration-base ease-out',
              'disabled:opacity-50 disabled:pointer-events-none',
              isActive
                ? 'bg-[rgba(201,166,70,0.12)] border-gold-border text-ink-primary'
                : 'bg-surface-2 border-border-ds-subtle text-ink-secondary hover:border-border-ds-default',
            )}
          >
            <span>{emoji}</span>
            {count > 0 && (
              <span className="tabular-nums text-ink-tertiary">{count}</span>
            )}
          </button>
        );
      })}

      {/* Add-reaction trigger */}
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Add reaction"
            className={cn(
              'flex items-center justify-center',
              'h-[26px] w-[26px] rounded-[6px]',
              'border-[0.5px] border-border-ds-subtle bg-surface-2',
              'text-ink-tertiary hover:text-ink-secondary hover:border-border-ds-default',
              'transition-colors duration-base ease-out',
              'disabled:opacity-50 disabled:pointer-events-none',
            )}
          >
            <SmilePlus size={13} aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className={cn(
            'w-auto p-ds-3',
            'rounded-[10px] border-[0.5px] border-border-ds-subtle bg-surface-glass backdrop-blur-glass',
            'shadow-lg',
          )}
        >
          <div
            className="grid grid-cols-8 gap-[4px] max-h-[240px] overflow-y-auto"
            style={{ scrollbarWidth: 'thin' }}
          >
            {FEED_REACTION_EMOJIS.map((emoji) => {
              const isActive = emoji === myReaction;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handlePickerEmoji(emoji)}
                  aria-label={`React with ${emoji}`}
                  aria-pressed={isActive}
                  className={cn(
                    'flex items-center justify-center',
                    'h-[30px] w-[30px] rounded-[6px] text-[16px]',
                    'transition-colors duration-base ease-out',
                    isActive
                      ? 'bg-[rgba(201,166,70,0.18)] border-[0.5px] border-gold-border'
                      : 'hover:bg-surface-2',
                  )}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
