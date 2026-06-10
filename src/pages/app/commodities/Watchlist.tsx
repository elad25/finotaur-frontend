// ============================================================
// Commodities My Desk — Watchlist & Open Trades page
// Tabs: Watchlist (manual symbols + live prices),
//       My Open Trades (commodity/futures OPEN positions)
// ============================================================

import { useState, useRef, KeyboardEvent } from 'react';
import { PageTemplate } from '@/components/PageTemplate';
import {
  GlassCard,
  GlassTabs,
  EmptyState,
  GlassTableSkeleton,
} from '@/pages/app/crypto/_shared/GlassUI';
import { useTrades, type Trade } from '@/hooks/useTradesData';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useCommoditiesSnapshot } from '@/pages/app/commodities/_shared/hooks';
import { COMMODITY_UNITS } from '@/pages/app/commodities/_shared/constants';

// ── Constants ────────────────────────────────────────────────

const TABS = [
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'open-trades', label: 'My Open Trades' },
];

// ── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatPrice(price: number | null | undefined): string {
  if (price == null) return '—';
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function isCommodityTrade(t: Trade): boolean {
  const ac = (t.asset_class ?? '').toLowerCase();
  return t.outcome === 'OPEN' && (ac === 'futures' || ac === 'commodities');
}

// ── Sub-components ────────────────────────────────────────────

function OpenTradesTab() {
  const { data: allTrades, isLoading } = useTrades();

  if (isLoading) return <GlassTableSkeleton rows={5} />;

  const openTrades = (allTrades ?? []).filter(isCommodityTrade);

  if (openTrades.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="No open commodity positions"
        description="Log trades in your Journal to see them here."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {['Symbol', 'Side', 'Entry', 'Qty', 'Unrealized P&L', 'Opened'].map(h => (
              <th
                key={h}
                className="pb-2 px-2 text-left text-[11px] uppercase tracking-wider text-white/30 font-medium"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {openTrades.map(t => {
            const pnl = t.pnl ?? null;
            const pnlColor =
              pnl == null ? 'text-white/50' : pnl >= 0 ? 'text-white/90' : 'text-red-400';
            const pnlText =
              pnl == null
                ? '—'
                : `${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`;

            return (
              <tr
                key={t.id}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-2.5 px-2 font-mono font-semibold text-white/90">
                  {t.symbol}
                </td>
                <td className="py-2.5 px-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                      t.side === 'LONG'
                        ? 'bg-white/[0.08] text-white/80'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {t.side}
                  </span>
                </td>
                <td className="py-2.5 px-2 font-mono text-white/70">
                  {formatPrice(t.entry_price)}
                </td>
                <td className="py-2.5 px-2 font-mono text-white/60">
                  {t.quantity}
                </td>
                <td className={`py-2.5 px-2 font-mono font-semibold ${pnlColor}`}>
                  {pnlText}
                </td>
                <td className="py-2.5 px-2 text-white/40 text-xs">
                  {formatDate(t.open_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WatchlistTab() {
  const { manualItems, addManual, remove, loading, saving, atLimit, limit } = useWatchlist();
  const { data: snapshot } = useCommoditiesSnapshot();
  const [inputValue, setInputValue] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build a lookup from the snapshot: symbol → CommodityQuote
  const priceMap = new Map(
    (snapshot?.commodities ?? []).map(q => [q.symbol.toUpperCase(), q]),
  );

  async function handleAdd() {
    const ticker = inputValue.trim().toUpperCase();
    if (!ticker) return;
    setAddError(null);
    const result = await addManual(ticker);
    if (result.ok) {
      setInputValue('');
      inputRef.current?.focus();
    } else {
      if (result.reason === 'exists') setAddError(`${ticker} is already in your watchlist.`);
      else if (result.reason === 'limit') setAddError(`Watchlist limit (${limit}) reached.`);
      else if (result.reason === 'invalid') setAddError('Enter a valid ticker symbol.');
      else setAddError('Failed to add ticker. Please try again.');
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAdd();
  }

  if (loading) return <GlassTableSkeleton rows={4} />;

  return (
    <div className="space-y-4">
      {/* Add ticker */}
      <div className="flex gap-2 items-center">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => { setInputValue(e.target.value.toUpperCase()); setAddError(null); }}
          onKeyDown={handleKeyDown}
          placeholder="Add symbol (e.g. GC, WTI)"
          maxLength={12}
          disabled={atLimit || saving}
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-white/[0.18] disabled:opacity-40 transition-colors font-mono"
        />
        <button
          onClick={handleAdd}
          disabled={atLimit || saving || !inputValue.trim()}
          className="px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-sm text-white/70 hover:bg-white/[0.14] hover:text-white/90 disabled:opacity-30 transition-all font-medium"
        >
          {saving ? '...' : 'Add'}
        </button>
      </div>

      {atLimit && (
        <p className="text-xs text-amber-400/70">
          Watchlist limit ({limit}) reached. Remove a symbol to add another.
        </p>
      )}

      {addError && (
        <p className="text-xs text-red-400/80">{addError}</p>
      )}

      {/* Watchlist rows */}
      {manualItems.length === 0 ? (
        <EmptyState
          icon="👀"
          title="Your commodity watchlist is empty"
          description="Add a symbol above to start tracking it."
        />
      ) : (
        <div className="space-y-1.5">
          {manualItems.map(item => {
            const quote = priceMap.get(item.ticker);
            const meta = COMMODITY_UNITS[item.ticker];

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]"
              >
                {/* Ticker + name */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-mono font-semibold text-white/90">
                    {item.ticker}
                  </span>
                  {meta && (
                    <span className="ml-2 text-xs text-white/35">{meta.name}</span>
                  )}
                </div>

                {/* Live price */}
                {quote ? (
                  <div className="text-right flex-shrink-0 mr-2">
                    <p className="text-sm font-mono text-white/80">
                      {formatPrice(quote.price)}
                      {meta && <span className="ml-1 text-[10px] text-white/30">{meta.unit}</span>}
                    </p>
                    {quote.changePct != null && (
                      <p
                        className={`text-[11px] font-medium ${
                          quote.changePct >= 0 ? 'text-white/60' : 'text-red-400'
                        }`}
                      >
                        {quote.changePct >= 0 ? '+' : ''}
                        {quote.changePct.toFixed(2)}%
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-white/20 mr-2">No price data</span>
                )}

                {/* Remove */}
                <button
                  onClick={() => remove(item.ticker)}
                  disabled={saving}
                  className="text-white/20 hover:text-red-400/70 transition-colors text-sm disabled:opacity-30"
                  aria-label={`Remove ${item.ticker}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function CommoditiesWatchlist() {
  const [tab, setTab] = useState(TABS[0].id);

  return (
    <PageTemplate
      title="My Desk"
      description="Your commodity watchlist and open trades linked to your journal."
    >
      <div className="space-y-4">
        <GlassTabs tabs={TABS} active={tab} onChange={setTab} />

        <GlassCard>
          {tab === 'watchlist' && <WatchlistTab />}
          {tab === 'open-trades' && <OpenTradesTab />}
        </GlassCard>
      </div>
    </PageTemplate>
  );
}
