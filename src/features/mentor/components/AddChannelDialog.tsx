// src/features/mentor/components/AddChannelDialog.tsx
// Owner-only dialog to create a new channel (chat or announcement) in a space.

import { useState, useId } from 'react';
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
import { useCreateChannel, mapSpaceError } from '@/features/mentor/hooks/useMentorshipSpaces';
import { toast } from '@/hooks/use-toast';
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

type ChannelTypeOption = 'chat' | 'announcement';

const CHANNEL_TYPES: { value: ChannelTypeOption; label: string; description: string }[] = [
  { value: 'chat', label: 'Chat', description: 'Everyone can post' },
  { value: 'announcement', label: 'Announcement', description: 'Only the owner posts' },
];

const MAX_NAME_LENGTH = 40;

// ── Props ────────────────────────────────────────────────────────────────────

export interface AddChannelDialogProps {
  spaceId: string;
  open: boolean;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function AddChannelDialog({ spaceId, open, onClose }: AddChannelDialogProps) {
  const uid = useId();
  const nameId = `${uid}-name`;
  const typeId = `${uid}-type`;

  const [name, setName] = useState('');
  const [type, setType] = useState<ChannelTypeOption>('chat');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useCreateChannel();

  function handleOpenChange(next: boolean) {
    if (!next) {
      setName('');
      setType('chat');
      setSubmitError(null);
      onClose();
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setSubmitError("Channel name can't be empty.");
      return;
    }
    setSubmitError(null);
    try {
      await mutateAsync({ spaceId, name: trimmed, type });
      toast({
        title: 'Channel created',
        description: `#${trimmed} is ready.`,
      });
      handleOpenChange(false);
    } catch (err) {
      setSubmitError(mapSpaceError(err));
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
            Add channel
          </DialogTitle>
          <DialogDescription className="text-[14px] text-ink-secondary mt-ds-1">
            Create a new channel for this room.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="mt-ds-5 flex flex-col gap-ds-4" noValidate>
          {/* Channel name */}
          <div className="flex flex-col gap-ds-1">
            <label htmlFor={nameId} className="text-[13px] font-medium text-ink-secondary">
              Channel name
            </label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. trading-setups"
              maxLength={MAX_NAME_LENGTH}
              className={INPUT_BASE}
              disabled={isPending}
              autoFocus
            />
            <p className="text-[12px] text-ink-tertiary text-right">
              {name.length}/{MAX_NAME_LENGTH}
            </p>
          </div>

          {/* Channel type */}
          <div className="flex flex-col gap-ds-1">
            <label htmlFor={typeId} className="text-[13px] font-medium text-ink-secondary">
              Type
            </label>
            <div className="relative">
              <select
                id={typeId}
                value={type}
                onChange={(e) => setType(e.target.value as ChannelTypeOption)}
                className={cn(INPUT_BASE, 'cursor-pointer appearance-none pr-8')}
                disabled={isPending}
              >
                {CHANNEL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} — {t.description}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
              >
                <path
                  d="M2 4L6 8L10 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
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
              {isPending ? 'Creating…' : 'Create channel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
