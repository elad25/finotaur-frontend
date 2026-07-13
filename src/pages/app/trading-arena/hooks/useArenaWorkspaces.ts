/**
 * useArenaWorkspaces — NinjaTrader-style bottom workspace tabs for the
 * Trading Arena.
 *
 * Each workspace remembers an independent { view, symbol, interval,
 * assetClass } context. Re-selecting a tab restores that exact context;
 * "+" clones the currently active workspace's context (matching NinjaTrader's
 * "new tab = copy of current" behavior) and selects it. Persisted to
 * localStorage under 'finotaur:arena:workspaces:v1' (same key-naming
 * convention as useArenaIndicatorPreferences.ts / useChartStylePreferences.ts).
 *
 * Deliberately does NOT own any per-symbol sub-preferences (liquidity/DOM/
 * footprint row-size, indicators, chart style) — those already persist
 * themselves, keyed by symbol or globally, inside their own hooks/components.
 * This hook only owns the coarse "which chart am I looking at" context that
 * TradingArena.tsx currently holds as ephemeral useState.
 *
 * `readArenaWorkspaceStore` is exported as a pure function (no React) for the
 * same reason readArenaIndicatorPreferences() is — unit-testable without a
 * DOM-rendering harness, and reusable as the hook's lazy initializer.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { toTabId, type TabId } from '../types';
import type { ArenaInterval } from '../utils/intervals';
import type { AssetClass } from '@/components/backtest/symbolUniverse';

export const ARENA_WORKSPACES_STORAGE_KEY = 'finotaur:arena:workspaces:v1';

/** Matches TradingArena.tsx's own DEFAULT_SYMBOL / DEFAULT_INTERVAL — kept as
 * a local literal (not imported) to avoid a circular import between this hook
 * and the page that consumes it. */
const DEFAULT_SYMBOL = 'BTCUSDT';
const DEFAULT_INTERVAL: ArenaInterval = '15m';

export interface ArenaWorkspace {
  id: string;
  /** User-set custom name (via double-click rename). Undefined = auto-label from interval+symbol+view. */
  name?: string;
  view: TabId;
  symbol: string;
  interval: ArenaInterval;
  assetClass: AssetClass;
}

interface ArenaWorkspaceStore {
  workspaces: ArenaWorkspace[];
  activeId: string;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isAssetClass(v: unknown): v is AssetClass {
  return v === 'futures' || v === 'stocks' || v === 'forex' || v === 'crypto';
}

function buildDefaultStore(): ArenaWorkspaceStore {
  const id = generateId();
  return {
    workspaces: [
      { id, view: 'chart', symbol: DEFAULT_SYMBOL, interval: DEFAULT_INTERVAL, assetClass: 'crypto' },
    ],
    activeId: id,
  };
}

function sanitizeWorkspace(raw: unknown): ArenaWorkspace | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const id = typeof r.id === 'string' && r.id.length > 0 ? r.id : null;
  const symbol = typeof r.symbol === 'string' && r.symbol.trim().length > 0 ? r.symbol.toUpperCase() : null;
  const interval = typeof r.interval === 'string' && r.interval.trim().length > 0 ? r.interval : null;
  if (!id || !symbol || !interval) return null;

  const view = toTabId(typeof r.view === 'string' ? r.view : undefined);
  const assetClass: AssetClass = isAssetClass(r.assetClass) ? r.assetClass : 'crypto';
  const name = typeof r.name === 'string' && r.name.trim().length > 0 ? r.name.trim() : undefined;

  return { id, name, view, symbol, interval, assetClass };
}

function sanitizeStore(raw: unknown): ArenaWorkspaceStore {
  if (!raw || typeof raw !== 'object') return buildDefaultStore();

  const r = raw as Record<string, unknown>;
  const rawWorkspaces = Array.isArray(r.workspaces) ? r.workspaces : [];
  const workspaces = rawWorkspaces
    .map(sanitizeWorkspace)
    .filter((w): w is ArenaWorkspace => w !== null);

  if (workspaces.length === 0) return buildDefaultStore();

  const activeIdRaw = typeof r.activeId === 'string' ? r.activeId : null;
  const activeId = activeIdRaw && workspaces.some((w) => w.id === activeIdRaw)
    ? activeIdRaw
    : workspaces[0].id;

  return { workspaces, activeId };
}

