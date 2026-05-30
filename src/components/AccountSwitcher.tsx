// src/components/AccountSwitcher.tsx
// ══════════════════════════════════════════════════════════════
// Unified account selector — lives inside Connect Broker dropdown.
// Layout:
//   [Connection Name]  ●
//     └ Account 1 (Live)
//     └ Account 2 (Demo)
//   ─────────────────
//   Manual
//   ─────────────────
//   ALL
// ══════════════════════════════════════════════════════════════

import { memo, useCallback, useMemo } from 'react';
import { BookOpen, Link2, Layers, Check, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortfolioContext, ALL_PORTFOLIOS_ID } from '@/contexts/PortfolioContext';

export const AccountSwitcher = memo(function AccountSwitcher() {
  const {
    portfolios,
    manualPortfolios,
    tradovatePortfolios,
    brokerPortfolios,
    selectedPortfolioIds,
    togglePortfolioSelection,
    isShowingAll,
    isLoading,
  } = usePortfolioContext();

  const handleToggle = useCallback((id: string) => {
    togglePortfolioSelection(id);
  }, [togglePortfolioSelection]);

  // Group tradovate portfolios by connection_label
  const groupedTradovate = useMemo(() => {
    const groups = new Map<string, typeof tradovatePortfolios>();
    for (const p of tradovatePortfolios) {
      // Group key: prefer connection_label (user nickname), fallback to env label — never raw account number
      const key = p.connection_label?.trim() || (p.environment === 'live' ? 'Live Account' : 'Demo Account');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    return Array.from(groups.entries());
  }, [tradovatePortfolios]);

  if (isLoading) return null;
  // Never hide — manual portfolio is always guaranteed

  return (
    <div className="flex flex-col w-full gap-0.5">

      {/* ══ Broker connection groups ══ */}
      {groupedTradovate.map(([groupLabel, accounts]) => {
        const anyConnected = accounts.some(a => a.is_active);
        return (
          <div key={groupLabel}>
            {/* Connection label header */}
            <div className="flex items-center gap-2 px-2 pt-2 pb-1">
              <Link2 className="w-3 h-3 text-zinc-500 flex-shrink-0" />
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider flex-1 truncate">
                {groupLabel}
              </span>
              <span className={cn(
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                anyConnected ? 'bg-emerald-400' : 'bg-red-400'
              )} />
            </div>

            {/* Sub-accounts */}
            {accounts.map(p => (
              <AccountRow
                key={p.id}
                id={p.id}
                label={p.name}
                sublabel={p.environment === 'live' ? 'Live' : 'Demo'}
                checked={!isShowingAll && selectedPortfolioIds.includes(p.id)}
                indent
                dot={p.environment === 'live' ? 'live' : 'demo'}
                onToggle={handleToggle}
              />
            ))}
          </div>
        );
      })}

      {/* ══ Divider ══ */}
      {tradovatePortfolios.length > 0 && (
        <div className="border-t border-zinc-800/60 my-1.5 mx-2" />
      )}

      {/* ══ Manual portfolios ══ */}
      {manualPortfolios.map(p => (
        <AccountRow
          key={p.id}
          id={p.id}
          label={p.name}
          sublabel="Manual"
          checked={!isShowingAll && selectedPortfolioIds.includes(p.id)}
          indent={false}
          dot={null}
          icon={<BookOpen className="w-3.5 h-3.5" />}
          onToggle={handleToggle}
        />
      ))}

      {/* ══ Broker accounts (non-Tradovate journal connections) ══ */}
      {brokerPortfolios.length > 0 && (
        <>
          <div className="border-t border-zinc-800/60 my-1.5 mx-2" />
          {/* Brokers section header */}
          <div className="flex items-center gap-2 px-2 pt-2 pb-1">
            <Building2 className="w-3 h-3 text-zinc-500 flex-shrink-0" />
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider flex-1 truncate">
              Brokers
            </span>
          </div>
          {brokerPortfolios.map(p => (
            <AccountRow
              key={p.id}
              id={p.id}
              label={p.name}
              sublabel={p.environment === 'live' ? 'Live' : p.environment === 'demo' ? 'Demo' : 'Broker'}
              checked={!isShowingAll && selectedPortfolioIds.includes(p.id)}
              indent={false}
              dot={p.environment === 'live' ? 'live' : p.environment === 'demo' ? 'demo' : null}
              onToggle={handleToggle}
            />
          ))}
        </>
      )}

      {/* ══ Divider before ALL ══ */}
      <div className="border-t border-zinc-800/40 my-1.5 mx-2" />

      {/* ══ ALL — always last ══ */}
      <AccountRow
        id={ALL_PORTFOLIOS_ID}
        label="ALL"
        sublabel="All accounts"
        checked={isShowingAll}
        indent={false}
        dot={null}
        icon={<Layers className="w-3.5 h-3.5" />}
        onToggle={handleToggle}
      />
    </div>
  );
});

// ── Row ────────────────────────────────────────────────────────
interface AccountRowProps {
  id: string;
  label: string;
  sublabel: string;
  checked: boolean;
  indent: boolean;
  dot?: 'live' | 'demo' | null;
  icon?: React.ReactNode;
  onToggle: (id: string) => void;
}

const AccountRow = memo(function AccountRow({
  id, label, sublabel, checked, indent, dot, icon, onToggle,
}: AccountRowProps) {
  return (
    <button
      onClick={() => onToggle(id)}
      className={cn(
        'w-full flex items-center gap-2.5 py-1.5 rounded-lg text-xs font-medium',
        'transition-all duration-150 group',
        indent ? 'pl-7 pr-2' : 'px-2',
        checked
          ? 'bg-[#C9A646]/10'
          : 'hover:bg-zinc-800/50'
      )}
    >
      {/* Left accent bar */}
      <div className={cn(
        'flex-shrink-0 w-0.5 h-4 rounded-full transition-all',
        checked ? 'bg-[#C9A646]' : 'bg-zinc-700 group-hover:bg-zinc-500'
      )} />

      {/* Icon — only for non-indented rows */}
      {icon && (
        <span className={checked ? 'text-[#C9A646]' : 'text-zinc-500'}>
          {icon}
        </span>
      )}

      {/* Labels */}
      <div className="text-left leading-none flex-1 min-w-0">
        <div className={cn(
          'font-semibold text-[11px] truncate',
          checked ? 'text-[#C9A646]' : 'text-zinc-200 group-hover:text-zinc-100'
        )}>
          {label}
        </div>
        <div className="text-[9px] mt-0.5 text-zinc-600">{sublabel}</div>
      </div>

      {/* Live/Demo dot */}
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          dot === 'live' ? 'bg-emerald-400' : 'bg-yellow-400'
        )} />
      )}

      {/* Checkmark */}
      {checked && (
        <Check className="w-3 h-3 text-[#C9A646] flex-shrink-0" strokeWidth={3} />
      )}
    </button>
  );
});