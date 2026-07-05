/**
 * metaPixel.ts — Meta (Facebook) website conversion pixel integration.
 *
 * Zero network calls on import.  All side effects are gated behind
 * initMetaPixel() which must only be called after the user grants analytics
 * consent (same gate as GA4/PostHog — see analytics/index.ts).
 */

// ─── Window augmentation ─────────────────────────────────────────────────────

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// ─── Internal state ───────────────────────────────────────────────────────────

const SCRIPT_ID = 'finotaur-meta-pixel-script';
const SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

let _initialized = false;

// ─── Env var helpers ──────────────────────────────────────────────────────────

function metaPixelId(): string | null {
  return import.meta.env.VITE_META_PIXEL_ID || null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Injects the standard Meta fbevents.js snippet, initialises the pixel for
 * the given ID, and fires an initial PageView.  No-op if VITE_META_PIXEL_ID
 * is unset.  Idempotent — calling twice has no effect.
 */
export function initMetaPixel(): void {
  const pixelId = metaPixelId();
  if (!pixelId) return;
  if (_initialized) return;
  if (document.getElementById(SCRIPT_ID)) return;

  // Set up the fbq queue shim before the script loads so no events are lost,
  // mirroring the gtag dataLayer-queue pattern in ga4.ts.
  const queue: unknown[][] = [];
  const fbq = function fbq(...args: unknown[]) {
    queue.push(args);
  } as Window['fbq'] & { queue: unknown[][]; loaded: boolean; version: string };
  fbq.queue = queue;
  fbq.loaded = true;
  fbq.version = '2.0';
  window.fbq = fbq;

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = SCRIPT_SRC;
  document.head.appendChild(script);

  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');

  _initialized = true;

  if (import.meta.env.DEV) console.debug('[metaPixel] initialized', pixelId);
}

/**
 * Fires the Meta signup conversion event (CompleteRegistration).
 * No-op if VITE_META_PIXEL_ID is unset, or if the pixel has not been
 * initialized (e.g. consent not yet granted).
 */
export function trackMetaSignup(): void {
  if (!metaPixelId()) return;
  if (!window.fbq) return;

  window.fbq('track', 'CompleteRegistration');

  if (import.meta.env.DEV) console.debug('[metaPixel] signup tracked');
}

/**
 * Fires a PageView event for the given SPA route.
 * No-op if VITE_META_PIXEL_ID is unset, or if the pixel has not been
 * initialized (e.g. consent not yet granted). initMetaPixel() already fires
 * one PageView at boot — call this on every subsequent route change so
 * retargeting audiences ("Website visitors") pick up navigation within the SPA.
 */
export function trackMetaPageView(path?: string): void {
  if (!metaPixelId()) return;
  if (!window.fbq) return;

  window.fbq('track', 'PageView');

  if (import.meta.env.DEV) console.debug('[metaPixel] pageview tracked', path);
}
