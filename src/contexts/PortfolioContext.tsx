// src/contexts/PortfolioContext.tsx
// ══════════════════════════════════════════════════════
// Global portfolio selection context.
// Single source of truth — all journal pages consume this.
// Multi-select checkboxes: supports ALL / Manual / Broker combos.
// ══════════════════════════════════════════════════════

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { usePortfolios, ALL_PORTFOLIOS_ID, TRADER_SCOPE_ID, type Portfolio } from '@/hooks/usePortfolios';
import { resolveHiddenPortfolioIds } from '@/lib/journal/hiddenAccounts';

interface PortfolioContextValue {
  portfolios:             Portfolio[];
  activePortfolioId:      string | null;
  effectivePortfolioId:   string | null;
  activePortfolio:        Portfolio | null;
  setActivePortfolioId:   (id: string | null) => void;
  isShowingAll:           boolean;
  isLoading:              boolean;
  manualPortfolios:       Portfolio[];
  tradovatePortfolios:    Portfolio[];
  brokerPortfolios:       Portfolio[];
  hasMultiplePortfolios:  boolean;
  // ── Multi-select ────────────────────────────────────
  selectedPortfolioIds:     string[];
  effectivePortfolioIds:    string[] | null;
  setSelectedPortfolioIds:  (ids: string[]) => void;
  togglePortfolioSelection: (id: string) => void;
  // ── TRADER scope ─────────────────────────────────────
  isTraderMode:             boolean;
  // ── Hidden-from-all-accounts portfolios ──────────────
  hiddenPortfolioIds:       string[];
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const base = usePortfolios();
  const hiddenPortfolioIds = useMemo(
    () => resolveHiddenPortfolioIds(base.portfolios),
    [base.portfolios],
  );
  const value = { ...base, hiddenPortfolioIds };
  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolioContext(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolioContext must be used inside PortfolioProvider');
  return ctx;
}

export { ALL_PORTFOLIOS_ID, TRADER_SCOPE_ID };
