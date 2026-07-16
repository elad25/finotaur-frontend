// src/features/floor/components/ShareTradeActions.tsx
// Quick share actions menu — the new entry point that replaces the direct
// ShareTradeDialog trigger. Shows the standalone branded business card and
// offers image export (download / copy / native share) plus a path into the
// existing "Share to Floor" flow (ShareTradeDialog).

import { useRef, useState } from 'react';
import { Share2, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ds/Button';
import { TradeBusinessCard } from '@/features/floor/components/TradeBusinessCard';
import { ShareTradeDialog, type ShareableTrade } from '@/features/floor/components/ShareTradeDialog';
import { tradeCardFromShareable } from '@/features/floor/lib/tradeCardData';
import { useTradeCardImage } from '@/features/floor/hooks/useTradeCardImage';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { SharePrivacy } from '@/features/floor/types/community';

export interface ShareTradeActionsProps {
  trade: ShareableTrade;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Default privacy for the standalone card preview — no destination selected
// yet, so nothing is redacted differently than "everything as recorded".
const DEFAULT_PRIVACY: SharePrivacy = {
  hidePnl: false,
  showSetupOnly: false,
  revealSize: false,
  caption: undefined,
  strategyCategory: null,
  showChart: false,
};

export function ShareTradeActions({ trade, open, onOpenChange }: ShareTradeActionsProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [floorOpen, setFloorOpen] = useState(false);
  const [hidePnl, setHidePnl] = useState(false);
  const { busy, canNativeShare, download, copyToClipboard, nativeShare } = useTradeCardImage();

  const cardData = tradeCardFromShareable(trade, { ...DEFAULT_PRIVACY, hidePnl });

  async function handleDownload() {
    await download(cardRef.current, `finotaur-${trade.symbol}.png`);
    toast({ title: 'Trade card downloaded.' });
  }

  async function handleCopy() {
    const ok = await copyToClipboard(cardRef.current);
    toast({ title: ok ? 'Image copied to clipboard.' : 'Copy not supported on this browser.' });
  }

  async function handleNativeShare() {
    await nativeShare(cardRef.current, {
      title: `My ${trade.symbol} trade`,
      filename: `finotaur-${trade.symbol}.png`,
    });
  }

  function handleShareToFloor() {
    setFloorOpen(true);
  }

  return (
    <>
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
                Share trade — {trade.symbol}
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* Hero — standalone branded card, fixed width for a consistent export */}
          <div className="mx-auto w-[380px] max-w-full">
            <TradeBusinessCard ref={cardRef} data={cardData} />
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
            <Button
              variant="outline"
              size="compact"
              showArrow={false}
              onClick={handleShareToFloor}
            >
              Share to Floor
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ShareTradeDialog trade={trade} open={floorOpen} onOpenChange={setFloorOpen} />
    </>
  );
}
