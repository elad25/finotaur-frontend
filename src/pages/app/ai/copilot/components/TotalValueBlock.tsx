// src/pages/app/ai/copilot/components/TotalValueBlock.tsx
import { Price } from '@/components/ds/NumberDisplay';
import { TimeRange } from '../hooks/usePortfolioMockData';
import { cn } from '@/lib/utils';

interface Props {
  totalValue: number;
  changeAbs: number;
  changePercent: number;
  range: TimeRange;
}

const RANGE_LABEL: Record<TimeRange, string> = {
  '1M': '1 month change',
  '3M': '3 month change',
  '6M': '6 month change',
  'YTD': 'Year to date change',
  '1Y': '1 year change',
  'ALL': 'All time change',
};

function changeColor(v: number) {
  if (v > 0) return 'text-emerald-400';
  if (v < 0) return 'text-num-negative';
  return 'text-ink-secondary';
}

const fmtCurrency = (v: number) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtPercent = (v: number) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}%`;

export function TotalValueBlock({ totalValue, changeAbs, changePercent, range }: Props) {
  return (
    <div className="mb-ds-5">
      <div className="text-xs uppercase tracking-wider text-ink-tertiary mb-ds-2">
        Total assets
      </div>
      <div className="flex items-baseline gap-ds-4 flex-wrap">
        <div className="text-4xl font-mono tabular-nums text-ink-primary font-semibold tracking-[-0.5px]">
          <Price value={totalValue} format="currency" size="display" />
        </div>
        <div className="flex items-center gap-ds-2 text-sm">
          <span className={cn('font-mono tabular-nums', changeColor(changeAbs))}>
            {fmtCurrency(changeAbs)}
          </span>
          <span className="text-ink-tertiary">/</span>
          <span className={cn('font-mono tabular-nums', changeColor(changePercent))}>
            {fmtPercent(changePercent)}
          </span>
          <span className="text-ink-tertiary ml-ds-2">{RANGE_LABEL[range]}</span>
        </div>
      </div>
    </div>
  );
}
