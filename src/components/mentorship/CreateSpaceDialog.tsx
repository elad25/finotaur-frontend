// src/components/mentorship/CreateSpaceDialog.tsx
// Modal dialog for creating a new mentor space.
//
// Fields:
//   - Name (required)
//   - URL slug (required; auto-suggested from name, editable)
//   - Description (optional textarea)
//
// If canCreate=false, show an inline upsell note inside the dialog so the user
// understands the gate before submitting (the RPC also enforces it server-side).
//
// Uses:
//   - Dialog primitive from @/components/ui/dialog
//   - useCreateSpace() mutation from @/hooks/useMentorshipSpaces
//   - toast() from @/hooks/use-toast
//   - DS Button + DS Card tokens via Tailwind

import { useState, useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
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
import { useCreateSpace, mapSpaceError } from '@/hooks/useMentorshipSpaces';
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
  const slugId = `${uid}-slug`;
  const descId = `${uid}-desc`;

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useCreateSpace();

  // Auto-derive slug from name unless the user has manually edited it.
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugFromName(name));
    }
  }, [name, slugEdited]);

  // Reset form when dialog opens/closes.
  useEffect(() => {
    if (!open) {
      setName('');
      setSlug('');
      setSlugEdited(false);
      setDescription('');
      setSubmitError(null);
    }
  }, [open]);

  // ── Validation ──────────────────────────────────────────────────────────────

  const nameError = name.trim().length === 0 && submitError ? 'Name is required.' : undefined;
  const slugError =
    slug.trim().length === 0 && submitError
      ? 'URL slug is required.'
      : slug.length > 0 && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length >= 2
      ? 'Slug must be lowercase letters, numbers, and hyphens (no leading/trailing hyphens).'
      : undefined;

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!name.trim() || !slug.trim()) {
      setSubmitError('required');
      return;
    }

    try {
      await mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
      });
      toast({ title: 'Room created', description: `"${name.trim()}" is ready.` });
      onOpenChange(false);
    } catch (err) {
      setSubmitError(mapSpaceError(err));
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Override shadcn defaults to match DS: opaque dark surface, gold border.
          // NOTE: use a solid color, NOT var(--bg-surface-1) — that token is a 2%
          // white *overlay* (rgba(255,255,255,0.02)) meant to sit on an opaque
          // parent, so a floating modal rendered see-through (the page bled through).
          'bg-[#111] border-[0.5px] border-border-ds-subtle',
          'rounded-[12px]',
          'p-ds-6',
          'max-w-[480px] w-full',
        )}
      >
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
        <form onSubmit={handleSubmit} className="mt-ds-5 flex flex-col gap-ds-4" noValidate>
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
              disabled={isPending}
              autoFocus
            />
          </Field>

          {/* Slug */}
          <Field
            label="URL slug"
            id={slugId}
            hint="Lowercase letters, numbers, and hyphens only."
            error={slugError}
          >
            <div className="relative flex items-center">
              <span className="absolute left-ds-4 text-[13px] text-ink-tertiary select-none pointer-events-none">
                /spaces/
              </span>
              <input
                id={slugId}
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  // Live-clean to DS slug rules while typing.
                  const cleaned = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '')
                    .replace(/-{2,}/g, '-');
                  setSlug(cleaned);
                }}
                placeholder="ict-mentorship"
                maxLength={60}
                className={cn(
                  INPUT_BASE,
                  'pl-[72px]',
                  slugError && 'border-num-negative focus:ring-num-negative/15',
                )}
                disabled={isPending}
              />
            </div>
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
              disabled={isPending}
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
              disabled={isPending}
              className="text-ink-secondary hover:text-ink-primary"
            >
              Cancel
            </UiButton>
            <Button
              type="submit"
              variant="gold"
              size="default"
              disabled={isPending}
              showArrow={false}
            >
              {isPending ? 'Creating…' : 'Create Room'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
