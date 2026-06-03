// src/contexts/FinoChatContext.tsx
// =====================================================
// FINO AI — global open mechanism + page-context registry for the side chat.
// The chat itself lives inside the FINO drawer. This context lets any surface
// (SubNav, a page button, etc.) open that chat, and lets any page register the
// context FINO should always have about where the user currently is — so FINO
// can give page-aware, data-grounded answers instead of generic ones.
// =====================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface FinoChatContextData {
  /** The route the user opened FINO from (e.g. /app/ai/stock-analyzer). */
  path?: string;
  /** Optional entity the page is about (ticker, symbol). */
  ticker?: string;
  /** Free-form label describing the current surface. */
  label?: string;
  /** Optional prompt to auto-submit when the drawer opens. */
  query?: string;
  [key: string]: unknown;
}

/** Page-specific structured data FINO should know about on the current screen. */
export type FinoPageData = Record<string, unknown>;

interface FinoChatValue {
  /** Increments every time something requests the chat to open. */
  openSignal: number;
  /** Open the FINO AI chat, optionally with page context. */
  open: (context?: FinoChatContextData) => void;
  /** Read (and clear) the context handed to the most recent open() call. */
  consumeOpenContext: () => FinoChatContextData | null;
  /** Register the page-specific data FINO should always have for the current screen. */
  setPageData: (data: FinoPageData | null) => void;
  /** Read the page-specific data currently registered (null if none). */
  getPageData: () => FinoPageData | null;
}

const FinoChatContext = createContext<FinoChatValue | null>(null);

export function FinoChatProvider({ children }: { children: ReactNode }) {
  const [openSignal, setOpenSignal] = useState(0);
  const pendingContext = useRef<FinoChatContextData | null>(null);
  const pageData = useRef<FinoPageData | null>(null);

  const open = useCallback((context?: FinoChatContextData) => {
    pendingContext.current = context ?? null;
    setOpenSignal((n) => n + 1);
  }, []);

  const consumeOpenContext = useCallback(() => {
    const ctx = pendingContext.current;
    pendingContext.current = null;
    return ctx;
  }, []);

  const setPageData = useCallback((data: FinoPageData | null) => {
    pageData.current = data;
  }, []);

  const getPageData = useCallback(() => pageData.current, []);

  return (
    <FinoChatContext.Provider
      value={{ openSignal, open, consumeOpenContext, setPageData, getPageData }}
    >
      {children}
    </FinoChatContext.Provider>
  );
}

export function useFinoChat(): FinoChatValue {
  const ctx = useContext(FinoChatContext);
  // Defensive no-op fallback so a component rendered outside the provider
  // never crashes — it just can't open the chat or register context.
  if (!ctx) {
    return {
      openSignal: 0,
      open: () => {},
      consumeOpenContext: () => null,
      setPageData: () => {},
      getPageData: () => null,
    };
  }
  return ctx;
}

/**
 * Register page-specific data FINO should know about while this component is
 * mounted. Pass the data (re-registers whenever it changes); the registration
 * is cleared on unmount so stale page data never leaks into another screen.
 *
 * Example: `useRegisterFinoContext({ summary, entity })` inside a journal page.
 */
export function useRegisterFinoContext(data: FinoPageData | null): void {
  const { setPageData } = useFinoChat();
  // Depend on a stable content signature, not object identity — pages often
  // rebuild the data object each render, and we don't want to thrash the ref.
  const signature = data ? JSON.stringify(data) : null;
  useEffect(() => {
    setPageData(data);
    return () => setPageData(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPageData, signature]);
}
