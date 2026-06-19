// src/contexts/PortfolioContext.tsx
// ══════════════════════════════════════════════════════
// Global portfolio selection context.
// Single source of truth — all journal pages consume this.
// Multi-select checkboxes: supports ALL / Manual / Broker combos.
// ══════════════════════════════════════════════════════

import { createContext, useContext, ReactNode } from 'react';
import { usePortfolios, ALL_PORTFOLIOS_ID, TRADER_SCOPE_ID, type Portfolio } from '@/hooks/usePortfolios';

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
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const value = usePortfolios();
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
