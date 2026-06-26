// src/components/mentorship/InviteDialog.tsx
// Manager-only dialog to mint an invite link for a space.
// After creation: show the shareable URL with a copy-to-clipboard button.

import { useState, useId } from 'react';
import { Copy, Check } from 'lucide-react';
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
import { useCreateInvite, mapSpaceError } from '@/features/mentor/hooks/useMentorshipSpaces';
import { toast } from '@/hooks/use-toast';
import type { SpaceRole } from '@/features/mentor/types/mentorship';
import { cn } from '@/lib/utils';

// ── Shared input className (matches rest of mentorship dialogs) ───────────────

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

const INVITABLE_ROLES: { value: SpaceRole; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'co_mentor', label: 'Co-mentor' },
];

// ── Props ────────────────────────────────────────────────────────────────────

export interface InviteDialogProps {
  spaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function InviteDialog({ spaceId, open, onOpenChange }: InviteDialogProps) {
  const uid = useId();
  const emailId = `${uid}-email`;
  const roleId = `${uid}-role`;

  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState<SpaceRole>('student');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useCreateInvite();

  // Reset when dialog closes.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setIdentifier('');
      setRole('student');
      setInviteLink(null);
      setCopied(false);
      setSubmitError(null);
    }
    onOpenChange(next);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    try {
      const invite = await mutateAsync({
        spaceId,
        email: identifier.trim() || undefined,
        role,
      });
      const link = `${window.location.origin}/app/floor/rooms?invite=${invite.token}`;
      setInviteLink(link);
    } catch (err) {
      setSubmitError(mapSpaceError(err));
    }
  }

  async function handleCopy() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({ title: 'Link copied', description: 'Invite link is in your clipboard.' });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: 'Could not copy', description: 'Please copy the link manually.' });
    }
  }

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
            Invite people
          </DialogTitle>
          <DialogDescription className="text-[14px] text-ink-secondary mt-ds-1">
            Generate a one-time invite link. Optionally lock it to a specific email address.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          /* ── Success: show link + copy button ── */
          <div className="mt-ds-5 flex flex-col gap-ds-4">
            <div
              className={cn(
                'rounded-[8px] border-[0.5px] border-gold-border bg-surface-1',
                'px-ds-4 py-ds-3',
              )}
            >
              <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-gold-muted mb-ds-2">
                Invite link
              </p>
              <p className="text-[13px] text-ink-secondary font-mono break-all leading-[1.5]">
                {inviteLink}
              </p>
            </div>

            <Button
              variant="gold"
              size="default"
              showArrow={false}
              onClick={handleCopy}
              className="w-full"
            >
              {copied ? (
                <>
                  <Check size={14} aria-hidden="true" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={14} aria-hidden="true" />
                  Copy invite link
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setInviteLink(null);
                setIdentifier('');
                setRole('student');
              }}
              className="text-[13px] text-ink-tertiary hover:text-ink-secondary transition-colors duration-base text-center"
            >
              Create another invite
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleCreate} className="mt-ds-5 flex flex-col gap-ds-4" noValidate>
            {/* Email or username (optional) */}
            <div className="flex flex-col gap-ds-1">
              <label
                htmlFor={emailId}
                className="text-[13px] font-medium text-ink-secondary"
              >
                Email or username
              </label>
              <input
                id={emailId}
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="email@example.com or @username"
                className={INPUT_BASE}
                disabled={isPending}
              />
              <p className="text-[12px] text-ink-tertiary">
                Leave blank to create an open link anyone can redeem.
              </p>
            </div>

            {/* Role */}
            <div className="flex flex-col gap-ds-1">
              <label
                htmlFor={roleId}
                className="text-[13px] font-medium text-ink-secondary"
              >
                Role
              </label>
              <div className="relative">
                <select
                  id={roleId}
                  value={role}
                  onChange={(e) => setRole(e.target.value as SpaceRole)}
                  className={cn(INPUT_BASE, 'cursor-pointer appearance-none pr-8')}
                  disabled={isPending}
                >
                  {INVITABLE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                >
                  <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Error */}
            {submitError && (
              <p className="text-[13px] text-num-negative">{submitError}</p>
            )}

            <DialogFooter className="mt-ds-2 gap-ds-2">
              <UiButton
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
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
                {isPending ? 'Creating…' : 'Create invite'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
