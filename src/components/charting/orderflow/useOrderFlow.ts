// src/components/charting/orderflow/useOrderFlow.ts
// React glue: owns a FlowBinStore + a TradeSource subscription lifecycle,
// kicks off a backfill on mount, then lets live trades flow into the store.
//
// Deliberate deviation from a literal "resubscribe on interval change": raw
// trades are interval-agnostic (only binning depends on intervalSec), so an
// intervalSec-only change re-bins the existing store in place (see the first
// effect below) instead of tearing down and reopening the WS connection.
// Symbol change still fully unsubscribes+clears, per spec.

import { useEffect, useRef, useState } from 'react';
import { FlowBinStore } from './flowBinStore';
import type { FlowBinStoreConfig, FlowTrade, TradeSource, TradeSourceStatus } from './types';

const DEFAULT_BACKFILL_BARS = 40;

export interface UseOrderFlowOptions extends FlowBinStoreConfig {
  symbol: string;
  source: TradeSource;
  /** How many intervalSec-wide candles to backfill on mount/symbol change. Default 40. */
  backfillBars?: number;
}

export interface UseOrderFlowResult {
  /** Stable identity across re-renders (same instance until symbol/interval/rowSize teardown). */
  store: FlowBinStore;
  status: TradeSourceStatus;
  /** Epoch-ms coverage boundary the backfill actually reached (may be later than requested — see backfill contract). */
  backfillCoveredFromSec: number | null;
}

export function useOrderFlow(options: UseOrderFlowOptions): UseOrderFlowResult {
  const { symbol, intervalSec, rowSize, source, backfillBars = DEFAULT_BACKFILL_BARS } = options;

  const storeRef = useRef<FlowBinStore>(new FlowBinStore({ intervalSec, rowSize }));
  const [status, setStatus] = useState<TradeSourceStatus>('connecting');
  const [backfillCoveredFromSec, setBackfillCoveredFromSec] = useState<number | null>(null);

  // Re-bin in place when interval/rowSize change (no need to recreate the store).
  useEffect(() => {
    storeRef.current.setConfig({ intervalSec, rowSize });
  }, [intervalSec, rowSize]);

  useEffect(() => {
    const store = storeRef.current;
    const controller = new AbortController();
    let firstLiveTradeSeen = false;

    store.clear();
    setStatus('connecting');
    setBackfillCoveredFromSec(null);

    const onTrades = (trades: FlowTrade[]) => {
      if (trades.length === 0) return;

      // Dedupe overlap with backfill: run backfill only up to the first live
      // trade's timestamp once it arrives, so the store never double-counts
      // trades present in both the backfill page and the live stream.
      if (!firstLiveTradeSeen) {
        firstLiveTradeSeen = true;
        const firstLiveTime = trades[0].time;
        const fromMs = firstLiveTime - backfillBars * intervalSec * 1000;

        source
          .backfill(symbol, fromMs, firstLiveTime, { signal: controller.signal })
          .then(({ trades: backfilled, coveredFromMs }) => {
            if (controller.signal.aborted) return;
            store.applyTrades(backfilled);
            setBackfillCoveredFromSec(Math.floor(coveredFromMs / 1000));
          })
          .catch(() => {
            // Backfill is best-effort — live trades already flowing regardless.
          });
      }

      store.applyTrades(trades);
    };

    const unsubscribe = source.subscribe(symbol, onTrades, setStatus);

    return () => {
      controller.abort();
      unsubscribe();
      store.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, source]);

  return { store: storeRef.current, status, backfillCoveredFromSec };
}
