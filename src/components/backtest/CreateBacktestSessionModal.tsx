/**
 * CreateBacktestSessionModal — session initialization with execution settings.
 *
 * Presents a dialog for starting a new backtest session. The "Execution
 * settings" section (collapsed by default) exposes Commission per order ($),
 * Commission (%), and Slippage (%) — all defaulting to 0. On confirm, calls
 * `onConfirm` with the starting balance and commission config, so the parent
 * can call `setCommissionConfig` and `reset` in sequence.
 *
 * The modal does NOT call setCommissionConfig itself — the parent owns the
 * session hook and wires the callback. This keeps the modal pure/testable.
 *
 * Styling: inherits the dark premium terminal aesthetic of BacktestChart
 * (bg-zinc-950, border-zinc-800, gold accent #C9A646). Matches the overlay
 * z-index pattern used in the context menu (z-[120]).
 */

import { useCallback, useState } from 'react';
import { ChevronDown, ChevronUp, X, Play } from 'lucide-react';
import type { CommissionConfig } from '@/hooks/useBacktestSession';

// ─── Props ────────────────────────────────────────────────────────

export interface CreateBacktestSessionModalProps {
  /** Whether the modal is visible. */
  open: boolean;
  /** Default starting balance pre-filled in the input. */
  defaultBalance?: number;
  /** Called when user confirms. Receives balance + commission config. */
  onConfirm: (balance: number, commissionConfig: Partial<CommissionConfig>) => void;
  /** Called when user cancels / closes the modal. */
  onCancel: () => void;
}

// ─── Component ───────────────────────────────────────────────────

export function CreateBacktestSessionModal({
  open,
  defaultBalance = 10000,
  onConfirm,
  onCancel,
}: CreateBacktestSessionModalProps) {
  const [balance, setBalance] = useState(defaultBalance.toString());
  const [showExecution, setShowExecution] = useState(false);

  // Commission/slippage fields (all default to 0 = no cost model).
  const [commissionPerOrder, setCommissionPerOrder] = useState('0');
  const [commissionPercent, setCommissionPercent] = useState('0');
  const [slippagePercent, setSlippagePercent] = useState('0');

  const [balanceError, setBalanceError] = useState<string | null>(null);

  const handleConfirm = useCallback(() => {
    const bal = parseFloat(balance);
    if (isNaN(bal) || bal <= 0) {
      setBalanceError('Starting balance must be a positive number.');
      return;
    }
    setBalanceError(null);

    const config: Partial<CommissionConfig> = {
      commissionPerOrder: Math.max(0, parseFloat(commissionPerOrder) || 0),
      commissionPercent: Math.max(0, parseFloat(commissionPercent) || 0),
      slippagePercent: Math.max(0, parseFloat(slippagePercent) || 0),
    };

    onConfirm(bal, config);
  }, [balance, commissionPerOrder, commissionPercent, slippagePercent, onConfirm]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[110] bg-black/60"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#C9A646]">
              New Backtest Session
            </h2>
            <button
              onClick={onCancel}
              className="rounded p-1 text-zinc-600 transition-colors hover:text-zinc-300"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 px-5 py-4">
            {/* Starting balance */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
                Starting balance ($)
              </label>
              <input
                type="number"
                value={balance}
                onChange={(e) => { setBalance(e.target.value); setBalanceError(null); }}
                min="1"
                step="100"
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm focus:border-[#C9A646] focus:outline-none"
              />
              {balanceError && (
                <p className="mt-1 text-[10px] text-rose-400">{balanceError}</p>
              )}
            </div>

            {/* Execution settings — collapsible advanced section */}
            <div className="rounded-md border border-zinc-800">
              <button
                type="button"
                onClick={() => setShowExecution((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Execution settings
                {showExecution ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {showExecution && (
                <div className="space-y-3 border-t border-zinc-800 px-3 py-3">
                  {/* Commission per order */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
                      Commission per order ($)
                    </label>
                    <input
                      type="number"
                      value={commissionPerOrder}
                      onChange={(e) => setCommissionPerOrder(e.target.value)}
                      min="0"
                      step="0.01"
                      className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm focus:border-zinc-700 focus:outline-none"
                    />
                    <p className="mt-0.5 text-[9px] text-zinc-600">
                      Flat dollar fee charged per fill event (e.g. $2.50 per contract round-trip).
                    </p>
                  </div>

                  {/* Commission % */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
                      Commission (%)
                    </label>
                    <input
                      type="number"
                      value={commissionPercent}
                      onChange={(e) => setCommissionPercent(e.target.value)}
                      min="0"
                      step="0.001"
                      className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm focus:border-zinc-700 focus:outline-none"
                    />
                    <p className="mt-0.5 text-[9px] text-zinc-600">
                      Percentage of fill notional charged per fill (e.g. 0.1 = 0.1%). Stacks with flat fee.
                    </p>
                  </div>

                  {/* Slippage % */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
                      Slippage (%)
                    </label>
                    <input
                      type="number"
                      value={slippagePercent}
                      onChange={(e) => setSlippagePercent(e.target.value)}
                      min="0"
                      step="0.001"
                      className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm focus:border-zinc-700 focus:outline-none"
                    />
                    <p className="mt-0.5 text-[9px] text-zinc-600">
                      Applied to market and stop fills only; limit fills always execute at limit price.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-3">
            <button
              onClick={onCancel}
              className="rounded-md border border-zinc-800 px-4 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-300"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1.5 rounded-md bg-[#C9A646] px-4 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-[#D4B55E]"
            >
              <Play size={11} />
              Start Session
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default CreateBacktestSessionModal;
