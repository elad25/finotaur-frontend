// src/components/onboarding/ConnectBrokerNudge.tsx
// =====================================================
// One-time modal nudging a fresh app-trial user (zero broker connections)
// to connect a broker right after onboarding, so their 14-day trial fills
// with real data instead of sitting empty.
//
// Trigger: finishOnboarding() (onboardingFlags.ts) sets the
// CONNECT_NUDGE_PENDING_KEY localStorage flag. This component consumes the
// flag once on mount (inside ProtectedAppLayout) — as soon as subscription
// + broker-connection data have loaded, it decides whether to show, then
// clears the flag unconditionally so it never re-triggers.
// =====================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ds/Button';
import { useSubscription } from '@/hooks/useSubscription';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import { CONNECT_NUDGE_PENDING_KEY } from './onboardingFlags';

export function ConnectBrokerNudge() {
  const navigate = useNavigate();
  const { isAppTrial, isLoading: isSubLoading } = useSubscription();
  const { connections, isLoading: isBrokerLoading } = useBrokerConnections();
  const [open, setOpen] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (resolved) return;
    if (typeof window === 'undefined') return;

    if (localStorage.getItem(CONNECT_NUDGE_PENDING_KEY) !== '1') {
      setResolved(true);
      return;
    }

    // Wait until both queries have settled before deciding — otherwise a
    // still-loading broker-connections count (0 by default) would falsely
    // look like "zero connections" for every user.
    if (isSubLoading || isBrokerLoading) return;

    localStorage.removeItem(CONNECT_NUDGE_PENDING_KEY);
    setResolved(true);

    if (isAppTrial && connections.length === 0) {
      setOpen(true);
    }
  }, [resolved, isSubLoading, isBrokerLoading, isAppTrial, connections.length]);

  const handleConnect = () => {
    setOpen(false);
    // ConnectBrokerNudge is mounted at the layout level (ProtectedAppLayout),
    // outside the Journal Overview page's local popup state — navigate there
    // with a query flag that Overview.tsx consumes to auto-open AddBrokerPopup.
    navigate('/app/journal/overview?connect_broker=1');
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-md border text-white"
        style={{ backgroundColor: '#0F0F0F', borderColor: 'rgba(201,166,70,0.2)' }}
      >
        <DialogTitle className="text-xl font-bold text-white">
          14 days of full access. Make them count.
        </DialogTitle>
        <DialogDescription className="text-sm text-zinc-400 leading-relaxed">
          Connect your broker now. Your trades sync automatically, and every screen
          fills with your real data: Leak Detector, Shadow, Revenge Radar, and more.
        </DialogDescription>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            I'll do it later
          </Button>
          <Button variant="gold" showArrow={false} onClick={handleConnect}>
            <Link2 className="h-4 w-4" />
            Connect broker
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ConnectBrokerNudge;
