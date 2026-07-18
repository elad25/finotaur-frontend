// ============================================================================
// AUTO BACKTEST STORE
// Zustand + immer + devtools — matches the style of useBacktestStore.ts.
// Manages setup config, candle loading, run execution, progress tracking,
// and localStorage persistence via setupRepository.
// ============================================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { toast } from 'sonner';
import type { Candle } from '@/components/ReplayChart/types';
import type { SetupDefinition, PatternParams, PatternType } from '@/core/auto/types';
import { makeDefaultSetup, DEFAULT_PATTERN_PARAMS } from '@/core/auto/types';
import type { AutoBacktestResult } from '@/core/auto/AutoBacktestEngine';
import type { StrategyDefinitionV2 } from '@/core/auto/v2/types';
import { getCandleSource, sourceForSymbol } from '@/services/backtest/candleSource';
import { CandleFetchError } from '@/services/backtest/errors';
import { runAutoBacktestInWorker, runStrategyV2InWorker } from '@/services/backtest/autoBacktestRunner';
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
  /**
   * v2 generic-rules-engine strategy definition, when the caller runs one
   * via `runStrategyV2Backtest`. `null` when no v2 run has been made yet.
   * Additive slot only — `currentSetup` (v1) remains the primary/default
   * editing surface; this does not replace or restructure it.
   */
  strategyV2: StrategyDefinitionV2 | null;
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
  /**
   * Id of the SavedRun backing the current `result` (set right after a run
   * completes or a saved run is loaded). Used as the deterministic run
   * identifier for journal-save idempotency (`autobt_<runId>_<index>`).
   * `null` when no run has completed/loaded yet.
   */
  lastRunId: string | null;
}

