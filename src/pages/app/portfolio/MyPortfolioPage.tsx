// src/pages/app/portfolio/MyPortfolioPage.tsx
// ═══════════════════════════════════════════════════════════════
// My Portfolio — v2 summary view with live return tracking.
// Empty state: prompt to create. Saved state: read-only account/position table
// with current prices, market value, return %, and unrealized P&L.
// ═══════════════════════════════════════════════════════════════

import { useMemo, useState, useRef, useEffect } from 'react';
import { Briefcase, MoreVertical, PencilLine, Upload } from 'lucide-react';
import { useMyPortfolio } from '@/hooks/useMyPortfolio';
import { usePortfolioQuotes } from '@/hooks/usePortfolioQuotes';
import { CreatePortfolioModal } from '@/components/portfolio/CreatePortfolioModal';
import { ClosePositionDialog } from '@/components/portfolio/ClosePositionDialog';
import type { MyPortfolio, PortfolioAccount, Lot } from '@/lib/portfolio/types';
import { Button } from '@/components/ds/Button';
import { Card } from '@/components/ds/Card';
import { Price, Change } from '@/components/ds/NumberDisplay';
import { useMarketStatus } from '@/lib/marketStatus';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Sub-components ────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-primary" />
        <p className="text-sm text-ink-secondary">Loading portfolio…</p>
      </div>
    </div>
  );
}

