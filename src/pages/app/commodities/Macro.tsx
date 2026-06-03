import { useState } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { GlassCard, GlassTabs, EmptyState } from '@/pages/app/crypto/_shared/GlassUI';

const TABS = [
  { id: 'dxy', label: 'Dollar (DXY)' },
  { id: 'real-yields', label: 'Real Yields' },
  { id: 'breakevens', label: 'Inflation Breakevens' },
  { id: 'correlations', label: 'Correlations' },
];

const EMPTY_STATES: Record<string, { title: string; description: string }> = {
  dxy: {
    title: 'US Dollar (DXY)',
    description: 'DXY index level, trend and its historical relationship to commodity prices. A stronger dollar typically pressures commodity valuations. Coming soon.',
  },
  'real-yields': {
    title: 'Real Yields',
    description: '10-year TIPS real yield and its impact on gold and other commodities — lower real yields historically support commodity demand. Coming soon.',
  },
  breakevens: {
    title: 'Inflation Breakevens',
    description: '5- and 10-year inflation breakeven rates derived from TIPS vs nominal Treasuries — a key driver of commodity demand as inflation hedges. Coming soon.',
  },
  correlations: {
    title: 'Cross-Asset Correlations',
    description: 'Rolling correlation matrix between major commodities and macro drivers: DXY, real yields, equities and credit spreads. Coming soon.',
  },
};

export default function CommoditiesMacro() {
  const [tab, setTab] = useState(TABS[0].id);
  const state = EMPTY_STATES[tab];
  return (
    <PageTemplate
      title="Macro Drivers"
      description="Why commodities move: the US dollar, real yields, inflation expectations and correlations."
    >
      <div className="space-y-4">
        <GlassTabs tabs={TABS} active={tab} onChange={setTab} />
        <GlassCard>
          <EmptyState title={state.title} description={state.description} />
        </GlassCard>
      </div>
    </PageTemplate>
  );
}
