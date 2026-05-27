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

const RELOAD_FLAG_KEY = '__finotaur_lazy_reload__';

type ModuleWithDefault<T> = { default: T };

const CHUNK_ERROR_PATTERN =
  /Loading chunk|Loading CSS chunk|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return CHUNK_ERROR_PATTERN.test(msg);
}

function safeSessionFlag(): { get: () => boolean; set: () => void; clear: () => void } {
  // sessionStorage can throw in private-mode Safari and some embedded WebViews.
  // Fall back to an in-memory flag (best-effort) so the helper still works.
  let memoryFlag = false;
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return {
        get: () => memoryFlag,
        set: () => { memoryFlag = true; },
        clear: () => { memoryFlag = false; },
      };
    }
    return {
      get: () => window.sessionStorage.getItem(RELOAD_FLAG_KEY) === '1',
      set: () => window.sessionStorage.setItem(RELOAD_FLAG_KEY, '1'),
      clear: () => window.sessionStorage.removeItem(RELOAD_FLAG_KEY),
    };
  } catch {
    return {
      get: () => memoryFlag,
      set: () => { memoryFlag = true; },
      clear: () => { memoryFlag = false; },
    };
  }
}

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<ModuleWithDefault<T>>,
): LazyExoticComponent<T> {
  return reactLazy(async () => {
    const reloadFlag = safeSessionFlag();
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const mod = await factory();
        if (!mod || typeof (mod as any).default === 'undefined') {
          // Don't retry — this is a code/build problem, not a network problem.
          throw new Error(
            '[lazyWithRetry] Module resolved without a `default` export. ' +
            'Check the lazy(() => import(...)) factory and ensure the target ' +
            'file has `export default`, or that .then(m => ({ default: m.X })) ' +
            'references an export that still exists.',
          );
        }
        reloadFlag.clear();
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
    // Force one reload to pick up the new manifest. Guard with a sessionStorage
    // flag so we don't loop if the new build is genuinely broken.
    if (isChunkLoadError(lastError) && typeof window !== 'undefined') {
      if (!reloadFlag.get()) {
        reloadFlag.set();
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
