import { Card, Eyebrow } from '@/components/ds/Card';
import { FuturesPageShell, SectionHeader } from './_shared/FuturesPageShell';
import { curvePlaybooks } from './_shared/data';

export default function FuturesCurves() {
  return (
    <FuturesPageShell
      active="curves"
      title="Futures Curves"
      description="Term-structure playbooks for reading contango, backwardation, spreads, and rollover risk without live exchange data."
    >
      <div className="grid grid-cols-1 gap-ds-4 xl:grid-cols-[1fr_1fr]">
        <Card padding="spacious" className="space-y-ds-4">
          <SectionHeader
            eyebrow="Curve anatomy"
            title="Read the shape before the signal"
            description="Curves explain whether the market is paying for immediacy, storage, financing, scarcity, or future uncertainty."
          />
          <div className="space-y-ds-3">
            {curvePlaybooks.map((item) => (
              <Card key={item.title} padding="compact" className="space-y-ds-2">
                <div className="flex items-center justify-between gap-ds-3">
                  <h3 className="font-semibold text-ink-primary">{item.title}</h3>
                  <span className="rounded-md border border-gold-border px-ds-2 py-ds-1 text-xs text-gold-primary">
                    Structure
                  </span>
                </div>
                <p className="text-sm text-ink-primary">{item.shape}</p>
                <p className="text-sm leading-6 text-ink-secondary">{item.read}</p>
                <p className="text-xs leading-5 text-ink-tertiary">{item.watch}</p>
              </Card>
            ))}
          </div>
        </Card>

        <Card variant="glass" padding="spacious" className="space-y-ds-5">
          <SectionHeader
            eyebrow="Visual model"
            title="Curve states"
            description="Illustrative only. This is a shape model, not a feed-backed futures curve."
          />
          <div className="space-y-ds-4">
            {[
              { label: 'Backwardation', bars: ['w-full', 'w-10/12', 'w-8/12', 'w-7/12'] },
              { label: 'Flat', bars: ['w-10/12', 'w-10/12', 'w-10/12', 'w-10/12'] },
              { label: 'Contango', bars: ['w-7/12', 'w-8/12', 'w-10/12', 'w-full'] },
            ].map((state) => (
              <div key={state.label} className="space-y-ds-2 rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-4">
                <Eyebrow>{state.label}</Eyebrow>
                <div className="space-y-ds-2">
                  {state.bars.map((bar, index) => (
                    <div key={`${state.label}-${index}`} className="flex items-center gap-ds-3">
                      <span className="w-10 font-mono text-xs text-ink-tertiary tabular-nums">M{index + 1}</span>
                      <div className="h-3 flex-1 rounded-sm bg-surface-2">
                        <div className={`h-3 rounded-sm bg-gold-primary/70 ${bar}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </FuturesPageShell>
  );
}
