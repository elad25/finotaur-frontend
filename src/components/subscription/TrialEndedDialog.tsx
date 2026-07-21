// src/components/subscription/TrialEndedDialog.tsx
// =====================================================
// One-time-per-user modal shown when the user's app-granted trial has
// ended (account_type flipped back to 'free' by the daily cron, or the
// date-authoritative cron-lag guard already treats it as expired) OR the
// legacy journal-trial ended and the user is now on the free journal plan.
// Shown exactly once per user — tracked via a per-user localStorage key so
// it survives reloads but never nags on every visit.
// =====================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ds/Button';
import { useAuth } from '@/providers/AuthProvider';
import { useSubscription } from '@/hooks/useSubscription';

const ACK_KEY_PREFIX = 'finotaur_trial_ended_ack_';

export function TrialEndedDialog() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { limits, isTrialExpired, isFreeJournal, isLoading } = useSubscription();
  const [open, setOpen] = useState(false);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId || isLoading) return;
    if (typeof window === 'undefined') return;

    const ackKey = `${ACK_KEY_PREFIX}${userId}`;
    if (localStorage.getItem(ackKey) === '1') return;

    const trialJustEnded =
      (limits?.account_type === 'trial' && isTrialExpired) ||
      (!!limits?.trial_used && isFreeJournal);

    if (trialJustEnded) {
      setOpen(true);
    }
  }, [userId, isLoading, limits?.account_type, limits?.trial_used, isTrialExpired, isFreeJournal]);

  const acknowledge = () => {
    if (userId) {
      try {
        localStorage.setItem(`${ACK_KEY_PREFIX}${userId}`, '1');
      } catch {
        /* best-effort only */
      }
    }
    setOpen(false);
  };

  const handleUpgrade = () => {
    acknowledge();
    navigate('/app/upgrade');
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) acknowledge(); }}>
      <DialogContent
        className="max-w-md border text-white"
        style={{ backgroundColor: '#0F0F0F', borderColor: 'rgba(201,166,70,0.2)' }}
      >
        <DialogTitle className="text-xl font-bold text-white">
          Your trial has ended
        </DialogTitle>
        <DialogDescription className="text-sm text-zinc-400 leading-relaxed">
          You're now on the Free plan. Your data is safe: you keep your journal history,
          10 manual trades, and preview mode with sample data. Upgrade to reconnect your
          broker and pick up where you left off.
        </DialogDescription>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={acknowledge}>
            Continue on Free
          </Button>
          <Button variant="gold" onClick={handleUpgrade}>
            Upgrade now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TrialEndedDialog;
