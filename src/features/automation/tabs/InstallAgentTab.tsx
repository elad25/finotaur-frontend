// src/features/automation/tabs/InstallAgentTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// "FINOTAUR Agent" tab — launcher for the step-by-step setup GUIDE popup, plus a
// direct download. The full guide (one slide per step) lives in AgentGuideModal.
//
// Distribution = NinjaScript Add-On import: the user imports the downloaded file
// and NinjaTrader installs + compiles it automatically (no manual compile / no
// manual folder copy / no manual reference).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Download, ShieldCheck, BookOpen, Plus } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { AgentGuideModal } from '@/features/automation/components/AgentGuideModal';
import { DeviceList } from '@/features/automation/components/DeviceList';
import { PairDeviceDialog } from '@/features/automation/components/PairDeviceDialog';

// Short, ordered teaser of what the GUIDE walks through.
const STEP_TEASERS = [
  'Download the agent',
  'Import it into NinjaTrader 8',
  'Pair your device',
  'Create a copy route',
];

export default function InstallAgentTab() {
  const [guideOpen, setGuideOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* header */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">FINOTAUR Agent</h2>
        <p className="mt-1 text-sm text-zinc-500 max-w-xl">
          A small NinjaTrader&nbsp;8 add-on that runs on your machine and copies your trades
          locally. Set it up in four quick steps — no code, no manual compile.
        </p>
      </div>

      {/* primary actions */}
      <Card padding="default" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-[#C9A646] text-zinc-900 hover:bg-[#d4b05a] transition-colors"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            GUIDE
          </button>

          <a
            href="/downloads/finotaur-agent.zip"
            download
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-zinc-200 border border-zinc-700/60 hover:bg-zinc-800 transition-colors"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download agent
          </a>
        </div>

        {/* teaser of the steps inside the GUIDE */}
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
          {STEP_TEASERS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#C9A646]/10 border border-[#C9A646]/30 text-[10px] font-bold text-[#C9A646]">
                {i + 1}
              </span>
              <span>{label}</span>
              {i < STEP_TEASERS.length - 1 && <span className="text-zinc-700">·</span>}
            </li>
          ))}
        </ol>
      </Card>

      {/* Your desktop agent — device list + pairing */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            Your desktop agent
          </h3>
          <Button
            variant="goldOutline"
            size="compact"
            showArrow={false}
            onClick={() => setPairOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Pair a new device
          </Button>
        </div>

        <DeviceList />

        <p className="text-xs text-zinc-600">
          The desktop agent runs locally on your machine and is the only component that
          executes trades or enforces risk halts.{' '}
          <strong className="text-zinc-500">Nothing on this page executes orders.</strong>
        </p>
      </section>

      {/* compliance note */}
      <Card padding="compact" className="flex gap-3 items-start border-zinc-700/50">
        <ShieldCheck className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-zinc-500 leading-relaxed">
          Runs 100% locally — the agent only mirrors your own trades between your own accounts.
          Requires NinjaTrader&nbsp;8, Windows, and a FINOTAUR Premium plan.
        </p>
      </Card>

      <AgentGuideModal open={guideOpen} onOpenChange={setGuideOpen} />
      <PairDeviceDialog open={pairOpen} onOpenChange={setPairOpen} />
    </div>
  );
}
