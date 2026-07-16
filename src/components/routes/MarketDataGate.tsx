// src/components/routes/MarketDataGate.tsx
// =====================================================
// 🔒 MARKET DATA GATE — route-level gate for the Trading Arena's
// "connect live market data" flow.
// =====================================================
// Allowed when the user has EITHER a paid Journal subscription OR a paid,
// active platform-only plan — Market Data is a platform-tier capability,
// not a Journal-tier one, so either paid surface should unlock it.
//
// Does NOT touch copy-trade behavior/gates — this is a distinct concept
// (live market-data feed for the Trading Arena charts/DOM/footprint), not
// the Trade Copier's own subscription checks.
// =====================================================

import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketDataEntitled } from '@/lib/marketDataEntitlement';
import { RouteSkeleton } from '@/components/ds/RouteSkeleton';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';

interface MarketDataGateProps {
  children: ReactNode;
}

export function MarketDataGate({ children }: MarketDataGateProps) {
  const navigate = useNavigate();
  const { entitled, isLoading } = useMarketDataEntitled();

  // Loading — reuse the same fallback other gated routes use so the
  // transition never flashes an unstyled/blank frame.
  if (isLoading) {
    return <RouteSkeleton />;
  }

  if (entitled) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#08080a] px-4">
      <Card variant="featured" padding="spacious" className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-bold text-zinc-100">Live Market Data</h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Connect your own real-time futures feed to the Trading Arena. Available on any paid plan.
        </p>
        <Button variant="gold" onClick={() => navigate('/app/upgrade')}>
          Upgrade
        </Button>
      </Card>
    </div>
  );
}

export default MarketDataGate;
