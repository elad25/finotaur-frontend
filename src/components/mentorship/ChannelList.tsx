// src/components/mentorship/ChannelList.tsx
// Left rail: grouped channel list (Announcements / Chat / Direct Messages).
// Active channel is highlighted with gold text + border per DS.

import { Hash, Megaphone, MessageCircle, UserPlus } from 'lucide-react';
import type { ChannelType, SpaceChannel, SpaceMember } from '@/types/mentorship';
import { Button } from '@/components/ds/Button';
import { cn } from '@/lib/utils';

// ── Helpers ──────────────────────────────────────────────────────────────────

const CHANNEL_GROUPS: { label: string; type: ChannelType }[] = [
  { label: 'Announcements', type: 'announcement' },
  { label: 'Chat', type: 'chat' },
  { label: 'Direct Messages', type: 'dm' },
];

/** For a DM channel, find the OTHER participant's name using the members roster. */
function dmLabel(
  channel: SpaceChannel,
  members: SpaceMember[],
  currentUserId: string,
): string {
  // The other participant's id is whichever of dm_a / dm_b is not ours.
  const otherId =
    channel.dm_a === currentUserId ? channel.dm_b : channel.dm_a;
  if (!otherId) return channel.name;
  const member = members.find((m) => m.user_id === otherId);
  return member?.display_name || member?.email || channel.name;
}

// ── Sub-components ───────────────────────────────────────────────────────────

const ICON_MAP: Record<ChannelType, React.ElementType> = {
  announcement: Megaphone,
  chat: Hash,
  dm: MessageCircle,
};

interface ChannelRowProps {
  label: string;
  type: ChannelType;
  isActive: boolean;
  onClick: () => void;
}

function ChannelRow({ label, type, isActive, onClick }: ChannelRowProps) {
  const Icon = ICON_MAP[type];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-ds-2 px-ds-3 py-[6px] rounded-[8px] text-left',
        'text-[13px] font-medium transition-colors duration-base ease-out',
        isActive
          ? 'bg-gold-border text-gold-primary'
          : 'text-ink-secondary hover:bg-surface-2 hover:text-ink-primary',
      )}
    >
      <Icon
        size={14}
        className={cn('shrink-0', isActive ? 'text-gold-primary' : 'text-ink-tertiary')}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </button>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface ChannelListProps {
  channels: SpaceChannel[];
  members: SpaceMember[];
  currentUserId: string;
  activeChannelId: string | null;
  onSelect: (id: string) => void;
  isManager: boolean;
  onInvite: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ChannelList({
  channels,
  members,
  currentUserId,
  activeChannelId,
  onSelect,
  isManager,
  onInvite,
}: ChannelListProps) {
  return (
    <nav aria-label="Space channels" className="flex flex-col gap-ds-5 py-ds-4">
      {/* Invite button — managers only */}
      {isManager && (
        <div className="px-ds-2">
          <Button
            variant="goldOutline"
            size="compact"
            showArrow={false}
            onClick={onInvite}
            className="w-full"
          >
            <UserPlus size={14} aria-hidden="true" />
            Invite people
          </Button>
        </div>
      )}

      {/* Grouped channel sections */}
      {CHANNEL_GROUPS.map(({ label, type }) => {
        const group = channels.filter((c) => c.type === type);
        if (group.length === 0) return null;

        return (
          <section key={type} aria-labelledby={`group-${type}`}>
            <p
              id={`group-${type}`}
              className="px-ds-3 mb-ds-1 text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted"
            >
              {label}
            </p>
            <ul className="flex flex-col gap-[2px]">
              {group.map((ch) => {
                const displayLabel =
                  ch.type === 'dm'
                    ? dmLabel(ch, members, currentUserId)
                    : ch.name;

                return (
                  <li key={ch.id}>
                    <ChannelRow
                      label={displayLabel}
                      type={ch.type}
                      isActive={ch.id === activeChannelId}
                      onClick={() => onSelect(ch.id)}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </nav>
  );
}
