// ==========================================
// CREATE BACKTESTING SESSION MODAL (Phase 1 + Phase 7)
// ==========================================
// 1:1 layout with the reference "Create new session" dialog, in Finotaur
// gold-on-black. "Connect to playbook" → "Connect to strategy" (our Strategies).
//
// Phase 7 addition: collapsible "Execution settings" section for commission
// and slippage configuration. Defaults to all-zero (no fees) so existing
// sessions are unaffected. CommissionConfig is stored on the session and
// threaded into useBacktestSession via setCommissionConfig on chart load.

import { useState } from 'react';
import { CalendarDays, Plus, Loader2, ChevronDown } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import {
  useStrategiesOptimized,
  useCreateStrategyOptimized,
} from '@/hooks/useStrategies';
import { useBacktestSessionStore } from '@/store/useBacktestSessionStore';
import {
  ASSET_TYPE_LABELS,
  COMING_SOON_ASSETS,
  type BacktestAssetType,
  type BacktestSession,
} from '@/types/backtestSession';
import { SymbolAutocomplete } from './SymbolAutocomplete';
import type { AssetClass } from './symbolUniverse';
import { cn } from '@/lib/utils';
import {
  type CommissionConfig,
  DEFAULT_COMMISSION_CONFIG,
} from '@/lib/backtest/orderEngine';

const GOLD = '#C9A646';
const ASSET_ORDER: BacktestAssetType[] = ['forex', 'stocks', 'crypto', 'futures'];

interface CreateBacktestSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired after a session is created and stored (already set active).
   *  Phase 7: commissionConfig carries the execution settings chosen by the user.
   *  The second argument defaults to DEFAULT_COMMISSION_CONFIG (all-zero) when
   *  callers that haven't adopted the new signature omit it. */
  onCreated: (session: BacktestSession, commissionConfig?: CommissionConfig) => void;
}

function toIsoDate(d: Date): string {
  // yyyy-mm-dd in local time (avoids UTC off-by-one from toISOString).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatRangeLabel(range?: DateRange): string {
  if (!range?.from) return 'Select date range';
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (!range.to) return fmt(range.from);
  return `${fmt(range.from)} — ${fmt(range.to)}`;
}

