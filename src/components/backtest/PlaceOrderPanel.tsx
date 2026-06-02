// ==========================================
// PLACE ORDER PANEL (Phase 2 — order parity)
// ==========================================
// 1:1 with the reference "PLACE ORDER" panel, in Finotaur gold-on-black.
// Standard mode: manual position size + SL/TP.
// Advanced mode: risk-based auto position sizing (% or $) against current/initial
// balance, plus Market/Limit/Stop order kinds. Built on lib/backtest/orderEngine.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import {
  calcPositionSize,
  calcRewardRisk,
  resolveRiskAmount,
  validateOrderLevels,
  type OrderKind,
  type OrderSide,
} from '@/lib/backtest/orderEngine';

export interface PlaceOrderSubmit {
  side: OrderSide;
  kind: OrderKind;
  /** Price the order is anchored to (market price for market orders, else the limit/stop price). */
  price: number;
  size: number;
  stopLoss: number | null;
  takeProfit: number | null;
}

export interface PlaceOrderDraft {
  size: number;
  stopLoss: number | null;
  takeProfit: number | null;
}

interface PlaceOrderPanelProps {
  /** Live market price for the active symbol. */
  marketPrice: number;
  symbol: string;
  /** Current account balance (initial ± realized P&L). */
  currentBalance: number;
  initialBalance: number;
  contractMultiplier?: number;
  onSubmit?: (order: PlaceOrderSubmit) => void;
  /**
   * Optional callback fired whenever the computed draft values change.
   * Lets a parent read the live size/SL/TP without coupling to internal state.
   * Purely additive — existing usage without this prop is unaffected.
   */
  onDraftChange?: (draft: PlaceOrderDraft) => void;
  className?: string;
}

type BalanceBasis = 'current' | 'initial';

const num = (v: string) => (v === '' ? NaN : Number(v));

