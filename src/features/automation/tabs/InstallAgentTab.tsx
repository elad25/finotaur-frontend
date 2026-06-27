// src/features/automation/tabs/InstallAgentTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Step-by-step install guide for the FINOTAUR desktop agent (NinjaTrader 8).
// Card patterns match AgentStatusTab.tsx; gold #C9A646 + zinc palette.
// ─────────────────────────────────────────────────────────────────────────────

import { Download, MonitorDown, Plug } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ds/Card';

// ── step card ────────────────────────────────────────────────────────────────

interface StepCardProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

function StepCard({ number, title, children }: StepCardProps) {
  return (
    <Card padding="default" className="flex gap-4">
      {/* step number badge */}
      <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#C9A646]/10 border border-[#C9A646]/30 mt-0.5">
        <span className="text-xs font-bold text-[#C9A646]">{number}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-100 mb-2">{title}</p>
        {children}
      </div>
    </Card>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function InstallAgentTab() {
  return (
    <div className="space-y-6">
      {/* header */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Install the FINOTAUR Agent</h2>
        <p className="mt-1 text-sm text-zinc-500">
          A small NinjaTrader 8 add-on that runs on your machine and executes trade copies
          locally. FINOTAUR never places orders in the cloud.
        </p>
      </div>

      {/* requirements */}
      <Card padding="compact" className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider shrink-0">
          Requirements
        </span>
        {[
          'NinjaTrader 8',
          'Windows 10/11',
          '.NET Framework 4.8 (bundled with NT8)',
          'FINOTAUR Premium',
        ].map((req) => (
          <span key={req} className="flex items-center gap-1.5 text-sm text-zinc-400">
            <span className="h-1 w-1 rounded-full bg-zinc-600" aria-hidden="true" />
            {req}
          </span>
        ))}
      </Card>

      {/* steps */}
      <div className="space-y-3">
        {/* step 1 — download */}
        <StepCard number={1} title="Download">
          <p className="text-sm text-zinc-400 mb-3">
            Download the agent ZIP and save it somewhere you can find it.
          </p>
          <a
            href="/downloads/finotaur-agent.zip"
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#C9A646] text-zinc-900 hover:bg-[#d4b05a] transition-colors"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download the FINOTAUR Agent
          </a>
        </StepCard>

        {/* step 2 — install in NinjaTrader */}
        <StepCard number={2} title="Install in NinjaTrader">
          <ol className="space-y-2 text-sm text-zinc-400 list-decimal list-inside">
            <li>
              Extract the ZIP and copy the{' '}
              <code className="font-mono text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded text-xs">
                FinotaurAgent
              </code>{' '}
              folder into{' '}
              <code className="font-mono text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded text-xs">
                Documents\NinjaTrader 8\bin\Custom\AddOns\
              </code>
              .
            </li>
            <li>
              In NinjaTrader 8 open{' '}
              <span className="text-zinc-200 font-medium">Tools → Edit NinjaScript → Editor</span>
              , open{' '}
              <code className="font-mono text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded text-xs">
                FinotaurAgent.cs
              </code>
              , and press{' '}
              <kbd className="font-mono text-zinc-200 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-xs">
                F5
              </kbd>{' '}
              to compile.
            </li>
            <li>Restart NinjaTrader.</li>
          </ol>
        </StepCard>

        {/* step 3 — pair */}
        <StepCard number={3} title="Pair your device">
          <p className="text-sm text-zinc-400 mb-3">
            Open the Agent tab and click{' '}
            <span className="text-zinc-200 font-medium">Pair a new device</span>. In
            NinjaTrader open{' '}
            <span className="text-zinc-200 font-medium">Tools → Finotaur Agent…</span> and
            enter the code.
          </p>
          <Link
            to="../agent"
            relative="path"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-[#C9A646]/40 text-[#C9A646] hover:bg-[#C9A646]/10 transition-colors"
          >
            <Plug className="h-3.5 w-3.5" aria-hidden="true" />
            Go to Agent tab
          </Link>
        </StepCard>
      </div>

      {/* compliance note */}
      <Card padding="compact" className="flex gap-3 items-start border-zinc-700/50">
        <MonitorDown className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-zinc-500 leading-relaxed">
          Execution is 100% local. The agent only mirrors your own trades between your own
          accounts — nothing runs in the cloud.
        </p>
      </Card>
    </div>
  );
}
