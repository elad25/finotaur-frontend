// src/components/charting/orderflow/VolumeBubblesLayer.tsx
//
// Canvas overlay that renders ATAS/Bookmap-style "executed aggression"
// volume bubbles — sized circles at (time, price) for trade prints whose
// dominant-side volume clears a threshold (see volumeBubbles.ts for the
// pure aggregation/threshold/sizing math this layer consumes).
//
// Fed by a FlowBinStore — the SAME aggregation engine FootprintLayer reads
// from (see that file's header + flowBinStore.ts). Callers pass their own
// store instance (Liquidity tab reuses the flowStoreCache-backed useOrderFlow
// hook, same as the Footprint tab) — this layer never subscribes to a trade
// feed itself.
//
// Structure mirrors DepthMatrixLayer.tsx / FootprintLayer.tsx:
//   - Absolutely-positioned, DPR-aware, pointer-events:none canvas.
//   - rAF loop with a dirty flag (store.onChange + visible-range change +
//     resize) PLUS a per-frame coordinate fingerprint (price-scale drag
//     fires no lw-charts v4 event).
//   - The (comparatively expensive) aggregation — store.getRange() +
//     threshold + bubble list — is rebuilt ONLY when dirty. Pan/zoom-only
//     frames just re-project the already-computed bubble list's coordinates
//     and redraw circles — cheap (bubble count is bounded: only the top
//     slice of visible trades clears the threshold).
//   - try/finally with ctx.setTransform(1,0,0,1,0,0) restoration.
//   - Clipped at timeScale().width() so nothing paints over the price axis.

import { useEffect, useRef } from 'react';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import type { FlowBinStore } from './flowBinStore';
import {
  computeVolumeBubbles,
  resolveBubbleThreshold,
  bubbleRadiusPx,
  type VolumeBubble,
  type BubbleThresholdSetting,
} from './volumeBubbles';

// Buy = teal/green brand token, sell = red — matches FINOTAUR_DARK_THEME's
// candle palette register (FinotaurChart.tsx) without importing it directly
// (this layer is deliberately theme-agnostic, same as FootprintLayer).
const BUY_FILL = 'rgba(34, 197, 94, 0.55)';   // emerald-500 @ 55%
const SELL_FILL = 'rgba(220, 38, 38, 0.55)';  // red-600 @ 55%
const STROKE = 'rgba(255, 255, 255, 0.65)';

export interface VolumeBubblesLayerProps {
  chart: IChartApi;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series: ISeriesApi<any>;
  store: FlowBinStore;
  visible: boolean;
  /** Container CSS width in px. */
  width: number;
  /** Container CSS height in px. */
  height: number;
  /** 'auto' = top ~2% of visible dominant-side trade volumes; a number = absolute volume floor. */
  thresholdSetting: BubbleThresholdSetting;
}

interface PreparedBubble extends VolumeBubble {
  radiusPx: number;
}

