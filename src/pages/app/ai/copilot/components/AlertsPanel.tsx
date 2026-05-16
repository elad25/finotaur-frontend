// src/pages/app/ai/copilot/components/AlertsPanel.tsx
import { TrendingUp, AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Alert {
  icon: React.ElementType;
  text: string;
  timeAgo: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

const ALERTS: Alert[] = [
  {
    icon: TrendingUp,
    text: 'NVDA breaking 52-week high',
    timeAgo: '2 min ago',
    sentiment: 'positive',
  },
  {
    icon: AlertTriangle,
    text: 'Portfolio drawdown −2.3% (1h)',
    timeAgo: '14 min ago',
    sentiment: 'negative',
  },
  {
    icon: Zap,
    text: 'VIX spiked above 20',
    timeAgo: '1 hour ago',
    sentiment: 'negative',
  },
];

function sentimentColor(s: Alert['sentiment']) {
  if (s === 'positive') return 'text-emerald-400';
  if (s === 'negative') return 'text-num-negative';
  return 'text-ink-secondary';
}

function sentimentIconBg(s: Alert['sentiment']) {
  if (s === 'positive') return 'bg-emerald-500/10';
  if (s === 'negative') return 'bg-red-500/10';
  return 'bg-white/5';
}

function sentimentIconColor(s: Alert['sentiment']) {
  if (s === 'positive') return 'text-emerald-400';
  if (s === 'negative') return 'text-num-negative';
  return 'text-ink-tertiary';
}

export function AlertsPanel() {
  return (
    <div className="relative rounded-[16px] border border-gold-primary/20 bg-[#0b0a07]/90 overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/70 to-transparent" />
      {/* Header */}
      <div className="px-ds-4 py-ds-3 border-b border-gold-primary/12 flex items-center gap-ds-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-primary opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-primary" />
        </span>
        <h2 className="text-sm font-semibold text-ink-primary">Live Alerts</h2>
      </div>

      {/* Alert cards — horizontal 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-ds-3 p-ds-3">
        {ALERTS.map((alert, i) => {
          const Icon = alert.icon;
          return (
            <div
              key={i}
              className="flex items-start gap-ds-2 rounded-[12px] border border-white/10 bg-white/[0.035] px-ds-3 py-ds-3 hover:border-gold-primary/25 hover:bg-gold-primary/[0.04] transition-colors"
            >
              <div className={cn('mt-0.5 rounded-md p-1.5 shrink-0', sentimentIconBg(alert.sentiment))}>
                <Icon className={cn('w-3.5 h-3.5', sentimentIconColor(alert.sentiment))} />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className={cn('text-xs font-medium leading-snug', sentimentColor(alert.sentiment))}>
                  {alert.text}
                </span>
                <span className="text-[10px] text-ink-tertiary">{alert.timeAgo}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
