/**
 * Trading Arena — header broker-connect entry point.
 *
 * Reuses the exact same broker-connect building blocks the Journal dashboard
 * uses (Overview.tsx's openAddBrokerPopup): BrokerConnectionsPopover (list +
 * statuses + "Add connection") and AddBrokerPopup (the actual connect modal),
 * with the identical two-tier premium gating (FREE-plan users may not connect
 * at all; free/basic users are capped at 1 active connection). This is
 * UI-only reuse of existing components — no new data source and nothing here
 * touches Tradovate/NinjaTrader market-data APIs (see AddBrokerPopup.tsx and
 * DatabentoTradeSource.ts's compliance comments).
 *
 * The connections this reads/writes (`purpose: 'journal'`) are the SAME rows
 * AccountSelector's usePortfolios() surfaces in the header's account picker —
 * connecting here immediately populates that dropdown.
 *
 * Zero connections: the button opens AddBrokerPopup directly (skips the
 * popover — nothing to show yet). One+ connections: the button opens
 * BrokerConnectionsPopover instead, matching Overview.tsx's UX.
 */

import { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import BrokerConnectionsPopover from '@/components/broker/BrokerConnectionsPopover';
import AddBrokerPopup from '@/components/broker/AddBrokerPopup';
import { UpgradeLimitDialog, type UpgradeLimitReason } from '@/components/upgrade/UpgradeLimitDialog';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

export function ArenaBrokerConnect() {
  const location = useLocation();
  const { isFreeJournal, isPremium } = useSubscription();
  const { connections } = useBrokerConnections({ purpose: 'journal' });
  const hasConnections = connections.length > 0;

  const [showAddBroker, setShowAddBroker] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<UpgradeLimitReason>('broker-limit');

  // Same two-tier gating as Overview.tsx's openAddBrokerPopup.
  const openAddBroker = useCallback(() => {
    if (isFreeJournal) {
      setUpgradeReason('broker-free-locked');
      setShowUpgrade(true);
      return;
    }
    if (!isPremium && connections.length >= 1) {
      setUpgradeReason('broker-limit');
      setShowUpgrade(true);
      return;
    }
    setShowAddBroker(true);
  }, [isFreeJournal, isPremium, connections]);

  const triggerButton = (
    <button
      type="button"
      onClick={hasConnections ? undefined : openAddBroker}
      aria-label="Broker connections"
      className={cn(
        'flex items-center gap-1.5 h-7 rounded px-2 text-[11px] font-semibold transition-all duration-150 border',
        'text-[#707070] hover:text-[#C0C0C0] hover:bg-[rgba(255,255,255,0.04)] border-transparent',
      )}
    >
      <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
      Broker
    </button>
  );

  return (
    <>
      {hasConnections ? (
        <BrokerConnectionsPopover onAddConnection={openAddBroker}>
          {triggerButton}
        </BrokerConnectionsPopover>
      ) : (
        triggerButton
      )}

      <AddBrokerPopup
        open={showAddBroker}
        onOpenChange={setShowAddBroker}
        returnTo={location.pathname}
      />
      <UpgradeLimitDialog open={showUpgrade} onOpenChange={setShowUpgrade} reason={upgradeReason} />
    </>
  );
}
