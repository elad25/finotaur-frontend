// src/features/automation/components/AgentGuideModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// "GUIDE" — a step-by-step carousel popup for setting up the FINOTAUR Agent
// (NinjaTrader 8 add-on). One slide per step, black + gold brand styling.
//
// Distribution model = NinjaScript Add-On import (no manual compile, no manual
// folder copy, no manual reference): the user just imports the downloaded file
// and NinjaTrader installs + compiles it automatically.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

// ── Inline code chip ─────────────────────────────────────────────────────────
function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded text-xs break-words">
      {children}
    </code>
  );
}

// ── A light Windows-menu illustration faithful to NinjaTrader 8's Control Center
//    "Tools" menu, with the "Import → NinjaScript Add-On…" path highlighted. ─────
function ImportMenuIllustration() {
  // Real items above "Import" in NT8's Tools menu.
  const items = ['Historical Data', 'Commissions', 'Risk', 'Trading Hours'];
  return (
    <div className="mt-3 flex flex-wrap items-start gap-2">
      {/* Tools menu */}
      <div className="inline-block rounded-md overflow-hidden border align-top" style={{ borderColor: '#d9d9d6', background: '#ffffff', minWidth: 210 }}>
        <div className="px-3 py-1.5 text-[11px] font-semibold" style={{ color: '#7a7a76', background: '#f3f3f1', borderBottom: '1px solid #e6e6e2' }}>Tools</div>
        {items.map((it) => (
          <div key={it} className="px-3 py-1.5 text-[13px]" style={{ color: '#2a2a28' }}>{it}</div>
        ))}
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-[13px] font-semibold" style={{ background: '#C9A646', color: '#0a0a0b' }}>
          Import
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-[13px]" style={{ color: '#2a2a28' }}>
          Export
          <ChevronRight className="h-3.5 w-3.5" style={{ color: '#a8a8a3' }} />
        </div>
      </div>
      {/* Import submenu */}
      <div className="inline-block rounded-md overflow-hidden border align-top mt-[88px]" style={{ borderColor: '#d9d9d6', background: '#ffffff', minWidth: 200 }}>
        <div className="flex items-center gap-2 px-3 py-2 text-[13px] font-semibold" style={{ background: '#C9A646', color: '#0a0a0b' }}>
          NinjaScript Add-On…
        </div>
        <div className="px-3 py-1.5 text-[13px]" style={{ color: '#2a2a28' }}>NinjaScript…</div>
      </div>
    </div>
  );
}

// ── A light Windows-menu illustration faithful to the bottom of NT8's "Tools"
//    menu, where "Finotaur Agent…" is added once the add-on is installed. ───────
function ToolsMenuIllustration() {
  const items = ['Global Simulation Mode', 'Client Dashboard', 'Settings'];
  return (
    <div className="mt-3 inline-block rounded-md overflow-hidden border align-top" style={{ borderColor: '#d9d9d6', background: '#ffffff', minWidth: 240 }}>
      <div className="px-3 py-1.5 text-[11px] font-semibold" style={{ color: '#7a7a76', background: '#f3f3f1', borderBottom: '1px solid #e6e6e2' }}>Tools</div>
      {items.map((it) => (
        <div key={it} className="px-3 py-1.5 text-[13px]" style={{ color: '#2a2a28' }}>{it}</div>
      ))}
      <div className="my-1" style={{ borderTop: '1px solid #e6e6e2' }} />
      <div className="flex items-center gap-2 px-3 py-2 text-[13px] font-semibold" style={{ background: '#C9A646', color: '#0a0a0b' }}>
        Finotaur Agent…
      </div>
    </div>
  );
}

