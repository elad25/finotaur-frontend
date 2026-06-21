// src/components/mentorship/SpaceCard.tsx
// Mentor-space card shown in the Spaces list grid.
// Props: { space: SpaceListItem; onClick: () => void }
//
// Layout: avatar (or gold monogram) | name + role pill | member count | description (2-line clamp).
// Hover: gold border via DS Card `featured` variant on hover, cursor-pointer.

import type { SpaceListItem, SpaceRole } from '@/types/mentorship';
import { Card } from '@/components/ds/Card';
import { cn } from '@/lib/utils';

// ── Role badge labels ──────────────────────────────────────────────────────────

const ROLE_LABELS: Record<SpaceRole, string> = {
  owner: 'Owner',
  co_mentor: 'Co-mentor',
  moderator: 'Moderator',
  student: 'Student',
};

// ── Monogram avatar ────────────────────────────────────────────────────────────

function MonogramAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center shrink-0',
        'h-10 w-10 rounded-full',
        'bg-gradient-gold',
        'text-ink-on-gold text-sm font-semibold',
      )}
    >
      {initial}
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface SpaceCardProps {
  space: SpaceListItem;
  onClick: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function SpaceCard({ space, onClick }: SpaceCardProps) {
  const { name, avatar_url, role, member_count, description } = space;

  return (
    <Card
      variant="default"
      padding="default"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'cursor-pointer',
        // Hover: upgrade border to gold-border per DS Card featured behaviour.
        'hover:border-gold-border',
        'transition-colors duration-base ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base',
      )}
    >
      {/* ── Header row ── */}
      <div className="flex items-start gap-ds-3">
        {/* Avatar */}
        {avatar_url ? (
          <img
            src={avatar_url}
            alt={name}
            className="h-10 w-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <MonogramAvatar name={name} />
        )}

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-ink-primary leading-snug truncate">
            {name}
          </p>
          <span
            className={cn(
              'inline-block mt-ds-1',
              'px-ds-2 py-[2px]',
              'rounded-[4px]',       // --radius-sm
              'text-[11px] font-medium tracking-[0.5px] uppercase',
              'bg-surface-2 text-ink-secondary border-[0.5px] border-border-ds-subtle',
            )}
          >
            {ROLE_LABELS[role]}
          </span>
        </div>
      </div>

      {/* ── Member count ── */}
      <p className="mt-ds-3 text-[13px] text-ink-tertiary">
        {member_count} {member_count === 1 ? 'member' : 'members'}
      </p>

      {/* ── Description ── */}
      {description && (
        <p
          className={cn(
            'mt-ds-2',
            'text-[13px] text-ink-secondary leading-[1.5]',
            'line-clamp-2',
          )}
        >
          {description}
        </p>
      )}
    </Card>
  );
}
