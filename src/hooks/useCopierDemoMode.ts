import { useLocation } from 'react-router-dom';
import { useBrokerConnections } from '@/hooks/brokers/useBrokerConnections';

/**
 * Demo mode = viewing a Copier route with ZERO active broker connections.
 * Mirrors useJournalDemoMode's shape/intent: consumers fill the Copy Trading
 * dashboard with sample data so a brand-new user can see how it works before
 * connecting a real account. Flips off automatically the moment their first
 * broker connection lands.
 */
export function useCopierDemoMode(): { isDemo: boolean; isLoading: boolean } {
  const location = useLocation();
  const isCopierRoute = location.pathname.startsWith('/app/copy-trade');

  const { connections, isLoading } = useBrokerConnections({ active: true });

  return {
    isDemo: isCopierRoute && !isLoading && connections.length === 0,
    isLoading,
  };
}
