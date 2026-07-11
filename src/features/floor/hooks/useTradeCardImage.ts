// src/features/floor/hooks/useTradeCardImage.ts
// Exports a DOM node (the branded TradeBusinessCard) to a PNG image via
// html2canvas, for download / clipboard-copy / native Web Share.

import { useCallback, useState } from 'react';
import html2canvas from 'html2canvas';

async function elementToBlob(el: HTMLElement): Promise<Blob | null> {
  const canvas = await html2canvas(el, {
    backgroundColor: null,      // keep transparent around the rounded card
    scale: 2,                   // retina
    useCORS: true,
    allowTaint: true,
    logging: false,
  });
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

export interface UseTradeCardImage {
  busy: boolean;
  /** true when the browser can share files via the Web Share API */
  canNativeShare: boolean;
  download: (el: HTMLElement | null, filename?: string) => Promise<void>;
  copyToClipboard: (el: HTMLElement | null) => Promise<boolean>;
  nativeShare: (el: HTMLElement | null, opts?: { title?: string; text?: string; filename?: string }) => Promise<boolean>;
}

export function useTradeCardImage(): UseTradeCardImage {
  const [busy, setBusy] = useState(false);

  const canNativeShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    // canShare with a probe file — presence check only
    (() => {
      try {
        return navigator.canShare({ files: [new File([], 'x.png', { type: 'image/png' })] });
      } catch {
        return false;
      }
    })();

  const download = useCallback(async (el: HTMLElement | null, filename = 'finotaur-trade.png') => {
    if (!el) return;
    setBusy(true);
    try {
      const blob = await elementToBlob(el);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }, []);

  const copyToClipboard = useCallback(async (el: HTMLElement | null) => {
    if (!el) return false;
    setBusy(true);
    try {
      const blob = await elementToBlob(el);
      if (!blob) return false;
      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return false;
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const nativeShare = useCallback(async (
    el: HTMLElement | null,
    opts?: { title?: string; text?: string; filename?: string },
  ) => {
    if (!el) return false;
    setBusy(true);
    try {
      const blob = await elementToBlob(el);
      if (!blob) return false;
      const file = new File([blob], opts?.filename ?? 'finotaur-trade.png', { type: 'image/png' });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: opts?.title, text: opts?.text });
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, canNativeShare, download, copyToClipboard, nativeShare };
}
