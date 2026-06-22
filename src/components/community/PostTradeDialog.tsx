// src/components/community/PostTradeDialog.tsx
// Two-step dialog to share a broker-synced trade to the Global Feed.
//
// Step 1 — Pick a trade: shows only closed trades imported from a broker
//           (import_source IS NULL [legacy] or != 'manual').
// Step 2 — Compose: write a caption + basic privacy options, then post.

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useShareTrade } from '@/hooks/useShareTrade';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, TrendingUp, TrendingDown, Check, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// ── Types ──────────────────────────────────────────────────────────────────────

interface BrokerTrade {
  id: string;
  symbol: string;
  side: string;
  pnl: number | null;
  close_at: string | null;
  setup: string | null;
  entry_price: number | null;
  exit_price: number | null;
  quantity: number | null;
}

interface PostTradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPnl(pnl: number | null) {
  if (pnl == null) return '—';
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}$${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Step 1: Trade picker ───────────────────────────────────────────────────────

function TradePicker({
  onSelect,
}: {
  onSelect: (trade: BrokerTrade) => void;
}) {
  const { user } = useAuth();
  const [trades, setTrades]     = useState<BrokerTrade[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('trades')
      .select('id, symbol, side, pnl, close_at, setup, entry_price, exit_price, quantity, import_source')
      .eq('user_id', user.id)
      .not('close_at', 'is', null)
      .is('deleted_at', null)
      .neq('import_source', 'manual')
      .order('close_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setTrades((data ?? []) as BrokerTrade[]);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!trades.length) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        No broker-synced closed trades found.
        Connect Tradovate to see your trades here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1 max-h-[360px] overflow-y-auto pr-1 -mr-1">
      {trades.map((t) => {
        const profit = t.pnl != null && t.pnl >= 0;
        const isSelected = selected === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelected(t.id)}
            className={cn(
              'flex items-center justify-between gap-3 w-full px-3 py-2.5 rounded-[8px]',
              'border-[0.5px] text-left transition-colors',
              isSelected
                ? 'bg-[rgba(201,166,70,0.08)] border-[rgba(201,166,70,0.35)]'
                : 'bg-zinc-800/40 border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-600',
            )}
          >
            {/* Symbol + date */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                profit ? 'bg-emerald-500/10' : 'bg-red-500/10',
              )}>
                {profit
                  ? <TrendingUp size={13} className="text-emerald-400" />
                  : <TrendingDown size={13} className="text-red-400" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{t.symbol}</p>
                <p className="text-[11px] text-zinc-500">
                  {t.side?.toUpperCase()} · {formatDate(t.close_at)}
                  {t.setup ? ` · ${t.setup}` : ''}
                </p>
              </div>
            </div>

            {/* P&L + check */}
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn(
                'text-[13px] font-medium tabular-nums',
                t.pnl == null ? 'text-zinc-500' : t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400',
              )}>
                {formatPnl(t.pnl)}
              </span>
              {isSelected && <Check size={14} className="text-[#C9A646]" />}
            </div>
          </button>
        );
      })}

      {/* Sticky "Next" footer */}
      <div className="sticky bottom-0 pt-3 pb-0.5 bg-zinc-900">
        <Button
          disabled={!selected}
          className={cn(
            'w-full',
            selected
              ? 'bg-[#C9A646] text-black hover:bg-[#C9A646]/90'
              : 'bg-zinc-700 text-zinc-400 cursor-not-allowed',
          )}
          onClick={() => {
            const trade = trades.find((t) => t.id === selected);
            if (trade) onSelect(trade);
          }}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}

// ── Step 2: Compose caption + privacy ─────────────────────────────────────────

