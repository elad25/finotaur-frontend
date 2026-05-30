/**
 * Backtest Chart page — interactive paper-trading view.
 *
 * Phase 1 (2026-05-27): Replaced the prior marketing landing page with the
 * real interactive BacktestChart wrapping FinotaurChart. Futures (CME via
 * Yahoo `=F` continuous), equities (Yahoo), and crypto (Binance direct) all
 * work without TradingView's paid plan gate.
 *
 * The legacy "Immersive Mode" (full-screen ReplayChart playback experience,
 * crypto-only) is preserved behind a top-right button — accessible but no
 * longer the only entry point.
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, Sparkles } from 'lucide-react';
import { BacktestChart } from '@/components/backtest/BacktestChart';
import { BacktestImmersiveMode } from '@/components/BacktestImmersiveMode';
import { useMentorView } from '@/contexts/MentorViewContext';

export default function Chart() {
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const { isMentorView } = useMentorView();

  // Cleanup leftover TradingView widgets when leaving the page (legacy from
  // the old marketing-page implementation — still needed because the immersive
  // mode loads ReplayChart which may inject TradingView containers).
  useEffect(() => {
    return () => {
      const tvWidgets = document.querySelectorAll('.tradingview-widget-container');
      tvWidgets.forEach((widget) => {
        const iframe = widget.querySelector('iframe');
        if (iframe) iframe.src = 'about:blank';
      });
    };
  }, []);

  if (isImmersiveMode) {
    return <BacktestImmersiveMode onExit={() => setIsImmersiveMode(false)} />;
  }

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Immersive-mode entry — kept as legacy access to the playback experience.
          Hidden in Mentor View (read-only — no paper-trading interaction). */}
      {!isMentorView && (
        <div className="absolute right-3 top-3 z-20">
          <Button
            onClick={() => setIsImmersiveMode(true)}
            size="sm"
            className="bg-gradient-to-r from-[#C9A646] to-[#A68B3A] text-black shadow-lg shadow-[#C9A646]/30 hover:from-[#D4B55E] hover:to-[#C9A646]"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Immersive Mode
            <Maximize2 className="ml-2 h-4 w-4 opacity-70" />
          </Button>
        </div>
      )}

      {/* The real chart */}
      <BacktestChart />
    </div>
  );
}