// ── A black + gold illustration of the FINOTAUR Agent desktop window the user
//    opens in NinjaTrader (Tools → Finotaur Agent…) to pair the device. ─────────
function AgentWindowIllustration() {
  return (
    <div className="mt-3 rounded-lg overflow-hidden border" style={{ borderColor: '#2e2a1a', background: '#0a0a0b' }}>
      {/* title bar */}
      <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: '#161617', borderBottom: '1px solid #2e2a1a' }}>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#C9A646' }} />
        <span className="text-[11px]" style={{ color: '#9a9a9e' }}>Finotaur Agent</span>
      </div>
      <div className="p-4">
        {/* header */}
        <div className="flex items-center gap-3 mb-4">
          <span className="h-9 w-9 rounded-full" style={{ background: '#C9A646' }} />
          <div>
            <p className="text-sm font-bold tracking-wide" style={{ color: '#C9A646' }}>FINOTAUR AGENT</p>
            <p className="text-[11px]" style={{ color: '#9a9a9e' }}>v1.0.0</p>
          </div>
        </div>
        {/* device pairing card */}
        <div className="rounded-md p-3" style={{ background: '#161617', border: '1px solid #2e2a1a' }}>
          <p className="text-[10px] font-semibold tracking-wider mb-2" style={{ color: '#C9A646' }}>DEVICE PAIRING</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-8 rounded" style={{ background: '#0e0e10', border: '1px solid #2e2a1a' }} />
            <div className="h-8 px-4 flex items-center rounded text-xs font-bold" style={{ background: '#C9A646', color: '#0a0a0b' }}>Pair</div>
          </div>
          <p className="text-[11px] mt-2" style={{ color: '#9a9a9e' }}>Not paired. Enter a code from the web app.</p>
        </div>
      </div>
    </div>
  );
}

// ── A light "leader → follower" route illustration. ──────────────────────────
function RouteIllustration() {
  return (
    <div className="mt-3 flex items-center gap-3">
      <div className="flex-1 rounded-lg border border-[#C9A646]/30 bg-[#C9A646]/[0.06] px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-wider text-[#C9A646] font-semibold">Leader</p>
        <p className="text-sm text-zinc-200 font-mono mt-0.5">Your account</p>
      </div>
      <ChevronRight className="h-5 w-5 text-[#C9A646] shrink-0" aria-hidden="true" />
      <div className="flex-1 rounded-lg border border-zinc-700/60 bg-zinc-800/30 px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Follower</p>
        <p className="text-sm text-zinc-200 font-mono mt-0.5">Mirrors it</p>
      </div>
    </div>
  );
}

// ── Steps ────────────────────────────────────────────────────────────────────
interface GuideStep {
  title: string;
  body: React.ReactNode;
}

function buildSteps(onClose: () => void): GuideStep[] {
  return [
    {
      title: 'Download the agent',
      body: (
        <>
          <p>
            The FINOTAUR Agent is a small NinjaTrader&nbsp;8 add-on that runs on your machine and
            mirrors your own trades between your own accounts.
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
            Open the{' '}
            <Link to="../agent" relative="path" onClick={onClose} className="text-[#C9A646] hover:underline font-medium">
              Agent
            </Link>{' '}
            tab and click <span className="text-zinc-200 font-medium">Pair a new device</span>. In
            NinjaTrader, open <span className="text-zinc-200 font-medium">Tools → Finotaur Agent…</span>{' '}
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
      title: 'Create a copy route',
      body: (
        <>
          <p>
            Go to the{' '}
            <Link to="../trade-copier" relative="path" onClick={onClose} className="text-[#C9A646] hover:underline font-medium">
              Trade Copier
            </Link>{' '}
            tab, pick your <span className="text-zinc-200 font-medium">leader</span> and{' '}
            <span className="text-zinc-200 font-medium">follower</span> accounts, set the ratio, and
            save.
          </p>
          <p className="mt-2">That&apos;s it — your trades now mirror automatically.</p>
          <RouteIllustration />
        </>
      ),
    },
  ];
}

// ── Modal ────────────────────────────────────────────────────────────────────
export function AgentGuideModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const steps = buildSteps(() => onOpenChange(false));
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

export default AgentGuideModal;
