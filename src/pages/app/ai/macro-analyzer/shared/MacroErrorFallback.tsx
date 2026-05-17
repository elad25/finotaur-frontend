// src/pages/app/ai/macro-analyzer/shared/MacroErrorFallback.tsx
// =====================================================
// Fallback UI shown when the MacroAnalyzer ErrorBoundary catches a render error.
// Matches the macro-analyzer dark/gold theme.
// =====================================================

import React from 'react';
import { AlertTriangle } from 'lucide-react';

const hasSentryDsn = Boolean(import.meta.env.VITE_SENTRY_DSN);

export function MacroErrorFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8">
      <div
        className="w-full max-w-md rounded-2xl border border-gold-primary/20 bg-section-base p-8 text-center shadow-[0_18px_54px_rgba(0,0,0,0.4)]"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-gold-primary/20 bg-gold-primary/10">
          <AlertTriangle className="h-7 w-7 text-gold-primary" />
        </div>

        <h2 className="mb-2 text-xl font-bold text-ink-primary">
          Macro Analyzer is temporarily unavailable
        </h2>

        <p className="mb-6 text-sm leading-relaxed text-ink-tertiary">
          We&apos;re working on it. Try again in a moment.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-xl bg-gold-primary px-6 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Try Again
        </button>

        {hasSentryDsn && (
          <p className="mt-4 text-[10px] text-ink-tertiary">Error reported</p>
        )}
      </div>
    </div>
  );
}
