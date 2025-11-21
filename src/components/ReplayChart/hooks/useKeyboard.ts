// hooks/useKeyboard.ts
import { useEffect, useCallback } from 'react';

export interface KeyboardCallbacks {
  // Playback
  onTogglePlay?: () => void;
  onStepForward?: () => void;
  onStepBackward?: () => void;
  onSpeedUp?: () => void;
  onSpeedDown?: () => void;
  
  // Tools
  onSelectCursor?: () => void;
  onSelectCrosshair?: () => void;
  onSelectTrendline?: () => void;
  onSelectHorizontal?: () => void;
  onSelectVertical?: () => void;
  onSelectRay?: () => void;
  onSelectFibonacci?: () => void;
  
  // Actions
  onDeleteSelected?: () => void;
  onCancel?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  
  // Trading
  onOpenBuyOrder?: () => void;
  onOpenSellOrder?: () => void;
  onCloseAllPositions?: () => void;
  
  // View
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
}

/**
 * ===================================
 * USE KEYBOARD HOOK
 * Manages keyboard shortcuts
 * ===================================
 */
export const useKeyboard = (callbacks: KeyboardCallbacks) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if user is typing in an input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return;
    }

    const key = e.key.toLowerCase();
    const ctrlKey = e.ctrlKey || e.metaKey;
    const shiftKey = e.shiftKey;

    // Prevent default for shortcuts we handle
    const shouldPreventDefault = () => {
      if (key === ' ') return true;
      if (key.startsWith('arrow')) return true;
      if (ctrlKey && ['z', 'c', 'v', '+', '-', '0'].includes(key)) return true;
      return false;
    };

    if (shouldPreventDefault()) {
      e.preventDefault();
    }

    // Playback controls
    if (key === ' ' && !ctrlKey && !shiftKey) {
      callbacks.onTogglePlay?.();
      return;
    }

    if (key === 'arrowright' && !ctrlKey && !shiftKey) {
      callbacks.onStepForward?.();
      return;
    }

    if (key === 'arrowleft' && !ctrlKey && !shiftKey) {
      callbacks.onStepBackward?.();
      return;
    }

    if (key === 'arrowup' && !ctrlKey && !shiftKey) {
      callbacks.onSpeedUp?.();
      return;
    }

    if (key === 'arrowdown' && !ctrlKey && !shiftKey) {
      callbacks.onSpeedDown?.();
      return;
    }

    // Tools
    if (key === 'c' && !ctrlKey) {
      callbacks.onSelectCursor?.();
      return;
    }

    if (key === 'x' && !ctrlKey) {
      callbacks.onSelectCrosshair?.();
      return;
    }

    if (key === 't' && !ctrlKey) {
      callbacks.onSelectTrendline?.();
      return;
    }

    if (key === 'h' && !ctrlKey) {
      callbacks.onSelectHorizontal?.();
      return;
    }

    if (key === 'v' && !ctrlKey) {
      callbacks.onSelectVertical?.();
      return;
    }

    if (key === 'r' && !ctrlKey) {
      callbacks.onSelectRay?.();
      return;
    }

    if (key === 'f' && !ctrlKey) {
      callbacks.onSelectFibonacci?.();
      return;
    }

    // Actions
    if (key === 'delete' || key === 'backspace') {
      callbacks.onDeleteSelected?.();
      return;
    }

    if (key === 'escape') {
      callbacks.onCancel?.();
      return;
    }

    if (key === 'z' && ctrlKey && !shiftKey) {
      callbacks.onUndo?.();
      return;
    }

    if (key === 'z' && ctrlKey && shiftKey) {
      callbacks.onRedo?.();
      return;
    }

    if (key === 'c' && ctrlKey) {
      callbacks.onCopy?.();
      return;
    }

    if (key === 'v' && ctrlKey) {
      callbacks.onPaste?.();
      return;
    }

    // Trading
    if (key === 'b' && !ctrlKey) {
      callbacks.onOpenBuyOrder?.();
      return;
    }

    if (key === 's' && !ctrlKey) {
      callbacks.onOpenSellOrder?.();
      return;
    }

    if (key === 'q' && !ctrlKey) {
      callbacks.onCloseAllPositions?.();
      return;
    }

    // View
    if (key === '=' && ctrlKey) {
      callbacks.onZoomIn?.();
      return;
    }

    if (key === '-' && ctrlKey) {
      callbacks.onZoomOut?.();
      return;
    }

    if (key === '0' && ctrlKey) {
      callbacks.onResetZoom?.();
      return;
    }
  }, [callbacks]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};