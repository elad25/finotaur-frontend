import { PremiumFrame } from '../PremiumFrame';
import { PanelHeader } from './_shared';
import type { PortfolioSnapshot } from '../../hooks/usePortfolioData';

/**
 * Map IB AssetClass to a human-readable macro bucket. For now we group by asset
 * class because the IBRIT Activity report doesn't carry ticker→sector data; a
 * future enhancement could enrich equity holdings with sector lookups
 * (Polygon / IEX), but until then "Cash" / "Equities" / "Options" etc. is the
 * honest classification we can prove from the source data.
 */
function bucketSector(cls: string | undefined): string {
  const c = (cls || '').toUpperCase();
  if (c === 'STK' || c === 'WAR' || c === 'EQUITIES') return 'Equities';
  if (c === 'OPT' || c === 'FOP' || c === 'OPTIONS') return 'Options';
  if (c === 'FUT' || c === 'FUTURES') return 'Futures';
  if (c === 'BOND' || c === 'BONDS') return 'Bonds';
  if (c === 'CASH' || c === 'FOREX') return 'Cash';
  if (c === 'CMDTY' || c === 'COMMODITIES') return 'Commodities';
  return 'Other';
}

export function SectorExposurePanel({
  className,
  snapshot,
  isConnected,
}: {
  className?: string;
  snapshot: PortfolioSnapshot;
  isConnected: boolean;
}) {
  if (!isConnected) {
    return (
      <PremiumFrame className={`min-h-[210px] ${className}`}>
        <div className="p-5">
          <PanelHeader title="MACRO" action="VIEW ALL" actionTo="/app/ai/copilot/macro" />
          <div className="mt-4 flex min-h-[120px] items-center justify-center">
            <span className="text-[13px] text-ink-tertiary">Connect a broker to see your sector exposure</span>
          </div>
        </div>
      </PremiumFrame>
    );
  }

  const total = snapshot.totalValue || 1;
  const groups = new Map<string, number>();
  for (const h of snapshot.holdings) {
    const label = bucketSector(h.assetClass);
    groups.set(label, (groups.get(label) || 0) + h.marketValue);
  }
  let sectors: Array<[string, number]> = Array.from(groups.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, val]) => [label, (val / total) * 100]);
  if (sectors.length === 0) sectors = [['Other', 100]];

  // Bars scale so the largest sector fills the available width; tiny allocations stay visible.
  const maxPct = Math.max(...sectors.map((s) => s[1]), 1);

  return (
    <PremiumFrame className={`min-h-[210px] ${className}`}>
      <div className="p-5">
        <PanelHeader title="MACRO" action="VIEW ALL" actionTo="/app/ai/copilot/macro" />
        <div className="mt-4 space-y-3">
          {sectors.map(([name, value]) => (
            <div key={name} className="grid grid-cols-[1fr_130px_42px] items-center gap-3 text-[11px]">
              <span className="text-ink-secondary truncate">{name}</span>
              <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#9b7d22] to-[#f4d97b]"
                  style={{ width: `${Math.min(100, (value / maxPct) * 100)}%` }}
                />
              </div>
              <span className="font-mono text-ink-tertiary text-right">{value.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </PremiumFrame>
  );
}
