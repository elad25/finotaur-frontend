// ============================================================================
// AUTO BACKTEST WEB WORKER
// Runs the heavy scan off the UI thread.
// Import-only-pure-core: no React, no DOM (except self / postMessage).
// ============================================================================

import type { Candle } from '@/components/ReplayChart/types';
import type { SetupDefinition } from './types';
import type { AutoBacktestResult } from './AutoBacktestEngine';
import { runAutoBacktest } from './AutoBacktestEngine';
import type { StrategyDefinitionV2 } from './v2/types';
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
  candles: Candle[];
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
    const { strategy, candles } = msg;
    runStrategyV2(strategy, candles, {
      onProgress: (scanned: number, total: number, found: number) => {
        const progress: ProgressMessage = { type: 'progress', scanned, total, found };
        self.postMessage(progress);
      },
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
