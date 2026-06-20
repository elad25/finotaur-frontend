// ============================================================================
// AUTO BACKTEST STORE
// Zustand + immer + devtools — matches the style of useBacktestStore.ts.
// Manages setup config, candle loading, run execution, progress tracking,
// and localStorage persistence via setupRepository.
// ============================================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Candle } from '@/components/ReplayChart/types';
import type { SetupDefinition, PatternParams } from '@/core/auto/types';
import { makeDefaultSetup } from '@/core/auto/types';
import type { AutoBacktestResult } from '@/core/auto/AutoBacktestEngine';
import { getCandleSource } from '@/services/backtest/candleSource';
import { runAutoBacktestInWorker } from '@/services/backtest/autoBacktestRunner';
import {
  listSetups,
  listRuns,
  getSetup,
  saveSetup,
  deleteSetup as repoDeleteSetup,
  getRun,
  deleteRun as repoDeleteRun,
  saveRun,
  buildSavedRun,
  type SavedRun,
} from '@/services/backtest/setupRepository';

// ---------------------------------------------------------------------------
// State / action types
// ---------------------------------------------------------------------------

export type AutoBacktestStatus =
  | 'idle'
  | 'loading-data'
  | 'running'
  | 'done'
  | 'error';

export interface AutoBacktestProgress {
  scanned: number;
  total: number;
  found: number;
}

export interface AutoBacktestState {
  /** The setup currently being edited / run. */
  currentSetup: SetupDefinition;
  /** Range start, ms (Unix epoch). */
  from: number;
  /** Range end, ms (Unix epoch). */
  to: number;
  status: AutoBacktestStatus;
  progress: AutoBacktestProgress;
  result: AutoBacktestResult | null;
  error: string | null;
  savedSetups: SetupDefinition[];
  savedRuns: SavedRun[];
  /** Index into result.trades of the highlighted trade (or null). */
  selectedTradeIndex: number | null;
}

export interface AutoBacktestActions {
  updateSetup(partial: Partial<SetupDefinition>): void;
  /** Replace the single MVP pattern. */
  setPattern(patternParams: PatternParams): void;
  /**
   * Toggle a pattern family on/off. When the family is already the active
   * pattern it is removed (empty patterns); otherwise it becomes the only
   * active pattern. MVP single-pattern UX.
   */
  togglePattern(patternParams: PatternParams): void;
  setInstrument(
    symbol: string,
    timeframe: string,
    source: 'binance' | 'polygon' | 'udf',
  ): void;
  setDateRange(from: number, to: number): void;
  /** Load candles → run in worker → save a SavedRun on success. */
  runBacktest(): Promise<void>;
  saveCurrentSetup(): Promise<void>;
  loadSetup(id: string): Promise<void>;
  deleteSetup(id: string): Promise<void>;
  loadRun(id: string): Promise<void>;
  deleteRun(id: string): Promise<void>;
  refreshSaved(): Promise<void>;
  selectTrade(index: number | null): void;
  reset(): void;
}

export type AutoBacktestStore = AutoBacktestState & AutoBacktestActions;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

