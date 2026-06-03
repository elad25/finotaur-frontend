// src/components/portfolio/CreatePortfolioModal.tsx
// ═══════════════════════════════════════════════════════════════
// Top-level "Create / Edit Portfolio" modal.
// Left column: PortfolioSettingsPanel
// Right column: AccountTabs → CashPositionInput → PositionsTable
//   (with CsvUploadButton wired into the table header)
// Footer: Cancel + primary action
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ds/Button';
import { usePortfolioBuilder } from '@/hooks/usePortfolioBuilder';
import { useMyPortfolio } from '@/hooks/useMyPortfolio';
import { useWatchlist } from '@/hooks/useWatchlist';
import { countUniqueTickers } from '@/constants/portfolioLimits';
import { toast } from '@/hooks/use-toast';
import { MyPortfolio, Lot } from '@/lib/portfolio/types';
import { PortfolioSettingsPanel } from './PortfolioSettingsPanel';
import { AccountTabs } from './AccountTabs';
import { CashPositionInput } from './CashPositionInput';
import { PositionsTable } from './PositionsTable';
import { CsvUploadButton } from './CsvUploadButton';
import { cn } from '@/lib/utils';

export interface CreatePortfolioModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, pre-seeds the form (edit mode). */
  initial?: MyPortfolio | null;
  /**
   * The portfolio id to save into. Takes precedence over initial?.id.
   * Pass the active portfolio id from the page so saves always target
   * the correct portfolio in multi-portfolio mode.
   */
  portfolioId?: string | null;
  /** Plan-tier ticker cap. Save is blocked when the portfolio exceeds this. */
  maxTickers?: number;
  /** Called with the saved portfolio after a successful save. */
  onSaved?: (p: MyPortfolio) => void;
}

