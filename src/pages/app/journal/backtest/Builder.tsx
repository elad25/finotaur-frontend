/**
 * Backtest Strategy Builder — Phase 3 of the marketing-ready sprint.
 *
 * Single-page editor for rule-based strategies. Users build a list of rules
 * (WHEN <condition> THEN <action>), save them to localStorage, and run them
 * against any chart in the Backtest tab via the "Run Strategy" picker.
 *
 * No drag-and-drop or visual flow — just compact form rows. The Builder is
 * for traders who already think in if/then terms; visual flow tools are
 * out of scope for Phase 3.
 */

import { useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  Save,
  Sparkles,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import {
  conditionLabel,
  makeEmptyStrategy,
  makeRule,
  type Comparator,
  type Condition,
  type IndicatorRef,
  type Operand,
  type Rule,
  type RuleAction,
  type Strategy,
} from '@/types/backtest-strategy';
import { useStrategyLibrary } from '@/hooks/useStrategyLibrary';

// ─── Quick templates ────────────────────────────────────────────
const TEMPLATES: Array<{ name: string; build: () => Strategy }> = [
  {
    name: 'RSI Oversold/Overbought',
    build: () => {
      const s = makeEmptyStrategy('RSI Oversold/Overbought');
      s.notes = 'Buy when RSI < 30, close when RSI > 70.';
      s.rules = [
        {
          id: `rule_${Date.now()}_a`,
          action: 'OPEN_LONG',
          size: 1,
          when: {
            left: { kind: 'indicator', ref: { type: 'RSI', period: 14 } },
            operator: 'lt',
            right: { kind: 'literal', value: 30 },
          },
          stopLossPct: 2,
          takeProfitPct: 4,
        },
        {
          id: `rule_${Date.now()}_b`,
          action: 'CLOSE',
          size: 0,
          when: {
            left: { kind: 'indicator', ref: { type: 'RSI', period: 14 } },
            operator: 'gt',
            right: { kind: 'literal', value: 70 },
          },
        },
      ];
      return s;
    },
  },
  {
    name: 'SMA Cross (50)',
    build: () => {
      const s = makeEmptyStrategy('SMA Cross (50)');
      s.notes = 'Buy when price crosses above SMA 50, close when it crosses below.';
      s.rules = [
        {
          id: `rule_${Date.now()}_a`,
          action: 'OPEN_LONG',
          size: 1,
          when: {
            left: { kind: 'price', field: 'close' },
            operator: 'crosses_above',
            right: { kind: 'indicator', ref: { type: 'SMA', period: 50 } },
          },
          stopLossPct: 1.5,
          takeProfitPct: 3,
        },
        {
          id: `rule_${Date.now()}_b`,
          action: 'CLOSE',
          size: 0,
          when: {
            left: { kind: 'price', field: 'close' },
            operator: 'crosses_below',
            right: { kind: 'indicator', ref: { type: 'SMA', period: 50 } },
          },
        },
      ];
      return s;
    },
  },
];

// ═══════════════════════════════════════════════════════════════
// Operand picker — 3 modes (price / indicator / literal)
// ═══════════════════════════════════════════════════════════════
function OperandPicker({ value, onChange }: { value: Operand; onChange: (o: Operand) => void }) {
  return (
    <div className="flex items-center gap-1">
      <select
        value={value.kind}
        onChange={(e) => {
          const kind = e.target.value as Operand['kind'];
          if (kind === 'price') onChange({ kind: 'price', field: 'close' });
          else if (kind === 'literal') onChange({ kind: 'literal', value: 0 });
          else onChange({ kind: 'indicator', ref: { type: 'RSI', period: 14 } });
        }}
        className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 focus:outline-none"
      >
        <option value="price">Price</option>
        <option value="indicator">Indicator</option>
        <option value="literal">Number</option>
      </select>

      {value.kind === 'price' && (
        <select
          value={value.field}
          onChange={(e) => onChange({ kind: 'price', field: e.target.value as 'open' | 'high' | 'low' | 'close' })}
          className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="open">Open</option>
          <option value="high">High</option>
          <option value="low">Low</option>
          <option value="close">Close</option>
        </select>
      )}

      {value.kind === 'indicator' && (
        <>
          <select
            value={value.ref.type}
            onChange={(e) => {
              const type = e.target.value as IndicatorRef['type'];
              const period =
                type === 'VWAP'
                  ? 0
                  : value.ref.type === 'VWAP'
                  ? 14
                  : (value.ref as { period: number }).period;
              const ref: IndicatorRef = type === 'VWAP' ? { type: 'VWAP' } : { type, period };
              onChange({ kind: 'indicator', ref });
            }}
            className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-[#C9A646] focus:outline-none"
          >
            <option value="SMA">SMA</option>
            <option value="EMA">EMA</option>
            <option value="RSI">RSI</option>
            <option value="VWAP">VWAP</option>
          </select>
          {value.ref.type !== 'VWAP' && (
            <input
              type="number"
              value={value.ref.period}
              onChange={(e) => {
                const p = Math.max(1, Number(e.target.value));
                onChange({ kind: 'indicator', ref: { type: value.ref.type, period: p } as IndicatorRef });
              }}
              min="1"
              step="1"
              className="w-14 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs focus:outline-none"
            />
          )}
        </>
      )}

      {value.kind === 'literal' && (
        <input
          type="number"
          value={value.value}
          onChange={(e) => onChange({ kind: 'literal', value: Number(e.target.value) })}
          step="0.01"
          className="w-20 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs focus:outline-none"
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Rule row
// ═══════════════════════════════════════════════════════════════
const COMPARATORS: Comparator[] = ['gt', 'lt', 'gte', 'lte', 'crosses_above', 'crosses_below'];
const COMPARATOR_LABELS: Record<Comparator, string> = {
  gt: '>',
  lt: '<',
  gte: '≥',
  lte: '≤',
  crosses_above: 'crosses ↑',
  crosses_below: 'crosses ↓',
};

function RuleRow({
  index,
  rule,
  onChange,
  onDelete,
}: {
  index: number;
  rule: Rule;
  onChange: (r: Rule) => void;
  onDelete: () => void;
}) {
  const updateWhen = (patch: Partial<Condition>) =>
    onChange({ ...rule, when: { ...rule.when, ...patch } });

  const isOpenAction = rule.action === 'OPEN_LONG' || rule.action === 'OPEN_SHORT';

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
            #{index + 1}
          </span>
          <span className="text-xs uppercase tracking-wider text-zinc-500">When</span>
        </div>
        <button
          onClick={onDelete}
          className="rounded p-1 text-zinc-600 transition-colors hover:bg-rose-950 hover:text-rose-400"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Condition: left op right */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <OperandPicker value={rule.when.left} onChange={(o) => updateWhen({ left: o })} />
        <select
          value={rule.when.operator}
          onChange={(e) => updateWhen({ operator: e.target.value as Comparator })}
          className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 focus:outline-none"
        >
          {COMPARATORS.map((c) => (
            <option key={c} value={c}>
              {COMPARATOR_LABELS[c]}
            </option>
          ))}
        </select>
        <OperandPicker value={rule.when.right} onChange={(o) => updateWhen({ right: o })} />
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-end gap-3 border-t border-zinc-800 pt-3">
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">Then</div>
          <select
            value={rule.action}
            onChange={(e) => onChange({ ...rule, action: e.target.value as RuleAction })}
            className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm font-semibold focus:outline-none"
          >
            <option value="OPEN_LONG">Buy / Long</option>
            <option value="OPEN_SHORT">Sell / Short</option>
            <option value="CLOSE">Close position</option>
          </select>
        </div>

        {isOpenAction && (
          <>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">Size</div>
              <input
                type="number"
                value={rule.size}
                onChange={(e) => onChange({ ...rule, size: Math.max(0.01, Number(e.target.value)) })}
                min="0.01"
                step="0.1"
                className="w-20 rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm focus:outline-none"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">Stop loss %</div>
              <input
                type="number"
                value={rule.stopLossPct ?? ''}
                placeholder="optional"
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({ ...rule, stopLossPct: v === '' ? undefined : Math.max(0, Number(v)) });
                }}
                min="0"
                step="0.1"
                className="w-24 rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm focus:outline-none"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">Take profit %</div>
              <input
                type="number"
                value={rule.takeProfitPct ?? ''}
                placeholder="optional"
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({ ...rule, takeProfitPct: v === '' ? undefined : Math.max(0, Number(v)) });
                }}
                min="0"
                step="0.1"
                className="w-24 rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm focus:outline-none"
              />
            </div>
          </>
        )}
      </div>

      {/* Compact preview */}
      <div className="mt-3 border-t border-zinc-800 pt-2 font-mono text-[11px] text-zinc-500">
        WHEN {conditionLabel(rule.when)} → {rule.action.replace('_', ' ')}
        {isOpenAction ? ` ${rule.size}× ` : ''}
        {rule.stopLossPct != null ? ` · SL ${rule.stopLossPct}%` : ''}
        {rule.takeProfitPct != null ? ` · TP ${rule.takeProfitPct}%` : ''}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Builder page
// ═══════════════════════════════════════════════════════════════
export const Builder = () => {
  const lib = useStrategyLibrary();
  const [draft, setDraft] = useState<Strategy>(() => makeEmptyStrategy());
  const [pickerOpen, setPickerOpen] = useState(false);

  const isDirty =
    draft.rules.length > 0 || !!draft.notes || draft.name !== 'New Strategy';

  const handleNewBlank = () => setDraft(makeEmptyStrategy());

  const handleLoadTemplate = (build: () => Strategy) => {
    setDraft(build());
    setPickerOpen(false);
  };

  const handleLoadExisting = (id: string) => {
    const found = lib.strategies.find((s) => s.id === id);
    if (found) setDraft({ ...found });
    setPickerOpen(false);
  };

  const handleAddRule = () => {
    const rule = makeRule(
      'OPEN_LONG',
      {
        left: { kind: 'indicator', ref: { type: 'RSI', period: 14 } },
        operator: 'lt',
        right: { kind: 'literal', value: 30 },
      },
      1,
    );
    setDraft({ ...draft, rules: [...draft.rules, rule] });
  };

  const handleUpdateRule = (id: string, next: Rule) => {
    setDraft({ ...draft, rules: draft.rules.map((r) => (r.id === id ? next : r)) });
  };

  const handleDeleteRule = (id: string) => {
    setDraft({ ...draft, rules: draft.rules.filter((r) => r.id !== id) });
  };

  const handleSave = () => {
    if (draft.rules.length === 0) {
      alert('Add at least one rule before saving.');
      return;
    }
    lib.saveStrategy(draft);
    alert(`Saved "${draft.name}".`);
  };

  const handleDuplicate = () => {
    if (!lib.strategies.some((s) => s.id === draft.id)) {
      alert('Save the strategy first before duplicating.');
      return;
    }
    const copy = lib.duplicateStrategy(draft.id);
    if (copy) setDraft({ ...copy });
  };

  const handleDelete = () => {
    if (!lib.strategies.some((s) => s.id === draft.id)) return;
    if (!confirm(`Delete strategy "${draft.name}"? This cannot be undone.`)) return;
    lib.deleteStrategy(draft.id);
    setDraft(makeEmptyStrategy());
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6 text-[#F4F4F4]">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-[#C9A646]">
            <Sparkles size={28} />
            Strategy Builder
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Build rule-based strategies. Run them on any chart in the Backtest tab.
          </p>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Load
              <ChevronDown size={14} />
            </button>
            {pickerOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-md border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
                <div className="mb-1 px-2 text-[10px] uppercase tracking-wider text-zinc-500">
                  Templates
                </div>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => handleLoadTemplate(t.build)}
                    className="block w-full rounded px-2 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-900"
                  >
                    {t.name}
                  </button>
                ))}
                {lib.strategies.length > 0 && (
                  <>
                    <div className="mb-1 mt-2 px-2 text-[10px] uppercase tracking-wider text-zinc-500">
                      My strategies ({lib.strategies.length})
                    </div>
                    {lib.strategies.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleLoadExisting(s.id)}
                        className="block w-full rounded px-2 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-900"
                      >
                        {s.name}
                        <span className="ml-2 text-[10px] text-zinc-600">
                          {s.rules.length} rule{s.rules.length !== 1 && 's'}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleNewBlank}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            New
          </button>
          <div className="flex-1" />
          <button
            onClick={handleDuplicate}
            className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            <Copy size={14} />
            Duplicate
          </button>
          <button
            onClick={handleDelete}
            disabled={!lib.strategies.some((s) => s.id === draft.id)}
            className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-400 hover:border-rose-700 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={14} />
            Delete
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-md bg-[#C9A646] px-4 py-1.5 text-sm font-semibold text-black hover:bg-[#D4B55E]"
          >
            <Save size={14} />
            Save
          </button>
        </div>

        {/* Strategy metadata */}
        <div className="mb-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Name</span>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-base font-semibold focus:border-[#C9A646] focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Notes (optional)</span>
            <textarea
              value={draft.notes ?? ''}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={2}
              placeholder="What does this strategy do?"
              className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm focus:border-[#C9A646] focus:outline-none"
            />
          </label>
        </div>

        {/* Rules */}
        <div className="space-y-3">
          {draft.rules.length === 0 && (
            <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950 p-8 text-center">
              <AlertCircle className="mx-auto mb-2 text-zinc-600" size={24} />
              <p className="text-sm text-zinc-500">
                No rules yet. Add one below or load a template from the Load button.
              </p>
            </div>
          )}
          {draft.rules.map((rule, i) => (
            <RuleRow
              key={rule.id}
              index={i}
              rule={rule}
              onChange={(r) => handleUpdateRule(rule.id, r)}
              onDelete={() => handleDeleteRule(rule.id)}
            />
          ))}
          <button
            onClick={handleAddRule}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-medium text-zinc-400 transition-colors hover:border-[#C9A646] hover:text-[#C9A646]"
          >
            <Plus size={16} />
            Add rule
          </button>
        </div>

        {/* Footnote */}
        {isDirty && draft.rules.length > 0 && (
          <div className="mt-6 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-500">
            Tip: rules are evaluated top-to-bottom. The first matching OPEN rule wins; CLOSE rules
            only fire while a position is open. Entry/exit always fills at the NEXT bar's open —
            no look-ahead bias.
          </div>
        )}
      </div>
    </div>
  );
};

export default Builder;
