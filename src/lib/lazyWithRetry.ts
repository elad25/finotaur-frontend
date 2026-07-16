// src/lib/lazyWithRetry.ts
// Drop-in replacement for React.lazy that survives the two production failure
// modes we observed on /app/copy-trade/overview (Sentry 122956075, 2026-05-27):
//
//   1. Stale chunk cache after a deploy — the user's browser holds a main bundle
//      that references chunk hashes from a different build. The dynamic import()
//      rejects with "Failed to fetch dynamically imported module" /
//      "Loading chunk N failed". React.lazy then surfaces it as
//      "TypeError: Cannot read properties of undefined (reading 'default')"
//      because the resolved module object is undefined.
//
//   2. Module loaded but lacks a `default` export — e.g. a `.then(m => ({
//      default: m.SomeNamedExport }))` where SomeNamedExport was renamed away
//      and is now undefined. React would render `undefined` as a component
//      with a misleading stack.
//
// Both modes are masked by a generic "undefined.default" error in production
// minified bundles, which makes Sentry triage painful. This helper:
//   - retries the import twice with backoff (handles transient network blips)
//   - on persistent chunk-load failure, one-shot reloads the page so the
//     browser picks up the fresh manifest (sessionStorage guards against an
//     infinite reload loop if the new deploy is genuinely broken)
//   - if the module resolves but has no default export, throws a clear error
//     that names the file path — far easier to debug than "undefined.default"
//
// Usage: import { lazy } from '@/lib/lazyWithRetry' instead of from 'react'.

import { lazy as reactLazy, type ComponentType, type LazyExoticComponent } from 'react';

const RELOAD_STATE_KEY = '__finotaur_lazy_reload__';
const RELOAD_WINDOW_MS = 2 * 60 * 1000;
const RELOAD_MAX_ATTEMPTS = 3;

type ModuleWithDefault<T> = { default: T };

const CHUNK_ERROR_PATTERN =
  /Loading chunk|Loading CSS chunk|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to load module script|Expected a JavaScript|module script but the server responded|MIME type/i;

function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return CHUNK_ERROR_PATTERN.test(msg);
}

/**
 * Force-revalidate every already-loaded /assets/* module URL so the browser
 * OVERWRITES any poisoned immutable entry (text/html cached under a .js URL) —
 * a plain location.reload() does NOT reliably evict an `immutable`-cached entry,
 * which is why the app used to white-screen permanently after a bad deploy
 * window. `cache: 'reload'` forces a network fetch that replaces the cache
 * entry; after the edge fix (functions/assets/[[path]].ts) that URL now returns
 * either the real chunk or a clean 404, both of which break the poison loop.
 * Best-effort: never throws, never blocks the reload.
 */
async function evictPoisonedAssetCache(): Promise<void> {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  try {
    const urls = Array.from(
      new Set(
        performance
          .getEntriesByType('resource')
          .map((e) => e.name)
          .filter((u) => u.includes('/assets/') && /\.(js|mjs|css)(\?|$)/.test(u)),
      ),
    );
    await Promise.allSettled(urls.map((u) => fetch(u, { cache: 'reload' })));
  } catch {
    /* best-effort — never block the reload */
  }
}

function safeSessionReloadState(): { canReload: () => boolean; markReload: () => void; clear: () => void } {
  // sessionStorage can throw in private-mode Safari and some embedded WebViews.
  // Fall back to an in-memory flag (best-effort) so the helper still works.
  let memoryState = { firstAt: 0, attempts: 0 };
  const parse = (raw: string | null) => {
    try {
      const state = raw ? JSON.parse(raw) : null;
      return {
        firstAt: Number(state?.firstAt || 0),
        attempts: Number(state?.attempts || 0),
      };
    } catch {
      return { firstAt: 0, attempts: 0 };
    }
  };
  const canReloadState = (state: { firstAt: number; attempts: number }) => (
    Date.now() - state.firstAt > RELOAD_WINDOW_MS || state.attempts < RELOAD_MAX_ATTEMPTS
  );
  const nextState = (state: { firstAt: number; attempts: number }) => {
    const now = Date.now();
    if (now - state.firstAt > RELOAD_WINDOW_MS) return { firstAt: now, attempts: 1 };
    return { firstAt: state.firstAt || now, attempts: state.attempts + 1 };
  };
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return {
        canReload: () => canReloadState(memoryState),
        markReload: () => { memoryState = nextState(memoryState); },
        clear: () => { memoryState = { firstAt: 0, attempts: 0 }; },
      };
    }
    return {
      canReload: () => canReloadState(parse(window.sessionStorage.getItem(RELOAD_STATE_KEY))),
      markReload: () => {
        const state = nextState(parse(window.sessionStorage.getItem(RELOAD_STATE_KEY)));
        window.sessionStorage.setItem(RELOAD_STATE_KEY, JSON.stringify(state));
      },
      clear: () => window.sessionStorage.removeItem(RELOAD_STATE_KEY),
    };
  } catch {
    return {
      canReload: () => canReloadState(memoryState),
      markReload: () => { memoryState = nextState(memoryState); },
      clear: () => { memoryState = { firstAt: 0, attempts: 0 }; },
    };
  }
}

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<ModuleWithDefault<T>>,
): LazyExoticComponent<T> {
  return reactLazy(async () => {
    const reloadState = safeSessionReloadState();
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const mod = await factory();
        if (!mod || typeof (mod as any).default === 'undefined') {
          // A build-time guard (assertLazyImportsHaveDefault in vite.config.ts)
          // already PROVES every lazy import has a default export. So a MISSING
          // default at runtime cannot be a code/build problem — it means the
          // import resolved to the wrong bytes: the SPA index.html shell served
          // (text/html) for an /assets/<hash>.js URL during deploy propagation
          // or from a poisoned immutable cache. Treat it as a chunk-load failure
          // (message matches CHUNK_ERROR_PATTERN) so the recovery path below
          // cache-busts and reloads instead of hard-crashing the whole app.
          throw new Error(
            '[lazyWithRetry] Module resolved without a `default` export — the ' +
            'index.html shell was likely served for a hashed chunk (deploy ' +
            'propagation / poisoned cache). Failed to fetch dynamically imported module.',
          );
        }
        reloadState.clear();
        return mod;
      } catch (err) {
        lastError = err;
        if (!isChunkLoadError(err) || attempt === maxAttempts - 1) break;
        // 200ms, 600ms — short enough to feel like a slow first paint, long
        // enough to clear a transient network blip or a CDN edge miss.
        await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1) ** 2));
      }
    }

    // All attempts failed. If this is a chunk-load error, the user likely has a
    // stale main bundle pointing at chunks that no longer exist on the CDN.
    // Force a small number of reloads to pick up the new manifest. Cloudflare
    // Pages can briefly serve a fresh entry chunk before every dynamic chunk is
    // available on that edge; one reload is not always enough during that window.
    if (isChunkLoadError(lastError) && typeof window !== 'undefined') {
      if (reloadState.canReload()) {
        reloadState.markReload();
        // Evict any poisoned immutable cache entry BEFORE reloading, otherwise
        // the reload re-reads the same text/html shell and the loop repeats.
        await evictPoisonedAssetCache();
        window.location.reload();
        // Return a never-resolving promise — the reload will replace this
        // module instance anyway, and we don't want React to render a broken
        // tree in the millisecond gap before navigation.
        return new Promise<ModuleWithDefault<T>>(() => {}) as never;
      }
    }

    throw lastError;
  });
}

export { lazyWithRetry as lazy };
