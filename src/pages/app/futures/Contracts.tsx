import { Card } from '@/components/ds/Card';
import { FuturesPageShell, SectionHeader } from './_shared/FuturesPageShell';
import { formatCurrency, futuresContracts } from './_shared/data';

export default function FuturesContracts() {
  return (
    <FuturesPageShell
      title="Futures Contracts"
      description="Contract specifications, tick value, and risk context for the most common retail futures products."
    >
      <Card padding="spacious" className="space-y-ds-4">
        <SectionHeader
          eyebrow="Contract explorer"
          title="Know the instrument before the setup"
          description="Static reference specs only. Margin and live active-month data are intentionally not pulled here."
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[1.5px] text-ink-tertiary">
                <th className="border-b border-border-ds-subtle py-ds-3 pr-ds-4">Symbol</th>
                <th className="border-b border-border-ds-subtle py-ds-3 pr-ds-4">Contract</th>
                <th className="border-b border-border-ds-subtle py-ds-3 pr-ds-4">Group</th>
                <th className="border-b border-border-ds-subtle py-ds-3 pr-ds-4">Tick</th>
                <th className="border-b border-border-ds-subtle py-ds-3 pr-ds-4">Tick value</th>
                <th className="border-b border-border-ds-subtle py-ds-3 pr-ds-4">Micro</th>
                <th className="border-b border-border-ds-subtle py-ds-3">Risk note</th>
              </tr>
            </thead>
            <tbody>
              {futuresContracts.map((contract) => (
                <tr key={contract.symbol} className="text-ink-secondary">
                  <td className="border-b border-border-ds-subtle py-ds-4 pr-ds-4">
                    <div className="font-mono text-base font-semibold text-ink-primary tabular-nums">{contract.symbol}</div>
                    <div className="text-xs text-ink-tertiary">{contract.exchange}</div>
                  </td>
                  <td className="border-b border-border-ds-subtle py-ds-4 pr-ds-4">
                    <div className="font-medium text-ink-primary">{contract.name}</div>
                    <div className="text-xs text-ink-tertiary">{contract.contractSize}</div>
                  </td>
                  <td className="border-b border-border-ds-subtle py-ds-4 pr-ds-4">{contract.group}</td>
                  <td className="border-b border-border-ds-subtle py-ds-4 pr-ds-4 font-mono text-xs tabular-nums">{contract.tickSize}</td>
                  <td className="border-b border-border-ds-subtle py-ds-4 pr-ds-4 font-mono text-ink-primary tabular-nums">
                    {formatCurrency(contract.tickValue)}
                  </td>
                  <td className="border-b border-border-ds-subtle py-ds-4 pr-ds-4 font-mono text-xs text-gold-primary">
                    {contract.micro ?? 'N/A'}
                  </td>
                  <td className="border-b border-border-ds-subtle py-ds-4 leading-5">{contract.riskNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </FuturesPageShell>
  );
}
