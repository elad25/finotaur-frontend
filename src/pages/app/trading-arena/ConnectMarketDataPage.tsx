// src/pages/app/trading-arena/ConnectMarketDataPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// "Connect Live Market Data" — onboarding page for the Trading Arena's own
// real-time futures feed (via the FINOTAUR Agent's NT8 market bridge).
//
// Framed entirely around MARKET DATA, not copy trading — this page never
// mentions copy routes / leader-follower / Trade Copier. It shares the
// underlying pairing primitives (useAgentDevices, PairDeviceDialog) with the
// Trade Copier's InstallAgentTab, but does not modify their behavior.
//
// Chrome-less: routed under HIDE_CHROME_ROUTES prefix /app/trading-arena
// (see layouts/ProtectedAppLayout.tsx), so this page renders its own slim
// top bar — same visual language as TradingArena.tsx's header.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, BookOpen, Plus, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { useAgentDevices } from '@/features/automation/hooks/useAgentDevices';
import { PairDeviceDialog } from '@/features/automation/components/PairDeviceDialog';
import { MarketDataGuideModal } from './components/MarketDataGuideModal';
import { AGENT_VERSION, AGENT_UPDATED } from '@/features/automation/lib/agentVersion';

const BACK_HREF = '/app/trading-arena/chart';
const ARENA_DOM_HREF = '/app/trading-arena/dom';

const STEP_TEASERS = [
  'Download the agent',
  'Import into NinjaTrader 8',
  'Pair your device',
  'Enable the Market bridge & Connect',
];

