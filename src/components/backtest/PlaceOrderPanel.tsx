/**
 * PlaceOrderPanel — side-panel trading controls for BacktestChart.
 *
 * Phase 7 additions vs the old inline version:
 *   - Multi-leg take-profit UI (up to 3 legs). Default = single 100% leg
 *     ("+Add TP" reveals multi-leg mode). Each leg has price + size%.
 *   - Validates legs with validateTakeProfitLegs; shows inline error text.
 *   - R:R readout uses weighted-average TP target across legs.
 *   - Estimated fees line shown when commissionConfig has any non-zero field.
 *   - Passes `takeProfits` leg array into openPosition so the session picks
 *     up multi-leg TPs immediately.
 */

import { useCallback, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, X, Plus, AlertCircle } from 'lucide-react';
import {
  type TakeProfitLeg,
  type CommissionConfig,
  type PaperPosition,
  type PaperSide,
} from '@/hooks/useBacktestSession';
import { validateTakeProfitLegs, applyCommission } from '@/lib/backtest/orderEngine';

// ─── Props ────────────────────────────────────────────────────────

export interface PlaceOrderPanelProps {
  /** Currently open position (if any). */
  activePosition: PaperPosition | undefined;
  /** Size input from parent (contracts/shares). */
  size: number;
  onSizeChange: (size: number) => void;
  /** SL price string from parent (allows empty). */
  slInput: string;
  onSlChange: (v: string) => void;
  /** Single-TP input (used in simple mode and as backward-compat). */
  tpInput: string;
  onTpChange: (v: string) => void;
  /** Current price for unrealized P&L display (string, allows empty). */
  livePrice: string;
  onLivePriceChange: (v: string) => void;
  /** Called when user opens a position. Includes multi-leg TPs when active. */
  onOpen: (side: PaperSide, takeProfits?: TakeProfitLeg[]) => void;
  /** Called when user closes the active position. */
  onClose: () => void;
  /** Called to update SL on active position. */
  onSetSL: (price: number) => void;
  /** Called to update single TP on active position. */
  onSetTP: (price: number) => void;
  /** Session-level commission config — used for fee estimate display. */
  commissionConfig: CommissionConfig;
  /** Inline flash error (cleared by parent after 3s). */
  tradeError: string | null;
  /** Replay mode hint (right-click context menu tip). */
  showReplayHint: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────

/** Generate a new TakeProfitLeg id. */
function newLegId(): string {
  return `tp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Compute weighted-average TP price across legs for R:R display.
 * Returns null when there are no valid legs or no SL/entry.
 */
function weightedAvgTp(legs: TakeProfitLeg[]): number | null {
  const total = legs.reduce((sum, l) => sum + l.sizePercent, 0);
  if (total <= 0) return null;
  const wtSum = legs.reduce((sum, l) => sum + l.price * l.sizePercent, 0);
  return wtSum / total;
}

/**
 * Split sizePercent evenly across `count` legs (last gets the remainder
 * to ensure sum stays exactly 100).
 */
function evenSplit(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(100 / count);
  const rem = 100 - base * count;
  return Array.from({ length: count }, (_, i) =>
    i === count - 1 ? base + rem : base,
  );
}

// ─── Component ───────────────────────────────────────────────────

export function PlaceOrderPanel({
  activePosition,
  size,
  onSizeChange,
  slInput,
  onSlChange,
  tpInput,
  onTpChange,
  livePrice,
  onLivePriceChange,
  onOpen,
  onClose,
  onSetSL,
  onSetTP,
  commissionConfig,
  tradeError,
  showReplayHint,
}: PlaceOrderPanelProps) {
  // ── Multi-leg TP state ──────────────────────────────────────────
  // `multiLegMode` = whether the "+Add TP" section is expanded.
  // While collapsed, we use the single `tpInput` and open with 1 × 100% leg.
  // While expanded, we manage `legs[]` locally and pass them to onOpen.
  const [multiLegMode, setMultiLegMode] = useState(false);

  const [legs, setLegs] = useState<TakeProfitLeg[]>(() => [
    { id: newLegId(), price: 0, sizePercent: 100 },
  ]);

  // ── Derived ────────────────────────────────────────────────────

  const entry = parseFloat(livePrice);
  const sl = parseFloat(slInput);

  // Validate legs (only when in multi-leg mode and something is filled in).
  const legValidation = useMemo(() => {
    if (!multiLegMode) return null;
    // Only validate legs with non-zero prices (user may not have filled all).
    const filledLegs = legs.filter((l) => l.price > 0);
    if (filledLegs.length === 0) return null;
    return validateTakeProfitLegs(filledLegs);
  }, [multiLegMode, legs]);

  const legError: string | null = legValidation && !legValidation.ok ? legValidation.reason : null;

  // Weighted-avg TP target for R:R computation.
  const effectiveTp = useMemo(() => {
    if (multiLegMode) {
      const filledLegs = legs.filter((l) => l.price > 0);
      return weightedAvgTp(filledLegs);
    }
    const v = parseFloat(tpInput);
    return v > 0 ? v : null;
  }, [multiLegMode, legs, tpInput]);

  // R:R ratio (risk in denominator; "1:X" format for display).
  const rrRatio = useMemo(() => {
    if (!entry || isNaN(entry) || entry <= 0) return null;
    if (!sl || isNaN(sl) || sl <= 0) return null;
    if (!effectiveTp) return null;
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(effectiveTp - entry);
    if (risk <= 0) return null;
    return reward / risk;
  }, [entry, sl, effectiveTp]);

  // Estimated fee per SIDE (one entry fill).
  const estimatedFeePerSide = useMemo(() => {
    if (!entry || isNaN(entry) || entry <= 0 || size <= 0) return 0;
    const feeConfig = commissionConfig;
    if (feeConfig.commissionPerOrder === 0 && feeConfig.commissionPercent === 0) return 0;
    return applyCommission(entry, size, feeConfig);
  }, [entry, size, commissionConfig]);

  // Unrealized P&L for open position.
  const unrealizedPnl = useMemo(() => {
    if (!activePosition) return null;
    const exit = parseFloat(livePrice);
    if (!exit || isNaN(exit)) return null;
    const direction = activePosition.side === 'LONG' ? 1 : -1;
    return (exit - activePosition.entryPrice) * direction * activePosition.size;
  }, [activePosition, livePrice]);

  // ── Multi-leg helpers ──────────────────────────────────────────

  const handleAddLeg = useCallback(() => {
    if (legs.length >= 3) return;
    const newCount = legs.length + 1;
    const splits = evenSplit(newCount);
    setLegs((prev) =>
      prev
        .map((l, i) => ({ ...l, sizePercent: splits[i] ?? l.sizePercent }))
        .concat([{ id: newLegId(), price: 0, sizePercent: splits[newCount - 1] }]),
    );
  }, [legs.length]);

  const handleRemoveLeg = useCallback((legId: string) => {
    setLegs((prev) => {
      const next = prev.filter((l) => l.id !== legId);
      if (next.length === 0) return prev; // keep at least 1
      // Re-split evenly after removal.
      const splits = evenSplit(next.length);
      return next.map((l, i) => ({ ...l, sizePercent: splits[i] }));
    });
  }, []);

  const handleLegPriceChange = useCallback((legId: string, raw: string) => {
    const v = parseFloat(raw);
    setLegs((prev) =>
      prev.map((l) => (l.id === legId ? { ...l, price: isNaN(v) ? 0 : v } : l)),
    );
  }, []);

  const handleLegSizeChange = useCallback((legId: string, raw: string) => {
    const v = parseFloat(raw);
    setLegs((prev) =>
      prev.map((l) => (l.id === legId ? { ...l, sizePercent: isNaN(v) ? 0 : v } : l)),
    );
  }, []);

  const handleEnterMultiLegMode = useCallback(() => {
    // Pre-fill TP1 from the single tpInput if set.
    const singleTp = parseFloat(tpInput);
    setLegs([
      {
        id: newLegId(),
        price: singleTp > 0 ? singleTp : 0,
        sizePercent: 100,
      },
    ]);
    setMultiLegMode(true);
  }, [tpInput]);

  const handleExitMultiLegMode = useCallback(() => {
    setMultiLegMode(false);
    // Preserve last TP1 price back into the simple input for the user.
    const firstLeg = legs[0];
    if (firstLeg && firstLeg.price > 0) {
      onTpChange(firstLeg.price.toString());
    }
  }, [legs, onTpChange]);

  // ── Open handler ───────────────────────────────────────────────

  const handleOpen = useCallback((side: PaperSide) => {
    if (multiLegMode) {
      const filledLegs = legs.filter((l) => l.price > 0);
      onOpen(side, filledLegs.length > 0 ? filledLegs : undefined);
    } else {
      onOpen(side);
    }
  }, [multiLegMode, legs, onOpen]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <>
      {/* Current price */}
      <label className="mb-3 block">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">Current price</span>
        <input
          type="number"
          value={livePrice}
          onChange={(e) => onLivePriceChange(e.target.value)}
          placeholder="e.g. 20425.50"
          step="0.01"
          className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm focus:border-[#C9A646] focus:outline-none"
        />
      </label>

      {/* Size */}
      <label className="mb-3 block">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">Size (contracts)</span>
        <input
          type="number"
          value={size}
          onChange={(e) => onSizeChange(Math.max(0.01, Number(e.target.value)))}
          min="0.01"
          step="0.1"
          className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm focus:border-[#C9A646] focus:outline-none"
        />
      </label>

      {/* Stop loss */}
      <label className="mb-3 block">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">Stop loss</span>
        <input
          type="number"
          value={slInput}
          onChange={(e) => onSlChange(e.target.value)}
          placeholder="optional"
          step="0.01"
          className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm focus:border-rose-500 focus:outline-none"
        />
      </label>

      {/* Take profit — simple mode */}
      {!multiLegMode && (
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Take profit</span>
            <button
              type="button"
              onClick={handleEnterMultiLegMode}
              className="flex items-center gap-0.5 text-[10px] text-[#C9A646]/70 hover:text-[#C9A646] transition-colors"
            >
              <Plus size={10} />
              Add TP
            </button>
          </div>
          <input
            type="number"
            value={tpInput}
            onChange={(e) => onTpChange(e.target.value)}
            placeholder="optional"
            step="0.01"
            className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>
      )}

      {/* Take profit — multi-leg mode */}
      {multiLegMode && (
        <div className="mb-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Take Profit Legs
            </span>
            <button
              type="button"
              onClick={handleExitMultiLegMode}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              ← Simple mode
            </button>
          </div>

          <div className="space-y-1.5">
            {legs.map((leg, idx) => (
              <div key={leg.id} className="flex items-center gap-1.5">
                <span className="w-6 shrink-0 text-center text-[10px] text-zinc-500">
                  {idx + 1}
                </span>
                {/* Price */}
                <input
                  type="number"
                  value={leg.price > 0 ? leg.price : ''}
                  onChange={(e) => handleLegPriceChange(leg.id, e.target.value)}
                  placeholder="Price"
                  step="0.01"
                  className="min-w-0 flex-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
                {/* Size % */}
                <div className="relative w-16 shrink-0">
                  <input
                    type="number"
                    value={leg.sizePercent}
                    onChange={(e) => handleLegSizeChange(leg.id, e.target.value)}
                    min="1"
                    max="100"
                    step="1"
                    className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 pr-5 text-xs focus:border-zinc-700 focus:outline-none"
                  />
                  <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600">
                    %
                  </span>
                </div>
                {/* Remove (disabled for the last leg) */}
                <button
                  type="button"
                  onClick={() => handleRemoveLeg(leg.id)}
                  disabled={legs.length <= 1}
                  title="Remove leg"
                  className="shrink-0 rounded p-1 text-zinc-600 transition-colors hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>

          {legs.length < 3 && (
            <button
              type="button"
              onClick={handleAddLeg}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-dashed border-zinc-800 py-1.5 text-[10px] text-zinc-600 transition-colors hover:border-zinc-700 hover:text-zinc-400"
            >
              <Plus size={10} />
              Add leg {legs.length + 1}
            </button>
          )}

          {/* Leg validation error */}
          {legError && (
            <div className="mt-1.5 flex items-start gap-1.5 rounded border border-rose-800 bg-rose-950/40 px-2 py-1.5 text-[10px] text-rose-300">
              <AlertCircle size={10} className="mt-0.5 shrink-0" />
              {legError}
            </div>
          )}
        </div>
      )}

      {/* R:R + fee readout */}
      {(rrRatio != null || estimatedFeePerSide > 0) && (
        <div className="mb-3 rounded-md border border-zinc-900 bg-zinc-900/30 px-2.5 py-2 text-[10px] text-zinc-500">
          {rrRatio != null && (
            <div className="flex justify-between">
              <span>R:R (est.)</span>
              <span className="font-semibold text-[#C9A646]">1:{rrRatio.toFixed(2)}</span>
            </div>
          )}
          {estimatedFeePerSide > 0 && (
            <div className="flex justify-between mt-0.5">
              <span>Fees incl. (per side)</span>
              <span className="text-zinc-400">${estimatedFeePerSide.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* No active position — show open buttons */}
      {!activePosition ? (
        <div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleOpen('LONG')}
              disabled={multiLegMode && legError != null}
              className="flex flex-col items-center justify-center gap-0.5 rounded-md bg-emerald-600 px-3 py-2 text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5">
                <TrendingUp size={14} />
                <span className="text-sm font-bold">BUY</span>
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wider opacity-80">Market</span>
            </button>
            <button
              onClick={() => handleOpen('SHORT')}
              disabled={multiLegMode && legError != null}
              className="flex flex-col items-center justify-center gap-0.5 rounded-md bg-rose-600 px-3 py-2 text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5">
                <TrendingDown size={14} />
                <span className="text-sm font-bold">SELL</span>
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wider opacity-80">Market</span>
            </button>
          </div>

          {showReplayHint && (
            <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1.5 text-[10px] text-zinc-500">
              💡 Right-click on the chart to place LIMIT or STOP orders
            </div>
          )}

          {tradeError && (
            <div className="mt-2 flex items-start gap-2 rounded-md border border-rose-800 bg-rose-950/50 px-2.5 py-1.5 text-xs text-rose-300">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <span>{tradeError}</span>
            </div>
          )}
        </div>
      ) : (
        /* Active position — show position card + update SL/TP + close */
        <div className="space-y-2">
          <div className="rounded-md border border-[#C9A646]/30 bg-[#C9A646]/5 p-3">
            <div className="flex items-center justify-between">
              <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                activePosition.side === 'LONG'
                  ? 'bg-emerald-600/20 text-emerald-400'
                  : 'bg-rose-600/20 text-rose-400'
              }`}>
                {activePosition.side}
              </span>
              <span className="text-xs text-zinc-500">
                {activePosition.size}× @ ${activePosition.entryPrice.toFixed(2)}
              </span>
            </div>
            {unrealizedPnl != null && (
              <div className="mt-2">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Unrealized</div>
                <div className={`text-lg font-bold ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
                </div>
              </div>
            )}
            {/* Active TP legs display */}
            {activePosition.takeProfits && activePosition.takeProfits.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {activePosition.takeProfits.map((leg, idx) => (
                  <div key={leg.id} className="flex items-center justify-between text-[10px]">
                    <span className={`text-zinc-500 ${leg.filled ? 'line-through opacity-50' : ''}`}>
                      TP{idx + 1} {leg.sizePercent}%
                    </span>
                    <span className={`font-mono ${leg.filled ? 'text-zinc-600' : 'text-emerald-500/70'}`}>
                      ${leg.price.toFixed(2)} {leg.filled ? '✓' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {/* SL display */}
            {activePosition.stopLoss && (
              <div className="mt-1 flex justify-between text-[10px]">
                <span className="text-zinc-500">SL</span>
                <span className="font-mono text-rose-500/70">${activePosition.stopLoss.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Quick set SL/TP from inputs */}
          <div className="grid grid-cols-2 gap-2">
            {slInput && (
              <button
                onClick={() => onSetSL(parseFloat(slInput))}
                className="rounded-md border border-rose-700 bg-rose-950 px-2 py-1.5 text-[10px] font-semibold text-rose-400 hover:bg-rose-900"
              >
                Set SL
              </button>
            )}
            {tpInput && !multiLegMode && (
              <button
                onClick={() => onSetTP(parseFloat(tpInput))}
                className="rounded-md border border-emerald-700 bg-emerald-950 px-2 py-1.5 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-900"
              >
                Set TP
              </button>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#C9A646] px-3 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#D4B55E]"
          >
            <X size={16} />
            Close at ${livePrice || '—'}
          </button>
        </div>
      )}
    </>
  );
}

export default PlaceOrderPanel;
