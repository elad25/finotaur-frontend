// src/pages/app/portfolio/MyPortfolioPage.tsx
// ═══════════════════════════════════════════════════════════════
// My Portfolio — v1 summary view.
// Empty state: prompt to create. Saved state: read-only account/position table.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Briefcase, PencilLine, Upload } from 'lucide-react';
import { useMyPortfolio } from '@/hooks/useMyPortfolio';
import { CreatePortfolioModal } from '@/components/portfolio/CreatePortfolioModal';
import type { MyPortfolio, PortfolioAccount, Lot } from '@/lib/portfolio/types';
import { Button } from '@/components/ds/Button';
import { Card } from '@/components/ds/Card';
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

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

interface PositionRowProps {
  lot: Lot;
  currency: string;
}

function PositionRow({ lot, currency }: PositionRowProps) {
  return (
    <tr className="border-b border-border-ds-subtle last:border-0">
      <td className="py-2 pr-4 text-sm font-medium text-ink-primary">{lot.ticker}</td>
      <td className="py-2 pr-4 text-sm text-ink-primary text-right font-mono tabular-nums">
        {lot.quantity.toLocaleString('en-US')}
      </td>
      <td className="py-2 pr-4 text-sm text-ink-primary text-right font-mono tabular-nums">
        {lot.costPerShare !== null
          ? formatCurrency(lot.costPerShare, currency)
          : '—'}
      </td>
      <td className="py-2 text-sm text-ink-secondary text-right">
        {formatDate(lot.purchaseDate)}
      </td>
    </tr>
  );
}

interface AccountCardProps {
  account: PortfolioAccount;
  currency: string;
}

function AccountCard({ account, currency }: AccountCardProps) {
  const holdingsCount = account.positions.filter(
    (l) => l.ticker.trim() !== '' && l.quantity > 0,
  ).length;

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
        </div>
      </div>

      {/* Positions table */}
      {holdingsCount > 0 ? (
        <div className="px-5 py-3 overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-border-ds-subtle">
                <th className="pb-2 text-xs font-medium text-ink-secondary text-left">Ticker</th>
                <th className="pb-2 text-xs font-medium text-ink-secondary text-right pr-4">Quantity</th>
                <th className="pb-2 text-xs font-medium text-ink-secondary text-right pr-4">Cost / Share</th>
                <th className="pb-2 text-xs font-medium text-ink-secondary text-right">Purchase Date</th>
              </tr>
            </thead>
            <tbody>
              {account.positions
                .filter((l) => l.ticker.trim() !== '' && l.quantity > 0)
                .map((lot, i) => (
                  <PositionRow key={lot.id ?? i} lot={lot} currency={currency} />
                ))}
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
  const { portfolio, loading, reload } = useMyPortfolio();
  const [modalOpen, setModalOpen] = useState(false);

  if (loading) {
    return <LoadingSpinner />;
  }

  const isEmpty = portfolio === null || !hasPositions(portfolio);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 min-h-full">
      {isEmpty ? (
        <EmptyState onOpen={() => setModalOpen(true)} />
      ) : (
        <>
          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-ink-primary">{portfolio!.name}</h1>
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
              />
            ))}
          </div>

          {/* Summary footer */}
          <p className="mt-4 text-xs text-ink-tertiary">
            Total holdings:{' '}
            {portfolio!.accounts.reduce(
              (sum, acc) =>
                sum +
                acc.positions.filter((l) => l.ticker.trim() !== '' && l.quantity > 0).length,
              0,
            )}{' '}
            position{portfolio!.accounts.reduce((s, a) => s + a.positions.filter(l => l.ticker.trim() !== '' && l.quantity > 0).length, 0) === 1 ? '' : 's'} across{' '}
            {portfolio!.accounts.length} account{portfolio!.accounts.length === 1 ? '' : 's'}.
          </p>
        </>
      )}

      <CreatePortfolioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={portfolio}
        onSaved={async () => {
          setModalOpen(false);
          await reload();
        }}
      />
    </div>
  );
}
