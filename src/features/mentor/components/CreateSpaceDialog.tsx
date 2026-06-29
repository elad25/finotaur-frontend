// src/components/mentorship/CreateSpaceDialog.tsx
// Modal dialog for creating a new mentor space.
//
// Step 1 — create form (name + description).
// Step 2 — connection picker: add accepted connections directly to the new
//           space. "Skip" or "Done" close the dialog.
//
// Fields:
//   - Name (required)
//   - Description (optional textarea)
//
// URL slug is auto-derived from the name and never shown to the user.
//
// If canCreate=false, show an inline upsell note inside the dialog so the user
// understands the gate before submitting (the RPC also enforces it server-side).
//
// Uses:
//   - Dialog primitive from @/components/ui/dialog
//   - useCreateSpace() mutation from @/hooks/useMentorshipSpaces
//   - toast() from @/hooks/use-toast
//   - DS Button + DS Card tokens via Tailwind
//   - AddConnectionsBody (inline picker, shared sub-component)

import { useState, useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
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
import { useCreateSpace, useSpaceMembers, useAddConnectionToSpace, mapSpaceError } from '@/features/mentor/hooks/useMentorshipSpaces';
import { useMyStudents } from '@/features/mentor/hooks/useMentorRelationships';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ── Slug derivation ────────────────────────────────────────────────────────────
//
// Rules: lowercase, spaces→hyphens, strip anything that is not [a-z0-9-],
// collapse consecutive hyphens, trim leading/trailing hyphens.

export function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Form field component ───────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  id: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
}

function Field({ label, id, children, error, hint }: FieldProps) {
  return (
    <div className="flex flex-col gap-ds-1">
      <label
        htmlFor={id}
        className="text-[13px] font-medium text-ink-secondary"
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[12px] text-ink-tertiary">{hint}</p>
      )}
      {error && (
        <p className="text-[12px] text-num-negative">{error}</p>
      )}
    </div>
  );
}

// ── Shared input className (matches DS Input spec) ─────────────────────────────

const INPUT_BASE = cn(
  'w-full rounded-[8px] px-ds-4 py-[11px]',
  'bg-surface-1 border-[0.5px] border-border-ds-default',
  'text-[15px] text-ink-primary font-sans',
  'placeholder:text-ink-muted',
  'outline-none',
  'transition-colors duration-base ease-out',
  'focus:border-gold-primary focus:ring-[3px] focus:ring-gold-primary/15',
  'disabled:opacity-50 disabled:cursor-not-allowed',
);

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

// ── Step-2 inline connection picker ──────────────────────────────────────────
//
// Extracted as a named sub-component so it can be shared with
// AddConnectionsDialog (which renders it inside its own full Dialog shell).

interface AddConnectionsBodyProps {
  spaceId: string;
  selected: Set<string>;
  onToggle: (studentId: string) => void;
  isBusy: boolean;
}

