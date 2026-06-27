// src/components/mentorship/SpaceCard.tsx
// Mentor-space card shown in the Spaces list grid.
// Props: { space, onClick, onDelete?, onLeave? }
//
// Layout: avatar (or gold monogram) | name + role pill | member count | description.
// Hover: gold border via DS Card `featured` variant on hover, cursor-pointer.
// 3-dot menu: owner → Delete Room; non-owner → Leave Room. Inline confirm footer.
// Owner affordances: "Add a description" dashed button (empty) or pencil edit link (filled).

import { useState } from 'react';
import { MoreHorizontal, Pencil } from 'lucide-react';
import type { SpaceListItem, SpaceRole } from '@/features/mentor/types/mentorship';
import { Card } from '@/components/ds/Card';
import { cn } from '@/lib/utils';
import { EditSpaceDescriptionDialog } from '@/features/mentor/components/EditSpaceDescriptionDialog';

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
  onDelete?: () => void;   // called after user confirms delete (owner only)
  onLeave?: () => void;    // called after user confirms leave (non-owner)
}

// ── Component ──────────────────────────────────────────────────────────────────

export function SpaceCard({ space, onClick, onDelete, onLeave }: SpaceCardProps) {
  const { space_id, name, avatar_url, role, member_count, description } = space;
  const [confirmAction, setConfirmAction] = useState<'delete' | 'leave' | null>(null);
  const [editDescOpen, setEditDescOpen] = useState(false);

  const isOwner = role === 'owner';

  const hasMenu = !!(onDelete || onLeave);

  function handleMenuClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (role === 'owner' && onDelete) {
      setConfirmAction('delete');
    } else if (role !== 'owner' && onLeave) {
      setConfirmAction('leave');
    }
  }

  function handleCancel(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmAction(null);
  }

  function handleConfirm(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmAction === 'delete') {
      onDelete?.();
    } else if (confirmAction === 'leave') {
      onLeave?.();
    }
    setConfirmAction(null);
  }

  return (
    <Card
      variant="default"
      padding="default"
      onClick={confirmAction ? undefined : onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (confirmAction) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'cursor-pointer',
        // Taller card (~3x) — content stays anchored to the top, extra height grows downward.
        'min-h-[420px] flex flex-col',
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

        {/* 3-dot menu button */}
        {hasMenu && !confirmAction && (
          <button
            type="button"
            aria-label="Room options"
            onClick={handleMenuClick}
            className={cn(
              'p-1 rounded-[4px] shrink-0',
              'text-ink-muted hover:text-ink-primary hover:bg-surface-2',
              'transition-colors duration-base',
            )}
          >
            <MoreHorizontal size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* ── Member count ── */}
      {!confirmAction && (
        <p className="mt-ds-3 text-[13px] text-ink-tertiary">
          {member_count} {member_count === 1 ? 'member' : 'members'}
        </p>
      )}

      {/* ── Description (or owner add-description affordance) ── */}
      {!confirmAction && (
        <>
          {description ? (
            /* Description is set: show text + owner pencil edit */
            <div className="mt-ds-2 flex flex-col gap-ds-2">
              <p className="text-[13px] text-ink-secondary leading-[1.5] line-clamp-6">
                {description}
              </p>
              {isOwner && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setEditDescOpen(true); }}
                  className={cn(
                    'self-start flex items-center gap-[5px]',
                    'text-[12px] text-ink-muted hover:text-ink-secondary',
                    'transition-colors duration-base',
                  )}
                  aria-label="Edit description"
                >
                  <Pencil size={11} strokeWidth={1.5} aria-hidden="true" />
                  Edit
                </button>
              )}
            </div>
          ) : isOwner ? (
            /* No description + owner: dashed "Add a description" affordance */
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditDescOpen(true); }}
              className={cn(
                'mt-ds-3 w-full flex-1',
                'flex items-center justify-center',
                'rounded-[8px] px-ds-4 py-ds-5',
                'border border-dashed border-border-ds-subtle',
                'text-[13px] text-ink-muted hover:text-ink-secondary hover:border-border-ds-default',
                'transition-colors duration-base',
              )}
              aria-label="Add a room description"
            >
              Add a description — tell members what to expect
            </button>
          ) : null /* Non-owner, no description: nothing shown */}
        </>
      )}

      {/* ── Confirm footer ── */}
      {confirmAction && (
        <div
          className="mt-ds-3 border-t border-border-ds-subtle pt-ds-3"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[13px] text-ink-secondary leading-[1.5]">
            {confirmAction === 'delete'
              ? 'This will permanently delete the room and all its content.'
              : 'Are you sure you want to leave this room?'}
          </p>
          <div className="flex items-center gap-ds-4 mt-ds-3">
            <button
              type="button"
              onClick={handleConfirm}
              className="text-[13px] text-num-negative hover:text-red-400 transition-colors duration-base"
            >
              {confirmAction === 'delete' ? 'Delete' : 'Leave'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="text-[13px] text-ink-tertiary hover:text-ink-secondary transition-colors duration-base"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* ── Edit description dialog (owner only, rendered outside click-bubble) ── */}
      {isOwner && (
        <EditSpaceDescriptionDialog
          spaceId={space_id}
          initialDescription={description ?? null}
          open={editDescOpen}
          onClose={() => setEditDescOpen(false)}
        />
      )}
    </Card>
  );
}
