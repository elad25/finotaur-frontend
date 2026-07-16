// src/features/floor/components/ShareDayPnlDialog.tsx
// Share dialog for TODAY's aggregate P&L — same flow as ShareTradeActions
// (branded card hero + Download PNG / Copy image / native Share…), but the
// card summarizes the whole trading day instead of a single trade.

import { useRef } from 'react';
import { Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ds/Button';
import { DayPnlCard, type DayPnlCardData } from '@/features/floor/components/DayPnlCard';
import { useTradeCardImage } from '@/features/floor/hooks/useTradeCardImage';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface ShareDayPnlDialogProps {
  data: DayPnlCardData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDayPnlDialog({ data, open, onOpenChange }: ShareDayPnlDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { busy, canNativeShare, download, copyToClipboard, nativeShare } = useTradeCardImage();

  async function handleDownload() {
    await download(cardRef.current, 'finotaur-today-pnl.png');
    toast({ title: 'P&L card downloaded.' });
  }

  async function handleCopy() {
    const ok = await copyToClipboard(cardRef.current);
    toast({ title: ok ? 'Image copied to clipboard.' : 'Copy not supported on this browser.' });
  }

  async function handleNativeShare() {
    await nativeShare(cardRef.current, {
      title: "My trading day on FINOTAUR",
      filename: 'finotaur-today-pnl.png',
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

        {/* Hero — branded day card, fixed width for a consistent export */}
        <div className="mx-auto w-[380px] max-w-full">
          <DayPnlCard ref={cardRef} data={data} />
        </div>

        {data.closedTrades === 0 && (
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
