// src/pages/app/ai/copilot/components/CopilotHeader.tsx
import { Button } from '@/components/ds/Button';
import { TimeRange } from '../hooks/usePortfolioMockData';
import { cn } from '@/lib/utils';
import { CircleUserRound } from 'lucide-react';
import { useIBConnection } from '@/hooks/brokers/useIBConnection';

const RANGES: TimeRange[] = ['1M', '3M', '6M', 'YTD', '1Y', 'ALL'];

interface Props {
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
  onConnectBroker: () => void;
}

export function CopilotHeader({ range, onRangeChange, onConnectBroker }: Props) {
  const ib = useIBConnection();
  return (
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-ds-4 mb-ds-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold-primary/80">AI powered portfolio</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Finotaur <span className="text-gold-primary">Copilot</span>
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-ds-4 text-[11px] uppercase tracking-[0.16em] text-ink-tertiary">
          <span className="flex items-center gap-1.5">
            Market status <span className="h-1.5 w-1.5 rounded-full bg-gold-primary" /> Open
          </span>
          <span>S&amp;P 500 <span className="text-emerald-300">+0.72%</span></span>
          <span>Nasdaq <span className="text-emerald-300">+1.18%</span></span>
          <span>Dow Jones <span className="text-emerald-300">+0.33%</span></span>
        </div>
      </div>
      <div className="flex items-center gap-ds-3">
        <div className="flex items-center gap-1 p-1 rounded-[14px] bg-black/45 border border-gold-primary/15 shadow-[inset_0_0_18px_rgba(201,166,70,0.04)]">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                range === r
                  ? 'bg-gold-primary/18 text-gold-primary shadow-[0_0_18px_rgba(201,166,70,0.12)]'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-white/5'
              )}
            >
              {r}
            </button>
          ))}
        </div>
        {ib.isConnected ? (
          <button
            type="button"
            onClick={onConnectBroker}
            title={ib.lastSyncAt ? `Last sync: ${new Date(ib.lastSyncAt).toLocaleString()}` : 'Connected'}
            className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/15"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-white/90">Interactive Brokers</span>
            {ib.accountId && (
              <span className="font-mono text-emerald-200/80">{ib.accountId}</span>
            )}
          </button>
        ) : (
          <Button variant="gold" size="sm" onClick={onConnectBroker} className="shadow-[0_0_28px_rgba(201,166,70,0.25)]">
            Connect broker
          </Button>
        )}
        <div className="hidden xl:flex h-10 w-10 items-center justify-center rounded-full border border-gold-primary/35 text-gold-primary bg-gold-primary/8">
          <CircleUserRound className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