// ── status pill (mirrors DeviceList.tsx's online/offline badge language) ────
function StatusPill({ online }: { online: boolean }) {
  return (
    <span
      className={
        online
          ? 'inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400'
          : 'inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-500'
      }
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${online ? 'bg-emerald-400' : 'bg-zinc-600'}`}
        aria-hidden="true"
      />
      {online ? 'Agent online' : 'Agent offline'}
    </span>
  );
}

// ── teaser card for FINOTAUR's own upcoming no-NinjaTrader data feed ────────
function LiveDataTeaserCard({ compact = false }: { compact?: boolean }) {
  return (
    <Card
      padding={compact ? 'compact' : 'default'}
      className="opacity-70 border-dashed space-y-2"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-zinc-500 shrink-0" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-zinc-300">FINOTAUR Live Data</h3>
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-500">
          Coming soon
        </span>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">
        Real-time futures data, no NinjaTrader required.
      </p>
    </Card>
  );
}

// ── teaser card for the upcoming Rithmic (R|Protocol) market-data feed ──────
// Attribution: the "Trading Platform by Rithmic" and "Powered by OMNE" logos
// are displayed here per Rithmic's conformance/attribution requirements.
function RithmicTeaserCard({ compact = false }: { compact?: boolean }) {
  return (
    <Card
      padding={compact ? 'compact' : 'default'}
      className="opacity-70 border-dashed space-y-2"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-zinc-500 shrink-0" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-zinc-300">Rithmic (R|Protocol)</h3>
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-500">
          Coming soon
        </span>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">
        Stream your own real-time CME futures data by connecting with your Rithmic credentials.
      </p>
      <div className="flex items-center gap-3 pt-1">
        <img
          src="/brokers/rithmic-trading-platform.png"
          alt="Trading Platform by Rithmic"
          className="h-3.5 w-auto object-contain opacity-70"
        />
        <span className="text-zinc-700" aria-hidden="true">·</span>
        <img
          src="/brokers/powered-by-omne.png"
          alt="Powered by OMNE"
          className="h-3.5 w-auto object-contain opacity-70"
        />
      </div>
    </Card>
  );
}

export default function ConnectMarketDataPage() {
  const navigate = useNavigate();
  const { devices, isLoading } = useAgentDevices();
  const [pairOpen, setPairOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // The Arena's market-data bridge is a single-device concept — the primary
  // device (first paired) determines the page's state.
  const device = useMemo(() => devices[0] ?? null, [devices]);
  const isPaired = !!device;
  const isOnline = device?.isOnline ?? false;

  const handleOpenPairDialog = () => setPairOpen(true);

  return (
    <div
      className="flex flex-col w-full min-h-screen bg-[#08080a] text-[#E8E8E8]"
      style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      {/* ── Top bar — mirrors TradingArena.tsx's header language ─────────── */}
      <header
        className="flex flex-shrink-0 items-center gap-3 px-4 border-b"
        style={{
          height: '52px',
          borderColor: 'rgba(201,166,70,0.12)',
          background: 'linear-gradient(180deg, #0D0D0F 0%, #08080a 100%)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => navigate(BACK_HREF)}
            className="flex items-center justify-center h-7 w-7 rounded-md text-[#707070] hover:text-[#C9A646] hover:bg-[rgba(201,166,70,0.08)] transition-colors duration-150 flex-shrink-0"
            aria-label="Back to Arena"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate(BACK_HREF)}
            className="text-[13px] font-medium text-[#707070] hover:text-[#C9A646] transition-colors duration-150 flex-shrink-0"
          >
            Back to Arena
          </button>

          <span className="text-zinc-700 mx-1" aria-hidden="true">·</span>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Radio className="h-4 w-4 flex-shrink-0" style={{ color: '#C9A646' }} aria-hidden="true" />
            <span
              className="text-[13px] font-bold tracking-wide whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, #C9A646 0%, #F4D87C 60%, #C9A646 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Connect Live Market Data
            </span>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-8 md:py-12">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Connect Live Market Data</h1>
            <p className="mt-1.5 text-sm text-zinc-500 max-w-xl">
              Stream your own real-time futures feed into the Trading Arena&apos;s DOM, Footprint,
              and Liquidity tabs.
            </p>
          </div>

          {!isLoading && !isPaired && (
            <>
              {/* Primary option: NinjaTrader feed */}
              <Card padding="default" className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">
                    Connect your NinjaTrader feed
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500 leading-relaxed">
                    Included with your plan. Your data stays on your machine — FINOTAUR never
                    touches your market-data subscription.
                  </p>
                </div>

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

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="/downloads/finotaur-agent.zip"
                    download
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-zinc-200 border border-zinc-700/60 hover:bg-zinc-800 transition-colors"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download agent
                  </a>

                  <Button variant="goldOutline" size="compact" showArrow={false} onClick={handleOpenPairDialog}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Pair device
                  </Button>

                  <button
                    type="button"
                    onClick={() => setGuideOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-[#C9A646] text-zinc-900 hover:bg-[#d4b05a] transition-colors"
                  >
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    GUIDE
                  </button>

                  <span className="text-xs text-zinc-500">
                    Version <span className="font-semibold text-zinc-400">{AGENT_VERSION}</span> · updated {AGENT_UPDATED}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-600 pt-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-zinc-600 shrink-0" aria-hidden="true" />
                  Runs 100% locally — the agent only streams market data, it never executes orders.
                </div>
              </Card>

              {/* Secondary/teaser option */}
              <LiveDataTeaserCard />
              <RithmicTeaserCard />
            </>
          )}

          {!isLoading && isPaired && !isOnline && (
            <>
              <Card padding="default" className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{device?.device_name}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">{device?.platform ?? 'ninjatrader'}</p>
                  </div>
                  <StatusPill online={false} />
                </div>

                <p className="text-sm text-zinc-400 leading-relaxed">
                  Start NinjaTrader 8 on the paired machine — the agent runs inside it.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="goldOutline" size="compact" showArrow={false} onClick={handleOpenPairDialog}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Pair another device
                  </Button>
                  <button
                    type="button"
                    onClick={() => setGuideOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-zinc-300 border border-zinc-700/60 hover:bg-zinc-800 transition-colors"
                  >
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    GUIDE
                  </button>
                </div>

                <Accordion type="single" collapsible className="border-t border-zinc-800 pt-1">
                  <AccordionItem value="troubleshoot" className="border-none">
                    <AccordionTrigger className="text-xs font-semibold text-zinc-400 hover:no-underline py-2">
                      Troubleshooting
                    </AccordionTrigger>
                    <AccordionContent className="text-xs text-zinc-500 space-y-2">
                      <p>Is the add-on imported in NinjaTrader 8?</p>
                      <p>Did you restart NinjaTrader 8 after importing it?</p>
                      <p>Is the Market bridge toggle enabled in the Finotaur Agent window (Tools → Finotaur Agent…)?</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>

              <LiveDataTeaserCard compact />
              <RithmicTeaserCard compact />
            </>
          )}

          {!isLoading && isPaired && isOnline && (
            <>
              <Card padding="default" className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{device?.device_name}</p>
                    {device?.bridge_port != null && (
                      <p className="text-xs text-zinc-600 mt-0.5">Bridge port {device.bridge_port}</p>
                    )}
                  </div>
                  <StatusPill online={true} />
                </div>

                <Button variant="gold" onClick={() => navigate(ARENA_DOM_HREF)}>
                  Open the Arena
                </Button>

                <p className="text-xs text-zinc-600">
                  Connect from the DOM, Footprint, or Liquidity tabs — data streams directly from
                  this machine&apos;s browser.
                </p>
              </Card>

              <LiveDataTeaserCard compact />
              <RithmicTeaserCard compact />
            </>
          )}
        </div>
      </main>

      <PairDeviceDialog open={pairOpen} onOpenChange={setPairOpen} />
      <MarketDataGuideModal open={guideOpen} onOpenChange={setGuideOpen} />
    </div>
  );
}
