// src/components/brokers/BinanceConnectionPopup.tsx
// Connect Binance via read-only API key — mirrors IBConnectionPopup's view-state-machine UX.

import { useState } from 'react';
import {
  X,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  HelpCircle,
  Key,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Spinner } from "@/components/ui/Spinner";
import { supabase } from '@/lib/supabase';
import BinanceApiKeyGuide from './BinanceApiKeyGuide';

// ============================================================================
// TYPES
// ============================================================================

type ViewType =
  | 'instructions'  // How to create a read-only Binance API key
  | 'credentials'   // Enter API key, secret, and trading pairs
  | 'connecting'    // Invoking exchange-connect edge function
  | 'success'       // Successfully connected (+ optional first-sync stats)
  | 'error';        // Connection failed

interface Props {
  onClose: () => void;
  onSuccess?: (connectionId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function BinanceConnectionPopup({ onClose, onSuccess }: Props) {
  // ── view state ──────────────────────────────────────────────────────────
  const [view, setView] = useState<ViewType>('instructions');
  const [error, setError] = useState<string>('');
  const [showGuide, setShowGuide] = useState(false);

  // ── credential state (cleared after successful connect) ─────────────────
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [symbols, setSymbols] = useState('');

  // ── first-sync stats shown on success view ───────────────────────────────
  const [syncStats, setSyncStats] = useState<{
    tradesInserted?: number;
    firstError?: string | null;
  } | null>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleConnect = async () => {
    if (!apiKey.trim() || !apiSecret.trim() || !symbols.trim()) {
      setError('Please fill in all three fields.');
      return;
    }

    setView('connecting');
    setError('');

    try {
      // 1. Get the session JWT — must be sent as Authorization header.
      const { data: sessData } = await supabase.auth.getSession();
      const jwt = sessData.session?.access_token;
      if (!jwt) throw new Error('Please sign in to connect your broker.');

      // 2. Invoke exchange-connect. apiKey/apiSecret go ONLY here — never to
      //    any Supabase table directly. The edge function stores them in Vault.
      const { data: connectResult, error: connectErr } = await supabase.functions.invoke(
        'exchange-connect',
        {
          body: {
            broker: 'binance',
            apiKey: apiKey.trim(),
            apiSecret: apiSecret.trim(),
            symbols: symbols.trim(),
            environment: 'live',
          },
          headers: { Authorization: `Bearer ${jwt}` },
        },
      );

      if (connectErr) throw new Error(connectErr.message || 'Connection failed.');
      if (!connectResult?.ok) throw new Error(connectResult?.error || 'Connection rejected by server.');

      const connectionId: string = connectResult.connectionId;

      // 3. Security: clear secrets from component state immediately after success.
      setApiKey('');
      setApiSecret('');

      // 4. Trigger first sync (best-effort; do not block success on sync failure).
      try {
        const { data: syncResult } = await supabase.functions.invoke('exchange-sync', {
          body: { broker: 'binance', mode: 'manual' },
          headers: { Authorization: `Bearer ${jwt}` },
        });
        setSyncStats({
          tradesInserted: syncResult?.results?.[0]?.inserted ?? syncResult?.inserted ?? 0,
          firstError: syncResult?.results?.[0]?.error ?? null,
        });
      } catch {
        // Sync failure is non-fatal; connection was already established.
        setSyncStats({ tradesInserted: 0, firstError: null });
      }

      setView('success');
      if (onSuccess) onSuccess(connectionId);
    } catch (err: unknown) {
      console.error('Binance connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect Binance.');
      setView('error');
    }
  };

  // ============================================================================
  // RENDER — Instructions View
  // ============================================================================

  const renderInstructions = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#F0B90B]/30 bg-[#F0B90B]/10">
          <img
            src="/brokers/binance.svg"
            alt="Binance"
            className="h-7 w-7"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const sib = e.currentTarget.nextElementSibling;
              if (sib) sib.classList.remove('hidden');
            }}
          />
          <span className="hidden text-sm font-bold text-[#F0B90B]">BNB</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Connect Binance</h2>
          <p className="text-xs text-zinc-400">Read-only API key — no trading access</p>
        </div>
      </div>

