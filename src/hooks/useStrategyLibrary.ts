/**
 * useStrategyLibrary — localStorage-backed CRUD for backtest strategies.
 *
 * Phase 3 of the backtest marketing-ready sprint. Strategies are user
 * artifacts that don't (yet) need cross-device sync — localStorage is
 * sufficient. Phase 3.5+ can migrate to Supabase with the same hook shape.
 *
 * Storage key: `finotaur.backtest.strategies.v1`. Bumping the suffix is
 * the cleanest migration path if the Strategy shape ever changes.
 */

import { useCallback, useEffect, useState } from 'react';
import { makeEmptyStrategy, type Strategy } from '@/types/backtest-strategy';

const STORAGE_KEY = 'finotaur.backtest.strategies.v1';
// Seed flag — set once after first-time hydration so deleting all seeded
// strategies doesn't trigger re-seeding on the next mount.
const SEED_FLAG_KEY = 'finotaur.backtest.strategies.seeded.v1';

// Two ship-with-the-product strategies. New users see these in the picker
// immediately so the Strategy Builder integration isn't a dead end.
// Keep aligned with the TEMPLATES array in Builder.tsx.
function buildDefaultStrategies(): Strategy[] {
  const now = Date.now();

  const rsi = makeEmptyStrategy('RSI Oversold/Overbought');
  rsi.notes = 'Buy when RSI < 30, close when RSI > 70.';
  rsi.rules = [
    {
      id: `rule_${now}_rsi_a`,
      action: 'OPEN_LONG',
      size: 1,
      when: {
        left: { kind: 'indicator', ref: { type: 'RSI', period: 14 } },
        operator: 'lt',
        right: { kind: 'literal', value: 30 },
      },
      stopLossPct: 2,
      takeProfitPct: 4,
    },
    {
      id: `rule_${now}_rsi_b`,
      action: 'CLOSE',
      size: 0,
      when: {
        left: { kind: 'indicator', ref: { type: 'RSI', period: 14 } },
        operator: 'gt',
        right: { kind: 'literal', value: 70 },
      },
    },
  ];

  const sma = makeEmptyStrategy('SMA Cross (50)');
  sma.notes = 'Buy when price crosses above SMA 50, close when it crosses below.';
  sma.rules = [
    {
      id: `rule_${now}_sma_a`,
      action: 'OPEN_LONG',
      size: 1,
      when: {
        left: { kind: 'price', field: 'close' },
        operator: 'crosses_above',
        right: { kind: 'indicator', ref: { type: 'SMA', period: 50 } },
      },
      stopLossPct: 1.5,
      takeProfitPct: 3,
    },
    {
      id: `rule_${now}_sma_b`,
      action: 'CLOSE',
      size: 0,
      when: {
        left: { kind: 'price', field: 'close' },
        operator: 'crosses_below',
        right: { kind: 'indicator', ref: { type: 'SMA', period: 50 } },
      },
    },
  ];

  return [rsi, sma];
}

function readAll(): Strategy[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Strategy[];
  } catch {
    return [];
  }
}

// First-time seed: if we've never written to STORAGE_KEY before AND it is
// currently empty/missing, hydrate with the two default strategies so the
// Chart strategy picker has real options out of the box.
function readAllOrSeed(): Strategy[] {
  if (typeof window === 'undefined') return [];
  const existing = readAll();
  if (existing.length > 0) return existing;
  try {
    if (window.localStorage.getItem(SEED_FLAG_KEY) === 'true') return existing;
    const defaults = buildDefaultStrategies();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    window.localStorage.setItem(SEED_FLAG_KEY, 'true');
    return defaults;
  } catch {
    return existing;
  }
}

function writeAll(strategies: Strategy[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(strategies));
  } catch {
    // Quota or private-mode failure — silent. The user will see their
    // unsaved strategy disappear on reload; not catastrophic.
  }
}

export interface UseStrategyLibraryReturn {
  strategies: Strategy[];
  saveStrategy: (strategy: Strategy) => void;     // create OR update by id
  deleteStrategy: (id: string) => void;
  duplicateStrategy: (id: string) => Strategy | null;
  refresh: () => void;
}

export function useStrategyLibrary(): UseStrategyLibraryReturn {
  const [strategies, setStrategies] = useState<Strategy[]>(() => readAllOrSeed());

  // Cross-tab sync via the `storage` event so two open tabs stay in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setStrategies(readAll());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const saveStrategy = useCallback((strategy: Strategy) => {
    setStrategies((prev) => {
      const next = prev.some((s) => s.id === strategy.id)
        ? prev.map((s) => (s.id === strategy.id ? { ...strategy, updatedAt: Date.now() } : s))
        : [{ ...strategy, updatedAt: Date.now() }, ...prev];
      writeAll(next);
      return next;
    });
  }, []);

  const deleteStrategy = useCallback((id: string) => {
    setStrategies((prev) => {
      const next = prev.filter((s) => s.id !== id);
      writeAll(next);
      return next;
    });
  }, []);

  const duplicateStrategy = useCallback((id: string): Strategy | null => {
    const source = strategies.find((s) => s.id === id);
    if (!source) return null;
    const now = Date.now();
    const copy: Strategy = {
      ...source,
      id: `strat_${now}_${Math.random().toString(36).slice(2, 8)}`,
      name: `${source.name} (copy)`,
      createdAt: now,
      updatedAt: now,
    };
    setStrategies((prev) => {
      const next = [copy, ...prev];
      writeAll(next);
      return next;
    });
    return copy;
  }, [strategies]);

  const refresh = useCallback(() => setStrategies(readAll()), []);

  return { strategies, saveStrategy, deleteStrategy, duplicateStrategy, refresh };
}
