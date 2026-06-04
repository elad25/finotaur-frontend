// ============================================================
// src/pages/app/forex/Pairs.tsx
// FOREX Major & Cross Pairs — sortable table, links to detail
// ============================================================

import { memo, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageTemplate } from '@/components/PageTemplate';
import { useForexHeatmap } from './_shared/hooks';
import { GlassCard, GlassTableSkeleton, SectionHeader, EmptyState } from '@/pages/app/crypto/_shared/GlassUI';
import type { ForexStrengthPair } from './_shared/types';
import { cn } from '@/lib/utils';

type SortKey = 'symbol' | 'price' | 'change' | 'chp';
type SortDir = 'asc' | 'desc';

/** Format pair symbol from "EURUSD" → "EUR/USD" */
function fmtPair(symbol: string): string {
  if (symbol.length === 6) return `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
  return symbol;
}

/** Format price with appropriate decimal places */
function fmtPrice(price: number, symbol: string): string {
  // JPY pairs use 2-3 decimal places; others use 5
  const isJpy = symbol.toUpperCase().includes('JPY');
  return price.toFixed(isJpy ? 3 : 5);
}

/** U+2212 minus for negatives */
function fmtChange(n: number, decimals = 5, isJpy = false): string {
  const d = isJpy ? 3 : decimals;
  const abs = Math.abs(n).toFixed(d);
  return n >= 0 ? `+${abs}` : `−${abs}`;
}

function fmtChp(n: number): string {
  const abs = Math.abs(n).toFixed(2);
  return n >= 0 ? `+${abs}%` : `−${abs}%`;
}

// ── Sort helpers ─────────────────────────────────────────────
function sortPairs(
  pairs: ForexStrengthPair[],
  key: SortKey,
  dir: SortDir,
): ForexStrengthPair[] {
  return [...pairs].sort((a, b) => {
    let diff: number;
    switch (key) {
      case 'symbol':  diff = a.symbol.localeCompare(b.symbol); break;
      case 'price':   diff = a.price - b.price; break;
      case 'change':  diff = a.change - b.change; break;
      case 'chp':     diff = a.chp - b.chp; break;
      default:        diff = 0;
    }
    return dir === 'asc' ? diff : -diff;
  });
}

// ── Sort header cell ─────────────────────────────────────────
const SortTh = memo(function SortTh({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={cn(
        'pb-2 font-medium cursor-pointer select-none hover:text-white/60 transition-colors',
        active ? 'text-white/70' : 'text-white/30',
        className,
      )}
    >
      {label}
      {active && (
        <span className="ml-1 text-white/40">{dir === 'asc' ? '↑' : '↓'}</span>
      )}
    </th>
  );
});

// ── Main page ────────────────────────────────────────────────
export default function ForexPairs() {
  const { data, loading } = useForexHeatmap();

  const [sortKey, setSortKey] = useState<SortKey>('chp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(
    () => (data?.pairs ? sortPairs(data.pairs, sortKey, sortDir) : []),
    [data, sortKey, sortDir],
  );

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <PageTemplate
      title="Major & Cross Pairs"
      description="Live rates across the major and cross currency pairs."
    >
      <GlassCard padding="md">
        <SectionHeader
          title="All Major Pairs"
          subtitle={data ? `${sorted.length} pairs · updated ${new Date(data.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Loading…'}
        />

        {loading && <GlassTableSkeleton rows={10} />}

        {!loading && sorted.length === 0 && (
          <EmptyState
            icon="💹"
            title="No pairs data"
            description="Live rates are unavailable right now. Please try again shortly."
          />
        )}

        {!loading && sorted.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[380px]">
              <thead>
                <tr className="uppercase tracking-wider border-b border-white/[0.06]">
                  <SortTh label="Pair"      sortKey="symbol" activeKey={sortKey} dir={sortDir} onSort={handleSort} className="text-left" />
                  <SortTh label="Price"     sortKey="price"  activeKey={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                  <SortTh label="Change"    sortKey="change" activeKey={sortKey} dir={sortDir} onSort={handleSort} className="text-right hidden sm:table-cell" />
                  <SortTh label="% Change"  sortKey="chp"    activeKey={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                  <th className="pb-2 text-right text-white/30 font-medium w-8 hidden sm:table-cell" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {sorted.map((pair) => {
                  const isJpy = pair.symbol.toUpperCase().includes('JPY');
                  const isUp = pair.chp >= 0;
                  const chpColor = isUp ? 'text-emerald-400' : 'text-red-400';
                  const changeColor = pair.change >= 0 ? 'text-emerald-400' : 'text-red-400';
                  const displaySymbol = fmtPair(pair.symbol);

                  return (
                    <tr
                      key={pair.symbol}
                      className="hover:bg-white/[0.025] transition-colors group"
                    >
                      <td className="py-2.5 pr-2">
                        <Link
                          to={`/app/forex/pair/${pair.symbol}`}
                          className="font-bold font-mono text-white/85 hover:text-white transition-colors group-hover:underline underline-offset-2"
                        >
                          {displaySymbol}
                        </Link>
                      </td>
                      <td className="py-2.5 text-right font-mono text-white/70">
                        {fmtPrice(pair.price, pair.symbol)}
                      </td>
                      <td className={`py-2.5 text-right font-mono hidden sm:table-cell ${changeColor}`}>
                        {fmtChange(pair.change, 5, isJpy)}
                      </td>
                      <td className={`py-2.5 text-right font-mono font-semibold ${chpColor}`}>
                        {fmtChp(pair.chp)}
                      </td>
                      <td className="py-2.5 text-right hidden sm:table-cell">
                        <Link
                          to={`/app/forex/pair/${pair.symbol}`}
                          className="text-white/20 hover:text-white/60 transition-colors text-[11px]"
                          aria-label={`View ${displaySymbol} details`}
                        >
                          →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </PageTemplate>
  );
}