const initialState: AutoBacktestState = {
  currentSetup: makeDefaultSetup('BTCUSDT', '15m'),
  from: Date.now() - SIX_MONTHS_MS,
  to: Date.now(),
  status: 'idle',
  progress: { scanned: 0, total: 0, found: 0 },
  result: null,
  error: null,
  savedSetups: [],
  savedRuns: [],
  selectedTradeIndex: null,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAutoBacktestStore = create<AutoBacktestStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,
      // savedSetups / savedRuns hydrate asynchronously after creation — see the
      // refreshSaved() kick-off at the bottom of this module.

      // ---------------------------------------------------------------------
      // Setup editing
      // ---------------------------------------------------------------------

      updateSetup(partial) {
        set((state) => {
          Object.assign(state.currentSetup, partial);
          state.currentSetup.updatedAt = Date.now();
        });
      },

      setPattern(patternParams) {
        set((state) => {
          state.currentSetup.patterns = [patternParams];
          state.currentSetup.updatedAt = Date.now();
        });
      },

      togglePattern(patternParams) {
        set((state) => {
          const active = state.currentSetup.patterns[0];
          if (active && active.type === patternParams.type) {
            state.currentSetup.patterns = [];
          } else {
            state.currentSetup.patterns = [patternParams];
          }
          state.currentSetup.updatedAt = Date.now();
        });
      },

      setInstrument(symbol, timeframe, source) {
        set((state) => {
          state.currentSetup.instrument = { symbol, timeframe, source };
          state.currentSetup.updatedAt = Date.now();
          // Invalidate stale result.
          state.result = null;
          state.error = null;
          state.status = 'idle';
          state.progress = { scanned: 0, total: 0, found: 0 };
          state.selectedTradeIndex = null;
        });
      },

      setDateRange(from, to) {
        set((state) => {
          state.from = from;
          state.to = to;
          // Range changed → previous result no longer reflects current inputs.
          state.result = null;
          state.status = 'idle';
        });
      },

      // ---------------------------------------------------------------------
      // Run
      // ---------------------------------------------------------------------

      async runBacktest() {
        const { currentSetup, from, to } = get();
        const { symbol, timeframe, source } = currentSetup.instrument;

        // 1. Load candles.
        set((state) => {
          state.status = 'loading-data';
          state.error = null;
          state.result = null;
          state.progress = { scanned: 0, total: 0, found: 0 };
          state.selectedTradeIndex = null;
        });

        let candles: Candle[];
        try {
          candles = await getCandleSource(source).getCandles(
            symbol,
            timeframe,
            from,
            to,
          );
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Failed to load candles.';
          set((state) => {
            state.error = message;
            state.status = 'error';
          });
          return;
        }

        if (candles.length === 0) {
          set((state) => {
            state.error = 'No candle data returned for the selected range.';
            state.status = 'error';
          });
          return;
        }

        // 2. Run in worker.
        set((state) => {
          state.status = 'running';
        });

        try {
          const result = await runAutoBacktestInWorker(
            currentSetup,
            candles,
            undefined, // htfCandles — MVP: not loaded here
            (scanned, total, found) => {
              set((state) => {
                state.progress = { scanned, total, found };
              });
            },
          );

          // 3. Show the result immediately — do NOT block the UI on persistence.
          set((state) => {
            state.result = result;
            state.status = 'done';
          });

          // 4. Persist the run (Supabase-first, localStorage fallback), then
          //    refresh the saved-runs library. Persistence never throws.
          const run = buildSavedRun(currentSetup, result, {
            symbol,
            timeframe,
            from,
            to,
          });
          await saveRun(run);
          const savedRuns = await listRuns();
          set((state) => {
            state.savedRuns = savedRuns;
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Backtest run failed.';
          set((state) => {
            state.error = message;
            state.status = 'error';
          });
        }
      },

      // ---------------------------------------------------------------------
      // Persistence — setups
      // ---------------------------------------------------------------------

      async saveCurrentSetup() {
        const { currentSetup } = get();
        await saveSetup(currentSetup);
        const savedSetups = await listSetups();
        set((state) => {
          state.savedSetups = savedSetups;
        });
      },

      async loadSetup(id) {
        const found = await getSetup(id);
        if (!found) return;
        set((state) => {
          state.currentSetup = found;
          state.result = null;
          state.error = null;
          state.status = 'idle';
          state.progress = { scanned: 0, total: 0, found: 0 };
          state.selectedTradeIndex = null;
        });
      },

      async deleteSetup(id) {
        await repoDeleteSetup(id);
        const savedSetups = await listSetups();
        set((state) => {
          state.savedSetups = savedSetups;
        });
      },

      // ---------------------------------------------------------------------
      // Persistence — runs
      // ---------------------------------------------------------------------

      async loadRun(id) {
        const found = await getRun(id);
        if (!found) return;
        set((state) => {
          state.currentSetup = found.setupSnapshot;
          state.from = found.from;
          state.to = found.to;
          state.result = {
            detections: found.detections,
            trades: found.trades,
            statistics: found.statistics,
            equityCurve: found.equityCurve,
            rMultipleDistribution:
              found.rMultipleDistribution ?? {
                '< -2R': 0,
                '-2R to -1R': 0,
                '-1R to 0R': 0,
                '0R to 1R': 0,
                '1R to 2R': 0,
                '2R to 3R': 0,
                '> 3R': 0,
              },
          };
          state.status = 'done';
          state.error = null;
          state.progress = { scanned: 0, total: 0, found: 0 };
          state.selectedTradeIndex = null;
        });
      },

      async deleteRun(id) {
        await repoDeleteRun(id);
        const savedRuns = await listRuns();
        set((state) => {
          state.savedRuns = savedRuns;
        });
      },

      // ---------------------------------------------------------------------
      // Misc
      // ---------------------------------------------------------------------

      async refreshSaved() {
        const [savedSetups, savedRuns] = await Promise.all([
          listSetups(),
          listRuns(),
        ]);
        set((state) => {
          state.savedSetups = savedSetups;
          state.savedRuns = savedRuns;
        });
      },

      selectTrade(index) {
        set((state) => {
          state.selectedTradeIndex = index;
        });
      },

      reset() {
        set((state) => {
          state.from = Date.now() - SIX_MONTHS_MS;
          state.to = Date.now();
          state.status = 'idle';
          state.progress = { scanned: 0, total: 0, found: 0 };
          state.result = null;
          state.error = null;
          state.selectedTradeIndex = null;
          // Keep currentSetup and saved library intact.
        });
      },
    })),
    {
      name: 'finotaur-auto-backtest',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);

// Hydrate the persisted library once, after store creation. The repo is async
// (Supabase-first, localStorage fallback) so it cannot run inside the synchronous
// store initializer. Fire-and-forget — failures fall back to localStorage and
// are logged inside the repo; never throw to module init.
void useAutoBacktestStore.getState().refreshSaved();

export default useAutoBacktestStore;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectAutoSetup = (s: AutoBacktestStore) => s.currentSetup;
export const selectAutoResult = (s: AutoBacktestStore) => s.result;
export const selectAutoProgress = (s: AutoBacktestStore) => s.progress;
export const selectAutoStatus = (s: AutoBacktestStore) => s.status;
export const selectAutoError = (s: AutoBacktestStore) => s.error;
export const selectSavedSetups = (s: AutoBacktestStore) => s.savedSetups;
export const selectSavedRuns = (s: AutoBacktestStore) => s.savedRuns;
export const selectSelectedTradeIndex = (s: AutoBacktestStore) =>
  s.selectedTradeIndex;
