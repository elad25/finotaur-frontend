// ==========================================
// CREATE BACKTESTING SESSION MODAL (Phase 1)
// ==========================================
// 1:1 layout with the reference "Create new session" dialog, in Finotaur
// gold-on-black. "Connect to playbook" → "Connect to strategy" (our Strategies).

import { useMemo, useState } from 'react';
import { CalendarDays, Plus, Loader2 } from 'lucide-react';
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
  SYMBOLS_BY_ASSET,
  type BacktestAssetType,
  type BacktestSession,
} from '@/types/backtestSession';
import { cn } from '@/lib/utils';

const GOLD = '#C9A646';
const ASSET_ORDER: BacktestAssetType[] = ['forex', 'stocks', 'crypto', 'futures'];

interface CreateBacktestSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired after a session is created and stored (already set active). */
  onCreated: (session: BacktestSession) => void;
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
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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

  // Inline "create new strategy" (mirrors reference "Create new playbook")
  const [creatingStrategy, setCreatingStrategy] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState('');

  const symbolOptions = useMemo(() => SYMBOLS_BY_ASSET[assetType] ?? [], [assetType]);

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

    resetForm();
    onOpenChange(false);
    onCreated(session);
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
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-[#C9A646]/40">
                <SelectValue placeholder="Select a symbol" />
              </SelectTrigger>
              <SelectContent className="z-[10000] bg-[#0A0A0A] border-[#C9A646]/20 text-white">
                {symbolOptions.map((sym) => (
                  <SelectItem key={sym} value={sym} className="focus:bg-[#C9A646]/10">
                    {sym}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  className="pl-6 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#C9A646]/40"
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
