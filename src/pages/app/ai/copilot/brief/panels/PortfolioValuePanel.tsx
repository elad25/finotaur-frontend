import type { ReactNode } from 'react';
import { Eye } from 'lucide-react';
import { Change, Price } from '@/components/ds/NumberDisplay';
import { PremiumFrame } from '../PremiumFrame';
import type { PortfolioSnapshot, TimeRange } from '../../hooks/usePortfolioData';

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">{label}</p>
      <div className="mt-2 text-sm leading-none">{value}</div>
      {sub && <div className="mt-1 text-xs leading-none">{sub}</div>}
    </div>
  );
}

function MiniReturn({ changePercent }: { changePercent?: number }) {
  const display = changePercent ?? 0;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">ALL TIME RETURN</p>
      <p className="mt-2 text-sm leading-none">
        <Change value={display} />
      </p>
      <svg viewBox="0 0 120 28" className="mt-2 h-7 w-28 text-gold-primary">
        <path d="M0 22L10 18L19 20L28 13L37 16L47 8L56 11L65 6L75 13L84 10L94 14L104 7L120 10" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M0 22L10 18L19 20L28 13L37 16L47 8L56 11L65 6L75 13L84 10L94 14L104 7L120 10V28H0Z" fill="currentColor" opacity="0.12" />
      </svg>
    </div>
  );
}

export function PortfolioValuePanel({
  className,
  range,
  snapshot,
  isConnected,
}: {
  className?: string;
  range: TimeRange;
  snapshot: PortfolioSnapshot;
  isConnected: boolean;
}) {
  if (!isConnected) {
    return (
      <PremiumFrame className={`min-h-[260px] ${className}`}>
        <div className="p-5 h-full flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-eyebrow uppercase text-ink-tertiary">TOTAL PORTFOLIO VALUE</p>
            <Eye className="h-3.5 w-3.5 text-ink-tertiary" />
          </div>
          <div className="flex flex-1 items-center justify-center">
            <span className="text-[13px] text-ink-tertiary">Connect a broker to see your portfolio value</span>
          </div>
        </div>
      </PremiumFrame>
    );
  }

  // Sum all CASH-class holdings to derive cash balance.
  // assetClass is carried on Holding when sourced from IBRIT; absent on mock holdings.
  const cashBalance = snapshot.holdings
    .filter((h) => h.assetClass === 'CASH')
    .reduce((sum, h) => sum + h.marketValue, 0);
  // Buying power = cash balance for cash-only accounts.
  // TODO: when margin data is available from IB account summary, add margin here.
  const buyingPower = cashBalance;

  return (
    <PremiumFrame className={`min-h-[260px] ${className}`}>
      <div className="p-5 h-full grid grid-rows-[1fr_auto]">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-eyebrow uppercase text-ink-tertiary">TOTAL PORTFOLIO VALUE</p>
            <Eye className="h-3.5 w-3.5 text-ink-tertiary" />
          </div>
          <Price
            value={snapshot.totalValue}
            size="display"
            className="mt-5 block whitespace-nowrap bg-gradient-to-b from-gold-bright via-gold-primary to-gold-deep bg-clip-text text-[48px] font-normal leading-none text-transparent"
          />
          <div className="mt-6 grid grid-cols-2 gap-5">
            <Stat
              label="24H CHANGE"
              value={<span className="text-ink-tertiary">—</span>}
              sub={null}
            />
            <MiniReturn changePercent={snapshot.changePercent} />
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-gold-primary/12 mt-6 pt-5">
          <Stat label="CASH BALANCE" value={<Price value={cashBalance} size="small" />} />
          <Stat label="BUYING POWER" value={<Price value={buyingPower} size="small" />} />
        </div>
        <div className="absolute right-4 top-4 text-[10px] text-gold-primary/70">{range}</div>
      </div>
    </PremiumFrame>
  );
}
