// src/pages/app/ai/copilot/components/BrokerConnectCard.tsx
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Link2 } from 'lucide-react';

export function BrokerConnectCard() {
  const handleConnect = () => {
    alert('Interactive Brokers integration is in development. Stay tuned!');
  };

  return (
    <Card className="flex items-center justify-between gap-ds-4">
      <div className="flex items-center gap-ds-4">
        <div className="w-11 h-11 rounded-[12px] bg-gold-primary/10 border border-gold-primary/20 flex items-center justify-center">
          <Link2 className="w-5 h-5 text-gold-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink-primary">Connect your broker</h3>
          <p className="text-xs text-ink-secondary mt-0.5">
            Sync your live holdings, P&amp;L, and performance automatically.
          </p>
        </div>
      </div>
      <Button variant="gold" size="sm" onClick={handleConnect} showArrow={false}>
        Connect broker
      </Button>
    </Card>
  );
}