export function CreatePortfolioModal({
  open,
  onClose,
  initial,
  portfolioId,
  maxTickers,
  onSaved,
}: CreatePortfolioModalProps) {
  const isEditMode = Boolean(initial?.id);

  // Form state — pure local, no I/O
  const builder = usePortfolioBuilder(initial);

  // I/O — target the specific portfolio id supplied by the page (multi-portfolio aware).
  // Falls back to initial?.id, then to the legacy first-portfolio path (null).
  const resolvedPortfolioId = portfolioId ?? initial?.id ?? null;
  const { save, saving, error } = useMyPortfolio(resolvedPortfolioId);

  // Watchlist sync — called after a successful portfolio save
  const { syncPortfolioTickers } = useWatchlist();

  // Track a local footer error message (save failure or validation)
  const [footerError, setFooterError] = useState<string | null>(null);

  const {
    portfolio,
    activeAccountIndex,
    setActiveAccountIndex,
    addAccount,
    renameAccount,
    removeAccount,
    setCash,
    setCashCurrency,
    addTicker,
    addLot,
    updateLot,
    removeLot,
    addLotsToActive,
  } = builder;

  const activeAccount = portfolio.accounts[activeAccountIndex];

  // ── Derived: is the primary action enabled? ──────────────────
  // Enabled when: at least one valid position (ticker + qty > 0) OR
  //               at least one account has cash > 0
  const hasValidPosition = portfolio.accounts.some((acc) =>
    acc.positions.some(
      (lot) =>
        lot.ticker.trim() !== '' &&
        lot.quantity > 0 &&
        lot.costPerShare != null &&
        lot.costPerShare > 0,
    ),
  );
  const hasCash = portfolio.accounts.some((acc) => acc.cashPosition > 0);
  const canSave = (hasValidPosition || hasCash) && !saving;

  // ── Handlers ─────────────────────────────────────────────────
  const handlePrimaryAction = useCallback(async () => {
    setFooterError(null);

    // Guard: reject incomplete position rows before hitting the network.
    // A row is valid when it has ALL three: ticker, quantity > 0, costPerShare > 0.
    // Fully-empty rows (no ticker, quantity 0, no cost) are silently ignored.
    // Any row that is partially filled (has at least one of the three fields)
    // but is missing any of the three is considered incomplete → block save.
    const hasIncompleteRows = portfolio.accounts.some((acc) =>
      acc.positions.some((lot) => {
        const hasTicker = lot.ticker.trim() !== '';
        const hasQty    = lot.quantity > 0;
        const hasCost   = lot.costPerShare != null && lot.costPerShare > 0;
        const isFullyEmpty = !hasTicker && !hasQty && !hasCost;
        if (isFullyEmpty) return false; // unused row — ignore
        return !(hasTicker && hasQty && hasCost); // partially filled → incomplete
      }),
    );

    if (hasIncompleteRows) {
      setFooterError(
        'Every holding needs a ticker, a quantity greater than 0, and a purchase price (Cost / Share).',
      );
      return;
    }

    // Ticker cap guard: block save if the portfolio exceeds the plan limit.
    if (maxTickers !== undefined) {
      const uniqueCount = countUniqueTickers(builder.portfolio);
      if (uniqueCount > maxTickers) {
        setFooterError(
          'This portfolio is limited to ' +
            maxTickers +
            ' tickers on your plan. Remove some or upgrade.',
        );
        return;
      }
    }

    try {
      const saved = await save(portfolio);

      // ── Post-save: sync tickers to the watchlist ─────────────
      // Collect unique, non-empty tickers with quantity > 0.
      const tickers = Array.from(
        new Set(
          portfolio.accounts
            .flatMap((acc) => acc.positions)
            .filter((lot) => lot.ticker.trim() !== '' && lot.quantity > 0)
            .map((lot) => lot.ticker.trim().toUpperCase()),
        ),
      );

      if (tickers.length > 0) {
        try {
          const { added, skipped } = await syncPortfolioTickers(tickers);

          if (added > 0) {
            toast({
              title: 'Added to Watch List',
              description: `${added} ${added === 1 ? 'stock' : 'stocks'} added to your Watch List for tracking.`,
            });
          }
          if (skipped > 0) {
            toast({
              title: 'Watch List limit reached',
              description: 'Your FREE plan tracks up to 20 tickers. Upgrade to add more.',
            });
          }
        } catch (watchlistErr: unknown) {
          // Watchlist failure must never block the portfolio save success.
          console.error('[CreatePortfolioModal] watchlist sync failed:', watchlistErr);
        }
      }

      onSaved?.(saved);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save portfolio. Please try again.';
      setFooterError(msg);
    }
  }, [save, portfolio, onSaved, onClose, syncPortfolioTickers, maxTickers]);

  function handleCsvRowsParsed(lots: Lot[]) {
    addLotsToActive(lots);
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        className={cn(
          // Wide modal for two-column layout
          'max-w-4xl w-full p-0 gap-0 overflow-hidden',
          'bg-surface-base border border-border-ds-subtle rounded-[12px]',
        )}
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border-ds-subtle bg-surface-1">
          <DialogTitle className="text-base font-semibold text-ink-primary">
            {isEditMode ? 'Edit Portfolio' : 'Create Portfolio'}
          </DialogTitle>
        </DialogHeader>

        {/* Body — two columns */}
        <div className="flex gap-0 min-h-[420px] max-h-[60vh] overflow-hidden">
          {/* Left: Settings */}
          <div className="px-5 py-5">
            <PortfolioSettingsPanel builder={builder} />
          </div>

          {/* Right: Account management + positions */}
          <div className="flex-1 flex flex-col gap-4 px-5 py-5 overflow-y-auto">
            {/* Account tabs */}
            <AccountTabs
              accounts={portfolio.accounts}
              activeIndex={activeAccountIndex}
              onSelect={setActiveAccountIndex}
              onAdd={addAccount}
              onRename={renameAccount}
              onRemove={removeAccount}
            />

            {activeAccount && (
              <>
                {/* Cash position for the active account */}
                <CashPositionInput
                  amount={activeAccount.cashPosition}
                  currency={activeAccount.cashCurrency}
                  onAmountChange={(n) => setCash(activeAccountIndex, n)}
                  onCurrencyChange={(c) => setCashCurrency(activeAccountIndex, c)}
                />

                {/* Positions table — CsvUploadButton embedded in header slot */}
                <PositionsTable
                  positions={activeAccount.positions}
                  currency={activeAccount.cashCurrency ?? portfolio.currency ?? 'USD'}
                  onAddTicker={addTicker}
                  onAddLot={addLot}
                  onUpdateLot={updateLot}
                  onRemoveLot={removeLot}
                  uploadSlot={
                    <CsvUploadButton onRowsParsed={handleCsvRowsParsed} />
                  }
                />
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-ds-subtle bg-surface-1">
          <div>
            {(footerError ?? error) && (
              <p className="text-sm text-num-negative">
                {footerError ?? error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={saving}
              showArrow={false}
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={handlePrimaryAction}
              disabled={!canSave}
              showArrow={false}
            >
              {saving
                ? 'Saving...'
                : isEditMode
                  ? 'Save Portfolio'
                  : 'Create Portfolio'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

