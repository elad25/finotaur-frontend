import { Activity, AlertTriangle, BarChart3, Layers } from 'lucide-react';
import { GlassCard, GlassStat } from '@/pages/app/crypto/_shared/GlassUI';
import { FuturesPageShell, SectionHeader } from './_shared/FuturesPageShell';
import { marketGroups, regimeChecklist } from './_shared/data';

export default function FuturesOverview() {
  return (
    <FuturesPageShell
      title="Futures Overview"
      description="A licensed-data-safe futures command center for contract context, regime reading, and risk preparation."
    >
      {/* Top stat row — mirrors crypto Overview grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2">
        <GlassStat
          label="Contract specs"
          value="10 core"
          subValue="Tick value, multiplier, micro pairs"
          icon={<Layers className="h-4 w-4" />}
        />
        <GlassStat
          label="Market structure"
          value="Curves & spreads"
          subValue="Contango, backwardation, rollover"
          icon={<Activity className="h-4 w-4" />}
        />
        <GlassStat
          label="Compliance mode"
          value="No live feed"
          subValue="No CME quotes, charts, DOM, or OI"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        {/* Hero card */}
        <GlassCard glow="amber" padding="lg" className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider font-medium text-amber-400/70">Futures desk</p>
              <h2 className="max-w-3xl text-2xl sm:text-3xl font-semibold leading-tight text-white/90">
                Built for futures preparation without redistributing exchange market data.
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-white/50">
                Use this section to understand contract mechanics, term structure, positioning logic, and sizing before live data licensing
                is activated. The product stays useful now without pretending to be a free CME terminal.
              </p>
            </div>
            <div className="hidden rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-amber-400 md:block flex-shrink-0">
              <BarChart3 className="h-8 w-8" />
            </div>
          </div>
        </GlassCard>

        {/* Regime checklist */}
        <GlassCard padding="lg" className="space-y-4">
          <SectionHeader
            eyebrow="Daily prep"
            title="Regime checklist"
            description="The exact questions a futures trader should answer before caring about a chart."
          />
          <div className="space-y-2">
            {regimeChecklist.map((item, index) => (
              <div
                key={item}
                className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 hover:bg-white/[0.05] transition-colors"
              >
                <span className="font-mono text-sm text-amber-400 tabular-nums flex-shrink-0">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="text-sm text-white/60 leading-5">{item}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Asset map */}
      <GlassCard padding="lg" className="space-y-4">
        <SectionHeader
          eyebrow="Asset map"
          title="Futures groups"
          description="A practical map of what moves each futures complex. No prices are displayed here."
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {marketGroups.map((group) => (
            <GlassCard key={group.title} hover padding="sm" className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white/90">{group.title}</h3>
                  <p className="mt-1 font-mono text-xs text-amber-400">{group.focus}</p>
                </div>
                <div className="h-2 w-2 rounded-sm bg-amber-400 mt-1 flex-shrink-0" />
              </div>
              <p className="text-sm leading-6 text-white/50">{group.driver}</p>
            </GlassCard>
          ))}
        </div>
      </GlassCard>
    </FuturesPageShell>
  );
}
