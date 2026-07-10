// src/features/floor/components/FloorChannelBar.tsx
// Horizontal, visual, scrollable channel switcher for The Floor community feed
// (Reddit/Discord-style). Rendered at the top of the feed, under the page
// heading. "Global" is the merged r/all view (no filter); each other pill is a
// strategy-category channel.

import { cn } from '@/lib/utils';
import { FLOOR_CHANNELS, GLOBAL_CHANNEL } from '@/features/floor/lib/floorChannels';
import type { FeedFacet } from '@/features/floor/types/community';

export interface FloorChannelBarProps {
  facets: FeedFacet[];
  activeChannel: string | null;
  onSelect: (key: string | null) => void;
}

export function FloorChannelBar({ facets, activeChannel, onSelect }: FloorChannelBarProps) {
  const strategyFacets = facets.filter((f) => f.facet === 'strategy_category');
  const totalCount = strategyFacets.reduce((sum, f) => sum + f.count, 0);

  return (
    <div
      role="tablist"
      aria-label="Floor channels"
      className="flex items-center gap-[6px] overflow-x-auto flex-nowrap pb-[2px]"
    >
      {/* Global pill */}
      <ChannelPill
        Icon={GLOBAL_CHANNEL.Icon}
        label={GLOBAL_CHANNEL.label}
        count={totalCount}
        active={activeChannel === null}
        onClick={() => onSelect(null)}
      />

      {/* One pill per strategy channel */}
      {FLOOR_CHANNELS.map((channel) => {
        const count = strategyFacets.find((f) => f.value === channel.key)?.count ?? 0;
        return (
          <ChannelPill
            key={channel.key}
            Icon={channel.Icon}
            label={channel.label}
            count={count}
            active={activeChannel === channel.key}
            onClick={() => onSelect(channel.key)}
          />
        );
      })}
    </div>
  );
}

// ── Pill ─────────────────────────────────────────────────────────────────────

interface ChannelPillProps {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function ChannelPill({ Icon, label, count, active, onClick }: ChannelPillProps) {
  return (
    <button
      type="button"
      role="tab"
      onClick={onClick}
      aria-pressed={active}
      aria-selected={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-[6px] rounded-full px-[12px] py-[6px]',
        'font-sans text-[12px] font-medium whitespace-nowrap',
        'border-[0.5px] transition-colors duration-base ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50',
        active
          ? 'bg-gradient-gold border-transparent text-surface-base'
          : 'bg-surface-2 border-border-ds-subtle text-ink-secondary hover:border-border-ds-default hover:text-ink-primary',
      )}
    >
      <Icon className="h-[13px] w-[13px]" />
      <span>{label}</span>
      <span
        className={cn(
          'tabular-nums font-mono text-[11px]',
          active ? 'text-surface-base/70' : 'text-ink-tertiary',
        )}
      >
        {count}
      </span>
    </button>
  );
}
