import { useMemo, useState } from 'react';
import { GlassCard, GlassStat } from '@/pages/app/crypto/_shared/GlassUI';
import { FuturesPageShell, SectionHeader } from './_shared/FuturesPageShell';
import { formatCurrency, futuresContracts } from './_shared/data';

export default function FuturesTools() {
  const [symbol, setSymbol] = useState('ES');
  const [entry, setEntry] = useState('5200');
  const [stop, setStop] = useState('5195');
  const [contracts, setContracts] = useState('1');

  const selected = futuresContracts.find((contract) => contract.symbol === symbol) ?? futuresContracts[0];

  const result = useMemo(() => {
    const entryValue = Number(entry);
    const stopValue = Number(stop);
    const contractCount = Number(contracts);
    const tickText = selected.tickSize.match(/[\d.]+/)?.[0];
    const tickSize = tickText ? Number(tickText) : 1;

    if (!Number.isFinite(entryValue) || !Number.isFinite(stopValue) || !Number.isFinite(contractCount) || tickSize <= 0) {
      return null;
    }

    const stopDistance = Math.abs(entryValue - stopValue);
    const ticks = stopDistance / tickSize;
    const risk = ticks * selected.tickValue * contractCount;

    return {
      stopDistance,
      ticks,
      risk,
    };
  }, [contracts, entry, selected, stop]);

  return (
    <FuturesPageShell
      title="Futures Calculators"
      description="Local risk and contract-sizing tools based on static contract specs. No market data connection required."
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Input card */}
        <GlassCard padding="lg" className="space-y-4">
          <SectionHeader
            eyebrow="Risk calculator"
            title="Translate points into dollars"
            description="This calculator uses static tick specs only. It does not place trades, read broker data, or pull quotes."
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-2 text-sm text-white/50">
              Contract
              <select
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 text-white/80 outline-none focus:border-amber-400/40 focus:bg-white/[0.06] transition-colors"
              >
                {futuresContracts.map((contract) => (
                  <option key={contract.symbol} value={contract.symbol} className="bg-[#0d0d0d]">
                    {contract.symbol} - {contract.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-white/50">
              Contracts
              <input
                value={contracts}
                onChange={(event) => setContracts(event.target.value)}
                inputMode="decimal"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 font-mono text-white/80 outline-none tabular-nums focus:border-amber-400/40 focus:bg-white/[0.06] transition-colors"
              />
            </label>
            <label className="space-y-2 text-sm text-white/50">
              Entry price
              <input
                value={entry}
                onChange={(event) => setEntry(event.target.value)}
                inputMode="decimal"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 font-mono text-white/80 outline-none tabular-nums focus:border-amber-400/40 focus:bg-white/[0.06] transition-colors"
              />
            </label>
            <label className="space-y-2 text-sm text-white/50">
              Stop price
              <input
                value={stop}
                onChange={(event) => setStop(event.target.value)}
                inputMode="decimal"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 font-mono text-white/80 outline-none tabular-nums focus:border-amber-400/40 focus:bg-white/[0.06] transition-colors"
              />
            </label>
          </div>
        </GlassCard>

        {/* Output card */}
        <GlassCard glow="amber" padding="lg" className="space-y-4">
          <SectionHeader
            eyebrow="Output"
            title={`${selected.symbol} — ${selected.name}`}
            description={`${selected.tickSize} / ${formatCurrency(selected.tickValue)} per tick.`}
          />

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <GlassStat
              label="Stop distance"
              value={result ? result.stopDistance.toFixed(2) : '—'}
              subValue="points"
            />
            <GlassStat
              label="Ticks at risk"
              value={result ? result.ticks.toFixed(1) : '—'}
              subValue="ticks"
            />
            <GlassStat
              label="Dollar risk"
              value={result ? formatCurrency(result.risk) : '—'}
              subValue="per position"
            />
          </div>

          <GlassCard padding="sm" className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-amber-400 font-medium">Sizing note</p>
            <p className="text-sm leading-6 text-white/40">
              Futures risk is nonlinear from the trader's point of view because each contract has a different multiplier.
              Always size from stop distance first, then decide whether the full contract or micro contract is appropriate.
            </p>
          </GlassCard>
        </GlassCard>
      </div>
    </FuturesPageShell>
  );
}