export function CreateBacktestSessionModal({
  open,
  onOpenChange,
  onCreated,
}: CreateBacktestSessionModalProps) {
  const { id: userId } = useEffectiveUser();
  const { data: strategies = [], isLoading: strategiesLoading } = useStrategiesOptimized(userId);
  const createStrategy = useCreateStrategyOptimized();
  const createSession = useBacktestSessionStore((s) => s.createSession);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [strategyId, setStrategyId] = useState<string>('');
  const [assetType, setAssetType] = useState<BacktestAssetType>('forex');
  const [symbol, setSymbol] = useState<string>('');
  const [startBalance, setStartBalance] = useState<string>('');
  const [range, setRange] = useState<DateRange | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Phase 7: execution settings (commission + slippage).
  const [execOpen, setExecOpen] = useState(false);
  const [commissionPerOrder, setCommissionPerOrder] = useState('0');
  const [commissionPercent, setCommissionPercent] = useState('0');
  const [slippagePercent, setSlippagePercent] = useState('0');

  // Inline "create new strategy" (mirrors reference "Create new playbook")
  const [creatingStrategy, setCreatingStrategy] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState('');


  const resetForm = () => {
    setName('');
    setDescription('');
    setStrategyId('');
    setAssetType('forex');
    setSymbol('');
    setStartBalance('');
    setRange(undefined);
    setError(null);
    setCreatingStrategy(false);
    setNewStrategyName('');
    setExecOpen(false);
    setCommissionPerOrder('0');
    setCommissionPercent('0');
    setSlippagePercent('0');
  };

  const handleClose = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleAssetChange = (next: BacktestAssetType) => {
    if (COMING_SOON_ASSETS.includes(next)) return;
    setAssetType(next);
    setSymbol(''); // reset symbol when asset class changes
  };

  const handleCreateStrategy = async () => {
    const trimmed = newStrategyName.trim();
    if (!trimmed || !userId) return;
    try {
      const created = await createStrategy.mutateAsync({
        user_id: userId,
        name: trimmed,
        description: '',
        category: assetType,
      });
      if (created?.id) {
        setStrategyId(created.id);
      }
      setCreatingStrategy(false);
      setNewStrategyName('');
    } catch {
      // toast handled inside the mutation
    }
  };

  const handleSubmit = () => {
    setError(null);
    if (!name.trim()) {
      setError('Session name is required');
      return;
    }
    if (!symbol) {
      setError('Please select a symbol');
      return;
    }
    const balance = Number(startBalance);
    if (!balance || balance <= 0) {
      setError('Enter a valid starting balance');
      return;
    }
    if (!range?.from || !range?.to) {
      setError('Please select a date range');
      return;
    }

    const selectedStrategy = strategies.find((s: any) => s.id === strategyId);
    const session = createSession({
      name: name.trim(),
      description: description.trim() || undefined,
      strategyId: strategyId || null,
      strategyName: selectedStrategy?.name ?? null,
      assetType,
      symbol,
      timeframe: '1m',
      startBalance: balance,
      leverage: 1,
      dateRange: { from: toIsoDate(range.from), to: toIsoDate(range.to) },
    });

    // Phase 7: resolve commission config from execution settings inputs.
    const commissionConfig: CommissionConfig = {
      commissionPerOrder: Math.max(0, parseFloat(commissionPerOrder) || 0),
      commissionPercent: Math.max(0, parseFloat(commissionPercent) || 0),
      slippagePercent: Math.max(0, parseFloat(slippagePercent) || 0),
    };

    resetForm();
    onOpenChange(false);
    onCreated(session, commissionConfig);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md border border-[#C9A646]/20 bg-[#0A0A0A] text-white p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-semibold text-white">Create new session</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Session name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400">
              Session name <span className="text-[#C9A646]">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Opening Range Test"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#C9A646]/40"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="We want to test the first 15 mins of each session"
              rows={2}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#C9A646]/40 resize-none"
            />
          </div>

          {/* Connect to strategy */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Connect to strategy</Label>
              <button
                type="button"
                onClick={() => setCreatingStrategy((v) => !v)}
                className="text-xs text-[#C9A646] hover:text-[#D4B55E] transition-colors flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Create new strategy
              </button>
            </div>

            {creatingStrategy ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newStrategyName}
                  onChange={(e) => setNewStrategyName(e.target.value)}
                  placeholder="New strategy name"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#C9A646]/40"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateStrategy();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleCreateStrategy}
                  disabled={!newStrategyName.trim() || createStrategy.isPending}
                  className="bg-[#C9A646] hover:bg-[#D4B55E] text-black shrink-0"
                >
                  {createStrategy.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                </Button>
              </div>
            ) : (
              <Select value={strategyId} onValueChange={setStrategyId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-[#C9A646]/40">
                  <SelectValue placeholder={strategiesLoading ? 'Loading…' : 'Select a strategy (optional)'} />
                </SelectTrigger>
                <SelectContent className="z-[10000] bg-[#0A0A0A] border-[#C9A646]/20 text-white">
                  {strategies.length === 0 && (
                    <div className="px-2 py-3 text-xs text-gray-500">No strategies yet — create one above.</div>
                  )}
                  {strategies.map((s: any) => (
                    <SelectItem key={s.id} value={s.id} className="focus:bg-[#C9A646]/10">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Type tabs */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400">Type</Label>
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-white/5 p-1">
              {ASSET_ORDER.map((t) => {
                const soon = COMING_SOON_ASSETS.includes(t);
                const active = assetType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={soon}
                    onClick={() => handleAssetChange(t)}
                    className={cn(
                      'relative rounded-md py-1.5 text-xs font-medium transition-all',
                      active
                        ? 'bg-[#C9A646] text-black'
                        : 'text-gray-400 hover:text-white',
                      soon && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    {ASSET_TYPE_LABELS[t]}
                    {soon && (
                      <span className="absolute -top-1.5 -right-1 text-[8px] text-[#C9A646]">soon</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Symbol */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400">Symbol</Label>
            <SymbolAutocomplete
              symbol={symbol}
              assetClass={assetType as AssetClass}
              filterToAssetClass
              variant="field"
              onSelect={setSymbol}
            />
          </div>

          {/* Start balance + Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">
                Start balance <span className="text-[#C9A646]">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <Input
                  type="number"
                  min={0}
                  value={startBalance}
                  onChange={(e) => setStartBalance(e.target.value)}
                  placeholder="10000"
                  className="no-spinner pl-6 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#C9A646]/40"
                />
              </div>
              <p className="text-[10px] text-gray-600">Leverage is 1:1</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">
                Date range <span className="text-[#C9A646]">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full h-10 flex items-center gap-2 rounded-md bg-white/5 border border-white/10 px-3 text-left text-sm text-white hover:border-[#C9A646]/40 transition-colors"
                  >
                    <CalendarDays className="h-4 w-4 text-[#C9A646] shrink-0" />
                    <span className={cn('truncate', !range?.from && 'text-gray-600')}>
                      {formatRangeLabel(range)}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="z-[10000] w-auto p-0 bg-[#0A0A0A] border-[#C9A646]/20" align="end">
                  <Calendar
                    mode="range"
                    selected={range}
                    onSelect={setRange}
                    numberOfMonths={1}
                    className="text-white"
                  />
                </PopoverContent>
              </Popover>
              <p className="text-[10px] text-gray-600">Start time is 12 am US/Eastern</p>
            </div>
          </div>

          {/* Phase 7: Execution settings — collapsible */}
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setExecOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold text-gray-400 hover:bg-white/5 transition-colors"
            >
              <span>Execution settings (optional)</span>
              <ChevronDown
                size={14}
                className={cn('transition-transform', execOpen ? 'rotate-180' : '')}
              />
            </button>
            {execOpen && (
              <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-3">
                <p className="text-[10px] text-gray-600">
                  Simulates broker fees and price slippage. Leave at 0 for clean paper trading.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-400">Commission per order ($)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={commissionPerOrder}
                      onChange={(e) => setCommissionPerOrder(e.target.value)}
                      placeholder="0"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#C9A646]/40 text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-400">Commission (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={commissionPercent}
                      onChange={(e) => setCommissionPercent(e.target.value)}
                      placeholder="0"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#C9A646]/40 text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-400">Slippage (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={slippagePercent}
                      onChange={(e) => setSlippagePercent(e.target.value)}
                      placeholder="0"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#C9A646]/40 text-xs h-8"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-white/10 px-6 py-4">
          <Button
            onClick={handleSubmit}
            className="bg-[#C9A646] hover:bg-[#D4B55E] text-black font-semibold"
            style={{ boxShadow: `0 8px 24px -8px ${GOLD}80` }}
          >
            Create session
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleClose(false)}
            className="text-gray-400 hover:text-white hover:bg-white/5"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateBacktestSessionModal;
