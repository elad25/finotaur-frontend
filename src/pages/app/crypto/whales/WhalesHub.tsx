// src/pages/app/crypto/whales/WhalesHub.tsx
// Whale Tracker hub — 5-tab signal container. Phase 1 ships Whale Trades.
// Stream is owned at hub level so all tabs can share the same SSE connection.

import { useNavigate, useParams } from 'react-router-dom';
import { PageTemplate } from '@/components/PageTemplate';
import { GlassCard, GlassTabs, EmptyState } from '../_shared/GlassUI';
import { useWhaleStream } from '@/hooks/crypto/useWhaleStream';
import { StreamStatusPill } from './components/StreamStatusPill';
import { WhaleTradesPanel } from './panels/WhaleTradesPanel';
import { OrderWallsPanel } from './panels/OrderWallsPanel';

const VALID = ['trades', 'walls', 'oi', 'liquidations', 'onchain'] as const;
type SignalId = (typeof VALID)[number];

const TABS = [
  { id: 'trades',       label: '🧱 Block Trades' },
  { id: 'walls',        label: '🧱 Order Book Walls' },
  { id: 'oi',           label: '📊 Open Interest' },
  { id: 'liquidations', label: '💧 Liquidations' },
  { id: 'onchain',      label: '⛓️ On-chain' },
];

export default function WhalesHub() {
  const navigate = useNavigate();
  const { signal } = useParams<{ signal: string }>();
  const active: SignalId = (VALID as readonly string[]).includes(signal ?? '')
    ? (signal as SignalId)
    : 'trades';

  // Single SSE connection owned at hub level — shared across tabs
  const stream = useWhaleStream({ enabled: true });

  return (
    <PageTemplate
      title="Block Trades"
      description="Large institutional block trades, order-book walls, open interest and liquidations — live"
    >
      <div className="space-y-4">
        {/* Tabs row with stream status pill */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <GlassTabs
            tabs={TABS}
            active={active}
            onChange={id => navigate(`/app/crypto/whales/${id}`)}
          />
          <StreamStatusPill status={stream.status} />
        </div>
        {active === 'trades' ? (
          <WhaleTradesPanel stream={stream} />
        ) : active === 'walls' ? (
          <OrderWallsPanel />
        ) : (
          <GlassCard>
            <EmptyState
              icon={active === 'oi' ? '📊' : active === 'liquidations' ? '💧' : '⛓️'}
              title="Coming soon"
              description="This signal ships in the next phase."
            />
          </GlassCard>
        )}
      </div>
    </PageTemplate>
  );
}
