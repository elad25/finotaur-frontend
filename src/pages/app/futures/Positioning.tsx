import { GlassCard } from '@/pages/app/crypto/_shared/GlassUI';
import { FuturesPageShell, SectionHeader } from './_shared/FuturesPageShell';
import { positioningFramework } from './_shared/data';

export default function FuturesPositioning() {
  return (
    <FuturesPageShell
      title="Futures Positioning"
      description="A COT-style framework for interpreting who may be carrying risk, without pulling or redistributing exchange data."
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Positioning map */}
        <GlassCard padding="lg" className="space-y-4">
          <SectionHeader
            eyebrow="Positioning map"
            title="Who is likely carrying the risk?"
            description="Use this framework with public CFTC COT reports or licensed positioning feeds. FINOTAUR does not fetch those reports on this page."
          />
          <div className="space-y-3">
            {positioningFramework.map((item) => (
              <GlassCard key={item.label} hover padding="sm" className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr]">
                <div>
                  <h3 className="font-semibold text-white/90">{item.label}</h3>
                  <p className="mt-1 text-xs text-white/30">{item.role}</p>
                </div>
                <p className="text-sm leading-6 text-white/50">{item.interpretation}</p>
              </GlassCard>
            ))}
          </div>
        </GlassCard>

        {/* OI explanation */}
        <GlassCard glow="amber" padding="lg" className="space-y-4">
          <SectionHeader
            eyebrow="Open interest"
            title="How this replaces a raw OI table for now"
            description="The old Open Interest page implied live futures data. This version teaches interpretation while staying inside the license boundary."
          />
          <div className="space-y-3 text-sm leading-6 text-white/50">
            <p>
              Rising open interest with price extension can confirm participation, but it can also mark crowded continuation risk.
              Falling open interest can mean liquidation, not necessarily a cleaner trend.
            </p>
            <p>
              The product should only show actual OI, volume, and COT history after a licensed source is connected and attribution rules are confirmed.
            </p>
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4">
            <p className="text-[11px] uppercase tracking-wider text-amber-400 font-medium">Implementation boundary</p>
            <p className="mt-2 text-sm leading-6 text-white/40">
              No endpoint, cron, scraper, or hidden Yahoo/CME pull was added. This page is static interpretation and product structure only.
            </p>
          </div>
        </GlassCard>
      </div>
    </FuturesPageShell>
  );
}
