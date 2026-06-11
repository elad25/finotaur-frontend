import { GlassCard, GlassStat } from '@/pages/app/crypto/_shared/GlassUI';
import { Layers } from 'lucide-react';
import { FuturesPageShell, SectionHeader } from './_shared/FuturesPageShell';
import { formatCurrency, futuresContracts } from './_shared/data';

export default function FuturesContracts() {
  // Quick summary stats
  const groups = [...new Set(futuresContracts.map((c) => c.group))];
  const withMicro = futuresContracts.filter((c) => c.micro).length;

  return (
    <FuturesPageShell
      title="Futures Contracts"
      description="Contract specifications, tick value, and risk context for the most common retail futures products."
    >
      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <GlassStat
          label="Contracts"
          value={String(futuresContracts.length)}
          subValue="Core retail instruments"
          icon={<Layers className="h-4 w-4" />}
        />
        <GlassStat
          label="Asset groups"
          value={String(groups.length)}
          subValue={groups.slice(0, 3).join(', ')}
        />
        <GlassStat
          label="With micro"
          value={String(withMicro)}
          subValue="MES, MNQ, MGC, MCL…"
        />
        <GlassStat
          label="Data source"
          value="Static specs"
          subValue="No live feed required"
        />
      </div>

      <GlassCard padding="lg" className="space-y-4">
        <SectionHeader
          eyebrow="Contract explorer"
          title="Know the instrument before the setup"
          description="Static reference specs only. Margin and live active-month data are intentionally not pulled here."
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr>
                <th className="py-3 pr-4 text-[11px] uppercase tracking-wider text-white/40 font-medium border-b border-white/[0.06]">Symbol</th>
                <th className="py-3 pr-4 text-[11px] uppercase tracking-wider text-white/40 font-medium border-b border-white/[0.06]">Contract</th>
                <th className="py-3 pr-4 text-[11px] uppercase tracking-wider text-white/40 font-medium border-b border-white/[0.06]">Group</th>
                <th className="py-3 pr-4 text-[11px] uppercase tracking-wider text-white/40 font-medium border-b border-white/[0.06]">Tick</th>
                <th className="py-3 pr-4 text-[11px] uppercase tracking-wider text-white/40 font-medium border-b border-white/[0.06]">Tick value</th>
                <th className="py-3 pr-4 text-[11px] uppercase tracking-wider text-white/40 font-medium border-b border-white/[0.06]">Micro</th>
                <th className="py-3 text-[11px] uppercase tracking-wider text-white/40 font-medium border-b border-white/[0.06]">Risk note</th>
              </tr>
            </thead>
            <tbody>
              {futuresContracts.map((contract) => (
                <tr
                  key={contract.symbol}
                  className="hover:bg-white/[0.03] transition-colors"
                >
                  <td className="border-b border-white/[0.02] py-4 pr-4">
                    <div className="font-mono text-base font-semibold text-white/90 tabular-nums">{contract.symbol}</div>
                    <div className="text-xs text-white/30">{contract.exchange}</div>
                  </td>
                  <td className="border-b border-white/[0.02] py-4 pr-4">
                    <div className="font-medium text-white/80">{contract.name}</div>
                    <div className="text-xs text-white/30">{contract.contractSize}</div>
                  </td>
                  <td className="border-b border-white/[0.02] py-4 pr-4 text-white/50">{contract.group}</td>
                  <td className="border-b border-white/[0.02] py-4 pr-4 font-mono text-xs text-white/60 tabular-nums">{contract.tickSize}</td>
                  <td className="border-b border-white/[0.02] py-4 pr-4 font-mono text-white/90 tabular-nums">
                    {formatCurrency(contract.tickValue)}
                  </td>
                  <td className="border-b border-white/[0.02] py-4 pr-4 font-mono text-xs text-amber-400">
                    {contract.micro ?? <span className="text-white/20">N/A</span>}
                  </td>
                  <td className="border-b border-white/[0.02] py-4 leading-5 text-white/40 text-xs">{contract.riskNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </FuturesPageShell>
  );
}
