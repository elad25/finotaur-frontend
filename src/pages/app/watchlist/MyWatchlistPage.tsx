// src/pages/app/watchlist/MyWatchlistPage.tsx
// ═══════════════════════════════════════════════════════════════
// My Watch List — two-group view: "From Your Portfolio" and "My Watch List".
// Uses useWatchlist() for CRUD and useBulkQuotes() for live prices.
// FREE plan is capped at 20 tickers; shows upgrade prompt when at limit.
// ═══════════════════════════════════════════════════════════════

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Plus, Loader2 } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useBulkQuotes } from '@/hooks/useMarketData';
import { Price, Change } from '@/components/ds/NumberDisplay';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { WatchlistItem } from '@/lib/watchlist/types';

// ── Capacity meter ─────────────────────────────────────────────

function CapacityMeter({
  count,
  limit,
  atLimit,
}: {
  count: number;
  limit: number;
  atLimit: boolean;
}) {
  const displayLimit = limit === Infinity || !Number.isFinite(limit) ? '∞' : String(limit);
  return (
    <div className="flex items-center gap-3">
      <span className={cn('text-sm font-medium tabular-nums', atLimit ? 'text-num-negative' : 'text-ink-secondary')}>
        {count} / {displayLimit} tickers
      </span>
      {atLimit && Number.isFinite(limit) && (
        <Link
          to="/app/plans"
          className="text-xs font-medium text-gold-primary border border-gold-border rounded-md px-2 py-0.5 hover:bg-gold-primary/10 transition-colors"
        >
          Upgrade to track more
        </Link>
      )}
    </div>
  );
}

// ── Add-ticker row ─────────────────────────────────────────────

function AddTickerRow({
  atLimit,
  onAdd,
  saving,
}: {
  atLimit: boolean;
  onAdd: (ticker: string) => Promise<void>;
  saving: boolean;
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    const trimmed = input.trim().toUpperCase();
    if (!trimmed) return;
    await onAdd(trimmed);
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value.toUpperCase())}
        onKeyDown={handleKeyDown}
        placeholder="e.g. AAPL"
        disabled={atLimit || saving}
        className={cn(
          'w-32 h-8 px-2 text-sm font-medium uppercase',
          'bg-surface-1 border border-border-ds-subtle rounded-md',
          'text-ink-primary placeholder:text-ink-tertiary',
          'focus:outline-none focus:border-gold-primary transition-colors',
          'disabled:opacity-40 disabled:cursor-not-allowed',
        )}
      />
      <Button
        variant="gold"
        size="sm"
        showArrow={false}
        disabled={atLimit || saving || !input.trim()}
        onClick={handleAdd}
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Plus className="w-3.5 h-3.5" />
        )}
        Add
      </Button>
    </div>
  );
}

// ── Ticker table row ───────────────────────────────────────────

interface QuoteMap {
  [symbol: string]: {
    price: number;
    changePercent: number;
  };
}

