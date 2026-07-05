/**
 * analytics/attribution.ts — First-touch + multi-touch marketing attribution.
 *
 * First-touch: captures UTM parameters and referrer on first visit and stores
 * them in localStorage under `fino_first_touch`. Never overwrites an existing
 * entry (first-touch model). Reads are always safe — returns {} on miss/error.
 *
 * Multi-touch: records EVERY ad click-through (not just the first) in
 * localStorage under `fino_touches` as a bounded, deduped array. This lets us
 * see the full chain of ad exposures leading to a signup/checkout, not just
 * the earliest one.
 */

const STORAGE_KEY = 'fino_first_touch';
const TOUCHES_STORAGE_KEY = 'fino_touches';

/** Ad/social platform hostnames whose referrer alone justifies recording a touch. */
const AD_REFERRER_HOSTS = [
  'facebook.com',
  'instagram.com',
  't.co',
  'twitter.com',
  'x.com',
  'l.instagram.com',
  'lm.facebook.com',
  'm.facebook.com',
];

/** Dedupe window: skip recording a new touch if the latest one matches and is younger than this. */
const DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

/** Cap on stored touches — keeps localStorage bounded and payloads lean. */
const MAX_STORED_TOUCHES = 15;

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

/** A single recorded touch in the multi-touch attribution chain. */
export interface Touch {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing_page?: string;
  ts: string;
}

export interface TouchSummary {
  touch_count: number;
  /** Unique utm_content values, in chronological (first-seen) order. */
  ads_clicked: string[];
  /** Unique utm_campaign values, in chronological (first-seen) order. */
  campaigns: string[];
  first_touch_ts?: string;
  last_touch_ts?: string;
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

/**
 * Record a touch in the multi-touch attribution chain, if this page load
 * carries genuine ad/campaign signal (a utm_* param, or a referrer from a
 * known ad/social platform).
 *
 * Unlike captureFirstTouch, this is NOT idempotent-once — every qualifying
 * page load appends a new touch, so the full click chain (multiple ad
 * exposures across sessions) is preserved. To avoid noise from redirect
 * chains / page refreshes, an entry is skipped if the newest existing touch
 * has the same utm_content + utm_campaign and is younger than
 * DEDUPE_WINDOW_MS. The stored array is capped at MAX_STORED_TOUCHES
 * (oldest entries drop off first).
 *
 * Safe in private-browsing mode (try/catch around all localStorage ops).
 * No-ops in SSR environments.
 */
export function captureTouch(): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const utm_source = params.get('utm_source') ?? undefined;
  const utm_medium = params.get('utm_medium') ?? undefined;
  const utm_campaign = params.get('utm_campaign') ?? undefined;
  const utm_content = params.get('utm_content') ?? undefined;
  const utm_term = params.get('utm_term') ?? undefined;

  const hasUtm = !!(utm_source || utm_medium || utm_campaign || utm_content || utm_term);

  // Only record external referrers (different host → genuine traffic source).
  let referrer: string | undefined;
  let isAdReferrer = false;
  try {
    const ref = document.referrer;
    if (ref) {
      const refHost = new URL(ref).hostname;
      if (refHost && refHost !== window.location.hostname) {
        referrer = ref;
        isAdReferrer = AD_REFERRER_HOSTS.some(
          (host) => refHost === host || refHost.endsWith(`.${host}`),
        );
      }
    }
  } catch {
    // Malformed referrer URL — ignore.
  }

  // Only record a touch when there's genuine ad/campaign signal — a utm_*
  // param, or a referrer from a known ad/social platform.
  if (!hasUtm && !isAdReferrer) return;

  const touch: Touch = {
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
    const existing = getTouches();

    // Dedupe: skip if the newest touch matches on utm_content + utm_campaign
    // and is younger than the dedupe window (redirect chains / refreshes).
    const newest = existing[existing.length - 1];
    if (newest) {
      const sameAd =
        (newest.utm_content ?? undefined) === (touch.utm_content ?? undefined) &&
        (newest.utm_campaign ?? undefined) === (touch.utm_campaign ?? undefined);
      const newestTs = newest.ts ? Date.parse(newest.ts) : NaN;
      const isRecent = !Number.isNaN(newestTs) && Date.now() - newestTs < DEDUPE_WINDOW_MS;
      if (sameAd && isRecent) return;
    }

    const updated = [...existing, touch].slice(-MAX_STORED_TOUCHES);
    window.localStorage.setItem(TOUCHES_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage quota exceeded or private mode — silently skip.
  }
}

/**
 * Read the stored multi-touch attribution chain.
 * Returns [] if nothing was stored, on any parse error, or if the stored
 * value isn't an array.
 */
export function getTouches(): Touch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(TOUCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Touch[]) : [];
  } catch {
    return [];
  }
}

/**
 * Summarize the stored touch chain for analytics payloads.
 * Null-safe — returns zeroed/empty values if no touches are stored.
 */
export function getTouchSummary(): TouchSummary {
  const touches = getTouches();

  const adsClicked: string[] = [];
  const campaigns: string[] = [];
  for (const touch of touches) {
    if (touch.utm_content && !adsClicked.includes(touch.utm_content)) {
      adsClicked.push(touch.utm_content);
    }
    if (touch.utm_campaign && !campaigns.includes(touch.utm_campaign)) {
      campaigns.push(touch.utm_campaign);
    }
  }

  return {
    touch_count: touches.length,
    ads_clicked: adsClicked,
    campaigns,
    first_touch_ts: touches[0]?.ts,
    last_touch_ts: touches[touches.length - 1]?.ts,
  };
}
