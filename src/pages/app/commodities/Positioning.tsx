import { useState } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { GlassCard, GlassTabs, EmptyState } from '@/pages/app/crypto/_shared/GlassUI';

const TABS = [
  { id: 'cot', label: 'COT Positioning' },
  { id: 'inventories', label: 'Inventories' },
  { id: 'term-structure', label: 'Term Structure' },
];

const EMPTY_STATES: Record<string, { title: string; description: string }> = {
  cot: {
    title: 'COT Positioning',
    description: 'CFTC speculator vs commercial net positioning — weekly Commitments of Traders report visualized as net longs/shorts for major commodity futures. Coming soon.',
  },
  inventories: {
    title: 'Inventory Reports',
    description: 'EIA crude oil and natural gas storage reports — actual vs expected draws and builds, with historical context and market reaction. Coming soon.',
  },
  'term-structure': {
    title: 'Futures Term Structure',
    description: 'Contango / backwardation curve and roll yield — front-month to deferred contract prices showing whether the market expects scarcity or surplus. Coming soon.',
  },
};

export default function CommoditiesPositioning() {
  const [tab, setTab] = useState(TABS[0].id);
  const state = EMPTY_STATES[tab];
  return (
    <PageTemplate
      title="Positioning & Supply"
      description="Trader positioning, government inventory data and futures term structure."
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
