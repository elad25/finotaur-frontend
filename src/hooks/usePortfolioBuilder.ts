// src/hooks/usePortfolioBuilder.ts
// ═══════════════════════════════════════════════════════════════
// Local form-state hook driving the My Portfolio builder UI.
// Pure state management — no I/O. Seeded from an optional initial
// MyPortfolio; re-seeds when `initial` changes (deep comparison).
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MyPortfolio,
  PortfolioAccount,
  Lot,
  emptyLot,
  emptyAccount,
  emptyPortfolio,
} from '@/lib/portfolio/types';

// ── Deep equality helper (avoids pulling in a dep like fast-deep-equal) ─
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, (b as unknown[])[i]));
  }
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every(k =>
    deepEqual(
      (a as Record<string, unknown>)[k],
      (b as Record<string, unknown>)[k],
    ),
  );
}

// ── Immutable array helpers ──────────────────────────────────────

function replaceAt<T>(arr: T[], index: number, value: T): T[] {
  return arr.map((item, i) => (i === index ? value : item));
}

function removeAt<T>(arr: T[], index: number): T[] {
  return arr.filter((_, i) => i !== index);
}

// ── Seed helper ───────────────────────────────────────────────────

function seed(initial: MyPortfolio | null | undefined): MyPortfolio {
  return initial ?? emptyPortfolio();
}

// ── Hook return type ──────────────────────────────────────────────

export interface UsePortfolioBuilderReturn {
  portfolio: MyPortfolio;
  activeAccountIndex: number;
  isDirty: boolean;
  // settings
  setCurrency: (c: string) => void;
  setBenchmarkEnabled: (on: boolean) => void;
  setBenchmarkSymbol: (sym: string | null) => void;
  // accounts
  setActiveAccountIndex: (i: number) => void;
  addAccount: () => void;
  renameAccount: (i: number, name: string) => void;
  removeAccount: (i: number) => void;
  setCash: (i: number, amount: number) => void;
  setCashCurrency: (i: number, cur: string) => void;
  // positions (operate on active account)
  addTicker: () => void;
  addLot: (ticker: string) => void;
  updateLot: (lotIndex: number, patch: Partial<Lot>) => void;
  removeLot: (lotIndex: number) => void;
  // bulk (CSV)
  addLotsToActive: (lots: Lot[]) => void;
  // lifecycle
  reset: (next?: MyPortfolio | null) => void;
}

// ── Hook ──────────────────────────────────────────────────────────

