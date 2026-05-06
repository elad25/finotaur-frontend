import { Card, Eyebrow } from '@/components/ds/Card';
import { Price, Change } from '@/components/ds/NumberDisplay';
import type { ForexQuote } from './types';

interface Props {
  gainers: ForexQuote[];
  losers: ForexQuote[];
  loading?: boolean;
  errorMessage?: string | null;
  limit?: number;
}

function MoverRow({ q }: { q: ForexQuote }) {
  return (
    <div className="flex items-center justify-between gap-ds-3 py-ds-2 border-b-[0.5px] border-border-ds-subtle last:border-b-0">
      <div className="flex flex-col leading-tight">
        <span className="font-mono text-[12px] font-medium text-ink-primary tabular-nums">{q.symbol}</span>
        <span className="font-sans text-[10px] uppercase tracking-[1px] text-ink-tertiary">{q.name}</span>
      </div>
      <div className="flex flex-col items-end leading-tight gap-ds-1">
        <Price value={q.price} size="small" format="plain" decimals={q.symbol.includes('JPY') ? 3 : 5} />
        <Change value={q.chp} format="percent" decimals={2} />
      </div>
    </div>
  );
}

export default function TopMovers({ gainers, losers, loading, errorMessage, limit = 5 }: Props) {
  const top = gainers.slice(0, limit);
  const bottom = losers.slice(0, limit);
  const hasData = top.length > 0 || bottom.length > 0;

  return (
    <Card className="h-full">
      <div className="flex flex-col gap-ds-4 h-full">
        <div className="flex items-baseline justify-between">
          <Eyebrow>Top Movers</Eyebrow>
          <span className="font-sans text-[10px] uppercase tracking-[1.5px] text-ink-tertiary">Polygon · 1D</span>
        </div>

        {loading && !hasData && (
          <div className="flex-1 flex items-center justify-center">
            <span className="font-mono text-num-small text-ink-tertiary">Loading…</span>
          </div>
        )}

        {errorMessage && !hasData && (
          <div className="flex-1 flex items-center text-num-small text-num-negative">Error: {errorMessage}</div>
        )}

        {hasData && (
          <div className="grid grid-cols-2 gap-ds-4 flex-1">
            <div className="flex flex-col gap-ds-1">
              <div className="font-sans text-[10px] uppercase tracking-[1.5px] text-ink-tertiary mb-ds-2">Gainers</div>
              {top.length > 0 ? top.map((q) => <MoverRow key={q.symbol} q={q} />) : (
                <span className="text-num-small text-ink-tertiary">None</span>
              )}
            </div>
            <div className="flex flex-col gap-ds-1">
              <div className="font-sans text-[10px] uppercase tracking-[1.5px] text-ink-tertiary mb-ds-2">Losers</div>
              {bottom.length > 0 ? bottom.map((q) => <MoverRow key={q.symbol} q={q} />) : (
                <span className="text-num-small text-ink-tertiary">None</span>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
