// src/components/PortfolioCopyRules.tsx
import { useState, useCallback, useEffect } from 'react';
import { Copy, Plus, Trash2, Pause, Play, ChevronRight, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { useTradovate } from '@/hooks/useTradovate';
import { supabase } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

interface Portfolio { id: string; name: string; }

interface Props {
  portfolios: Portfolio[];
}

interface SymbolRule {
  id?: string;
  sourceSymbol: string;
  targetSymbol: string;
  quantityRatio: number;
  copyRuleId?: string | null;
}

export default function PortfolioCopyRules({ portfolios }: Props) {
  const { id: userId } = useEffectiveUser();
  const { copyRules, addCopyRule, toggleCopyRule, deleteCopyRule, isLoading } = useTradovate();

  // ── Copy rule form state
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [ratio, setRatio] = useState(100);
  const [maxContracts, setMaxContracts] = useState<number | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  // ── Symbol mapping state
  const [symbolRules, setSymbolRules] = useState<SymbolRule[]>([]);
  const [showSymbolForm, setShowSymbolForm] = useState(false);
  const [newSrcSymbol, setNewSrcSymbol] = useState('');
  const [newTgtSymbol, setNewTgtSymbol] = useState('');
  const [newQtyRatio, setNewQtyRatio] = useState(1);
  const [symbolLoading, setSymbolLoading] = useState(false);

  // ── Load existing symbol rules on mount
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('symbol_mapping_rules')
      .select('id,source_symbol,target_symbol,quantity_ratio,copy_rule_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) {
          setSymbolRules(data.map(r => ({
            id:            r.id,
            sourceSymbol:  r.source_symbol,
            targetSymbol:  r.target_symbol,
            quantityRatio: r.quantity_ratio,
            copyRuleId:    r.copy_rule_id,
          })));
        }
      });
  }, [userId]);

  // ── Add copy rule
  const handleAdd = useCallback(async () => {
    if (!sourceId || !targetId) { setError('Select both portfolios'); return; }
    if (sourceId === targetId) { setError('Source and target must be different'); return; }
    const exists = copyRules.some(
      r => r.source_portfolio_id === sourceId && r.target_portfolio_id === targetId
    );
    if (exists) { setError('This rule already exists'); return; }
    setError('');
    await addCopyRule(
      sourceId,
      targetId,
      ratio / 100,
      maxContracts !== '' ? Number(maxContracts) : undefined
    );
    setSourceId('');
    setTargetId('');
    setRatio(100);
    setMaxContracts('');
    setShowForm(false);
  }, [sourceId, targetId, ratio, maxContracts, copyRules, addCopyRule]);

  // ── Add symbol mapping rule
  const handleAddSymbolRule = useCallback(async () => {
    if (!newSrcSymbol.trim() || !newTgtSymbol.trim()) return;
    if (!userId) return;
    setSymbolLoading(true);
    try {
      const { data, error: dbErr } = await supabase
        .from('symbol_mapping_rules')
        .insert({
          user_id:        userId,
          copy_rule_id:   null,
          source_symbol:  newSrcSymbol.trim().toUpperCase(),
          target_symbol:  newTgtSymbol.trim().toUpperCase(),
          quantity_ratio: newQtyRatio,
          is_active:      true,
        })
        .select('id,source_symbol,target_symbol,quantity_ratio')
        .single();

      if (!dbErr && data) {
        setSymbolRules(prev => [...prev, {
          id:            data.id,
          sourceSymbol:  data.source_symbol,
          targetSymbol:  data.target_symbol,
          quantityRatio: data.quantity_ratio,
        }]);
        setNewSrcSymbol('');
        setNewTgtSymbol('');
        setNewQtyRatio(1);
        setShowSymbolForm(false);
      }
    } finally {
      setSymbolLoading(false);
    }
  }, [userId, newSrcSymbol, newTgtSymbol, newQtyRatio]);

  // ── Delete symbol mapping rule
  const handleDeleteSymbolRule = useCallback(async (id: string) => {
    await supabase.from('symbol_mapping_rules').delete().eq('id', id);
    setSymbolRules(prev => prev.filter(r => r.id !== id));
  }, []);

  const getPortfolioName = (id: string) =>
    portfolios.find(p => p.id === id)?.name ?? id.slice(0, 8) + '…';

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#C9A646]/10 flex items-center justify-center">
            <Copy className="w-4 h-4 text-[#C9A646]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Portfolio Copy Rules</h3>
            <p className="text-[11px] text-zinc-500">Auto-copy trades between your portfolios</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C9A646]/10 border border-[#C9A646]/20 text-[#C9A646] text-xs font-medium hover:bg-[#C9A646]/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Rule
        </button>
      </div>

      {/* ── Add copy rule form ── */}
      {showForm && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">

          {/* Source / Target selects */}
          <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                Source Portfolio
              </label>
              <select
                value={sourceId}
                onChange={e => setSourceId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C9A646]/40"
              >
                <option value="">Select...</option>
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 mt-4" />
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                Target Portfolio
              </label>
              <select
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C9A646]/40"
              >
                <option value="">Select...</option>
                {portfolios.filter(p => p.id !== sourceId).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ratio slider — extended to 200% for leverage */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Copy Ratio</label>
              <span className="text-sm font-bold text-[#C9A646]">{ratio}%</span>
            </div>
            <input
              type="range" min={10} max={200} step={10}
              value={ratio}
              onChange={e => setRatio(Number(e.target.value))}
              className="w-full accent-[#C9A646]"
            />
            <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
              <span>10%</span>
              <span className="text-zinc-500">Quantity ratio (FLOOR rounded)</span>
              <span>200%</span>
            </div>
          </div>

          {/* Max Contracts */}
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
              Max Contracts per Trade{' '}
              <span className="normal-case text-zinc-600">(optional — blank = no limit)</span>
            </label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 5"
              value={maxContracts}
              onChange={e =>
                setMaxContracts(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#C9A646]/40"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" /> {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={isLoading || !sourceId || !targetId}
              className="flex-1 py-2 rounded-xl bg-[#C9A646] text-black text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40"
            >
              {isLoading ? 'Creating...' : 'Create Rule'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(''); }}
              className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Rules list ── */}
      {copyRules.length === 0 && !showForm ? (
        <div className="text-center py-8 text-zinc-600 text-sm border border-dashed border-zinc-800 rounded-xl">
          No copy rules yet. Click "Add Rule" to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {copyRules.map(rule => (
            <div
              key={rule.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                rule.is_active
                  ? 'bg-zinc-900/40 border-zinc-800'
                  : 'bg-zinc-900/20 border-zinc-800/40 opacity-60'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-white font-medium truncate">
                    {getPortfolioName(rule.source_portfolio_id)}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                  <span className="text-white font-medium truncate">
                    {getPortfolioName(rule.target_portfolio_id)}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {Math.round(rule.ratio * 100)}% ratio
                  {rule.max_contracts ? ` · max ${rule.max_contracts} contracts` : ''}
                  {' · '}{rule.is_active ? 'Active' : 'Paused'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleCopyRule(rule.id, !rule.is_active)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    rule.is_active
                      ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                  title={rule.is_active ? 'Pause' : 'Resume'}
                >
                  {rule.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => deleteCopyRule(rule.id)}
                  className="w-7 h-7 rounded-lg bg-red-500/5 text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all"
                  title="Delete rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Symbol Cross-Mapping section ── */}
      <div className="pt-2 border-t border-zinc-800/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Symbol Cross-Mapping</h3>
              <p className="text-[11px] text-zinc-500">e.g. ES → MES (×10), NQ → MNQ (×10)</p>
            </div>
          </div>
          <button
            onClick={() => setShowSymbolForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Mapping
          </button>
        </div>

        {/* Symbol mapping form */}
        {showSymbolForm && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3 mb-3">
            <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-2">
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                  Source Symbol
                </label>
                <input
                  value={newSrcSymbol}
                  onChange={e => setNewSrcSymbol(e.target.value)}
                  placeholder="ES"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white uppercase placeholder-zinc-600 focus:outline-none focus:border-emerald-500/40"
                />
              </div>
              <ArrowLeftRight className="w-4 h-4 text-zinc-500 mb-2" />
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                  Target Symbol
                </label>
                <input
                  value={newTgtSymbol}
                  onChange={e => setNewTgtSymbol(e.target.value)}
                  placeholder="MES"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white uppercase placeholder-zinc-600 focus:outline-none focus:border-emerald-500/40"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  Quantity Ratio
                </label>
                <span className="text-sm font-bold text-emerald-400">×{newQtyRatio}</span>
              </div>
              <input
                type="number" min={0.1} max={100} step={0.5}
                value={newQtyRatio}
                onChange={e => setNewQtyRatio(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/40"
              />
              <p className="text-[10px] text-zinc-600 mt-1">
                1 source contract → {newQtyRatio} target contracts (FLOOR rounded)
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAddSymbolRule}
                disabled={symbolLoading || !newSrcSymbol.trim() || !newTgtSymbol.trim()}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-black text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40"
              >
                {symbolLoading ? 'Saving...' : 'Save Mapping'}
              </button>
              <button
                onClick={() => {
                  setShowSymbolForm(false);
                  setNewSrcSymbol('');
                  setNewTgtSymbol('');
                  setNewQtyRatio(1);
                }}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Symbol rules list */}
        {symbolRules.length === 0 && !showSymbolForm ? (
          <div className="text-center py-6 text-zinc-600 text-xs border border-dashed border-zinc-800/60 rounded-xl">
            No symbol mappings. Same symbol used on both sides by default.
          </div>
        ) : (
          <div className="space-y-2">
            {symbolRules.map(rule => (
              <div
                key={rule.id ?? rule.sourceSymbol}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800"
              >
                <div className="flex-1 flex items-center gap-2 text-sm">
                  <span className="text-white font-mono font-bold">{rule.sourceSymbol}</span>
                  <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-emerald-400 font-mono font-bold">{rule.targetSymbol}</span>
                  <span className="text-zinc-500 text-xs ml-1">×{rule.quantityRatio}</span>
                </div>
                <button
                  onClick={() => rule.id && handleDeleteSymbolRule(rule.id)}
                  className="w-7 h-7 rounded-lg bg-red-500/5 text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all"
                  title="Delete mapping"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}