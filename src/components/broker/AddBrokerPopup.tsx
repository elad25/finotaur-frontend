// src/components/broker/AddBrokerPopup.tsx
// ─────────────────────────────────────────────────────────────────────
// F2.5 — Compact "+ Add new connection" popup. shadcn Dialog with an
// internal `picker | form` swap. Picker shows real broker logos
// (with initials fallback via <img onError>); form step delegates to
// the existing TradovateConnectModal (rendered as a sibling at z-200,
// so the picker Dialog is hidden during the credentials flow — single
// modal at a time, single source of truth for OAuth/vault submission).
// IBKR is a direct redirect to its OAuth endpoint, matching the
// behaviour the old BrokerConnectionModal had.
// ─────────────────────────────────────────────────────────────────────

import { useState, lazy, Suspense } from 'react';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BROKER_CONFIGS, BrokerName } from '@/lib/brokers/types';
import { useAuth } from '@/providers/AuthProvider';

const TradovateConnectModal = lazy(() => import('@/components/TradovateConnectModal'));

const BORDER_LIGHT = 'rgba(255, 215, 0, 0.08)';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'picker' | 'form';

// ── Single broker logo with initials fallback ────────────────────────
function BrokerLogo({ broker }: { broker: BrokerName }) {
  const config = BROKER_CONFIGS[broker];
  const [errored, setErrored] = useState(false);

  if (errored || !config.logo) {
    return (
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-mono flex-shrink-0"
        style={{ background: `${config.color}20`, color: config.color }}
      >
        {config.displayName.substring(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div
      className="w-12 h-12 rounded-lg flex items-center justify-center bg-white/[0.04] p-1.5 flex-shrink-0"
      style={{ borderColor: BORDER_LIGHT }}
    >
      <img
        src={config.logo}
        alt={config.displayName}
        className="w-full h-full object-contain"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────
export default function AddBrokerPopup({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('picker');

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) setStep('picker');
    onOpenChange(newOpen);
  };

  const handlePickBroker = async (broker: BrokerName) => {
    if (broker === 'tradovate') {
      setStep('form');
      return;
    }
    if (broker === 'interactive_brokers' && user) {
      const { getIBAuthorizationUrl } = await import('@/lib/brokers/ib/ib-oauth');
      window.location.href = getIBAuthorizationUrl(user.id);
      return;
    }
    // Other brokers not implemented; the grid only renders available/beta.
  };

  const handleTradovateClose = () => {
    setStep('picker');
    onOpenChange(false);
  };

  // Show only brokers we can actually connect (excludes 'manual' + coming_soon).
  // IBKR ships as 'beta' today; will flip to 'available' in this same sprint
  // (Step 6) so the literal check below still catches it.
  const visibleBrokers = (Object.keys(BROKER_CONFIGS) as BrokerName[]).filter(
    (b) =>
      b !== 'manual' &&
      (BROKER_CONFIGS[b].status === 'available' || BROKER_CONFIGS[b].status === 'beta'),
  );

  return (
    <>
      <Dialog open={open && step === 'picker'} onOpenChange={handleOpenChange}>
        <DialogContent
          className="bg-[#141414] border rounded-[20px] max-w-md p-0 gap-0 overflow-hidden"
          style={{ borderColor: BORDER_LIGHT }}
        >
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(201,166,70,0.1)' }}
              >
                <Plus className="w-4 h-4 text-[#C9A646]" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-[#F4F4F4] text-sm font-semibold">
                  Add New Connection
                </DialogTitle>
                <DialogDescription className="text-[10px] text-[#A0A0A0] font-light">
                  Choose a broker to connect.
                </DialogDescription>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {visibleBrokers.map((b) => {
                const config = BROKER_CONFIGS[b];
                return (
                  <button
                    key={b}
                    onClick={() => handlePickBroker(b)}
                    className="bg-[#0A0A0A] border rounded-[14px] p-3 text-left transition-all duration-200 hover:border-[#C9A646]/30 cursor-pointer flex flex-col items-start gap-2.5"
                    style={{ borderColor: BORDER_LIGHT }}
                  >
                    <BrokerLogo broker={b} />
                    <div className="w-full min-w-0">
                      <div className="text-[#F4F4F4] text-[12px] font-medium truncate">
                        {config.displayName}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tradovate credentials form — sibling overlay, z-200, owns its own backdrop */}
      {step === 'form' && (
        <Suspense fallback={null}>
          <TradovateConnectModal
            initialStep="credentials"
            onClose={handleTradovateClose}
          />
        </Suspense>
      )}
    </>
  );
}
