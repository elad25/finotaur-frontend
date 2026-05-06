import { Card, Eyebrow } from '@/components/ds/Card';
import { Change } from '@/components/ds/NumberDisplay';
import type { ForexQuote } from './types';

const G8 = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'NZD'] as const;
type Currency = (typeof G8)[number];

interface Props {
  quotes: ForexQuote[];
  loading?: boolean;
  errorMessage?: string | null;
}

interface CurrencyScore {
  currency: Currency;
  rawSum: number;
  count: number;
  averageChp: number;
  score: number;
}

function splitPair(symbol: string): [string, string] | null {
  if (symbol.length !== 6) return null;
  return [symbol.slice(0, 3), symbol.slice(3)];
}

function computeStrength(quotes: ForexQuote[]): CurrencyScore[] {
  const totals = new Map<Currency, { sum: number; count: number }>();
  G8.forEach((c) => totals.set(c, { sum: 0, count: 0 }));

  for (const q of quotes) {
    const parts = splitPair(q.symbol.toUpperCase());
    if (!parts) continue;
    const [base, quote] = parts;
    if (G8.includes(base as Currency)) {
      const t = totals.get(base as Currency)!;
      t.sum += q.chp;
      t.count += 1;
    }
    if (G8.includes(quote as Currency)) {
      const t = totals.get(quote as Currency)!;
      t.sum += -q.chp;
      t.count += 1;
    }
  }

  const enriched: Array<Omit<CurrencyScore, 'score'>> = G8.map((c) => {
    const t = totals.get(c)!;
    const avg = t.count > 0 ? t.sum / t.count : 0;
    return { currency: c, rawSum: t.sum, count: t.count, averageChp: avg };
  });

  const max = Math.max(...enriched.map((e) => Math.abs(e.averageChp)));
  return enriched
    .map<CurrencyScore>((e) => ({
      ...e,
      score: max > 0 ? 50 + (e.averageChp / max) * 50 : 50,
    }))
    .sort((a, b) => b.score - a.score);
}

export default function CurrencyStrengthMeter({ quotes, loading, errorMessage }: Props) {
  const scores = computeStrength(quotes);
  const hasData = quotes.length > 0;

  return (
    <Card className="h-full">
      <div className="flex flex-col gap-ds-4 h-full">
        <div className="flex items-baseline justify-between">
          <Eyebrow>Currency Strength</Eyebrow>
          <span className="font-sans text-[10px] uppercase tracking-[1.5px] text-ink-tertiary">G8 · 1D</span>
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
          <div className="flex flex-col gap-ds-2 flex-1">
            {scores.map((s) => {
              const isNegative = s.averageChp < 0;
              const widthPct = Math.max(2, Math.min(100, Math.abs(s.score - 50) * 2));
              const fromCenter = isNegative ? `right: 50%; width: ${widthPct / 2}%;` : `left: 50%; width: ${widthPct / 2}%;`;
              return (
                <div key={s.currency} className="flex items-center gap-ds-3">
                  <span className="font-mono text-[12px] font-medium text-ink-primary tabular-nums w-[36px]">
                    {s.currency}
                  </span>
                  <div className="relative flex-1 h-[8px] rounded-[4px] bg-surface-1 border-[0.5px] border-border-ds-subtle overflow-hidden">
                    <div className="absolute inset-y-0 left-1/2 w-[1px] bg-border-ds-default" aria-hidden />
                    <div
                      className={
                        isNegative
                          ? 'absolute inset-y-0 bg-num-negative opacity-80 rounded-[4px]'
                          : 'absolute inset-y-0 bg-gold-primary opacity-80 rounded-[4px]'
                      }
                      style={(() => {
                        const half = widthPct / 2;
                        return isNegative
                          ? { right: '50%', width: `${half}%` }
                          : { left: '50%', width: `${half}%` };
                      })()}
                      data-from-center={fromCenter}
                      aria-hidden
                    />
                  </div>
                  <div className="w-[60px] text-right">
                    <Change value={s.averageChp} format="percent" decimals={2} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-[10px] text-ink-tertiary tracking-[1px] uppercase">
          Score = avg daily % across pairs (sign-flipped on quote-side)
        </div>
      </div>
    </Card>
  );
}
