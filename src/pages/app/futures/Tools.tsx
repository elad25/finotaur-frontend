import { useMemo, useState } from 'react';
import { Card } from '@/components/ds/Card';
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
      <div className="grid grid-cols-1 gap-ds-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card padding="spacious" className="space-y-ds-4">
          <SectionHeader
            eyebrow="Risk calculator"
            title="Translate points into dollars"
            description="This calculator uses static tick specs only. It does not place trades, read broker data, or pull quotes."
          />

          <div className="grid grid-cols-1 gap-ds-3 md:grid-cols-2">
            <label className="space-y-ds-2 text-sm text-ink-secondary">
              Contract
              <select
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                className="w-full rounded-md border border-border-ds-default bg-surface-1 px-ds-3 py-ds-3 text-ink-primary outline-none focus:border-gold-primary"
              >
                {futuresContracts.map((contract) => (
                  <option key={contract.symbol} value={contract.symbol}>
                    {contract.symbol} - {contract.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-ds-2 text-sm text-ink-secondary">
              Contracts
              <input
                value={contracts}
                onChange={(event) => setContracts(event.target.value)}
                inputMode="decimal"
                className="w-full rounded-md border border-border-ds-default bg-surface-1 px-ds-3 py-ds-3 font-mono text-ink-primary outline-none tabular-nums focus:border-gold-primary"
              />
            </label>
            <label className="space-y-ds-2 text-sm text-ink-secondary">
              Entry price
              <input
                value={entry}
                onChange={(event) => setEntry(event.target.value)}
                inputMode="decimal"
                className="w-full rounded-md border border-border-ds-default bg-surface-1 px-ds-3 py-ds-3 font-mono text-ink-primary outline-none tabular-nums focus:border-gold-primary"
              />
            </label>
            <label className="space-y-ds-2 text-sm text-ink-secondary">
              Stop price
              <input
                value={stop}
                onChange={(event) => setStop(event.target.value)}
                inputMode="decimal"
                className="w-full rounded-md border border-border-ds-default bg-surface-1 px-ds-3 py-ds-3 font-mono text-ink-primary outline-none tabular-nums focus:border-gold-primary"
              />
            </label>
          </div>
        </Card>

        <Card variant="glass" padding="spacious" className="space-y-ds-4">
          <SectionHeader
            eyebrow="Output"
            title={`${selected.symbol} ${selected.name}`}
            description={`${selected.tickSize} / ${formatCurrency(selected.tickValue)} per tick.`}
          />

          <div className="grid grid-cols-1 gap-ds-3 md:grid-cols-3">
            <Metric label="Stop distance" value={result ? result.stopDistance.toFixed(2) : 'Invalid'} />
            <Metric label="Ticks at risk" value={result ? result.ticks.toFixed(1) : 'Invalid'} />
            <Metric label="Dollar risk" value={result ? formatCurrency(result.risk) : 'Invalid'} emphasized />
          </div>

          <Card padding="compact" className="space-y-ds-2">
            <p className="text-xs uppercase tracking-[1.5px] text-gold-primary">Sizing note</p>
            <p className="text-sm leading-6 text-ink-secondary">
              Futures risk is nonlinear from the trader's point of view because each contract has a different multiplier.
              Always size from stop distance first, then decide whether the full contract or micro contract is appropriate.
            </p>
          </Card>
        </Card>
      </div>
    </FuturesPageShell>
  );
}

function Metric({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="rounded-[12px] border border-border-ds-subtle bg-surface-1 p-ds-4">
      <p className="text-xs uppercase tracking-[1.5px] text-ink-tertiary">{label}</p>
      <p className={['mt-ds-2 font-mono text-2xl tabular-nums', emphasized ? 'text-gold-primary' : 'text-ink-primary'].join(' ')}>
        {value}
      </p>
    </div>
  );
}
