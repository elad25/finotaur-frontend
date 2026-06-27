// src/features/automation/tabs/InstallAgentTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// "FINOTAUR Agent" tab — short, 4-step setup guide for the NinjaTrader 8 add-on.
// Card patterns match AgentStatusTab.tsx; gold #C9A646 + zinc palette.
// ─────────────────────────────────────────────────────────────────────────────

import { Download, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ds/Card';

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded text-xs break-words">
      {children}
    </code>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <Card padding="default" className="flex gap-4">
      <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#C9A646]/10 border border-[#C9A646]/30 mt-0.5">
        <span className="text-xs font-bold text-[#C9A646]">{number}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-100 mb-1">{title}</p>
        <div className="text-sm text-zinc-400 leading-relaxed">{children}</div>
      </div>
    </Card>
  );
}

export default function InstallAgentTab() {
  return (
    <div className="space-y-6">
      {/* header */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">FINOTAUR Agent</h2>
        <p className="mt-1 text-sm text-zinc-500 max-w-xl">
          A small NinjaTrader&nbsp;8 add-on that runs on your machine and copies your trades
          locally. Four steps to get it running.
        </p>
      </div>

      {/* steps */}
      <div className="space-y-3">
        <Step number={1} title="Download the agent">
          <a
            href="/downloads/finotaur-agent.zip"
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#C9A646] text-zinc-900 hover:bg-[#d4b05a] transition-colors"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download FINOTAUR Agent
          </a>
        </Step>

        <Step number={2} title="Install it in NinjaTrader 8">
          Unzip and copy the <Code>FinotaurAgent</Code> folder into{' '}
          <Code>Documents\NinjaTrader 8\bin\Custom\AddOns\</Code>. In NinjaTrader open{' '}
          <span className="text-zinc-200 font-medium">Tools → Edit NinjaScript → Editor</span>,
          open <Code>FinotaurAgent.cs</Code>, press <Code>F5</Code> to compile, then restart
          NinjaTrader.
        </Step>

        <Step number={3} title="Pair this device">
          Open the{' '}
          <Link to="../agent" relative="path" className="text-[#C9A646] hover:underline font-medium">
            Agent
          </Link>{' '}
          tab and click <span className="text-zinc-200 font-medium">Pair a new device</span>. In
          NinjaTrader open <span className="text-zinc-200 font-medium">Tools → Finotaur Agent…</span>{' '}
          and enter the code.
        </Step>

        <Step number={4} title="Create a copy route">
          Go to the{' '}
          <Link to="../trade-copier" relative="path" className="text-[#C9A646] hover:underline font-medium">
            Trade Copier
          </Link>{' '}
          tab, pick your leader account and the accounts that follow it, and save. You're done.
        </Step>
      </div>

      {/* compliance note */}
      <Card padding="compact" className="flex gap-3 items-start border-zinc-700/50">
        <ShieldCheck className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-zinc-500 leading-relaxed">
          Runs 100% locally — the agent only mirrors your own trades between your own accounts.
          Requires NinjaTrader&nbsp;8, Windows, and a FINOTAUR Premium plan.
        </p>
      </Card>
    </div>
  );
}
