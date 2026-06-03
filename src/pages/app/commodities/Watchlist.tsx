import { useState } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import { GlassCard, GlassTabs, EmptyState } from '@/pages/app/crypto/_shared/GlassUI';

const TABS = [
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'open-trades', label: 'My Open Trades' },
];

const EMPTY_STATES: Record<string, { title: string; description: string }> = {
  watchlist: {
    title: 'Commodity Watchlist',
    description: 'Your personal commodity watchlist — track selected contracts with price alerts and quick-access charts. Coming soon.',
  },
  'open-trades': {
    title: 'My Open Trades',
    description: 'Open commodity positions linked to your trade journal — P&L, entry price, contract expiry and journal notes in one view. Coming soon.',
  },
};

export default function CommoditiesWatchlist() {
  const [tab, setTab] = useState(TABS[0].id);
  const state = EMPTY_STATES[tab];
  return (
    <PageTemplate
      title="My Desk"
      description="Your commodity watchlist and open trades linked to your journal."
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
