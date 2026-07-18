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
import type { StrategyDefinitionV2, TF } from '@/core/auto/v2/types';
import { smtTfsUsed } from '@/core/auto/v2/ConditionCompiler';
import { timeframeToMs } from '@/core/auto/MarketContext';
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
  isV2SetupDefinition,
  type SavedRun,
  type SavedSetupDefinition,
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

/**
 * The instrument/timeframe actually backing the CURRENT `result` — set from
 * the definition actually being run (v1 `currentSetup.instrument` or v2
 * `strategyV2.instrument`/`timeframes.execution`), not inferred after the
 * fact. Exists because `currentSetup` (v1) is a separate, independently-
 * edited slot from `strategyV2` (v2) — after a v2 run, `currentSetup` may
 * still hold a stale instrument from an earlier v1 run (or the module
 * default), which caused results-page components to chart/caption the WRONG
 * symbol. Additive — components fall back to `currentSetup.instrument` when
 * this is `null` (e.g. before any run has completed), preserving the
 * classic v1-only path unchanged.
 */
export interface LastRunInstrument {
  symbol: string;
  timeframe: string;
  source: string;
  engine: 'v1' | 'v2';
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
  /** v1 SetupDefinitions and v2 StrategyDefinitionV2 templates — same library. */
  savedSetups: SavedSetupDefinition[];
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
  /**
   * The instrument actually backing the current `result` — see
   * {@link LastRunInstrument}. `null` when no run has started/loaded yet.
   */
  lastRunInstrument: LastRunInstrument | null;
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
  /**
   * Save the current v2 strategy (`state.strategyV2`) into the same
   * `bt_setups` library as v1 "Saved setups" (Supabase-first, localStorage
   * fallback). `name` overrides `definition.name` when provided; otherwise
   * the strategy's own name is used. No-op (resolves immediately) when
   * there is no v2 strategy to save.
   */
  saveStrategyV2AsTemplate(name?: string): Promise<void>;
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
  lastRunInstrument: null,
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
        const { symbol, timeframe, source } = currentSetup.instrument;

