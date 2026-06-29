// src/features/mentor/components/AddConnectionsDialog.tsx
// Manager-only dialog: add accepted mentor connections directly to a space.
//
// Fetches the mentor's accepted student connections via useMyStudents(), filters
// out anyone who is already an active member via useSpaceMembers(), and lets
// the manager multi-select + bulk-add with a single "Add N to room" action.
//
// Error codes handled:
//   not_connected  -> mapSpaceError -> "You're not connected to this member."
//   access_denied  -> mapSpaceError -> "You do not have access to do that."
//   invalid_role   -> mapSpaceError -> "Invalid role specified."
// All others fall through to the generic message.

import { useState } from 'react';
import { UserCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ds/Button';
import { Button as UiButton } from '@/components/ui/button';
import { useMyStudents } from '@/features/mentor/hooks/useMentorRelationships';
import {
  useSpaceMembers,
  useAddConnectionToSpace,
  mapSpaceError,
} from '@/features/mentor/hooks/useMentorshipSpaces';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ── Avatar monogram — matches MemberList's MonogramAvatar exactly ─────────────

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

// ── Props ─────────────────────────────────────────────────────────────────────

export interface AddConnectionsDialogProps {
  spaceId: string;
  open: boolean;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddConnectionsDialog({ spaceId, open, onClose }: AddConnectionsDialogProps) {
  const { students, isLoading: studentsLoading } = useMyStudents();
  const { members } = useSpaceMembers(spaceId);
  const { mutateAsync: addMember } = useAddConnectionToSpace();

  // Track which student_ids are checked.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isBusy, setIsBusy] = useState(false);

  // The set of user_ids already in the space — used to show "Already in room".
  const existingMemberIds = new Set(members.map((m) => m.user_id));

  // Connections not yet in the room are selectable; those already in are shown
  // disabled with an "Already in room" tag (cleaner than hiding them).
  const selectable = students.filter((s) => !existingMemberIds.has(s.student_id));
  const alreadyIn = students.filter((s) => existingMemberIds.has(s.student_id));

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelected(new Set());
      onClose();
    }
  }

  function toggleStudent(studentId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0 || isBusy) return;
    setIsBusy(true);

    const targets = [...selected];
    let successCount = 0;
    const errors: string[] = [];

    for (const userId of targets) {
      try {
        await addMember({ spaceId, userId, role: 'student' });
        successCount += 1;
      } catch (err) {
        const name = students.find((s) => s.student_id === userId)?.display_name ?? userId;
        errors.push(`${name}: ${mapSpaceError(err)}`);
      }
    }

    setIsBusy(false);

    if (successCount > 0) {
      toast({
        title: successCount === targets.length
          ? `Added ${successCount} ${successCount === 1 ? 'member' : 'members'}`
          : `Added ${successCount} of ${targets.length} members`,
        description: errors.length > 0
          ? errors.join('\n')
          : `${successCount === 1 ? 'The member has' : 'Members have'} been added to this Room.`,
      });
    } else if (errors.length > 0) {
      toast({
        title: 'Could not add members',
        description: errors.join('\n'),
      });
    }

    setSelected(new Set());
    onClose();
  }

  const selectedCount = selected.size;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'bg-gradient-to-br from-[#0A0A0A] via-[#111118] to-[#0A0A0A]',
          'border border-gold-border/25',
          'rounded-[12px]',
          'p-ds-6',
          'max-w-[460px] w-full',
          'shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(212,175,55,0.08)]',
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold text-ink-primary">
            Add from connections
          </DialogTitle>
          <DialogDescription className="text-[14px] text-ink-secondary mt-ds-1">
            Select accepted connections to add directly to this Room as students.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-ds-5 flex flex-col gap-[2px] max-h-[320px] overflow-y-auto -mx-ds-1 px-ds-1">
          {studentsLoading ? (
            <p className="text-[13px] text-ink-tertiary py-ds-4 text-center">
              Loading connections…
            </p>
          ) : students.length === 0 ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center gap-ds-3 py-ds-6 text-center">
              <UserCheck size={32} className="text-ink-muted" aria-hidden="true" />
              <p className="text-[14px] text-ink-secondary font-medium">
                No connections yet.
              </p>
              <p className="text-[13px] text-ink-tertiary">
                Use an invite link to bring people in.
              </p>
            </div>
          ) : (
            <>
              {/* Selectable connections */}
              {selectable.map((student) => {
                const displayName = student.display_name || student.email;
                const isChecked = selected.has(student.student_id);

                return (
                  <label
                    key={student.student_id}
                    className={cn(
                      'flex items-center gap-ds-3 rounded-[8px] px-ds-2 py-[8px] cursor-pointer',
                      'transition-colors duration-base ease-out',
                      isChecked
                        ? 'bg-gold-border/30'
                        : 'hover:bg-surface-2',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleStudent(student.student_id)}
                      disabled={isBusy}
                      className={cn(
                        'h-4 w-4 shrink-0 cursor-pointer accent-[var(--gold-primary)]',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      )}
                    />
                    <MonogramAvatar name={displayName} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-ink-primary leading-snug truncate">
                        {displayName}
                      </p>
                      <p className="text-[12px] text-ink-tertiary truncate">
                        {student.email}
                      </p>
                    </div>
                  </label>
                );
              })}

              {/* Already-in-room connections (disabled) */}
              {alreadyIn.map((student) => {
                const displayName = student.display_name || student.email;

                return (
                  <div
                    key={student.student_id}
                    className="flex items-center gap-ds-3 rounded-[8px] px-ds-2 py-[8px] opacity-50"
                  >
                    {/* Placeholder to align with checkboxes above */}
                    <div className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <MonogramAvatar name={displayName} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-ink-primary leading-snug truncate">
                        {displayName}
                      </p>
                      <p className="text-[12px] text-ink-tertiary truncate">
                        {student.email}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 px-[6px] py-[2px] rounded-[4px]',
                        'text-[10px] font-medium tracking-[0.5px] uppercase',
                        'bg-surface-2 text-ink-muted border-[0.5px] border-border-ds-subtle',
                      )}
                    >
                      Already in room
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <DialogFooter className="mt-ds-5 gap-ds-2">
          <UiButton
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isBusy}
            className="text-ink-secondary hover:text-ink-primary"
          >
            Cancel
          </UiButton>
          <Button
            type="button"
            variant="gold"
            size="default"
            showArrow={false}
            disabled={selectedCount === 0 || isBusy}
            onClick={handleAdd}
          >
            {isBusy
              ? 'Adding…'
              : selectedCount === 0
                ? 'Add to room'
                : `Add ${selectedCount} to room`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