export function VolumeBubblesLayer({
  chart,
  series,
  store,
  visible,
  width,
  height,
  thresholdSetting,
}: VolumeBubblesLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const dirtyRef = useRef<boolean>(true);
  const lastFingerprintRef = useRef<string>('');
  const preparedRef = useRef<PreparedBubble[]>([]);

  const storeRef = useRef(store);
  const visibleRef = useRef(visible);
  const widthRef = useRef(width);
  const heightRef = useRef(height);
  const thresholdSettingRef = useRef(thresholdSetting);

  storeRef.current = store;
  visibleRef.current = visible;
  widthRef.current = width;
  heightRef.current = height;
  thresholdSettingRef.current = thresholdSetting;

  // ── Rebuild the prepared bubble list (aggregation + threshold + sizing) ────
  function rebuildPrepared(chartInst: IChartApi, storeInst: FlowBinStore) {
    const visRange = chartInst.timeScale().getVisibleRange();
    if (!visRange) {
      preparedRef.current = [];
      return;
    }
    const fromSec = visRange.from as unknown as number;
    const toSec = visRange.to as unknown as number;

    const candles = storeInst.getRange(fromSec, toSec);
    const threshold = resolveBubbleThreshold(candles, thresholdSettingRef.current);
    const bubbles = computeVolumeBubbles(candles, threshold);

    let maxVolume = 0;
    for (const b of bubbles) if (b.volume > maxVolume) maxVolume = b.volume;

    preparedRef.current = bubbles.map((b) => ({
      ...b,
      radiusPx: bubbleRadiusPx(b.volume, maxVolume, threshold),
    }));
  }

  useEffect(() => {
    const chartInstance = chart;
    const seriesInstance = series;
    let running = true;

    function drawFrame() {
      if (!running) return;
      rafRef.current = requestAnimationFrame(drawFrame);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const cssW = widthRef.current;
      const cssH = heightRef.current;
      if (cssW <= 0 || cssH <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      const pixW = Math.round(cssW * dpr);
      const pixH = Math.round(cssH * dpr);
      if (canvas.width !== pixW || canvas.height !== pixH) {
        canvas.width = pixW;
        canvas.height = pixH;
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (!visibleRef.current) {
        try {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, cssW, cssH);
        } finally {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        return;
      }

      const rawPaneW = chartInstance.timeScale().width();
      const paneW = typeof rawPaneW === 'number' && rawPaneW > 0 ? rawPaneW : cssW;

      const logRange = chartInstance.timeScale().getVisibleLogicalRange();
      const fpFrom = logRange ? logRange.from : NaN;
      const fpTo = logRange ? logRange.to : NaN;
      const fingerprint = `${paneW}|${cssW}|${cssH}|${fpFrom}|${fpTo}`;
      const fingerprintChanged = fingerprint !== lastFingerprintRef.current;

      if (dirtyRef.current || fingerprintChanged) {
        dirtyRef.current = false;
        rebuildPrepared(chartInstance, storeRef.current);
      }

      try {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        const prepared = preparedRef.current;
        for (const bubble of prepared) {
          const x = chartInstance.timeScale().timeToCoordinate(bubble.time as UTCTimestamp);
          if (x === null || (x as number) < 0 || (x as number) > paneW) continue;

          const y = seriesInstance.priceToCoordinate(bubble.price);
          if (y === null) continue;

          ctx.beginPath();
          ctx.arc(x as number, y as number, bubble.radiusPx, 0, Math.PI * 2);
          ctx.fillStyle = bubble.side === 'buy' ? BUY_FILL : SELL_FILL;
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = STROKE;
          ctx.stroke();
        }
      } finally {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        lastFingerprintRef.current = fingerprint;
      }
    }

    rafRef.current = requestAnimationFrame(drawFrame);

    return () => {
      running = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [chart, series]);

  // ── Subscriptions that mark dirty ─────────────────────────────────────────
  useEffect(() => {
    const timeScale = chart.timeScale();
    const markDirty = () => {
      dirtyRef.current = true;
    };
    timeScale.subscribeVisibleLogicalRangeChange(markDirty);
    timeScale.subscribeVisibleTimeRangeChange(markDirty);
    const unsubscribeStore = store.onChange(markDirty);
    return () => {
      try { timeScale.unsubscribeVisibleLogicalRangeChange(markDirty); } catch { /* chart gone */ }
      try { timeScale.unsubscribeVisibleTimeRangeChange(markDirty); } catch { /* chart gone */ }
      unsubscribeStore();
    };
  }, [chart, store]);

  // Mark dirty on size/threshold-setting/visible change.
  useEffect(() => {
    dirtyRef.current = true;
  }, [width, height, thresholdSetting, visible]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        // Above candles (bubbles mark executed prints — should read clearly
        // over both the depth matrix and the candle series), below the
        // footprint overlay's own z-index (15) since the two are mutually
        // exclusive on the Liquidity tab in practice but keep the same
        // stacking convention as WallHeatLayer/DepthMatrixLayer's peers.
        zIndex: 12,
      }}
      aria-hidden="true"
    />
  );
}

export default VolumeBubblesLayer;
