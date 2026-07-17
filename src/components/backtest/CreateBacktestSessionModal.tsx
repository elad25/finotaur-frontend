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

import { useEffect, useMemo, useState } from 'react';
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
  type BacktestAssetType,
  type BacktestSession,
} from '@/types/backtestSession';
import { SymbolAutocomplete } from './SymbolAutocomplete';
import type { AssetClass, SymbolEntry } from './symbolUniverse';
import { cn } from '@/lib/utils';
import {
  type CommissionConfig,
  DEFAULT_COMMISSION_CONFIG,
} from '@/lib/backtest/orderEngine';
import {
  isCryptoSymbol,
  isDatabentoCachedSymbol,
  isForexPair,
} from '@/components/charting/dataSources';
import { supabase } from '@/lib/supabase';

/** Probe symbol used to read the shared Databento futures cache's date coverage — all
 *  14 cached roots were seeded together, so MNQ's range represents the whole cache. */
const FUTURES_COVERAGE_PROBE_SYMBOL = 'MNQ';

/** Restricts futures symbol suggestions to the roots that actually have cached data. */
function isCachedFuturesEntry(entry: SymbolEntry & { assetClass: AssetClass }): boolean {
  return isDatabentoCachedSymbol(entry.symbol);
}

interface FuturesCoverage {
  from: string; // ISO date-only prefix, e.g. "2026-01-04"
  to: string;
}

/** Parses a "YYYY-MM-DD" (or full ISO) string into a local-midnight Date,
 *  matching the convention `getTodayNY`/`toIsoDate` use elsewhere in this file. */
