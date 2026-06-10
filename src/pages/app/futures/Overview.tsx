import { Card, Eyebrow } from '@/components/ds/Card';
import { Activity, AlertTriangle, BarChart3, Layers } from 'lucide-react';
import { FuturesPageShell, SectionHeader } from './_shared/FuturesPageShell';
import { marketGroups, regimeChecklist } from './_shared/data';

export default function FuturesOverview() {
  return (
    <FuturesPageShell
      title="Futures Overview"
      description="A licensed-data-safe futures command center for contract context, regime reading, and risk preparation."
    >
      <div className="grid grid-cols-1 gap-ds-4 xl:grid-cols-[1.5fr_1fr]">
        <Card variant="glass" padding="spacious" className="space-y-ds-5">
          <div className="flex items-start justify-between gap-ds-4">
            <div className="space-y-ds-2">
              <Eyebrow>Futures desk</Eyebrow>
              <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-ink-primary">
                Built for futures preparation without redistributing exchange market data.
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-ink-secondary">
                Use this section to understand contract mechanics, term structure, positioning logic, and sizing before live data licensing
                is activated. The product stays useful now without pretending to be a free CME terminal.
              </p>
            </div>
            <div className="hidden rounded-xl border border-gold-border bg-gold-primary/10 p-ds-4 text-gold-primary md:block">
              <BarChart3 className="h-8 w-8" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-ds-3 md:grid-cols-3">
            {[
              { icon: Layers, label: 'Contract specs', value: '10 core contracts', detail: 'Tick value, multiplier, micro pairs.' },
              { icon: Activity, label: 'Market structure', value: 'Curves & spreads', detail: 'Contango, backwardation, rollover.' },
              { icon: AlertTriangle, label: 'Compliance mode', value: 'No live feed', detail: 'No CME quotes, charts, DOM, or OI pulls.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} padding="compact" className="space-y-ds-2">
                  <Icon className="h-4 w-4 text-gold-primary" />
                  <p className="text-xs uppercase tracking-[1.5px] text-ink-tertiary">{item.label}</p>
                  <p className="font-mono text-lg text-ink-primary tabular-nums">{item.value}</p>
                  <p className="text-xs leading-5 text-ink-secondary">{item.detail}</p>
                </Card>
              );
            })}
          </div>
        </Card>

        <Card padding="spacious" className="space-y-ds-4">
          <SectionHeader
            eyebrow="Daily prep"
            title="Regime checklist"
            description="The exact questions a futures trader should answer before caring about a chart."
          />
          <div className="space-y-ds-2">
            {regimeChecklist.map((item, index) => (
              <div key={item} className="flex gap-ds-3 rounded-[12px] border border-border-ds-subtle bg-surface-2 p-ds-3">
                <span className="font-mono text-sm text-gold-primary tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                <p className="text-sm text-ink-secondary">{item}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card padding="spacious" className="space-y-ds-4">
        <SectionHeader
          eyebrow="Asset map"
          title="Futures groups"
          description="A practical map of what moves each futures complex. No prices are displayed here."
        />
        <div className="grid grid-cols-1 gap-ds-3 md:grid-cols-2 xl:grid-cols-3">
          {marketGroups.map((group) => (
            <Card key={group.title} padding="compact" className="space-y-ds-3">
              <div className="flex items-start justify-between gap-ds-3">
                <div>
                  <h3 className="font-semibold text-ink-primary">{group.title}</h3>
                  <p className="mt-ds-1 font-mono text-xs text-gold-primary">{group.focus}</p>
                </div>
                <div className="h-2 w-2 rounded-sm bg-gold-primary" />
              </div>
              <p className="text-sm leading-6 text-ink-secondary">{group.driver}</p>
            </Card>
          ))}
        </div>
      </Card>
    </FuturesPageShell>
  );
}
