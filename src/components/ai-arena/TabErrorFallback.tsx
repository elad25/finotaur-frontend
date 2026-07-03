// src/components/ai-arena/TabErrorFallback.tsx
// =====================================================
// Compact fallback UI for a single AI Arena tab's ErrorBoundary.
// Mirrors src/pages/app/ai/macro-analyzer/shared/MacroErrorFallback.tsx
// but is generic (no macro-specific copy) so it can be reused across
// Flow Scanner, Options Intelligence, Sector Analyzer, etc.
// =====================================================

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface TabErrorFallbackProps {
  /** Optional tab-specific label, e.g. "Dark Pool tab". Defaults to a generic message. */
  label?: string;
}

export function TabErrorFallback({ label }: TabErrorFallbackProps) {
  return (
    <div className="flex min-h-[30vh] items-center justify-center p-8">
      <div className="w-full max-w-md rounded-2xl border border-gold-primary/20 bg-section-base p-8 text-center shadow-[0_18px_54px_rgba(0,0,0,0.4)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-gold-primary/20 bg-gold-primary/10">
          <AlertTriangle className="h-7 w-7 text-gold-primary" />
        </div>

        <h2 className="mb-2 text-xl font-bold text-ink-primary">
          {label ? `${label} is temporarily unavailable` : 'This tab is temporarily unavailable'}
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
      </div>
    </div>
  );
}