export interface AutoBacktestActions {
  updateSetup(partial: Partial<SetupDefinition>): void;
  /**
   * Set (or clear) the v2 strategy slot directly, without running it. Used
   * by the NL "Strategy AI" flow to stash a freshly parsed/refined
   * definition for review (StrategyV2Summary) before the user hits Run.
   * `runStrategyV2Backtest` also writes this field as part of running.
   */
  setStrategyV2(def: StrategyDefinitionV2 | null): void;
  /**
   * Deep-merge an AI-extracted partial SetupDefinition into the current setup.
   * - Scalar fields (direction, name, description) are replaced when present.
   * - Nested objects (entry, stop, target, instrument, session, bias, risk) are
   *   merged field-by-field, so any key the AI omitted keeps its existing value.
   * - `patterns` replaces the array wholesale when provided (not merged element-
   *   wise, because the AI always sends a coherent full list or nothing).
   * - Identity fields (id, schemaVersion, createdAt) are NEVER overwritten.
   */
  applyAISetup(partial: Partial<SetupDefinition>): void;
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
  /**
   * v2 counterpart of `runBacktest`: loads candles for `def.instrument` /
   * `def.timeframes.execution` over the store's existing `from`/`to` range,
   * runs it via the v2 worker/runner, and writes into the SAME `result`
   * field `runBacktest` uses — the UI consumes v1 and v2 results
   * identically. No SavedRun persistence (v1-only shape) — out of scope for
   * this increment.
   */
  runStrategyV2Backtest(def: StrategyDefinitionV2): Promise<void>;
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

/**
 * Map a candle-fetch failure to a friendly, actionable English message.
 * CandleFetchError carries a `kind` from binanceDataService's retry/error
 * mapping; anything else falls back to a generic message.
 */
function mapCandleFetchErrorToMessage(err: unknown): string {
  if (err instanceof CandleFetchError) {
    switch (err.kind) {
      case 'symbol-not-found':
        return 'Symbol not found on Binance — check the ticker (e.g. BTCUSDT).';
      case 'rate-limited':
        return 'Binance rate limit hit — wait a minute and try again.';
      case 'timeout':
        return 'Request timed out — check your connection and try again.';
      case 'network':
        return 'Network error while fetching data — check your connection.';
      default:
        return err.message || 'Failed to load candles.';
    }
  }
  return err instanceof Error ? err.message : 'Failed to load candles.';
}

const initialState: AutoBacktestState = {
  currentSetup: makeDefaultSetup('BTCUSDT', '15m'),
  strategyV2: null,
  from: Date.now() - SIX_MONTHS_MS,
  to: Date.now(),
  status: 'idle',
  progress: { scanned: 0, total: 0, found: 0 },
  result: null,
  error: null,
  savedSetups: [],
  savedRuns: [],
  selectedTradeIndex: null,
  lastRunId: null,
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

      applyAISetup(partial) {
        set((state) => {
          const s = state.currentSetup;

          // Scalar fields — replace only when the AI provided them.
          if (partial.name !== undefined) s.name = partial.name;
          if (partial.description !== undefined) s.description = partial.description;
          if (partial.direction !== undefined) s.direction = partial.direction;

          // Patterns — the AI extraction schema captures only a flat subset of
          // each pattern's fields, so its objects can miss required nested keys
          // (e.g. OB/Breaker/Liquidity need `swing.lookback`, OB needs
          // `obKind`). Merge each AI pattern onto the full canonical default for
          // its type so the builder always receives a structurally-complete
          // pattern. Without this the builder crashes on `pattern.swing.lookback`.
          if (partial.patterns !== undefined && partial.patterns.length > 0) {
            s.patterns = partial.patterns.map((p) => {
              const base = DEFAULT_PATTERN_PARAMS[p.type as PatternType];
              if (!base) return p;
              return { ...structuredClone(base), ...p } as PatternParams;
            });
          }

          // Nested objects — field-level merge so unset AI keys keep defaults.
          if (partial.entry !== undefined) {
            s.entry = { ...s.entry, ...partial.entry };
          }
          if (partial.stop !== undefined) {
            s.stop = { ...s.stop, ...partial.stop };
          }
          if (partial.target !== undefined) {
            s.target = { ...s.target, ...partial.target };
          }
          if (partial.instrument !== undefined) {
            s.instrument = { ...s.instrument, ...partial.instrument };
          }
          if (partial.session !== undefined) {
            s.session = { ...s.session, ...partial.session };
          }
          if (partial.bias !== undefined) {
            s.bias = { ...s.bias, ...partial.bias };
          }
          if (partial.risk !== undefined) {
            s.risk = { ...s.risk, ...partial.risk };
          }

          // id, schemaVersion, createdAt are intentionally never overwritten.
          s.updatedAt = Date.now();
        });
      },

      setStrategyV2(def) {
        set((state) => {
          state.strategyV2 = def;
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
        const { symbol, timeframe } = currentSetup.instrument;

        // 1. Load candles.
        set((state) => {
          state.status = 'loading-data';
          state.error = null;
          state.result = null;
          state.progress = { scanned: 0, total: 0, found: 0 };
          state.selectedTradeIndex = null;
        });

        // Route by symbol, not by the setup's stored `instrument.source`:
        // futures symbols (MNQ, NQ, ES, ...) are served from Supabase/Databento;
        // everything else (crypto pairs) keeps using Binance. This keeps the
        // existing crypto path byte-for-byte unchanged.
        const resolvedSource = sourceForSymbol(symbol);

        let candles: Candle[];
        try {
          candles = await getCandleSource(resolvedSource).getCandles(
            symbol,
            timeframe,
            from,
            to,
          );
        } catch (err) {
          const message = mapCandleFetchErrorToMessage(err);
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
            () => {
              toast.warning(
                'Running the backtest on the main thread (worker unavailable) — the UI may be less responsive on large datasets.'
              );
            },
          );

          // 3. Show the result immediately — do NOT block the UI on persistence.
          set((state) => {
            state.result = result;
            state.status = 'done';
          });

          if (result.detectionsCapped) {
            toast.warning(
              'Too many pattern detections — showing the first 10,000. Narrow the date range or tighten the pattern.'
            );
          }

          // 4. Persist the run (Supabase-first, localStorage fallback), then
          //    refresh the saved-runs library. Persistence never throws — the
          //    typed result tells us whether the user needs to be warned.
          const run = buildSavedRun(currentSetup, result, {
            symbol,
            timeframe,
            from,
            to,
          });
          set((state) => {
            state.lastRunId = run.id;
          });
          const saveResult = await saveRun(run);
          if (saveResult.ok && saveResult.storage === 'local') {
            toast.warning('Run saved locally only — cloud sync failed');
          } else if (saveResult.ok === false) {
            toast.error('Run could not be saved — results will be lost on reload');
          }
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

      async runStrategyV2Backtest(def) {
        const { from, to } = get();
        const { symbol } = def.instrument;
        const timeframe = def.timeframes.execution;

        set((state) => {
          state.strategyV2 = def;
          state.status = 'loading-data';
          state.error = null;
          state.result = null;
          state.progress = { scanned: 0, total: 0, found: 0 };
          state.selectedTradeIndex = null;
        });

        // Same routing rule as runBacktest(): route by symbol, not by the
        // definition's declared instrument.source.
        const resolvedSource = sourceForSymbol(symbol);

        let candles: Candle[];
        try {
          candles = await getCandleSource(resolvedSource).getCandles(symbol, timeframe, from, to);
        } catch (err) {
          const message = mapCandleFetchErrorToMessage(err);
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

        set((state) => {
          state.status = 'running';
        });

        try {
          const result = await runStrategyV2InWorker(
            def,
            candles,
            (scanned, total, found) => {
              set((state) => {
                state.progress = { scanned, total, found };
              });
            },
            () => {
              toast.warning(
                'Running the backtest on the main thread (worker unavailable) — the UI may be less responsive on large datasets.'
              );
            },
          );

          // Same result field runBacktest() writes — the UI consumes v1 and
          // v2 results identically.
          set((state) => {
            state.result = result;
            state.status = 'done';
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Backtest run failed.';
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
          state.lastRunId = found.id;
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
          state.lastRunId = null;
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
export const selectAutoRunId = (s: AutoBacktestStore) => s.lastRunId;
