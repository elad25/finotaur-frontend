// src/lib/sanitizeHtml.ts
// Thin wrapper around DOMPurify for safe dangerouslySetInnerHTML use.
// Import this wherever user/API-supplied HTML is rendered.

import DOMPurify from 'dompurify';

/**
 * Sanitize an HTML string before passing to dangerouslySetInnerHTML.
 * Strips script tags, event handlers, and other XSS vectors.
 *
 * @param dirty - Raw HTML string from an API, CMS, or AI model.
 * @returns A sanitized HTML string safe for DOM insertion.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
  });
}
