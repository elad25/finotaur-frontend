// src/components/floor/UserStatusBadges.tsx
// =====================================================
// Inline badge chips for verified traders and Floor champions.
// Renders nothing while loading or when neither badge applies.
// =====================================================

import { memo } from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUserBadges } from '@/hooks/useFloor';

interface UserStatusBadgesProps {
  userId?: string;
  className?: string;
}

export const UserStatusBadges = memo(function UserStatusBadges({
  userId,
  className,
}: UserStatusBadgesProps) {
  const { data: badges, isLoading } = useUserBadges(userId);

  if (isLoading || !badges) return null;
  if (!badges.is_verified && !badges.is_champion) return null;

  const championLabel =
    badges.champion_count > 1
      ? `Floor Champion · ${badges.last_win_label} · ×${badges.champion_count}`
      : `Floor Champion · ${badges.last_win_label ?? 'Previous Season'}`;

  return (
    <TooltipProvider delayDuration={200}>
      <span className={cn('inline-flex items-center gap-1', className)}>
        {badges.is_verified && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold leading-none"
                style={{
                  background: 'rgba(59,130,246,0.2)',
                  border: '1px solid rgba(59,130,246,0.5)',
                  color: '#60a5fa',
                }}
                aria-label="Verified Trader"
              >
                ✓
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-[#1a1a1a] border-[#333] text-white text-xs"
            >
              Verified Trader — broker-connected
            </TooltipContent>
          </Tooltip>
        )}

        {badges.is_champion && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold leading-none"
                style={{
                  background: 'rgba(232,199,102,0.15)',
                  border: '1px solid rgba(232,199,102,0.5)',
                  color: '#E8C766',
                }}
                aria-label="Floor Champion"
              >
                ★
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-[#1a1a1a] border-[#333] text-white text-xs"
            >
              {championLabel}
            </TooltipContent>
          </Tooltip>
        )}
      </span>
    </TooltipProvider>
  );
});

UserStatusBadges.displayName = 'UserStatusBadges';
