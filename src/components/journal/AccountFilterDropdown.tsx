// src/components/journal/AccountFilterDropdown.tsx
// ══════════════════════════════════════════════════════════════
// Compact account-filter dropdown for the Overview header.
// Sits next to DashboardDatePicker; reads from PortfolioContext.
// Does NOT duplicate state — consumes the same context as
// AccountSwitcher (which lives inside the broker panel).
// ══════════════════════════════════════════════════════════════

import { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { Wallet, ChevronDown, Settings, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortfolioContext, ALL_PORTFOLIOS_ID, TRADER_PORTFOLIO_ID } from '@/contexts/PortfolioContext';

interface AccountFilterDropdownProps {
  /** Called when user clicks "Manage accounts" — parent owns the modal state. */
  onManage: () => void;
}

export const AccountFilterDropdown = memo(function AccountFilterDropdown({
  onManage,
}: AccountFilterDropdownProps) {
  const {
    portfolios,
    manualPortfolios,
    tradovatePortfolios,
    brokerPortfolios,
    selectedPortfolioIds,
    togglePortfolioSelection,
    setSelectedPortfolioIds,
    isShowingAll,
    isShowingTrader,
    isLoading,
  } = usePortfolioContext();

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open]);

  // Button label
  const label = useMemo(() => {
    if (isShowingAll) return 'All accounts';
    if (isShowingTrader) return 'Trader';
    const count = selectedPortfolioIds.filter(id => id !== ALL_PORTFOLIOS_ID && id !== TRADER_PORTFOLIO_ID).length;
    if (count === 0) return 'All accounts';
    if (count === 1) {
      const match = portfolios.find(p => p.id === selectedPortfolioIds[0]);
      return match?.name ?? 'Account';
    }
    return `${count} accounts`;
  }, [isShowingAll, isShowingTrader, selectedPortfolioIds, portfolios]);

  const handleToggleAll = useCallback(() => {
    setSelectedPortfolioIds([ALL_PORTFOLIOS_ID]);
  }, [setSelectedPortfolioIds]);

  const handleToggleTrader = useCallback(() => {
    setSelectedPortfolioIds([TRADER_PORTFOLIO_ID]);
  }, [setSelectedPortfolioIds]);

  const handleManage = useCallback(() => {
    setOpen(false);
    onManage();
  }, [onManage]);

  if (isLoading) return null;

  const hasAccounts = portfolios.length > 0;

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium',
          'border transition-all duration-150',
          'bg-[#141414] border-[#3a3a3a] text-zinc-300',
          'hover:border-[#C9A646]/50 hover:text-[#C9A646]',
          open && 'border-[#C9A646]/50 text-[#C9A646]',
        )}
      >
        <Wallet className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="max-w-[140px] truncate">{label}</span>
        <ChevronDown
          className={cn(
            'w-3 h-3 flex-shrink-0 transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className={cn(
            'absolute left-0 top-full mt-1.5 z-50 min-w-[220px] w-max max-w-xs',
            'bg-[#141414] border border-[#C9A646]/20 rounded-xl shadow-xl',
            'flex flex-col overflow-hidden',
          )}
        >
          {/* "All accounts" row */}
          <AccountRow
            id={ALL_PORTFOLIOS_ID}
            label="All accounts"
            checked={isShowingAll}
            onToggle={handleToggleAll}
          />

          <AccountRow
            id={TRADER_PORTFOLIO_ID}
            label="Trader"
            checked={isShowingTrader}
            onToggle={handleToggleTrader}
          />

          {hasAccounts && (
            <div className="border-t border-zinc-800/60 mx-2 my-1" />
          )}

          {/* My accounts group header */}
          {hasAccounts && (
            <div className="px-3 pt-1 pb-0.5">
              <span className="text-[9px] text-zinc-600 font-semibold uppercase tracking-widest">
                My accounts
              </span>
            </div>
          )}

          {/* Tradovate accounts */}
          {tradovatePortfolios.map(p => (
            <AccountRow
              key={p.id}
              id={p.id}
              label={p.name}
              badge={p.environment === 'live' ? 'Live' : 'Demo'}
              badgeColor={p.environment === 'live' ? 'emerald' : 'yellow'}
              checked={!isShowingAll && !isShowingTrader && selectedPortfolioIds.includes(p.id)}
              onToggle={togglePortfolioSelection}
            />
          ))}

          {/* Manual portfolios */}
          {manualPortfolios.map(p => (
            <AccountRow
              key={p.id}
              id={p.id}
              label={p.name}
              badge="Manual"
              badgeColor="zinc"
              checked={!isShowingAll && !isShowingTrader && selectedPortfolioIds.includes(p.id)}
              onToggle={togglePortfolioSelection}
            />
          ))}

          {/* Broker accounts (non-Tradovate journal connections) */}
          {brokerPortfolios.length > 0 && (
            <>
              <div className="border-t border-zinc-800/60 mx-2 my-1" />
              <div className="px-3 pt-1 pb-0.5">
                <span className="text-[9px] text-zinc-600 font-semibold uppercase tracking-widest">
                  Brokers
                </span>
              </div>
              {brokerPortfolios.map(p => (
                <AccountRow
                  key={p.id}
                  id={p.id}
                  label={p.name}
                  badge={p.environment === 'live' ? 'Live' : p.environment === 'demo' ? 'Demo' : undefined}
                  badgeColor={p.environment === 'live' ? 'emerald' : 'yellow'}
                  checked={!isShowingAll && !isShowingTrader && selectedPortfolioIds.includes(p.id)}
                  onToggle={togglePortfolioSelection}
                />
              ))}
            </>
          )}

          {/* Manage accounts footer */}
          <div className="border-t border-zinc-800/60 mx-2 mt-1 mb-0" />
          <button
            onClick={handleManage}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium',
              'text-zinc-400 hover:text-[#C9A646] transition-colors duration-150',
            )}
          >
            <Settings className="w-3 h-3 flex-shrink-0" />
            <span>Manage accounts</span>
          </button>
        </div>
      )}
    </div>
  );
});

