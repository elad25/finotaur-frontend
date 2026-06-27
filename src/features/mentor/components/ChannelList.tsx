// src/components/mentorship/ChannelList.tsx
// Left rail: grouped channel list (Announcements / Chat / Direct Messages).
// Active channel is highlighted with gold text + border per DS.
//
// Owner-only controls (when isManager=true):
//   - "+ Add channel" button opens AddChannelDialog
//   - Per-channel hover controls: rename (inline editor), delete (inline confirm),
//     reorder (up/down arrows within the same non-DM group)

import { useState } from 'react';
import { Hash, Megaphone, MessageCircle, UserPlus, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Check, X } from 'lucide-react';
import type { ChannelType, SpaceChannel, SpaceMember } from '@/features/mentor/types/mentorship';
import { Button } from '@/components/ds/Button';
import {
  useRenameChannel,
  useDeleteChannel,
  useReorderChannels,
  mapSpaceError,
} from '@/features/mentor/hooks/useMentorshipSpaces';
import { toast } from '@/hooks/use-toast';
import { AddChannelDialog } from '@/features/mentor/components/AddChannelDialog';
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

// ── Owner-controlled channel row ─────────────────────────────────────────────

interface OwnerChannelRowProps {
  channel: SpaceChannel;
  label: string;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  spaceId: string;
  /** All non-DM channels in this channel's group, in current display order. */
  groupChannels: SpaceChannel[];
  onClick: () => void;
}

function OwnerChannelRow({
  channel,
  label,
  isActive,
  isFirst,
  isLast,
  spaceId,
  groupChannels,
  onClick,
}: OwnerChannelRowProps) {
  const Icon = ICON_MAP[channel.type];

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hovered, setHovered] = useState(false);

  const { mutateAsync: renameChannel, isPending: isRenamePending } = useRenameChannel();
  const { mutateAsync: deleteChannel, isPending: deleting } = useDeleteChannel();
  const { mutateAsync: reorderChannels, isPending: reordering } = useReorderChannels();

  function startRename(e: React.MouseEvent) {
    e.stopPropagation();
    setRenameValue(label);
    setRenaming(true);
    setConfirmDelete(false);
  }

  async function commitRename(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === label) {
      setRenaming(false);
      return;
    }
    try {
      await renameChannel({ spaceId, channelId: channel.id, name: trimmed });
      toast({ title: 'Channel renamed', description: `Renamed to #${trimmed}.` });
    } catch (err) {
      toast({ title: 'Rename failed', description: mapSpaceError(err), variant: 'destructive' });
    } finally {
      setRenaming(false);
    }
  }

  function cancelRename(e: React.MouseEvent) {
    e.stopPropagation();
    setRenaming(false);
  }

  function handleRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { setRenaming(false); }
  }

  function startDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(true);
    setRenaming(false);
  }

  async function commitDelete(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await deleteChannel({ spaceId, channelId: channel.id });
      toast({ title: 'Channel deleted' });
    } catch (err) {
      toast({ title: 'Delete failed', description: mapSpaceError(err), variant: 'destructive' });
    } finally {
      setConfirmDelete(false);
    }
  }

  function cancelDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(false);
  }

  async function moveChannel(direction: 'up' | 'down', e: React.MouseEvent) {
    e.stopPropagation();
    const idx = groupChannels.findIndex((c) => c.id === channel.id);
    if (idx === -1) return;
    const newOrder = [...groupChannels];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    try {
      await reorderChannels({ spaceId, channelIds: newOrder.map((c) => c.id) });
    } catch (err) {
      toast({ title: 'Reorder failed', description: mapSpaceError(err), variant: 'destructive' });
    }
  }

  // ── Inline delete confirm ─────────────────────────────────────────────────

  if (confirmDelete) {
    return (
      <div
        className={cn(
          'w-full flex flex-col gap-[4px] px-ds-3 py-[6px] rounded-[8px]',
          'bg-surface-2 border border-border-ds-subtle',
        )}
      >
        <p className="text-[12px] text-ink-secondary">Delete #{label}?</p>
        <div className="flex items-center gap-ds-2">
          <button
            type="button"
            onClick={commitDelete}
            disabled={deleting}
            className="text-[11px] font-medium text-num-negative hover:text-num-negative/80 transition-colors duration-base"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <button
            type="button"
            onClick={cancelDelete}
            className="text-[11px] text-ink-tertiary hover:text-ink-secondary transition-colors duration-base"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Inline rename editor ──────────────────────────────────────────────────

  if (renaming) {
    return (
      <form
        onSubmit={commitRename}
        className="w-full flex items-center gap-ds-1 px-ds-3 py-[5px] rounded-[8px] bg-surface-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Icon size={14} className="shrink-0 text-ink-tertiary" aria-hidden="true" />
        <input
          autoFocus
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          maxLength={40}
          disabled={isRenamePending}
          className={cn(
            'flex-1 min-w-0 bg-transparent text-[13px] text-ink-primary outline-none',
            'border-b border-gold-primary/50 focus:border-gold-primary',
          )}
        />
        <button
          type="submit"
          disabled={isRenamePending}
          className="p-[2px] text-gold-primary hover:text-gold-hover transition-colors duration-base"
          aria-label="Save name"
        >
          <Check size={12} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={cancelRename}
          className="p-[2px] text-ink-tertiary hover:text-ink-secondary transition-colors duration-base"
          aria-label="Cancel rename"
        >
          <X size={12} aria-hidden="true" />
        </button>
      </form>
    );
  }

  // ── Normal row with owner hover controls ──────────────────────────────────

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'group w-full flex items-center gap-ds-2 px-ds-3 py-[6px] rounded-[8px] text-left',
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
      <span className="flex-1 truncate">{label}</span>

      {/* Owner controls — visible on hover */}
      {hovered && (
        <span
          className="flex items-center gap-[2px] shrink-0"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.preventDefault()} /* prevent focus loss */
        >
          <span
            role="button"
            tabIndex={0}
            aria-label="Move channel up"
            onClick={(e) => moveChannel('up', e)}
            onKeyDown={(e) => e.key === 'Enter' && moveChannel('up', e as unknown as React.MouseEvent)}
            className={cn(
              'p-[3px] rounded-[4px] transition-colors duration-base',
              isFirst || reordering
                ? 'text-ink-muted cursor-not-allowed opacity-40'
                : 'text-ink-tertiary hover:text-ink-primary hover:bg-surface-3',
            )}
          >
            <ChevronUp size={11} aria-hidden="true" />
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label="Move channel down"
            onClick={(e) => moveChannel('down', e)}
            onKeyDown={(e) => e.key === 'Enter' && moveChannel('down', e as unknown as React.MouseEvent)}
            className={cn(
              'p-[3px] rounded-[4px] transition-colors duration-base',
              isLast || reordering
                ? 'text-ink-muted cursor-not-allowed opacity-40'
                : 'text-ink-tertiary hover:text-ink-primary hover:bg-surface-3',
            )}
          >
            <ChevronDown size={11} aria-hidden="true" />
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label="Rename channel"
            onClick={startRename}
            onKeyDown={(e) => e.key === 'Enter' && startRename(e as unknown as React.MouseEvent)}
            className="p-[3px] rounded-[4px] text-ink-tertiary hover:text-ink-primary hover:bg-surface-3 transition-colors duration-base"
          >
            <Pencil size={11} aria-hidden="true" />
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label="Delete channel"
            onClick={startDelete}
            onKeyDown={(e) => e.key === 'Enter' && startDelete(e as unknown as React.MouseEvent)}
            className="p-[3px] rounded-[4px] text-ink-tertiary hover:text-num-negative hover:bg-surface-3 transition-colors duration-base"
          >
            <Trash2 size={11} aria-hidden="true" />
          </span>
        </span>
      )}
    </button>
  );
}

