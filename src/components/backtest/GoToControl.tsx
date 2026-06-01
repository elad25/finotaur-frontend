// ==========================================
// GO-TO CONTROL (Phase 2 — navigation)
// ==========================================
// Mirrors TradeZella "Go-To" — jump the replay to a specific candle index
// (and, when a date→index map is available, a specific date). Pure UI; the
// parent wires the jump into the replay engine via onGoToIndex.

import { useState } from 'react';
import { Crosshair } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface GoToControlProps {
  totalCandles: number;
  currentIndex: number;
  onGoToIndex: (index: number) => void;
  className?: string;
}

export function GoToControl({
  totalCandles,
  currentIndex,
  onGoToIndex,
  className,
}: GoToControlProps) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);

  const submit = () => {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    // Clamp to [0, totalCandles-1]. Accept 1-based input from users.
    const idx = Math.max(0, Math.min(totalCandles - 1, Math.round(n) - 1));
    onGoToIndex(idx);
    setOpen(false);
    setValue('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1.5 rounded-lg bg-white/5 border border-[#C9A646]/20 px-3 py-1.5 text-xs text-[#C9A646] hover:bg-[#C9A646]/10 transition-colors',
            className
          )}
          title="Go to candle"
        >
          <Crosshair className="h-3.5 w-3.5" />
          Go to
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 bg-[#0A0A0A] border-[#C9A646]/20 text-white p-3" align="center">
        <p className="text-xs text-gray-400 mb-2">
          Jump to candle <span className="text-gray-600">(1–{totalCandles || 0})</span>
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={totalCandles}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={String(currentIndex + 1)}
            className="flex-1 h-8 rounded-md bg-white/5 border border-white/10 px-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#C9A646]/40 font-mono"
          />
          <button
            type="button"
            onClick={submit}
            className="h-8 rounded-md bg-[#C9A646] hover:bg-[#D4B55E] text-black text-xs font-semibold px-3"
          >
            Go
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default GoToControl;
