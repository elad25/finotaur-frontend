// src/components/broker/BrokerReconnectModal.tsx
// ─────────────────────────────────────────────────────────────────────
// Auto-surfaced modal when a broker connection drops and auto-reconnect
// fails. Forces user attention beyond a dismissible toast.
// ─────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ds/Button';
import { cn } from '@/lib/utils';

export interface BrokerReconnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brokerName: string;
  lastError?: string | null;
  /**
   * Returns `{ success: true }` on a successful one-click reconnect via the
   * stored vault credentials. Returns `{ success: false, requires_credentials: true }`
   * when the vault entry is missing (OQ-87) and the parent should open the
   * fresh-credentials modal (AddBrokerPopup). Returns `{ success: false, error }`
   * for any other failure.
   */
  onReconnect: () => Promise<{
    success: boolean;
    error?: string;
    requires_credentials?: boolean;
  }>;
}

export function BrokerReconnectModal({
  open,
  onOpenChange,
  brokerName,
  lastError,
  onReconnect,
}: BrokerReconnectModalProps) {
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  if (!open) return null;

  async function handleReconnect() {
    setLoading(true);
    setInlineError(null);
    try {
      const result = await onReconnect();
      if (result.success) {
        onOpenChange(false);
        return;
      }
      // OQ-87: parent will swap to the credentials modal; close this one and
      // suppress the inline error so the user doesn't see two error banners.
      if (result.requires_credentials) {
        onOpenChange(false);
        return;
      }
      setInlineError(result.error ?? 'Reconnection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    onOpenChange(false);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-[#111111] border border-[#E36363]/20 rounded-[24px] shadow-[0_0_80px_rgba(227,99,99,0.10)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E36363]/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-[#E36363]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Reconnect {brokerName}
              </h2>
              <p className="text-xs text-zinc-500">Session expired</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Your {brokerName} session has expired. Reconnect with one click —
            your credentials are stored securely and no password re-entry is needed.
          </p>

          {lastError && (
            <p className="text-xs text-[#A0A0A0]">
              Last error:{' '}
              <span className="text-[#E36363]">{lastError}</span>
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <Button
              variant="gold"
              size="full"
              showArrow={false}
              disabled={loading}
              onClick={handleReconnect}
              className={cn(loading && 'opacity-70 cursor-not-allowed')}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Reconnecting...
                </>
              ) : (
                'Reconnect now'
              )}
            </Button>

            <button
              onClick={handleDismiss}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
            >
              Dismiss
            </button>
          </div>

          {/* Inline reconnect error */}
          {inlineError && (
            <div className="flex items-start gap-2 bg-[#E36363]/8 border border-[#E36363]/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 text-[#E36363] flex-shrink-0 mt-0.5" />
              <span className="text-xs text-[#E36363]">{inlineError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
