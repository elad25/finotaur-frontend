import { GlassCard } from '@/pages/app/crypto/_shared/GlassUI';
import { FuturesPageShell, SectionHeader } from './_shared/FuturesPageShell';
import { curvePlaybooks } from './_shared/data';

export default function FuturesCurves() {
  return (
    <FuturesPageShell
      title="Futures Curves"
      description="Term-structure playbooks for reading contango, backwardation, spreads, and rollover risk without live exchange data."
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
        {/* Curve playbooks */}
        <GlassCard padding="lg" className="space-y-4">
          <SectionHeader
            eyebrow="Curve anatomy"
            title="Read the shape before the signal"
            description="Curves explain whether the market is paying for immediacy, storage, financing, scarcity, or future uncertainty."
          />
          <div className="space-y-3">
            {curvePlaybooks.map((item) => (
              <GlassCard key={item.title} hover padding="sm" className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-white/90">{item.title}</h3>
                  <span className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[10px] uppercase tracking-wider text-amber-400 whitespace-nowrap">
                    Structure
                  </span>
                </div>
                <p className="text-sm text-white/80">{item.shape}</p>
                <p className="text-sm leading-6 text-white/50">{item.read}</p>
                <p className="text-xs leading-5 text-white/30">{item.watch}</p>
              </GlassCard>
            ))}
          </div>
        </GlassCard>

        {/* Visual model */}
        <GlassCard glow="amber" padding="lg" className="space-y-5">
          <SectionHeader
            eyebrow="Visual model"
            title="Curve states"
            description="Illustrative only. This is a shape model, not a feed-backed futures curve."
          />
          <div className="space-y-4">
            {[
              { label: 'Backwardation', bars: ['w-full', 'w-10/12', 'w-8/12', 'w-7/12'] },
              { label: 'Flat', bars: ['w-10/12', 'w-10/12', 'w-10/12', 'w-10/12'] },
              { label: 'Contango', bars: ['w-7/12', 'w-8/12', 'w-10/12', 'w-full'] },
            ].map((state) => (
              <div
                key={state.label}
                className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
              >
                <p className="text-[11px] uppercase tracking-wider font-medium text-amber-400/70">
                  {state.label}
                </p>
                <div className="space-y-2">
                  {state.bars.map((bar, index) => (
                    <div key={`${state.label}-${index}`} className="flex items-center gap-3">
                      <span className="w-10 font-mono text-xs text-white/30 tabular-nums">M{index + 1}</span>
                      <div className="h-3 flex-1 rounded-sm bg-white/[0.06]">
                        <div className={`h-3 rounded-sm bg-amber-400/60 ${bar}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </FuturesPageShell>
  );
}
