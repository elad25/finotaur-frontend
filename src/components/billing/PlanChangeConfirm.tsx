// src/components/billing/PlanChangeConfirm.tsx
// ============================================================
// App-wide confirmation popup for subscription plan changes.
// A single <PlanChangeConfirmHost/> is mounted once at the app root;
// any code can trigger it imperatively via confirmPlanChange(...) which
// resolves to true (confirmed) or false (dismissed). Used by
// useWhopCheckout for the downgrade-block notice and the yearly-upgrade
// forfeit confirmation, so the message is a centered modal — not a toast.
// ============================================================

import { useEffect, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

type Tone = 'warn' | 'info';

interface Prompt {
  title: string;
  message: string;
  /** When set → confirm/cancel modal. When absent → info-only (single button). */
  confirmLabel?: string;
  cancelLabel?: string;
  tone: Tone;
  resolve: (confirmed: boolean) => void;
}

let emit: ((p: Prompt | null) => void) | null = null;

/**
 * Show the plan-change modal. Resolves true if the user confirms, false if
 * they dismiss (or if the host is not mounted). For info-only prompts (no
 * confirmLabel) the single button resolves false — callers just ignore it.
 */
export function confirmPlanChange(opts: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
}): Promise<boolean> {
  return new Promise((resolve) => {
    if (!emit) {
      resolve(false);
      return;
    }
    emit({
      title: opts.title,
      message: opts.message,
      confirmLabel: opts.confirmLabel,
      cancelLabel: opts.cancelLabel,
      tone: opts.tone ?? 'warn',
      resolve,
    });
  });
}

export function PlanChangeConfirmHost() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);

  useEffect(() => {
    emit = setPrompt;
    return () => {
      emit = null;
    };
  }, []);

  if (!prompt) return null;

  const isInfo = !prompt.confirmLabel;
  const accent = prompt.tone === 'info' ? '#60A5FA' : '#C9A646';
  const Icon = prompt.tone === 'info' ? Info : AlertTriangle;

  const close = (confirmed: boolean) => {
    prompt.resolve(confirmed);
    setPrompt(null);
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={() => close(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl border bg-[#0F0F0F] p-6 shadow-2xl"
        style={{ borderColor: `${accent}40` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start gap-3">
          <span
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: `${accent}1A`, color: accent }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <h3 className="pt-1.5 text-lg font-semibold text-white">{prompt.title}</h3>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-zinc-300">{prompt.message}</p>

        <div className="flex justify-end gap-2.5">
          {!isInfo && (
            <button
              type="button"
              onClick={() => close(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5"
            >
              {prompt.cancelLabel ?? 'Keep my plan'}
            </button>
          )}
          <button
            type="button"
            onClick={() => close(!isInfo)}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: accent, color: '#1A1A1A' }}
          >
            {isInfo ? prompt.cancelLabel ?? 'Got it' : prompt.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
