// src/features/mentor/components/EditSpaceDescriptionDialog.tsx
// Small dialog for editing a mentor space description (owner-only).
//
// - Validates: max 400 chars (matches CreateSpaceDialog description field).
// - On success: toasts and closes; the parent's useUpdateSpace onSuccess
//   invalidates both mySpaces and space detail so the card re-renders.
// - Uses the same Dialog primitives and DS tokens as sibling mentor dialogs.

import { useState, useEffect, useId } from 'react';
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
import { useUpdateSpace, mapSpaceError } from '@/features/mentor/hooks/useMentorshipSpaces';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ── Shared textarea className (matches CreateSpaceDialog input style) ──────────

const TEXTAREA_BASE = cn(
  'w-full rounded-[8px] px-ds-4 py-[11px]',
  'bg-surface-1 border-[0.5px] border-border-ds-default',
  'text-[15px] text-ink-primary font-sans',
  'placeholder:text-ink-muted',
  'outline-none resize-none leading-[1.5]',
  'transition-colors duration-base ease-out',
  'focus:border-gold-primary focus:ring-[3px] focus:ring-gold-primary/15',
  'disabled:opacity-50 disabled:cursor-not-allowed',
);

const MAX_CHARS = 400;

// ── Props ──────────────────────────────────────────────────────────────────────

export interface EditSpaceDescriptionDialogProps {
  spaceId: string;
  initialDescription: string | null;
  open: boolean;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function EditSpaceDescriptionDialog({
  spaceId,
  initialDescription,
  open,
  onClose,
}: EditSpaceDescriptionDialogProps) {
  const uid = useId();
  const descId = `${uid}-desc`;

  const [description, setDescription] = useState(initialDescription ?? '');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { mutateAsync: updateSpace, isPending } = useUpdateSpace();

  // Sync textarea with prop when dialog (re-)opens.
  useEffect(() => {
    if (open) {
      setDescription(initialDescription ?? '');
      setSubmitError(null);
    }
  }, [open, initialDescription]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    try {
      await updateSpace({ spaceId, description: description.trim() || undefined });
      toast({
        title: 'Description saved',
        description: 'Your room description has been updated.',
      });
      onClose();
    } catch (err) {
      setSubmitError(mapSpaceError(err));
    }
  }

  const remaining = MAX_CHARS - description.length;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        // Opaque background via inline style — same pattern as CreateSpaceDialog.
        style={{ backgroundColor: '#111' }}
        className={cn(
          'border-[0.5px] border-border-ds-subtle',
          'rounded-[12px]',
          'p-ds-6',
          'max-w-[480px] w-full',
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold text-ink-primary">
            {initialDescription ? 'Edit description' : 'Add a description'}
          </DialogTitle>
          <DialogDescription className="text-[14px] text-ink-secondary mt-ds-1">
            Tell members what to expect in this room.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="mt-ds-5 flex flex-col gap-ds-4" noValidate>
          {/* Description textarea */}
          <div className="flex flex-col gap-ds-1">
            <label
              htmlFor={descId}
              className="text-[13px] font-medium text-ink-secondary"
            >
              Description
            </label>
            <textarea
              id={descId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will members learn or do in this space?"
              rows={4}
              maxLength={MAX_CHARS}
              className={TEXTAREA_BASE}
              disabled={isPending}
              autoFocus
            />
            <p className={cn(
              'text-[12px]',
              remaining < 20 ? 'text-num-negative' : 'text-ink-muted',
            )}>
              {remaining} characters remaining
            </p>
          </div>

          {/* Server error */}
          {submitError && (
            <p className="text-[13px] text-num-negative">{submitError}</p>
          )}

          <DialogFooter className="mt-ds-2 gap-ds-2">
            <UiButton
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
              className="text-ink-secondary hover:text-ink-primary"
            >
              Cancel
            </UiButton>
            <Button
              type="submit"
              variant="gold"
              size="default"
              showArrow={false}
              disabled={isPending}
            >
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
