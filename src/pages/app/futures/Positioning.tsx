import { Card } from '@/components/ds/Card';
import { FuturesPageShell, SectionHeader } from './_shared/FuturesPageShell';
import { positioningFramework } from './_shared/data';

export default function FuturesPositioning() {
  return (
    <FuturesPageShell
      title="Futures Positioning"
      description="A COT-style framework for interpreting who may be carrying risk, without pulling or redistributing exchange data."
    >
      <div className="grid grid-cols-1 gap-ds-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card padding="spacious" className="space-y-ds-4">
          <SectionHeader
            eyebrow="Positioning map"
            title="Who is likely carrying the risk?"
            description="Use this framework with public CFTC COT reports or licensed positioning feeds. FINOTAUR does not fetch those reports on this page."
          />
          <div className="space-y-ds-3">
            {positioningFramework.map((item) => (
              <Card key={item.label} padding="compact" className="grid grid-cols-1 gap-ds-3 md:grid-cols-[180px_1fr]">
                <div>
                  <h3 className="font-semibold text-ink-primary">{item.label}</h3>
                  <p className="mt-ds-1 text-xs text-ink-tertiary">{item.role}</p>
                </div>
                <p className="text-sm leading-6 text-ink-secondary">{item.interpretation}</p>
              </Card>
            ))}
          </div>
        </Card>

        <Card variant="featured" padding="spacious" className="space-y-ds-4">
          <SectionHeader
            eyebrow="Open interest"
            title="How this replaces a raw OI table for now"
            description="The old Open Interest page implied live futures data. This version teaches interpretation while staying inside the license boundary."
          />
          <div className="space-y-ds-3 text-sm leading-6 text-ink-secondary">
            <p>
              Rising open interest with price extension can confirm participation, but it can also mark crowded continuation risk.
              Falling open interest can mean liquidation, not necessarily a cleaner trend.
            </p>
            <p>
              The product should only show actual OI, volume, and COT history after a licensed source is connected and attribution rules are confirmed.
            </p>
          </div>
          <div className="rounded-[12px] border border-border-ds-subtle bg-surface-2 p-ds-4">
            <p className="text-xs uppercase tracking-[1.5px] text-gold-primary">Implementation boundary</p>
            <p className="mt-ds-2 text-sm leading-6 text-ink-secondary">
              No endpoint, cron, scraper, or hidden Yahoo/CME pull was added. This page is static interpretation and product structure only.
            </p>
          </div>
        </Card>
      </div>
    </FuturesPageShell>
  );
}
