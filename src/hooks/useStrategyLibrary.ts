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
import type { Strategy } from '@/types/backtest-strategy';

const STORAGE_KEY = 'finotaur.backtest.strategies.v1';

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
  const [strategies, setStrategies] = useState<Strategy[]>(() => readAll());

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
