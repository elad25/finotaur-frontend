import { useState } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import {
  GlassCard,
  GlassTabs,
  GlassStat,
  GlassTableSkeleton,
  EmptyState,
} from '@/pages/app/crypto/_shared/GlassUI';
import { useCommoditiesSnapshot } from './_shared/hooks';

type MacroTab = 'dxy' | 'real-yields' | 'breakevens' | 'correlations';

const TABS: { id: MacroTab; label: string }[] = [
  { id: 'dxy', label: 'Dollar (DXY)' },
  { id: 'real-yields', label: 'Real Yields' },
  { id: 'breakevens', label: 'Inflation Breakevens' },
  { id: 'correlations', label: 'Correlations' },
];

interface TabConfig {
  label: string;
  getValue: (m: { dxy: number | null; realYield10y: number | null; breakeven10y: number | null; nominal10y: number | null }) => string;
  explanation: string;
}

const TAB_CONFIG: Record<Exclude<MacroTab, 'correlations'>, TabConfig> = {
  dxy: {
    label: 'US Dollar Index (DXY)',
    getValue: m => m.dxy == null ? '—' : m.dxy.toFixed(2),
    explanation:
      'Broad trade-weighted US dollar index. A stronger dollar typically pressures commodity prices.',
  },
  'real-yields': {
    label: '10Y TIPS Real Yield',
    getValue: m => m.realYield10y == null ? '—' : `${m.realYield10y.toFixed(2)}%`,
    explanation:
      '10-year TIPS real yield. Higher real yields raise the opportunity cost of holding non-yielding commodities like gold.',
  },
  breakevens: {
    label: '10Y Breakeven Inflation',
    getValue: m => m.breakeven10y == null ? '—' : `${m.breakeven10y.toFixed(2)}%`,
    explanation:
      '10-year breakeven inflation. Rising breakevens often support commodity prices.',
  },
};

export default function CommoditiesMacro() {
  const [tab, setTab] = useState<MacroTab>('dxy');
  const { data, loading } = useCommoditiesSnapshot();

  return (
    <PageTemplate
      title="Macro Drivers"
      description="Why commodities move: the US dollar, real yields, inflation expectations and correlations."
    >
      <div className="space-y-4">
        <GlassTabs tabs={TABS} active={tab} onChange={id => setTab(id as MacroTab)} />

        <GlassCard>
          {tab === 'correlations' ? (
            <EmptyState
              icon="📊"
              title="Cross-driver correlations — coming soon."
              description="Rolling correlation matrix between commodities and macro drivers."
            />
          ) : loading ? (
            <GlassTableSkeleton rows={3} />
          ) : !data ? (
            <EmptyState title="Unable to load macro data" description="Please try again later." />
          ) : (() => {
            const cfg = TAB_CONFIG[tab as Exclude<MacroTab, 'correlations'>];
            const value = cfg.getValue(data.macro);
            return (
              <div className="space-y-4">
                <GlassStat
                  label={cfg.label}
                  value={value}
                  subValue={data.macro.asOf ? `as of ${data.macro.asOf}` : undefined}
                  className="max-w-xs"
                />
                <p className="text-sm text-white/50 leading-relaxed max-w-lg">
                  {cfg.explanation}
                </p>
              </div>
            );
          })()}
        </GlassCard>
      </div>
    </PageTemplate>
  );
}
