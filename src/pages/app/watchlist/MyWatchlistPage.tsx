// src/pages/app/watchlist/MyWatchlistPage.tsx
// ═══════════════════════════════════════════════════════════════
// My Watch List — two-group view: "From Your Portfolio" and "My Watch List".
// Uses useWatchlist() for CRUD and usePortfolioQuotes() for live prices.
// FREE plan is capped at 20 tickers; shows upgrade prompt when at limit.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Plus, Loader2 } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { usePortfolioQuotes, type QuoteLite } from '@/hooks/usePortfolioQuotes';
import { Price, Change } from '@/components/ds/NumberDisplay';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { WatchlistItem } from '@/lib/watchlist/types';
import { TickerCell } from '@/components/portfolio/TickerCell';

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
          to="/app/upgrade"
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
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const handleAdd = async () => {
    const ticker = draft.trim().toUpperCase();
    if (!ticker) return;
    await onAdd(ticker);
    // Clear field after each add so the user can immediately type the next ticker.
    // If the page's handler determined we're now at limit, the row collapses below.
    setDraft('');
  };

  // Collapse the inline row if we've hit the limit after an add.
  const isOpen = open && !atLimit;

  if (!isOpen) {
    return (
      <button
        type="button"
        disabled={atLimit}
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-1.5 text-sm font-medium transition-colors mt-2',
          atLimit
            ? 'text-ink-tertiary cursor-not-allowed'
            : 'text-gold-primary hover:text-gold-primary/80',
        )}
      >
        <Plus className="w-3.5 h-3.5" />
        Add Ticker
      </button>
    );
  }

  return (
    // Do NOT use overflow-hidden here — TickerCell's dropdown must escape the row.
    <div className="flex items-center gap-2 mt-2">
      {/* TickerCell grows to fill available space; give it a capped width */}
      <div className="w-56">
        <TickerCell
          value={draft}
          onChange={setDraft}
          placeholder="Search ticker…"
        />
      </div>
      <Button
        variant="gold"
        size="sm"
        showArrow={false}
        disabled={saving || !draft.trim()}
        onClick={handleAdd}
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : null}
        Add
      </Button>
      <button
        type="button"
        aria-label="Cancel add ticker"
        onClick={() => {
          setDraft('');
          setOpen(false);
        }}
        className="p-1 rounded text-ink-tertiary hover:text-ink-primary hover:bg-surface-2 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Ticker table row ───────────────────────────────────────────

function TickerRow({
  item,
  priceMap,
  onRemove,
  saving,
}: {
  item: WatchlistItem;
  priceMap: Map<string, QuoteLite>;
  onRemove: (ticker: string) => void;
  saving: boolean;
}) {
  const q = priceMap.get(item.ticker.toUpperCase());

  return (
    <tr className="border-b border-border-ds-subtle last:border-0 group hover:bg-surface-2/50 transition-colors">
      <td className="py-2.5 px-3 text-sm font-semibold text-ink-primary w-24">
        {item.ticker}
      </td>
      <td className="py-2.5 px-3 text-sm text-right">
        {q && q.price !== null ? (
          <Price value={q.price} size="small" />
        ) : (
          <span className="text-ink-tertiary">—</span>
        )}
      </td>
      <td className="py-2.5 px-3 text-sm text-right">
        {q && q.changePercent !== null ? (
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
  priceMap,
  onRemove,
  saving,
}: {
  title: string;
  items: WatchlistItem[];
  priceMap: Map<string, QuoteLite>;
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
                priceMap={priceMap}
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

  // All tickers for per-symbol price fetch
  const allTickers = items.map((i) => i.ticker);
  const { priceMap } = usePortfolioQuotes(allTickers);

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
      {/* Only show full-page skeleton on the initial load (no data yet).
          Once items exist, keep the page rendered during background refetches
          so adding a ticker doesn't blank the whole page. */}
      {loading && items.length === 0 ? (
        <LoadingSkeleton />
      ) : !hasItems ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          <WatchlistGroup
            title="From Your Portfolio"
            items={portfolioItems}
            priceMap={priceMap}
            onRemove={handleRemove}
            saving={saving}
          />
          <WatchlistGroup
            title="My Watch List"
            items={manualItems}
            priceMap={priceMap}
            onRemove={handleRemove}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
}
