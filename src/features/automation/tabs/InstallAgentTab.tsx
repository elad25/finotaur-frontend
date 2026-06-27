// src/features/automation/tabs/InstallAgentTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// "FINOTAUR Agent" tab — short, 4-step setup guide for the NinjaTrader 8 add-on,
// with an embedded illustration of the correct folder placement.
// Card patterns match AgentStatusTab.tsx; gold #C9A646 + zinc palette.
// ─────────────────────────────────────────────────────────────────────────────

import { Download, ShieldCheck, Folder, ChevronRight, Search } from 'lucide-react';
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

// A light "File Explorer" illustration showing where the FinotaurAgent folder
// must live. Rendered as a faithful screenshot-style card (always light).
function FolderIllustration() {
  const crumbs = ['This PC', 'Documents', 'NinjaTrader 8', 'bin', 'Custom', 'AddOns'];
  return (
    <div className="mt-3 rounded-lg overflow-hidden border" style={{ borderColor: '#d9d9d6', background: '#ffffff' }}>
      {/* address bar */}
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#f7f7f5', borderBottom: '1px solid #e6e6e2' }}>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[12px]" style={{ color: '#3a3a38' }}>
          {crumbs.map((c, i) => (
            <span key={c} className="flex items-center gap-1">
              <span style={{ color: i === crumbs.length - 1 ? '#1f1f1f' : '#3a3a38', fontWeight: i === crumbs.length - 1 ? 600 : 400 }}>{c}</span>
              {i < crumbs.length - 1 && <ChevronRight className="h-3 w-3" style={{ color: '#a8a8a3' }} />}
            </span>
          ))}
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-1.5 rounded px-2 py-1 text-[12px]" style={{ background: '#fff', border: '1px solid #dcdcd8', color: '#9a9a96' }}>
          <Search className="h-3.5 w-3.5" />
          <span>Search AddOns</span>
        </div>
      </div>
      {/* column header */}
      <div className="grid px-4 py-1.5 text-[11px]" style={{ gridTemplateColumns: '1fr 120px', color: '#7a7a76', borderBottom: '1px solid #ececE8', background: '#fdfdfc' }}>
        <span>Name</span>
        <span>Type</span>
      </div>
      {/* selected folder row */}
      <div className="grid items-center m-1 px-3 py-2.5 rounded text-[13px]" style={{ gridTemplateColumns: '1fr 120px', background: '#e8f1fb', border: '1px solid #bcdcf7' }}>
        <span className="flex items-center gap-2.5" style={{ color: '#1f1f1f' }}>
          <Folder className="h-5 w-5" style={{ color: '#e3b341', fill: '#f3d384' }} />
          FinotaurAgent
        </span>
        <span style={{ color: '#4a4a47' }}>File folder</span>
      </div>
    </div>
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

        <Step number={2} title="Place it in NinjaTrader's AddOns folder">
          Unzip the file and copy the <Code>FinotaurAgent</Code> folder into{' '}
          <Code>Documents\NinjaTrader 8\bin\Custom\AddOns\</Code> (create the{' '}
          <Code>AddOns</Code> folder if it isn't there). It should look exactly like this:
          <FolderIllustration />
        </Step>

        <Step number={3} title="Compile it in NinjaTrader 8">
          In NinjaTrader's Control Center open{' '}
          <span className="text-zinc-200 font-medium">New → NinjaScript Editor</span> (not
          Tools). Open <Code>FinotaurAgent.cs</Code>, press <Code>F5</Code> to compile, wait
          for <span className="text-zinc-200 font-medium">Compile succeeded</span>, then
          restart NinjaTrader.
        </Step>

        <Step number={4} title="Pair, then create a route">
          Open the{' '}
          <Link to="../agent" relative="path" className="text-[#C9A646] hover:underline font-medium">
            Agent
          </Link>{' '}
          tab, click <span className="text-zinc-200 font-medium">Pair a new device</span>, and
          enter the code in NinjaTrader (<span className="text-zinc-200 font-medium">Tools → Finotaur Agent…</span>).
          Then go to the{' '}
          <Link to="../trade-copier" relative="path" className="text-[#C9A646] hover:underline font-medium">
            Trade Copier
          </Link>{' '}
          tab, pick your leader and follower accounts, and save.
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
