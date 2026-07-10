// src/contexts/JournalPreviewContext.tsx
// =====================================================
// 🔒 JOURNAL PREVIEW CONTEXT
// =====================================================
// Tiny, dependency-free context so any hook (useTradesData, useCopierDemoMode,
// etc.) can ask "am I being rendered inside a free-tier preview gate?" without
// importing JournalFeatureGate.tsx itself (which pulls in useSubscription,
// react-router, and Lucide icons — importing it from a data hook would risk a
// cycle). Default value is { isPreview: false }, so any consumer rendered
// outside the provider (tests, other routes) behaves exactly as before.
// =====================================================

import { createContext, useContext } from 'react';

export interface JournalPreviewContextValue {
  isPreview: boolean;
}

export const JournalPreviewContext = createContext<JournalPreviewContextValue>({
  isPreview: false,
});

export function useJournalPreview(): JournalPreviewContextValue {
  return useContext(JournalPreviewContext);
}

// =====================================================
// 🔒 FREE-TIER PREVIEW PATHS
// =====================================================
// The gated journal pages (JournalFeatureGate) render their own preview
// banner for free-tier users. The layout-level DemoBanner (mounted above
// the route tree in ProtectedAppLayout, where JournalPreviewContext is not
// available) must be suppressed on these paths for free users so only ONE
// banner strip shows. Kept here (not in JournalFeatureGate.tsx) so the
// layout can import a tiny, dependency-free helper without pulling in
// useSubscription / react-router / Lucide.
// =====================================================

export const FREE_PREVIEW_JOURNAL_PATHS = [
  '/app/journal/trade-compare',
  '/app/journal/revenge-radar',
];

export const isFreePreviewJournalPath = (pathname: string): boolean =>
  FREE_PREVIEW_JOURNAL_PATHS.some((p) => pathname.startsWith(p));
