// src/pages/app/trading-arena/components/MarketDataGuideModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// "GUIDE" — a step-by-step carousel popup for connecting live market data to
// the Trading Arena via the FINOTAUR Agent's NT8 market bridge.
//
// Shares its carousel shell + illustration components with
// features/automation/components/AgentGuideModal.tsx (the Trade Copier setup
// guide) — the first three steps (download / import / pair) are identical
// setup, only framed around market data instead of copy routes. No copy-route
// step here.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Download, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ImportMenuIllustration,
  ToolsMenuIllustration,
  AgentWindowIllustration,
} from '@/features/automation/components/AgentGuideModal';

// ── A black + gold illustration of the FINOTAUR Agent window's Market bridge
//    toggle, plus the Arena's Connect action — mirrors AgentWindowIllustration's
//    styling for visual consistency across both guide modals. ─────────────────
function MarketBridgeIllustration() {
  return (
    <div className="mt-3 rounded-lg overflow-hidden border" style={{ borderColor: '#2e2a1a', background: '#0a0a0b' }}>
      {/* title bar */}
      <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: '#161617', borderBottom: '1px solid #2e2a1a' }}>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#C9A646' }} />
        <span className="text-[11px]" style={{ color: '#9a9a9e' }}>Finotaur Agent</span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-9 w-9 rounded-full" style={{ background: '#C9A646' }} />
          <div>
            <p className="text-sm font-bold tracking-wide" style={{ color: '#C9A646' }}>FINOTAUR AGENT</p>
            <p className="text-[11px]" style={{ color: '#9a9a9e' }}>Paired · Market bridge</p>
          </div>
        </div>
        {/* market bridge toggle card */}
        <div className="rounded-md p-3" style={{ background: '#161617', border: '1px solid #2e2a1a' }}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold tracking-wider" style={{ color: '#C9A646' }}>MARKET BRIDGE</p>
            <span
              className="inline-flex items-center h-5 w-9 rounded-full p-0.5"
              style={{ background: '#C9A646' }}
              aria-hidden="true"
            >
              <span className="h-4 w-4 rounded-full ml-auto" style={{ background: '#0a0a0b' }} />
            </span>
          </div>
          <p className="text-[11px] mt-2" style={{ color: '#9a9a9e' }}>
            Streaming NT8 depth &amp; time-and-sales to this device.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Steps ────────────────────────────────────────────────────────────────────
interface GuideStep {
  title: string;
  body: React.ReactNode;
}

function buildSteps(): GuideStep[] {
  return [
    {
      title: 'Download the agent',
      body: (
        <>
          <p>
            The FINOTAUR Agent is a small NinjaTrader&nbsp;8 add-on that runs on your machine and
            streams your own real-time futures feed to the Trading Arena — your market-data
            subscription never leaves your machine.
          </p>
          <a
            href="/downloads/finotaur-agent.zip"
            download
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#C9A646] text-zinc-900 hover:bg-[#d4b05a] transition-colors"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download FINOTAUR Agent
          </a>
          <p className="mt-3 text-zinc-500 text-xs">Requires Windows and NinjaTrader&nbsp;8.</p>
        </>
      ),
    },
    {
      title: 'Import it into NinjaTrader 8',
      body: (
        <>
          <p>
            In NinjaTrader&apos;s Control Center, open{' '}
            <span className="text-zinc-200 font-medium">Tools → Import → NinjaScript Add-On…</span>{' '}
            and select the file you just downloaded.
          </p>
          <p className="mt-2">
            NinjaTrader installs and compiles the agent automatically — no code editor, no setup.
            When it finishes, <span className="text-zinc-200 font-medium">restart NinjaTrader</span>.
          </p>
          <ImportMenuIllustration />
        </>
      ),
    },
    {
      title: 'Pair your device',
      body: (
        <>
          <p>
            Click <span className="text-zinc-200 font-medium">Pair device</span> on this page, then
            in NinjaTrader open <span className="text-zinc-200 font-medium">Tools → Finotaur Agent…</span>{' '}
            and enter the code.
          </p>
          <p className="mt-2 text-zinc-500 text-xs">
            “Finotaur Agent…” is at the bottom of the Control Center{' '}
            <span className="text-zinc-300 font-medium">Tools</span> menu:
          </p>
          <ToolsMenuIllustration />
          <AgentWindowIllustration />
        </>
      ),
    },
    {
      title: 'Enable the Market bridge & Connect',
      body: (
        <>
          <p>
            Back in <span className="text-zinc-200 font-medium">Tools → Finotaur Agent…</span>,
            toggle the <span className="text-zinc-200 font-medium">Market bridge</span> ON.
          </p>
          <MarketBridgeIllustration />
          <p className="mt-3">
            Then open the Arena&apos;s{' '}
            <span className="text-zinc-200 font-medium">DOM</span>,{' '}
            <span className="text-zinc-200 font-medium">Order Flow</span>, or{' '}
            <span className="text-zinc-200 font-medium">Liquidity</span> tab and click{' '}
            <span className="text-zinc-200 font-medium">Connect</span> — your live futures data
            streams directly from this machine&apos;s browser.
          </p>
        </>
      ),
    },
  ];
}

// ── Modal ────────────────────────────────────────────────────────────────────
export function MarketDataGuideModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const steps = buildSteps();
  const total = steps.length;
  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === total - 1;

  // Reset to first slide each time the modal opens.
  function handleOpenChange(next: boolean) {
    if (next) setStep(0);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-xl border-[#2e2a1a] bg-[#0a0a0b] p-0 gap-0 text-zinc-200"
      >
        {/* header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#2e2a1a]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#C9A646]" />
          <DialogTitle className="text-[#C9A646] tracking-widest text-sm font-bold">GUIDE</DialogTitle>
          <span className="ml-auto mr-6 text-[11px] text-zinc-500">
            Step {step + 1} of {total}
          </span>
        </div>

        {/* slide */}
        <div className="px-6 py-5 min-h-[320px]">
          <div className="flex items-center gap-3 mb-3">
            <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A646]/10 border border-[#C9A646]/30">
              <span className="text-sm font-bold text-[#C9A646]">{step + 1}</span>
            </div>
            <h3 className="text-base font-semibold text-zinc-100">{current.title}</h3>
          </div>
          <div className="text-sm text-zinc-400 leading-relaxed">{current.body}</div>
        </div>

        {/* footer: dots + nav */}
        <div className="flex items-center gap-4 px-6 py-4 border-t border-[#2e2a1a]">
          {/* dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to step ${i + 1}`}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-5 bg-[#C9A646]' : 'w-1.5 bg-zinc-700 hover:bg-zinc-600'
                }`}
              />
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={isFirst}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-zinc-300 border border-zinc-700/60 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#C9A646] text-zinc-900 hover:bg-[#d4b05a] transition-colors"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Done
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold bg-[#C9A646] text-zinc-900 hover:bg-[#d4b05a] transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MarketDataGuideModal;
