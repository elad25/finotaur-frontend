// src/features/automation/components/PairDeviceDialog.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Radix dialog that walks the user through pairing a new desktop agent.
// Opens → generates pairing code → displays code + countdown → polls for
// device to come online → shows success + Done button.
// NO external QR library used (none detected in package.json).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, RefreshCw, Monitor, CheckCircle2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ds/Button';
import { useAgentDevices } from '../hooks/useAgentDevices';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Format a raw 8-char alphanum code as XXXX-XXXX. */
function formatCode(raw: string): string {
  const clean = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (clean.length >= 8) return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
  return clean;
}

/** Format remaining seconds as mm:ss. */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── types ────────────────────────────────────────────────────────────────────

type Phase =
  | 'generating'   // waiting for the RPC
  | 'waiting'      // code shown, polling for device to pair
  | 'success'      // device came online
  | 'expired'      // code hit 0 before device paired
  | 'error';       // RPC or poll error

interface PairingState {
  deviceId: string;
  pairingCode: string;
  expiresAt: Date;
}

// ── component ─────────────────────────────────────────────────────────────────

interface PairDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PairDeviceDialog({ open, onOpenChange }: PairDeviceDialogProps) {
  const { generatePairingCode, devices, refetch } = useAgentDevices();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('generating');
  const [pairing, setPairing] = useState<PairingState | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── kick off pairing whenever dialog opens ────────────────────────────────
  const startPairing = useCallback(async () => {
    setPhase('generating');
    setPairing(null);
    setErrorMsg('');
    setCopied(false);

    try {
      const result = await generatePairingCode();
      const expiresAt = new Date(result.expires_at);
      setPairing({ deviceId: result.device_id, pairingCode: result.pairing_code, expiresAt });
      setRemainingMs(Math.max(0, expiresAt.getTime() - Date.now()));
      setPhase('waiting');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to generate pairing code');
      setPhase('error');
    }
  }, [generatePairingCode]);

  useEffect(() => {
    if (open) {
      startPairing();
    } else {
      // reset state when closed
      setPhase('generating');
      setPairing(null);
      setErrorMsg('');
      setCopied(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'waiting' || !pairing) return;

    countdownRef.current = setInterval(() => {
      const ms = pairing.expiresAt.getTime() - Date.now();
      if (ms <= 0) {
        setRemainingMs(0);
        setPhase('expired');
        clearInterval(countdownRef.current!);
      } else {
        setRemainingMs(ms);
      }
    }, 500);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [phase, pairing]);

  // ── poll for device coming online ─────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'waiting' || !pairing) return;

    pollRef.current = setInterval(async () => {
      await refetch();
      // check after refetch resolves — devices from the hook will update
    }, 4_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase, pairing, refetch]);

  // ── watch the devices list for our device to go online ───────────────────
  useEffect(() => {
    if (phase !== 'waiting' || !pairing) return;

    const matched = devices.find((d) => d.id === pairing.deviceId);
    if (matched?.isOnline) {
      if (pollRef.current) clearInterval(pollRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setPhase('success');
    }
  }, [devices, pairing, phase]);

  // ── copy to clipboard ─────────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!pairing) return;
    try {
      await navigator.clipboard.writeText(formatCode(pairing.pairingCode));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard denied — silently ignore
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border-ds-subtle bg-surface-1 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-gold-primary shrink-0" aria-hidden="true" />
            Pair a desktop agent
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-sm">
            The desktop agent runs locally on your machine and is the only component that
            executes trades or enforces risk halts.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-5">
          {/* ── generating ────────────────────────────────────────────────── */}
          {phase === 'generating' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <RefreshCw className="h-6 w-6 text-zinc-400 animate-spin" aria-hidden="true" />
              <p className="text-sm text-zinc-400">Generating pairing code…</p>
            </div>
          )}

          {/* ── waiting ───────────────────────────────────────────────────── */}
          {phase === 'waiting' && pairing && (
            <>
              {/* big monospaced code */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-4xl font-bold tracking-[0.15em] text-zinc-100 select-all">
                    {formatCode(pairing.pairingCode)}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                    aria-label="Copy pairing code"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* countdown */}
                <p className="text-xs text-zinc-500">
                  Expires in{' '}
                  <span className="font-mono text-zinc-300">{formatCountdown(remainingMs)}</span>
                </p>
              </div>

              {/* instructions */}
              <div className="rounded-lg bg-zinc-800/50 border border-border-ds-subtle p-4 space-y-1.5">
                <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  How to connect
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-400">
                  <li>Open NinjaTrader on your machine</li>
                  <li>
                    Go to <span className="text-zinc-200 font-medium">Tools → Finotaur Agent…</span>
                  </li>
                  <li>Paste the code above and click <span className="text-zinc-200 font-medium">Pair</span></li>
                </ol>
              </div>

              <p className="text-xs text-zinc-600 text-center">
                Waiting for device to connect…
              </p>
            </>
          )}

          {/* ── success ───────────────────────────────────────────────────── */}
          {phase === 'success' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" aria-hidden="true" />
              <div className="text-center space-y-1">
                <p className="text-base font-semibold text-zinc-100">Device paired</p>
                <p className="text-sm text-zinc-500">Your desktop agent is now connected.</p>
              </div>
              <Button
                variant="goldOutline"
                size="compact"
                showArrow={false}
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </div>
          )}

          {/* ── expired ───────────────────────────────────────────────────── */}
          {phase === 'expired' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-sm text-zinc-400">Code expired before a device connected.</p>
              <Button
                variant="goldOutline"
                size="compact"
                showArrow={false}
                onClick={startPairing}
              >
                Generate new code
              </Button>
            </div>
          )}

          {/* ── error ─────────────────────────────────────────────────────── */}
          {phase === 'error' && (
            <div className="flex flex-col items-center gap-4 py-6">
              {errorMsg?.includes('Premium subscription') ? (
                <>
                  <Lock className="h-8 w-8 text-[#C9A646]" aria-hidden="true" />
                  <p className="text-sm text-zinc-300 text-center">{errorMsg}</p>
                  <Button
                    variant="gold"
                    size="compact"
                    showArrow={false}
                    onClick={() => { onOpenChange(false); navigate('/app/upgrade'); }}
                  >
                    Upgrade to Premium
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-red-400">{errorMsg || 'Something went wrong.'}</p>
                  <Button
                    variant="goldOutline"
                    size="compact"
                    showArrow={false}
                    onClick={startPairing}
                  >
                    Try again
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