export function PlaceOrderPanel({
  marketPrice,
  symbol,
  currentBalance,
  initialBalance,
  contractMultiplier = 1,
  onSubmit,
  onDraftChange,
  className,
}: PlaceOrderPanelProps) {
  const [advanced, setAdvanced] = useState(false);
  const [kind, setKind] = useState<OrderKind>('market');
  const [error, setError] = useState<string | null>(null);

  // Standard-mode inputs
  const [positionSize, setPositionSize] = useState('');
  const [limitPrice, setLimitPrice] = useState('');

  // Shared SL/TP
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  // Advanced-mode inputs
  const [balanceBasis, setBalanceBasis] = useState<BalanceBasis>('current');
  const [riskMode, setRiskMode] = useState<'percent' | 'amount'>('percent');
  const [riskValue, setRiskValue] = useState('1');

  const entryPrice = useMemo(() => {
    if (kind === 'market') return marketPrice;
    const p = num(limitPrice);
    return Number.isFinite(p) ? p : marketPrice;
  }, [kind, limitPrice, marketPrice]);

  const basisBalance = balanceBasis === 'current' ? currentBalance : initialBalance;

  // Auto-computed size in advanced mode; manual otherwise.
  const computedSize = useMemo(() => {
    if (!advanced) {
      const s = num(positionSize);
      return Number.isFinite(s) ? s : 0;
    }
    const sl = num(stopLoss);
    if (!Number.isFinite(sl)) return 0;
    return calcPositionSize({
      balance: basisBalance,
      riskPercent: riskMode === 'percent' ? num(riskValue) : undefined,
      riskAmount: riskMode === 'amount' ? num(riskValue) : undefined,
      entryPrice,
      stopLoss: sl,
      contractMultiplier,
    });
  }, [advanced, positionSize, stopLoss, basisBalance, riskMode, riskValue, entryPrice, contractMultiplier]);

  const riskAmountPreview = useMemo(
    () =>
      advanced
        ? resolveRiskAmount({
            balance: basisBalance,
            riskPercent: riskMode === 'percent' ? num(riskValue) : undefined,
            riskAmount: riskMode === 'amount' ? num(riskValue) : undefined,
          })
        : 0,
    [advanced, basisBalance, riskMode, riskValue]
  );

  const rr = useMemo(() => {
    const sl = num(stopLoss);
    const tp = num(takeProfit);
    if (!Number.isFinite(sl) || !Number.isFinite(tp) || !computedSize) {
      return { reward: 0, risk: 0, rr: 0 };
    }
    // Side used only to keep reward/risk positive; ratio is side-agnostic here.
    const side: OrderSide = tp >= entryPrice ? 'buy' : 'sell';
    return calcRewardRisk(side, entryPrice, sl, tp, computedSize, contractMultiplier);
  }, [stopLoss, takeProfit, computedSize, entryPrice, contractMultiplier]);

  // Emit live draft values so a parent (e.g. BacktestChart) can read the current
  // size/SL/TP without needing to own those inputs. Fires only when values change.
  useEffect(() => {
    if (!onDraftChange) return;
    const sl = num(stopLoss);
    const tp = num(takeProfit);
    onDraftChange({
      size: computedSize,
      stopLoss: Number.isFinite(sl) ? sl : null,
      takeProfit: Number.isFinite(tp) ? tp : null,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedSize, stopLoss, takeProfit]);

  const place = (side: OrderSide) => {
    const sl = num(stopLoss);
    const tp = num(takeProfit);
    const slVal = Number.isFinite(sl) ? sl : null;
    const tpVal = Number.isFinite(tp) ? tp : null;

    const reason = validateOrderLevels(side, entryPrice, slVal, tpVal);
    if (reason) {
      // Surface inline; caller can also toast.
      setError(reason);
      return;
    }
    if (!computedSize || computedSize <= 0) {
      setError('Position size must be greater than 0');
      return;
    }
    setError(null);
    onSubmit?.({ side, kind, price: entryPrice, size: computedSize, stopLoss: slVal, takeProfit: tpVal });
  };

  return (
    <div
      className={cn(
        'w-full rounded-2xl border border-[#C9A646]/20 bg-[#0A0A0A]/95 backdrop-blur-sm p-4 text-white',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold tracking-wide text-white">PLACE ORDER</h3>
        <span className="text-[10px] text-gray-500">{symbol}</span>
      </div>

      {/* Advanced toggle */}
      <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 mb-3">
        <span className="text-xs text-gray-300">Advanced order</span>
        <Switch
          checked={advanced}
          onCheckedChange={setAdvanced}
          className="data-[state=checked]:bg-[#C9A646]"
        />
      </div>

      {/* Order kind (advanced only) */}
      {advanced && (
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-white/5 p-1 mb-3">
          {(['market', 'limit', 'stop'] as OrderKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                'rounded-md py-1 text-xs font-medium capitalize transition-all',
                kind === k ? 'bg-[#C9A646] text-black' : 'text-gray-400 hover:text-white'
              )}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      {/* Limit/stop price (advanced + non-market) */}
      {advanced && kind !== 'market' && (
        <Field label={`${kind === 'limit' ? 'Limit' : 'Stop'} price`}>
          <input
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            placeholder={marketPrice ? String(marketPrice) : '0'}
            className={inputCls}
          />
        </Field>
      )}

      {/* Standard: manual position size */}
      {!advanced && (
        <Field label="Position size" suffix={symbol}>
          <input
            type="number"
            value={positionSize}
            onChange={(e) => setPositionSize(e.target.value)}
            placeholder="0"
            className={inputCls}
          />
        </Field>
      )}

      {/* Advanced: risk-based sizing */}
      {advanced && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              type="button"
              onClick={() => setBalanceBasis('current')}
              className={cn(
                'rounded-lg py-2 text-xs transition-all border',
                balanceBasis === 'current'
                  ? 'border-[#C9A646]/60 bg-[#C9A646]/10 text-[#C9A646]'
                  : 'border-white/10 text-gray-400 hover:text-white'
              )}
            >
              Current ${currentBalance.toLocaleString()}
            </button>
            <button
              type="button"
              onClick={() => setBalanceBasis('initial')}
              className={cn(
                'rounded-lg py-2 text-xs transition-all border',
                balanceBasis === 'initial'
                  ? 'border-[#C9A646]/60 bg-[#C9A646]/10 text-[#C9A646]'
                  : 'border-white/10 text-gray-400 hover:text-white'
              )}
            >
              Initial ${initialBalance.toLocaleString()}
            </button>
          </div>

          <Field
            label={`Max risk (${riskMode === 'percent' ? '%' : '$'})`}
            action={
              <button
                type="button"
                onClick={() => setRiskMode((m) => (m === 'percent' ? 'amount' : 'percent'))}
                className="text-[10px] text-[#C9A646] hover:text-[#D4B55E]"
              >
                {riskMode === 'percent' ? 'Use $' : 'Use %'}
              </button>
            }
          >
            <input
              type="number"
              value={riskValue}
              onChange={(e) => setRiskValue(e.target.value)}
              placeholder={riskMode === 'percent' ? '1' : '100'}
              className={inputCls}
            />
          </Field>
          {riskAmountPreview > 0 && (
            <p className="text-[10px] text-gray-500 -mt-1 mb-2">
              Risking ${riskAmountPreview.toFixed(2)} → size {computedSize ? computedSize.toFixed(4) : '—'}
            </p>
          )}
        </>
      )}

      {/* Market price (read-only) */}
      <Field label="Market price" suffix="USD">
        <div className="flex h-9 items-center text-sm text-gray-300 font-mono">
          {marketPrice ? marketPrice.toLocaleString(undefined, { maximumFractionDigits: 3 }) : '—'}
        </div>
      </Field>

      {/* SL / TP */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Profit target">
          <input
            type="number"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            placeholder="0"
            className={inputCls}
          />
        </Field>
        <Field label="Stop loss">
          <input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            placeholder="0"
            className={inputCls}
          />
        </Field>
      </div>

      {/* Reward / Risk / Total */}
      <div className="grid grid-cols-3 gap-2 my-3 text-center">
        <div>
          <p className="text-[10px] text-gray-500">Reward</p>
          <p className="text-sm font-semibold text-emerald-400">
            ${rr.reward.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500">Risk</p>
          <p className="text-sm font-semibold text-rose-400">${rr.risk.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500">R:R</p>
          <p className="text-sm font-semibold text-[#C9A646]">
            {rr.rr ? `${rr.rr.toFixed(2)}` : '—'}
          </p>
        </div>
      </div>

      {error && <p className="text-[11px] text-rose-400 mb-2">{error}</p>}

      {/* Buy / Sell */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => place('buy')}
          className="rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-black font-bold py-2.5 text-sm transition-colors"
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => place('sell')}
          className="rounded-xl bg-rose-500/90 hover:bg-rose-500 text-white font-bold py-2.5 text-sm transition-colors"
        >
          Sell
        </button>
      </div>
    </div>
  );
}

const inputCls =
  'w-full h-9 rounded-md bg-white/5 border border-white/10 px-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#C9A646]/40 focus:ring-1 focus:ring-[#C9A646]/30 font-mono';

function Field({
  label,
  suffix,
  action,
  children,
}: {
  label: string;
  suffix?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] text-gray-400">{label}</label>
        {action ?? (suffix && <span className="text-[10px] text-gray-600">{suffix}</span>)}
      </div>
      {children}
    </div>
  );
}

export default PlaceOrderPanel;
