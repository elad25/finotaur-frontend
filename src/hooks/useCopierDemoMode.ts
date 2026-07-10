import { useLocation } from 'react-router-dom';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';
import { useJournalPreview } from '@/contexts/JournalPreviewContext';

/**
 * Demo mode = viewing a Copier route with ZERO active broker connections,
 * OR the user is on the free-tier preview (JournalFeatureGate) — free users
 * always see the copier mock, even the rare one who has a locked broker
 * connection but is still gated to a preview. Mirrors useJournalDemoMode's
 * shape/intent: consumers fill the Copy Trading dashboard with sample data.
 * `isPreview` defaults to false outside the gate (context default), so this
 * hook stays safe to call from ungated surfaces too.
 */
export function useCopierDemoMode(): { isDemo: boolean; isLoading: boolean } {
  const location = useLocation();
  const isCopierRoute = location.pathname.startsWith('/app/copy-trade');
  const { isPreview } = useJournalPreview();

  const { connections, isLoading } = useBrokerConnections({ active: true });

  return {
    isDemo: isCopierRoute && !isLoading && (connections.length === 0 || isPreview),
    isLoading,
  };
}