export function usePortfolioBuilder(
  initial?: MyPortfolio | null,
): UsePortfolioBuilderReturn {
  const [portfolio, setPortfolio] = useState<MyPortfolio>(() => seed(initial));
  const [activeAccountIndex, setActiveAccountIndex] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  // Track the previous `initial` value for deep-equality reseed
  const prevInitialRef = useRef<MyPortfolio | null | undefined>(initial);

  useEffect(() => {
    if (!deepEqual(initial, prevInitialRef.current)) {
      prevInitialRef.current = initial;
      setPortfolio(seed(initial));
      setActiveAccountIndex(0);
      setIsDirty(false);
    }
  }, [initial]);

  // ── Mutation wrapper: marks dirty ─────────────────────────────
  const mutate = useCallback(
    (updater: (prev: MyPortfolio) => MyPortfolio) => {
      setPortfolio(prev => updater(prev));
      setIsDirty(true);
    },
    [],
  );

  // ── Settings ─────────────────────────────────────────────────
  const setCurrency = useCallback(
    (c: string) => mutate(p => ({ ...p, currency: c })),
    [mutate],
  );

  const setBenchmarkEnabled = useCallback(
    (on: boolean) => mutate(p => ({ ...p, benchmarkEnabled: on })),
    [mutate],
  );

  const setBenchmarkSymbol = useCallback(
    (sym: string | null) => mutate(p => ({ ...p, benchmarkSymbol: sym })),
    [mutate],
  );

  // ── Accounts ─────────────────────────────────────────────────
  const addAccount = useCallback(() => {
    mutate(p => {
      const name = `Account ${p.accounts.length + 1}`;
      const newAccounts = [...p.accounts, emptyAccount(name)];
      // Activate the new account synchronously by computing the index here
      setActiveAccountIndex(newAccounts.length - 1);
      return { ...p, accounts: newAccounts };
    });
  }, [mutate]);

  const renameAccount = useCallback(
    (i: number, name: string) =>
      mutate(p => ({
        ...p,
        accounts: replaceAt(p.accounts, i, { ...p.accounts[i], name }),
      })),
    [mutate],
  );

  const removeAccount = useCallback(
    (i: number) => {
      mutate(p => {
        if (p.accounts.length <= 1) return p; // never go below 1 account
        const next = removeAt(p.accounts, i);
        // Fix active index: clamp to new length - 1
        setActiveAccountIndex(prev => Math.min(prev, next.length - 1));
        return { ...p, accounts: next };
      });
    },
    [mutate],
  );

  const setCash = useCallback(
    (i: number, amount: number) =>
      mutate(p => ({
        ...p,
        accounts: replaceAt(p.accounts, i, {
          ...p.accounts[i],
          cashPosition: amount,
        }),
      })),
    [mutate],
  );

  const setCashCurrency = useCallback(
    (i: number, cur: string) =>
      mutate(p => ({
        ...p,
        accounts: replaceAt(p.accounts, i, {
          ...p.accounts[i],
          cashCurrency: cur,
        }),
      })),
    [mutate],
  );

  // ── Positions (operate on active account) ────────────────────
  const addTicker = useCallback(() => {
    mutate(p => {
      const acc = p.accounts[activeAccountIndex];
      if (!acc) return p;
      const updated: PortfolioAccount = {
        ...acc,
        positions: [...acc.positions, emptyLot()],
      };
      return { ...p, accounts: replaceAt(p.accounts, activeAccountIndex, updated) };
    });
  }, [mutate, activeAccountIndex]);

  const addLot = useCallback(
    (ticker: string) => {
      mutate(p => {
        const acc = p.accounts[activeAccountIndex];
        if (!acc) return p;
        const updated: PortfolioAccount = {
          ...acc,
          positions: [...acc.positions, emptyLot(ticker)],
        };
        return {
          ...p,
          accounts: replaceAt(p.accounts, activeAccountIndex, updated),
        };
      });
    },
    [mutate, activeAccountIndex],
  );

  const updateLot = useCallback(
    (lotIndex: number, patch: Partial<Lot>) => {
      mutate(p => {
        const acc = p.accounts[activeAccountIndex];
        if (!acc) return p;
        const updatedPositions = replaceAt(acc.positions, lotIndex, {
          ...acc.positions[lotIndex],
          ...patch,
        });
        const updatedAcc: PortfolioAccount = {
          ...acc,
          positions: updatedPositions,
        };
        return {
          ...p,
          accounts: replaceAt(p.accounts, activeAccountIndex, updatedAcc),
        };
      });
    },
    [mutate, activeAccountIndex],
  );

  const removeLot = useCallback(
    (lotIndex: number) => {
      mutate(p => {
        const acc = p.accounts[activeAccountIndex];
        if (!acc) return p;
        const updatedAcc: PortfolioAccount = {
          ...acc,
          positions: removeAt(acc.positions, lotIndex),
        };
        return {
          ...p,
          accounts: replaceAt(p.accounts, activeAccountIndex, updatedAcc),
        };
      });
    },
    [mutate, activeAccountIndex],
  );

  // ── Bulk CSV ──────────────────────────────────────────────────
  const addLotsToActive = useCallback(
    (lots: Lot[]) => {
      mutate(p => {
        const acc = p.accounts[activeAccountIndex];
        if (!acc) return p;
        const updatedAcc: PortfolioAccount = {
          ...acc,
          positions: [...acc.positions, ...lots],
        };
        return {
          ...p,
          accounts: replaceAt(p.accounts, activeAccountIndex, updatedAcc),
        };
      });
    },
    [mutate, activeAccountIndex],
  );

  // ── Lifecycle ─────────────────────────────────────────────────
  const reset = useCallback((next?: MyPortfolio | null) => {
    prevInitialRef.current = next ?? null;
    setPortfolio(seed(next));
    setActiveAccountIndex(0);
    setIsDirty(false);
  }, []);

  return {
    portfolio,
    activeAccountIndex,
    isDirty,
    setCurrency,
    setBenchmarkEnabled,
    setBenchmarkSymbol,
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
    reset,
  };
}