function readRaw(): unknown {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ARENA_WORKSPACES_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    // Corrupt JSON / blocked storage — fall back silently.
    return null;
  }
}

function writeRaw(value: ArenaWorkspaceStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ARENA_WORKSPACES_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage full / blocked — non-fatal, tabs still work for the session.
  }
}

/** Pure read + sanitize. Safe to call outside React (lazy initializer + tests). */
export function readArenaWorkspaceStore(): ArenaWorkspaceStore {
  return sanitizeStore(readRaw());
}

export interface UseArenaWorkspacesResult {
  workspaces: ArenaWorkspace[];
  activeId: string;
  activeWorkspace: ArenaWorkspace;
  /** Clones the active workspace's context into a new tab and selects it (NinjaTrader "+" behavior). */
  addWorkspace: () => void;
  /** No-op if only one workspace remains (at least one must always exist). Selects the left neighbor if the active tab is removed. */
  removeWorkspace: (id: string) => void;
  selectWorkspace: (id: string) => void;
  /** Empty/whitespace name clears the custom name, reverting to the auto-label. */
  renameWorkspace: (id: string, name: string) => void;
  /** Shallow-patches the ACTIVE workspace's context (write-through persistence). */
  updateActiveWorkspace: (patch: Partial<Pick<ArenaWorkspace, 'view' | 'symbol' | 'interval' | 'assetClass'>>) => void;
}

export function useArenaWorkspaces(): UseArenaWorkspacesResult {
  // Lazy initializer — only touches localStorage on first render.
  const [store, setStore] = useState<ArenaWorkspaceStore>(readArenaWorkspaceStore);

  // Track the most recent store so updaters don't depend on a stale closure.
  const storeRef = useRef(store);
  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  const commit = useCallback((next: ArenaWorkspaceStore) => {
    setStore(next);
    writeRaw(next);
  }, []);

  const addWorkspace = useCallback(() => {
    const current = storeRef.current;
    const activeWs = current.workspaces.find((w) => w.id === current.activeId) ?? current.workspaces[0];
    const newId = generateId();
    const cloned: ArenaWorkspace = { ...activeWs, id: newId, name: undefined };
    commit({ workspaces: [...current.workspaces, cloned], activeId: newId });
  }, [commit]);

  const removeWorkspace = useCallback((id: string) => {
    const current = storeRef.current;
    if (current.workspaces.length <= 1) return; // at least one workspace must always exist
    const idx = current.workspaces.findIndex((w) => w.id === id);
    if (idx === -1) return;

    const nextWorkspaces = current.workspaces.filter((w) => w.id !== id);
    let nextActiveId = current.activeId;
    if (current.activeId === id) {
      const neighborIdx = Math.max(0, idx - 1);
      nextActiveId = nextWorkspaces[neighborIdx]?.id ?? nextWorkspaces[0].id;
    }
    commit({ workspaces: nextWorkspaces, activeId: nextActiveId });
  }, [commit]);

  const selectWorkspace = useCallback((id: string) => {
    const current = storeRef.current;
    if (current.activeId === id || !current.workspaces.some((w) => w.id === id)) return;
    commit({ ...current, activeId: id });
  }, [commit]);

  const renameWorkspace = useCallback((id: string, name: string) => {
    const current = storeRef.current;
    const trimmed = name.trim();
    const nextWorkspaces = current.workspaces.map((w) =>
      w.id === id ? { ...w, name: trimmed.length > 0 ? trimmed : undefined } : w,
    );
    commit({ ...current, workspaces: nextWorkspaces });
  }, [commit]);

  const updateActiveWorkspace = useCallback(
    (patch: Partial<Pick<ArenaWorkspace, 'view' | 'symbol' | 'interval' | 'assetClass'>>) => {
      const current = storeRef.current;
      const nextWorkspaces = current.workspaces.map((w) =>
        w.id === current.activeId ? { ...w, ...patch } : w,
      );
      commit({ ...current, workspaces: nextWorkspaces });
    },
    [commit],
  );

  const activeWorkspace = store.workspaces.find((w) => w.id === store.activeId) ?? store.workspaces[0];

  return {
    workspaces: store.workspaces,
    activeId: store.activeId,
    activeWorkspace,
    addWorkspace,
    removeWorkspace,
    selectWorkspace,
    renameWorkspace,
    updateActiveWorkspace,
  };
}
