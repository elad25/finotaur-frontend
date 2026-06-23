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
                className="inline-flex h-4 w-4 items-center justify-center leading-none"
                aria-label="Verified Trader"
              >
                {/* X-style verified seal: blue scalloped badge + white check */}
                <svg viewBox="0 0 24 24" width="16" height="16" role="img" aria-hidden="true" style={{ display: 'block' }}>
                  <path
                    fill="#1d9bf0"
                    d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.68.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.51-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.66 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
                  />
                  <path
                    d="M8 12.2l2.8 2.8 5.2-5.6"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
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
