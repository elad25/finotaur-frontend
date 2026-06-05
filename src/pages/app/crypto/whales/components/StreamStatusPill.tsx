// src/pages/app/crypto/whales/components/StreamStatusPill.tsx
// Small status pill indicating SSE connection health.

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { WhaleStreamStatus } from '@/hooks/crypto/useWhaleStream';

interface StreamStatusPillProps {
  status: WhaleStreamStatus;
}

const CONFIG: Record<WhaleStreamStatus, { label: string; cls: string; dot?: string }> = {
  live:         { label: 'Live',          cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400', dot: 'bg-emerald-400 animate-pulse' },
  connecting:   { label: 'Connecting…',   cls: 'bg-amber-500/15 border-amber-500/30 text-amber-400',     dot: 'bg-amber-400 animate-pulse' },
  reconnecting: { label: 'Reconnecting…', cls: 'bg-amber-500/15 border-amber-500/30 text-amber-400',     dot: 'bg-amber-400 animate-pulse' },
  paused:       { label: 'Paused',        cls: 'bg-white/[0.06] border-white/[0.1] text-white/40' },
  error:        { label: 'Offline',       cls: 'bg-red-500/15 border-red-500/30 text-red-400',           dot: 'bg-red-400' },
};

export const StreamStatusPill = memo(function StreamStatusPill({ status }: StreamStatusPillProps) {
  const { label, cls, dot } = CONFIG[status];
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border',
      cls,
    )}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />}
      {label}
    </span>
  );
});