// ── Row ──────────────────────────────────────────────────────────────
interface AccountRowProps {
  id: string;
  label: string;
  checked: boolean;
  badge?: string;
  badgeColor?: 'emerald' | 'yellow' | 'zinc';
  onToggle: (id: string) => void;
}

const AccountRow = memo(function AccountRow({
  id,
  label,
  checked,
  badge,
  badgeColor = 'zinc',
  onToggle,
}: AccountRowProps) {
  const badgeColors = {
    emerald: 'bg-emerald-400/10 text-emerald-400',
    yellow: 'bg-yellow-400/10 text-yellow-400',
    zinc: 'bg-zinc-700/50 text-zinc-500',
  } as const;

  return (
    <button
      role="option"
      aria-selected={checked}
      onClick={() => onToggle(id)}
      className={cn(
        'flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium',
        'transition-colors duration-100 group',
        checked
          ? 'text-[#C9A646] bg-[#C9A646]/5'
          : 'text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/50',
      )}
    >
      {/* Checkbox indicator */}
      <span
        className={cn(
          'flex-shrink-0 w-3.5 h-3.5 rounded border transition-all',
          checked
            ? 'bg-[#C9A646] border-[#C9A646] flex items-center justify-center'
            : 'border-zinc-600 group-hover:border-zinc-400',
        )}
      >
        {checked && <Check className="w-2.5 h-2.5 text-[#0A0A0A]" strokeWidth={3} />}
      </span>

      {/* Label */}
      <span className="flex-1 text-left truncate">{label}</span>

      {/* Badge */}
      {badge && (
        <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-semibold', badgeColors[badgeColor])}>
          {badge}
        </span>
      )}
    </button>
  );
});
