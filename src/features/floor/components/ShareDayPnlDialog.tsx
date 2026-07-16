// src/features/floor/components/ShareDayPnlDialog.tsx
// Share dialog for TODAY's P&L — same flow as ShareTradeActions
// (branded card hero + Download PNG / Copy image / native Share…).
// The user can share the whole day (DayPnlCard) or pick one of today's
// trades (TradeBusinessCard), and can hide the P&L on either card (•••).

import { useRef, useState } from 'react';
import { Share2, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ds/Button';
import { DayPnlCard, type DayPnlCardData } from '@/features/floor/components/DayPnlCard';
import { TradeBusinessCard } from '@/features/floor/components/TradeBusinessCard';
import type { ShareableTrade } from '@/features/floor/components/ShareTradeDialog';
import { tradeCardFromShareable } from '@/features/floor/lib/tradeCardData';
import { useTradeCardImage } from '@/features/floor/hooks/useTradeCardImage';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface ShareDayPnlDialogProps {
  data: DayPnlCardData;
  /** Today's trades — offered as single-trade card alternatives. */
  trades?: ShareableTrade[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** "09:31" pill label suffix from the trade's close time. */
function tradeTimeLabel(trade: ShareableTrade): string {
  if (!trade.close_at) return '';
  const d = new Date(trade.close_at);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

interface ModePillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function ModePill({ label, active, onClick }: ModePillProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'rounded-full px-[12px] py-[5px]',
        'font-sans text-[11px] font-medium transition-colors duration-base ease-out',
        active
          ? 'bg-gradient-gold text-surface-base'
          : 'text-ink-secondary hover:text-ink-primary',
      )}
    >
      {label}
    </button>
  );
}

export function ShareDayPnlDialog({ data, trades = [], open, onOpenChange }: ShareDayPnlDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { busy, canNativeShare, download, copyToClipboard, nativeShare } = useTradeCardImage();

  // null = whole day; otherwise the id of the selected trade.
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [hidePnl, setHidePnl] = useState(false);

  const selectedTrade = selectedTradeId
    ? trades.find((t) => t.id === selectedTradeId) ?? null
    : null;

  const dayData: DayPnlCardData = hidePnl ? { ...data, netPnl: null } : data;
  const tradeData = selectedTrade
    ? tradeCardFromShareable(selectedTrade, {
        hidePnl,
        showSetupOnly: false,
        revealSize: false,
        caption: undefined,
        strategyCategory: null,
        showChart: false,
      })
    : null;

  const filename = selectedTrade
    ? `finotaur-${selectedTrade.symbol}.png`
    : 'finotaur-today-pnl.png';

  async function handleDownload() {
    await download(cardRef.current, filename);
    toast({ title: 'P&L card downloaded.' });
  }

  async function handleCopy() {
    const ok = await copyToClipboard(cardRef.current);
    toast({ title: ok ? 'Image copied to clipboard.' : 'Copy not supported on this browser.' });
  }

  async function handleNativeShare() {
    await nativeShare(cardRef.current, {
      title: selectedTrade ? `My ${selectedTrade.symbol} trade` : 'My trading day on FINOTAUR',
      filename,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'w-full max-w-md',
          'bg-[#111111] border-[0.5px] border-border-ds-subtle',
          'rounded-[16px] p-ds-5',
        )}
      >
        <DialogHeader>
          <div className="flex items-center gap-ds-2">
            <Share2 size={16} className="text-gold-primary" aria-hidden="true" />
            <DialogTitle className="font-sans text-[16px] font-semibold text-ink-primary">
              Share today&apos;s P&amp;L
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Day / specific-trade selector — shown only when there are trades to pick */}
        {trades.length > 0 && (
          <div
            role="radiogroup"
            aria-label="Card content"
            className="flex flex-wrap items-center justify-center gap-[4px] rounded-[12px] border-[0.5px] border-border-ds-subtle bg-surface-2 p-[3px]"
          >
            <ModePill
              label="Whole day"
              active={selectedTradeId === null}
              onClick={() => setSelectedTradeId(null)}
            />
            {trades.map((trade) => (
              <ModePill
                key={trade.id}
                label={[trade.symbol, tradeTimeLabel(trade)].filter(Boolean).join(' · ')}
                active={selectedTradeId === trade.id}
                onClick={() => setSelectedTradeId(trade.id)}
              />
            ))}
          </div>
        )}

        {/* Hero — branded card, fixed width for a consistent export */}
        <div className="mx-auto w-[380px] max-w-full">
          {tradeData ? (
            <TradeBusinessCard ref={cardRef} data={tradeData} />
          ) : (
            <DayPnlCard ref={cardRef} data={dayData} />
          )}
        </div>

        {/* Hide P&L toggle */}
        <label className="flex items-center justify-center gap-ds-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hidePnl}
            onChange={(e) => setHidePnl(e.target.checked)}
            className="sr-only"
          />
          <span
            className={cn(
              'inline-flex items-center gap-[6px] rounded-full px-[12px] py-[5px]',
              'font-sans text-[11px] font-medium border-[0.5px] transition-colors duration-base ease-out',
              hidePnl
                ? 'bg-gradient-gold border-transparent text-surface-base'
                : 'bg-surface-2 border-border-ds-subtle text-ink-secondary hover:border-border-ds-default hover:text-ink-primary',
            )}
          >
            <EyeOff className="h-[12px] w-[12px]" aria-hidden="true" />
            Hide P&amp;L
          </span>
        </label>

        {!selectedTrade && data.closedTrades === 0 && (
          <p className="text-center font-sans text-[12px] text-ink-tertiary">
            No closed trades yet today — the card updates as you trade.
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-ds-2 pt-ds-2">
          <Button
            variant="gold"
            size="compact"
            showArrow={false}
            disabled={busy}
            onClick={handleDownload}
          >
            Download PNG
          </Button>
          <Button
            variant="goldOutline"
            size="compact"
            showArrow={false}
            disabled={busy}
            onClick={handleCopy}
          >
            Copy image
          </Button>
          {canNativeShare && (
            <Button
              variant="outline"
              size="compact"
              showArrow={false}
              disabled={busy}
              onClick={handleNativeShare}
            >
              Share…
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