function EmptyState({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Card className="max-w-lg w-full text-center p-ds-7 rounded-[12px] bg-surface-1 border border-border-ds-subtle shadow-glow-gold-resting relative overflow-hidden">
        {/* Thin gold top light bar */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[1.5px] w-[60%] bg-gradient-gold rounded-full" />

        {/* Icon badge */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-gold shadow-glow-gold-resting mt-ds-4">
          <Briefcase className="h-8 w-8 text-surface-base" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-ink-primary mt-ds-4">My Portfolio</h2>

        {/* Subtitle */}
        <p className="text-ink-secondary text-sm mt-2 max-w-sm mx-auto">
          Build your portfolio manually or import positions by CSV.
        </p>

        {/* Feature hint chips */}
        <div className="flex items-center justify-center gap-ds-2 mt-ds-4">
          <span className="flex items-center gap-1.5 rounded-full border border-border-ds-subtle bg-surface-base px-3 py-1 text-xs text-ink-secondary">
            <PencilLine className="h-3.5 w-3.5" />
            Manual entry
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-border-ds-subtle bg-surface-base px-3 py-1 text-xs text-ink-secondary">
            <Upload className="h-3.5 w-3.5" />
            CSV import
          </span>
        </div>

        {/* Primary CTA */}
        <div className="mt-ds-5">
          <Button
            variant="gold"
            size="lg"
            showArrow={false}
            onClick={onOpen}
          >
            Create Portfolio
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── Market status indicator (inline, not fixed-position) ──────

function PortfolioMarketStatus() {
  const ms = useMarketStatus();
  if (ms.isOpen) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-ds-subtle bg-surface-base px-2.5 py-1 text-xs text-ink-secondary">
      <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--gold-primary,#C9A646)]" aria-hidden="true" />
      Market closed — showing {ms.lastTradingDayLabel}
    </span>
  );
}

// ── Actions menu (⋮) ─────────────────────────────────────────

interface LotActionsMenuProps {
  lotId: string | undefined;
  openMenuId: string | null;
  onToggle: (id: string) => void;
  onClose: () => void;
  onRemove: () => void;
  onClosePosition: () => void;
}

function LotActionsMenu({
  lotId,
  openMenuId,
  onToggle,
  onClose,
  onRemove,
  onClosePosition,
}: LotActionsMenuProps) {
  const menuId = lotId ?? '__no_id__';
  const isOpen = openMenuId === menuId;
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="rounded p-0.5 text-ink-tertiary hover:text-ink-secondary hover:bg-surface-1 transition-colors"
        onClick={() => onToggle(menuId)}
        aria-label="Position actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-md border border-border-ds-subtle bg-surface-base shadow-xl">
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-ink-secondary hover:text-ink-primary hover:bg-surface-1 transition-colors"
            onClick={() => { onClosePosition(); onClose(); }}
          >
            Close position
          </button>
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:text-red-300 hover:bg-surface-1 transition-colors"
            onClick={() => { onRemove(); onClose(); }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ── Position row ──────────────────────────────────────────────

interface PositionRowProps {
  lot: Lot;
  currency: string;
  currentPrice: number | null;
  quotesLoading: boolean;
  openMenuId: string | null;
  onMenuToggle: (id: string) => void;
  onMenuClose: () => void;
  onRemove: () => void;
  onClosePosition: () => void;
}

function PositionRow({
  lot,
  currency,
  currentPrice,
  quotesLoading,
  openMenuId,
  onMenuToggle,
  onMenuClose,
  onRemove,
  onClosePosition,
}: PositionRowProps) {
  const dash = <span className="text-ink-tertiary">—</span>;

  // Market value: qty × current price
  const marketValue =
    currentPrice !== null ? lot.quantity * currentPrice : null;

  // Return %: (price - cost) / cost × 100
  const returnPct =
    currentPrice !== null && lot.costPerShare !== null && lot.costPerShare > 0
      ? ((currentPrice - lot.costPerShare) / lot.costPerShare) * 100
      : null;

  // Unrealized P&L: (price - cost) × qty
  const unrealizedPnl =
    currentPrice !== null && lot.costPerShare !== null
      ? (currentPrice - lot.costPerShare) * lot.quantity
      : null;

  // Skeleton dash while loading
  const loadingCell = (
    <span className="text-ink-tertiary animate-pulse">—</span>
  );

  return (
    <tr className="border-b border-border-ds-subtle last:border-0">
      {/* Ticker */}
      <td className="py-2 pr-3 text-sm font-medium text-ink-primary">{lot.ticker}</td>

      {/* Quantity */}
      <td className="py-2 pr-3 text-sm text-ink-primary text-right font-mono tabular-nums">
        {lot.quantity.toLocaleString('en-US')}
      </td>

      {/* Cost / Share */}
      <td className="py-2 pr-3 text-sm text-right font-mono tabular-nums">
        {lot.costPerShare !== null
          ? formatCurrency(lot.costPerShare, currency)
          : dash}
      </td>

      {/* Current Price */}
      <td className="py-2 pr-3 text-sm text-right">
        {quotesLoading
          ? loadingCell
          : currentPrice !== null
            ? <Price value={currentPrice} format="currency" size="small" />
            : dash}
      </td>

      {/* Market Value */}
      <td className="py-2 pr-3 text-sm text-right">
        {quotesLoading
          ? loadingCell
          : marketValue !== null
            ? <Price value={marketValue} format="currency" size="small" />
            : dash}
      </td>

      {/* Return % */}
      <td className="py-2 pr-3 text-sm text-right">
        {quotesLoading
          ? loadingCell
          : returnPct !== null
            ? <Change value={returnPct} format="percent" decimals={2} />
            : dash}
      </td>

      {/* Unrealized P&L */}
      <td className="py-2 pr-3 text-sm text-right">
        {quotesLoading
          ? loadingCell
          : unrealizedPnl !== null
            ? <Change value={unrealizedPnl} format="currency" decimals={2} />
            : dash}
      </td>

      {/* Actions ⋮ */}
      <td className="py-2 text-right">
        <LotActionsMenu
          lotId={lot.id}
          openMenuId={openMenuId}
          onToggle={onMenuToggle}
          onClose={onMenuClose}
          onRemove={onRemove}
          onClosePosition={onClosePosition}
        />
      </td>
    </tr>
  );
}

// ── Account card ──────────────────────────────────────────────

interface AccountCardProps {
  account: PortfolioAccount;
  currency: string;
  priceMap: Map<string, { price: number | null; changePercent: number | null }>;
  quotesLoading: boolean;
  onAddPosition: () => void;
  openMenuId: string | null;
  onMenuToggle: (id: string) => void;
  onMenuClose: () => void;
  onRemoveLot: (lotId: string | undefined) => void;
  onClosePositionLot: (lot: Lot) => void;
}

function AccountCard({
  account,
  currency,
  priceMap,
  quotesLoading,
  onAddPosition,
  openMenuId,
  onMenuToggle,
  onMenuClose,
  onRemoveLot,
  onClosePositionLot,
}: AccountCardProps) {
  const activeLots = account.positions.filter(
    (l) => l.ticker.trim() !== '' && l.quantity > 0,
  );
  const holdingsCount = activeLots.length;

  // Per-account totals (equity positions only — cash handled separately)
  const { totalCostBasis, totalMarketValue, hasCompleteData } = useMemo(() => {
    let costBasis = 0;
    let marketVal = 0;
    let complete = true;

    for (const lot of activeLots) {
      const q = priceMap.get(lot.ticker.toUpperCase()) ?? null;
      const price = q?.price ?? null;
      if (price !== null) {
        marketVal += lot.quantity * price;
      } else {
        complete = false;
      }
      if (lot.costPerShare !== null) {
        costBasis += lot.quantity * lot.costPerShare;
      } else {
        complete = false;
      }
    }
    return { totalCostBasis: costBasis, totalMarketValue: marketVal, hasCompleteData: complete };
  }, [activeLots, priceMap]);

  const accountReturnPct =
    hasCompleteData && totalCostBasis > 0
      ? ((totalMarketValue - totalCostBasis) / totalCostBasis) * 100
      : null;

  return (
    <Card className="overflow-hidden p-0">
      {/* Account header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-ds-subtle bg-surface-base">
        <span className="text-sm font-semibold text-ink-primary">{account.name}</span>
        <div className="flex items-center gap-4 text-xs text-ink-secondary">
          <span>
            Cash:{' '}
            <span className="text-ink-primary font-medium font-mono tabular-nums">
              {formatCurrency(account.cashPosition, account.cashCurrency)}
            </span>
          </span>
          <span>
            Holdings:{' '}
            <span className="text-ink-primary font-medium">{holdingsCount}</span>
          </span>
          {holdingsCount > 0 && !quotesLoading && totalMarketValue > 0 && (
            <span className="flex items-center gap-1.5">
              Mkt Value:{' '}
              <Price value={totalMarketValue} format="currency" size="small" />
              {accountReturnPct !== null && (
                <Change value={accountReturnPct} format="percent" decimals={2} />
              )}
            </span>
          )}
          {holdingsCount > 0 && quotesLoading && (
            <span className="text-ink-tertiary animate-pulse">Loading prices…</span>
          )}
          {/* + Add Position — ghost gold-text button */}
          <button
            type="button"
            onClick={onAddPosition}
            className="text-gold-primary hover:text-gold-bright text-xs font-medium transition-colors"
          >
            + Add Position
          </button>
        </div>
      </div>

      {/* Positions table */}
      {holdingsCount > 0 ? (
        <div className="px-5 py-3 overflow-x-auto">
          <table className="w-full min-w-[740px]">
            <thead>
              <tr className="border-b border-border-ds-subtle">
                <th className="pb-2 text-xs font-medium text-ink-secondary text-left pr-3">Ticker</th>
                <th className="pb-2 text-xs font-medium text-ink-secondary text-right pr-3">Quantity</th>
                <th className="pb-2 text-xs font-medium text-ink-secondary text-right pr-3">Cost / Share</th>
                <th className="pb-2 text-xs font-medium text-ink-secondary text-right pr-3">Current Price</th>
                <th className="pb-2 text-xs font-medium text-ink-secondary text-right pr-3">Mkt Value</th>
                <th className="pb-2 text-xs font-medium text-ink-secondary text-right pr-3">Return %</th>
                <th className="pb-2 text-xs font-medium text-ink-secondary text-right pr-3">Unr. P&amp;L</th>
                <th className="pb-2 text-xs font-medium text-ink-secondary text-right w-8" />
              </tr>
            </thead>
            <tbody>
              {activeLots.map((lot, i) => {
                const q = priceMap.get(lot.ticker.toUpperCase()) ?? null;
                return (
                  <PositionRow
                    key={lot.id ?? i}
                    lot={lot}
                    currency={currency}
                    currentPrice={q?.price ?? null}
                    quotesLoading={quotesLoading}
                    openMenuId={openMenuId}
                    onMenuToggle={onMenuToggle}
                    onMenuClose={onMenuClose}
                    onRemove={() => onRemoveLot(lot.id)}
                    onClosePosition={() => onClosePositionLot(lot)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 py-4 text-sm text-ink-tertiary italic">No positions in this account.</p>
      )}
    </Card>
  );
}

function hasPositions(portfolio: MyPortfolio): boolean {
  return portfolio.accounts.some((acc) =>
    acc.positions.some((l) => l.ticker.trim() !== '' && l.quantity > 0),
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function MyPortfolioPage() {
  const { portfolio, loading, reload, save } = useMyPortfolio();
  const [modalOpen, setModalOpen] = useState(false);

  // ⋮ menu state — which lot's menu is open (keyed by lot.id or positional key)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Close position dialog state
  const [closeDialogLot, setCloseDialogLot] = useState<Lot | null>(null);

  // Collect unique tickers unconditionally (empty array when no portfolio).
  // Hook rules: usePortfolioQuotes must be called at the top level every render.
  const allTickers = useMemo<string[]>(() => {
    if (!portfolio) return [];
    const seen = new Set<string>();
    for (const acc of portfolio.accounts) {
      for (const lot of acc.positions) {
        const t = lot.ticker.trim().toUpperCase();
        if (t && lot.quantity > 0) seen.add(t);
      }
    }
    return Array.from(seen);
  }, [portfolio]);

  const { priceMap, loading: quotesLoading } = usePortfolioQuotes(allTickers);

  // ── Remove lot ───────────────────────────────────────────────
  async function handleRemoveLot(lotId: string | undefined) {
    if (!portfolio || !lotId) return;
    const updated: MyPortfolio = {
      ...portfolio,
      accounts: portfolio.accounts.map((acc) => ({
        ...acc,
        positions: acc.positions.filter((l) => l.id !== lotId),
      })),
    };
    try {
      await save(updated);
      await reload();
    } catch {
      toast({ title: 'Error removing position', description: 'Please try again.' });
    }
  }

  // ── Close position (full or partial sell) ────────────────────
  async function handleClosePosition(soldQty: number) {
    if (!portfolio || !closeDialogLot) return;
    const targetId = closeDialogLot.id;
    const fullClose = soldQty >= closeDialogLot.quantity;

    const updated: MyPortfolio = {
      ...portfolio,
      accounts: portfolio.accounts.map((acc) => ({
        ...acc,
        positions: fullClose
          ? acc.positions.filter((l) => l.id !== targetId)
          : acc.positions.map((l) =>
              l.id === targetId
                ? { ...l, quantity: l.quantity - soldQty }
                : l,
            ),
      })),
    };

    try {
      await save(updated);
      await reload();
      const shares = soldQty === 1 ? 'share' : 'shares';
      toast({
        title: `Closed ${soldQty} ${shares} of ${closeDialogLot.ticker}.`,
      });
      setCloseDialogLot(null);
    } catch {
      toast({ title: 'Error closing position', description: 'Please try again.' });
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  const isEmpty = portfolio === null || !hasPositions(portfolio);

  // Portfolio-wide totals (equity positions across all accounts)
  let portfolioTotalCost = 0;
  let portfolioTotalMarketValue = 0;
  let portfolioCash = 0;
  let portfolioHasComplete = true;

  if (!isEmpty && portfolio) {
    for (const acc of portfolio.accounts) {
      portfolioCash += acc.cashPosition;
      for (const lot of acc.positions) {
        if (!lot.ticker.trim() || lot.quantity <= 0) continue;
        const q = priceMap.get(lot.ticker.trim().toUpperCase()) ?? null;
        const price = q?.price ?? null;
        if (price !== null) {
          portfolioTotalMarketValue += lot.quantity * price;
        } else {
          portfolioHasComplete = false;
        }
        if (lot.costPerShare !== null) {
          portfolioTotalCost += lot.quantity * lot.costPerShare;
        } else {
          portfolioHasComplete = false;
        }
      }
    }
  }

  const portfolioReturnPct =
    portfolioHasComplete && portfolioTotalCost > 0
      ? ((portfolioTotalMarketValue - portfolioTotalCost) / portfolioTotalCost) * 100
      : null;

  const portfolioUnrealizedPnl =
    portfolioHasComplete ? portfolioTotalMarketValue - portfolioTotalCost : null;

  const totalPositions = portfolio?.accounts.reduce(
    (sum, acc) => sum + acc.positions.filter((l) => l.ticker.trim() !== '' && l.quantity > 0).length,
    0,
  ) ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 min-h-full">
      {isEmpty ? (
        <EmptyState onOpen={() => setModalOpen(true)} />
      ) : (
        <>
          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-ink-primary">{portfolio!.name}</h1>
                <PortfolioMarketStatus />
              </div>
              <p className="text-xs text-ink-secondary mt-0.5">
                Currency: {portfolio!.currency}
              </p>
            </div>
            <Button
              variant="goldOutline"
              size="sm"
              showArrow={false}
              onClick={() => setModalOpen(true)}
            >
              Edit Portfolio
            </Button>
          </div>

          {/* Account cards */}
          <div className={cn('flex flex-col gap-4')}>
            {portfolio!.accounts.map((account, i) => (
              <AccountCard
                key={account.id ?? i}
                account={account}
                currency={portfolio!.currency}
                priceMap={priceMap}
                quotesLoading={quotesLoading}
                onAddPosition={() => setModalOpen(true)}
                openMenuId={openMenuId}
                onMenuToggle={(id) => setOpenMenuId((prev) => (prev === id ? null : id))}
                onMenuClose={() => setOpenMenuId(null)}
                onRemoveLot={handleRemoveLot}
                onClosePositionLot={(lot) => {
                  setOpenMenuId(null);
                  setCloseDialogLot(lot);
                }}
              />
            ))}
          </div>

          {/* Portfolio totals footer */}
          <Card className="mt-4 px-5 py-4 bg-surface-base border border-border-ds-subtle">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Left: holdings count */}
              <p className="text-xs text-ink-tertiary">
                {totalPositions} position{totalPositions === 1 ? '' : 's'} across{' '}
                {portfolio!.accounts.length} account{portfolio!.accounts.length === 1 ? '' : 's'}
              </p>

              {/* Right: financial totals */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-secondary">
                {/* Cash */}
                <span>
                  Cash:{' '}
                  <span className="font-mono tabular-nums text-ink-primary font-medium">
                    {formatCurrency(portfolioCash, portfolio!.currency)}
                  </span>
                </span>

                {/* Cost basis */}
                {portfolioTotalCost > 0 && (
                  <span>
                    Cost Basis:{' '}
                    <span className="font-mono tabular-nums text-ink-primary font-medium">
                      {formatCurrency(portfolioTotalCost, portfolio!.currency)}
                    </span>
                  </span>
                )}

                {/* Market value */}
                {!quotesLoading && portfolioTotalMarketValue > 0 ? (
                  <span className="flex items-center gap-1.5">
                    Mkt Value:{' '}
                    <Price value={portfolioTotalMarketValue} format="currency" size="small" />
                  </span>
                ) : quotesLoading ? (
                  <span className="text-ink-tertiary animate-pulse">Loading market value…</span>
                ) : null}

                {/* Unrealized P&L */}
                {!quotesLoading && portfolioUnrealizedPnl !== null && (
                  <span className="flex items-center gap-1.5">
                    Unr. P&amp;L:{' '}
                    <Change value={portfolioUnrealizedPnl} format="currency" decimals={2} />
                  </span>
                )}

                {/* Total return % */}
                {!quotesLoading && portfolioReturnPct !== null && (
                  <span className="flex items-center gap-1.5">
                    Total Return:{' '}
                    <Change value={portfolioReturnPct} format="percent" decimals={2} />
                  </span>
                )}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Edit / Create portfolio modal */}
      <CreatePortfolioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={portfolio}
        onSaved={async () => {
          setModalOpen(false);
          await reload();
        }}
      />

      {/* Close position dialog */}
      <ClosePositionDialog
        lot={closeDialogLot}
        open={closeDialogLot !== null}
        onClose={() => setCloseDialogLot(null)}
        onConfirm={handleClosePosition}
      />
    </div>
  );
}
