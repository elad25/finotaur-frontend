/**
 * Nt8ConnectPanel — futures "connect your NinjaTrader" state for the
 * Footprint and Liquidity tabs. Shown whenever the user isn't yet
 * live-streaming through the NT8 market-data bridge (nt8Bridge.ts): not
 * paired yet, paired-but-offline, connecting, or a bridge error. Visual
 * language follows TickDataRequiredState's "no live feed" grammar (gold
 * glow ring + gradient title) in this same directory.
 */

import { useCallback, useEffect, useState } from 'react';
import { Cable, ShieldCheck } from 'lucide-react';
import {
  connectNt8Bridge,
  getNt8BridgeStatus,
  isNt8BridgeUnsupportedBrowser,
  onNt8BridgeStatus,
  type BridgeStatus,
} from '@/components/charting/orderflow/nt8Bridge';
import { fetchBridgeConfig, type Nt8BridgeDeviceConfig } from '@/components/charting/orderflow/fetchBridgeConfig';
import { cn } from '@/lib/utils';

export interface Nt8ConnectPanelProps {
  /** 'footprint' = trade-tick feed copy; 'depth' = order-book depth feed copy. Mirrors TickDataRequiredState's variant. */
  variant?: 'footprint' | 'depth';
  /** Route to the agent pairing surface. Defaults to the Copy Trade install tab (the existing pairing UI — see App.tsx's copy-trade/install route). */
  pairingHref?: string;
}

const DEFAULT_PAIRING_HREF = '/app/copy-trade/install';

type PanelPhase = 'loading-device' | 'not-paired' | BridgeStatus;

const VARIANT_FEED_NAME: Record<'footprint' | 'depth', string> = {
  footprint: 'footprint chart',
  depth: 'liquidity heatmap',
};

function statusCopy(phase: PanelPhase, variant: 'footprint' | 'depth'): { title: string; body: string } {
  const feed = VARIANT_FEED_NAME[variant];
  switch (phase) {
    case 'loading-device':
      return { title: 'Checking for your NinjaTrader agent…', body: '' };
    case 'not-paired':
      return {
        title: 'Connect NinjaTrader',
        body: `Pair the FINOTAUR desktop agent with this NinjaTrader install to power the futures ${feed} — your market data never leaves your machine.`,
      };
    case 'idle':
      return {
        title: 'Connect NinjaTrader',
        body: 'FINOTAUR connects to YOUR NinjaTrader on this computer — your data never leaves your machine.',
      };
    case 'awaiting-permission':
    case 'connecting':
      return {
        title: 'Connecting…',
        body: 'If Chrome shows a prompt to allow local network access, click Allow.',
      };
    case 'live':
      return { title: 'Connected', body: 'Streaming live from your NinjaTrader agent.' };
    case 'agent-not-running':
      return {
        title: 'Agent not reachable',
        body: 'Make sure NinjaTrader and the FINOTAUR desktop agent are both running on this computer. If Chrome asked to allow local network access, click Allow and try again.',
      };
    case 'auth-failed':
      return {
        title: 'Pairing expired',
        body: 'This browser is no longer authorized with your agent. Re-pair the agent from Copy Trade settings.',
      };
    case 'unsupported-browser':
      return {
        title: 'Browser not supported',
        body: 'Safari cannot reach a local WebSocket agent from this page. Use Chrome or Edge to connect NinjaTrader.',
      };
    case 'error':
      return { title: 'Connection error', body: 'Something went wrong connecting to your NinjaTrader agent.' };
    default:
      return { title: 'Connect NinjaTrader', body: '' };
  }
}

export function Nt8ConnectPanel({ variant = 'footprint', pairingHref = DEFAULT_PAIRING_HREF }: Nt8ConnectPanelProps) {
  // undefined = still loading; null = no paired device found.
  const [device, setDevice] = useState<Nt8BridgeDeviceConfig | null | undefined>(undefined);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>(() => getNt8BridgeStatus());
  const [connecting, setConnecting] = useState(false);
  const unsupported = isNt8BridgeUnsupportedBrowser();

  useEffect(() => {
    let cancelled = false;
    fetchBridgeConfig().then((cfg) => {
      if (!cancelled) setDevice(cfg);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => onNt8BridgeStatus(setBridgeStatus), []);

  const handleConnect = useCallback(async () => {
    if (!device) return;
    setConnecting(true);
    try {
      await connectNt8Bridge({ port: device.port, token: device.token });
    } finally {
      setConnecting(false);
    }
  }, [device]);

  const phase: PanelPhase = unsupported
    ? 'unsupported-browser'
    : device === undefined
      ? 'loading-device'
      : device === null
        ? 'not-paired'
        : bridgeStatus;

  const { title, body } = statusCopy(phase, variant);
  const showConnectButton =
    !unsupported &&
    !!device &&
    (phase === 'idle' || phase === 'agent-not-running' || phase === 'auth-failed' || phase === 'error');
  const showPairingLink = phase === 'not-paired' || phase === 'agent-not-running' || phase === 'auth-failed';

  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <div className="flex flex-col items-center gap-5 max-w-sm text-center">
        <div className="relative">
          <div
            className="absolute inset-0 blur-2xl opacity-20 rounded-full"
            style={{ background: 'radial-gradient(circle, #C9A646 0%, transparent 70%)' }}
            aria-hidden="true"
          />
          <div
            className="relative flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(201,166,70,0.1) 0%, rgba(201,166,70,0.04) 100%)',
              border: '1.5px solid rgba(201,166,70,0.28)',
            }}
          >
            <Cable
              className="h-7 w-7"
              style={{ color: '#C9A646', filter: 'drop-shadow(0 0 6px rgba(201,166,70,0.45))' }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div>
          <p
            className="text-lg font-semibold mb-1.5"
            style={{
              background: 'linear-gradient(135deg, #C9A646 0%, #F4D87C 50%, #C9A646 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {title}
          </p>
          {body && <p className="text-[13px] text-[#909090] leading-relaxed">{body}</p>}
        </div>

        <div
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px]"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#C9A646' }} aria-hidden="true" />
          <span className="text-[#909090]">Your market data never leaves your machine</span>
        </div>

        {showConnectButton && (
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            className={cn(
              'h-9 rounded px-4 text-[12px] font-semibold transition-all duration-150',
              connecting && 'opacity-60',
            )}
            style={{ background: 'rgba(201,166,70,0.14)', color: '#C9A646', border: '1px solid rgba(201,166,70,0.4)' }}
          >
            {connecting ? 'Connecting…' : 'Connect'}
          </button>
        )}

        {showPairingLink && (
          <a
            href={pairingHref}
            className="text-[11px] font-semibold text-[#707070] transition-colors duration-150 hover:text-[#C9A646]"
          >
            {phase === 'not-paired' ? 'Pair your NinjaTrader agent →' : 'Manage agent pairing →'}
          </a>
        )}
      </div>
    </div>
  );
}