// ── Read-only channel row (non-owners) ────────────────────────────────────────

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
  spaceId: string;
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
  spaceId,
  channels,
  members,
  currentUserId,
  activeChannelId,
  onSelect,
  isManager,
  onInvite,
}: ChannelListProps) {
  const [addChannelOpen, setAddChannelOpen] = useState(false);

  return (
    <>
      <nav aria-label="Room channels" className="flex flex-col gap-ds-5 py-ds-4">
        {/* Invite button — owner only */}
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
          const group = channels
            .filter((c) => c.type === type)
            .sort((a, b) => a.position - b.position);

          if (group.length === 0 && type === 'dm') return null;
          // Still render Announcements/Chat sections for owners (to show "+ Add channel")
          if (group.length === 0 && !isManager) return null;

          return (
            <section key={type} aria-labelledby={`group-${type}`}>
              <div className="flex items-center justify-between px-ds-3 mb-ds-1">
                <p
                  id={`group-${type}`}
                  className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted"
                >
                  {label}
                </p>
                {/* "+ Add channel" affordance for owners — shown next to Chat / Announcement headers */}
                {isManager && type !== 'dm' && (
                  <button
                    type="button"
                    onClick={() => setAddChannelOpen(true)}
                    aria-label={`Add ${label.toLowerCase()} channel`}
                    className="p-[3px] rounded-[4px] text-ink-tertiary hover:text-gold-primary hover:bg-surface-2 transition-colors duration-base"
                  >
                    <Plus size={12} aria-hidden="true" />
                  </button>
                )}
              </div>

              <ul className="flex flex-col gap-[2px]">
                {group.map((ch, idx) => {
                  const displayLabel =
                    ch.type === 'dm'
                      ? dmLabel(ch, members, currentUserId)
                      : ch.name;

                  return (
                    <li key={ch.id}>
                      {isManager && ch.type !== 'dm' ? (
                        <OwnerChannelRow
                          channel={ch}
                          label={displayLabel}
                          isActive={ch.id === activeChannelId}
                          isFirst={idx === 0}
                          isLast={idx === group.length - 1}
                          spaceId={spaceId}
                          groupChannels={group}
                          onClick={() => onSelect(ch.id)}
                        />
                      ) : (
                        <ChannelRow
                          label={displayLabel}
                          type={ch.type}
                          isActive={ch.id === activeChannelId}
                          onClick={() => onSelect(ch.id)}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </nav>

      {/* AddChannelDialog — mounted outside nav to avoid nesting issues */}
      {isManager && (
        <AddChannelDialog
          spaceId={spaceId}
          open={addChannelOpen}
          onClose={() => setAddChannelOpen(false)}
        />
      )}
    </>
  );
}
