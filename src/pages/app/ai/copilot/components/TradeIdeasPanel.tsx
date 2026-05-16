import { useState } from 'react';
import { Card } from '@/components/ds/Card';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'short' | 'long' | 'macro';

interface Idea {
  ticker: string;
  company: string;
  horizon: string;
  title: string;
  thesis: string;
  score: number;
}

const IDEAS: Record<Tab, Idea[]> = {
  short: [
    {
      ticker: 'NVDA',
      company: 'NVIDIA Corporation',
      horizon: 'AI / Technology',
      title: 'Breakout continuation play',
      thesis: 'Momentum indicators turning up while options flow shows aggressive call accumulation.',
      score: 92,
    },
    {
      ticker: 'META',
      company: 'Meta Platforms Inc.',
      horizon: 'Growth',
      title: 'Earnings gap fill',
      thesis: 'Rotation back into large-cap tech favors a tactical long while rates stabilize.',
      score: 88,
    },
    {
      ticker: 'SOXS',
      company: 'Direxion Daily Semiconductors',
      horizon: 'Hedge',
      title: 'Semi sector hedge',
      thesis: 'SOX index is approaching overbought levels while core semi exposure remains high.',
      score: 84,
    },
  ],
  long: [
    {
      ticker: 'BRK.B',
      company: 'Berkshire Hathaway',
      horizon: 'Long term',
      title: 'Value compounding machine',
      thesis: 'Cash optionality and high-quality operating earnings keep downside well protected.',
      score: 91,
    },
    {
      ticker: 'ASML',
      company: 'ASML Holding',
      horizon: 'AI infrastructure',
      title: 'EUV monopoly, secular AI tailwind',
      thesis: 'AI chip demand keeps advanced fab spending structurally supported.',
      score: 89,
    },
    {
      ticker: 'GLD',
      company: 'SPDR Gold Shares',
      horizon: 'Reserve asset',
      title: 'Gold re-rating thesis',
      thesis: 'Central bank accumulation and softer real yields support reserve allocation.',
      score: 83,
    },
  ],
  macro: [
    {
      ticker: 'TLT',
      company: '20+ Year Treasury Bond ETF',
      horizon: 'Rates',
      title: 'Duration trade',
      thesis: 'Long-end yields are pricing too few cuts as the Fed cycle approaches its turn.',
      score: 86,
    },
    {
      ticker: 'EEM',
      company: 'Emerging Markets ETF',
      horizon: 'Dollar cycle',
      title: 'EM rotation as dollar weakens',
      thesis: 'Emerging markets tend to outperform when the dollar trend breaks lower.',
      score: 82,
    },
    {
      ticker: 'XLE',
      company: 'Energy Select Sector SPDR',
      horizon: 'Supply squeeze',
      title: 'Structural underinvestment',
      thesis: 'Reduced capex leaves physical supply tight while majors return cash.',
      score: 80,
    },
  ],
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'short', label: 'Short-term' },
  { id: 'long', label: 'Long-term' },
  { id: 'macro', label: 'Macro' },
];

function OpportunityRow({ idea }: { idea: Idea }) {
  return (
    <div className="group relative overflow-hidden rounded-[12px] border border-gold-primary/12 bg-black/28 hover:border-gold-primary/40 hover:bg-gold-primary/[0.035] transition-all duration-200">
      <div className="absolute inset-y-3 left-0 w-px bg-gradient-to-b from-transparent via-gold-primary/60 to-transparent" />
      <div className="flex items-center gap-ds-3 p-ds-3">
        <div className="h-10 w-10 rounded-[10px] border border-gold-primary/20 bg-gold-primary/10 flex items-center justify-center text-[11px] font-mono font-bold text-gold-primary">
          {idea.ticker.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{idea.ticker}</span>
            <span className="rounded border border-gold-primary/20 bg-gold-primary/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-gold-primary">
              {idea.horizon}
            </span>
          </div>
          <p className="text-[11px] text-ink-tertiary truncate">{idea.company}</p>
          <p className="mt-2 text-xs text-ink-secondary leading-relaxed line-clamp-2">{idea.title}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[9px] uppercase tracking-[0.16em] text-ink-tertiary mb-1">AI score</p>
          <div className="h-9 w-9 rounded-full border border-gold-primary/45 bg-gold-primary/10 flex items-center justify-center font-mono text-xs text-gold-primary shadow-[0_0_18px_rgba(201,166,70,0.12)]">
            {idea.score}
          </div>
        </div>
      </div>
      <div className="border-t border-gold-primary/10 px-ds-3 py-ds-2 flex items-center justify-between">
        <span className="text-[11px] text-ink-tertiary truncate pr-3">{idea.thesis}</span>
        <span className="text-[11px] text-gold-primary/75 group-hover:text-gold-primary shrink-0">View</span>
      </div>
    </div>
  );
}

export function TradeIdeasPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('short');

  return (
    <Card className="relative overflow-hidden bg-[#0b0a07]/90 border-gold-primary/20 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-primary/70 to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between mb-ds-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold-primary/75">Top opportunities</p>
            <h2 className="text-base font-semibold text-ink-primary mt-1">Trade Ideas</h2>
            <p className="text-xs text-ink-tertiary mt-0.5">Ranked by Finotaur scanners</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider rounded text-gold-primary border border-gold-primary/30 bg-gold-primary/10">
            <Sparkles className="w-3 h-3" />
            AI ranked
          </span>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-[10px] bg-black/35 border border-gold-primary/15 mb-ds-4 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                activeTab === tab.id
                  ? 'bg-gold-primary/15 text-gold-primary'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-white/5',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-ds-2">
          {IDEAS[activeTab].map((idea) => (
            <OpportunityRow key={idea.ticker} idea={idea} />
          ))}
        </div>

        <button className="mt-ds-3 w-full rounded-[10px] border border-gold-primary/15 bg-gold-primary/8 px-ds-3 py-ds-3 text-xs font-semibold text-gold-primary hover:bg-gold-primary/12 transition-colors">
          View all opportunities
        </button>
      </div>
    </Card>
  );
}
