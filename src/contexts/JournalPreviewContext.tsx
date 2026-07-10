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