      {/* Security callout */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
          <div className="text-xs">
            <p className="mb-1 font-medium text-emerald-100">Read-only access only</p>
            <p className="text-emerald-200/80">
              Finotaur reads your trade history for journaling. Enable ONLY "Enable Reading" —
              do NOT enable Spot Trading, Futures Trading, Margin Trading, or Withdrawals.
            </p>
          </div>
        </div>
      </div>

      {/* Step-by-step */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">How to create a read-only Binance API key</h3>

        {[
          {
            step: 1,
            title: 'Open Binance API Management',
            body: (
              <a
                href="https://www.binance.com/en/my/settings/api-management"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-[#F0B90B] transition-colors hover:text-[#f5c842]"
              >
                Open API Management
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ),
          },
          {
            step: 2,
            title: 'Click "Create API" and label it "Finotaur"',
            body: (
              <p className="text-xs text-zinc-400">
                Choose <strong className="text-zinc-300">System Generated</strong> when prompted for key type.
              </p>
            ),
          },
          {
            step: 3,
            title: 'Enable "Enable Reading" only',
            body: (
              <div className="space-y-1 text-xs text-zinc-400">
                <p className="text-zinc-300 font-medium">Permissions checklist:</p>
                <ul className="ml-3 list-disc space-y-0.5">
                  <li><span className="text-emerald-400">✓ Enable Reading</span></li>
                  <li><span className="text-red-400">✗ Enable Spot &amp; Margin Trading</span></li>
                  <li><span className="text-red-400">✗ Enable Futures</span></li>
                  <li><span className="text-red-400">✗ Enable Withdrawals</span></li>
                </ul>
                <p className="mt-1 text-zinc-500">
                  Restrict by IP if possible — adds an extra security layer.
                </p>
              </div>
            ),
          },
          {
            step: 4,
            title: 'Copy the API Key and Secret Key',
            body: (
              <p className="text-xs text-zinc-400">
                The Secret Key is shown only once. Paste both on the next screen.
              </p>
            ),
          },
        ].map(({ step, title, body }) => (
          <div key={step} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#F0B90B] text-xs font-bold text-black">
                {step}
              </div>
              <div className="flex-1">
                <p className="mb-1.5 text-sm font-medium text-white">{title}</p>
                {body}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Screenshot guide link */}
      <button
        onClick={() => setShowGuide(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <HelpCircle className="h-4 w-4 text-[#F0B90B]" />
        How to create an API key (with screenshots)
      </button>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Cancel
        </button>
        <button
          onClick={() => setView('credentials')}
          className="flex-1 rounded-xl bg-gradient-to-r from-[#F0B90B] to-[#f5c842] px-5 py-2.5 text-sm font-bold text-black transition-all hover:from-[#d9a70a] hover:to-[#e5b83c]"
        >
          Continue
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER — Credentials View
  // ============================================================================

  const renderCredentials = () => (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setView('instructions')}
          className="rounded-lg p-2 transition-colors hover:bg-zinc-800"
        >
          <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">Enter API Credentials</h2>
          <p className="text-sm text-zinc-400">Paste your Binance API Key and Secret</p>
        </div>
      </div>

      {/* Security note */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="flex items-start gap-3">
          <Key className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
          <div className="text-sm">
            <p className="mb-1 font-medium text-emerald-100">Your credentials are secure</p>
            <p className="text-emerald-200/80">
              Keys are encrypted in Vault and never stored in plain text. Finotaur cannot execute trades.
            </p>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            API Key
          </label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Binance API Key"
            autoComplete="off"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-[#F0B90B]/50"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Secret Key
          </label>
          <input
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="Enter your Binance Secret Key"
            autoComplete="new-password"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-[#F0B90B]/50"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Trading Pairs
          </label>
          <input
            type="text"
            value={symbols}
            onChange={(e) => setSymbols(e.target.value)}
            placeholder="BTCUSDT, ETHUSDT, SOLUSDT"
            autoComplete="off"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-[#F0B90B]/50"
          />
          <p className="mt-1.5 text-xs text-zinc-500">
            Comma-separated pairs you trade — Binance can only sync the symbols you list.
          </p>
        </div>
      </div>

      {/* Inline error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => setView('instructions')}
          className="flex-1 rounded-xl bg-zinc-800 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Back
        </button>
        <button
          onClick={handleConnect}
          disabled={!apiKey.trim() || !apiSecret.trim() || !symbols.trim()}
          className="flex-1 rounded-xl bg-gradient-to-r from-[#F0B90B] to-[#f5c842] px-6 py-3 text-sm font-bold text-black transition-all hover:from-[#d9a70a] hover:to-[#e5b83c] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Connect Account
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER — Connecting View
  // ============================================================================

  const renderConnecting = () => (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <Spinner size="md" />
      <div className="text-center">
        <p className="mb-2 text-lg font-semibold text-white">Connecting to Binance...</p>
        <p className="text-sm text-zinc-400">Validating your API key</p>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER — Success View
  // ============================================================================

  const renderSuccess = () => {
    const trades = syncStats?.tradesInserted ?? 0;
    const noActivity = trades === 0;

    return (
      <div className="flex flex-col items-center justify-center gap-5 py-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </div>

        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-white">Successfully Connected!</h2>
          <p className="text-zinc-400">Your Binance account is now linked to Finotaur</p>
        </div>

        {/* Sync results panel */}
        {syncStats && !noActivity && (
          <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{trades}</div>
              <div className="mt-1 text-xs text-zinc-400">Trades imported</div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
              <RefreshCw className="h-3 w-3" />
              Auto-syncs regularly — no action needed
            </div>
          </div>
        )}

        {/* Empty-activity panel */}
        {syncStats && noActivity && (
          <div className="w-full rounded-xl border border-zinc-700 bg-zinc-800/40 p-4 text-center">
            <p className="text-sm text-zinc-300">No trades found yet.</p>
            <p className="mt-1 text-xs text-zinc-500">
              Your account is connected. New activity will appear after the next sync.
            </p>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
              <RefreshCw className="h-3 w-3" />
              Auto-syncs regularly
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition-colors hover:bg-emerald-500"
        >
          Done
        </button>
      </div>
    );
  };

  // ============================================================================
  // RENDER — Error View
  // ============================================================================

  const renderError = () => (
    <div className="flex flex-col items-center justify-center gap-6 py-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-red-500/30 bg-red-500/10">
        <AlertCircle className="h-10 w-10 text-red-500" />
      </div>

      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold text-white">Connection Failed</h2>
        <p className="max-w-sm text-zinc-400">{error}</p>
      </div>

      <div className="flex w-full gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl bg-zinc-800 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            setError('');
            setView('credentials');
          }}
          className="flex-1 rounded-xl bg-[#F0B90B] px-6 py-3 text-sm font-bold text-black transition-colors hover:bg-[#d9a70a]"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[calc(100vh-32px)] w-full max-w-[460px] overflow-y-auto rounded-[16px] border bg-[#141414] p-4 shadow-[0_0_50px_rgba(240,185,11,0.2)] sm:p-5"
        style={{ borderColor: 'rgba(240,185,11,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 transition-colors hover:bg-zinc-800"
        >
          <X className="h-5 w-5 text-zinc-400" />
        </button>

        {/* View router */}
        {view === 'instructions' && renderInstructions()}
        {view === 'credentials' && renderCredentials()}
        {view === 'connecting' && renderConnecting()}
        {view === 'success' && renderSuccess()}
        {view === 'error' && renderError()}
      </div>

      {/* Screenshot guide overlay — renders above the popup (z-[200]) */}
      {showGuide && <BinanceApiKeyGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
}
