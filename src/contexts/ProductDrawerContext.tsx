// src/contexts/ProductDrawerContext.tsx
// =====================================================
// Product Drawer — open/close state shared between
// the ☰ hamburger in TopNav and the drawer rendered
// at layout level.
// SSR-safe: no window/document access; pure React state.
// =====================================================

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ProductDrawerContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** true while the onboarding spotlight tour is running */
  tourMode: boolean;
  setTourMode: (v: boolean) => void;
}

const ProductDrawerContext = createContext<ProductDrawerContextValue | null>(null);

export function ProductDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tourMode, setTourMode] = useState(false);

  const open   = useCallback(() => setIsOpen(true),  []);
  const close  = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <ProductDrawerContext.Provider value={{ isOpen, open, close, toggle, tourMode, setTourMode }}>
      {children}
    </ProductDrawerContext.Provider>
  );
}

export function useProductDrawer(): ProductDrawerContextValue {
  const ctx = useContext(ProductDrawerContext);
  if (!ctx) {
    throw new Error('useProductDrawer must be used inside <ProductDrawerProvider>');
  }
  return ctx;
}
