// src/components/brokers/IBConnectionPopup.tsx
// 🏦 Interactive Brokers IBRIT Connection Component
// Guides users through connecting their IB account via IBRIT

import { useState } from 'react';
import {
  X,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Key,
  HelpCircle,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { SkeletonText } from '@/components/ds/Skeleton';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

type ViewType = 
  | 'instructions'  // How to get credentials
  | 'credentials'   // Enter credentials
  | 'connecting'    // Validating credentials
  | 'success'       // Successfully connected
  | 'error';        // Connection failed

interface Props {
  onClose: () => void;
  onSuccess?: (connectionId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function IBConnectionPopup({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  
  // State
  const [view, setView] = useState<ViewType>('instructions');
  const [error, setError] = useState<string>('');
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  // Credentials
  const [token, setToken] = useState('');
  const [queryId, setQueryId] = useState('');

  // Sync result from the auto-sync that runs on connect (shown in success view)
  const [syncStats, setSyncStats] = useState<{
    tradesInserted?: number;
    positionsCount?: number;
    daysWithData?: number;
    firstError?: string | null;
  } | null>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleConnect = async () => {
    if (!user) { setError('Please sign in to connect your broker'); return; }
    if (!token.trim() || !queryId.trim()) { setError('Please enter both Token and Query ID'); return; }

    setView('connecting');
    setError('');

    try {
      // 1. UPDATE-or-INSERT broker_connections row.
      //    Production unique index is (user_id, broker, account_id) NULLS NOT DISTINCT —
      //    .upsert with onConflict='user_id,broker' fails (no matching constraint),
      //    and onConflict on the 3-col index would orphan rows once account_id is set.
      //    Robust pattern: UPDATE first; if 0 rows affected, INSERT.
      // SECURITY: never persist IBRIT secrets as plaintext. The row stores only
      // non-secret metadata; the token + query_id go to the edge fn (over TLS) which
      // stores them in Supabase Vault and sets connection_data.vault_secret_id.
      const connectionData = {
        integration_type: 'ibrit',
        service_code: 'finotaur-ws',
      };
      const nowIso = new Date().toISOString();

      const { data: updated, error: updateErr } = await supabase
        .from('broker_connections')
        .update({
          status: 'pending',
          is_active: true,
          connected_at: nowIso,
          connection_data: connectionData,
        })
        .eq('user_id', user.id)
        .eq('broker', 'interactive_brokers')
        .select('id');

      if (updateErr) throw new Error(updateErr.message);

      let conn: { id: string };
      if (updated && updated.length > 0) {
        conn = updated[0];
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('broker_connections')
          .insert({
            user_id: user.id,
            broker: 'interactive_brokers',
            status: 'pending',
            is_active: true,
            connected_at: nowIso,
            connection_data: connectionData,
          })
          .select('id')
          .single();
        if (insertErr || !inserted) throw new Error(insertErr?.message || 'Failed to save connection');
        conn = inserted;
      }

      // 2. Trigger first sync via edge function
      const { data: sess } = await supabase.auth.getSession();
      const jwt = sess.session?.access_token;
      const { data: syncResult, error: syncErr } = await supabase.functions.invoke('interactive-brokers-sync', {
        body: { userId: user.id, mode: 'manual', token: token.trim(), query_id: queryId.trim() },
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
      });

      if (syncErr) throw new Error(syncErr.message || 'Sync failed');
      // syncResult shape: { ok: true, tradesInserted, positionsCount, daysWithData, firstError } OR { error: '...' }
      if (syncResult?.error) throw new Error(syncResult.error);

      setSyncStats({
        tradesInserted: syncResult?.tradesInserted ?? 0,
        positionsCount: syncResult?.positionsCount ?? 0,
        daysWithData: syncResult?.daysWithData ?? 0,
        firstError: syncResult?.firstError ?? null,
      });
      setView('success');
      if (onSuccess) onSuccess(conn.id);
    } catch (err: any) {
      console.error('IB IBRIT connection error:', err);
      setError(err.message || 'Failed to connect to Interactive Brokers');
      setView('error');
    }
  };

  const handleCopy = (text: string, step: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  // ----------------------------------------------------------------------------
  // Note: a manual "Sync Trades Now" handler was removed in this view.
  // Sync runs automatically inside handleConnect, and pg_cron `ib-auto-sync`
  // refreshes data every 4 hours. Manual re-sync stays available from outside
  // the popup via useBrokerConnections.syncNow().
  // ----------------------------------------------------------------------------

  // ============================================================================
  // RENDER - Instructions View
  // ============================================================================

  const renderInstructions = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D71E28]/30 bg-[#D71E28]/10">
          <img
            src="/brokers/interactive-brokers-logo.svg"
            alt="Interactive Brokers"
            className="h-7 w-7"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <span className="hidden text-xl font-bold text-[#D71E28]">IB</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Connect Interactive Brokers</h2>
          <p className="text-xs text-zinc-400">Read-only reporting connection</p>
        </div>
      </div>

      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
        <div className="flex items-start gap-3">
          <HelpCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
          <div className="text-xs">
            <p className="mb-1 font-medium text-blue-100">IBRIT access</p>
            <p className="text-blue-200/80">
              FINOTAUR reads trades and positions only. No trading permission is requested.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Setup</h3>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#C9A646] text-xs font-bold text-black">
              1
            </div>
            <div className="flex-1">
              <p className="mb-2 text-sm font-medium text-white">Open IB Client Portal</p>
              <a
                href="https://www.interactivebrokers.com/portal"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-[#C9A646] transition-colors hover:text-[#E5C158]"
              >
                Open portal
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#C9A646] text-xs font-bold text-black">
              2
            </div>
            <div className="flex-1">
              <p className="mb-2 text-sm font-medium text-white">Find Finotaur in Third-Party Reports</p>
              <p className="text-xs text-zinc-400">
                In the Portal menu, select <strong className="text-zinc-300">Reporting</strong> OR <strong className="text-zinc-300">Performance &amp; Reports</strong> → <strong className="text-zinc-300">Third-Party Reports</strong> → <strong className="text-zinc-300">Third-Party Data Feeds &gt; Finotaur (ws)</strong>
              </p>
              <p className="mt-1 text-xs text-zinc-500">Your Token and Query ID will be displayed there.</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#C9A646] text-xs font-bold text-black">
              3
            </div>
            <div className="flex-1">
              <p className="mb-2 text-sm font-medium text-white">Copy Token + Query ID</p>
              <p className="mb-2 text-xs text-zinc-400">Paste both credentials on the next screen.</p>
              <div className="rounded-lg bg-zinc-800/50 p-2 text-[11px] text-zinc-500">
                <span className="text-zinc-400">Not listed?</span>
                <button
                  onClick={() => handleCopy('reportingintegration@interactivebrokers.com', 3)}
                  className="mx-1 inline-flex items-center gap-1 text-[#C9A646] hover:text-[#E5C158]"
                >
                  Email IB
                  {copiedStep === 3 ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Cancel
        </button>
        <button
          onClick={() => setView('credentials')}
          className="flex-1 rounded-xl bg-gradient-to-r from-[#C9A646] to-[#E5C158] px-5 py-2.5 text-sm font-bold text-black transition-all hover:from-[#B39540] hover:to-[#D4B55E]"
        >
          Continue
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER - Credentials View
  // ============================================================================

  const renderCredentials = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setView('instructions')}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">Enter IB Credentials</h2>
          <p className="text-zinc-400 text-sm">Paste your Token and Query ID from IB</p>
        </div>
      </div>

      {/* Security Note */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Key className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-emerald-100 font-medium mb-1">Your credentials are secure</p>
            <p className="text-emerald-200/80">
              IBRIT provides read-only access. We cannot execute trades or modify your account.
            </p>
          </div>
        </div>
      </div>

      {/* Credential Inputs */}
      <div className="space-y-4">
        <div>
          <label className="block text-zinc-300 text-sm font-medium mb-2">
            Token
          </label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter your IB Token"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#C9A646]/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-zinc-300 text-sm font-medium mb-2">
            Query ID
          </label>
          <input
            type="text"
            value={queryId}
            onChange={(e) => setQueryId(e.target.value)}
            placeholder="Enter your IB Query ID"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#C9A646]/50 transition-colors"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => setView('instructions')}
          className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-medium"
        >
          Back
        </button>
        <button
          onClick={handleConnect}
          disabled={!token.trim() || !queryId.trim()}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-[#C9A646] to-[#E5C158] hover:from-[#B39540] hover:to-[#D4B55E] text-black rounded-xl transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Connect Account
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER - Connecting View
  // ============================================================================

  const renderConnecting = () => (
    <div className="py-8 space-y-4">
      <SkeletonText lines={3} />
    </div>
  );

  // ============================================================================
  // RENDER - Success View
  // ============================================================================

  const renderSuccess = () => {
    const trades = syncStats?.tradesInserted ?? 0;
    const positions = syncStats?.positionsCount ?? 0;
    const noActivity = trades === 0 && positions === 0;

    return (
      <div className="py-8 flex flex-col items-center justify-center gap-5">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500/30">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Successfully Connected!</h2>
          <p className="text-zinc-400">
            Your Interactive Brokers account is now linked to Finotaur
          </p>
        </div>

        {/* Sync results panel — auto-sync just ran inside handleConnect */}
        {syncStats && !noActivity && (
          <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold text-emerald-400">{trades}</div>
                <div className="text-xs text-zinc-400 mt-1">Trades imported</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-400">{positions}</div>
                <div className="text-xs text-zinc-400 mt-1">Open positions</div>
              </div>
            </div>
            <div className="text-[11px] text-zinc-500 mt-3 text-center flex items-center justify-center gap-1.5">
              <RefreshCw className="w-3 h-3" />
              Auto-syncs every 4 hours — no action needed
            </div>
          </div>
        )}

        {/* Empty-activity panel — account connected but no trades in last 30 days */}
        {syncStats && noActivity && (
          <div className="w-full rounded-xl border border-zinc-700 bg-zinc-800/40 p-4 text-center">
            <p className="text-sm text-zinc-300">
              No trades found in the last 30 days.
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Your account is connected. New activity will appear automatically.
            </p>
            <div className="text-[11px] text-zinc-500 mt-2 flex items-center justify-center gap-1.5">
              <RefreshCw className="w-3 h-3" />
              Auto-syncs every 4 hours
            </div>
          </div>
        )}

        {/* Done Button */}
        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors font-bold"
        >
          Done
        </button>
      </div>
    );
  };

  // ============================================================================
  // RENDER - Error View
  // ============================================================================

  const renderError = () => (
    <div className="py-8 flex flex-col items-center justify-center gap-6">
      <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border-2 border-red-500/30">
        <AlertCircle className="w-10 h-10 text-red-500" />
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Connection Failed</h2>
        <p className="text-zinc-400 max-w-sm">{error}</p>
      </div>

      <div className="flex gap-3 w-full">
        <button
          onClick={onClose}
          className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            setError('');
            setView('credentials');
          }}
          className="flex-1 px-6 py-3 bg-[#C9A646] hover:bg-[#B39540] text-black rounded-xl transition-colors font-bold"
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
        className="relative max-h-[calc(100vh-32px)] w-full max-w-[460px] overflow-y-auto rounded-[16px] border bg-[#141414] p-4 shadow-[0_0_50px_rgba(201,166,70,0.2)] sm:p-5"
        style={{ borderColor: 'rgba(255, 215, 0, 0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-zinc-400" />
        </button>

        {/* Content */}
        {view === 'instructions' && renderInstructions()}
        {view === 'credentials' && renderCredentials()}
        {view === 'connecting' && renderConnecting()}
        {view === 'success' && renderSuccess()}
        {view === 'error' && renderError()}
      </div>
    </div>
  );
}
