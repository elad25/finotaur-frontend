// ============================================================================
// AUTO BACKTEST WEB WORKER
// Runs the heavy scan off the UI thread.
// Import-only-pure-core: no React, no DOM (except self / postMessage).
// ============================================================================

import type { Candle } from '@/components/ReplayChart/types';
import type { SetupDefinition } from './types';
import type { AutoBacktestResult } from './AutoBacktestEngine';
import { runAutoBacktest } from './AutoBacktestEngine';
import type { StrategyDefinitionV2, TF } from './v2/types';
import { runStrategyV2 } from './v2/StrategyEngine';

// ---------------------------------------------------------------------------
// Message shapes (in and out)
// ---------------------------------------------------------------------------

interface RunMessage {
  type: 'run';
  setup: SetupDefinition;
  candles: Candle[];
  htfCandles?: Candle[];
}

/** v2 dispatch — separate message type (rather than discriminating on
 *  `setup.schemaVersion` inside `RunMessage`) so the v1 `run` path stays
 *  byte-identical. */
interface RunV2Message {
  type: 'runV2';
  strategy: StrategyDefinitionV2;
  /**
   * Legacy shape: a plain execution-timeframe candle array (single-timeframe
   * strategies — unchanged since Increment 1/2). MTF shape (Increment 3): a
   * map of candle series keyed by timeframe label, set by the caller
   * (`autoBacktestRunner.ts` / `useAutoBacktestStore.ts`) whenever the
   * strategy declares `timeframes.context`. `runStrategyV2` accepts either
   * shape natively, so this handler passes it straight through unchanged —
   * no branching needed here.
   */
  candles: Candle[] | Partial<Record<TF, Candle[]>>;
  /**
   * Compare-symbol candle series for `Condition{kind:'smt'}` conditions
   * (Increment 4a — SMT divergence), keyed by symbol then timeframe. Set by
   * the caller only when `strategy.compareSymbols` is non-empty AND the
   * strategy contains an `smt` condition; passed straight through to
   * `runStrategyV2`'s `RunStrategyV2Options.compareSeriesBySymbolTf`.
   */
  compareSeriesBySymbolTf?: Partial<Record<string, Partial<Record<TF, Candle[]>>>>;
}

interface ProgressMessage {
  type: 'progress';
  scanned: number;
  total: number;
  found: number;
}

interface DoneMessage {
  type: 'done';
  result: AutoBacktestResult;
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

export type WorkerInMessage = RunMessage | RunV2Message;
export type WorkerOutMessage = ProgressMessage | DoneMessage | ErrorMessage;

// ---------------------------------------------------------------------------
// Worker message handler
// ---------------------------------------------------------------------------

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;

  if (msg.type === 'run') {
    const { setup, candles, htfCandles } = msg;
    try {
      const result = runAutoBacktest(
        setup,
        candles,
        htfCandles,
        (scanned: number, total: number, found: number) => {
          const progress: ProgressMessage = { type: 'progress', scanned, total, found };
          self.postMessage(progress);
        },
      );

      const done: DoneMessage = { type: 'done', result };
      self.postMessage(done);
    } catch (err) {
      const error: ErrorMessage = {
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(error);
    }
    return;
  }

  if (msg.type === 'runV2') {
    const { strategy, candles, compareSeriesBySymbolTf } = msg;
    runStrategyV2(strategy, candles, {
      onProgress: (scanned: number, total: number, found: number) => {
        const progress: ProgressMessage = { type: 'progress', scanned, total, found };
        self.postMessage(progress);
      },
      compareSeriesBySymbolTf,
    })
      .then((result) => {
        const done: DoneMessage = { type: 'done', result };
        self.postMessage(done);
      })
      .catch((err: unknown) => {
        const error: ErrorMessage = {
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
        };
        self.postMessage(error);
      });
  }
};