        // 1. Load candles.
        set((state) => {
          state.status = 'loading-data';
          state.error = null;
          state.result = null;
          state.progress = { scanned: 0, total: 0, found: 0 };
          state.selectedTradeIndex = null;
          // Record the instrument actually being run — see LastRunInstrument.
          state.lastRunInstrument = { symbol, timeframe, source, engine: 'v1' };
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
        const { symbol, source: instrumentSource } = def.instrument;
        const timeframe = def.timeframes.execution;

        set((state) => {
          state.strategyV2 = def;
          state.status = 'loading-data';
          state.error = null;
          state.result = null;
          state.progress = { scanned: 0, total: 0, found: 0 };
          state.selectedTradeIndex = null;
          // Record the instrument actually being run — see LastRunInstrument.
          // This is what fixes the v2-results-show-wrong-instrument bug: the
          // v1 `currentSetup.instrument` slot is untouched by a v2 run, so
          // components must read this instead of `selectAutoSetup`.
          state.lastRunInstrument = { symbol, timeframe, source: instrumentSource, engine: 'v2' };
        });

        // Same routing rule as runBacktest(): route by symbol, not by the
        // definition's declared instrument.source.
        const resolvedSource = sourceForSymbol(symbol);
        const source = getCandleSource(resolvedSource);

        // MTF (Increment 3): every context timeframe actually referenced by
        // a phase needs its own candle series, fetched over the SAME date
        // range as the execution series. Context series additionally get
        // EXTRA LOOKBACK (120 context-bars, converted to ms via the same
        // TF->ms map TimeframeSet/MarketContext use) so higher-TF structures
        // (swings, FVGs, ...) already exist from the first execution bar
        // rather than only forming partway through the requested window.
        // Trades still only occur within [from, to] — the engine iterates
        // EXECUTION bars, which are fetched with NO extra lead-in.
        const LEAD_IN_BARS = 120;
        const contextTfsUsed = Array.from(
          new Set(
            def.phases
              .map((p) => p.timeframe)
              .filter((tf): tf is TF => tf !== undefined && tf !== timeframe),
          ),
        );

        // SMT divergence (Increment 4a): every timeframe an `smt` condition
        // references needs the COMPARE symbol's own candle series too — same
        // date range as the execution series for the execution TF, and the
        // SAME extra-lead-in convention as context TFs above for a
        // context-TF smt condition (its compare series' structures need to
        // already be formed, identical reasoning to the traded side).
        // Absent/empty for every strategy without an `smt` condition — no
        // extra fetch, no overhead.
        const smtTfs = smtTfsUsed(def);
        const compareSymbol = def.compareSymbols?.[0];

        const seriesByTf: Partial<Record<TF, Candle[]>> = {};
        const compareSeriesBySymbolTf: Partial<Record<string, Partial<Record<TF, Candle[]>>>> = {};
        try {
          seriesByTf[timeframe] = await source.getCandles(symbol, timeframe, from, to);
          for (const tf of contextTfsUsed) {
            const leadInMs = (timeframeToMs(tf) ?? 0) * LEAD_IN_BARS;
            seriesByTf[tf] = await source.getCandles(symbol, tf, from - leadInMs, to);
          }
          if (compareSymbol && smtTfs.length > 0) {
            const compareSource = getCandleSource(sourceForSymbol(compareSymbol));
            const compareByTf: Partial<Record<TF, Candle[]>> = {};
            for (const tf of smtTfs) {
              compareByTf[tf] =
                tf === timeframe
                  ? await compareSource.getCandles(compareSymbol, tf, from, to)
                  : await compareSource.getCandles(compareSymbol, tf, from - (timeframeToMs(tf) ?? 0) * LEAD_IN_BARS, to);
            }
            compareSeriesBySymbolTf[compareSymbol] = compareByTf;
          }
        } catch (err) {
          const message = mapCandleFetchErrorToMessage(err);
          set((state) => {
            state.error = message;
            state.status = 'error';
          });
          return;
        }

        const candles = seriesByTf[timeframe] ?? [];
        if (candles.length === 0) {
          set((state) => {
            state.error = 'No candle data returned for the selected range.';
            state.status = 'error';
          });
          return;
        }
        const missingContextTf = contextTfsUsed.find((tf) => !seriesByTf[tf] || seriesByTf[tf]!.length === 0);
        if (missingContextTf) {
          set((state) => {
            state.error = `No candle data returned for context timeframe "${missingContextTf}".`;
            state.status = 'error';
          });
          return;
        }
        const missingSmtTf =
          compareSymbol &&
          smtTfs.find((tf) => {
            const s = compareSeriesBySymbolTf[compareSymbol]?.[tf];
            return !s || s.length === 0;
          });
        if (missingSmtTf) {
          set((state) => {
            state.error = `No candle data returned for compare symbol "${compareSymbol}" on timeframe "${missingSmtTf}".`;
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
            // Always the map shape — a single-TF strategy just has one key
            // (the execution timeframe); `runStrategyV2` treats that
            // identically to the legacy plain-array shape.
            seriesByTf,
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
            Object.keys(compareSeriesBySymbolTf).length > 0 ? compareSeriesBySymbolTf : undefined,
          );

          // Same result field runBacktest() writes — the UI consumes v1 and
          // v2 results identically.
          set((state) => {
            state.result = result;
            state.status = 'done';
          });

          // Persist the run (Supabase-first, localStorage fallback) — mirrors
          // runBacktest()'s persistence step (Increment 4b).
          await persistStrategyV2Run(def, result, { symbol, timeframe, from, to });
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

      async saveStrategyV2AsTemplate(name) {
        const { strategyV2 } = get();
        if (!strategyV2) return;
        const toSave: SavedSetupDefinition = name ? { ...strategyV2, name } : strategyV2;
        await saveSetup(toSave);
        const savedSetups = await listSetups();
        set((state) => {
          state.savedSetups = savedSetups;
        });
      },

      async loadSetup(id) {
        const found = await getSetup(id);
        if (!found) return;
        set((state) => {
          // v2 templates load into the AI-strategy slot; v1 setups load into
          // the classic editing surface — mirrors loadRun()'s branch below.
          if (isV2SetupDefinition(found)) {
            state.strategyV2 = found;
          } else {
            state.currentSetup = found;
          }
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
          // v2 runs restore into the AI-strategy slot; v1 runs restore into
          // the classic setup slot. Instrument/timeframe are embedded in the
          // definition itself (v2 has no separate store fields for them).
          if (isV2SetupDefinition(found.setupSnapshot)) {
            state.strategyV2 = found.setupSnapshot;
          } else {
            state.currentSetup = found.setupSnapshot;
          }
          // Restore the instrument this SavedRun actually ran with — same
          // reasoning as runBacktest()/runStrategyV2Backtest(): a loaded v2
          // run must not fall back to a stale `currentSetup.instrument`.
          // `found.symbol`/`found.timeframe` are the run's own recorded
          // meta (correct for both engines); `source` comes from the
          // snapshot's instrument since SavedRun doesn't store it separately.
          state.lastRunInstrument = {
            symbol: found.symbol,
            timeframe: found.timeframe,
            source: found.setupSnapshot.instrument.source,
            engine: isV2SetupDefinition(found.setupSnapshot) ? 'v2' : 'v1',
          };
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
          state.lastRunInstrument = null;
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
// v2 run persistence (Increment 4b)
// ---------------------------------------------------------------------------

/**
 * Persist a completed v2 run (Supabase-first, localStorage fallback) exactly
 * like `runBacktest()` does for v1 — called from the success path of
 * `runStrategyV2Backtest`. Defined at module scope, talking to the store
 * purely through `useAutoBacktestStore.setState`/`getState` (the immer
 * middleware makes `setState` accept the same draft-mutating recipes as the
 * `set` passed into the creator), so `runStrategyV2Backtest` itself only
 * needed a single extra call rather than a restructure.
 */
async function persistStrategyV2Run(
  def: StrategyDefinitionV2,
  result: AutoBacktestResult,
  meta: { symbol: string; timeframe: string; from: number; to: number },
): Promise<void> {
  const run = buildSavedRun(def, result, meta);
  useAutoBacktestStore.setState((state) => {
    state.lastRunId = run.id;
  });
  const saveResult = await saveRun(run);
  if (saveResult.ok && saveResult.storage === 'local') {
    toast.warning('Run saved locally only — cloud sync failed');
  } else if (saveResult.ok === false) {
    toast.error('Run could not be saved — results will be lost on reload');
  }
  const savedRuns = await listRuns();
  useAutoBacktestStore.setState((state) => {
    state.savedRuns = savedRuns;
  });
}

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
export const selectLastRunInstrument = (s: AutoBacktestStore) => s.lastRunInstrument;

/**
 * The instrument/timeframe/source that results-consuming components should
 * render: `lastRunInstrument` when a run has actually completed/loaded
 * (correct for both v1 and v2), falling back to the v1 `currentSetup`'s
 * instrument only when no run has happened yet (keeps the classic path's
 * pre-run UI, if any, unchanged).
 */
export const selectEffectiveInstrument = (s: AutoBacktestStore): LastRunInstrument =>
  s.lastRunInstrument ?? {
    symbol: s.currentSetup.instrument.symbol,
    timeframe: s.currentSetup.instrument.timeframe,
    source: s.currentSetup.instrument.source,
    engine: 'v1',
  };
