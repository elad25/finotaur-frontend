import { useState } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { GlassCard, GlassTabs, EmptyState } from '@/pages/app/crypto/_shared/GlassUI';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'energy', label: 'Energy' },
  { id: 'metals', label: 'Metals' },
  { id: 'agriculture', label: 'Agriculture' },
  { id: 'indices', label: 'Indices' },
];

const EMPTY_STATES: Record<string, { title: string; description: string }> = {
  all: {
    title: 'All Commodities',
    description: 'Full commodities table — live prices, day range, contract month and technicals across all sectors. Coming soon.',
  },
  energy: {
    title: 'Energy Markets',
    description: 'Energy markets table — live prices, day range, contract month and technicals for crude oil, natural gas and refined products. Coming soon.',
  },
  metals: {
    title: 'Metals Markets',
    description: 'Metals markets table — spot and futures prices, day range and technicals for gold, silver, copper and other industrial metals. Coming soon.',
  },
  agriculture: {
    title: 'Agriculture Markets',
    description: 'Agriculture markets table — grain, oilseed and soft commodity prices, contract months and seasonal context. Coming soon.',
  },
  indices: {
    title: 'Commodity Indices',
    description: 'Broad commodity index prices and performance — BCOM, S&P GSCI and sector sub-indices. Coming soon.',
  },
};

export default function CommoditiesMarkets() {
  const [tab, setTab] = useState(TABS[0].id);
  const state = EMPTY_STATES[tab];
  return (
    <PageTemplate
      title="Commodities Markets"
      description="Prices, screener and per-commodity analysis across energy, metals and agriculture."
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
