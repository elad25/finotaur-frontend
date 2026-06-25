// src/components/mentorship/MemberList.tsx
// Right panel: member roster.
//
// Manager view: each non-owner / non-self row has "Message" + "View journal"
//   + a "Remove" secondary action.
// Student view: shows a "Share my journal" toggle at the top.

import { useState } from 'react';
import { BookOpen, MessageCircle, Trash2 } from 'lucide-react';
import type { SpaceMember, SpaceRole } from '@/features/mentor/types/mentorship';
import { useRemoveMember, useSetJournalSharing, mapSpaceError } from '@/features/mentor/hooks/useMentorshipSpaces';
import { Button } from '@/components/ds/Button';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ── Role labels (reuse pattern from SpaceCard) ───────────────────────────────

const ROLE_LABELS: Record<SpaceRole, string> = {
  owner: 'Owner',
  co_mentor: 'Co-mentor',
  moderator: 'Moderator',
  student: 'Student',
};

// ── Avatar monogram (reuse pattern from SpaceCard) ───────────────────────────

function MonogramAvatar({ name }: { name: string }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center shrink-0',
        'h-8 w-8 rounded-full',
        'bg-surface-2 border-[0.5px] border-border-ds-subtle',
        'text-ink-secondary text-xs font-semibold',
      )}
    >
      {initial}
    </div>
  );
}

// ── Journal share toggle (student-only) ──────────────────────────────────────

interface JournalShareToggleProps {
  spaceId: string;
  currentlyShared: boolean;
}

