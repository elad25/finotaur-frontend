// src/contexts/FinoChatContext.tsx
// =====================================================
// FINO AI — global open mechanism for the side chat.
// The chat itself lives inside SupportWidget (rebranded
// as FINO AI). This context lets any surface (SubNav, a
// page button, etc.) open that chat and hand it context
// about where the user currently is, without lifting the
// widget's full internal state machine out of the widget.
// =====================================================

import {
  createContext,
  useCallback,
  useContext,
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
  [key: string]: unknown;
}

interface FinoChatValue {
  /** Increments every time something requests the chat to open. */
  openSignal: number;
  /** Open the FINO AI chat, optionally with page context. */
  open: (context?: FinoChatContextData) => void;
  /** Read (and clear) the context handed to the most recent open() call. */
  consumeOpenContext: () => FinoChatContextData | null;
}

const FinoChatContext = createContext<FinoChatValue | null>(null);

export function FinoChatProvider({ children }: { children: ReactNode }) {
  const [openSignal, setOpenSignal] = useState(0);
  const pendingContext = useRef<FinoChatContextData | null>(null);

  const open = useCallback((context?: FinoChatContextData) => {
    pendingContext.current = context ?? null;
    setOpenSignal((n) => n + 1);
  }, []);

  const consumeOpenContext = useCallback(() => {
    const ctx = pendingContext.current;
    pendingContext.current = null;
    return ctx;
  }, []);

  return (
    <FinoChatContext.Provider value={{ openSignal, open, consumeOpenContext }}>
      {children}
    </FinoChatContext.Provider>
  );
}

export function useFinoChat(): FinoChatValue {
  const ctx = useContext(FinoChatContext);
  // Defensive no-op fallback so a component rendered outside the provider
  // never crashes — it just can't open the chat.
  if (!ctx) {
    return {
      openSignal: 0,
      open: () => {},
      consumeOpenContext: () => null,
    };
  }
  return ctx;
}
