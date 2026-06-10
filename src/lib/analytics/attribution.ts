/**
 * analytics/attribution.ts — First-touch marketing attribution.
 *
 * Captures UTM parameters and referrer on first visit and stores them in
 * localStorage under `fino_first_touch`. Never overwrites an existing entry
 * (first-touch model). Reads are always safe — returns {} on miss/error.
 */

const STORAGE_KEY = 'fino_first_touch';

export interface FirstTouch {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing_page?: string;
  ts?: string;
}

/**
 * Capture first-touch attribution on app load.
 * Reads UTMs from the current URL and referrer (external only).
 * Stores to localStorage once — never overwrites an existing entry.
 * Safe in private-browsing mode (try/catch around all localStorage ops).
 * No-ops in SSR environments.
 */
export function captureFirstTouch(): void {
  if (typeof window === 'undefined') return;

  try {
    // Don't overwrite an existing first-touch entry.
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return;
  } catch {
    // localStorage unavailable (private mode) — bail out silently.
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const utm_source = params.get('utm_source') ?? undefined;
  const utm_medium = params.get('utm_medium') ?? undefined;
  const utm_campaign = params.get('utm_campaign') ?? undefined;
  const utm_content = params.get('utm_content') ?? undefined;
  const utm_term = params.get('utm_term') ?? undefined;

  // Only record external referrers (different host → genuine traffic source).
  let referrer: string | undefined;
  try {
    const ref = document.referrer;
    if (ref) {
      const refHost = new URL(ref).hostname;
      if (refHost && refHost !== window.location.hostname) {
        referrer = ref;
      }
    }
  } catch {
    // Malformed referrer URL — ignore.
  }

  // Nothing to record if no UTMs and no external referrer.
  const hasData =
    utm_source ||
    utm_medium ||
    utm_campaign ||
    utm_content ||
    utm_term ||
    referrer;

  if (!hasData) return;

  const touch: FirstTouch = {
    ...(utm_source ? { utm_source } : {}),
    ...(utm_medium ? { utm_medium } : {}),
    ...(utm_campaign ? { utm_campaign } : {}),
    ...(utm_content ? { utm_content } : {}),
    ...(utm_term ? { utm_term } : {}),
    ...(referrer ? { referrer } : {}),
    landing_page: window.location.pathname,
    ts: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(touch));
  } catch {
    // Storage quota exceeded or private mode — silently skip.
  }
}

/**
 * Read the stored first-touch attribution object.
 * Returns {} if nothing was stored or on any parse error.
 */
export function getFirstTouch(): FirstTouch {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    // JSON.parse returns `unknown`; we cast and validate shape at the call site.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- external data, shape validated at call site
    return (JSON.parse(raw) as any) ?? {};
  } catch {
    return {};
  }
}
