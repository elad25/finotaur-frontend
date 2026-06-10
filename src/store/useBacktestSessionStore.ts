// ==========================================
// BACKTEST SESSION STORE (Phase 1 infrastructure)
// ==========================================
// Client-side registry of backtest sessions, persisted to localStorage.
// Deliberately DB-free for Phase 1 (per product decision: "what exists is good").
// Trades placed during a session still persist to the existing `trades` table;
// this store only owns session config + which one is active.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BacktestSession,
  CreateBacktestSessionInput,
} from '@/types/backtestSession';

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  // crypto.randomUUID is available in all supported browsers; fallback for older envs.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `bt_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e9).toString(36)}`;
}

interface BacktestSessionStore {
  sessions: BacktestSession[];
  activeSessionId: string | null;

  createSession: (input: CreateBacktestSessionInput) => BacktestSession;
  updateSession: (id: string, patch: Partial<BacktestSession>) => void;
  deleteSession: (id: string) => void;
  archiveSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  getActiveSession: () => BacktestSession | undefined;
  getSession: (id: string) => BacktestSession | undefined;
}

export const useBacktestSessionStore = create<BacktestSessionStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,

      createSession: (input) => {
        const session: BacktestSession = {
          id: newId(),
          name: input.name.trim(),
          description: input.description?.trim() || undefined,
          strategyId: input.strategyId ?? null,
          strategyName: input.strategyName ?? null,
          assetType: input.assetType,
          symbol: input.symbol,
          timeframe: input.timeframe || '1m',
          startBalance: input.startBalance,
          leverage: input.leverage ?? 1,
          dateRange: input.dateRange,
          status: 'active',
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };

        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSessionId: session.id,
        }));

        return session;
      },

      updateSession: (id, patch) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...patch, updatedAt: nowIso() } : s
          ),
        })),

      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          activeSessionId:
            state.activeSessionId === id ? null : state.activeSessionId,
        })),

      archiveSession: (id) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, status: 'archived', updatedAt: nowIso() } : s
          ),
        })),

      setActiveSession: (id) => set({ activeSessionId: id }),

      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find((s) => s.id === activeSessionId);
      },

      getSession: (id) => get().sessions.find((s) => s.id === id),
    }),
    {
      name: 'finotaur-backtest-sessions',
      version: 1,
    }
  )
);