function JournalShareToggle({ spaceId, currentlyShared }: JournalShareToggleProps) {
  const { mutateAsync, isPending } = useSetJournalSharing();
  const [optimistic, setOptimistic] = useState(currentlyShared);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    setOptimistic(next);
    try {
      await mutateAsync({ spaceId, shared: next });
      toast({
        title: next ? 'Journal shared' : 'Journal hidden',
        description: next
          ? 'Your mentor can now view your journal read-only.'
          : 'Your journal is now private.',
      });
    } catch (err) {
      setOptimistic(!next); // revert
      toast({ title: 'Could not update sharing', description: mapSpaceError(err) });
    }
  }

  return (
    <div
      className={cn(
        'mb-ds-4 rounded-[8px] p-ds-4',
        'bg-surface-1 border-[0.5px] border-border-ds-subtle',
        'flex items-start gap-ds-3',
      )}
    >
      <label
        htmlFor="journal-share-toggle"
        className="flex-1 flex flex-col gap-[3px] cursor-pointer"
      >
        <span className="text-[13px] font-medium text-ink-primary">
          Share my journal with your mentor
        </span>
        <span className="text-[12px] text-ink-secondary">
          Lets your mentor open your journal read-only.
        </span>
      </label>
      <div className="shrink-0 mt-[2px]">
        <input
          id="journal-share-toggle"
          type="checkbox"
          checked={optimistic}
          onChange={handleChange}
          disabled={isPending}
          className={cn(
            'h-4 w-4 cursor-pointer accent-[var(--gold-primary)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        />
      </div>
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface MemberListProps {
  spaceId: string;
  members: SpaceMember[];
  myRole: SpaceRole;
  currentUserId: string;
  onMessage: (userId: string) => void;
  onViewJournal: (m: SpaceMember) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function MemberList({
  spaceId,
  members,
  myRole,
  currentUserId,
  onMessage,
  onViewJournal,
}: MemberListProps) {
  const isManager = myRole === 'owner' || myRole === 'co_mentor';
  const { mutateAsync: removeMember, isPending: isRemoving } = useRemoveMember();

  // Find my own membership for the journal-share toggle value.
  const myMembership = members.find((m) => m.user_id === currentUserId);

  async function handleRemove(member: SpaceMember) {
    const label = member.display_name || member.email;
    const confirmed = window.confirm(
      `Remove ${label} from this Room? This action cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await removeMember({ spaceId, userId: member.user_id });
      toast({ title: 'Member removed', description: `${label} has been removed.` });
    } catch (err) {
      toast({ title: 'Could not remove member', description: mapSpaceError(err) });
    }
  }

  return (
    <div className="flex flex-col py-ds-4 px-ds-3">
      <h2 className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-4">
        Members ({members.length})
      </h2>

      {/* Student journal-share toggle */}
      {myRole === 'student' && myMembership && (
        <JournalShareToggle
          spaceId={spaceId}
          currentlyShared={myMembership.journal_shared}
        />
      )}

      <ul className="flex flex-col gap-[2px]">
        {members.map((member) => {
          const displayName = member.display_name || member.email;
          const isOwner = member.role === 'owner';
          const isSelf = member.user_id === currentUserId;
          const canActOn = isManager && !isOwner && !isSelf;

          return (
            <li
              key={member.member_id}
              className={cn(
                'flex items-center gap-ds-3 rounded-[8px] px-ds-2 py-[8px]',
                'transition-colors duration-base ease-out',
                canActOn && 'hover:bg-surface-2 group',
              )}
            >
              {/* Avatar */}
              <MonogramAvatar name={displayName} />

              {/* Name + role */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink-primary leading-snug truncate">
                  {displayName}
                  {isSelf && (
                    <span className="ml-ds-1 text-[11px] text-ink-tertiary font-normal">
                      (you)
                    </span>
                  )}
                </p>
                <span
                  className={cn(
                    'inline-block mt-[2px] px-[6px] py-[1px] rounded-[4px]',
                    'text-[10px] font-medium tracking-[0.5px] uppercase',
                    'bg-surface-2 text-ink-tertiary border-[0.5px] border-border-ds-subtle',
                  )}
                >
                  {ROLE_LABELS[member.role]}
                </span>
              </div>

              {/* Manager action buttons */}
              {canActOn && (
                <div className="flex items-center gap-ds-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-base">
                  {/* Message */}
                  <button
                    type="button"
                    title="Open direct message"
                    onClick={() => onMessage(member.user_id)}
                    className={cn(
                      'flex items-center justify-center h-7 w-7 rounded-[6px]',
                      'text-ink-tertiary hover:text-ink-primary hover:bg-surface-2',
                      'transition-colors duration-base ease-out',
                    )}
                  >
                    <MessageCircle size={14} aria-hidden="true" />
                    <span className="sr-only">Message {displayName}</span>
                  </button>

                  {/* View journal */}
                  <button
                    type="button"
                    title={
                      member.journal_shared
                        ? `View ${displayName}'s journal`
                        : "Student hasn't shared their journal yet."
                    }
                    disabled={!member.journal_shared}
                    onClick={() => member.journal_shared && onViewJournal(member)}
                    className={cn(
                      'flex items-center justify-center h-7 w-7 rounded-[6px]',
                      'transition-colors duration-base ease-out',
                      member.journal_shared
                        ? 'text-ink-tertiary hover:text-gold-primary hover:bg-gold-border'
                        : 'text-ink-muted cursor-not-allowed opacity-50',
                    )}
                  >
                    <BookOpen size={14} aria-hidden="true" />
                    <span className="sr-only">
                      {member.journal_shared
                        ? `View ${displayName}'s journal`
                        : 'Journal not shared'}
                    </span>
                  </button>

                  {/* Remove */}
                  <button
                    type="button"
                    title={`Remove ${displayName}`}
                    disabled={isRemoving}
                    onClick={() => handleRemove(member)}
                    className={cn(
                      'flex items-center justify-center h-7 w-7 rounded-[6px]',
                      'text-ink-tertiary hover:text-num-negative hover:bg-num-negative/10',
                      'transition-colors duration-base ease-out',
                      'disabled:opacity-40 disabled:cursor-not-allowed',
                    )}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    <span className="sr-only">Remove {displayName}</span>
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
