/**
 * ga4.ts — Google Analytics 4 integration.
 *
 * Zero network calls on import.  All side effects are gated behind
 * initGA4() which must only be called after the user grants analytics consent.
 */

// ─── Window augmentation ─────────────────────────────────────────────────────

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

// ─── Internal state ───────────────────────────────────────────────────────────

const SCRIPT_ID = 'finotaur-ga4-script';

let _initialized = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Injects the gtag.js script and initialises GA4 for the given measurement ID.
 * Idempotent — calling twice with the same ID has no effect.
 */
export function initGA4(measurementId: string): void {
  if (_initialized) return;
  if (document.getElementById(SCRIPT_ID)) return;

  // Set up dataLayer before the script loads so no events are lost.
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window.gtag as any)('js', new Date());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window.gtag as any)('config', measurementId, {
    // Do not send an automatic pageview here; the analytics orchestrator handles it.
    send_page_view: false,
  });

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  _initialized = true;

  if (import.meta.env.DEV) console.debug('[ga4] initialized', measurementId);
}

/**
 * Removes the gtag script, clears the dataLayer, and replaces gtag with a
 * no-op.  Called when the user revokes analytics consent.
 */
export function destroyGA4(): void {
  const script = document.getElementById(SCRIPT_ID);
  if (script) script.remove();

  window.dataLayer = [];
  window.gtag = () => undefined;

  _initialized = false;

  if (import.meta.env.DEV) console.debug('[ga4] destroyed');
}

/**
 * Sends a page_view event.
 * @param path  e.g. "/app/journal/overview"
 */
export function trackPageView(path: string): void {
  if (!window.gtag) return;
  window.gtag('event', 'page_view', { page_path: path });
}

/**
 * Sends a named custom event with optional parameters.
 */
export function trackEvent(
  name: string,
  params?: Record<string, unknown>,
): void {
  if (!window.gtag) return;
  window.gtag('event', name, params ?? {});
}
