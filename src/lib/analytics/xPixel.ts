/**
 * xPixel.ts — X (Twitter) website conversion pixel integration.
 *
 * Zero network calls on import.  All side effects are gated behind
 * initXPixel() which must only be called after the user grants analytics
 * consent (same gate as GA4/PostHog — see analytics/index.ts).
 */

// ─── Window augmentation ─────────────────────────────────────────────────────

declare global {
  interface Window {
    twq?: (...args: unknown[]) => void;
  }
}

// ─── Internal state ───────────────────────────────────────────────────────────

const SCRIPT_ID = 'finotaur-x-pixel-script';
const SCRIPT_SRC = 'https://static.ads-twitter.com/uwt.js';

let _initialized = false;

// ─── Env var helpers ──────────────────────────────────────────────────────────

function xPixelId(): string | null {
  return import.meta.env.VITE_X_PIXEL_ID || null;
}

function xSignupEventId(): string | null {
  return import.meta.env.VITE_X_SIGNUP_EVENT_ID || null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Injects the standard X (Twitter) uwt.js snippet and configures the pixel
 * for the given ID.  No-op if VITE_X_PIXEL_ID is unset.  Idempotent — calling
 * twice has no effect.
 */
export function initXPixel(): void {
  const pixelId = xPixelId();
  if (!pixelId) return;
  if (_initialized) return;
  if (document.getElementById(SCRIPT_ID)) return;

  // Set up the twq queue shim before the script loads so no events are lost,
  // mirroring the gtag dataLayer-queue pattern in ga4.ts.
  const queue: unknown[][] = [];
  const twq = function twq(...args: unknown[]) {
    queue.push(args);
  } as Window['twq'] & { queue: unknown[][]; version: string };
  twq.queue = queue;
  twq.version = '1.1';
  window.twq = twq;

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = SCRIPT_SRC;
  document.head.appendChild(script);

  window.twq('config', pixelId);

  _initialized = true;

  if (import.meta.env.DEV) console.debug('[xPixel] initialized', pixelId);
}

/**
 * Fires the X signup conversion event.
 * No-op if VITE_X_PIXEL_ID or VITE_X_SIGNUP_EVENT_ID is unset, or if the
 * pixel has not been initialized (e.g. consent not yet granted).
 */
export function trackXSignup(params?: Record<string, unknown>): void {
  const pixelId = xPixelId();
  const signupEventId = xSignupEventId();
  if (!pixelId || !signupEventId) return;
  if (!window.twq) return;

  const eventTag = signupEventId.startsWith('tw-')
    ? signupEventId
    : `tw-${pixelId}-${signupEventId}`;

  window.twq('event', eventTag, params ?? {});

  if (import.meta.env.DEV) console.debug('[xPixel] signup tracked', eventTag);
}