function Composer({
  trade,
  onBack,
  onPosted,
}: {
  trade: BrokerTrade;
  onBack: () => void;
  onPosted: () => void;
}) {
  const { shareTrade, isSharing } = useShareTrade();
  const queryClient = useQueryClient();

  const [caption, setCaption]       = useState('');
  const [hidePnl, setHidePnl]       = useState(false);
  const [setupOnly, setSetupOnly]   = useState(false);
  const [revealSize, setRevealSize] = useState(false);

  const profit = trade.pnl != null && trade.pnl >= 0;

  const handlePost = async () => {
    try {
      await shareTrade(
        trade.id,
        [{ scope: 'global' as const }],
        { hidePnl, showSetupOnly: setupOnly, revealSize, caption: caption.trim() || null },
      );
      queryClient.invalidateQueries({ queryKey: ['global-feed', 'list'] });
      toast.success('Trade shared to the community feed');
      onPosted();
    } catch {
      toast.error('Failed to post. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Trade summary row */}
      <div className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-[8px]',
        'bg-zinc-800/50 border-[0.5px] border-zinc-700',
      )}>
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          profit ? 'bg-emerald-500/10' : 'bg-red-500/10',
        )}>
          {profit
            ? <TrendingUp size={14} className="text-emerald-400" />
            : <TrendingDown size={14} className="text-red-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-white">{trade.symbol}</p>
          <p className="text-[11px] text-zinc-500">
            {trade.side?.toUpperCase()} · {formatDate(trade.close_at)}
          </p>
        </div>
        <span className={cn(
          'text-[14px] font-medium tabular-nums shrink-0',
          hidePnl ? 'text-zinc-500 line-through' : trade.pnl != null && trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400',
        )}>
          {formatPnl(trade.pnl)}
        </span>
      </div>

      {/* Caption */}
      <div>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Write something about this trade…"
          className={cn(
            'w-full resize-none rounded-[8px] px-3 py-2.5',
            'bg-zinc-800 border-[0.5px] border-zinc-700 text-white text-[13px]',
            'placeholder:text-zinc-600 focus:outline-none focus:border-[rgba(201,166,70,0.40)]',
            'transition-colors',
          )}
        />
        <p className="text-right text-[11px] text-zinc-600 mt-1">{caption.length}/500</p>
      </div>

      {/* Privacy toggles */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Visibility</p>
        {[
          { label: 'Hide P&L', value: hidePnl,   set: setHidePnl },
          { label: 'Setup only (hide entry/exit)', value: setupOnly,  set: setSetupOnly },
          { label: 'Show position size',   value: revealSize, set: setRevealSize },
        ].map(({ label, value, set }) => (
          <button
            key={label}
            type="button"
            onClick={() => set(!value)}
            className={cn(
              'flex items-center gap-2.5 w-full px-3 py-2 rounded-[6px]',
              'border-[0.5px] transition-colors',
              value
                ? 'bg-[rgba(201,166,70,0.06)] border-[rgba(201,166,70,0.25)] text-[#C9A646]'
                : 'bg-zinc-800/30 border-zinc-700/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300',
            )}
          >
            <div className={cn(
              'w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0',
              value ? 'bg-[#C9A646] border-[#C9A646]' : 'border-zinc-600',
            )}>
              {value && <Check size={10} className="text-black" />}
            </div>
            <span className="text-[12px] font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <div className="flex-1" />
        <Button
          disabled={isSharing}
          onClick={handlePost}
          className="bg-[#C9A646] text-black hover:bg-[#C9A646]/90 min-w-[80px]"
        >
          {isSharing ? <Loader2 size={13} className="animate-spin" /> : 'Post'}
        </Button>
      </div>
    </div>
  );
}

// ── Dialog shell ───────────────────────────────────────────────────────────────

export function PostTradeDialog({ open, onOpenChange }: PostTradeDialogProps) {
  const [step, setStep]           = useState<'pick' | 'compose'>('pick');
  const [trade, setTrade]         = useState<BrokerTrade | null>(null);

  const handleClose = () => {
    onOpenChange(false);
    // reset after close animation
    setTimeout(() => { setStep('pick'); setTrade(null); }, 300);
  };

  const handleSelect = (t: BrokerTrade) => {
    setTrade(t);
    setStep('compose');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-[15px]">
            {step === 'pick' ? 'Pick a trade to share' : 'Add a description'}
          </DialogTitle>
        </DialogHeader>

        {step === 'pick' && (
          <TradePicker onSelect={handleSelect} />
        )}

        {step === 'compose' && trade && (
          <Composer
            trade={trade}
            onBack={() => setStep('pick')}
            onPosted={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
