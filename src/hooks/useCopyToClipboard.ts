// src/hooks/useCopyToClipboard.ts
import { useState, useCallback } from 'react';

/**
 * 🔥 Optimized copy-to-clipboard hook
 * - No toast spam (optional message)
 * - Auto-reset after 2 seconds
 * - TypeScript safe
 */
export function useCopyToClipboard(text: string) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    if (!text) return false;

    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      
      // Auto-reset after 2 seconds
      setTimeout(() => setCopied(false), 2000);
      
      return true;
    } catch (error) {
      console.error('Failed to copy:', error);
      return false;
    }
  }, [text]);

  return { copied, copy };
}