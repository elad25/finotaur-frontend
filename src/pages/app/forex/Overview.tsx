// ============================================================
// src/pages/app/forex/Overview.tsx
// FOREX Overview hub — gold-on-black FINOTAUR design.
// Assembles DXYHero, SessionClock, CurrencyStrengthMeter,
// and TopMovers into a single responsive dashboard.
// ============================================================

import { PageTemplate } from '@/components/PageTemplate';
import { useForexHeatmap, useForexStrength } from './_shared/hooks';
import DXYHero from './components/DXYHero';
import SessionClock from './components/SessionClock';
import CurrencyStrengthMeter from './components/CurrencyStrengthMeter';
import TopMovers from './components/TopMovers';
import AIMarketBrief from './components/AIMarketBrief';

export default function ForexOverview() {
  const { data: heatmap, loading: hLoading } = useForexHeatmap();
  const { data: movers,  loading: mLoading } = useForexStrength();

  return (
    <PageTemplate
      title="Forex Overview"
      description="Live FX market dashboard — dollar index, currency strength, and today's movers."
    >
      <div className="space-y-4">
        {/* Hero band — DXY index */}
        <DXYHero />

        {/* AI Market Brief — just below hero, above session clock */}
        <AIMarketBrief />

        {/* Session clock + strength meter side by side on wide screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SessionClock />
          <CurrencyStrengthMeter
            pairs={heatmap?.pairs}
            loading={hLoading}
          />
        </div>

        {/* Top movers — full width */}
        <TopMovers data={movers} loading={mLoading} />
      </div>
    </PageTemplate>
  );
}