function parseIsoDateOnly(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Fetches the earliest/latest cached bar dates for the Databento futures cache.
 *  Returns null on any failure — the caller treats a missing coverage hint as
 *  "unknown", not as an error. */
async function fetchFuturesCoverage(): Promise<FuturesCoverage | null> {
  try {
    const [firstRes, lastRes] = await Promise.all([
      supabase
        .from('backtest_candles')
        .select('ts')
        .eq('source', 'databento')
        .eq('symbol', FUTURES_COVERAGE_PROBE_SYMBOL)
        .eq('timeframe', '1m')
        .order('ts', { ascending: true })
        .limit(1),
      supabase
        .from('backtest_candles')
        .select('ts')
        .eq('source', 'databento')
        .eq('symbol', FUTURES_COVERAGE_PROBE_SYMBOL)
        .eq('timeframe', '1m')
        .order('ts', { ascending: false })
        .limit(1),
    ]);
    const from = (firstRes.data as { ts: string }[] | null)?.[0]?.ts;
    const to = (lastRes.data as { ts: string }[] | null)?.[0]?.ts;
    if (!from || !to) return null;
    return { from, to };
  } catch {
    return null;
  }
}

const GOLD = '#C9A646';

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

/**
 * Returns today's date at midnight in the America/New_York timezone,
 * expressed as a local-browser Date.  Used to gate the date-range picker
 * so future dates cannot be selected (no backtest data exists for them).
 * Uses Intl.DateTimeFormat to derive the NY calendar date, then constructs
 * a midnight-local Date — zero new dependencies.
 */
function getTodayNY(): Date {
  const nyDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
  // en-CA gives "YYYY-MM-DD"; parse as local midnight to avoid UTC shift.
  const [y, m, d] = nyDateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
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
  const [symbol, setSymbol] = useState<string>('');
  // Populated only when the trader picked a suggestion (cross-class search);
  // null when free-typed, in which case assetType is inferred from the symbol
  // shape below.
  const [pickedAssetClass, setPickedAssetClass] = useState<AssetClass | null>(null);
  const [startBalance, setStartBalance] = useState<string>('');
  const [range, setRange] = useState<DateRange | undefined>();
  const [dateOpen, setDateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline "create new strategy" (mirrors reference "Create new playbook")
  const [creatingStrategy, setCreatingStrategy] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState('');

  // Futures data-coverage hint (lazy-fetched once, the first time the Futures
  // tab is selected in this modal session).
  const [futuresCoverage, setFuturesCoverage] = useState<FuturesCoverage | null>(null);
  const [futuresCoverageFetched, setFuturesCoverageFetched] = useState(false);

  // Asset type is DERIVED, not user-picked: a chosen suggestion carries its
  // own class; a free-typed symbol is classified by shape (crypto pair →
  // forex pair → cached futures root → else stocks).
  const assetType: BacktestAssetType = useMemo(() => {
    if (pickedAssetClass) return pickedAssetClass;
    if (!symbol) return 'stocks';
    if (isCryptoSymbol(symbol)) return 'crypto';
    if (isForexPair(symbol)) return 'forex';
    if (isDatabentoCachedSymbol(symbol)) return 'futures';
    return 'stocks';
  }, [symbol, pickedAssetClass]);

  useEffect(() => {
    if (assetType !== 'futures' || futuresCoverageFetched) return;
    setFuturesCoverageFetched(true);
    fetchFuturesCoverage().then(setFuturesCoverage);
  }, [assetType, futuresCoverageFetched]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setStrategyId('');
    setSymbol('');
    setPickedAssetClass(null);
    setStartBalance('');
    setRange(undefined);
    setDateOpen(false);
    setError(null);
    setCreatingStrategy(false);
    setNewStrategyName('');
    setFuturesCoverage(null);
    setFuturesCoverageFetched(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
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
    if (assetType === 'futures' && !isDatabentoCachedSymbol(symbol)) {
      setError("Historical data for this futures symbol isn't available yet. Choose one of the listed symbols.");
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
    // Guard: backtest dates must not be in the future.
    const todayNY = getTodayNY();
    if (range.from > todayNY || range.to > todayNY) {
      setError('Backtest dates cannot be in the future');
      return;
    }
    // Guard: for futures, the selected range must overlap the cache's actual
    // coverage window (only enforced when the coverage fetch succeeded).
    if (assetType === 'futures' && futuresCoverage) {
      const coverageFrom = parseIsoDateOnly(futuresCoverage.from);
      const coverageTo = parseIsoDateOnly(futuresCoverage.to);
      if (range.to < coverageFrom || range.from > coverageTo) {
        setError('Selected dates are outside the available futures data range.');
        return;
      }
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
    // Execution settings UI removed — backtests run with clean defaults (no fees).
    onCreated(session, DEFAULT_COMMISSION_CONFIG);
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

          {/* Symbol — cross-class search; asset type is inferred from the
              chosen (or typed) symbol instead of picked manually. */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400">Symbol</Label>
            <SymbolAutocomplete
              symbol={symbol}
              filterSymbols={isCachedFuturesEntry}
              placeholder="Search any symbol — e.g. TSLA, BTCUSDT, MNQ…"
              variant="field"
              onSelect={(next, pickedClass) => {
                setSymbol(next);
                setPickedAssetClass(pickedClass ?? null);
              }}
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
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
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
                    onSelect={(next) => {
                      if (!next) { setRange(undefined); return; }
                      // Clamp both ends to today (America/New_York) so
                      // keyboard/programmatic paths can't produce a future date.
                      const cap = getTodayNY();
                      const clamped = {
                        from: next.from && next.from > cap ? cap : next.from,
                        to:   next.to   && next.to   > cap ? cap : next.to,
                      };
                      setRange(clamped);
                      // Close the popover once the target (end) date is picked.
                      if (clamped.from && clamped.to) setDateOpen(false);
                    }}
                    disabled={{ after: getTodayNY() }}
                    toDate={getTodayNY()}
                    numberOfMonths={1}
                    className="text-white"
                    classNames={{
                      day_disabled: 'text-muted-foreground opacity-30 cursor-not-allowed',
                    }}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-[10px] text-gray-600">Start time is 12 am US/Eastern</p>
              {assetType === 'futures' && futuresCoverage && (
                <p className="text-[10px] text-gray-600">
                  Futures data available: {formatRangeLabel({
                    from: parseIsoDateOnly(futuresCoverage.from),
                    to: parseIsoDateOnly(futuresCoverage.to),
                  })}
                </p>
              )}
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
