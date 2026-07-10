/**
 * UpgradeLimitDialog — reusable upgrade gate modal.
 *
 * Three presets keyed by `reason`:
 *  - 'broker-limit':       user hit the 1-broker cap on free/basic.
 *  - 'broker-free-locked': FREE-plan user tried to connect (or resume sync on)
 *                          a broker — broker sync is fully off-limits on free.
 *  - 'free-trade-limit':   user hit the lifetime-trade cap on free.
 *
 * Design rules (DESIGN_SYSTEM.md):
 *  - Gold is a statement, not decoration — one gold CTA, Crown accent only.
 *  - bg-surface-base / bg-surface-1, border-gold-border.
 *  - All text sentence case, English-only (iron rule).
 *  - Max ONE <Button variant="gold"> per dialog.
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ds/Button';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UpgradeLimitReason = 'broker-limit' | 'broker-free-locked' | 'free-trade-limit';

export interface UpgradeLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: UpgradeLimitReason;
  /** For 'free-trade-limit': trades already logged */
  used?: number;
  /** For 'free-trade-limit': ceiling (e.g. 15) */
  max?: number;
}

// ---------------------------------------------------------------------------
// Preset content
// ---------------------------------------------------------------------------

interface Preset {
  title: string;
  description: (used?: number, max?: number) => string;
  bullets: string[];
}

const PRESETS: Record<UpgradeLimitReason, Preset> = {
  'broker-limit': {
    title: 'Connect more brokers with Trader',
    description: () =>
      'Free and basic plans include one broker connection. Upgrade to Trader to sync all your accounts in a single journal.',
    bullets: [
      'Unlimited broker connections',
      'All accounts synced in one journal',
      'Switch brokers anytime',
    ],
  },
  'broker-free-locked': {
    title: 'Broker sync is a Trader feature',
    description: () =>
      'Connect your broker and your trades flow into your journal automatically — no manual entry. Upgrade to unlock automatic sync.',
    bullets: [
      'Automatic trade sync from your broker',
      'Live positions & fills in your journal',
      'No manual trade entry',
    ],
  },
  'free-trade-limit': {
    title: "You've reached your free trade limit",
    description: (used, max) =>
      used !== undefined && max !== undefined
        ? `You've logged all ${max} free trades — nice work building the habit. Upgrade to keep your journal growing with unlimited trades and broker sync.`
        : "You've logged all your free trades — nice work building the habit. Upgrade to keep your journal growing with unlimited trades and broker sync.",
    bullets: [
      'Unlimited trades',
      'Full analytics & stats',
      'All journal features',
    ],
  },
};

// ---------------------------------------------------------------------------
// Progress bar (free-trade-limit only)
// ---------------------------------------------------------------------------

function TradeProgress({ used, max }: { used: number; max: number }) {
  const pct = Math.min(100, Math.round((used / max) * 100));
  return (
    <div className="mt-ds-3 space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-mono tabular-nums text-[11px] text-ink-tertiary">
          {used} / {max} trades
        </span>
        <span className="font-mono tabular-nums text-[11px] text-ink-tertiary">
          {pct}%
        </span>
      </div>
      {/* Track */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-1">
        {/* Gold gradient fill */}
        <div
          className="h-full rounded-full bg-gradient-gold transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function UpgradeLimitDialog({
  open,
  onOpenChange,
  reason,
  used,
  max,
}: UpgradeLimitDialogProps) {
  const navigate = useNavigate();
  const preset = PRESETS[reason];

  function handleUpgrade() {
    onOpenChange(false);
    navigate('/app/upgrade');
  }

  function handleDismiss() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-md',
          'bg-surface-base',
          'border border-gold-border',
          'rounded-[12px]',
          'p-0',
          'overflow-hidden',
        )}
      >
        {/* ----------------------------------------------------------------
            Header band with Crown icon
        ---------------------------------------------------------------- */}
        <div className="flex flex-col items-center gap-ds-3 px-ds-6 pt-ds-6 pb-ds-4">
          {/* Crown badge */}
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-1 border border-gold-border">
            <Crown className="h-5 w-5 text-gold-primary" aria-hidden="true" />
          </div>

          <DialogHeader className="text-center">
            <DialogTitle className="text-base font-semibold leading-snug text-ink-primary text-center">
              {preset.title}
            </DialogTitle>
            <DialogDescription className="mt-ds-2 text-sm leading-relaxed text-ink-secondary text-center">
              {preset.description(used, max)}
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar — only for free-trade-limit when data provided */}
          {reason === 'free-trade-limit' && used !== undefined && max !== undefined && (
            <div className="w-full">
              <TradeProgress used={used} max={max} />
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------
            Bullet list
        ---------------------------------------------------------------- */}
        <ul className="mx-ds-6 mb-ds-5 space-y-ds-2 rounded-[10px] border border-border-ds-subtle bg-surface-1 px-ds-4 py-ds-3">
          {preset.bullets.map((bullet) => (
            <li key={bullet} className="flex items-center gap-ds-2">
              <Check
                className="h-3.5 w-3.5 shrink-0 text-gold-primary"
                aria-hidden="true"
              />
              <span className="text-sm text-ink-secondary">{bullet}</span>
            </li>
          ))}
        </ul>

        {/* ----------------------------------------------------------------
            Footer — one gold CTA + ghost dismiss
        ---------------------------------------------------------------- */}
        <DialogFooter className="flex-col gap-ds-2 px-ds-6 pb-ds-6 sm:flex-col sm:space-x-0">
          {/* ONE gold button — the only gold element on the dialog */}
          <Button
            variant="gold"
            size="full"
            onClick={handleUpgrade}
            showArrow={false}
          >
            <Crown className="h-4 w-4" />
            Upgrade to Trader
          </Button>

          {/* Ghost / secondary dismiss */}
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2 text-xs text-ink-tertiary transition-colors hover:text-ink-secondary"
          >
            Maybe later
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { UpgradeLimitDialog };
export default UpgradeLimitDialog;