function TickerRow({
  item,
  quoteMap,
  onRemove,
  saving,
}: {
  item: WatchlistItem;
  quoteMap: QuoteMap;
  onRemove: (ticker: string) => void;
  saving: boolean;
}) {
  const q = quoteMap[item.ticker];

  return (
    <tr className="border-b border-border-ds-subtle last:border-0 group hover:bg-surface-2/50 transition-colors">
      <td className="py-2.5 px-3 text-sm font-semibold text-ink-primary w-24">
        {item.ticker}
      </td>
      <td className="py-2.5 px-3 text-sm text-right">
        {q ? (
          <Price value={q.price} size="small" />
        ) : (
          <span className="text-ink-tertiary">—</span>
        )}
      </td>
      <td className="py-2.5 px-3 text-sm text-right">
        {q ? (
          <Change value={q.changePercent} format="percent" />
        ) : (
          <span className="text-ink-tertiary">—</span>
        )}
      </td>
      <td className="py-2.5 px-3 text-right">
        <button
          aria-label={`Remove ${item.ticker} from watch list`}
          disabled={saving}
          onClick={() => onRemove(item.ticker)}
          className={cn(
            'p-1 rounded text-ink-tertiary opacity-0 group-hover:opacity-100 transition-opacity',
            'hover:text-num-negative hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed',
          )}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ── Group section ──────────────────────────────────────────────

function WatchlistGroup({
  title,
  items,
  quoteMap,
  onRemove,
  saving,
}: {
  title: string;
  items: WatchlistItem[];
  quoteMap: QuoteMap;
  onRemove: (ticker: string) => void;
  saving: boolean;
}) {
  return (
    <Card variant="default" padding="compact" className="space-y-3">
      <h2 className="text-xs font-medium tracking-[1.2px] uppercase text-ink-secondary px-1">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-ink-tertiary px-1 py-2">No tickers yet.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-ds-subtle">
              <th className="text-left text-xs text-ink-tertiary font-medium pb-1.5 px-3 w-24">Ticker</th>
              <th className="text-right text-xs text-ink-tertiary font-medium pb-1.5 px-3">Price</th>
              <th className="text-right text-xs text-ink-tertiary font-medium pb-1.5 px-3">Change</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <TickerRow
                key={item.id}
                item={item}
                quoteMap={quoteMap}
                onRemove={onRemove}
                saving={saving}
              />
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

// ── Loading skeleton ───────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="h-32 rounded-[12px] bg-surface-1 border border-border-ds-subtle" />
      ))}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────

function EmptyState() {
  return (
    <Card variant="default" padding="spacious" className="text-center space-y-2">
      <p className="text-base font-medium text-ink-primary">Your watch list is empty</p>
      <p className="text-sm text-ink-secondary">
        Add tickers below, or{' '}
        <Link to="/app/all-markets/portfolio" className="text-gold-primary underline hover:no-underline">
          create a portfolio
        </Link>{' '}
        to start tracking automatically.
      </p>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function MyWatchlistPage() {
  const {
    portfolioItems,
    manualItems,
    items,
    count,
    limit,
    atLimit,
    loading,
    saving,
    addManual,
    remove,
  } = useWatchlist();

  // All tickers for bulk price fetch
  const allTickers = items.map((i) => i.ticker);
  const { quotes } = useBulkQuotes(allTickers);

  // Build a quick-access quote map by symbol
  const quoteMap: QuoteMap = {};
  for (const q of quotes) {
    quoteMap[q.symbol] = { price: q.price, changePercent: q.changePercent };
  }

  const handleAddManual = async (ticker: string) => {
    const result = await addManual(ticker);
    if (!result.ok) {
      if (result.reason === 'limit') {
        toast({
          title: 'Watch List limit reached',
          description: 'Your FREE plan tracks up to 20 tickers. Upgrade to add more.',
        });
      } else if (result.reason === 'exists') {
        toast({
          title: 'Already in your watch list',
          description: `${ticker} is already being tracked.`,
        });
      }
    }
  };

  const handleRemove = async (ticker: string) => {
    await remove(ticker);
  };

  const hasItems = portfolioItems.length > 0 || manualItems.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-ink-primary">Watch List</h1>
          <p className="text-sm text-ink-secondary mt-0.5">
            Track live prices for your favourite tickers.
          </p>
        </div>
        <CapacityMeter count={count} limit={limit} atLimit={atLimit} />
      </div>

      {/* Add-ticker input */}
      <AddTickerRow atLimit={atLimit} onAdd={handleAddManual} saving={saving} />

      {/* Body */}
      {loading ? (
        <LoadingSkeleton />
      ) : !hasItems ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          <WatchlistGroup
            title="From Your Portfolio"
            items={portfolioItems}
            quoteMap={quoteMap}
            onRemove={handleRemove}
            saving={saving}
          />
          <WatchlistGroup
            title="My Watch List"
            items={manualItems}
            quoteMap={quoteMap}
            onRemove={handleRemove}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
}