export function AddConnectionsBody({
  spaceId,
  selected,
  onToggle,
  isBusy,
}: AddConnectionsBodyProps) {
  const { students, isLoading } = useMyStudents();
  const { members } = useSpaceMembers(spaceId);

  const existingMemberIds = new Set(members.map((m) => m.user_id));
  const selectable = students.filter((s) => !existingMemberIds.has(s.student_id));
  const alreadyIn = students.filter((s) => existingMemberIds.has(s.student_id));

  if (isLoading) {
    return (
      <p className="text-[13px] text-ink-tertiary py-ds-4 text-center">
        Loading connections…
      </p>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center gap-ds-3 py-ds-6 text-center">
        <UserCheck size={32} className="text-ink-muted" aria-hidden="true" />
        <p className="text-[14px] text-ink-secondary font-medium">
          No connections yet.
        </p>
        <p className="text-[13px] text-ink-tertiary">
          Use an invite link to bring people in.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[2px]">
      {selectable.map((student) => {
        const displayName = student.display_name || student.email;
        const isChecked = selected.has(student.student_id);

        return (
          <label
            key={student.student_id}
            className={cn(
              'flex items-center gap-ds-3 rounded-[8px] px-ds-2 py-[8px] cursor-pointer',
              'transition-colors duration-base ease-out',
              isChecked ? 'bg-gold-border/30' : 'hover:bg-surface-2',
            )}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onToggle(student.student_id)}
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

      {alreadyIn.map((student) => {
        const displayName = student.display_name || student.email;
        return (
          <div
            key={student.student_id}
            className="flex items-center gap-ds-3 rounded-[8px] px-ds-2 py-[8px] opacity-50"
          >
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
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface CreateSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether the current user is eligible to create a space. */
  canCreate: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CreateSpaceDialog({ open, onOpenChange, canCreate }: CreateSpaceDialogProps) {
  const uid = useId();
  const nameId = `${uid}-name`;
  const descId = `${uid}-desc`;

  // Step 1: create form fields.
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Step 2: after creation, store the new space id and show the picker.
  const [createdSpaceId, setCreatedSpaceId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  const { mutateAsync: createSpace, isPending: isCreating } = useCreateSpace();
  const { mutateAsync: addMember } = useAddConnectionToSpace();

  // Reset all state when dialog closes.
  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setSubmitError(null);
      setCreatedSpaceId(null);
      setSelected(new Set());
      setIsAddingMembers(false);
    }
  }, [open]);

  // ── Step 1: Validation ──────────────────────────────────────────────────────

  const nameError = name.trim().length === 0 && submitError ? 'Name is required.' : undefined;

  // ── Step 1: Submit — create + advance to step 2 ────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!name.trim()) {
      setSubmitError('required');
      return;
    }

    try {
      const space = await createSpace({
        name: name.trim(),
        slug: slugFromName(name.trim()),
        description: description.trim() || undefined,
      });
      toast({ title: 'Room created', description: `"${name.trim()}" is ready.` });
      // Advance to step 2 using the returned space id.
      setCreatedSpaceId(space.id);
    } catch (err) {
      setSubmitError(mapSpaceError(err));
    }
  }

  // ── Step 2: Toggle selection ────────────────────────────────────────────────

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

  // ── Step 2: Add selected members then close ─────────────────────────────────

  async function handleAddAndClose() {
    if (!createdSpaceId) {
      onOpenChange(false);
      return;
    }
    if (selected.size === 0) {
      onOpenChange(false);
      return;
    }

    setIsAddingMembers(true);
    const targets = [...selected];
    let successCount = 0;
    const errors: string[] = [];

    for (const userId of targets) {
      try {
        await addMember({ spaceId: createdSpaceId, userId, role: 'student' });
        successCount += 1;
      } catch (err) {
        errors.push(mapSpaceError(err));
      }
    }

    setIsAddingMembers(false);

    if (successCount > 0) {
      toast({
        title: successCount === targets.length
          ? `Added ${successCount} ${successCount === 1 ? 'member' : 'members'}`
          : `Added ${successCount} of ${targets.length} members`,
        description: errors.length > 0 ? errors.join('\n') : undefined,
      });
    } else if (errors.length > 0) {
      toast({ title: 'Could not add members', description: errors.join('\n') });
    }

    onOpenChange(false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const isStep2 = createdSpaceId !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Opaque background via INLINE STYLE, not a Tailwind class:
        //  - shadcn's base `bg-background` resolves to `hsl(var(--background))`
        //    but this project sets `--background` to a HEX → `hsl(#hex)` is an
        //    invalid color → the panel renders see-through.
        //  - an arbitrary `bg-[#111]` class is not reliably emitted by the JIT
        //    here either. Inline style always wins and is JIT-independent
        //    (same pattern as the sibling JoinDialog in GlobalLeaderboard).
        style={{ backgroundColor: '#111' }}
        className={cn(
          'border-[0.5px] border-border-ds-subtle',
          'rounded-[12px]',
          'p-ds-6',
          'max-w-[480px] w-full',
        )}
      >
        {isStep2 ? (
          /* ── Step 2: Add connections ── */
          <>
            <DialogHeader>
              <DialogTitle className="text-[18px] font-semibold text-ink-primary">
                Add connections to your Room
              </DialogTitle>
              <DialogDescription className="text-[14px] text-ink-secondary mt-ds-1">
                Your Room is ready. Add accepted connections now, or skip and invite people later.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-ds-5 max-h-[320px] overflow-y-auto -mx-ds-1 px-ds-1">
              <AddConnectionsBody
                spaceId={createdSpaceId}
                selected={selected}
                onToggle={toggleStudent}
                isBusy={isAddingMembers}
              />
            </div>

            <DialogFooter className="mt-ds-5 gap-ds-2">
              <UiButton
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isAddingMembers}
                className="text-ink-secondary hover:text-ink-primary"
              >
                Skip
              </UiButton>
              <Button
                type="button"
                variant="gold"
                size="default"
                showArrow={false}
                disabled={isAddingMembers}
                onClick={handleAddAndClose}
              >
                {isAddingMembers
                  ? 'Adding…'
                  : selected.size > 0
                    ? `Add ${selected.size} to room`
                    : 'Done'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* ── Step 1: Create form ── */
          <>
            <DialogHeader>
              <DialogTitle className="text-[18px] font-semibold text-ink-primary">
                Create a Room
              </DialogTitle>
              <DialogDescription className="text-[14px] text-ink-secondary mt-ds-1">
                A Room is your community hub — channels, announcements, and coaching in one place.
              </DialogDescription>
            </DialogHeader>

            {/* ── Premium gate note ── */}
            {!canCreate && (
              <div
                className={cn(
                  'mt-ds-4 rounded-[8px] p-ds-4',
                  'border-[0.5px] border-gold-border bg-surface-1',
                )}
              >
                <p className="text-[13px] text-ink-secondary">
                  A{' '}
                  <span className="text-gold-primary font-medium">FINOTAUR (Premium) plan</span>{' '}
                  is required to create a Room.{' '}
                  <Link
                    to="/app/all-markets/pricing"
                    className="text-gold-primary underline underline-offset-2 hover:text-gold-hover transition-colors duration-base"
                    onClick={() => onOpenChange(false)}
                  >
                    Upgrade now
                  </Link>
                </p>
              </div>
            )}

            {/* ── Form ── */}
            <form onSubmit={handleCreate} className="mt-ds-5 flex flex-col gap-ds-4" noValidate>
              {/* Name */}
              <Field
                label="Room name"
                id={nameId}
                error={nameError}
              >
                <input
                  id={nameId}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. ICT Mentorship — Spring 2026"
                  maxLength={80}
                  className={cn(INPUT_BASE, nameError && 'border-num-negative focus:ring-num-negative/15')}
                  disabled={isCreating}
                  autoFocus
                />
              </Field>

              {/* Description */}
              <Field
                label="Description (optional)"
                id={descId}
              >
                <textarea
                  id={descId}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will members learn or do in this space?"
                  rows={3}
                  maxLength={400}
                  className={cn(INPUT_BASE, 'resize-none leading-[1.5]')}
                  disabled={isCreating}
                />
              </Field>

              {/* Server/submit error */}
              {submitError && submitError !== 'required' && (
                <p className="text-[13px] text-num-negative">{submitError}</p>
              )}

              {/* ── Footer buttons ── */}
              <DialogFooter className="mt-ds-2 gap-ds-2">
                <UiButton
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isCreating}
                  className="text-ink-secondary hover:text-ink-primary"
                >
                  Cancel
                </UiButton>
                <Button
                  type="submit"
                  variant="gold"
                  size="default"
                  disabled={isCreating}
                  showArrow={false}
                >
                  {isCreating ? 'Creating…' : 'Create Room'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
