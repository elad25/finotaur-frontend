// src/components/journal/AccountFilterDropdown.tsx
// ══════════════════════════════════════════════════════════════
// Compact account-filter dropdown for the Overview header.
// Sits next to DashboardDatePicker; reads from PortfolioContext.
// Does NOT duplicate state — consumes the same context as
// AccountSwitcher (which lives inside the broker panel).
// Groups accounts by connection; each group is collapsible with
// a tri-state checkbox and a selected/total count.
// ══════════════════════════════════════════════════════════════

import { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { Wallet, ChevronDown, Settings, Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortfolioContext, ALL_PORTFOLIOS_ID, TRADER_PORTFOLIO_ID } from '@/contexts/PortfolioContext';
import type { Portfolio } from '@/hooks/usePortfolios';

interface AccountFilterDropdownProps {
  /** Called when user clicks "Manage accounts" — parent owns the modal state. */
  onManage: () => void;
}

// ── Group shape ──────────────────────────────────────────────
interface PortfolioGroup {
  key: string;
  label: string;
  portfolios: Portfolio[];
}

// ── Prop-firm detection ───────────────────────────────────────
// Returns the group key + label for a Tradovate account name.
// Evaluated in declaration order; first match wins.
function detectFirmGroup(name: string): { key: string; label: string } {
  const n = name.toUpperCase();
  if (n.includes('APEX'))                                    return { key: 'pf_apex',    label: 'APEX' };
  if (n.includes('MFFU') || n.includes('MYFUNDEDFUTURES') || n.startsWith('MFF'))
                                                             return { key: 'pf_mffu',    label: 'MFFU' };
  if (n.startsWith('TST') || n.includes('TOPSTEP'))         return { key: 'pf_topstep', label: 'Topstep' };
  if (n.includes('EARN2TRADE') || n.startsWith('E2T'))      return { key: 'pf_e2t',     label: 'Earn2Trade' };
  if (n.includes('BULENOX'))                                 return { key: 'pf_bulenox', label: 'Bulenox' };
  if (n.includes('TRADEDAY'))                                return { key: 'pf_tradeday',label: 'TradeDay' };
  if (n.includes('UPROFIT'))                                 return { key: 'pf_uprofit', label: 'Uprofit' };
  // Personal / individual Tradovate account
  return { key: 'tradovate', label: 'Tradovate' };
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
  // Groups default collapsed — the whole point is taming the long list.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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

  // Build groups: prop-firm buckets (sorted by label) → generic Tradovate →
  //               broker groups (by connection_id) → Manual
  const groups = useMemo<PortfolioGroup[]>(() => {
    const result: PortfolioGroup[] = [];

    // Split tradovate portfolios by detected firm identity
    if (tradovatePortfolios.length > 0) {
      // Map: key → { label, portfolios[] } — preserves first-appearance order per bucket
      const firmMap = new Map<string, { label: string; portfolios: Portfolio[] }>();
      for (const p of tradovatePortfolios) {
        const { key, label } = detectFirmGroup(p.name);
        if (!firmMap.has(key)) {
          firmMap.set(key, { label, portfolios: [] });
        }
        firmMap.get(key)!.portfolios.push(p);
      }

      // Emit prop-firm groups (all except the generic 'tradovate' bucket) sorted by label
      const propFirmEntries = Array.from(firmMap.entries())
        .filter(([key]) => key !== 'tradovate')
        .sort(([, a], [, b]) => a.label.localeCompare(b.label));

      for (const [key, { label, portfolios }] of propFirmEntries) {
        result.push({ key, label, portfolios });
      }

      // Emit the generic 'Tradovate' bucket last among tradovate-derived groups
      if (firmMap.has('tradovate')) {
        const { label, portfolios } = firmMap.get('tradovate')!;
        result.push({ key: 'tradovate', label, portfolios });
      }
    }

    // Group broker portfolios by broker_connection_id (fallback to portfolio id)
    const brokerGroupMap = new Map<string, Portfolio[]>();
    for (const p of brokerPortfolios) {
      const groupKey = p.broker_connection_id ?? p.id;
      if (!brokerGroupMap.has(groupKey)) {
        brokerGroupMap.set(groupKey, []);
      }
      brokerGroupMap.get(groupKey)!.push(p);
    }
    for (const [connectionKey, portfs] of brokerGroupMap) {
      const first = portfs[0];
      const groupLabel = first.connection_label ?? first.name;
      result.push({ key: `broker-${connectionKey}`, label: groupLabel, portfolios: portfs });
    }

    if (manualPortfolios.length > 0) {
      result.push({ key: 'manual', label: 'Manual', portfolios: manualPortfolios });
    }

    return result;
  }, [tradovatePortfolios, brokerPortfolios, manualPortfolios]);

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

  const toggleGroupExpanded = useCallback((key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Toggle all portfolios in a group: add all or remove all.
  const handleGroupToggle = useCallback((group: PortfolioGroup) => {
    const groupIds = group.portfolios.map(p => p.id);
    // Current real selection (strip sentinels)
    const currentReal = selectedPortfolioIds.filter(
      id => id !== ALL_PORTFOLIOS_ID && id !== TRADER_PORTFOLIO_ID,
    );
    const allSelected = groupIds.every(id => currentReal.includes(id));

    let nextIds: string[];
    if (allSelected) {
      // Remove all group ids
      nextIds = currentReal.filter(id => !groupIds.includes(id));
    } else {
      // Add all group ids
      const merged = new Set([...currentReal, ...groupIds]);
      nextIds = Array.from(merged);
    }

    // If nothing remains, fall back to "All"
    if (nextIds.length === 0) {
      setSelectedPortfolioIds([ALL_PORTFOLIOS_ID]);
    } else {
      setSelectedPortfolioIds(nextIds);
    }
  }, [selectedPortfolioIds, setSelectedPortfolioIds]);

  if (isLoading) return null;

  const hasGroups = groups.length > 0;

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
            'absolute left-0 top-full mt-1.5 z-50 min-w-[240px] w-max max-w-xs',
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

          {hasGroups && (
            <div className="border-t border-zinc-800/60 mx-2 my-1" />
          )}

          {/* Collapsible connection groups */}
          {groups.map(group => {
            const isExpanded = expanded.has(group.key);
            const realSelected = selectedPortfolioIds.filter(
              id => id !== ALL_PORTFOLIOS_ID && id !== TRADER_PORTFOLIO_ID,
            );
            const selectedInGroup = group.portfolios.filter(p => realSelected.includes(p.id)).length;
            const totalInGroup = group.portfolios.length;
            const allChecked = !isShowingAll && !isShowingTrader && selectedInGroup === totalInGroup;
            const someChecked = !isShowingAll && !isShowingTrader && selectedInGroup > 0 && selectedInGroup < totalInGroup;

            return (
              <div key={group.key}>
                {/* Group header row */}
                <div
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-1.5',
                    'hover:bg-zinc-800/40 transition-colors duration-100 cursor-pointer select-none',
                  )}
                  onClick={() => toggleGroupExpanded(group.key)}
                >
                  {/* Tri-state checkbox */}
                  <button
                    type="button"
                    aria-label={`Toggle all ${group.label} accounts`}
                    onClick={e => {
                      e.stopPropagation();
                      handleGroupToggle(group);
                    }}
                    className={cn(
                      'flex-shrink-0 w-3.5 h-3.5 rounded border transition-all flex items-center justify-center',
                      allChecked
                        ? 'bg-[#C9A646] border-[#C9A646]'
                        : someChecked
                          ? 'bg-[#C9A646]/20 border-[#C9A646]'
                          : 'border-zinc-600 hover:border-zinc-400',
                    )}
                  >
                    {allChecked && <Check className="w-2.5 h-2.5 text-[#0A0A0A]" strokeWidth={3} />}
                    {someChecked && <Minus className="w-2.5 h-2.5 text-[#C9A646]" strokeWidth={3} />}
                  </button>

                  {/* Group label */}
                  <span className="flex-1 text-[9px] text-zinc-500 font-semibold uppercase tracking-widest truncate">
                    {group.label}
                  </span>

                  {/* Selected / total count */}
                  <span className="text-[9px] text-zinc-600 font-medium tabular-nums">
                    {selectedInGroup}/{totalInGroup}
                  </span>

                  {/* Expand/collapse chevron */}
                  <ChevronDown
                    className={cn(
                      'w-3 h-3 text-zinc-600 flex-shrink-0 transition-transform duration-150',
                      !isExpanded && '-rotate-90',
                    )}
                  />
                </div>

                {/* Per-account rows (shown when expanded) */}
                {isExpanded && group.portfolios.map(p => {
                  let badge: string | undefined;
                  let badgeColor: 'emerald' | 'yellow' | 'zinc' = 'zinc';

                  if (group.key === 'manual') {
                    badge = 'Manual';
                    badgeColor = 'zinc';
                  } else if (p.environment === 'live') {
                    badge = 'Live';
                    badgeColor = 'emerald';
                  } else if (p.environment === 'demo') {
                    badge = 'Demo';
                    badgeColor = 'yellow';
                  }

                  return (
                    <AccountRow
                      key={p.id}
                      id={p.id}
                      label={p.name}
                      badge={badge}
                      badgeColor={badgeColor}
                      checked={!isShowingAll && !isShowingTrader && selectedPortfolioIds.includes(p.id)}
                      onToggle={togglePortfolioSelection}
                      indent
                    />
                  );
                })}
              </div>
            );
          })}

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
  indent?: boolean;
}

const AccountRow = memo(function AccountRow({
  id,
  label,
  checked,
  badge,
  badgeColor = 'zinc',
  onToggle,
  indent = false,
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
        'flex items-center gap-2.5 w-full py-2 text-xs font-medium',
        'transition-colors duration-100 group',
        indent ? 'pl-5 pr-3' : 'px-3',
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
