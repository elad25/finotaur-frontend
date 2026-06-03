/**
 * MultiLegBuilder — self-contained card for entering a 2–8 leg options spread.
 *
 * Wired into New.tsx as an opt-in toggle inside the Options Details block.
 * The single-leg path is completely unaffected when this component is not shown.
 */

import { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type TradeLeg,
  OPTION_STRATEGY_TYPES,
  netDebitCreditLabel,
  netMultiLegPnl,
  isMultiLegClosed,
} from '@/utils/tradeCalculations';
import { createMultiLegTrade } from '@/lib/journal/multiLegTrade';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MultiLegBuilderProps {
  userId: string;
  defaultSymbol?: string;
  portfolioId?: string | null;
  onSaved: (tradeId: string) => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Local leg state — superset of TradeLeg (partial while editing)
// ---------------------------------------------------------------------------

interface LegDraft {
  option_type: 'CALL' | 'PUT';
  side: 'LONG' | 'SHORT';
  strike_price: string;   // string so the input is always controlled
  quantity: string;
  entry_price: string;
  exit_price: string;
}

function emptyLeg(): LegDraft {
  return {
    option_type: 'CALL',
    side: 'LONG',
    strike_price: '',
    quantity: '1',
    entry_price: '',
    exit_price: '',
  };
}

function toNow(): string {
  const d = new Date();
  // datetime-local needs "YYYY-MM-DDTHH:mm"
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert LegDraft → TradeLeg for calculation helpers (returns null if incomplete). */
function toTradeLeg(d: LegDraft): TradeLeg | null {
  const strike = parseFloat(d.strike_price);
  const qty    = parseFloat(d.quantity);
  const entry  = parseFloat(d.entry_price);
  if (isNaN(strike) || isNaN(qty) || isNaN(entry)) return null;
  const exit = parseFloat(d.exit_price);
  return {
    option_type: d.option_type,
    side: d.side,
    strike_price: strike,
    quantity: qty,
    entry_price: entry,
    exit_price: isNaN(exit) ? undefined : exit,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(legs: LegDraft[], symbol: string): string | null {
  if (!symbol.trim()) return 'Underlying symbol is required.';
  if (legs.length < 2) return 'At least 2 legs are required.';

  for (let i = 0; i < legs.length; i++) {
    const n = i + 1;
    const leg = legs[i];
    const strike = parseFloat(leg.strike_price);
    const qty    = parseFloat(leg.quantity);
    const entry  = parseFloat(leg.entry_price);

    if (!leg.option_type) return `Leg ${n}: option type is required.`;
    if (!leg.side)        return `Leg ${n}: side is required.`;
    if (isNaN(strike) || strike <= 0) return `Leg ${n}: strike price must be a positive number.`;
    if (isNaN(qty)    || qty    <= 0) return `Leg ${n}: quantity must be a positive number.`;
    if (isNaN(entry)  || entry  <  0) return `Leg ${n}: entry price (premium) must be ≥ 0.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MultiLegBuilder({
  userId,
  defaultSymbol = '',
  portfolioId,
  onSaved,
  onCancel,
}: MultiLegBuilderProps) {
  const [symbol, setSymbol]               = useState(defaultSymbol.toUpperCase());
  const [strategyType, setStrategyType]   = useState<string>('vertical');
  const [openAt, setOpenAt]               = useState(toNow);
  const [closeAt, setCloseAt]             = useState('');
  const [notes, setNotes]                 = useState('');
  const [legs, setLegs]                   = useState<LegDraft[]>([emptyLeg(), emptyLeg()]);
  const [saving, setSaving]               = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveError, setSaveError]         = useState<string | null>(null);

  // Derived preview — computed from fully-parseable legs only
  const parsedLegs = legs.map(toTradeLeg).filter((l): l is TradeLeg => l !== null);
  const canPreview = parsedLegs.length === legs.length;
  const previewLabel = canPreview ? netDebitCreditLabel(parsedLegs) : null;
  const allClosed    = canPreview && isMultiLegClosed(parsedLegs);
  const pnl          = (canPreview && allClosed) ? netMultiLegPnl(parsedLegs) : null;

  // ---------------------------------------------------------------------------
  // Leg mutations
  // ---------------------------------------------------------------------------

  const updateLeg = useCallback(
    (idx: number, patch: Partial<LegDraft>) => {
      setLegs(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
    },
    [],
  );

  const addLeg = useCallback(() => {
    setLegs(prev => (prev.length < 8 ? [...prev, emptyLeg()] : prev));
  }, []);

  const removeLeg = useCallback((idx: number) => {
    setLegs(prev => (prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev));
  }, []);

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    setValidationError(null);
    setSaveError(null);

    const err = validate(legs, symbol);
    if (err) {
      setValidationError(err);
      return;
    }

    // Safe to assert non-null — validate() already checked all fields
    const tradeLegList = legs.map(d => toTradeLeg(d) as TradeLeg);

    setSaving(true);
    try {
      const { tradeId } = await createMultiLegTrade({
        userId,
        symbol: symbol.trim().toUpperCase(),
        strategyType,
        openAt: new Date(openAt).toISOString(),
        closeAt: closeAt ? new Date(closeAt).toISOString() : undefined,
        legs: tradeLegList,
        notes: notes.trim() || undefined,
        portfolioId: portfolioId ?? null,
      });
      onSaved(tradeId);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }, [legs, symbol, strategyType, openAt, closeAt, notes, userId, portfolioId, onSaved]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mt-4 rounded-2xl border border-yellow-500/25 bg-[#0b0b0b] p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-yellow-400 uppercase tracking-wider font-semibold">
          Multi-Leg Spread Builder
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Cancel multi-leg entry"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Row 1: Symbol + Strategy + Open At ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-zinc-400 mb-2 block">Underlying Symbol *</Label>
          <Input
            type="text"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            placeholder="SPY"
            className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200 uppercase"
          />
        </div>

        <div>
          <Label className="text-xs text-zinc-400 mb-2 block">Strategy</Label>
          <Select value={strategyType} onValueChange={setStrategyType}>
            <SelectTrigger className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border border-zinc-700">
              {OPTION_STRATEGY_TYPES.map(s => (
                <SelectItem key={s.value} value={s.value} className="text-zinc-200 focus:bg-zinc-800">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-zinc-400 mb-2 block">Opened At *</Label>
          <Input
            type="datetime-local"
            value={openAt}
            onChange={e => setOpenAt(e.target.value)}
            className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200"
          />
        </div>
      </div>

      {/* ── Row 2: Close At (optional) + Notes ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-zinc-400 mb-2 block">Closed At (optional)</Label>
          <Input
            type="datetime-local"
            value={closeAt}
            onChange={e => setCloseAt(e.target.value)}
            className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200"
          />
        </div>
        <div>
          <Label className="text-xs text-zinc-400 mb-2 block">Notes</Label>
          <Input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Setup rationale, thesis…"
            className="bg-[#0E0E0E] border border-yellow-200/15 rounded-xl h-12 text-zinc-200"
          />
        </div>
      </div>

      {/* ── Leg rows ── */}
      <div className="space-y-3">
        <p className="text-xs text-zinc-400 uppercase tracking-wider">Legs ({legs.length})</p>

        {/* Column headers */}
        <div className="hidden md:grid md:grid-cols-[1fr_1fr_1.2fr_0.8fr_1fr_1fr_auto] gap-2 px-1">
          {['Type', 'Side', 'Strike', 'Qty', 'Entry $', 'Exit $ (opt.)', ''].map(h => (
            <span key={h} className="text-[10px] text-zinc-500 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {legs.map((leg, idx) => (
          <div
            key={idx}
            className="grid grid-cols-2 md:grid-cols-[1fr_1fr_1.2fr_0.8fr_1fr_1fr_auto] gap-2 p-3 rounded-xl border border-zinc-800 bg-zinc-900/40"
          >
            {/* Option type toggle */}
            <div className="flex gap-1 col-span-1">
              {(['CALL', 'PUT'] as const).map(ot => (
                <button
                  key={ot}
                  type="button"
                  onClick={() => updateLeg(idx, { option_type: ot })}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${
                    leg.option_type === ot
                      ? ot === 'CALL'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-red-500/20 text-red-300 border-red-500/40'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-700'
                  }`}
                >
                  {ot}
                </button>
              ))}
            </div>

            {/* Side toggle */}
            <div className="flex gap-1 col-span-1">
              {(['LONG', 'SHORT'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateLeg(idx, { side: s })}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${
                    leg.side === s
                      ? s === 'LONG'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Strike */}
            <Input
              type="number"
              step="any"
              value={leg.strike_price}
              onChange={e => updateLeg(idx, { strike_price: e.target.value })}
              placeholder="Strike"
              className="bg-[#0E0E0E] border border-zinc-700 rounded-lg h-10 text-zinc-200 text-right text-sm"
            />

            {/* Quantity */}
            <Input
              type="number"
              step="1"
              min="1"
              value={leg.quantity}
              onChange={e => updateLeg(idx, { quantity: e.target.value })}
              placeholder="Qty"
              className="bg-[#0E0E0E] border border-zinc-700 rounded-lg h-10 text-zinc-200 text-right text-sm"
            />

            {/* Entry premium */}
            <Input
              type="number"
              step="any"
              min="0"
              value={leg.entry_price}
              onChange={e => updateLeg(idx, { entry_price: e.target.value })}
              placeholder="Entry $"
              className="bg-[#0E0E0E] border border-zinc-700 rounded-lg h-10 text-zinc-200 text-right text-sm"
            />

            {/* Exit premium (optional) */}
            <Input
              type="number"
              step="any"
              min="0"
              value={leg.exit_price}
              onChange={e => updateLeg(idx, { exit_price: e.target.value })}
              placeholder="Exit $"
              className="bg-[#0E0E0E] border border-zinc-700 rounded-lg h-10 text-zinc-200 text-right text-sm"
            />

            {/* Remove leg */}
            <button
              type="button"
              onClick={() => removeLeg(idx)}
              disabled={legs.length <= 2}
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors self-center"
              aria-label={`Remove leg ${idx + 1}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Add leg */}
        {legs.length < 8 && (
          <button
            type="button"
            onClick={addLeg}
            className="flex items-center gap-2 text-xs text-[#C9A646] hover:text-yellow-300 transition-colors py-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add leg ({legs.length}/8)
          </button>
        )}
      </div>

      {/* ── Live preview ── */}
      {canPreview && previewLabel && (
        <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl border border-yellow-500/15 bg-yellow-500/5">
          <span className="text-xs text-yellow-300 font-medium">{previewLabel}</span>
          {pnl !== null && (
            <span
              className={`text-xs font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
            >
              Net P&amp;L: {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
            </span>
          )}
        </div>
      )}

      {/* ── Errors ── */}
      {validationError && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {validationError}
        </p>
      )}
      {saveError && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {saveError}
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all bg-[#C9A646] text-black hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save Multi-Leg Trade'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-xl text-sm font-medium border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-all"
        >
          Cancel
        </button>
      </div>

      <p className="text-[10px] text-zinc-600">
        Premium inputs are per-share. One contract = 100 shares (multiplier fixed).
      </p>
    </div>
  );
}
