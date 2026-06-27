// src/features/automation/tabs/InstallAgentTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Detailed install guide for the FINOTAUR desktop agent (NinjaTrader 8).
// Prominent download button + step-by-step setup, SIM-first testing, and
// troubleshooting. Card patterns match AgentStatusTab.tsx; gold #C9A646 + zinc.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Download,
  MonitorDown,
  Plug,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ds/Card';

// ── small helpers ─────────────────────────────────────────────────────────────

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded text-xs break-words">
      {children}
    </code>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="font-mono text-zinc-200 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-xs">
      {children}
    </kbd>
  );
}

function Menu({ children }: { children: React.ReactNode }) {
  return <span className="text-zinc-200 font-medium">{children}</span>;
}

interface StepCardProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

function StepCard({ number, title, children }: StepCardProps) {
  return (
    <Card padding="default" className="flex gap-4">
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
        <p className="mt-1 text-sm text-zinc-500 max-w-2xl">
          The agent is a small NinjaTrader&nbsp;8 add-on that runs on your own computer. It
          watches your source account and mirrors every fill to your target accounts —
          locally, in milliseconds. FINOTAUR never places orders in the cloud; the desktop
          agent is the only thing that executes trades. Follow the steps below once and it
          stays paired across restarts.
        </p>
      </div>

      {/* prominent download */}
      <Card
        padding="default"
        className="flex flex-col sm:flex-row sm:items-center gap-4 border-[#C9A646]/30 bg-gradient-to-br from-[#C9A646]/[0.07] to-transparent"
      >
        <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-[#C9A646]/10 border border-[#C9A646]/30">
          <MonitorDown className="h-6 w-6 text-[#C9A646]" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-100">FINOTAUR Agent for NinjaTrader 8</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            <Code>finotaur-agent.zip</Code> · NinjaScript add-on · ~60&nbsp;KB
          </p>
        </div>
        <a
          href="/downloads/finotaur-agent.zip"
          download
          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#C9A646] text-zinc-900 hover:bg-[#d4b05a] transition-colors"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download the agent
        </a>
      </Card>

      {/* requirements */}
      <Card padding="compact" className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider shrink-0">
          Before you start
        </span>
        {[
          'NinjaTrader 8 (8.1+ recommended)',
          'Windows 10 / 11',
          '.NET Framework 4.8 (bundled with NT8)',
          'FINOTAUR Premium',
          'Your trading accounts connected in NinjaTrader',
        ].map((req) => (
          <span key={req} className="flex items-center gap-1.5 text-sm text-zinc-400">
            <span className="h-1 w-1 rounded-full bg-zinc-600" aria-hidden="true" />
            {req}
          </span>
        ))}
      </Card>

      {/* steps */}
      <div className="space-y-3">
        {/* step 1 — install */}
        <StepCard number={1} title="Install the add-on in NinjaTrader">
          <ol className="space-y-2 text-sm text-zinc-400 list-decimal list-outside ml-4 marker:text-zinc-600">
            <li>
              Download the ZIP above and <Menu>extract</Menu> it (right-click → Extract All).
            </li>
            <li>
              Copy the <Code>FinotaurAgent</Code> folder into{' '}
              <Code>Documents\NinjaTrader 8\bin\Custom\AddOns\</Code> (create the{' '}
              <Code>AddOns</Code> folder if it does not exist).
            </li>
            <li>
              Open NinjaTrader 8 → <Menu>Tools → Edit NinjaScript → Editor</Menu>.
            </li>
            <li>
              In the editor, open <Code>FinotaurAgent.cs</Code> and press <Kbd>F5</Kbd> to
              compile. Wait for <Menu>Compile succeeded</Menu> at the bottom.
            </li>
            <li>
              <Menu>Restart NinjaTrader.</Menu>
            </li>
            <li>
              Confirm it loaded: the <Menu>Tools</Menu> menu now shows{' '}
              <Menu>Finotaur Agent…</Menu>.
            </li>
          </ol>
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-zinc-800/40 border border-zinc-700/50 px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#C9A646] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-zinc-500 leading-relaxed">
              If compiling shows a red error, copy the exact message from the editor's output
              panel and send it to support — most are quick one-line fixes for your NT8
              version.
            </p>
          </div>
        </StepCard>

        {/* step 2 — pair */}
        <StepCard number={2} title="Pair this device">
          <ol className="space-y-2 text-sm text-zinc-400 list-decimal list-outside ml-4 marker:text-zinc-600">
            <li>
              Open the <Menu>Agent</Menu> tab here and click{' '}
              <Menu>Pair a new device</Menu> — you'll get a short code (e.g.{' '}
              <Code>ABC-1234</Code>). It expires in a few minutes.
            </li>
            <li>
              In NinjaTrader open <Menu>Tools → Finotaur Agent…</Menu>, paste the code, and
              click <Menu>Pair</Menu>.
            </li>
            <li>
              Within ~15 seconds the <Menu>Agent</Menu> tab shows this device as{' '}
              <Menu>Online</Menu>. Pairing is remembered — you won't need to repeat it.
            </li>
          </ol>
          <Link
            to="../agent"
            relative="path"
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-[#C9A646]/40 text-[#C9A646] hover:bg-[#C9A646]/10 transition-colors"
          >
            <Plug className="h-3.5 w-3.5" aria-hidden="true" />
            Go to Agent tab
          </Link>
        </StepCard>

        {/* step 3 — accounts */}
        <StepCard number={3} title="Check your accounts are connected">
          <p className="text-sm text-zinc-400">
            The agent copies between the accounts you connected to FINOTAUR. Make sure those
            same accounts are also logged in inside NinjaTrader (<Menu>Control Center → Accounts</Menu>)
            — the account names must match. After the first config sync, the NinjaTrader output
            window prints how many accounts were matched (e.g.{' '}
            <Code>2/2 journal accounts matched locally</Code>). If it shows{' '}
            <Code>0</Code>, connect the account in NinjaTrader first.
          </p>
        </StepCard>

        {/* step 4 — route */}
        <StepCard number={4} title="Create a copy route">
          <p className="text-sm text-zinc-400">
            Go to the <Menu>Copier</Menu> tab, pick a <Menu>source</Menu> account (the one you
            trade) and one or more <Menu>target</Menu> accounts (which mirror it), set the size
            ratio, and save. Set loss limits and a kill switch in the <Menu>Risk Rules</Menu>{' '}
            tab.
          </p>
          <Link
            to="../copier"
            relative="path"
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-[#C9A646]/40 text-[#C9A646] hover:bg-[#C9A646]/10 transition-colors"
          >
            <Plug className="h-3.5 w-3.5" aria-hidden="true" />
            Go to Copier tab
          </Link>
        </StepCard>

        {/* step 5 — test on SIM */}
        <StepCard number={5} title="Test on SIM first">
          <p className="text-sm text-zinc-400">
            Before using funded accounts, run a test on simulation/demo accounts: place a
            trade on the source account and confirm a matching order appears on the target
            within a second or two. Close it and confirm the target closes too. Only move to
            live accounts once SIM copying works end to end.
          </p>
        </StepCard>
      </div>

      {/* troubleshooting */}
      <Card padding="default" className="border-zinc-700/50">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          <p className="text-sm font-semibold text-zinc-200">Troubleshooting</p>
        </div>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li>
            <Menu>“Finotaur Agent…” is missing from the Tools menu</Menu> — the build didn't
            finish. Re-open the NinjaScript Editor, press <Kbd>F5</Kbd>, fix any red errors,
            then restart NinjaTrader.
          </li>
          <li>
            <Menu>Device stays offline</Menu> — the code may have expired. Generate a fresh
            one in the Agent tab and pair again.
          </li>
          <li>
            <Menu>No accounts matched</Menu> — the account isn't logged in inside NinjaTrader,
            or the name differs. Connect it in <Menu>Control Center → Accounts</Menu>.
          </li>
          <li>
            <Menu>Copies aren't placed</Menu> — confirm the master switch is on, the kill
            switch is off, and your route's source/target accounts are both online.
          </li>
        </ul>
      </Card>

      {/* compliance note */}
      <Card padding="compact" className="flex gap-3 items-start border-zinc-700/50">
        <ShieldCheck className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-zinc-500 leading-relaxed">
          Execution is 100% local. The agent only mirrors your own trades between your own
          accounts — nothing runs in the cloud, and FINOTAUR never sends orders on your behalf.
        </p>
      </Card>
    </div>
  );
}
